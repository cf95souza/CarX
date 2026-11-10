import type {
  UserRoleType,
  WorkOrderStatusType,
  NpsMetricsDto,
  ApiKeyDto,
  WebhookEndpointDto,
} from '@carx/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  statusCode: number;
  data?: any;
  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

// ==============================================================================
// GESTÃO DE TOKENS E TENANT NO CLIENTE
// ==============================================================================

export const TOKEN_KEY = 'carx_access_token';
export const REFRESH_TOKEN_KEY = 'carx_refresh_token';
export const TENANT_ID_KEY = 'carx_tenant_id';
export const TENANT_SLUG_KEY = 'carx_tenant_slug';
export const USER_INFO_KEY = 'carx_user_info';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getStoredTenantId(): string | null {
  return localStorage.getItem(TENANT_ID_KEY);
}

export function setStoredTenantId(id: string): void {
  localStorage.setItem(TENANT_ID_KEY, id);
}

export function getStoredTenantSlug(): string | null {
  return localStorage.getItem(TENANT_SLUG_KEY);
}

export function setStoredTenantSlug(slug: string): void {
  localStorage.setItem(TENANT_SLUG_KEY, slug);
}

export function getStoredUser(): any | null {
  const raw = localStorage.getItem(USER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: any): void {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(TENANT_ID_KEY);
  localStorage.removeItem(TENANT_SLUG_KEY);
}

// ==============================================================================
// CLIENTE FETCH CENTRALIZADO COM REFRESH AUTOMÁTICO
// ==============================================================================

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function fetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const tenantSlug = getStoredTenantSlug();
  const tenantId = getStoredTenantId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantSlug) {
    headers['x-tenant-slug'] = tenantSlug;
  }
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Interceptor de Renovação de Token (401)
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const refreshToken = getStoredRefreshToken();

    if (refreshToken && !isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setStoredToken(data.accessToken);
          if (data.refreshToken) setStoredRefreshToken(data.refreshToken);
          onRefreshed(data.accessToken);
          isRefreshing = false;

          // Repetir a requisição original com o novo token
          headers['Authorization'] = `Bearer ${data.accessToken}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return handleResponse<T>(retryResponse);
        } else {
          clearStoredAuth();
          isRefreshing = false;
          window.dispatchEvent(new Event('carx:auth-expired'));
        }
      } catch (err) {
        clearStoredAuth();
        isRefreshing = false;
        window.dispatchEvent(new Event('carx:auth-expired'));
      }
    } else if (isRefreshing) {
      // Aguardar refresh em andamento
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          headers['Authorization'] = `Bearer ${newToken}`;
          try {
            const retryRes = await fetch(url, { ...options, headers });
            resolve(await handleResponse<T>(retryRes));
          } catch (e) {
            reject(e);
          }
        });
      });
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Erro HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

// ==============================================================================
// SERVIÇOS TIPADOS DA API FASTIFY CARX
// ==============================================================================

export interface ApiMembership {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  role: string;
  is_active: boolean;
}

export interface ApiAuthUser {
  id: string;
  email: string;
  name: string;
}

export interface ApiLoginSuccess {
  requires2fa: false;
  user: ApiAuthUser;
  memberships: ApiMembership[];
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
}

export interface ApiLoginRequires2Fa {
  requires2fa: true;
  tempToken: string;
  user: ApiAuthUser;
  memberships?: ApiMembership[];
  tokens?: { accessToken: string; refreshToken: string; expiresIn: number };
}

export type ApiLoginResponse = ApiLoginSuccess | ApiLoginRequires2Fa;

export const api = {
  // --- AUTENTICAÇÃO ---
  auth: {
    login: async (input: { email: string; password: string; tenantSlug?: string }) => {
      return fetchClient<ApiLoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    verify2fa: async (input: { tempToken: string; totpCode: string }) => {
      return fetchClient<{
        user: ApiAuthUser;
        memberships: ApiMembership[];
        tokens: { accessToken: string; refreshToken: string; expiresIn: number };
      }>('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ tempToken: input.tempToken, code: input.totpCode }),
      });
    },

    getMe: async () => {
      return fetchClient<{
        user: {
          sub: string;
          email?: string;
          tenantId?: string;
          role?: string;
          scope?: string;
        };
      }>('/auth/me');
    },

    logout: async () => {
      clearStoredAuth();
    },
  },

  // --- ORDENS DE SERVIÇO ---
  workOrders: {
    list: async (params?: { status?: string; limit?: number; offset?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', String(params.limit));
      if (params?.offset) q.append('offset', String(params.offset));
      if (params?.search) q.append('search', params.search);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<{ workOrders: any[]; total: number }>(`/work-orders${queryStr}`);
    },

    getById: async (id: string) => {
      return fetchClient<any>(`/work-orders/${id}`);
    },

    create: async (data: {
      customerId: string;
      vehicleId: string;
      notes?: string;
      scheduledAt?: string;
      services?: Array<{ serviceId: string; name: string; unitPriceCents: number; quantity: number }>;
    }) => {
      return fetchClient<any>('/work-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateStatus: async (id: string, status: WorkOrderStatusType, notes?: string) => {
      return fetchClient<any>(`/work-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      });
    },

    getTimeline: async (id: string) => {
      return fetchClient<any[]>(`/work-orders/${id}/timeline`);
    },
  },

  // --- PAGAMENTOS & ADIANTAMENTOS (SINAL) ---
  payments: {
    create: async (workOrderId: string, data: { amountCents: number; method: string; notes?: string }) => {
      return fetchClient<any>(`/work-orders/${workOrderId}/payments`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    refund: async (paymentId: string, data: { amountCents: number; reason: string }) => {
      return fetchClient<any>(`/payments/${paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // --- CLIENTES E VEÍCULOS ---
  customers: {
    list: async (search?: string) => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      return fetchClient<{ customers: any[] }>(`/customers${q}`);
    },
    getById: async (id: string) => fetchClient<any>(`/customers/${id}`),
    create: async (data: any) =>
      fetchClient<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) =>
      fetchClient<any>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  vehicles: {
    list: async (customerId?: string) => {
      const q = customerId ? `?customerId=${customerId}` : '';
      return fetchClient<{ vehicles: any[] }>(`/vehicles${q}`);
    },
    create: async (data: any) =>
      fetchClient<any>('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) =>
      fetchClient<any>(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // --- CATÁLOGO DE SERVIÇOS ---
  catalog: {
    getServices: async () => fetchClient<{ services: any[] }>('/catalog/services'),
    getPackages: async () => fetchClient<{ packages: any[] }>('/catalog/packages'),
  },

  // --- AGENDA INTELIGENTE POR BOX ---
  appointments: {
    getBays: async () => fetchClient<any[]>('/bays'),
    list: async (params?: { startDate?: string; endDate?: string; bayId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.startDate) q.append('startDate', params.startDate);
      if (params?.endDate) q.append('endDate', params.endDate);
      if (params?.bayId) q.append('bayId', params.bayId);
      if (params?.status) q.append('status', params.status);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<any[]>(`/appointments${qs}`);
    },
    getAvailability: async (date?: string) => {
      const q = date ? `?date=${date}` : '';
      return fetchClient<any[]>(`/appointments/availability${q}`);
    },
    create: async (data: any) =>
      fetchClient<any>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: async (id: string, status: string) =>
      fetchClient<any>(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  // --- APP DO TÉCNICO & CRONÔMETRO OFICIAL ---
  technician: {
    getQueue: async () => fetchClient<{ workOrders: any[] }>('/technician/queue'),
    start: async (workOrderId: string) =>
      fetchClient<any>(`/technician/work-orders/${workOrderId}/start`, { method: 'POST' }),
    pause: async (workOrderId: string, reason?: string) =>
      fetchClient<any>(`/technician/work-orders/${workOrderId}/pause`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    resume: async (workOrderId: string) =>
      fetchClient<any>(`/technician/work-orders/${workOrderId}/resume`, { method: 'POST' }),
    stop: async (workOrderId: string) =>
      fetchClient<any>(`/technician/work-orders/${workOrderId}/stop`, { method: 'POST' }),
    getTimer: async (workOrderId: string) =>
      fetchClient<any>(`/technician/work-orders/${workOrderId}/timer`),
    startWithChecklist: async (workOrderId: string, checklist: any) =>
      fetchClient<any>(`/technician/work-orders/${workOrderId}/start-with-checklist`, {
        method: 'POST',
        body: JSON.stringify(checklist),
      }),
    markRework: async (workOrderId: string, reason: string) =>
      fetchClient<any>(`/technician/work-orders/${workOrderId}/rework`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      }),
  },

  // --- RELATÓRIOS & FINANCEIRO ---
  reports: {
    getDre: async (params?: { startDate?: string; endDate?: string }) => {
      const q = new URLSearchParams();
      if (params?.startDate) q.append('startDate', params.startDate);
      if (params?.endDate) q.append('endDate', params.endDate);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<any>(`/reports/dre${queryStr}`);
    },
    getRanking: async () => fetchClient<{ technicians: any[] }>('/reports/technicians/ranking'),
    getNpsMetrics: async () => fetchClient<NpsMetricsDto>('/nps/metrics'),
  },

  // --- CONTROLE DE QUALIDADE (QA) & GARANTIAS ---
  qa: {
    createAudit: async (data: any) =>
      fetchClient<any>('/qa/audits', { method: 'POST', body: JSON.stringify(data) }),
    getAudits: async (workOrderId: string) =>
      fetchClient<{ audits: any[] }>(`/work-orders/${workOrderId}/qa-audits`),
    createWarranty: async (data: any) =>
      fetchClient<any>('/warranties', { method: 'POST', body: JSON.stringify(data) }),
    getWarranties: async (workOrderId: string) =>
      fetchClient<{ warranties: any[] }>(`/work-orders/${workOrderId}/warranties`),
  },

  // --- TEMPO REAL SSE ---
  realtime: {
    getEventsUrl: () => {
      const token = getStoredToken();
      return `${API_BASE_URL}/realtime/events?token=${encodeURIComponent(token || '')}`;
    },
  },
};

