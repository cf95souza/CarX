import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool, query } from '../database/db.js';
import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import {
  AdminCreateTenantDto,
  ProvisioningResultDto,
  AutomotiveSegment,
  ServiceDto,
  ChecklistTemplateDto,
} from '@carx/shared';
import { SEGMENT_CATALOGS } from './segment-catalogs.js';

export class ProvisioningError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ProvisioningError';
    this.statusCode = statusCode;
  }
}

export class ProvisioningService {
  /**
   * Provisiona uma nova oficina completa:
   * Tenant + Matriz + Usuário Owner + Contrato/Fatura + Catálogo do Segmento + Checklist + Convite por E-mail
   */
  async provisionTenant(
    dto: AdminCreateTenantDto,
    superadminUserId: string,
    ipAddress = '127.0.0.1',
    userAgent = 'Superadmin Portal'
  ): Promise<ProvisioningResultDto> {
    // 1. Validação básica de entrada
    if (!dto.trade_name?.trim()) {
      throw new ProvisioningError('O Nome Fantasia da oficina é obrigatório.', 400);
    }
    if (!dto.slug?.trim()) {
      throw new ProvisioningError('O slug do subdomínio é obrigatório.', 400);
    }
    if (!dto.owner_email?.trim() || !dto.owner_name?.trim()) {
      throw new ProvisioningError('Nome e e-mail do proprietário são obrigatórios.', 400);
    }

    const cleanSlug = dto.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-');

    // 2. Verificar duplicidade de slug
    const existingSlug = await query('SELECT id FROM tenants WHERE slug = $1', [cleanSlug]);
    if (existingSlug.rows.length > 0) {
      throw new ProvisioningError(`O subdomínio "${cleanSlug}.carx.com.br" já está em uso.`, 409);
    }

    // 3. Obter plano pelo slug (com suporte a aliases)
    const planSlugAliasMap: Record<string, string> = {
      start: 'essencial',
      pro: 'profissional',
      prime: 'premium',
      enterprise: 'premium',
    };
    const targetSlug = planSlugAliasMap[dto.plan_slug || 'pro'] || (dto.plan_slug || 'profissional');
    const planRes = await query('SELECT * FROM plans WHERE slug = $1', [targetSlug]);
    if (planRes.rows.length === 0) {
      throw new ProvisioningError(`Plano "${dto.plan_slug}" não encontrado.`, 404);
    }
    const plan = planRes.rows[0];

    // 4. Definir segmento e carregar catálogo base
    const segment: AutomotiveSegment = dto.segment && SEGMENT_CATALOGS[dto.segment] ? dto.segment : 'mecanica';
    const catalogSeed = SEGMENT_CATALOGS[segment];

    const isTrial = dto.is_trial ?? true;
    const trialDays = dto.trial_days || 14;
    const trialEndsAt = isTrial
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // 5. Executar transação mestre de provisionamento
    const client = await pool.connect();
    let tenantResult: any;
    let ownerResult: any;
    let contractResult: any;
    let servicesInsertedCount = 0;
    let checklistTemplatesCount = 0;
    let invitationResult: any;

    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL app.is_superadmin = 'true'");
      await client.query("SET LOCAL app.bypass_rls = 'true'");

      // A. Criar Tenant
      const tenantInsertRes = await client.query(
        `INSERT INTO tenants (
          slug, trade_name, legal_name, cnpj, email, phone, status, plan_id, segment, trial_ends_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          cleanSlug,
          dto.trade_name.trim(),
          dto.legal_name?.trim() || null,
          dto.cnpj?.trim() || null,
          dto.email.trim(),
          dto.phone?.trim() || null,
          isTrial ? 'trialing' : 'active',
          plan.id,
          segment,
          trialEndsAt,
        ]
      );
      tenantResult = tenantInsertRes.rows[0];
      const tenantId = tenantResult.id;

      // B. Criar Filial Inicial (Matriz)
      await client.query(
        `INSERT INTO units (
          tenant_id, name, slug, phone, email, is_active
        ) VALUES ($1, $2, $3, $4, $5, true)`,
        [tenantId, 'Matriz Principal', 'matriz', dto.phone || null, dto.email]
      );

      // C. Criar ou Obter Usuário Proprietário
      const rawPassword = dto.owner_password || 'Senha@CarX2026!';
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name, email`,
        [dto.owner_name.trim(), dto.owner_email.trim(), passwordHash]
      );
      ownerResult = userRes.rows[0];

      // D. Vincular Membresia de Proprietário (Owner)
      await client.query(
        `INSERT INTO memberships (tenant_id, user_id, role, is_active)
         VALUES ($1, $2, 'owner', true)
         ON CONFLICT (tenant_id, user_id, unit_id) DO NOTHING`,
        [tenantId, ownerResult.id]
      );

      // E. Criar Contrato de Licença
      const contractRes = await client.query(
        `INSERT INTO contracts (
          tenant_id, plan_id, billing_cycle, negotiated_price_cents, discount_cents,
          custom_limits, status, starts_at, expires_at
        ) VALUES ($1, $2, 'monthly', $3, 0, $4, $5, NOW(), $6)
        RETURNING *`,
        [
          tenantId,
          plan.id,
          plan.price_cents,
          JSON.stringify(plan.limits || {}),
          isTrial ? 'trial' : 'active',
          trialEndsAt,
        ]
      );
      contractResult = contractRes.rows[0];

      // F. Criar Primeira Fatura (R$ 0,00 no trial ou valor do plano)
      const invoiceAmount = isTrial ? 0 : plan.price_cents;
      const invoiceDueDate = isTrial ? new Date(Date.now() + 14 * 86400000) : new Date();
      await client.query(
        `INSERT INTO invoices (
          tenant_id, contract_id, amount_cents, status, payment_method, due_date
        ) VALUES ($1, $2, $3, $4, 'pix', $5)`,
        [
          tenantId,
          contractResult.id,
          invoiceAmount,
          isTrial ? 'paid' : 'pending',
          invoiceDueDate.toISOString().split('T')[0],
        ]
      );

      // G. Injetar Catálogo de Serviços do Segmento
      for (const service of catalogSeed.services) {
        await client.query(
          `INSERT INTO services (
            tenant_id, name, description, price_cents, estimated_minutes, category, segment, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
          [
            tenantId,
            service.name,
            service.description,
            service.price_cents,
            service.estimated_minutes,
            service.category,
            segment,
          ]
        );
        servicesInsertedCount++;
      }

      // H. Injetar Modelo de Checklist de Entrada do Segmento
      await client.query(
        `INSERT INTO checklist_templates (
          tenant_id, name, segment, description, items, is_active
        ) VALUES ($1, $2, $3, $4, $5, true)`,
        [
          tenantId,
          catalogSeed.checklist.name,
          segment,
          catalogSeed.checklist.description,
          JSON.stringify(catalogSeed.checklist.items),
        ]
      );
      checklistTemplatesCount++;

      // I. Gerar Convite por E-mail do Proprietário
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
      const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const shopDomain = `${cleanSlug}.carx.com.br`;

      const emailPayload = {
        recipient_name: dto.owner_name.trim(),
        recipient_email: dto.owner_email.trim(),
        tenant_name: dto.trade_name.trim(),
        subdomain: shopDomain,
        segment: catalogSeed.name,
        plan_name: plan.name,
        login_url: `https://${shopDomain}/login`,
        temporary_password: rawPassword,
        invite_token: inviteToken,
      };

      const inviteRes = await client.query(
        `INSERT INTO tenant_invitations (
          tenant_id, user_id, recipient_email, recipient_name, role, token_hash,
          status, expires_at, email_payload
        ) VALUES ($1, $2, $3, $4, 'owner', $5, 'sent', $6, $7)
        RETURNING id, recipient_email, status, expires_at`,
        [
          tenantId,
          ownerResult.id,
          dto.owner_email.trim(),
          dto.owner_name.trim(),
          tokenHash,
          inviteExpiresAt,
          JSON.stringify(emailPayload),
        ]
      );
      invitationResult = {
        ...inviteRes.rows[0],
        invite_url: `https://${shopDomain}/onboarding?token=${inviteToken}`,
      };

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 6. Gravar Auditoria Imutável
    await auditService.record({
      superadminUserId,
      tenantId: tenantResult.id,
      action: 'SUPERADMIN_TENANT_PROVISIONED',
      entity: 'tenants',
      entityId: tenantResult.id,
      newValues: {
        trade_name: tenantResult.trade_name,
        slug: tenantResult.slug,
        segment,
        plan_slug: plan.slug,
        services_injected: servicesInsertedCount,
        checklist_injected: checklistTemplatesCount,
        owner_email: ownerResult.email,
        subdomain: `${tenantResult.slug}.carx.com.br`,
      },
      ipAddress,
      userAgent,
    });

    return {
      tenant: {
        id: tenantResult.id,
        slug: tenantResult.slug,
        trade_name: tenantResult.trade_name,
        legal_name: tenantResult.legal_name,
        cnpj: tenantResult.cnpj,
        email: tenantResult.email,
        phone: tenantResult.phone,
        status: tenantResult.status,
        plan_id: plan.id,
        plan_name: plan.name,
        plan_slug: plan.slug,
        custom_domain: tenantResult.custom_domain,
        segment: tenantResult.segment,
        units_count: 1,
        users_count: 1,
        work_orders_count: 0,
        storage_bytes: 0,
        created_at: tenantResult.created_at,
        trial_ends_at: tenantResult.trial_ends_at,
      },
      user: {
        id: ownerResult.id,
        name: ownerResult.name,
        email: ownerResult.email,
      },
      contract: {
        id: contractResult.id,
        tenant_id: tenantResult.id,
        tenant_name: tenantResult.trade_name,
        plan_id: plan.id,
        plan_name: plan.name,
        billing_cycle: contractResult.billing_cycle,
        negotiated_price_cents: contractResult.negotiated_price_cents,
        discount_cents: contractResult.discount_cents,
        custom_limits: contractResult.custom_limits,
        status: contractResult.status,
        starts_at: contractResult.starts_at,
        expires_at: contractResult.expires_at,
        cancelled_at: null,
        created_at: contractResult.created_at,
        updated_at: contractResult.updated_at,
      },
      servicesCount: servicesInsertedCount,
      checklistTemplatesCount,
      invitation: {
        id: invitationResult.id,
        recipient_email: invitationResult.recipient_email,
        invite_url: invitationResult.invite_url,
      },
    };
  }

  /**
   * Consulta os serviços cadastrados de uma oficina (com contexto de isolamento de tenant)
   */
  async listTenantServices(tenantId: string): Promise<ServiceDto[]> {
    const res = await tenantQuery<ServiceDto>(
      tenantId,
      'SELECT * FROM services WHERE is_active = true ORDER BY category, name ASC',
      []
    );
    return res.rows;
  }

  /**
   * Consulta os modelos de checklist de uma oficina (com contexto de isolamento de tenant)
   */
  async listTenantChecklists(tenantId: string): Promise<ChecklistTemplateDto[]> {
    const res = await tenantQuery<ChecklistTemplateDto>(
      tenantId,
      'SELECT * FROM checklist_templates WHERE is_active = true ORDER BY name ASC',
      []
    );
    return res.rows;
  }
}

export const provisioningService = new ProvisioningService();
