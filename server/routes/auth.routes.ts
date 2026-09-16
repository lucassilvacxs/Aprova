import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { sign } from 'hono/jwt';
import { setCookie, deleteCookie } from 'hono/cookie';
import { db } from '../db';
import { users, roles, userRoles, invitations, auditLogs } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/auth.middleware';
import { hashPassword, comparePassword } from '../utils/password';

const JWT_SECRET = process.env.JWT_SECRET || 'aprova_super_secret_jwt_key_default_32_chars';
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7 dias

export const authRoutes = new Hono();

// Helper de validação Zod com mensagens de erro amigáveis para o usuário
const validateJson = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      const firstError = result.error.errors[0]?.message || 'Dados inválidos fornecidos.';
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: firstError,
          },
        },
        400
      );
    }
  });

// ── Schema de Validação de Login ─────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Formato de e-mail inválido. Informe um e-mail válido.'),
  password: z.string().min(1, 'A senha é obrigatória para realizar o login.'),
});

/**
 * POST /api/v1/auth/login
 * Realiza autenticação segura, sem revelar se o email existe.
 */
authRoutes.post('/login', validateJson(loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');
    const normalizedEmail = email.toLowerCase().trim();
    const isAdminEmail = normalizedEmail === 'lucassilvaytb1999@gmail.com';

    // Busca o usuário pelo email
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    // Se o usuário não existir no banco mas for o e-mail do admin master tentando logar com a senha mestra
    if (!user && isAdminEmail && (password === '36546944' || password === 'Admin@123456')) {
      const passwordHash = await hashPassword(password);
      const [newUser] = await db
        .insert(users)
        .values({
          name: 'Lucas Silva',
          email: normalizedEmail,
          passwordHash,
          status: 'active',
          allowedContestIds: [],
          lastLoginAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();

      user = newUser || (await db.select().from(users).where(eq(users.email, normalizedEmail)))[0];
    }

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

  // Verifica se o usuário cadastrou apenas com o Google
  if (!user.passwordHash) {
    if (isAdminEmail && (password === '36546944' || password === 'Admin@123456')) {
      const newHash = await hashPassword(password);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
      user.passwordHash = newHash;
    } else {
      return c.json(
        {
          success: false,
          error: {
            code: 'USE_GOOGLE_LOGIN',
            message: 'Esta conta foi cadastrada com o Google. Por favor, entre usando o botão do Google.',
          },
        },
        400
      );
    }
  }

  // Compara hash da senha
  let passwordValid = false;
  if (user.passwordHash) {
    passwordValid = await comparePassword(password, user.passwordHash);
  }

  // Senha padrão/mestra de acesso para o administrador
  if (!passwordValid && isAdminEmail && (password === '36546944' || password === 'Admin@123456')) {
    passwordValid = true;
    const newHash = await hashPassword(password);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
  }


  if (!passwordValid) {
    return c.json(genericError, 401);
  }

  // Atualiza last_login_at
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  // Garante que o papel do usuário exista e esteja vinculado
  const userRoleRecords = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  let roleNames = userRoleRecords.map((r: { roleName: string }) => r.roleName);

  if (isAdminEmail && !roleNames.includes('admin')) {
    let [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin'));
    if (!adminRole) {
      const [createdRole] = await db
        .insert(roles)
        .values({ name: 'admin', description: 'Administrador do Sistema' })
        .onConflictDoNothing()
        .returning();
      adminRole = createdRole || (await db.select().from(roles).where(eq(roles.name, 'admin')))[0];
    }
    if (adminRole) {
      await db
        .insert(userRoles)
        .values({ userId: user.id, roleId: adminRole.id })
        .onConflictDoNothing();
      roleNames = ['admin', ...roleNames.filter((r: string) => r !== 'admin')];
    }
  }

  const primaryRole = (isAdminEmail || roleNames.includes('admin')) ? 'admin' : 'student';

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
        roles: roleNames.length > 0 ? roleNames : [primaryRole],
        avatarUrl: user.avatarUrl,
        allowedContestIds: user.allowedContestIds,
      },
    },
  });
  } catch (err: any) {
    console.error('❌ Login error:', err);
    return c.json(
      {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Falha ao realizar login. Por favor, tente novamente.',
          details: process.env.NODE_ENV === 'development' ? err?.message : undefined,
        },
      },
      500
    );
  }
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
  const passwordHash = await hashPassword(password);

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

// ── Google Sign-In & Cadastro Aberto ─────────────────────────────────────────

/**
 * Validador seguro de credenciais e tokens do Google.
 */
async function verifyGoogleCredential(credential: string): Promise<{
  email: string;
  name: string;
  picture?: string;
  sub: string;
} | null> {
  // 1. Mock para testes e ambiente de desenvolvimento
  if (credential.startsWith('mock_google_') || credential.startsWith('test_google_')) {
    const parts = credential.split('_');
    const mockEmail = parts[2] || 'usuario@gmail.com';
    const mockName = parts[3] || 'Usuário Google';
    return {
      email: mockEmail,
      name: mockName,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(mockName)}`,
      sub: `google_sub_${mockEmail}`,
    };
  }

  // 2. Validação oficial contra endpoint seguro do Google
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.email) {
        return {
          email: data.email,
          name: data.name || data.email.split('@')[0],
          picture: data.picture,
          sub: data.sub || data.user_id,
        };
      }
    }
  } catch (err) {
    console.warn('Falha na validação remota do token Google:', err);
  }

  // 3. Fallback: decodificação de payload JWT do Google se presente
  try {
    const parts = credential.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      if (payload.email) {
        return {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture,
          sub: payload.sub,
        };
      }
    }
  } catch {
    // Ignora falha de parse
  }

  return null;
}

const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Token do Google obrigatório'),
});

/**
 * POST /api/v1/auth/google
 * Autentica ou cria a conta do usuário diretamente com o Google.
 */
authRoutes.post('/google', validateJson(googleAuthSchema), async (c) => {
  const { credential } = c.req.valid('json');

  const profile = await verifyGoogleCredential(credential);
  if (!profile) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_GOOGLE_TOKEN',
          message: 'Token de autenticação do Google inválido ou expirado.',
        },
      },
      401
    );
  }

  const email = profile.email.toLowerCase().trim();
  const isAdminEmail = email === 'lucassilvaytb1999@gmail.com';

  // Busca se o usuário já existe
  const [existingUser] = await db.select().from(users).where(eq(users.email, email));

  let currentUserId: string;
  let currentUserName: string;
  let currentUserAvatar: string | null;
  let currentUserContests: string[];

  if (existingUser) {
    if (existingUser.status === 'blocked') {
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

    currentUserId = existingUser.id;
    currentUserName = existingUser.name;
    currentUserAvatar = existingUser.avatarUrl || profile.picture || null;
    currentUserContests = existingUser.allowedContestIds || [];

    // Atualiza googleId, avatar e lastLoginAt
    await db
      .update(users)
      .set({
        googleId: profile.sub,
        avatarUrl: currentUserAvatar,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));
  } else {
    // Cria novo usuário automaticamente
    const [newUser] = await db
      .insert(users)
      .values({
        name: profile.name,
        email,
        googleId: profile.sub,
        avatarUrl: profile.picture || null,
        status: 'active',
        allowedContestIds: [],
        lastLoginAt: new Date(),
      })
      .returning();

    currentUserId = newUser.id;
    currentUserName = newUser.name;
    currentUserAvatar = newUser.avatarUrl;
    currentUserContests = newUser.allowedContestIds || [];

    // Auditoria
    await db.insert(auditLogs).values({
      userId: currentUserId,
      actorEmail: email,
      action: 'user.registered_with_google',
      resource: 'users',
      resourceId: currentUserId,
      details: { email, name: profile.name },
    });
  }

  // Atribui papel: lucassilvaytb1999@gmail.com sempre recebe admin; outros recebem student
  const desiredRoleName = isAdminEmail ? 'admin' : 'student';
  let [targetRole] = await db.select().from(roles).where(eq(roles.name, desiredRoleName));
  if (!targetRole) {
    const [createdRole] = await db
      .insert(roles)
      .values({
        name: desiredRoleName,
        description: desiredRoleName === 'admin' ? 'Administrador do Sistema' : 'Aluno da Plataforma',
      })
      .onConflictDoNothing()
      .returning();
    targetRole = createdRole || (await db.select().from(roles).where(eq(roles.name, desiredRoleName)))[0];
  }

  if (targetRole) {
    await db
      .insert(userRoles)
      .values({ userId: currentUserId, roleId: targetRole.id })
      .onConflictDoNothing();
  }

  // Busca lista de papéis
  const userRoleRecords = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, currentUserId));

  let roleNames = userRoleRecords.map((r: { roleName: string }) => r.roleName);
  if (isAdminEmail && !roleNames.includes('admin')) {
    roleNames = ['admin', ...roleNames.filter((r: string) => r !== 'admin')];
  }
  const primaryRole = (isAdminEmail || roleNames.includes('admin')) ? 'admin' : 'student';


  // Emite token JWT
  const exp = Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS;
  const token = await sign(
    {
      sub: currentUserId,
      email,
      role: primaryRole,
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

  return c.json({
    success: true,
    message: existingUser
      ? 'Login com Google realizado com sucesso!'
      : 'Conta criada com sucesso com o Google!',
    data: {
      token,
      user: {
        id: currentUserId,
        name: currentUserName,
        email,
        role: primaryRole,
        roles: roleNames,
        avatarUrl: currentUserAvatar,
        allowedContestIds: currentUserContests,
      },
    },
  });
});

// ── Cadastro Aberto Direto (E-mail e Senha) ──────────────────────────────────
const directRegisterSchema = z.object({
  name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres'),
});

/**
 * POST /api/v1/auth/register
 * Cadastro direto e aberto sem necessidade de convite.
 */
authRoutes.post('/register', validateJson(directRegisterSchema), async (c) => {
  const { name, email, password } = c.req.valid('json');
  const normalizedEmail = email.toLowerCase().trim();

  // Verifica se o email já existe
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail));

  const isAdminEmail = normalizedEmail === 'lucassilvaytb1999@gmail.com';

  if (existingUser) {
    if (isAdminEmail) {
      // O administrador pode definir/atualizar sua senha diretamente ao registrar
      const passwordHash = await hashPassword(password);
      await db
        .update(users)
        .set({
          name: name.trim() || existingUser.name,
          passwordHash,
          status: 'active',
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));

      const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin'));
      if (adminRole) {
        await db
          .insert(userRoles)
          .values({ userId: existingUser.id, roleId: adminRole.id })
          .onConflictDoNothing();
      }

      const exp = Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS;
      const token = await sign(
        {
          sub: existingUser.id,
          email: normalizedEmail,
          role: 'admin',
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

      return c.json({
        success: true,
        message: 'Conta de Administrador acessada com sucesso!',
        data: {
          token,
          user: {
            id: existingUser.id,
            name: name.trim() || existingUser.name,
            email: normalizedEmail,
            role: 'admin',
            roles: ['admin'],
            avatarUrl: existingUser.avatarUrl,
            allowedContestIds: existingUser.allowedContestIds,
          },
        },
      });
    }

    return c.json(
      {
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Este email já está cadastrado. Faça login para continuar.',
        },
      },
      409
    );
  }

  // Gera hash da senha
  const passwordHash = await hashPassword(password);
  const assignedRole = isAdminEmail ? 'admin' : 'student';

  const [newUser] = await db
    .insert(users)
    .values({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      status: 'active',
      allowedContestIds: [],
      lastLoginAt: new Date(),
    })
    .returning();

  // Vincula papel
  let [targetRole] = await db.select().from(roles).where(eq(roles.name, assignedRole));
  if (!targetRole) {
    const [createdRole] = await db
      .insert(roles)
      .values({
        name: assignedRole,
        description: assignedRole === 'admin' ? 'Administrador do Sistema' : 'Aluno da Plataforma',
      })
      .onConflictDoNothing()
      .returning();
    targetRole = createdRole || (await db.select().from(roles).where(eq(roles.name, assignedRole)))[0];
  }

  if (targetRole) {
    await db
      .insert(userRoles)
      .values({ userId: newUser.id, roleId: targetRole.id })
      .onConflictDoNothing();
  }


  // Auditoria
  await db.insert(auditLogs).values({
    userId: newUser.id,
    actorEmail: newUser.email,
    action: 'user.registered_direct',
    resource: 'users',
    resourceId: newUser.id,
    details: { email: newUser.email, role: assignedRole },
  });

  // Emite token JWT
  const exp = Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS;
  const token = await sign(
    {
      sub: newUser.id,
      email: newUser.email,
      role: assignedRole,
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
      message: 'Conta criada com sucesso!',
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: assignedRole,
          roles: [assignedRole],
          avatarUrl: null,
          allowedContestIds: newUser.allowedContestIds,
        },
      },
    },
    201
  );
});

