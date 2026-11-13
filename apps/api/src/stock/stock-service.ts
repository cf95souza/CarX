import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import { planService } from '../plans/plan-service.js';
import {
  PlanFeatures,
  MaterialDto,
  CreateMaterialInputDto,
  UpdateMaterialInputDto,
  MaterialRollDto,
  CreateMaterialRollInputDto,
  RegisterRollScrapInputDto,
  MaterialRollDetailWithHistoryDto,
  MaterialRollHistoryItemDto,
  StockMovementDto,
  CreateStockMovementInputDto,
  WorkOrderMaterialDto,
  AllocateWorkOrderMaterialInputDto,
  LowStockAlertDto,
} from '@carx/shared';

export class StockValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'StockValidationError';
    this.statusCode = statusCode;
  }
}

export class StockNotFoundError extends Error {
  statusCode: number;
  constructor(message = 'Recurso de estoque não encontrado.', statusCode = 404) {
    super(message);
    this.name = 'StockNotFoundError';
    this.statusCode = statusCode;
  }
}

export class StockInsufficientError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = 'StockInsufficientError';
    this.statusCode = statusCode;
  }
}

const safeUuid = (val?: string | null): string | null =>
  val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null;

export class StockService {
  // ============================================================================
  // 1. GESTÃO DE MATERIAIS / PRODUTOS / CONSUMÍVEIS
  // ============================================================================

  /**
   * Lista materiais com paginação, busca e flags de estoque baixo
   */
  async listMaterials(
    tenantId: string,
    filters: {
      search?: string;
      category?: string;
      isRoll?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ materials: MaterialDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['tenant_id = $1'];
    const queryParams: unknown[] = [tenantId];
    let paramIndex = 2;

    if (filters.search) {
      whereClauses.push(`(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search.trim()}%`);
      paramIndex++;
    }

    if (filters.category) {
      whereClauses.push(`category = $${paramIndex}`);
      queryParams.push(filters.category.trim());
      paramIndex++;
    }

    if (filters.isRoll !== undefined) {
      whereClauses.push(`is_roll = $${paramIndex}`);
      queryParams.push(filters.isRoll);
      paramIndex++;
    }

    const whereSql = whereClauses.join(' AND ');

    const countRes = await tenantQuery<{ total: string }>(
      tenantId,
      `SELECT COUNT(*)::text AS total FROM materials WHERE ${whereSql};`,
      queryParams
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    queryParams.push(limit, offset);
    const listSql = `
      SELECT 
        id,
        tenant_id AS "tenantId",
        name,
        sku,
        category,
        unit,
        cost_cents AS "costCents",
        current_stock::float AS "currentStock",
        min_stock::float AS "minStock",
        is_roll AS "isRoll",
        notes,
        (current_stock <= min_stock AND min_stock > 0) AS "isLowStock",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM materials
      WHERE ${whereSql}
      ORDER BY name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const res = await tenantQuery<MaterialDto>(tenantId, listSql, queryParams);
    return {
      materials: res.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Busca material por ID
   */
  async getMaterialById(tenantId: string, id: string): Promise<MaterialDto> {
    const res = await tenantQuery<MaterialDto>(
      tenantId,
      `
      SELECT 
        id,
        tenant_id AS "tenantId",
        name,
        sku,
        category,
        unit,
        cost_cents AS "costCents",
        current_stock::float AS "currentStock",
        min_stock::float AS "minStock",
        is_roll AS "isRoll",
        notes,
        (current_stock <= min_stock AND min_stock > 0) AS "isLowStock",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM materials
      WHERE tenant_id = $1 AND id = $2;
      `,
      [tenantId, id]
    );

    if (res.rows.length === 0) {
      throw new StockNotFoundError('Material não encontrado nesta oficina.');
    }

    return res.rows[0];
  }

  /**
   * Cria novo material / insumo (com movimentação inicial de entrada se houver estoque inicial)
   */
  async createMaterial(
    tenantId: string,
    input: CreateMaterialInputDto,
    actorUserId?: string
  ): Promise<MaterialDto> {
    if (!input.name || input.name.trim().length < 2) {
      throw new StockValidationError('Nome do material é obrigatório (mínimo 2 caracteres).');
    }

    const initialStock = Math.max(0, input.initialStock || 0);
    const minStock = Math.max(0, input.minStock || 0);
    const costCents = Math.max(0, input.costCents || 0);

    let createdMaterial: MaterialDto;

    await tenantTransaction(tenantId, async (client) => {
      const matRes = await client.query<MaterialDto>(
        `
        INSERT INTO materials (
          tenant_id,
          name,
          sku,
          category,
          unit,
          cost_cents,
          current_stock,
          min_stock,
          is_roll,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING 
          id,
          tenant_id AS "tenantId",
          name,
          sku,
          category,
          unit,
          cost_cents AS "costCents",
          current_stock::float AS "currentStock",
          min_stock::float AS "minStock",
          is_roll AS "isRoll",
          notes,
          (current_stock <= min_stock AND min_stock > 0) AS "isLowStock",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [
          tenantId,
          input.name.trim(),
          input.sku?.trim() || null,
          input.category?.trim() || null,
          input.unit || 'un',
          costCents,
          initialStock,
          minStock,
          input.isRoll || false,
          input.notes || null,
        ]
      );
      createdMaterial = matRes.rows[0];

      // Se houver estoque inicial, registrar movimentação de entrada inicial
      if (initialStock > 0) {
        await client.query(
          `
          INSERT INTO stock_movements (
            tenant_id,
            material_id,
            movement_type,
            quantity,
            unit_cost_cents,
            total_cost_cents,
            previous_stock,
            new_stock,
            reason,
            created_by
          ) VALUES ($1, $2, 'entry', $3, $4, $5, 0, $3, 'Saldo inicial de implantação', $6);
          `,
          [
            tenantId,
            createdMaterial.id,
            initialStock,
            costCents,
            Math.round(initialStock * costCents),
            actorUserId || null,
          ]
        );
      }
    });

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'MATERIAL_CREATED',
        entity: 'materials',
        entityId: createdMaterial!.id,
        newValues: createdMaterial! as unknown as Record<string, unknown>,
      });
    }

    return createdMaterial!;
  }

  /**
   * Atualiza dados de um material
   */
  async updateMaterial(
    tenantId: string,
    id: string,
    input: UpdateMaterialInputDto,
    actorUserId?: string
  ): Promise<MaterialDto> {
    const existing = await this.getMaterialById(tenantId, id);

    const updateFields: string[] = ['updated_at = NOW()'];
    const updateParams: unknown[] = [tenantId, id];
    let paramIndex = 3;

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length < 2) {
        throw new StockValidationError('Nome do material deve ter pelo menos 2 caracteres.');
      }
      updateFields.push(`name = $${paramIndex++}`);
      updateParams.push(input.name.trim());
    }

    if (input.sku !== undefined) {
      updateFields.push(`sku = $${paramIndex++}`);
      updateParams.push(input.sku?.trim() || null);
    }

    if (input.category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      updateParams.push(input.category?.trim() || null);
    }

    if (input.unit !== undefined) {
      updateFields.push(`unit = $${paramIndex++}`);
      updateParams.push(input.unit.trim());
    }

    if (input.costCents !== undefined) {
      updateFields.push(`cost_cents = $${paramIndex++}`);
      updateParams.push(Math.max(0, input.costCents));
    }

    if (input.minStock !== undefined) {
      updateFields.push(`min_stock = $${paramIndex++}`);
      updateParams.push(Math.max(0, input.minStock));
    }

    if (input.isRoll !== undefined) {
      updateFields.push(`is_roll = $${paramIndex++}`);
      updateParams.push(input.isRoll);
    }

    if (input.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      updateParams.push(input.notes);
    }

    const res = await tenantQuery<MaterialDto>(
      tenantId,
      `
      UPDATE materials
      SET ${updateFields.join(', ')}
      WHERE tenant_id = $1 AND id = $2
      RETURNING 
        id,
        tenant_id AS "tenantId",
        name,
        sku,
        category,
        unit,
        cost_cents AS "costCents",
        current_stock::float AS "currentStock",
        min_stock::float AS "minStock",
        is_roll AS "isRoll",
        notes,
        (current_stock <= min_stock AND min_stock > 0) AS "isLowStock",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      updateParams
    );

    const updated = res.rows[0];

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'MATERIAL_UPDATED',
        entity: 'materials',
        entityId: id,
        oldValues: existing as unknown as Record<string, unknown>,
        newValues: updated as unknown as Record<string, unknown>,
      });
    }

    return updated;
  }

  // ============================================================================
  // 2. GESTÃO DE BOBINAS / ROLOS DE PELÍCULA (PPF E INSULFILM)
  // ============================================================================

  /**
   * Lista bobinas/rolos cadastrados
   */
  async listRolls(
    tenantId: string,
    filters: {
      materialId?: string;
      status?: string;
      brand?: string;
      lotNumber?: string;
    } = {}
  ): Promise<MaterialRollDto[]> {
    const whereClauses: string[] = ['r.tenant_id = $1'];
    const queryParams: unknown[] = [tenantId];
    let paramIndex = 2;

    if (filters.materialId) {
      whereClauses.push(`r.material_id = $${paramIndex++}`);
      queryParams.push(filters.materialId);
    }

    if (filters.status) {
      whereClauses.push(`r.status = $${paramIndex++}`);
      queryParams.push(filters.status);
    }

    if (filters.brand) {
      whereClauses.push(`r.brand ILIKE $${paramIndex++}`);
      queryParams.push(`%${filters.brand.trim()}%`);
    }

    if (filters.lotNumber) {
      whereClauses.push(`r.lot_number ILIKE $${paramIndex++}`);
      queryParams.push(`%${filters.lotNumber.trim()}%`);
    }

    const sql = `
      SELECT 
        r.id,
        r.tenant_id AS "tenantId",
        r.material_id AS "materialId",
        m.name AS "materialName",
        r.code,
        r.lot_number AS "lotNumber",
        r.brand,
        r.width_meters::float AS "widthMeters",
        r.initial_meters::float AS "initialMeters",
        r.current_meters::float AS "currentMeters",
        r.min_alert_meters::float AS "minAlertMeters",
        r.cost_cents AS "costCents",
        r.status,
        (r.current_meters <= r.min_alert_meters AND r.status = 'in_use') AS "isLowMeters",
        r.notes,
        r.created_at AS "createdAt",
        r.updated_at AS "updatedAt"
      FROM material_rolls r
      JOIN materials m ON m.id = r.material_id AND m.tenant_id = r.tenant_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY r.created_at DESC;
    `;

    const res = await tenantQuery<MaterialRollDto>(tenantId, sql, queryParams);
    return res.rows;
  }

  /**
   * Busca bobina/rolo por ID
   */
  async getRollById(tenantId: string, id: string): Promise<MaterialRollDto> {
    const sql = `
      SELECT 
        r.id,
        r.tenant_id AS "tenantId",
        r.material_id AS "materialId",
        m.name AS "materialName",
        r.code,
        r.lot_number AS "lotNumber",
        r.brand,
        r.width_meters::float AS "widthMeters",
        r.initial_meters::float AS "initialMeters",
        r.current_meters::float AS "currentMeters",
        r.min_alert_meters::float AS "minAlertMeters",
        r.cost_cents AS "costCents",
        r.status,
        (r.current_meters <= r.min_alert_meters AND r.status = 'in_use') AS "isLowMeters",
        r.notes,
        r.created_at AS "createdAt",
        r.updated_at AS "updatedAt"
      FROM material_rolls r
      JOIN materials m ON m.id = r.material_id AND m.tenant_id = r.tenant_id
      WHERE r.tenant_id = $1 AND r.id = $2;
    `;

    const res = await tenantQuery<MaterialRollDto>(tenantId, sql, [tenantId, id]);
    if (res.rows.length === 0) {
      throw new StockNotFoundError('Bobina / Rolo não encontrado nesta oficina.');
    }

    return res.rows[0];
  }

  /**
   * Valida permissão do plano para recursos avançados de bobinas de PPF/Películas
   */
  async assertSpoolControlFeature(tenantId: string): Promise<void> {
    await planService.assertFeature(tenantId, PlanFeatures.PPF_SPOOL_CONTROL);
  }

  /**
   * Cadastra nova bobina/rolo e incrementa atomicamente o estoque do material
   */
  async createRoll(
    tenantId: string,
    input: CreateMaterialRollInputDto,
    actorUserId?: string
  ): Promise<MaterialRollDto> {
    await this.assertSpoolControlFeature(tenantId);

    if (!input.initialMeters || input.initialMeters <= 0) {
      throw new StockValidationError('Metragem inicial da bobina deve ser estritamente maior que zero.');
    }

    let createdRoll: MaterialRollDto;

    await tenantTransaction(tenantId, async (client) => {
      // 1. Lock e validação do material
      const matRes = await client.query<{
        id: string;
        name: string;
        current_stock: number;
        cost_cents: number;
      }>(
        `SELECT id, name, current_stock, cost_cents FROM materials WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`,
        [tenantId, input.materialId]
      );

      if (matRes.rows.length === 0) {
        throw new StockNotFoundError('Material base associado à bobina não encontrado.');
      }

      const mat = matRes.rows[0];
      const initialMeters = input.initialMeters;
      const widthMeters = input.widthMeters || 1.52;
      const minAlertMeters = input.minAlertMeters !== undefined ? input.minAlertMeters : 3.0;
      const costCents = input.costCents !== undefined ? input.costCents : mat.cost_cents;

      // 2. Inserir a bobina
      const rollRes = await client.query<MaterialRollDto>(
        `
        INSERT INTO material_rolls (
          tenant_id,
          material_id,
          code,
          lot_number,
          brand,
          width_meters,
          initial_meters,
          current_meters,
          min_alert_meters,
          cost_cents,
          status,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, 'in_use', $10)
        RETURNING 
          id,
          tenant_id AS "tenantId",
          material_id AS "materialId",
          code,
          lot_number AS "lotNumber",
          brand,
          width_meters::float AS "widthMeters",
          initial_meters::float AS "initialMeters",
          current_meters::float AS "currentMeters",
          min_alert_meters::float AS "minAlertMeters",
          cost_cents AS "costCents",
          status,
          (current_meters <= min_alert_meters AND status = 'in_use') AS "isLowMeters",
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [
          tenantId,
          input.materialId,
          input.code || null,
          input.lotNumber || null,
          input.brand || null,
          widthMeters,
          initialMeters,
          minAlertMeters,
          costCents,
          input.notes || null,
        ]
      );
      createdRoll = rollRes.rows[0];
      createdRoll.materialName = mat.name;

      // 3. Atualizar estoque do material somando os metros recebidos
      const prevStock = Number(mat.current_stock);
      const newStock = prevStock + initialMeters;

      await client.query(
        `UPDATE materials SET current_stock = $3, is_roll = true, updated_at = NOW() WHERE tenant_id = $1 AND id = $2;`,
        [tenantId, input.materialId, newStock]
      );

      // 4. Inserir movimentação de entrada vinculada à bobina
      let validActorUserId: string | null = null;
      if (safeUuid(actorUserId)) {
        const uRes = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1;', [actorUserId]);
        if (uRes.rows.length > 0) validActorUserId = actorUserId!;
      }

      await client.query(
        `
        INSERT INTO stock_movements (
          tenant_id,
          material_id,
          material_roll_id,
          movement_type,
          quantity,
          unit_cost_cents,
          total_cost_cents,
          previous_stock,
          new_stock,
          reason,
          created_by
        ) VALUES ($1, $2, $3, 'entry', $4, $5, $6, $7, $8, $9, $10);
        `,
        [
          tenantId,
          input.materialId,
          createdRoll.id,
          initialMeters,
          costCents,
          Math.round(initialMeters * costCents),
          prevStock,
          newStock,
          `Entrada de bobina lote #${input.lotNumber || createdRoll.id}`,
          validActorUserId,
        ]
      );
    });

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'MATERIAL_ROLL_CREATED',
        entity: 'material_rolls',
        entityId: createdRoll!.id,
        newValues: createdRoll! as unknown as Record<string, unknown>,
      });
    }

    return createdRoll!;
  }

  /**
   * Obtém histórico completo e rastreabilidade da bobina:
   * - Veículos, clientes e OSs onde a bobina foi aplicada
   * - Metragem gasta, custo alocado e margem real por aplicação
   * - Certificado de garantia e passaporte digital vinculado
   * - Registro de retalhos, desperdício e taxa de eficiência
   */
  async getRollDetailedHistory(
    tenantId: string,
    rollId: string
  ): Promise<MaterialRollDetailWithHistoryDto> {
    await this.assertSpoolControlFeature(tenantId);

    // 1. Obter dados da bobina
    const roll = await this.getRollById(tenantId, rollId);
    const initialMeters = Number(roll.initialMeters) || 1;
    const costPerMeterCents = Math.round((roll.costCents || 0) / initialMeters);

    // 2. Obter histórico de aplicações em Ordens de Serviço
    const applicationsSql = `
      SELECT 
        wom.work_order_id AS "workOrderId",
        wo.os_number AS "osNumber",
        c.name AS "customerName",
        c.phone AS "customerPhone",
        v.plate AS "vehiclePlate",
        CONCAT(v.brand, ' ', v.model) AS "vehicleModel",
        COALESCE(
          (SELECT woi.name FROM work_order_items woi WHERE woi.work_order_id = wo.id ORDER BY woi.total_cents DESC LIMIT 1),
          m.name
        ) AS "serviceName",
        wom.quantity::float AS "metersUsed",
        COALESCE(
          (SELECT SUM(woi.total_cents) FROM work_order_items woi WHERE woi.work_order_id = wo.id),
          wo.final_cents,
          wo.total_cents,
          0
        )::int AS "servicePriceCents",
        w.id AS "warrantyId",
        w.verification_token::text AS "warrantyToken",
        COALESCE(wom.consumed_at, wom.created_at)::text AS "appliedAt"
      FROM work_order_materials wom
      JOIN work_orders wo ON wo.id = wom.work_order_id AND wo.tenant_id = wom.tenant_id
      JOIN customers c ON c.id = wo.customer_id AND c.tenant_id = wo.tenant_id
      JOIN vehicles v ON v.id = wo.vehicle_id AND v.tenant_id = wo.tenant_id
      JOIN materials m ON m.id = wom.material_id AND m.tenant_id = wom.tenant_id
      LEFT JOIN warranties w ON w.work_order_id = wom.work_order_id AND w.tenant_id = wom.tenant_id
      WHERE wom.tenant_id = $1 AND wom.material_roll_id = $2
      ORDER BY wom.created_at DESC;
    `;

    const appRes = await tenantQuery<any>(tenantId, applicationsSql, [tenantId, rollId]);

    // 3. Obter total de retalhos / perdas registradas
    const scrapSql = `
      SELECT COALESCE(SUM(ABS(quantity)), 0)::float AS "totalScrapMeters"
      FROM stock_movements
      WHERE tenant_id = $1 AND material_roll_id = $2 AND movement_type = 'waste';
    `;
    const scrapRes = await tenantQuery<{ totalScrapMeters: number }>(tenantId, scrapSql, [tenantId, rollId]);
    const scrapMeters = Number(scrapRes.rows[0]?.totalScrapMeters) || 0;

    let totalMetersUsed = 0;
    let totalRevenueCents = 0;

    const history: MaterialRollHistoryItemDto[] = appRes.rows.map((row) => {
      const metersUsed = Number(row.metersUsed) || 0;
      totalMetersUsed += metersUsed;
      const servicePriceCents = Number(row.servicePriceCents) || 0;
      totalRevenueCents += servicePriceCents;
      const costAllocatedCents = Math.round(metersUsed * costPerMeterCents);
      const grossProfitCents = servicePriceCents - costAllocatedCents;
      const grossMarginPercent =
        servicePriceCents > 0
          ? Number(((grossProfitCents / servicePriceCents) * 100).toFixed(2))
          : 0;

      return {
        workOrderId: row.workOrderId,
        osNumber: Number(row.osNumber),
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        vehiclePlate: row.vehiclePlate,
        vehicleModel: row.vehicleModel,
        serviceName: row.serviceName,
        metersUsed,
        costAllocatedCents,
        servicePriceCents,
        grossProfitCents,
        grossMarginPercent,
        warrantyId: row.warrantyId || null,
        warrantyToken: row.warrantyToken || null,
        appliedAt: row.appliedAt,
      };
    });

    const consumedMeters = totalMetersUsed;
    const totalAccountedMeters = consumedMeters + scrapMeters;
    const efficiencyPercent =
      totalAccountedMeters > 0
        ? Number(((consumedMeters / totalAccountedMeters) * 100).toFixed(2))
        : 100;

    const totalCostOfConsumed = Math.round(consumedMeters * costPerMeterCents);
    const totalGrossProfitCents = totalRevenueCents - totalCostOfConsumed;
    const averageMarginPercent =
      totalRevenueCents > 0
        ? Number(((totalGrossProfitCents / totalRevenueCents) * 100).toFixed(2))
        : 0;

    return {
      ...roll,
      materialName: roll.materialName || 'Película / PPF',
      costPerMeterCents,
      consumedMeters,
      scrapMeters,
      efficiencyPercent,
      totalRevenueCents,
      totalGrossProfitCents,
      averageMarginPercent,
      history,
    };
  }

  /**
   * Registra retalho / perda de película de uma bobina
   */
  async registerRollScrap(
    tenantId: string,
    rollId: string,
    input: RegisterRollScrapInputDto,
    userId?: string
  ): Promise<MaterialRollDto> {
    await this.assertSpoolControlFeature(tenantId);

    const scrapMeters = Number(input.meters);
    if (isNaN(scrapMeters) || scrapMeters <= 0) {
      throw new StockValidationError('Metragem de retalho/desperdício deve ser maior que zero.');
    }

    await tenantTransaction(tenantId, async (client) => {
      // 1. Lock na bobina
      const rollRes = await client.query<{
        id: string;
        material_id: string;
        current_meters: number;
        initial_meters: number;
        cost_cents: number;
        status: string;
        lot_number: string | null;
      }>(
        `SELECT id, material_id, current_meters, initial_meters, cost_cents, status, lot_number
         FROM material_rolls
         WHERE tenant_id = $1 AND id = $2
         FOR UPDATE;`,
        [tenantId, rollId]
      );

      if (rollRes.rows.length === 0) {
        throw new StockNotFoundError('Bobina não encontrada nesta oficina.');
      }

      const roll = rollRes.rows[0];
      const prevMeters = Number(roll.current_meters);

      if (scrapMeters > prevMeters) {
        throw new StockValidationError(
          `Metragem de descarte (${scrapMeters}m) não pode exceder o saldo restante da bobina (${prevMeters}m).`
        );
      }

      const newMeters = Math.max(0, prevMeters - scrapMeters);
      const newStatus = newMeters === 0 ? 'depleted' : roll.status;

      // 2. Atualizar saldo da bobina
      await client.query(
        `UPDATE material_rolls
         SET current_meters = $3, status = $4, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2;`,
        [tenantId, rollId, newMeters, newStatus]
      );

      // 3. Atualizar estoque geral do material
      const matRes = await client.query<{ current_stock: number }>(
        `SELECT current_stock FROM materials WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`,
        [tenantId, roll.material_id]
      );
      if (matRes.rows.length > 0) {
        const prevStock = Number(matRes.rows[0].current_stock);
        const newStock = Math.max(0, prevStock - scrapMeters);
        await client.query(
          `UPDATE materials SET current_stock = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2;`,
          [tenantId, roll.material_id, newStock]
        );
      }

      // 4. Calcular custos
      const costPerMeterCents =
        roll.initial_meters > 0 ? Math.round(roll.cost_cents / Number(roll.initial_meters)) : 0;
      const totalCostCents = Math.round(scrapMeters * costPerMeterCents);

      // 5. Inserir movimentação em stock_movements
      let validUserId: string | null = null;
      if (safeUuid(userId)) {
        const uRes = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1;', [userId]);
        if (uRes.rows.length > 0) validUserId = userId!;
      }

      await client.query(
        `INSERT INTO stock_movements (
          tenant_id,
          material_id,
          material_roll_id,
          work_order_id,
          movement_type,
          quantity,
          unit_cost_cents,
          total_cost_cents,
          previous_stock,
          new_stock,
          reason,
          created_by
        ) VALUES ($1, $2, $3, $4, 'waste', $5, $6, $7, $8, $9, $10, $11);`,
        [
          tenantId,
          roll.material_id,
          rollId,
          input.workOrderId || null,
          -scrapMeters,
          costPerMeterCents,
          totalCostCents,
          prevMeters,
          newMeters,
          input.reason,
          validUserId,
        ]
      );

      // 6. Auditoria
      await auditService.record({
        tenantId,
        userId,
        action: 'MATERIAL_ROLL_SCRAP_RECORDED',
        entity: 'material_rolls',
        entityId: rollId,
        newValues: {
          meters: scrapMeters,
          previous_meters: prevMeters,
          new_meters: newMeters,
          reason: input.reason,
        },
      });
    });

    return await this.getRollById(tenantId, rollId);
  }

  // ============================================================================
  // 3. MOVIMENTAÇÕES MANUAIS DE ESTOQUE (ENTRADA, SAÍDA, PERDA, AJUSTE)
  // ============================================================================

  /**
   * Registra uma movimentação de estoque atômica com atualização do saldo
   */
  async createStockMovement(
    tenantId: string,
    input: CreateStockMovementInputDto,
    actorUserId?: string
  ): Promise<StockMovementDto> {
    if (!input.quantity || input.quantity === 0) {
      throw new StockValidationError('A quantidade movimentada não pode ser zero.');
    }

    let createdMovement: StockMovementDto;

    await tenantTransaction(tenantId, async (client) => {
      // 1. Lock no material
      const matRes = await client.query<{
        id: string;
        current_stock: number;
        cost_cents: number;
      }>(
        `SELECT id, current_stock, cost_cents FROM materials WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`,
        [tenantId, input.materialId]
      );

      if (matRes.rows.length === 0) {
        throw new StockNotFoundError('Material não encontrado.');
      }

      const mat = matRes.rows[0];
      const prevStock = Number(mat.current_stock);
      const isExit = ['exit', 'waste', 'os_consumption'].includes(input.movementType);
      const qty = isExit ? -Math.abs(input.quantity) : Math.abs(input.quantity);
      const newStock = prevStock + qty;

      if (newStock < 0) {
        throw new StockInsufficientError(
          `Estoque insuficiente para esta saída: estoque atual é ${prevStock}, tentativa de deduzir ${Math.abs(qty)}.`
        );
      }

      // 2. Se houver bobina vinculada, validar e atualizar metragem
      if (input.materialRollId) {
        const rollRes = await client.query<{
          id: string;
          current_meters: number;
          status: string;
        }>(
          `SELECT id, current_meters, status FROM material_rolls WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`,
          [tenantId, input.materialRollId]
        );

        if (rollRes.rows.length === 0) {
          throw new StockNotFoundError('Bobina vinculada não encontrada.');
        }

        const roll = rollRes.rows[0];
        const prevMeters = Number(roll.current_meters);
        const newMeters = prevMeters + qty;

        if (newMeters < 0) {
          throw new StockInsufficientError(
            `Metragem insuficiente na bobina: disponível ${prevMeters}m, solicitado ${Math.abs(qty)}m.`
          );
        }

        const newStatus = newMeters === 0 ? 'depleted' : roll.status;
        await client.query(
          `UPDATE material_rolls SET current_meters = $3, status = $4, updated_at = NOW() WHERE tenant_id = $1 AND id = $2;`,
          [tenantId, input.materialRollId, newMeters, newStatus]
        );
      }

      // 3. Atualizar estoque do material
      await client.query(
        `UPDATE materials SET current_stock = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2;`,
        [tenantId, input.materialId, newStock]
      );

      // 4. Inserir registro na tabela stock_movements
      const unitCost = input.unitCostCents !== undefined ? input.unitCostCents : mat.cost_cents;
      const totalCost = Math.round(Math.abs(qty) * unitCost);

      const movRes = await client.query<StockMovementDto>(
        `
        INSERT INTO stock_movements (
          tenant_id,
          material_id,
          material_roll_id,
          work_order_id,
          movement_type,
          quantity,
          unit_cost_cents,
          total_cost_cents,
          previous_stock,
          new_stock,
          reason,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING 
          id,
          tenant_id AS "tenantId",
          material_id AS "materialId",
          material_roll_id AS "materialRollId",
          work_order_id AS "workOrderId",
          movement_type AS "movementType",
          quantity::float AS "quantity",
          unit_cost_cents AS "unitCostCents",
          total_cost_cents AS "totalCostCents",
          previous_stock::float AS "previousStock",
          new_stock::float AS "newStock",
          reason,
          created_by AS "createdBy",
          created_at AS "createdAt";
        `,
        [
          tenantId,
          input.materialId,
          input.materialRollId || null,
          input.workOrderId || null,
          input.movementType,
          qty,
          unitCost,
          totalCost,
          prevStock,
          newStock,
          input.reason || null,
          actorUserId || null,
        ]
      );
      createdMovement = movRes.rows[0];
    });

    return createdMovement!;
  }

  /**
   * Lista histórico de movimentações de um material
   */
  async listMaterialMovements(tenantId: string, materialId: string): Promise<StockMovementDto[]> {
    const res = await tenantQuery<StockMovementDto>(
      tenantId,
      `
      SELECT 
        sm.id,
        sm.tenant_id AS "tenantId",
        sm.material_id AS "materialId",
        sm.material_roll_id AS "materialRollId",
        sm.work_order_id AS "workOrderId",
        sm.movement_type AS "movementType",
        sm.quantity::float AS "quantity",
        sm.unit_cost_cents AS "unitCostCents",
        sm.total_cost_cents AS "totalCostCents",
        sm.previous_stock::float AS "previousStock",
        sm.new_stock::float AS "newStock",
        sm.reason,
        sm.created_by AS "createdBy",
        sm.created_at AS "createdAt"
      FROM stock_movements sm
      WHERE sm.tenant_id = $1 AND sm.material_id = $2
      ORDER BY sm.created_at DESC;
      `,
      [tenantId, materialId]
    );

    return res.rows;
  }

  // ============================================================================
  // 4. ALOCAÇÃO E BAIXA IDEMPOTENTE DE MATERIAIS NA ORDEM DE SERVIÇO
  // ============================================================================

  /**
   * Aloca um material ou metragem de bobina para ser consumido por uma OS
   */
  async allocateMaterialToWorkOrder(
    tenantId: string,
    workOrderId: string,
    input: AllocateWorkOrderMaterialInputDto,
    actorUserId?: string
  ): Promise<WorkOrderMaterialDto> {
    if (!input.quantity || input.quantity <= 0) {
      throw new StockValidationError('A quantidade a alocar deve ser maior que zero.');
    }

    // 1. Validar OS
    const woRes = await tenantQuery<{ id: string; status: string }>(
      tenantId,
      'SELECT id, status FROM work_orders WHERE tenant_id = $1 AND id = $2;',
      [tenantId, workOrderId]
    );
    if (woRes.rows.length === 0) {
      throw new StockNotFoundError('Ordem de serviço não encontrada.');
    }
    if (woRes.rows[0].status === 'CANCELED') {
      throw new StockValidationError('Não é permitido alocar insumos em Ordem de Serviço cancelada.', 422);
    }

    // 2. Validar Material
    const matRes = await tenantQuery<{ id: string; name: string; unit: string }>(
      tenantId,
      'SELECT id, name, unit FROM materials WHERE tenant_id = $1 AND id = $2;',
      [tenantId, input.materialId]
    );
    if (matRes.rows.length === 0) {
      throw new StockNotFoundError('Material não encontrado.');
    }
    const mat = matRes.rows[0];

    // 3. Validar Bobina se informada
    let rollLotNumber: string | null = null;
    if (input.materialRollId) {
      const rollRes = await tenantQuery<{ id: string; lot_number: string }>(
        tenantId,
        'SELECT id, lot_number FROM material_rolls WHERE tenant_id = $1 AND id = $2 AND material_id = $3;',
        [tenantId, input.materialRollId, input.materialId]
      );
      if (rollRes.rows.length === 0) {
        throw new StockNotFoundError('Bobina especificada não encontrada para este material.');
      }
      rollLotNumber = rollRes.rows[0].lot_number;
    }

    const res = await tenantQuery<WorkOrderMaterialDto>(
      tenantId,
      `
      INSERT INTO work_order_materials (
        tenant_id,
        work_order_id,
        material_id,
        material_roll_id,
        quantity,
        is_consumed,
        notes
      ) VALUES ($1, $2, $3, $4, $5, false, $6)
      RETURNING 
        id,
        tenant_id AS "tenantId",
        work_order_id AS "workOrderId",
        material_id AS "materialId",
        material_roll_id AS "materialRollId",
        quantity::float AS "quantity",
        is_consumed AS "isConsumed",
        consumed_at AS "consumedAt",
        notes,
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [
        tenantId,
        workOrderId,
        input.materialId,
        input.materialRollId || null,
        input.quantity,
        input.notes || null,
      ]
    );

    const allocated = res.rows[0];
    allocated.materialName = mat.name;
    allocated.materialUnit = mat.unit;
    allocated.rollLotNumber = rollLotNumber;

    return allocated;
  }

  /**
   * Lista materiais alocados a uma Ordem de Serviço
   */
  async listWorkOrderMaterials(tenantId: string, workOrderId: string): Promise<WorkOrderMaterialDto[]> {
    const res = await tenantQuery<WorkOrderMaterialDto>(
      tenantId,
      `
      SELECT 
        wom.id,
        wom.tenant_id AS "tenantId",
        wom.work_order_id AS "workOrderId",
        wom.material_id AS "materialId",
        m.name AS "materialName",
        m.unit AS "materialUnit",
        wom.material_roll_id AS "materialRollId",
        r.lot_number AS "rollLotNumber",
        wom.quantity::float AS "quantity",
        wom.is_consumed AS "isConsumed",
        wom.consumed_at AS "consumedAt",
        wom.notes,
        wom.created_at AS "createdAt",
        wom.updated_at AS "updatedAt"
      FROM work_order_materials wom
      JOIN materials m ON m.id = wom.material_id AND m.tenant_id = wom.tenant_id
      LEFT JOIN material_rolls r ON r.id = wom.material_roll_id AND r.tenant_id = wom.tenant_id
      WHERE wom.tenant_id = $1 AND wom.work_order_id = $2
      ORDER BY wom.created_at ASC;
      `,
      [tenantId, workOrderId]
    );

    return res.rows;
  }

  /**
   * BAIXA IDEMPOTENTE DE ESTOQUE AO CONCLUIR/ENTREGAR A ORDEM DE SERVIÇO
   * Critério de Aceite: "Entregar a mesma OS duas vezes baixa o estoque uma vez; saldo = soma dos movimentos."
   */
  async deductWorkOrderMaterials(
    tenantId: string,
    workOrderId: string,
    actorUserId?: string
  ): Promise<{ deductedCount: number; alreadyDeducted: boolean }> {
    let deductedCount = 0;
    let alreadyDeducted = false;

    await tenantTransaction(tenantId, async (client) => {
      // 1. Lock pessimista na OS
      const woRes = await client.query<{ id: string; os_number: number; status: string }>(
        `SELECT id, os_number, status FROM work_orders WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`,
        [tenantId, workOrderId]
      );

      if (woRes.rows.length === 0) {
        throw new StockNotFoundError('Ordem de serviço não encontrada.');
      }
      const wo = woRes.rows[0];

      // 2. Buscar itens alocados pendentes de consumo (com lock FOR UPDATE)
      const pendingRes = await client.query<{
        id: string;
        material_id: string;
        material_roll_id: string | null;
        quantity: number;
        is_consumed: boolean;
      }>(
        `
        SELECT id, material_id, material_roll_id, quantity, is_consumed 
        FROM work_order_materials 
        WHERE tenant_id = $1 AND work_order_id = $2 
        FOR UPDATE;
        `,
        [tenantId, workOrderId]
      );

      // Se não há itens ou todos já foram consumidos, garantir IDEMPOTÊNCIA absoluta!
      const unconsumedItems = pendingRes.rows.filter((item) => !item.is_consumed);

      if (unconsumedItems.length === 0) {
        alreadyDeducted = pendingRes.rows.length > 0;
        return; // Idempotência: nada a fazer, não baixa novamente!
      }

      let validActorUserId: string | null = null;
      if (safeUuid(actorUserId)) {
        const uRes = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1;', [actorUserId]);
        if (uRes.rows.length > 0) validActorUserId = actorUserId!;
      }

      // 3. Processar baixa de cada item pendente
      for (const item of unconsumedItems) {
        const qtyToDeduct = Math.abs(Number(item.quantity));

        // Lock no material
        const matRes = await client.query<{
          current_stock: number;
          cost_cents: number;
        }>(
          `SELECT current_stock, cost_cents FROM materials WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`,
          [tenantId, item.material_id]
        );
        const mat = matRes.rows[0];
        const prevStock = Number(mat.current_stock);
        const newStock = Math.max(0, prevStock - qtyToDeduct);

        // Se tiver bobina, dar lock e abater metragem
        if (item.material_roll_id) {
          const rollRes = await client.query<{
            current_meters: number;
            status: string;
          }>(
            `SELECT current_meters, status FROM material_rolls WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`,
            [tenantId, item.material_roll_id]
          );

          if (rollRes.rows.length > 0) {
            const roll = rollRes.rows[0];
            const prevMeters = Number(roll.current_meters);
            const newMeters = Math.max(0, prevMeters - qtyToDeduct);
            const rollStatus = newMeters === 0 ? 'depleted' : roll.status;

            await client.query(
              `UPDATE material_rolls SET current_meters = $3, status = $4, updated_at = NOW() WHERE tenant_id = $1 AND id = $2;`,
              [tenantId, item.material_roll_id, newMeters, rollStatus]
            );
          }
        }

        // Atualizar saldo do material
        await client.query(
          `UPDATE materials SET current_stock = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2;`,
          [tenantId, item.material_id, newStock]
        );

        // Inserir registro em stock_movements
        await client.query(
          `
          INSERT INTO stock_movements (
            tenant_id,
            material_id,
            material_roll_id,
            work_order_id,
            movement_type,
            quantity,
            unit_cost_cents,
            total_cost_cents,
            previous_stock,
            new_stock,
            reason,
            created_by
          ) VALUES ($1, $2, $3, $4, 'os_consumption', $5, $6, $7, $8, $9, $10, $11);
          `,
          [
            tenantId,
            item.material_id,
            item.material_roll_id || null,
            workOrderId,
            -qtyToDeduct,
            mat.cost_cents,
            Math.round(qtyToDeduct * mat.cost_cents),
            prevStock,
            newStock,
            `Consumo na Ordem de Serviço #${wo.os_number}`,
            validActorUserId,
          ]
        );

        // Marcar como consumido
        await client.query(
          `UPDATE work_order_materials SET is_consumed = true, consumed_at = NOW(), updated_at = NOW() WHERE tenant_id = $1 AND id = $2;`,
          [tenantId, item.id]
        );

        deductedCount++;
      }

      // 4. Registrar evento na linha do tempo da OS
      await client.query(
        `
        INSERT INTO work_order_events (
          tenant_id,
          work_order_id,
          user_id,
          from_status,
          to_status,
          event_type,
          notes,
          metadata
        ) VALUES ($1, $2, $3, $4, $4, 'STOCK_CONSUMED', $5, $6);
        `,
        [
          tenantId,
          workOrderId,
          actorUserId || null,
          wo.status,
          `Baixa contábil de estoque efetuada para ${deductedCount} item(ns) de insumo.`,
          JSON.stringify({ deductedCount, timestamp: new Date().toISOString() }),
        ]
      );
    });

    return { deductedCount, alreadyDeducted };
  }

  // ============================================================================
  // 5. ALERTAS CONSOLIDADOS DE ESTOQUE BAIXO E CRÍTICO
  // ============================================================================

  /**
   * Retorna os alertas de estoque baixo (insumos e bobinas abaixo do mínimo configurado)
   */
  async getLowStockAlerts(tenantId: string): Promise<LowStockAlertDto> {
    // Materiais abaixo do estoque mínimo
    const matRes = await tenantQuery<MaterialDto>(
      tenantId,
      `
      SELECT 
        id,
        tenant_id AS "tenantId",
        name,
        sku,
        category,
        unit,
        cost_cents AS "costCents",
        current_stock::float AS "currentStock",
        min_stock::float AS "minStock",
        is_roll AS "isRoll",
        notes,
        true AS "isLowStock",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM materials
      WHERE tenant_id = $1 AND current_stock <= min_stock AND min_stock > 0
      ORDER BY current_stock ASC;
      `,
      [tenantId]
    );

    // Bobinas ativas abaixo da metragem mínima de alerta
    const rollRes = await tenantQuery<MaterialRollDto>(
      tenantId,
      `
      SELECT 
        r.id,
        r.tenant_id AS "tenantId",
        r.material_id AS "materialId",
        m.name AS "materialName",
        r.code,
        r.lot_number AS "lotNumber",
        r.brand,
        r.width_meters::float AS "widthMeters",
        r.initial_meters::float AS "initialMeters",
        r.current_meters::float AS "currentMeters",
        r.min_alert_meters::float AS "minAlertMeters",
        r.cost_cents AS "costCents",
        r.status,
        true AS "isLowMeters",
        r.notes,
        r.created_at AS "createdAt",
        r.updated_at AS "updatedAt"
      FROM material_rolls r
      JOIN materials m ON m.id = r.material_id AND m.tenant_id = r.tenant_id
      WHERE r.tenant_id = $1 
        AND r.status = 'in_use' 
        AND r.current_meters <= r.min_alert_meters 
        AND r.min_alert_meters > 0
      ORDER BY r.current_meters ASC;
      `,
      [tenantId]
    );

    return {
      lowStockMaterials: matRes.rows,
      criticalRolls: rollRes.rows,
      totalAlerts: matRes.rows.length + rollRes.rows.length,
    };
  }

  /**
   * Validação matemática: confirma que o saldo atual do material é rigorosamente igual
   * à soma algébrica de todas as suas movimentações
   */
  async validateMaterialStockConsistency(
    tenantId: string,
    materialId: string
  ): Promise<{ currentStock: number; sumMovements: number; isConsistent: boolean }> {
    const mat = await this.getMaterialById(tenantId, materialId);

    const sumRes = await tenantQuery<{ sum: string }>(
      tenantId,
      `SELECT COALESCE(SUM(quantity), 0)::text AS sum FROM stock_movements WHERE tenant_id = $1 AND material_id = $2;`,
      [tenantId, materialId]
    );

    const sumMovements = parseFloat(sumRes.rows[0]?.sum || '0');
    const isConsistent = Math.abs(mat.currentStock - sumMovements) < 0.0001;

    return {
      currentStock: mat.currentStock,
      sumMovements,
      isConsistent,
    };
  }

  /**
   * Remove material caso não tenha sido alocado a ordens de serviço
   */
  async deleteMaterial(
    tenantId: string,
    id: string,
    actorUserId?: string
  ): Promise<{ success: boolean }> {
    await this.getMaterialById(tenantId, id);

    const inUseRes = await tenantQuery<{ count: string }>(
      tenantId,
      `SELECT count(*)::text AS count FROM work_order_materials WHERE tenant_id = $1 AND material_id = $2;`,
      [tenantId, id]
    );
    if (parseInt(inUseRes.rows[0]?.count || '0', 10) > 0) {
      throw new StockValidationError('Não é possível excluir o material pois já foi utilizado em Ordens de Serviço.');
    }

    await tenantQuery(
      tenantId,
      `DELETE FROM stock_movements WHERE tenant_id = $1 AND material_id = $2;`,
      [tenantId, id]
    );

    await tenantQuery(
      tenantId,
      `DELETE FROM materials WHERE tenant_id = $1 AND id = $2;`,
      [tenantId, id]
    );

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'MATERIAL_DELETED',
        entity: 'materials',
        entityId: id,
      });
    }

    return { success: true };
  }
}

export const stockService = new StockService();
