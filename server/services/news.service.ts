import { db } from '../db';
import {
  news,
  newsSources,
  contests,
  newsTags,
  newsToTags,
  documents,
  auditLogs,
} from '../db/schema';
import { eq, and, desc, ilike, or, gte, inArray, count, sql } from 'drizzle-orm';
import { NewsIngestionService } from './news-ingestion.service';
import { defaultNewsClassificationService } from './news-classification.service';
import { NewsInteractionService } from './news-interaction.service';
import { NotificationService } from './notification.service';
import { NewsSourceService } from './news-source.service';

export interface ListNewsFilters {
  contestId?: string;
  category?: string;
  sourceId?: string;
  status?: string;
  period?: 'today' | 'week' | 'month' | 'year' | 'all';
  isImportant?: boolean;
  isFeatured?: boolean;
  onlyFavorites?: boolean;
  onlyUnread?: boolean;
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

export interface CreateNewsInput {
  contestId?: string | null;
  sourceId: string;
  title: string;
  slug?: string;
  summary: string;
  content?: string;
  externalUrl?: string;
  imageUrl?: string;
  category?: string;
  publishedAt?: Date | string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured?: boolean;
  isImportant?: boolean;
  tags?: string[];
}

export interface UpdateNewsInput {
  contestId?: string | null;
  sourceId?: string;
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  externalUrl?: string;
  imageUrl?: string;
  category?: string;
  publishedAt?: Date | string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured?: boolean;
  isImportant?: boolean;
  tags?: string[];
}

/**
 * Sanitiza conteúdo HTML para prevenir injeção XSS e links maliciosos javascript:
 */
export function sanitizeHtml(rawHtml?: string): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, 'blocked:')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/on\w+=\w+/gi, '');
}

/**
 * Utilitário para gerar slugs amigáveis
 */
export function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${randomSuffix}`;
}

export class NewsService {
  /**
   * Lista notícias com múltiplos filtros, busca textual, ordenação inteligente e paginação.
   */
  static async listNews(filters: ListNewsFilters = {}, currentUserId?: string, isAdmin = false) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 12));
    const offset = (page - 1) * limit;

    const conditions = [];

    // Aluno vê estritamente apenas notícias publicadas
    if (!isAdmin) {
      conditions.push(eq(news.status, 'PUBLISHED'));
    } else if (filters.status) {
      conditions.push(eq(news.status, filters.status));
    }

    if (filters.contestId) {
      conditions.push(eq(news.contestId, filters.contestId));
    }

    if (filters.category) {
      conditions.push(eq(news.category, filters.category));
    }

    if (filters.sourceId) {
      conditions.push(eq(news.sourceId, filters.sourceId));
    }

    if (filters.isImportant !== undefined) {
      conditions.push(eq(news.isImportant, filters.isImportant));
    }

    if (filters.isFeatured !== undefined) {
      conditions.push(eq(news.isFeatured, filters.isFeatured));
    }

    // Filtro de período
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
      conditions.push(gte(news.publishedAt, fromDate));
    }

    // Busca textual no título, resumo e conteúdo
    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(news.title, term),
          ilike(news.summary, term),
          ilike(news.content, term)
        )
      );
    }

    // Filtro de favoritos para o usuário atual
    if (filters.onlyFavorites && currentUserId) {
      const favIds = await NewsInteractionService.getUserFavoriteNewsIds(currentUserId);
      const favArray = Array.from(favIds);
      if (favArray.length === 0) {
        return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      conditions.push(inArray(news.id, favArray));
    }

    // Filtro de não lidas para o usuário atual
    if (filters.onlyUnread && currentUserId) {
      const readIds = await NewsInteractionService.getUserReadNewsIds(currentUserId);
      const readArray = Array.from(readIds);
      if (readArray.length > 0) {
        conditions.push(sql`${news.id} NOT IN (${sql.join(readArray.map(id => sql`${id}`), sql`, `)})`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total de registros
    const [totalRes] = await db
      .select({ count: count() })
      .from(news)
      .where(whereClause);
    const total = Number(totalRes?.count || 0);

    // Consulta paginada
    const rawItems = await db
      .select({
        id: news.id,
        contestId: news.contestId,
        sourceId: news.sourceId,
        title: news.title,
        slug: news.slug,
        summary: news.summary,
        category: news.category,
        publishedAt: news.publishedAt,
        externalUrl: news.externalUrl,
        originalUrl: news.originalUrl,
        imageUrl: news.imageUrl,
        coverImageUrl: news.coverImageUrl,
        status: news.status,
        isFeatured: news.isFeatured,
        isImportant: news.isImportant,
        canonicalUrl: news.canonicalUrl,
        createdAt: news.createdAt,
        updatedAt: news.updatedAt,
        contestTitle: contests.title,
        contestSlug: contests.slug,
        sourceName: newsSources.name,
        sourceWebsiteUrl: newsSources.websiteUrl,
        sourceTrustLevel: newsSources.trustLevel,
        sourceType: newsSources.sourceType,
      })
      .from(news)
      .leftJoin(contests, eq(news.contestId, contests.id))
      .innerJoin(newsSources, eq(news.sourceId, newsSources.id))
      .where(whereClause)
      .orderBy(desc(news.isFeatured), desc(news.isImportant), desc(news.publishedAt))
      .limit(limit)
      .offset(offset);

    // Conjuntos de leitura e favoritos do usuário
    let readSet = new Set<string>();
    let favSet = new Set<string>();
    if (currentUserId) {
      [readSet, favSet] = await Promise.all([
        NewsInteractionService.getUserReadNewsIds(currentUserId),
        NewsInteractionService.getUserFavoriteNewsIds(currentUserId),
      ]);
    }

    // Busca tags de cada notícia retornada
    const newsIds = rawItems.map((i: { id: string }) => i.id);
    const tagsMap = new Map<string, string[]>();
    if (newsIds.length > 0) {
      const tagRows = await db
        .select({ newsId: newsToTags.newsId, tagName: newsTags.name })
        .from(newsToTags)
        .innerJoin(newsTags, eq(newsToTags.tagId, newsTags.id))
        .where(inArray(newsToTags.newsId, newsIds));

      for (const row of tagRows) {
        if (!tagsMap.has(row.newsId)) {
          tagsMap.set(row.newsId, []);
        }
        tagsMap.get(row.newsId)!.push(row.tagName);
      }
    }

    const items = rawItems.map((item: any) => ({
      ...item,
      imageUrl: item.imageUrl || item.coverImageUrl || null,
      externalUrl: item.externalUrl || item.originalUrl || null,
      isRead: readSet.has(item.id),
      isFavorite: favSet.has(item.id),
      tags: tagsMap.get(item.id) || [],
    }));

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
   * Obtém os detalhes completos da notícia.
   * Aluno não pode acessar notícias com status DRAFT (retorna 403).
   * Registra leitura automaticamente se currentUserId for fornecido.
   */
  static async getNewsById(id: string, currentUserId?: string, isAdmin = false) {
    const [item] = await db
      .select({
        id: news.id,
        contestId: news.contestId,
        sourceId: news.sourceId,
        title: news.title,
        slug: news.slug,
        summary: news.summary,
        content: news.content,
        contentMarkdown: news.contentMarkdown,
        category: news.category,
        publishedAt: news.publishedAt,
        externalUrl: news.externalUrl,
        originalUrl: news.originalUrl,
        imageUrl: news.imageUrl,
        coverImageUrl: news.coverImageUrl,
        status: news.status,
        isFeatured: news.isFeatured,
        isImportant: news.isImportant,
        canonicalUrl: news.canonicalUrl,
        createdAt: news.createdAt,
        updatedAt: news.updatedAt,
        contestTitle: contests.title,
        contestSlug: contests.slug,
        sourceName: newsSources.name,
        sourceWebsiteUrl: newsSources.websiteUrl,
        sourceTrustLevel: newsSources.trustLevel,
        sourceType: newsSources.sourceType,
      })
      .from(news)
      .leftJoin(contests, eq(news.contestId, contests.id))
      .innerJoin(newsSources, eq(news.sourceId, newsSources.id))
      .where(eq(news.id, id))
      .limit(1);

    if (!item) {
      return null;
    }

    // REGRA DE SEGURANÇA: Aluno não pode ver notícia DRAFT
    if (!isAdmin && item.status !== 'PUBLISHED') {
      const err = new Error('Notícia não disponível para visualização.');
      (err as any).statusCode = 403;
      throw err;
    }

    // Registra leitura automática
    if (currentUserId && item.status === 'PUBLISHED') {
      await NewsInteractionService.markAsRead(currentUserId, item.id);
    }

    // Tags associadas
    const tagRows = await db
      .select({ name: newsTags.name, slug: newsTags.slug })
      .from(newsToTags)
      .innerJoin(newsTags, eq(newsToTags.tagId, newsTags.id))
      .where(eq(newsToTags.newsId, item.id));

    // Notícias relacionadas (mesmo concurso ou categoria)
    const relatedNews = await db
      .select({
        id: news.id,
        title: news.title,
        slug: news.slug,
        publishedAt: news.publishedAt,
        category: news.category,
        imageUrl: news.imageUrl,
        coverImageUrl: news.coverImageUrl,
      })
      .from(news)
      .where(
        and(
          eq(news.status, 'PUBLISHED'),
          sql`${news.id} != ${item.id}`,
          item.contestId ? eq(news.contestId, item.contestId) : eq(news.category, item.category)
        )
      )
      .orderBy(desc(news.publishedAt))
      .limit(3);

    // Documentos relacionados ao concurso (se houver contestId)
    let relatedDocuments: any[] = [];
    if (item.contestId) {
      relatedDocuments = await db
        .select({
          id: documents.id,
          title: documents.title,
          documentType: documents.documentType,
          publicationDate: documents.publicationDate,
          fileUrl: documents.fileUrl,
          externalUrl: documents.externalUrl,
        })
        .from(documents)
        .where(and(eq(documents.contestId, item.contestId), eq(documents.status, 'PUBLISHED')))
        .orderBy(desc(documents.publicationDate))
        .limit(3);
    }

    let isRead = false;
    let isFavorite = false;
    if (currentUserId) {
      const [readSet, favSet] = await Promise.all([
        NewsInteractionService.getUserReadNewsIds(currentUserId),
        NewsInteractionService.getUserFavoriteNewsIds(currentUserId),
      ]);
      isRead = readSet.has(item.id);
      isFavorite = favSet.has(item.id);
    }

    const finalContent = sanitizeHtml(item.content || item.contentMarkdown || '');

    return {
      ...item,
      content: finalContent,
      imageUrl: item.imageUrl || item.coverImageUrl || null,
      externalUrl: item.externalUrl || item.originalUrl || null,
      tags: tagRows.map((t: { name: string }) => t.name),
      isRead,
      isFavorite,
      relatedNews: relatedNews.map((rn: any) => ({
        ...rn,
        imageUrl: rn.imageUrl || rn.coverImageUrl || null,
      })),
      relatedDocuments,
    };
  }

  /**
   * Cria nova notícia com validação, sanitização, deduplicação e auditoria.
   */
  static async createNews(
    data: CreateNewsInput,
    adminUser: { id: string; email?: string }
  ) {
    if (!data.title || !data.title.trim()) {
      throw new Error('Título da notícia é obrigatório.');
    }
    if (!data.summary || !data.summary.trim()) {
      throw new Error('Resumo da notícia é obrigatório.');
    }
    if (!data.sourceId) {
      throw new Error('Fonte de notícia é obrigatória.');
    }

    const source = await NewsSourceService.getSourceById(data.sourceId);
    if (!source) {
      throw new Error('Fonte de notícia indicada não existe.');
    }

    // Sanitização de HTML
    const sanitizedContent = sanitizeHtml(data.content || data.summary);

    // Deduplicação canônica
    const canonicalUrl = NewsIngestionService.generateCanonicalUrl(data.externalUrl);
    const pubDate = data.publishedAt ? new Date(data.publishedAt) : new Date();
    const contentHash = NewsIngestionService.generateContentHash(
      data.sourceId,
      data.title,
      pubDate,
      canonicalUrl
    );

    const dupCheck = await NewsIngestionService.checkDuplicate(canonicalUrl, contentHash);
    if (dupCheck.isDuplicate) {
      throw new Error(`Publicação impedida: já existe notícia com ${dupCheck.reason} (ID existente: ${dupCheck.existingNewsId}).`);
    }

    // Auto-classificação se não informada categoria
    let category = data.category;
    let isImportant = data.isImportant ?? false;
    let tagsToAdd = data.tags || [];

    if (!category || category === 'GENERAL') {
      const classified = defaultNewsClassificationService.classify(
        data.title,
        data.summary,
        sanitizedContent
      );
      if (!category || category === 'GENERAL') {
        category = classified.category;
      }
      if (data.isImportant === undefined) {
        isImportant = classified.isImportant;
      }
      if (tagsToAdd.length === 0) {
        tagsToAdd = classified.tags;
      }
    }

    const slug = data.slug?.trim() || generateSlug(data.title);
    const status = data.status || 'PUBLISHED';

    const [inserted] = await db
      .insert(news)
      .values({
        contestId: data.contestId || null,
        sourceId: data.sourceId,
        title: data.title.trim(),
        slug,
        summary: data.summary.trim(),
        content: sanitizedContent,
        contentMarkdown: sanitizedContent,
        externalUrl: data.externalUrl?.trim() || null,
        originalUrl: data.externalUrl?.trim() || '',
        imageUrl: data.imageUrl?.trim() || null,
        coverImageUrl: data.imageUrl?.trim() || null,
        category,
        publishedAt: pubDate,
        status,
        isFeatured: data.isFeatured ?? false,
        isImportant,
        canonicalUrl,
        contentHash,
      })
      .returning();

    // Tratamento de tags
    await this.syncNewsTags(inserted.id, tagsToAdd);

    // Auditoria
    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'NEWS_CREATED',
      resource: 'news',
      resourceId: inserted.id,
      details: { title: inserted.title, status: inserted.status, isImportant: inserted.isImportant },
    });

    // Notificação se importante e publicada
    if (isImportant && status === 'PUBLISHED') {
      await NotificationService.notifyUsers({
        title: `Atualização importante: ${inserted.title}`,
        message: inserted.summary,
        type: 'NEWS',
        actionUrl: `/noticias/${inserted.id}`,
        contestId: inserted.contestId,
      });
    }

    return inserted;
  }

  /**
   * Atualiza uma notícia existente.
   */
  static async updateNews(
    id: string,
    data: UpdateNewsInput,
    adminUser: { id: string; email?: string }
  ) {
    const existing = await this.getNewsById(id, undefined, true);
    if (!existing) {
      throw new Error('Notícia não encontrada.');
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (data.contestId !== undefined) updatePayload.contestId = data.contestId;
    if (data.sourceId !== undefined) updatePayload.sourceId = data.sourceId;
    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.slug !== undefined) updatePayload.slug = data.slug.trim();
    if (data.summary !== undefined) updatePayload.summary = data.summary.trim();
    if (data.content !== undefined) {
      const clean = sanitizeHtml(data.content);
      updatePayload.content = clean;
      updatePayload.contentMarkdown = clean;
    }
    if (data.externalUrl !== undefined) {
      updatePayload.externalUrl = data.externalUrl?.trim() || null;
      updatePayload.originalUrl = data.externalUrl?.trim() || null;
      updatePayload.canonicalUrl = NewsIngestionService.generateCanonicalUrl(data.externalUrl);
    }
    if (data.imageUrl !== undefined) {
      updatePayload.imageUrl = data.imageUrl?.trim() || null;
      updatePayload.coverImageUrl = data.imageUrl?.trim() || null;
    }
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.publishedAt !== undefined) updatePayload.publishedAt = new Date(data.publishedAt);
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.isFeatured !== undefined) updatePayload.isFeatured = data.isFeatured;
    if (data.isImportant !== undefined) updatePayload.isImportant = data.isImportant;

    const [updated] = await db
      .update(news)
      .set(updatePayload)
      .where(eq(news.id, id))
      .returning();

    if (data.tags !== undefined) {
      await this.syncNewsTags(id, data.tags);
    }

    // Auditoria
    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'NEWS_UPDATED',
      resource: 'news',
      resourceId: id,
      details: data,
    });

    // Se passou a ser publicada e é importante
    if (
      existing.status !== 'PUBLISHED' &&
      updated.status === 'PUBLISHED' &&
      updated.isImportant
    ) {
      await NotificationService.notifyUsers({
        title: `Atualização importante: ${updated.title}`,
        message: updated.summary,
        type: 'NEWS',
        actionUrl: `/noticias/${updated.id}`,
        contestId: updated.contestId,
      });
    }

    return updated;
  }

  /**
   * Publica uma notícia com status DRAFT.
   */
  static async publishNews(id: string, adminUser: { id: string; email?: string }) {
    const existing = await this.getNewsById(id, undefined, true);
    if (!existing) {
      throw new Error('Notícia não encontrada.');
    }

    const [updated] = await db
      .update(news)
      .set({ status: 'PUBLISHED', updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'NEWS_PUBLISHED',
      resource: 'news',
      resourceId: id,
      details: { title: updated.title },
    });

    if (updated.isImportant) {
      await NotificationService.notifyUsers({
        title: `Atualização importante: ${updated.title}`,
        message: updated.summary,
        type: 'NEWS',
        actionUrl: `/noticias/${updated.id}`,
        contestId: updated.contestId,
      });
    }

    return updated;
  }

  /**
   * Arquiva uma notícia.
   */
  static async archiveNews(id: string, adminUser: { id: string; email?: string }) {
    const [updated] = await db
      .update(news)
      .set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();

    if (!updated) {
      throw new Error('Notícia não encontrada.');
    }

    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'NEWS_ARCHIVED',
      resource: 'news',
      resourceId: id,
      details: { title: updated.title },
    });

    return updated;
  }

  /**
   * Alterna o destaque (is_featured).
   */
  static async toggleFeatured(id: string, adminUser: { id: string; email?: string }) {
    const existing = await this.getNewsById(id, undefined, true);
    if (!existing) {
      throw new Error('Notícia não encontrada.');
    }

    const nextState = !existing.isFeatured;
    const [updated] = await db
      .update(news)
      .set({ isFeatured: nextState, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: nextState ? 'NEWS_FEATURED' : 'NEWS_UNFEATURED',
      resource: 'news',
      resourceId: id,
      details: { title: updated.title, isFeatured: nextState },
    });

    return updated;
  }

  /**
   * Alterna se a notícia é importante (is_important).
   */
  static async toggleImportant(id: string, adminUser: { id: string; email?: string }) {
    const existing = await this.getNewsById(id, undefined, true);
    if (!existing) {
      throw new Error('Notícia não encontrada.');
    }

    const nextState = !existing.isImportant;
    const [updated] = await db
      .update(news)
      .set({ isImportant: nextState, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: nextState ? 'NEWS_MARKED_IMPORTANT' : 'NEWS_UNMARKED_IMPORTANT',
      resource: 'news',
      resourceId: id,
      details: { title: updated.title, isImportant: nextState },
    });

    return updated;
  }

  /**
   * Exclui uma notícia do banco.
   */
  static async deleteNews(id: string, adminUser: { id: string; email?: string }) {
    const [deleted] = await db
      .delete(news)
      .where(eq(news.id, id))
      .returning();

    if (!deleted) {
      throw new Error('Notícia não encontrada.');
    }

    await db.insert(auditLogs).values({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'NEWS_DELETED',
      resource: 'news',
      resourceId: id,
      details: { title: deleted.title },
    });

    return deleted;
  }

  /**
   * Sincroniza tags associadas a uma notícia.
   */
  private static async syncNewsTags(newsId: string, tagNames: string[]) {
    await db.delete(newsToTags).where(eq(newsToTags.newsId, newsId));
    if (!tagNames || tagNames.length === 0) return;

    for (const rawName of tagNames) {
      const name = rawName.trim();
      if (!name) continue;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      let [tag] = await db.select().from(newsTags).where(eq(newsTags.slug, slug)).limit(1);
      if (!tag) {
        [tag] = await db
          .insert(newsTags)
          .values({ name, slug })
          .onConflictDoNothing()
          .returning();
        if (!tag) {
          [tag] = await db.select().from(newsTags).where(eq(newsTags.slug, slug)).limit(1);
        }
      }

      if (tag) {
        await db
          .insert(newsToTags)
          .values({ newsId, tagId: tag.id })
          .onConflictDoNothing();
      }
    }
  }

  /**
   * Retorna métricas consolidadas de notícias para o painel administrativo.
   */
  static async getAdminStats() {
    const all = await db
      .select({
        status: news.status,
        isImportant: news.isImportant,
        isFeatured: news.isFeatured,
      })
      .from(news);

    const total = all.length;
    const published = all.filter((n: any) => n.status === 'PUBLISHED').length;
    const drafts = all.filter((n: any) => n.status === 'DRAFT').length;
    const archived = all.filter((n: any) => n.status === 'ARCHIVED').length;
    const important = all.filter((n: any) => n.isImportant).length;
    const featured = all.filter((n: any) => n.isFeatured).length;

    return {
      total,
      published,
      drafts,
      archived,
      important,
      featured,
    };
  }
}
