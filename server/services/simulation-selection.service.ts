import { db } from '../db';
import {
  questions,
  questionAttempts,
  simulationAnswers,
  questionReviewFlags,
} from '../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

export interface SelectionFilters {
  contestId?: string;
  subjectIds?: string[];
  topicIds?: string[];
  boardId?: string;
  difficulty?: string; // 'facil' | 'medio' | 'dificil' | 'misto' | 'easy' | 'medium' | 'hard'
  yearMin?: number;
  yearMax?: number;
}

export class SimulationQuestionSelectionService {
  /**
   * Constrói as condições WHERE básicas para buscar questões válidas e publicadas.
   */
  private static buildBaseConditions(filters: SelectionFilters) {
    const conditions: any[] = [eq(questions.status, 'published')];

    if (filters.contestId) {
      conditions.push(
        sql`(${questions.contestId} = ${filters.contestId} OR ${questions.contestId} IS NULL OR ${questions.subjectId} IN (SELECT subject_id FROM contest_subjects WHERE contest_id = ${filters.contestId}))`
      );
    }

    if (filters.subjectIds && filters.subjectIds.length > 0) {
      conditions.push(inArray(questions.subjectId, filters.subjectIds));
    }

    if (filters.topicIds && filters.topicIds.length > 0) {
      conditions.push(inArray(questions.topicId, filters.topicIds));
    }

    if (filters.boardId) {
      conditions.push(eq(questions.boardId, filters.boardId));
    }

    if (filters.difficulty && filters.difficulty.toLowerCase() !== 'misto' && filters.difficulty.toLowerCase() !== 'all') {
      const diffNorm = filters.difficulty.toLowerCase();
      const mapped = diffNorm === 'facil' ? 'easy' : diffNorm === 'medio' ? 'medium' : diffNorm === 'dificil' ? 'hard' : diffNorm;
      conditions.push(sql`LOWER(${questions.difficulty}) IN (${mapped}, ${diffNorm})`);
    }

    if (filters.yearMin) {
      conditions.push(sql`${questions.year} >= ${filters.yearMin}`);
    }

    if (filters.yearMax) {
      conditions.push(sql`${questions.year} <= ${filters.yearMax}`);
    }

    return conditions;
  }

  /**
   * Conta a quantidade total de questões publicadas disponíveis para os filtros dados.
   * Utilizado para validação prévia de disponibilidade antes de gerar o simulado.
   */
  static async countAvailableQuestions(filters: SelectionFilters): Promise<number> {
    const conditions = this.buildBaseConditions(filters);
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questions)
      .where(and(...conditions));

    return result?.count || 0;
  }

  /**
   * Seleciona questões aplicando o algoritmo anti-repetição:
   * Prioridade:
   * 1. Questões nunca respondidas pelo aluno
   * 2. Questões respondidas incorretamente anteriormente
   * 3. Questões marcadas para revisão pelo aluno
   * 4. Demais questões disponíveis (já acertadas)
   */
  static async selectQuestions(
    filters: SelectionFilters,
    requestedCount: number,
    userId?: string
  ): Promise<string[]> {
    const conditions = this.buildBaseConditions(filters);

    // Busca todas as questões elegíveis com seus IDs
    const eligibleQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(...conditions));

    if (eligibleQuestions.length === 0) {
      return [];
    }

    const allIds: string[] = eligibleQuestions.map((q: any) => String(q.id));

    // Se não houver usuário logado (ex: seed ou admin), faz shuffle aleatório direto
    if (!userId) {
      return this.shuffle(allIds).slice(0, requestedCount);
    }

    // 1. Identifica questões já respondidas pelo aluno (no banco geral ou em simulados)
    const directAttempts = await db
      .select({ questionId: questionAttempts.questionId, isCorrect: questionAttempts.isCorrect })
      .from(questionAttempts)
      .where(and(eq(questionAttempts.userId, userId), inArray(questionAttempts.questionId, allIds)));

    const simAnswers = await db
      .select({ questionId: simulationAnswers.questionId, isCorrect: simulationAnswers.isCorrect })
      .from(simulationAnswers)
      .innerJoin(
        sql`simulation_attempts`,
        sql`${simulationAnswers.simulationAttemptId} = simulation_attempts.id AND simulation_attempts.user_id = ${userId}`
      )
      .where(inArray(simulationAnswers.questionId, allIds));

    // Combina histórico
    const answeredMap = new Map<string, { total: number; wrong: number }>();
    for (const a of directAttempts) {
      const cur = answeredMap.get(a.questionId) || { total: 0, wrong: 0 };
      cur.total++;
      if (!a.isCorrect) cur.wrong++;
      answeredMap.set(a.questionId, cur);
    }
    for (const a of simAnswers) {
      const cur = answeredMap.get(a.questionId) || { total: 0, wrong: 0 };
      cur.total++;
      if (!a.isCorrect) cur.wrong++;
      answeredMap.set(a.questionId, cur);
    }

    // Busca questões marcadas para revisão
    const reviewFlags = await db
      .select({ questionId: questionReviewFlags.questionId })
      .from(questionReviewFlags)
      .where(and(eq(questionReviewFlags.userId, userId), inArray(questionReviewFlags.questionId, allIds)));
    const reviewSet = new Set(reviewFlags.map((r: any) => r.questionId));

    // Separa em 4 tiers de prioridade:
    const tier1NeverAnswered: string[] = [];
    const tier2WrongAnswers: string[] = [];
    const tier3ReviewFlagged: string[] = [];
    const tier4OtherAnswered: string[] = [];

    for (const qId of allIds) {
      const stats = answeredMap.get(qId);
      const isReview = reviewSet.has(qId);

      if (!stats || stats.total === 0) {
        tier1NeverAnswered.push(qId);
      } else if (stats.wrong > 0) {
        tier2WrongAnswers.push(qId);
      } else if (isReview) {
        tier3ReviewFlagged.push(qId);
      } else {
        tier4OtherAnswered.push(qId);
      }
    }

    // Embaralha dentro de cada tier para manter variedade
    const shuffled1 = this.shuffle(tier1NeverAnswered);
    const shuffled2 = this.shuffle(tier2WrongAnswers);
    const shuffled3 = this.shuffle(tier3ReviewFlagged);
    const shuffled4 = this.shuffle(tier4OtherAnswered);

    const orderedPool = [...shuffled1, ...shuffled2, ...shuffled3, ...shuffled4];
    return orderedPool.slice(0, requestedCount);
  }

  private static shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
