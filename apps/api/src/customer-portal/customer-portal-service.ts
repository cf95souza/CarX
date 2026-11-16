import crypto from 'crypto';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';
import { normalizePhone, PlanFeatures } from '@carx/shared';
import { planService } from '../plans/plan-service.js';
import { whatsappService } from '../whatsapp/whatsapp-service.js';
import { storageService } from '../storage/storage-service.js';
import type {
  PortalCustomerDto,
  PortalVehicleDto,
  PortalWorkOrderListItemDto,
  PortalWorkOrderDetailDto,
  PortalWorkOrderTimelineEventDto,
  PortalPhotoDto,
  PortalWarrantyDto,
  PortalAuthResponseDto,
} from '@carx/shared';

export class CustomerPortalError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'CustomerPortalError';
  }
}

export class CustomerPortalService {
  private hashOtpCode(tenantId: string, identifier: string, code: string): string {
    const secret = process.env.JWT_ACCESS_SECRET || 'carx_portal_secret_key';
    return crypto
      .createHmac('sha256', secret)
      .update(`${tenantId}:${identifier}:${code}`)
      .digest('hex');
  }

  private normalizeIdentifier(rawIdentifier: string): { normalized: string; isEmail: boolean } {
    const trimmed = rawIdentifier.trim();
    if (trimmed.includes('@')) {
      return { normalized: trimmed.toLowerCase(), isEmail: true };
    }
    const phone = normalizePhone(trimmed);
    return { normalized: phone, isEmail: false };
  }

  /**
   * Solicita um código OTP de 6 dígitos numéricos.
   * Aplica estrita proteção anti-enumeração de clientes e validação arquitetural
   * de dependência do WhatsApp Gateway e sessão ativa da oficina.
   */
  async requestOtp(
    tenantId: string,
    rawIdentifier: string
  ): Promise<{ success: boolean; message: string; devOtpCode?: string }> {
    // 1. Validar Feature Gating do Plano: Customer Portal e WhatsApp Gateway
    const hasPortal = await planService.hasFeature(tenantId, PlanFeatures.CUSTOMER_PORTAL);
    const hasWaGateway = await planService.hasFeature(tenantId, PlanFeatures.WHATSAPP_GATEWAY);

    if (!hasPortal || !hasWaGateway) {
      throw new CustomerPortalError(
        403,
        'PORTAL_UNAVAILABLE',
        'O portal do cliente desta oficina não está disponível para envio de código de segurança no momento. Entre em contato diretamente com a oficina.'
      );
    }

    // 2. Validar se a oficina possui instância de WhatsApp ativa e conectada
    const waInstance = await whatsappService.getInstance(tenantId);
    if (waInstance.status !== 'CONNECTED') {
      throw new CustomerPortalError(
        403,
        'WHATSAPP_NOT_CONNECTED',
        'O canal de envio por WhatsApp desta oficina ainda não foi configurado. Por favor, entre em contato diretamente com a oficina para consultar seu veículo.'
      );
    }

    const { normalized, isEmail } = this.normalizeIdentifier(rawIdentifier);

    // Consulta do cliente sob isolamento RLS do tenant
    const customerQuery = isEmail
      ? `SELECT id, name, phone, email FROM customers WHERE tenant_id = $1 AND LOWER(email) = $2 AND is_active = true LIMIT 1`
      : `SELECT id, name, phone, email FROM customers WHERE tenant_id = $1 AND (phone = $2 OR phone_raw = $2) AND is_active = true LIMIT 1`;

    const result = await tenantQuery(tenantId, customerQuery, [tenantId, normalized]);

    // Resposta padrão neutra para proteção de enumeração
    const neutralMessage =
      'Se o identificador informado estiver cadastrado, você receberá um código de verificação de 6 dígitos em instantes.';

    if (result.rows.length === 0) {
      // Cliente não encontrado: retorna mensagem de sucesso neutra sem expor ausência de cadastro
      return {
        success: true,
        message: neutralMessage,
      };
    }

    const customer = result.rows[0];

    // Gera código aleatório criptográfico de 6 dígitos (100000 - 999999)
    const code = crypto.randomInt(100000, 1000000).toString();
    const otpHash = this.hashOtpCode(tenantId, normalized, code);

    // Invalida OTPs anteriores pendentes para o mesmo identificador
    await tenantQuery(
      tenantId,
      `UPDATE customer_portal_otps
       SET used_at = NOW()
       WHERE tenant_id = $1 AND identifier = $2 AND used_at IS NULL`,
      [tenantId, normalized]
    );

    // Grava o novo OTP com expiração em 10 minutos e limite de 5 tentativas
    await tenantQuery(
      tenantId,
      `INSERT INTO customer_portal_otps (
         tenant_id, customer_id, identifier, otp_hash, attempts, max_attempts, expires_at
       ) VALUES ($1, $2, $3, $4, 0, 5, NOW() + INTERVAL '10 minutes')`,
      [tenantId, customer.id, normalized, otpHash]
    );

    // Dispara o OTP via WhatsApp oficial da própria oficina
    const tenantMeta = await tenantQuery<{ trade_name: string }>(
      tenantId,
      'SELECT trade_name FROM tenants WHERE id = $1 LIMIT 1',
      [tenantId]
    );
    const tradeName = tenantMeta.rows[0]?.trade_name || 'sua oficina';

    try {
      await whatsappService.sendMessage(tenantId, {
        to: customer.phone || normalized,
        message: `🔐 *${tradeName}*: Seu código de acesso ao portal *Meu Veículo* é: *${code}*.\n\nVálido por 10 minutos. Nunca compartilhe este código com ninguém.`,
      });
    } catch (sendErr: any) {
      console.warn(`[Portal OTP] Falha no disparo de WhatsApp para ${customer.phone}:`, sendErr?.message);
    }

    // Disponibiliza devOtpCode fora de produção (dev e testes)
    const isDevOrTest = process.env.NODE_ENV !== 'production';

    return {
      success: true,
      message: neutralMessage,
      devOtpCode: isDevOrTest ? code : undefined,
    };
  }

  /**
   * Valida o código OTP informado pelo cliente e emite o token JWT com scope 'customer_portal'.
   */
  async verifyOtp(
    tenantId: string,
    rawIdentifier: string,
    code: string
  ): Promise<PortalAuthResponseDto> {
    const { normalized } = this.normalizeIdentifier(rawIdentifier);

    // Busca o OTP ativo mais recente sob contexto de tenant RLS
    const otpRes = await tenantQuery(
      tenantId,
      `SELECT id, customer_id, otp_hash, attempts, max_attempts, expires_at, used_at
       FROM customer_portal_otps
       WHERE tenant_id = $1 AND identifier = $2 AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, normalized]
    );

    if (otpRes.rows.length === 0) {
      throw new CustomerPortalError(
        400,
        'OTP_NOT_FOUND',
        'Código de verificação não encontrado ou já utilizado. Solicite um novo código.'
      );
    }

    const otp = otpRes.rows[0];

    // Verifica expiração
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      throw new CustomerPortalError(
        400,
        'OTP_EXPIRED',
        'O código de verificação expirou. Solicite um novo código.'
      );
    }

    // Verifica limite de tentativas anteriores
    if (otp.attempts >= otp.max_attempts) {
      throw new CustomerPortalError(
        429,
        'OTP_TOO_MANY_ATTEMPTS',
        'Limite máximo de tentativas excedido para este código. Solicite um novo código.'
      );
    }

    // Incrementa contagem de tentativas
    const newAttempts = otp.attempts + 1;
    await tenantQuery(
      tenantId,
      `UPDATE customer_portal_otps SET attempts = $1 WHERE id = $2 AND tenant_id = $3`,
      [newAttempts, otp.id, tenantId]
    );

    // Valida hash do código em tempo constante
    const expectedHash = this.hashOtpCode(tenantId, normalized, code);
    const isValid =
      expectedHash.length === otp.otp_hash.length &&
      crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(otp.otp_hash));

    if (!isValid) {
      const remainingAttempts = Math.max(0, otp.max_attempts - newAttempts);
      if (remainingAttempts === 0) {
        throw new CustomerPortalError(
          429,
          'OTP_TOO_MANY_ATTEMPTS',
          'Limite máximo de tentativas excedido para este código. Solicite um novo código.'
        );
      }
      throw new CustomerPortalError(
        400,
        'OTP_INVALID',
        `Código de verificação incorreto. Você tem mais ${remainingAttempts} tentativa(s).`
      );
    }

    // Código válido: marca como utilizado
    await tenantQuery(
      tenantId,
      `UPDATE customer_portal_otps SET used_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [otp.id, tenantId]
    );

    // Carrega dados completos do cliente sob contexto de tenant RLS
    const custRes = await tenantQuery(
      tenantId,
      `SELECT id, name, phone, email, document, document_type, address_city, address_state
       FROM customers
       WHERE id = $1 AND tenant_id = $2`,
      [otp.customer_id, tenantId]
    );

    if (custRes.rows.length === 0) {
      throw new CustomerPortalError(404, 'CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
    }

    const c = custRes.rows[0];
    const customerDto: PortalCustomerDto = {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email || null,
      document: c.document || null,
      documentType: c.document_type || null,
      city: c.address_city || null,
      state: c.address_state || null,
    };

    // Gera token JWT de sessão do portal (7 dias de validade)
    const token = signJwt(
      {
        sub: c.id,
        customerId: c.id,
        tenant_id: tenantId,
        tenantId,
        role: 'customer',
        scope: 'customer_portal',
        name: c.name,
        email: c.email || undefined,
        phone: c.phone,
      },
      7 * 24 * 3600
    );

    return {
      token,
      customer: customerDto,
    };
  }

  /**
   * Retorna os dados do perfil do cliente autenticado.
   */
  async getProfile(tenantId: string, customerId: string): Promise<PortalCustomerDto> {
    const res = await tenantQuery(
      tenantId,
      `SELECT id, name, phone, email, document, document_type, address_city, address_state
       FROM customers
       WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
      [customerId, tenantId]
    );

    if (res.rows.length === 0) {
      throw new CustomerPortalError(404, 'CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
    }

    const c = res.rows[0];
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email || null,
      document: c.document || null,
      documentType: c.document_type || null,
      city: c.address_city || null,
      state: c.address_state || null,
    };
  }

  /**
   * Retorna os veículos pertencentes ao cliente autenticado.
   * Se o cliente não possuir veículos, retorna array vazio [] (zero dados fictícios / zero modo demo).
   */
  async getVehicles(tenantId: string, customerId: string): Promise<PortalVehicleDto[]> {
    const res = await tenantQuery(
      tenantId,
      `SELECT id, plate, brand, model, color, year as model_year, size_class, current_km
       FROM vehicles
       WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true
       ORDER BY created_at DESC`,
      [tenantId, customerId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      plate: row.plate,
      brand: row.brand,
      model: row.model,
      color: row.color || null,
      modelYear: row.model_year ? Number(row.model_year) : null,
      sizeClass: row.size_class,
      currentKm: row.current_km ? Number(row.current_km) : null,
    }));
  }

  /**
   * Retorna as ordens de serviço do cliente autenticado com resumo de status e valores.
   * Se o cliente não possuir OSs, retorna array vazio [] (zero dados fictícios / zero modo demo).
   */
  async getWorkOrders(tenantId: string, customerId: string): Promise<PortalWorkOrderListItemDto[]> {
    const res = await tenantQuery(
      tenantId,
      `SELECT 
         wo.id,
         wo.os_number,
         wo.status,
         wo.progress,
         wo.total_cents,
         wo.discount_cents,
         wo.final_cents,
         wo.paid_cents,
         wo.tracking_token,
         wo.scheduled_at as estimated_delivery_date,
         wo.delivered_at,
         wo.created_at,
         v.plate as vehicle_plate,
         v.brand as vehicle_brand,
         v.model as vehicle_model
       FROM work_orders wo
       JOIN vehicles v ON v.id = wo.vehicle_id
       WHERE wo.tenant_id = $1 AND wo.customer_id = $2
       ORDER BY wo.created_at DESC`,
      [tenantId, customerId]
    );

    return res.rows.map((row) => {
      const finalCents = Number(row.final_cents || 0);
      const paidCents = Number(row.paid_cents || 0);
      return {
        id: row.id,
        osNumber: Number(row.os_number),
        status: row.status,
        progress: Number(row.progress || 0),
        vehiclePlate: row.vehicle_plate,
        vehicleBrand: row.vehicle_brand,
        vehicleModel: row.vehicle_model,
        totalCents: Number(row.total_cents || 0),
        discountCents: Number(row.discount_cents || 0),
        finalCents,
        paidCents,
        isFullyPaid: paidCents >= finalCents && finalCents > 0,
        trackingToken: row.tracking_token,
        estimatedDeliveryDate: row.estimated_delivery_date
          ? new Date(row.estimated_delivery_date).toISOString()
          : null,
        deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null,
        createdAt: new Date(row.created_at).toISOString(),
      };
    });
  }

  /**
   * Retorna os detalhes completos de uma ordem de serviço pertencente ao cliente autenticado.
   * Se a OS pertencer a outro cliente ou não existir, retorna 404 (sem revelar existência).
   */
  async getWorkOrderDetail(
    tenantId: string,
    customerId: string,
    workOrderId: string
  ): Promise<PortalWorkOrderDetailDto> {
    const woRes = await tenantQuery(
      tenantId,
      `SELECT 
         wo.id,
         wo.os_number,
         wo.status,
         wo.progress,
         wo.notes,
         wo.total_cents,
         wo.discount_cents,
         wo.final_cents,
         wo.paid_cents,
         wo.tracking_token,
         wo.scheduled_at as estimated_delivery_date,
         wo.delivered_at,
         wo.created_at,
         v.plate as vehicle_plate,
         v.brand as vehicle_brand,
         v.model as vehicle_model
       FROM work_orders wo
       JOIN vehicles v ON v.id = wo.vehicle_id
       WHERE wo.id = $1 AND wo.tenant_id = $2 AND wo.customer_id = $3`,
      [workOrderId, tenantId, customerId]
    );

    if (woRes.rows.length === 0) {
      throw new CustomerPortalError(
        404,
        'WORK_ORDER_NOT_FOUND',
        'Ordem de serviço não encontrada.'
      );
    }

    const row = woRes.rows[0];
    const finalCents = Number(row.final_cents || 0);
    const paidCents = Number(row.paid_cents || 0);

    // Carrega itens da OS
    const itemsRes = await tenantQuery(
      tenantId,
      `SELECT id, name as service_name, NULL as description, quantity, unit_price_cents, total_cents as final_price_cents, warranty_months
       FROM work_order_items
       WHERE work_order_id = $1 AND tenant_id = $2
       ORDER BY custom_order ASC, created_at ASC`,
      [workOrderId, tenantId]
    );

    const items = itemsRes.rows.map((item) => ({
      id: item.id,
      serviceName: item.service_name,
      description: item.description || null,
      quantity: Number(item.quantity || 1),
      unitPriceCents: Number(item.unit_price_cents || 0),
      finalPriceCents: Number(item.final_price_cents || 0),
      warrantyMonths: Number(item.warranty_months || 0),
    }));

    return {
      id: row.id,
      osNumber: Number(row.os_number),
      status: row.status,
      progress: Number(row.progress || 0),
      vehiclePlate: row.vehicle_plate,
      vehicleBrand: row.vehicle_brand,
      vehicleModel: row.vehicle_model,
      notes: row.notes || null,
      totalCents: Number(row.total_cents || 0),
      discountCents: Number(row.discount_cents || 0),
      finalCents,
      paidCents,
      isFullyPaid: paidCents >= finalCents && finalCents > 0,
      trackingToken: row.tracking_token,
      estimatedDeliveryDate: row.estimated_delivery_date
        ? new Date(row.estimated_delivery_date).toISOString()
        : null,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      items,
    };
  }

  /**
   * Retorna a linha do tempo dos eventos da OS amigável para o cliente.
   */
  async getWorkOrderTimeline(
    tenantId: string,
    customerId: string,
    workOrderId: string
  ): Promise<PortalWorkOrderTimelineEventDto[]> {
    // Garante posse da OS pelo cliente sob RLS
    const woRes = await tenantQuery(
      tenantId,
      `SELECT id FROM work_orders WHERE id = $1 AND tenant_id = $2 AND customer_id = $3`,
      [workOrderId, tenantId, customerId]
    );

    if (woRes.rows.length === 0) {
      throw new CustomerPortalError(
        404,
        'WORK_ORDER_NOT_FOUND',
        'Ordem de serviço não encontrada.'
      );
    }

    const eventsRes = await tenantQuery(
      tenantId,
      `SELECT id, event_type, from_status, to_status, notes, created_at
       FROM work_order_events
       WHERE work_order_id = $1 AND tenant_id = $2
       ORDER BY created_at ASC`,
      [workOrderId, tenantId]
    );

    const titleMap: Record<string, string> = {
      CREATED: 'Orçamento Criado',
      STATUS_CHANGED: 'Status Atualizado',
      CHECKED_IN: 'Veículo Recepcionado no Pátio',
      IN_PROGRESS: 'Serviço em Execução',
      QA: 'Controle de Qualidade em Andamento',
      READY: 'Veículo Pronto para Retirada',
      DELIVERED: 'Veículo Entregue',
      PAYMENT_RECEIVED: 'Pagamento Confirmado',
    };

    return eventsRes.rows.map((ev) => ({
      id: ev.id,
      eventType: ev.event_type,
      fromStatus: ev.from_status || null,
      toStatus: ev.to_status,
      title: titleMap[ev.to_status] || titleMap[ev.event_type] || 'Atualização da Ordem de Serviço',
      description: ev.notes || null,
      createdAt: new Date(ev.created_at).toISOString(),
    }));
  }

  /**
   * Retorna as fotos da inspeção (antes/durante/depois) associadas à OS do cliente.
   */
  async getWorkOrderPhotos(
    tenantId: string,
    customerId: string,
    workOrderId: string
  ): Promise<PortalPhotoDto[]> {
    // Garante posse da OS pelo cliente sob RLS
    const woRes = await tenantQuery(
      tenantId,
      `SELECT id FROM work_orders WHERE id = $1 AND tenant_id = $2 AND customer_id = $3`,
      [workOrderId, tenantId, customerId]
    );

    if (woRes.rows.length === 0) {
      throw new CustomerPortalError(
        404,
        'WORK_ORDER_NOT_FOUND',
        'Ordem de serviço não encontrada.'
      );
    }

    const photosRes = await tenantQuery(
      tenantId,
      `SELECT 
         ip.id,
         ip.angle,
         ip.phase,
         ip.caption,
         ip.created_at,
         ip.photo_file_id,
         '/storage/files/' || ip.photo_file_id || '/view' as fallback_url
       FROM inspection_photos ip
       JOIN inspections i ON i.id = ip.inspection_id
       WHERE i.work_order_id = $1 AND i.tenant_id = $2
       ORDER BY ip.created_at ASC`,
      [workOrderId, tenantId]
    );

    const photosWithUrls: PortalPhotoDto[] = await Promise.all(
      photosRes.rows.map(async (p) => {
        let finalUrl = p.fallback_url;
        if (p.photo_file_id) {
          try {
            const presigned = await storageService.getPresignedDownloadUrl(tenantId, p.photo_file_id, 3600);
            if (presigned?.downloadUrl) {
              finalUrl = presigned.downloadUrl;
            }
          } catch {
            // fallback para a rota proxy /view
          }
        }
        return {
          id: p.id,
          angle: p.angle,
          phase: p.phase,
          caption: p.caption || null,
          url: finalUrl,
          createdAt: new Date(p.created_at).toISOString(),
        };
      })
    );

    return photosWithUrls;
  }

  /**
   * Retorna as garantias ativas vinculadas aos veículos do cliente.
   */
  async getCustomerWarranties(tenantId: string, customerId: string): Promise<PortalWarrantyDto[]> {
    const res = await tenantQuery(
      tenantId,
      `SELECT 
         w.id,
         w.work_order_id,
         wo.os_number,
         w.service_name,
         v.plate as vehicle_plate,
         v.model as vehicle_model,
         w.warranty_months,
         w.starts_at,
         w.expires_at,
         GREATEST(0, EXTRACT(DAY FROM (w.expires_at - NOW()))::INTEGER) as days_remaining,
         w.status,
         w.verification_token,
         w.pdf_file_id
       FROM warranties w
       LEFT JOIN work_orders wo ON wo.id = w.work_order_id
       LEFT JOIN vehicles v ON v.id = w.vehicle_id
       WHERE w.tenant_id = $1 AND w.customer_id = $2 AND w.status != 'revoked'
       ORDER BY w.created_at DESC`,
      [tenantId, customerId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      workOrderId: row.work_order_id,
      osNumber: row.os_number ? Number(row.os_number) : undefined,
      serviceName: row.service_name,
      vehiclePlate: row.vehicle_plate || '---',
      vehicleModel: row.vehicle_model || '---',
      warrantyMonths: Number(row.warranty_months || 0),
      startsAt: new Date(row.starts_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString(),
      daysRemaining: Number(row.days_remaining || 0),
      status: row.status,
      verificationToken: row.verification_token,
      pdfDownloadUrl: row.pdf_file_id ? `/warranties/${row.id}/pdf` : undefined,
    }));
  }
}

export const customerPortalService = new CustomerPortalService();
