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
           SET rule_id = $1, gross_amount_cents = $2, deductions_cents = $3, commission_cents = $4, updated_at = NOW()
           WHERE id = $5
           RETURNING *;`,
          [matchedRule.id, grossAmountCents, deductionsCents, commissionCents, existingRes.rows[0].id]
        );
        entryRow = updateRes.rows[0];
      } else {
        const insertRes = await tenantQuery<any>(
          tenantId,
          `INSERT INTO commission_entries (
            tenant_id, work_order_id, service_item_id, technician_id, rule_id,
            gross_amount_cents, deductions_cents, commission_cents, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
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
    const techsRes = await tenantQuery<{ id: string; name: string }>(
      tenantId,
      `SELECT DISTINCT u.id, u.name
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
      const qaRes = await tenantQuery<{ average_qa_score: string }>(
        tenantId,
        `SELECT ROUND(AVG(qa.score), 2) as average_qa_score
         FROM qa_audits qa
         JOIN work_orders wo ON wo.id = qa.work_order_id
         WHERE qa.tenant_id = $1
           AND wo.technician_id = $2
           AND qa.score IS NOT NULL;`,
        [tenantId, tech.id]
      );
      const averageQaScore = parseFloat(qaRes.rows[0]?.average_qa_score || '0');

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
      } else if (firstWoAt) {
        // Nunca teve retrabalho ou falha de QA: streak conta desde a primeira OS
        const diffMs = now - new Date(firstWoAt).getTime();
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
        streakDaysWithoutRework,
        lastReworkDate,
      });
    }

    // Ordena do maior faturamento produzido para o menor
    return rankingItems.sort((a, b) => b.totalProducedCents - a.totalProducedCents);
  }

  // ============================================================================
  // MAPPERS PRIVADOS
  // ============================================================================

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
