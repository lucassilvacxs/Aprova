import { db } from '../db';
import { newsReads, newsFavorites, news, newsSources, contests } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export class NewsInteractionService {
  /**
   * Registra a leitura de uma notícia por um usuário (idempotente).
   */
  static async markAsRead(userId: string, newsId: string): Promise<boolean> {
    const existing = await db
      .select({ id: newsReads.id })
      .from(newsReads)
      .where(and(eq(newsReads.userId, userId), eq(newsReads.newsId, newsId)))
      .limit(1);

    if (existing.length === 0) {
      await db
        .insert(newsReads)
        .values({
          userId,
          newsId,
          readAt: new Date(),
        })
        .onConflictDoNothing();
    }
    return true;
  }

  /**
   * Remove o registro de leitura da notícia.
   */
  static async markAsUnread(userId: string, newsId: string): Promise<boolean> {
    await db
      .delete(newsReads)
      .where(and(eq(newsReads.userId, userId), eq(newsReads.newsId, newsId)));
    return true;
  }

  /**
   * Alterna o estado de favorito de uma notícia para o usuário.
   */
  static async toggleFavorite(userId: string, newsId: string): Promise<{ isFavorite: boolean }> {
    const existing = await db
      .select({ id: newsFavorites.id })
      .from(newsFavorites)
      .where(and(eq(newsFavorites.userId, userId), eq(newsFavorites.newsId, newsId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(newsFavorites)
        .where(and(eq(newsFavorites.userId, userId), eq(newsFavorites.newsId, newsId)));
      return { isFavorite: false };
    } else {
      await db
        .insert(newsFavorites)
        .values({
          userId,
          newsId,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
      return { isFavorite: true };
    }
  }

  /**
   * Retorna conjunto de IDs de notícias lidas pelo usuário.
   */
  static async getUserReadNewsIds(userId: string): Promise<Set<string>> {
    const records = await db
      .select({ newsId: newsReads.newsId })
      .from(newsReads)
      .where(eq(newsReads.userId, userId));
    return new Set(records.map((r: { newsId: string }) => r.newsId));
  }

  /**
   * Retorna conjunto de IDs de notícias favoritadas pelo usuário.
   */
  static async getUserFavoriteNewsIds(userId: string): Promise<Set<string>> {
    const records = await db
      .select({ newsId: newsFavorites.newsId })
      .from(newsFavorites)
      .where(eq(newsFavorites.userId, userId));
    return new Set(records.map((r: { newsId: string }) => r.newsId));
  }

  /**
   * Lista as notícias favoritadas do usuário.
   */
  static async getUserFavoritesList(userId: string, limit = 20, offset = 0) {
    return await db
      .select({
        id: news.id,
        title: news.title,
        slug: news.slug,
        summary: news.summary,
        category: news.category,
        publishedAt: news.publishedAt,
        imageUrl: news.imageUrl,
        isImportant: news.isImportant,
        isFeatured: news.isFeatured,
        favoritedAt: newsFavorites.createdAt,
        sourceName: newsSources.name,
        sourceTrustLevel: newsSources.trustLevel,
        contestTitle: contests.title,
      })
      .from(newsFavorites)
      .innerJoin(news, eq(newsFavorites.newsId, news.id))
      .innerJoin(newsSources, eq(news.sourceId, newsSources.id))
      .leftJoin(contests, eq(news.contestId, contests.id))
      .where(and(eq(newsFavorites.userId, userId), eq(news.status, 'PUBLISHED')))
      .orderBy(desc(newsFavorites.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
