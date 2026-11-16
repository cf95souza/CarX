import { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import {
  UserRole,
  type UserRoleType,
  type PermissionType,
  hasAllPermissions,
} from '@carx/shared';

/**
 * Guard para validar se o usuário autenticado possui o(s) papel(éis) exigido(s)
 */
export function requireRole(
  ...allowedRoles: (UserRoleType | readonly UserRoleType[])[]
): preHandlerHookHandler {
  const rolesArray = allowedRoles.flat() as UserRoleType[];

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Autenticação necessária para acessar este recurso.',
      });
    }

    // Superadmin possui bypass autorizado para qualquer papel
    if (user.isSuperadmin) {
      return;
    }

    const rawRole = String(user.role || '').toLowerCase().trim();
    let currentRole: string = rawRole || UserRole.ATENDENTE;
    if (rawRole === 'adm' || rawRole === 'admin' || rawRole === 'administrador') {
      currentRole = UserRole.OWNER;
    } else if (rawRole === 'operador') {
      currentRole = UserRole.TECNICO;
    } else if (rawRole === 'gestor') {
      currentRole = UserRole.GESTOR;
    }

    const normalizedAllowed = rolesArray.map((r) => {
      const lr = String(r).toLowerCase().trim();
      if (lr === 'adm' || lr === 'admin') return UserRole.OWNER;
      if (lr === 'operador') return UserRole.TECNICO;
      return lr;
    });

    // Se o usuário for owner ou superadmin, tem acesso total aos endpoints de gestor e atendente
    if (currentRole === UserRole.OWNER && (normalizedAllowed.includes(UserRole.GESTOR) || normalizedAllowed.includes(UserRole.ATENDENTE))) {
      return;
    }

    if (!normalizedAllowed.includes(currentRole)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Acesso negado: seu papel ("${user.role}") não possui permissão para acessar esta rota.`,
      });
    }
  };
}

/**
 * Guard para validar se o papel do usuário possui a(s) permissão(ões) exigida(s)
 */
export function requirePermission(
  ...requiredPermissions: (PermissionType | readonly PermissionType[])[]
): preHandlerHookHandler {
  const permissionsArray = requiredPermissions.flat() as PermissionType[];

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Autenticação necessária para acessar este recurso.',
      });
    }

    // Superadmin possui todas as permissões
    if (user.isSuperadmin) {
      return;
    }

    const currentRole = (user.role as UserRoleType) || UserRole.ATENDENTE;

    const isAuthorized = hasAllPermissions(currentRole, permissionsArray);
    if (!isAuthorized) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Acesso negado: seu cargo ("${currentRole}") não possui as seguintes permissões: ${permissionsArray.join(', ')}.`,
      });
    }
  };
}

/**
 * Guard de escopo técnico: garante que um técnico só acesse/modifique OS atribuídas a ele mesmo
 */
export function requireAssignedTechnician(
  getAssignedTechId: (request: FastifyRequest) => string | null | undefined | Promise<string | null | undefined>
): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Autenticação necessária.',
      });
    }

    // Gestores, proprietários e superadmins possuem visão global de todas as OS da loja
    if (user.isSuperadmin || user.role === UserRole.OWNER || user.role === UserRole.GESTOR) {
      return;
    }

    // Se o usuário for um técnico, ele só pode acessar ordens atribuídas diretamente a ele
    if (user.role === UserRole.TECNICO) {
      const assignedTechId = await getAssignedTechId(request);

      if (!assignedTechId || assignedTechId !== user.sub) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Acesso negado: técnicos só podem acessar e atualizar ordens de serviço atribuídas a eles.',
        });
      }
    }
  };
}
