import { tenantQuery } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import {
  UnitDto,
  CreateUnitInputDto,
  UpdateUnitInputDto,
  CorporateDashboardOverviewDto,
  UnitRankingItemDto,
  CreateUnitTransferInputDto,
  UnitTransferDto,
} from '@carx/shared';

export class CorporateError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'CORPORATE_ERROR') {
    super(message);
    this.name = 'CorporateError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class CorporateService {
  // ============================================================================
  // 1. GESTÃO DE UNIDADES / FILIAIS DA REDE
  // ============================================================================

  /**
   * Garante que o tenant possua ao menos a Unidade Matriz registrada
   */
  async ensureHeadquartersUnit(tenantId: string): Promise<void> {
    try {
      const check = await tenantQuery<{ count: string }>(
        tenantId,
        `SELECT COUNT(*) as count FROM units WHERE tenant_id = $1;`,
        [tenantId]
      );

      if (parseInt(check.rows[0]?.count || '0', 10) === 0) {
        const tenantInfo = await tenantQuery<{ trade_name: string | null; legal_name: string | null }>(
          tenantId,
          `SELECT trade_name, legal_name FROM tenants WHERE id = $1;`,
          [tenantId]
        );
        const name =
          tenantInfo.rows[0]?.trade_name || tenantInfo.rows[0]?.legal_name || 'Loja Matriz / Sede Principal';

        await tenantQuery(
          tenantId,
          `INSERT INTO units (
            tenant_id, name, slug, is_active, created_at, updated_at
          ) VALUES ($1, $2, 'matriz', true, NOW(), NOW())
          ON CONFLICT DO NOTHING;`,
          [tenantId, name]
        );
      }
    } catch {
      // Criação tolerante de sede
    }
  }

  /**
   * Lista todas as filiais do tenant com métricas operacionais vinculadas
   */
  async listUnits(tenantId: string): Promise<UnitDto[]> {
    await this.ensureHeadquartersUnit(tenantId);

    const query = `
      SELECT 
        u.id,
        u.tenant_id as "tenantId",
        u.name,
        u.slug,
        u.cnpj,
        u.phone,
        u.email,
        u.address_street as "addressStreet",
        u.address_number as "addressNumber",
        u.address_complement as "addressComplement",
        u.address_neighborhood as "addressNeighborhood",
        u.address_city as "addressCity",
        u.address_state as "addressState",
        u.address_postal_code as "addressPostalCode",
        u.is_active as "isActive",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt",
        (SELECT COUNT(*)::int FROM work_orders wo WHERE (wo.unit_id = u.id OR (wo.unit_id IS NULL AND u.slug = 'matriz')) AND wo.tenant_id = $1) as "workOrdersCount",
        (SELECT COUNT(*)::int FROM bays b WHERE (b.unit_id = u.id OR (b.unit_id IS NULL AND u.slug = 'matriz')) AND b.tenant_id = $1 AND b.is_active = true) as "activeBaysCount",
        (SELECT COUNT(*)::int FROM material_rolls mr WHERE (mr.unit_id = u.id OR (mr.unit_id IS NULL AND u.slug = 'matriz')) AND mr.tenant_id = $1 AND mr.status = 'in_use') as "totalRollsCount"
      FROM units u
      WHERE u.tenant_id = $1
      ORDER BY u.created_at ASC;
    `;

    const res = await tenantQuery<any>(tenantId, query, [tenantId]);
    return res.rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  /**
   * Obtém detalhes de uma unidade específica
   */
  async getUnitById(tenantId: string, unitId: string): Promise<UnitDto> {
    const query = `
      SELECT 
        u.id,
        u.tenant_id as "tenantId",
        u.name,
        u.slug,
        u.cnpj,
        u.phone,
        u.email,
        u.address_street as "addressStreet",
        u.address_number as "addressNumber",
        u.address_complement as "addressComplement",
        u.address_neighborhood as "addressNeighborhood",
        u.address_city as "addressCity",
        u.address_state as "addressState",
        u.address_postal_code as "addressPostalCode",
        u.is_active as "isActive",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt",
        (SELECT COUNT(*)::int FROM work_orders wo WHERE wo.unit_id = u.id AND wo.tenant_id = $1) as "workOrdersCount",
        (SELECT COUNT(*)::int FROM bays b WHERE b.unit_id = u.id AND b.tenant_id = $1 AND b.is_active = true) as "activeBaysCount",
        (SELECT COUNT(*)::int FROM material_rolls mr WHERE mr.unit_id = u.id AND mr.tenant_id = $1 AND mr.status = 'in_use') as "totalRollsCount"
      FROM units u
      WHERE u.id = $1 AND u.tenant_id = $2;
    `;

    const res = await tenantQuery<any>(tenantId, query, [unitId, tenantId]);
    if (res.rows.length === 0) {
      throw new CorporateError('Unidade não encontrada nesta oficina.', 404, 'UNIT_NOT_FOUND');
    }

    const row = res.rows[0];
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Cadastra uma nova filial respeitando o limite max_units do plano contratado
   */
  async createUnit(
    tenantId: string,
    data: CreateUnitInputDto,
    currentUserId?: string
  ): Promise<UnitDto> {
    // 1. Validação de Quota do Plano
    const planRes = await tenantQuery<{ max_units: number }>(
      tenantId,
      `
      SELECT COALESCE((p.limits->>'max_units')::int, 1) as max_units
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      WHERE t.id = $1;
      `,
      [tenantId]
    );

    const maxUnits = planRes.rows[0]?.max_units ?? 1;

    const countRes = await tenantQuery<{ count: number }>(
      tenantId,
      'SELECT COUNT(*)::int as count FROM units WHERE tenant_id = $1;',
      [tenantId]
    );
    const currentCount = countRes.rows[0]?.count ?? 0;

    if (currentCount >= maxUnits) {
      throw new CorporateError(
        `Limite de unidades/filiais atingido para o plano atual (máximo de ${maxUnits} unidade(s)). Faça upgrade do seu plano para expandir sua rede.`,
        403,
        'QUOTA_EXCEEDED'
      );
    }

    // 2. Unicidade de Slug por Tenant
    const slugCheck = await tenantQuery(
      tenantId,
      'SELECT id FROM units WHERE tenant_id = $1 AND slug = $2;',
      [tenantId, data.slug]
    );
    if (slugCheck.rows.length > 0) {
      throw new CorporateError(
        'Já existe uma unidade cadastrada com este identificador (slug) nesta oficina.',
        409,
        'SLUG_ALREADY_EXISTS'
      );
    }

    // 3. Inserção no banco
    const insertQuery = `
      INSERT INTO units (
        tenant_id,
        name,
        slug,
        cnpj,
        phone,
        email,
        address_street,
        address_number,
        address_complement,
        address_neighborhood,
        address_city,
        address_state,
        address_postal_code,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      RETURNING 
        id,
        tenant_id as "tenantId",
        name,
        slug,
        cnpj,
        phone,
        email,
        address_street as "addressStreet",
        address_number as "addressNumber",
        address_complement as "addressComplement",
        address_neighborhood as "addressNeighborhood",
        address_city as "addressCity",
        address_state as "addressState",
        address_postal_code as "addressPostalCode",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt";
    `;

    const res = await tenantQuery<any>(tenantId, insertQuery, [
      tenantId,
      data.name.trim(),
      data.slug.trim().toLowerCase(),
      data.cnpj || null,
      data.phone || null,
      data.email || null,
      data.addressStreet || null,
      data.addressNumber || null,
      data.addressComplement || null,
      data.addressNeighborhood || null,
      data.addressCity || null,
      data.addressState ? data.addressState.toUpperCase() : null,
      data.addressPostalCode || null,
    ]);

    const created = res.rows[0];

    // Registro na trilha de auditoria
    if (currentUserId) {
      await auditService.record({
        tenantId,
        userId: currentUserId,
        action: 'CORPORATE_UNIT_CREATED',
        entity: 'units',
        entityId: created.id,
        newValues: { ...created },
      });
    }

    return {
      ...created,
      workOrdersCount: 0,
      activeBaysCount: 0,
      totalRollsCount: 0,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Atualiza dados de uma filial
   */
  async updateUnit(
    tenantId: string,
    unitId: string,
    data: UpdateUnitInputDto,
    currentUserId?: string
  ): Promise<UnitDto> {
    const existing = await this.getUnitById(tenantId, unitId);

    if (data.slug && data.slug !== existing.slug) {
      const slugCheck = await tenantQuery(
        tenantId,
        'SELECT id FROM units WHERE tenant_id = $1 AND slug = $2 AND id <> $3;',
        [tenantId, data.slug, unitId]
      );
      if (slugCheck.rows.length > 0) {
        throw new CorporateError(
          'Já existe outra filial cadastrada com este slug.',
          409,
          'SLUG_ALREADY_EXISTS'
        );
      }
    }

    const updateQuery = `
      UPDATE units SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        cnpj = COALESCE($3, cnpj),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        address_street = COALESCE($6, address_street),
        address_number = COALESCE($7, address_number),
        address_complement = COALESCE($8, address_complement),
        address_neighborhood = COALESCE($9, address_neighborhood),
        address_city = COALESCE($10, address_city),
        address_state = COALESCE($11, address_state),
        address_postal_code = COALESCE($12, address_postal_code),
        is_active = COALESCE($13, is_active),
        updated_at = NOW()
      WHERE id = $14 AND tenant_id = $15
      RETURNING 
        id,
        tenant_id as "tenantId",
        name,
        slug,
        cnpj,
        phone,
        email,
        address_street as "addressStreet",
        address_number as "addressNumber",
        address_complement as "addressComplement",
        address_neighborhood as "addressNeighborhood",
        address_city as "addressCity",
        address_state as "addressState",
        address_postal_code as "addressPostalCode",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt";
    `;

    const res = await tenantQuery<any>(tenantId, updateQuery, [
      data.name ? data.name.trim() : null,
      data.slug ? data.slug.trim().toLowerCase() : null,
      data.cnpj !== undefined ? data.cnpj : null,
      data.phone !== undefined ? data.phone : null,
      data.email !== undefined ? data.email : null,
      data.addressStreet !== undefined ? data.addressStreet : null,
      data.addressNumber !== undefined ? data.addressNumber : null,
      data.addressComplement !== undefined ? data.addressComplement : null,
      data.addressNeighborhood !== undefined ? data.addressNeighborhood : null,
      data.addressCity !== undefined ? data.addressCity : null,
      data.addressState ? data.addressState.toUpperCase() : null,
      data.addressPostalCode !== undefined ? data.addressPostalCode : null,
      data.isActive !== undefined ? data.isActive : null,
      unitId,
      tenantId,
    ]);

    const updated = res.rows[0];

    if (currentUserId) {
      await auditService.record({
        tenantId,
        userId: currentUserId,
        action: 'CORPORATE_UNIT_UPDATED',
        entity: 'units',
        entityId: unitId,
        oldValues: { ...existing },
        newValues: { ...updated },
      });
    }

    return this.getUnitById(tenantId, unitId);
  }

  // ============================================================================
  // 2. COCKPIT EXECUTIVO MULTIUNIDADE & RANKING DA REDE
  // ============================================================================

  /**
   * Consolida métricas executivas de todas as filiais e calcula o ranking de performance
   */
  async getCorporateOverview(
    tenantId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<CorporateDashboardOverviewDto> {
    await this.ensureHeadquartersUnit(tenantId);

    // 1. Busca todas as unidades do tenant
    const unitsRes = await tenantQuery<any>(
      tenantId,
      `
      SELECT 
        u.id, 
        u.name, 
        u.slug, 
        u.is_active as "isActive"
      FROM units u
      WHERE u.tenant_id = $1
      ORDER BY u.created_at ASC;
      `,
      [tenantId]
    );

    const units = unitsRes.rows;
    const totalUnitsCount = units.length;
    const activeUnitsCount = units.filter((u) => u.isActive).length;

    // 2. Faturamento e OSs por Unidade
    // Considera work_orders com status concluído ou faturado
    let dateFilterSql = '';
    const dateParams: unknown[] = [tenantId];
    if (filters?.startDate) {
      dateParams.push(filters.startDate);
      dateFilterSql += ` AND wo.created_at >= $${dateParams.length}`;
    }
    if (filters?.endDate) {
      dateParams.push(filters.endDate);
      dateFilterSql += ` AND wo.created_at <= $${dateParams.length}`;
    }

    const woStatsQuery = `
      SELECT 
        COALESCE(wo.unit_id, (SELECT id FROM units WHERE tenant_id = $1 AND slug = 'matriz' LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid) as unit_id,
        COUNT(*)::int as work_orders_count,
        COALESCE(SUM(wo.total_cents), 0)::bigint as revenue_cents
      FROM work_orders wo
      WHERE wo.tenant_id = $1
        AND UPPER(wo.status) IN ('COMPLETED', 'DELIVERED', 'IN_PROGRESS', 'READY', 'QA', 'APPROVED')
        ${dateFilterSql}
      GROUP BY 1;
    `;

    const woStatsRes = await tenantQuery<{
      unit_id: string;
      work_orders_count: number;
      revenue_cents: string;
    }>(tenantId, woStatsQuery, dateParams);

    const woStatsMap = new Map<string, { count: number; revenue: number }>();
    woStatsRes.rows.forEach((r) => {
      woStatsMap.set(r.unit_id, {
        count: r.work_orders_count,
        revenue: Number(r.revenue_cents),
      });
    });

    // 3. Ocupação de Boxes por Unidade
    const baysQuery = `
      SELECT 
        b.id,
        COALESCE(b.unit_id, (SELECT id FROM units WHERE tenant_id = $1 AND slug = 'matriz' LIMIT 1)) as unit_id,
        b.is_active,
        EXISTS (
          SELECT 1 FROM appointments a 
          WHERE a.bay_id = b.id 
            AND a.status IN ('in_progress', 'confirmed')
            AND a.tenant_id = $1
        ) as is_occupied
      FROM bays b
      WHERE b.tenant_id = $1;
    `;

    const baysRes = await tenantQuery<{
      id: string;
      unit_id: string | null;
      is_active: boolean;
      is_occupied: boolean;
    }>(tenantId, baysQuery, [tenantId]);

    const unitBaysMap = new Map<string, { total: number; occupied: number }>();
    let overallTotalBays = 0;
    let overallOccupiedBays = 0;

    baysRes.rows.forEach((b) => {
      if (b.is_active) {
        overallTotalBays++;
        if (b.is_occupied) overallOccupiedBays++;

        const key = b.unit_id || 'unassigned';
        const cur = unitBaysMap.get(key) || { total: 0, occupied: 0 };
        cur.total++;
        if (b.is_occupied) cur.occupied++;
        unitBaysMap.set(key, cur);
      }
    });

    // 4. Bobinas ativas por Unidade
    const rollsQuery = `
      SELECT 
        COALESCE(mr.unit_id, (SELECT id FROM units WHERE tenant_id = $1 AND slug = 'matriz' LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid) as unit_id,
        COUNT(*)::int as rolls_count,
        COALESCE(SUM(mr.current_meters), 0)::numeric as total_meters,
        COALESCE(SUM(mr.cost_cents), 0)::bigint as total_cost_cents
      FROM material_rolls mr
      WHERE mr.tenant_id = $1 AND mr.status = 'in_use'
      GROUP BY 1;
    `;
    const rollsRes = await tenantQuery<{
      unit_id: string;
      rolls_count: number;
      total_meters: string;
      total_cost_cents: string;
    }>(tenantId, rollsQuery, [tenantId]);

    const unitRollsMap = new Map<
      string,
      { count: number; meters: number; costCents: number }
    >();
    rollsRes.rows.forEach((r) => {
      unitRollsMap.set(r.unit_id, {
        count: r.rolls_count,
        meters: Number(r.total_meters),
        costCents: Number(r.total_cost_cents),
      });
    });

    // 5. Insumos por Unidade
    const materialsQuery = `
      SELECT 
        COALESCE(m.unit_id, (SELECT id FROM units WHERE tenant_id = $1 AND slug = 'matriz' LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid) as unit_id,
        COUNT(*)::int as materials_count,
        COALESCE(SUM(m.current_stock * m.cost_cents), 0)::bigint as valuation_cents
      FROM materials m
      WHERE m.tenant_id = $1
      GROUP BY 1;
    `;
    const materialsRes = await tenantQuery<{
      unit_id: string;
      materials_count: number;
      valuation_cents: string;
    }>(tenantId, materialsQuery, [tenantId]);

    const unitMaterialsMap = new Map<string, { count: number; valuationCents: number }>();
    materialsRes.rows.forEach((m) => {
      unitMaterialsMap.set(m.unit_id, {
        count: m.materials_count,
        valuationCents: Number(m.valuation_cents),
      });
    });

    // Monta o ranking por loja
    const rawRanking: Omit<UnitRankingItemDto, 'rank'>[] = units.map((u) => {
      const woStat = woStatsMap.get(u.id) || { count: 0, revenue: 0 };
      const baysStat = unitBaysMap.get(u.id) || { total: 0, occupied: 0 };
      const rollsStat = unitRollsMap.get(u.id) || { count: 0, meters: 0, costCents: 0 };

      const averageTicketCents =
        woStat.count > 0 ? Math.round(woStat.revenue / woStat.count) : 0;

      const bayOccupancyRatePercent =
        baysStat.total > 0
          ? Math.round((baysStat.occupied / baysStat.total) * 100)
          : 0;

      return {
        unitId: u.id,
        unitName: u.name,
        unitSlug: u.slug,
        revenueCents: woStat.revenue,
        workOrdersCount: woStat.count,
        averageTicketCents,
        bayOccupancyRatePercent,
        totalBays: baysStat.total,
        occupiedBays: baysStat.occupied,
        activeRollsCount: rollsStat.count,
      };
    });

    // Ordena ranking por faturamento decrescente (e número de OSs como critério de desempate)
    rawRanking.sort((a, b) => {
      if (b.revenueCents !== a.revenueCents) {
        return b.revenueCents - a.revenueCents;
      }
      return b.workOrdersCount - a.workOrdersCount;
    });

    const unitsRanking: UnitRankingItemDto[] = rawRanking.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    // Métricas agregadas da rede consolidada
    const totalRevenueCents = unitsRanking.reduce((acc, u) => acc + u.revenueCents, 0);
    const totalWorkOrders = unitsRanking.reduce((acc, u) => acc + u.workOrdersCount, 0);
    const averageTicketCents =
      totalWorkOrders > 0 ? Math.round(totalRevenueCents / totalWorkOrders) : 0;
    const averageBayOccupancyRatePercent =
      overallTotalBays > 0
        ? Math.round((overallOccupiedBays / overallTotalBays) * 100)
        : 0;

    // Resumo de inventário por filial
    const inventorySummary = units.map((u) => {
      const rolls = unitRollsMap.get(u.id) || { count: 0, meters: 0, costCents: 0 };
      const materials = unitMaterialsMap.get(u.id) || { count: 0, valuationCents: 0 };

      return {
        unitId: u.id,
        unitName: u.name,
        rollsCount: rolls.count,
        rollsTotalMeters: rolls.meters,
        materialsCount: materials.count,
        inventoryValuationCents: rolls.costCents + materials.valuationCents,
      };
    });

    return {
      totalRevenueCents,
      totalWorkOrders,
      averageTicketCents,
      averageBayOccupancyRatePercent,
      totalUnitsCount,
      activeUnitsCount,
      unitsRanking,
      inventorySummary,
    };
  }

  // ============================================================================
  // 3. TRANSFERÊNCIA DE INSUMOS E BOBINAS ENTRE FILIAIS (LOGÍSTICA INTER-LOJAS)
  // ============================================================================

  /**
   * Executa a transferência de uma bobina ou insumo de estoque entre duas filiais
   */
  async transferInventory(
    tenantId: string,
    data: CreateUnitTransferInputDto,
    userId?: string
  ): Promise<UnitTransferDto> {
    if (data.fromUnitId === data.toUnitId) {
      throw new CorporateError(
        'A filial de origem não pode ser a mesma de destino.',
        400,
        'IDENTICAL_UNITS'
      );
    }

    // 1. Validação de Unidades Pertencentes ao Tenant
    const unitsCheck = await tenantQuery<{ id: string; name: string }>(
      tenantId,
      'SELECT id, name FROM units WHERE id IN ($1, $2) AND tenant_id = $3 AND is_active = true;',
      [data.fromUnitId, data.toUnitId, tenantId]
    );

    if (unitsCheck.rows.length < 2) {
      throw new CorporateError(
        'Uma ou ambas as unidades informadas são inválidas ou não pertencem a esta oficina.',
        404,
        'UNITS_NOT_FOUND'
      );
    }

    const fromUnitName =
      unitsCheck.rows.find((u) => u.id === data.fromUnitId)?.name || 'Origem';
    const toUnitName =
      unitsCheck.rows.find((u) => u.id === data.toUnitId)?.name || 'Destino';

    let rollInfo: { code: string; brand: string } | null = null;
    let materialInfo: { name: string } | null = null;

    // 2. Execução da Transferência
    if (data.transferType === 'roll') {
      if (!data.rollId) {
        throw new CorporateError(
          'O ID da bobina de PPF/película é obrigatório para transferência de rolo.',
          400,
          'ROLL_ID_REQUIRED'
        );
      }

      // Valida o rolo na origem
      const rollRes = await tenantQuery<{
        id: string;
        code: string;
        brand: string;
        unit_id: string | null;
        status: string;
      }>(
        tenantId,
        'SELECT id, code, brand, unit_id, status FROM material_rolls WHERE id = $1 AND tenant_id = $2;',
        [data.rollId, tenantId]
      );

      if (rollRes.rows.length === 0) {
        throw new CorporateError(
          'Bobina de película não encontrada nesta oficina.',
          404,
          'ROLL_NOT_FOUND'
        );
      }

      const roll = rollRes.rows[0];
      if (roll.unit_id && roll.unit_id !== data.fromUnitId) {
        throw new CorporateError(
          'A bobina selecionada não está alocada na unidade de origem indicada.',
          400,
          'ROLL_NOT_IN_SOURCE_UNIT'
        );
      }

      rollInfo = { code: roll.code, brand: roll.brand };

      // Transfere o rolo para a nova unidade
      await tenantQuery(
        tenantId,
        'UPDATE material_rolls SET unit_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3;',
        [data.toUnitId, data.rollId, tenantId]
      );
    } else {
      // Transferência de Insumo / Material
      if (!data.materialId) {
        throw new CorporateError(
          'O ID do material é obrigatório para transferência de insumos.',
          400,
          'MATERIAL_ID_REQUIRED'
        );
      }

      const matRes = await tenantQuery<{
        id: string;
        name: string;
        sku: string;
        category: string;
        unit: string;
        cost_cents: number;
        current_stock: number;
        min_stock: number;
        unit_id: string | null;
      }>(
        tenantId,
        'SELECT id, name, sku, category, unit, cost_cents, current_stock, min_stock, unit_id FROM materials WHERE id = $1 AND tenant_id = $2;',
        [data.materialId, tenantId]
      );

      if (matRes.rows.length === 0) {
        throw new CorporateError(
          'Insumo de estoque não encontrado nesta oficina.',
          404,
          'MATERIAL_NOT_FOUND'
        );
      }

      const sourceMat = matRes.rows[0];
      if (Number(sourceMat.current_stock) < data.quantity) {
        throw new CorporateError(
          `Saldo insuficiente na unidade de origem. Saldo atual: ${sourceMat.current_stock} ${sourceMat.unit}, solicitado: ${data.quantity} ${sourceMat.unit}.`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      materialInfo = { name: sourceMat.name };

      // 1. Debita da unidade de origem
      await tenantQuery(
        tenantId,
        'UPDATE materials SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3;',
        [data.quantity, sourceMat.id, tenantId]
      );

      // 2. Credita na unidade de destino (procura registro equivalente ou insere)
      const destMatRes = await tenantQuery<{ id: string }>(
        tenantId,
        `
        SELECT id FROM materials 
        WHERE tenant_id = $1 
          AND unit_id = $2 
          AND (sku = $3 OR name = $4);
        `,
        [tenantId, data.toUnitId, sourceMat.sku, sourceMat.name]
      );

      if (destMatRes.rows.length > 0) {
        await tenantQuery(
          tenantId,
          'UPDATE materials SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3;',
          [data.quantity, destMatRes.rows[0].id, tenantId]
        );
      } else {
        await tenantQuery(
          tenantId,
          `
          INSERT INTO materials (
            tenant_id,
            unit_id,
            name,
            sku,
            category,
            unit,
            cost_cents,
            current_stock,
            min_stock
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
          `,
          [
            tenantId,
            data.toUnitId,
            sourceMat.name,
            sourceMat.sku,
            sourceMat.category,
            sourceMat.unit,
            sourceMat.cost_cents,
            data.quantity,
            sourceMat.min_stock,
          ]
        );
      }
    }

    // 3. Grava o registro da transferência auditada
    const transferInsert = `
      INSERT INTO unit_transfers (
        tenant_id,
        from_unit_id,
        to_unit_id,
        transfer_type,
        material_id,
        roll_id,
        quantity,
        status,
        notes,
        transferred_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, $9)
      RETURNING 
        id,
        tenant_id as "tenantId",
        from_unit_id as "fromUnitId",
        to_unit_id as "toUnitId",
        transfer_type as "transferType",
        material_id as "materialId",
        roll_id as "rollId",
        quantity::numeric as "quantity",
        status,
        notes,
        transferred_by as "transferredBy",
        created_at as "createdAt";
    `;

    const transferRes = await tenantQuery<any>(tenantId, transferInsert, [
      tenantId,
      data.fromUnitId,
      data.toUnitId,
      data.transferType,
      data.materialId || null,
      data.rollId || null,
      data.quantity,
      data.notes || null,
      userId || null,
    ]);

    const record = transferRes.rows[0];

    // Trilha de auditoria
    if (userId) {
      await auditService.record({
        tenantId,
        userId,
        action: 'CORPORATE_INVENTORY_TRANSFERRED',
        entity: 'unit_transfers',
        entityId: record.id,
        newValues: {
          ...record,
          fromUnitName,
          toUnitName,
        },
      });
    }

    return {
      id: record.id,
      tenantId: record.tenantId,
      fromUnitId: record.fromUnitId,
      fromUnitName,
      toUnitId: record.toUnitId,
      toUnitName,
      transferType: record.transferType,
      materialId: record.materialId,
      materialName: materialInfo?.name || null,
      rollId: record.rollId,
      rollCode: rollInfo?.code || null,
      rollBrand: rollInfo?.brand || null,
      quantity: Number(record.quantity),
      status: record.status,
      notes: record.notes,
      transferredBy: record.transferredBy,
      createdAt: record.createdAt.toISOString(),
    };
  }

  /**
   * Lista o histórico de transferências entre filiais
   */
  async listTransfers(tenantId: string): Promise<UnitTransferDto[]> {
    const query = `
      SELECT 
        ut.id,
        ut.tenant_id as "tenantId",
        ut.from_unit_id as "fromUnitId",
        u_from.name as "fromUnitName",
        ut.to_unit_id as "toUnitId",
        u_to.name as "toUnitName",
        ut.transfer_type as "transferType",
        ut.material_id as "materialId",
        m.name as "materialName",
        ut.roll_id as "rollId",
        mr.code as "rollCode",
        mr.brand as "rollBrand",
        ut.quantity::numeric as "quantity",
        ut.status,
        ut.notes,
        ut.transferred_by as "transferredBy",
        u.name as "transferredByName",
        ut.created_at as "createdAt"
      FROM unit_transfers ut
      JOIN units u_from ON ut.from_unit_id = u_from.id
      JOIN units u_to ON ut.to_unit_id = u_to.id
      LEFT JOIN materials m ON ut.material_id = m.id
      LEFT JOIN material_rolls mr ON ut.roll_id = mr.id
      LEFT JOIN users u ON ut.transferred_by = u.id
      WHERE ut.tenant_id = $1
      ORDER BY ut.created_at DESC;
    `;

    const res = await tenantQuery<any>(tenantId, query, [tenantId]);
    return res.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      fromUnitId: row.fromUnitId,
      fromUnitName: row.fromUnitName,
      toUnitId: row.toUnitId,
      toUnitName: row.toUnitName,
      transferType: row.transferType,
      materialId: row.materialId,
      materialName: row.materialName,
      rollId: row.rollId,
      rollCode: row.rollCode,
      rollBrand: row.rollBrand,
      quantity: Number(row.quantity),
      status: row.status,
      notes: row.notes,
      transferredBy: row.transferredBy,
      transferredByName: row.transferredByName,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}

export const corporateService = new CorporateService();
