import type pg from 'pg';
import { pool } from '../database/db.js';
import { tenantQuery, TenantIsolationError } from '../database/tenant-query.js';

export interface AuditLogEntry {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CreateAuditLogParams {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ListAuditLogsFilters {
  tenantId: string;
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AuditService {
  /**
   * Grava um registro imutável na trilha de auditoria.
   * Pode ser executado em uma conexão/transação existente via `client` ou de forma independente.
   */
  async record(params: CreateAuditLogParams, client?: pg.PoolClient): Promise<AuditLogEntry> {
    const {
      tenantId = null,
      userId = null,
      action,
      entity,
      entityId = null,
      oldValues = null,
      newValues = null,
      ipAddress = null,
      userAgent = null,
    } = params;

    const sql = `
      INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        entity,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      tenantId,
      userId,
      action.toUpperCase().trim(),
      entity.toLowerCase().trim(),
      entityId ? String(entityId) : null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent,
    ];

    if (client) {
      if (tenantId) {
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId]);
      } else {
        await client.query("SET LOCAL app.bypass_rls = 'true'");
      }
      const res = await client.query<AuditLogEntry>(sql, values);
      return res.rows[0];
    }

    if (tenantId) {
      const res = await tenantQuery<AuditLogEntry>(tenantId, sql, values);
      return res.rows[0];
    }

    // Ação global do sistema / Superadmin sem tenant vinculado
    const res = await tenantQuery<AuditLogEntry>(null, sql, values, { bypassRls: true });
    return res.rows[0];
  }

  /**
   * Lista logs de auditoria com isolamento estrito de tenant (RLS), filtros dinâmicos e paginação.
   */
  async list(filters: ListAuditLogsFilters): Promise<PaginatedAuditLogs> {
    const {
      tenantId,
      entity,
      entityId,
      action,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    if (!tenantId) {
      throw new TenantIsolationError('Tenant ID é obrigatório para consultar logs de auditoria');
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (currentPage - 1) * pageLimit;

    const whereConditions: string[] = ['tenant_id = $1'];
    const queryParams: unknown[] = [tenantId];
    let paramIndex = 2;

    if (entity) {
      whereConditions.push(`entity = $${paramIndex}`);
      queryParams.push(entity.toLowerCase().trim());
      paramIndex++;
    }

    if (entityId) {
      whereConditions.push(`entity_id = $${paramIndex}`);
      queryParams.push(String(entityId).trim());
      paramIndex++;
    }

    if (action) {
      whereConditions.push(`action = $${paramIndex}`);
      queryParams.push(action.toUpperCase().trim());
      paramIndex++;
    }

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex}`);
      queryParams.push(userId.trim());
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(new Date(startDate).toISOString());
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(new Date(endDate).toISOString());
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // 1. Contagem total
    const countSql = `SELECT COUNT(*)::int as total FROM audit_logs WHERE ${whereClause}`;
    const countResult = await tenantQuery<{ total: number }>(tenantId, countSql, queryParams);
    const total = countResult.rows[0]?.total ?? 0;

    // 2. Registros paginados
    const listSql = `
      SELECT 
        id,
        tenant_id,
        user_id,
        action,
        entity,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const listParams = [...queryParams, pageLimit, offset];
    const logsResult = await tenantQuery<AuditLogEntry>(tenantId, listSql, listParams);

    return {
      logs: logsResult.rows,
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit) || 1,
    };
  }

  /**
   * Busca um registro de auditoria por ID garantindo isolamento por tenant.
   */
  async getById(tenantId: string, logId: string): Promise<AuditLogEntry | null> {
    if (!tenantId) {
      throw new TenantIsolationError('Tenant ID é obrigatório');
    }

    const sql = `
      SELECT 
        id,
        tenant_id,
        user_id,
        action,
        entity,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1;
    `;

    const res = await tenantQuery<AuditLogEntry>(tenantId, sql, [logId, tenantId]);
    return res.rows[0] ?? null;
  }

  /**
   * Registra auditoria de alteração de valor em Ordem de Serviço
   */
  async recordWorkOrderPriceChange(
    params: {
      tenantId: string;
      userId: string;
      workOrderId: string;
      oldPrice: number;
      newPrice: number;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
    },
    client?: pg.PoolClient
  ) {
    return this.record(
      {
        tenantId: params.tenantId,
        userId: params.userId,
        action: 'WORK_ORDER_PRICE_UPDATED',
        entity: 'work_orders',
        entityId: params.workOrderId,
        oldValues: { total_amount: params.oldPrice },
        newValues: { total_amount: params.newPrice, reason: params.reason },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
      client
    );
  }

  /**
   * Registra auditoria de estorno / reembolso financeiro
   */
  async recordPaymentRefund(
    params: {
      tenantId: string;
      userId: string;
      paymentId: string;
      amount: number;
      refundReason: string;
      previousStatus: string;
      ipAddress?: string;
      userAgent?: string;
    },
    client?: pg.PoolClient
  ) {
    return this.record(
      {
        tenantId: params.tenantId,
        userId: params.userId,
        action: 'PAYMENT_REFUNDED',
        entity: 'payments',
        entityId: params.paymentId,
        oldValues: { status: params.previousStatus, refunded: false },
        newValues: {
          status: 'refunded',
          refunded: true,
          amount: params.amount,
          reason: params.refundReason,
        },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
      client
    );
  }

  /**
   * Registra auditoria de alteração de papel de usuário (RBAC)
   */
  async recordRoleChange(
    params: {
      tenantId: string;
      userId: string;
      targetUserId: string;
      oldRole: string;
      newRole: string;
      ipAddress?: string;
      userAgent?: string;
    },
    client?: pg.PoolClient
  ) {
    return this.record(
      {
        tenantId: params.tenantId,
        userId: params.userId,
        action: 'USER_ROLE_CHANGED',
        entity: 'memberships',
        entityId: params.targetUserId,
        oldValues: { role: params.oldRole },
        newValues: { role: params.newRole },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
      client
    );
  }
}

export const auditService = new AuditService();

