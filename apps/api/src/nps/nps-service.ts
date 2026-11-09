import { tenantQuery } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import {
  NpsSurveyDto,
  NpsMetricsDto,
  NpsClassificationEnum,
  NpsClassificationType,
  AnswerNpsSurveyInputDto,
  CreateReminderInputDto,
  MaintenanceReminderDto,
  ReminderStatus,
} from '@carx/shared';

export class NpsError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'NPS_ERROR') {
    super(message);
    this.name = 'NpsError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NpsService {
  /**
   * Cria ou obtém pesquisa NPS para uma Ordem de Serviço concluída
   */
  async createSurvey(tenantId: string, workOrderId: string): Promise<NpsSurveyDto> {
    // 1. Verifica se já existe pesquisa para esta OS (idempotência)
    const existing = await tenantQuery<any>(
      tenantId,
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone, wo.os_number
       FROM nps_surveys s
       JOIN customers c ON c.id = s.customer_id
       JOIN work_orders wo ON wo.id = s.work_order_id
       WHERE s.tenant_id = $1 AND s.work_order_id = $2
       LIMIT 1;`,
      [tenantId, workOrderId]
    );

    if (existing.rows.length > 0) {
      return this.mapSurveyDto(existing.rows[0]);
    }

    // 2. Busca dados da OS e cliente
    const woRes = await tenantQuery<{
      id: string;
      customer_id: string;
      os_number: number;
      customer_name: string;
      customer_phone: string | null;
    }>(
      tenantId,
      `SELECT wo.id, wo.customer_id, wo.os_number, c.name as customer_name, c.phone as customer_phone
       FROM work_orders wo
       JOIN customers c ON c.id = wo.customer_id
       WHERE wo.tenant_id = $1 AND wo.id = $2
       LIMIT 1;`,
      [tenantId, workOrderId]
    );

    if (woRes.rows.length === 0) {
      throw new NpsError('Ordem de serviço não encontrada para geração de NPS.', 404, 'WORK_ORDER_NOT_FOUND');
    }

    const wo = woRes.rows[0];

    // 3. Cria a pesquisa com token único e status pendente
    const res = await tenantQuery<any>(
      tenantId,
      `INSERT INTO nps_surveys (
        tenant_id,
        work_order_id,
        customer_id,
        status,
        sent_at
      ) VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING *;`,
      [tenantId, wo.id, wo.customer_id]
    );

    const survey = res.rows[0];
    survey.customer_name = wo.customer_name;
    survey.customer_phone = wo.customer_phone;
    survey.os_number = wo.os_number;

    return this.mapSurveyDto(survey);
  }

  /**
   * Consulta pública da pesquisa pelo token (para abertura da tela de feedback pelo cliente)
   */
  async getSurveyByToken(token: string): Promise<{
    token: string;
    status: string;
    score: number | null;
    comment: string | null;
    customerFirstName: string;
    workshopTradeName: string;
    vehicleModel: string;
    vehiclePlateMasked: string;
    answeredAt: string | null;
  }> {
    const res = await tenantQuery<{
      token: string;
      status: string;
      score: number | null;
      comment: string | null;
      answered_at: string | null;
      customer_name: string;
      vehicle_brand: string;
      vehicle_model: string;
      vehicle_plate: string;
      trade_name: string;
      legal_name: string;
    }>(
      null,
      `SELECT
         s.token,
         s.status,
         s.score,
         s.comment,
         s.answered_at,
         c.name as customer_name,
         v.brand as vehicle_brand,
         v.model as vehicle_model,
         v.plate as vehicle_plate,
         COALESCE(t.trade_name, t.legal_name, 'Oficina CarX') as trade_name,
         t.legal_name
       FROM nps_surveys s
       JOIN customers c ON c.id = s.customer_id
       JOIN work_orders wo ON wo.id = s.work_order_id
       JOIN vehicles v ON v.id = wo.vehicle_id
       JOIN tenants t ON t.id = s.tenant_id
       WHERE s.token = $1
       LIMIT 1;`,
      [token],
      { bypassRls: true }
    );

    if (res.rows.length === 0) {
      throw new NpsError('Pesquisa de satisfação não encontrada.', 404, 'SURVEY_NOT_FOUND');
    }

    const row = res.rows[0];

    // Mascaramento de segurança e LGPD
    const firstName = row.customer_name.trim().split(' ')[0] || 'Cliente';
    const plateRaw = row.vehicle_plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let plateMasked = plateRaw;
    if (plateRaw.length >= 7) {
      plateMasked = `${plateRaw.substring(0, 3)}-***${plateRaw.slice(-1)}`;
    }

    return {
      token: row.token,
      status: row.status,
      score: row.score,
      comment: row.comment,
      customerFirstName: firstName,
      workshopTradeName: row.trade_name,
      vehicleModel: `${row.vehicle_brand} ${row.vehicle_model}`,
      vehiclePlateMasked: plateMasked,
      answeredAt: row.answered_at ? new Date(row.answered_at).toISOString() : null,
    };
  }

  /**
   * Responde à pesquisa de satisfação NPS pelo token público
   * CRITÉRIO DE ACEITE: Responder duas vezes ao mesmo token é estritamente bloqueado (HTTP 409).
   */
  async answerSurvey(
    token: string,
    input: AnswerNpsSurveyInputDto
  ): Promise<{
    survey: NpsSurveyDto;
    isPromoter: boolean;
    isDetractor: boolean;
    googleReviewSuggested: boolean;
  }> {
    // 1. Busca a pesquisa
    const findRes = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      customer_id: string;
      status: string;
      answered_at: string | null;
    }>(
      null,
      `SELECT id, tenant_id, work_order_id, customer_id, status, answered_at
       FROM nps_surveys
       WHERE token = $1
       LIMIT 1;`,
      [token],
      { bypassRls: true }
    );

    if (findRes.rows.length === 0) {
      throw new NpsError('Pesquisa de satisfação não encontrada.', 404, 'SURVEY_NOT_FOUND');
    }

    const survey = findRes.rows[0];

    // 2. CRITÉRIO DE ACEITE: Não permite responder duas vezes ao mesmo link
    if (survey.status === 'answered') {
      const answeredFormatted = survey.answered_at
        ? new Date(survey.answered_at).toLocaleDateString('pt-BR')
        : 'data anterior';
      throw new NpsError(
        `Esta pesquisa de satisfação já foi respondida anteriormente (${answeredFormatted}). Agradecemos sua avaliação!`,
        409,
        'SURVEY_ALREADY_ANSWERED'
      );
    }

    // 3. Classificação internacional do NPS
    let classification: NpsClassificationType;
    if (input.score >= 9) {
      classification = NpsClassificationEnum.PROMOTER;
    } else if (input.score >= 7) {
      classification = NpsClassificationEnum.PASSIVE;
    } else {
      classification = NpsClassificationEnum.DETRACTOR;
    }

    const isPromoter = classification === NpsClassificationEnum.PROMOTER;
    const isDetractor = classification === NpsClassificationEnum.DETRACTOR;

    // 4. Grava resposta no banco de dados
    const updateRes = await tenantQuery<any>(
      survey.tenant_id,
      `UPDATE nps_surveys
       SET score = $2,
           classification = $3,
           comment = $4,
           status = 'answered',
           answered_at = NOW(),
           google_review_clicked = $5,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [
        survey.id,
        input.score,
        classification,
        input.comment || null,
        Boolean(input.googleReviewClicked),
      ]
    );

    const updatedSurvey = updateRes.rows[0];

    // 5. Se for Detrator (0 a 6), gera alerta imediato para resgate da gestão
    if (isDetractor) {
      await auditService.record({
        tenantId: survey.tenant_id,
        action: 'NPS_DETRACTOR_ALERT',
        entity: 'nps_surveys',
        entityId: survey.id,
        newValues: {
          workOrderId: survey.work_order_id,
          customerId: survey.customer_id,
          score: input.score,
          classification,
          comment: input.comment || 'Sem comentário',
        },
      });
    }

    return {
      survey: this.mapSurveyDto(updatedSurvey),
      isPromoter,
      isDetractor,
      googleReviewSuggested: isPromoter,
    };
  }

  /**
   * Lista todas as pesquisas de satisfação de um tenant com filtros
   */
  async listSurveys(
    tenantId: string,
    filters?: { classification?: string; status?: string }
  ): Promise<NpsSurveyDto[]> {
    let whereClause = `s.tenant_id = $1`;
    const params: any[] = [tenantId];

    if (filters?.classification) {
      params.push(filters.classification);
      whereClause += ` AND s.classification = $${params.length}`;
    }

    if (filters?.status) {
      params.push(filters.status);
      whereClause += ` AND s.status = $${params.length}`;
    }

    const res = await tenantQuery<any>(
      tenantId,
      `SELECT
         s.*,
         c.name as customer_name,
         c.phone as customer_phone,
         wo.os_number
       FROM nps_surveys s
       JOIN customers c ON c.id = s.customer_id
       JOIN work_orders wo ON wo.id = s.work_order_id
       WHERE ${whereClause}
       ORDER BY s.created_at DESC;`,
      params
    );

    return res.rows.map((r) => this.mapSurveyDto(r));
  }

  /**
   * Calcula o Score consolidado de NPS (-100 a +100) e distribuição real da loja
   */
  async getMetrics(tenantId: string): Promise<NpsMetricsDto> {
    const res = await tenantQuery<{
      total_surveys: string;
      total_answered: string;
      promoters_count: string;
      passives_count: string;
      detractors_count: string;
      avg_score: string | null;
    }>(
      tenantId,
      `SELECT
         COUNT(*) as total_surveys,
         COUNT(*) FILTER (WHERE status = 'answered') as total_answered,
         COUNT(*) FILTER (WHERE status = 'answered' AND classification = 'promoter') as promoters_count,
         COUNT(*) FILTER (WHERE status = 'answered' AND classification = 'passive') as passives_count,
         COUNT(*) FILTER (WHERE status = 'answered' AND classification = 'detractor') as detractors_count,
         AVG(score) FILTER (WHERE status = 'answered') as avg_score
       FROM nps_surveys
       WHERE tenant_id = $1;`,
      [tenantId]
    );

    const row = res.rows[0];
    const totalSurveys = Number(row.total_surveys || 0);
    const totalAnswered = Number(row.total_answered || 0);
    const promotersCount = Number(row.promoters_count || 0);
    const passivesCount = Number(row.passives_count || 0);
    const detractorsCount = Number(row.detractors_count || 0);
    const averageScore = row.avg_score !== null ? Number(Number(row.avg_score).toFixed(1)) : 0;

    const responseRate = totalSurveys > 0 ? Math.round((totalAnswered / totalSurveys) * 100) : 0;

    let npsScore = 0;
    let promotersPercent = 0;
    let passivesPercent = 0;
    let detractorsPercent = 0;

    if (totalAnswered > 0) {
      promotersPercent = Math.round((promotersCount / totalAnswered) * 100);
      passivesPercent = Math.round((passivesCount / totalAnswered) * 100);
      detractorsPercent = Math.round((detractorsCount / totalAnswered) * 100);

      // Fórmula oficial: % Promotores - % Detratores
      npsScore = promotersPercent - detractorsPercent;
    }

    return {
      npsScore,
      totalSurveys,
      totalAnswered,
      responseRate,
      averageScore,
      promotersCount,
      promotersPercent,
      passivesCount,
      passivesPercent,
      detractorsCount,
      detractorsPercent,
    };
  }

  // ============================================================================
  // RÉGUA DE LEMBRETES DE REVISÃO E MANUTENÇÃO (MAINTENANCE REMINDERS)
  // ============================================================================

  /**
   * Agenda um lembrete periódico de manutenção ou revisão de garantia
   */
  async createReminder(tenantId: string, input: CreateReminderInputDto): Promise<MaintenanceReminderDto> {
    // 1. Busca veículo e cliente da OS
    const woRes = await tenantQuery<{
      id: string;
      customer_id: string;
      vehicle_id: string;
      os_number: number;
    }>(
      tenantId,
      `SELECT id, customer_id, vehicle_id, os_number FROM work_orders WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
      [tenantId, input.workOrderId]
    );

    if (woRes.rows.length === 0) {
      throw new NpsError('Ordem de serviço não encontrada para agendamento de lembrete.', 404, 'WORK_ORDER_NOT_FOUND');
    }

    const wo = woRes.rows[0];

    const res = await tenantQuery<any>(
      tenantId,
      `INSERT INTO maintenance_reminders (
        tenant_id,
        work_order_id,
        warranty_id,
        customer_id,
        vehicle_id,
        service_name,
        reminder_type,
        scheduled_for,
        message_preview,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;`,
      [
        tenantId,
        wo.id,
        input.warrantyId || null,
        wo.customer_id,
        wo.vehicle_id,
        input.serviceName,
        input.reminderType || 'warranty_check',
        input.scheduledFor,
        input.messagePreview || null,
        input.notes || null,
      ]
    );

    return this.getReminderById(tenantId, res.rows[0].id);
  }

  /**
   * Consulta lembrete por ID
   */
  async getReminderById(tenantId: string, reminderId: string): Promise<MaintenanceReminderDto> {
    const res = await tenantQuery<any>(
      tenantId,
      `SELECT
         mr.*,
         wo.os_number,
         c.name as customer_name,
         c.phone as customer_phone,
         v.plate as vehicle_plate,
         v.model as vehicle_model
       FROM maintenance_reminders mr
       JOIN work_orders wo ON wo.id = mr.work_order_id
       JOIN customers c ON c.id = mr.customer_id
       JOIN vehicles v ON v.id = mr.vehicle_id
       WHERE mr.tenant_id = $1 AND mr.id = $2
       LIMIT 1;`,
      [tenantId, reminderId]
    );

    if (res.rows.length === 0) {
      throw new NpsError('Lembrete de manutenção não encontrado.', 404, 'REMINDER_NOT_FOUND');
    }

    return this.mapReminderDto(res.rows[0]);
  }

  /**
   * Lista lembretes agendados com filtros
   */
  async listReminders(
    tenantId: string,
    filters?: { status?: string; vehicleId?: string }
  ): Promise<MaintenanceReminderDto[]> {
    let whereClause = `mr.tenant_id = $1`;
    const params: any[] = [tenantId];

    if (filters?.status) {
      params.push(filters.status);
      whereClause += ` AND mr.status = $${params.length}`;
    }

    if (filters?.vehicleId) {
      params.push(filters.vehicleId);
      whereClause += ` AND mr.vehicle_id = $${params.length}`;
    }

    const res = await tenantQuery<any>(
      tenantId,
      `SELECT
         mr.*,
         wo.os_number,
         c.name as customer_name,
         c.phone as customer_phone,
         v.plate as vehicle_plate,
         v.model as vehicle_model
       FROM maintenance_reminders mr
       JOIN work_orders wo ON wo.id = mr.work_order_id
       JOIN customers c ON c.id = mr.customer_id
       JOIN vehicles v ON v.id = mr.vehicle_id
       WHERE ${whereClause}
       ORDER BY mr.scheduled_for ASC;`,
      params
    );

    return res.rows.map((r) => this.mapReminderDto(r));
  }

  /**
   * Atualiza o status de um lembrete (ex: enviado, concluído, cancelado)
   */
  async updateReminderStatus(
    tenantId: string,
    reminderId: string,
    status: ReminderStatus
  ): Promise<MaintenanceReminderDto> {
    const isSent = status === 'sent';

    const res = await tenantQuery<any>(
      tenantId,
      `UPDATE maintenance_reminders
       SET status = $3,
           sent_at = CASE WHEN $4 = true THEN NOW() ELSE sent_at END,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING id;`,
      [tenantId, reminderId, status, isSent]
    );

    if (res.rows.length === 0) {
      throw new NpsError('Lembrete não encontrado para atualização.', 404, 'REMINDER_NOT_FOUND');
    }

    return this.getReminderById(tenantId, reminderId);
  }

  // ============================================================================
  // MAPEADORES
  // ============================================================================

  private mapSurveyDto(r: any): NpsSurveyDto {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      workOrderId: r.work_order_id,
      osNumber: r.os_number !== undefined ? Number(r.os_number) : undefined,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      token: r.token,
      score: r.score !== null ? Number(r.score) : null,
      classification: r.classification || null,
      comment: r.comment || null,
      status: r.status,
      sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
      answeredAt: r.answered_at ? new Date(r.answered_at).toISOString() : null,
      googleReviewClicked: Boolean(r.google_review_clicked),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapReminderDto(r: any): MaintenanceReminderDto {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      workOrderId: r.work_order_id,
      osNumber: r.os_number !== undefined ? Number(r.os_number) : undefined,
      warrantyId: r.warranty_id || null,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      vehicleId: r.vehicle_id,
      vehiclePlate: r.vehicle_plate,
      vehicleModel: r.vehicle_model,
      serviceName: r.service_name,
      reminderType: r.reminder_type,
      scheduledFor: new Date(r.scheduled_for).toISOString(),
      status: r.status,
      sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
      messagePreview: r.message_preview || null,
      notes: r.notes || null,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }
}

export const npsService = new NpsService();

