import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { LessonService } from '../services/lesson.service';

export const lessonRoutes = new Hono();

// Obter detalhes da aula (Aluno e Admin)
lessonRoutes.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const role = user.roles.includes('admin') ? 'admin' : 'student';

  const lesson = await LessonService.getLessonById(id, role, user.id);
  if (!lesson) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Aula não encontrada ou indisponível.' } },
      404
    );
  }

  return c.json({ success: true, data: lesson });
});

// Schema de criação de aula
const createLessonSchema = z.object({
  moduleId: z.string().uuid('ID de módulo inválido'),
  title: z.string().min(2, 'O título da aula deve ter no mínimo 2 caracteres'),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  estimatedDurationMin: z.number().int().positive().optional(),
  type: z.enum(['text', 'video', 'pdf', 'audio', 'link', 'mixed']).default('text'),
  videoUrl: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  contentBody: z.string().optional(),
  resources: z
    .array(
      z.object({
        title: z.string().min(1),
        type: z.enum(['pdf', 'link', 'file']).default('pdf'),
        url: z.string().url(),
      })
    )
    .optional(),
});

// Criar aula (Admin)
lessonRoutes.post('/', requireAuth, requireRole('admin'), zValidator('json', createLessonSchema), async (c) => {
  const body = c.req.valid('json');
  const created = await LessonService.createLesson({
    ...body,
    videoUrl: body.videoUrl || null,
  });

  return c.json({ success: true, data: created }, 201);
});

// Atualizar aula (Admin)
const updateLessonSchema = createLessonSchema.partial();

lessonRoutes.put('/:id', requireAuth, requireRole('admin'), zValidator('json', updateLessonSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const updated = await LessonService.updateLesson(id, {
    ...body,
    videoUrl: body.videoUrl || null,
  });

  if (!updated) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Aula não encontrada.' } }, 404);
  }

  return c.json({ success: true, data: updated });
});

// Reordenar aula (Admin)
const reorderSchema = z.object({
  direction: z.enum(['up', 'down']),
});

lessonRoutes.patch('/:id/reorder', requireAuth, requireRole('admin'), zValidator('json', reorderSchema), async (c) => {
  const id = c.req.param('id');
  const { direction } = c.req.valid('json');
  const reordered = await LessonService.reorderLesson(id, direction);

  if (!reordered) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Aula não encontrada.' } }, 404);
  }

  return c.json({ success: true, data: reordered });
});

// Arquivar aula (Admin)
lessonRoutes.delete('/:id', requireAuth, requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const archived = await LessonService.archiveLesson(id);

  if (!archived) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Aula não encontrada.' } }, 404);
  }

  return c.json({ success: true, data: archived, message: 'Aula arquivada com sucesso.' });
});
