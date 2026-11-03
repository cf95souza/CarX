import { z } from 'zod';
import { WorkOrderStatus, UserRole, VehicleClass, DamageType } from './enums.js';

export const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido').optional().nullable(),
  phone: z.string().min(8, 'Telefone inválido'),
  cpfCnpj: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  createdAt: z.date().optional(),
});

export type CustomerDto = z.infer<typeof CustomerSchema>;

export const VehicleSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  plate: z.string().min(7, 'Placa deve ter no mínimo 7 caracteres').toUpperCase(),
  brand: z.string().min(2, 'Marca obrigatória'),
  model: z.string().min(2, 'Modelo obrigatório'),
  color: z.string().optional().nullable(),
  year: z.string().optional().nullable(),
  vehicleClass: z.nativeEnum(VehicleClass).default(VehicleClass.HATCH),
  createdAt: z.date().optional(),
});

export type VehicleDto = z.infer<typeof VehicleSchema>;

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

