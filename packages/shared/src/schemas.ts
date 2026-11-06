import { z } from 'zod';
import { WorkOrderStatus, UserRole, VehicleClass, DamageType } from './enums.js';

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
// ORDENS DE SERVIÇO E CHECKLIST
// ==============================================================================

export const WorkOrderSchema = z.object({
  id: z.string().uuid().optional(),
  osNumber: z.number().int().positive().optional(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  technicianId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(WorkOrderStatus).default(WorkOrderStatus.QUOTE),
  progress: z.number().min(0).max(100).default(0),
  totalValue: z.number().min(0).default(0),
  discountValue: z.number().min(0).default(0),
  paidValue: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  trackingToken: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type WorkOrderDto = z.infer<typeof WorkOrderSchema>;

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
