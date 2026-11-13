// ==============================================================================
// CARX SAAS — SERVIÇO DE CRM DE PÓS-VENDA, GARANTIAS & RETENÇÃO ATIVA (T6.15)
// ==============================================================================

import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import type {
  CrmRetentionOverviewDto,
  WarrantyRevisionItemDto,
  InactiveCustomerItemDto,
  CrmRetentionRuleDto,
  CreateCrmRetentionRuleInputDto,
  TriggerRetentionContactInputDto,
  TriggerRetentionContactResultDto,
  ConvertRetentionContactInputDto,
  RetentionContactItemDto,
} from '@carx/shared';
import crypto from 'node:crypto';

export class CrmRetentionService {
  /**
   * Inicializa as regras padrão de pós-venda da oficina caso ainda não existam.
   */
  static async seedDefaultRetentionRules(tenantId: string): Promise<void> {
    const existing = await tenantQuery<{ count: string }>(
      tenantId,
      `SELECT COUNT(*) as count FROM crm_retention_rules WHERE tenant_id = $1`,
      [tenantId]
    );

    if (parseInt(existing.rows[0]?.count || '0', 10) > 0) {
      return;
    }

    const defaultRules = [
      {
        name: 'Revisão Periódica PPF (6 Meses)',
        serviceCategory: 'ppf',
        triggerType: 'warranty_revision',
        intervalDays: 180,
        channel: 'whatsapp',
        messageTemplate:
          'Olá, {cliente}! Tudo bem? Seu {veiculo} está completando 6 meses desde a aplicação do PPF ({servico}). Para manter a garantia ativa e o brilho impecável, precisamos realizar sua revisão preventiva gratuita. Agende agora e ganhe {cupom_beneficio}: {link_agendamento}',
        discountType: 'free_service',
        discountValue: 0,
      },
      {
        name: 'Manutenção Anual de Vitrificação (12 Meses)',
        serviceCategory: 'vitrificacao',
        triggerType: 'warranty_revision',
        intervalDays: 365,
        channel: 'whatsapp',
        messageTemplate:
          'Olá, {cliente}! Já faz quase 1 ano que vitrificamos seu {veiculo}. Para renovar a hidrofobia e a proteção cerâmica, preparamos uma condição exclusiva com cupom {cupom_codigo} de {cupom_beneficio}. Podemos agendar sua manutenção?',
        discountType: 'percentage',
        discountValue: 15,
      },
      {
        name: 'Higienização e Proteção Semestral (180 Dias)',
        serviceCategory: 'higienizacao',
        triggerType: 'service_interval',
        intervalDays: 180,
        channel: 'whatsapp',
        messageTemplate:
          'Olá, {cliente}! O interior do seu {veiculo} foi higienizado há 6 meses. O acúmulo de ácaros e poluição ocorre naturalmente. Use o cupom {cupom_codigo} para ter {cupom_beneficio} na sua nova higienização!',
        discountType: 'percentage',
        discountValue: 10,
      },
      {
        name: 'Radar Anti-Churn: Retenção Ativa (180+ Dias)',
        serviceCategory: 'geral',
        triggerType: 'customer_inactivity',
        intervalDays: 180,
        channel: 'whatsapp',
        messageTemplate:
          'Olá, {cliente}, estamos com saudades de você e do seu {veiculo} por aqui! Preparamos um presente especial de retorno: cupom exclusivo {cupom_codigo} com {cupom_beneficio} para qualquer serviço este mês!',
        discountType: 'percentage',
        discountValue: 15,
      },
    ];

    for (const rule of defaultRules) {
      await tenantQuery(
        tenantId,
        `INSERT INTO crm_retention_rules (
          tenant_id, name, service_category, trigger_type, interval_days, channel,
          message_template, discount_type, discount_value, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
        [
          tenantId,
          rule.name,
          rule.serviceCategory,
          rule.triggerType,
          rule.intervalDays,
          rule.channel,
          rule.messageTemplate,
          rule.discountType,
          rule.discountValue,
        ]
      );
    }
  }

  /**
   * Retorna os KPIs consolidados de CRM de Retenção e Churn.
   */
  static async getRetentionOverview(tenantId: string): Promise<CrmRetentionOverviewDto> {
    await this.seedDefaultRetentionRules(tenantId);

    // 1. Total de clientes da base
    const totalRes = await tenantQuery<{ count: string }>(
      tenantId,
      `SELECT COUNT(*) as count FROM customers WHERE tenant_id = $1`,
      [tenantId]
    );
    const totalCustomers = parseInt(totalRes.rows[0]?.count || '0', 10);

    // 2. Análise de inatividade e recompra baseada nas OSs concluídas
    const visitsRes = await tenantQuery<{
      customer_id: string;
      os_count: string;
      days_since_last: string;
    }>(
      tenantId,
      `SELECT 
        c.id as customer_id,
        COUNT(wo.id) as os_count,
        COALESCE(
          EXTRACT(DAY FROM (NOW() - MAX(COALESCE(wo.delivered_at, wo.updated_at, wo.created_at)))),
          999
        )::integer as days_since_last
      FROM customers c
      LEFT JOIN work_orders wo ON wo.customer_id = c.id AND wo.tenant_id = c.tenant_id AND wo.status IN ('completed', 'delivered', 'in_progress')
      WHERE c.tenant_id = $1
      GROUP BY c.id`,
      [tenantId]
    );

    let activeCustomersCount = 0;
    let riskCustomersCount = 0;
    let inactiveCustomersCount = 0;
    let dormantCustomersCount = 0;
    let repeatCustomersCount = 0;
    let customersWithVisits = 0;

    for (const row of visitsRes.rows) {
      const days = parseInt(row.days_since_last, 10);
      const osCount = parseInt(row.os_count, 10);

      if (osCount > 0) {
        customersWithVisits++;
        if (osCount >= 2) repeatCustomersCount++;

        if (days < 90) {
          activeCustomersCount++;
        } else if (days <= 180) {
          riskCustomersCount++;
        } else if (days <= 365) {
          inactiveCustomersCount++;
        } else {
          dormantCustomersCount++;
        }
      } else {
        // Clientes sem nenhuma OS ainda são inativos
        dormantCustomersCount++;
      }
    }

    const repurchaseRatePercent =
      customersWithVisits > 0
        ? Math.round((repeatCustomersCount / customersWithVisits) * 100)
        : 0;

    // 3. Revisões de garantia pendentes nos próximos 30 dias ou atrasadas
    const revisions = await this.listWarrantyRevisions(tenantId);
    const pendingWarrantyRevisionsCount = revisions.length;

    // 4. Conversão de contatos de retenção
    const contactsStats = await tenantQuery<{
      total_contacts: string;
      converted_count: string;
      total_revenue_cents: string;
    }>(
      tenantId,
      `SELECT 
        COUNT(*) as total_contacts,
        COUNT(*) FILTER (WHERE status = 'converted') as converted_count,
        COALESCE(SUM(conversion_revenue_cents) FILTER (WHERE status = 'converted'), 0)::bigint as total_revenue_cents
      FROM crm_retention_contacts
      WHERE tenant_id = $1`,
      [tenantId]
    );

    const totalContacts = parseInt(contactsStats.rows[0]?.total_contacts || '0', 10);
    const convertedContactsCount = parseInt(contactsStats.rows[0]?.converted_count || '0', 10);
    const convertedRevenueCents = parseInt(contactsStats.rows[0]?.total_revenue_cents || '0', 10);
    const conversionRatePercent =
      totalContacts > 0 ? Math.round((convertedContactsCount / totalContacts) * 100) : 0;

    return {
      totalCustomers,
      activeCustomersCount,
      riskCustomersCount,
      inactiveCustomersCount,
      dormantCustomersCount,
      repurchaseRatePercent,
      pendingWarrantyRevisionsCount,
      convertedContactsCount,
      conversionRatePercent,
      convertedRevenueCents,
    };
  }

  /**
   * Lista certificados de garantia que possuem marcos de revisão periódica (6m / 12m)
   * que estão vencendo nos próximos 30 dias ou que já venceram sem contato.
   */
  static async listWarrantyRevisions(tenantId: string): Promise<WarrantyRevisionItemDto[]> {
    const query = `
      SELECT 
        w.id as warranty_id,
        w.verification_token,
        w.service_name,
        w.starts_at,
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        v.id as vehicle_id,
        v.plate as vehicle_plate,
        v.model as vehicle_model,
        r.id as rule_id,
        r.interval_days,
        r.service_category
      FROM warranties w
      JOIN customers c ON c.id = w.customer_id
      JOIN vehicles v ON v.id = w.vehicle_id
      LEFT JOIN crm_retention_rules r ON r.tenant_id = w.tenant_id AND (
        (LOWER(w.service_name) LIKE '%ppf%' AND r.service_category = 'ppf') OR
        (LOWER(w.service_name) LIKE '%vitrif%' AND r.service_category = 'vitrificacao') OR
        (LOWER(w.service_name) LIKE '%higieniz%' AND r.service_category = 'higienizacao') OR
        r.trigger_type = 'warranty_revision'
      ) AND r.is_active = true
      WHERE w.tenant_id = $1
        AND w.status = 'active'
      ORDER BY w.starts_at ASC
    `;

    const res = await tenantQuery<any>(tenantId, query, [tenantId]);
    const items: WarrantyRevisionItemDto[] = [];
    const now = new Date();

    for (const row of res.rows) {
      const startsAt = new Date(row.starts_at);
      const intervalDays = row.interval_days ? parseInt(row.interval_days, 10) : 180;
      
      const revisionDueDate = new Date(startsAt.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      const diffMs = revisionDueDate.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Considerar se a data de revisão vence em até 45 dias no futuro ou até 90 dias no passado
      if (diffDays <= 45 && diffDays >= -120) {
        items.push({
          warrantyId: row.warranty_id,
          verificationToken: row.verification_token,
          serviceName: row.service_name,
          serviceCategory: row.service_category || 'geral',
          customerId: row.customer_id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          vehicleId: row.vehicle_id,
          vehiclePlate: row.vehicle_plate,
          vehicleModel: row.vehicle_model,
          startsAt: startsAt.toISOString(),
          revisionDueDate: revisionDueDate.toISOString(),
          daysRemainingOrOverdue: diffDays,
          isOverdue: diffDays < 0,
          ruleId: row.rule_id || null,
        });
      }
    }

    return items;
  }

  /**
   * Lista clientes inativos (sem novas OSs) há 90, 180 ou 365+ dias para campanhas de reativação.
   */
  static async listInactiveCustomers(
    tenantId: string,
    options?: { minDays?: number; tier?: '90_days' | '180_days' | '365_days_plus' }
  ): Promise<InactiveCustomerItemDto[]> {
    const minDays = options?.minDays ?? 90;

    const query = `
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        COALESCE(MAX(COALESCE(wo.delivered_at, wo.updated_at, wo.created_at)), c.created_at) as last_visit_date,
        EXTRACT(DAY FROM (NOW() - COALESCE(MAX(COALESCE(wo.delivered_at, wo.updated_at, wo.created_at)), c.created_at)))::integer as days_inactive,
        COUNT(wo.id)::integer as total_work_orders,
        COALESCE(SUM(wo.total_cents) FILTER (WHERE wo.status IN ('completed', 'delivered')), 0)::bigint as lifetime_value_cents,
        (
          SELECT v.plate FROM vehicles v 
          JOIN work_orders w2 ON w2.vehicle_id = v.id 
          WHERE w2.customer_id = c.id ORDER BY w2.created_at DESC LIMIT 1
        ) as last_vehicle_plate,
        (
          SELECT v.model FROM vehicles v 
          JOIN work_orders w2 ON w2.vehicle_id = v.id 
          WHERE w2.customer_id = c.id ORDER BY w2.created_at DESC LIMIT 1
        ) as last_vehicle_model,
        (
          SELECT woi.name FROM work_order_items woi
          JOIN work_orders w3 ON w3.id = woi.work_order_id
          WHERE w3.customer_id = c.id ORDER BY w3.created_at DESC LIMIT 1
        ) as last_service_name
      FROM customers c
      LEFT JOIN work_orders wo ON wo.customer_id = c.id AND wo.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1
      GROUP BY c.id
      HAVING EXTRACT(DAY FROM (NOW() - COALESCE(MAX(COALESCE(wo.delivered_at, wo.updated_at, wo.created_at)), c.created_at))) >= $2
      ORDER BY days_inactive DESC
      LIMIT 100
    `;

    const res = await tenantQuery<any>(tenantId, query, [tenantId, minDays]);
    const items: InactiveCustomerItemDto[] = [];

    for (const row of res.rows) {
      const days = row.days_inactive || 0;
      let tier: '90_days' | '180_days' | '365_days_plus' = '90_days';
      let suggestedDiscount = 10;

      if (days > 365) {
        tier = '365_days_plus';
        suggestedDiscount = 20;
      } else if (days >= 180) {
        tier = '180_days';
        suggestedDiscount = 15;
      }

      if (options?.tier && options.tier !== tier) {
        continue;
      }

      items.push({
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        lastVisitDate: new Date(row.last_visit_date).toISOString(),
        daysInactive: days,
        inactivityTier: tier,
        lastVehiclePlate: row.last_vehicle_plate || null,
        lastVehicleModel: row.last_vehicle_model || null,
        lastServiceName: row.last_service_name || 'Serviço Automotivo',
        totalWorkOrders: row.total_work_orders || 0,
        lifetimeValueCents: parseInt(row.lifetime_value_cents || '0', 10),
        suggestedDiscountPercent: suggestedDiscount,
      });
    }

    return items;
  }

  /**
   * Lista todas as regras de retenção configuradas no tenant.
   */
  static async listRetentionRules(tenantId: string): Promise<CrmRetentionRuleDto[]> {
    await this.seedDefaultRetentionRules(tenantId);
    const res = await tenantQuery<any>(
      tenantId,
      `SELECT * FROM crm_retention_rules WHERE tenant_id = $1 ORDER BY trigger_type ASC, interval_days ASC`,
      [tenantId]
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      serviceCategory: r.service_category,
      triggerType: r.trigger_type,
      intervalDays: r.interval_days,
      channel: r.channel,
      messageTemplate: r.message_template,
      discountType: r.discount_type,
      discountValue: r.discount_value,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Cria uma nova regra de retenção personalizada para a oficina.
   */
  static async createRetentionRule(
    tenantId: string,
    input: CreateCrmRetentionRuleInputDto
  ): Promise<CrmRetentionRuleDto> {
    const res = await tenantQuery<any>(
      tenantId,
      `INSERT INTO crm_retention_rules (
        tenant_id, name, service_category, trigger_type, interval_days, channel,
        message_template, discount_type, discount_value, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        tenantId,
        input.name,
        input.serviceCategory,
        input.triggerType,
        input.intervalDays,
        input.channel,
        input.messageTemplate,
        input.discountType,
        input.discountValue,
        input.isActive ?? true,
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      serviceCategory: r.service_category,
      triggerType: r.trigger_type,
      intervalDays: r.interval_days,
      channel: r.channel,
      messageTemplate: r.message_template,
      discountType: r.discount_type,
      discountValue: r.discount_value,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Dispara um contato de retenção/pós-venda para um cliente,
   * gerando um cupom dinâmico e link do WhatsApp.
   */
  static async triggerRetentionContact(
    tenantId: string,
    userId: string | null = null,
    input: TriggerRetentionContactInputDto
  ): Promise<TriggerRetentionContactResultDto> {
    // 1. Obter dados do cliente
    const custRes = await tenantQuery<any>(
      tenantId,
      `SELECT id, name, phone, email FROM customers WHERE id = $1 AND tenant_id = $2`,
      [input.customerId, tenantId]
    );
    if (custRes.rows.length === 0) {
      throw new Error(`Cliente ${input.customerId} não encontrado`);
    }
    const customer = custRes.rows[0];

    // 2. Obter veículo se informado ou buscar o último
    let vehicle = null;
    if (input.vehicleId) {
      const vehRes = await tenantQuery<any>(
        tenantId,
        `SELECT id, plate, model, brand FROM vehicles WHERE id = $1 AND tenant_id = $2`,
        [input.vehicleId, tenantId]
      );
      if (vehRes.rows.length > 0) vehicle = vehRes.rows[0];
    } else {
      const vehRes = await tenantQuery<any>(
        tenantId,
        `SELECT id, plate, model, brand FROM vehicles WHERE customer_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [input.customerId, tenantId]
      );
      if (vehRes.rows.length > 0) vehicle = vehRes.rows[0];
    }

    // 3. Obter garantia ou regra se informados
    let warranty = null;
    if (input.warrantyId) {
      const warRes = await tenantQuery<any>(
        tenantId,
        `SELECT id, service_name, verification_token, starts_at FROM warranties WHERE id = $1 AND tenant_id = $2`,
        [input.warrantyId, tenantId]
      );
      if (warRes.rows.length > 0) warranty = warRes.rows[0];
    }

    let rule = null;
    if (input.ruleId) {
      const ruleRes = await tenantQuery<any>(
        tenantId,
        `SELECT * FROM crm_retention_rules WHERE id = $1 AND tenant_id = $2`,
        [input.ruleId, tenantId]
      );
      if (ruleRes.rows.length > 0) rule = ruleRes.rows[0];
    }

    // 4. Gerar cupom de fidelidade dinâmico no tenant
    const discountPercent = input.discountPercent ?? rule?.discount_value ?? 10;
    const daysValid = input.couponDaysValid ?? 30;
    const validUntil = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const couponCode = `RETORNO${discountPercent}-${randomSuffix}`;

    const couponRes = await tenantQuery<any>(
      tenantId,
      `INSERT INTO tenant_customer_coupons (
        tenant_id, customer_id, code, description, discount_type, discount_value,
        valid_until, max_uses, times_used, status
      ) VALUES ($1, $2, $3, $4, 'percentage', $5, $6, 1, 0, 'active')
      RETURNING id`,
      [
        tenantId,
        customer.id,
        couponCode,
        `Cupom dinâmico de retenção (${discountPercent}% OFF)`,
        discountPercent,
        validUntil.toISOString(),
      ]
    );
    const couponId = couponRes.rows[0].id;

    // 5. Montar texto da mensagem substituindo variáveis
    let template =
      input.customMessage ||
      rule?.message_template ||
      'Olá, {cliente}! Sentimos sua falta. Preparamos uma condição exclusiva para o seu {veiculo}: use o cupom {cupom_codigo} para ganhar {cupom_beneficio} no seu próximo serviço. Podemos agendar? {link_agendamento}';

    const vehicleStr = vehicle ? `${vehicle.model} (${vehicle.plate})` : 'seu veículo';
    const serviceStr = warranty ? warranty.service_name : 'estética automotiva';
    const benefitStr = `${discountPercent}% de desconto`;
    const bookingUrl = `https://carx.com.br/agendamento?cupom=${couponCode}`;

    let messageContent = template
      .replace(/{cliente}/g, customer.name.split(' ')[0])
      .replace(/{veiculo}/g, vehicleStr)
      .replace(/{servico}/g, serviceStr)
      .replace(/{cupom_codigo}/g, couponCode)
      .replace(/{cupom_beneficio}/g, benefitStr)
      .replace(/{cupom}/g, couponCode)
      .replace(/{link_agendamento}/g, bookingUrl);

    // 6. Gerar URL do WhatsApp
    const rawPhone = (customer.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageContent)}`;

    // 7. Persistir histórico em crm_retention_contacts
    const contactRes = await tenantQuery<any>(
      tenantId,
      `INSERT INTO crm_retention_contacts (
        tenant_id, rule_id, customer_id, vehicle_id, warranty_id, coupon_id,
        coupon_code, channel, destination, message_content, whatsapp_url,
        status, sent_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'sent', $12)
      RETURNING id, created_at`,
      [
        tenantId,
        rule?.id || null,
        customer.id,
        vehicle?.id || null,
        warranty?.id || null,
        couponId,
        couponCode,
        input.channel || 'whatsapp',
        customer.phone || 'N/A',
        messageContent,
        whatsappUrl,
        userId,
      ]
    );

    return {
      contactId: contactRes.rows[0].id,
      customerId: customer.id,
      customerName: customer.name,
      destinationPhone: customer.phone || '',
      couponCode,
      discountValue: discountPercent,
      discountType: 'percentage',
      validUntil: validUntil.toISOString(),
      messageContent,
      whatsappUrl,
      status: 'sent',
    };
  }

  /**
   * Converte um contato de retenção em agendamento confirmado ou OS faturada.
   */
  static async convertRetentionContact(
    tenantId: string,
    contactId: string,
    input: ConvertRetentionContactInputDto
  ): Promise<{ success: boolean; message: string }> {
    const res = await tenantQuery<any>(
      tenantId,
      `UPDATE crm_retention_contacts
       SET status = 'converted',
           converted_work_order_id = $1,
           conversion_revenue_cents = $2,
           converted_at = NOW(),
           notes = COALESCE($3, notes)
       WHERE id = $4 AND tenant_id = $5
       RETURNING id`,
      [
        input.convertedWorkOrderId || null,
        input.conversionRevenueCents || 0,
        input.notes || null,
        contactId,
        tenantId,
      ]
    );

    if (res.rows.length === 0) {
      throw new Error(`Contato de retenção ${contactId} não encontrado`);
    }

    return {
      success: true,
      message: 'Contato de retenção convertido com sucesso!',
    };
  }

  /**
   * Lista o histórico de contatos de retenção disparados no tenant.
   */
  static async listRetentionContacts(
    tenantId: string,
    options?: { limit?: number; status?: string }
  ): Promise<RetentionContactItemDto[]> {
    const limit = options?.limit ?? 50;

    const res = await tenantQuery<any>(
      tenantId,
      `SELECT 
        rc.id,
        rc.tenant_id,
        c.name as customer_name,
        rc.destination as customer_phone,
        v.plate as vehicle_plate,
        v.model as vehicle_model,
        rc.coupon_code,
        tc.discount_value,
        rc.channel,
        rc.message_content,
        rc.whatsapp_url,
        rc.status,
        rc.conversion_revenue_cents,
        rc.converted_at,
        rc.notes,
        rc.created_at
      FROM crm_retention_contacts rc
      JOIN customers c ON c.id = rc.customer_id
      LEFT JOIN vehicles v ON v.id = rc.vehicle_id
      LEFT JOIN tenant_customer_coupons tc ON tc.id = rc.coupon_id
      WHERE rc.tenant_id = $1
      ORDER BY rc.created_at DESC
      LIMIT $2`,
      [tenantId, limit]
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      vehiclePlate: r.vehicle_plate,
      vehicleModel: r.vehicle_model,
      couponCode: r.coupon_code,
      discountValue: r.discount_value || 10,
      channel: r.channel,
      messageContent: r.message_content,
      whatsappUrl: r.whatsapp_url,
      status: r.status,
      conversionRevenueCents: r.conversion_revenue_cents || 0,
      convertedAt: r.converted_at ? new Date(r.converted_at).toISOString() : null,
      notes: r.notes,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
}
