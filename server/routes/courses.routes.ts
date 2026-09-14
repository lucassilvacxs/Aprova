import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { CourseService } from '../services/course.service';

export const courseRoutes = new Hono();

// Listagem de cursos (Acesso autenticado de aluno ou admin)
courseRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const contestId = c.req.query('contestId');
  const subjectId = c.req.query('subjectId');
  const status = c.req.query('status');
  const search = c.req.query('search');

  const role = user.roles.includes('admin') ? 'admin' : 'student';

  const list = await CourseService.listCourses({
    contestId: contestId || undefined,
    subjectId: subjectId || undefined,
    status: status || undefined,
    search: search || undefined,
    role,
    userId: user.id,
  });

  return c.json({ success: true, data: list });
});

// Detalhes do curso com módulos e aulas
courseRoutes.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const role = user.roles.includes('admin') ? 'admin' : 'student';

  const course = await CourseService.getCourseById(id, role, user.id);
  if (!course) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Curso não encontrado ou indisponível.' },
      },
      404
    );
  }

  return c.json({ success: true, data: course });
});

// Schema de criação de curso
const createCourseSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres'),
  slug: z.string().optional(),
  description: z.string().optional(),
  contestId: z.string().uuid().optional().nullable(),
  subjectId: z.string().uuid().optional().nullable(),
  topicId: z.string().uuid().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
});

// Criar curso (Admin)
courseRoutes.post('/', requireAuth, requireRole('admin'), zValidator('json', createCourseSchema), async (c) => {
  const body = c.req.valid('json');
  const created = await CourseService.createCourse({
    ...body,
    thumbnailUrl: body.thumbnailUrl || null,
  });

  return c.json({ success: true, data: created }, 201);
});

// Atualizar curso (Admin)
const updateCourseSchema = createCourseSchema.partial();

courseRoutes.put('/:id', requireAuth, requireRole('admin'), zValidator('json', updateCourseSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const updated = await CourseService.updateCourse(id, {
    ...body,
    thumbnailUrl: body.thumbnailUrl || null,
  });

  if (!updated) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Curso não encontrado.' } },
      404
    );
  }

  return c.json({ success: true, data: updated });
});

// Arquivar curso (Admin - Soft delete)
courseRoutes.delete('/:id', requireAuth, requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const archived = await CourseService.archiveCourse(id);

  if (!archived) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Curso não encontrado.' } },
      404
    );
  }

  return c.json({ success: true, data: archived, message: 'Curso arquivado com sucesso.' });
});
