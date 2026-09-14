import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { ModuleService } from '../services/module.service';

export const moduleRoutes = new Hono();

const createModuleSchema = z.object({
  courseId: z.string().uuid('ID de curso inválido'),
  subjectId: z.string().uuid().optional().nullable(),
  title: z.string().min(2, 'O título do módulo deve ter no mínimo 2 caracteres'),
  description: z.string().optional().nullable(),
  orderIndex: z.number().int().positive().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
});

// Criar módulo (Admin)
moduleRoutes.post('/', requireAuth, requireRole('admin'), zValidator('json', createModuleSchema), async (c) => {
  const body = c.req.valid('json');
  const created = await ModuleService.createModule(body);
  return c.json({ success: true, data: created }, 201);
});

// Atualizar módulo (Admin)
const updateModuleSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

moduleRoutes.put('/:id', requireAuth, requireRole('admin'), zValidator('json', updateModuleSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const updated = await ModuleService.updateModule(id, body);

  if (!updated) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Módulo não encontrado.' } }, 404);
  }

  return c.json({ success: true, data: updated });
});

// Reordenar módulo (Admin)
const reorderSchema = z.object({
  direction: z.enum(['up', 'down']),
});

moduleRoutes.patch('/:id/reorder', requireAuth, requireRole('admin'), zValidator('json', reorderSchema), async (c) => {
  const id = c.req.param('id');
  const { direction } = c.req.valid('json');
  const reordered = await ModuleService.reorderModule(id, direction);

  if (!reordered) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Módulo não encontrado.' } }, 404);
  }

  return c.json({ success: true, data: reordered });
});

// Arquivar módulo (Admin)
moduleRoutes.delete('/:id', requireAuth, requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const archived = await ModuleService.archiveModule(id);

  if (!archived) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Módulo não encontrado.' } }, 404);
  }

  return c.json({ success: true, data: archived, message: 'Módulo arquivado com sucesso.' });
});
