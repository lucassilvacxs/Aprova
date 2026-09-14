import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { EssayPromptService } from '../services/essay-prompt.service';
import { defaultThemeGenerator } from '../services/essay-theme-generator.service';
import { EssayService } from '../services/essay.service';
import { defaultCorrectionService } from '../services/essay-correction.service';
import { EssayStatsService } from '../services/essay-stats.service';
import { EssayRecommendationService } from '../services/essay-recommendation.service';
import { db } from '../db';
import { essayCriteria } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// ============================================================================
// 1. ROTAS DE TEMAS DE REDAÇÃO (/api/v1/essay-prompts)
// ============================================================================

export const essayPromptRoutes = new Hono();

/**
 * GET /api/v1/essay-prompts
 * Lista catálogo de temas com filtros e status do estudante
 */
essayPromptRoutes.get('/', async (c) => {
  try {
    const user = c.get('user'); // pode ser undefined se rota pública, ou populado
    const query = c.req.query();

    const filters = {
      contestId: query.contestId,
      category: query.category,
      difficulty: query.difficulty,
      status: query.status,
      search: query.search,
      userStatus: query.userStatus as any,
    };

    const isAdmin = user?.roles?.includes('admin') || false;
    const prompts = await EssayPromptService.listPrompts(filters, user?.id, isAdmin);

    return c.json({ success: true, data: prompts });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'PROMPT_LIST_ERROR', message: err.message } }, 500);
  }
});

/**
 * POST /api/v1/essay-prompts/random
 * Sorteio inteligente de tema sem repetição recente
 */
essayPromptRoutes.post('/random', async (c) => {
  try {
    const user = c.get('user');
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      // Body vazio é aceito
    }

    const theme = await defaultThemeGenerator.generateOrSelectTheme({
      contestId: body.contestId,
      category: body.category,
      difficulty: body.difficulty,
      userId: user?.id,
    });

    return c.json({ success: true, data: theme });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'THEME_GENERATION_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/v1/essay-prompts/:id
 * Retorna detalhes do tema, textos motivadores e critérios
 */
essayPromptRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const prompt = await EssayPromptService.getPromptById(id, user?.id);

    if (!prompt) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tema não encontrado.' } }, 404);
    }

    return c.json({ success: true, data: prompt });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'PROMPT_DETAIL_ERROR', message: err.message } }, 500);
  }
});

/**
 * POST /api/v1/essay-prompts (Admin)
 * Cadastra novo tema
 */
essayPromptRoutes.post('/', requireAuth, requireRole('admin'), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const created = await EssayPromptService.createPrompt(body, user.id);
    return c.json({ success: true, data: created }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'CREATE_PROMPT_ERROR', message: err.message } }, 400);
  }
});

/**
 * PUT /api/v1/essay-prompts/:id (Admin)
 * Atualiza tema
 */
essayPromptRoutes.put('/:id', requireAuth, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json();
    const updated = await EssayPromptService.updatePrompt(id, body, user.id);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'UPDATE_PROMPT_ERROR', message: err.message } }, 400);
  }
});

/**
 * POST /api/v1/essay-prompts/:id/publish (Admin)
 */
essayPromptRoutes.post('/:id/publish', requireAuth, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const published = await EssayPromptService.publishPrompt(id, user.id);
    return c.json({ success: true, data: published });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'PUBLISH_PROMPT_ERROR', message: err.message } }, 400);
  }
});

/**
 * POST /api/v1/essay-prompts/:id/archive (Admin)
 */
essayPromptRoutes.post('/:id/archive', requireAuth, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const archived = await EssayPromptService.archivePrompt(id, user.id);
    return c.json({ success: true, data: archived });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'ARCHIVE_PROMPT_ERROR', message: err.message } }, 400);
  }
});

/**
 * DELETE /api/v1/essay-prompts/:id (Admin)
 */
essayPromptRoutes.delete('/:id', requireAuth, requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const res = await EssayPromptService.deletePrompt(id, user.id);
    return c.json({ success: true, data: res });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'DELETE_PROMPT_ERROR', message: err.message } }, 400);
  }
});

// ============================================================================
// 2. ROTAS DE REDAÇÕES DO ALUNO (/api/v1/essays)
// ============================================================================

export const essayRoutes = new Hono();

/**
 * GET /api/v1/essays
 * Histórico de redações do estudante autenticado
 */
essayRoutes.get('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const query = c.req.query();
    const items = await EssayService.listUserEssays(user.id, {
      status: query.status,
      contestId: query.contestId,
      search: query.search,
    });
    return c.json({ success: true, data: items });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'ESSAY_LIST_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/v1/essays/active-draft
 * Retorna o rascunho em aberto do aluno
 */
essayRoutes.get('/active-draft', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const promptId = c.req.query('promptId');
    const draft = await EssayService.getActiveDraft(user.id, promptId);
    return c.json({ success: true, data: draft });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'DRAFT_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/v1/essays/stats
 * Painel de estatísticas, médias e série histórica de evolução
 */
essayRoutes.get('/stats', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const stats = await EssayStatsService.getUserStats(user.id);
    return c.json({ success: true, data: stats });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'STATS_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/v1/essays/recommendations
 * Recomendações pedagógicas e diagnóstico de competências
 */
essayRoutes.get('/recommendations', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const recommendations = await EssayRecommendationService.getRecommendations(user.id);
    return c.json({ success: true, data: recommendations });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'REC_ERROR', message: err.message } }, 500);
  }
});

/**
 * POST /api/v1/essays
 * Inicia uma redação (cria ou recupera rascunho)
 */
essayRoutes.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    if (!body.promptId) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'promptId é obrigatório.' } }, 400);
    }

    const essay = await EssayService.startEssay(user.id, body.promptId, body.contestId, body.title);
    return c.json({ success: true, data: essay }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'START_ESSAY_ERROR', message: err.message } }, 400);
  }
});

/**
 * GET /api/v1/essays/:id
 * Consulta redação, textos motivadores e correção
 */
essayRoutes.get('/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const isAdmin = user.roles.includes('admin');

    const essay = await EssayService.getEssayDetail(id, user.id, isAdmin);
    if (!essay) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Redação não encontrada.' } }, 404);
    }

    return c.json({ success: true, data: essay });
  } catch (err: any) {
    const status = err.message.includes('não autorizado') ? 403 : 500;
    return c.json({ success: false, error: { code: 'ESSAY_DETAIL_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/essays/:id/autosave
 * Autosave contínuo com contagem em tempo real
 */
essayRoutes.post('/:id/autosave', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json();

    const updated = await EssayService.autosave(id, user.id, {
      title: body.title,
      content: body.content ?? '',
    });

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    const status = err.message.includes('bloqueada') ? 400 : err.message.includes('não autorizado') ? 403 : 500;
    return c.json({ success: false, error: { code: 'AUTOSAVE_ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/v1/essays/:id/submit
 * Envio definitivo da redação para correção
 */
essayRoutes.post('/:id/submit', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    const submitted = await EssayService.submitEssay(id, user.id);
    return c.json({ success: true, data: submitted });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'SUBMIT_ERROR', message: err.message } }, 400);
  }
});

/**
 * DELETE /api/v1/essays/:id
 * Descarta rascunho
 */
essayRoutes.delete('/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    const res = await EssayService.discardDraft(id, user.id);
    return c.json({ success: true, data: res });
  } catch (err: any) {
    const status = err.message.includes('não autorizado') ? 403 : 400;
    return c.json({ success: false, error: { code: 'DISCARD_ERROR', message: err.message } }, status);
  }
});

// ============================================================================
// 3. ROTAS DE ADMINISTRAÇÃO E CORREÇÃO (/api/v1/admin/essays & /criteria)
// ============================================================================

export const essayAdminRoutes = new Hono();

essayAdminRoutes.use('*', requireAuth, requireRole('admin'));

/**
 * GET /api/v1/admin/essays
 * Fila de redações para correção
 */
essayAdminRoutes.get('/', async (c) => {
  try {
    const query = c.req.query();
    const items = await EssayService.listAdminQueue({
      status: query.status,
      contestId: query.contestId,
      search: query.search,
    });
    return c.json({ success: true, data: items });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'ADMIN_QUEUE_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/v1/admin/essays/:id/criteria
 * Retorna os critérios configurados para o concurso da redação
 */
essayAdminRoutes.get('/:id/criteria', async (c) => {
  try {
    const essayId = c.req.param('id');
    const essay = await EssayService.getEssayDetail(essayId, undefined, true);
    if (!essay) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Redação não encontrada.' } }, 404);
    }

    let criteriaList: any[] = [];
    if (essay.contestId) {
      criteriaList = await db
        .select()
        .from(essayCriteria)
        .where(and(eq(essayCriteria.contestId, essay.contestId), eq(essayCriteria.active, true)))
        .orderBy(essayCriteria.ordering);
    }

    // Se o concurso específico não tiver critérios, retorna critérios gerais
    if (criteriaList.length === 0) {
      criteriaList = await db
        .select()
        .from(essayCriteria)
        .where(eq(essayCriteria.active, true))
        .orderBy(essayCriteria.ordering);
    }

    return c.json({ success: true, data: criteriaList });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'CRITERIA_FETCH_ERROR', message: err.message } }, 500);
  }
});

/**
 * POST /api/v1/admin/essays/:id/correct
 * Avalia a redação informando notas por critério e feedback qualitativo
 */
essayAdminRoutes.post('/:id/correct', async (c) => {
  try {
    const essayId = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json();

    const result = await defaultCorrectionService.correctEssay({
      essayId,
      evaluatorId: user.id,
      correctionType: body.correctionType || 'MANUAL',
      generalFeedback: body.generalFeedback,
      strengths: body.strengths,
      weaknesses: body.weaknesses,
      suggestions: body.suggestions,
      criteriaScores: body.criteriaScores || [],
    });

    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'CORRECTION_ERROR', message: err.message } }, 400);
  }
});

// ============================================================================
// 4. ROTAS DE GERENCIAMENTO DE CRITÉRIOS (/api/v1/admin/essay-criteria)
// ============================================================================

export const essayCriteriaAdminRoutes = new Hono();

essayCriteriaAdminRoutes.use('*', requireAuth, requireRole('admin'));

/**
 * GET /api/v1/admin/essay-criteria
 * Lista critérios por concurso
 */
essayCriteriaAdminRoutes.get('/', async (c) => {
  try {
    const contestId = c.req.query('contestId');
    const conditions = [];

    if (contestId && contestId !== 'ALL') {
      conditions.push(eq(essayCriteria.contestId, contestId));
    }

    const items = await db
      .select()
      .from(essayCriteria)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(essayCriteria.ordering);

    return c.json({ success: true, data: items });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'CRITERIA_LIST_ERROR', message: err.message } }, 500);
  }
});

/**
 * POST /api/v1/admin/essay-criteria
 * Cria um critério de avaliação
 */
essayCriteriaAdminRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();

    if (!body.name?.trim()) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nome do critério é obrigatório.' } }, 400);
    }
    if (!body.maxScore || isNaN(Number(body.maxScore))) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nota máxima válida é obrigatória.' } }, 400);
    }

    const [created] = await db
      .insert(essayCriteria)
      .values({
        contestId: body.contestId || null,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        maxScore: Number(body.maxScore).toFixed(2),
        weight: Number(body.weight || 1.0).toFixed(2),
        ordering: Number(body.ordering || 1),
        active: body.active !== undefined ? Boolean(body.active) : true,
      })
      .returning();

    return c.json({ success: true, data: created }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'CREATE_CRITERION_ERROR', message: err.message } }, 400);
  }
});

/**
 * PUT /api/v1/admin/essay-criteria/:id
 * Atualiza critério
 */
essayCriteriaAdminRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const updateData: any = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim();
    if (body.maxScore !== undefined) updateData.maxScore = Number(body.maxScore).toFixed(2);
    if (body.weight !== undefined) updateData.weight = Number(body.weight).toFixed(2);
    if (body.ordering !== undefined) updateData.ordering = Number(body.ordering);
    if (body.active !== undefined) updateData.active = Boolean(body.active);

    const [updated] = await db
      .update(essayCriteria)
      .set(updateData)
      .where(eq(essayCriteria.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'UPDATE_CRITERION_ERROR', message: err.message } }, 400);
  }
});

/**
 * DELETE /api/v1/admin/essay-criteria/:id
 * Desativa ou remove critério
 */
essayCriteriaAdminRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await db.delete(essayCriteria).where(eq(essayCriteria.id, id));
    return c.json({ success: true, data: { success: true } });
  } catch (err: any) {
    return c.json({ success: false, error: { code: 'DELETE_CRITERION_ERROR', message: err.message } }, 400);
  }
});
