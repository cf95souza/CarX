import crypto from 'node:crypto';
import { tenantQuery } from '../database/tenant-query.js';
import type {
  CreateWebhookEndpointInputDto,
  UpdateWebhookEndpointInputDto,
  WebhookEndpointDto,
  WebhookDeliveryDto,
} from '@carx/shared';

export class WebhookService {
  /**
   * Cadastra um novo endpoint de webhook com segredo criptográfico HMAC
   */
  static async createEndpoint(
    tenantId: string,
    input: CreateWebhookEndpointInputDto
  ): Promise<WebhookEndpointDto> {
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const query = `
      INSERT INTO webhook_endpoints (
        tenant_id,
        name,
        description,
        url,
        secret,
        events,
        is_active,
        status,
        failure_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, 'active', 0)
      RETURNING id, tenant_id, name, description, url, secret, events, is_active, status, failure_count, created_at, updated_at
    `;

    const result = await tenantQuery(tenantId, query, [
      tenantId,
      input.name,
      input.description || null,
      input.url,
      secret,
      input.events,
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      url: row.url,
      events: row.events,
      isActive: row.is_active,
      status: row.status,
      failureCount: row.failure_count,
      secret: row.secret,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  /**
   * Lista todos os endpoints de webhook do tenant
   */
  static async listEndpoints(tenantId: string): Promise<WebhookEndpointDto[]> {
    const query = `
      SELECT id, tenant_id, name, description, url, secret, events, is_active, status, failure_count, created_at, updated_at
      FROM webhook_endpoints
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `;

    const result = await tenantQuery(tenantId, query, [tenantId]);

    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      url: row.url,
      events: row.events,
      isActive: row.is_active,
      status: row.status,
      failureCount: row.failure_count,
      secret: row.secret,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  }

  /**
   * Consulta um webhook pelo ID
   */
  static async getEndpoint(tenantId: string, endpointId: string): Promise<WebhookEndpointDto | null> {
    const query = `
      SELECT id, tenant_id, name, description, url, secret, events, is_active, status, failure_count, created_at, updated_at
      FROM webhook_endpoints
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await tenantQuery(tenantId, query, [endpointId, tenantId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      url: row.url,
      events: row.events,
      isActive: row.is_active,
      status: row.status,
      failureCount: row.failure_count,
      secret: row.secret,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  /**
   * Atualiza configurações de um webhook
   */
  static async updateEndpoint(
    tenantId: string,
    endpointId: string,
    input: UpdateWebhookEndpointInputDto
  ): Promise<WebhookEndpointDto | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(input.description);
    }
    if (input.url !== undefined) {
      fields.push(`url = $${idx++}`);
      values.push(input.url);
    }
    if (input.events !== undefined) {
      fields.push(`events = $${idx++}`);
      values.push(input.events);
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(input.isActive);
    }
    if (input.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(input.status);
    }

    if (fields.length === 0) {
      return this.getEndpoint(tenantId, endpointId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(endpointId);
    values.push(tenantId);

    const query = `
      UPDATE webhook_endpoints
      SET ${fields.join(', ')}
      WHERE id = $${idx++} AND tenant_id = $${idx++}
      RETURNING id, tenant_id, name, description, url, secret, events, is_active, status, failure_count, created_at, updated_at
    `;

    const result = await tenantQuery(tenantId, query, values);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      url: row.url,
      events: row.events,
      isActive: row.is_active,
      status: row.status,
      failureCount: row.failure_count,
      secret: row.secret,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  /**
   * Remove um endpoint de webhook
   */
  static async deleteEndpoint(tenantId: string, endpointId: string): Promise<boolean> {
    const query = `
      DELETE FROM webhook_endpoints
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `;

    const result = await tenantQuery(tenantId, query, [endpointId, tenantId]);
    return result.rows.length > 0;
  }

  /**
   * Despacha um evento para todos os endpoints subscritos do tenant
   */
  static async dispatchWebhook(
    tenantId: string,
    event: string,
    payload: Record<string, unknown>,
    options?: { endpointId?: string; isTest?: boolean }
  ): Promise<WebhookDeliveryDto[]> {
    let endpointsQuery = `
      SELECT id, tenant_id, name, url, secret, events, status
      FROM webhook_endpoints
      WHERE tenant_id = $1 AND is_active = true AND status != 'inactive'
    `;
    const params: any[] = [tenantId];

    if (options?.endpointId) {
      endpointsQuery += ` AND id = $2`;
      params.push(options.endpointId);
    }

    const endpointsRes = await tenantQuery(tenantId, endpointsQuery, params);
    const deliveries: WebhookDeliveryDto[] = [];

    for (const ep of endpointsRes.rows) {
      // Verificar se o endpoint escuta o evento ou '*'
      const subscribedEvents: string[] = ep.events || [];
      if (!options?.isTest && !subscribedEvents.includes(event) && !subscribedEvents.includes('*')) {
        continue;
      }

      const deliveryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      const deliveryPayload = {
        id: deliveryId,
        event,
        tenantId,
        timestamp,
        data: payload,
      };

      const payloadString = JSON.stringify(deliveryPayload);
      const signature = `sha256=${crypto
        .createHmac('sha256', ep.secret)
        .update(payloadString)
        .digest('hex')}`;

      // Inserir registro inicial da entrega com status 'pending'
      const insertQuery = `
        INSERT INTO webhook_deliveries (
          id,
          tenant_id,
          endpoint_id,
          event,
          payload,
          signature,
          status,
          attempts,
          max_attempts
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'pending', 1, 3)
        RETURNING id, tenant_id, endpoint_id, event, payload, signature, status_code, response_body, duration_ms, error, status, attempts, max_attempts, next_retry_at, delivered_at, failed_at, created_at
      `;

      await tenantQuery(tenantId, insertQuery, [
        deliveryId,
        tenantId,
        ep.id,
        event,
        payloadString,
        signature,
      ]);

      const startTime = Date.now();
      let statusCode: number | null = null;
      let responseBody: string | null = null;
      let errorMsg: string | null = null;
      let isSuccess = false;

      try {
        const response = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CarX-Webhook/1.0',
            'X-CarX-Signature': signature,
            'X-CarX-Event': event,
            'X-CarX-Delivery': deliveryId,
            'X-CarX-Timestamp': timestamp,
          },
          body: payloadString,
          signal: AbortSignal.timeout(5000), // Timeout seguro de 5 segundos
        });

        statusCode = response.status;
        const text = await response.text();
        responseBody = text.substring(0, 1000); // Truncar a 1000 chars para log

        if (response.ok) {
          isSuccess = true;
        } else {
          errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        }
      } catch (err: any) {
        errorMsg = err.message || 'Falha na conexão HTTP com o endpoint de destino';
      }

      const durationMs = Date.now() - startTime;

      if (isSuccess) {
        const updateSuccess = `
          UPDATE webhook_deliveries
          SET status = 'success',
              status_code = $1,
              response_body = $2,
              duration_ms = $3,
              delivered_at = NOW()
          WHERE id = $4
          RETURNING id, tenant_id, endpoint_id, event, payload, signature, status_code, response_body, duration_ms, error, status, attempts, max_attempts, next_retry_at, delivered_at, failed_at, created_at
        `;
        const updatedRes = await tenantQuery(tenantId, updateSuccess, [
          statusCode,
          responseBody,
          durationMs,
          deliveryId,
        ]);

        // Resetar contador de falhas do endpoint
        await tenantQuery(
          tenantId,
          `UPDATE webhook_endpoints SET failure_count = 0, status = 'active' WHERE id = $1`,
          [ep.id]
        );

        const r = updatedRes.rows[0];
        deliveries.push({
          id: r.id,
          tenantId: r.tenant_id,
          endpointId: r.endpoint_id,
          event: r.event,
          payload: r.payload,
          signature: r.signature,
          statusCode: r.status_code,
          responseBody: r.response_body,
          durationMs: r.duration_ms,
          error: r.error,
          status: r.status,
          attempts: r.attempts,
          maxAttempts: r.max_attempts,
          nextRetryAt: r.next_retry_at ? new Date(r.next_retry_at).toISOString() : null,
          deliveredAt: r.delivered_at ? new Date(r.delivered_at).toISOString() : null,
          failedAt: r.failed_at ? new Date(r.failed_at).toISOString() : null,
          createdAt: new Date(r.created_at).toISOString(),
        });
      } else {
        // Falha: aplicar lógica de retentativa com backoff exponencial
        const nextRetryDate = new Date(Date.now() + 60000); // 1 minuto para a 1ª reentrega

        const updateFail = `
          UPDATE webhook_deliveries
          SET status = 'retrying',
              status_code = $1,
              response_body = $2,
              duration_ms = $3,
              error = $4,
              next_retry_at = $5
          WHERE id = $6
          RETURNING id, tenant_id, endpoint_id, event, payload, signature, status_code, response_body, duration_ms, error, status, attempts, max_attempts, next_retry_at, delivered_at, failed_at, created_at
        `;

        const updatedRes = await tenantQuery(tenantId, updateFail, [
          statusCode,
          responseBody,
          durationMs,
          errorMsg,
          nextRetryDate.toISOString(),
          deliveryId,
        ]);

        // Incrementar failure_count no endpoint
        await tenantQuery(
          tenantId,
          `UPDATE webhook_endpoints SET failure_count = failure_count + 1 WHERE id = $1`,
          [ep.id]
        );

        const r = updatedRes.rows[0];
        deliveries.push({
          id: r.id,
          tenantId: r.tenant_id,
          endpointId: r.endpoint_id,
          event: r.event,
          payload: r.payload,
          signature: r.signature,
          statusCode: r.status_code,
          responseBody: r.response_body,
          durationMs: r.duration_ms,
          error: r.error,
          status: r.status,
          attempts: r.attempts,
          maxAttempts: r.max_attempts,
          nextRetryAt: r.next_retry_at ? new Date(r.next_retry_at).toISOString() : null,
          deliveredAt: r.delivered_at ? new Date(r.delivered_at).toISOString() : null,
          failedAt: r.failed_at ? new Date(r.failed_at).toISOString() : null,
          createdAt: new Date(r.created_at).toISOString(),
        });
      }
    }

    return deliveries;
  }

  /**
   * Reexecuta manualmente uma entrega com falha
   */
  static async retryDelivery(
    tenantId: string,
    deliveryId: string
  ): Promise<WebhookDeliveryDto | null> {
    const delQuery = `
      SELECT wd.*, we.url, we.secret
      FROM webhook_deliveries wd
      JOIN webhook_endpoints we ON wd.endpoint_id = we.id
      WHERE wd.id = $1 AND wd.tenant_id = $2
    `;

    const res = await tenantQuery(tenantId, delQuery, [deliveryId, tenantId]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const newAttempts = (row.attempts || 1) + 1;
    const maxAttempts = row.max_attempts || 3;

    const startTime = Date.now();
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let errorMsg: string | null = null;
    let isSuccess = false;

    const payloadString = JSON.stringify(row.payload);
    const signature = `sha256=${crypto
      .createHmac('sha256', row.secret)
      .update(payloadString)
      .digest('hex')}`;

    try {
      const response = await fetch(row.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CarX-Webhook/1.0',
          'X-CarX-Signature': signature,
          'X-CarX-Event': row.event,
          'X-CarX-Delivery': deliveryId,
          'X-CarX-Retry': String(newAttempts),
        },
        body: payloadString,
        signal: AbortSignal.timeout(5000),
      });

      statusCode = response.status;
      const text = await response.text();
      responseBody = text.substring(0, 1000);

      if (response.ok) {
        isSuccess = true;
      } else {
        errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
      }
    } catch (err: any) {
      errorMsg = err.message || 'Falha na conexão de retentativa com o endpoint';
    }

    const durationMs = Date.now() - startTime;

    let updateQuery = '';
    let params: any[] = [];

    if (isSuccess) {
      updateQuery = `
        UPDATE webhook_deliveries
        SET status = 'success',
            status_code = $1,
            response_body = $2,
            duration_ms = $3,
            error = NULL,
            attempts = $4,
            delivered_at = NOW(),
            next_retry_at = NULL
        WHERE id = $5
        RETURNING *
      `;
      params = [statusCode, responseBody, durationMs, newAttempts, deliveryId];
    } else {
      const isDefinitiveFailure = newAttempts >= maxAttempts;
      updateQuery = `
        UPDATE webhook_deliveries
        SET status = $1,
            status_code = $2,
            response_body = $3,
            duration_ms = $4,
            error = $5,
            attempts = $6,
            next_retry_at = $7,
            failed_at = $8
        WHERE id = $9
        RETURNING *
      `;
      params = [
        isDefinitiveFailure ? 'failed' : 'retrying',
        statusCode,
        responseBody,
        durationMs,
        errorMsg,
        newAttempts,
        isDefinitiveFailure ? null : new Date(Date.now() + 300000).toISOString(),
        isDefinitiveFailure ? new Date().toISOString() : null,
        deliveryId,
      ];
    }

    const updated = await tenantQuery(tenantId, updateQuery, params);
    const r = updated.rows[0];

    return {
      id: r.id,
      tenantId: r.tenant_id,
      endpointId: r.endpoint_id,
      event: r.event,
      payload: r.payload,
      signature: r.signature,
      statusCode: r.status_code,
      responseBody: r.response_body,
      durationMs: r.duration_ms,
      error: r.error,
      status: r.status,
      attempts: r.attempts,
      maxAttempts: r.max_attempts,
      nextRetryAt: r.next_retry_at ? new Date(r.next_retry_at).toISOString() : null,
      deliveredAt: r.delivered_at ? new Date(r.delivered_at).toISOString() : null,
      failedAt: r.failed_at ? new Date(r.failed_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  /**
   * Lista o histórico de entregas de webhooks do tenant
   */
  static async listDeliveries(
    tenantId: string,
    endpointId?: string,
    limit = 50
  ): Promise<WebhookDeliveryDto[]> {
    let query = `
      SELECT id, tenant_id, endpoint_id, event, payload, signature, status_code, response_body, duration_ms, error, status, attempts, max_attempts, next_retry_at, delivered_at, failed_at, created_at
      FROM webhook_deliveries
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (endpointId) {
      query += ` AND endpoint_id = $2`;
      params.push(endpointId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(Math.min(limit, 100));

    const result = await tenantQuery(tenantId, query, params);

    return result.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      endpointId: r.endpoint_id,
      event: r.event,
      payload: r.payload,
      signature: r.signature,
      statusCode: r.status_code,
      responseBody: r.response_body,
      durationMs: r.duration_ms,
      error: r.error,
      status: r.status,
      attempts: r.attempts,
      maxAttempts: r.max_attempts,
      nextRetryAt: r.next_retry_at ? new Date(r.next_retry_at).toISOString() : null,
      deliveredAt: r.delivered_at ? new Date(r.delivered_at).toISOString() : null,
      failedAt: r.failed_at ? new Date(r.failed_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
}

