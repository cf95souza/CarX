import { z } from 'zod';
import { WorkOrderStatus, WorkOrderStatusType, UserRole, VehicleClass, DamageType } from './enums.js';

// ==============================================================================
// FUNÇÕES UTILITÁRIAS DE NORMALIZAÇÃO E VALIDAÇÃO AUTOMOTIVA
// ==============================================================================

/**
 * Normaliza número de telefone para o padrão internacional E.164 (ex: +5511999998888)
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';

  // Se já possui código de país 55 com 12 ou 13 dígitos
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return `+${digits}`;
  }

  // Se for celular com DDD brasileiro (11 dígitos, ex: 11987654321) ou fixo (10 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  // Se já vier com sinal de mais
  if (rawPhone.trim().startsWith('+')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

/**
 * Normaliza placa de veículo (converte para maiúsculas e remove hifens/espaços)
 * Ex: "abc-1234" -> "ABC1234", "bra-2e19" -> "BRA2E19"
 */
export function normalizePlate(rawPlate: string): string {
  if (!rawPlate) return '';
  return rawPlate.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

/**
 * Valida formato da placa automotiva no Brasil (Padrão Cinza Tradicional ou Mercosul)
 * - Tradicional: 3 letras e 4 números (ex: ABC1234)
 * - Mercosul: 3 letras, 1 número, 1 letra, 2 números (ex: ABC1D23)
 */
export function validatePlate(plate: string): boolean {
  const clean = normalizePlate(plate);
  const regexTradicional = /^[A-Z]{3}[0-9]{4}$/;
  const regexMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  return regexTradicional.test(clean) || regexMercosul.test(clean);
}

/**
 * Remove caracteres especiais de documento
 */
export function cleanDocument(rawDoc: string): string {
  if (!rawDoc) return '';
  return rawDoc.replace(/\D/g, '').trim();
}

/**
 * Validação com cálculo de dígito verificador de CPF
 */
export function validateCpf(cpf: string): boolean {
  const clean = cleanDocument(cpf);
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Validação com cálculo de dígito verificador de CNPJ
 */
export function validateCnpj(cnpj: string): boolean {
  const clean = cleanDocument(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

// ==============================================================================
// SCHEMAS E DTOS: CLIENTES (CUSTOMERS)
// ==============================================================================

export const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  document: z.string().optional().nullable(),
  documentType: z.enum(['cpf', 'cnpj', 'outro']).default('cpf').optional(),
  phone: z.string().min(8, 'Telefone obrigatório'),
  phoneRaw: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  addressStreet: z.string().optional().nullable(),
  addressNumber: z.string().optional().nullable(),
  addressComplement: z.string().optional().nullable(),
  addressNeighborhood: z.string().optional().nullable(),
  addressCity: z.string().optional().nullable(),
  addressState: z.string().max(2).optional().nullable(),
  addressZipCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true).optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export type CustomerDto = z.infer<typeof CustomerSchema>;

export interface CreateCustomerDto {
  name: string;
  phone: string;
  document?: string | null;
  documentType?: 'cpf' | 'cnpj' | 'outro';
  email?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
  isActive?: boolean;
}

// ==============================================================================
// SCHEMAS E DTOS: VEÍCULOS (VEHICLES)
// ==============================================================================

export const VehicleSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  customerId: z.string().uuid('ID de cliente inválido'),
  plate: z.string().min(7, 'Placa deve ter no mínimo 7 caracteres').transform(normalizePlate),
  plateRaw: z.string().optional().nullable(),
  brand: z.string().min(2, 'Marca obrigatória'),
  model: z.string().min(2, 'Modelo obrigatório'),
  year: z.number().int().optional().nullable(),
  color: z.string().optional().nullable(),
  sizeClass: z.enum(['moto', 'hatch', 'sedan', 'suv', 'pickup', 'esportivo', 'van']).default('sedan'),
  vin: z.string().optional().nullable(),
  currentKm: z.number().int().min(0).default(0).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true).optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export type VehicleDto = z.infer<typeof VehicleSchema>;

export interface CreateVehicleDto {
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year?: number | null;
  color?: string | null;
  sizeClass?: 'moto' | 'hatch' | 'sedan' | 'suv' | 'pickup' | 'esportivo' | 'van';
  vin?: string | null;
  currentKm?: number;
  notes?: string | null;
}

export interface UpdateVehicleDto extends Partial<Omit<CreateVehicleDto, 'customerId'>> {
  customerId?: string;
  isActive?: boolean;
}

export interface PlateLookupResultDto {
  plate: string;
  isMercosul: boolean;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  modelYear?: number | null;
  color?: string | null;
  sizeClass?: VehicleSizeClassType | null;
  chassisMask?: string | null;
  fipePriceCents?: number | null;
  source: 'local_tenant' | 'cache' | 'national_registry' | 'provider' | 'not_found';
  cachedAt?: string | null;
  existingCustomer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
}

/**
 * Inferência de porte veicular padrão automotivo (CarX Automotive Engine)
 */
export function inferVehicleSizeClass(brand = '', model = ''): VehicleSizeClassType {
  const text = `${brand} ${model}`.toLowerCase();

  // 1. Motos (Checar antes de carros, evitando colisões com siglas de versão de carros como XRE da Toyota)
  if (
    text.includes('cg 160') ||
    text.includes('honda biz') ||
    text.includes('fazer') ||
    text.includes('yamaha mt') ||
    text.includes('honda xre') ||
    text.includes('xre 300') ||
    text.includes('xre 190') ||
    text.includes('pcx') ||
    text.includes('nmax') ||
    text.includes('bmw r') ||
    text.includes('s1000rr') ||
    text.includes('s1000r') ||
    text.includes('cbr') ||
    text.includes('hayabusa') ||
    text.includes('ninja') ||
    text.includes('tiger') ||
    text.includes('moto') ||
    text.includes('bros')
  ) {
    return 'moto';
  }

  // 2. Pickups / Camionetes
  if (
    text.includes('toro') ||
    text.includes('strada') ||
    text.includes('hilux') ||
    text.includes('ranger') ||
    (/\bs10\b/.test(text) && !text.includes('s1000')) ||
    text.includes('amarok') ||
    text.includes('montana') ||
    text.includes('saveiro') ||
    text.includes('maverick') ||
    text.includes('rampage') ||
    text.includes('ram 1500') ||
    text.includes('ram 2500') ||
    text.includes('frontier') ||
    text.includes('titano') ||
    text.includes('l200') ||
    text.includes('pickup') ||
    text.includes('picape')
  ) {
    return 'pickup';
  }

  // 3. Vans / Furgões / Utilitários
  if (
    text.includes('fiorino') ||
    text.includes('kangoo') ||
    text.includes('partner') ||
    text.includes('sprinter') ||
    text.includes('master') ||
    text.includes('transit') ||
    text.includes('ducato') ||
    text.includes('boxer') ||
    text.includes('expert') ||
    text.includes('jumpy') ||
    text.includes('combo') ||
    text.includes('van') ||
    text.includes('furg')
  ) {
    return 'van';
  }

  // 4. Esportivos
  if (
    text.includes('mustang') ||
    text.includes('camaro') ||
    text.includes('porsche') ||
    text.includes('911') ||
    text.includes('corvette') ||
    text.includes('ferrari') ||
    text.includes('audi tt') ||
    text.includes('audi r8') ||
    text.includes('bmw m3') ||
    text.includes('bmw m4') ||
    text.includes('bmw z4') ||
    text.includes('amg gt')
  ) {
    return 'esportivo';
  }

  // 5. SUVs (Compactos e Médios/Grandes)
  if (
    text.includes('tera') ||
    text.includes('tracker') ||
    text.includes('t-cross') ||
    text.includes('tcross') ||
    text.includes('nivus') ||
    text.includes('pulse') ||
    text.includes('fastback') ||
    text.includes('renegade') ||
    text.includes('compass') ||
    text.includes('commander') ||
    text.includes('creta') ||
    text.includes('kicks') ||
    text.includes('duster') ||
    text.includes('hr-v') ||
    text.includes('hrv') ||
    text.includes('wr-v') ||
    text.includes('corolla cross') ||
    text.includes('sw4') ||
    text.includes('taos') ||
    text.includes('tiguan') ||
    text.includes('tiggo') ||
    text.includes('haval') ||
    text.includes('song plus') ||
    text.includes('yuan') ||
    text.includes('xc40') ||
    text.includes('xc60') ||
    text.includes('q3') ||
    text.includes('q5') ||
    text.includes('x1') ||
    text.includes('x3') ||
    text.includes('suv') ||
    text.includes('cross')
  ) {
    return 'suv';
  }

  // 6. Hatches
  if (
    text.includes('onix') && !text.includes('plus') ||
    text.includes('hb20') && !text.includes('s') ||
    text.includes('gol') ||
    text.includes('polo') ||
    text.includes('argo') ||
    text.includes('mobi') ||
    text.includes('kwid') ||
    text.includes('c3') ||
    text.includes('208') ||
    text.includes('sandero') ||
    text.includes('dolphin') ||
    text.includes('up!') ||
    text.includes('fox') ||
    text.includes('hatch')
  ) {
    return 'hatch';
  }

  // 7. Sedans
  if (
    text.includes('corolla') && !text.includes('cross') ||
    text.includes('civic') ||
    text.includes('city') ||
    text.includes('virtus') ||
    text.includes('cronos') ||
    text.includes('onix plus') ||
    text.includes('hb20s') ||
    text.includes('sentra') ||
    text.includes('jetta') ||
    text.includes('cruze') ||
    text.includes('versa') ||
    text.includes('cerato') ||
    text.includes('seal') ||
    text.includes('yaris sedan') ||
    text.includes('sedan')
  ) {
    return 'sedan';
  }

  return 'sedan';
}

// ==============================================================================
// ORDENS DE SERVIÇO E MÁQUINA DE ESTADOS (T3.3)
// ==============================================================================

export const ALLOWED_WORK_ORDER_TRANSITIONS: Record<WorkOrderStatusType, readonly WorkOrderStatusType[]> = {
  [WorkOrderStatus.QUOTE]: [
    WorkOrderStatus.APPROVED,
    WorkOrderStatus.SCHEDULED,
    WorkOrderStatus.CHECKED_IN,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.APPROVED]: [
    WorkOrderStatus.QUOTE,
    WorkOrderStatus.SCHEDULED,
    WorkOrderStatus.CHECKED_IN,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.SCHEDULED]: [
    WorkOrderStatus.QUOTE,
    WorkOrderStatus.APPROVED,
    WorkOrderStatus.CHECKED_IN,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.QA,
    WorkOrderStatus.READY,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.CHECKED_IN]: [
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.PAUSED,
    WorkOrderStatus.QA,
    WorkOrderStatus.READY,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.IN_PROGRESS]: [
    WorkOrderStatus.QA,
    WorkOrderStatus.READY,
    WorkOrderStatus.PAUSED,
    WorkOrderStatus.CHECKED_IN,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.PAUSED]: [
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.QA,
    WorkOrderStatus.READY,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.QA]: [
    WorkOrderStatus.READY,
    WorkOrderStatus.IN_PROGRESS, // Se reprovado no QA, volta para correções
    WorkOrderStatus.DELIVERED,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.READY]: [
    WorkOrderStatus.DELIVERED,
    WorkOrderStatus.QA,
    WorkOrderStatus.IN_PROGRESS, // Retorno pontual antes da saída
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.DELIVERED]: [
    WorkOrderStatus.READY,
  ],
  [WorkOrderStatus.CANCELED]: [WorkOrderStatus.QUOTE],
} as const;

export function isValidWorkOrderTransition(
  from: WorkOrderStatusType,
  to: WorkOrderStatusType
): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_WORK_ORDER_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export const WorkOrderItemSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  workOrderId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Nome do item obrigatório'),
  category: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  unitPriceCents: z.number().int().min(0).default(0),
  discountCents: z.number().int().min(0).default(0),
  totalCents: z.number().int().min(0).default(0),
  estimatedMinutes: z.number().int().min(0).default(0),
  warrantyMonths: z.number().int().min(0).default(3),
  customOrder: z.number().int().min(0).default(0),
  createdAt: z.date().or(z.string()).optional(),
});
export type WorkOrderItemDto = z.infer<typeof WorkOrderItemSchema>;

export const WorkOrderEventSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  workOrderId: z.string().uuid().optional(),
  userId: z.string().uuid().optional().nullable(),
  userName: z.string().optional().nullable(),
  fromStatus: z.string().optional().nullable(),
  toStatus: z.string(),
  eventType: z.string().default('STATUS_CHANGE'),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date().or(z.string()).optional(),
});
export type WorkOrderEventDto = z.infer<typeof WorkOrderEventSchema>;

export const WorkOrderSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  technicianId: z.string().uuid().optional().nullable(),
  osNumber: z.number().int().positive().optional(),
  status: z.nativeEnum(WorkOrderStatus).default(WorkOrderStatus.QUOTE),
  previousStatus: z.string().optional().nullable(),
  origin: z.string().default('INTERNAL').optional(),
  progress: z.number().min(0).max(100).default(0),
  totalCents: z.number().int().min(0).default(0),
  discountCents: z.number().int().min(0).default(0),
  finalCents: z.number().int().min(0).default(0),
  paidCents: z.number().int().min(0).default(0),
  totalValue: z.number().min(0).default(0), // retrocompatibilidade
  discountValue: z.number().min(0).default(0), // retrocompatibilidade
  paidValue: z.number().min(0).default(0), // retrocompatibilidade
  estimatedMinutes: z.number().int().min(0).default(0),
  scheduledAt: z.date().or(z.string()).optional().nullable(),
  checkedInAt: z.date().or(z.string()).optional().nullable(),
  startedAt: z.date().or(z.string()).optional().nullable(),
  completedAt: z.date().or(z.string()).optional().nullable(),
  deliveredAt: z.date().or(z.string()).optional().nullable(),
  canceledAt: z.date().or(z.string()).optional().nullable(),
  cancelReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  publicNotes: z.string().optional().nullable(),
  acceptedAt: z.date().or(z.string()).optional().nullable(),
  acceptedIp: z.string().optional().nullable(),
  acceptedUserAgent: z.string().optional().nullable(),
  acceptedSignatureName: z.string().optional().nullable(),
  depositRequiredCents: z.number().int().min(0).default(0).optional(),
  depositPixCode: z.string().optional().nullable(),
  depositPixQrBase64: z.string().optional().nullable(),
  depositPaidAt: z.date().or(z.string()).optional().nullable(),
  trackingToken: z.string().uuid().optional(),
  pixLastTxid: z.string().optional().nullable(),
  items: z.array(WorkOrderItemSchema).optional(),
  events: z.array(WorkOrderEventSchema).optional(),
  customer: z.any().optional(),
  vehicle: z.any().optional(),
  technician: z.any().optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type WorkOrderDto = z.infer<typeof WorkOrderSchema>;

export interface CreateWorkOrderItemInput {
  serviceId?: string | null;
  name: string;
  category?: string | null;
  quantity?: number;
  unitPriceCents: number;
  discountCents?: number;
  estimatedMinutes?: number;
  warrantyMonths?: number;
}

export interface CreateWorkOrderDto {
  customerId: string;
  vehicleId: string;
  technicianId?: string | null;
  status?: WorkOrderStatusType;
  origin?: string;
  discountCents?: number;
  depositRequiredCents?: number;
  scheduledAt?: string | Date | null;
  notes?: string | null;
  customerNotes?: string | null;
  publicNotes?: string | null;
  items?: CreateWorkOrderItemInput[];
}

export interface UpdateWorkOrderDto {
  technicianId?: string | null;
  discountCents?: number;
  depositRequiredCents?: number;
  scheduledAt?: string | Date | null;
  notes?: string | null;
  customerNotes?: string | null;
  publicNotes?: string | null;
}

export interface ChangeWorkOrderStatusDto {
  status: WorkOrderStatusType;
  notes?: string | null;
  cancelReason?: string | null;
  metadata?: Record<string, any>;
}

// ==============================================================================
// PIX INTEGRADO PARA ORDENS DE SERVIÇO & CONCILIAÇÃO ATÔMICA (T6.3)
// ==============================================================================

export const CreateWorkOrderPixChargeInputSchema = z.object({
  amountCents: z.number().int().min(100, 'Valor mínimo para cobrança Pix é R$ 1,00').optional(),
});
export type CreateWorkOrderPixChargeInputDto = z.infer<typeof CreateWorkOrderPixChargeInputSchema>;

export interface WorkOrderPixChargeResultDto {
  workOrderId: string;
  osNumber: number;
  amountCents: number;
  pixCode: string;
  pixQrBase64: string;
  txid: string;
  remainingBalanceCents: number;
  expiresAt: string;
}

export const ConfirmWorkOrderPixWebhookSchema = z.object({
  txid: z.string().min(5, 'txid é obrigatório para conciliação Pix'),
  amountCents: z.number().int().min(1).optional(),
  e2eId: z.string().optional(),
  payerName: z.string().optional(),
  secretToken: z.string().optional(),
});
export type ConfirmWorkOrderPixWebhookDto = z.infer<typeof ConfirmWorkOrderPixWebhookSchema>;

export interface WorkOrderPixStatusResultDto {
  workOrderId: string;
  osNumber: number;
  txid: string;
  status: 'pending' | 'approved' | 'refunded' | 'failed';
  paidCents: number;
  finalCents: number;
  isFullyPaid: boolean;
  paidAt?: string | null;
}

export interface PublicQuoteItemDto {
  name: string;
  category?: string | null;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  finalCents: number;
  estimatedMinutes?: number;
  warrantyMonths?: number;
}

export interface PublicQuoteVcrPhotoDto {
  url: string;
  phase: string;
  notes?: string | null;
}

export interface PublicQuoteDto {
  trackingToken: string;
  osNumber: number;
  status: WorkOrderStatusType;
  tenant: {
    id: string;
    name: string;
    tradeName?: string | null;
    document?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
    address?: string | null;
    whatsappNumber?: string | null;
  };
  customer: {
    name: string;
    phoneMasked?: string | null;
  };
  vehicle: {
    brand: string;
    model: string;
    plate: string;
    year?: number | null;
    color?: string | null;
    sizeCategory?: string | null;
  };
  items: PublicQuoteItemDto[];
  totalCents: number;
  discountCents: number;
  finalCents: number;
  depositRequiredCents: number;
  depositPaidCents: number;
  depositPixCode?: string | null;
  depositPixQrBase64?: string | null;
  depositPaidAt?: string | null;
  acceptedAt?: string | null;
  acceptedSignatureName?: string | null;
  publicNotes?: string | null;
  photos?: PublicQuoteVcrPhotoDto[];
  createdAt: string;
}

export interface AcceptQuoteInputDto {
  signatureName: string;
  termsAccepted: boolean;
  notes?: string;
}

export interface AcceptQuoteResponseDto {
  success: boolean;
  message: string;
  status: WorkOrderStatusType;
  acceptedAt: string;
  depositRequiredCents: number;
  depositPixCode?: string | null;
  depositPixQrBase64?: string | null;
}

export interface RejectQuoteInputDto {
  reason: string;
}

export interface PublicTrackingDto {
  osNumber: number;
  status: WorkOrderStatusType;
  progress: number;
  brand: string;
  model: string;
  plate: string;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  deliveredAt?: string | null;
  items: Array<{
    name: string;
    category?: string | null;
  }>;
  timeline: Array<{
    status: string;
    createdAt: string;
    notes?: string | null;
  }>;
}

export const InspectionPointSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  view: z.enum(['top', 'front', 'rear', 'left', 'right']),
  x: z.number(),
  y: z.number(),
  damageType: z.nativeEnum(DamageType),
  description: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

export type InspectionPointDto = z.infer<typeof InspectionPointSchema>;

// ==============================================================================
// CATÁLOGO DE SERVIÇOS, PREÇOS POR PORTE E COMBOS (T3.2)
// ==============================================================================

export const VehicleSizeClassEnum = z.enum([
  'moto',
  'hatch',
  'sedan',
  'suv',
  'pickup',
  'esportivo',
  'van',
]);
export type VehicleSizeClassType = z.infer<typeof VehicleSizeClassEnum>;

export const CatalogServiceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(2, 'Nome do serviço deve ter no mínimo 2 caracteres'),
  description: z.string().optional().nullable(),
  priceCents: z.number().int().min(0, 'Preço deve ser positivo em centavos').default(0),
  estimatedMinutes: z.number().int().min(1, 'Tempo estimado deve ser no mínimo 1 minuto').default(60),
  category: z.string().optional().nullable(),
  segment: z.string().optional().nullable(),
  warrantyMonths: z.number().int().min(0).default(3),
  materialConsumptionEstimate: z.record(z.any()).default({}),
  isActive: z.boolean().default(true),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type CatalogServiceDto = z.infer<typeof CatalogServiceSchema>;

export interface CreateCatalogServiceDto {
  name: string;
  description?: string | null;
  priceCents: number;
  estimatedMinutes?: number;
  category?: string | null;
  segment?: string | null;
  warrantyMonths?: number;
  materialConsumptionEstimate?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateCatalogServiceDto extends Partial<CreateCatalogServiceDto> {}

export const ServicePriceByClassSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  serviceId: z.string().uuid(),
  sizeClass: VehicleSizeClassEnum,
  priceCents: z.number().int().min(0),
  estimatedMinutes: z.number().int().min(1),
  warrantyMonths: z.number().int().min(0).optional().nullable(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type ServicePriceByClassDto = z.infer<typeof ServicePriceByClassSchema>;

export interface SetServicePriceInputDto {
  sizeClass: VehicleSizeClassType;
  priceCents: number;
  estimatedMinutes: number;
  warrantyMonths?: number | null;
}

export const PackageItemSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  packageId: z.string().uuid().optional(),
  serviceId: z.string().uuid(),
  customOrder: z.number().int().min(0).default(0),
  service: CatalogServiceSchema.optional(),
});
export type PackageItemDto = z.infer<typeof PackageItemSchema>;

export const PackageSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(2, 'Nome do pacote deve ter no mínimo 2 caracteres'),
  description: z.string().optional().nullable(),
  discountType: z.enum(['percentage', 'fixed_cents']).default('percentage'),
  discountValue: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  items: z.array(PackageItemSchema).optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type PackageDto = z.infer<typeof PackageSchema>;

export interface CreatePackageDto {
  name: string;
  description?: string | null;
  discountType?: 'percentage' | 'fixed_cents';
  discountValue?: number;
  isActive?: boolean;
  serviceIds: string[];
}

export interface UpdatePackageDto {
  name?: string;
  description?: string | null;
  discountType?: 'percentage' | 'fixed_cents';
  discountValue?: number;
  isActive?: boolean;
  serviceIds?: string[];
}

export const CalculatePricingInputSchema = z.object({
  vehicleId: z.string().uuid().optional().nullable(),
  vehicleSizeClass: VehicleSizeClassEnum.optional().nullable(),
  serviceIds: z.array(z.string().uuid()).default([]),
  packageId: z.string().uuid().optional().nullable(),
});
export type CalculatePricingInputDto = z.infer<typeof CalculatePricingInputSchema>;

export interface CalculatedServiceItemDto {
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
  packageDiscountCents: number;
  finalPriceCents: number;
}

export interface PricingCalculationResultDto {
  vehicleSizeClass: VehicleSizeClassType;
  package: {
    id: string;
    name: string;
    discountType: 'percentage' | 'fixed_cents';
    discountValue: number;
  } | null;
  items: CalculatedServiceItemDto[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  totalEstimatedMinutes: number;
}

// ==============================================================================
// PAGAMENTOS, SINAL E TRANSAÇÕES ATÔMICAS (T3.4)
// ==============================================================================

export const PaymentMethodEnum = z.enum([
  'pix',
  'credit_card',
  'debit_card',
  'cash',
  'bank_transfer',
  'link',
]);
export type PaymentMethodType = z.infer<typeof PaymentMethodEnum>;

export const PaymentStatusEnum = z.enum([
  'approved',
  'refunded',
  'partially_refunded',
  'pending',
  'failed',
]);
export type PaymentStatusType = z.infer<typeof PaymentStatusEnum>;

export const DepositStatusEnum = z.enum(['held', 'applied', 'refunded']);
export type DepositStatusType = z.infer<typeof DepositStatusEnum>;

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  amountCents: z.number().int().positive('O valor do pagamento deve ser positivo'),
  method: PaymentMethodEnum,
  status: PaymentStatusEnum.default('approved'),
  installments: z.number().int().min(1).default(1),
  cardBrand: z.string().optional().nullable(),
  transactionReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  refundedAmountCents: z.number().int().min(0).default(0),
  refundReason: z.string().optional().nullable(),
  refundedAt: z.date().or(z.string()).optional().nullable(),
  refundedBy: z.string().uuid().optional().nullable(),
  receivedBy: z.string().uuid().optional().nullable(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type PaymentDto = z.infer<typeof PaymentSchema>;

export const CreatePaymentInputSchema = z.object({
  amountCents: z.number().int().positive('O valor do pagamento deve ser estritamente maior que zero'),
  method: PaymentMethodEnum,
  installments: z.number().int().min(1).default(1).optional(),
  cardBrand: z.string().optional().nullable(),
  transactionReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreatePaymentInputDto = z.infer<typeof CreatePaymentInputSchema>;

export const RefundPaymentInputSchema = z.object({
  refundAmountCents: z.number().int().positive('O valor do estorno deve ser maior que zero').optional(),
  reason: z.string().min(3, 'O motivo do estorno é obrigatório'),
});
export type RefundPaymentInputDto = z.infer<typeof RefundPaymentInputSchema>;

export const DepositSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  workOrderId: z.string().uuid().optional().nullable(),
  amountCents: z.number().int().positive('O valor do sinal deve ser positivo'),
  method: PaymentMethodEnum,
  status: DepositStatusEnum.default('held'),
  appliedToWorkOrderId: z.string().uuid().optional().nullable(),
  appliedAt: z.date().or(z.string()).optional().nullable(),
  notes: z.string().optional().nullable(),
  receivedBy: z.string().uuid().optional().nullable(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type DepositDto = z.infer<typeof DepositSchema>;

export const CreateDepositInputSchema = z.object({
  customerId: z.string().uuid(),
  workOrderId: z.string().uuid().optional().nullable(),
  amountCents: z.number().int().positive('O valor do adiantamento deve ser maior que zero'),
  method: PaymentMethodEnum,
  notes: z.string().optional().nullable(),
});
export type CreateDepositInputDto = z.infer<typeof CreateDepositInputSchema>;

export const ApplyDepositInputSchema = z.object({
  workOrderId: z.string().uuid(),
});
export type ApplyDepositInputDto = z.infer<typeof ApplyDepositInputSchema>;

export interface WorkOrderFinancialSummaryDto {
  workOrderId: string;
  osNumber: number;
  totalCents: number;
  discountCents: number;
  finalCents: number;
  paidCents: number;
  remainingCents: number;
  isFullyPaid: boolean;
  payments: PaymentDto[];
  deposits: DepositDto[];
}

// ============================================================================
// DOMÍNIO AUTOMOTIVO: ESTOQUE, CONSUMO POR OS E BOBINAS (T3.5)
// ============================================================================

export const StockMovementTypeEnum = z.enum([
  'entry',
  'exit',
  'os_consumption',
  'waste',
  'adjustment',
]);
export type StockMovementType = z.infer<typeof StockMovementTypeEnum>;

export const MaterialRollStatusEnum = z.enum([
  'in_use',
  'depleted',
  'reserved',
  'discarded',
]);
export type MaterialRollStatus = z.infer<typeof MaterialRollStatusEnum>;

export const MaterialSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(2, 'Nome do material é obrigatório'),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unit: z.string().default('un'),
  costCents: z.number().int().min(0).default(0),
  currentStock: z.number().default(0),
  minStock: z.number().default(0),
  isRoll: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  isLowStock: z.boolean().optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type MaterialDto = z.infer<typeof MaterialSchema>;

export const CreateMaterialInputSchema = z.object({
  name: z.string().min(2, 'Nome do material deve ter pelo menos 2 caracteres'),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unit: z.string().default('un').optional(),
  costCents: z.number().int().min(0).default(0).optional(),
  initialStock: z.number().min(0).default(0).optional(),
  minStock: z.number().min(0).default(0).optional(),
  isRoll: z.boolean().default(false).optional(),
  notes: z.string().optional().nullable(),
});
export type CreateMaterialInputDto = z.infer<typeof CreateMaterialInputSchema>;

export const UpdateMaterialInputSchema = CreateMaterialInputSchema.partial();
export type UpdateMaterialInputDto = z.infer<typeof UpdateMaterialInputSchema>;

export const MaterialRollSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  materialId: z.string().uuid(),
  materialName: z.string().optional(),
  code: z.string().optional().nullable(),
  lotNumber: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  widthMeters: z.number().positive(),
  initialMeters: z.number().positive(),
  currentMeters: z.number().min(0),
  minAlertMeters: z.number().min(0).default(3.0),
  costCents: z.number().int().min(0).default(0),
  status: MaterialRollStatusEnum.default('in_use'),
  isLowMeters: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type MaterialRollDto = z.infer<typeof MaterialRollSchema>;

export const CreateMaterialRollInputSchema = z.object({
  materialId: z.string().uuid('ID do material inválido'),
  code: z.string().optional().nullable(),
  lotNumber: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  widthMeters: z.number().positive('Largura deve ser positiva').default(1.52).optional(),
  initialMeters: z.number().positive('Metragem inicial deve ser maior que zero'),
  minAlertMeters: z.number().min(0).default(3.0).optional(),
  costCents: z.number().int().min(0).default(0).optional(),
  notes: z.string().optional().nullable(),
});
export type CreateMaterialRollInputDto = z.infer<typeof CreateMaterialRollInputSchema>;

export const RegisterRollScrapInputSchema = z.object({
  meters: z.number().positive('Metragem de retalho/desperdício deve ser maior que zero'),
  reason: z.string().min(3, 'Motivo do retalho/descarte é obrigatório'),
  workOrderId: z.string().uuid().optional().nullable(),
});
export type RegisterRollScrapInputDto = z.infer<typeof RegisterRollScrapInputSchema>;

export interface MaterialRollHistoryItemDto {
  workOrderId: string;
  osNumber: number;
  customerName: string;
  customerPhone?: string | null;
  vehiclePlate: string;
  vehicleModel: string;
  serviceName: string;
  metersUsed: number;
  costAllocatedCents: number;
  servicePriceCents: number;
  grossProfitCents: number;
  grossMarginPercent: number;
  warrantyId?: string | null;
  warrantyToken?: string | null;
  appliedAt: string;
}

export interface MaterialRollDetailWithHistoryDto extends MaterialRollDto {
  materialName: string;
  costPerMeterCents: number;
  consumedMeters: number;
  scrapMeters: number;
  efficiencyPercent: number;
  totalRevenueCents: number;
  totalGrossProfitCents: number;
  averageMarginPercent: number;
  history: MaterialRollHistoryItemDto[];
}

export const StockMovementSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  materialId: z.string().uuid(),
  materialRollId: z.string().uuid().optional().nullable(),
  workOrderId: z.string().uuid().optional().nullable(),
  movementType: StockMovementTypeEnum,
  quantity: z.number(),
  unitCostCents: z.number().int().min(0).default(0),
  totalCostCents: z.number().int().min(0).default(0),
  previousStock: z.number(),
  newStock: z.number(),
  reason: z.string().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable(),
  createdAt: z.date().or(z.string()).optional(),
});
export type StockMovementDto = z.infer<typeof StockMovementSchema>;

export const CreateStockMovementInputSchema = z.object({
  materialId: z.string().uuid(),
  materialRollId: z.string().uuid().optional().nullable(),
  workOrderId: z.string().uuid().optional().nullable(),
  movementType: StockMovementTypeEnum,
  quantity: z.number().refine((q) => q !== 0, 'Quantidade não pode ser zero'),
  unitCostCents: z.number().int().min(0).optional(),
  reason: z.string().optional().nullable(),
});
export type CreateStockMovementInputDto = z.infer<typeof CreateStockMovementInputSchema>;

export const WorkOrderMaterialSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  materialId: z.string().uuid(),
  materialName: z.string().optional(),
  materialUnit: z.string().optional(),
  materialRollId: z.string().uuid().optional().nullable(),
  rollLotNumber: z.string().optional().nullable(),
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  isConsumed: z.boolean().default(false),
  consumedAt: z.date().or(z.string()).optional().nullable(),
  notes: z.string().optional().nullable(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type WorkOrderMaterialDto = z.infer<typeof WorkOrderMaterialSchema>;

export const AllocateWorkOrderMaterialInputSchema = z.object({
  materialId: z.string().uuid('ID do material inválido'),
  materialRollId: z.string().uuid().optional().nullable(),
  quantity: z.number().positive('Quantidade deve ser estritamente maior que zero'),
  notes: z.string().optional().nullable(),
});
export type AllocateWorkOrderMaterialInputDto = z.infer<typeof AllocateWorkOrderMaterialInputSchema>;

export interface LowStockAlertDto {
  lowStockMaterials: MaterialDto[];
  criticalRolls: MaterialRollDto[];
  totalAlerts: number;
}

// ==========================================
// T3.6: AGENDA INTELIGENTE POR BOX E AGENDAMENTO ONLINE
// ==========================================

export const BaySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1, 'Nome do box é obrigatório'),
  description: z.string().optional().nullable(),
  color: z.string().default('#C8F52E'),
  orderIndex: z.number().int().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type BayDto = z.infer<typeof BaySchema>;

export const CreateBayInputSchema = z.object({
  name: z.string().min(1, 'Nome do box é obrigatório'),
  description: z.string().optional().nullable(),
  color: z.string().default('#C8F52E').optional(),
  orderIndex: z.number().int().default(0).optional(),
  isActive: z.boolean().default(true).optional(),
});
export type CreateBayInputDto = z.infer<typeof CreateBayInputSchema>;

export const UpdateBayInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
  orderIndex: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateBayInputDto = z.infer<typeof UpdateBayInputSchema>;

export const AppointmentStatusEnum = z.enum([
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'canceled',
  'no_show',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>;

export const AppointmentOriginEnum = z.enum(['INTERNAL', 'ONLINE', 'WHATSAPP']);
export type AppointmentOrigin = z.infer<typeof AppointmentOriginEnum>;

export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  bayId: z.string().uuid().optional().nullable(),
  bayName: z.string().optional().nullable(),
  technicianId: z.string().uuid().optional().nullable(),
  technicianName: z.string().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  vehicleId: z.string().uuid().optional().nullable(),
  workOrderId: z.string().uuid().optional().nullable(),
  workOrderNumber: z.number().optional().nullable(),
  workOrderStatus: z.string().optional().nullable(),
  title: z.string().min(1, 'Título é obrigatório'),
  startTime: z.date().or(z.string()),
  endTime: z.date().or(z.string()),
  estimatedMinutes: z.number().int().positive().default(60),
  status: AppointmentStatusEnum.default('scheduled'),
  origin: AppointmentOriginEnum.default('INTERNAL'),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleSizeClass: VehicleSizeClassEnum.optional().nullable(),
  serviceSummary: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});
export type AppointmentDto = z.infer<typeof AppointmentSchema>;

export const CreateAppointmentInputSchema = z.object({
  bayId: z.string().uuid().optional().nullable(),
  technicianId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  vehicleId: z.string().uuid().optional().nullable(),
  workOrderId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Título é obrigatório'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().positive().optional().default(60),
  status: AppointmentStatusEnum.optional().default('scheduled'),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleSizeClass: VehicleSizeClassEnum.optional().nullable(),
  serviceSummary: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateAppointmentInputDto = z.infer<typeof CreateAppointmentInputSchema>;

export const UpdateAppointmentInputSchema = z.object({
  bayId: z.string().uuid().nullable().optional(),
  technicianId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  status: AppointmentStatusEnum.optional(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleSizeClass: VehicleSizeClassEnum.optional().nullable(),
  serviceSummary: z.string().optional().nullable(),
  notes: z.string().nullable().optional(),
});
export type UpdateAppointmentInputDto = z.infer<typeof UpdateAppointmentInputSchema>;

export const PublicBookingInputSchema = z.object({
  customerName: z.string().min(2, 'Nome é obrigatório'),
  customerPhone: z.string().min(8, 'Telefone de contato é obrigatório'),
  customerEmail: z.string().email('Email inválido').optional().nullable(),
  vehiclePlate: z.string().min(7, 'Placa é obrigatória'),
  vehicleBrand: z.string().optional().nullable(),
  vehicleModel: z.string().min(1, 'Modelo do veículo é obrigatório'),
  vehicleSizeClass: VehicleSizeClassEnum.optional().default('sedan'),
  serviceIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um serviço'),
  bayId: z.string().uuid().optional().nullable(),
  preferredStartTime: z.string().datetime(),
  notes: z.string().optional().nullable(),
  website: z.string().optional().nullable(), // Honeypot anti-bot
});
export type PublicBookingInputDto = z.infer<typeof PublicBookingInputSchema>;

export interface PublicBookingResponseDto {
  appointment: AppointmentDto;
  workOrder: {
    id: string;
    osNumber: number;
    status: string;
    origin: string;
    trackingToken: string;
    trackingUrl: string;
  };
  message: string;
}

export interface BayAvailabilitySlotDto {
  bayId: string;
  bayName: string;
  bayColor: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  conflictingAppointmentId?: string | null;
}

// Multiplicadores automotivos de tempo por porte (T6.7)
export const VEHICLE_SIZE_DURATION_MULTIPLIERS: Record<VehicleSizeClassType, number> = {
  moto: 0.6,
  hatch: 0.85,
  sedan: 1.0,
  suv: 1.25,
  pickup: 1.35,
  van: 1.5,
  esportivo: 1.1,
};

export const CalculateDurationInputSchema = z.object({
  serviceIds: z.array(z.string().uuid()).optional(),
  baseMinutes: z.number().int().positive().optional(),
  sizeClass: VehicleSizeClassEnum.default('sedan'),
});
export type CalculateDurationInputDto = z.infer<typeof CalculateDurationInputSchema>;

export interface CalculatedDurationResultDto {
  estimatedMinutes: number;
  baseMinutes: number;
  multiplier: number;
  sizeClass: VehicleSizeClassType;
  details?: Array<{
    serviceId: string;
    serviceName: string;
    minutes: number;
  }>;
}

export interface SmartAppointmentDto extends AppointmentDto {
  isDelayed: boolean;
  delayMinutes: number;
  category: 'ppf' | 'insulfilm' | 'detailing' | 'lataria' | 'mecanica' | 'outro';
  statusColor: string;
}

export interface SmartBayOverviewDto {
  id: string;
  name: string;
  description: string | null;
  color: string;
  orderIndex: number;
  isActive: boolean;
  assignedTechnicianName?: string | null;
  assignedTechnicianId?: string | null;
  occupancyStatus: 'free' | 'occupied' | 'delayed';
  currentAppointment?: SmartAppointmentDto | null;
  appointments: SmartAppointmentDto[];
  freeSlots: Array<{
    startTime: string;
    endTime: string;
    label: string;
  }>;
}

export interface SmartScheduleOverviewResponseDto {
  date: string;
  bays: SmartBayOverviewDto[];
  totalAppointments: number;
  activeCount: number;
  delayedCount: number;
}

// ==============================================================================
// LAUDO DE INSPEÇÃO DIGITAL (VCR), CHECKLIST E FOTOS (T3.7)
// ==============================================================================

export const InspectionTypeEnum = z.enum(['check_in', 'check_out', 'interim']);
export type InspectionType = z.infer<typeof InspectionTypeEnum>;

export const InspectionVehicleTypeEnum = z.enum(['car', 'motorcycle', 'truck']);
export type InspectionVehicleType = z.infer<typeof InspectionVehicleTypeEnum>;

export const InspectionStatusEnum = z.enum(['draft', 'completed', 'signed']);
export type InspectionStatusType = z.infer<typeof InspectionStatusEnum>;

export const DamageSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type DamageSeverityType = z.infer<typeof DamageSeverityEnum>;

export const DamageViewEnum = z.enum(['top', 'front', 'rear', 'left', 'right', 'isometric']);
export type DamageViewType = z.infer<typeof DamageViewEnum>;

export const PhotoPhaseEnum = z.enum(['before', 'during', 'after']);
export type PhotoPhaseType = z.infer<typeof PhotoPhaseEnum>;

export const InspectionChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  checked: z.boolean(),
  notes: z.string().optional().nullable(),
  photoFileId: z.string().uuid().optional().nullable(),
});
export type InspectionChecklistItemDto = z.infer<typeof InspectionChecklistItemSchema>;

export const CreateInspectionInputSchema = z.object({
  workOrderId: z.string().uuid('ID da Ordem de Serviço inválido'),
  vehicleId: z.string().uuid('ID do Veículo inválido'),
  inspectorId: z.string().uuid().optional().nullable(),
  inspectionType: InspectionTypeEnum.optional().default('check_in'),
  vehicleType: InspectionVehicleTypeEnum.optional().default('car'),
  currentKm: z.number().int().nonnegative().optional().nullable(),
  fuelLevel: z.string().optional().default('1/2'),
  checklistItems: z.array(InspectionChecklistItemSchema).optional().default([]),
  voiceNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateInspectionInputDto = z.infer<typeof CreateInspectionInputSchema>;

export const UpdateInspectionInputSchema = z.object({
  currentKm: z.number().int().nonnegative().optional().nullable(),
  fuelLevel: z.string().optional().nullable(),
  checklistItems: z.array(InspectionChecklistItemSchema).optional(),
  voiceNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: InspectionStatusEnum.optional(),
});
export type UpdateInspectionInputDto = z.infer<typeof UpdateInspectionInputSchema>;

export const AddDamagePointInputSchema = z.object({
  part: z.string().min(1, 'Parte do veículo é obrigatória'),
  damageType: z.string().min(1, 'Tipo de avaria é obrigatório'),
  severity: DamageSeverityEnum.optional().default('medium'),
  xPercent: z.number().min(0).max(100, 'Coordenada X deve estar entre 0% e 100%'),
  yPercent: z.number().min(0).max(100, 'Coordenada Y deve estar entre 0% e 100%'),
  view: DamageViewEnum.optional().default('top'),
  photoFileId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type AddDamagePointInputDto = z.infer<typeof AddDamagePointInputSchema>;

export const AddInspectionPhotoInputSchema = z.object({
  photoFileId: z.string().uuid('ID do arquivo de foto inválido'),
  angle: z.string().min(1, 'Ângulo da foto é obrigatório'),
  phase: PhotoPhaseEnum.optional().default('before'),
  caption: z.string().optional().nullable(),
});
export type AddInspectionPhotoInputDto = z.infer<typeof AddInspectionPhotoInputSchema>;

export const SignInspectionInputSchema = z.object({
  customerSignatureName: z.string().min(2, 'Nome do signatário é obrigatório'),
  signatureBase64: z.string().min(20, 'Imagem da assinatura é obrigatória'),
});
export type SignInspectionInputDto = z.infer<typeof SignInspectionInputSchema>;

export interface InspectionDamagePointDto {
  id: string;
  tenantId: string;
  inspectionId: string;
  part: string;
  damageType: string;
  severity: DamageSeverityType;
  xPercent: number;
  yPercent: number;
  view: DamageViewType;
  photoFileId: string | null;
  photoUrl?: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InspectionPhotoDto {
  id: string;
  tenantId: string;
  inspectionId: string;
  photoFileId: string;
  photoUrl?: string | null;
  angle: string;
  phase: PhotoPhaseType;
  caption: string | null;
  createdAt: string;
}

export interface InspectionDto {
  id: string;
  tenantId: string;
  workOrderId: string;
  vehicleId: string;
  inspectorId: string | null;
  inspectorName?: string | null;
  inspectionType: InspectionType;
  vehicleType: InspectionVehicleType;
  currentKm: number | null;
  fuelLevel: string | null;
  checklistItems: InspectionChecklistItemDto[];
  voiceNotes: string | null;
  customerSignatureFileId: string | null;
  customerSignatureUrl?: string | null;
  customerSignatureName: string | null;
  signedAt: string | null;
  pdfFileId: string | null;
  pdfUrl?: string | null;
  pdfGeneratedAt: string | null;
  status: InspectionStatusType;
  notes: string | null;
  damagePoints?: InspectionDamagePointDto[];
  photos?: InspectionPhotoDto[];
  vehicle?: {
    plate: string;
    brand: string;
    model: string;
    color: string | null;
    year: number | null;
  };
  customer?: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  workOrder?: {
    osNumber: number;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// APP DO TÉCNICO (PWA DO OPERADOR) E CRONÔMETRO OFICIAL (T3.8)
// ==============================================================================

export const TimerStatusEnum = z.enum(['running', 'paused', 'completed']);
export type TimerStatusType = z.infer<typeof TimerStatusEnum>;

export const StartTimerInputSchema = z.object({
  serviceItemId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type StartTimerInputDto = z.infer<typeof StartTimerInputSchema>;

export const PauseTimerInputSchema = z.object({
  reason: z.string().optional().nullable(),
});
export type PauseTimerInputDto = z.infer<typeof PauseTimerInputSchema>;

export const StartWithChecklistInputSchema = z.object({
  checklistItems: z.array(InspectionChecklistItemSchema).optional().default([]),
  currentKm: z.number().int().nonnegative().optional().nullable(),
  fuelLevel: z.string().optional().default('1/2'),
  serviceItemId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type StartWithChecklistInputDto = z.infer<typeof StartWithChecklistInputSchema>;

export const TechnicianQueueScopeEnum = z.enum(['mine', 'all']);
export type TechnicianQueueScopeType = z.infer<typeof TechnicianQueueScopeEnum>;

export const TechnicianQueueFilterSchema = z.object({
  scope: TechnicianQueueScopeEnum.optional().default('mine'),
  status: z.string().optional().nullable(),
});
export type TechnicianQueueFilterDto = z.infer<typeof TechnicianQueueFilterSchema>;

export interface WorkOrderTimerDto {
  id: string;
  tenantId: string;
  workOrderId: string;
  serviceItemId: string | null;
  technicianId: string;
  technicianName?: string | null;
  status: TimerStatusType;
  startedAt: string;
  pausedAt: string | null;
  stoppedAt: string | null;
  accumulatedSeconds: number;
  elapsedSeconds: number;
  pauseReason: string | null;
  notes: string | null;
  isRunning: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianQueueItemDto {
  workOrderId: string;
  osNumber: number;
  status: string;
  isRework: boolean;
  reworkReason: string | null;
  promisedDeliveryAt: string | null;
  vehicle: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    color: string | null;
    sizeClass: VehicleSizeClassType;
  };
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  bay: {
    id: string;
    name: string;
    color: string;
  } | null;
  technician: {
    id: string;
    name: string;
  } | null;
  services: Array<{
    id: string;
    serviceId: string;
    serviceName: string;
    estimatedMinutes: number;
    status?: string;
  }>;
  hasCheckinInspection: boolean;
  activeTimer: WorkOrderTimerDto | null;
  totalElapsedSeconds: number;
  isTimerRunning: boolean;
  createdAt: string;
}

// ============================================================================
// 19. CONTROLE DE QUALIDADE (QA), GARANTIA E PASSAPORTE DO VEÍCULO (T3.9)
// ============================================================================

export const QaStatusEnum = {
  APPROVED: 'approved',
  REJECTED_REWORK: 'rejected_rework',
} as const;
export type QaStatusType = (typeof QaStatusEnum)[keyof typeof QaStatusEnum];

export const WarrantyStatusEnum = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;
export type WarrantyStatusType = (typeof WarrantyStatusEnum)[keyof typeof WarrantyStatusEnum];

export const QaChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(2),
  passed: z.boolean(),
  notes: z.string().optional().nullable(),
});
export type QaChecklistItem = z.infer<typeof QaChecklistItemSchema>;

export const CreateQaAuditSchema = z.object({
  workOrderId: z.string().uuid(),
  status: z.enum(['approved', 'rejected_rework']),
  score: z.number().int().min(1).max(5).optional().nullable(),
  checklistItems: z.array(QaChecklistItemSchema).default([]),
  reworkReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateQaAuditInputDto = z.infer<typeof CreateQaAuditSchema>;

export interface QaAuditDto {
  id: string;
  tenantId: string;
  workOrderId: string;
  inspectorId: string;
  inspectorName?: string;
  status: QaStatusType;
  score: number | null;
  checklistItems: QaChecklistItem[];
  reworkReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CreateWarrantySchema = z.object({
  workOrderId: z.string().uuid(),
  serviceId: z.string().uuid().optional().nullable(),
  serviceName: z.string().min(2),
  materialRollId: z.string().uuid().optional().nullable(),
  materialLotNumber: z.string().optional().nullable(),
  warrantyMonths: z.number().int().positive().default(12),
  notes: z.string().optional().nullable(),
});
export type CreateWarrantyInputDto = z.infer<typeof CreateWarrantySchema>;

export interface WarrantyDto {
  id: string;
  tenantId: string;
  workOrderId: string;
  customerId: string;
  vehicleId: string;
  serviceId: string | null;
  serviceName: string;
  materialRollId: string | null;
  materialLotNumber: string | null;
  warrantyMonths: number;
  startsAt: string;
  expiresAt: string;
  verificationToken: string;
  pdfFileId: string | null;
  status: WarrantyStatusType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehiclePassportTimelineItemDto {
  date: string;
  type: 'service' | 'inspection' | 'transfer' | 'warranty_issued';
  title: string;
  description?: string | null;
  category?: string | null;
  workshopName: string;
  osNumber?: number | null;
  odometerKm?: number | null;
  materialUsed?: string | null;
  lotNumber?: string | null;
}

export interface VehiclePassportTransferItemDto {
  transferredAt: string;
  previousCustomerMasked: string;
  newCustomerMasked: string;
  odometerKm?: number | null;
  reason?: string | null;
}

export const TransferVehiclePassportInputSchema = z.object({
  newCustomerName: z.string().min(3, 'Nome do novo proprietário deve ter pelo menos 3 caracteres'),
  newCustomerPhone: z.string().min(10, 'Telefone / WhatsApp com DDD é obrigatório'),
  newCustomerEmail: z.string().email('E-mail inválido').optional().nullable(),
  odometerKm: z.number().int().min(0).optional().nullable(),
  reason: z.string().optional().nullable(),
});
export type TransferVehiclePassportInputDto = z.infer<typeof TransferVehiclePassportInputSchema>;

export interface TransferVehiclePassportResultDto {
  success: boolean;
  message: string;
  transferredAt: string;
  newCustomerNameMasked: string;
  verificationToken: string;
}

export interface PublicVehiclePassportDto {
  verificationToken: string;
  isValid: boolean;
  status: WarrantyStatusType;
  serviceName: string;
  materialLotNumber: string | null;
  materialRollBrand?: string | null;
  materialRollCode?: string | null;
  warrantyMonths: number;
  startsAt: string;
  expiresAt: string;
  remainingDays: number;
  isTransferable: boolean;
  transferredAt: string | null;
  transferCount: number;
  vehicle: {
    brand: string;
    model: string;
    plateMasked: string;
    year: number;
    color: string | null;
  };
  vehicleBrand?: string;
  vehicleModel?: string;
  vehiclePlateMasked?: string;
  workshop: {
    tradeName: string;
    phone: string | null;
    city: string | null;
  };
  timeline: VehiclePassportTimelineItemDto[];
  transfersHistory: VehiclePassportTransferItemDto[];
}

// ============================================================================
// 20. PESQUISA NPS, PÓS-VENDA E LEMBRETES DE REVISÃO (T3.10)
// ============================================================================

export const NpsClassificationEnum = {
  PROMOTER: 'promoter',
  PASSIVE: 'passive',
  DETRACTOR: 'detractor',
} as const;
export type NpsClassificationType = (typeof NpsClassificationEnum)[keyof typeof NpsClassificationEnum];

export const NpsStatusEnum = {
  PENDING: 'pending',
  ANSWERED: 'answered',
  EXPIRED: 'expired',
} as const;
export type NpsStatusType = (typeof NpsStatusEnum)[keyof typeof NpsStatusEnum];

export const ReminderTypeEnum = {
  WARRANTY_CHECK: 'warranty_check',
  MAINTENANCE_RETURN: 'maintenance_return',
  SEASONAL_CARE: 'seasonal_care',
} as const;
export type ReminderType = (typeof ReminderTypeEnum)[keyof typeof ReminderTypeEnum];

export const ReminderStatusEnum = {
  SCHEDULED: 'scheduled',
  SENT: 'sent',
  CANCELED: 'canceled',
  COMPLETED: 'completed',
} as const;
export type ReminderStatus = (typeof ReminderStatusEnum)[keyof typeof ReminderStatusEnum];

export const CreateNpsSurveySchema = z.object({
  workOrderId: z.string().uuid(),
});
export type CreateNpsSurveyInputDto = z.infer<typeof CreateNpsSurveySchema>;

export const AnswerNpsSurveySchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().optional().nullable(),
  googleReviewClicked: z.boolean().optional().default(false),
});
export type AnswerNpsSurveyInputDto = z.infer<typeof AnswerNpsSurveySchema>;

export interface NpsSurveyDto {
  id: string;
  tenantId: string;
  workOrderId: string;
  osNumber?: number;
  customerId: string;
  customerName?: string;
  customerPhone?: string | null;
  token: string;
  score: number | null;
  classification: NpsClassificationType | null;
  comment: string | null;
  status: NpsStatusType;
  sentAt: string | null;
  answeredAt: string | null;
  googleReviewClicked: boolean;
  googleReviewSentAt?: string | null;
  googleReviewSentVia?: 'automatic' | 'manual' | null;
  googleReviewClickedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const UpdateGoogleReviewUrlSchema = z.object({
  googleReviewUrl: z
    .string()
    .url('A URL de avaliação do Google deve ser válida (ex: https://g.page/r/.../review)')
    .or(z.literal('')),
});
export type UpdateGoogleReviewUrlInputDto = z.infer<typeof UpdateGoogleReviewUrlSchema>;

export interface GoogleReputationOverviewDto {
  googleReviewUrl: string | null;
  suggestedGoogleSearchUrl: string;
  promotersCount: number;
  googleInvitesSent: number;
  googleReviewsClicked: number;
  conversionRatePercent: number;
  topPromoters: Array<{
    surveyId: string;
    osNumber?: number;
    customerName: string;
    customerPhone?: string | null;
    vehicleModel?: string;
    score: number;
    comment?: string | null;
    answeredAt: string;
    googleReviewClicked: boolean;
    googleReviewSentAt?: string | null;
    googleReviewSentVia?: 'automatic' | 'manual' | null;
    manualWhatsAppUrl: string;
  }>;
}

export interface AnswerNpsSurveyResponseDto {
  survey: NpsSurveyDto;
  isPromoter: boolean;
  isDetractor: boolean;
  googleReviewSuggested: boolean;
  googleReviewUrl?: string;
}

export interface NpsMetricsDto {
  npsScore: number; // -100 a +100
  totalSurveys: number;
  totalAnswered: number;
  responseRate: number; // 0% a 100%
  averageScore: number; // 0.0 a 10.0
  promotersCount: number;
  promotersPercent: number;
  passivesCount: number;
  passivesPercent: number;
  detractorsCount: number;
  detractorsPercent: number;
}

export const CreateReminderSchema = z.object({
  workOrderId: z.string().uuid(),
  warrantyId: z.string().uuid().optional().nullable(),
  serviceName: z.string().min(2),
  reminderType: z.enum(['warranty_check', 'maintenance_return', 'seasonal_care']).default('warranty_check'),
  scheduledFor: z.string().datetime(),
  messagePreview: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateReminderInputDto = z.infer<typeof CreateReminderSchema>;

export const UpdateReminderStatusSchema = z.object({
  status: z.enum(['scheduled', 'sent', 'canceled', 'completed']),
});
export type UpdateReminderStatusInputDto = z.infer<typeof UpdateReminderStatusSchema>;

export interface MaintenanceReminderDto {
  id: string;
  tenantId: string;
  workOrderId: string;
  osNumber?: number;
  warrantyId: string | null;
  customerId: string;
  customerName?: string;
  customerPhone?: string | null;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  serviceName: string;
  reminderType: ReminderType;
  scheduledFor: string;
  status: ReminderStatus;
  sentAt: string | null;
  messagePreview: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// T3.11 — COMISSÕES E RELATÓRIOS FINANCEIROS (DRE & RANKING COM STREAK AUDITADO)
// ==============================================================================

export type CommissionType = 'percentage' | 'fixed_cents';
export type BaseCalculationType = 'gross_service' | 'net_service_minus_material';
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'canceled';

export const CreateCommissionRuleSchema = z.object({
  technicianId: z.string().uuid().optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  commissionType: z.enum(['percentage', 'fixed_cents']).default('percentage'),
  commissionValue: z.number().int().nonnegative(),
  baseCalculation: z.enum(['gross_service', 'net_service_minus_material']).default('gross_service'),
  isActive: z.boolean().optional().default(true),
});
export type CreateCommissionRuleInputDto = z.infer<typeof CreateCommissionRuleSchema>;

export interface CommissionRuleDto {
  id: string;
  tenantId: string;
  technicianId: string | null;
  technicianName?: string | null;
  serviceId: string | null;
  serviceName?: string | null;
  commissionType: CommissionType;
  commissionValue: number;
  baseCalculation: BaseCalculationType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionEntryDto {
  id: string;
  tenantId: string;
  workOrderId: string;
  osNumber?: number;
  serviceItemId: string | null;
  technicianId: string;
  technicianName?: string;
  ruleId: string | null;
  grossAmountCents: number;
  deductionsCents: number;
  commissionCents: number;
  status: CommissionStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PayCommissionEntrySchema = z.object({
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
});
export type PayCommissionEntryInputDto = z.infer<typeof PayCommissionEntrySchema>;

export interface DreReportDto {
  startDate: string;
  endDate: string;
  grossRevenueCents: number;
  discountsCents: number;
  netRevenueCents: number;
  materialCostsCents: number;
  commissionCostsCents: number;
  contributionMarginCents: number;
  contributionMarginPercent: number;
  pendingReceivablesCents: number;
  workOrdersCount: number;
}

export interface TechnicianRankingItemDto {
  technicianId: string;
  technicianName: string;
  workOrdersCount: number;
  totalProducedCents: number;
  averageQaScore: number;
  streakDaysWithoutRework: number;
  lastReworkDate: string | null;
}

// ==============================================================================
// T3.12 — ATUALIZAÇÃO EM TEMPO REAL (SSE / WEBSOCKETS)
// ==============================================================================

export type RealtimeEventType =
  | 'work_order.updated'
  | 'work_order.ready'
  | 'appointment.created'
  | 'stock.low'
  | 'payment.received'
  | 'heartbeat'
  | 'connected';

export interface WorkOrderUpdatedPayload {
  workOrderId: string;
  osNumber: number;
  status: string;
  previousStatus?: string | null;
  progress: number;
  vehiclePlate?: string | null;
  technicianId?: string | null;
  technicianName?: string | null;
}

export interface WorkOrderReadyPayload {
  workOrderId: string;
  osNumber: number;
  vehiclePlate?: string | null;
  customerName?: string | null;
}

export interface AppointmentCreatedPayload {
  appointmentId: string;
  bayId: string;
  scheduledAt: string;
  clientName?: string | null;
}

export interface StockLowPayload {
  materialId: string;
  materialName: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

export interface RealtimeEventDto<T = any> {
  id: string;
  tenantId: string;
  event: RealtimeEventType;
  timestamp: string;
  data: T;
}

export const PublishRealtimeEventSchema = z.object({
  event: z.enum(['work_order.updated', 'work_order.ready', 'appointment.created', 'stock.low']),
  data: z.record(z.any()),
});
export type PublishRealtimeEventInputDto = z.infer<typeof PublishRealtimeEventSchema>;

// ==============================================================================
// T3.13 — PORTAL DO CLIENTE SEGURO ("MEU VEÍCULO") COM DESAFIO OTP
// ==============================================================================

export const RequestPortalOtpSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Identificador (telefone ou e-mail) deve ter no mínimo 3 caracteres')
    .max(255, 'Identificador muito longo'),
});
export type RequestPortalOtpInputDto = z.infer<typeof RequestPortalOtpSchema>;

export const VerifyPortalOtpSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Identificador deve ter no mínimo 3 caracteres')
    .max(255),
  code: z
    .string()
    .regex(/^\d{6}$/, 'O código de confirmação deve conter exatamente 6 dígitos numéricos'),
});
export type VerifyPortalOtpInputDto = z.infer<typeof VerifyPortalOtpSchema>;

export interface PortalCustomerDto {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  document: string | null;
  documentType: string | null;
  city: string | null;
  state: string | null;
}

export interface PortalVehicleDto {
  id: string;
  plate: string;
  brand: string;
  model: string;
  color: string | null;
  modelYear: number | null;
  sizeClass: string;
  currentKm: number | null;
}

export interface PortalWorkOrderListItemDto {
  id: string;
  osNumber: number;
  status: string;
  progress: number;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  totalCents: number;
  discountCents: number;
  finalCents: number;
  paidCents: number;
  isFullyPaid: boolean;
  trackingToken: string;
  estimatedDeliveryDate: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface PortalWorkOrderDetailDto extends PortalWorkOrderListItemDto {
  notes: string | null;
  items: Array<{
    id: string;
    serviceName: string;
    description: string | null;
    quantity: number;
    unitPriceCents: number;
    finalPriceCents: number;
    warrantyMonths: number;
  }>;
}

export interface PortalWorkOrderTimelineEventDto {
  id: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface PortalPhotoDto {
  id: string;
  angle: string;
  phase: 'before' | 'during' | 'after';
  caption: string | null;
  url: string;
  createdAt: string;
}

export interface PortalWarrantyDto {
  id: string;
  workOrderId: string;
  osNumber?: number;
  serviceName: string;
  vehiclePlate: string;
  vehicleModel: string;
  warrantyMonths: number;
  startsAt: string;
  expiresAt: string;
  daysRemaining: number;
  status: string;
  verificationToken: string;
  pdfDownloadUrl?: string;
}

export interface PortalAuthResponseDto {
  token: string;
  customer: PortalCustomerDto;
}

// ==============================================================================
// T3.14 — API PÚBLICA, CHAVES DE API E WEBHOOKS REAIS
// ==============================================================================

export const API_KEY_SCOPES = [
  'read:work_orders',
  'write:work_orders',
  'read:customers',
  'write:customers',
  'read:vehicles',
  'read:nps',
  'read:warranties',
  '*',
] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const WEBHOOK_EVENTS = [
  'work_order.created',
  'work_order.updated',
  'work_order.ready',
  'work_order.delivered',
  'nps.answered',
  'customer.created',
  'warranty.issued',
  '*',
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const CreateApiKeySchema = z.object({
  name: z.string().min(2, 'O nome da chave deve ter no mínimo 2 caracteres').max(100),
  permissions: z.array(z.string()).min(1, 'Selecione ao menos uma permissão/escopo').default(['read:work_orders', 'read:customers']),
  rateLimitPerMinute: z.number().int().min(1).max(1000).default(60),
  expiresInDays: z.number().int().min(1).max(365).optional().nullable(),
});
export type CreateApiKeyInputDto = z.infer<typeof CreateApiKeySchema>;

export interface ApiKeyDto {
  id: string;
  tenantId: string;
  name: string;
  prefix: string;
  permissions: string[];
  status: 'active' | 'revoked';
  rateLimitPerMinute: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponseDto {
  apiKey: ApiKeyDto;
  token: string; // Exibido apenas uma única vez na geração
}

export const CreateWebhookEndpointSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(150),
  description: z.string().max(500).optional().nullable(),
  url: z.string().url('URL de webhook inválida. Deve iniciar com https:// ou http://'),
  events: z.array(z.string()).min(1, 'Selecione pelo menos um evento para o webhook'),
});
export type CreateWebhookEndpointInputDto = z.infer<typeof CreateWebhookEndpointSchema>;

export const UpdateWebhookEndpointSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional().nullable(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
export type UpdateWebhookEndpointInputDto = z.infer<typeof UpdateWebhookEndpointSchema>;

export interface WebhookEndpointDto {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  url: string;
  events: string[];
  isActive: boolean;
  status: 'active' | 'inactive' | 'failing';
  failureCount: number;
  secret: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryDto {
  id: string;
  tenantId: string;
  endpointId: string;
  event: string;
  payload: Record<string, unknown>;
  signature: string | null;
  statusCode: number | null;
  responseBody: string | null;
  durationMs: number | null;
  error: string | null;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

export const PublicWorkOrderQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PublicWorkOrderQueryInput = z.infer<typeof PublicWorkOrderQuerySchema>;

export const PublicCreateWorkOrderSchema = z.object({
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  notes: z.string().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});
export type PublicCreateWorkOrderInput = z.infer<typeof PublicCreateWorkOrderSchema>;

// ==============================================================================
// T6.9: CONTRATOS DO MINI-SITE INSTITUCIONAL DA OFICINA, PORTFÓLIO E LEADS
// ==============================================================================

export const CreateMiniSitePortfolioItemSchema = z.object({
  title: z.string().min(2).max(255),
  category: z.string().min(2).max(100).default('Geral'),
  beforeImageUrl: z.string().optional().nullable(),
  afterImageUrl: z.string().min(2),
  description: z.string().max(2000).optional().nullable(),
  isFeatured: z.boolean().default(false),
  displayOrder: z.coerce.number().int().default(0),
});
export type CreateMiniSitePortfolioItemInputDto = z.infer<typeof CreateMiniSitePortfolioItemSchema>;

export const UpdateMiniSitePortfolioItemSchema = CreateMiniSitePortfolioItemSchema.partial();
export type UpdateMiniSitePortfolioItemInputDto = z.infer<typeof UpdateMiniSitePortfolioItemSchema>;

export interface MiniSitePortfolioItemDto {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  beforeImageUrl: string | null;
  afterImageUrl: string;
  description: string | null;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const CreateMiniSiteLeadSchema = z.object({
  name: z.string().min(2).max(255),
  phone: z.string().min(8).max(30),
  vehicleModel: z.string().max(100).optional().nullable(),
  serviceInterest: z.string().max(255).optional().nullable(),
  message: z.string().max(1000).optional().nullable(),
});
export type CreateMiniSiteLeadInputDto = z.infer<typeof CreateMiniSiteLeadSchema>;

export const UpdateMiniSiteLeadStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'discarded']),
});
export type UpdateMiniSiteLeadStatusInputDto = z.infer<typeof UpdateMiniSiteLeadStatusSchema>;

export interface MiniSiteLeadDto {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  vehicleModel: string | null;
  serviceInterest: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'converted' | 'discarded';
  createdAt: string;
  updatedAt: string;
  whatsappUrl: string;
}

export const UpdateMiniSiteSettingsSchema = z.object({
  minisiteEnabled: z.boolean().optional(),
  headline: z.string().max(255).optional().nullable(),
  about: z.string().max(3000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  businessHours: z.record(z.string()).optional().nullable(),
  features: z.array(z.string()).optional().nullable(),
  primaryColor: z.string().max(30).optional().nullable(),
  whatsappPhone: z.string().max(30).optional().nullable(),
  socialInstagram: z.string().max(100).optional().nullable(),
});
export type UpdateMiniSiteSettingsInputDto = z.infer<typeof UpdateMiniSiteSettingsSchema>;

export interface PublicMiniSiteResponseDto {
  tenant: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    coverUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    whatsappPhone: string | null;
    phone: string | null;
    instagram: string | null;
    facebook: string | null;
    headline: string;
    about: string;
    address: string;
    businessHours: Record<string, string>;
    features: string[];
    googleReviewUrl: string | null;
  };
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string;
    estimatedMinutes: number | null;
    startingPriceCents: number;
  }>;
  portfolio: MiniSitePortfolioItemDto[];
  reputation: {
    npsScore: number;
    totalReviews: number;
    averageStars: number;
    testimonials: Array<{
      customerName: string;
      vehicleModel: string | null;
      score: number;
      comment: string;
      date: string;
    }>;
  };
}

// ==============================================================================
// MÓDULO FISCAL: EMISSÃO AUTOMÁTICA DE NFS-E (T6.10)
// ==============================================================================

export const FiscalEnvironmentSchema = z.enum(['sandbox', 'production']);
export type FiscalEnvironment = z.infer<typeof FiscalEnvironmentSchema>;

export const FiscalProviderSchema = z.enum(['focus_nfe', 'plugnotas', 'enotas']);
export type FiscalProvider = z.infer<typeof FiscalProviderSchema>;

export const FiscalTaxRegimeSchema = z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'mei']);
export type FiscalTaxRegime = z.infer<typeof FiscalTaxRegimeSchema>;

export const FiscalInvoiceStatusSchema = z.enum(['draft', 'processing', 'authorized', 'error', 'cancelled']);
export type FiscalInvoiceStatus = z.infer<typeof FiscalInvoiceStatusSchema>;

export const UpdateFiscalSettingsSchema = z.object({
  environment: FiscalEnvironmentSchema.default('sandbox'),
  provider: FiscalProviderSchema.default('focus_nfe'),
  apiToken: z.string().optional().nullable(),
  certificatePfxBase64: z.string().optional().nullable(),
  certificatePassword: z.string().optional().nullable(),
  companyLegalName: z.string().max(255).optional().nullable(),
  companyCnpj: z.string().max(20).optional().nullable(),
  municipalInscription: z.string().max(50).optional().nullable(),
  taxRegime: FiscalTaxRegimeSchema.default('simples_nacional'),
  specialTaxRegime: z.string().max(30).optional().nullable(),
  defaultServiceCode: z.string().max(30).default('14.01'),
  cnaeCode: z.string().max(30).default('4520-0/05'),
  defaultIssRateBasisPoints: z.number().int().min(0).max(10000).default(200),
  issRetentionDefault: z.boolean().default(false),
  autoIssueOnDelivery: z.boolean().default(false),
  autoIssueOnPayment: z.boolean().default(false),
  sendEmailToCustomer: z.boolean().default(true),
  lastRpsNumber: z.number().int().min(0).optional(),
  rpsSeries: z.string().max(10).default('1'),
});
export type UpdateFiscalSettingsInputDto = z.infer<typeof UpdateFiscalSettingsSchema>;

export interface TenantFiscalSettingsDto {
  tenantId: string;
  environment: FiscalEnvironment;
  provider: FiscalProvider;
  hasApiToken: boolean;
  hasCertificate: boolean;
  certificateExpiresAt: string | null;
  companyLegalName: string | null;
  companyCnpj: string | null;
  municipalInscription: string | null;
  taxRegime: FiscalTaxRegime;
  specialTaxRegime: string | null;
  defaultServiceCode: string;
  cnaeCode: string;
  defaultIssRateBasisPoints: number;
  issRetentionDefault: boolean;
  autoIssueOnDelivery: boolean;
  autoIssueOnPayment: boolean;
  sendEmailToCustomer: boolean;
  lastRpsNumber: number;
  rpsSeries: string;
  createdAt: string;
  updatedAt: string;
}

export const IssueWorkOrderNfseInputSchema = z.object({
  serviceCode: z.string().max(30).optional(),
  cnaeCode: z.string().max(30).optional(),
  issRateBasisPoints: z.number().int().min(0).max(10000).optional(),
  deductionsCents: z.number().int().min(0).optional(),
  customDescription: z.string().max(2000).optional(),
  sendEmail: z.boolean().optional(),
});
export type IssueWorkOrderNfseInputDto = z.infer<typeof IssueWorkOrderNfseInputSchema>;

export const CancelNfseInputSchema = z.object({
  reason: z.string().min(5, 'Justificativa de cancelamento deve ter pelo menos 5 caracteres').max(500),
});
export type CancelNfseInputDto = z.infer<typeof CancelNfseInputSchema>;

export interface FiscalInvoiceDto {
  id: string;
  tenantId: string;
  workOrderId: string;
  customerId: string | null;
  environment: FiscalEnvironment;
  provider: FiscalProvider;
  providerInvoiceId: string | null;
  rpsNumber: number;
  rpsSeries: string;
  invoiceNumber: string | null;
  verificationCode: string | null;
  status: FiscalInvoiceStatus;
  grossAmountCents: number;
  deductionsCents: number;
  netAmountCents: number;
  issRateBasisPoints: number;
  issAmountCents: number;
  description: string;
  serviceCode: string;
  cnaeCode: string;
  errorMessage: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  issuedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// MÓDULO FINANCEIRO AVANÇADO, DRE GERENCIAL E FLUXO DE CAIXA (T6.11)
// ==============================================================================

export type FinancialCategoryGroupType =
  | 'gross_revenue'
  | 'deduction'
  | 'direct_cost'
  | 'fixed_expense'
  | 'operating_expense'
  | 'financial'
  | 'other';

export const FinancialCategoryGroupTypeEnum = z.enum([
  'gross_revenue',
  'deduction',
  'direct_cost',
  'fixed_expense',
  'operating_expense',
  'financial',
  'other',
]);

export interface FinancialCategoryDto {
  id: string;
  tenantId: string | null;
  name: string;
  type: 'revenue' | 'expense' | 'deduction';
  groupType: FinancialCategoryGroupType;
  isSystem: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const CreateFinancialCategorySchema = z.object({
  name: z.string().min(2, 'Nome da categoria deve ter pelo menos 2 caracteres').max(100),
  type: z.enum(['revenue', 'expense', 'deduction']),
  groupType: FinancialCategoryGroupTypeEnum.default('other'),
  displayOrder: z.number().int().default(0).optional(),
});
export type CreateFinancialCategoryInputDto = z.infer<typeof CreateFinancialCategorySchema>;

export type FinancialBillType = 'payable' | 'receivable';
export type FinancialBillStatus = 'pending' | 'paid' | 'overdue' | 'canceled';

export const FinancialBillTypeEnum = z.enum(['payable', 'receivable']);
export const FinancialBillStatusEnum = z.enum(['pending', 'paid', 'overdue', 'canceled']);

export interface FinancialBillDto {
  id: string;
  tenantId: string;
  categoryId: string | null;
  categoryName?: string | null;
  categoryGroup?: FinancialCategoryGroupType | null;
  type: FinancialBillType;
  description: string;
  supplierCustomerName: string | null;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  paidAmountCents: number | null;
  status: FinancialBillStatus;
  paymentMethod: string | null;
  notes: string | null;
  workOrderId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CreateFinancialBillSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  type: FinancialBillTypeEnum,
  description: z.string().min(2, 'Descrição deve ter pelo menos 2 caracteres').max(255),
  supplierCustomerName: z.string().max(255).optional().nullable(),
  amountCents: z.number().int().min(0, 'Valor não pode ser negativo'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento deve estar no formato YYYY-MM-DD'),
  paymentMethod: z.string().max(30).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  workOrderId: z.string().uuid().optional().nullable(),
});
export type CreateFinancialBillInputDto = z.infer<typeof CreateFinancialBillSchema>;

export const UpdateFinancialBillSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().min(2).max(255).optional(),
  supplierCustomerName: z.string().max(255).optional().nullable(),
  amountCents: z.number().int().min(0).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentMethod: z.string().max(30).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  status: FinancialBillStatusEnum.optional(),
  paidAt: z.string().optional().nullable(),
  paidAmountCents: z.number().int().min(0).optional().nullable(),
});
export type UpdateFinancialBillInputDto = z.infer<typeof UpdateFinancialBillSchema>;

export interface AdvancedDreReportDto {
  startDate: string;
  endDate: string;
  grossRevenueCents: number;
  serviceRevenueCents: number;
  productRevenueCents: number;
  deductions: {
    discountsCents: number;
    issTaxesCents: number;
    totalDeductionsCents: number;
  };
  netRevenueCents: number;
  variableCosts: {
    materialStockCostsCents: number;
    spoolRollCostsCents: number;
    technicianCommissionsCents: number;
    totalVariableCostsCents: number;
  };
  contributionMarginCents: number;
  contributionMarginPercent: number;
  fixedExpenses: {
    rentCents: number;
    utilitiesCents: number;
    salariesCents: number;
    softwareCents: number;
    otherFixedCents: number;
    totalFixedExpensesCents: number;
  };
  operatingExpenses: {
    marketingCents: number;
    toolsMaintenanceCents: number;
    otherOperatingCents: number;
    totalOperatingExpensesCents: number;
  };
  ebitdaCents: number;
  ebitdaMarginPercent: number;
  netIncomeCents: number;
  pendingReceivablesCents: number;
  workOrdersCount: number;
  ticketMedioCents: number;
}

export interface CashFlowDayPointDto {
  date: string;
  incomingCents: number;
  outgoingCents: number;
  projectedBalanceCents: number;
}

export interface CashFlowPeriodSummaryDto {
  totalIncomingCents: number;
  totalOutgoingCents: number;
  projectedNetCents: number;
  finalBalanceCents: number;
}

export interface CashFlowProjectionDto {
  currentBalanceCents: number;
  dailyTimeline: CashFlowDayPointDto[];
  summary30Days: CashFlowPeriodSummaryDto;
  summary60Days: CashFlowPeriodSummaryDto;
  summary90Days: CashFlowPeriodSummaryDto;
}

export const BatchPayCommissionsSchema = z.object({
  technicianId: z.string().uuid(),
  entryIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um lançamento de comissão'),
  paymentMethod: z.string().optional().default('pix'),
  notes: z.string().max(500).optional(),
});
export type BatchPayCommissionsInputDto = z.infer<typeof BatchPayCommissionsSchema>;

export interface BatchPayCommissionsResultDto {
  batchId: string;
  technicianId: string;
  technicianName: string;
  paidCount: number;
  totalPaidCents: number;
  paidAt: string;
}

// ==============================================================================
// T6.12: CONTRATOS DO PAINEL CORPORATIVO DE REDES E FRANQUIAS (MULTIUNIDADE)
// ==============================================================================

export interface UnitDto {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  isActive: boolean;
  workOrdersCount?: number;
  activeBaysCount?: number;
  totalRollsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const CreateUnitSchema = z.object({
  name: z.string().min(2, 'Nome da unidade deve ter pelo menos 2 caracteres'),
  slug: z
    .string()
    .min(2, 'Slug deve ter pelo menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  cnpj: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable(),
  addressStreet: z.string().optional().nullable(),
  addressNumber: z.string().optional().nullable(),
  addressComplement: z.string().optional().nullable(),
  addressNeighborhood: z.string().optional().nullable(),
  addressCity: z.string().optional().nullable(),
  addressState: z.string().length(2, 'Estado deve ter 2 letras').optional().nullable(),
  addressPostalCode: z.string().optional().nullable(),
});
export type CreateUnitInputDto = z.infer<typeof CreateUnitSchema>;

export const UpdateUnitSchema = CreateUnitSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateUnitInputDto = z.infer<typeof UpdateUnitSchema>;

export interface UnitRankingItemDto {
  unitId: string;
  unitName: string;
  unitSlug: string;
  revenueCents: number;
  workOrdersCount: number;
  averageTicketCents: number;
  bayOccupancyRatePercent: number;
  totalBays: number;
  occupiedBays: number;
  activeRollsCount: number;
  rank: number;
}

export interface CorporateDashboardOverviewDto {
  totalRevenueCents: number;
  totalWorkOrders: number;
  averageTicketCents: number;
  averageBayOccupancyRatePercent: number;
  totalUnitsCount: number;
  activeUnitsCount: number;
  unitsRanking: UnitRankingItemDto[];
  inventorySummary: {
    unitId: string;
    unitName: string;
    rollsCount: number;
    rollsTotalMeters: number;
    materialsCount: number;
    inventoryValuationCents: number;
  }[];
}

export const CreateUnitTransferSchema = z
  .object({
    fromUnitId: z.string().uuid('Unidade de origem inválida'),
    toUnitId: z.string().uuid('Unidade de destino inválida'),
    transferType: z.enum(['material', 'roll']),
    materialId: z.string().uuid().optional().nullable(),
    rollId: z.string().uuid().optional().nullable(),
    quantity: z.number().positive('Quantidade deve ser maior que zero'),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine((data) => data.fromUnitId !== data.toUnitId, {
    message: 'A unidade de origem não pode ser igual à unidade de destino',
    path: ['toUnitId'],
  })
  .refine(
    (data) => {
      if (data.transferType === 'roll') return !!data.rollId;
      if (data.transferType === 'material') return !!data.materialId;
      return false;
    },
    {
      message: 'Material ou Bobina deve ser especificado de acordo com o tipo de transferência',
      path: ['transferType'],
    }
  );
export type CreateUnitTransferInputDto = z.infer<typeof CreateUnitTransferSchema>;

export interface UnitTransferDto {
  id: string;
  tenantId: string;
  fromUnitId: string;
  fromUnitName: string;
  toUnitId: string;
  toUnitName: string;
  transferType: 'material' | 'roll';
  materialId?: string | null;
  materialName?: string | null;
  rollId?: string | null;
  rollCode?: string | null;
  rollBrand?: string | null;
  quantity: number;
  status: 'pending' | 'completed' | 'canceled';
  notes?: string | null;
  transferredBy?: string | null;
  transferredByName?: string | null;
  createdAt: string;
}

// ==============================================================================
// T6.13: CONTRATOS DO APP DO TÉCNICO OFFLINE-FIRST & SINCRONIZAÇÃO EM LOTE
// ==============================================================================

export const OfflineActionTypeSchema = z.enum([
  'START_TIMER',
  'PAUSE_TIMER',
  'RESUME_TIMER',
  'STOP_TIMER',
  'UPDATE_PROGRESS',
  'CHECKLIST_ITEM',
  'ADD_NOTE',
]);
export type OfflineActionType = z.infer<typeof OfflineActionTypeSchema>;

export const SingleOfflineActionSchema = z.object({
  id: z.string().uuid('ID de ação inválido'),
  workOrderId: z.string().uuid('ID de OS inválido'),
  actionType: OfflineActionTypeSchema,
  payload: z.record(z.any()).default({}),
  clientTimestamp: z.string().min(1, 'Carimbo de data/hora do cliente é obrigatório'),
});
export type SingleOfflineActionDto = z.infer<typeof SingleOfflineActionSchema>;

export const BatchSyncActionsSchema = z.object({
  actions: z.array(SingleOfflineActionSchema).min(1, 'A lista deve conter ao menos uma ação'),
});
export type BatchSyncActionsInputDto = z.infer<typeof BatchSyncActionsSchema>;

export interface SyncActionResultDto {
  actionId: string;
  success: boolean;
  actionType: string;
  error?: string;
  data?: any;
}

export interface BatchSyncResultDto {
  total: number;
  processed: number;
  failed: number;
  results: SyncActionResultDto[];
  syncedAt: string;
}

// ==============================================================================
// T6.14: INTELIGÊNCIA ARTIFICIAL APLICADA A VISTORIAS & ORÇAMENTOS
// ==============================================================================

export const AiSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type AiSeverityType = z.infer<typeof AiSeverityEnum>;

export const AiDetectedDamageItemSchema = z.object({
  id: z.string().optional(),
  part: z.string().min(1, 'Identificação da peça é obrigatória'),
  damageType: z.string().min(1, 'Tipo de dano é obrigatório'),
  severity: AiSeverityEnum.default('medium'),
  confidence: z.number().min(0).max(1).default(0.85),
  view: z.enum(['top', 'front', 'rear', 'left', 'right', 'isometric']).default('top'),
  xPercent: z.number().min(0).max(100).default(50),
  yPercent: z.number().min(0).max(100).default(50),
  description: z.string().default(''),
  suggestedAction: z.string().optional(),
});
export type AiDetectedDamageItemDto = z.infer<typeof AiDetectedDamageItemSchema>;

export const AiSuggestedServiceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome do serviço é obrigatório'),
  category: z.string().optional(),
  estimatedPriceCents: z.number().int().nonnegative().default(0),
  estimatedMinutes: z.number().int().nonnegative().optional(),
  reason: z.string().default(''),
  matchingDamageIndex: z.number().optional(),
  selected: z.boolean().default(true),
});
export type AiSuggestedServiceItemDto = z.infer<typeof AiSuggestedServiceItemSchema>;

export const AiAnalyzeDamageInputSchema = z.object({
  workOrderId: z.string().uuid('ID de OS inválido').optional(),
  inspectionId: z.string().uuid('ID de inspeção inválido').optional(),
  imageUrl: z.string().optional(),
  imageBase64: z.string().optional(),
  imageFileId: z.string().uuid().optional(),
  angleHint: z.string().optional(),
  vehicleType: z.enum(['car', 'motorcycle', 'truck']).default('car'),
});
export type AiAnalyzeDamageInputDto = z.infer<typeof AiAnalyzeDamageInputSchema>;

export interface AiDamageDetectionResultDto {
  analysisId: string;
  provider: string;
  detectedDamages: AiDetectedDamageItemDto[];
  suggestedServices: AiSuggestedServiceItemDto[];
  summary: string;
  confidenceScore: number;
  tokensUsed: number;
  analyzedAt: string;
}

export const AiVoiceChecklistInputSchema = z.object({
  workOrderId: z.string().uuid('ID de OS inválido').optional(),
  inspectionId: z.string().uuid('ID de inspeção inválido').optional(),
  audioUrl: z.string().optional(),
  audioBase64: z.string().optional(),
  spokenText: z.string().optional(),
});
export type AiVoiceChecklistInputDto = z.infer<typeof AiVoiceChecklistInputSchema>;

export interface AiVoiceChecklistResultDto {
  analysisId: string;
  provider: string;
  transcription: string;
  currentKm: number | null;
  fuelLevel: string | null;
  checklistItems: Array<{ id: string; label: string; checked: boolean; note?: string }>;
  suggestedServices: AiSuggestedServiceItemDto[];
  generalNotes: string;
  analyzedAt: string;
}

export const ApplyAiSuggestionsInputSchema = z.object({
  workOrderId: z.string().uuid('ID de OS inválido'),
  inspectionId: z.string().uuid('ID de inspeção inválido').optional(),
  damages: z.array(AiDetectedDamageItemSchema).optional().default([]),
  services: z.array(AiSuggestedServiceItemSchema).optional().default([]),
  checklist: z
    .object({
      currentKm: z.number().optional().nullable(),
      fuelLevel: z.string().optional().nullable(),
      checklistItems: z.array(z.any()).optional(),
      generalNotes: z.string().optional().nullable(),
    })
    .optional(),
});
export type ApplyAiSuggestionsInputDto = z.infer<typeof ApplyAiSuggestionsInputSchema>;

export interface ApplyAiSuggestionsResultDto {
  success: boolean;
  damagesAddedCount: number;
  servicesAddedCount: number;
  inspectionUpdated: boolean;
  message: string;
}

export interface AiAnalysisHistoryItemDto {
  id: string;
  workOrderId: string | null;
  inspectionId: string | null;
  analysisType: 'image_damage_detection' | 'voice_checklist_extraction';
  provider: string;
  detectedDamagesCount: number;
  suggestedServicesCount: number;
  tokensUsed: number;
  status: string;
  createdAt: string;
}

// ==============================================================================
// 37. CRM DE PÓS-VENDA, GARANTIAS PERIÓDICAS & RETENÇÃO ATIVA (T6.15)
// ==============================================================================

export const CrmRetentionTriggerTypeEnum = z.enum([
  'warranty_revision',
  'service_interval',
  'customer_inactivity',
]);
export type CrmRetentionTriggerType = z.infer<typeof CrmRetentionTriggerTypeEnum>;

export const CrmRetentionChannelEnum = z.enum(['whatsapp', 'email', 'sms']);
export type CrmRetentionChannelType = z.infer<typeof CrmRetentionChannelEnum>;

export const CrmRetentionRuleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(2, 'Nome da regra é obrigatório'),
  serviceCategory: z.string().default('geral'),
  triggerType: CrmRetentionTriggerTypeEnum,
  intervalDays: z.number().int().positive('Intervalo de dias deve ser maior que zero').default(180),
  channel: CrmRetentionChannelEnum.default('whatsapp'),
  messageTemplate: z.string().min(5, 'Template da mensagem é obrigatório'),
  discountType: z.enum(['percentage', 'fixed_amount', 'free_service']).default('percentage'),
  discountValue: z.number().int().min(0).default(10),
  isActive: z.boolean().default(true),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type CrmRetentionRuleDto = z.infer<typeof CrmRetentionRuleSchema>;

export const CreateCrmRetentionRuleSchema = z.object({
  name: z.string().min(2, 'Nome da regra é obrigatório'),
  serviceCategory: z.string().default('geral'),
  triggerType: CrmRetentionTriggerTypeEnum,
  intervalDays: z.number().int().positive().default(180),
  channel: CrmRetentionChannelEnum.default('whatsapp'),
  messageTemplate: z.string().min(5, 'Template da mensagem é obrigatório'),
  discountType: z.enum(['percentage', 'fixed_amount', 'free_service']).default('percentage'),
  discountValue: z.number().int().min(0).default(10),
  isActive: z.boolean().default(true).optional(),
});
export type CreateCrmRetentionRuleInputDto = z.infer<typeof CreateCrmRetentionRuleSchema>;

export const UpdateCrmRetentionRuleSchema = CreateCrmRetentionRuleSchema.partial();
export type UpdateCrmRetentionRuleInputDto = z.infer<typeof UpdateCrmRetentionRuleSchema>;

export interface CrmRetentionOverviewDto {
  totalCustomers: number;
  activeCustomersCount: number; // Visita < 90 dias
  riskCustomersCount: number; // Sem visita entre 90 e 180 dias
  inactiveCustomersCount: number; // Sem visita > 180 dias
  dormantCustomersCount: number; // Sem visita > 365 dias
  repurchaseRatePercent: number; // Clientes com >= 2 visitas
  pendingWarrantyRevisionsCount: number; // Revisões nos próximos 30d ou atrasadas
  convertedContactsCount: number;
  conversionRatePercent: number;
  convertedRevenueCents: number;
}

export interface WarrantyRevisionItemDto {
  warrantyId: string;
  verificationToken: string;
  serviceName: string;
  serviceCategory: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  startsAt: string;
  revisionDueDate: string;
  daysRemainingOrOverdue: number; // negativo se atrasado, positivo se faltam dias
  isOverdue: boolean;
  ruleId?: string | null;
}

export interface InactiveCustomerItemDto {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  lastVisitDate: string;
  daysInactive: number;
  inactivityTier: '90_days' | '180_days' | '365_days_plus';
  lastVehiclePlate: string | null;
  lastVehicleModel: string | null;
  lastServiceName: string | null;
  totalWorkOrders: number;
  lifetimeValueCents: number;
  suggestedDiscountPercent: number;
}

export const TriggerRetentionContactInputSchema = z.object({
  customerId: z.string().uuid('ID de cliente inválido'),
  vehicleId: z.string().uuid().optional().nullable(),
  warrantyId: z.string().uuid().optional().nullable(),
  ruleId: z.string().uuid().optional().nullable(),
  channel: CrmRetentionChannelEnum.default('whatsapp'),
  customMessage: z.string().optional().nullable(),
  discountPercent: z.number().int().min(0).max(100).optional().default(10),
  couponDaysValid: z.number().int().min(1).max(90).optional().default(30),
});
export type TriggerRetentionContactInputDto = z.infer<typeof TriggerRetentionContactInputSchema>;

export interface TriggerRetentionContactResultDto {
  contactId: string;
  customerId: string;
  customerName: string;
  destinationPhone: string;
  couponCode: string;
  discountValue: number;
  discountType: string;
  validUntil: string;
  messageContent: string;
  whatsappUrl: string;
  status: string;
}

export const ConvertRetentionContactInputSchema = z.object({
  convertedWorkOrderId: z.string().uuid().optional().nullable(),
  conversionRevenueCents: z.number().int().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
});
export type ConvertRetentionContactInputDto = z.infer<typeof ConvertRetentionContactInputSchema>;

export interface RetentionContactItemDto {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate?: string | null;
  vehicleModel?: string | null;
  couponCode?: string | null;
  discountValue?: number;
  channel: string;
  messageContent: string;
  whatsappUrl?: string | null;
  status: 'draft' | 'sent' | 'contacted' | 'scheduled' | 'converted' | 'ignored';
  conversionRevenueCents: number;
  convertedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

















