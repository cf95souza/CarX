import { UserRole, type UserRoleType } from './enums.js';

export const Permissions = {
  // Ordens de Serviço
  WORK_ORDER_VIEW_ALL: 'work_order:view_all',
  WORK_ORDER_VIEW_ASSIGNED: 'work_order:view_assigned',
  WORK_ORDER_CREATE: 'work_order:create',
  WORK_ORDER_UPDATE_STATUS: 'work_order:update_status',
  WORK_ORDER_DELETE: 'work_order:delete',

  // Financeiro
  FINANCIAL_VIEW: 'financial:view',
  FINANCIAL_MANAGE: 'financial:manage',
  COMMISSIONS_VIEW: 'commissions:view',

  // Clientes e Veículos
  CUSTOMERS_MANAGE: 'customers:manage',
  VEHICLES_MANAGE: 'vehicles:manage',

  // Almoxarifado / Estoque
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_MANAGE: 'inventory:manage',

  // Configurações e Planos
  TENANT_SETTINGS: 'tenant:settings',
  USERS_MANAGE: 'users:manage',
} as const;

export type PermissionType = (typeof Permissions)[keyof typeof Permissions];

export const RolePermissions: Record<UserRoleType, readonly PermissionType[]> = {
  [UserRole.OWNER]: Object.values(Permissions),
  [UserRole.GESTOR]: [
    Permissions.WORK_ORDER_VIEW_ALL,
    Permissions.WORK_ORDER_CREATE,
    Permissions.WORK_ORDER_UPDATE_STATUS,
    Permissions.FINANCIAL_VIEW,
    Permissions.FINANCIAL_MANAGE,
    Permissions.COMMISSIONS_VIEW,
    Permissions.CUSTOMERS_MANAGE,
    Permissions.VEHICLES_MANAGE,
    Permissions.INVENTORY_VIEW,
    Permissions.INVENTORY_MANAGE,
    Permissions.TENANT_SETTINGS,
    Permissions.USERS_MANAGE,
  ],
  [UserRole.ATENDENTE]: [
    Permissions.WORK_ORDER_VIEW_ALL,
    Permissions.WORK_ORDER_CREATE,
    Permissions.CUSTOMERS_MANAGE,
    Permissions.VEHICLES_MANAGE,
    Permissions.INVENTORY_VIEW,
  ],
  [UserRole.TECNICO]: [
    Permissions.WORK_ORDER_VIEW_ASSIGNED,
    Permissions.WORK_ORDER_UPDATE_STATUS,
    Permissions.INVENTORY_VIEW,
  ],
  [UserRole.FINANCEIRO]: [
    Permissions.WORK_ORDER_VIEW_ALL,
    Permissions.FINANCIAL_VIEW,
    Permissions.FINANCIAL_MANAGE,
    Permissions.COMMISSIONS_VIEW,
  ],
  [UserRole.SUPERADMIN]: Object.values(Permissions),
};

export function hasPermission(role: UserRoleType, permission: PermissionType): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}

