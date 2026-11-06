import { tenantQuery } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleDto,
  CustomerDto,
  normalizePlate,
  validatePlate,
} from '@carx/shared';

export interface VehicleWithCustomer extends VehicleDto {
  customer: CustomerDto;
}

export interface ListVehiclesParams {
  search?: string;
  customerId?: string;
  plate?: string;
  brand?: string;
  model?: string;
  sizeClass?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export class VehicleError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'VehicleError';
    this.statusCode = statusCode;
  }
}

export class VehicleService {
  /**
   * Listagem paginada de veículos da oficina com busca textual
   */
  async list(
    tenantId: string,
    params: ListVehiclesParams = {}
  ): Promise<{ vehicles: Array<VehicleDto & { customerName?: string; customerPhone?: string }>; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['v.tenant_id = $1'];
    const queryParams: unknown[] = [tenantId];

    if (params.isActive !== undefined) {
      queryParams.push(params.isActive);
      conditions.push(`v.is_active = $${queryParams.length}`);
    }

    if (params.customerId) {
      queryParams.push(params.customerId);
      conditions.push(`v.customer_id = $${queryParams.length}`);
    }

    if (params.plate) {
      const cleanPlate = normalizePlate(params.plate);
      queryParams.push(`%${cleanPlate}%`);
      conditions.push(`v.plate ILIKE $${queryParams.length}`);
    }

    if (params.brand) {
      queryParams.push(`%${params.brand.trim()}%`);
      conditions.push(`v.brand ILIKE $${queryParams.length}`);
    }

    if (params.sizeClass) {
      queryParams.push(params.sizeClass);
      conditions.push(`v.size_class = $${queryParams.length}`);
    }

    if (params.search) {
      const term = `%${params.search.trim().toLowerCase()}%`;
      const cleanPlateTerm = `%${normalizePlate(params.search)}%`;
      queryParams.push(term);
      const termIdx = queryParams.length;

      queryParams.push(cleanPlateTerm);
      const plateIdx = queryParams.length;

      conditions.push(
        `(v.plate LIKE $${plateIdx} OR LOWER(v.model) LIKE $${termIdx} OR LOWER(v.brand) LIKE $${termIdx} OR LOWER(c.name) LIKE $${termIdx})`
      );
    }

    const whereClause = conditions.join(' AND ');

    // Contagem total
    const countRes = await tenantQuery<{ count: string }>(
      tenantId,
      `SELECT COUNT(*) AS count 
       FROM vehicles v
       JOIN customers c ON c.id = v.customer_id
       WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Listagem paginada com dados do cliente proprietário
    queryParams.push(limit);
    const limitIdx = queryParams.length;
    queryParams.push(offset);
    const offsetIdx = queryParams.length;

    const listRes = await tenantQuery<VehicleDto & { customerName: string; customerPhone: string }>(
      tenantId,
      `SELECT 
         v.id,
         v.tenant_id AS "tenantId",
         v.customer_id AS "customerId",
         v.plate,
         v.plate_raw AS "plateRaw",
         v.brand,
         v.model,
         v.year,
         v.color,
         v.size_class AS "sizeClass",
         v.vin,
         v.current_km AS "currentKm",
         v.notes,
         v.is_active AS "isActive",
         v.created_at AS "createdAt",
         v.updated_at AS "updatedAt",
         c.name AS "customerName",
         c.phone AS "customerPhone"
       FROM vehicles v
       JOIN customers c ON c.id = v.customer_id
       WHERE ${whereClause}
       ORDER BY v.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      queryParams
    );

    return {
      vehicles: listRes.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Consulta veículo por ID anexando dados completos do proprietário
   */
  async getById(tenantId: string, id: string): Promise<VehicleWithCustomer> {
    const vehicleRes = await tenantQuery<VehicleDto & {
      customerName: string;
      customerPhone: string;
      customerEmail: string | null;
      customerDocument: string | null;
    }>(
      tenantId,
      `SELECT 
         v.id,
         v.tenant_id AS "tenantId",
         v.customer_id AS "customerId",
         v.plate,
         v.plate_raw AS "plateRaw",
         v.brand,
         v.model,
         v.year,
         v.color,
         v.size_class AS "sizeClass",
         v.vin,
         v.current_km AS "currentKm",
         v.notes,
         v.is_active AS "isActive",
         v.created_at AS "createdAt",
         v.updated_at AS "updatedAt",
         c.name AS "customerName",
         c.phone AS "customerPhone",
         c.email AS "customerEmail",
         c.document AS "customerDocument"
       FROM vehicles v
       JOIN customers c ON c.id = v.customer_id
       WHERE v.id = $1 AND v.tenant_id = $2
       LIMIT 1`,
      [id, tenantId]
    );

    if (vehicleRes.rows.length === 0) {
      throw new VehicleError(`Veículo "${id}" não encontrado nesta oficina.`, 404);
    }

    const row = vehicleRes.rows[0];

    return {
      id: row.id,
      tenantId: row.tenantId,
      customerId: row.customerId,
      plate: row.plate,
      plateRaw: row.plateRaw,
      brand: row.brand,
      model: row.model,
      year: row.year,
      color: row.color,
      sizeClass: row.sizeClass,
      vin: row.vin,
      currentKm: row.currentKm,
      notes: row.notes,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: {
        id: row.customerId,
        tenantId: row.tenantId,
        name: row.customerName,
        phone: row.customerPhone,
        email: row.customerEmail,
        document: row.customerDocument,
      },
    };
  }

  /**
   * Consulta veículo por Placa dentro da oficina atual
   */
  async getByPlate(tenantId: string, plate: string): Promise<VehicleWithCustomer | null> {
    const normalized = normalizePlate(plate);
    if (!normalized) return null;

    const res = await tenantQuery<{ id: string }>(
      tenantId,
      'SELECT id FROM vehicles WHERE tenant_id = $1 AND plate = $2 LIMIT 1',
      [tenantId, normalized]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return this.getById(tenantId, res.rows[0].id);
  }

  /**
   * Cadastro de veículo com Placa Única POR OFICINA (Multitenant Real)
   */
  async create(tenantId: string, input: CreateVehicleDto, userId?: string): Promise<VehicleDto> {
    if (!input.customerId) {
      throw new VehicleError('O cliente proprietário do veículo é obrigatório.', 400);
    }

    if (!input.plate) {
      throw new VehicleError('A placa do veículo é obrigatória.', 400);
    }

    const normalizedPlate = normalizePlate(input.plate);
    if (!validatePlate(normalizedPlate)) {
      throw new VehicleError(
        `A placa "${input.plate}" não possui formato automotivo válido (padrão tradicional ABC1234 ou Mercosul ABC1D23).`,
        400
      );
    }

    if (!input.brand || input.brand.trim().length < 2) {
      throw new VehicleError('A marca/fabricante do veículo é obrigatória.', 400);
    }

    if (!input.model || input.model.trim().length < 2) {
      throw new VehicleError('O modelo do veículo é obrigatório.', 400);
    }

    // 1. Validar se o cliente pertence à oficina atual (RLS)
    const customerCheck = await tenantQuery<{ id: string }>(
      tenantId,
      'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2 AND is_active = true LIMIT 1',
      [input.customerId, tenantId]
    );
    if (customerCheck.rows.length === 0) {
      throw new VehicleError('O cliente informado não existe ou não pertence a esta oficina.', 404);
    }

    // 2. CRITÉRIO ESSENCIAL T3.1: Verificar unicidade de placa EXCLUSIVA POR OFICINA
    // Duas oficinas distintas podem cadastrar a mesma placa sem qualquer impedimento!
    const existingPlateInSameTenant = await tenantQuery<{ id: string; model: string }>(
      tenantId,
      'SELECT id, model FROM vehicles WHERE tenant_id = $1 AND plate = $2 AND is_active = true LIMIT 1',
      [tenantId, normalizedPlate]
    );

    if (existingPlateInSameTenant.rows.length > 0) {
      throw new VehicleError(
        `O veículo com placa "${normalizedPlate}" (${existingPlateInSameTenant.rows[0].model}) já está cadastrado nesta oficina.`,
        409
      );
    }

    const sizeClass = input.sizeClass || 'sedan';

    const insertRes = await tenantQuery<VehicleDto>(
      tenantId,
      `INSERT INTO vehicles (
         tenant_id,
         customer_id,
         plate,
         plate_raw,
         brand,
         model,
         year,
         color,
         size_class,
         vin,
         current_km,
         notes,
         is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
       RETURNING 
         id,
         tenant_id AS "tenantId",
         customer_id AS "customerId",
         plate,
         plate_raw AS "plateRaw",
         brand,
         model,
         year,
         color,
         size_class AS "sizeClass",
         vin,
         current_km AS "currentKm",
         notes,
         is_active AS "isActive",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [
        tenantId,
        input.customerId,
        normalizedPlate,
        input.plate.trim(),
        input.brand.trim(),
        input.model.trim(),
        input.year || null,
        input.color?.trim() || null,
        sizeClass,
        input.vin ? input.vin.trim().toUpperCase() : null,
        input.currentKm || 0,
        input.notes?.trim() || null,
      ]
    );

    const newVehicle = insertRes.rows[0];

    await auditService.record({
      tenantId,
      userId,
      action: 'VEHICLE_CREATED',
      entity: 'vehicles',
      entityId: newVehicle.id,
      newValues: newVehicle as unknown as Record<string, unknown>,
    });

    return newVehicle;
  }

  /**
   * Atualização de dados cadastrais do veículo com auditoria
   */
  async update(
    tenantId: string,
    id: string,
    input: UpdateVehicleDto,
    userId?: string
  ): Promise<VehicleDto> {
    const current = await this.getById(tenantId, id);

    let normalizedPlate = current.plate;
    let plateRaw = current.plateRaw;
    if (input.plate) {
      normalizedPlate = normalizePlate(input.plate);
      if (!validatePlate(normalizedPlate)) {
        throw new VehicleError('Formato de placa inválido.', 400);
      }
      plateRaw = input.plate.trim();

      // Checar se a nova placa colide com outro veículo DA MESMA OFICINA
      if (normalizedPlate !== current.plate) {
        const conflict = await tenantQuery<{ id: string }>(
          tenantId,
          'SELECT id FROM vehicles WHERE tenant_id = $1 AND plate = $2 AND id != $3 AND is_active = true LIMIT 1',
          [tenantId, normalizedPlate, id]
        );
        if (conflict.rows.length > 0) {
          throw new VehicleError(`A placa "${normalizedPlate}" já está em uso por outro veículo nesta oficina.`, 409);
        }
      }
    }

    if (input.customerId && input.customerId !== current.customerId) {
      const custCheck = await tenantQuery<{ id: string }>(
        tenantId,
        'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2 AND is_active = true LIMIT 1',
        [input.customerId, tenantId]
      );
      if (custCheck.rows.length === 0) {
        throw new VehicleError('O novo cliente proprietário informado não existe nesta oficina.', 404);
      }
    }

    const updateRes = await tenantQuery<VehicleDto>(
      tenantId,
      `UPDATE vehicles SET
         customer_id = COALESCE($1, customer_id),
         plate = $2,
         plate_raw = $3,
         brand = COALESCE($4, brand),
         model = COALESCE($5, model),
         year = COALESCE($6, year),
         color = COALESCE($7, color),
         size_class = COALESCE($8, size_class),
         vin = COALESCE($9, vin),
         current_km = COALESCE($10, current_km),
         notes = COALESCE($11, notes),
         is_active = COALESCE($12, is_active),
         updated_at = NOW()
       WHERE id = $13 AND tenant_id = $14
       RETURNING 
         id,
         tenant_id AS "tenantId",
         customer_id AS "customerId",
         plate,
         plate_raw AS "plateRaw",
         brand,
         model,
         year,
         color,
         size_class AS "sizeClass",
         vin,
         current_km AS "currentKm",
         notes,
         is_active AS "isActive",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [
        input.customerId || null,
        normalizedPlate,
        plateRaw,
        input.brand ? input.brand.trim() : null,
        input.model ? input.model.trim() : null,
        input.year !== undefined ? input.year : null,
        input.color !== undefined ? (input.color ? input.color.trim() : null) : null,
        input.sizeClass || null,
        input.vin !== undefined ? (input.vin ? input.vin.trim().toUpperCase() : null) : null,
        input.currentKm !== undefined ? input.currentKm : null,
        input.notes !== undefined ? (input.notes ? input.notes.trim() : null) : null,
        input.isActive !== undefined ? input.isActive : null,
        id,
        tenantId,
      ]
    );

    const updated = updateRes.rows[0];

    await auditService.record({
      tenantId,
      userId,
      action: 'VEHICLE_UPDATED',
      entity: 'vehicles',
      entityId: id,
      oldValues: current as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Exclusão segura de veículo com histórico preservado
   */
  async delete(tenantId: string, id: string, userId?: string): Promise<{ success: boolean; message: string }> {
    const current = await this.getById(tenantId, id);

    await tenantQuery(
      tenantId,
      'UPDATE vehicles SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    await auditService.record({
      tenantId,
      userId,
      action: 'VEHICLE_DEACTIVATED',
      entity: 'vehicles',
      entityId: id,
      oldValues: { isActive: true },
      newValues: { isActive: false },
    });

    return { success: true, message: `Veículo "${current.plate}" (${current.model}) desativado com sucesso.` };
  }
}

export const vehicleService = new VehicleService();
