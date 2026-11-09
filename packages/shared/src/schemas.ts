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

// ==============================================================================
// ORDENS DE SERVIÇO E MÁQUINA DE ESTADOS (T3.3)
// ==============================================================================

export const ALLOWED_WORK_ORDER_TRANSITIONS: Record<WorkOrderStatusType, readonly WorkOrderStatusType[]> = {
  [WorkOrderStatus.QUOTE]: [WorkOrderStatus.APPROVED, WorkOrderStatus.CANCELED],
  [WorkOrderStatus.APPROVED]: [
    WorkOrderStatus.SCHEDULED,
    WorkOrderStatus.CHECKED_IN,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.SCHEDULED]: [
    WorkOrderStatus.CHECKED_IN,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.CHECKED_IN]: [
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.PAUSED,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.IN_PROGRESS]: [
    WorkOrderStatus.QA,
    WorkOrderStatus.PAUSED,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.PAUSED]: [
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.QA,
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.QA]: [
    WorkOrderStatus.READY,
    WorkOrderStatus.IN_PROGRESS, // Se reprovado no QA, volta para correções
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.READY]: [
    WorkOrderStatus.DELIVERED,
    WorkOrderStatus.IN_PROGRESS, // Retorno pontual antes da saída
    WorkOrderStatus.CANCELED,
  ],
  [WorkOrderStatus.DELIVERED]: [],
  [WorkOrderStatus.CANCELED]: [],
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
  trackingToken: z.string().uuid().optional(),
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
  scheduledAt?: string | Date | null;
  notes?: string | null;
  customerNotes?: string | null;
  items?: CreateWorkOrderItemInput[];
}

export interface UpdateWorkOrderDto {
  technicianId?: string | null;
  discountCents?: number;
  scheduledAt?: string | Date | null;
  notes?: string | null;
  customerNotes?: string | null;
}

export interface ChangeWorkOrderStatusDto {
  status: WorkOrderStatusType;
  notes?: string | null;
  cancelReason?: string | null;
  metadata?: Record<string, any>;
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

export interface PublicVehiclePassportDto {
  verificationToken: string;
  isValid: boolean;
  status: WarrantyStatusType;
  serviceName: string;
  materialLotNumber: string | null;
  warrantyMonths: number;
  startsAt: string;
  expiresAt: string;
  remainingDays: number;
  vehicle: {
    brand: string;
    model: string;
    plateMasked: string;
    year: number;
    color: string | null;
  };
  workshop: {
    tradeName: string;
    phone: string | null;
    city: string | null;
  };
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
  createdAt: string;
  updatedAt: string;
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







