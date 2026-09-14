import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { NewsService } from '../services/news.service';
import { NewsSourceService } from '../services/news-source.service';
import { NewsInteractionService } from '../services/news-interaction.service';
import { defaultNewsClassificationService } from '../services/news-classification.service';
import { db } from '../db';
import { newsTags } from '../db/schema';
import { asc } from 'drizzle-orm';

// ============================================================================
// 1. ROTAS DE NOTÍCIAS PARA ALUNOS & GERAIS (/api/v1/news)
// ============================================================================

export const newsRoutes = new Hono();

newsRoutes.use('*', requireAuth);

/**
 * GET /api/v1/news
 * Lista notícias com filtros, busca textual, ordenação e status de leitura/favorito.
 */
newsRoutes.get('/', async (c) => {
  try {
    const user = c.get('user');
    const query = c.req.query();

    const isAdmin = user.roles.includes('admin');
    const filters = {
      contestId: query.contestId,
      category: query.category,
      sourceId: query.sourceId,
      status: isAdmin ? query.status : 'PUBLISHED',
      period: query.period as any,
      isImportant: query.isImportant === 'true' ? true : query.isImportant === 'false' ? false : undefined,
      isFeatured: query.isFeatured === 'true' ? true : query.isFeatured === 'false' ? false : undefined,
      onlyFavorites: query.onlyFavorites === 'true',
      onlyUnread: query.onlyUnread === 'true',
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 12,
    };

    const result = await NewsService.listNews(filters, user.id, isAdmin);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'NEWS_LIST_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * GET /api/v1/news/featured
 * Retorna as notícias em destaque (is_featured = true).
 */
newsRoutes.get('/featured', async (c) => {
  try {
    const user = c.get('user');
    const query = c.req.query();
    const isAdmin = user.roles.includes('admin');

    const result = await NewsService.listNews(
      {
        contestId: query.contestId,
        isFeatured: true,
        limit: 5,
      },
      user.id,
      isAdmin
    );

    return c.json({ success: true, data: result.items });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'NEWS_FEATURED_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * GET /api/v1/news/tags
 * Lista todas as tags cadastradas.
 */
newsRoutes.get('/tags', async (c) => {
  try {
    const tags = await db.select().from(newsTags).orderBy(asc(newsTags.name));
    return c.json({ success: true, data: tags });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'TAGS_LIST_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * GET /api/v1/news/:id
 * Retorna a notícia completa, registra leitura automática e retorna itens relacionados.
 */
newsRoutes.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const isAdmin = user.roles.includes('admin');

    const item = await NewsService.getNewsById(id, user.id, isAdmin);
    if (!item) {
      return c.json(
        { success: false, error: { code: 'NEWS_NOT_FOUND', message: 'Notícia não encontrada.' } },
        404
      );
    }

    return c.json({ success: true, data: item });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return c.json(
      { success: false, error: { code: 'NEWS_DETAIL_ERROR', message: err.message } },
      status
    );
  }
});

/**
 * POST /api/v1/news/:id/favorite
 * Alterna favorito do aluno.
 */
newsRoutes.post('/:id/favorite', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const res = await NewsInteractionService.toggleFavorite(user.id, id);
    return c.json({ success: true, data: res });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'FAVORITE_TOGGLE_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * POST /api/v1/news/:id/read
 * Marca a notícia explicitamente como lida.
 */
newsRoutes.post('/:id/read', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    await NewsInteractionService.markAsRead(user.id, id);
    return c.json({ success: true, data: { isRead: true } });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'MARK_READ_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * POST /api/v1/news/:id/unread
 * Desmarca a leitura da notícia.
 */
newsRoutes.post('/:id/unread', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    await NewsInteractionService.markAsUnread(user.id, id);
    return c.json({ success: true, data: { isRead: false } });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'MARK_UNREAD_ERROR', message: err.message } },
      500
    );
  }
});

// ============================================================================
// 2. ROTAS DE FONTES DE NOTÍCIAS (/api/v1/news-sources)
// ============================================================================

export const newsSourceRoutes = new Hono();

newsSourceRoutes.use('*', requireAuth);

/**
 * GET /api/v1/news-sources
 * Lista as fontes confiáveis ativas.
 */
newsSourceRoutes.get('/', async (c) => {
  try {
    const user = c.get('user');
    const isAdmin = user.roles.includes('admin');
    const sources = await NewsSourceService.listSources(!isAdmin);
    return c.json({ success: true, data: sources });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'SOURCES_LIST_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * GET /api/v1/news-sources/:id
 * Detalhes de uma fonte específica.
 */
newsSourceRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const source = await NewsSourceService.getSourceById(id);
    if (!source) {
      return c.json(
        { success: false, error: { code: 'SOURCE_NOT_FOUND', message: 'Fonte não encontrada.' } },
        404
      );
    }
    return c.json({ success: true, data: source });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'SOURCE_DETAIL_ERROR', message: err.message } },
      500
    );
  }
});

// ============================================================================
// 3. ROTAS ADMINISTRATIVAS DE NOTÍCIAS (/api/v1/admin/news)
// ============================================================================

export const newsAdminRoutes = new Hono();

newsAdminRoutes.use('*', requireAuth, requireRole('admin'));

/**
 * GET /api/v1/admin/news
 * Lista notícias para gestão administrativa com paginação e filtros de status.
 */
newsAdminRoutes.get('/', async (c) => {
  try {
    const user = c.get('user');
    const query = c.req.query();

    const filters = {
      contestId: query.contestId,
      category: query.category,
      sourceId: query.sourceId,
      status: query.status,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    };

    const result = await NewsService.listNews(filters, user.id, true);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'ADMIN_NEWS_LIST_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * GET /api/v1/admin/news/stats
 * Retorna contadores agregados para o dashboard administrativo de notícias.
 */
newsAdminRoutes.get('/stats', async (c) => {
  try {
    const stats = await NewsService.getAdminStats();
    return c.json({ success: true, data: stats });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'ADMIN_STATS_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * POST /api/v1/admin/news
 * Cadastra nova notícia com validação, sanitização e verificação de duplicidade.
 */
newsAdminRoutes.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const created = await NewsService.createNews(body, {
      id: user.id,
      email: user.email,
    });

    return c.json({ success: true, data: created }, 201);
  } catch (err: any) {
    // Duplicate canonical URL / content hash → 409 Conflict
    const isDuplicate = /Publicação impedida|já existe|duplicad/i.test(err.message);
    const statusCode = isDuplicate ? 409 : 400;
    return c.json(
      { success: false, error: { code: isDuplicate ? 'NEWS_DUPLICATE' : 'NEWS_CREATE_ERROR', message: err.message } },
      statusCode
    );
  }
});

/**
 * POST /api/v1/admin/news/classify
 * Executa auto-classificação determinística de texto para preenchimento de categoria e tags.
 */
newsAdminRoutes.post('/classify', async (c) => {
  try {
    const body = await c.req.json();
    const result = defaultNewsClassificationService.classify(
      body.title || '',
      body.summary || '',
      body.content || ''
    );
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'CLASSIFY_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * PUT /api/v1/admin/news/:id
 * Atualiza campos de uma notícia existente.
 */
newsAdminRoutes.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();

    const updated = await NewsService.updateNews(id, body, {
      id: user.id,
      email: user.email,
    });

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'NEWS_UPDATE_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * POST /api/v1/admin/news/:id/publish
 * Publica a notícia.
 */
newsAdminRoutes.post('/:id/publish', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const updated = await NewsService.publishNews(id, { id: user.id, email: user.email });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'NEWS_PUBLISH_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * POST /api/v1/admin/news/:id/archive
 * Arquiva a notícia.
 */
newsAdminRoutes.post('/:id/archive', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const updated = await NewsService.archiveNews(id, { id: user.id, email: user.email });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'NEWS_ARCHIVE_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * POST /api/v1/admin/news/:id/toggle-featured
 * Alterna estado de destaque.
 */
newsAdminRoutes.post('/:id/toggle-featured', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const updated = await NewsService.toggleFeatured(id, { id: user.id, email: user.email });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'NEWS_TOGGLE_FEATURED_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * POST /api/v1/admin/news/:id/toggle-important
 * Alterna indicador de atualização importante.
 */
newsAdminRoutes.post('/:id/toggle-important', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const updated = await NewsService.toggleImportant(id, { id: user.id, email: user.email });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'NEWS_TOGGLE_IMPORTANT_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * DELETE /api/v1/admin/news/:id
 * Remove permanentemente a notícia.
 */
newsAdminRoutes.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const deleted = await NewsService.deleteNews(id, { id: user.id, email: user.email });
    return c.json({ success: true, data: deleted });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'NEWS_DELETE_ERROR', message: err.message } },
      400
    );
  }
});

// ============================================================================
// 4. ROTAS ADMINISTRATIVAS DE FONTES (/api/v1/admin/news-sources)
// ============================================================================

export const newsSourcesAdminRoutes = new Hono();

newsSourcesAdminRoutes.use('*', requireAuth, requireRole('admin'));

/**
 * GET /api/v1/admin/news-sources
 * Lista todas as fontes de notícias com status ativo/inativo.
 */
newsSourcesAdminRoutes.get('/', async (c) => {
  try {
    const sources = await NewsSourceService.listSources(false);
    return c.json({ success: true, data: sources });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'ADMIN_SOURCES_LIST_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * POST /api/v1/admin/news-sources
 * Cria nova fonte de informações.
 */
newsSourcesAdminRoutes.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const created = await NewsSourceService.createSource(body, {
      id: user.id,
      email: user.email,
    });
    return c.json({ success: true, data: created }, 201);
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'SOURCE_CREATE_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * PUT /api/v1/admin/news-sources/:id
 * Atualiza fonte existente.
 */
newsSourcesAdminRoutes.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();
    const updated = await NewsSourceService.updateSource(id, body, {
      id: user.id,
      email: user.email,
    });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'SOURCE_UPDATE_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * POST /api/v1/admin/news-sources/:id/toggle-active
 * Ativa ou desativa a fonte.
 */
newsSourcesAdminRoutes.post('/:id/toggle-active', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const updated = await NewsSourceService.toggleActive(id, {
      id: user.id,
      email: user.email,
    });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'SOURCE_TOGGLE_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * DELETE /api/v1/admin/news-sources/:id
 * Exclui fonte caso não haja notícias ou editais vinculados.
 */
newsSourcesAdminRoutes.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const deleted = await NewsSourceService.deleteSource(id, {
      id: user.id,
      email: user.email,
    });
    return c.json({ success: true, data: deleted });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'SOURCE_DELETE_ERROR', message: err.message } },
      400
    );
  }
});
