/**
 * CarX — Enums Fundamentais Compartilhados
 */

export const WorkOrderStatus = {
  QUOTE: 'QUOTE',
  APPROVED: 'APPROVED',
  SCHEDULED: 'SCHEDULED',
  CHECKED_IN: 'CHECKED_IN',
  IN_PROGRESS: 'IN_PROGRESS',
  QA: 'QA',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  PAUSED: 'PAUSED',
  CANCELED: 'CANCELED',
} as const;

export type WorkOrderStatusType = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

export const UserRole = {
  OWNER: 'owner',
  GESTOR: 'gestor',
  ATENDENTE: 'atendente',
  TECNICO: 'tecnico',
  FINANCEIRO: 'financeiro',
  SUPERADMIN: 'superadmin',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const VehicleClass = {
  HATCH: 'Hatch',
  SEDAN: 'Sedan',
  SUV: 'SUV',
  PICKUP: 'Pickup',
  ESPORTIVO: 'Esportivo',
  MOTO: 'Moto',
} as const;

export type VehicleClassType = (typeof VehicleClass)[keyof typeof VehicleClass];

export const DamageType = {
  SCRATCH: 'scratch',
  DENT: 'dent',
  BURNT_PAINT: 'burnt_paint',
  CRACK: 'crack',
  STAIN: 'stain',
  OTHER: 'other',
} as const;

export type DamageTypeType = (typeof DamageType)[keyof typeof DamageType];

