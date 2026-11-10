import { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { RealtimeEventType, RealtimeEventDto } from '@carx/shared';

export interface RealtimeClient {
  id: string;
  tenantId: string;
  userId?: string | null;
  reply: FastifyReply;
  send: (event: RealtimeEventType | string, data: unknown, id?: string) => boolean;
}

export class RealtimeHub {
  private clientsByTenant: Map<string, Set<RealtimeClient>> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Registra uma nova conexão SSE (Server-Sent Events) isolada para um tenant
   */
  registerClient(
    tenantId: string,
    request: FastifyRequest,
    reply: FastifyReply,
    userId?: string | null
  ): RealtimeClient {
    const clientId = randomUUID();

    // Configura cabeçalhos HTTP específicos para SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Evita buffering em proxies como Nginx e Caddy
      'Access-Control-Allow-Origin': '*',
    });

    const client: RealtimeClient = {
      id: clientId,
      tenantId,
      userId,
      reply,
      send: (event: string, data: unknown, id?: string) => {
        try {
          if (reply.raw.writableEnded || reply.raw.destroyed) {
            return false;
          }
          const eventId = id || randomUUID();
          const message = `id: ${eventId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          reply.raw.write(message);
          return true;
        } catch {
          this.removeClient(tenantId, client);
          return false;
        }
      },
    };

    if (!this.clientsByTenant.has(tenantId)) {
      this.clientsByTenant.set(tenantId, new Set());
    }

    this.clientsByTenant.get(tenantId)!.add(client);

    // Envia evento inicial de confirmação de conexão
    client.send('connected', {
      clientId,
      tenantId,
      connectedAt: new Date().toISOString(),
    });

    // Desconecta e limpa referências da memória quando a conexão for encerrada
    request.raw.on('close', () => {
      this.removeClient(tenantId, client);
    });

    return client;
  }

  /**
   * Remove cliente desconectado para evitar memory leaks
   */
  removeClient(tenantId: string, client: RealtimeClient): void {
    const tenantClients = this.clientsByTenant.get(tenantId);
    if (tenantClients) {
      tenantClients.delete(client);
      if (tenantClients.size === 0) {
        this.clientsByTenant.delete(tenantId);
      }
    }
  }

  /**
   * Dispara um evento pontual leve estritamente isolado para os ouvintes do tenant
   */
  publish<T = unknown>(tenantId: string, event: RealtimeEventType, data: T): number {
    const tenantClients = this.clientsByTenant.get(tenantId);
    if (!tenantClients || tenantClients.size === 0) {
      return 0;
    }

    const eventId = randomUUID();
    const eventPayload: RealtimeEventDto<T> = {
      id: eventId,
      tenantId,
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    let deliveredCount = 0;
    for (const client of tenantClients) {
      const sent = client.send(event, eventPayload, eventId);
      if (sent) {
        deliveredCount++;
      }
    }

    return deliveredCount;
  }

  /**
   * Emite pulso de heartbeat para manter as conexões ativas em proxies reversos
   */
  private startHeartbeat(intervalMs = 25000): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      const now = new Date().toISOString();
      for (const [tenantId, clients] of this.clientsByTenant.entries()) {
        for (const client of clients) {
          try {
            if (!client.reply.raw.writableEnded && !client.reply.raw.destroyed) {
              client.reply.raw.write(`: heartbeat ${now}\n\n`);
            } else {
              this.removeClient(tenantId, client);
            }
          } catch {
            this.removeClient(tenantId, client);
          }
        }
      }
    }, intervalMs);

    // Garante que o timer não impede o encerramento do processo em testes
    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  /**
   * Encerra o timer de heartbeat (usado em testes ou shutdown)
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Retorna estatísticas de conexões ativas
   */
  getStats(tenantId?: string): { totalConnections: number; tenantConnections: number } {
    let totalConnections = 0;
    for (const clients of this.clientsByTenant.values()) {
      totalConnections += clients.size;
    }

    const tenantConnections = tenantId ? this.clientsByTenant.get(tenantId)?.size || 0 : 0;

    return {
      totalConnections,
      tenantConnections,
    };
  }

  /**
   * Limpa todas as conexões (útil para testes isolados)
   */
  clearAll(): void {
    for (const clients of this.clientsByTenant.values()) {
      for (const client of clients) {
        try {
          if (!client.reply.raw.writableEnded) {
            client.reply.raw.end();
          }
        } catch {
          // ignore
        }
      }
    }
    this.clientsByTenant.clear();
  }
}

export const realtimeHub = new RealtimeHub();

