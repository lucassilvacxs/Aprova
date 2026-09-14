import { db } from '../db';
import {
  questions,
  questionOptions,
  questionAttempts,
  userProgress,
  userSubjectProgress,
  subjects,
  topics,
  examBoards,
} from '../db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';

export interface SubmitAttemptDTO {
  questionId: string;
  selectedOptionId: string;
  durationSeconds?: number;
  source?: string;
}

export interface ListAttemptsFilter {
  contestId?: string;
  subjectId?: string;
  isCorrect?: boolean;
  page?: number;
  limit?: number;
}

export const QuestionAttemptService = {
  /**
   * Registra a resolução de uma questão pelo aluno, calcula acerto/erro,
   * atualiza o progresso global e por disciplina, e revela o gabarito.
   */
  async submitAttempt(userId: string, data: SubmitAttemptDTO) {
    if (!data.questionId) {
      throw new Error('QUESTION_ID_REQUIRED');
    }
    if (!data.selectedOptionId) {
      throw new Error('OPTION_ID_REQUIRED');
    }

    // 1. Busca a questão com suas opções
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, data.questionId));

    if (!question) {
      throw new Error('QUESTAO_NOT_FOUND');
    }

    const options = await db
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.questionId, data.questionId));

    const selectedOption = options.find((o: { id: string; isCorrect: boolean }) => o.id === data.selectedOptionId);
    if (!selectedOption) {
      throw new Error('OPTION_NOT_FOUND');
    }

    const correctOption = options.find((o: { isCorrect: boolean }) => o.isCorrect);
    if (!correctOption) {
      throw new Error('CORRECT_OPTION_NOT_CONFIGURED');
    }

    const isCorrect = selectedOption.isCorrect;
    const durationSeconds = Math.max(0, Number(data.durationSeconds) || 0);

    let createdAttemptId = '';

    await db.transaction(async (tx: any) => {
      // 2. Grava a tentativa no banco
      const [attempt] = await tx
        .insert(questionAttempts)
        .values({
          userId,
          questionId: question.id,
          selectedOptionId: selectedOption.id,
          isCorrect,
          durationSeconds,
          source: data.source || 'direct_practice',
        })
        .returning();

      createdAttemptId = attempt.id;

      // 3. Atualiza progresso da disciplina (userSubjectProgress)
      if (question.subjectId) {
        const [subjectProg] = await tx
          .select()
          .from(userSubjectProgress)
          .where(
            and(
              eq(userSubjectProgress.userId, userId),
              eq(userSubjectProgress.subjectId, question.subjectId)
            )
          );

        if (subjectProg) {
          const newAnswered = subjectProg.questionsAnswered + 1;
          const newCorrect = subjectProg.correctCount + (isCorrect ? 1 : 0);
          const newWrong = subjectProg.wrongCount + (isCorrect ? 0 : 1);
          const newAccuracy = newAnswered > 0 ? ((newCorrect / newAnswered) * 100).toFixed(2) : '0.00';

          await tx
            .update(userSubjectProgress)
            .set({
              questionsAnswered: newAnswered,
              correctCount: newCorrect,
              wrongCount: newWrong,
              accuracyPercentage: newAccuracy,
              lastStudiedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(userSubjectProgress.id, subjectProg.id));
        } else {
          const newAnswered = 1;
          const newCorrect = isCorrect ? 1 : 0;
          const newWrong = isCorrect ? 0 : 1;
          const newAccuracy = (newCorrect * 100).toFixed(2);

          await tx.insert(userSubjectProgress).values({
            userId,
            subjectId: question.subjectId,
            contestId: question.contestId || null,
            questionsAnswered: newAnswered,
            correctCount: newCorrect,
            wrongCount: newWrong,
            accuracyPercentage: newAccuracy,
            lastStudiedAt: new Date(),
          });
        }
      }

      // 4. Atualiza progresso global do concurso (userProgress)
      if (question.contestId) {
        const [prog] = await tx
          .select()
          .from(userProgress)
          .where(
            and(
              eq(userProgress.userId, userId),
              eq(userProgress.contestId, question.contestId)
            )
          );

        if (prog) {
          const newAnswered = prog.questionsAnswered + 1;
          const newCorrect = prog.correctQuestionsCount + (isCorrect ? 1 : 0);
          const newWrong = prog.wrongQuestionsCount + (isCorrect ? 0 : 1);
          const newPercentage = newAnswered > 0 ? ((newCorrect / newAnswered) * 100).toFixed(2) : '0.00';

          await tx
            .update(userProgress)
            .set({
              questionsAnswered: newAnswered,
              correctQuestionsCount: newCorrect,
              wrongQuestionsCount: newWrong,
              overallPercentage: newPercentage,
              lastActivityAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(userProgress.id, prog.id));
        } else {
          await tx.insert(userProgress).values({
            userId,
            contestId: question.contestId,
            questionsAnswered: 1,
            correctQuestionsCount: isCorrect ? 1 : 0,
            wrongQuestionsCount: isCorrect ? 0 : 1,
            overallPercentage: isCorrect ? '100.00' : '0.00',
            lastActivityAt: new Date(),
          });
        }
      }
    });

    return {
      attemptId: createdAttemptId,
      isCorrect,
      selectedOptionId: selectedOption.id,
      correctOptionId: correctOption.id,
      explanation: question.officialExplanation,
    };
  },

  /**
   * Histórico detalhado de resoluções do usuário com paginação e filtros.
   */
  async getUserAttemptHistory(userId: string, filters: ListAttemptsFilter = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(questionAttempts.userId, userId)];

    if (filters.isCorrect !== undefined) {
      conditions.push(eq(questionAttempts.isCorrect, filters.isCorrect));
    }

    if (filters.subjectId) {
      conditions.push(eq(questions.subjectId, filters.subjectId));
    }

    if (filters.contestId) {
      conditions.push(eq(questions.contestId, filters.contestId));
    }

    const whereClause = and(...conditions);

    const [totalRecord] = await db
      .select({ count: count() })
      .from(questionAttempts)
      .innerJoin(questions, eq(questionAttempts.questionId, questions.id))
      .where(whereClause);

    const total = Number(totalRecord?.count || 0);

    const rows = await db
      .select({
        id: questionAttempts.id,
        questionId: questionAttempts.questionId,
        selectedOptionId: questionAttempts.selectedOptionId,
        isCorrect: questionAttempts.isCorrect,
        durationSeconds: questionAttempts.durationSeconds,
        source: questionAttempts.source,
        createdAt: questionAttempts.createdAt,
        statement: questions.statement,
        year: questions.year,
        difficulty: questions.difficulty,
        subjectId: questions.subjectId,
        subjectName: subjects.name,
        subjectColor: subjects.colorToken,
        topicName: topics.name,
        boardName: examBoards.name,
        boardAcronym: examBoards.acronym,
      })
      .from(questionAttempts)
      .innerJoin(questions, eq(questionAttempts.questionId, questions.id))
      .leftJoin(subjects, eq(questions.subjectId, subjects.id))
      .leftJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(examBoards, eq(questions.boardId, examBoards.id))
      .where(whereClause)
      .orderBy(desc(questionAttempts.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Estatísticas reais consolidadas de resolução de questões do usuário.
   */
  async getUserQuestionStats(userId: string, contestId?: string) {
    // 1. Resumo geral
    const [overall] = await db
      .select({
        totalAnswered: count(),
        totalCorrect: sql<number>`count(*) filter (where ${questionAttempts.isCorrect} = true)`,
        totalWrong: sql<number>`count(*) filter (where ${questionAttempts.isCorrect} = false)`,
        avgDurationSec: sql<number>`coalesce(avg(${questionAttempts.durationSeconds}), 0)`,
      })
      .from(questionAttempts)
      .innerJoin(questions, eq(questionAttempts.questionId, questions.id))
      .where(
        contestId
          ? and(eq(questionAttempts.userId, userId), eq(questions.contestId, contestId))
          : eq(questionAttempts.userId, userId)
      );

    const totalAnswered = Number(overall?.totalAnswered || 0);
    const totalCorrect = Number(overall?.totalCorrect || 0);
    const totalWrong = Number(overall?.totalWrong || 0);
    const accuracy = totalAnswered > 0 ? Number(((totalCorrect / totalAnswered) * 100).toFixed(1)) : 0;
    const avgDurationSec = Math.round(Number(overall?.avgDurationSec || 0));

    // 2. Desempenho por Disciplina
    const subjectStats = await db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        colorToken: subjects.colorToken,
        answered: count(),
        correct: sql<number>`count(*) filter (where ${questionAttempts.isCorrect} = true)`,
        wrong: sql<number>`count(*) filter (where ${questionAttempts.isCorrect} = false)`,
      })
      .from(questionAttempts)
      .innerJoin(questions, eq(questionAttempts.questionId, questions.id))
      .innerJoin(subjects, eq(questions.subjectId, subjects.id))
      .where(
        contestId
          ? and(eq(questionAttempts.userId, userId), eq(questions.contestId, contestId))
          : eq(questionAttempts.userId, userId)
      )
      .groupBy(subjects.id, subjects.name, subjects.colorToken);

    const bySubject = subjectStats.map((s: any) => {
      const ans = Number(s.answered);
      const cor = Number(s.correct);
      return {
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        colorToken: s.colorToken,
        answered: ans,
        correct: cor,
        wrong: Number(s.wrong),
        accuracy: ans > 0 ? Number(((cor / ans) * 100).toFixed(1)) : 0,
      };
    });

    // 3. Desempenho por Dificuldade
    const difficultyStats = await db
      .select({
        difficulty: questions.difficulty,
        answered: count(),
        correct: sql<number>`count(*) filter (where ${questionAttempts.isCorrect} = true)`,
      })
      .from(questionAttempts)
      .innerJoin(questions, eq(questionAttempts.questionId, questions.id))
      .where(
        contestId
          ? and(eq(questionAttempts.userId, userId), eq(questions.contestId, contestId))
          : eq(questionAttempts.userId, userId)
      )
      .groupBy(questions.difficulty);

    const byDifficulty = difficultyStats.map((d: any) => {
      const ans = Number(d.answered);
      const cor = Number(d.correct);
      return {
        difficulty: d.difficulty,
        answered: ans,
        correct: cor,
        accuracy: ans > 0 ? Number(((cor / ans) * 100).toFixed(1)) : 0,
      };
    });

    // 4. Desempenho por Banca
    const boardStats = await db
      .select({
        boardId: examBoards.id,
        boardAcronym: examBoards.acronym,
        boardName: examBoards.name,
        answered: count(),
        correct: sql<number>`count(*) filter (where ${questionAttempts.isCorrect} = true)`,
      })
      .from(questionAttempts)
      .innerJoin(questions, eq(questionAttempts.questionId, questions.id))
      .innerJoin(examBoards, eq(questions.boardId, examBoards.id))
      .where(
        contestId
          ? and(eq(questionAttempts.userId, userId), eq(questions.contestId, contestId))
          : eq(questionAttempts.userId, userId)
      )
      .groupBy(examBoards.id, examBoards.acronym, examBoards.name);

    const byBoard = boardStats.map((b: any) => {
      const ans = Number(b.answered);
      const cor = Number(b.correct);
      return {
        boardId: b.boardId,
        boardAcronym: b.boardAcronym,
        boardName: b.boardName,
        answered: ans,
        correct: cor,
        accuracy: ans > 0 ? Number(((cor / ans) * 100).toFixed(1)) : 0,
      };
    });

    return {
      overall: {
        totalAnswered,
        totalCorrect,
        totalWrong,
        accuracy,
        avgDurationSec,
      },
      bySubject,
      byDifficulty,
      byBoard,
    };
  },
};
