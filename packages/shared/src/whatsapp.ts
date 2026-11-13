/**
 * ==============================================================================
 * CARX SAAS — TIPOS E CONTRATOS DO GATEWAY DE WHATSAPP DESACOPLADO
 * Padrão Arquitetural Multi-Tenant OperaBeauty (Instância Isolada por Oficina)
 * ==============================================================================
 */

export type WhatsAppInstanceStatus =
  | 'DISCONNECTED'
  | 'PAIRING'
  | 'QR_CODE'
  | 'CONNECTED';

export interface TenantWhatsAppInstanceDto {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  tenant_slug?: string;
  phone_number?: string | null;
  status: WhatsAppInstanceStatus;
  pairing_code?: string | null;
  qr_code_base64?: string | null;
  daily_messages_count: number;
  daily_limit: number;
  connected_at?: string | null;
  last_activity_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectWhatsAppInputDto {
  phone_number?: string;
  method: 'pairing_code' | 'qr_code';
}

export interface ConnectWhatsAppResponseDto {
  status: WhatsAppInstanceStatus;
  pairing_code?: string | null;
  qr_code_base64?: string | null;
  phone_number?: string | null;
  message: string;
}

export interface SendWhatsAppMessageInputDto {
  to: string;
  message: string;
  media_url?: string;
}

export interface SendWhatsAppMessageResponseDto {
  success: boolean;
  message_id: string;
  status: 'sent' | 'queued' | 'failed';
  timestamp: string;
}

export interface WhatsAppTelemetrySummaryDto {
  total_instances: number;
  connected_instances: number;
  disconnected_instances: number;
  pairing_instances: number;
  messages_sent_today: number;
  gateway_status: 'online' | 'degraded' | 'offline';
  instances: TenantWhatsAppInstanceDto[];
}

// ==============================================================================
// NOTIFICAÇÕES TRANSACIONAIS AUTOMÁTICAS POR EVENTO DE OS & AGENDAMENTO (T6.4)
// ==============================================================================

export type WhatsAppTransactionalEventType =
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'READY'
  | 'DELIVERED'
  | 'APPOINTMENT_CONFIRMED'
  | 'GOOGLE_REVIEW_INVITE'
  | 'CUSTOM';

export interface SendTransactionalWhatsAppInputDto {
  eventType: WhatsAppTransactionalEventType;
  customMessage?: string;
  originUrl?: string;
}

export interface SendTransactionalWhatsAppResultDto {
  success: boolean;
  mode: 'gateway' | 'manual';
  whatsappUrl?: string;
  messageText: string;
  sentAt: string;
  warning?: string;
}

