import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerDto,
  VehicleDto,
  normalizePhone,
  cleanDocument,
  validateCpf,
  validateCnpj,
} from '@carx/shared';

export interface CustomerWithVehicles extends CustomerDto {
  vehicles: VehicleDto[];
}

export interface ListCustomersParams {
  search?: string;
  document?: string;
  phone?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export class CustomerError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'CustomerError';
    this.statusCode = statusCode;
  }
}

export class CustomerService {
  /**
   * Listagem paginada de clientes com busca textual no servidor
   */
  async list(
    tenantId: string,
    params: ListCustomersParams = {}
  ): Promise<{ customers: CustomerDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['c.tenant_id = $1'];
    const queryParams: unknown[] = [tenantId];

    if (params.isActive !== undefined) {
      queryParams.push(params.isActive);
      conditions.push(`c.is_active = $${queryParams.length}`);
    }

    if (params.document) {
      const cleanDoc = cleanDocument(params.document);
      queryParams.push(cleanDoc);
      conditions.push(`c.document = $${queryParams.length}`);
    }

    if (params.phone) {
      const cleanPh = cleanDocument(params.phone);
      queryParams.push(`%${cleanPh}%`);
      conditions.push(`c.phone ILIKE $${queryParams.length}`);
    }

    if (params.search) {
      const searchTerms = `%${params.search.trim().toLowerCase()}%`;
      const searchDoc = `%${cleanDocument(params.search)}%`;
      queryParams.push(searchTerms);
      const searchIdx = queryParams.length;

      queryParams.push(searchDoc);
      const docIdx = queryParams.length;

      conditions.push(
        `(LOWER(c.name) LIKE $${searchIdx} OR c.email ILIKE $${searchIdx} OR c.phone ILIKE $${searchIdx} OR c.document LIKE $${docIdx})`
      );
    }

    const whereClause = conditions.join(' AND ');

    // Total para paginação
    const countRes = await tenantQuery<{ count: string }>(
      tenantId,
      `SELECT COUNT(*) AS count FROM customers c WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Listagem ordenada por criação recente
    queryParams.push(limit);
    const limitIdx = queryParams.length;
    queryParams.push(offset);
    const offsetIdx = queryParams.length;

    const listRes = await tenantQuery<CustomerDto>(
      tenantId,
      `SELECT 
         c.id,
         c.tenant_id AS "tenantId",
         c.name,
         c.document,
         c.document_type AS "documentType",
         c.phone,
         c.phone_raw AS "phoneRaw",
         c.email,
         c.address_street AS "addressStreet",
         c.address_number AS "addressNumber",
         c.address_complement AS "addressComplement",
         c.address_neighborhood AS "addressNeighborhood",
         c.address_city AS "addressCity",
         c.address_state AS "addressState",
         c.address_zip_code AS "addressZipCode",
         c.notes,
         c.is_active AS "isActive",
         c.created_at AS "createdAt",
         c.updated_at AS "updatedAt"
       FROM customers c
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      queryParams
    );

    return {
      customers: listRes.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Consulta cliente por ID com seus veículos associados
   */
  async getById(tenantId: string, id: string): Promise<CustomerWithVehicles> {
    const customerRes = await tenantQuery<CustomerDto>(
      tenantId,
      `SELECT 
         c.id,
         c.tenant_id AS "tenantId",
         c.name,
         c.document,
         c.document_type AS "documentType",
         c.phone,
         c.phone_raw AS "phoneRaw",
         c.email,
         c.address_street AS "addressStreet",
         c.address_number AS "addressNumber",
         c.address_complement AS "addressComplement",
         c.address_neighborhood AS "addressNeighborhood",
         c.address_city AS "addressCity",
         c.address_state AS "addressState",
         c.address_zip_code AS "addressZipCode",
         c.notes,
         c.is_active AS "isActive",
         c.created_at AS "createdAt",
         c.updated_at AS "updatedAt"
       FROM customers c
       WHERE c.id = $1 AND c.tenant_id = $2
       LIMIT 1`,
      [id, tenantId]
    );

    if (customerRes.rows.length === 0) {
      throw new CustomerError(`Cliente "${id}" não encontrado nesta oficina.`, 404);
    }

    const customer = customerRes.rows[0];

    // Buscar veículos do cliente
    const vehiclesRes = await tenantQuery<VehicleDto>(
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
         v.updated_at AS "updatedAt"
       FROM vehicles v
       WHERE v.customer_id = $1 AND v.tenant_id = $2 AND v.is_active = true
       ORDER BY v.created_at DESC`,
      [id, tenantId]
    );

    return {
      ...customer,
      vehicles: vehiclesRes.rows,
    };
  }

  /**
   * Cria novo cliente com validação de duplicidade por oficina e normalização E.164
   */
  async create(tenantId: string, input: CreateCustomerDto, userId?: string): Promise<CustomerDto> {
    if (!input.name || input.name.trim().length < 2) {
      throw new CustomerError('O nome do cliente é obrigatório e deve ter no mínimo 2 caracteres.', 400);
    }

    if (!input.phone || input.phone.trim().length < 8) {
      throw new CustomerError('O telefone de contato é obrigatório.', 400);
    }

    const normalizedPhone = normalizePhone(input.phone);
    const cleanDoc = input.document ? cleanDocument(input.document) : null;
    let documentType = input.documentType || 'cpf';

    if (cleanDoc) {
      if (cleanDoc.length === 11) {
        documentType = 'cpf';
        if (!validateCpf(cleanDoc)) {
          throw new CustomerError('O CPF informado é inválido.', 400);
        }
      } else if (cleanDoc.length === 14) {
        documentType = 'cnpj';
        if (!validateCnpj(cleanDoc)) {
          throw new CustomerError('O CNPJ informado é inválido.', 400);
        }
      }
    }

    // 1. Detecção de duplicidade por oficina (Mesmo tenant)
    // Clientes em outras oficinas não geram conflito!
    if (cleanDoc) {
      const existingDoc = await tenantQuery<{ id: string; name: string }>(
        tenantId,
        'SELECT id, name FROM customers WHERE tenant_id = $1 AND document = $2 AND is_active = true LIMIT 1',
        [tenantId, cleanDoc]
      );
      if (existingDoc.rows.length > 0) {
        throw new CustomerError(
          `Já existe um cliente ativo cadastrado nesta oficina com este documento (${existingDoc.rows[0].name}).`,
          409
        );
      }
    }

    const existingPhone = await tenantQuery<{ id: string; name: string }>(
      tenantId,
      'SELECT id, name FROM customers WHERE tenant_id = $1 AND phone = $2 AND is_active = true LIMIT 1',
      [tenantId, normalizedPhone]
    );
    if (existingPhone.rows.length > 0) {
      throw new CustomerError(
        `Já existe um cliente ativo cadastrado nesta oficina com este telefone (${existingPhone.rows[0].name}).`,
        409
      );
    }

    const insertRes = await tenantQuery<CustomerDto>(
      tenantId,
      `INSERT INTO customers (
         tenant_id,
         name,
         document,
         document_type,
         phone,
         phone_raw,
         email,
         address_street,
         address_number,
         address_complement,
         address_neighborhood,
         address_city,
         address_state,
         address_zip_code,
         notes,
         is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
       RETURNING 
         id,
         tenant_id AS "tenantId",
         name,
         document,
         document_type AS "documentType",
         phone,
         phone_raw AS "phoneRaw",
         email,
         address_street AS "addressStreet",
         address_number AS "addressNumber",
         address_complement AS "addressComplement",
         address_neighborhood AS "addressNeighborhood",
         address_city AS "addressCity",
         address_state AS "addressState",
         address_zip_code AS "addressZipCode",
         notes,
         is_active AS "isActive",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [
        tenantId,
        input.name.trim(),
        cleanDoc,
        documentType,
        normalizedPhone,
        input.phone.trim(),
        input.email?.trim().toLowerCase() || null,
        input.addressStreet?.trim() || null,
        input.addressNumber?.trim() || null,
        input.addressComplement?.trim() || null,
        input.addressNeighborhood?.trim() || null,
        input.addressCity?.trim() || null,
        input.addressState?.trim().toUpperCase() || null,
        input.addressZipCode?.trim() || null,
        input.notes?.trim() || null,
      ]
    );

    const newCustomer = insertRes.rows[0];

    // Auditoria Imutável
    await auditService.record({
      tenantId,
      userId,
      action: 'CUSTOMER_CREATED',
      entity: 'customers',
      entityId: newCustomer.id,
      newValues: newCustomer as unknown as Record<string, unknown>,
    });

    return newCustomer;
  }

  /**
   * Atualização de dados cadastrais de cliente com auditoria
   */
  async update(
    tenantId: string,
    id: string,
    input: UpdateCustomerDto,
    userId?: string
  ): Promise<CustomerDto> {
    const current = await this.getById(tenantId, id);

    let normalizedPhone = current.phone;
    let phoneRaw = current.phoneRaw;
    if (input.phone) {
      normalizedPhone = normalizePhone(input.phone);
      phoneRaw = input.phone.trim();

      // Checar se o novo telefone colide com outro cliente da mesma oficina
      if (normalizedPhone !== current.phone) {
        const conflict = await tenantQuery<{ id: string }>(
          tenantId,
          'SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2 AND id != $3 AND is_active = true LIMIT 1',
          [tenantId, normalizedPhone, id]
        );
        if (conflict.rows.length > 0) {
          throw new CustomerError('Já existe outro cliente nesta oficina utilizando este telefone.', 409);
        }
      }
    }

    let cleanDoc = current.document;
    let documentType = current.documentType;
    if (input.document !== undefined) {
      cleanDoc = input.document ? cleanDocument(input.document) : null;
      if (cleanDoc) {
        if (cleanDoc.length === 11) {
          documentType = 'cpf';
          if (!validateCpf(cleanDoc)) throw new CustomerError('CPF inválido.', 400);
        } else if (cleanDoc.length === 14) {
          documentType = 'cnpj';
          if (!validateCnpj(cleanDoc)) throw new CustomerError('CNPJ inválido.', 400);
        }

        if (cleanDoc !== current.document) {
          const conflict = await tenantQuery<{ id: string }>(
            tenantId,
            'SELECT id FROM customers WHERE tenant_id = $1 AND document = $2 AND id != $3 AND is_active = true LIMIT 1',
            [tenantId, cleanDoc, id]
          );
          if (conflict.rows.length > 0) {
            throw new CustomerError('Já existe outro cliente nesta oficina utilizando este documento.', 409);
          }
        }
      }
    }

    const updateRes = await tenantQuery<CustomerDto>(
      tenantId,
      `UPDATE customers SET
         name = COALESCE($1, name),
         document = $2,
         document_type = $3,
         phone = $4,
         phone_raw = $5,
         email = COALESCE($6, email),
         address_street = COALESCE($7, address_street),
         address_number = COALESCE($8, address_number),
         address_complement = COALESCE($9, address_complement),
         address_neighborhood = COALESCE($10, address_neighborhood),
         address_city = COALESCE($11, address_city),
         address_state = COALESCE($12, address_state),
         address_zip_code = COALESCE($13, address_zip_code),
         notes = COALESCE($14, notes),
         is_active = COALESCE($15, is_active),
         updated_at = NOW()
       WHERE id = $16 AND tenant_id = $17
       RETURNING 
         id,
         tenant_id AS "tenantId",
         name,
         document,
         document_type AS "documentType",
         phone,
         phone_raw AS "phoneRaw",
         email,
         address_street AS "addressStreet",
         address_number AS "addressNumber",
         address_complement AS "addressComplement",
         address_neighborhood AS "addressNeighborhood",
         address_city AS "addressCity",
         address_state AS "addressState",
         address_zip_code AS "addressZipCode",
         notes,
         is_active AS "isActive",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [
        input.name ? input.name.trim() : null,
        cleanDoc,
        documentType,
        normalizedPhone,
        phoneRaw,
        input.email !== undefined ? (input.email ? input.email.trim().toLowerCase() : null) : null,
        input.addressStreet !== undefined ? input.addressStreet?.trim() || null : null,
        input.addressNumber !== undefined ? input.addressNumber?.trim() || null : null,
        input.addressComplement !== undefined ? input.addressComplement?.trim() || null : null,
        input.addressNeighborhood !== undefined ? input.addressNeighborhood?.trim() || null : null,
        input.addressCity !== undefined ? input.addressCity?.trim() || null : null,
        input.addressState !== undefined ? input.addressState?.trim().toUpperCase() || null : null,
        input.addressZipCode !== undefined ? input.addressZipCode?.trim() || null : null,
        input.notes !== undefined ? input.notes?.trim() || null : null,
        input.isActive !== undefined ? input.isActive : null,
        id,
        tenantId,
      ]
    );

    const updated = updateRes.rows[0];

    await auditService.record({
      tenantId,
      userId,
      action: 'CUSTOMER_UPDATED',
      entity: 'customers',
      entityId: id,
      oldValues: current as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Exclusão segura de cliente (soft delete) com preservação de histórico
   */
  async delete(tenantId: string, id: string, userId?: string): Promise<{ success: boolean; message: string }> {
    const current = await this.getById(tenantId, id);

    // Se tiver veículos vinculados, desativa com soft-delete
    await tenantQuery(
      tenantId,
      'UPDATE customers SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    await auditService.record({
      tenantId,
      userId,
      action: 'CUSTOMER_DEACTIVATED',
      entity: 'customers',
      entityId: id,
      oldValues: { isActive: true },
      newValues: { isActive: false },
    });

    return { success: true, message: `Cliente "${current.name}" desativado com sucesso.` };
  }
}

export const customerService = new CustomerService();
