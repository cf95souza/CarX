import { pool } from '../database/db.js';
import { tenantQuery } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import {
  PlanSlug,
  PlanFeatures,
  type PlanSlugType,
  type PlanLimits,
  type PlanFeatureType,
  type AdminPlanDto,
  type CreatePlanDto,
  type UpdatePlanDto,
  CANONICAL_PLANS,
} from '@carx/shared';

export class QuotaExceededError extends Error {
  public statusCode = 403;
  public code = 'QUOTA_EXCEEDED';
  public resource: string;
  public limit: number;
  public current: number;

  constructor(resource: string, limit: number, current: number, planName = 'Essencial') {
    const resourceLabels: Record<string, string> = {
      users: 'usuários simultâneos',
      max_users: 'usuários simultâneos',
      units: 'unidades/filiais',
      max_units: 'unidades/filiais',
      whatsapp: 'mensagens de WhatsApp',
      storage: 'armazenamento de fotos e laudos',
    };

    const label = resourceLabels[resource] || resource;
    super(
      `Limite do plano excedido: O plano "${planName}" permite no máximo ${limit} ${label} (uso atual: ${current}). Faça upgrade do plano para continuar expandindo.`
    );
    this.name = 'QuotaExceededError';
    this.resource = resource;
    this.limit = limit;
    this.current = current;
  }
}

export class FeatureDisabledError extends Error {
  public statusCode = 403;
  public code = 'FEATURE_DISABLED';
  public feature: string;

  constructor(feature: string) {
    super(
      `Acesso negado: a funcionalidade "${feature}" não está incluída no seu plano contratado ou foi desativada para esta oficina.`
    );
    this.name = 'FeatureDisabledError';
    this.feature = feature;
  }
}

export interface PlanRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  interval: string;
  limits: PlanLimits;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantPlanUsage {
  users: number;
  units: number;
  storage_bytes?: number;
  storage_mb?: number;
}

export interface TenantPlanDetails {
  tenantId: string;
  plan: PlanRow;
  effectiveLimits: PlanLimits;
  usage: TenantPlanUsage;
  activeFeatures: string[];
  featureOverrides: Record<string, boolean>;
}

export class PlanService {
  /**
   * Retorna todos os planos comerciais disponíveis
   */
  async listPlans(): Promise<PlanRow[]> {
    const res = await pool.query<PlanRow>(
      'SELECT * FROM plans WHERE is_active = true ORDER BY price_cents ASC;'
    );
    return res.rows;
  }

  /**
   * Busca plano por slug
   */
  async getPlanBySlug(slug: string): Promise<PlanRow | null> {
    const res = await pool.query<PlanRow>('SELECT * FROM plans WHERE slug = $1 LIMIT 1;', [slug]);
    return res.rows[0] ?? null;
  }

  /**
   * Obtém detalhes completos do plano, cotas efetivas, uso atual e feature flags de uma oficina
   */
  async getTenantPlanDetails(tenantId: string): Promise<TenantPlanDetails> {
    const tenantRes = await tenantQuery<{
      id: string;
      plan_id: string | null;
      settings: {
        feature_flags?: Record<string, boolean>;
        custom_limits?: Partial<PlanLimits>;
      };
    }>(tenantId, 'SELECT id, plan_id, settings FROM tenants WHERE id = $1 LIMIT 1;', [tenantId]);

    if (!tenantRes.rows[0]) {
      throw new Error(`Oficina com ID ${tenantId} não encontrada`);
    }

    const tenant = tenantRes.rows[0];
    const settings = tenant.settings || {};
    const featureOverrides = settings.feature_flags || {};
    const customLimits = settings.custom_limits || {};

    // 1. Obter plano ou fallback para 'essencial'
    let plan: PlanRow;
    if (tenant.plan_id) {
      const planRes = await pool.query<PlanRow>('SELECT * FROM plans WHERE id = $1 LIMIT 1;', [
        tenant.plan_id,
      ]);
      plan = planRes.rows[0];
    } else {
      const fallbackRes = await pool.query<PlanRow>(
        'SELECT * FROM plans WHERE slug = $1 LIMIT 1;',
        [PlanSlug.ESSENCIAL]
      );
      plan = fallbackRes.rows[0];
    }

    // 2. Limites efetivos (Plano + Overrides negociados)
    const effectiveLimits: PlanLimits = {
      ...plan.limits,
      ...customLimits,
    };

    // 3. Medir uso real no banco através de tenantQuery (RLS garantido)
    const [usersCountRes, unitsCountRes, storageCountRes] = await Promise.all([
      tenantQuery<{ count: string }>(
        tenantId,
        'SELECT COUNT(*)::int as count FROM memberships WHERE tenant_id = $1 AND is_active = true;',
        [tenantId]
      ),
      tenantQuery<{ count: string }>(
        tenantId,
        'SELECT COUNT(*)::int as count FROM units WHERE tenant_id = $1;',
        [tenantId]
      ),
      tenantQuery<{ total_bytes: string }>(
        tenantId,
        'SELECT COALESCE(SUM(size_bytes), 0)::text as total_bytes FROM storage_files WHERE tenant_id = $1;',
        [tenantId]
      ),
    ]);

    const totalStorageBytes = Number(storageCountRes.rows[0]?.total_bytes || '0');
    const usage: TenantPlanUsage = {
      users: parseInt(usersCountRes.rows[0]?.count || '0', 10),
      units: parseInt(unitsCountRes.rows[0]?.count || '0', 10),
      storage_bytes: totalStorageBytes,
      storage_mb: Math.round((totalStorageBytes / (1024 * 1024)) * 100) / 100,
    };

    // 4. Calcular features ativas (Features do plano ponderadas com overrides do tenant)
    const baseFeatures = new Set(plan.features || []);
    for (const [feat, enabled] of Object.entries(featureOverrides)) {
      if (enabled) {
        baseFeatures.add(feat);
      } else {
        baseFeatures.delete(feat);
      }
    }

    return {
      tenantId,
      plan,
      effectiveLimits,
      usage,
      activeFeatures: Array.from(baseFeatures),
      featureOverrides,
    };
  }

  /**
   * Valida cota antes de uma inserção crítica (ex: adicionar usuário, filial ou arquivo de mídia)
   */
  async assertQuota(
    tenantId: string,
    resource: 'users' | 'units' | 'storage',
    additionalAmount = 0
  ): Promise<void> {
    const details = await this.getTenantPlanDetails(tenantId);

    if (resource === 'users') {
      const limit = details.effectiveLimits.max_users;
      const current = details.usage.users;
      if (current >= limit) {
        throw new QuotaExceededError('users', limit, current, details.plan.name);
      }
    } else if (resource === 'units') {
      const limit = details.effectiveLimits.max_units;
      const current = details.usage.units;
      if (current >= limit) {
        throw new QuotaExceededError('units', limit, current, details.plan.name);
      }
    } else if (resource === 'storage') {
      const limitMb = details.effectiveLimits.max_storage_mb || 1024;
      const limitBytes = limitMb * 1024 * 1024;
      const currentBytes = details.usage.storage_bytes || 0;
      if (currentBytes + additionalAmount > limitBytes) {
        throw new QuotaExceededError(
          'storage',
          limitMb,
          Math.ceil((currentBytes + additionalAmount) / (1024 * 1024)),
          details.plan.name
        );
      }
    }
  }

  /**
   * Verifica se uma feature flag específica está ativa para a oficina
   */
  async isFeatureEnabled(tenantId: string, feature: string): Promise<boolean> {
    const details = await this.getTenantPlanDetails(tenantId);
    if (feature === PlanFeatures.WHATSAPP_GATEWAY) {
      return (
        details.activeFeatures.includes(PlanFeatures.WHATSAPP_GATEWAY) ||
        details.activeFeatures.includes(PlanFeatures.WHATSAPP_AUTO)
      );
    }
    if (feature === PlanFeatures.WHATSAPP_AUTO) {
      return (
        details.activeFeatures.includes(PlanFeatures.WHATSAPP_AUTO) ||
        details.activeFeatures.includes(PlanFeatures.WHATSAPP_GATEWAY)
      );
    }
    return details.activeFeatures.includes(feature);
  }

  /**
   * Alias de conveniência para isFeatureEnabled
   */
  async hasFeature(tenantId: string, feature: string): Promise<boolean> {
    return this.isFeatureEnabled(tenantId, feature);
  }

  /**
   * Exige que uma funcionalidade esteja ativa ou aborta com FeatureDisabledError
   */
  async assertFeature(tenantId: string, feature: string): Promise<void> {
    const enabled = await this.isFeatureEnabled(tenantId, feature);
    if (!enabled) {
      throw new FeatureDisabledError(feature);
    }
  }

  /**
   * Altera feature flag para uma oficina específica (liga ou desliga recurso por loja)
   */
  async setTenantFeatureFlag(
    tenantId: string,
    feature: string,
    enabled: boolean,
    userId?: string
  ): Promise<Record<string, boolean>> {
    const details = await this.getTenantPlanDetails(tenantId);
    const previousState = details.featureOverrides[feature] ?? details.activeFeatures.includes(feature);

    const updatedOverrides = {
      ...details.featureOverrides,
      [feature]: enabled,
    };

    await tenantQuery(
      tenantId,
      `UPDATE tenants 
       SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{feature_flags}', $1::jsonb),
           updated_at = NOW()
       WHERE id = $2;`,
      [JSON.stringify(updatedOverrides), tenantId]
    );

    // Gravação na trilha de auditoria
    await auditService.record({
      tenantId,
      userId: userId || null,
      action: 'FEATURE_FLAG_TOGGLED',
      entity: 'tenants',
      entityId: tenantId,
      oldValues: { feature, enabled: previousState },
      newValues: { feature, enabled },
    });

    return updatedOverrides;
  }

  /**
   * Associa ou migra uma oficina para outro plano contratado
   */
  async assignPlanToTenant(
    tenantId: string,
    planSlug: PlanSlugType,
    userId?: string
  ): Promise<PlanRow> {
    const plan = await this.getPlanBySlug(planSlug);
    if (!plan) {
      throw new Error(`Plano com slug "${planSlug}" não encontrado`);
    }

    const currentDetails = await this.getTenantPlanDetails(tenantId);

    await tenantQuery(
      tenantId,
      'UPDATE tenants SET plan_id = $1, updated_at = NOW() WHERE id = $2;',
      [plan.id, tenantId]
    );

    // Auditoria de troca de plano
    await auditService.record({
      tenantId,
      userId: userId || null,
      action: 'PLAN_CHANGED',
      entity: 'tenants',
      entityId: tenantId,
      oldValues: { plan_id: currentDetails.plan.id, plan_slug: currentDetails.plan.slug },
      newValues: { plan_id: plan.id, plan_slug: plan.slug },
    });

    return plan;
  }

  /**
   * Super Admin: Lista todos os planos cadastrados com contador de clientes
   */
  async listAllPlansAdmin(): Promise<AdminPlanDto[]> {
    const res = await pool.query<any>(
      `SELECT 
         p.id,
         p.name,
         p.slug,
         p.description,
         p.price_cents,
         p.interval,
         p.limits,
         p.features,
         p.is_active,
         p.created_at,
         p.updated_at,
         COUNT(t.id)::int as tenants_count
       FROM plans p
       LEFT JOIN tenants t ON t.plan_id = p.id
       GROUP BY p.id
       ORDER BY p.price_cents ASC;`
    );
    return res.rows;
  }

  /**
   * Super Admin: Busca plano por ID com contador de assinantes
   */
  async getPlanById(id: string): Promise<AdminPlanDto | null> {
    const res = await pool.query<any>(
      `SELECT 
         p.id,
         p.name,
         p.slug,
         p.description,
         p.price_cents,
         p.interval,
         p.limits,
         p.features,
         p.is_active,
         p.created_at,
         p.updated_at,
         COUNT(t.id)::int as tenants_count
       FROM plans p
       LEFT JOIN tenants t ON t.plan_id = p.id
       WHERE p.id = $1
       GROUP BY p.id;`,
      [id]
    );
    return res.rows[0] ?? null;
  }

  /**
   * Super Admin: Cria um novo plano comercial na plataforma
   */
  async createPlan(input: CreatePlanDto, adminUserId?: string): Promise<AdminPlanDto> {
    const { name, slug, description, price_cents, interval = 'monthly', limits, features = [], is_active = true } = input;
    if (!name || !slug) {
      throw new Error('Nome e slug são obrigatórios para criar um plano.');
    }
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    const existing = await pool.query('SELECT id FROM plans WHERE slug = $1 LIMIT 1;', [cleanSlug]);
    if (existing.rows[0]) {
      throw new Error(`Já existe um plano com o slug "${cleanSlug}".`);
    }

    const effectiveLimits: PlanLimits = limits && typeof limits === 'object'
      ? {
          max_units: limits.max_units ?? 1,
          max_users: limits.max_users ?? 3,
          max_work_orders_per_month: limits.max_work_orders_per_month ?? 100,
          max_storage_mb: limits.max_storage_mb ?? 1024,
          max_whatsapp_messages_per_month: limits.max_whatsapp_messages_per_month ?? 200,
        }
      : {
          max_units: 1,
          max_users: 3,
          max_work_orders_per_month: 100,
          max_storage_mb: 1024,
          max_whatsapp_messages_per_month: 200,
        };

    const res = await pool.query<any>(
      `INSERT INTO plans (name, slug, description, price_cents, interval, limits, features, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        name.trim(),
        cleanSlug,
        description ? description.trim() : null,
        price_cents || 0,
        interval,
        JSON.stringify(effectiveLimits),
        JSON.stringify(features),
        is_active,
      ]
    );

    const created = res.rows[0];
    if (adminUserId) {
      await auditService.record({
        tenantId: created.id,
        userId: adminUserId,
        action: 'PLAN_CREATED',
        entity: 'plans',
        entityId: created.id,
        newValues: { name: created.name, slug: created.slug, price_cents: created.price_cents, features: created.features },
      }).catch(() => {});
    }

    return { ...created, tenants_count: 0 };
  }

  /**
   * Super Admin: Atualiza dados, cotas e matriz de features de um plano
   */
  async updatePlan(id: string, input: UpdatePlanDto, adminUserId?: string): Promise<AdminPlanDto> {
    const existingRes = await pool.query<any>('SELECT * FROM plans WHERE id = $1 LIMIT 1;', [id]);
    if (!existingRes.rows[0]) {
      throw new Error(`Plano com ID ${id} não encontrado.`);
    }
    const existing = existingRes.rows[0];

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const description = input.description !== undefined ? (input.description ? input.description.trim() : null) : existing.description;
    const price_cents = input.price_cents !== undefined ? input.price_cents : existing.price_cents;
    const interval = input.interval !== undefined ? input.interval : existing.interval;
    const limits = input.limits !== undefined ? JSON.stringify(input.limits) : (typeof existing.limits === 'string' ? existing.limits : JSON.stringify(existing.limits));
    const features = input.features !== undefined ? JSON.stringify(input.features) : (typeof existing.features === 'string' ? existing.features : JSON.stringify(existing.features));
    const is_active = input.is_active !== undefined ? input.is_active : existing.is_active;

    const res = await pool.query<any>(
      `UPDATE plans 
       SET name = $1, description = $2, price_cents = $3, interval = $4, limits = $5, features = $6, is_active = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *;`,
      [name, description, price_cents, interval, limits, features, is_active, id]
    );

    const updated = res.rows[0];
    const tenantsCountRes = await pool.query<{ count: string }>('SELECT COUNT(*)::int as count FROM tenants WHERE plan_id = $1;', [id]);
    const tenantsCount = parseInt(tenantsCountRes.rows[0]?.count || '0', 10);

    if (adminUserId) {
      await auditService.record({
        tenantId: id,
        userId: adminUserId,
        action: 'PLAN_UPDATED',
        entity: 'plans',
        entityId: id,
        oldValues: { name: existing.name, price_cents: existing.price_cents, features: existing.features },
        newValues: { name: updated.name, price_cents: updated.price_cents, features: updated.features, is_active: updated.is_active },
      }).catch(() => {});
    }

    return { ...updated, tenants_count: tenantsCount };
  }

  /**
   * Super Admin: Alternância rápida de uma Feature Flag no plano
   */
  async togglePlanFeature(id: string, feature: string, enabled: boolean, adminUserId?: string): Promise<AdminPlanDto> {
    const existingRes = await pool.query<any>('SELECT * FROM plans WHERE id = $1 LIMIT 1;', [id]);
    if (!existingRes.rows[0]) {
      throw new Error(`Plano com ID ${id} não encontrado.`);
    }
    const existing = existingRes.rows[0];
    const rawFeatures = typeof existing.features === 'string' ? JSON.parse(existing.features) : (existing.features || []);
    const currentFeatures = new Set<string>(Array.isArray(rawFeatures) ? rawFeatures : []);

    if (enabled) {
      currentFeatures.add(feature);
    } else {
      currentFeatures.delete(feature);
    }

    return this.updatePlan(id, { features: Array.from(currentFeatures) }, adminUserId);
  }
}

export const planService = new PlanService();
