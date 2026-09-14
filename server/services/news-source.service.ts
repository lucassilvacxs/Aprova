import { db } from '../db';
import { newsSources, news, documents, auditLogs } from '../db/schema';
import { eq, asc, count } from 'drizzle-orm';

export interface CreateNewsSourceInput {
  name: string;
  description?: string;
  websiteUrl: string;
  logoUrl?: string;
  sourceType?: 'OFFICIAL' | 'EDUCATIONAL' | 'NEWS' | 'OTHER';
  trustLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  isActive?: boolean;
}

export interface UpdateNewsSourceInput {
  name?: string;
  description?: string;
  websiteUrl?: string;
  logoUrl?: string;
  sourceType?: 'OFFICIAL' | 'EDUCATIONAL' | 'NEWS' | 'OTHER';
  trustLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  isActive?: boolean;
}

export class NewsSourceService {
  /**
   * Lista fontes confiáveis com filtro de ativas ou todas (para o admin).
   */
  static async listSources(activeOnly = false) {
    let query = db.select().from(newsSources).$dynamic();
    if (activeOnly) {
      query = query.where(eq(newsSources.isActive, true));
    }
    return await query.orderBy(asc(newsSources.name));
  }

  /**
   * Obtém detalhes de uma fonte pelo ID.
   */
  static async getSourceById(id: string) {
    const [source] = await db
      .select()
      .from(newsSources)
      .where(eq(newsSources.id, id))
      .limit(1);
    return source || null;
  }

  /**
   * Cadastra nova fonte de notícias/editais.
   */
  static async createSource(
    data: CreateNewsSourceInput,
    adminUser?: { id: string; email?: string }
  ) {
    if (!data.name || !data.websiteUrl) {
      throw new Error('Nome e URL da fonte são obrigatórios.');
    }

    const [inserted] = await db
      .insert(newsSources)
      .values({
        name: data.name.trim(),
        description: data.description?.trim(),
        websiteUrl: data.websiteUrl.trim(),
        url: data.websiteUrl.trim(),
        logoUrl: data.logoUrl?.trim(),
        sourceType: data.sourceType || 'OFFICIAL',
        trustLevel: data.trustLevel || 'HIGH',
        isActive: data.isActive ?? true,
        isOfficial: (data.sourceType || 'OFFICIAL') === 'OFFICIAL',
      })
      .returning();

    if (adminUser) {
      await db.insert(auditLogs).values({
        userId: adminUser.id,
        actorEmail: adminUser.email,
        action: 'SOURCE_CREATED',
        resource: 'news_sources',
        resourceId: inserted.id,
        details: { name: inserted.name, trustLevel: inserted.trustLevel, sourceType: inserted.sourceType },
      });
    }

    return inserted;
  }

  /**
   * Atualiza dados de uma fonte existente.
   */
  static async updateSource(
    id: string,
    data: UpdateNewsSourceInput,
    adminUser?: { id: string; email?: string }
  ) {
    const existing = await this.getSourceById(id);
    if (!existing) {
      throw new Error('Fonte de notícias não encontrada.');
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.description !== undefined) updatePayload.description = data.description?.trim();
    if (data.websiteUrl !== undefined) {
      updatePayload.websiteUrl = data.websiteUrl.trim();
      updatePayload.url = data.websiteUrl.trim();
    }
    if (data.logoUrl !== undefined) updatePayload.logoUrl = data.logoUrl?.trim();
    if (data.sourceType !== undefined) {
      updatePayload.sourceType = data.sourceType;
      updatePayload.isOfficial = data.sourceType === 'OFFICIAL';
    }
    if (data.trustLevel !== undefined) updatePayload.trustLevel = data.trustLevel;
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

    const [updated] = await db
      .update(newsSources)
      .set(updatePayload)
      .where(eq(newsSources.id, id))
      .returning();

    if (adminUser) {
      await db.insert(auditLogs).values({
        userId: adminUser.id,
        actorEmail: adminUser.email,
        action: 'SOURCE_UPDATED',
        resource: 'news_sources',
        resourceId: id,
        details: data,
      });
    }

    return updated;
  }

  /**
   * Alterna estado ativo/inativo de uma fonte (soft delete).
   */
  static async toggleActive(id: string, adminUser?: { id: string; email?: string }) {
    const existing = await this.getSourceById(id);
    if (!existing) {
      throw new Error('Fonte não encontrada.');
    }

    const newActiveState = !existing.isActive;
    return await this.updateSource(id, { isActive: newActiveState }, adminUser);
  }

  /**
   * Remove fonte apenas se não houver notícias ou documentos associados.
   */
  static async deleteSource(id: string, adminUser?: { id: string; email?: string }) {
    // 1. Verifica vínculos com notícias
    const [newsCount] = await db
      .select({ count: count() })
      .from(news)
      .where(eq(news.sourceId, id));

    if (Number(newsCount?.count || 0) > 0) {
      throw new Error(
        `Não é permitido excluir fisicamente a fonte pois existem ${newsCount.count} notícia(s) vinculada(s). Desative-a em vez de excluir.`
      );
    }

    // 2. Verifica vínculos com documentos
    const [docsCount] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.sourceId, id));

    if (Number(docsCount?.count || 0) > 0) {
      throw new Error(
        `Não é permitido excluir fisicamente a fonte pois existem ${docsCount.count} documento(s) vinculado(s). Desative-a em vez de excluir.`
      );
    }

    const [deleted] = await db
      .delete(newsSources)
      .where(eq(newsSources.id, id))
      .returning();

    if (adminUser) {
      await db.insert(auditLogs).values({
        userId: adminUser.id,
        actorEmail: adminUser.email,
        action: 'SOURCE_DELETED',
        resource: 'news_sources',
        resourceId: id,
        details: { name: deleted?.name },
      });
    }

    return deleted;
  }
}
