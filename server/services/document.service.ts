import { db } from '../db';
import { documents, contests, newsSources, auditLogs } from '../db/schema';
import { eq, and, desc, ilike, or, gte, count } from 'drizzle-orm';
import { NotificationService } from './notification.service';
import { NewsSourceService } from './news-source.service';

export interface ListDocumentsFilters {
  contestId?: string;
  documentType?: string;
  sourceId?: string;
  status?: string;
  period?: 'today' | 'week' | 'month' | 'year' | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateDocumentInput {
  contestId: string;
  sourceId: string; // Obrigatório pela regra de negócio
  title: string;
  description?: string;
  documentType?: string; // 'EDITAL' | 'RETIFICATION' | 'NOTICE' | 'RESULT' | 'CRONOGRAMA' | 'ANSWER_KEY' | 'CALL' | 'OTHER'
  fileUrl?: string;
  externalUrl?: string;
  publicationDate?: Date | string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  fileSizeBytes?: number;
  isFeatured?: boolean;
}

export interface UpdateDocumentInput {
  contestId?: string;
  sourceId?: string;
  title?: string;
  description?: string;
  documentType?: string;
  fileUrl?: string;
  externalUrl?: string;
  publicationDate?: Date | string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  fileSizeBytes?: number;
  isFeatured?: boolean;
}

export class DocumentService {
  /**
   * Lista editais e documentos oficiais com filtros e paginação.
   */
  static async listDocuments(filters: ListDocumentsFilters = {}, isAdmin = false) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    // Aluno vê estritamente apenas documentos publicados
    if (!isAdmin) {
      conditions.push(eq(documents.status, 'PUBLISHED'));
    } else if (filters.status) {
      conditions.push(eq(documents.status, filters.status));
    }

    if (filters.contestId) {
      conditions.push(eq(documents.contestId, filters.contestId));
    }

    if (filters.documentType) {
      conditions.push(eq(documents.documentType, filters.documentType));
    }

    if (filters.sourceId) {
      conditions.push(eq(documents.sourceId, filters.sourceId));
    }

    // Filtro por período
    if (filters.period && filters.period !== 'all') {
      const now = new Date();
      let fromDate: Date;
      if (filters.period === 'today') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filters.period === 'week') {
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filters.period === 'month') {
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      } else if (filters.period === 'year') {
        fromDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      } else {
        fromDate = new Date(0);
      }
      conditions.push(gte(documents.publicationDate, fromDate));
    }

    // Busca textual
    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(documents.title, term),
          ilike(documents.description, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Contagem total
    const [totalRes] = await db
      .select({ count: count() })
      .from(documents)
      .where(whereClause);
    const total = Number(totalRes?.count || 0);

    // Consulta paginada
    const items = await db
      .select({
        id: documents.id,
        contestId: documents.contestId,
        sourceId: documents.sourceId,
        title: documents.title,
        description: documents.description,
        documentType: documents.documentType,
        fileUrl: documents.fileUrl,
        externalUrl: documents.externalUrl,
        fileSizeBytes: documents.fileSizeBytes,
        publicationDate: documents.publicationDate,
        status: documents.status,
        isFeatured: documents.isFeatured,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        contestTitle: contests.title,
        contestSlug: contests.slug,
        sourceName: newsSources.name,
        sourceWebsiteUrl: newsSources.websiteUrl,
        sourceTrustLevel: newsSources.trustLevel,
        sourceType: newsSources.sourceType,
      })
      .from(documents)
      .leftJoin(contests, eq(documents.contestId, contests.id))
      .leftJoin(newsSources, eq(documents.sourceId, newsSources.id))
      .where(whereClause)
      .orderBy(desc(documents.isFeatured), desc(documents.publicationDate))
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtém os detalhes completos de um documento.
   */
  static async getDocumentById(id: string, isAdmin = false) {
    const [doc] = await db
      .select({
        id: documents.id,
        contestId: documents.contestId,
        sourceId: documents.sourceId,
        title: documents.title,
        description: documents.description,
        documentType: documents.documentType,
        fileUrl: documents.fileUrl,
        externalUrl: documents.externalUrl,
        fileSizeBytes: documents.fileSizeBytes,
        publicationDate: documents.publicationDate,
        status: documents.status,
        isFeatured: documents.isFeatured,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        contestTitle: contests.title,
        contestSlug: contests.slug,
        sourceName: newsSources.name,
        sourceWebsiteUrl: newsSources.websiteUrl,
        sourceTrustLevel: newsSources.trustLevel,
        sourceType: newsSources.sourceType,
      })
      .from(documents)
      .leftJoin(contests, eq(documents.contestId, contests.id))
      .leftJoin(newsSources, eq(documents.sourceId, newsSources.id))
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc) {
      return null;
    }

    if (!isAdmin && doc.status !== 'PUBLISHED') {
      const err = new Error('Documento não disponível para visualização.');
      (err as any).statusCode = 403;
      throw err;
    }

    return doc;
  }

  /**
   * Cadastra novo documento oficial. Exige obrigatoriamente uma fonte cadastrada.
   */
  static async createDocument(
    data: CreateDocumentInput,
    adminUser: { id: string; email?: string }
  ) {
    if (!data.title || !data.title.trim()) {
      throw new Error('Título do documento é obrigatório.');
    }

    if (!data.contestId) {
      throw new Error('Concurso associado é obrigatório.');
    }

    // REGRA FUNDAMENTAL: Não permitir documento sem fonte
    if (!data.sourceId) {
      throw new Error('Todo documento oficial deve obrigatoriamente possuir uma fonte confiável cadastrada.');
    }

    const source = await NewsSourceService.getSourceById(data.sourceId);
    if (!source) {
      throw new Error('A fonte indicada não existe.');
    }

    const pubDate = data.publicationDate ? new Date(data.publicationDate) : new Date();
    const status = data.status || 'PUBLISHED';

    const [inserted] = await db
      .insert(documents)
      .values({
        contestId: data.contestId,
        sourceId: data.sourceId,
        title: data.title.trim(),
        description: data.description?.trim(),
        documentType: data.documentType || 'EDITAL',
        fileUrl: data.fileUrl?.trim() || data.externalUrl?.trim() || '',
        externalUrl: data.externalUrl?.trim() || null,
        publicationDate: pubDate,
        status,
        fileSizeBytes: data.fileSizeBytes || 0,
        isFeatured: data.isFeatured ?? false,
      })
      .returning();

    // Auditoria
    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'DOCUMENT_CREATED',
      resource: 'documents',
      resourceId: inserted.id,
      details: { title: inserted.title, type: inserted.documentType, contestId: inserted.contestId },
    });

    // Notificação se publicado
    if (status === 'PUBLISHED') {
      await NotificationService.notifyUsers({
        title: `Novo documento publicado: ${inserted.title}`,
        message: `Um novo documento oficial (${inserted.documentType}) foi disponibilizado para o concurso.`,
        type: 'DOCUMENT',
        actionUrl: `/editais/${inserted.id}`,
        contestId: inserted.contestId,
      });
    }

    return inserted;
  }

  /**
   * Atualiza dados de um documento existente.
   */
  static async updateDocument(
    id: string,
    data: UpdateDocumentInput,
    adminUser: { id: string; email?: string }
  ) {
    const existing = await this.getDocumentById(id, true);
    if (!existing) {
      throw new Error('Documento não encontrado.');
    }

    if (data.sourceId) {
      const source = await NewsSourceService.getSourceById(data.sourceId);
      if (!source) {
        throw new Error('A fonte indicada não existe.');
      }
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (data.contestId !== undefined) updatePayload.contestId = data.contestId;
    if (data.sourceId !== undefined) updatePayload.sourceId = data.sourceId;
    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.description !== undefined) updatePayload.description = data.description?.trim();
    if (data.documentType !== undefined) updatePayload.documentType = data.documentType;
    if (data.fileUrl !== undefined) updatePayload.fileUrl = data.fileUrl?.trim() || null;
    if (data.externalUrl !== undefined) updatePayload.externalUrl = data.externalUrl?.trim() || null;
    if (data.publicationDate !== undefined) updatePayload.publicationDate = new Date(data.publicationDate);
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.fileSizeBytes !== undefined) updatePayload.fileSizeBytes = data.fileSizeBytes;
    if (data.isFeatured !== undefined) updatePayload.isFeatured = data.isFeatured;

    const [updated] = await db
      .update(documents)
      .set(updatePayload)
      .where(eq(documents.id, id))
      .returning();

    // Auditoria
    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'DOCUMENT_UPDATED',
      resource: 'documents',
      resourceId: id,
      details: data,
    });

    // Se mudou de DRAFT para PUBLISHED
    if (existing.status !== 'PUBLISHED' && updated.status === 'PUBLISHED') {
      await NotificationService.notifyUsers({
        title: `Novo documento publicado: ${updated.title}`,
        message: `Um documento oficial (${updated.documentType}) foi publicado.`,
        type: 'DOCUMENT',
        actionUrl: `/editais/${updated.id}`,
        contestId: updated.contestId,
      });
    }

    return updated;
  }

  /**
   * Publica um documento oficial.
   */
  static async publishDocument(id: string, adminUser: { id: string; email?: string }) {
    const existing = await this.getDocumentById(id, true);
    if (!existing) {
      throw new Error('Documento não encontrado.');
    }
    if (!existing.sourceId) {
      throw new Error('Não é possível publicar um documento sem fonte oficial.');
    }

    const [updated] = await db
      .update(documents)
      .set({ status: 'PUBLISHED', updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'DOCUMENT_PUBLISHED',
      resource: 'documents',
      resourceId: id,
      details: { title: updated.title },
    });

    await NotificationService.notifyUsers({
      title: `Novo documento publicado: ${updated.title}`,
      message: `Um documento oficial (${updated.documentType}) foi publicado.`,
      type: 'DOCUMENT',
      actionUrl: `/editais/${updated.id}`,
      contestId: updated.contestId,
    });

    return updated;
  }

  /**
   * Arquiva um documento.
   */
  static async archiveDocument(id: string, adminUser: { id: string; email?: string }) {
    const [updated] = await db
      .update(documents)
      .set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();

    if (!updated) {
      throw new Error('Documento não encontrado.');
    }

    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'DOCUMENT_ARCHIVED',
      resource: 'documents',
      resourceId: id,
      details: { title: updated.title },
    });

    return updated;
  }

  /**
   * Remove um documento.
   */
  static async deleteDocument(id: string, adminUser: { id: string; email?: string }) {
    const [deleted] = await db
      .delete(documents)
      .where(eq(documents.id, id))
      .returning();

    if (!deleted) {
      throw new Error('Documento não encontrado.');
    }

    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'DOCUMENT_DELETED',
      resource: 'documents',
      resourceId: id,
      details: { title: deleted.title },
    });

    return deleted;
  }
}
