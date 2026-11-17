import { tenantQuery } from '../database/tenant-query.js';
import { inspectionService } from '../inspections/inspection-service.js';
import { workOrderService } from '../work-orders/work-order-service.js';
import { WorkOrderStatus } from '@carx/shared';
import type {
  TechnicianQueueFilterDto,
  TechnicianQueueItemDto,
  StartTimerInputDto,
  PauseTimerInputDto,
  StartWithChecklistInputDto,
  WorkOrderTimerDto,
  VehicleSizeClassType,
  SingleOfflineActionDto,
  BatchSyncResultDto,
  SyncActionResultDto,
} from '@carx/shared';

export class TechnicianError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 400, code = 'TECHNICIAN_ERROR') {
    super(message);
    this.name = 'TechnicianError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class TechnicianService {
  /**
   * Obtém a fila priorizada de Ordens de Serviço do Técnico
   */
  async getQueue(
    tenantId: string,
    technicianId: string,
    filter: TechnicianQueueFilterDto = { scope: 'mine' }
  ): Promise<TechnicianQueueItemDto[]> {
    const scope = filter.scope || 'mine';

    // Monta a query da fila com priorização:
    // 1. Retrabalhos têm prioridade máxima (is_rework = true)
    // 2. OS em andamento (IN_PROGRESS)
    // 3. Ordem de prazo prometido ou criação
    // 4. Orçamentos pendentes (QUOTE) nunca entram na fila de execução do técnico
    let whereClause = `wo.tenant_id = $1 AND wo.status NOT IN ('${WorkOrderStatus.DELIVERED}', '${WorkOrderStatus.CANCELED}', '${WorkOrderStatus.QUOTE}', '${WorkOrderStatus.QA}', '${WorkOrderStatus.READY}')`;
    const params: any[] = [tenantId];

    if (scope === 'mine') {
      params.push(technicianId);
      whereClause += ` AND wo.technician_id = $${params.length}`;
    }

    if (filter.status) {
      params.push(filter.status);
      whereClause += ` AND wo.status = $${params.length}`;
    }

    const query = `
      SELECT
        wo.id as wo_id,
        wo.os_number,
        wo.status,
        wo.is_rework,
        wo.rework_reason,
        wo.scheduled_at as promised_delivery_at,
        wo.created_at,
        v.id as vehicle_id,
        v.plate as vehicle_plate,
        v.brand as vehicle_brand,
        v.model as vehicle_model,
        v.color as vehicle_color,
        v.size_class as vehicle_size_class,
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        u.id as tech_id,
        u.name as tech_name
      FROM work_orders wo
      LEFT JOIN vehicles v ON v.id = wo.vehicle_id
      LEFT JOIN customers c ON c.id = wo.customer_id
      LEFT JOIN users u ON u.id = wo.technician_id
      WHERE ${whereClause}
      ORDER BY
        wo.is_rework DESC,
        (wo.status = '${WorkOrderStatus.IN_PROGRESS}') DESC,
        wo.scheduled_at ASC NULLS LAST,
        wo.created_at ASC;
    `;

    const res = await tenantQuery<{
      wo_id: string;
      os_number: number;
      status: string;
      is_rework: boolean;
      rework_reason: string | null;
      promised_delivery_at: string | null;
      created_at: string;
      vehicle_id: string;
      vehicle_plate: string;
      vehicle_brand: string;
      vehicle_model: string;
      vehicle_color: string | null;
      vehicle_size_class: string;
      customer_id: string;
      customer_name: string;
      customer_phone: string | null;
      tech_id: string | null;
      tech_name: string | null;
    }>(tenantId, query, params);

    const items: TechnicianQueueItemDto[] = [];

    for (const row of res.rows) {
      // 1. Serviços da OS
      const servicesRes = await tenantQuery<{
        id: string;
        service_id: string;
        service_name: string;
        estimated_minutes: number;
      }>(
        tenantId,
        `SELECT id, service_id, name as service_name, estimated_minutes
         FROM work_order_items
         WHERE tenant_id = $1 AND work_order_id = $2
         ORDER BY id ASC;`,
        [tenantId, row.wo_id]
      );

      // 2. Box alocado (se houver agendamento)
      const bayRes = await tenantQuery<{
        id: string;
        name: string;
        color: string;
      }>(
        tenantId,
        `SELECT b.id, b.name, b.color
         FROM appointments a
         JOIN bays b ON b.id = a.bay_id
         WHERE a.tenant_id = $1 AND a.work_order_id = $2 AND a.status NOT IN ('canceled', 'completed')
         LIMIT 1;`,
        [tenantId, row.wo_id]
      );

      // 3. Verifica se tem checklist de entrada preenchido
      const inspRes = await tenantQuery<{ id: string }>(
        tenantId,
        `SELECT id FROM inspections
         WHERE tenant_id = $1 AND work_order_id = $2 AND inspection_type = 'check_in'
         LIMIT 1;`,
        [tenantId, row.wo_id]
      );
      const hasCheckinInspection = inspRes.rows.length > 0;

      // 4. Timer ativo e tempo decorrido oficial calculado no banco
      const timerInfo = await this.getTimer(tenantId, row.wo_id);

      items.push({
        workOrderId: row.wo_id,
        osNumber: row.os_number,
        status: row.status,
        isRework: Boolean(row.is_rework),
        reworkReason: row.rework_reason,
        promisedDeliveryAt: row.promised_delivery_at,
        vehicle: {
          id: row.vehicle_id,
          plate: row.vehicle_plate || 'SEM PLACA',
          brand: row.vehicle_brand || '',
          model: row.vehicle_model || '',
          color: row.vehicle_color,
          sizeClass: (row.vehicle_size_class as VehicleSizeClassType) || 'sedan',
        },
        customer: {
          id: row.customer_id,
          name: row.customer_name || 'Cliente',
          phone: row.customer_phone,
        },
        bay: bayRes.rows.length > 0 ? bayRes.rows[0] : null,
        technician: row.tech_id ? { id: row.tech_id, name: row.tech_name || 'Técnico' } : null,
        services: servicesRes.rows.map((s) => ({
          id: s.id,
          serviceId: s.service_id,
          serviceName: s.service_name,
          estimatedMinutes: s.estimated_minutes,
        })),
        hasCheckinInspection,
        activeTimer: timerInfo.activeTimer,
        totalElapsedSeconds: timerInfo.totalElapsedSeconds,
        isTimerRunning: timerInfo.isTimerRunning,
        createdAt: row.created_at,
      });
    }

    return items;
  }

  /**
   * Inicia o cronômetro oficial calculado no backend
   */
  async startTimer(
    tenantId: string,
    workOrderId: string,
    technicianId: string,
    input?: StartTimerInputDto
  ): Promise<WorkOrderTimerDto> {
    // 1. Valida OS
    const woRes = await tenantQuery<{
      id: string;
      status: string;
      technician_id: string | null;
    }>(
      tenantId,
      `SELECT id, status, technician_id FROM work_orders WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
      [tenantId, workOrderId]
    );

    if (woRes.rows.length === 0) {
      throw new TechnicianError('Ordem de serviço não encontrada.', 404, 'WORK_ORDER_NOT_FOUND');
    }

    const wo = woRes.rows[0];

    // Se a OS estava em SCHEDULED, APPROVED ou CHECKED_IN, transiciona automaticamente para IN_PROGRESS
    if (
      wo.status === WorkOrderStatus.SCHEDULED ||
      wo.status === WorkOrderStatus.APPROVED ||
      wo.status === WorkOrderStatus.CHECKED_IN
    ) {
      try {
        await workOrderService.transitionStatus(
          tenantId,
          workOrderId,
          {
            status: WorkOrderStatus.IN_PROGRESS,
            notes: 'Início da execução pelo App do Técnico (cronômetro acionado).',
          },
          technicianId
        );
      } catch (err: any) {
        console.warn(`[TIMER] Falha ao transicionar status da OS: ${err.message}`);
        // Fallback direto no banco caso a transição falhe por permissão
        await tenantQuery(
          tenantId,
          `UPDATE work_orders SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, NOW()), updated_at = NOW() WHERE tenant_id = $1 AND id = $2;`,
          [tenantId, workOrderId]
        );
      }
    }

    // Se a OS ainda não tinha técnico atribuído, vincula este técnico
    if (!wo.technician_id) {
      await tenantQuery(
        tenantId,
        `UPDATE work_orders SET technician_id = $3 WHERE tenant_id = $1 AND id = $2;`,
        [tenantId, workOrderId, technicianId]
      );
    }

    // 2. Pausa qualquer outro timer rodando para este mesmo técnico (1 tarefa ativa por operador)
    await this.pauseAllRunningTimersForTechnician(tenantId, technicianId);

    // 3. Verifica se já existe um timer 'paused' para esta OS; se existir, faz resume
    const existingPaused = await tenantQuery<{ id: string }>(
      tenantId,
      `SELECT id FROM work_order_timers
       WHERE tenant_id = $1 AND work_order_id = $2 AND technician_id = $3 AND status = 'paused'
       ORDER BY created_at DESC LIMIT 1;`,
      [tenantId, workOrderId, technicianId]
    );

    if (existingPaused.rows.length > 0) {
      return this.resumeTimer(tenantId, workOrderId, technicianId);
    }

    // 4. Cria novo timer oficial com started_at = NOW() do servidor Postgres
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      service_item_id: string | null;
      technician_id: string;
      status: string;
      started_at: string;
      paused_at: string | null;
      stopped_at: string | null;
      accumulated_seconds: number;
      pause_reason: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `INSERT INTO work_order_timers (
        tenant_id,
        work_order_id,
        service_item_id,
        technician_id,
        status,
        started_at,
        accumulated_seconds,
        notes
      ) VALUES ($1, $2, $3, $4, 'running', NOW(), 0, $5)
      RETURNING *;`,
      [tenantId, workOrderId, input?.serviceItemId || null, technicianId, input?.notes || null]
    );

    const timer = res.rows[0];
    return this.mapTimerDto(timer);
  }

  /**
   * Pausa o cronômetro oficial, calculando a fatia de tempo exata no servidor
   */
  async pauseTimer(
    tenantId: string,
    workOrderId: string,
    technicianId: string,
    input?: PauseTimerInputDto
  ): Promise<WorkOrderTimerDto> {
    const active = await tenantQuery<{
      id: string;
      started_at: string;
      accumulated_seconds: number;
    }>(
      tenantId,
      `SELECT id, started_at, accumulated_seconds
       FROM work_order_timers
       WHERE tenant_id = $1 AND work_order_id = $2 AND technician_id = $3 AND status = 'running'
       ORDER BY created_at DESC LIMIT 1;`,
      [tenantId, workOrderId, technicianId]
    );

    if (active.rows.length === 0) {
      throw new TechnicianError('Nenhum cronômetro em execução encontrado para esta OS.', 404, 'NO_RUNNING_TIMER');
    }

    const t = active.rows[0];

    // Calcula os segundos decorridos entre started_at e NOW() direto no banco
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      service_item_id: string | null;
      technician_id: string;
      status: string;
      started_at: string;
      paused_at: string | null;
      stopped_at: string | null;
      accumulated_seconds: number;
      pause_reason: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `UPDATE work_order_timers
       SET status = 'paused',
           paused_at = NOW(),
           accumulated_seconds = accumulated_seconds + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER),
           pause_reason = $3,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING *;`,
      [tenantId, t.id, input?.reason || 'Pausa manual']
    );

    return this.mapTimerDto(res.rows[0]);
  }

  /**
   * Retoma a contagem oficial
   */
  async resumeTimer(
    tenantId: string,
    workOrderId: string,
    technicianId: string
  ): Promise<WorkOrderTimerDto> {
    // Pausa outros que possam estar ativos
    await this.pauseAllRunningTimersForTechnician(tenantId, technicianId);

    const paused = await tenantQuery<{ id: string }>(
      tenantId,
      `SELECT id FROM work_order_timers
       WHERE tenant_id = $1 AND work_order_id = $2 AND technician_id = $3 AND status = 'paused'
       ORDER BY created_at DESC LIMIT 1;`,
      [tenantId, workOrderId, technicianId]
    );

    if (paused.rows.length === 0) {
      throw new TechnicianError('Nenhum cronômetro pausado encontrado para retomar.', 404, 'NO_PAUSED_TIMER');
    }

    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      service_item_id: string | null;
      technician_id: string;
      status: string;
      started_at: string;
      paused_at: string | null;
      stopped_at: string | null;
      accumulated_seconds: number;
      pause_reason: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `UPDATE work_order_timers
       SET status = 'running',
           started_at = NOW(),
           paused_at = NULL,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING *;`,
      [tenantId, paused.rows[0].id]
    );

    return this.mapTimerDto(res.rows[0]);
  }

  /**
   * Finaliza o cronômetro da OS
   */
  async stopTimer(
    tenantId: string,
    workOrderId: string,
    technicianId: string
  ): Promise<WorkOrderTimerDto> {
    // 1. Tenta encontrar timer ativo do técnico; se não achar, busca qualquer timer ativo da OS
    let timerRes = await tenantQuery<{
      id: string;
      status: string;
    }>(
      tenantId,
      `SELECT id, status FROM work_order_timers
       WHERE tenant_id = $1 AND work_order_id = $2 AND technician_id = $3 AND status IN ('running', 'paused')
       ORDER BY created_at DESC LIMIT 1;`,
      [tenantId, workOrderId, technicianId]
    );

    if (timerRes.rows.length === 0) {
      timerRes = await tenantQuery<{
        id: string;
        status: string;
      }>(
        tenantId,
        `SELECT id, status FROM work_order_timers
         WHERE tenant_id = $1 AND work_order_id = $2 AND status IN ('running', 'paused')
         ORDER BY created_at DESC LIMIT 1;`,
        [tenantId, workOrderId]
      );
    }

    if (timerRes.rows.length === 0) {
      // Idempotência: se nenhum timer estiver rodando ou pausado, retorna o último registrado
      const lastCompleted = await tenantQuery<any>(
        tenantId,
        `SELECT * FROM work_order_timers
         WHERE tenant_id = $1 AND work_order_id = $2
         ORDER BY created_at DESC LIMIT 1;`,
        [tenantId, workOrderId]
      );
      if (lastCompleted.rows.length > 0) {
        return this.mapTimerDto(lastCompleted.rows[0]);
      }
      return {
        id: 'timer-completed',
        tenantId,
        workOrderId,
        serviceItemId: null,
        technicianId,
        status: 'completed',
        startedAt: new Date().toISOString(),
        pausedAt: null,
        stoppedAt: new Date().toISOString(),
        accumulatedSeconds: 0,
        elapsedSeconds: 0,
        isRunning: false,
        pauseReason: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const t = timerRes.rows[0];

    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      service_item_id: string | null;
      technician_id: string;
      status: string;
      started_at: string;
      paused_at: string | null;
      stopped_at: string | null;
      accumulated_seconds: number;
      pause_reason: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `UPDATE work_order_timers
       SET status = 'completed',
           stopped_at = NOW(),
           accumulated_seconds = CASE
             WHEN status = 'running' THEN accumulated_seconds + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER)
             ELSE accumulated_seconds
           END,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING *;`,
      [tenantId, t.id]
    );

    return this.mapTimerDto(res.rows[0]);
  }

  /**
   * Consulta o estado consolidado do cronômetro da OS com cálculo em tempo real no servidor
   * CRITÉRIO DE ACEITE: fechar o navegador no meio de um serviço não perde o tempo contado.
   */
  async getTimer(
    tenantId: string,
    workOrderId: string
  ): Promise<{
    activeTimer: WorkOrderTimerDto | null;
    totalElapsedSeconds: number;
    isTimerRunning: boolean;
  }> {
    // 1. Busca todos os timers desta OS calculando a fatia corrente de cada um
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      service_item_id: string | null;
      technician_id: string;
      status: string;
      started_at: string;
      paused_at: string | null;
      stopped_at: string | null;
      accumulated_seconds: number;
      pause_reason: string | null;
      notes: string | null;
      current_running_delta: number;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `SELECT
         wot.*,
         CASE
           WHEN wot.status = 'running' THEN GREATEST(0, EXTRACT(EPOCH FROM (NOW() - wot.started_at))::INTEGER)
           ELSE 0
         END as current_running_delta
       FROM work_order_timers wot
       WHERE wot.tenant_id = $1 AND wot.work_order_id = $2
       ORDER BY wot.created_at DESC;`,
      [tenantId, workOrderId]
    );

    let totalElapsedSeconds = 0;
    let activeTimer: WorkOrderTimerDto | null = null;
    let isTimerRunning = false;

    for (const r of res.rows) {
      const elapsed = Number(r.accumulated_seconds) + Number(r.current_running_delta);
      totalElapsedSeconds += elapsed;

      if (!activeTimer && (r.status === 'running' || r.status === 'paused')) {
        activeTimer = {
          ...this.mapTimerDto(r),
          elapsedSeconds: elapsed,
        };
        if (r.status === 'running') {
          isTimerRunning = true;
        }
      }
    }

    return {
      activeTimer,
      totalElapsedSeconds,
      isTimerRunning,
    };
  }

  /**
   * Ação inteligente: "Fazer checklist e iniciar"
   * CRITÉRIO DE ACEITE ("Nunca bloquear sem saída"): se o checklist ainda não foi feito,
   * o operador pode fazê-lo na hora sem depender do gestor e iniciar o serviço e cronômetro.
   */
  async startWithChecklist(
    tenantId: string,
    workOrderId: string,
    technicianId: string,
    input: StartWithChecklistInputDto
  ): Promise<{
    inspection: any;
    timer: WorkOrderTimerDto;
  }> {
    // 1. Localiza a OS e Veículo
    const woRes = await tenantQuery<{
      id: string;
      vehicle_id: string;
      customer_id: string;
    }>(
      tenantId,
      `SELECT id, vehicle_id, customer_id FROM work_orders WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
      [tenantId, workOrderId]
    );

    if (woRes.rows.length === 0) {
      throw new TechnicianError('Ordem de serviço não encontrada.', 404, 'WORK_ORDER_NOT_FOUND');
    }

    const wo = woRes.rows[0];

    // 2. Cria inspeção de check-in caso ainda não exista
    const existingInsp = await tenantQuery<{ id: string }>(
      tenantId,
      `SELECT id FROM inspections
       WHERE tenant_id = $1 AND work_order_id = $2 AND inspection_type = 'check_in'
       LIMIT 1;`,
      [tenantId, workOrderId]
    );

    let inspection: any = null;
    if (existingInsp.rows.length > 0) {
      inspection = await inspectionService.getInspectionById(tenantId, existingInsp.rows[0].id);
    } else {
      inspection = await inspectionService.createInspection(tenantId, {
        workOrderId,
        vehicleId: wo.vehicle_id,
        inspectorId: technicianId,
        inspectionType: 'check_in',
        vehicleType: 'car',
        currentKm: input.currentKm ?? null,
        fuelLevel: input.fuelLevel || '1/2',
        checklistItems: input.checklistItems,
        notes: input.notes || 'Checklist de entrada preenchido pelo operador no início da execução.',
      });
    }

    // 3. Inicia o cronômetro oficial imediatamente
    const timer = await this.startTimer(tenantId, workOrderId, technicianId, {
      serviceItemId: input.serviceItemId,
      notes: input.notes,
    });

    return {
      inspection,
      timer,
    };
  }

  /**
   * Marca uma OS como retrabalho
   */
  async setRework(
    tenantId: string,
    workOrderId: string,
    reworkReason: string
  ): Promise<boolean> {
    const res = await tenantQuery(
      tenantId,
      `UPDATE work_orders
       SET is_rework = true,
           rework_reason = $3,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2;`,
      [tenantId, workOrderId, reworkReason]
    );

    return (res.rowCount || 0) > 0;
  }

  /**
   * Pausa silenciosamente qualquer timer 'running' deste técnico
   */
  private async pauseAllRunningTimersForTechnician(
    tenantId: string,
    technicianId: string
  ): Promise<void> {
    await tenantQuery(
      tenantId,
      `UPDATE work_order_timers
       SET status = 'paused',
           paused_at = NOW(),
           accumulated_seconds = accumulated_seconds + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER),
           pause_reason = 'Troca de tarefa no App do Técnico',
           updated_at = NOW()
       WHERE tenant_id = $1 AND technician_id = $2 AND status = 'running';`,
      [tenantId, technicianId]
    );
  }

  /**
   * Sincroniza em lote ações capturadas offline pelo técnico no box automotivo (T6.13)
   */
  async syncOfflineActions(
    tenantId: string,
    technicianId: string,
    actions: SingleOfflineActionDto[]
  ): Promise<BatchSyncResultDto> {
    const results: SyncActionResultDto[] = [];
    let processedCount = 0;
    let failedCount = 0;

    for (const action of actions) {
      try {
        // 1. Idempotência estrita: verifica se esta ação específica já foi sincronizada
        const existingLog = await tenantQuery<{ id: string }>(
          tenantId,
          'SELECT id FROM technician_offline_sync_logs WHERE tenant_id = $1 AND action_id = $2 LIMIT 1;',
          [tenantId, action.id]
        );

        if (existingLog.rows.length > 0) {
          results.push({
            actionId: action.id,
            success: true,
            actionType: action.actionType,
            data: { alreadyProcessed: true },
          });
          processedCount++;
          continue;
        }

        // 2. Valida existência da OS no tenant
        const woCheck = await tenantQuery<{ id: string; status: string }>(
          tenantId,
          'SELECT id, status FROM work_orders WHERE id = $1 AND tenant_id = $2 LIMIT 1;',
          [action.workOrderId, tenantId]
        );

        if (woCheck.rows.length === 0) {
          throw new TechnicianError('Ordem de serviço não encontrada nesta oficina.', 404);
        }

        // 3. Processamento do tipo de ação offline
        let actionResultData: any = null;

        switch (action.actionType) {
          case 'START_TIMER': {
            await this.pauseAllRunningTimersForTechnician(tenantId, technicianId);
            const clientDate = new Date(action.clientTimestamp);
            const timerInsert = await tenantQuery<any>(
              tenantId,
              `INSERT INTO work_order_timers (
                tenant_id, work_order_id, service_item_id, technician_id,
                status, started_at, notes
              ) VALUES ($1, $2, $3, $4, 'running', $5, $6)
              RETURNING *;`,
              [
                tenantId,
                action.workOrderId,
                action.payload?.serviceItemId || null,
                technicianId,
                clientDate,
                action.payload?.notes || null,
              ]
            );

            // Atualiza status da OS para IN_PROGRESS se ainda for QUOTE ou APPROVED
            await tenantQuery(
              tenantId,
              `UPDATE work_orders 
               SET status = 'IN_PROGRESS', technician_id = COALESCE(technician_id, $1), updated_at = NOW() 
               WHERE id = $2 AND tenant_id = $3 AND status IN ('QUOTE', 'APPROVED');`,
              [technicianId, action.workOrderId, tenantId]
            );

            actionResultData = { timerId: timerInsert.rows[0]?.id };
            break;
          }

          case 'PAUSE_TIMER': {
            const runningTimer = await tenantQuery<any>(
              tenantId,
              `SELECT * FROM work_order_timers 
               WHERE tenant_id = $1 AND work_order_id = $2 AND technician_id = $3 AND status = 'running' 
               ORDER BY created_at DESC LIMIT 1;`,
              [tenantId, action.workOrderId, technicianId]
            );

            if (runningTimer.rows.length > 0) {
              const timer = runningTimer.rows[0];
              const pauseDate = new Date(action.clientTimestamp);
              const startDate = new Date(timer.started_at);
              const deltaSeconds = Math.max(0, Math.floor((pauseDate.getTime() - startDate.getTime()) / 1000));
              const newAccumulated = Number(timer.accumulated_seconds || 0) + deltaSeconds;

              await tenantQuery(
                tenantId,
                `UPDATE work_order_timers 
                 SET status = 'paused', paused_at = $1, accumulated_seconds = $2, pause_reason = $3, updated_at = NOW()
                 WHERE id = $4 AND tenant_id = $5;`,
                [pauseDate, newAccumulated, action.payload?.reason || 'Pausa offline', timer.id, tenantId]
              );
              actionResultData = { timerId: timer.id, accumulatedSeconds: newAccumulated };
            }
            break;
          }

          case 'RESUME_TIMER': {
            await this.pauseAllRunningTimersForTechnician(tenantId, technicianId);
            const resumeDate = new Date(action.clientTimestamp);
            const pausedTimer = await tenantQuery<any>(
              tenantId,
              `SELECT * FROM work_order_timers 
               WHERE tenant_id = $1 AND work_order_id = $2 AND technician_id = $3 AND status = 'paused' 
               ORDER BY created_at DESC LIMIT 1;`,
              [tenantId, action.workOrderId, technicianId]
            );

            if (pausedTimer.rows.length > 0) {
              const timer = pausedTimer.rows[0];
              await tenantQuery(
                tenantId,
                `UPDATE work_order_timers 
                 SET status = 'running', started_at = $1, paused_at = NULL, updated_at = NOW()
                 WHERE id = $2 AND tenant_id = $3;`,
                [resumeDate, timer.id, tenantId]
              );
              actionResultData = { timerId: timer.id, status: 'running' };
            }
            break;
          }

          case 'STOP_TIMER': {
            const stopDate = new Date(action.clientTimestamp);
            const activeTimer = await tenantQuery<any>(
              tenantId,
              `SELECT * FROM work_order_timers 
               WHERE tenant_id = $1 AND work_order_id = $2 AND technician_id = $3 AND status IN ('running', 'paused') 
               ORDER BY created_at DESC LIMIT 1;`,
              [tenantId, action.workOrderId, technicianId]
            );

            if (activeTimer.rows.length > 0) {
              const timer = activeTimer.rows[0];
              let addSeconds = 0;
              if (timer.status === 'running') {
                const startDate = new Date(timer.started_at);
                addSeconds = Math.max(0, Math.floor((stopDate.getTime() - startDate.getTime()) / 1000));
              }
              const totalSec = Number(timer.accumulated_seconds || 0) + addSeconds;

              await tenantQuery(
                tenantId,
                `UPDATE work_order_timers 
                 SET status = 'completed', stopped_at = $1, accumulated_seconds = $2, updated_at = NOW()
                 WHERE id = $3 AND tenant_id = $4;`,
                [stopDate, totalSec, timer.id, tenantId]
              );
              actionResultData = { timerId: timer.id, totalSeconds: totalSec };
            }
            break;
          }

          case 'UPDATE_PROGRESS': {
            const progress = Math.min(100, Math.max(0, Number(action.payload?.progress || 0)));
            await tenantQuery(
              tenantId,
              `UPDATE work_orders SET progress = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3;`,
              [progress, action.workOrderId, tenantId]
            );
            actionResultData = { progress };
            break;
          }

          case 'CHECKLIST_ITEM': {
            actionResultData = {
              itemKey: action.payload?.itemKey,
              checked: action.payload?.checked,
              notes: action.payload?.notes,
            };
            break;
          }

          case 'ADD_NOTE': {
            const noteText = action.payload?.note || '';
            if (noteText) {
              await tenantQuery(
                tenantId,
                `UPDATE work_orders 
                 SET notes = CONCAT(COALESCE(notes, ''), E'\n[Offline ' || $1 || ']: ' || $2), updated_at = NOW()
                 WHERE id = $3 AND tenant_id = $4;`,
                [action.clientTimestamp, noteText, action.workOrderId, tenantId]
              );
            }
            actionResultData = { noteAdded: true };
            break;
          }
        }

        // 4. Grava o log de sincronização idempotente
        await tenantQuery(
          tenantId,
          `INSERT INTO technician_offline_sync_logs (
            tenant_id, technician_id, action_id, work_order_id, action_type, payload, client_timestamp, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());`,
          [
            tenantId,
            technicianId,
            action.id,
            action.workOrderId,
            action.actionType,
            JSON.stringify(action.payload || {}),
            new Date(action.clientTimestamp),
          ]
        );

        results.push({
          actionId: action.id,
          success: true,
          actionType: action.actionType,
          data: actionResultData,
        });
        processedCount++;
      } catch (err: any) {
        failedCount++;
        results.push({
          actionId: action.id,
          success: false,
          actionType: action.actionType,
          error: err.message || 'Falha ao processar ação offline.',
        });
      }
    }

    return {
      total: actions.length,
      processed: processedCount,
      failed: failedCount,
      results,
      syncedAt: new Date().toISOString(),
    };
  }

  /**
   * Mapeador de Timer para DTO
   */
  private mapTimerDto(row: any): WorkOrderTimerDto {
    const isRunning = row.status === 'running';
    const acc = Number(row.accumulated_seconds || 0);

    // Se estiver rodando, calcula tempo corrente
    let currentDelta = 0;
    if (isRunning && row.started_at) {
      const startMs = new Date(row.started_at).getTime();
      const nowMs = Date.now();
      currentDelta = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      workOrderId: row.work_order_id,
      serviceItemId: row.service_item_id,
      technicianId: row.technician_id,
      technicianName: row.technician_name,
      status: row.status as any,
      startedAt: row.started_at,
      pausedAt: row.paused_at,
      stoppedAt: row.stopped_at,
      accumulatedSeconds: acc,
      elapsedSeconds: acc + currentDelta,
      pauseReason: row.pause_reason,
      notes: row.notes,
      isRunning,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const technicianService = new TechnicianService();
