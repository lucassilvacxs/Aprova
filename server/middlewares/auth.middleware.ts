import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
import { db } from '../db';
import { users, userRoles, roles, rolePermissions, permissions } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'aprova_super_secret_jwt_key_default_32_chars';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  status: string;
  avatarUrl: string | null;
  allowedContestIds: string[];
  roles: string[];
  permissions: string[];
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthenticatedUser;
  }
}

/**
 * Middleware que obriga autenticação válida (Bearer Token ou Cookie aprova_session)
 */
export const requireAuth = createMiddleware(async (c, next) => {
  let token: string | undefined;

  // 1. Tenta obter do header Authorization: Bearer <token>
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Fallback para cookie
  if (!token) {
    token = getCookie(c, 'aprova_session');
  }

  if (!token) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Acesso não autorizado. Faça login para continuar.',
        },
      },
      401
    );
  }

  try {
    const payload = await verify(token, JWT_SECRET, 'HS256');
    if (!payload || !payload.sub) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Sessão inválida ou expirada. Faça login novamente.',
          },
        },
        401
      );
    }

    // Busca o usuário atualizado no banco
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub as string));

    if (!userRecord) {
      return c.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuário não encontrado.',
          },
        },
        401
      );
    }

    if (userRecord.status === 'blocked') {
      return c.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_BLOCKED',
            message: 'Sua conta está bloqueada pelo administrador.',
          },
        },
        403
      );
    }

    if (userRecord.status !== 'active') {
      return c.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Sua conta ainda não está ativa.',
          },
        },
        403
      );
    }

    // Busca os papéis do usuário
    const userRoleRecords = await db
      .select({ roleId: userRoles.roleId, roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userRecord.id));

    const userRoleNames = userRoleRecords.map((r: { roleName: string }) => r.roleName);
    const roleIds = userRoleRecords.map((r: { roleId: string }) => r.roleId);

    // Busca as permissões atribuídas aos papéis
    let permissionNames: string[] = [];
    if (roleIds.length > 0) {
      const rolePermRecords = await db
        .select({ permName: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(inArray(rolePermissions.roleId, roleIds));

      permissionNames = Array.from(new Set(rolePermRecords.map((p: { permName: string }) => p.permName)));
    }

    const authenticatedUser: AuthenticatedUser = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      status: userRecord.status,
      avatarUrl: userRecord.avatarUrl,
      allowedContestIds: userRecord.allowedContestIds || [],
      roles: userRoleNames,
      permissions: permissionNames,
    };

    c.set('user', authenticatedUser);
    await next();
  } catch (err: any) {
    console.error('❌ requireAuth error:', err);
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sessão inválida ou expirada.',
        },
      },
      401
    );
  }
});

/**
 * Middleware que verifica se o usuário possui pelo menos um dos papéis exigidos
 */
export function requireRole(...allowedRoles: string[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Acesso não autenticado.' },
        },
        401
      );
    }

    const hasRole = allowedRoles.some((r) => user.roles.includes(r));
    if (!hasRole) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: privilégios insuficientes para este recurso.',
          },
        },
        403
      );
    }

    await next();
  });
}

/**
 * Middleware que verifica se o usuário possui a permissão requerida
 */
export function requirePermission(...requiredPermissions: string[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Acesso não autenticado.' },
        },
        401
      );
    }

    // Admins possuem todas as permissões implicitamente
    if (user.roles.includes('admin')) {
      return await next();
    }

    const hasPermission = requiredPermissions.every((p) => user.permissions.includes(p));
    if (!hasPermission) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: permissão não concedida.',
          },
        },
        403
      );
    }

    await next();
  });
}
