import {
  SuperadminLoginInput,
  SuperadminLoginResponse,
  SaasMetricsDto,
  AdminTenantSummaryDto,
  AdminCreateTenantDto,
  ImpersonateTenantResponse,
  ContractDto,
  SuperadminInvoiceDto,
  LeadDto,
  ConvertLeadDto,
} from '@carx/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface AdminAuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_name: string;
  actor_email: string;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WhatsAppInstanceOverview {
  tenantId: string;
  tenantName: string;
  slug: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qrcode';
  phoneNumber?: string;
  messagesSentToday: number;
  dailyLimit: number;
  lastActiveAt?: string;
}

class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('carx_superadmin_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('carx_superadmin_token', token);
}

export function removeStoredToken(): void {
  localStorage.removeItem('carx_superadmin_token');
  localStorage.removeItem('carx_superadmin_user');
}

async function fetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeStoredToken();
    window.dispatchEvent(new CustomEvent('carx:superadmin:unauthorized'));
    throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Erro HTTP ${response.status}`;
    throw new ApiError(errorMsg, response.status);
  }

  return data as T;
}

export const adminApi = {
  // Autenticação
  login: async (credentials: SuperadminLoginInput): Promise<SuperadminLoginResponse> => {
    return fetchClient<SuperadminLoginResponse>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  verify2fa: async (tempToken: string, code: string): Promise<SuperadminLoginResponse> => {
    return fetchClient<SuperadminLoginResponse>('/admin/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    });
  },

  // Dashboard
  getSaasMetrics: async (): Promise<SaasMetricsDto> => {
    return fetchClient<SaasMetricsDto>('/admin/dashboard/metrics');
  },

  // Oficinas (Tenants)
  listTenants: async (params?: { search?: string; status?: string }): Promise<AdminTenantSummaryDto[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return fetchClient<AdminTenantSummaryDto[]>(`/admin/tenants${queryString}`);
  },

  getTenantDetails: async (tenantId: string): Promise<AdminTenantSummaryDto> => {
    return fetchClient<AdminTenantSummaryDto>(`/admin/tenants/${tenantId}`);
  },

  createTenant: async (dto: AdminCreateTenantDto): Promise<AdminTenantSummaryDto> => {
    return fetchClient<AdminTenantSummaryDto>('/admin/tenants', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  suspendTenant: async (tenantId: string, reason: string): Promise<{ success: boolean; status: string }> => {
    return fetchClient<{ success: boolean; status: string }>(`/admin/tenants/${tenantId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  reactivateTenant: async (tenantId: string, reason?: string): Promise<{ success: boolean; status: string }> => {
    return fetchClient<{ success: boolean; status: string }>(`/admin/tenants/${tenantId}/reactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  cancelTenant: async (tenantId: string, reason: string): Promise<{ success: boolean; status: string }> => {
    return fetchClient<{ success: boolean; status: string }>(`/admin/tenants/${tenantId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  impersonateTenant: async (tenantId: string, reason: string): Promise<ImpersonateTenantResponse> => {
    return fetchClient<ImpersonateTenantResponse>(`/admin/tenants/${tenantId}/impersonate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Contratos
  listContracts: async (): Promise<ContractDto[]> => {
    return fetchClient<ContractDto[]>('/admin/contracts');
  },

  // Faturas e Régua de Cobrança
  listInvoices: async (): Promise<SuperadminInvoiceDto[]> => {
    return fetchClient<SuperadminInvoiceDto[]>('/admin/invoices');
  },

  createInvoice: async (data: {
    tenantId: string;
    amountCents: number;
    dueDate: string;
    paymentMethod?: string;
  }): Promise<any> => {
    return fetchClient<any>('/admin/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  payInvoice: async (
    invoiceId: string,
    data?: { paymentMethod?: string; notes?: string }
  ): Promise<{ invoice: any; tenantReactivated: boolean; tenant: any }> => {
    return fetchClient<{ invoice: any; tenantReactivated: boolean; tenant: any }>(
      `/admin/invoices/${invoiceId}/pay`,
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    );
  },

  cancelInvoice: async (invoiceId: string, reason?: string): Promise<{ id: string; status: string }> => {
    return fetchClient<{ id: string; status: string }>(`/admin/invoices/${invoiceId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  runDunning: async (targetDate?: string): Promise<any> => {
    return fetchClient<any>('/admin/billing/run-dunning', {
      method: 'POST',
      body: JSON.stringify({ targetDate }),
    });
  },

  getDunningEvents: async (params?: { tenantId?: string; limit?: number; offset?: number }): Promise<any> => {
    const q = new URLSearchParams();
    if (params?.tenantId) q.append('tenantId', params.tenantId);
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.offset) q.append('offset', String(params.offset));
    return fetchClient<any>(`/admin/billing/dunning-events?${q.toString()}`);
  },

  // Leads
  listLeads: async (): Promise<LeadDto[]> => {
    return fetchClient<LeadDto[]>('/admin/leads');
  },

  createLead: async (leadData: {
    name: string;
    email: string;
    phone?: string;
    company_name?: string;
    notes?: string;
  }): Promise<LeadDto> => {
    return fetchClient<LeadDto>('/admin/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  },

  convertLead: async (leadId: string, dto: ConvertLeadDto): Promise<{ success: boolean; tenant_id: string }> => {
    return fetchClient<{ success: boolean; tenant_id: string }>(`/admin/leads/${leadId}/convert`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // Trilha de Auditoria
  listAuditLogs: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<AdminAuditLogItem>> => {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    return fetchClient<PaginatedResponse<AdminAuditLogItem>>(`/admin/audit-logs?page=${page}&limit=${limit}`);
  },

  // Catálogo e Provisionamento
  getTenantServices: async (tenantId: string): Promise<any[]> => {
    return fetchClient<any[]>(`/admin/tenants/${tenantId}/services`);
  },

  getTenantChecklists: async (tenantId: string): Promise<any[]> => {
    return fetchClient<any[]>(`/admin/tenants/${tenantId}/checklists`);
  },

  getTenantInvitations: async (tenantId: string): Promise<any[]> => {
    return fetchClient<any[]>(`/admin/tenants/${tenantId}/invitations`);
  },
};

