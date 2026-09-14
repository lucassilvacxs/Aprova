import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { SimulationService } from '../services/simulation.service';
import { SimulationAttemptService } from '../services/simulation-attempt.service';
import { SimulationQuestionSelectionService } from '../services/simulation-selection.service';
import { db } from '../db';
import { simulationAttempts, simulations } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const simulationRoutes = new Hono();

/**
 * GET /api/v1/simulations
 * Lista simulados para o usuário autenticado.
 */
simulationRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const isAdmin = user.roles?.includes('admin');
  const contestId = c.req.query('contestId');
  const type = c.req.query('type');
  const status = c.req.query('status');
  const difficulty = c.req.query('difficulty');
  const search = c.req.query('search');
  const tab = c.req.query('tab') as any;

  try {
    const list = await SimulationService.listSimulations(
      {
        contestId,
        type,
        status,
        difficulty,
        search,
        tab,
      },
      user.id,
      isAdmin
    );

    return c.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        error: { code: 'LIST_ERROR', message: err.message },
      },
      500
    );
  }
});

/**
 * GET /api/v1/simulations/active
 * Retorna o simulado ativo em andamento do usuário (se houver) para banner no Dashboard.
 */
simulationRoutes.get('/active', requireAuth, async (c) => {
  const user = c.get('user');

  const [activeAttempt] = await db
    .select({
      attemptId: simulationAttempts.id,
      simulationId: simulationAttempts.simulationId,
      startedAt: simulationAttempts.startedAt,
      simulationTitle: simulations.title,
      durationMinutes: simulations.durationMinutes,
    })
    .from(simulationAttempts)
    .innerJoin(simulations, eq(simulationAttempts.simulationId, simulations.id))
    .where(and(eq(simulationAttempts.userId, user.id), eq(simulationAttempts.status, 'IN_PROGRESS')))
    .orderBy(desc(simulationAttempts.startedAt));

  if (!activeAttempt) {
    return c.json({ success: true, data: null });
  }

  const durationMs = activeAttempt.durationMinutes * 60 * 1000;
  const expiresAt = new Date(activeAttempt.startedAt).getTime() + durationMs;
  const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

  if (remainingSeconds === 0) {
    return c.json({ success: true, data: null });
  }

  return c.json({
    success: true,
    data: {
      ...activeAttempt,
      remainingSeconds,
    },
  });
});

/**
 * GET /api/v1/simulations/history
 * Histórico de tentativas de simulados do estudante.
 */
simulationRoutes.get('/history', requireAuth, async (c) => {
  const user = c.get('user');

  try {
    const history = await SimulationAttemptService.getHistory(user.id);
    return c.json({ success: true, data: history });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'HISTORY_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/v1/simulations/stats
 * Estatísticas, melhores desempenhos e histórico cronológico para gráficos.
 */
simulationRoutes.get('/stats', requireAuth, async (c) => {
  const user = c.get('user');
  const contestId = c.req.query('contestId');

  try {
    const stats = await SimulationAttemptService.getStats(user.id, contestId);
    return c.json({ success: true, data: stats });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'STATS_ERROR', message: err.message } }, 500);
  }
});

/**
 * POST /api/v1/simulations/custom/validate
 * Valida a quantidade de questões disponíveis antes de criar simulado personalizado.
 */
simulationRoutes.post('/custom/validate', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const count = await SimulationQuestionSelectionService.countAvailableQuestions({
      contestId: body.contestId,
      subjectIds: body.subjectIds,
      topicIds: body.topicIds,
      boardId: body.boardId,
      difficulty: body.difficulty,
    });

    return c.json({
      success: true,
      data: {
        availableQuestions: count,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } }, 400);
  }
});

/**
 * POST /api/v1/simulations/custom
 * Criação de simulado personalizado pelo estudante.
 */
simulationRoutes.post('/custom', requireAuth, async (c) => {
  const user = c.get('user');

  try {
    const body = await c.req.json();
    const created = await SimulationService.createCustomSimulation(user.id, body);
    return c.json({ success: true, data: created }, 201);
  } catch (err: any) {
    if (err.code === 'INSUFFICIENT_QUESTIONS' || err.code === 'NO_QUESTIONS_AVAILABLE') {
      return c.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            available: err.available,
            requested: err.requested,
          },
        },
        400
      );
    }
    return c.json({ success: false, error: { code: 'CREATE_ERROR', message: err.message } }, 400);
  }
});

/**
 * GET /api/v1/simulations/attempts/:attemptId/result
 * Resultado analítico e revisão de questões com gabarito revelado pós-prova.
 */
simulationRoutes.get('/attempts/:attemptId/result', requireAuth, async (c) => {
  const user = c.get('user');
  const isAdmin = user.roles?.includes('admin');
  const attemptId = c.req.param('attemptId');

  try {
    const result = await SimulationAttemptService.getResult(attemptId, user.id, isAdmin);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    const statusCode = err.message?.includes('Acesso negado') ? 403 : err.message?.includes('em andamento') ? 400 : 404;
    return c.json({ success: false, error: { code: 'RESULT_ERROR', message: err.message } }, statusCode);
  }
});

/**
 * GET /api/v1/simulations/:id
 * Detalhes para a tela de preparação do simulado.
 */
simulationRoutes.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const isAdmin = user.roles?.includes('admin');
  const id = c.req.param('id');

  try {
    const sim = await SimulationService.getSimulationById(id, user.id, isAdmin);
    return c.json({ success: true, data: sim });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: err.message } }, 404);
  }
});

/**
 * POST /api/v1/simulations/:id/start
 * Inicia ou retoma uma tentativa de simulado.
 */
simulationRoutes.post('/:id/start', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  try {
    const started = await SimulationAttemptService.startAttempt(id, user.id);
    return c.json({ success: true, data: started });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'START_ERROR', message: err.message } }, 400);
  }
});

/**
 * GET /api/v1/simulations/:id/attempt
 * Retorna os dados para a execução da prova com ANTI-CHEAT PEDAGÓGICO.
 */
simulationRoutes.get('/:id/attempt', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  try {
    const attemptData = await SimulationAttemptService.getCurrentAttempt(id, user.id);
    return c.json({ success: true, data: attemptData });
  } catch (err: any) {
    const statusCode = err.message?.includes('não autorizado') || err.message?.includes('Acesso negado') ? 403 : err.message?.includes('não encontrado') ? 404 : 400;
    return c.json({ success: false, error: { code: 'ATTEMPT_ERROR', message: err.message } }, statusCode);
  }
});

/**
 * POST /api/v1/simulations/:id/attempt/answer
 * Auto-save atômico de uma resposta durante o exame.
 */
simulationRoutes.post('/:id/attempt/answer', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const body = await c.req.json();
    const result = await SimulationAttemptService.saveAnswer(
      body.attemptId,
      body.questionId,
      body.selectedOptionId !== undefined ? body.selectedOptionId : null,
      body.timeSpentSeconds || 0,
      user.id
    );

    return c.json({ success: true, data: result });
  } catch (err: any) {
    const statusCode = err.message?.includes('não autorizado') || err.message?.includes('Acesso negado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'SAVE_ERROR', message: err.message } }, statusCode);
  }
});

/**
 * POST /api/v1/simulations/:id/attempt/mark
 * Marca/desmarca questão para revisão durante o exame.
 */
simulationRoutes.post('/:id/attempt/mark', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const body = await c.req.json();
    const result = await SimulationAttemptService.toggleMarkQuestion(
      body.attemptId,
      body.questionId,
      user.id
    );

    return c.json({ success: true, data: result });
  } catch (err: any) {
    const statusCode = err.message?.includes('não autorizado') || err.message?.includes('Acesso negado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'MARK_ERROR', message: err.message } }, statusCode);
  }
});

/**
 * POST /api/v1/simulations/:id/attempt/finish
 * Finaliza a prova, calcula o resultado e encerra a tentativa.
 */
simulationRoutes.post('/:id/attempt/finish', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const body = await c.req.json();
    const finished = await SimulationAttemptService.finishAttempt(body.attemptId, user.id);
    return c.json({ success: true, data: finished });
  } catch (err: any) {
    const statusCode = err.message?.includes('não autorizado') || err.message?.includes('Acesso negado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'FINISH_ERROR', message: err.message } }, statusCode);
  }
});

// ── ROTAS DE ADMINISTRAÇÃO (requireRole('admin')) ─────────────────────────────

/**
 * POST /api/v1/simulations
 * Criação de simulado oficial pelo Administrador.
 */
simulationRoutes.post('/', requireAuth, requireRole('admin'), async (c) => {
  const admin = c.get('user');
  try {
    const body = await c.req.json();
    const created = await SimulationService.createSimulation(admin.id, body);
    return c.json({ success: true, data: created }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'ADMIN_CREATE_ERROR', message: err.message } }, 400);
  }
});

/**
 * PUT /api/v1/simulations/:id
 * Atualização de simulado pelo Administrador.
 */
simulationRoutes.put('/:id', requireAuth, requireRole('admin'), async (c) => {
  const admin = c.get('user');
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const updated = await SimulationService.updateSimulation(id, admin.id, body);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'ADMIN_UPDATE_ERROR', message: err.message } }, 400);
  }
});

/**
 * DELETE /api/v1/simulations/:id
 * Arquivamento de simulado pelo Administrador.
 */
simulationRoutes.delete('/:id', requireAuth, requireRole('admin'), async (c) => {
  const admin = c.get('user');
  const id = c.req.param('id');
  try {
    const archived = await SimulationService.archiveSimulation(id, admin.id);
    return c.json({ success: true, data: archived });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'ADMIN_DELETE_ERROR', message: err.message } }, 400);
  }
});

/**
 * POST /api/v1/simulations/:id/publish
 */
simulationRoutes.post('/:id/publish', requireAuth, requireRole('admin'), async (c) => {
  const admin = c.get('user');
  const id = c.req.param('id');
  try {
    const published = await SimulationService.publishSimulation(id, admin.id);
    return c.json({ success: true, data: published });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'PUBLISH_ERROR', message: err.message } }, 400);
  }
});

/**
 * POST /api/v1/simulations/:id/unpublish
 */
simulationRoutes.post('/:id/unpublish', requireAuth, requireRole('admin'), async (c) => {
  const admin = c.get('user');
  const id = c.req.param('id');
  try {
    const unpublished = await SimulationService.unpublishSimulation(id, admin.id);
    return c.json({ success: true, data: unpublished });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'UNPUBLISH_ERROR', message: err.message } }, 400);
  }
});

/**
 * POST /api/v1/simulations/:id/duplicate
 */
simulationRoutes.post('/:id/duplicate', requireAuth, requireRole('admin'), async (c) => {
  const admin = c.get('user');
  const id = c.req.param('id');
  try {
    const duplicated = await SimulationService.duplicateSimulation(id, admin.id);
    return c.json({ success: true, data: duplicated }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'DUPLICATE_ERROR', message: err.message } }, 400);
  }
});

/**
 * PUT /api/v1/simulations/:id/questions/order
 */
simulationRoutes.put('/:id/questions/order', requireAuth, requireRole('admin'), async (c) => {
  const admin = c.get('user');
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const result = await SimulationService.reorderQuestions(id, body.questionIds, admin.id);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'REORDER_ERROR', message: err.message } }, 400);
  }
});
