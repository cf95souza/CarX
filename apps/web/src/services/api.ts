import type {
  UserRoleType,
  WorkOrderStatusType,
  NpsMetricsDto,
  ApiKeyDto,
  WebhookEndpointDto,
  TechnicianQueueItemDto,
  TechnicianRankingItemDto,
  DreReportDto,
  CommissionRuleDto,
  CommissionEntryDto,
  CreateCommissionRuleInputDto,
  PayCommissionEntryInputDto,
  PortalCustomerDto,
  PortalVehicleDto,
  PortalWorkOrderListItemDto,
  PortalWorkOrderDetailDto,
  PortalWorkOrderTimelineEventDto,
  PortalPhotoDto,
  PortalWarrantyDto,
  PortalAuthResponseDto,
  TenantWhatsAppInstanceDto,
  ConnectWhatsAppInputDto,
  ConnectWhatsAppResponseDto,
  SendWhatsAppMessageInputDto,
  SendWhatsAppMessageResponseDto,
  PlateLookupResultDto,
  WorkOrderPixChargeResultDto,
  WorkOrderPixStatusResultDto,
  SendTransactionalWhatsAppResultDto,
  WhatsAppTransactionalEventType,
  MaterialRollDto,
  CreateMaterialRollInputDto,
  RegisterRollScrapInputDto,
  MaterialRollDetailWithHistoryDto,
  PublicVehiclePassportDto,
  TransferVehiclePassportInputDto,
  TransferVehiclePassportResultDto,
  SmartScheduleOverviewResponseDto,
  CalculateDurationInputDto,
  CalculatedDurationResultDto,
  GoogleReputationOverviewDto,
  AnswerNpsSurveyResponseDto,
  PublicMiniSiteResponseDto,
  CreateMiniSiteLeadInputDto,
  MiniSiteLeadDto,
  MiniSitePortfolioItemDto,
  CreateMiniSitePortfolioItemInputDto,
  UpdateMiniSitePortfolioItemInputDto,
  UpdateMiniSiteSettingsInputDto,
  TenantFiscalSettingsDto,
  UpdateFiscalSettingsInputDto,
  FiscalInvoiceDto,
  IssueWorkOrderNfseInputDto,
  CancelNfseInputDto,
  FinancialCategoryDto,
  CreateFinancialCategoryInputDto,
  FinancialBillType,
  FinancialBillStatus,
  FinancialBillDto,
  CreateFinancialBillInputDto,
  AdvancedDreReportDto,
  CashFlowDayPointDto,
  CashFlowProjectionDto,
  BatchPayCommissionsInputDto,
  BatchPayCommissionsResultDto,
  UnitDto,
  CreateUnitInputDto,
  UpdateUnitInputDto,
  CorporateDashboardOverviewDto,
  CreateUnitTransferInputDto,
  UnitTransferDto,
  BatchSyncActionsInputDto,
  BatchSyncResultDto,
  AiAnalyzeDamageInputDto,
  AiDamageDetectionResultDto,
  AiVoiceChecklistInputDto,
  AiVoiceChecklistResultDto,
  ApplyAiSuggestionsInputDto,
  ApplyAiSuggestionsResultDto,
  AiAnalysisHistoryItemDto,
  CrmRetentionOverviewDto,
  WarrantyRevisionItemDto,
  InactiveCustomerItemDto,
  CrmRetentionRuleDto,
  CreateCrmRetentionRuleInputDto,
  TriggerRetentionContactInputDto,
  TriggerRetentionContactResultDto,
  ConvertRetentionContactInputDto,
  RetentionContactItemDto,
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

// --- SESSÃO ESPECÍFICA DO PORTAL DO CLIENTE ("MEU VEÍCULO") ---
export const PORTAL_TOKEN_KEY = 'carx_portal_token';
export const PORTAL_CUSTOMER_KEY = 'carx_portal_customer';

export function getStoredPortalToken(): string | null {
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function setStoredPortalToken(token: string): void {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
}

export function getStoredPortalCustomer(): PortalCustomerDto | null {
  const raw = localStorage.getItem(PORTAL_CUSTOMER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredPortalCustomer(customer: PortalCustomerDto): void {
  localStorage.setItem(PORTAL_CUSTOMER_KEY, JSON.stringify(customer));
}

export function clearStoredPortalAuth(): void {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem(PORTAL_CUSTOMER_KEY);
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

export async function portalFetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredPortalToken();
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

  if (response.status === 401) {
    clearStoredPortalAuth();
    window.dispatchEvent(new Event('carx:portal-auth-expired'));
  }

  return handleResponse<T>(response);
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

  // --- MEMBROS / COLABORADORES DA OFICINA ---
  members: {
    list: async () => fetchClient<any[]>('/tenant/members'),
    create: async (data: { name: string; email: string; password?: string; role?: string }) =>
      fetchClient<any>('/tenant/members', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) =>
      fetchClient<any>(`/tenant/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    resetPassword: async (id: string, newPassword: string) =>
      fetchClient<any>(`/tenant/members/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      }),
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

    getPublicTracking: async (token: string) => {
      return fetchClient<any>(`/work-orders/tracking/${token}`);
    },

    update: async (id: string, data: any) => {
      return fetchClient<any>(`/work-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string) => {
      return fetchClient<any>(`/work-orders/${id}`, {
        method: 'DELETE',
      });
    },

    createPixCharge: async (id: string, amountCents?: number) => {
      return fetchClient<WorkOrderPixChargeResultDto>(`/work-orders/${id}/pix-charge`, {
        method: 'POST',
        body: JSON.stringify({ amountCents }),
      });
    },

    getPixStatus: async (id: string, txid: string) => {
      return fetchClient<WorkOrderPixStatusResultDto>(`/work-orders/${id}/pix-status/${txid}`);
    },

    confirmPixPayment: async (payload: { txid: string; amountCents?: number; payerName?: string }) => {
      return fetchClient<WorkOrderPixStatusResultDto>('/webhooks/pix/confirm', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    notifyWhatsApp: async (
      id: string,
      payload: {
        eventType: WhatsAppTransactionalEventType;
        customMessage?: string;
        appointmentDate?: string;
        appointmentTime?: string;
      }
    ) => {
      return fetchClient<SendTransactionalWhatsAppResultDto>(`/work-orders/${id}/notify-whatsapp`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
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
    list: async (customerId?: string, search?: string) => {
      const q = new URLSearchParams();
      if (customerId) q.append('customerId', customerId);
      if (search) q.append('search', search);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<{ vehicles: any[]; total?: number }>(`/vehicles${qs}`);
    },
    getById: async (id: string) => fetchClient<any>(`/vehicles/${id}`),
    getByPlate: async (plate: string) => fetchClient<any>(`/vehicles/by-plate/${encodeURIComponent(plate)}`),
    lookupPlate: async (plate: string) =>
      fetchClient<PlateLookupResultDto>(`/vehicles/lookup-plate/${encodeURIComponent(plate)}`),
    create: async (data: any) =>
      fetchClient<any>('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) =>
      fetchClient<any>(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id: string) =>
      fetchClient<any>(`/vehicles/${id}`, { method: 'DELETE' }),
  },

  // --- CATÁLOGO DE SERVIÇOS ---
  catalog: {
    getServices: async () => fetchClient<any[]>('/catalog/services'),
    getPackages: async () => fetchClient<{ packages: any[] }>('/catalog/packages'),
    createService: async (data: any) =>
      fetchClient<any>('/catalog/services', { method: 'POST', body: JSON.stringify(data) }),
    updateService: async (id: string, data: any) =>
      fetchClient<any>(`/catalog/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteService: async (id: string) =>
      fetchClient<any>(`/catalog/services/${id}`, { method: 'DELETE' }),
  },

  // --- MATERIAIS / ESTOQUE ---
  materials: {
    list: async (params?: { search?: string; category?: string; isRoll?: boolean; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.category) q.append('category', params.category);
      if (params?.isRoll !== undefined) q.append('isRoll', String(params.isRoll));
      if (params?.page) q.append('page', String(params.page));
      if (params?.limit) q.append('limit', String(params.limit));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<{ materials: any[]; total: number }>(`/materials${qs}`);
    },
    getById: async (id: string) => fetchClient<any>(`/materials/${id}`),
    create: async (data: any) =>
      fetchClient<any>('/materials', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) =>
      fetchClient<any>(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id: string) =>
      fetchClient<any>(`/materials/${id}`, { method: 'DELETE' }),
    getLowStockAlerts: async () =>
      fetchClient<any>('/materials/alerts/low-stock'),
    createMovement: async (data: any) =>
      fetchClient<any>('/materials/movements', { method: 'POST', body: JSON.stringify(data) }),
    getMovements: async (materialId: string) =>
      fetchClient<any[]>(`/materials/${materialId}/movements`),
  },

  // --- CONTROLE DE BOBINAS & ROLOS (PPF E PELÍCULAS - T6.5) ---
  rolls: {
    list: async (params?: { materialId?: string; status?: string; brand?: string; lotNumber?: string }) => {
      const q = new URLSearchParams();
      if (params?.materialId) q.append('materialId', params.materialId);
      if (params?.status) q.append('status', params.status);
      if (params?.brand) q.append('brand', params.brand);
      if (params?.lotNumber) q.append('lotNumber', params.lotNumber);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<MaterialRollDto[]>(`/materials/rolls${qs}`);
    },
    getById: async (id: string) => fetchClient<MaterialRollDto>(`/materials/rolls/${id}`),
    create: async (data: CreateMaterialRollInputDto) =>
      fetchClient<MaterialRollDto>('/materials/rolls', { method: 'POST', body: JSON.stringify(data) }),
    getHistory: async (id: string) =>
      fetchClient<MaterialRollDetailWithHistoryDto>(`/materials/rolls/${id}/history`),
    registerScrap: async (id: string, data: RegisterRollScrapInputDto) =>
      fetchClient<MaterialRollDto>(`/materials/rolls/${id}/scrap`, { method: 'POST', body: JSON.stringify(data) }),
  },

  // --- AGENDA INTELIGENTE POR BOX ---
  appointments: {
    getBays: async () => fetchClient<any[]>('/bays'),
    getSmartOverview: async (date?: string): Promise<SmartScheduleOverviewResponseDto> => {
      const q = date ? `?date=${encodeURIComponent(date)}` : '';
      return fetchClient<SmartScheduleOverviewResponseDto>(`/appointments/smart-overview${q}`);
    },
    calculateDuration: async (data: CalculateDurationInputDto): Promise<CalculatedDurationResultDto> =>
      fetchClient<CalculatedDurationResultDto>('/appointments/calculate-duration', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
    bookOnline: async (data: any, tenantSlug?: string) => {
      const slug = tenantSlug || getStoredTenantSlug() || 'demo';
      return fetchClient<any>(`/public/book/${slug}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateStatus: async (id: string, status: string) =>
      fetchClient<any>(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  // --- APP DO TÉCNICO & CRONÔMETRO OFICIAL ---
  technician: {
    getQueue: async (params?: { scope?: 'mine' | 'all'; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.scope) q.append('scope', params.scope);
      if (params?.status) q.append('status', params.status);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const data = await fetchClient<any>(`/technician/queue${qs}`);
      if (Array.isArray(data)) return data as TechnicianQueueItemDto[];
      if (data?.workOrders && Array.isArray(data.workOrders)) return data.workOrders as TechnicianQueueItemDto[];
      return [] as TechnicianQueueItemDto[];
    },
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
    syncOfflineActions: async (data: BatchSyncActionsInputDto): Promise<BatchSyncResultDto> =>
      fetchClient<BatchSyncResultDto>('/technician/sync', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // --- RELATÓRIOS & FINANCEIRO ---
  reports: {
    getDre: async (params?: { startDate?: string; endDate?: string }): Promise<DreReportDto> => {
      const q = new URLSearchParams();
      if (params?.startDate) q.append('startDate', params.startDate);
      if (params?.endDate) q.append('endDate', params.endDate);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<DreReportDto>(`/reports/dre${queryStr}`);
    },
    getAdvancedDre: async (params?: { startDate?: string; endDate?: string }): Promise<AdvancedDreReportDto> => {
      const q = new URLSearchParams();
      if (params?.startDate) q.append('startDate', params.startDate);
      if (params?.endDate) q.append('endDate', params.endDate);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<AdvancedDreReportDto>(`/reports/dre/advanced${queryStr}`);
    },
    getRanking: async (params?: { startDate?: string; endDate?: string }): Promise<TechnicianRankingItemDto[]> => {
      const q = new URLSearchParams();
      if (params?.startDate) q.append('startDate', params.startDate);
      if (params?.endDate) q.append('endDate', params.endDate);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      const data = await fetchClient<any>(`/reports/technicians/ranking${queryStr}`);
      if (Array.isArray(data)) return data as TechnicianRankingItemDto[];
      if (data?.technicians && Array.isArray(data.technicians)) return data.technicians as TechnicianRankingItemDto[];
      return [] as TechnicianRankingItemDto[];
    },
    getNpsMetrics: async () => fetchClient<NpsMetricsDto>('/nps/metrics'),
  },

  // --- COMISSÕES DE TÉCNICOS & REGRAS ---
  commissions: {
    listRules: async (): Promise<CommissionRuleDto[]> =>
      fetchClient<CommissionRuleDto[]>('/commissions/rules'),
    createRule: async (data: CreateCommissionRuleInputDto): Promise<CommissionRuleDto> =>
      fetchClient<CommissionRuleDto>('/commissions/rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteRule: async (id: string): Promise<{ success: boolean }> =>
      fetchClient<{ success: boolean }>(`/commissions/rules/${id}`, { method: 'DELETE' }),
    listEntries: async (filters?: {
      technicianId?: string;
      workOrderId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }): Promise<CommissionEntryDto[]> => {
      const q = new URLSearchParams();
      if (filters?.technicianId) q.append('technicianId', filters.technicianId);
      if (filters?.workOrderId) q.append('workOrderId', filters.workOrderId);
      if (filters?.status) q.append('status', filters.status);
      if (filters?.startDate) q.append('startDate', filters.startDate);
      if (filters?.endDate) q.append('endDate', filters.endDate);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<CommissionEntryDto[]>(`/commissions/entries${qs}`);
    },
    payEntry: async (id: string, data?: PayCommissionEntryInputDto): Promise<CommissionEntryDto> =>
      fetchClient<CommissionEntryDto>(`/commissions/entries/${id}/pay`, {
        method: 'PATCH',
        body: JSON.stringify(data || {}),
      }),
    batchPay: async (data: BatchPayCommissionsInputDto): Promise<BatchPayCommissionsResultDto> =>
      fetchClient<BatchPayCommissionsResultDto>('/commissions/batch-pay', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    calculate: async (workOrderId: string): Promise<CommissionEntryDto[]> =>
      fetchClient<CommissionEntryDto[]>(`/commissions/calculate/${workOrderId}`, {
        method: 'POST',
      }),
  },

  // --- MÓDULO FINANCEIRO, CONTAS E FLUXO DE CAIXA (T6.11) ---
  financial: {
    listCategories: async (): Promise<FinancialCategoryDto[]> =>
      fetchClient<FinancialCategoryDto[]>('/financial/categories'),
    createCategory: async (data: CreateFinancialCategoryInputDto): Promise<FinancialCategoryDto> =>
      fetchClient<FinancialCategoryDto>('/financial/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listBills: async (filters?: {
      type?: FinancialBillType;
      status?: FinancialBillStatus;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }): Promise<{
      bills: FinancialBillDto[];
      total: number;
      summary: {
        totalPendingPayableCents: number;
        totalPendingReceivableCents: number;
        totalPaidCents: number;
        totalOverdueCents: number;
      };
    }> => {
      const q = new URLSearchParams();
      if (filters?.type) q.append('type', filters.type);
      if (filters?.status) q.append('status', filters.status);
      if (filters?.categoryId) q.append('categoryId', filters.categoryId);
      if (filters?.startDate) q.append('startDate', filters.startDate);
      if (filters?.endDate) q.append('endDate', filters.endDate);
      if (filters?.limit) q.append('limit', String(filters.limit));
      if (filters?.offset) q.append('offset', String(filters.offset));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<any>(`/financial/bills${qs}`);
    },
    createBill: async (data: CreateFinancialBillInputDto): Promise<FinancialBillDto> =>
      fetchClient<FinancialBillDto>('/financial/bills', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    payBill: async (
      id: string,
      data?: { paidAmountCents?: number; paymentMethod?: string }
    ): Promise<FinancialBillDto> =>
      fetchClient<FinancialBillDto>(`/financial/bills/${id}/pay`, {
        method: 'PATCH',
        body: JSON.stringify(data || {}),
      }),
    deleteBill: async (id: string): Promise<{ success: boolean }> =>
      fetchClient<{ success: boolean }>(`/financial/bills/${id}`, {
        method: 'DELETE',
      }),
    getCashFlowProjection: async (days?: number): Promise<CashFlowProjectionDto> => {
      const q = days ? `?days=${days}` : '';
      return fetchClient<CashFlowProjectionDto>(`/financial/cashflow/projection${q}`);
    },
  },

  // --- NPS & PESQUISAS DE SATISFAÇÃO & MOTOR DE REPUTAÇÃO NO GOOGLE (T6.8) ---
  nps: {
    getMetrics: async (): Promise<NpsMetricsDto> => fetchClient<NpsMetricsDto>('/nps/metrics'),
    getReputationOverview: async (): Promise<GoogleReputationOverviewDto> =>
      fetchClient<GoogleReputationOverviewDto>('/nps/reputation-overview'),
    updateGoogleReviewUrl: async (url: string): Promise<{ success: boolean; googleReviewUrl: string }> =>
      fetchClient<{ success: boolean; googleReviewUrl: string }>('/nps/google-review-url', {
        method: 'PUT',
        body: JSON.stringify({ googleReviewUrl: url }),
      }),
    sendGoogleInvite: async (surveyId: string): Promise<{ success: boolean; mode: string; whatsappUrl?: string; messageText: string }> =>
      fetchClient<any>(`/nps/surveys/${surveyId}/send-google-invite`, {
        method: 'POST',
      }),
    getSurveyByToken: async (token: string): Promise<any> =>
      fetchClient<any>(`/public/nps/${token}`),
    answerSurvey: async (token: string, data: { score: number; comment?: string; googleReviewClicked?: boolean }): Promise<AnswerNpsSurveyResponseDto> =>
      fetchClient<AnswerNpsSurveyResponseDto>(`/public/nps/${token}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    recordGoogleClick: async (token: string): Promise<{ success: boolean }> =>
      fetchClient<{ success: boolean }>(`/public/nps/${token}/google-click`, {
        method: 'POST',
      }),
    listSurveys: async (params?: { classification?: string; status?: string }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.classification) q.append('classification', params.classification);
      if (params?.status) q.append('status', params.status);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<any[]>(`/nps/surveys${qs}`);
    },
    createSurvey: async (workOrderId: string): Promise<any> =>
      fetchClient<any>('/nps/surveys', {
        method: 'POST',
        body: JSON.stringify({ workOrderId }),
      }),
    listReminders: async (): Promise<any[]> => fetchClient<any[]>('/maintenance/reminders'),
  },

  // --- LAUDO DE INSPEÇÃO DIGITAL (VCR) & CHECKLIST ---
  inspections: {
    getByWorkOrder: async (workOrderId: string) =>
      fetchClient<{ inspections: any[] }>(`/work-orders/${workOrderId}/inspections`),
    getById: async (id: string) => fetchClient<any>(`/inspections/${id}`),
    create: async (data: any) =>
      fetchClient<any>('/inspections', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) =>
      fetchClient<any>(`/inspections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    addDamagePoint: async (id: string, data: any) =>
      fetchClient<any>(`/inspections/${id}/damage-points`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    removeDamagePoint: async (id: string, pointId: string) =>
      fetchClient<any>(`/inspections/${id}/damage-points/${pointId}`, { method: 'DELETE' }),
    addPhoto: async (id: string, data: any) =>
      fetchClient<any>(`/inspections/${id}/photos`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    removePhoto: async (id: string, photoId: string) =>
      fetchClient<any>(`/inspections/${id}/photos/${photoId}`, { method: 'DELETE' }),
    sign: async (id: string, data: { customerSignatureName: string; signatureBase64: string }) =>
      fetchClient<any>(`/inspections/${id}/sign`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    generatePdf: async (id: string) =>
      fetchClient<any>(`/inspections/${id}/generate-pdf`, { method: 'POST' }),
    getPdfUrl: (id: string) => {
      const token = getStoredToken();
      return `${API_BASE_URL}/inspections/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
  },

  // --- ARMAZENAMENTO DE ARQUIVOS (MinIO / S3) ---
  storage: {
    upload: async (file: File, options?: { category?: string; entityId?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (options?.category) formData.append('category', options.category);
      if (options?.entityId) formData.append('entityId', options.entityId);

      const token = getStoredToken();
      const tenantId = getStoredTenantId();
      const tenantSlug = getStoredTenantSlug();

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (tenantId) headers['x-tenant-id'] = tenantId;
      if (tenantSlug) headers['x-tenant-slug'] = tenantSlug;

      const res = await fetch(`${API_BASE_URL}/storage/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new ApiError(errorData.message || 'Erro no upload de arquivo', res.status, errorData);
      }

      return res.json();
    },
    getFileUrl: async (fileId: string) =>
      fetchClient<{ downloadUrl: string }>(`/storage/files/${fileId}/url`),
    listFiles: async (category?: string) => {
      const q = category ? `?category=${encodeURIComponent(category)}` : '';
      return fetchClient<any[]>(`/storage/files${q}`);
    },
    deleteFile: async (fileId: string) =>
      fetchClient<any>(`/storage/files/${fileId}`, { method: 'DELETE' }),
  },

  // --- CONTROLE DE QUALIDADE (QA) & GARANTIAS ---
  qa: {
    createAudit: async (data: {
      workOrderId: string;
      status: 'approved' | 'rejected_rework';
      score: number;
      checklistItems: Array<{ id: string; label: string; checked: boolean }>;
      reworkReason?: string;
      notes?: string;
    }) =>
      fetchClient<any>('/qa/audits', { method: 'POST', body: JSON.stringify(data) }),
    getAudits: async (workOrderId: string) =>
      fetchClient<{ audits: any[] }>(`/work-orders/${workOrderId}/qa-audits`),
    createWarranty: async (data: any) =>
      fetchClient<any>('/warranties', { method: 'POST', body: JSON.stringify(data) }),
    getWarranties: async (workOrderId: string) =>
      fetchClient<{ warranties: any[] }>(`/work-orders/${workOrderId}/warranties`),
    verifyPassport: async (token: string) =>
      fetchClient<PublicVehiclePassportDto>(`/public/passports/${token}`),
    transferPassport: async (token: string, data: TransferVehiclePassportInputDto) =>
      fetchClient<TransferVehiclePassportResultDto>(`/public/passports/${token}/transfer`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getWarrantyPdfUrl: (warrantyId: string) => {
      const token = getStoredToken();
      return `${API_BASE_URL}/warranties/${warrantyId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
  },

  // --- PASSAPORTE DIGITAL DO VEÍCULO (T6.6) ---
  passports: {
    getByToken: async (token: string) =>
      fetchClient<PublicVehiclePassportDto>(`/public/passports/${token}`),
    transfer: async (token: string, data: TransferVehiclePassportInputDto) =>
      fetchClient<TransferVehiclePassportResultDto>(`/public/passports/${token}/transfer`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // --- TEMPO REAL SSE ---
  realtime: {
    getEventsUrl: () => {
      const token = getStoredToken();
      return `${API_BASE_URL}/realtime/events?token=${encodeURIComponent(token || '')}`;
    },
  },

  // --- BRANDING & IDENTIDADE VISUAL ---
  branding: {
    get: async (slug?: string) => {
      const q = slug ? `?slug=${encodeURIComponent(slug)}` : '';
      return fetchClient<any>(`/tenant/branding${q}`);
    },
    update: async (data: any) =>
      fetchClient<any>('/tenant/branding', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // --- PORTAL DO CLIENTE ("MEU VEÍCULO") ---
  portal: {
    requestOtp: async (data: { identifier: string; tenantId?: string }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const tenantId = data.tenantId || getStoredTenantId();
      const tenantSlug = getStoredTenantSlug();
      if (tenantId) headers['x-tenant-id'] = tenantId;
      if (tenantSlug) headers['x-tenant-slug'] = tenantSlug;

      const res = await fetch(`${API_BASE_URL}/portal/auth/request-otp`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ identifier: data.identifier }),
      });
      return handleResponse<{ success: boolean; message: string; devOtpCode?: string }>(res);
    },

    verifyOtp: async (data: { identifier: string; code: string; tenantId?: string }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const tenantId = data.tenantId || getStoredTenantId();
      const tenantSlug = getStoredTenantSlug();
      if (tenantId) headers['x-tenant-id'] = tenantId;
      if (tenantSlug) headers['x-tenant-slug'] = tenantSlug;

      const res = await fetch(`${API_BASE_URL}/portal/auth/verify-otp`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ identifier: data.identifier, code: data.code }),
      });
      const auth = await handleResponse<PortalAuthResponseDto>(res);
      setStoredPortalToken(auth.token);
      setStoredPortalCustomer(auth.customer);
      return auth;
    },

    getProfile: async () => portalFetchClient<PortalCustomerDto>('/portal/me'),
    getVehicles: async () => portalFetchClient<{ vehicles: PortalVehicleDto[] }>('/portal/vehicles'),
    getWorkOrders: async () =>
      portalFetchClient<{ workOrders: PortalWorkOrderListItemDto[] }>('/portal/work-orders'),
    getWorkOrderDetail: async (id: string) =>
      portalFetchClient<PortalWorkOrderDetailDto>(`/portal/work-orders/${id}`),
    getWorkOrderTimeline: async (id: string) =>
      portalFetchClient<{ events: PortalWorkOrderTimelineEventDto[] }>(`/portal/work-orders/${id}/timeline`),
    getWorkOrderPhotos: async (id: string) =>
      portalFetchClient<{ photos: PortalPhotoDto[] }>(`/portal/work-orders/${id}/photos`),
    getWarranties: async () =>
      portalFetchClient<{ warranties: PortalWarrantyDto[] }>('/portal/warranties'),
    logout: () => {
      clearStoredPortalAuth();
    },
  },

  // Gateway de WhatsApp Desacoplado da Loja (Padrão OperaBeauty)
  whatsapp: {
    getInstance: async () => fetchClient<TenantWhatsAppInstanceDto>('/tenant/whatsapp/instance'),
    connect: async (data: ConnectWhatsAppInputDto) =>
      fetchClient<ConnectWhatsAppResponseDto>('/tenant/whatsapp/connect', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    disconnect: async () =>
      fetchClient<TenantWhatsAppInstanceDto>('/tenant/whatsapp/disconnect', {
        method: 'POST',
      }),
    sendTestMessage: async (data: SendWhatsAppMessageInputDto) =>
      fetchClient<SendWhatsAppMessageResponseDto>('/tenant/whatsapp/send-test', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Onboarding Self-Service Guiado por Segmento (T5.3)
  onboarding: {
    selfRegister: async (data: {
      trade_name: string;
      owner_name: string;
      owner_email: string;
      owner_password: string;
      phone?: string;
      cnpj?: string;
      slug?: string;
      segment?: string;
      plan_slug?: string;
      website?: string;
    }) => {
      const res = await fetch(`${API_BASE_URL}/public/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse<{
        success: boolean;
        message: string;
        tokens: { accessToken: string; refreshToken: string; expiresInSeconds: number };
        tenant: { id: string; slug: string; trade_name: string; segment: string; status: string; trial_ends_at: string };
        user: { id: string; name: string; email: string; role: string };
        injectedCatalog: { servicesCount: number; checklistTemplatesCount: number; sampleServices: string[] };
        firstStepsChecklist: Array<{ id: string; title: string; description: string; completed: boolean; actionUrl: string }>;
      }>(res);
    },
    getStatus: async () =>
      fetchClient<{
        is_completed: boolean;
        progress_percent: number;
        steps: Array<{ id: string; title: string; description: string; completed: boolean; actionUrl: string }>;
        segment: string;
        trial_ends_at: string | null;
        days_remaining: number;
      }>('/tenant/onboarding/status'),
    complete: async () =>
      fetchClient<{ success: boolean; message: string; is_completed: boolean }>('/tenant/onboarding/complete', {
        method: 'POST',
      }),
    markStep: async (stepId: string) =>
      fetchClient<{ success: boolean; stepId: string; completed: boolean }>('/tenant/onboarding/step', {
        method: 'POST',
        body: JSON.stringify({ stepId }),
      }),
  },

  // --- MINI-SITE INSTITUCIONAL DA OFICINA, PORTFÓLIO E LEADS (T6.9) ---
  minisite: {
    // Público
    getPublicData: async (slug: string): Promise<PublicMiniSiteResponseDto> =>
      fetchClient<PublicMiniSiteResponseDto>(`/public/tenant/${slug}/site`),
    createLead: async (slug: string, data: CreateMiniSiteLeadInputDto): Promise<MiniSiteLeadDto> =>
      fetchClient<MiniSiteLeadDto>(`/public/tenant/${slug}/leads`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Gestor Autenticado
    listPortfolio: async (): Promise<MiniSitePortfolioItemDto[]> =>
      fetchClient<MiniSitePortfolioItemDto[]>('/minisite/portfolio'),
    createPortfolioItem: async (data: CreateMiniSitePortfolioItemInputDto): Promise<MiniSitePortfolioItemDto> =>
      fetchClient<MiniSitePortfolioItemDto>('/minisite/portfolio', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updatePortfolioItem: async (id: string, data: UpdateMiniSitePortfolioItemInputDto): Promise<MiniSitePortfolioItemDto> =>
      fetchClient<MiniSitePortfolioItemDto>(`/minisite/portfolio/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deletePortfolioItem: async (id: string): Promise<{ success: boolean }> =>
      fetchClient<{ success: boolean }>(`/minisite/portfolio/${id}`, {
        method: 'DELETE',
      }),
    listLeads: async (status?: string): Promise<MiniSiteLeadDto[]> => {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      return fetchClient<MiniSiteLeadDto[]>(`/minisite/leads${q}`);
    },
    updateLeadStatus: async (id: string, status: 'new' | 'contacted' | 'converted' | 'discarded'): Promise<{ success: boolean }> =>
      fetchClient<{ success: boolean }>(`/minisite/leads/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    updateSettings: async (data: UpdateMiniSiteSettingsInputDto): Promise<{ success: boolean }> =>
      fetchClient<{ success: boolean }>('/minisite/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // --- MÓDULO FISCAL: EMISSÃO AUTOMÁTICA DE NFS-E (T6.10) ---
  fiscal: {
    getSettings: async (): Promise<TenantFiscalSettingsDto> =>
      fetchClient<TenantFiscalSettingsDto>('/fiscal/settings'),
    updateSettings: async (data: UpdateFiscalSettingsInputDto): Promise<TenantFiscalSettingsDto> =>
      fetchClient<TenantFiscalSettingsDto>('/fiscal/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getInvoiceByWorkOrder: async (workOrderId: string): Promise<FiscalInvoiceDto | null> => {
      try {
        return await fetchClient<FiscalInvoiceDto>(`/work-orders/${workOrderId}/fiscal-invoice`);
      } catch (err: any) {
        if (err.statusCode === 404) return null;
        throw err;
      }
    },
    issueNfse: async (workOrderId: string, data?: IssueWorkOrderNfseInputDto): Promise<FiscalInvoiceDto> =>
      fetchClient<FiscalInvoiceDto>(`/work-orders/${workOrderId}/issue-nfse`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    listInvoices: async (filters?: { status?: string; limit?: number; offset?: number }): Promise<{ invoices: FiscalInvoiceDto[]; total: number }> => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.offset) params.set('offset', String(filters.offset));
      const qs = params.toString() ? `?${params.toString()}` : '';
      return fetchClient<{ invoices: FiscalInvoiceDto[]; total: number }>(`/fiscal/invoices${qs}`);
    },
    cancelNfse: async (invoiceId: string, reason: string): Promise<FiscalInvoiceDto> =>
      fetchClient<FiscalInvoiceDto>(`/fiscal/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  // --- PAINEL CORPORATIVO DE REDES E FRANQUIAS MULTIUNIDADE (T6.12) ---
  corporate: {
    getOverview: async (filters?: {
      startDate?: string;
      endDate?: string;
    }): Promise<CorporateDashboardOverviewDto> => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return fetchClient<CorporateDashboardOverviewDto>(`/corporate/overview${qs}`);
    },
    listUnits: async (): Promise<UnitDto[]> =>
      fetchClient<UnitDto[]>('/corporate/units'),
    getUnitById: async (id: string): Promise<UnitDto> =>
      fetchClient<UnitDto>(`/corporate/units/${id}`),
    createUnit: async (data: CreateUnitInputDto): Promise<UnitDto> =>
      fetchClient<UnitDto>('/corporate/units', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateUnit: async (id: string, data: UpdateUnitInputDto): Promise<UnitDto> =>
      fetchClient<UnitDto>(`/corporate/units/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    transferInventory: async (
      data: CreateUnitTransferInputDto
    ): Promise<UnitTransferDto> =>
      fetchClient<UnitTransferDto>('/corporate/transfers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listTransfers: async (): Promise<UnitTransferDto[]> =>
      fetchClient<UnitTransferDto[]>('/corporate/transfers'),
  },

  // --- INTELIGÊNCIA ARTIFICIAL: VISTORIA INTELIGENTE & SUGESTÃO DE ORÇAMENTO (T6.14) ---
  ai: {
    analyzeDamage: async (data: AiAnalyzeDamageInputDto): Promise<AiDamageDetectionResultDto> =>
      fetchClient<AiDamageDetectionResultDto>('/ai/inspections/analyze-damage', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    extractVoiceChecklist: async (data: AiVoiceChecklistInputDto): Promise<AiVoiceChecklistResultDto> =>
      fetchClient<AiVoiceChecklistResultDto>('/ai/inspections/extract-voice', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    applyToWorkOrder: async (data: ApplyAiSuggestionsInputDto): Promise<ApplyAiSuggestionsResultDto> =>
      fetchClient<ApplyAiSuggestionsResultDto>('/ai/inspections/apply-to-work-order', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getHistory: async (workOrderId: string): Promise<{ history: AiAnalysisHistoryItemDto[] }> =>
      fetchClient<{ history: AiAnalysisHistoryItemDto[] }>(`/ai/inspections/history/${workOrderId}`),
  },

  // --- CRM DE PÓS-VENDA, GARANTIAS PERIÓDICAS & RETENÇÃO ATIVA (T6.15) ---
  crm: {
    getOverview: async (): Promise<CrmRetentionOverviewDto> =>
      fetchClient<CrmRetentionOverviewDto>('/crm/retention/overview'),
    getWarrantyRevisions: async (): Promise<WarrantyRevisionItemDto[]> =>
      fetchClient<WarrantyRevisionItemDto[]>('/crm/retention/warranty-revisions'),
    getInactiveCustomers: async (params?: {
      minDays?: number;
      tier?: string;
    }): Promise<InactiveCustomerItemDto[]> => {
      const q = new URLSearchParams();
      if (params?.minDays) q.set('minDays', String(params.minDays));
      if (params?.tier) q.set('tier', params.tier);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return fetchClient<InactiveCustomerItemDto[]>(`/crm/retention/inactive-customers${qs}`);
    },
    getRules: async (): Promise<CrmRetentionRuleDto[]> =>
      fetchClient<CrmRetentionRuleDto[]>('/crm/retention/rules'),
    createRule: async (data: CreateCrmRetentionRuleInputDto): Promise<CrmRetentionRuleDto> =>
      fetchClient<CrmRetentionRuleDto>('/crm/retention/rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    triggerContact: async (
      data: TriggerRetentionContactInputDto
    ): Promise<TriggerRetentionContactResultDto> =>
      fetchClient<TriggerRetentionContactResultDto>('/crm/retention/trigger-contact', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getContacts: async (): Promise<RetentionContactItemDto[]> =>
      fetchClient<RetentionContactItemDto[]>('/crm/retention/contacts'),
    convertContact: async (
      contactId: string,
      data: ConvertRetentionContactInputDto
    ): Promise<{ success: boolean; message: string }> =>
      fetchClient<{ success: boolean; message: string }>(`/crm/retention/contacts/${contactId}/convert`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};

