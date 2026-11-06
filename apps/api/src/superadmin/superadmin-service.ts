import crypto from 'crypto';
import pg from 'pg';
import { query } from '../database/db.js';
import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { comparePassword, hashPassword } from '../auth/password.js';
import { signJwt, verifyJwt, JwtPayload } from '../auth/jwt.js';
import { verifyTotp } from '../auth/totp.js';
import { auditService } from '../audit/audit-service.js';
import {
  SuperadminUserDto,
  SuperadminLoginInput,
  SuperadminLoginResponse,
  SaasMetricsDto,
  AdminTenantSummaryDto,
  AdminCreateTenantDto,
  AdminUpdateTenantStatusDto,
  ImpersonateTenantDto,
  ImpersonateTenantResponse,
  ContractDto,
  SuperadminInvoiceDto,
  LeadDto,
  ConvertLeadDto,
  AutomotiveSegment,
  ServiceDto,
  ChecklistTemplateDto,
  TenantInvitationDto,
  RESERVED_SUBDOMAINS,
} from '@carx/shared';
import { SEGMENT_CATALOGS } from '../provisioning/segment-catalogs.js';

export class SuperadminError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'SuperadminError';
    this.statusCode = statusCode;
  }
}

export class SuperadminService {
  /**
   * Autentica o Super Administrador via e-mail e senha.
   * Se 2FA estiver ativado, retorna token temporário para segundo fator.
   */
  async login(
    input: SuperadminLoginInput,
    ip = '127.0.0.1',
    userAgent = 'unknown'
  ): Promise<SuperadminLoginResponse> {
    const { email, password } = input;
    if (!email || !password) {
      throw new SuperadminError('E-mail e senha são obrigatórios.', 400);
    }

    const res = await query(
      `SELECT id, name, email, password_hash, two_factor_secret, two_factor_enabled, is_active, last_login_at, created_at, updated_at
       FROM superadmin_users
       WHERE email = LOWER(TRIM($1))
       LIMIT 1`,
      [email]
    );

    if (res.rows.length === 0) {
      throw new SuperadminError('Credenciais inválidas de Super Administrador.', 401);
    }

    const admin = res.rows[0];

    if (!admin.is_active) {
      throw new SuperadminError('Conta de Super Administrador desativada ou suspensa.', 403);
    }

    const passwordMatch = await comparePassword(password, admin.password_hash);
    if (!passwordMatch) {
      throw new SuperadminError('Credenciais inválidas de Super Administrador.', 401);
    }

    // Se 2FA TOTP estiver ativo, gera token temporário restrito a 5 minutos
    if (admin.two_factor_enabled && admin.two_factor_secret) {
      const tempToken = signJwt(
        {
          sub: admin.id,
          email: admin.email,
          scope: 'superadmin',
          type: 'temp_2fa',
        },
        300
      );

      return {
        requires2FA: true,
        tempToken,
      };
    }

    // Login imediato: sessão curta de 30 minutos (1800s) para segurança
    const token = signJwt(
      {
        sub: admin.id,
        superadminId: admin.id,
        email: admin.email,
        name: admin.name,
        scope: 'superadmin',
        isSuperadmin: true,
      },
      1800
    );

    await query('UPDATE superadmin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [
      admin.id,
    ]);

    await auditService.record({
      superadminUserId: admin.id,
      action: 'SUPERADMIN_LOGIN',
      entity: 'superadmin_users',
      entityId: admin.id,
      newValues: { email: admin.email, ip, userAgent },
      ipAddress: ip,
      userAgent,
    });

    return {
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        two_factor_enabled: admin.two_factor_enabled,
        is_active: admin.is_active,
        last_login_at: new Date().toISOString(),
        created_at: admin.created_at,
        updated_at: admin.updated_at,
      },
    };
  }

  /**
   * Valida código TOTP de 2FA e emite o token final de Super Admin
   */
  async verify2fa(
    tempToken: string,
    code: string,
    ip = '127.0.0.1',
    userAgent = 'unknown'
  ): Promise<SuperadminLoginResponse> {
    if (!tempToken || !code) {
      throw new SuperadminError('Token temporário e código TOTP são obrigatórios.', 400);
    }

    let payload: JwtPayload;
    try {
      payload = verifyJwt<JwtPayload>(tempToken);
    } catch {
      throw new SuperadminError('Token temporário de 2FA inválido ou expirado.', 401);
    }

    if (payload.type !== 'temp_2fa' || payload.scope !== 'superadmin') {
      throw new SuperadminError('Token incompatível com validação de 2FA do Super Admin.', 401);
    }

    const res = await query(
      `SELECT id, name, email, two_factor_secret, two_factor_enabled, is_active, last_login_at, created_at, updated_at
       FROM superadmin_users
       WHERE id = $1
       LIMIT 1`,
      [payload.sub]
    );

    if (res.rows.length === 0 || !res.rows[0].is_active) {
      throw new SuperadminError('Superadministrador não encontrado ou inativo.', 403);
    }

    const admin = res.rows[0];
    const isValid = verifyTotp(code, admin.two_factor_secret);
    if (!isValid) {
      throw new SuperadminError('Código TOTP de 2FA inválido ou expirado.', 401);
    }

    const token = signJwt(
      {
        sub: admin.id,
        superadminId: admin.id,
        email: admin.email,
        name: admin.name,
        scope: 'superadmin',
        isSuperadmin: true,
      },
      1800
    );

    await query('UPDATE superadmin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [
      admin.id,
    ]);

    await auditService.record({
      superadminUserId: admin.id,
      action: 'SUPERADMIN_2FA_VERIFIED',
      entity: 'superadmin_users',
      entityId: admin.id,
      newValues: { email: admin.email, ip, userAgent },
      ipAddress: ip,
      userAgent,
    });

    return {
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        two_factor_enabled: admin.two_factor_enabled,
        is_active: admin.is_active,
        last_login_at: new Date().toISOString(),
        created_at: admin.created_at,
        updated_at: admin.updated_at,
      },
    };
  }

  /**
   * Coleta métricas analíticas globais do negócio SaaS:
   * MRR, ARR, oficinas ativas, trials, churn rate, inadimplência e receita por plano.
   */
  async getSaasMetrics(): Promise<SaasMetricsDto> {
    // 1. Contagens de oficinas por status
    const tenantsStatusRes = await tenantQuery(
      null,
      `SELECT status, COUNT(*)::int as count FROM tenants GROUP BY status`,
      [],
      { isSuperadmin: true }
    );

    let total_tenants = 0;
    let active_tenants = 0;
    let trialing_tenants = 0;
    let suspended_tenants = 0;
    let cancelled_tenants = 0;

    for (const row of tenantsStatusRes.rows) {
      const count = Number(row.count);
      total_tenants += count;
      if (row.status === 'active') active_tenants = count;
      if (row.status === 'trialing') trialing_tenants = count;
      if (row.status === 'suspended') suspended_tenants = count;
      if (row.status === 'cancelled') cancelled_tenants = count;
    }

    // 2. MRR e ARR: soma dos preços mensais dos planos das oficinas com status 'active'
    const mrrRes = await tenantQuery(
      null,
      `SELECT COALESCE(SUM(p.price_cents), 0)::bigint as total_mrr
       FROM tenants t
       JOIN plans p ON t.plan_id = p.id
       WHERE t.status = 'active'`,
      [],
      { isSuperadmin: true }
    );
    const mrr_cents = Number(mrrRes.rows[0]?.total_mrr || 0);
    const arr_cents = mrr_cents * 12;

    // 3. Taxa de Churn (%) = (canceladas / total) * 100
    const churn_rate_percent = total_tenants > 0
      ? Number(((cancelled_tenants / total_tenants) * 100).toFixed(2))
      : 0;

    // 4. Inadimplência: faturas pendentes vencidas
    const overdueRes = await tenantQuery(
      null,
      `SELECT COUNT(*)::int as count, COALESCE(SUM(amount_cents), 0)::bigint as total_amount
       FROM invoices
       WHERE status = 'pending' AND due_date < CURRENT_DATE`,
      [],
      { isSuperadmin: true }
    );
    const overdue_invoices_count = Number(overdueRes.rows[0]?.count || 0);
    const overdue_amount_cents = Number(overdueRes.rows[0]?.total_amount || 0);

    // 5. Receita por plano
    const revenueByPlanRes = await tenantQuery(
      null,
      `SELECT 
        p.id as plan_id,
        p.name as plan_name,
        p.slug as plan_slug,
        COUNT(t.id)::int as tenants_count,
        COALESCE(SUM(CASE WHEN t.status = 'active' THEN p.price_cents ELSE 0 END), 0)::bigint as total_mrr_cents
       FROM plans p
       LEFT JOIN tenants t ON t.plan_id = p.id
       GROUP BY p.id, p.name, p.slug
       ORDER BY total_mrr_cents DESC, p.price_cents ASC`,
      [],
      { isSuperadmin: true }
    );

    const revenue_by_plan = revenueByPlanRes.rows.map((r) => ({
      plan_id: r.plan_id,
      plan_name: r.plan_name,
      plan_slug: r.plan_slug,
      tenants_count: Number(r.tenants_count),
      total_mrr_cents: Number(r.total_mrr_cents),
    }));

    // 6. Estatísticas de uso global da infraestrutura
    const [unitsRes, usersRes, storageRes] = await Promise.all([
      tenantQuery(null, 'SELECT COUNT(*)::int as count FROM units', [], { isSuperadmin: true }),
      tenantQuery(null, 'SELECT COUNT(*)::int as count FROM users', [], { isSuperadmin: true }),
      tenantQuery(null, 'SELECT COALESCE(SUM(size_bytes), 0)::bigint as total_bytes FROM storage_files', [], { isSuperadmin: true }),
    ]);

    const global_usage = {
      total_units: Number(unitsRes.rows[0]?.count || 0),
      total_users: Number(usersRes.rows[0]?.count || 0),
      total_work_orders: 0,
      total_storage_bytes: Number(storageRes.rows[0]?.total_bytes || 0),
    };

    return {
      total_tenants,
      active_tenants,
      trialing_tenants,
      suspended_tenants,
      cancelled_tenants,
      mrr_cents,
      arr_cents,
      churn_rate_percent,
      overdue_invoices_count,
      overdue_amount_cents,
      revenue_by_plan,
      global_usage,
    };
  }

  /**
   * Lista todas as oficinas clientes cadastradas com métricas consolidadas
   */
  async listTenants(params?: { search?: string; status?: string }): Promise<AdminTenantSummaryDto[]> {
    let sql = `
      SELECT 
        t.id,
        t.slug,
        t.trade_name,
        t.legal_name,
        t.cnpj,
        t.email,
        t.phone,
        t.status,
        t.plan_id,
        p.name as plan_name,
        p.slug as plan_slug,
        t.custom_domain,
        t.created_at,
        t.trial_ends_at,
        (SELECT COUNT(*)::int FROM units u WHERE u.tenant_id = t.id) as units_count,
        (SELECT COUNT(*)::int FROM memberships m WHERE m.tenant_id = t.id) as users_count,
        0 as work_orders_count,
        (SELECT COALESCE(SUM(size_bytes), 0)::bigint FROM storage_files s WHERE s.tenant_id = t.id) as storage_bytes
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      WHERE 1=1
    `;
    const values: unknown[] = [];

    if (params?.status) {
      values.push(params.status);
      sql += ` AND t.status = $${values.length}`;
    }

    if (params?.search) {
      values.push(`%${params.search.toLowerCase().trim()}%`);
      sql += ` AND (
        LOWER(t.trade_name) LIKE $${values.length} OR 
        LOWER(t.slug) LIKE $${values.length} OR 
        LOWER(t.email) LIKE $${values.length} OR
        t.cnpj LIKE $${values.length}
      )`;
    }

    sql += ' ORDER BY t.created_at DESC';

    const res = await tenantQuery(null, sql, values, { isSuperadmin: true });
    return res.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      trade_name: r.trade_name,
      legal_name: r.legal_name,
      cnpj: r.cnpj,
      email: r.email,
      phone: r.phone,
      status: r.status,
      plan_id: r.plan_id,
      plan_name: r.plan_name,
      plan_slug: r.plan_slug,
      custom_domain: r.custom_domain,
      units_count: Number(r.units_count),
      users_count: Number(r.users_count),
      work_orders_count: Number(r.work_orders_count),
      storage_bytes: Number(r.storage_bytes),
      created_at: r.created_at,
      trial_ends_at: r.trial_ends_at,
    }));
  }

  /**
   * Retorna os detalhes profundos de uma oficina específica para o painel Super Admin
   */
  async getTenantDetails(tenantId: string): Promise<Record<string, unknown>> {
    const tenantRes = await tenantQuery(
      null,
      `SELECT t.*, p.name as plan_name, p.slug as plan_slug, p.limits as plan_limits, p.features as plan_features
       FROM tenants t
       LEFT JOIN plans p ON t.plan_id = p.id
       WHERE t.id = $1 LIMIT 1`,
      [tenantId],
      { isSuperadmin: true }
    );

    if (tenantRes.rows.length === 0) {
      throw new SuperadminError('Oficina não encontrada.', 404);
    }

    const tenant = tenantRes.rows[0];

    const [brandingRes, unitsRes, contractsRes, invoicesRes, membersRes] = await Promise.all([
      tenantQuery(null, 'SELECT * FROM tenant_branding WHERE tenant_id = $1 LIMIT 1', [tenantId], { isSuperadmin: true }),
      tenantQuery(null, 'SELECT id, name, slug, cnpj, phone, email, is_active FROM units WHERE tenant_id = $1 ORDER BY created_at ASC', [tenantId], { isSuperadmin: true }),
      tenantQuery(null, 'SELECT * FROM contracts WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId], { isSuperadmin: true }),
      tenantQuery(null, 'SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY due_date DESC LIMIT 20', [tenantId], { isSuperadmin: true }),
      tenantQuery(
        null,
        `SELECT m.id, m.role, m.is_active, u.name, u.email, u.phone 
         FROM memberships m 
         JOIN users u ON m.user_id = u.id 
         WHERE m.tenant_id = $1`,
        [tenantId],
        { isSuperadmin: true }
      ),
    ]);

    return {
      tenant,
      branding: brandingRes.rows[0] || null,
      units: unitsRes.rows,
      contracts: contractsRes.rows,
      invoices: invoicesRes.rows,
      members: membersRes.rows,
    };
  }

  /**
   * Criação de nova oficina pelo assistente corporativo do Super Admin
   */
  async createTenant(
    input: AdminCreateTenantDto,
    superadminUserId: string,
    ip = '127.0.0.1',
    userAgent = 'unknown'
  ): Promise<Record<string, unknown>> {
    const slug = input.slug.toLowerCase().trim();

    if ((RESERVED_SUBDOMAINS as readonly string[]).includes(slug)) {
      throw new SuperadminError(`O subdomínio "${slug}" é reservado pelo sistema.`, 400);
    }

    const existingSlug = await tenantQuery('null', 'SELECT id FROM tenants WHERE slug = $1 LIMIT 1', [slug], {
      isSuperadmin: true,
    });
    if (existingSlug.rows.length > 0) {
      throw new SuperadminError(`O subdomínio "${slug}" já está em uso por outra oficina.`, 400);
    }

    const planSlugAliasMap: Record<string, string> = {
      start: 'essencial',
      pro: 'profissional',
      prime: 'premium',
      enterprise: 'premium',
    };
    const targetSlug = planSlugAliasMap[input.plan_slug] || input.plan_slug;

    const planRes = await tenantQuery('null', 'SELECT * FROM plans WHERE slug = $1 LIMIT 1', [targetSlug], {
      isSuperadmin: true,
    });
    if (planRes.rows.length === 0) {
      throw new SuperadminError(`Plano "${input.plan_slug}" não encontrado.`, 404);
    }
    const plan = planRes.rows[0];

    const segment: AutomotiveSegment = input.segment && SEGMENT_CATALOGS[input.segment] ? input.segment : 'mecanica';
    const catalogSeed = SEGMENT_CATALOGS[segment];

    const result = await tenantTransaction(
      null,
      async (client) => {
        // 1. Criar tenant
        const status = input.is_trial ? 'trialing' : 'active';
        const trialDays = input.trial_days || 14;
        const trialEndsAt = input.is_trial
          ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const tenantInsert = await client.query(
          `INSERT INTO tenants (slug, trade_name, legal_name, cnpj, email, phone, status, plan_id, segment, trial_ends_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            slug,
            input.trade_name.trim(),
            input.legal_name || input.trade_name.trim(),
            input.cnpj || null,
            input.email.toLowerCase().trim(),
            input.phone || null,
            status,
            plan.id,
            segment,
            trialEndsAt,
          ]
        );
        const tenant = tenantInsert.rows[0];

        // 2. Criar Unidade Matriz padrão
        const unitInsert = await client.query(
          `INSERT INTO units (tenant_id, name, slug, cnpj, phone, email)
           VALUES ($1, 'Matriz', 'matriz', $2, $3, $4)
           RETURNING *`,
          [tenant.id, tenant.cnpj, tenant.phone, tenant.email]
        );
        const unit = unitInsert.rows[0];

        // 3. Criar ou vincular usuário Proprietário (Owner)
        let userId: string;
        const userRes = await client.query(
          'SELECT id FROM users WHERE email = $1 LIMIT 1',
          [input.owner_email.toLowerCase().trim()]
        );

        const rawPassword = input.owner_password || 'CarX@2026TempPass';
        if (userRes.rows.length > 0) {
          userId = userRes.rows[0].id;
        } else {
          const passwordHash = await hashPassword(rawPassword);
          const newUserRes = await client.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [input.owner_name.trim(), input.owner_email.toLowerCase().trim(), passwordHash]
          );
          userId = newUserRes.rows[0].id;
        }

        await client.query(
          `INSERT INTO memberships (tenant_id, unit_id, user_id, role, is_active)
           VALUES ($1, $2, $3, 'owner', true)`,
          [tenant.id, unit.id, userId]
        );

        // 4. Criar Contrato inicial
        const contractInsert = await client.query(
          `INSERT INTO contracts (tenant_id, plan_id, billing_cycle, negotiated_price_cents, status)
           VALUES ($1, $2, 'monthly', $3, $4)
           RETURNING *`,
          [tenant.id, plan.id, plan.price_cents, status]
        );
        const contract = contractInsert.rows[0];

        // 5. Registrar Evento de Contrato
        await client.query(
          `INSERT INTO contract_events (contract_id, event_type, details)
           VALUES ($1, 'created', $2)`,
          [
            contract.id,
            JSON.stringify({
              created_by: superadminUserId,
              plan_slug: plan.slug,
              price_cents: plan.price_cents,
              is_trial: input.is_trial,
            }),
          ]
        );

        // 6. Injetar Catálogo de Serviços do Segmento
        let servicesCount = 0;
        for (const service of catalogSeed.services) {
          await client.query(
            `INSERT INTO services (tenant_id, name, description, price_cents, estimated_minutes, category, segment, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
            [
              tenant.id,
              service.name,
              service.description,
              service.price_cents,
              service.estimated_minutes,
              service.category,
              segment,
            ]
          );
          servicesCount++;
        }

        // 7. Injetar Modelo de Checklist de Entrada do Segmento
        await client.query(
          `INSERT INTO checklist_templates (tenant_id, name, segment, description, items, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [
            tenant.id,
            catalogSeed.checklist.name,
            segment,
            catalogSeed.checklist.description,
            JSON.stringify(catalogSeed.checklist.items),
          ]
        );

        // 8. Gerar Convite por E-mail do Proprietário
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
        const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const shopDomain = `${slug}.carx.com.br`;

        const emailPayload = {
          recipient_name: input.owner_name.trim(),
          recipient_email: input.owner_email.trim(),
          tenant_name: input.trade_name.trim(),
          subdomain: shopDomain,
          segment: catalogSeed.name,
          plan_name: plan.name,
          login_url: `https://${shopDomain}/login`,
          temporary_password: rawPassword,
          invite_token: inviteToken,
        };

        const inviteRes = await client.query(
          `INSERT INTO tenant_invitations (tenant_id, user_id, recipient_email, recipient_name, role, token_hash, status, expires_at, email_payload)
           VALUES ($1, $2, $3, $4, 'owner', $5, 'sent', $6, $7)
           RETURNING id, recipient_email, status, expires_at`,
          [
            tenant.id,
            userId,
            input.owner_email.toLowerCase().trim(),
            input.owner_name.trim(),
            tokenHash,
            inviteExpiresAt,
            JSON.stringify(emailPayload),
          ]
        );

        return {
          tenant,
          unit,
          contract,
          services_count: servicesCount,
          checklists_count: 1,
          invitation: {
            ...inviteRes.rows[0],
            invite_url: `https://${shopDomain}/onboarding?token=${inviteToken}`,
          },
        };
      },
      { isSuperadmin: true }
    );

    // Auditoria (executada após o commit com sucesso da transação)
    await auditService.record({
      tenantId: result.tenant.id,
      superadminUserId,
      action: 'ADMIN_TENANT_CREATED',
      entity: 'tenants',
      entityId: result.tenant.id,
      newValues: {
        slug: result.tenant.slug,
        trade_name: result.tenant.trade_name,
        segment,
        plan: plan.slug,
        services_injected: result.services_count,
        checklists_injected: result.checklists_count,
        owner_email: input.owner_email,
      },
      ipAddress: ip,
      userAgent,
    });

    return result;
  }

  /**
   * Lista os serviços injetados/cadastrados para uma oficina específica
   */
  async listTenantServices(tenantId: string): Promise<ServiceDto[]> {
    const res = await tenantQuery<ServiceDto>(
      null,
      'SELECT * FROM services WHERE tenant_id = $1 ORDER BY category, name ASC',
      [tenantId],
      { isSuperadmin: true }
    );
    return res.rows;
  }

  /**
   * Lista os templates de checklist para uma oficina específica
   */
  async listTenantChecklists(tenantId: string): Promise<ChecklistTemplateDto[]> {
    const res = await tenantQuery<ChecklistTemplateDto>(
      null,
      'SELECT * FROM checklist_templates WHERE tenant_id = $1 ORDER BY name ASC',
      [tenantId],
      { isSuperadmin: true }
    );
    return res.rows;
  }

  /**
   * Lista os convites gerados para os proprietários/usuários da oficina
   */
  async listTenantInvitations(tenantId: string): Promise<TenantInvitationDto[]> {
    const res = await tenantQuery<TenantInvitationDto>(
      null,
      'SELECT * FROM tenant_invitations WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId],
      { isSuperadmin: true }
    );
    return res.rows;
  }

  /**
   * Atualização de status da oficina (Ativação, Suspensão em modo leitura, ou Cancelamento)
   */
  async updateTenantStatus(
    tenantId: string,
    input: AdminUpdateTenantStatusDto,
    superadminUserId: string,
    ip = '127.0.0.1',
    userAgent = 'unknown'
  ): Promise<Record<string, unknown>> {
    const { status, reason } = input;
    if (!status || !['active', 'suspended', 'cancelled'].includes(status)) {
      throw new SuperadminError('Status inválido. Escolha: active, suspended ou cancelled.', 400);
    }
    if (!reason || reason.trim().length < 5) {
      throw new SuperadminError('O motivo da alteração de status é obrigatório (mínimo 5 caracteres).', 400);
    }

    return tenantTransaction(
      null,
      async (client) => {
        const currentRes = await client.query(
          'SELECT id, slug, trade_name, status FROM tenants WHERE id = $1 LIMIT 1',
          [tenantId]
        );
        if (currentRes.rows.length === 0) {
          throw new SuperadminError('Oficina não encontrada.', 404);
        }
        const currentTenant = currentRes.rows[0];

        const updateRes = await client.query(
          `UPDATE tenants 
           SET status = $1, updated_at = NOW() 
           WHERE id = $2 
           RETURNING *`,
          [status, tenantId]
        );
        const updatedTenant = updateRes.rows[0];

        // Atualizar contratos ativos caso haja cancelamento ou suspensão
        if (status === 'cancelled') {
          await client.query(
            `UPDATE contracts 
             SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() 
             WHERE tenant_id = $1 AND status != 'cancelled'`,
            [tenantId]
          );
        } else if (status === 'suspended') {
          await client.query(
            `UPDATE contracts 
             SET status = 'suspended', updated_at = NOW() 
             WHERE tenant_id = $1 AND status = 'active'`,
            [tenantId]
          );
        } else if (status === 'active') {
          await client.query(
            `UPDATE contracts 
             SET status = 'active', updated_at = NOW() 
             WHERE tenant_id = $1 AND status = 'suspended'`,
            [tenantId]
          );
        }

        // Registrar evento de contrato
        const activeContractRes = await client.query(
          'SELECT id FROM contracts WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1',
          [tenantId]
        );
        if (activeContractRes.rows.length > 0) {
          await client.query(
            `INSERT INTO contract_events (contract_id, event_type, details)
             VALUES ($1, $2, $3)`,
            [
              activeContractRes.rows[0].id,
              status === 'active' ? 'reactivated' : status,
              JSON.stringify({
                previous_status: currentTenant.status,
                new_status: status,
                reason,
                changed_by: superadminUserId,
              }),
            ]
          );
        }

        // Trilha de auditoria imutável
        await auditService.record({
          tenantId,
          superadminUserId,
          action: 'ADMIN_TENANT_STATUS_UPDATED',
          entity: 'tenants',
          entityId: tenantId,
          oldValues: { status: currentTenant.status },
          newValues: { status, reason },
          ipAddress: ip,
          userAgent,
        });

        return updatedTenant;
      },
      { isSuperadmin: true }
    );
  }

  /**
   * Impersonação rigorosa e auditada:
   * Gera token de acesso temporário delimitado no tempo para atuar em nome da loja,
   * gravando registro imutável em `impersonation_log` e `audit_logs`.
   */
  async impersonateTenant(
    tenantId: string,
    superadminUserId: string,
    reason: string,
    ip = '127.0.0.1',
    userAgent = 'unknown'
  ): Promise<ImpersonateTenantResponse> {
    if (!reason || reason.trim().length < 5) {
      throw new SuperadminError('A justificativa da impersonação é estritamente obrigatória para auditoria.', 400);
    }

    const tenantRes = await tenantQuery(
      null,
      'SELECT id, slug, trade_name, status FROM tenants WHERE id = $1 LIMIT 1',
      [tenantId],
      { isSuperadmin: true }
    );
    if (tenantRes.rows.length === 0) {
      throw new SuperadminError('Oficina alvo não encontrada.', 404);
    }
    const tenant = tenantRes.rows[0];

    const tokenJti = crypto.randomUUID();
    const expiresInSeconds = 3600; // Sessão de impersonação limitada a 1 hora

    // 1. Gravar registro imutável em impersonation_log
    const impLogRes = await tenantQuery(
      tenant.id,
      `INSERT INTO impersonation_log (superadmin_user_id, tenant_id, reason, token_jti, ip_address, user_agent, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [superadminUserId, tenant.id, reason.trim(), tokenJti, ip, userAgent],
      { isSuperadmin: true }
    );
    const impersonationId = impLogRes.rows[0].id;

    // 2. Emitir token JWT específico para o tenant (papel owner) com flag explícita isImpersonation
    const token = signJwt(
      {
        sub: superadminUserId,
        email: 'impersonation@carx.local',
        tenant_id: tenant.id,
        role: 'owner',
        isImpersonation: true,
        impersonationId,
        impersonatedBy: superadminUserId,
        jti: tokenJti,
      },
      expiresInSeconds
    );

    // 3. Auditoria geral imutável
    await auditService.record({
      tenantId: tenant.id,
      superadminUserId,
      action: 'ADMIN_IMPERSONATION_STARTED',
      entity: 'impersonation_log',
      entityId: impersonationId,
      newValues: {
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
        reason,
        token_jti: tokenJti,
        expiresInSeconds,
      },
      ipAddress: ip,
      userAgent,
    });

    return {
      token,
      expiresInSeconds,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        trade_name: tenant.trade_name,
        status: tenant.status,
      },
      impersonation_id: impersonationId,
    };
  }

  /**
   * Listagem de contratos de todas as oficinas
   */
  async listContracts(): Promise<ContractDto[]> {
    const res = await tenantQuery(
      null,
      `SELECT 
        c.*,
        t.trade_name as tenant_name,
        p.name as plan_name
       FROM contracts c
       JOIN tenants t ON c.tenant_id = t.id
       JOIN plans p ON c.plan_id = p.id
       ORDER BY c.created_at DESC`,
      [],
      { isSuperadmin: true }
    );

    return res.rows.map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      tenant_name: r.tenant_name,
      plan_id: r.plan_id,
      plan_name: r.plan_name,
      billing_cycle: r.billing_cycle,
      negotiated_price_cents: Number(r.negotiated_price_cents),
      discount_cents: Number(r.discount_cents),
      custom_limits: r.custom_limits || {},
      status: r.status,
      starts_at: r.starts_at,
      expires_at: r.expires_at,
      cancelled_at: r.cancelled_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  /**
   * Listagem de faturas globais geradas pela plataforma CarX
   */
  async listInvoices(): Promise<SuperadminInvoiceDto[]> {
    const res = await tenantQuery(
      null,
      `SELECT 
        i.*,
        t.trade_name as tenant_name
       FROM invoices i
       JOIN tenants t ON i.tenant_id = t.id
       ORDER BY i.due_date DESC`,
      [],
      { isSuperadmin: true }
    );

    return res.rows.map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      tenant_name: r.tenant_name,
      contract_id: r.contract_id,
      amount_cents: Number(r.amount_cents),
      status: r.status,
      payment_method: r.payment_method,
      due_date: r.due_date,
      paid_at: r.paid_at,
      external_invoice_id: r.external_invoice_id,
      pdf_url: r.pdf_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  /**
   * Listagem de Leads prospectados da Landing Page
   */
  async listLeads(): Promise<LeadDto[]> {
    const res = await query<LeadDto>('SELECT * FROM leads ORDER BY created_at DESC');
    return res.rows;
  }

  /**
   * Criação de novo Lead vindo da Landing page ou prospecção ativa
   */
  async createLead(input: {
    name: string;
    email: string;
    phone?: string;
    company_name?: string;
    notes?: string;
  }): Promise<LeadDto> {
    if (!input.name || !input.email) {
      throw new SuperadminError('Nome e e-mail são obrigatórios para registrar o lead.', 400);
    }

    const res = await query<LeadDto>(
      `INSERT INTO leads (name, email, phone, company_name, notes)
       VALUES ($1, LOWER(TRIM($2)), $3, $4, $5)
       RETURNING *`,
      [input.name.trim(), input.email, input.phone || null, input.company_name || null, input.notes || null]
    );

    return res.rows[0];
  }

  /**
   * Converte um Lead da Landing Page diretamente em uma Oficina Oficial CarX
   */
  async convertLeadToTenant(
    leadId: string,
    input: ConvertLeadDto,
    superadminUserId: string,
    ip = '127.0.0.1',
    userAgent = 'unknown'
  ): Promise<Record<string, unknown>> {
    const leadRes = await query('SELECT * FROM leads WHERE id = $1 LIMIT 1', [leadId]);
    if (leadRes.rows.length === 0) {
      throw new SuperadminError('Lead não encontrado.', 404);
    }
    const lead = leadRes.rows[0];

    if (lead.status === 'converted') {
      throw new SuperadminError('Este lead já foi convertido anteriormente em oficina.', 400);
    }

    const result = await this.createTenant(
      {
        trade_name: input.trade_name || lead.company_name || lead.name,
        slug: input.slug,
        email: lead.email,
        phone: lead.phone,
        owner_name: lead.name,
        owner_email: lead.email,
        owner_password: input.owner_password,
        plan_slug: input.plan_slug,
        is_trial: input.is_trial ?? true,
      },
      superadminUserId,
      ip,
      userAgent
    );

    const createdTenant = (result as { tenant: { id: string } }).tenant;

    await query(
      `UPDATE leads 
       SET status = 'converted', converted_tenant_id = $1, updated_at = NOW() 
       WHERE id = $2`,
      [createdTenant.id, leadId]
    );

    return result;
  }

  /**
   * Lista logs de auditoria de ações realizadas pelo Super Admin
   */
  async listAdminAuditLogs(params?: { page?: number; limit?: number }) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 20));
    const offset = (page - 1) * limit;

    const countRes = await tenantQuery(
      null,
      `SELECT COUNT(*)::int as total 
       FROM audit_logs 
       WHERE action LIKE 'ADMIN_%' OR action LIKE 'SUPERADMIN_%'`,
      [],
      { isSuperadmin: true }
    );
    const total = Number(countRes.rows[0]?.total || 0);

    const logsRes = await tenantQuery(
      null,
      `SELECT a.*, s.name as admin_name, s.email as admin_email
       FROM audit_logs a
       LEFT JOIN superadmin_users s ON a.superadmin_user_id = s.id
       WHERE a.action LIKE 'ADMIN_%' OR a.action LIKE 'SUPERADMIN_%'
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
      { isSuperadmin: true }
    );

    return {
      logs: logsRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const superadminService = new SuperadminService();
