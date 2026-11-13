import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import {
  CatalogServiceDto,
  CreateCatalogServiceDto,
  UpdateCatalogServiceDto,
  ServicePriceByClassDto,
  SetServicePriceInputDto,
  PackageDto,
  PackageItemDto,
  CreatePackageDto,
  UpdatePackageDto,
  CalculatePricingInputDto,
  PricingCalculationResultDto,
  CalculatedServiceItemDto,
  VehicleSizeClassType,
} from '@carx/shared';

export class CatalogPricingError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'CatalogPricingError';
    this.statusCode = statusCode;
  }
}

export interface ListServicesFilter {
  category?: string;
  segment?: string;
  isActive?: boolean;
  search?: string;
}

export class CatalogPricingService {
  // ============================================================================
  // 1. CATÁLOGO BASE DE SERVIÇOS
  // ============================================================================

  /**
   * Lista serviços da oficina respeitando isolamento por tenant
   */
  async listServices(tenantId: string, filter: ListServicesFilter = {}): Promise<CatalogServiceDto[]> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (filter.category) {
      params.push(filter.category);
      conditions.push(`category = $${params.length}`);
    }

    if (filter.segment) {
      params.push(filter.segment);
      conditions.push(`segment = $${params.length}`);
    }

    if (filter.isActive !== undefined) {
      params.push(filter.isActive);
      conditions.push(`is_active = $${params.length}`);
    }

    if (filter.search && filter.search.trim()) {
      params.push(`%${filter.search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`);
    }

    const sql = `
      SELECT 
        id,
        tenant_id,
        tenant_id AS "tenantId",
        name,
        description,
        price_cents,
        price_cents AS "priceCents",
        estimated_minutes,
        estimated_minutes AS "estimatedMinutes",
        category,
        segment,
        warranty_months,
        warranty_months AS "warrantyMonths",
        material_consumption_estimate,
        material_consumption_estimate AS "materialConsumptionEstimate",
        is_active,
        is_active AS "isActive",
        created_at,
        created_at AS "createdAt",
        updated_at,
        updated_at AS "updatedAt"
      FROM services
      WHERE ${conditions.join(' AND ')}
      ORDER BY category ASC, name ASC;
    `;

    const res = await tenantQuery<CatalogServiceDto>(tenantId, sql, params);
    return res.rows;
  }

  /**
   * Busca um serviço por ID
   */
  async getServiceById(tenantId: string, serviceId: string): Promise<CatalogServiceDto> {
    const res = await tenantQuery<CatalogServiceDto>(
      tenantId,
      `
      SELECT 
        id,
        tenant_id,
        tenant_id AS "tenantId",
        name,
        description,
        price_cents,
        price_cents AS "priceCents",
        estimated_minutes,
        estimated_minutes AS "estimatedMinutes",
        category,
        segment,
        warranty_months,
        warranty_months AS "warrantyMonths",
        material_consumption_estimate,
        material_consumption_estimate AS "materialConsumptionEstimate",
        is_active,
        is_active AS "isActive",
        created_at,
        created_at AS "createdAt",
        updated_at,
        updated_at AS "updatedAt"
      FROM services
      WHERE tenant_id = $1 AND id = $2;
      `,
      [tenantId, serviceId]
    );

    if (res.rows.length === 0) {
      throw new CatalogPricingError('Serviço não encontrado.', 404);
    }

    return res.rows[0];
  }

  /**
   * Cria um novo serviço no catálogo
   */
  async createService(
    tenantId: string,
    data: CreateCatalogServiceDto,
    actorUserId?: string
  ): Promise<CatalogServiceDto> {
    if (!data.name || data.name.trim().length < 2) {
      throw new CatalogPricingError('O nome do serviço deve conter pelo menos 2 caracteres.');
    }
    const priceCents = data.priceCents ?? (data as any).price_cents ?? 0;
    const estimatedMinutes = data.estimatedMinutes ?? (data as any).estimated_minutes ?? 60;
    const warrantyMonths = data.warrantyMonths ?? (data as any).warranty_months ?? 3;
    const isActive = data.isActive ?? (data as any).is_active ?? true;

    if (priceCents < 0) {
      throw new CatalogPricingError('O preço não pode ser negativo.');
    }

    const res = await tenantQuery<CatalogServiceDto>(
      tenantId,
      `
      INSERT INTO services (
        tenant_id,
        name,
        description,
        price_cents,
        estimated_minutes,
        category,
        segment,
        warranty_months,
        material_consumption_estimate,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id,
        tenant_id AS "tenantId",
        name,
        description,
        price_cents AS "priceCents",
        estimated_minutes AS "estimatedMinutes",
        category,
        segment,
        warranty_months AS "warrantyMonths",
        material_consumption_estimate AS "materialConsumptionEstimate",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [
        tenantId,
        data.name.trim(),
        data.description ?? null,
        priceCents,
        estimatedMinutes,
        data.category ?? 'geral',
        data.segment ?? 'mecanica',
        warrantyMonths,
        JSON.stringify(data.materialConsumptionEstimate ?? {}),
        isActive,
      ]
    );

    const service = res.rows[0];

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'SERVICE_CREATED',
        entity: 'services',
        entityId: service.id,
        newValues: service as unknown as Record<string, unknown>,
      });
    }

    return service;
  }

  /**
   * Atualiza um serviço existente
   */
  async updateService(
    tenantId: string,
    serviceId: string,
    data: UpdateCatalogServiceDto,
    actorUserId?: string
  ): Promise<CatalogServiceDto> {
    const existing = await this.getServiceById(tenantId, serviceId);

    const updatedName = data.name !== undefined ? data.name.trim() : existing.name;
    const updatedDesc = data.description !== undefined ? data.description : existing.description;
    const updatedPrice = data.priceCents !== undefined ? data.priceCents : existing.priceCents;
    const updatedMin = data.estimatedMinutes !== undefined ? data.estimatedMinutes : existing.estimatedMinutes;
    const updatedCat = data.category !== undefined ? data.category : existing.category;
    const updatedSeg = data.segment !== undefined ? data.segment : existing.segment;
    const updatedWarranty = data.warrantyMonths !== undefined ? data.warrantyMonths : existing.warrantyMonths;
    const updatedConsumption = data.materialConsumptionEstimate !== undefined
      ? data.materialConsumptionEstimate
      : existing.materialConsumptionEstimate;
    const updatedActive = data.isActive !== undefined ? data.isActive : existing.isActive;

    if (updatedName.length < 2) {
      throw new CatalogPricingError('O nome do serviço deve conter pelo menos 2 caracteres.');
    }
    if (updatedPrice < 0) {
      throw new CatalogPricingError('O preço não pode ser negativo.');
    }

    const res = await tenantQuery<CatalogServiceDto>(
      tenantId,
      `
      UPDATE services
      SET 
        name = $3,
        description = $4,
        price_cents = $5,
        estimated_minutes = $6,
        category = $7,
        segment = $8,
        warranty_months = $9,
        material_consumption_estimate = $10,
        is_active = $11,
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING 
        id,
        tenant_id AS "tenantId",
        name,
        description,
        price_cents AS "priceCents",
        estimated_minutes AS "estimatedMinutes",
        category,
        segment,
        warranty_months AS "warrantyMonths",
        material_consumption_estimate AS "materialConsumptionEstimate",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [
        tenantId,
        serviceId,
        updatedName,
        updatedDesc,
        updatedPrice,
        updatedMin,
        updatedCat,
        updatedSeg,
        updatedWarranty,
        JSON.stringify(updatedConsumption),
        updatedActive,
      ]
    );

    const updated = res.rows[0];

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'SERVICE_UPDATED',
        entity: 'services',
        entityId: serviceId,
        oldValues: existing as unknown as Record<string, unknown>,
        newValues: updated as unknown as Record<string, unknown>,
      });
    }

    return updated;
  }

  /**
   * Exclusão ou desativação de serviço
   */
  async deleteService(tenantId: string, serviceId: string, actorUserId?: string): Promise<{ success: boolean }> {
    const existing = await this.getServiceById(tenantId, serviceId);

    await tenantQuery(
      tenantId,
      'DELETE FROM services WHERE tenant_id = $1 AND id = $2;',
      [tenantId, serviceId]
    );

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'SERVICE_DELETED',
        entity: 'services',
        entityId: serviceId,
        oldValues: existing as unknown as Record<string, unknown>,
      });
    }

    return { success: true };
  }

  // ============================================================================
  // 2. PREÇOS E TEMPOS ESPECÍFICOS POR PORTE DE VEÍCULO
  // ============================================================================

  /**
   * Obtém a lista de preços diferenciados por porte para um serviço
   */
  async getServicePricesByClass(tenantId: string, serviceId: string): Promise<ServicePriceByClassDto[]> {
    await this.getServiceById(tenantId, serviceId); // Valida existência

    const res = await tenantQuery<ServicePriceByClassDto>(
      tenantId,
      `
      SELECT 
        id,
        tenant_id AS "tenantId",
        service_id AS "serviceId",
        size_class AS "sizeClass",
        price_cents AS "priceCents",
        estimated_minutes AS "estimatedMinutes",
        warranty_months AS "warrantyMonths",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM service_prices_by_class
      WHERE tenant_id = $1 AND service_id = $2
      ORDER BY size_class ASC;
      `,
      [tenantId, serviceId]
    );

    return res.rows;
  }

  /**
   * Cadastra ou atualiza (UPSERT) múltiplos preços por porte para um serviço
   */
  async setServicePricesByClass(
    tenantId: string,
    serviceId: string,
    prices: SetServicePriceInputDto[],
    actorUserId?: string
  ): Promise<ServicePriceByClassDto[]> {
    const service = await this.getServiceById(tenantId, serviceId);

    const results: ServicePriceByClassDto[] = [];

    await tenantTransaction(tenantId, async (client) => {
      for (const item of prices) {
        if (item.priceCents < 0) {
          throw new CatalogPricingError(`Preço para ${item.sizeClass} não pode ser negativo.`);
        }
        if (item.estimatedMinutes < 1) {
          throw new CatalogPricingError(`Tempo estimado para ${item.sizeClass} deve ser de no mínimo 1 minuto.`);
        }

        const res = await client.query<ServicePriceByClassDto>(
          `
          INSERT INTO service_prices_by_class (
            tenant_id,
            service_id,
            size_class,
            price_cents,
            estimated_minutes,
            warranty_months
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (tenant_id, service_id, size_class)
          DO UPDATE SET
            price_cents = EXCLUDED.price_cents,
            estimated_minutes = EXCLUDED.estimated_minutes,
            warranty_months = EXCLUDED.warranty_months,
            updated_at = NOW()
          RETURNING 
            id,
            tenant_id AS "tenantId",
            service_id AS "serviceId",
            size_class AS "sizeClass",
            price_cents AS "priceCents",
            estimated_minutes AS "estimatedMinutes",
            warranty_months AS "warrantyMonths",
            created_at AS "createdAt",
            updated_at AS "updatedAt";
          `,
          [
            tenantId,
            serviceId,
            item.sizeClass,
            item.priceCents,
            item.estimatedMinutes,
            item.warrantyMonths ?? service.warrantyMonths,
          ]
        );
        results.push(res.rows[0]);
      }
    });

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'SERVICE_PRICES_BY_CLASS_UPDATED',
        entity: 'service_prices_by_class',
        entityId: serviceId,
        newValues: { prices: results as any },
      });
    }

    return results;
  }

  // ============================================================================
  // 3. COMBOS E PACOTES DE SERVIÇOS
  // ============================================================================

  /**
   * Lista pacotes e combos cadastrados
   */
  async listPackages(tenantId: string, options: { isActive?: boolean } = {}): Promise<PackageDto[]> {
    const conditions: string[] = ['p.tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (options.isActive !== undefined) {
      params.push(options.isActive);
      conditions.push(`p.is_active = $${params.length}`);
    }

    const res = await tenantQuery<PackageDto & { itemsJson: any }>(
      tenantId,
      `
      SELECT 
        p.id,
        p.tenant_id AS "tenantId",
        p.name,
        p.description,
        p.discount_type AS "discountType",
        p.discount_value AS "discountValue",
        p.is_active AS "isActive",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'serviceId', pi.service_id,
              'customOrder', pi.custom_order,
              'service', json_build_object(
                'id', s.id,
                'name', s.name,
                'category', s.category,
                'priceCents', s.price_cents,
                'estimatedMinutes', s.estimated_minutes
              )
            ) ORDER BY pi.custom_order ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) AS "itemsJson"
      FROM packages p
      LEFT JOIN package_items pi ON pi.package_id = p.id AND pi.tenant_id = p.tenant_id
      LEFT JOIN services s ON s.id = pi.service_id AND s.tenant_id = p.tenant_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id
      ORDER BY p.name ASC;
      `,
      params
    );

    return res.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      discountType: row.discountType as any,
      discountValue: row.discountValue,
      isActive: row.isActive,
      items: (row as any).itemsJson || [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  /**
   * Busca pacote por ID com seus itens
   */
  async getPackageById(tenantId: string, packageId: string): Promise<PackageDto> {
    const res = await tenantQuery<PackageDto & { itemsJson: any }>(
      tenantId,
      `
      SELECT 
        p.id,
        p.tenant_id AS "tenantId",
        p.name,
        p.description,
        p.discount_type AS "discountType",
        p.discount_value AS "discountValue",
        p.is_active AS "isActive",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'serviceId', pi.service_id,
              'customOrder', pi.custom_order,
              'service', json_build_object(
                'id', s.id,
                'name', s.name,
                'category', s.category,
                'priceCents', s.price_cents,
                'estimatedMinutes', s.estimated_minutes
              )
            ) ORDER BY pi.custom_order ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) AS "itemsJson"
      FROM packages p
      LEFT JOIN package_items pi ON pi.package_id = p.id AND pi.tenant_id = p.tenant_id
      LEFT JOIN services s ON s.id = pi.service_id AND s.tenant_id = p.tenant_id
      WHERE p.tenant_id = $1 AND p.id = $2
      GROUP BY p.id;
      `,
      [tenantId, packageId]
    );

    if (res.rows.length === 0) {
      throw new CatalogPricingError('Pacote / Combo não encontrado.', 404);
    }

    const row = res.rows[0];
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      discountType: row.discountType as any,
      discountValue: row.discountValue,
      isActive: row.isActive,
      items: (row as any).itemsJson || [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Cria novo combo/pacote com serviços vinculados
   */
  async createPackage(
    tenantId: string,
    data: CreatePackageDto,
    actorUserId?: string
  ): Promise<PackageDto> {
    if (!data.name || data.name.trim().length < 2) {
      throw new CatalogPricingError('O nome do combo deve conter no mínimo 2 caracteres.');
    }
    if (!data.serviceIds || data.serviceIds.length === 0) {
      throw new CatalogPricingError('Um combo deve conter ao menos um serviço vinculado.');
    }
    if ((data.discountValue ?? 0) < 0) {
      throw new CatalogPricingError('O valor do desconto não pode ser negativo.');
    }
    if (data.discountType === 'percentage' && (data.discountValue ?? 0) > 100) {
      throw new CatalogPricingError('O desconto percentual não pode ser superior a 100%.');
    }

    let createdPackageId = '';

    await tenantTransaction(tenantId, async (client) => {
      const resPkg = await client.query<{ id: string }>(
        `
        INSERT INTO packages (
          tenant_id,
          name,
          description,
          discount_type,
          discount_value,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
        `,
        [
          tenantId,
          data.name.trim(),
          data.description ?? null,
          data.discountType ?? 'percentage',
          data.discountValue ?? 0,
          data.isActive ?? true,
        ]
      );

      createdPackageId = resPkg.rows[0].id;

      // Inserir itens vinculados
      for (let i = 0; i < data.serviceIds.length; i++) {
        const serviceId = data.serviceIds[i];
        await client.query(
          `
          INSERT INTO package_items (
            tenant_id,
            package_id,
            service_id,
            custom_order
          ) VALUES ($1, $2, $3, $4);
          `,
          [tenantId, createdPackageId, serviceId, i + 1]
        );
      }
    });

    const fullPackage = await this.getPackageById(tenantId, createdPackageId);

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'PACKAGE_CREATED',
        entity: 'packages',
        entityId: createdPackageId,
        newValues: fullPackage as unknown as Record<string, unknown>,
      });
    }

    return fullPackage;
  }

  /**
   * Atualiza um combo/pacote existente
   */
  async updatePackage(
    tenantId: string,
    packageId: string,
    data: UpdatePackageDto,
    actorUserId?: string
  ): Promise<PackageDto> {
    const existing = await this.getPackageById(tenantId, packageId);

    const updatedName = data.name !== undefined ? data.name.trim() : existing.name;
    const updatedDesc = data.description !== undefined ? data.description : existing.description;
    const updatedDiscType = data.discountType !== undefined ? data.discountType : existing.discountType;
    const updatedDiscVal = data.discountValue !== undefined ? data.discountValue : existing.discountValue;
    const updatedActive = data.isActive !== undefined ? data.isActive : existing.isActive;

    if (updatedName.length < 2) {
      throw new CatalogPricingError('O nome do combo deve conter no mínimo 2 caracteres.');
    }
    if (updatedDiscVal < 0) {
      throw new CatalogPricingError('O desconto não pode ser negativo.');
    }
    if (updatedDiscType === 'percentage' && updatedDiscVal > 100) {
      throw new CatalogPricingError('O desconto percentual não pode ser superior a 100%.');
    }

    await tenantTransaction(tenantId, async (client) => {
      await client.query(
        `
        UPDATE packages
        SET 
          name = $3,
          description = $4,
          discount_type = $5,
          discount_value = $6,
          is_active = $7,
          updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2;
        `,
        [tenantId, packageId, updatedName, updatedDesc, updatedDiscType, updatedDiscVal, updatedActive]
      );

      // Se passou lista de serviceIds, sincroniza itens
      if (data.serviceIds && Array.isArray(data.serviceIds)) {
        await client.query(
          'DELETE FROM package_items WHERE tenant_id = $1 AND package_id = $2;',
          [tenantId, packageId]
        );

        for (let i = 0; i < data.serviceIds.length; i++) {
          await client.query(
            `
            INSERT INTO package_items (
              tenant_id,
              package_id,
              service_id,
              custom_order
            ) VALUES ($1, $2, $3, $4);
            `,
            [tenantId, packageId, data.serviceIds[i], i + 1]
          );
        }
      }
    });

    const updated = await this.getPackageById(tenantId, packageId);

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'PACKAGE_UPDATED',
        entity: 'packages',
        entityId: packageId,
        oldValues: existing as unknown as Record<string, unknown>,
        newValues: updated as unknown as Record<string, unknown>,
      });
    }

    return updated;
  }

  /**
   * Deleta combo/pacote
   */
  async deletePackage(tenantId: string, packageId: string, actorUserId?: string): Promise<{ success: boolean }> {
    const existing = await this.getPackageById(tenantId, packageId);

    await tenantQuery(
      tenantId,
      'DELETE FROM packages WHERE tenant_id = $1 AND id = $2;',
      [tenantId, packageId]
    );

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'PACKAGE_DELETED',
        entity: 'packages',
        entityId: packageId,
        oldValues: existing as unknown as Record<string, unknown>,
      });
    }

    return { success: true };
  }

  // ============================================================================
  // 4. MOTOR AUTOMOTIVO DE PRECIFICAÇÃO E ORÇAMENTOS
  // ============================================================================

  /**
   * Calcula o preço exato e tempos de serviços/combos baseado na classe de porte do veículo
   * Critério de aceite: Orçamento sugere preço pelo porte do veículo e aplica desconto do combo no servidor.
   */
  async calculatePricing(
    tenantId: string,
    input: CalculatePricingInputDto
  ): Promise<PricingCalculationResultDto> {
    let targetSizeClass: VehicleSizeClassType = 'sedan';

    // 1. Identificar a classe de porte do veículo
    if (input.vehicleId) {
      const vRes = await tenantQuery<{ size_class: string }>(
        tenantId,
        'SELECT size_class FROM vehicles WHERE tenant_id = $1 AND id = $2;',
        [tenantId, input.vehicleId]
      );
      if (vRes.rows.length === 0) {
        throw new CatalogPricingError('Veículo informado não foi encontrado na oficina.', 404);
      }
      targetSizeClass = vRes.rows[0].size_class as VehicleSizeClassType;
    } else if (input.vehicleSizeClass) {
      targetSizeClass = input.vehicleSizeClass;
    }

    // 2. Resolver o pacote/combo se fornecido
    let appliedPackage: PackageDto | null = null;
    const combinedServiceIds = new Set<string>(input.serviceIds || []);

    if (input.packageId) {
      appliedPackage = await this.getPackageById(tenantId, input.packageId);
      if (appliedPackage.items) {
        for (const item of appliedPackage.items) {
          combinedServiceIds.add(item.serviceId);
        }
      }
    }

    if (combinedServiceIds.size === 0) {
      return {
        vehicleSizeClass: targetSizeClass,
        package: null,
        items: [],
        subtotalCents: 0,
        discountCents: 0,
        totalCents: 0,
        totalEstimatedMinutes: 0,
      };
    }

    const serviceIdArray = Array.from(combinedServiceIds);

    // 3. Buscar os serviços base
    const servicesRes = await tenantQuery<CatalogServiceDto>(
      tenantId,
      `
      SELECT 
        id,
        tenant_id AS "tenantId",
        name,
        description,
        price_cents AS "priceCents",
        estimated_minutes AS "estimatedMinutes",
        category,
        segment,
        warranty_months AS "warrantyMonths",
        is_active AS "isActive"
      FROM services
      WHERE tenant_id = $1 AND id = ANY($2::uuid[]);
      `,
      [tenantId, serviceIdArray]
    );

    const servicesMap = new Map<string, CatalogServiceDto>();
    for (const s of servicesRes.rows) {
      servicesMap.set(s.id, s);
    }

    // 4. Buscar preços específicos por porte para esses serviços
    const pricesRes = await tenantQuery<ServicePriceByClassDto>(
      tenantId,
      `
      SELECT 
        id,
        tenant_id AS "tenantId",
        service_id AS "serviceId",
        size_class AS "sizeClass",
        price_cents AS "priceCents",
        estimated_minutes AS "estimatedMinutes",
        warranty_months AS "warrantyMonths"
      FROM service_prices_by_class
      WHERE tenant_id = $1 AND service_id = ANY($2::uuid[]) AND size_class = $3;
      `,
      [tenantId, serviceIdArray, targetSizeClass]
    );

    const priceClassMap = new Map<string, ServicePriceByClassDto>();
    for (const p of pricesRes.rows) {
      priceClassMap.set(p.serviceId, p);
    }

    // 5. Montar os itens calculados (ajustados por porte)
    const packageServiceIds = new Set<string>(
      appliedPackage?.items?.map((item) => item.serviceId) || []
    );

    let packageSubtotal = 0;
    const initialCalculatedItems: Array<{
      serviceId: string;
      serviceName: string;
      category: string | null;
      vehicleSizeClass: VehicleSizeClassType;
      basePriceCents: number;
      appliedPriceCents: number;
      isOverriddenByClass: boolean;
      baseMinutes: number;
      appliedMinutes: number;
      warrantyMonths: number;
      isPackageMember: boolean;
    }> = [];

    for (const serviceId of serviceIdArray) {
      const baseService = servicesMap.get(serviceId);
      if (!baseService) continue;

      const override = priceClassMap.get(serviceId);
      const isOverridden = !!override;

      const appliedPriceCents = isOverridden ? override.priceCents : baseService.priceCents;
      const appliedMinutes = isOverridden ? override.estimatedMinutes : baseService.estimatedMinutes;
      const warrantyMonths = (isOverridden && override.warrantyMonths != null)
        ? override.warrantyMonths
        : baseService.warrantyMonths;

      const isPackageMember = packageServiceIds.has(serviceId);
      if (isPackageMember) {
        packageSubtotal += appliedPriceCents;
      }

      initialCalculatedItems.push({
        serviceId,
        serviceName: baseService.name,
        category: baseService.category ?? null,
        vehicleSizeClass: targetSizeClass,
        basePriceCents: baseService.priceCents,
        appliedPriceCents,
        isOverriddenByClass: isOverridden,
        baseMinutes: baseService.estimatedMinutes,
        appliedMinutes,
        warrantyMonths,
        isPackageMember,
      });
    }

    // 6. Calcular desconto total do pacote
    let totalDiscountCents = 0;
    if (appliedPackage && packageSubtotal > 0) {
      if (appliedPackage.discountType === 'percentage') {
        const pct = Math.max(0, Math.min(100, appliedPackage.discountValue));
        totalDiscountCents = Math.round((packageSubtotal * pct) / 100);
      } else if (appliedPackage.discountType === 'fixed_cents') {
        totalDiscountCents = Math.min(packageSubtotal, Math.max(0, appliedPackage.discountValue));
      }
    }

    // 7. Distribuir desconto entre os itens do pacote de maneira estável
    let remainingDiscountToDistribute = totalDiscountCents;
    const items: CalculatedServiceItemDto[] = [];
    let subtotalCents = 0;
    let totalEstimatedMinutes = 0;

    for (let i = 0; i < initialCalculatedItems.length; i++) {
      const item = initialCalculatedItems[i];
      subtotalCents += item.appliedPriceCents;
      totalEstimatedMinutes += item.appliedMinutes;

      let itemDiscountCents = 0;
      if (item.isPackageMember && packageSubtotal > 0 && totalDiscountCents > 0) {
        // Rateio proporcional ao valor do item dentro do pacote
        if (i === initialCalculatedItems.length - 1 || remainingDiscountToDistribute <= 0) {
          // Último item ou quando resta pouco: pega o resto exato para evitar desvios de arredondamento
          itemDiscountCents = Math.min(item.appliedPriceCents, remainingDiscountToDistribute);
        } else {
          const ratio = item.appliedPriceCents / packageSubtotal;
          itemDiscountCents = Math.min(item.appliedPriceCents, Math.round(totalDiscountCents * ratio));
        }
        remainingDiscountToDistribute -= itemDiscountCents;
      }

      const finalPriceCents = Math.max(0, item.appliedPriceCents - itemDiscountCents);

      items.push({
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        category: item.category,
        vehicleSizeClass: item.vehicleSizeClass,
        basePriceCents: item.basePriceCents,
        appliedPriceCents: item.appliedPriceCents,
        isOverriddenByClass: item.isOverriddenByClass,
        baseMinutes: item.baseMinutes,
        appliedMinutes: item.appliedMinutes,
        warrantyMonths: item.warrantyMonths,
        packageDiscountCents: itemDiscountCents,
        finalPriceCents,
      });
    }

    const totalCents = Math.max(0, subtotalCents - totalDiscountCents);

    return {
      vehicleSizeClass: targetSizeClass,
      package: appliedPackage
        ? {
            id: appliedPackage.id,
            name: appliedPackage.name,
            discountType: appliedPackage.discountType as any,
            discountValue: appliedPackage.discountValue,
          }
        : null,
      items,
      subtotalCents,
      discountCents: totalDiscountCents,
      totalCents,
      totalEstimatedMinutes,
    };
  }
}

export const catalogPricingService = new CatalogPricingService();
