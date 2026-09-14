import { db } from '../db';
import {
  questions,
  questionOptions,
  questionAttempts,
  questionFavorites,
  questionReviewFlags,
  subjects,
  topics,
  examBoards,
  contests,
  agencies,
} from '../db/schema';
import { eq, and, desc, asc, inArray, sql, count, or } from 'drizzle-orm';

export interface ListQuestionsFilter {
  contestId?: string;
  subjectId?: string;
  topicId?: string;
  boardId?: string;
  year?: number;
  difficulty?: string;
  format?: string;
  source?: string;
  status?: string;
  search?: string;
  resolutionStatus?: 'all' | 'unanswered' | 'correct' | 'wrong';
  onlyFavorites?: boolean;
  onlyReview?: boolean;
  page?: number;
  limit?: number;
  role?: string;
  userId?: string;
}

export interface CreateQuestionDTO {
  contestId?: string;
  subjectId?: string;
  topicId: string;
  boardId: string;
  originContestId?: string;
  year: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'very_hard';
  format?: 'multiple_choice' | 'true_false';
  statement: string;
  officialExplanation: string;
  source?: 'BANCA_OFICIAL' | 'QUESTAO_AUTORAL' | 'IMPORTADA' | 'DEMO' | 'OUTRA';
  sourceReference?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
  options: {
    letter: string;
    text: string;
    isCorrect: boolean;
    orderIndex?: number;
  }[];
}

export interface UpdateQuestionDTO extends Partial<CreateQuestionDTO> {}

export const QuestionService = {
  /**
   * Lista questões com suporte a paginação, filtros avançados, estado do aluno e RBAC.
   */
  async listQuestions(filters: ListQuestionsFilter) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;
    const isAdmin = filters.role === 'admin';
    const userId = filters.userId;

    const conditions: any[] = [];

    // RBAC: Se não for admin, NUNCA exibe rascunhos nem arquivadas
    if (!isAdmin) {
      conditions.push(eq(questions.status, 'published'));
    } else if (filters.status) {
      conditions.push(eq(questions.status, filters.status));
    } else {
      // Admin por padrão vê publicados e rascunhos, exceto arquivados a menos que explicitamente solicitado
      conditions.push(sql`${questions.status} != 'archived'`);
    }

    if (filters.contestId) {
      conditions.push(eq(questions.contestId, filters.contestId));
    }

    if (filters.subjectId) {
      conditions.push(eq(questions.subjectId, filters.subjectId));
    }

    if (filters.topicId) {
      conditions.push(eq(questions.topicId, filters.topicId));
    }

    if (filters.boardId) {
      conditions.push(eq(questions.boardId, filters.boardId));
    }

    if (filters.year) {
      conditions.push(eq(questions.year, Number(filters.year)));
    }

    if (filters.difficulty) {
      conditions.push(eq(questions.difficulty, filters.difficulty));
    }

    if (filters.format) {
      conditions.push(eq(questions.format, filters.format));
    }

    if (filters.source) {
      conditions.push(eq(questions.source, filters.source));
    }

    if (filters.search && filters.search.trim() !== '') {
      const s = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          sql`${questions.statement} ILIKE ${s}`,
          sql`${questions.sourceReference} ILIKE ${s}`
        )
      );
    }

    // Filtros dependentes de usuário logado
    if (userId) {
      if (filters.onlyFavorites) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${questionFavorites} 
            WHERE ${questionFavorites.questionId} = ${questions.id} 
              AND ${questionFavorites.userId} = ${userId}
          )`
        );
      }

      if (filters.onlyReview) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${questionReviewFlags} 
            WHERE ${questionReviewFlags.questionId} = ${questions.id} 
              AND ${questionReviewFlags.userId} = ${userId}
          )`
        );
      }

      if (filters.resolutionStatus && filters.resolutionStatus !== 'all') {
        if (filters.resolutionStatus === 'unanswered') {
          conditions.push(
            sql`NOT EXISTS (
              SELECT 1 FROM ${questionAttempts} 
              WHERE ${questionAttempts.questionId} = ${questions.id} 
                AND ${questionAttempts.userId} = ${userId}
            )`
          );
        } else if (filters.resolutionStatus === 'correct') {
          conditions.push(
            sql`EXISTS (
              SELECT 1 FROM ${questionAttempts} 
              WHERE ${questionAttempts.questionId} = ${questions.id} 
                AND ${questionAttempts.userId} = ${userId}
                AND ${questionAttempts.isCorrect} = true
            )`
          );
        } else if (filters.resolutionStatus === 'wrong') {
          conditions.push(
            sql`EXISTS (
              SELECT 1 FROM ${questionAttempts} 
              WHERE ${questionAttempts.questionId} = ${questions.id} 
                AND ${questionAttempts.userId} = ${userId}
                AND ${questionAttempts.isCorrect} = false
            )`
          );
        }
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Contagem total
    const [totalRecord] = await db
      .select({ count: count() })
      .from(questions)
      .where(whereClause);

    const total = Number(totalRecord?.count || 0);

    // Busca das questões com joins descritivos
    const rows = await db
      .select({
        id: questions.id,
        contestId: questions.contestId,
        subjectId: questions.subjectId,
        topicId: questions.topicId,
        boardId: questions.boardId,
        originContestId: questions.originContestId,
        year: questions.year,
        difficulty: questions.difficulty,
        format: questions.format,
        statement: questions.statement,
        source: questions.source,
        sourceReference: questions.sourceReference,
        tags: questions.tags,
        status: questions.status,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
        archivedAt: questions.archivedAt,
        topicName: topics.name,
        subjectName: subjects.name,
        subjectColor: subjects.colorToken,
        boardName: examBoards.name,
        boardAcronym: examBoards.acronym,
        contestTitle: contests.title,
        agencyAcronym: agencies.acronym,
      })
      .from(questions)
      .leftJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(subjects, eq(questions.subjectId, subjects.id))
      .leftJoin(examBoards, eq(questions.boardId, examBoards.id))
      .leftJoin(contests, eq(questions.contestId, contests.id))
      .leftJoin(agencies, eq(contests.agencyId, agencies.id))
      .where(whereClause)
      .orderBy(desc(questions.createdAt))
      .limit(limit)
      .offset(offset);

    // Se houver userId, busca status de favoritos, revisão e tentativas para as questões da página
    let userAttemptsMap: Record<string, { isCorrect: boolean; selectedOptionId: string; createdAt: Date }> = {};
    let userFavoritesSet = new Set<string>();
    let userReviewSet = new Set<string>();

    if (userId && rows.length > 0) {
      const qIds = rows.map((r: { id: string }) => r.id);

      const [attempts, favorites, reviews] = await Promise.all([
        db
          .select({
            questionId: questionAttempts.questionId,
            isCorrect: questionAttempts.isCorrect,
            selectedOptionId: questionAttempts.selectedOptionId,
            createdAt: questionAttempts.createdAt,
          })
          .from(questionAttempts)
          .where(
            and(
              eq(questionAttempts.userId, userId),
              inArray(questionAttempts.questionId, qIds)
            )
          )
          .orderBy(desc(questionAttempts.createdAt)),
        db
          .select({ questionId: questionFavorites.questionId })
          .from(questionFavorites)
          .where(
            and(
              eq(questionFavorites.userId, userId),
              inArray(questionFavorites.questionId, qIds)
            )
          ),
        db
          .select({ questionId: questionReviewFlags.questionId })
          .from(questionReviewFlags)
          .where(
            and(
              eq(questionReviewFlags.userId, userId),
              inArray(questionReviewFlags.questionId, qIds)
            )
          ),
      ]);

      attempts.forEach((a: { questionId: string; isCorrect: boolean; selectedOptionId: string; createdAt: Date }) => {
        if (!userAttemptsMap[a.questionId]) {
          userAttemptsMap[a.questionId] = {
            isCorrect: a.isCorrect,
            selectedOptionId: a.selectedOptionId,
            createdAt: a.createdAt,
          };
        }
      });

      favorites.forEach((f: { questionId: string }) => userFavoritesSet.add(f.questionId));
      reviews.forEach((r: { questionId: string }) => userReviewSet.add(r.questionId));
    }

    const items = rows.map((q: any) => ({
      ...q,
      isFavorited: userId ? userFavoritesSet.has(q.id) : false,
      isMarkedForReview: userId ? userReviewSet.has(q.id) : false,
      userAttempt: userId ? userAttemptsMap[q.id] || null : null,
    }));

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Obtém uma questão detalhada por ID, com opções e proteção anti-cheat.
   */
  async getQuestionById(id: string, userId?: string, role?: string) {
    const isAdmin = role === 'admin';

    const [question] = await db
      .select({
        id: questions.id,
        contestId: questions.contestId,
        subjectId: questions.subjectId,
        topicId: questions.topicId,
        boardId: questions.boardId,
        originContestId: questions.originContestId,
        year: questions.year,
        difficulty: questions.difficulty,
        format: questions.format,
        statement: questions.statement,
        officialExplanation: questions.officialExplanation,
        source: questions.source,
        sourceReference: questions.sourceReference,
        tags: questions.tags,
        status: questions.status,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
        archivedAt: questions.archivedAt,
        topicName: topics.name,
        subjectName: subjects.name,
        subjectColor: subjects.colorToken,
        boardName: examBoards.name,
        boardAcronym: examBoards.acronym,
        contestTitle: contests.title,
        agencyAcronym: agencies.acronym,
      })
      .from(questions)
      .leftJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(subjects, eq(questions.subjectId, subjects.id))
      .leftJoin(examBoards, eq(questions.boardId, examBoards.id))
      .leftJoin(contests, eq(questions.contestId, contests.id))
      .leftJoin(agencies, eq(contests.agencyId, agencies.id))
      .where(eq(questions.id, id));

    if (!question) {
      throw new Error('QUESTAO_NOT_FOUND');
    }

    // RBAC: Alunos não podem ver rascunhos nem arquivadas
    if (!isAdmin && question.status !== 'published') {
      throw new Error('QUESTAO_NOT_FOUND');
    }

    // Busca as opções ordenadas
    const rawOptions = await db
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.questionId, id))
      .orderBy(asc(questionOptions.orderIndex), asc(questionOptions.letter));

    // Busca interações do usuário (tentativas, favorito, revisão)
    let userAttemptsList: any[] = [];
    let isFavorited = false;
    let isMarkedForReview = false;

    if (userId) {
      const [attempts, favorite, review] = await Promise.all([
        db
          .select()
          .from(questionAttempts)
          .where(
            and(
              eq(questionAttempts.userId, userId),
              eq(questionAttempts.questionId, id)
            )
          )
          .orderBy(desc(questionAttempts.createdAt)),
        db
          .select()
          .from(questionFavorites)
          .where(
            and(
              eq(questionFavorites.userId, userId),
              eq(questionFavorites.questionId, id)
            )
          ),
        db
          .select()
          .from(questionReviewFlags)
          .where(
            and(
              eq(questionReviewFlags.userId, userId),
              eq(questionReviewFlags.questionId, id)
            )
          ),
      ]);

      userAttemptsList = attempts;
      isFavorited = favorite.length > 0;
      isMarkedForReview = review.length > 0;
    }

    const hasAttempted = userAttemptsList.length > 0;

    // ANTI-CHEAT PEDAGÓGICO:
    // Se o usuário for admin OU já tiver respondido pelo menos uma vez, revelamos o gabarito e a explicação.
    // Caso contrário, omitimos isCorrect e ocultamos a explicação oficial.
    const canViewAnswers = isAdmin || hasAttempted;

    const options = rawOptions.map((opt: any) => ({
      id: opt.id,
      letter: opt.letter,
      text: opt.text,
      orderIndex: opt.orderIndex,
      isCorrect: canViewAnswers ? opt.isCorrect : undefined,
    }));

    return {
      ...question,
      officialExplanation: canViewAnswers ? question.officialExplanation : null,
      options,
      hasAttempted,
      isFavorited,
      isMarkedForReview,
      userAttempts: userAttemptsList,
      latestAttempt: userAttemptsList[0] || null,
    };
  },

  /**
   * Criação de nova questão com validação estrita (Apenas Admin).
   */
  async createQuestion(data: CreateQuestionDTO, userId: string) {
    if (!data.statement || data.statement.trim() === '') {
      throw new Error('STATEMENT_REQUIRED');
    }
    if (!data.officialExplanation || data.officialExplanation.trim() === '') {
      throw new Error('EXPLANATION_REQUIRED');
    }
    if (!data.topicId) {
      throw new Error('TOPIC_REQUIRED');
    }
    if (!data.boardId) {
      throw new Error('BOARD_REQUIRED');
    }
    if (!data.year || data.year < 1990 || data.year > 2050) {
      throw new Error('INVALID_YEAR');
    }
    if (!data.options || data.options.length < 2) {
      throw new Error('MINIMUM_TWO_OPTIONS_REQUIRED');
    }

    const correctCount = data.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      throw new Error('EXACTLY_ONE_CORRECT_OPTION_REQUIRED');
    }

    // Se subjectId não for fornecido explicitamente, tenta inferir a partir do topic
    let resolvedSubjectId = data.subjectId;
    if (!resolvedSubjectId) {
      const [topic] = await db
        .select({ subjectId: topics.subjectId })
        .from(topics)
        .where(eq(topics.id, data.topicId));
      if (topic) {
        resolvedSubjectId = topic.subjectId;
      }
    }

    let createdQuestion: any;

    await db.transaction(async (tx: any) => {
      const [q] = await tx
        .insert(questions)
        .values({
          contestId: data.contestId || null,
          subjectId: resolvedSubjectId || null,
          topicId: data.topicId,
          boardId: data.boardId,
          originContestId: data.originContestId || null,
          year: data.year,
          difficulty: data.difficulty || 'medium',
          format: data.format || 'multiple_choice',
          statement: data.statement.trim(),
          officialExplanation: data.officialExplanation.trim(),
          source: data.source || 'BANCA_OFICIAL',
          sourceReference: data.sourceReference?.trim() || null,
          tags: data.tags || [],
          status: data.status || 'published',
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      createdQuestion = q;

      const optionsToInsert = data.options.map((opt, index) => ({
        questionId: q.id,
        letter: opt.letter.toUpperCase().trim(),
        text: opt.text.trim(),
        isCorrect: opt.isCorrect,
        orderIndex: opt.orderIndex ?? index + 1,
      }));

      await tx.insert(questionOptions).values(optionsToInsert);
    });

    return this.getQuestionById(createdQuestion.id, userId, 'admin');
  },

  /**
   * Atualização completa ou parcial de questão (Apenas Admin).
   */
  async updateQuestion(id: string, data: UpdateQuestionDTO, userId: string) {
    const [existing] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id));

    if (!existing) {
      throw new Error('QUESTAO_NOT_FOUND');
    }

    if (data.options) {
      if (data.options.length < 2) {
        throw new Error('MINIMUM_TWO_OPTIONS_REQUIRED');
      }
      const correctCount = data.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        throw new Error('EXACTLY_ONE_CORRECT_OPTION_REQUIRED');
      }
    }

    await db.transaction(async (tx: any) => {
      const updatePayload: any = {
        updatedBy: userId,
        updatedAt: new Date(),
      };

      if (data.contestId !== undefined) updatePayload.contestId = data.contestId || null;
      if (data.subjectId !== undefined) updatePayload.subjectId = data.subjectId || null;
      if (data.topicId) updatePayload.topicId = data.topicId;
      if (data.boardId) updatePayload.boardId = data.boardId;
      if (data.originContestId !== undefined) updatePayload.originContestId = data.originContestId || null;
      if (data.year) updatePayload.year = data.year;
      if (data.difficulty) updatePayload.difficulty = data.difficulty;
      if (data.format) updatePayload.format = data.format;
      if (data.statement) updatePayload.statement = data.statement.trim();
      if (data.officialExplanation) updatePayload.officialExplanation = data.officialExplanation.trim();
      if (data.source) updatePayload.source = data.source;
      if (data.sourceReference !== undefined) updatePayload.sourceReference = data.sourceReference?.trim() || null;
      if (data.tags) updatePayload.tags = data.tags;
      if (data.status) updatePayload.status = data.status;

      await tx.update(questions).set(updatePayload).where(eq(questions.id, id));

      if (data.options) {
        // Substitui todas as opções
        await tx.delete(questionOptions).where(eq(questionOptions.questionId, id));
        const optionsToInsert = data.options.map((opt, index) => ({
          questionId: id,
          letter: opt.letter.toUpperCase().trim(),
          text: opt.text.trim(),
          isCorrect: opt.isCorrect,
          orderIndex: opt.orderIndex ?? index + 1,
        }));
        await tx.insert(questionOptions).values(optionsToInsert);
      }
    });

    return this.getQuestionById(id, userId, 'admin');
  },

  /**
   * Duplica questão existente, gerando uma cópia em rascunho com ID novo (Apenas Admin).
   */
  async duplicateQuestion(id: string, userId: string) {
    const [original] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id));

    if (!original) {
      throw new Error('QUESTAO_NOT_FOUND');
    }

    const originalOptions = await db
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.questionId, id))
      .orderBy(asc(questionOptions.orderIndex));

    let newQuestion: any;

    await db.transaction(async (tx: any) => {
      const [copied] = await tx
        .insert(questions)
        .values({
          contestId: original.contestId,
          subjectId: original.subjectId,
          topicId: original.topicId,
          boardId: original.boardId,
          originContestId: original.originContestId,
          year: original.year,
          difficulty: original.difficulty,
          format: original.format,
          statement: `${original.statement} (Cópia)`,
          officialExplanation: original.officialExplanation,
          source: original.source,
          sourceReference: original.sourceReference ? `${original.sourceReference} (Cópia)` : null,
          tags: original.tags,
          status: 'draft', // Sempre rascunho na duplicação
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      newQuestion = copied;

      if (originalOptions.length > 0) {
        const optionsToInsert = originalOptions.map((opt: any) => ({
          questionId: copied.id,
          letter: opt.letter,
          text: opt.text,
          isCorrect: opt.isCorrect,
          orderIndex: opt.orderIndex,
        }));

        await tx.insert(questionOptions).values(optionsToInsert);
      }
    });

    return this.getQuestionById(newQuestion.id, userId, 'admin');
  },

  /**
   * Alterna publicação da questão (draft <-> published).
   */
  async togglePublish(id: string, userId: string) {
    const [q] = await db.select().from(questions).where(eq(questions.id, id));
    if (!q) {
      throw new Error('QUESTAO_NOT_FOUND');
    }

    const nextStatus = q.status === 'published' ? 'draft' : 'published';

    await db
      .update(questions)
      .set({
        status: nextStatus,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(questions.id, id));

    return { id, status: nextStatus };
  },

  /**
   * Arquivamento lógico (soft-delete) de questão.
   */
  async archiveQuestion(id: string, userId: string) {
    const [q] = await db.select().from(questions).where(eq(questions.id, id));
    if (!q) {
      throw new Error('QUESTAO_NOT_FOUND');
    }

    await db
      .update(questions)
      .set({
        status: 'archived',
        archivedAt: new Date(),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(questions.id, id));

    return { id, status: 'archived' };
  },
};
