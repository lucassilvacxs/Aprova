import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { DocumentService } from '../services/document.service';

// ============================================================================
// 1. ROTAS DE DOCUMENTOS E EDITAIS PARA ALUNOS (/api/v1/documents)
// ============================================================================

export const documentRoutes = new Hono();

documentRoutes.use('*', requireAuth);

/**
 * GET /api/v1/documents
 * Lista editais e documentos oficiais publicados com filtros e paginação.
 */
documentRoutes.get('/', async (c) => {
  try {
    const user = c.get('user');
    const query = c.req.query();
    const isAdmin = user.roles.includes('admin');

    const filters = {
      contestId: query.contestId,
      documentType: query.documentType,
      sourceId: query.sourceId,
      period: query.period as any,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    };

    const result = await DocumentService.listDocuments(filters, isAdmin);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'DOCUMENTS_LIST_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * GET /api/v1/documents/:id
 * Detalhes de um documento oficial específico.
 */
documentRoutes.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const isAdmin = user.roles.includes('admin');

    const doc = await DocumentService.getDocumentById(id, isAdmin);
    if (!doc) {
      return c.json(
        { success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' } },
        404
      );
    }

    return c.json({ success: true, data: doc });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return c.json(
      { success: false, error: { code: 'DOCUMENT_DETAIL_ERROR', message: err.message } },
      status
    );
  }
});

// ============================================================================
// 2. ROTAS ADMINISTRATIVAS DE DOCUMENTOS (/api/v1/admin/documents)
// ============================================================================

export const documentAdminRoutes = new Hono();

documentAdminRoutes.use('*', requireAuth, requireRole('admin'));

/**
 * GET /api/v1/admin/documents
 * Lista documentos oficiais para administração (todos os status).
 */
documentAdminRoutes.get('/', async (c) => {
  try {
    const query = c.req.query();
    const filters = {
      contestId: query.contestId,
      documentType: query.documentType,
      sourceId: query.sourceId,
      status: query.status,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 30,
    };

    const result = await DocumentService.listDocuments(filters, true);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'ADMIN_DOCUMENTS_LIST_ERROR', message: err.message } },
      500
    );
  }
});

/**
 * POST /api/v1/admin/documents
 * Cadastra novo documento oficial.
 * Exige obrigatoriamente sourceId (fonte confiável).
 */
documentAdminRoutes.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const created = await DocumentService.createDocument(body, {
      id: user.id,
      email: user.email,
    });

    return c.json({ success: true, data: created }, 201);
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'DOCUMENT_CREATE_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * PUT /api/v1/admin/documents/:id
 * Atualiza dados de um documento existente.
 */
documentAdminRoutes.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();

    const updated = await DocumentService.updateDocument(id, body, {
      id: user.id,
      email: user.email,
    });

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'DOCUMENT_UPDATE_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * POST /api/v1/admin/documents/:id/publish
 * Publica o documento.
 */
documentAdminRoutes.post('/:id/publish', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const updated = await DocumentService.publishDocument(id, {
      id: user.id,
      email: user.email,
    });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'DOCUMENT_PUBLISH_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * POST /api/v1/admin/documents/:id/archive
 * Arquiva o documento.
 */
documentAdminRoutes.post('/:id/archive', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const updated = await DocumentService.archiveDocument(id, {
      id: user.id,
      email: user.email,
    });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'DOCUMENT_ARCHIVE_ERROR', message: err.message } },
      400
    );
  }
});

/**
 * DELETE /api/v1/admin/documents/:id
 * Exclui o documento.
 */
documentAdminRoutes.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const deleted = await DocumentService.deleteDocument(id, {
      id: user.id,
      email: user.email,
    });
    return c.json({ success: true, data: deleted });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'DOCUMENT_DELETE_ERROR', message: err.message } },
      400
    );
  }
});
