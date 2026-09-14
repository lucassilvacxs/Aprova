import { Hono } from 'hono';
import { requireAuth } from '../middlewares/auth.middleware';
import { StudyPlanService } from '../services/study-plan.service';
import { StudyPlanGenerationService } from '../services/study-plan-generation.service';
import { StudyPlanAdjustmentService } from '../services/study-plan-adjustment.service';
import { StudyPlanSessionService } from '../services/study-plan-session.service';
import { StudyPlanStatsService } from '../services/study-plan-stats.service';

export const studyPlanRoutes = new Hono();

/**
 * GET /api/v1/study-plans
 * Lista todos os planos de estudo do usuário autenticado.
 */
studyPlanRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const plans = await StudyPlanService.listUserPlans(user.id);
    return c.json({ success: true, data: plans });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'LIST_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/v1/study-plans/active
 * Retorna o plano ativo do usuário autenticado.
 */
studyPlanRoutes.get('/active', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const active = await StudyPlanService.getActivePlan(user.id);
    return c.json({ success: true, data: active });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'ACTIVE_PLAN_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/v1/study-plans/today
 * Retorna a agenda de hoje com sessões e progresso diário.
 */
studyPlanRoutes.get('/today', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const today = await StudyPlanService.getTodaySessions(user.id);
    return c.json({ success: true, data: today });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'TODAY_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/v1/study-plans/:id
 * Retorna os detalhes completos de um plano específico.
 */
studyPlanRoutes.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  try {
    const plan = await StudyPlanService.getPlanById(id, user.id);
    return c.json({ success: true, data: plan });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 404;
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/study-plans
 * Cria um novo plano de estudos com disponibilidade, preferências e disciplinas.
 */
studyPlanRoutes.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const body = await c.req.json();
    const created = await StudyPlanService.createPlan(user.id, body);
    return c.json({ success: true, data: created }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'CREATE_ERROR', message: err.message } }, 400);
  }
});

/**
 * DELETE /api/v1/study-plans/:id
 * Arquiva o plano de estudos (soft delete).
 */
studyPlanRoutes.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  try {
    const archived = await StudyPlanService.archivePlan(id, user.id);
    return c.json({ success: true, data: archived });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'ARCHIVE_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/study-plans/:id/preview
 * Gera uma prévia das sessões sem persistir no banco (usado pelo Wizard).
 */
studyPlanRoutes.post('/:id/preview', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  try {
    const preview = await StudyPlanGenerationService.generateSessions(id, user.id, { persist: false });
    return c.json({ success: true, data: preview });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'PREVIEW_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/study-plans/:id/activate
 * Ativa o plano de estudos e gera as sessões no horizonte configurado.
 */
studyPlanRoutes.post('/:id/activate', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  try {
    const activated = await StudyPlanService.activatePlan(id, user.id);
    return c.json({ success: true, data: activated });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'ACTIVATE_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/study-plans/:id/pause
 * Pausa o plano ativo.
 */
studyPlanRoutes.post('/:id/pause', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  try {
    const paused = await StudyPlanService.pausePlan(id, user.id);
    return c.json({ success: true, data: paused });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'PAUSE_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/study-plans/:id/resume
 * Reativa o plano pausado.
 */
studyPlanRoutes.post('/:id/resume', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  try {
    const resumed = await StudyPlanService.resumePlan(id, user.id);
    return c.json({ success: true, data: resumed });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'RESUME_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/study-plans/:id/reorganize
 * Reorganiza sessões futuras redistribuindo itens atrasados.
 */
studyPlanRoutes.post('/:id/reorganize', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  try {
    const result = await StudyPlanAdjustmentService.reorganizeFutureSessions(id, user.id);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'REORGANIZE_ERROR', message: err.message } }, status);
  }
});

/**
 * GET /api/v1/study-plans/:id/sessions
 * Retorna as sessões com filtros de data e status.
 */
studyPlanRoutes.get('/:id/sessions', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const date = c.req.query('date');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const status = c.req.query('status');
  const type = c.req.query('type');

  try {
    const sessions = await StudyPlanService.getSessions(id, user.id, {
      date,
      startDate,
      endDate,
      status,
      type,
    });
    return c.json({ success: true, data: sessions });
  } catch (err: any) {
    const httpStatus = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'SESSIONS_ERROR', message: err.message } }, httpStatus);
  }
});

/**
 * GET /api/v1/study-plans/:id/stats
 * Retorna estatísticas de aderência, horas planejadas vs realizadas.
 */
studyPlanRoutes.get('/:id/stats', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  try {
    const stats = await StudyPlanStatsService.getPlanStats(id, user.id);
    return c.json({ success: true, data: stats });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'STATS_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/study-plans/sessions/:sessionId/start
 * Inicia uma sessão de estudos.
 */
studyPlanRoutes.post('/sessions/:sessionId/start', requireAuth, async (c) => {
  const user = c.get('user');
  const sessionId = c.req.param('sessionId');
  try {
    const session = await StudyPlanSessionService.startSession(sessionId, user.id);
    return c.json({ success: true, data: session });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'START_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/study-plans/sessions/:sessionId/complete
 * Conclui uma sessão de estudos registrando tempo realizado e notas.
 */
studyPlanRoutes.post('/sessions/:sessionId/complete', requireAuth, async (c) => {
  const user = c.get('user');
  const sessionId = c.req.param('sessionId');
  try {
    const body = await c.req.json();
    const session = await StudyPlanSessionService.completeSession(sessionId, user.id, body);
    return c.json({
      success: true,
      data: {
        ...session,
        session,
        nextReviewDate: session.type === 'LESSON' ? 'D+1' : null,
      },
    });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'COMPLETE_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/study-plans/sessions/:sessionId/skip
 * Pula uma sessão de estudos.
 */
studyPlanRoutes.post('/sessions/:sessionId/skip', requireAuth, async (c) => {
  const user = c.get('user');
  const sessionId = c.req.param('sessionId');
  try {
    const body = await c.req.json().catch(() => ({}));
    const session = await StudyPlanSessionService.skipSession(sessionId, user.id, body.notes);
    return c.json({ success: true, data: session });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'SKIP_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/study-plans/sessions/:sessionId/reschedule
 * Reagenda a sessão de estudos para uma nova data.
 */
studyPlanRoutes.post('/sessions/:sessionId/reschedule', requireAuth, async (c) => {
  const user = c.get('user');
  const sessionId = c.req.param('sessionId');
  try {
    const body = await c.req.json();
    const newSession = await StudyPlanSessionService.rescheduleSession(sessionId, user.id, body);
    return c.json({ success: true, data: newSession });
  } catch (err: any) {
    const status = err.message?.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'RESCHEDULE_ERROR', message: err.message } }, status);
  }
});
