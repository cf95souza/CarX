import { pool } from '../database/db.js';
import { tenantQuery } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import {
  PlanSlug,
  type PlanSlugType,
  type PlanLimits,
  type PlanFeatureType,
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
    const [usersCountRes, unitsCountRes] = await Promise.all([
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
    ]);

    const usage: TenantPlanUsage = {
      users: parseInt(usersCountRes.rows[0]?.count || '0', 10),
      units: parseInt(unitsCountRes.rows[0]?.count || '0', 10),
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
   * Valida cota antes de uma inserção crítica (ex: adicionar usuário ou filial)
   */
  async assertQuota(tenantId: string, resource: 'users' | 'units'): Promise<void> {
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
    }
  }

  /**
   * Verifica se uma feature flag específica está ativa para a oficina
   */
  async isFeatureEnabled(tenantId: string, feature: string): Promise<boolean> {
    const details = await this.getTenantPlanDetails(tenantId);
    return details.activeFeatures.includes(feature);
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
}

export const planService = new PlanService();
