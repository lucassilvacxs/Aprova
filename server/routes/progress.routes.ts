import { Hono } from 'hono';
import { requireAuth } from '../middlewares/auth.middleware';
import { ProgressService } from '../services/progress.service';

export const progressRoutes = new Hono();

// Alternar status de conclusão da aula (Aluno ou Admin)
progressRoutes.post('/lessons/:id/toggle', requireAuth, async (c) => {
  const user = c.get('user');
  const lessonId = c.req.param('id');

  try {
    const result = await ProgressService.toggleLessonComplete(user.id, lessonId);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'AULA_NOT_FOUND') {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Aula não encontrada.' } },
        404
      );
    }
    return c.json(
      { success: false, error: { code: 'PROGRESS_ERROR', message: 'Erro ao atualizar progresso da aula.' } },
      500
    );
  }
});

// Obter card "Continue Estudando"
progressRoutes.get('/continue', requireAuth, async (c) => {
  const user = c.get('user');
  const contestId = c.req.query('contestId');

  const continueData = await ProgressService.getContinueStudying(user.id, contestId || undefined);

  return c.json({ success: true, data: continueData });
});
