import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import { realtimeHub } from '../realtime/realtime-hub.js';
import {
  BayDto,
  CreateBayInputDto,
  UpdateBayInputDto,
  AppointmentDto,
  CreateAppointmentInputDto,
  UpdateAppointmentInputDto,
  AppointmentStatus,
  PublicBookingInputDto,
  PublicBookingResponseDto,
  BayAvailabilitySlotDto,
  normalizePhone,
  normalizePlate,
  validatePlate,
  VehicleSizeClassType,
  VEHICLE_SIZE_DURATION_MULTIPLIERS,
  CalculateDurationInputDto,
  CalculatedDurationResultDto,
  SmartAppointmentDto,
  SmartBayOverviewDto,
  SmartScheduleOverviewResponseDto,
} from '@carx/shared';

export class BayConflictError extends Error {
  statusCode: number;
  conflictingAppointment?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  };

  constructor(
    message: string,
    conflictingAppointment?: {
      id: string;
      title: string;
      startTime: string;
      endTime: string;
    }
  ) {
    super(message);
    this.name = 'BayConflictError';
    this.statusCode = 409;
    this.conflictingAppointment = conflictingAppointment;
  }
}

export class TechnicianConflictError extends Error {
  statusCode: number;
  conflictingAppointment?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  };

  constructor(
    message: string,
    conflictingAppointment?: {
      id: string;
      title: string;
      startTime: string;
      endTime: string;
    }
  ) {
    super(message);
    this.name = 'TechnicianConflictError';
    this.statusCode = 409;
    this.conflictingAppointment = conflictingAppointment;
  }
}

export class BayDuplicateNameError extends Error {
  statusCode: number;
  constructor(message = 'Já existe um box com este nome nesta oficina.', statusCode = 409) {
    super(message);
    this.name = 'BayDuplicateNameError';
    this.statusCode = statusCode;
  }
}

export class BayNotFoundError extends Error {
  statusCode: number;
  constructor(message = 'Box de atendimento não encontrado.', statusCode = 404) {
    super(message);
    this.name = 'BayNotFoundError';
    this.statusCode = statusCode;
  }
}

export class AppointmentNotFoundError extends Error {
  statusCode: number;
  constructor(message = 'Agendamento não encontrado.', statusCode = 404) {
    super(message);
    this.name = 'AppointmentNotFoundError';
    this.statusCode = statusCode;
  }
}

export class AppointmentValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppointmentValidationError';
    this.statusCode = statusCode;
  }
}

export class BotDetectedError extends Error {
  statusCode: number;
  constructor(message = 'Requisição bloqueada pelo sistema de proteção anti-bot.', statusCode = 400) {
    super(message);
    this.name = 'BotDetectedError';
    this.statusCode = statusCode;
  }
}

export class AppointmentService {
  // ============================================================================
  // 1. BOXES DE ATENDIMENTO FÍSICOS (BAYS)
  // ============================================================================

  /**
   * Lista os boxes físicos de atendimento da oficina
   */
  async listBays(tenantId: string, options: { activeOnly?: boolean } = {}): Promise<BayDto[]> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (options.activeOnly) {
      conditions.push('is_active = true');
    }

    const sql = `
      SELECT 
        id,
        tenant_id AS "tenantId",
        name,
        description,
        color,
        order_index AS "orderIndex",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM bays
      WHERE ${conditions.join(' AND ')}
      ORDER BY order_index ASC, name ASC;
    `;

    const res = await tenantQuery<BayDto>(tenantId, sql, params);

    // Auto-provisiona os 3 boxes canônicos se a oficina não possuir boxes cadastrados
    if (res.rows.length === 0) {
      const defaultBays = [
        { name: 'Box 1 · Principal', color: '#C8F52E', orderIndex: 0 },
        { name: 'Box 2 · Secundário', color: '#CDEBFB', orderIndex: 1 },
        { name: 'Box 3 · Rápido', color: '#E8EEF4', orderIndex: 2 },
      ];
      for (const b of defaultBays) {
        try {
          await tenantQuery(
            tenantId,
            `INSERT INTO bays (tenant_id, name, color, order_index, is_active)
             VALUES ($1, $2, $3, $4, true)
             ON CONFLICT (tenant_id, name) DO NOTHING;`,
            [tenantId, b.name, b.color, b.orderIndex]
          );
        } catch {
          // ignora conflitos em concorrência
        }
      }
      const reQuery = await tenantQuery<BayDto>(tenantId, sql, params);
      return reQuery.rows;
    }

    return res.rows;
  }

  /**
   * Busca um box pelo identificador
   */
  async getBayById(tenantId: string, bayId: string): Promise<BayDto | null> {
    const sql = `
      SELECT 
        id,
        tenant_id AS "tenantId",
        name,
        description,
        color,
        order_index AS "orderIndex",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM bays
      WHERE tenant_id = $1 AND id = $2;
    `;

    const res = await tenantQuery<BayDto>(tenantId, sql, [tenantId, bayId]);
    return res.rows[0] || null;
  }

  /**
   * Cria um novo box físico
   */
  async createBay(tenantId: string, input: CreateBayInputDto, actorUserId?: string): Promise<BayDto> {
    const nameTrimmed = input.name.trim();

    // Validar duplicidade de nome no mesmo tenant
    const dupCheck = await tenantQuery(
      tenantId,
      'SELECT id FROM bays WHERE tenant_id = $1 AND LOWER(name) = LOWER($2);',
      [tenantId, nameTrimmed]
    );

    if (dupCheck.rows.length > 0) {
      throw new BayDuplicateNameError(`Já existe um box com o nome "${nameTrimmed}" nesta oficina.`);
    }

    const sql = `
      INSERT INTO bays (
        tenant_id,
        name,
        description,
        color,
        order_index,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        tenant_id AS "tenantId",
        name,
        description,
        color,
        order_index AS "orderIndex",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `;

    const res = await tenantQuery<BayDto>(tenantId, sql, [
      tenantId,
      nameTrimmed,
      input.description || null,
      input.color || '#C8F52E',
      input.orderIndex || 0,
      input.isActive !== undefined ? input.isActive : true,
    ]);

    const created = res.rows[0];

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'BAY_CREATED',
        entity: 'bays',
        entityId: created.id,
        newValues: created as unknown as Record<string, unknown>,
      });
    }

    return created;
  }

  /**
   * Atualiza dados de um box
   */
  async updateBay(
    tenantId: string,
    bayId: string,
    input: UpdateBayInputDto,
    actorUserId?: string
  ): Promise<BayDto> {
    const existing = await this.getBayById(tenantId, bayId);
    if (!existing) {
      throw new BayNotFoundError();
    }

    if (input.name && input.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const dupCheck = await tenantQuery(
        tenantId,
        'SELECT id FROM bays WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND id != $3;',
        [tenantId, input.name.trim(), bayId]
      );
      if (dupCheck.rows.length > 0) {
        throw new BayDuplicateNameError(`Já existe um box com o nome "${input.name.trim()}" nesta oficina.`);
      }
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [tenantId, bayId];

    if (input.name !== undefined) {
      params.push(input.name.trim());
      updates.push(`name = $${params.length}`);
    }
    if (input.description !== undefined) {
      params.push(input.description);
      updates.push(`description = $${params.length}`);
    }
    if (input.color !== undefined) {
      params.push(input.color);
      updates.push(`color = $${params.length}`);
    }
    if (input.orderIndex !== undefined) {
      params.push(input.orderIndex);
      updates.push(`order_index = $${params.length}`);
    }
    if (input.isActive !== undefined) {
      params.push(input.isActive);
      updates.push(`is_active = $${params.length}`);
    }

    const sql = `
      UPDATE bays
      SET ${updates.join(', ')}
      WHERE tenant_id = $1 AND id = $2
      RETURNING 
        id,
        tenant_id AS "tenantId",
        name,
        description,
        color,
        order_index AS "orderIndex",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `;

    const res = await tenantQuery<BayDto>(tenantId, sql, params);
    const updated = res.rows[0];

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'BAY_UPDATED',
        entity: 'bays',
        entityId: bayId,
        oldValues: existing as unknown as Record<string, unknown>,
        newValues: updated as unknown as Record<string, unknown>,
      });
    }

    return updated;
  }

  /**
   * Remove um box físico
   */
  async deleteBay(tenantId: string, bayId: string, actorUserId?: string): Promise<boolean> {
    const existing = await this.getBayById(tenantId, bayId);
    if (!existing) {
      throw new BayNotFoundError();
    }

    await tenantQuery(tenantId, 'DELETE FROM bays WHERE tenant_id = $1 AND id = $2;', [tenantId, bayId]);

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'BAY_DELETED',
        entity: 'bays',
        entityId: bayId,
        oldValues: existing as unknown as Record<string, unknown>,
      });
    }

    return true;
  }

  // ============================================================================
  // 2. DETECÇÃO E PREVENÇÃO DE CONFLITO DE HORÁRIOS
  // ============================================================================

  /**
   * Valida se existe conflito temporal no mesmo box.
   * Regra matemática: dois intervalos [A_start, A_end] e [B_start, B_end] se sobrepõem se:
   * (A_start < B_end) AND (A_end > B_start)
   * Agendamentos cancelados ou no-show são desconsiderados.
   */
  async checkBayConflict(
    tenantId: string,
    bayId: string,
    startTime: Date | string,
    endTime: Date | string,
    excludeAppointmentId?: string
  ): Promise<void> {
    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();

    const sql = `
      SELECT 
        a.id, 
        a.title, 
        a.start_time AS "startTime", 
        a.end_time AS "endTime",
        b.name AS "bayName"
      FROM appointments a
      LEFT JOIN bays b ON b.id = a.bay_id AND b.tenant_id = a.tenant_id
      WHERE a.tenant_id = $1
        AND a.bay_id = $2
        AND a.status NOT IN ('canceled', 'no_show')
        AND a.start_time < $4
        AND a.end_time > $3
        AND ($5::uuid IS NULL OR a.id != $5)
      LIMIT 1;
    `;

    const res = await tenantQuery<{
      id: string;
      title: string;
      startTime: string;
      endTime: string;
      bayName: string;
    }>(tenantId, sql, [tenantId, bayId, startIso, endIso, excludeAppointmentId || null]);

    if (res.rows.length > 0) {
      const conflict = res.rows[0];
      const bayName = conflict.bayName || 'selecionado';
      const formattedStart = new Date(conflict.startTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const formattedEnd = new Date(conflict.endTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      throw new BayConflictError(
        `Choque de horário: O box "${bayName}" já possui o agendamento "${conflict.title}" reservado das ${formattedStart} às ${formattedEnd}.`,
        {
          id: conflict.id,
          title: conflict.title,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
        }
      );
    }
  }

  /**
   * Valida se existe conflito temporal para o mesmo técnico/profissional.
   * Regra matemática: dois intervalos [A_start, A_end] e [B_start, B_end] se sobrepõem se:
   * (A_start < B_end) AND (A_end > B_start)
   * Agendamentos cancelados ou no-show são desconsiderados.
   */
  async checkTechnicianConflict(
    tenantId: string,
    technicianId: string,
    startTime: Date | string,
    endTime: Date | string,
    excludeAppointmentId?: string
  ): Promise<void> {
    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();

    const sql = `
      SELECT 
        a.id, 
        a.title, 
        a.start_time AS "startTime", 
        a.end_time AS "endTime",
        u.name AS "technicianName"
      FROM appointments a
      INNER JOIN users u ON u.id = a.technician_id
      WHERE a.tenant_id = $1
        AND a.technician_id = $2
        AND a.status NOT IN ('canceled', 'no_show')
        AND a.start_time < $4
        AND a.end_time > $3
        AND ($5::uuid IS NULL OR a.id != $5)
      LIMIT 1;
    `;

    const res = await tenantQuery<{
      id: string;
      title: string;
      startTime: string;
      endTime: string;
      technicianName: string;
    }>(tenantId, sql, [tenantId, technicianId, startIso, endIso, excludeAppointmentId || null]);

    if (res.rows.length > 0) {
      const conflict = res.rows[0];
      const techName = conflict.technicianName || 'Profissional';
      const formattedStart = new Date(conflict.startTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const formattedEnd = new Date(conflict.endTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      throw new TechnicianConflictError(
        `Choque de horário: O profissional "${techName}" já possui o agendamento "${conflict.title}" reservado das ${formattedStart} às ${formattedEnd}.`,
        {
          id: conflict.id,
          title: conflict.title,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
        }
      );
    }
  }

  /**
   * Cálculo inteligente de duração por porte veicular e serviços
   * Aplica calibrações de `service_prices_by_class` ou os multiplicadores padrão da tabela automotiva.
   */
  async calculateEstimatedDuration(
    tenantId: string,
    input: CalculateDurationInputDto
  ): Promise<CalculatedDurationResultDto> {
    const sizeClass = input.sizeClass || 'sedan';
    const multiplier = VEHICLE_SIZE_DURATION_MULTIPLIERS[sizeClass] || 1.0;

    let baseMinutes = input.baseMinutes || 0;
    const details: Array<{ serviceId: string; serviceName: string; minutes: number }> = [];

    if (input.serviceIds && input.serviceIds.length > 0) {
      const sql = `
        SELECT 
          s.id,
          s.name,
          COALESCE(sp.estimated_minutes, s.estimated_minutes, 60) AS "estimatedMinutes"
        FROM services s
        LEFT JOIN service_prices_by_class sp 
          ON sp.service_id = s.id 
         AND sp.tenant_id = s.tenant_id 
         AND sp.size_class = $2
        WHERE s.tenant_id = $1 
          AND s.id = ANY($3::uuid[]);
      `;

      const res = await tenantQuery<{
        id: string;
        name: string;
        estimatedMinutes: number;
      }>(tenantId, sql, [tenantId, sizeClass, input.serviceIds]);

      let servicesMinutes = 0;
      for (const row of res.rows) {
        servicesMinutes += row.estimatedMinutes;
        details.push({
          serviceId: row.id,
          serviceName: row.name,
          minutes: row.estimatedMinutes,
        });
      }

      if (servicesMinutes > 0) {
        baseMinutes = servicesMinutes;
      }
    }

    if (baseMinutes <= 0) {
      baseMinutes = 60;
    }

    const calculatedMinutes = details.length > 0
      ? baseMinutes
      : Math.round((baseMinutes * multiplier) / 15) * 15;

    const finalMinutes = Math.max(15, calculatedMinutes);

    return {
      estimatedMinutes: finalMinutes,
      baseMinutes,
      multiplier,
      sizeClass,
      details: details.length > 0 ? details : undefined,
    };
  }

  // ============================================================================
  // 3. AGENDAMENTOS INTERNOS (GESTOR / ATENDENTE)
  // ============================================================================

  /**
   * Lista agendamentos com filtros por período, box, técnico e status
   */
  async listAppointments(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      bayId?: string;
      technicianId?: string;
      status?: string;
    } = {}
  ): Promise<AppointmentDto[]> {
    const conditions: string[] = ['a.tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (filters.startDate) {
      params.push(new Date(filters.startDate).toISOString());
      conditions.push(`a.end_time >= $${params.length}`);
    }
    if (filters.endDate) {
      params.push(new Date(filters.endDate).toISOString());
      conditions.push(`a.start_time <= $${params.length}`);
    }
    if (filters.bayId) {
      params.push(filters.bayId);
      conditions.push(`a.bay_id = $${params.length}`);
    }
    if (filters.technicianId) {
      params.push(filters.technicianId);
      conditions.push(`a.technician_id = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`a.status = $${params.length}`);
    }

    const sql = `
      SELECT 
        a.id,
        a.tenant_id AS "tenantId",
        a.bay_id AS "bayId",
        b.name AS "bayName",
        a.technician_id AS "technicianId",
        u.name AS "technicianName",
        a.customer_id AS "customerId",
        a.vehicle_id AS "vehicleId",
        a.work_order_id AS "workOrderId",
        wo.os_number AS "workOrderNumber",
        wo.status AS "workOrderStatus",
        a.title,
        a.start_time AS "startTime",
        a.end_time AS "endTime",
        a.estimated_minutes AS "estimatedMinutes",
        a.status,
        a.origin,
        COALESCE(a.customer_name, c.name) AS "customerName",
        COALESCE(a.customer_phone, c.phone) AS "customerPhone",
        COALESCE(a.customer_email, c.email) AS "customerEmail",
        COALESCE(a.vehicle_plate, v.plate) AS "vehiclePlate",
        COALESCE(a.vehicle_model, v.model) AS "vehicleModel",
        COALESCE(a.vehicle_size_class, v.size_class) AS "vehicleSizeClass",
        a.service_summary AS "serviceSummary",
        a.notes,
        a.created_by AS "createdBy",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt"
      FROM appointments a
      LEFT JOIN bays b ON b.id = a.bay_id AND b.tenant_id = a.tenant_id
      LEFT JOIN users u ON u.id = a.technician_id
      LEFT JOIN customers c ON c.id = a.customer_id AND c.tenant_id = a.tenant_id
      LEFT JOIN vehicles v ON v.id = a.vehicle_id AND v.tenant_id = a.tenant_id
      LEFT JOIN work_orders wo ON wo.id = a.work_order_id AND wo.tenant_id = a.tenant_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.start_time ASC;
    `;

    const res = await tenantQuery<AppointmentDto>(tenantId, sql, params);
    return res.rows;
  }

  /**
   * Busca um agendamento por ID
   */
  async getAppointmentById(tenantId: string, appointmentId: string): Promise<AppointmentDto | null> {
    const sql = `
      SELECT 
        a.id,
        a.tenant_id AS "tenantId",
        a.bay_id AS "bayId",
        b.name AS "bayName",
        a.technician_id AS "technicianId",
        u.name AS "technicianName",
        a.customer_id AS "customerId",
        a.vehicle_id AS "vehicleId",
        a.work_order_id AS "workOrderId",
        wo.os_number AS "workOrderNumber",
        wo.status AS "workOrderStatus",
        a.title,
        a.start_time AS "startTime",
        a.end_time AS "endTime",
        a.estimated_minutes AS "estimatedMinutes",
        a.status,
        a.origin,
        COALESCE(a.customer_name, c.name) AS "customerName",
        COALESCE(a.customer_phone, c.phone) AS "customerPhone",
        COALESCE(a.customer_email, c.email) AS "customerEmail",
        COALESCE(a.vehicle_plate, v.plate) AS "vehiclePlate",
        COALESCE(a.vehicle_model, v.model) AS "vehicleModel",
        COALESCE(a.vehicle_size_class, v.size_class) AS "vehicleSizeClass",
        a.service_summary AS "serviceSummary",
        a.notes,
        a.created_by AS "createdBy",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt"
      FROM appointments a
      LEFT JOIN bays b ON b.id = a.bay_id AND b.tenant_id = a.tenant_id
      LEFT JOIN users u ON u.id = a.technician_id
      LEFT JOIN customers c ON c.id = a.customer_id AND c.tenant_id = a.tenant_id
      LEFT JOIN vehicles v ON v.id = a.vehicle_id AND v.tenant_id = a.tenant_id
      LEFT JOIN work_orders wo ON wo.id = a.work_order_id AND wo.tenant_id = a.tenant_id
      WHERE a.tenant_id = $1 AND a.id = $2;
    `;

    const res = await tenantQuery<AppointmentDto>(tenantId, sql, [tenantId, appointmentId]);
    return res.rows[0] || null;
  }

  /**
   * Criação de agendamento interno com validação anti-conflito
   */
  async createAppointment(
    tenantId: string,
    input: CreateAppointmentInputDto,
    actorUserId?: string
  ): Promise<AppointmentDto> {
    const startTime = new Date(input.startTime);
    const estimatedMinutes = Math.max(15, input.estimatedMinutes || 60);

    const endTime = input.endTime
      ? new Date(input.endTime)
      : new Date(startTime.getTime() + estimatedMinutes * 60000);

    if (endTime <= startTime) {
      throw new AppointmentValidationError('O horário de término deve ser posterior ao início.');
    }

    // Se houver box informado, validar existência e ausência de conflitos
    if (input.bayId) {
      const bay = await this.getBayById(tenantId, input.bayId);
      if (!bay) {
        throw new BayNotFoundError();
      }
      await this.checkBayConflict(tenantId, input.bayId, startTime, endTime);
    }

    // Se houver técnico informado, validar ausência de choque de horário do profissional
    if (input.technicianId) {
      await this.checkTechnicianConflict(tenantId, input.technicianId, startTime, endTime);
    }

    const sql = `
      INSERT INTO appointments (
        tenant_id,
        bay_id,
        technician_id,
        customer_id,
        vehicle_id,
        work_order_id,
        title,
        start_time,
        end_time,
        estimated_minutes,
        status,
        origin,
        customer_name,
        customer_phone,
        customer_email,
        vehicle_plate,
        vehicle_model,
        vehicle_size_class,
        service_summary,
        notes,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'INTERNAL', $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id;
    `;

    const res = await tenantQuery<{ id: string }>(tenantId, sql, [
      tenantId,
      input.bayId || null,
      input.technicianId || null,
      input.customerId || null,
      input.vehicleId || null,
      input.workOrderId || null,
      input.title.trim(),
      startTime.toISOString(),
      endTime.toISOString(),
      estimatedMinutes,
      input.status || 'scheduled',
      input.customerName || null,
      input.customerPhone || null,
      input.customerEmail || null,
      input.vehiclePlate || null,
      input.vehicleModel || null,
      input.vehicleSizeClass || null,
      input.serviceSummary || null,
      input.notes || null,
      actorUserId || null,
    ]);

    const createdId = res.rows[0].id;
    const created = (await this.getAppointmentById(tenantId, createdId))!;

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'APPOINTMENT_CREATED',
        entity: 'appointments',
        entityId: createdId,
        newValues: created as unknown as Record<string, unknown>,
      });
    }

    return created;
  }

  /**
   * Atualização de agendamento com revalidação de conflito
   */
  async updateAppointment(
    tenantId: string,
    appointmentId: string,
    input: UpdateAppointmentInputDto,
    actorUserId?: string
  ): Promise<AppointmentDto> {
    const existing = await this.getAppointmentById(tenantId, appointmentId);
    if (!existing) {
      throw new AppointmentNotFoundError();
    }

    const bayId = input.bayId !== undefined ? input.bayId : existing.bayId;
    const startTime = input.startTime ? new Date(input.startTime) : new Date(existing.startTime);
    let endTime: Date;

    if (input.endTime) {
      endTime = new Date(input.endTime);
    } else if (input.estimatedMinutes) {
      endTime = new Date(startTime.getTime() + input.estimatedMinutes * 60000);
    } else {
      endTime = new Date(existing.endTime);
    }

    if (endTime <= startTime) {
      throw new AppointmentValidationError('O horário de término deve ser posterior ao início.');
    }

    // Se houver box e os horários ou o box foram alterados, revalidar conflito
    if (bayId) {
      const bay = await this.getBayById(tenantId, bayId);
      if (!bay) {
        throw new BayNotFoundError();
      }
      await this.checkBayConflict(tenantId, bayId, startTime, endTime, appointmentId);
    }

    const technicianId = input.technicianId !== undefined ? input.technicianId : existing.technicianId;
    if (technicianId) {
      await this.checkTechnicianConflict(tenantId, technicianId, startTime, endTime, appointmentId);
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [tenantId, appointmentId];

    if (input.bayId !== undefined) {
      params.push(input.bayId);
      updates.push(`bay_id = $${params.length}`);
    }
    if (input.technicianId !== undefined) {
      params.push(input.technicianId);
      updates.push(`technician_id = $${params.length}`);
    }
    if (input.title !== undefined) {
      params.push(input.title.trim());
      updates.push(`title = $${params.length}`);
    }
    if (input.startTime !== undefined) {
      params.push(startTime.toISOString());
      updates.push(`start_time = $${params.length}`);
    }
    if (input.endTime !== undefined || input.estimatedMinutes !== undefined) {
      params.push(endTime.toISOString());
      updates.push(`end_time = $${params.length}`);
    }
    if (input.estimatedMinutes !== undefined) {
      params.push(input.estimatedMinutes);
      updates.push(`estimated_minutes = $${params.length}`);
    }
    if (input.status !== undefined) {
      params.push(input.status);
      updates.push(`status = $${params.length}`);
    }
    if (input.notes !== undefined) {
      params.push(input.notes);
      updates.push(`notes = $${params.length}`);
    }
    if (input.customerName !== undefined) {
      params.push(input.customerName);
      updates.push(`customer_name = $${params.length}`);
    }
    if (input.customerPhone !== undefined) {
      params.push(input.customerPhone);
      updates.push(`customer_phone = $${params.length}`);
    }
    if (input.vehiclePlate !== undefined) {
      params.push(input.vehiclePlate);
      updates.push(`vehicle_plate = $${params.length}`);
    }
    if (input.vehicleModel !== undefined) {
      params.push(input.vehicleModel);
      updates.push(`vehicle_model = $${params.length}`);
    }
    if (input.vehicleSizeClass !== undefined) {
      params.push(input.vehicleSizeClass);
      updates.push(`vehicle_size_class = $${params.length}`);
    }
    if (input.serviceSummary !== undefined) {
      params.push(input.serviceSummary);
      updates.push(`service_summary = $${params.length}`);
    }

    const sql = `
      UPDATE appointments
      SET ${updates.join(', ')}
      WHERE tenant_id = $1 AND id = $2;
    `;

    await tenantQuery(tenantId, sql, params);
    const updated = (await this.getAppointmentById(tenantId, appointmentId))!;

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'APPOINTMENT_UPDATED',
        entity: 'appointments',
        entityId: appointmentId,
        oldValues: existing as unknown as Record<string, unknown>,
        newValues: updated as unknown as Record<string, unknown>,
      });
    }

    // Sincronização atômica com a Ordem de Serviço associada
    if (updated.workOrderId) {
      try {
        await tenantQuery(
          tenantId,
          `UPDATE work_orders
           SET scheduled_at = $3,
               bay_id = COALESCE($4, bay_id),
               technician_id = COALESCE($5, technician_id),
               updated_at = NOW()
           WHERE tenant_id = $1 AND id = $2;`,
          [
            tenantId,
            updated.workOrderId,
            updated.startTime,
            updated.bayId || null,
            updated.technicianId || null,
          ]
        );

        realtimeHub.publish(tenantId, 'work_order.updated', {
          type: 'work_order.rescheduled',
          workOrderId: updated.workOrderId,
          scheduledAt: updated.startTime,
          bayId: updated.bayId,
          technicianId: updated.technicianId,
        });
      } catch (syncWoErr) {
        console.warn('[AppointmentService] Aviso na sincronização da OS atrelada ao agendamento:', syncWoErr);
      }
    }

    // Notificação em tempo real para a Agenda e TV Operacional
    realtimeHub.publish(tenantId, 'appointment.updated', {
      type: 'appointment.updated',
      appointmentId: updated.id,
      workOrderId: updated.workOrderId,
      bayId: updated.bayId,
      startTime: updated.startTime,
      endTime: updated.endTime,
      status: updated.status,
    });

    return updated;
  }

  /**
   * Atualização de status do agendamento (ex: canceled, confirmed, completed)
   */
  async updateAppointmentStatus(
    tenantId: string,
    appointmentId: string,
    status: AppointmentStatus,
    actorUserId?: string
  ): Promise<AppointmentDto> {
    const existing = await this.getAppointmentById(tenantId, appointmentId);
    if (!existing) {
      throw new AppointmentNotFoundError();
    }

    const sql = `
      UPDATE appointments
      SET status = $3, updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2;
    `;
    await tenantQuery(tenantId, sql, [tenantId, appointmentId, status]);

    const updated = (await this.getAppointmentById(tenantId, appointmentId))!;

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'APPOINTMENT_STATUS_CHANGED',
        entity: 'appointments',
        entityId: appointmentId,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      });
    }

    return updated;
  }

  /**
   * Consulta slots de disponibilidade por box para um determinado dia
   */
  async getBayAvailability(tenantId: string, dateStr: string): Promise<BayAvailabilitySlotDto[]> {
    const bays = await this.listBays(tenantId, { activeOnly: true });
    if (bays.length === 0) {
      return [];
    }

    const dayStart = new Date(`${dateStr}T08:00:00Z`);
    const dayEnd = new Date(`${dateStr}T18:00:00Z`);

    const appointments = await this.listAppointments(tenantId, {
      startDate: dayStart.toISOString(),
      endDate: dayEnd.toISOString(),
    });

    const slots: BayAvailabilitySlotDto[] = [];

    for (const bay of bays) {
      // Cria slots de hora em hora entre 08h e 18h
      let currentHour = new Date(dayStart);
      while (currentHour < dayEnd) {
        const nextHour = new Date(currentHour.getTime() + 60 * 60000);

        const conflict = appointments.find(
          (a) =>
            a.bayId === bay.id &&
            a.status !== 'canceled' &&
            a.status !== 'no_show' &&
            new Date(a.startTime) < nextHour &&
            new Date(a.endTime) > currentHour
        );

        slots.push({
          bayId: bay.id,
          bayName: bay.name,
          bayColor: bay.color,
          startTime: currentHour.toISOString(),
          endTime: nextHour.toISOString(),
          isAvailable: !conflict,
          conflictingAppointmentId: conflict ? conflict.id : null,
        });

        currentHour = nextHour;
      }
    }

    return slots;
  }

  /**
   * Visão inteligente da agenda com ocupação visual por box e detecção de atrasos (T6.7)
   */
  async getSmartScheduleOverview(tenantId: string, dateStr: string): Promise<SmartScheduleOverviewResponseDto> {
    const bays = await this.listBays(tenantId, { activeOnly: true });

    const finalBays: BayDto[] = bays.length > 0
      ? bays
      : [
          {
            id: 'bay-default-1',
            tenantId,
            name: 'Box 1 · Principal',
            description: null,
            color: '#C8F52E',
            orderIndex: 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'bay-default-2',
            tenantId,
            name: 'Box 2 · Secundário',
            description: null,
            color: '#CDEBFB',
            orderIndex: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    // Auto-sync retroativo de ordens de serviço agendadas que ainda não tenham registro na tabela appointments
    try {
      const unsyncedWos = await tenantQuery<{
        id: string;
        os_number: number;
        customer_id: string;
        vehicle_id: string;
        technician_id: string | null;
        scheduled_at: string;
        estimated_minutes: number;
        cust_name: string | null;
        cust_phone: string | null;
        veh_plate: string | null;
        veh_brand: string | null;
        veh_model: string | null;
        items_summary: string | null;
      }>(
        tenantId,
        `SELECT 
           wo.id,
           wo.os_number,
           wo.customer_id,
           wo.vehicle_id,
           wo.technician_id,
           wo.scheduled_at,
           wo.estimated_minutes,
           c.name AS cust_name,
           c.phone AS cust_phone,
           v.plate AS veh_plate,
           v.brand AS veh_brand,
           v.model AS veh_model,
           (SELECT STRING_AGG(name, ', ') FROM work_order_items WHERE work_order_id = wo.id) AS items_summary
         FROM work_orders wo
         LEFT JOIN customers c ON c.id = wo.customer_id
         LEFT JOIN vehicles v ON v.id = wo.vehicle_id
         WHERE wo.tenant_id = $1 
           AND wo.scheduled_at IS NOT NULL
           AND wo.status NOT IN ('QUOTE', 'CANCELED', 'CANCELADO')
           AND NOT EXISTS (
             SELECT 1 FROM appointments a 
             WHERE a.tenant_id = $1 AND a.work_order_id = wo.id
           )`,
        [tenantId]
      );

      if (unsyncedWos.rows.length > 0 && finalBays.length > 0) {
        const primaryBayId = finalBays[0].id;
        for (const row of unsyncedWos.rows) {
          const sAt = new Date(row.scheduled_at);
          const estM = row.estimated_minutes || 60;
          const eAt = new Date(sAt.getTime() + estM * 60000);
          const title = `OS #${row.os_number} · ${row.cust_name || 'Cliente'}`;
          const summary = row.items_summary || 'Serviço Automotivo';
          const vehModel = `${row.veh_brand || ''} ${row.veh_model || ''}`.trim() || null;

          await tenantQuery(
            tenantId,
            `INSERT INTO appointments (
               tenant_id, work_order_id, customer_id, vehicle_id, technician_id,
               bay_id, title, start_time, end_time, estimated_minutes,
               status, origin, service_summary, customer_name, customer_phone, vehicle_plate, vehicle_model
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled', 'INTERNAL', $11, $12, $13, $14, $15)`,
            [
              tenantId,
              row.id,
              row.customer_id,
              row.vehicle_id,
              row.technician_id || null,
              primaryBayId,
              title,
              sAt.toISOString(),
              eAt.toISOString(),
              estM,
              summary,
              row.cust_name || null,
              row.cust_phone || null,
              row.veh_plate || null,
              vehModel,
            ]
          );
        }
      }
    } catch (autoSyncErr) {
      console.warn('[SmartSchedule] Falha não-bloqueante no auto-sync de agendamentos:', autoSyncErr);
    }

    const appointments = await this.listAppointments(tenantId, {
      startDate: dayStart,
      endDate: dayEnd,
    });

    // Se houver agendamentos sem box atribuído ou órfãos, aloca visualmente no primeiro box ativo
    if (finalBays.length > 0) {
      const primaryBayId = finalBays[0].id;
      for (const a of appointments) {
        if (!a.bayId || !finalBays.some((b) => b.id === a.bayId)) {
          a.bayId = primaryBayId;
        }
      }
    }

    const now = new Date();
    let totalAppointments = appointments.length;
    let activeCount = 0;
    let delayedCount = 0;

    const smartBays: SmartBayOverviewDto[] = [];

    for (const bay of finalBays) {
      const bayApps = appointments.filter((a) => a.bayId === bay.id);

      const smartBayApps: SmartAppointmentDto[] = bayApps.map((a) => {
        const start = new Date(a.startTime);
        const end = new Date(a.endTime);
        const s = a.status.toLowerCase();

        const titleAndSummary = `${a.title} ${a.serviceSummary || ''}`.toLowerCase();
        let category: SmartAppointmentDto['category'] = 'outro';
        let statusColor = '#E8EEF4';

        if (titleAndSummary.includes('ppf')) {
          category = 'ppf';
          statusColor = '#CDEBFB';
        } else if (
          titleAndSummary.includes('insulfilm') ||
          titleAndSummary.includes('pelicula') ||
          titleAndSummary.includes('película') ||
          titleAndSummary.includes('polimento') ||
          titleAndSummary.includes('detailing') ||
          titleAndSummary.includes('vitrific')
        ) {
          category = titleAndSummary.includes('ppf') ? 'ppf' : 'insulfilm';
          statusColor = '#C8F52E';
        }

        if (s === 'scheduled' || s === 'confirmed') {
          if (category === 'outro') statusColor = '#FFE2A8';
        }

        const isPastEnd = now > end;
        const isNotFinished = s !== 'completed' && s !== 'canceled' && s !== 'no_show';
        const isDelayed = isPastEnd && isNotFinished;
        const delayMinutes = isDelayed ? Math.max(1, Math.round((now.getTime() - end.getTime()) / 60000)) : 0;

        if (isDelayed) {
          statusColor = '#FEE2E2';
          delayedCount++;
        }

        if (isNotFinished) {
          activeCount++;
        }

        return {
          ...a,
          isDelayed,
          delayMinutes,
          category,
          statusColor,
        };
      });

      const currentActive = smartBayApps.find((a) => {
        const start = new Date(a.startTime);
        const end = new Date(a.endTime);
        return now >= start && now <= end && a.status !== 'canceled' && a.status !== 'no_show';
      });

      const delayedActive = smartBayApps.find((a) => a.isDelayed);

      let occupancyStatus: SmartBayOverviewDto['occupancyStatus'] = 'free';
      if (delayedActive) {
        occupancyStatus = 'delayed';
      } else if (currentActive) {
        occupancyStatus = 'occupied';
      }

      const freeSlots: SmartBayOverviewDto['freeSlots'] = [];
      const workHours = [8, 10, 12, 14, 16];
      for (const h of workHours) {
        const slotStart = new Date(`${dateStr}T${String(h).padStart(2, '0')}:00:00Z`);
        const slotEnd = new Date(slotStart.getTime() + 120 * 60000);
        const hasCollision = smartBayApps.some((a) => {
          const aStart = new Date(a.startTime);
          const aEnd = new Date(a.endTime);
          return a.status !== 'canceled' && a.status !== 'no_show' && aStart < slotEnd && aEnd > slotStart;
        });
        if (!hasCollision) {
          freeSlots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            label: `Horário livre · ${h}h`,
          });
        }
      }

      const assignedTech = smartBayApps.find((a) => a.technicianName);

      smartBays.push({
        id: bay.id,
        name: bay.name,
        description: bay.description || null,
        color: bay.color,
        orderIndex: bay.orderIndex,
        isActive: bay.isActive,
        assignedTechnicianName: assignedTech?.technicianName || null,
        assignedTechnicianId: assignedTech?.technicianId || null,
        occupancyStatus,
        currentAppointment: currentActive || delayedActive || null,
        appointments: smartBayApps,
        freeSlots,
      });
    }

    return {
      date: dateStr,
      bays: smartBays,
      totalAppointments,
      activeCount,
      delayedCount,
    };
  }

  // ============================================================================
  // 4. AGENDAMENTO ONLINE PÚBLICO (COM CRITÉRIO DE ACEITE ESTREITO)
  // ============================================================================

  /**
   * Endpoint de agendamento público:
   * - Aceita apenas campos seguros
   * - Proteção anti-bot (honeypot)
   * - Duração calculada conforme o porte do veículo e serviços
   * - Prevenção estrita de choque de horário no box
   * - Cria OS com status 'QUOTE', origem 'ONLINE', 'paidCents: 0' e 'technicianId: null'
   */
  async bookOnline(tenantSlugOrId: string, input: PublicBookingInputDto): Promise<PublicBookingResponseDto> {
    // 1. Proteção anti-bot via honeypot
    if (input.website && input.website.trim().length > 0) {
      throw new BotDetectedError();
    }

    // 2. Resolução do Tenant por Slug ou UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tenantSlugOrId
    );
    const tenantQueryRes = await tenantQuery<{ id: string; trade_name: string; slug: string; status: string }>(
      null,
      isUuid
        ? 'SELECT id, trade_name, slug, status FROM tenants WHERE id = $1;'
        : 'SELECT id, trade_name, slug, status FROM tenants WHERE slug = $1;',
      [tenantSlugOrId],
      { bypassRls: true }
    );

    if (tenantQueryRes.rows.length === 0 || tenantQueryRes.rows[0].status !== 'active') {
      throw new AppointmentValidationError('Oficina não encontrada ou inativa para agendamentos online.', 404);
    }

    const tenant = tenantQueryRes.rows[0];
    const tenantId = tenant.id;

    // 3. Normalização e validação de contatos automotivos
    const cleanPhone = normalizePhone(input.customerPhone);
    const cleanPlate = normalizePlate(input.vehiclePlate);

    if (!validatePlate(cleanPlate)) {
      throw new AppointmentValidationError('Placa do veículo informada é inválida (formatos aceitos: ABC1234 ou ABC1D23).');
    }

    const sizeClass = (input.vehicleSizeClass || 'sedan') as VehicleSizeClassType;

    // 4. Buscar serviços selecionados e calcular tempo e orçamento por porte
    if (!input.serviceIds || input.serviceIds.length === 0) {
      throw new AppointmentValidationError('Selecione ao menos um serviço para agendar.');
    }

    const servicesSql = `
      SELECT 
        s.id,
        s.name,
        s.category,
        COALESCE(sp.price_cents, s.price_cents) AS "priceCents",
        COALESCE(sp.estimated_minutes, s.estimated_minutes) AS "estimatedMinutes",
        COALESCE(sp.warranty_months, s.warranty_months) AS "warrantyMonths"
      FROM services s
      LEFT JOIN service_prices_by_class sp 
        ON sp.service_id = s.id 
       AND sp.tenant_id = s.tenant_id 
       AND sp.size_class = $2
      WHERE s.tenant_id = $1 
        AND s.id = ANY($3::uuid[])
        AND s.is_active = true;
    `;

    const servicesRes = await tenantQuery<{
      id: string;
      name: string;
      category: string;
      priceCents: number;
      estimatedMinutes: number;
      warrantyMonths: number;
    }>(tenantId, servicesSql, [tenantId, sizeClass, input.serviceIds]);

    if (servicesRes.rows.length === 0) {
      throw new AppointmentValidationError('Nenhum dos serviços selecionados está ativo ou disponível nesta oficina.');
    }

    let totalEstimatedMinutes = 0;
    let totalCents = 0;
    const serviceNames: string[] = [];

    for (const s of servicesRes.rows) {
      totalEstimatedMinutes += s.estimatedMinutes || 60;
      totalCents += s.priceCents || 0;
      serviceNames.push(s.name);
    }

    totalEstimatedMinutes = Math.max(30, totalEstimatedMinutes);

    const startTime = new Date(input.preferredStartTime);
    if (isNaN(startTime.getTime())) {
      throw new AppointmentValidationError('Data/hora preferencial informada é inválida.');
    }

    const endTime = new Date(startTime.getTime() + totalEstimatedMinutes * 60000);

    // 5. Alocação de Box e Verificação de Conflitos
    let targetBayId: string;
    const allBays = await this.listBays(tenantId, { activeOnly: true });

    if (allBays.length === 0) {
      // Se a oficina não possui nenhum box cadastrado, cria automaticamente o "Box 1 - Geral"
      const defaultBay = await this.createBay(tenantId, {
        name: 'Box 1 - Geral',
        description: 'Box principal de atendimento',
        color: '#C8F52E',
      });
      targetBayId = defaultBay.id;
    } else if (input.bayId) {
      const bayExists = allBays.find((b) => b.id === input.bayId);
      if (!bayExists) {
        throw new BayNotFoundError('O box solicitado não foi encontrado nesta oficina.');
      }
      await this.checkBayConflict(tenantId, input.bayId, startTime, endTime);
      targetBayId = input.bayId;
    } else {
      // Buscar o primeiro box ativo disponível sem choque de horário
      let freeBayId: string | null = null;
      for (const b of allBays) {
        try {
          await this.checkBayConflict(tenantId, b.id, startTime, endTime);
          freeBayId = b.id;
          break; // Encontrou um box livre!
        } catch {
          // Box ocupado, tentar o próximo
        }
      }

      if (!freeBayId) {
        throw new BayConflictError(
          `Todos os boxes da oficina estão ocupados no horário solicitado (${startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}). Por favor escolha outro horário.`
        );
      }
      targetBayId = freeBayId;
    }

    // 6. Transação Atômica: Cliente + Veículo + OS (QUOTE/ONLINE) + Agendamento
    let createdAppId: string;
    let createdWorkOrder: {
      id: string;
      osNumber: number;
      status: string;
      origin: string;
      trackingToken: string;
    };

    await tenantTransaction(tenantId, async (client) => {
      // A. Cliente (busca por telefone ou cria)
      const custCheck = await client.query<{ id: string }>(
        'SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2 LIMIT 1;',
        [tenantId, cleanPhone]
      );

      let customerId: string;
      if (custCheck.rows.length > 0) {
        customerId = custCheck.rows[0].id;
      } else {
        const custIns = await client.query<{ id: string }>(
          `INSERT INTO customers (tenant_id, name, phone, email)
           VALUES ($1, $2, $3, $4)
           RETURNING id;`,
          [tenantId, input.customerName.trim(), cleanPhone, input.customerEmail || null]
        );
        customerId = custIns.rows[0].id;
      }

      // B. Veículo (busca por placa única por loja ou cria)
      const vehCheck = await client.query<{ id: string }>(
        'SELECT id FROM vehicles WHERE tenant_id = $1 AND plate = $2 LIMIT 1;',
        [tenantId, cleanPlate]
      );

      let vehicleId: string;
      if (vehCheck.rows.length > 0) {
        vehicleId = vehCheck.rows[0].id;
      } else {
        const brand =
          input.vehicleBrand?.trim() ||
          input.vehicleModel.trim().split(' ')[0] ||
          'Automóvel';

        const vehIns = await client.query<{ id: string }>(
          `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, size_class)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id;`,
          [tenantId, customerId, cleanPlate, brand, input.vehicleModel.trim(), sizeClass]
        );
        vehicleId = vehIns.rows[0].id;
      }

      // C. Próximo os_number atômico
      const seqRes = await client.query<{ next_os: number }>(
        'SELECT COALESCE(MAX(os_number), 0) + 1 AS next_os FROM work_orders WHERE tenant_id = $1;',
        [tenantId]
      );
      const osNumber = seqRes.rows[0].next_os;

      // D. Inserir Work Order
      // CRITÉRIO DE ACEITE: status forçado para QUOTE, origem ONLINE, paid_cents 0, technician_id null
      const woRes = await client.query<{ id: string; os_number: number; status: string; tracking_token: string }>(
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
        ) VALUES (
          $1, $2, $3, NULL, $4, 'QUOTE', 'ONLINE', 0, $5, 0, $5, 0, $6, $7, $8, $9
        ) RETURNING id, os_number, status, tracking_token;
        `,
        [
          tenantId,
          customerId,
          vehicleId,
          osNumber,
          totalCents,
          totalEstimatedMinutes,
          startTime.toISOString(),
          `Agendamento Online recebido pelo portal público. Serviços: ${serviceNames.join(', ')}`,
          input.notes || null,
        ]
      );

      const woId = woRes.rows[0].id;
      createdWorkOrder = {
        id: woId,
        osNumber: woRes.rows[0].os_number,
        status: woRes.rows[0].status,
        origin: 'ONLINE',
        trackingToken: woRes.rows[0].tracking_token,
      };

      // E. Inserir itens da OS
      for (let i = 0; i < servicesRes.rows.length; i++) {
        const s = servicesRes.rows[i];
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
          ) VALUES ($1, $2, $3, $4, $5, 1, $6, 0, $6, $7, $8, $9);
          `,
          [
            tenantId,
            woId,
            s.id,
            s.name,
            s.category || null,
            s.priceCents,
            s.estimatedMinutes,
            s.warrantyMonths,
            i + 1,
          ]
        );
      }

      // F. Inserir evento na timeline da OS
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
        ) VALUES ($1, $2, NULL, NULL, 'QUOTE', 'ONLINE_BOOKING', $3, $4);
        `,
        [
          tenantId,
          woId,
          `Proposta gerada automaticamente via Agendamento Online pelo cliente ${input.customerName}.`,
          JSON.stringify({
            services: serviceNames,
            totalCents,
            totalEstimatedMinutes,
            preferredStartTime: startTime.toISOString(),
          }),
        ]
      );

      // G. Inserir Appointment
      const appRes = await client.query<{ id: string }>(
        `
        INSERT INTO appointments (
          tenant_id,
          bay_id,
          technician_id,
          customer_id,
          vehicle_id,
          work_order_id,
          title,
          start_time,
          end_time,
          estimated_minutes,
          status,
          origin,
          customer_name,
          customer_phone,
          customer_email,
          vehicle_plate,
          vehicle_model,
          vehicle_size_class,
          service_summary,
          notes
        ) VALUES (
          $1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, 'scheduled', 'ONLINE', $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING id;
        `,
        [
          tenantId,
          targetBayId,
          customerId,
          vehicleId,
          woId,
          `Agendamento Online - ${input.customerName.trim()} (${cleanPlate})`,
          startTime.toISOString(),
          endTime.toISOString(),
          totalEstimatedMinutes,
          input.customerName.trim(),
          cleanPhone,
          input.customerEmail || null,
          cleanPlate,
          input.vehicleModel.trim(),
          sizeClass,
          serviceNames.join(', '),
          input.notes || null,
        ]
      );

      createdAppId = appRes.rows[0].id;
    });

    const createdAppointment = (await this.getAppointmentById(tenantId, createdAppId!))!;

    return {
      appointment: createdAppointment,
      workOrder: {
        id: createdWorkOrder!.id,
        osNumber: createdWorkOrder!.osNumber,
        status: createdWorkOrder!.status,
        origin: createdWorkOrder!.origin,
        trackingToken: createdWorkOrder!.trackingToken,
        trackingUrl: `/work-orders/tracking/${createdWorkOrder!.trackingToken}`,
      },
      message: `Agendamento pré-confirmado com sucesso! Ordem de Serviço #${createdWorkOrder!.osNumber} criada como proposta (QUOTE).`,
    };
  }
}

export const appointmentService = new AppointmentService();
