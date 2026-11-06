import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import { stockService } from '../stock/stock-service.js';
import {
  WorkOrderDto,
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  ChangeWorkOrderStatusDto,
  WorkOrderItemDto,
  WorkOrderEventDto,
  PublicTrackingDto,
  WorkOrderStatus,
  WorkOrderStatusType,
  isValidWorkOrderTransition,
} from '@carx/shared';

export class WorkOrderStateError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = 'WorkOrderStateError';
    this.statusCode = statusCode;
  }
}

export class WorkOrderNotFoundError extends Error {
  statusCode: number;
  constructor(message = 'Ordem de serviço não encontrada.', statusCode = 404) {
    super(message);
    this.name = 'WorkOrderNotFoundError';
    this.statusCode = statusCode;
  }
}

export interface ListWorkOrdersParams {
  status?: WorkOrderStatusType;
  customerId?: string;
  vehicleId?: string;
  technicianId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class WorkOrderService {
  /**
   * Calcula o percentual padrão de progresso com base no status da OS
   */
  private getProgressByStatus(status: WorkOrderStatusType, currentProgress = 0): number {
    switch (status) {
      case WorkOrderStatus.QUOTE:
        return 0;
      case WorkOrderStatus.APPROVED:
        return 10;
      case WorkOrderStatus.SCHEDULED:
        return 20;
      case WorkOrderStatus.CHECKED_IN:
        return 30;
      case WorkOrderStatus.IN_PROGRESS:
        return Math.max(50, currentProgress);
      case WorkOrderStatus.PAUSED:
        return currentProgress;
      case WorkOrderStatus.QA:
        return 85;
      case WorkOrderStatus.READY:
        return 95;
      case WorkOrderStatus.DELIVERED:
        return 100;
      case WorkOrderStatus.CANCELED:
        return 0;
      default:
        return currentProgress;
    }
  }

  /**
   * Criação de Ordem de Serviço / Orçamento com numeração sequencial atômica por loja
   */
  async create(
    tenantId: string,
    data: CreateWorkOrderDto,
    actorUserId?: string
  ): Promise<WorkOrderDto> {
    if (!data.customerId) {
      throw new WorkOrderStateError('O cliente é obrigatório para a ordem de serviço.', 400);
    }
    if (!data.vehicleId) {
      throw new WorkOrderStateError('O veículo é obrigatório para a ordem de serviço.', 400);
    }

    const initialStatus = data.status || WorkOrderStatus.QUOTE;
    let createdOrder: WorkOrderDto;

    await tenantTransaction(tenantId, async (client) => {
      // 1. Validar cliente na loja
      const custCheck = await client.query(
        'SELECT id FROM customers WHERE tenant_id = $1 AND id = $2;',
        [tenantId, data.customerId]
      );
      if (custCheck.rows.length === 0) {
        throw new WorkOrderNotFoundError('Cliente não pertence a esta oficina.', 404);
      }

      // 2. Validar veículo na loja
      const vehCheck = await client.query(
        'SELECT id, size_class FROM vehicles WHERE tenant_id = $1 AND id = $2;',
        [tenantId, data.vehicleId]
      );
      if (vehCheck.rows.length === 0) {
        throw new WorkOrderNotFoundError('Veículo não pertence a esta oficina.', 404);
      }

      // 3. Obter próximo os_number atômico por loja
      const seqRes = await client.query<{ next_os: number }>(
        `SELECT COALESCE(MAX(os_number), 0) + 1 AS next_os 
         FROM work_orders 
         WHERE tenant_id = $1;`,
        [tenantId]
      );
      const osNumber = seqRes.rows[0].next_os;

      // 4. Calcular totais dos itens
      let totalCents = 0;
      let estimatedMinutes = 0;
      const itemsToInsert = data.items || [];

      for (const item of itemsToInsert) {
        const qty = Math.max(1, item.quantity || 1);
        const unitPrice = Math.max(0, item.unitPriceCents || 0);
        const itemDiscount = Math.max(0, item.discountCents || 0);
        const itemTotal = Math.max(0, unitPrice * qty - itemDiscount);
        totalCents += itemTotal;
        estimatedMinutes += (item.estimatedMinutes || 0) * qty;
      }

      const discountCents = Math.max(0, data.discountCents || 0);
      const finalCents = Math.max(0, totalCents - discountCents);
      const progress = this.getProgressByStatus(initialStatus, 0);

      // 5. Inserir a ordem de serviço
      const orderInsertRes = await client.query<WorkOrderDto>(
        `
        INSERT INTO work_orders (
          tenant_id,
          customer_id,
          vehicle_id,
          technician_id,
          os_number,
          status,
          origin,
          progress,
          total_cents,
          discount_cents,
          final_cents,
          paid_cents,
          estimated_minutes,
          scheduled_at,
          notes,
          customer_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, $12, $13, $14, $15)
        RETURNING 
          id,
          tenant_id AS "tenantId",
          customer_id AS "customerId",
          vehicle_id AS "vehicleId",
          technician_id AS "technicianId",
          os_number AS "osNumber",
          status,
          origin,
          previous_status AS "previousStatus",
          progress,
          total_cents AS "totalCents",
          discount_cents AS "discountCents",
          final_cents AS "finalCents",
          paid_cents AS "paidCents",
          total_cents / 100.0 AS "totalValue",
          discount_cents / 100.0 AS "discountValue",
          paid_cents / 100.0 AS "paidValue",
          estimated_minutes AS "estimatedMinutes",
          scheduled_at AS "scheduledAt",
          checked_in_at AS "checkedInAt",
          started_at AS "startedAt",
          completed_at AS "completedAt",
          delivered_at AS "deliveredAt",
          canceled_at AS "canceledAt",
          cancel_reason AS "cancelReason",
          notes,
          customer_notes AS "customerNotes",
          tracking_token AS "trackingToken",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [
          tenantId,
          data.customerId,
          data.vehicleId,
          data.technicianId || null,
          osNumber,
          initialStatus,
          data.origin || 'INTERNAL',
          progress,
          totalCents,
          discountCents,
          finalCents,
          estimatedMinutes,
          data.scheduledAt || null,
          data.notes || null,
          data.customerNotes || null,
        ]
      );
      createdOrder = orderInsertRes.rows[0];

      // 6. Inserir itens vinculados
      for (let i = 0; i < itemsToInsert.length; i++) {
        const item = itemsToInsert[i];
        const qty = Math.max(1, item.quantity || 1);
        const unitPrice = Math.max(0, item.unitPriceCents || 0);
        const itemDiscount = Math.max(0, item.discountCents || 0);
        const itemTotal = Math.max(0, unitPrice * qty - itemDiscount);

        await client.query(
          `
          INSERT INTO work_order_items (
            tenant_id,
            work_order_id,
            service_id,
            name,
            category,
            quantity,
            unit_price_cents,
            discount_cents,
            total_cents,
            estimated_minutes,
            warranty_months,
            custom_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
          `,
          [
            tenantId,
            createdOrder.id,
            item.serviceId || null,
            item.name,
            item.category || null,
            qty,
            unitPrice,
            itemDiscount,
            itemTotal,
            item.estimatedMinutes || 0,
            item.warrantyMonths || 3,
            i + 1,
          ]
        );
      }

      // 7. Gravar evento inicial na linha do tempo da OS
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
        ) VALUES ($1, $2, $3, NULL, $4, 'CREATED', $5, $6);
        `,
        [
          tenantId,
          createdOrder.id,
          actorUserId || null,
          initialStatus,
          `Ordem de Serviço #${osNumber} criada com status ${initialStatus}.`,
          JSON.stringify({ itemCount: itemsToInsert.length, totalCents, finalCents }),
        ]
      );
    });

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'WORK_ORDER_CREATED',
        entity: 'work_orders',
        entityId: createdOrder!.id!,
        newValues: createdOrder! as unknown as Record<string, unknown>,
      });
    }

    return this.getById(tenantId, createdOrder!.id!);
  }

  /**
   * Listagem paginada de ordens de serviço com filtros e busca
   */
  async list(
    tenantId: string,
    params: ListWorkOrdersParams = {}
  ): Promise<{ workOrders: WorkOrderDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['wo.tenant_id = $1'];
    const queryParams: unknown[] = [tenantId];

    if (params.status) {
      queryParams.push(params.status);
      conditions.push(`wo.status = $${queryParams.length}`);
    }

    if (params.customerId) {
      queryParams.push(params.customerId);
      conditions.push(`wo.customer_id = $${queryParams.length}`);
    }

    if (params.vehicleId) {
      queryParams.push(params.vehicleId);
      conditions.push(`wo.vehicle_id = $${queryParams.length}`);
    }

    if (params.technicianId) {
      queryParams.push(params.technicianId);
      conditions.push(`wo.technician_id = $${queryParams.length}`);
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim().toLowerCase()}%`;
      queryParams.push(term);
      const searchIdx = queryParams.length;

      const numParsed = parseInt(params.search.trim(), 10);
      if (!isNaN(numParsed)) {
        queryParams.push(numParsed);
        const numIdx = queryParams.length;
        conditions.push(`(
          wo.os_number = $${numIdx} OR 
          LOWER(c.name) LIKE $${searchIdx} OR 
          LOWER(v.plate) LIKE $${searchIdx} OR 
          LOWER(v.model) LIKE $${searchIdx}
        )`);
      } else {
        conditions.push(`(
          LOWER(c.name) LIKE $${searchIdx} OR 
          LOWER(v.plate) LIKE $${searchIdx} OR 
          LOWER(v.model) LIKE $${searchIdx}
        )`);
      }
    }

    const whereClause = conditions.join(' AND ');

    // Totalizador
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM work_orders wo
      JOIN customers c ON c.id = wo.customer_id AND c.tenant_id = wo.tenant_id
      JOIN vehicles v ON v.id = wo.vehicle_id AND v.tenant_id = wo.tenant_id
      WHERE ${whereClause};
    `;
    const countRes = await tenantQuery<{ total: number }>(tenantId, countSql, queryParams);
    const total = countRes.rows[0]?.total || 0;

    // Busca paginada
    queryParams.push(limit, offset);
    const sql = `
      SELECT 
        wo.id,
        wo.tenant_id AS "tenantId",
        wo.customer_id AS "customerId",
        wo.vehicle_id AS "vehicleId",
        wo.technician_id AS "technicianId",
        wo.os_number AS "osNumber",
        wo.status,
        wo.origin,
        wo.previous_status AS "previousStatus",
        wo.progress,
        wo.total_cents AS "totalCents",
        wo.discount_cents AS "discountCents",
        wo.final_cents AS "finalCents",
        wo.paid_cents AS "paidCents",
        wo.total_cents / 100.0 AS "totalValue",
        wo.discount_cents / 100.0 AS "discountValue",
        wo.paid_cents / 100.0 AS "paidValue",
        wo.estimated_minutes AS "estimatedMinutes",
        wo.scheduled_at AS "scheduledAt",
        wo.checked_in_at AS "checkedInAt",
        wo.started_at AS "startedAt",
        wo.completed_at AS "completedAt",
        wo.delivered_at AS "deliveredAt",
        wo.canceled_at AS "canceledAt",
        wo.cancel_reason AS "cancelReason",
        wo.notes,
        wo.customer_notes AS "customerNotes",
        wo.tracking_token AS "trackingToken",
        wo.created_at AS "createdAt",
        wo.updated_at AS "updatedAt",
        json_build_object(
          'id', c.id,
          'name', c.name,
          'phone', c.phone,
          'document', c.document
        ) AS customer,
        json_build_object(
          'id', v.id,
          'plate', v.plate,
          'brand', v.brand,
          'model', v.model,
          'sizeClass', v.size_class,
          'color', v.color
        ) AS vehicle,
        CASE WHEN u.id IS NOT NULL THEN
          json_build_object('id', u.id, 'name', u.name, 'email', u.email)
        ELSE NULL END AS technician
      FROM work_orders wo
      JOIN customers c ON c.id = wo.customer_id AND c.tenant_id = wo.tenant_id
      JOIN vehicles v ON v.id = wo.vehicle_id AND v.tenant_id = wo.tenant_id
      LEFT JOIN users u ON u.id = wo.technician_id
      WHERE ${whereClause}
      ORDER BY wo.os_number DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length};
    `;

    const res = await tenantQuery<WorkOrderDto>(tenantId, sql, queryParams);
    return {
      workOrders: res.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Busca detalhada de Ordem de Serviço com itens e histórico da linha do tempo
   */
  async getById(tenantId: string, id: string): Promise<WorkOrderDto> {
    const res = await tenantQuery<WorkOrderDto>(
      tenantId,
      `
      SELECT 
        wo.id,
        wo.tenant_id AS "tenantId",
        wo.customer_id AS "customerId",
        wo.vehicle_id AS "vehicleId",
        wo.technician_id AS "technicianId",
        wo.os_number AS "osNumber",
        wo.status,
        wo.origin,
        wo.previous_status AS "previousStatus",
        wo.progress,
        wo.total_cents AS "totalCents",
        wo.discount_cents AS "discountCents",
        wo.final_cents AS "finalCents",
        wo.paid_cents AS "paidCents",
        wo.total_cents / 100.0 AS "totalValue",
        wo.discount_cents / 100.0 AS "discountValue",
        wo.paid_cents / 100.0 AS "paidValue",
        wo.estimated_minutes AS "estimatedMinutes",
        wo.scheduled_at AS "scheduledAt",
        wo.checked_in_at AS "checkedInAt",
        wo.started_at AS "startedAt",
        wo.completed_at AS "completedAt",
        wo.delivered_at AS "deliveredAt",
        wo.canceled_at AS "canceledAt",
        wo.cancel_reason AS "cancelReason",
        wo.notes,
        wo.customer_notes AS "customerNotes",
        wo.tracking_token AS "trackingToken",
        wo.created_at AS "createdAt",
        wo.updated_at AS "updatedAt",
        json_build_object(
          'id', c.id,
          'name', c.name,
          'phone', c.phone,
          'document', c.document,
          'email', c.email
        ) AS customer,
        json_build_object(
          'id', v.id,
          'plate', v.plate,
          'brand', v.brand,
          'model', v.model,
          'year', v.year,
          'color', v.color,
          'sizeClass', v.size_class,
          'currentKm', v.current_km
        ) AS vehicle,
        CASE WHEN u.id IS NOT NULL THEN
          json_build_object('id', u.id, 'name', u.name, 'email', u.email)
        ELSE NULL END AS technician
      FROM work_orders wo
      JOIN customers c ON c.id = wo.customer_id AND c.tenant_id = wo.tenant_id
      JOIN vehicles v ON v.id = wo.vehicle_id AND v.tenant_id = wo.tenant_id
      LEFT JOIN users u ON u.id = wo.technician_id
      WHERE wo.tenant_id = $1 AND wo.id = $2;
      `,
      [tenantId, id]
    );

    if (res.rows.length === 0) {
      throw new WorkOrderNotFoundError();
    }

    const order = res.rows[0];

    // Buscar itens
    const itemsRes = await tenantQuery<WorkOrderItemDto>(
      tenantId,
      `
      SELECT 
        id,
        tenant_id AS "tenantId",
        work_order_id AS "workOrderId",
        service_id AS "serviceId",
        name,
        category,
        quantity,
        unit_price_cents AS "unitPriceCents",
        discount_cents AS "discountCents",
        total_cents AS "totalCents",
        estimated_minutes AS "estimatedMinutes",
        warranty_months AS "warrantyMonths",
        custom_order AS "customOrder",
        created_at AS "createdAt"
      FROM work_order_items
      WHERE tenant_id = $1 AND work_order_id = $2
      ORDER BY custom_order ASC;
      `,
      [tenantId, id]
    );
    order.items = itemsRes.rows;

    // Buscar histórico de eventos (linha do tempo)
    const eventsRes = await tenantQuery<WorkOrderEventDto>(
      tenantId,
      `
      SELECT 
        we.id,
        we.tenant_id AS "tenantId",
        we.work_order_id AS "workOrderId",
        we.user_id AS "userId",
        u.name AS "userName",
        we.from_status AS "fromStatus",
        we.to_status AS "toStatus",
        we.event_type AS "eventType",
        we.notes,
        we.metadata,
        we.created_at AS "createdAt"
      FROM work_order_events we
      LEFT JOIN users u ON u.id = we.user_id
      WHERE we.tenant_id = $1 AND we.work_order_id = $2
      ORDER BY we.created_at ASC;
      `,
      [tenantId, id]
    );
    order.events = eventsRes.rows;

    return order;
  }

  /**
   * Transição Estrita da Máquina de Estados
   * QUOTE ➔ APPROVED ➔ SCHEDULED ➔ CHECKED_IN ➔ IN_PROGRESS ➔ QA ➔ READY ➔ DELIVERED (+ PAUSED, CANCELED)
   */
  async transitionStatus(
    tenantId: string,
    id: string,
    input: ChangeWorkOrderStatusDto,
    actorUserId?: string
  ): Promise<WorkOrderDto> {
    const existing = await this.getById(tenantId, id);
    const currentStatus = existing.status as WorkOrderStatusType;
    const targetStatus = input.status;

    // 1. Validação estrita da máquina de estados
    if (!isValidWorkOrderTransition(currentStatus, targetStatus)) {
      throw new WorkOrderStateError(
        `Transição de estado inválida: Não é permitido mover uma OS de "${currentStatus}" diretamente para "${targetStatus}".`,
        422
      );
    }

    if (currentStatus === targetStatus) {
      return existing; // idempotente
    }

    const newProgress = this.getProgressByStatus(targetStatus, existing.progress);

    await tenantTransaction(tenantId, async (client) => {
      // 2. Atualizar timestamps específicos do status
      const timestampUpdates: string[] = [];
      const updateParams: unknown[] = [tenantId, id, targetStatus, currentStatus, newProgress];

      if (targetStatus === WorkOrderStatus.CHECKED_IN) {
        timestampUpdates.push('checked_in_at = COALESCE(checked_in_at, NOW())');
      } else if (targetStatus === WorkOrderStatus.IN_PROGRESS) {
        timestampUpdates.push('started_at = COALESCE(started_at, NOW())');
      } else if (targetStatus === WorkOrderStatus.QA || targetStatus === WorkOrderStatus.READY) {
        timestampUpdates.push('completed_at = COALESCE(completed_at, NOW())');
      } else if (targetStatus === WorkOrderStatus.DELIVERED) {
        timestampUpdates.push('delivered_at = NOW()');
      } else if (targetStatus === WorkOrderStatus.CANCELED) {
        timestampUpdates.push('canceled_at = NOW()');
        if (input.cancelReason) {
          updateParams.push(input.cancelReason);
          timestampUpdates.push(`cancel_reason = $${updateParams.length}`);
        }
      }

      const extraUpdates = timestampUpdates.length > 0 ? `, ${timestampUpdates.join(', ')}` : '';

      await client.query(
        `
        UPDATE work_orders
        SET 
          status = $3,
          previous_status = $4,
          progress = $5,
          updated_at = NOW()
          ${extraUpdates}
        WHERE tenant_id = $1 AND id = $2;
        `,
        updateParams
      );

      // 3. Inserir registro imutável na linha do tempo de eventos
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
        ) VALUES ($1, $2, $3, $4, $5, 'STATUS_CHANGE', $6, $7);
        `,
        [
          tenantId,
          id,
          actorUserId || null,
          currentStatus,
          targetStatus,
          input.notes || `Transição de estado para ${targetStatus}`,
          JSON.stringify(input.metadata || {}),
        ]
      );
    });

    // Baixa idempotente automática de insumos e bobinas ao entregar a Ordem de Serviço
    if (targetStatus === WorkOrderStatus.DELIVERED) {
      await stockService.deductWorkOrderMaterials(tenantId, id, actorUserId);
    }

    const updated = await this.getById(tenantId, id);

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'WORK_ORDER_STATUS_CHANGED',
        entity: 'work_orders',
        entityId: id,
        oldValues: { status: currentStatus, progress: existing.progress },
        newValues: { status: targetStatus, progress: updated.progress },
      });
    }

    return updated;
  }

  /**
   * Atualização cadastral de dados da Ordem de Serviço
   */
  async update(
    tenantId: string,
    id: string,
    data: UpdateWorkOrderDto,
    actorUserId?: string
  ): Promise<WorkOrderDto> {
    const existing = await this.getById(tenantId, id);

    if (existing.status === WorkOrderStatus.DELIVERED || existing.status === WorkOrderStatus.CANCELED) {
      throw new WorkOrderStateError(
        'Não é permitido alterar uma Ordem de Serviço finalizada ou cancelada.',
        422
      );
    }

    const technicianId = data.technicianId !== undefined ? data.technicianId : existing.technicianId;
    const notes = data.notes !== undefined ? data.notes : existing.notes;
    const customerNotes = data.customerNotes !== undefined ? data.customerNotes : existing.customerNotes;
    const scheduledAt = data.scheduledAt !== undefined ? data.scheduledAt : existing.scheduledAt;

    let discountCents = existing.discountCents;
    let finalCents = existing.finalCents;

    if (data.discountCents !== undefined) {
      discountCents = Math.max(0, data.discountCents);
      finalCents = Math.max(0, existing.totalCents - discountCents);
    }

    await tenantQuery(
      tenantId,
      `
      UPDATE work_orders
      SET 
        technician_id = $3,
        discount_cents = $4,
        final_cents = $5,
        scheduled_at = $6,
        notes = $7,
        customer_notes = $8,
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2;
      `,
      [tenantId, id, technicianId, discountCents, finalCents, scheduledAt, notes, customerNotes]
    );

    const updated = await this.getById(tenantId, id);

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'WORK_ORDER_UPDATED',
        entity: 'work_orders',
        entityId: id,
        oldValues: existing as unknown as Record<string, unknown>,
        newValues: updated as unknown as Record<string, unknown>,
      });
    }

    return updated;
  }

  /**
   * Consulta pública de acompanhamento por Token UUID (Seguro, sem autenticação, somente leitura)
   */
  async getPublicTracking(trackingToken: string): Promise<PublicTrackingDto> {
    // 1. Busca sem contexto de tenant pois é acesso público anônimo do cliente final
    const res = await tenantQuery<any>(
      null,
      `
      SELECT 
        wo.os_number AS "osNumber",
        wo.status,
        wo.progress,
        wo.scheduled_at AS "scheduledAt",
        wo.started_at AS "startedAt",
        wo.completed_at AS "completedAt",
        wo.delivered_at AS "deliveredAt",
        v.brand,
        v.model,
        v.plate,
        wo.id AS "workOrderId",
        wo.tenant_id AS "tenantId"
      FROM work_orders wo
      JOIN vehicles v ON v.id = wo.vehicle_id
      WHERE wo.tracking_token = $1;
      `,
      [trackingToken],
      { bypassRls: true }
    );

    if (res.rows.length === 0) {
      throw new WorkOrderNotFoundError('Acompanhamento não encontrado ou token inválido.', 404);
    }

    const row = res.rows[0];

    // 2. Buscar itens resumidos
    const itemsRes = await tenantQuery<{ name: string; category: string | null }>(
      null,
      `SELECT name, category FROM work_order_items WHERE work_order_id = $1 ORDER BY custom_order ASC;`,
      [row.workOrderId],
      { bypassRls: true }
    );

    // 3. Buscar linha do tempo de eventos resumida
    const eventsRes = await tenantQuery<{ to_status: string; created_at: string; notes: string | null }>(
      null,
      `SELECT to_status, created_at, notes FROM work_order_events WHERE work_order_id = $1 ORDER BY created_at ASC;`,
      [row.workOrderId],
      { bypassRls: true }
    );

    return {
      osNumber: row.osNumber,
      status: row.status,
      progress: row.progress,
      brand: row.brand,
      model: row.model,
      plate: row.plate,
      scheduledAt: row.scheduledAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      deliveredAt: row.deliveredAt,
      items: itemsRes.rows,
      timeline: eventsRes.rows.map((e) => ({
        status: e.to_status,
        createdAt: e.created_at,
        notes: e.notes,
      })),
    };
  }
}

export const workOrderService = new WorkOrderService();

