import { db } from '../db';
import {
  essayPrompts,
  essays,
  essayCriteria,
  contests,
  auditLogs,
} from '../db/schema';
import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';

export interface ListPromptFilters {
  contestId?: string;
  category?: string;
  difficulty?: string;
  status?: string;
  search?: string;
  userStatus?: 'all' | 'not_started' | 'in_progress' | 'completed';
}

export class EssayPromptService {
  /**
   * Lista temas de redação com filtros, pesquisa e status de resolução do aluno
   */
  static async listPrompts(filters: ListPromptFilters, userId?: string, isAdmin: boolean = false) {
    const conditions: any[] = [];

    if (!isAdmin) {
      conditions.push(eq(essayPrompts.status, 'PUBLISHED'));
    } else if (filters.status && filters.status !== 'ALL') {
      conditions.push(eq(essayPrompts.status, filters.status));
    }

    if (filters.contestId && filters.contestId !== 'ALL') {
      conditions.push(eq(essayPrompts.contestId, filters.contestId));
    }

    if (filters.category && filters.category !== 'ALL') {
      conditions.push(
        or(
          eq(essayPrompts.category, filters.category),
          eq(essayPrompts.themeArea, filters.category)
        )
      );
    }

    if (filters.difficulty && filters.difficulty !== 'ALL') {
      conditions.push(eq(essayPrompts.difficulty, filters.difficulty.toUpperCase()));
    }

    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          sql`${essayPrompts.title} ILIKE ${q}`,
          sql`${essayPrompts.statement} ILIKE ${q}`,
          sql`${essayPrompts.category} ILIKE ${q}`,
          sql`${essayPrompts.themeArea} ILIKE ${q}`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const prompts = await db
      .select({
        id: essayPrompts.id,
        contestId: essayPrompts.contestId,
        boardId: essayPrompts.boardId,
        title: essayPrompts.title,
        category: essayPrompts.category,
        themeArea: essayPrompts.themeArea,
        statement: essayPrompts.statement,
        source: essayPrompts.source,
        difficulty: essayPrompts.difficulty,
        estimatedMinutes: essayPrompts.estimatedMinutes,
        minWords: essayPrompts.minWords,
        maxWords: essayPrompts.maxWords,
        minLines: essayPrompts.minLines,
        maxLines: essayPrompts.maxLines,
        status: essayPrompts.status,
        createdAt: essayPrompts.createdAt,
        contestTitle: contests.title,
        contestSlug: contests.slug,
      })
      .from(essayPrompts)
      .leftJoin(contests, eq(essayPrompts.contestId, contests.id))
      .where(whereClause)
      .orderBy(desc(essayPrompts.createdAt));

    // Se houver userId, busca as redações do estudante para esses temas
    const userEssaysMap = new Map<string, { id: string; status: string; updatedAt: Date }>();
    if (userId && prompts.length > 0) {
      const promptIds = prompts.map((p: { id: string }) => p.id);
      const userEssays = await db
        .select({
          id: essays.id,
          promptId: essays.promptId,
          status: essays.status,
          updatedAt: essays.updatedAt,
        })
        .from(essays)
        .where(and(eq(essays.userId, userId), inArray(essays.promptId, promptIds)));

      for (const ue of userEssays) {
        userEssaysMap.set(ue.promptId, {
          id: ue.id,
          status: ue.status,
          updatedAt: ue.updatedAt,
        });
      }
    }

    const items = prompts.map((p: any) => {
      const userAttempt = userEssaysMap.get(p.id);
      let studentStatus = 'not_started';
      if (userAttempt) {
        if (userAttempt.status === 'DRAFT' || userAttempt.status === 'draft') {
          studentStatus = 'in_progress';
        } else if (userAttempt.status === 'CORRECTED' || userAttempt.status === 'evaluated') {
          studentStatus = 'completed';
        } else {
          studentStatus = 'submitted';
        }
      }

      return {
        ...p,
        category: p.category || p.themeArea || 'Geral',
        studentStatus,
        userEssayId: userAttempt?.id,
      };
    });

    // Filtro por studentStatus se solicitado
    if (filters.userStatus && filters.userStatus !== 'all') {
      return items.filter((item: any) => item.studentStatus === filters.userStatus);
    }

    return items;
  }

  /**
   * Retorna detalhes completos de um tema (com textos motivadores, proposta e critérios)
   */
  static async getPromptById(id: string, userId?: string) {
    const promptRows = await db
      .select({
        id: essayPrompts.id,
        contestId: essayPrompts.contestId,
        boardId: essayPrompts.boardId,
        title: essayPrompts.title,
        category: essayPrompts.category,
        themeArea: essayPrompts.themeArea,
        statement: essayPrompts.statement,
        instructions: essayPrompts.instructions,
        instructionsText: essayPrompts.instructionsText,
        context: essayPrompts.context,
        contextTexts: essayPrompts.contextTexts,
        source: essayPrompts.source,
        difficulty: essayPrompts.difficulty,
        estimatedMinutes: essayPrompts.estimatedMinutes,
        minWords: essayPrompts.minWords,
        maxWords: essayPrompts.maxWords,
        minLines: essayPrompts.minLines,
        maxLines: essayPrompts.maxLines,
        status: essayPrompts.status,
        createdAt: essayPrompts.createdAt,
        contestTitle: contests.title,
        contestSlug: contests.slug,
      })
      .from(essayPrompts)
      .leftJoin(contests, eq(essayPrompts.contestId, contests.id))
      .where(eq(essayPrompts.id, id))
      .limit(1);

    if (promptRows.length === 0) {
      return null;
    }

    const prompt = promptRows[0];

    // Busca critérios cadastrados para este concurso
    let criteria: any[] = [];
    if (prompt.contestId) {
      criteria = await db
        .select()
        .from(essayCriteria)
        .where(and(eq(essayCriteria.contestId, prompt.contestId), eq(essayCriteria.active, true)))
        .orderBy(essayCriteria.ordering);
    }

    // Busca redação mais recente do usuário se autenticado
    let userEssay = null;
    if (userId) {
      const userEssays = await db
        .select()
        .from(essays)
        .where(and(eq(essays.promptId, id), eq(essays.userId, userId)))
        .orderBy(desc(essays.updatedAt))
        .limit(1);

      if (userEssays.length > 0) {
        userEssay = userEssays[0];
      }
    }

    return {
      ...prompt,
      category: prompt.category || prompt.themeArea || 'Geral',
      criteria,
      userEssay,
    };
  }

  /**
   * Cadastro de tema de redação pelo Administrador
   */
  static async createPrompt(
    data: {
      contestId?: string;
      boardId?: string;
      title: string;
      category: string;
      statement: string;
      instructions?: string[] | string;
      context?: string;
      source?: string;
      difficulty?: string;
      estimatedMinutes?: number;
      minWords?: number;
      maxWords?: number;
      minLines?: number;
      maxLines?: number;
      status?: string;
    },
    adminId?: string
  ) {
    if (!data.title?.trim()) {
      throw new Error('O título do tema é obrigatório.');
    }
    if (!data.statement?.trim()) {
      throw new Error('A proposta de redação (statement) é obrigatória.');
    }

    const instructionsArray = Array.isArray(data.instructions)
      ? data.instructions
      : typeof data.instructions === 'string'
      ? data.instructions.split('\n').filter((s) => s.trim().length > 0)
      : [];

    const [created] = await db
      .insert(essayPrompts)
      .values({
        contestId: data.contestId || null,
        boardId: data.boardId || null,
        title: data.title.trim(),
        category: data.category || 'Geral',
        themeArea: data.category || 'Geral',
        statement: data.statement.trim(),
        instructions: instructionsArray,
        instructionsText: Array.isArray(data.instructions) ? data.instructions.join('\n') : data.instructions,
        context: data.context || '',
        contextTexts: [],
        source: data.source || null,
        difficulty: data.difficulty || 'MEDIUM',
        estimatedMinutes: data.estimatedMinutes || 60,
        minWords: data.minWords || 150,
        maxWords: data.maxWords || 350,
        minLines: data.minLines || 20,
        maxLines: data.maxLines || 30,
        status: data.status || 'PUBLISHED',
        createdBy: adminId || null,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
      })
      .returning();

    if (adminId) {
      await db.insert(auditLogs).values({
        userId: adminId,
        action: 'CREATE_ESSAY_PROMPT',
        entityType: 'essay_prompts',
        entityId: created.id,
        details: { title: created.title, category: created.category },
      });
    }

    return created;
  }

  /**
   * Atualização de tema de redação pelo Administrador
   */
  static async updatePrompt(id: string, data: Partial<any>, adminId?: string) {
    const existing = await this.getPromptById(id);
    if (!existing) {
      throw new Error('Tema de redação não encontrado.');
    }

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.contestId !== undefined) updatePayload.contestId = data.contestId;
    if (data.category !== undefined) {
      updatePayload.category = data.category;
      updatePayload.themeArea = data.category;
    }
    if (data.statement !== undefined) updatePayload.statement = data.statement;
    if (data.context !== undefined) updatePayload.context = data.context;
    if (data.source !== undefined) updatePayload.source = data.source;
    if (data.difficulty !== undefined) updatePayload.difficulty = data.difficulty;
    if (data.estimatedMinutes !== undefined) updatePayload.estimatedMinutes = data.estimatedMinutes;
    if (data.minWords !== undefined) updatePayload.minWords = data.minWords;
    if (data.maxWords !== undefined) updatePayload.maxWords = data.maxWords;
    if (data.minLines !== undefined) updatePayload.minLines = data.minLines;
    if (data.maxLines !== undefined) updatePayload.maxLines = data.maxLines;
    if (data.status !== undefined) updatePayload.status = data.status;

    if (data.instructions !== undefined) {
      const instructionsArray = Array.isArray(data.instructions)
        ? data.instructions
        : typeof data.instructions === 'string'
        ? data.instructions.split('\n').filter((s: string) => s.trim().length > 0)
        : [];
      updatePayload.instructions = instructionsArray;
      updatePayload.instructionsText = Array.isArray(data.instructions) ? data.instructions.join('\n') : data.instructions;
    }

    const [updated] = await db
      .update(essayPrompts)
      .set(updatePayload)
      .where(eq(essayPrompts.id, id))
      .returning();

    if (adminId) {
      await db.insert(auditLogs).values({
        userId: adminId,
        action: 'UPDATE_ESSAY_PROMPT',
        entityType: 'essay_prompts',
        entityId: id,
        details: { changes: Object.keys(updatePayload) },
      });
    }

    return updated;
  }

  /**
   * Publica o tema
   */
  static async publishPrompt(id: string, adminId?: string) {
    return this.updatePrompt(id, { status: 'PUBLISHED', publishedAt: new Date() }, adminId);
  }

  /**
   * Arquiva o tema
   */
  static async archivePrompt(id: string, adminId?: string) {
    return this.updatePrompt(id, { status: 'ARCHIVED', archivedAt: new Date() }, adminId);
  }

  /**
   * Exclui tema se não houver redações submetidas
   */
  static async deletePrompt(id: string, adminId?: string) {
    const essayCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(essays)
      .where(eq(essays.promptId, id));

    const total = Number(essayCount[0]?.count || 0);
    if (total > 0) {
      throw new Error(`Não é possível excluir o tema pois existem ${total} redação(ões) vinculada(s). Recomendamos arquivar.`);
    }

    await db.delete(essayPrompts).where(eq(essayPrompts.id, id));

    if (adminId) {
      await db.insert(auditLogs).values({
        userId: adminId,
        action: 'DELETE_ESSAY_PROMPT',
        entityType: 'essay_prompts',
        entityId: id,
      });
    }

    return { success: true };
  }
}
