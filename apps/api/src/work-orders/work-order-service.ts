import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import { stockService } from '../stock/stock-service.js';
import { realtimeHub } from '../realtime/realtime-hub.js';
import { planService } from '../plans/plan-service.js';
import { whatsappService } from '../whatsapp/whatsapp-service.js';
import { fiscalService } from '../fiscal/fiscal-service.js';
import { generatePixPayload } from '../payments/pix-generator.js';
import { randomBytes } from 'node:crypto';
import {
  WorkOrderDto,
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  ChangeWorkOrderStatusDto,
  WorkOrderItemDto,
  WorkOrderEventDto,
  PublicTrackingDto,
  PublicQuoteDto,
  AcceptQuoteInputDto,
  AcceptQuoteResponseDto,
  WorkOrderPixChargeResultDto,
  WorkOrderPixStatusResultDto,
  WhatsAppTransactionalEventType,
  SendTransactionalWhatsAppResultDto,
  WorkOrderStatus,
  WorkOrderStatusType,
  PlanFeatures,
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
  excludeQuote?: boolean;
}

export class WorkOrderService {
  /**
   * Calcula o percentual padrão de progresso com base no status da OS
   */
  private getProgressByStatus(status: WorkOrderStatusType, currentProgress = 0): number {
    switch (status) {
      case WorkOrderStatus.QUOTE:
      case WorkOrderStatus.APPROVED:
      case WorkOrderStatus.SCHEDULED:
      case WorkOrderStatus.CHECKED_IN:
        return 0;
      case WorkOrderStatus.IN_PROGRESS:
        return Math.max(10, currentProgress);
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

      // 4. Calcular totais dos itens (compatibilidade total com items e services)
      let totalCents = 0;
      let estimatedMinutes = 0;
      let rawItems = data.items;
      if ((!rawItems || rawItems.length === 0) && (data as any).services && Array.isArray((data as any).services)) {
        rawItems = (data as any).services.map((s: any) => ({
          serviceId: s.serviceId || s.id,
          name: s.name || s.nome,
          unitPriceCents: s.unitPriceCents !== undefined ? s.unitPriceCents : Math.round(Number(s.unit_price || s.preco || s.valor || 0) * 100),
          quantity: s.quantity || s.quantidade || 1,
          discountCents: s.discountCents || 0,
          estimatedMinutes: s.estimatedMinutes || s.estimated_minutes || s.tempo || 60,
          warrantyMonths: s.warrantyMonths || s.warranty_months || 3,
        }));
      }
      const itemsToInsert = rawItems || [];

      for (const item of itemsToInsert) {
        const qty = Math.max(1, item.quantity || 1);
        const unitPrice = Math.max(0, item.unitPriceCents || 0);
        const itemDiscount = Math.max(0, item.discountCents || 0);
        const itemTotal = Math.max(0, unitPrice * qty - itemDiscount);
        totalCents += itemTotal;
        estimatedMinutes += (item.estimatedMinutes || 0) * qty;
      }

      const discountCents = Math.max(0, data.discountCents || 0);
      const depositRequiredCents = Math.max(0, data.depositRequiredCents || 0);
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
          deposit_required_cents,
          estimated_minutes,
          scheduled_at,
          notes,
          customer_notes,
          public_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, $12, $13, $14, $15, $16, $17)
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
          deposit_required_cents AS "depositRequiredCents",
          deposit_pix_code AS "depositPixCode",
          deposit_pix_qr_base64 AS "depositPixQrBase64",
          deposit_paid_at AS "depositPaidAt",
          accepted_at AS "acceptedAt",
          accepted_ip AS "acceptedIp",
          accepted_signature_name AS "acceptedSignatureName",
          public_notes AS "publicNotes",
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
          depositRequiredCents,
          estimatedMinutes,
          data.scheduledAt || null,
          data.notes || null,
          data.customerNotes || null,
          data.publicNotes || null,
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
    } else if (params.excludeQuote) {
      conditions.push(`wo.status != '${WorkOrderStatus.QUOTE}'`);
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
        wo.public_notes AS "publicNotes",
        wo.deposit_required_cents AS "depositRequiredCents",
        wo.deposit_pix_code AS "depositPixCode",
        wo.deposit_pix_qr_base64 AS "depositPixQrBase64",
        wo.deposit_paid_at AS "depositPaidAt",
        wo.accepted_at AS "acceptedAt",
        wo.accepted_ip AS "acceptedIp",
        wo.accepted_user_agent AS "acceptedUserAgent",
        wo.accepted_signature_name AS "acceptedSignatureName",
        wo.tracking_token AS "trackingToken",
        wo.created_at AS "createdAt",
        wo.updated_at AS "updatedAt",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', woi.id,
                'serviceId', woi.service_id,
                'name', woi.name,
                'category', woi.category,
                'quantity', woi.quantity,
                'unitPriceCents', woi.unit_price_cents,
                'discountCents', woi.discount_cents,
                'totalCents', woi.total_cents,
                'estimatedMinutes', woi.estimated_minutes,
                'warrantyMonths', woi.warranty_months,
                'customOrder', woi.custom_order
              ) ORDER BY woi.custom_order ASC, woi.created_at ASC
            )
            FROM work_order_items woi
            WHERE woi.work_order_id = wo.id AND woi.tenant_id = wo.tenant_id
          ),
          '[]'::json
        ) AS items,
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
        wo.public_notes AS "publicNotes",
        wo.deposit_required_cents AS "depositRequiredCents",
        wo.deposit_pix_code AS "depositPixCode",
        wo.deposit_pix_qr_base64 AS "depositPixQrBase64",
        wo.deposit_paid_at AS "depositPaidAt",
        wo.accepted_at AS "acceptedAt",
        wo.accepted_ip AS "acceptedIp",
        wo.accepted_user_agent AS "acceptedUserAgent",
        wo.accepted_signature_name AS "acceptedSignatureName",
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

      if (targetStatus === WorkOrderStatus.QUOTE) {
        timestampUpdates.push('scheduled_at = NULL');
        // Reabertura para orçamento: cancela agendamento pendente no box (Item 20)
        await client.query(
          `UPDATE appointments SET status = 'canceled', updated_at = NOW() WHERE tenant_id = $1 AND work_order_id = $2`,
          [tenantId, id]
        );
      } else if (targetStatus === WorkOrderStatus.CHECKED_IN) {
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
      fiscalService.autoIssueIfConfigured(tenantId, id, 'delivery').catch(() => {});
    }

    const updated = await this.getById(tenantId, id);

    // Emissão de evento pontual leve em tempo real para TV da Loja e App do Técnico
    realtimeHub.publish(tenantId, 'work_order.updated', {
      workOrderId: updated.id,
      osNumber: updated.osNumber,
      status: updated.status,
      previousStatus: currentStatus,
      progress: updated.progress,
      vehiclePlate: updated.vehicle?.plate || null,
      technicianId: updated.technicianId || null,
      technicianName: updated.technician?.name || null,
    });

    if (targetStatus === WorkOrderStatus.READY) {
      realtimeHub.publish(tenantId, 'work_order.ready', {
        workOrderId: updated.id,
        osNumber: updated.osNumber,
        vehiclePlate: updated.vehicle?.plate || null,
        customerName: updated.customer?.name || null,
      });
    }

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

    // T6.4: Disparo transacional de WhatsApp (respeita plano da oficina e é não bloqueante)
    if (['CHECKED_IN', 'READY', 'DELIVERED'].includes(targetStatus)) {
      this.notifyWorkOrderWhatsApp(
        tenantId,
        id,
        targetStatus as WhatsAppTransactionalEventType
      ).catch(() => {
        // Falha silenciosa para garantir que a transição de estado nunca seja bloqueada
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
    const publicNotes = data.publicNotes !== undefined ? data.publicNotes : (existing as any).publicNotes;
    const depositRequiredCents = data.depositRequiredCents !== undefined ? Math.max(0, data.depositRequiredCents) : ((existing as any).depositRequiredCents || 0);
    const scheduledAt = data.scheduledAt !== undefined ? data.scheduledAt : existing.scheduledAt;

    let totalCents = existing.totalCents;
    let discountCents = existing.discountCents;

    // Se novos itens/serviços forem enviados, substitui os existentes e recalcula os totais
    let rawUpdateItems = (data as any).items;
    if ((!rawUpdateItems || rawUpdateItems.length === 0) && (data as any).services && Array.isArray((data as any).services)) {
      rawUpdateItems = (data as any).services.map((s: any) => ({
        serviceId: s.serviceId || s.id,
        name: s.name || s.nome,
        unitPriceCents: s.unitPriceCents !== undefined ? s.unitPriceCents : Math.round(Number(s.unit_price || s.preco || s.valor || 0) * 100),
        quantity: s.quantity || s.quantidade || 1,
        discountCents: s.discountCents || 0,
        estimatedMinutes: s.estimatedMinutes || s.estimated_minutes || s.tempo || 60,
        warrantyMonths: s.warrantyMonths || s.warranty_months || 3,
      }));
    }

    if (rawUpdateItems && Array.isArray(rawUpdateItems)) {
      await tenantQuery(
        tenantId,
        `DELETE FROM work_order_items WHERE tenant_id = $1 AND work_order_id = $2;`,
        [tenantId, id]
      );

      totalCents = 0;
      for (const item of rawUpdateItems) {
        const qty = Math.max(1, item.quantity || 1);
        const unitPrice = Math.max(0, item.unitPriceCents || 0);
        const itemDiscount = Math.max(0, item.discountCents || 0);
        const itemTotal = Math.max(0, unitPrice * qty - itemDiscount);
        totalCents += itemTotal;

        await tenantQuery(
          tenantId,
          `
          INSERT INTO work_order_items (
            tenant_id,
            work_order_id,
            service_id,
            name,
            quantity,
            unit_price_cents,
            discount_cents,
            total_cents,
            estimated_minutes,
            warranty_months
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
          `,
          [
            tenantId,
            id,
            item.serviceId || null,
            item.name,
            qty,
            unitPrice,
            itemDiscount,
            itemTotal,
            item.estimatedMinutes || 60,
            item.warrantyMonths || 3,
          ]
        );
      }
    }

    if (data.discountCents !== undefined) {
      discountCents = Math.max(0, data.discountCents);
    }
    const finalCents = Math.max(0, totalCents - discountCents);

    await tenantQuery(
      tenantId,
      `
      UPDATE work_orders
      SET 
        technician_id = $3,
        total_cents = $4,
        discount_cents = $5,
        final_cents = $6,
        scheduled_at = $7,
        notes = $8,
        customer_notes = $9,
        public_notes = $10,
        deposit_required_cents = $11,
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2;
      `,
      [tenantId, id, technicianId, totalCents, discountCents, finalCents, scheduledAt, notes, customerNotes, publicNotes, depositRequiredCents]
    );

    // Sincronização automática com a tabela de Agendamentos (appointments) para a Agenda Inteligente (Item 19)
    if (scheduledAt) {
      try {
        const estMin = existing.estimatedMinutes || 60;
        const startTime = new Date(scheduledAt);
        const endTime = new Date(startTime.getTime() + estMin * 60000);

        // Localiza primeiro box físico (bay) ativo caso não tenha nenhum atribuído
        const bayRes = await tenantQuery<{ id: string }>(
          tenantId,
          `SELECT id FROM bays WHERE tenant_id = $1 AND is_active = true ORDER BY order_index ASC LIMIT 1`,
          [tenantId]
        );
        const bayId = bayRes.rows[0]?.id || null;

        // Verifica se já existe um agendamento vinculado a esta OS
        const appRes = await tenantQuery<{ id: string }>(
          tenantId,
          `SELECT id FROM appointments WHERE tenant_id = $1 AND work_order_id = $2 LIMIT 1`,
          [tenantId, id]
        );

        const title = `OS #${existing.osNumber} · ${existing.customer?.name || 'Cliente'}`;
        const serviceName = existing.items?.map((i) => i.name).join(', ') || 'Serviço Automotivo';

        if (appRes.rows.length > 0) {
          await tenantQuery(
            tenantId,
            `UPDATE appointments
             SET start_time = $3,
                 end_time = $4,
                 technician_id = $5,
                 bay_id = COALESCE(bay_id, $6),
                 status = 'scheduled',
                 updated_at = NOW()
             WHERE tenant_id = $1 AND id = $2`,
            [tenantId, appRes.rows[0].id, startTime.toISOString(), endTime.toISOString(), technicianId || null, bayId]
          );
        } else {
          await tenantQuery(
            tenantId,
            `INSERT INTO appointments (
               tenant_id,
               work_order_id,
               customer_id,
               vehicle_id,
               technician_id,
               bay_id,
               title,
               start_time,
               end_time,
               estimated_minutes,
               status,
               service_name,
               customer_name,
               customer_phone,
               vehicle_plate,
               vehicle_model
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
              tenantId,
              id,
              existing.customerId,
              existing.vehicleId,
              technicianId || null,
              bayId,
              title,
              startTime.toISOString(),
              endTime.toISOString(),
              estMin,
              'scheduled',
              serviceName,
              existing.customer?.name || null,
              existing.customer?.phone || null,
              existing.vehicle?.plate || null,
              `${existing.vehicle?.brand || ''} ${existing.vehicle?.model || ''}`.trim() || null,
            ]
          );
        }
      } catch (appSyncErr) {
        // Loga erro sem abortar a atualização da OS
        console.warn('Falha não-bloqueante na sincronização de agendamento:', appSyncErr);
      }
    }

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

  /**
   * Consulta pública de Orçamento Digital por Token UUID (Seguro, sem autenticação)
   */
  async getPublicQuote(trackingToken: string): Promise<PublicQuoteDto> {
    const res = await tenantQuery<any>(
      null,
      `
      SELECT 
        wo.id AS "workOrderId",
        wo.tenant_id AS "tenantId",
        wo.os_number AS "osNumber",
        wo.status,
        wo.total_cents AS "totalCents",
        wo.discount_cents AS "discountCents",
        wo.final_cents AS "finalCents",
        wo.paid_cents AS "paidCents",
        wo.deposit_required_cents AS "depositRequiredCents",
        wo.deposit_pix_code AS "depositPixCode",
        wo.deposit_pix_qr_base64 AS "depositPixQrBase64",
        wo.deposit_paid_at AS "depositPaidAt",
        wo.accepted_at AS "acceptedAt",
        wo.accepted_signature_name AS "acceptedSignatureName",
        wo.public_notes AS "publicNotes",
        wo.created_at AS "createdAt",
        t.trade_name AS "tenantName",
        t.trade_name AS "tenantTradeName",
        t.legal_name AS "tenantLegalName",
        t.cnpj AS "tenantDocument",
        t.phone AS "tenantPhone",
        t.email AS "tenantEmail",
        t.slug AS "tenantSlug",
        t.settings->>'pix_key' AS "tenantPixKey",
        tb.logo_url AS "tenantLogoUrl",
        tb.whatsapp_phone AS "tenantWhatsappNumber",
        c.name AS "customerName",
        c.phone AS "customerPhone",
        v.brand AS "vehicleBrand",
        v.model AS "vehicleModel",
        v.plate AS "vehiclePlate",
        v.year AS "vehicleYear",
        v.color AS "vehicleColor",
        v.size_class AS "vehicleSizeClass"
      FROM work_orders wo
      JOIN tenants t ON t.id = wo.tenant_id
      LEFT JOIN tenant_branding tb ON tb.tenant_id = wo.tenant_id
      JOIN customers c ON c.id = wo.customer_id
      JOIN vehicles v ON v.id = wo.vehicle_id
      WHERE wo.tracking_token = $1;
      `,
      [trackingToken],
      { bypassRls: true }
    );

    if (res.rows.length === 0) {
      throw new WorkOrderNotFoundError('Orçamento não encontrado ou link expirado.', 404);
    }

    const row = res.rows[0];

    // Buscar itens da OS
    const itemsRes = await tenantQuery<any>(
      null,
      `
      SELECT 
        name,
        category,
        quantity,
        unit_price_cents AS "unitPriceCents",
        discount_cents AS "discountCents",
        total_cents AS "finalCents",
        estimated_minutes AS "estimatedMinutes",
        warranty_months AS "warrantyMonths"
      FROM work_order_items 
      WHERE work_order_id = $1 
      ORDER BY custom_order ASC, created_at ASC;
      `,
      [row.workOrderId],
      { bypassRls: true }
    );

    // Buscar fotos de inspeção/vistoria prévia se houver
    const photosRes = await tenantQuery<any>(
      null,
      `
      SELECT 
        CONCAT('/storage/files/', sf.file_key) AS "url",
        ip.phase AS "phase",
        ip.caption AS "notes"
      FROM inspection_photos ip
      JOIN storage_files sf ON sf.id = ip.photo_file_id
      JOIN inspections i ON i.id = ip.inspection_id
      WHERE i.work_order_id = $1
      ORDER BY ip.created_at ASC
      LIMIT 6;
      `,
      [row.workOrderId],
      { bypassRls: true }
    );

    // Mascarar telefone do cliente para conformidade com a LGPD
    const rawPhone = String(row.customerPhone || '');
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const maskedPhone = cleanPhone.length >= 8 
      ? `(${cleanPhone.slice(0, 2)}) *****-${cleanPhone.slice(-4)}`
      : 'Não informado';

    return {
      trackingToken,
      osNumber: row.osNumber,
      status: row.status,
      tenant: {
        id: row.tenantId,
        name: row.tenantTradeName || row.tenantName,
        tradeName: row.tenantTradeName,
        document: row.tenantDocument,
        phone: row.tenantPhone,
        email: row.tenantEmail,
        logoUrl: row.tenantLogoUrl,
        whatsappNumber: row.tenantWhatsappNumber || row.tenantPhone,
      },
      customer: {
        name: row.customerName,
        phoneMasked: maskedPhone,
      },
      vehicle: {
        brand: row.vehicleBrand,
        model: row.vehicleModel,
        plate: row.vehiclePlate,
        year: row.vehicleYear,
        color: row.vehicleColor,
        sizeCategory: row.vehicleSizeClass,
      },
      items: itemsRes.rows,
      totalCents: row.totalCents,
      discountCents: row.discountCents,
      finalCents: row.finalCents,
      depositRequiredCents: row.depositRequiredCents || 0,
      depositPaidCents: Math.min(row.paidCents, row.depositRequiredCents || 0),
      depositPixCode: row.depositPixCode,
      depositPixQrBase64: row.depositPixQrBase64,
      depositPaidAt: row.depositPaidAt,
      acceptedAt: row.acceptedAt,
      acceptedSignatureName: row.acceptedSignatureName,
      publicNotes: row.publicNotes,
      photos: photosRes.rows,
      createdAt: row.createdAt,
    };
  }

  /**
   * Aceite formal online do orçamento pelo cliente final
   */
  async acceptPublicQuote(
    trackingToken: string,
    input: AcceptQuoteInputDto,
    clientIp: string,
    userAgent: string
  ): Promise<AcceptQuoteResponseDto> {
    if (!input.signatureName || input.signatureName.trim().length < 3) {
      throw new WorkOrderStateError('O nome completo é obrigatório para assinar o aceite formal.', 400);
    }
    if (!input.termsAccepted) {
      throw new WorkOrderStateError('É necessário concordar com os termos da proposta para aprovar.', 400);
    }

    // Buscar orçamento
    const woRes = await tenantQuery<any>(
      null,
      `
      SELECT 
        wo.id,
        wo.tenant_id AS "tenantId",
        wo.os_number AS "osNumber",
        wo.status,
        wo.final_cents AS "finalCents",
        wo.deposit_required_cents AS "depositRequiredCents",
        wo.deposit_pix_code AS "depositPixCode",
        wo.deposit_pix_qr_base64 AS "depositPixQrBase64",
        wo.accepted_at AS "acceptedAt",
        t.trade_name AS "tenantName",
        t.settings->>'pix_key' AS "tenantPixKey"
      FROM work_orders wo
      JOIN tenants t ON t.id = wo.tenant_id
      WHERE wo.tracking_token = $1;
      `,
      [trackingToken],
      { bypassRls: true }
    );

    if (woRes.rows.length === 0) {
      throw new WorkOrderNotFoundError('Orçamento não encontrado.', 404);
    }

    const order = woRes.rows[0];

    if (order.status === WorkOrderStatus.CANCELED) {
      throw new WorkOrderStateError('Este orçamento foi cancelado e não pode ser aprovado.', 422);
    }

    const depositCents = Math.max(0, order.depositRequiredCents || 0);
    let pixCode = order.depositPixCode;
    let pixQr = order.depositPixQrBase64;

    // Se exige sinal e ainda não gerou Pix
    if (depositCents > 0 && !pixCode) {
      const pixKey = order.tenantPixKey || 'financeiro@carx.com.br';
      const pixData = await generatePixPayload({
        pixKey,
        merchantName: order.tenantName || 'CARX OFICINA',
        merchantCity: 'SAO PAULO',
        amountCents: depositCents,
        txid: `OS${order.osNumber}`,
        description: `Sinal OS #${order.osNumber}`,
      });
      pixCode = pixData.pixCode;
      pixQr = pixData.qrCodeBase64 || pixData.qrCodeUrl;
    }

    // Transição de status: se não exige sinal avança direto para APPROVED
    const targetStatus = depositCents > 0 ? WorkOrderStatus.QUOTE : WorkOrderStatus.APPROVED;

    await tenantQuery(
      order.tenantId,
      `
      UPDATE work_orders
      SET 
        status = $3,
        accepted_at = NOW(),
        accepted_ip = $4,
        accepted_user_agent = $5,
        accepted_signature_name = $6,
        deposit_pix_code = $7,
        deposit_pix_qr_base64 = $8,
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2;
      `,
      [order.id, order.tenantId, targetStatus, clientIp, userAgent, input.signatureName.trim(), pixCode, pixQr],
      { bypassRls: true }
    );

    // Gravar evento no histórico da OS
    await tenantQuery(
      order.tenantId,
      `
      INSERT INTO work_order_events (
        tenant_id,
        work_order_id,
        from_status,
        to_status,
        notes
      ) VALUES ($1, $2, $3, $4, $5);
      `,
      [
        order.tenantId,
        order.id,
        order.status,
        targetStatus,
        `Proposta aprovada online por ${input.signatureName.trim()} (IP: ${clientIp})`,
      ],
      { bypassRls: true }
    );

    // Notificar painel do gestor em tempo real via SSE
    realtimeHub.publish(order.tenantId, 'work_order.updated', {
      type: 'quote.accepted',
      workOrderId: order.id,
      osNumber: order.osNumber,
      signatureName: input.signatureName.trim(),
      depositRequiredCents: depositCents,
    });

    return {
      success: true,
      message: depositCents > 0 
        ? 'Orçamento aprovado! Efetue o pagamento do sinal Pix para agendamento do veículo.' 
        : 'Orçamento aprovado com sucesso! A oficina já foi notificada para início dos trabalhos.',
      status: targetStatus,
      acceptedAt: new Date().toISOString(),
      depositRequiredCents: depositCents,
      depositPixCode: pixCode,
      depositPixQrBase64: pixQr,
    };
  }

  /**
   * Confirmação / Liquidação do Sinal Pix do Orçamento
   */
  async confirmDepositPix(
    trackingToken: string
  ): Promise<{ success: boolean; message: string; paidCents: number; depositPaidAt: string }> {
    const woRes = await tenantQuery<any>(
      null,
      `
      SELECT 
        id,
        tenant_id AS "tenantId",
        customer_id AS "customerId",
        os_number AS "osNumber",
        status,
        deposit_required_cents AS "depositRequiredCents",
        paid_cents AS "paidCents",
        deposit_paid_at AS "depositPaidAt"
      FROM work_orders
      WHERE tracking_token = $1;
      `,
      [trackingToken],
      { bypassRls: true }
    );

    if (woRes.rows.length === 0) {
      throw new WorkOrderNotFoundError('Orçamento não encontrado.', 404);
    }

    const order = woRes.rows[0];
    const depositCents = Math.max(0, order.depositRequiredCents || 0);

    if (depositCents === 0) {
      return {
        success: true,
        message: 'Este orçamento não requer sinal financeiro.',
        paidCents: order.paidCents,
        depositPaidAt: order.depositPaidAt || new Date().toISOString(),
      };
    }

    if (order.depositPaidAt) {
      return {
        success: true,
        message: 'O sinal Pix já havia sido confirmado anteriormente.',
        paidCents: order.paidCents,
        depositPaidAt: order.depositPaidAt,
      };
    }

    const newPaidCents = (order.paidCents || 0) + depositCents;
    const nowIso = new Date().toISOString();

    await tenantTransaction(order.tenantId, async (client) => {
      // 1. Atualizar work_orders
      await client.query(
        `
        UPDATE work_orders
        SET 
          paid_cents = $3,
          deposit_paid_at = NOW(),
          status = CASE WHEN status = 'QUOTE' THEN 'APPROVED' ELSE status END,
          updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2;
        `,
        [order.id, order.tenantId, newPaidCents]
      );

      // 2. Registrar pagamento
      await client.query(
        `
        INSERT INTO payments (
          tenant_id,
          work_order_id,
          amount_cents,
          method,
          status,
          notes
        ) VALUES ($1, $2, $3, 'pix', 'approved', 'Sinal Pix confirmado online');
        `,
        [order.tenantId, order.id, depositCents]
      );

      // 3. Registrar depósito
      await client.query(
        `
        INSERT INTO deposits (
          tenant_id,
          customer_id,
          work_order_id,
          amount_cents,
          method,
          status,
          applied_to_work_order_id,
          applied_at,
          notes
        ) VALUES ($1, $2, $3, $4, 'pix', 'applied', $3, NOW(), 'Sinal de orçamento aprovado online');
        `,
        [order.tenantId, order.customerId, order.id, depositCents]
      );

      // 4. Registrar evento
      await client.query(
        `
        INSERT INTO work_order_events (
          tenant_id,
          work_order_id,
          from_status,
          to_status,
          notes
        ) VALUES ($1, $2, $3, 'APPROVED', $4);
        `,
        [
          order.tenantId,
          order.id,
          order.status,
          `Sinal Pix de R$ ${(depositCents / 100).toFixed(2)} recebido com sucesso online.`,
        ]
      );
    });

    realtimeHub.publish(order.tenantId, 'work_order.updated', {
      type: 'quote.deposit_paid',
      workOrderId: order.id,
      osNumber: order.osNumber,
      amountCents: depositCents,
    });

    return {
      success: true,
      message: 'Sinal Pix liquidado com sucesso! Orçamento validado para execução.',
      paidCents: newPaidCents,
      depositPaidAt: nowIso,
    };
  }

  /**
   * Recusa do orçamento pelo cliente
   */
  async rejectPublicQuote(
    trackingToken: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const woRes = await tenantQuery<any>(
      null,
      `
      SELECT id, tenant_id AS "tenantId", os_number AS "osNumber", status
      FROM work_orders
      WHERE tracking_token = $1;
      `,
      [trackingToken],
      { bypassRls: true }
    );

    if (woRes.rows.length === 0) {
      throw new WorkOrderNotFoundError('Orçamento não encontrado.', 404);
    }

    const order = woRes.rows[0];

    await tenantQuery(
      order.tenantId,
      `
      UPDATE work_orders
      SET 
        status = 'CANCELED',
        cancel_reason = $3,
        canceled_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2;
      `,
      [order.id, order.tenantId, `Recusado pelo cliente: ${reason || 'Sem justificativa informada'}`],
      { bypassRls: true }
    );

    await tenantQuery(
      order.tenantId,
      `
      INSERT INTO work_order_events (
        tenant_id,
        work_order_id,
        from_status,
        to_status,
        notes
      ) VALUES ($1, $2, $3, 'CANCELED', $4);
      `,
      [
        order.tenantId,
        order.id,
        order.status,
        `Orçamento recusado pelo cliente: ${reason || 'Sem justificativa'}`,
      ],
      { bypassRls: true }
    );

    realtimeHub.publish(order.tenantId, 'work_order.updated', {
      type: 'quote.rejected',
      workOrderId: order.id,
      osNumber: order.osNumber,
      reason,
    });

    return {
      success: true,
      message: 'Orçamento cancelado conforme sua solicitação.',
    };
  }

  /**
   * Consulta pública de dados do Monitor TV da oficina por slug (Sem necessidade de autenticação)
   */
  async getPublicTvData(slug: string): Promise<any> {
    const cleanSlug = (slug || '').trim().toLowerCase();

    // 1. Buscar tenant e branding pelo slug
    const tenantRes = await tenantQuery<any>(
      null,
      `
      SELECT 
        t.id, t.slug, t.trade_name AS "tradeName",
        tb.logo_url AS "logoUrl",
        tb.primary_color AS "primaryColor",
        tb.secondary_color AS "secondaryColor"
      FROM tenants t
      LEFT JOIN tenant_branding tb ON tb.tenant_id = t.id
      WHERE LOWER(t.slug) = $1 AND t.status IN ('active', 'trialing')
      LIMIT 1;
      `,
      [cleanSlug],
      { bypassRls: true }
    );

    if (tenantRes.rows.length === 0) {
      throw new WorkOrderNotFoundError('Oficina não encontrada para exibição da TV.', 404);
    }

    const tenant = tenantRes.rows[0];

    // 2. Buscar ordens de serviço em produção do tenant (CHECKED_IN, IN_PROGRESS, QA, READY)
    const ordersRes = await tenantQuery<any>(
      null,
      `
      SELECT 
        wo.id,
        wo.os_number AS "osNumber",
        wo.status,
        wo.progress,
        wo.is_rework AS "isRework",
        wo.started_at AS "startedAt",
        wo.scheduled_at AS "scheduledAt",
        wo.estimated_minutes AS "estimatedMinutes",
        wo.updated_at AS "updatedAt",
        v.plate AS "vehiclePlate",
        v.brand AS "vehicleBrand",
        v.model AS "vehicleModel",
        v.color AS "vehicleColor",
        v.size_class AS "vehicleSizeClass",
        c.name AS "customerName",
        u.name AS "technicianName"
      FROM work_orders wo
      JOIN vehicles v ON v.id = wo.vehicle_id
      LEFT JOIN customers c ON c.id = wo.customer_id
      LEFT JOIN users u ON u.id = wo.technician_id
      WHERE wo.tenant_id = $1
        AND wo.status IN ('CHECKED_IN', 'IN_PROGRESS', 'QA', 'READY')
      ORDER BY 
        CASE WHEN wo.is_rework = true THEN 0 ELSE 1 END,
        CASE wo.status 
          WHEN 'IN_PROGRESS' THEN 1
          WHEN 'QA' THEN 2
          WHEN 'CHECKED_IN' THEN 3
          WHEN 'READY' THEN 4
          ELSE 5
        END,
        wo.updated_at DESC
      LIMIT 50;
      `,
      [tenant.id],
      { bypassRls: true }
    );

    // Buscar os serviços de cada ordem
    const orderIds = ordersRes.rows.map((r: any) => r.id);
    const itemsByOrder: Record<string, string[]> = {};

    if (orderIds.length > 0) {
      const itemsRes = await tenantQuery<any>(
        null,
        `
        SELECT work_order_id AS "workOrderId", name
        FROM work_order_items
        WHERE work_order_id = ANY($1)
        ORDER BY custom_order ASC, created_at ASC;
        `,
        [orderIds],
        { bypassRls: true }
      );

      for (const item of itemsRes.rows) {
        if (!itemsByOrder[item.workOrderId]) {
          itemsByOrder[item.workOrderId] = [];
        }
        itemsByOrder[item.workOrderId].push(item.name);
      }
    }

    const workOrders = ordersRes.rows.map((row: any) => ({
      id: row.id,
      os_number: row.osNumber,
      status: row.status,
      progress: row.progress || 0,
      is_rework: Boolean(row.isRework),
      started_at: row.startedAt,
      scheduled_at: row.scheduledAt,
      estimated_minutes: row.estimatedMinutes,
      vehicle: {
        plate: row.vehiclePlate,
        brand: row.vehicleBrand,
        model: row.vehicleModel,
        color: row.vehicleColor,
        size: row.vehicleSizeClass,
      },
      customer: {
        name: row.customerName,
      },
      technician: row.technicianName ? { name: row.technicianName } : null,
      services: itemsByOrder[row.id] || [],
    }));

    return {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.tradeName,
        trade_name: tenant.tradeName,
        logoUrl: tenant.logoUrl,
        logo_url: tenant.logoUrl,
        youtubeId: null,
        youtube_id: null,
        primaryColor: tenant.primaryColor || '#E63946',
        secondaryColor: tenant.secondaryColor || '#1D3557',
        monitorBgColor: '#0E1116',
      },
      workOrders,
    };
  }

  /**
   * Compartilhamento de Proposta / Orçamento via WhatsApp
   * - Se o plano tiver WHATSAPP_GATEWAY ativo e a loja estiver conectada: envia direto pelo socket da loja
   * - Se for plano básico ou desconectado: gera o link manual wa.me (custo zero de servidor)
   */
  async sendQuoteWhatsApp(
    tenantId: string,
    workOrderId: string,
    originUrl = 'http://localhost:5173'
  ): Promise<{ success: boolean; mode: 'gateway' | 'manual'; whatsappUrl?: string; message: string }> {
    const order = await this.getById(tenantId, workOrderId);
    const trackingToken = order.trackingToken;
    const publicUrl = `${originUrl}/proposta/${trackingToken}`;

    const customerPhone = (order.customer as any)?.phone?.replace(/\D/g, '') || '';
    const customerName = (order.customer as any)?.name || 'Cliente';
    const vehicleDesc = `${(order.vehicle as any)?.brand || ''} ${(order.vehicle as any)?.model || ''} (${(order.vehicle as any)?.plate || ''})`.trim();

    const textMessage = `Olá, ${customerName}! 🚗\n\nSegue a proposta detalhada para o seu veículo ${vehicleDesc}:\n👉 ${publicUrl}\n\nVocê pode revisar os serviços e aprovar diretamente pelo link. Qualquer dúvida, estamos à disposição!`;

    // Checar se o plano do tenant possui WHATSAPP_GATEWAY
    const hasGatewayFeature = await planService.hasFeature(tenantId, PlanFeatures.WHATSAPP_GATEWAY);

    if (hasGatewayFeature && customerPhone) {
      try {
        const instance = await whatsappService.getInstance(tenantId);
        if (instance.status === 'CONNECTED') {
          await whatsappService.sendMessage(tenantId, {
            to: customerPhone,
            message: textMessage,
          });

          return {
            success: true,
            mode: 'gateway',
            message: 'Orçamento enviado com sucesso pelo WhatsApp oficial da oficina!',
          };
        }
      } catch (err: any) {
        // Fallback silencioso para wa.me manual se o gateway falhar
      }
    }

    // Modo Manual (WhatsApp Web) — compatível com Plano Essencial / Sem custos
    const encodedText = encodeURIComponent(textMessage);
    const phoneParam = customerPhone ? `55${customerPhone}` : '';
    const manualUrl = phoneParam 
      ? `https://wa.me/${phoneParam}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    return {
      success: true,
      mode: 'manual',
      whatsappUrl: manualUrl,
      message: 'Link manual do WhatsApp preparado para envio.',
    };
  }

  /**
   * T6.4 — Notificação Transacional por WhatsApp sobre o Evento da OS
   * - Respeita o plano da oficina: se não possui WHATSAPP_GATEWAY, retorna link manual wa.me
   * - Se possui plano com gateway e está conectada: envia diretamente pelo número da loja
   * - Registra evento na linha do tempo da OS se enviado pelo gateway
   */
  async notifyWorkOrderWhatsApp(
    tenantId: string,
    workOrderId: string,
    eventType: WhatsAppTransactionalEventType,
    customMessage?: string,
    originUrl = 'http://localhost:5173'
  ): Promise<SendTransactionalWhatsAppResultDto> {
    const order = await this.getById(tenantId, workOrderId);
    const customerPhone = (order.customer as any)?.phone || '';
    const customerName = (order.customer as any)?.name || 'Cliente';
    const vehicleText = `${(order.vehicle as any)?.brand || ''} ${(order.vehicle as any)?.model || ''} (${(order.vehicle as any)?.plate || ''})`.trim();
    const trackingUrl = order.trackingToken ? `${originUrl}/proposta/${order.trackingToken}` : undefined;
    const balanceCents = Math.max(0, (order.finalCents || order.totalCents || 0) - (order.paidCents || 0));

    const result = await whatsappService.dispatchTransactionalNotification(tenantId, {
      toPhone: customerPhone,
      customerName,
      eventType,
      vehicleText,
      osNumber: order.osNumber,
      trackingUrl,
      balanceCents,
      customMessage,
    });

    if (result.success && result.mode === 'gateway') {
      await tenantQuery(
        tenantId,
        `
        INSERT INTO work_order_events (
          tenant_id,
          work_order_id,
          from_status,
          to_status,
          event_type,
          notes,
          metadata
        ) VALUES ($1, $2, $3, $4, 'WHATSAPP_NOTIFICATION', $5, $6);
        `,
        [
          tenantId,
          order.id,
          order.status,
          order.status,
          `Notificação automática de WhatsApp (${eventType}) enviada para o cliente.`,
          JSON.stringify({ to: customerPhone, eventType, mode: 'gateway' }),
        ]
      );
    }

    return result;
  }

  // ============================================================================
  // T6.3 — PIX INTEGRADO PARA ORDENS DE SERVIÇO & CONCILIAÇÃO ATÔMICA
  // ============================================================================

  /**
   * Cria uma cobrança Pix dinâmico para liquidação/pagamento de OS no caixa
   */
  async createPixCharge(
    tenantId: string,
    workOrderId: string,
    requestedAmountCents?: number,
    userId?: string
  ): Promise<WorkOrderPixChargeResultDto> {
    const orderRes = await tenantQuery<any>(
      tenantId,
      `
      SELECT 
        wo.id,
        wo.os_number,
        wo.status,
        wo.final_cents,
        wo.paid_cents,
        t.legal_name,
        t.trade_name,
        t.cnpj,
        t.email,
        t.settings
      FROM work_orders wo
      JOIN tenants t ON t.id = wo.tenant_id
      WHERE wo.id = $1 AND wo.tenant_id = $2;
      `,
      [workOrderId, tenantId]
    );

    if (orderRes.rows.length === 0) {
      throw new WorkOrderNotFoundError('Ordem de serviço não encontrada.');
    }

    const order = orderRes.rows[0];
    if (order.status === 'CANCELED') {
      throw new WorkOrderStateError('Não é possível gerar cobrança para uma ordem de serviço cancelada.');
    }

    const finalCents = order.final_cents || 0;
    const currentPaidCents = order.paid_cents || 0;
    const remainingBalanceCents = Math.max(0, finalCents - currentPaidCents);

    if (remainingBalanceCents <= 0) {
      throw new WorkOrderStateError('Esta ordem de serviço já se encontra totalmente quitada.');
    }

    const chargeAmountCents = requestedAmountCents
      ? Math.min(requestedAmountCents, remainingBalanceCents)
      : remainingBalanceCents;

    if (chargeAmountCents <= 0) {
      throw new WorkOrderStateError('O valor da cobrança Pix deve ser maior que zero.');
    }

    // Configurações de Pix do Tenant
    const settings = order.settings || {};
    const pixKey = settings.pix_key || order.email || 'pix@carx.com.br';
    const pixKeyType = (settings.pix_key_type as any) || (pixKey.includes('@') ? 'email' : 'random');
    const merchantName = (order.trade_name || order.legal_name || 'CarX Oficina').slice(0, 25);
    const merchantCity = (settings.city || 'Sao Paulo').slice(0, 15);

    // Identificador único de transação padrão Bacen (txid)
    const txid = `CX${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString('hex').toUpperCase()}`;

    // Gera o payload Bacen EMV oficial e QR Code Base64
    const pix = await generatePixPayload({
      pixKey,
      pixKeyType,
      merchantName,
      merchantCity,
      amountCents: chargeAmountCents,
      txid,
    });

    // Registra cobrança pendente na tabela payments e atualiza last_txid na OS
    const validUserId = (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))
      ? userId
      : null;

    await tenantQuery(
      tenantId,
      `
      INSERT INTO payments (
        tenant_id,
        work_order_id,
        amount_cents,
        method,
        status,
        transaction_reference,
        notes,
        received_by
      ) VALUES ($1, $2, $3, 'pix', 'pending', $4, $5, $6);
      `,
      [
        tenantId,
        workOrderId,
        chargeAmountCents,
        txid,
        `Cobrança Pix gerada para OS #${order.os_number}`,
        validUserId,
      ]
    );

    await tenantQuery(
      tenantId,
      `UPDATE work_orders SET pix_last_txid = $1, updated_at = NOW() WHERE id = $2;`,
      [txid, workOrderId]
    );

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    realtimeHub.publish(tenantId, 'work_order.updated', {
      type: 'pix.charge_created',
      workOrderId,
      osNumber: order.os_number,
      amountCents: chargeAmountCents,
      txid,
      remainingBalanceCents,
    });

    return {
      workOrderId: order.id,
      osNumber: order.os_number,
      amountCents: chargeAmountCents,
      pixCode: pix.pixCode,
      pixQrBase64: pix.qrCodeBase64,
      txid,
      remainingBalanceCents,
      expiresAt,
    };
  }

  /**
   * Confirma e liquida instantaneamente um pagamento Pix via Webhook / Conciliação
   */
  async confirmPixPayment(
    txid: string,
    amountCentsOverride?: number,
    e2eId?: string,
    payerName?: string
  ): Promise<WorkOrderPixStatusResultDto> {
    const paymentRes = await tenantQuery<any>(
      null,
      `
      SELECT 
        p.id AS "paymentId",
        p.tenant_id AS "tenantId",
        p.work_order_id AS "workOrderId",
        p.amount_cents AS "amountCents",
        p.status AS "paymentStatus",
        wo.os_number AS "osNumber",
        wo.final_cents AS "finalCents",
        wo.paid_cents AS "paidCents",
        wo.status AS "orderStatus"
      FROM payments p
      JOIN work_orders wo ON wo.id = p.work_order_id AND wo.tenant_id = p.tenant_id
      WHERE p.transaction_reference = $1
      LIMIT 1;
      `,
      [txid],
      { bypassRls: true }
    );

    if (paymentRes.rows.length === 0) {
      throw new WorkOrderNotFoundError(`Cobrança Pix com txid "${txid}" não encontrada.`);
    }

    const pay = paymentRes.rows[0];
    const tenantId = pay.tenantId;
    const workOrderId = pay.workOrderId;
    const finalCents = pay.finalCents || 0;
    const currentPaidCents = pay.paidCents || 0;

    // Idempotência estrita: se já aprovado, retorna o status sem duplicar pagamento
    if (pay.paymentStatus === 'approved') {
      const isFullyPaid = currentPaidCents >= finalCents;
      return {
        workOrderId,
        osNumber: pay.osNumber,
        txid,
        status: 'approved',
        paidCents: currentPaidCents,
        finalCents,
        isFullyPaid,
      };
    }

    const settledAmountCents = amountCentsOverride || pay.amountCents;
    const newPaidCents = currentPaidCents + settledAmountCents;
    const isFullyPaid = newPaidCents >= finalCents;

    // Se o carro estava pronto no pátio (READY) e foi 100% quitado, avança para DELIVERED
    let newOrderStatus = pay.orderStatus;
    if (isFullyPaid && pay.orderStatus === 'READY') {
      newOrderStatus = 'DELIVERED';
    }

    await tenantTransaction(tenantId, async (client) => {
      // 1. Atualiza pagamento para aprovado
      const noteSuffix = payerName ? ` | Pagador: ${payerName}` : '';
      const refSuffix = e2eId ? ` | E2E: ${e2eId}` : '';
      await client.query(
        `
        UPDATE payments
        SET 
          status = 'approved',
          notes = COALESCE(notes, '') || $2,
          updated_at = NOW()
        WHERE id = $1;
        `,
        [pay.paymentId, ` | Pix recebido instantaneamente${noteSuffix}${refSuffix}`]
      );

      // 2. Atualiza saldo pago e status da OS
      await client.query(
        `
        UPDATE work_orders
        SET 
          paid_cents = $2,
          status = $3::varchar,
          delivered_at = CASE WHEN $3::varchar = 'DELIVERED' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
          updated_at = NOW()
        WHERE id = $1;
        `,
        [workOrderId, newPaidCents, newOrderStatus]
      );

      // 3. Registra evento histórico na OS
      await client.query(
        `
        INSERT INTO work_order_events (
          tenant_id,
          work_order_id,
          from_status,
          to_status,
          event_type,
          notes,
          metadata
        ) VALUES ($1, $2, $3, $4, 'PAYMENT_RECEIVED', $5, $6);
        `,
        [
          tenantId,
          workOrderId,
          pay.orderStatus,
          newOrderStatus,
          `Pagamento Pix de R$ ${(settledAmountCents / 100).toFixed(2)} liquidado instantaneamente.`,
          JSON.stringify({ txid, e2eId, payerName, amountCents: settledAmountCents }),
        ]
      );
    });

    // 4. Emite eventos em tempo real no canal do Tenant
    realtimeHub.publish(tenantId, 'work_order.updated', {
      type: 'pix.payment_confirmed',
      workOrderId,
      osNumber: pay.osNumber,
      amountCents: settledAmountCents,
      paidCents: newPaidCents,
      finalCents,
      isFullyPaid,
      txid,
    });

    realtimeHub.publish(tenantId, 'payment.received', {
      workOrderId,
      osNumber: pay.osNumber,
      amountCents: settledAmountCents,
      method: 'pix',
      txid,
      payerName: payerName || null,
    });

    if (isFullyPaid) {
      fiscalService.autoIssueIfConfigured(tenantId, workOrderId, 'payment').catch(() => {});
    }

    return {
      workOrderId,
      osNumber: pay.osNumber,
      txid,
      status: 'approved',
      paidCents: newPaidCents,
      finalCents,
      isFullyPaid,
      paidAt: new Date().toISOString(),
    };
  }

  /**
   * Consulta status de uma cobrança Pix específica
   */
  async getPixStatus(
    tenantId: string,
    workOrderId: string,
    txid: string
  ): Promise<WorkOrderPixStatusResultDto> {
    const res = await tenantQuery<any>(
      tenantId,
      `
      SELECT 
        p.status AS "paymentStatus",
        p.updated_at AS "updatedAt",
        wo.os_number AS "osNumber",
        wo.final_cents AS "finalCents",
        wo.paid_cents AS "paidCents"
      FROM payments p
      JOIN work_orders wo ON wo.id = p.work_order_id AND wo.tenant_id = p.tenant_id
      WHERE p.tenant_id = $1 AND p.work_order_id = $2 AND p.transaction_reference = $3
      LIMIT 1;
      `,
      [tenantId, workOrderId, txid]
    );

    if (res.rows.length === 0) {
      throw new WorkOrderNotFoundError('Cobrança Pix não encontrada para esta ordem de serviço.');
    }

    const row = res.rows[0];
    const finalCents = row.finalCents || 0;
    const paidCents = row.paidCents || 0;

    return {
      workOrderId,
      osNumber: row.osNumber,
      txid,
      status: row.paymentStatus,
      paidCents,
      finalCents,
      isFullyPaid: paidCents >= finalCents,
      paidAt: row.paymentStatus === 'approved' ? row.updatedAt : null,
    };
  }
}

export const workOrderService = new WorkOrderService();

