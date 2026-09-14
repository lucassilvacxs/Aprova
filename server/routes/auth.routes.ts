import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { sign } from 'hono/jwt';
import { setCookie, deleteCookie } from 'hono/cookie';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users, roles, userRoles, invitations, auditLogs } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'aprova_super_secret_jwt_key_default_32_chars';
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7 dias

export const authRoutes = new Hono();

// ── Schema de Validação de Login ─────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres'),
});

/**
 * POST /api/v1/auth/login
 * Realiza autenticação segura, sem revelar se o email existe.
 */
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // Busca o usuário pelo email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()));

  // Mensagem genérica para evitar enumeração de contas
  const genericError = {
    success: false,
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciais inválidas. Verifique seu email e senha.',
    },
  };

  if (!user) {
    return c.json(genericError, 401);
  }

  // Verifica status da conta
  if (user.status === 'blocked') {
    return c.json(
      {
        success: false,
        error: {
          code: 'ACCOUNT_BLOCKED',
          message: 'Sua conta está bloqueada. Entre em contato com a administração.',
        },
      },
      403
    );
  }

  if (user.status !== 'active') {
    return c.json(
      {
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Conta inativa ou pendente de ativação.',
        },
      },
      403
    );
  }

  // Compara hash da senha
  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    return c.json(genericError, 401);
  }

  // Atualiza last_login_at
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  // Busca papel do usuário
  const userRoleRecords = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  const roleNames = userRoleRecords.map((r: { roleName: string }) => r.roleName);
  const primaryRole = roleNames.includes('admin') ? 'admin' : 'student';

  // Emite token JWT
  const exp = Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS;
  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      role: primaryRole,
      exp,
    },
    JWT_SECRET,
    'HS256'
  );

  // Define cookie seguro
  setCookie(c, 'aprova_session', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: JWT_EXPIRES_IN_SECONDS,
  });

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: primaryRole,
        roles: roleNames,
        avatarUrl: user.avatarUrl,
        allowedContestIds: user.allowedContestIds,
      },
    },
  });
});

/**
 * POST /api/v1/auth/logout
 * Encerra a sessão ativa limpando o cookie
 */
authRoutes.post('/logout', (c) => {
  deleteCookie(c, 'aprova_session', { path: '/' });
  return c.json({
    success: true,
    message: 'Sessão encerrada com sucesso.',
  });
});

/**
 * GET /api/v1/auth/me
 * Retorna os dados do usuário autenticado a partir do token
 */
authRoutes.get('/me', requireAuth, (c) => {
  const user = c.get('user');
  const primaryRole = user.roles.includes('admin') ? 'admin' : 'student';

  return c.json({
    success: true,
    data: {
      user: {
        ...user,
        role: primaryRole,
      },
    },
  });
});

// ── Validação e Ativação de Convites ──────────────────────────────────────────
const validateInviteSchema = z.object({
  code: z.string().min(1, 'Código de convite obrigatório'),
});

/**
 * POST /api/v1/auth/invitation/validate
 * Verifica se um convite existe, está pendente e não expirou.
 */
authRoutes.post('/invitation/validate', zValidator('json', validateInviteSchema), async (c) => {
  const { code } = c.req.valid('json');

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.code, code.trim()), eq(invitations.status, 'pending')));

  if (!invitation) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVITE_NOT_FOUND',
          message: 'Convite inválido ou não encontrado.',
        },
      },
      404
    );
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    // Marca como expirado
    await db.update(invitations).set({ status: 'expired' }).where(eq(invitations.id, invitation.id));
    return c.json(
      {
        success: false,
        error: {
          code: 'INVITE_EXPIRED',
          message: 'Este convite já expirou. Solicite um novo convite à administração.',
        },
      },
      400
    );
  }

  return c.json({
    success: true,
    data: {
      valid: true,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    },
  });
});

const registerWithInviteSchema = z.object({
  code: z.string().min(1, 'Código do convite é obrigatório'),
  name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
  password: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres'),
  email: z.string().email('Email inválido').optional(),
});

/**
 * POST /api/v1/auth/register-with-invite
 * Cria a conta do aluno a partir de um convite válido (Invite-Only).
 */
authRoutes.post('/register-with-invite', zValidator('json', registerWithInviteSchema), async (c) => {
  const { code, name, password, email } = c.req.valid('json');

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.code, code.trim()), eq(invitations.status, 'pending')));

  if (!invitation) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_INVITE',
          message: 'Convite inválido ou já utilizado.',
        },
      },
      400
    );
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    await db.update(invitations).set({ status: 'expired' }).where(eq(invitations.id, invitation.id));
    return c.json(
      {
        success: false,
        error: {
          code: 'INVITE_EXPIRED',
          message: 'Este convite já expirou.',
        },
      },
      400
    );
  }

  // O email vem do convite ou do body (se convite não tinha email vinculado)
  const targetEmail = (invitation.email || email)?.toLowerCase().trim();
  if (!targetEmail) {
    return c.json(
      {
        success: false,
        error: { code: 'EMAIL_REQUIRED', message: 'Email é obrigatório para cadastro.' },
      },
      400
    );
  }

  // Verifica se o email já está em uso
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, targetEmail));

  if (existingUser) {
    return c.json(
      {
        success: false,
        error: {
          code: 'EMAIL_IN_USE',
          message: 'Já existe uma conta cadastrada com este email.',
        },
      },
      400
    );
  }

  // Cria o hash da senha
  const passwordHash = await bcrypt.hash(password, 10);

  // Cria o novo usuário
  const [newUser] = await db
    .insert(users)
    .values({
      name: name.trim(),
      email: targetEmail,
      passwordHash,
      status: 'active',
      allowedContestIds: invitation.allowedContestIds || [],
      lastLoginAt: new Date(),
    })
    .returning();

  // Busca o papel designado pelo convite (padrão: 'student')
  const [targetRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, invitation.role || 'student'));

  if (targetRole) {
    await db
      .insert(userRoles)
      .values({ userId: newUser.id, roleId: targetRole.id })
      .onConflictDoNothing();
  }

  // Marca convite como utilizado (atômico)
  await db
    .update(invitations)
    .set({
      status: 'used',
      usedBy: newUser.id,
      usedAt: new Date(),
    })
    .where(eq(invitations.id, invitation.id));

  // Log de auditoria
  await db.insert(auditLogs).values({
    userId: newUser.id,
    actorEmail: newUser.email,
    action: 'user.registered_with_invite',
    resource: 'users',
    resourceId: newUser.id,
    details: { invitationId: invitation.id, role: invitation.role },
  });

  // Emite token JWT
  const exp = Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS;
  const token = await sign(
    {
      sub: newUser.id,
      email: newUser.email,
      role: invitation.role || 'student',
      exp,
    },
    JWT_SECRET,
    'HS256'
  );

  setCookie(c, 'aprova_session', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: JWT_EXPIRES_IN_SECONDS,
  });

  return c.json(
    {
      success: true,
      message: 'Conta ativada com sucesso!',
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: invitation.role || 'student',
          allowedContestIds: newUser.allowedContestIds,
        },
      },
    },
    201
  );
});
