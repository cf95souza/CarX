import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { provisioningService, ProvisioningError } from '../provisioning/provisioning-service.js';
import { adminPool } from '../database/db.js';
import { signJwt, JwtPayload } from '../auth/jwt.js';
import { generateRandomToken, hashToken } from '../auth/tokens.js';
import { authenticateBearer } from './auth-routes.js';
import { requireTenantContext } from '../plugins/tenant.js';
import { AutomotiveSegment } from '@carx/shared';
import { SEGMENT_CATALOGS } from '../provisioning/segment-catalogs.js';

export interface SelfOnboardingInput {
  trade_name: string;
  owner_name: string;
  owner_email: string;
  owner_password: string;
  phone?: string;
  cnpj?: string;
  slug?: string;
  segment?: AutomotiveSegment;
  plan_slug?: 'essencial' | 'profissional' | 'premium';
  website?: string; // Honeypot anti-bot
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionUrl: string;
}

export interface OnboardingStatusResponse {
  is_completed: boolean;
  progress_percent: number;
  steps: OnboardingStep[];
  segment: string;
  trial_ends_at: string | null;
  days_remaining: number;
}

/**
 * Sanitiza e gera slug seguro para o subdomínio da oficina
 */
function generateCleanSlug(tradeName: string, desiredSlug?: string): string {
  const base = (desiredSlug && desiredSlug.trim()) || tradeName;
  const clean = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return clean || `oficina-${Date.now().toString(36)}`;
}

export async function onboardingRoutes(fastify: FastifyInstance) {
  /**
   * POST /public/onboarding (e POST /auth/self-register)
   * Auto-cadastro e provisionamento instantâneo de novas oficinas com Trial de 14 dias
   */
  const handleSelfOnboarding = async (
    request: FastifyRequest<{ Body: SelfOnboardingInput }>,
    reply: FastifyReply
  ) => {
    const body = request.body || ({} as SelfOnboardingInput);

    // 1. Proteção Honeypot Anti-Bot (Descarte silencioso)
    if (body.website && body.website.trim().length > 0) {
      request.log.warn({ ip: request.ip }, 'Honeypot acionado no cadastro self-service');
      return reply.code(200).send({
        success: true,
        message: 'Oficina cadastrada com sucesso! Verifique seu e-mail.',
      });
    }

    // 2. Validações de campos obrigatórios
    if (!body.trade_name || body.trade_name.trim().length < 2) {
      return reply.code(400).send({
        statusCode: 400,
        message: 'O nome fantasia da oficina deve conter no mínimo 2 caracteres.',
      });
    }
    if (!body.owner_name || body.owner_name.trim().length < 2) {
      return reply.code(400).send({
        statusCode: 400,
        message: 'O nome do proprietário deve conter no mínimo 2 caracteres.',
      });
    }
    if (!body.owner_email || !body.owner_email.includes('@')) {
      return reply.code(400).send({
        statusCode: 400,
        message: 'E-mail do proprietário inválido.',
      });
    }
    if (!body.owner_password || body.owner_password.length < 6) {
      return reply.code(400).send({
        statusCode: 400,
        message: 'A senha de acesso deve possuir no mínimo 6 caracteres.',
      });
    }

    const cleanEmail = body.owner_email.toLowerCase().trim();

    // 3. Verificar se o e-mail do dono já possui conta
    const existingUser = await adminPool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [cleanEmail]
    );
    if (existingUser.rows.length > 0) {
      return reply.code(409).send({
        statusCode: 409,
        message: 'Este e-mail já possui uma conta no CarX. Faça login ou use outro e-mail.',
      });
    }

    // 4. Gerar slug único sem colisão
    let baseSlug = generateCleanSlug(body.trade_name, body.slug);
    let finalSlug = baseSlug;
    let collisionCount = 0;

    while (collisionCount < 5) {
      const checkRes = await adminPool.query(
        'SELECT id FROM tenants WHERE slug = $1 LIMIT 1',
        [finalSlug]
      );
      if (checkRes.rows.length === 0) {
        break;
      }
      collisionCount++;
      finalSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // 5. Normalizar Segmento e Plano
    const validSegments: AutomotiveSegment[] = ['ppf', 'insulfilm', 'detailing', 'mecanica'];
    const chosenSegment: AutomotiveSegment = validSegments.includes(body.segment as AutomotiveSegment)
      ? (body.segment as AutomotiveSegment)
      : 'mecanica';

    const validPlans = ['essencial', 'profissional', 'premium'];
    const chosenPlan = validPlans.includes(body.plan_slug || '') ? body.plan_slug! : 'profissional';

    try {
      // 6. Provisionamento completo da oficina através do ProvisioningService
      const provisionResult = await provisioningService.provisionTenant(
        {
          trade_name: body.trade_name.trim(),
          slug: finalSlug,
          owner_name: body.owner_name.trim(),
          owner_email: cleanEmail,
          owner_password: body.owner_password,
          phone: body.phone?.trim() || '',
          email: cleanEmail,
          cnpj: body.cnpj?.trim() || '',
          segment: chosenSegment,
          plan_slug: chosenPlan,
          is_trial: true,
          trial_days: 14,
        },
        'self-service-onboarding',
        request.ip || '127.0.0.1',
        request.headers['user-agent'] || 'CarX Web Onboarding'
      );

      // 7. Emitir par de tokens JWT para login automático sem fricção
      const accessPayload: JwtPayload = {
        sub: provisionResult.user.id,
        email: cleanEmail,
        name: body.owner_name.trim(),
        tenant_id: provisionResult.tenant.id,
        role: 'owner',
        isSuperadmin: false,
        type: 'access',
      };

      const accessToken = signJwt(accessPayload, 60 * 60 * 24); // 24 horas no trial
      const rawRefreshToken = generateRandomToken(40);
      const tokenHash = hashToken(rawRefreshToken);
      const familyId = generateRandomToken(16);
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await adminPool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [provisionResult.user.id, tokenHash, familyId, refreshExpiresAt]
      );

      // 8. Marcar estado inicial de onboarding no settings do tenant
      const initialSettings = {
        onboarding_completed: false,
        onboarding_started_at: new Date().toISOString(),
        onboarding_steps: {
          setup: true,
          first_customer: false,
          first_work_order: false,
          explore_pwa: false,
        },
      };

      await adminPool.query(
        'UPDATE tenants SET settings = $1 WHERE id = $2',
        [JSON.stringify(initialSettings), provisionResult.tenant.id]
      );

      const segmentInfo = SEGMENT_CATALOGS[chosenSegment];

      return reply.code(201).send({
        success: true,
        message: `Oficina "${body.trade_name}" criada com sucesso no segmento ${segmentInfo.name}! Seu período de teste de 14 dias está liberado.`,
        tokens: {
          accessToken,
          refreshToken: rawRefreshToken,
          expiresInSeconds: 86400,
        },
        tenant: {
          id: provisionResult.tenant.id,
          slug: finalSlug,
          trade_name: body.trade_name.trim(),
          segment: chosenSegment,
          segment_label: segmentInfo.name,
          status: 'trialing',
          trial_ends_at: provisionResult.tenant.trial_ends_at,
        },
        user: {
          id: provisionResult.user.id,
          name: body.owner_name.trim(),
          email: cleanEmail,
          role: 'owner',
        },
        injectedCatalog: {
          servicesCount: provisionResult.servicesCount,
          checklistTemplatesCount: provisionResult.checklistTemplatesCount,
          sampleServices: segmentInfo.services.slice(0, 3).map((s) => s.name),
        },
        firstStepsChecklist: [
          {
            id: 'setup',
            title: 'Oficina criada e segmentada',
            description: `Catálogo de serviços e checklist de entrada de ${segmentInfo.name} prontos para uso.`,
            completed: true,
            actionUrl: '/servicos',
          },
          {
            id: 'first_customer',
            title: 'Cadastre seu primeiro cliente e veículo',
            description: 'Insira uma placa de teste para ver a consulta automática de marca, modelo e ano.',
            completed: false,
            actionUrl: '/clientes',
          },
          {
            id: 'first_work_order',
            title: 'Abra sua primeira Ordem de Serviço (OS)',
            description: 'Vincule o veículo ao serviço com cálculo de preços por porte em tempo real.',
            completed: false,
            actionUrl: '/ordens',
          },
          {
            id: 'explore_pwa',
            title: 'Experimente o PWA do Técnico e a TV da Oficina',
            description: 'Acompanhe o cronômetro oficial de foco único e a fila de serviços.',
            completed: false,
            actionUrl: '/tv',
          },
        ],
      });
    } catch (err: any) {
      request.log.error(err, 'Erro durante self-service onboarding');
      const statusCode = err instanceof ProvisioningError ? err.statusCode : 500;
      return reply.code(statusCode).send({
        statusCode,
        message: err.message || 'Falha ao processar o onboarding da oficina.',
      });
    }
  };

  // Registro das rotas públicas
  fastify.post('/public/onboarding', handleSelfOnboarding);
  fastify.post('/auth/self-register', handleSelfOnboarding);

  /**
   * GET /tenant/onboarding/status — Obtém o status do checklist guiado em tempo real
   */
  fastify.get(
    '/tenant/onboarding/status',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;

      // 1. Dados do Tenant e Settings
      const tenantRes = await adminPool.query<{
        segment: string;
        trial_ends_at: string | null;
        settings: any;
      }>('SELECT segment, trial_ends_at, settings FROM tenants WHERE id = $1', [tenantId]);

      if (tenantRes.rows.length === 0) {
        return reply.code(404).send({ statusCode: 404, message: 'Oficina não encontrada.' });
      }

      const tenant = tenantRes.rows[0];
      const settings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
      const segmentKey = (tenant.segment || 'mecanica') as AutomotiveSegment;
      const segmentName = SEGMENT_CATALOGS[segmentKey]?.name || 'Automotivo';

      // 2. Checar se já possui clientes cadastrados
      const customerCountRes = await adminPool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM customers WHERE tenant_id = $1',
        [tenantId]
      );
      const hasCustomer = parseInt(customerCountRes.rows[0].count, 10) > 0;

      // 3. Checar se já possui Ordens de Serviço cadastradas
      const orderCountRes = await adminPool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM work_orders WHERE tenant_id = $1',
        [tenantId]
      );
      const hasWorkOrder = parseInt(orderCountRes.rows[0].count, 10) > 0;

      // 4. Checar exploração do PWA / TV
      const pwaExplored = Boolean(settings.onboarding_steps?.explore_pwa);

      // 5. Montar os 4 passos guiados
      const steps: OnboardingStep[] = [
        {
          id: 'setup',
          title: 'Oficina criada e segmentada',
          description: `Catálogo e checklist padrão para ${segmentName} ativos.`,
          completed: true,
          actionUrl: '/servicos',
        },
        {
          id: 'first_customer',
          title: 'Cadastre seu primeiro cliente e veículo',
          description: 'Insira os dados do primeiro proprietário e placa de veículo.',
          completed: hasCustomer,
          actionUrl: '/clientes',
        },
        {
          id: 'first_work_order',
          title: 'Abra sua primeira Ordem de Serviço (OS)',
          description: 'Crie uma OS completa usando um dos serviços cadastrados.',
          completed: hasWorkOrder,
          actionUrl: '/ordens',
        },
        {
          id: 'explore_pwa',
          title: 'Conheça o PWA do Técnico e Monitor TV',
          description: 'Visualize as ordens em execução na TV ou no celular do técnico.',
          completed: pwaExplored,
          actionUrl: '/tv',
        },
      ];

      const completedCount = steps.filter((s) => s.completed).length;
      const progressPercent = Math.round((completedCount / steps.length) * 100);
      const isCompleted = Boolean(settings.onboarding_completed) || completedCount === steps.length;

      // Cálculo de dias restantes do trial
      let daysRemaining = 14;
      if (tenant.trial_ends_at) {
        const diffMs = new Date(tenant.trial_ends_at).getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      return reply.code(200).send({
        is_completed: isCompleted,
        progress_percent: progressPercent,
        steps,
        segment: segmentName,
        trial_ends_at: tenant.trial_ends_at,
        days_remaining: daysRemaining,
      });
    }
  );

  /**
   * POST /tenant/onboarding/complete — Marca o onboarding como concluído ou dispensado
   */
  fastify.post(
    '/tenant/onboarding/complete',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;

      await adminPool.query(
        `UPDATE tenants 
         SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{onboarding_completed}', 'true'::jsonb),
             updated_at = NOW()
         WHERE id = $1`,
        [tenantId]
      );

      return reply.code(200).send({
        success: true,
        message: 'Guia de primeiros passos finalizado com sucesso.',
        is_completed: true,
      });
    }
  );

  /**
   * POST /tenant/onboarding/step — Marca um passo específico como concluído (ex: explore_pwa)
   */
  fastify.post<{ Body: { stepId: string } }>(
    '/tenant/onboarding/step',
    { preHandler: [authenticateBearer, requireTenantContext] },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const { stepId } = request.body || {};

      if (!stepId) {
        return reply.code(400).send({ statusCode: 400, message: 'ID do passo obrigatório.' });
      }

      await adminPool.query(
        `UPDATE tenants 
         SET settings = jsonb_set(
           COALESCE(settings, '{}'::jsonb), 
           ARRAY['onboarding_steps', $2::text], 
           'true'::jsonb, 
           true
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [tenantId, stepId]
      );

      return reply.code(200).send({
        success: true,
        stepId,
        completed: true,
      });
    }
  );
}

export default onboardingRoutes;
