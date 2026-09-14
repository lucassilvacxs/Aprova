import { db } from '../db';
import {
  questions,
  questionAttempts,
  questionReviewFlags,
  userSubjectProgress,
  subjects,
  topics,
  examBoards,
} from '../db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';

export interface RecommendedQuestionItem {
  id: string;
  statement: string;
  year: number;
  difficulty: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  topicName: string | null;
  boardAcronym: string | null;
  recommendationReason: string;
  priorityScore: number;
}

export const QuestionRecommendationService = {
  /**
   * Recomenda questões de estudo de forma puramente algorítmica e determinística
   * com base nas fraquezas reais e no comportamento do aluno.
   */
  async getRecommendations(userId: string, contestId?: string, limit: number = 5): Promise<RecommendedQuestionItem[]> {
    const recommendedList: RecommendedQuestionItem[] = [];
    const usedQuestionIds = new Set<string>();

    // 1. Prioridade 1: Questões explicitamente marcadas para revisão pelo aluno
    const reviewFlaggedQuestions = await db
      .select({
        id: questions.id,
        statement: questions.statement,
        year: questions.year,
        difficulty: questions.difficulty,
        subjectId: questions.subjectId,
        subjectName: subjects.name,
        subjectColor: subjects.colorToken,
        topicName: topics.name,
        boardAcronym: examBoards.acronym,
      })
      .from(questionReviewFlags)
      .innerJoin(questions, eq(questionReviewFlags.questionId, questions.id))
      .leftJoin(subjects, eq(questions.subjectId, subjects.id))
      .leftJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(examBoards, eq(questions.boardId, examBoards.id))
      .where(
        and(
          eq(questionReviewFlags.userId, userId),
          eq(questions.status, 'published'),
          contestId ? eq(questions.contestId, contestId) : sql`true`
        )
      )
      .limit(limit);

    for (const q of reviewFlaggedQuestions) {
      if (!usedQuestionIds.has(q.id) && recommendedList.length < limit) {
        usedQuestionIds.add(q.id);
        recommendedList.push({
          ...q,
          recommendationReason: 'Questão sinalizada manualmente para revisão periódica.',
          priorityScore: 100,
        });
      }
    }

    // 2. Prioridade 2: Questões erradas na última tentativa pelo aluno (para re-fixação)
    if (recommendedList.length < limit) {
      const recentWrongAttempts = await db
        .select({
          id: questions.id,
          statement: questions.statement,
          year: questions.year,
          difficulty: questions.difficulty,
          subjectId: questions.subjectId,
          subjectName: subjects.name,
          subjectColor: subjects.colorToken,
          topicName: topics.name,
          boardAcronym: examBoards.acronym,
        })
        .from(questionAttempts)
        .innerJoin(questions, eq(questionAttempts.questionId, questions.id))
        .leftJoin(subjects, eq(questions.subjectId, subjects.id))
        .leftJoin(topics, eq(questions.topicId, topics.id))
        .leftJoin(examBoards, eq(questions.boardId, examBoards.id))
        .where(
          and(
            eq(questionAttempts.userId, userId),
            eq(questionAttempts.isCorrect, false),
            eq(questions.status, 'published'),
            contestId ? eq(questions.contestId, contestId) : sql`true`
          )
        )
        .orderBy(desc(questionAttempts.createdAt))
        .limit(limit * 2);

      for (const q of recentWrongAttempts) {
        if (!usedQuestionIds.has(q.id) && recommendedList.length < limit) {
          usedQuestionIds.add(q.id);
          recommendedList.push({
            ...q,
            recommendationReason: 'Você errou esta questão anteriormente. Tente novamente para fixar o conceito.',
            priorityScore: 85,
          });
        }
      }
    }

    // 3. Prioridade 3: Questões inéditas nas disciplinas com pior taxa de acerto (< 70%)
    if (recommendedList.length < limit) {
      const weakDisciplines = await db
        .select({
          subjectId: userSubjectProgress.subjectId,
          accuracy: userSubjectProgress.accuracyPercentage,
        })
        .from(userSubjectProgress)
        .where(
          and(
            eq(userSubjectProgress.userId, userId),
            contestId ? eq(userSubjectProgress.contestId, contestId) : sql`true`
          )
        )
        .orderBy(userSubjectProgress.accuracyPercentage)
        .limit(3);

      const weakSubjectIds = weakDisciplines.map((d: { subjectId: string }) => d.subjectId);

      if (weakSubjectIds.length > 0) {
        const weakSubjectQuestions = await db
          .select({
            id: questions.id,
            statement: questions.statement,
            year: questions.year,
            difficulty: questions.difficulty,
            subjectId: questions.subjectId,
            subjectName: subjects.name,
            subjectColor: subjects.colorToken,
            topicName: topics.name,
            boardAcronym: examBoards.acronym,
          })
          .from(questions)
          .leftJoin(subjects, eq(questions.subjectId, subjects.id))
          .leftJoin(topics, eq(questions.topicId, topics.id))
          .leftJoin(examBoards, eq(questions.boardId, examBoards.id))
          .where(
            and(
              eq(questions.status, 'published'),
              inArray(questions.subjectId, weakSubjectIds),
              sql`NOT EXISTS (
                SELECT 1 FROM ${questionAttempts}
                WHERE ${questionAttempts.questionId} = ${questions.id}
                  AND ${questionAttempts.userId} = ${userId}
              )`
            )
          )
          .limit(limit);

        for (const q of weakSubjectQuestions) {
          if (!usedQuestionIds.has(q.id) && recommendedList.length < limit) {
            usedQuestionIds.add(q.id);
            recommendedList.push({
              ...q,
              recommendationReason: 'Disciplina com menor rendimento no seu histórico. Treine para elevar a pontuação.',
              priorityScore: 70,
            });
          }
        }
      }
    }

    // 4. Fallback: Questões inéditas gerais publicadas
    if (recommendedList.length < limit) {
      const fallbackQuestions = await db
        .select({
          id: questions.id,
          statement: questions.statement,
          year: questions.year,
          difficulty: questions.difficulty,
          subjectId: questions.subjectId,
          subjectName: subjects.name,
          subjectColor: subjects.colorToken,
          topicName: topics.name,
          boardAcronym: examBoards.acronym,
        })
        .from(questions)
        .leftJoin(subjects, eq(questions.subjectId, subjects.id))
        .leftJoin(topics, eq(questions.topicId, topics.id))
        .leftJoin(examBoards, eq(questions.boardId, examBoards.id))
        .where(
          and(
            eq(questions.status, 'published'),
            contestId ? eq(questions.contestId, contestId) : sql`true`,
            sql`NOT EXISTS (
              SELECT 1 FROM ${questionAttempts}
              WHERE ${questionAttempts.questionId} = ${questions.id}
                AND ${questionAttempts.userId} = ${userId}
            )`
          )
        )
        .limit(limit);

      for (const q of fallbackQuestions) {
        if (!usedQuestionIds.has(q.id) && recommendedList.length < limit) {
          usedQuestionIds.add(q.id);
          recommendedList.push({
            ...q,
            recommendationReason: 'Questão inédita recomendada para expandir seu repertório de treino.',
            priorityScore: 50,
          });
        }
      }
    }

    return recommendedList;
  },
};
