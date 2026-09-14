import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import crypto from 'crypto';
import { db } from '../db';
import {
  users,
  roles,
  userRoles,
  invitations,
  contests,
  agencies,
  examBoards,
  subjects,
  auditLogs,
} from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

export const adminRoutes = new Hono();

// Aplica autenticação e papel admin em todas as rotas deste router
adminRoutes.use('*', requireAuth, requireRole('admin'));

// ============================================================================
// 1. ADMIN — GESTÃO DE USUÁRIOS
// ============================================================================

/**
 * GET /api/v1/admin/users
 * Lista todos os usuários cadastrados com seus papéis e status.
 */
adminRoutes.get('/users', async (c) => {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      avatarUrl: users.avatarUrl,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Busca os papéis de cada usuário
  const userRolesList = await db
    .select({
      userId: userRoles.userId,
      roleName: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id));

  const roleMap: Record<string, string[]> = {};
  for (const ur of userRolesList) {
    if (!roleMap[ur.userId]) roleMap[ur.userId] = [];
    roleMap[ur.userId].push(ur.roleName);
  }

  const result = allUsers.map((u: any) => ({
    ...u,
    roles: roleMap[u.id] || ['student'],
    role: (roleMap[u.id] || []).includes('admin') ? 'admin' : 'student',
  }));

  return c.json({ success: true, data: result });
});

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'blocked', 'inactive']),
});

/**
 * PATCH /api/v1/admin/users/:id/status
 * Ativa, inativa ou bloqueia um usuário com gravação na trilha de auditoria.
 */
adminRoutes.patch('/users/:id/status', zValidator('json', updateUserStatusSchema), async (c) => {
  const targetUserId = c.req.param('id');
  const { status } = c.req.valid('json');
  const currentUser = c.get('user');

  // Não permite que o admin bloqueie a si mesmo
  if (targetUserId === currentUser.id) {
    return c.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Você não pode alterar seu próprio status.' } },
      400
    );
  }

  const [updatedUser] = await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, targetUserId))
    .returning();

  if (!updatedUser) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Usuário não encontrado.' } }, 404);
  }

  // Grava auditoria
  await db.insert(auditLogs).values({
    userId: currentUser.id,
    actorEmail: currentUser.email,
    action: `user.status_changed_to_${status}`,
    resource: 'users',
    resourceId: targetUserId,
    details: { oldStatus: updatedUser.status, newStatus: status },
  });

  return c.json({
    success: true,
    message: `Status do usuário atualizado para ${status}.`,
    data: { id: updatedUser.id, status: updatedUser.status },
  });
});

// ============================================================================
// 2. ADMIN — GESTÃO DE CONVITES PRIVADOS
// ============================================================================

/**
 * GET /api/v1/admin/invitations
 * Lista todos os convites emitidos com criador e status.
 */
adminRoutes.get('/invitations', async (c) => {
  const list = await db
    .select({
      id: invitations.id,
      code: invitations.code,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      usedAt: invitations.usedAt,
      createdAt: invitations.createdAt,
      createdByName: users.name,
      createdByEmail: users.email,
    })
    .from(invitations)
    .innerJoin(users, eq(invitations.createdBy, users.id))
    .orderBy(desc(invitations.createdAt));

  return c.json({ success: true, data: list });
});

const createInviteSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  role: z.enum(['student', 'admin']).default('student'),
  expirationDays: z.number().int().min(1).max(30).default(7),
  allowedContestIds: z.array(z.string()).default([]),
});

/**
 * POST /api/v1/admin/invitations
 * Gera um novo convite com código criptográfico seguro e validade.
 */
adminRoutes.post('/invitations', zValidator('json', createInviteSchema), async (c) => {
  const { email, role, expirationDays, allowedContestIds } = c.req.valid('json');
  const currentUser = c.get('user');

  // Gera código único de convite
  const token = 'inv_' + crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

  const [newInvite] = await db
    .insert(invitations)
    .values({
      code: token,
      email: email ? email.toLowerCase().trim() : null,
      role,
      status: 'pending',
      allowedContestIds,
      expiresAt,
      createdBy: currentUser.id,
    })
    .returning();

  // Grava auditoria
  await db.insert(auditLogs).values({
    userId: currentUser.id,
    actorEmail: currentUser.email,
    action: 'invitation.created',
    resource: 'invitations',
    resourceId: newInvite.id,
    details: { email, role, expirationDays },
  });

  return c.json(
    {
      success: true,
      message: 'Convite gerado com sucesso!',
      data: {
        ...newInvite,
        inviteUrl: `${process.env.APP_URL || 'http://localhost:5173'}/convite?code=${newInvite.code}`,
      },
    },
    201
  );
});

/**
 * DELETE /api/v1/admin/invitations/:id
 * Revoga um convite pendente.
 */
adminRoutes.delete('/invitations/:id', async (c) => {
  const inviteId = c.req.param('id');
  const currentUser = c.get('user');

  const [revoked] = await db
    .update(invitations)
    .set({ status: 'revoked' })
    .where(eq(invitations.id, inviteId))
    .returning();

  if (!revoked) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Convite não encontrado.' } }, 404);
  }

  // Grava auditoria
  await db.insert(auditLogs).values({
    userId: currentUser.id,
    actorEmail: currentUser.email,
    action: 'invitation.revoked',
    resource: 'invitations',
    resourceId: inviteId,
  });

  return c.json({ success: true, message: 'Convite revogado com sucesso.' });
});

// ============================================================================
// 3. ADMIN — GESTÃO DE CONCURSOS E ÓRGÃOS
// ============================================================================

/**
 * GET /api/v1/admin/contests
 * Lista todos os concursos para o painel administrativo.
 */
adminRoutes.get('/contests', async (c) => {
  const contestList = await db
    .select({
      id: contests.id,
      title: contests.title,
      slug: contests.slug,
      year: contests.year,
      status: contests.status,
      vacanciesCount: contests.vacanciesCount,
      salaryBase: contests.salaryBase,
      agencyId: contests.agencyId,
      agencyName: agencies.name,
      agencyAcronym: agencies.acronym,
      boardId: contests.boardId,
      boardAcronym: examBoards.acronym,
      createdAt: contests.createdAt,
    })
    .from(contests)
    .innerJoin(agencies, eq(contests.agencyId, agencies.id))
    .leftJoin(examBoards, eq(contests.boardId, examBoards.id))
    .orderBy(desc(contests.createdAt));

  return c.json({ success: true, data: contestList });
});

const createContestSchema = z.object({
  agencyId: z.string().uuid(),
  boardId: z.string().uuid().optional(),
  title: z.string().min(3),
  slug: z.string().min(2),
  year: z.number().int(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  vacanciesCount: z.number().int().default(0),
  salaryBase: z.string().default('0.00'),
  description: z.string().optional(),
});

/**
 * POST /api/v1/admin/contests
 * Cria um novo concurso no sistema.
 */
adminRoutes.post('/contests', zValidator('json', createContestSchema), async (c) => {
  const data = c.req.valid('json');
  const currentUser = c.get('user');

  const [newContest] = await db
    .insert(contests)
    .values({
      agencyId: data.agencyId,
      boardId: data.boardId,
      title: data.title,
      slug: data.slug.toLowerCase().trim(),
      year: data.year,
      status: data.status,
      vacanciesCount: data.vacanciesCount,
      salaryBase: data.salaryBase,
      description: data.description,
    })
    .returning();

  await db.insert(auditLogs).values({
    userId: currentUser.id,
    actorEmail: currentUser.email,
    action: 'contest.created',
    resource: 'contests',
    resourceId: newContest.id,
    details: { title: newContest.title, slug: newContest.slug },
  });

  return c.json({ success: true, message: 'Concurso criado com sucesso!', data: newContest }, 201);
});

// ============================================================================
// 4. ADMIN — GESTÃO DE DISCIPLINAS
// ============================================================================

/**
 * GET /api/v1/admin/subjects
 * Lista todas as disciplinas cadastradas.
 */
adminRoutes.get('/subjects', async (c) => {
  const subjectList = await db.select().from(subjects).orderBy(subjects.name);
  return c.json({ success: true, data: subjectList });
});

const createSubjectSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  shortName: z.string().optional(),
  description: z.string().optional(),
  colorToken: z.string().default('purple'),
});

/**
 * POST /api/v1/admin/subjects
 * Cria uma nova disciplina.
 */
adminRoutes.post('/subjects', zValidator('json', createSubjectSchema), async (c) => {
  const data = c.req.valid('json');
  const currentUser = c.get('user');

  const [newSubject] = await db
    .insert(subjects)
    .values({
      name: data.name,
      slug: data.slug.toLowerCase().trim(),
      shortName: data.shortName,
      description: data.description,
      colorToken: data.colorToken,
    })
    .returning();

  await db.insert(auditLogs).values({
    userId: currentUser.id,
    actorEmail: currentUser.email,
    action: 'subject.created',
    resource: 'subjects',
    resourceId: newSubject.id,
    details: { name: newSubject.name },
  });

  return c.json({ success: true, message: 'Disciplina cadastrada com sucesso!', data: newSubject }, 201);
});

// ============================================================================
// 5. ADMIN — AUDITORIA
// ============================================================================

/**
 * GET /api/v1/admin/audit-logs
 * Retorna as últimas ações administrativas registradas.
 */
adminRoutes.get('/audit-logs', async (c) => {
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return c.json({ success: true, data: logs });
});
