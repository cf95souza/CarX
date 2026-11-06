/**
 * ==============================================================================
 * CARX SAAS — TIPOS E CONTRATOS DO SUPER ADMIN (DONO DO SAAS)
 * ==============================================================================
 */

export interface SuperadminUserDto {
  id: string;
  name: string;
  email: string;
  two_factor_enabled: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuperadminLoginInput {
  email: string;
  password: string;
}

export interface SuperadminLoginResponse {
  requires2FA?: boolean;
  tempToken?: string;
  token?: string;
  user?: SuperadminUserDto;
}

export interface RevenueByPlanItem {
  plan_id: string;
  plan_name: string;
  plan_slug: string;
  tenants_count: number;
  total_mrr_cents: number;
}

export interface GlobalUsageStats {
  total_units: number;
  total_users: number;
  total_work_orders: number;
  total_storage_bytes: number;
}

export interface SaasMetricsDto {
  total_tenants: number;
  active_tenants: number;
  trialing_tenants: number;
  suspended_tenants: number;
  cancelled_tenants: number;
  mrr_cents: number;
  arr_cents: number;
  churn_rate_percent: number;
  overdue_invoices_count: number;
  overdue_amount_cents: number;
  revenue_by_plan: RevenueByPlanItem[];
  global_usage: GlobalUsageStats;
}

export type AutomotiveSegment = 'ppf' | 'insulfilm' | 'detailing' | 'mecanica';

export interface ServiceDto {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  estimated_minutes: number;
  category: string | null;
  segment: AutomotiveSegment | string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItemDto {
  id: string;
  label: string;
  type: 'boolean' | 'text' | 'rating' | 'photo';
  required: boolean;
  category?: string;
}

export interface ChecklistTemplateDto {
  id: string;
  tenant_id: string;
  name: string;
  segment: AutomotiveSegment | string;
  description: string | null;
  items: ChecklistItemDto[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantInvitationDto {
  id: string;
  tenant_id: string;
  user_id: string;
  recipient_email: string;
  recipient_name: string;
  role: string;
  status: 'sent' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface ProvisioningResultDto {
  tenant: AdminTenantSummaryDto;
  user: {
    id: string;
    name: string;
    email: string;
  };
  contract: ContractDto;
  servicesCount: number;
  checklistTemplatesCount: number;
  invitation: {
    id: string;
    recipient_email: string;
    invite_url: string;
  };
}

export interface AdminTenantSummaryDto {
  id: string;
  slug: string;
  trade_name: string;
  legal_name: string | null;
  cnpj: string | null;
  email: string;
  phone: string | null;
  status: 'active' | 'suspended' | 'cancelled' | 'trialing';
  plan_id: string | null;
  plan_name: string | null;
  plan_slug: string | null;
  custom_domain: string | null;
  segment?: AutomotiveSegment | string;
  units_count: number;
  users_count: number;
  work_orders_count: number;
  storage_bytes: number;
  created_at: string;
  trial_ends_at: string | null;
}

export interface AdminCreateTenantDto {
  trade_name: string;
  legal_name?: string;
  cnpj?: string;
  slug: string;
  email: string;
  phone?: string;
  segment?: AutomotiveSegment;
  owner_name: string;
  owner_email: string;
  owner_password?: string;
  plan_slug: string;
  is_trial?: boolean;
  trial_days?: number;
}

export interface AdminUpdateTenantStatusDto {
  status: 'active' | 'suspended' | 'cancelled';
  reason: string;
}

export interface ImpersonateTenantDto {
  reason: string;
}

export interface ImpersonateTenantResponse {
  token: string;
  expiresInSeconds: number;
  tenant: {
    id: string;
    slug: string;
    trade_name: string;
    status: string;
  };
  impersonation_id: string;
}

export interface ContractDto {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  plan_id: string;
  plan_name?: string;
  billing_cycle: string;
  negotiated_price_cents: number;
  discount_cents: number;
  custom_limits: Record<string, unknown>;
  status: string;
  starts_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuperadminInvoiceDto {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  contract_id: string | null;
  amount_cents: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  payment_method: 'credit_card' | 'pix' | 'boleto';
  due_date: string;
  paid_at: string | null;
  external_invoice_id: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  converted_tenant_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConvertLeadDto {
  trade_name?: string;
  slug: string;
  plan_slug: string;
  owner_password?: string;
  is_trial?: boolean;
}

