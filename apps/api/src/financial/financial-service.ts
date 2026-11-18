import { tenantQuery } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import {
  CommissionRuleDto,
  CreateCommissionRuleInputDto,
  CommissionEntryDto,
  PayCommissionEntryInputDto,
  DreReportDto,
  TechnicianRankingItemDto,
  CommissionType,
  BaseCalculationType,
  CommissionStatus,
  FinancialCategoryDto,
  CreateFinancialCategoryInputDto,
  FinancialCategoryGroupType,
  FinancialBillDto,
  CreateFinancialBillInputDto,
  UpdateFinancialBillInputDto,
  FinancialBillType,
  FinancialBillStatus,
  AdvancedDreReportDto,
  CashFlowProjectionDto,
  CashFlowDayPointDto,
  CashFlowPeriodSummaryDto,
  BatchPayCommissionsInputDto,
  BatchPayCommissionsResultDto,
} from '@carx/shared';

export class FinancialError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'FINANCIAL_ERROR') {
    super(message);
    this.name = 'FinancialError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class FinancialService {
  // ============================================================================
  // 1. REGRAS DE COMISSÃO (COMMISSION_RULES)
  // ============================================================================

  /**
   * Cria uma regra de comissão para a oficina
   */
  async createRule(
    tenantId: string,
    input: CreateCommissionRuleInputDto,
    currentUserId: string
  ): Promise<CommissionRuleDto> {
    // Validação de técnico se informado
    if (input.technicianId) {
      const techRes = await tenantQuery(
        tenantId,
        `SELECT u.id, u.name
         FROM users u
         JOIN memberships m ON m.user_id = u.id
         WHERE m.tenant_id = $1 AND u.id = $2
         LIMIT 1;`,
        [tenantId, input.technicianId]
      );
      if (techRes.rows.length === 0) {
        throw new FinancialError('Técnico informado não foi encontrado.', 404, 'TECHNICIAN_NOT_FOUND');
      }
    }

    // Validação de serviço se informado
    if (input.serviceId) {
      const srvRes = await tenantQuery(
        tenantId,
        `SELECT id, name FROM services WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
        [tenantId, input.serviceId]
      );
      if (srvRes.rows.length === 0) {
        throw new FinancialError('Serviço informado não foi encontrado.', 404, 'SERVICE_NOT_FOUND');
      }
    }

    if (input.commissionType === 'percentage' && input.commissionValue > 100) {
      throw new FinancialError('Comissão percentual não pode ser superior a 100%.', 400, 'INVALID_PERCENTAGE');
    }

    const insertRes = await tenantQuery<any>(
      tenantId,
      `INSERT INTO commission_rules (
        tenant_id, technician_id, service_id, commission_type, commission_value, base_calculation, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;`,
      [
        tenantId,
        input.technicianId || null,
        input.serviceId || null,
        input.commissionType,
        input.commissionValue,
        input.baseCalculation,
        input.isActive ?? true,
      ]
    );

    const rule = insertRes.rows[0];

    await auditService.record({
      tenantId,
      userId: currentUserId,
      action: 'CREATE_COMMISSION_RULE',
      entity: 'commission_rules',
      entityId: rule.id,
      newValues: {
        commissionType: rule.commission_type,
        commissionValue: rule.commission_value,
        baseCalculation: rule.base_calculation,
        technicianId: rule.technician_id,
        serviceId: rule.service_id,
      },
    });

    return this.mapRuleDto(rule);
  }

  /**
   * Lista regras de comissão ativas e configuradas no tenant
   */
  async listRules(tenantId: string): Promise<CommissionRuleDto[]> {
    const res = await tenantQuery<any>(
      tenantId,
      `SELECT r.*, u.name as technician_name, s.name as service_name
       FROM commission_rules r
       LEFT JOIN users u ON u.id = r.technician_id
       LEFT JOIN services s ON s.id = r.service_id
       WHERE r.tenant_id = $1
       ORDER BY r.created_at DESC;`,
      [tenantId]
    );

    return res.rows.map((row) => this.mapRuleDto(row));
  }

  /**
   * Remove uma regra de comissão
   */
  async deleteRule(tenantId: string, ruleId: string, currentUserId: string): Promise<{ success: boolean }> {
    const res = await tenantQuery(
      tenantId,
      `DELETE FROM commission_rules WHERE tenant_id = $1 AND id = $2 RETURNING id;`,
      [tenantId, ruleId]
    );

    if (res.rows.length === 0) {
      throw new FinancialError('Regra de comissão não encontrada.', 404, 'RULE_NOT_FOUND');
    }

    await auditService.record({
      tenantId,
      userId: currentUserId,
      action: 'DELETE_COMMISSION_RULE',
      entity: 'commission_rules',
      entityId: ruleId,
      oldValues: { id: ruleId },
    });

    return { success: true };
  }

  // ============================================================================
  // 2. APURAÇÃO AUTOMÁTICA DE COMISSÕES POR OS
  // ============================================================================

  /**
   * Apura e gera lançamentos de comissão para uma Ordem de Serviço concluída
   */
  async calculateWorkOrderCommissions(
    tenantId: string,
    workOrderId: string,
    currentUserId?: string
  ): Promise<CommissionEntryDto[]> {
    // 1. Busca dados da OS
    const woRes = await tenantQuery<{
      id: string;
      os_number: number;
      technician_id: string | null;
      status: string;
      total_cents: number;
      discount_cents: number;
      final_cents: number;
    }>(
      tenantId,
      `SELECT id, os_number, technician_id, status, total_cents, discount_cents, final_cents
       FROM work_orders
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1;`,
      [tenantId, workOrderId]
    );

    if (woRes.rows.length === 0) {
      throw new FinancialError('Ordem de serviço não encontrada.', 404, 'WORK_ORDER_NOT_FOUND');
    }

    const wo = woRes.rows[0];

    // 2. Busca itens de serviço da OS
    const itemsRes = await tenantQuery<{
      id: string;
      service_id: string | null;
      name: string;
      total_cents: number;
    }>(
      tenantId,
      `SELECT id, service_id, name, total_cents
       FROM work_order_items
       WHERE tenant_id = $1 AND work_order_id = $2;`,
      [tenantId, workOrderId]
    );

    if (itemsRes.rows.length === 0) {
      return [];
    }

    // 3. Busca regras ativas de comissão da oficina
    const rulesRes = await tenantQuery<any>(
      tenantId,
      `SELECT * FROM commission_rules WHERE tenant_id = $1 AND is_active = true;`,
      [tenantId]
    );
    const activeRules = rulesRes.rows;

    // 4. Busca custo total de materiais consumidos nesta OS (para dedução se regra net_service_minus_material)
    const matRes = await tenantQuery<{ total_materials_cost: string }>(
      tenantId,
      `SELECT COALESCE(SUM(total_cost_cents), 0) as total_materials_cost
       FROM stock_movements
       WHERE tenant_id = $1 AND work_order_id = $2 AND movement_type = 'os_consumption';`,
      [tenantId, workOrderId]
    );
    const totalMaterialsCost = parseInt(matRes.rows[0]?.total_materials_cost || '0', 10);
    const serviceItemsCount = Math.max(1, itemsRes.rows.length);
    const materialsCostPerItem = Math.floor(totalMaterialsCost / serviceItemsCount);

    const createdEntries: CommissionEntryDto[] = [];

    for (const item of itemsRes.rows) {
      // Determina técnico responsável: primeiro timer ou técnico geral da OS
      const timerRes = await tenantQuery<{ technician_id: string }>(
        tenantId,
        `SELECT technician_id FROM work_order_timers
         WHERE tenant_id = $1 AND work_order_id = $2 AND service_item_id = $3
         LIMIT 1;`,
        [tenantId, workOrderId, item.id]
      );

      const targetTechnicianId = timerRes.rows[0]?.technician_id || wo.technician_id;
      if (!targetTechnicianId) {
        // Sem técnico atribuído para este item
        continue;
      }

      // Prioridade de regras de comissão:
      // 1. Técnico + Serviço
      // 2. Técnico geral
      // 3. Serviço geral
      // 4. Regra geral da oficina
      const matchedRule =
        activeRules.find(
          (r: any) => r.technician_id === targetTechnicianId && r.service_id === item.service_id
        ) ||
        activeRules.find((r: any) => r.technician_id === targetTechnicianId && !r.service_id) ||
        activeRules.find((r: any) => !r.technician_id && r.service_id === item.service_id) ||
        activeRules.find((r: any) => !r.technician_id && !r.service_id);

      if (!matchedRule) {
        continue;
      }

      const grossAmountCents = item.total_cents;
      let deductionsCents = 0;

      if (matchedRule.base_calculation === 'net_service_minus_material') {
        deductionsCents = materialsCostPerItem;
      }

      const calculationBase = Math.max(0, grossAmountCents - deductionsCents);
      let commissionCents = 0;

      if (matchedRule.commission_type === 'percentage') {
        commissionCents = Math.round((calculationBase * matchedRule.commission_value) / 100);
      } else {
        commissionCents = matchedRule.commission_value;
      }

      // Evita duplicatas se já apurada para este item e técnico
      const existingRes = await tenantQuery<{ id: string }>(
        tenantId,
        `SELECT id FROM commission_entries
         WHERE tenant_id = $1 AND work_order_id = $2 AND service_item_id = $3 AND technician_id = $4
         LIMIT 1;`,
        [tenantId, workOrderId, item.id, targetTechnicianId]
      );

      let entryRow: any;
      if (existingRes.rows.length > 0) {
        const updateRes = await tenantQuery<any>(
          tenantId,
          `UPDATE commission_entries
           SET rule_id = $1, gross_amount_cents = $2, deductions_cents = $3, commission_cents = $4, spool_cost_cents = $5, updated_at = NOW()
           WHERE id = $6
           RETURNING *;`,
          [matchedRule.id, grossAmountCents, deductionsCents, commissionCents, deductionsCents, existingRes.rows[0].id]
        );
        entryRow = updateRes.rows[0];
      } else {
        const insertRes = await tenantQuery<any>(
          tenantId,
          `INSERT INTO commission_entries (
            tenant_id, work_order_id, service_item_id, technician_id, rule_id,
            gross_amount_cents, deductions_cents, commission_cents, spool_cost_cents, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
          RETURNING *;`,
          [
            tenantId,
            workOrderId,
            item.id,
            targetTechnicianId,
            matchedRule.id,
            grossAmountCents,
            deductionsCents,
            commissionCents,
            deductionsCents,
          ]
        );
        entryRow = insertRes.rows[0];
      }

      createdEntries.push(this.mapEntryDto(entryRow, wo.os_number));
    }

    if (currentUserId && createdEntries.length > 0) {
      await auditService.record({
        tenantId,
        userId: currentUserId,
        action: 'CALCULATE_WORK_ORDER_COMMISSIONS',
        entity: 'work_orders',
        entityId: workOrderId,
        newValues: {
          entriesCount: createdEntries.length,
          totalCommissionsCents: createdEntries.reduce((acc, curr) => acc + curr.commissionCents, 0),
        },
      });
    }

    return createdEntries;
  }

  // ============================================================================
  // 3. EXTRATO E LIQUIDAÇÃO DE COMISSÕES (COMMISSION_ENTRIES)
  // ============================================================================

  /**
   * Lista lançamentos de comissão com filtros avançados
   */
  async listEntries(
    tenantId: string,
    filters: {
      technicianId?: string;
      workOrderId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<CommissionEntryDto[]> {
    const conditions: string[] = ['ce.tenant_id = $1'];
    const params: any[] = [tenantId];
    let idx = 2;

    if (filters.technicianId) {
      conditions.push(`ce.technician_id = $${idx++}`);
      params.push(filters.technicianId);
    }

    if (filters.workOrderId) {
      conditions.push(`ce.work_order_id = $${idx++}`);
      params.push(filters.workOrderId);
    }

    if (filters.status) {
      conditions.push(`ce.status = $${idx++}`);
      params.push(filters.status);
    }

    if (filters.startDate) {
      conditions.push(`ce.created_at >= $${idx++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`ce.created_at <= $${idx++}`);
      params.push(filters.endDate);
    }

    const sql = `
      SELECT ce.*, wo.os_number, u.name as technician_name
      FROM commission_entries ce
      JOIN work_orders wo ON wo.id = ce.work_order_id
      JOIN users u ON u.id = ce.technician_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ce.created_at DESC;
    `;

    const res = await tenantQuery<any>(tenantId, sql, params);
    return res.rows.map((row) => this.mapEntryDto(row, row.os_number, row.technician_name));
  }

  /**
   * Liquida (paga) uma comissão individual
   */
  async payCommissionEntry(
    tenantId: string,
    entryId: string,
    input: PayCommissionEntryInputDto,
    currentUserId: string
  ): Promise<CommissionEntryDto> {
    const existing = await tenantQuery<any>(
      tenantId,
      `SELECT ce.*, wo.os_number, u.name as technician_name
       FROM commission_entries ce
       JOIN work_orders wo ON wo.id = ce.work_order_id
       JOIN users u ON u.id = ce.technician_id
       WHERE ce.tenant_id = $1 AND ce.id = $2
       LIMIT 1;`,
      [tenantId, entryId]
    );

    if (existing.rows.length === 0) {
      throw new FinancialError('Lançamento de comissão não encontrado.', 404, 'COMMISSION_ENTRY_NOT_FOUND');
    }

    const currentEntry = existing.rows[0];
    if (currentEntry.status === 'paid') {
      throw new FinancialError('Esta comissão já se encontra liquidada/paga.', 400, 'COMMISSION_ALREADY_PAID');
    }

    const paidAt = input.paidAt ? new Date(input.paidAt).toISOString() : new Date().toISOString();

    const updateRes = await tenantQuery<any>(
      tenantId,
      `UPDATE commission_entries
       SET status = 'paid', paid_at = $1, notes = COALESCE($2, notes), updated_at = NOW()
       WHERE tenant_id = $3 AND id = $4
       RETURNING *;`,
      [paidAt, input.notes || null, tenantId, entryId]
    );

    const updated = updateRes.rows[0];

    await auditService.record({
      tenantId,
      userId: currentUserId,
      action: 'PAY_COMMISSION_ENTRY',
      entity: 'commission_entries',
      entityId: entryId,
      newValues: {
        paidAt,
        amountCents: updated.commission_cents,
        technicianId: updated.technician_id,
        workOrderId: updated.work_order_id,
      },
      oldValues: {
        status: currentEntry.status,
      },
    });

    return this.mapEntryDto(updated, currentEntry.os_number, currentEntry.technician_name);
  }

  // ============================================================================
  // 4. DRE GERENCIAL NO SERVIDOR (SQL NATIVO AGREGADO)
  // ============================================================================

  /**
   * Calcula o Demonstrativo do Resultado do Exercício (DRE) gerencial exclusivamente no PostgreSQL
   */
  async getDreReport(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      unitId?: string;
    }
  ): Promise<DreReportDto> {
    const startDate = filters.startDate ? new Date(filters.startDate).toISOString() : '1970-01-01T00:00:00.000Z';
    const endDate = filters.endDate ? new Date(filters.endDate).toISOString() : '2099-12-31T23:59:59.999Z';

    // 1. Receita Bruta, Descontos, Receita Líquida e Quantidade de OS
    const woSql = `
      SELECT
        COALESCE(SUM(total_cents), 0)::bigint as gross_revenue_cents,
        COALESCE(SUM(discount_cents), 0)::bigint as discounts_cents,
        COALESCE(SUM(final_cents), 0)::bigint as net_revenue_cents,
        COUNT(*)::int as work_orders_count
      FROM work_orders
      WHERE tenant_id = $1
        AND status IN ('DELIVERED', 'READY', 'IN_PROGRESS', 'QA', 'CHECKED_IN')
        AND created_at >= $2 AND created_at <= $3;
    `;
    const woRes = await tenantQuery<{
      gross_revenue_cents: string;
      discounts_cents: string;
      net_revenue_cents: string;
      work_orders_count: number;
    }>(tenantId, woSql, [tenantId, startDate, endDate]);

    const grossRevenueCents = parseInt(woRes.rows[0]?.gross_revenue_cents || '0', 10);
    const discountsCents = parseInt(woRes.rows[0]?.discounts_cents || '0', 10);
    const netRevenueCents = parseInt(woRes.rows[0]?.net_revenue_cents || '0', 10);
    const workOrdersCount = Number(woRes.rows[0]?.work_orders_count || 0);

    // 2. Custos de Materiais / CMV (Consumos de estoque registrados em OS do período)
    const matSql = `
      SELECT COALESCE(SUM(sm.total_cost_cents), 0)::bigint as material_costs_cents
      FROM stock_movements sm
      JOIN work_orders wo ON wo.id = sm.work_order_id
      WHERE sm.tenant_id = $1
        AND sm.movement_type = 'os_consumption'
        AND wo.created_at >= $2 AND wo.created_at <= $3;
    `;
    const matRes = await tenantQuery<{ material_costs_cents: string }>(tenantId, matSql, [
      tenantId,
      startDate,
      endDate,
    ]);
    const materialCostsCents = parseInt(matRes.rows[0]?.material_costs_cents || '0', 10);

    // 3. Custos de Comissões (Lançamentos válidos das OS do período)
    const commSql = `
      SELECT COALESCE(SUM(ce.commission_cents), 0)::bigint as commission_costs_cents
      FROM commission_entries ce
      JOIN work_orders wo ON wo.id = ce.work_order_id
      WHERE ce.tenant_id = $1
        AND ce.status != 'canceled'
        AND wo.created_at >= $2 AND wo.created_at <= $3;
    `;
    const commRes = await tenantQuery<{ commission_costs_cents: string }>(tenantId, commSql, [
      tenantId,
      startDate,
      endDate,
    ]);
    const commissionCostsCents = parseInt(commRes.rows[0]?.commission_costs_cents || '0', 10);

    // 4. Inadimplência / A Receber (Saldo pendente de pagamento em OS não canceladas)
    const pendSql = `
      SELECT COALESCE(SUM(GREATEST(0, final_cents - paid_cents)), 0)::bigint as pending_receivables_cents
      FROM work_orders
      WHERE tenant_id = $1
        AND status NOT IN ('CANCELED', 'QUOTE')
        AND created_at >= $2 AND created_at <= $3;
    `;
    const pendRes = await tenantQuery<{ pending_receivables_cents: string }>(tenantId, pendSql, [
      tenantId,
      startDate,
      endDate,
    ]);
    const pendingReceivablesCents = parseInt(pendRes.rows[0]?.pending_receivables_cents || '0', 10);

    // 5. Cálculos de Margem de Contribuição
    const contributionMarginCents = netRevenueCents - (materialCostsCents + commissionCostsCents);
    const contributionMarginPercent =
      netRevenueCents > 0 ? Number(((contributionMarginCents / netRevenueCents) * 100).toFixed(2)) : 0;

    return {
      startDate: filters.startDate || new Date(0).toISOString(),
      endDate: filters.endDate || new Date().toISOString(),
      grossRevenueCents,
      discountsCents,
      netRevenueCents,
      materialCostsCents,
      commissionCostsCents,
      contributionMarginCents,
      contributionMarginPercent,
      pendingReceivablesCents,
      workOrdersCount,
    };
  }

  // ============================================================================
  // 5. RANKING DE PRODUTIVIDADE E STREAK REAL AUDITADO
  // ============================================================================

  /**
   * Obtém o ranking de técnicos com Streak Real de dias sem retrabalho
   * calculado a partir de fatos auditados (work_orders.is_rework e qa_audits)
   */
  async getTechniciansRanking(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<TechnicianRankingItemDto[]> {
    const startDate = filters.startDate ? new Date(filters.startDate).toISOString() : '1970-01-01T00:00:00.000Z';
    const endDate = filters.endDate ? new Date(filters.endDate).toISOString() : '2099-12-31T23:59:59.999Z';

    // 1. Busca os técnicos ativos ou com histórico de OS
    const techsRes = await tenantQuery<{ id: string; name: string; member_since: string }>(
      tenantId,
      `SELECT DISTINCT u.id, u.name, m.created_at as member_since
       FROM users u
       JOIN memberships m ON m.user_id = u.id
       WHERE m.tenant_id = $1
         AND (m.role = 'tecnico' OR EXISTS (SELECT 1 FROM work_orders wo WHERE wo.tenant_id = $1 AND wo.technician_id = u.id))
       ORDER BY u.name ASC;`,
      [tenantId]
    );

    const rankingItems: TechnicianRankingItemDto[] = [];
    const now = Date.now();

    for (const tech of techsRes.rows) {
      // 2. Agrega OS produzidas e faturamento do técnico no período
      const statsRes = await tenantQuery<{
        work_orders_count: string;
        total_produced_cents: string;
      }>(
        tenantId,
        `SELECT
          COUNT(DISTINCT wo.id)::int as work_orders_count,
          COALESCE(SUM(wo.final_cents), 0)::bigint as total_produced_cents
        FROM work_orders wo
        WHERE wo.tenant_id = $1
          AND wo.technician_id = $2
          AND wo.status IN ('DELIVERED', 'READY')
          AND wo.created_at >= $3 AND wo.created_at <= $4;`,
        [tenantId, tech.id, startDate, endDate]
      );

      const workOrdersCount = parseInt(statsRes.rows[0]?.work_orders_count || '0', 10);
      const totalProducedCents = parseInt(statsRes.rows[0]?.total_produced_cents || '0', 10);

      // 3. Média de QA auditado para OS deste técnico
      const qaRes = await tenantQuery<{
        average_qa_score: string | null;
        total_audits: string;
        approved_audits: string;
      }>(
        tenantId,
        `SELECT 
           ROUND(AVG(qa.score), 2) as average_qa_score,
           COUNT(qa.id)::int as total_audits,
           COUNT(CASE WHEN qa.status = 'approved' THEN 1 END)::int as approved_audits
         FROM qa_audits qa
         JOIN work_orders wo ON wo.id = qa.work_order_id
         WHERE qa.tenant_id = $1
           AND wo.technician_id = $2
           AND qa.score IS NOT NULL;`,
        [tenantId, tech.id]
      );
      const totalAudits = parseInt(qaRes.rows[0]?.total_audits || '0', 10);
      const approvedAudits = parseInt(qaRes.rows[0]?.approved_audits || '0', 10);
      const averageQaScore = totalAudits > 0 && qaRes.rows[0]?.average_qa_score
        ? parseFloat(qaRes.rows[0].average_qa_score)
        : (workOrdersCount > 0 ? 5.0 : 0);
      const qaAuditsCount = totalAudits;
      const qaApprovedPercent = totalAudits > 0 ? Math.round((approvedAudits / totalAudits) * 100) : null;

      // 4. CÁLCULO FUNDAMENTAL DO STREAK REAL DE DIAS SEM RETRABALHO
      // Fatos auditados:
      // a) work_orders.is_rework = true
      // b) qa_audits com status = 'rejected_rework'
      const auditFactsRes = await tenantQuery<{
        last_rework_at: string | null;
        first_wo_at: string | null;
      }>(
        tenantId,
        `SELECT
          GREATEST(
            (
              SELECT MAX(wo.created_at)
              FROM work_orders wo
              WHERE wo.tenant_id = $1
                AND wo.technician_id = $2
                AND wo.is_rework = true
            ),
            (
              SELECT MAX(qa.created_at)
              FROM qa_audits qa
              JOIN work_orders wo ON wo.id = qa.work_order_id
              WHERE qa.tenant_id = $1
                AND wo.technician_id = $2
                AND qa.status = 'rejected_rework'
            )
          ) as last_rework_at,
          (
            SELECT MIN(wo.created_at)
            FROM work_orders wo
            WHERE wo.tenant_id = $1
              AND wo.technician_id = $2
          ) as first_wo_at;`,
        [tenantId, tech.id]
      );

      const lastReworkAt = auditFactsRes.rows[0]?.last_rework_at;
      const firstWoAt = auditFactsRes.rows[0]?.first_wo_at;

      let streakDaysWithoutRework = 0;
      let lastReworkDate: string | null = null;

      if (lastReworkAt) {
        lastReworkDate = new Date(lastReworkAt).toISOString();
        const diffMs = now - new Date(lastReworkAt).getTime();
        streakDaysWithoutRework = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      } else if (firstWoAt || tech.member_since) {
        // Nunca teve retrabalho ou falha de QA: streak conta desde a primeira OS ou data de admissão
        const baseDate = firstWoAt || tech.member_since;
        const diffMs = now - new Date(baseDate).getTime();
        streakDaysWithoutRework = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        streakDaysWithoutRework = 0;
      }

      rankingItems.push({
        technicianId: tech.id,
        technicianName: tech.name,
        workOrdersCount,
        totalProducedCents,
        averageQaScore,
        qaAuditsCount,
        qaApprovedPercent,
        streakDaysWithoutRework,
        lastReworkDate,
      });
    }

    // Ordena do maior faturamento produzido para o menor
    return rankingItems.sort((a, b) => b.totalProducedCents - a.totalProducedCents);
  }

  // ============================================================================
  // 6. CATEGORIAS FINANCEIRAS (PLANO DE CONTAS) - T6.11
  // ============================================================================

  async listCategories(tenantId: string): Promise<FinancialCategoryDto[]> {
    const res = await tenantQuery<any>(
      tenantId,
      `SELECT * FROM financial_categories
       WHERE tenant_id IS NULL OR tenant_id = $1
       ORDER BY display_order ASC, name ASC;`,
      [tenantId]
    );
    return res.rows.map(this.mapCategoryDto);
  }

  async createCategory(
    tenantId: string,
    input: CreateFinancialCategoryInputDto,
    currentUserId: string
  ): Promise<FinancialCategoryDto> {
    const res = await tenantQuery<any>(
      tenantId,
      `INSERT INTO financial_categories (
        tenant_id, name, type, group_type, is_system, display_order
      ) VALUES ($1, $2, $3, $4, false, $5)
      RETURNING *;`,
      [tenantId, input.name, input.type, input.groupType || 'other', input.displayOrder || 0]
    );

    const cat = res.rows[0];
    await auditService.record({
      tenantId,
      userId: currentUserId,
      action: 'CREATE_FINANCIAL_CATEGORY',
      entity: 'financial_categories',
      entityId: cat.id,
      newValues: { name: cat.name, type: cat.type, groupType: cat.group_type },
    });

    return this.mapCategoryDto(cat);
  }

  // ============================================================================
  // 7. CONTAS A PAGAR E A RECEBER (FINANCIAL_BILLS) - T6.11
  // ============================================================================

  async listBills(
    tenantId: string,
    filters: {
      type?: FinancialBillType;
      status?: FinancialBillStatus;
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    bills: FinancialBillDto[];
    total: number;
    summary: {
      totalPendingPayableCents: number;
      totalPendingReceivableCents: number;
      totalPaidCents: number;
      totalOverdueCents: number;
    };
  }> {
    let sql = `
      SELECT b.*, c.name as category_name, c.group_type as category_group
      FROM financial_bills b
      LEFT JOIN financial_categories c ON c.id = b.category_id
      WHERE b.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (filters.type) {
      params.push(filters.type);
      sql += ` AND b.type = $${params.length}`;
    }

    if (filters.status) {
      params.push(filters.status);
      sql += ` AND b.status = $${params.length}`;
    }

    if (filters.categoryId) {
      params.push(filters.categoryId);
      sql += ` AND b.category_id = $${params.length}`;
    }

    if (filters.startDate) {
      params.push(filters.startDate.slice(0, 10));
      sql += ` AND b.due_date >= $${params.length}::date`;
    }

    if (filters.endDate) {
      params.push(filters.endDate.slice(0, 10));
      sql += ` AND b.due_date <= $${params.length}::date`;
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const dataSql = `${sql} ORDER BY b.due_date ASC, b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;

    const [rowsRes, countRes, summaryRes] = await Promise.all([
      tenantQuery<any>(tenantId, dataSql, [...params, limit, offset]),
      tenantQuery<{ total: string }>(tenantId, `SELECT COUNT(*)::int as total FROM (${sql}) sub;`, params),
      tenantQuery<any>(
        tenantId,
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'payable' AND status IN ('pending', 'overdue') THEN amount_cents ELSE 0 END), 0)::bigint as pending_payable,
          COALESCE(SUM(CASE WHEN type = 'receivable' AND status IN ('pending', 'overdue') THEN amount_cents ELSE 0 END), 0)::bigint as pending_receivable,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN COALESCE(paid_amount_cents, amount_cents) ELSE 0 END), 0)::bigint as total_paid,
          COALESCE(SUM(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN amount_cents ELSE 0 END), 0)::bigint as total_overdue
         FROM financial_bills
         WHERE tenant_id = $1;`,
        [tenantId]
      ),
    ]);

    const total = Number(countRes.rows[0]?.total || 0);
    const summary = {
      totalPendingPayableCents: parseInt(summaryRes.rows[0]?.pending_payable || '0', 10),
      totalPendingReceivableCents: parseInt(summaryRes.rows[0]?.pending_receivable || '0', 10),
      totalPaidCents: parseInt(summaryRes.rows[0]?.total_paid || '0', 10),
      totalOverdueCents: parseInt(summaryRes.rows[0]?.total_overdue || '0', 10),
    };

    return {
      bills: rowsRes.rows.map(this.mapBillDto),
      total,
      summary,
    };
  }

  async createBill(
    tenantId: string,
    input: CreateFinancialBillInputDto,
    currentUserId: string
  ): Promise<FinancialBillDto> {
    const res = await tenantQuery<any>(
      tenantId,
      `INSERT INTO financial_bills (
        tenant_id, category_id, type, description, supplier_customer_name,
        amount_cents, due_date, payment_method, notes, work_order_id, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
      RETURNING *;`,
      [
        tenantId,
        input.categoryId || null,
        input.type,
        input.description,
        input.supplierCustomerName || null,
        input.amountCents,
        input.dueDate,
        input.paymentMethod || null,
        input.notes || null,
        input.workOrderId || null,
        currentUserId || null,
      ]
    );

    const bill = res.rows[0];
    await auditService.record({
      tenantId,
      userId: currentUserId,
      action: 'CREATE_FINANCIAL_BILL',
      entity: 'financial_bills',
      entityId: bill.id,
      newValues: {
        type: bill.type,
        description: bill.description,
        amountCents: bill.amount_cents,
        dueDate: bill.due_date,
      },
    });

    return this.mapBillDto(bill);
  }

  async markBillPaid(
    tenantId: string,
    billId: string,
    paidAmountCents?: number,
    paymentMethod?: string,
    currentUserId?: string
  ): Promise<FinancialBillDto> {
    const billRes = await tenantQuery<any>(
      tenantId,
      `SELECT * FROM financial_bills WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
      [tenantId, billId]
    );
    if (billRes.rows.length === 0) {
      throw new FinancialError('Conta financeira não foi encontrada.', 404, 'BILL_NOT_FOUND');
    }

    const currentBill = billRes.rows[0];
    const finalPaidAmount = paidAmountCents !== undefined ? paidAmountCents : currentBill.amount_cents;

    const updateRes = await tenantQuery<any>(
      tenantId,
      `UPDATE financial_bills
       SET status = 'paid', paid_at = NOW(), paid_amount_cents = $1, payment_method = COALESCE($2, payment_method), updated_at = NOW()
       WHERE tenant_id = $3 AND id = $4
       RETURNING *;`,
      [finalPaidAmount, paymentMethod || null, tenantId, billId]
    );

    const updated = updateRes.rows[0];
    if (currentUserId) {
      await auditService.record({
        tenantId,
        userId: currentUserId,
        action: 'PAY_FINANCIAL_BILL',
        entity: 'financial_bills',
        entityId: billId,
        newValues: { paidAmountCents: finalPaidAmount, paidAt: updated.paid_at },
      });
    }

    return this.mapBillDto(updated);
  }

  async deleteBill(tenantId: string, billId: string, currentUserId: string): Promise<boolean> {
    const res = await tenantQuery(
      tenantId,
      `DELETE FROM financial_bills WHERE tenant_id = $1 AND id = $2 RETURNING id;`,
      [tenantId, billId]
    );
    if (res.rows.length === 0) {
      throw new FinancialError('Conta não encontrada para exclusão.', 404, 'BILL_NOT_FOUND');
    }
    await auditService.record({
      tenantId,
      userId: currentUserId,
      action: 'DELETE_FINANCIAL_BILL',
      entity: 'financial_bills',
      entityId: billId,
    });
    return true;
  }

  // ============================================================================
  // 8. DRE GERENCIAL AVANÇADO COM EBITDA REAL - T6.11
  // ============================================================================

  async getAdvancedDre(
    tenantId: string,
    filters: { startDate?: string; endDate?: string }
  ): Promise<AdvancedDreReportDto> {
    const startDate = filters.startDate ? new Date(filters.startDate).toISOString() : '1970-01-01T00:00:00.000Z';
    const endDate = filters.endDate ? new Date(filters.endDate).toISOString() : '2099-12-31T23:59:59.999Z';

    // 1. Receita de Ordens de Serviço (Faturadas)
    const woSql = `
      SELECT
        COALESCE(SUM(total_cents), 0)::bigint as gross_service_cents,
        COALESCE(SUM(discount_cents), 0)::bigint as discounts_cents,
        COALESCE(SUM(final_cents), 0)::bigint as net_service_cents,
        COUNT(id)::int as work_orders_count
      FROM work_orders
      WHERE tenant_id = $1
        AND status IN ('DELIVERED', 'READY', 'IN_PROGRESS', 'QA')
        AND created_at >= $2 AND created_at <= $3;
    `;
    const woRes = await tenantQuery<any>(tenantId, woSql, [tenantId, startDate, endDate]);
    const serviceRevenueCents = parseInt(woRes.rows[0]?.gross_service_cents || '0', 10);
    const discountsCents = parseInt(woRes.rows[0]?.discounts_cents || '0', 10);
    const workOrdersCount = Number(woRes.rows[0]?.work_orders_count || 0);

    // 2. Outras Receitas (Contas a Receber quitadas no período)
    const recSql = `
      SELECT COALESCE(SUM(COALESCE(paid_amount_cents, amount_cents)), 0)::bigint as product_revenue_cents
      FROM financial_bills
      WHERE tenant_id = $1
        AND type = 'receivable'
        AND status = 'paid'
        AND paid_at >= $2 AND paid_at <= $3;
    `;
    const recRes = await tenantQuery<any>(tenantId, recSql, [tenantId, startDate, endDate]);
    const productRevenueCents = parseInt(recRes.rows[0]?.product_revenue_cents || '0', 10);

    const grossRevenueCents = serviceRevenueCents + productRevenueCents;

    // 3. Impostos Fiscais (NFS-e autorizadas da T6.10)
    const taxSql = `
      SELECT COALESCE(SUM(iss_amount_cents), 0)::bigint as total_iss_cents
      FROM fiscal_invoices
      WHERE tenant_id = $1
        AND status = 'authorized'
        AND created_at >= $2 AND created_at <= $3;
    `;
    const taxRes = await tenantQuery<any>(tenantId, taxSql, [tenantId, startDate, endDate]);
    const issTaxesCents = parseInt(taxRes.rows[0]?.total_iss_cents || '0', 10);

    const totalDeductionsCents = discountsCents + issTaxesCents;
    const netRevenueCents = Math.max(0, grossRevenueCents - totalDeductionsCents);

    // 4. Custos dos Serviços Prestados (CSP / CMV)
    // a) Materiais do estoque consumidos em OS
    const matSql = `
      SELECT COALESCE(SUM(sm.total_cost_cents), 0)::bigint as material_costs_cents
      FROM stock_movements sm
      JOIN work_orders wo ON wo.id = sm.work_order_id
      WHERE sm.tenant_id = $1
        AND sm.movement_type = 'os_consumption'
        AND wo.created_at >= $2 AND wo.created_at <= $3;
    `;
    const matRes = await tenantQuery<any>(tenantId, matSql, [tenantId, startDate, endDate]);
    const materialStockCostsCents = parseInt(matRes.rows[0]?.material_costs_cents || '0', 10);

    // b) Custo de Bobinas de PPF/Películas (T6.5 spool_cost_cents)
    const spoolSql = `
      SELECT COALESCE(SUM(ce.spool_cost_cents), 0)::bigint as spool_costs_cents
      FROM commission_entries ce
      JOIN work_orders wo ON wo.id = ce.work_order_id
      WHERE ce.tenant_id = $1
        AND wo.created_at >= $2 AND wo.created_at <= $3;
    `;
    const spoolRes = await tenantQuery<any>(tenantId, spoolSql, [tenantId, startDate, endDate]);
    const spoolRollCostsCents = parseInt(spoolRes.rows[0]?.spool_costs_cents || '0', 10);

    // c) Comissões de técnicos apuradas
    const commSql = `
      SELECT COALESCE(SUM(ce.commission_cents), 0)::bigint as commission_costs_cents
      FROM commission_entries ce
      JOIN work_orders wo ON wo.id = ce.work_order_id
      WHERE ce.tenant_id = $1
        AND ce.status != 'canceled'
        AND wo.created_at >= $2 AND wo.created_at <= $3;
    `;
    const commRes = await tenantQuery<any>(tenantId, commSql, [tenantId, startDate, endDate]);
    const technicianCommissionsCents = parseInt(commRes.rows[0]?.commission_costs_cents || '0', 10);

    const totalVariableCostsCents = materialStockCostsCents + spoolRollCostsCents + technicianCommissionsCents;
    const contributionMarginCents = netRevenueCents - totalVariableCostsCents;
    const contributionMarginPercent =
      netRevenueCents > 0 ? Number(((contributionMarginCents / netRevenueCents) * 100).toFixed(2)) : 0;

    // 5. Despesas Fixas e Despesas Operacionais (Contas pagas ou pendentes no período)
    const expSql = `
      SELECT
        c.group_type,
        c.name as category_name,
        COALESCE(SUM(COALESCE(b.paid_amount_cents, b.amount_cents)), 0)::bigint as total_cents
      FROM financial_bills b
      LEFT JOIN financial_categories c ON c.id = b.category_id
      WHERE b.tenant_id = $1
        AND b.type = 'payable'
        AND b.status IN ('paid', 'pending')
        AND b.due_date >= $2::date AND b.due_date <= $3::date
      GROUP BY c.group_type, c.name;
    `;
    const expRes = await tenantQuery<any>(tenantId, expSql, [tenantId, startDate.slice(0, 10), endDate.slice(0, 10)]);

    let rentCents = 0;
    let utilitiesCents = 0;
    let salariesCents = 0;
    let softwareCents = 0;
    let otherFixedCents = 0;
    let marketingCents = 0;
    let toolsMaintenanceCents = 0;
    let otherOperatingCents = 0;

    for (const row of expRes.rows) {
      const val = parseInt(row.total_cents || '0', 10);
      const name = String(row.category_name || '').toLowerCase();
      const group = row.group_type;

      if (group === 'fixed_expense') {
        if (name.includes('aluguel') || name.includes('ponto')) rentCents += val;
        else if (name.includes('energia') || name.includes('água') || name.includes('internet') || name.includes('luz')) utilitiesCents += val;
        else if (name.includes('pró-labore') || name.includes('salário') || name.includes('folha')) salariesCents += val;
        else if (name.includes('sistema') || name.includes('software') || name.includes('carx')) softwareCents += val;
        else otherFixedCents += val;
      } else if (group === 'operating_expense') {
        if (name.includes('marketing') || name.includes('tráfego') || name.includes('anúncio')) marketingCents += val;
        else if (name.includes('ferramenta') || name.includes('equipamento') || name.includes('manutenção')) toolsMaintenanceCents += val;
        else otherOperatingCents += val;
      } else if (group === 'other' || !group) {
        otherOperatingCents += val;
      }
    }

    const totalFixedExpensesCents = rentCents + utilitiesCents + salariesCents + softwareCents + otherFixedCents;
    const totalOperatingExpensesCents = marketingCents + toolsMaintenanceCents + otherOperatingCents;

    // 6. EBITDA Real e Lucro Líquido
    const ebitdaCents = contributionMarginCents - (totalFixedExpensesCents + totalOperatingExpensesCents);
    const ebitdaMarginPercent =
      netRevenueCents > 0 ? Number(((ebitdaCents / netRevenueCents) * 100).toFixed(2)) : 0;
    const netIncomeCents = ebitdaCents;

    // Saldo a receber de OSs pendentes
    const pendSql = `
      SELECT COALESCE(SUM(GREATEST(0, final_cents - paid_cents)), 0)::bigint as pending_cents
      FROM work_orders
      WHERE tenant_id = $1 AND status NOT IN ('CANCELED', 'QUOTE')
        AND created_at >= $2 AND created_at <= $3;
    `;
    const pendRes = await tenantQuery<any>(tenantId, pendSql, [tenantId, startDate, endDate]);
    const pendingReceivablesCents = parseInt(pendRes.rows[0]?.pending_cents || '0', 10);
    const ticketMedioCents = workOrdersCount > 0 ? Math.round(netRevenueCents / workOrdersCount) : 0;

    return {
      startDate: filters.startDate || startDate,
      endDate: filters.endDate || endDate,
      grossRevenueCents,
      serviceRevenueCents,
      productRevenueCents,
      deductions: {
        discountsCents,
        issTaxesCents,
        totalDeductionsCents,
      },
      netRevenueCents,
      variableCosts: {
        materialStockCostsCents,
        spoolRollCostsCents,
        technicianCommissionsCents,
        totalVariableCostsCents,
      },
      contributionMarginCents,
      contributionMarginPercent,
      fixedExpenses: {
        rentCents,
        utilitiesCents,
        salariesCents,
        softwareCents,
        otherFixedCents,
        totalFixedExpensesCents,
      },
      operatingExpenses: {
        marketingCents,
        toolsMaintenanceCents,
        otherOperatingCents,
        totalOperatingExpensesCents,
      },
      ebitdaCents,
      ebitdaMarginPercent,
      netIncomeCents,
      pendingReceivablesCents,
      workOrdersCount,
      ticketMedioCents,
    };
  }

  // ============================================================================
  // 9. PROJEÇÃO DE FLUXO DE CAIXA (30/60/90 DIAS) - T6.11
  // ============================================================================

  async getCashFlowProjection(tenantId: string, daysHorizon = 30): Promise<CashFlowProjectionDto> {
    const currentBalanceRes = await tenantQuery<any>(
      tenantId,
      `SELECT
        (
          COALESCE((SELECT SUM(amount_cents) FROM payments WHERE tenant_id = $1), 0) +
          COALESCE((SELECT SUM(paid_amount_cents) FROM financial_bills WHERE tenant_id = $1 AND type = 'receivable' AND status = 'paid'), 0) -
          COALESCE((SELECT SUM(paid_amount_cents) FROM financial_bills WHERE tenant_id = $1 AND type = 'payable' AND status = 'paid'), 0) -
          COALESCE((SELECT SUM(commission_cents) FROM commission_entries WHERE tenant_id = $1 AND status = 'paid'), 0)
        )::bigint as current_balance;`,
      [tenantId]
    );
    let runningBalance = parseInt(currentBalanceRes.rows[0]?.current_balance || '0', 10);
    const initialBalance = runningBalance;

    const futureBillsRes = await tenantQuery<any>(
      tenantId,
      `SELECT due_date::text as due_date, type, status, amount_cents
       FROM financial_bills
       WHERE tenant_id = $1
         AND status IN ('pending', 'overdue')
         AND due_date <= CURRENT_DATE + interval '90 days'
       ORDER BY due_date ASC;`,
      [tenantId]
    );

    const dailyMap = new Map<string, { incomingCents: number; outgoingCents: number }>();
    const today = new Date();

    for (let i = 0; i <= 90; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      dailyMap.set(dateStr, { incomingCents: 0, outgoingCents: 0 });
    }

    for (const row of futureBillsRes.rows) {
      const dStr = row.due_date;
      const amount = Number(row.amount_cents || 0);
      const targetDate = dStr < today.toISOString().slice(0, 10) ? today.toISOString().slice(0, 10) : dStr;
      const point = dailyMap.get(targetDate);
      if (point) {
        if (row.type === 'receivable') {
          point.incomingCents += amount;
        } else {
          point.outgoingCents += amount;
        }
      }
    }

    const dailyTimeline: CashFlowDayPointDto[] = [];
    let inc30 = 0, out30 = 0;
    let inc60 = 0, out60 = 0;
    let inc90 = 0, out90 = 0;

    let index = 0;
    for (const [dateStr, values] of dailyMap.entries()) {
      runningBalance += values.incomingCents - values.outgoingCents;

      if (index <= daysHorizon) {
        dailyTimeline.push({
          date: dateStr,
          incomingCents: values.incomingCents,
          outgoingCents: values.outgoingCents,
          projectedBalanceCents: runningBalance,
        });
      }

      if (index <= 30) {
        inc30 += values.incomingCents;
        out30 += values.outgoingCents;
      }
      if (index <= 60) {
        inc60 += values.incomingCents;
        out60 += values.outgoingCents;
      }
      if (index <= 90) {
        inc90 += values.incomingCents;
        out90 += values.outgoingCents;
      }

      index++;
    }

    return {
      currentBalanceCents: initialBalance,
      dailyTimeline,
      summary30Days: {
        totalIncomingCents: inc30,
        totalOutgoingCents: out30,
        projectedNetCents: inc30 - out30,
        finalBalanceCents: initialBalance + (inc30 - out30),
      },
      summary60Days: {
        totalIncomingCents: inc60,
        totalOutgoingCents: out60,
        projectedNetCents: inc60 - out60,
        finalBalanceCents: initialBalance + (inc60 - out60),
      },
      summary90Days: {
        totalIncomingCents: inc90,
        totalOutgoingCents: out90,
        projectedNetCents: inc90 - out90,
        finalBalanceCents: initialBalance + (inc90 - out90),
      },
    };
  }

  // ============================================================================
  // 10. FECHAMENTO E LIQUIDAÇÃO EM LOTE DE COMISSÕES - T6.11
  // ============================================================================

  async batchPayCommissions(
    tenantId: string,
    input: BatchPayCommissionsInputDto,
    currentUserId: string
  ): Promise<BatchPayCommissionsResultDto> {
    if (!input.entryIds || input.entryIds.length === 0) {
      throw new FinancialError('Nenhum lançamento selecionado para quitação.', 400, 'NO_ENTRIES_SELECTED');
    }

    const entriesRes = await tenantQuery<any>(
      tenantId,
      `SELECT ce.*, u.name as technician_name
       FROM commission_entries ce
       JOIN users u ON u.id = ce.technician_id
       WHERE ce.tenant_id = $1
         AND ce.technician_id = $2
         AND ce.id = ANY($3::uuid[])
         AND ce.status = 'pending';`,
      [tenantId, input.technicianId, input.entryIds]
    );

    if (entriesRes.rows.length === 0) {
      throw new FinancialError('Nenhum lançamento pendente encontrado para este técnico.', 404, 'ENTRIES_NOT_FOUND');
    }

    const technicianName = entriesRes.rows[0].technician_name;
    const totalPaidCents = entriesRes.rows.reduce(
      (acc: number, r: any) => acc + Number(r.commission_cents),
      0
    );
    const batchId = `batch_comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const paidAt = new Date().toISOString();

    await tenantQuery(
      tenantId,
      `UPDATE commission_entries
       SET status = 'paid', paid_at = NOW(), batch_id = $1, paid_by = $2, updated_at = NOW()
       WHERE tenant_id = $3 AND id = ANY($4::uuid[]);`,
      [batchId, currentUserId || null, tenantId, input.entryIds]
    );

    const catRes = await tenantQuery<{ id: string }>(
      tenantId,
      `SELECT id FROM financial_categories
       WHERE (tenant_id = $1 OR tenant_id IS NULL) AND name LIKE '%Comissões%'
       LIMIT 1;`,
      [tenantId]
    );
    const categoryId = catRes.rows[0]?.id || null;

    await tenantQuery(
      tenantId,
      `INSERT INTO financial_bills (
        tenant_id, category_id, type, description, supplier_customer_name,
        amount_cents, due_date, paid_at, paid_amount_cents, status, payment_method, notes, created_by
      ) VALUES ($1, $2, 'payable', $3, $4, $5, CURRENT_DATE, NOW(), $6, 'paid', $7, $8, $9);`,
      [
        tenantId,
        categoryId,
        `Fechamento de Comissões · ${technicianName} (${entriesRes.rows.length} serviços)`,
        technicianName,
        totalPaidCents,
        totalPaidCents,
        input.paymentMethod || 'pix',
        input.notes || `Lote ${batchId}`,
        currentUserId || null,
      ]
    );

    await auditService.record({
      tenantId,
      userId: currentUserId,
      action: 'BATCH_PAY_COMMISSIONS',
      entity: 'commission_entries',
      entityId: batchId,
      newValues: {
        batchId,
        technicianId: input.technicianId,
        paidCount: entriesRes.rows.length,
        totalPaidCents,
      },
    });

    return {
      batchId,
      technicianId: input.technicianId,
      technicianName,
      paidCount: entriesRes.rows.length,
      totalPaidCents,
      paidAt,
    };
  }

  // ============================================================================
  // MAPPERS PRIVADOS
  // ============================================================================

  private mapCategoryDto = (row: any): FinancialCategoryDto => {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      type: row.type,
      groupType: row.group_type as FinancialCategoryGroupType,
      isSystem: Boolean(row.is_system),
      displayOrder: Number(row.display_order),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  };

  private mapBillDto = (row: any): FinancialBillDto => {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      categoryId: row.category_id || null,
      categoryName: row.category_name || null,
      categoryGroup: (row.category_group as FinancialCategoryGroupType) || null,
      type: row.type as FinancialBillType,
      description: row.description,
      supplierCustomerName: row.supplier_customer_name || null,
      amountCents: Number(row.amount_cents),
      dueDate: typeof row.due_date === 'string' ? row.due_date.slice(0, 10) : new Date(row.due_date).toISOString().slice(0, 10),
      paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
      paidAmountCents: row.paid_amount_cents !== null && row.paid_amount_cents !== undefined ? Number(row.paid_amount_cents) : null,
      status: row.status as FinancialBillStatus,
      paymentMethod: row.payment_method || null,
      notes: row.notes || null,
      workOrderId: row.work_order_id || null,
      createdById: row.created_by || null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  };

  private mapRuleDto(row: any): CommissionRuleDto {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      technicianId: row.technician_id || null,
      technicianName: row.technician_name || null,
      serviceId: row.service_id || null,
      serviceName: row.service_name || null,
      commissionType: row.commission_type as CommissionType,
      commissionValue: Number(row.commission_value),
      baseCalculation: row.base_calculation as BaseCalculationType,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private mapEntryDto(row: any, osNumber?: number, technicianName?: string): CommissionEntryDto {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      workOrderId: row.work_order_id,
      osNumber: osNumber ?? row.os_number,
      serviceItemId: row.service_item_id || null,
      technicianId: row.technician_id,
      technicianName: technicianName ?? row.technician_name,
      ruleId: row.rule_id || null,
      grossAmountCents: Number(row.gross_amount_cents),
      deductionsCents: Number(row.deductions_cents),
      commissionCents: Number(row.commission_cents),
      status: row.status as CommissionStatus,
      paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
      notes: row.notes || null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}

export const financialService = new FinancialService();
