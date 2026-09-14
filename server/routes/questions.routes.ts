import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { QuestionService } from '../services/question.service';
import { QuestionAttemptService } from '../services/question-attempt.service';
import { QuestionActionsService } from '../services/question-actions.service';
import { QuestionRecommendationService } from '../services/question-recommendation.service';
import { QuestionImportService } from '../services/question-import.service';

import { db } from '../db';
import { subjects, topics, examBoards, contests } from '../db/schema';
import { asc } from 'drizzle-orm';

export const questionRoutes = new Hono();

// Todos os endpoints de questões exigem usuário autenticado
questionRoutes.use('*', requireAuth);

/**
 * GET /api/v1/questions/filters-data
 * Retorna dados de apoio para filtros e formulários (bancas, disciplinas, tópicos, concursos)
 */
questionRoutes.get('/filters-data', async (c) => {
  const [allBoards, allSubjects, allTopics, allContests] = await Promise.all([
    db.select().from(examBoards).orderBy(asc(examBoards.name)),
    db.select().from(subjects).orderBy(asc(subjects.name)),
    db.select().from(topics).orderBy(asc(topics.orderIndex), asc(topics.name)),
    db.select().from(contests).orderBy(asc(contests.title)),
  ]);

  return c.json({
    success: true,
    data: {
      boards: allBoards,
      subjects: allSubjects,
      topics: allTopics,
      contests: allContests,
      difficulties: [
        { value: 'easy', label: 'Fácil' },
        { value: 'medium', label: 'Média' },
        { value: 'hard', label: 'Difícil' },
        { value: 'very_hard', label: 'Muito Difícil' },
      ],
      formats: [
        { value: 'multiple_choice', label: 'Múltipla Escolha (A-E)' },
        { value: 'true_false', label: 'Certo / Errado' },
      ],
      sources: [
        { value: 'BANCA_OFICIAL', label: 'Banca Oficial' },
        { value: 'QUESTAO_AUTORAL', label: 'Questão Autoral' },
        { value: 'IMPORTADA', label: 'Importada' },
        { value: 'DEMO', label: 'Demonstração' },
        { value: 'OUTRA', label: 'Outra' },
      ],
    },
  });
});

/**
 * GET /api/v1/questions/recommendations
 * Recomendações algorítmicas de estudo personalizadas
 */
questionRoutes.get('/recommendations', async (c) => {
  const user = c.get('user');
  const contestId = c.req.query('contestId');
  const limit = Math.min(20, Math.max(1, Number(c.req.query('limit')) || 5));

  const recommendations = await QuestionRecommendationService.getRecommendations(user.id, contestId, limit);
  return c.json({ success: true, data: recommendations });
});

/**
 * GET /api/v1/questions/stats
 * Estatísticas consolidadas reais de acertos do aluno
 */
questionRoutes.get('/stats', async (c) => {
  const user = c.get('user');
  const contestId = c.req.query('contestId');

  const stats = await QuestionAttemptService.getUserQuestionStats(user.id, contestId);
  return c.json({ success: true, data: stats });
});

/**
 * GET /api/v1/questions/history
 * Histórico cronológico das tentativas de resolução do aluno
 */
questionRoutes.get('/history', async (c) => {
  const user = c.get('user');
  const contestId = c.req.query('contestId');
  const subjectId = c.req.query('subjectId');
  const isCorrectParam = c.req.query('isCorrect');
  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 20;

  const isCorrect = isCorrectParam !== undefined ? isCorrectParam === 'true' : undefined;

  const result = await QuestionAttemptService.getUserAttemptHistory(user.id, {
    contestId,
    subjectId,
    isCorrect,
    page,
    limit,
  });

  return c.json({ success: true, data: result.items, meta: result.meta });
});

/**
 * GET /api/v1/questions/reports
 * Lista reportes de erros em questões (Admin)
 */
questionRoutes.get('/reports', requireRole('admin'), async (c) => {
  const status = c.req.query('status');
  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 20;

  const result = await QuestionActionsService.listReports({ status, page, limit });
  return c.json({ success: true, data: result.items, meta: result.meta });
});

/**
 * PATCH /api/v1/questions/reports/:id
 * Resolver ou rejeitar reporte de questão (Admin)
 */
questionRoutes.patch('/reports/:id', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const reportId = c.req.param('id');
  const body = await c.req.json();

  if (!body.status || !['resolved', 'rejected'].includes(body.status)) {
    return c.json(
      { success: false, error: { code: 'INVALID_STATUS', message: 'Status deve ser "resolved" ou "rejected".' } },
      400
    );
  }

  const result = await QuestionActionsService.resolveReport(reportId, user.id, body.status);
  return c.json({ success: true, data: result });
});

/**
 * POST /api/v1/questions/import
 * Importação em lote estruturada de questões (Admin)
 */
questionRoutes.post('/import', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const dryRun = Boolean(body.dryRun);
  const questionsToImport = body.questions || [];

  if (!Array.isArray(questionsToImport) || questionsToImport.length === 0) {
    return c.json(
      { success: false, error: { code: 'EMPTY_BATCH', message: 'Envie um array não-vazio de questões.' } },
      400
    );
  }

  const result = await QuestionImportService.importBatch(questionsToImport, user.id, dryRun);
  return c.json({ success: true, data: result });
});

/**
 * GET /api/v1/questions
 * Listagem paginada e filtrável de questões
 */
questionRoutes.get('/', async (c) => {
  const user = c.get('user');
  const isAdmin = user.roles.includes('admin');

  const filters = {
    contestId: c.req.query('contestId'),
    subjectId: c.req.query('subjectId'),
    topicId: c.req.query('topicId'),
    boardId: c.req.query('boardId'),
    year: c.req.query('year') ? Number(c.req.query('year')) : undefined,
    difficulty: c.req.query('difficulty'),
    format: c.req.query('format'),
    source: c.req.query('source'),
    status: c.req.query('status'),
    search: c.req.query('search'),
    resolutionStatus: c.req.query('resolutionStatus') as any,
    onlyFavorites: c.req.query('onlyFavorites') === 'true',
    onlyReview: c.req.query('onlyReview') === 'true',
    page: Number(c.req.query('page')) || 1,
    limit: Number(c.req.query('limit')) || 20,
    role: isAdmin ? 'admin' : 'student',
    userId: user.id,
  };

  const result = await QuestionService.listQuestions(filters);
  return c.json({ success: true, data: result.items, meta: result.meta });
});

/**
 * GET /api/v1/questions/:id
 * Detalhes da questão com proteção anti-cheat
 */
questionRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const isAdmin = user.roles.includes('admin');
  const id = c.req.param('id');

  try {
    const question = await QuestionService.getQuestionById(id, user.id, isAdmin ? 'admin' : 'student');
    return c.json({ success: true, data: question });
  } catch (err: any) {
    if (err.message === 'QUESTAO_NOT_FOUND') {
      return c.json(
        { success: false, error: { code: 'QUESTION_NOT_FOUND', message: 'Questão não encontrada ou indisponível.' } },
        404
      );
    }
    throw err;
  }
});

/**
 * POST /api/v1/questions
 * Criação de questão (Admin)
 */
questionRoutes.post('/', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  try {
    const question = await QuestionService.createQuestion(body, user.id);
    return c.json({ success: true, data: question }, 201);
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * PUT /api/v1/questions/:id
 * Atualização de questão (Admin)
 */
questionRoutes.put('/:id', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const updated = await QuestionService.updateQuestion(id, body, user.id);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message === 'QUESTAO_NOT_FOUND') {
      return c.json(
        { success: false, error: { code: 'QUESTION_NOT_FOUND', message: 'Questão não encontrada.' } },
        404
      );
    }
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * POST /api/v1/questions/:id/duplicate
 * Duplicação de questão para rascunho (Admin)
 */
questionRoutes.post('/:id/duplicate', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  try {
    const duplicated = await QuestionService.duplicateQuestion(id, user.id);
    return c.json({ success: true, data: duplicated }, 201);
  } catch (err: any) {
    if (err.message === 'QUESTAO_NOT_FOUND') {
      return c.json(
        { success: false, error: { code: 'QUESTION_NOT_FOUND', message: 'Questão original não encontrada.' } },
        404
      );
    }
    throw err;
  }
});

/**
 * PATCH /api/v1/questions/:id/toggle-publish
 * Alterna publicação (draft/published) (Admin)
 */
questionRoutes.patch('/:id/toggle-publish', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  try {
    const result = await QuestionService.togglePublish(id, user.id);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'QUESTAO_NOT_FOUND') {
      return c.json(
        { success: false, error: { code: 'QUESTION_NOT_FOUND', message: 'Questão não encontrada.' } },
        404
      );
    }
    throw err;
  }
});

/**
 * DELETE /api/v1/questions/:id
 * Arquivamento lógico (soft delete) da questão (Admin)
 */
questionRoutes.delete('/:id', requireRole('admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  try {
    const result = await QuestionService.archiveQuestion(id, user.id);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'QUESTAO_NOT_FOUND') {
      return c.json(
        { success: false, error: { code: 'QUESTION_NOT_FOUND', message: 'Questão não encontrada.' } },
        404
      );
    }
    throw err;
  }
});

/**
 * POST /api/v1/questions/:id/attempt
 * Submissão de resolução de questão pelo aluno
 */
questionRoutes.post('/:id/attempt', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const result = await QuestionAttemptService.submitAttempt(user.id, {
      questionId: id,
      selectedOptionId: body.selectedOptionId,
      durationSeconds: body.durationSeconds,
      source: body.source,
    });

    return c.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'QUESTAO_NOT_FOUND') {
      return c.json(
        { success: false, error: { code: 'QUESTION_NOT_FOUND', message: 'Questão não encontrada.' } },
        404
      );
    }
    if (err.message === 'OPTION_NOT_FOUND') {
      return c.json(
        { success: false, error: { code: 'OPTION_NOT_FOUND', message: 'Opção selecionada inválida.' } },
        400
      );
    }
    return c.json(
      { success: false, error: { code: 'ATTEMPT_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * POST /api/v1/questions/:id/favorite
 * Alterna favorito da questão
 */
questionRoutes.post('/:id/favorite', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const result = await QuestionActionsService.toggleFavorite(user.id, id);
  return c.json({ success: true, data: result });
});

/**
 * POST /api/v1/questions/:id/review
 * Alterna sinalização para revisão
 */
questionRoutes.post('/:id/review', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const result = await QuestionActionsService.toggleReviewFlag(user.id, id);
  return c.json({ success: true, data: result });
});

/**
 * POST /api/v1/questions/:id/report
 * Criação de reporte de erro em questão
 */
questionRoutes.post('/:id/report', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const result = await QuestionActionsService.createReport(user.id, id, {
      type: body.type,
      description: body.description,
    });
    return c.json({ success: true, data: result }, 201);
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'REPORT_ERROR', message: err.message } },
      400
    );
  }
});
