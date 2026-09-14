import { db } from '../db';
import {
  simulations,
  simulationQuestions,
  simulationAttempts,
  simulationAnswers,
  questions,
  questionOptions,
  subjects,
  topics,
  examBoards,
  userProgress,
  contests,
  agencies,
} from '../db/schema';
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm';
import { SimulationScoringService } from './simulation-scoring.service';
import { SimulationQuestionSelectionService } from './simulation-selection.service';

export class SimulationAttemptService {
  /**
   * Inicia ou retoma uma tentativa de simulado.
   */
  static async startAttempt(simulationId: string, userId: string) {
    const [sim] = await db.select().from(simulations).where(eq(simulations.id, simulationId));
    if (!sim) {
      throw new Error('Simulado não encontrado.');
    }

    if (sim.status !== 'published' && sim.createdBy !== userId) {
      throw new Error('Este simulado não está disponível para realização.');
    }

    // Se for simulado do tipo RANDOM e ainda não tiver questões inseridas, gera agora
    const existingQuestions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(simulationQuestions)
      .where(eq(simulationQuestions.simulationId, simulationId));

    if (existingQuestions[0]?.count === 0 && sim.type === 'RANDOM') {
      const filters = (sim.filterConfig as any) || { contestId: sim.contestId };
      const selectedIds = await SimulationQuestionSelectionService.selectQuestions(
        filters,
        sim.totalQuestions || 30,
        userId
      );
      for (let i = 0; i < selectedIds.length; i++) {
        await db.insert(simulationQuestions).values({
          simulationId: sim.id,
          questionId: selectedIds[i],
          orderIndex: i + 1,
          points: '1.00',
        });
      }
    }

    // Verifica se já existe uma tentativa ativa (IN_PROGRESS) para o usuário
    const [activeAttempt] = await db
      .select()
      .from(simulationAttempts)
      .where(
        and(
          eq(simulationAttempts.simulationId, simulationId),
          eq(simulationAttempts.userId, userId),
          eq(simulationAttempts.status, 'IN_PROGRESS')
        )
      )
      .orderBy(desc(simulationAttempts.startedAt));

    if (activeAttempt) {
      // Verifica autoritativamente se o tempo já expirou no servidor
      const durationMs = sim.durationMinutes * 60 * 1000;
      const expiresAt = new Date(activeAttempt.startedAt).getTime() + durationMs;
      const now = Date.now();

      if (now >= expiresAt) {
        // Expirou: auto-finaliza a tentativa expirada
        await this.autoExpireAttempt(activeAttempt.id, sim);
      } else {
        // Ainda ativa: retoma a tentativa existente
        return {
          attemptId: activeAttempt.id,
          simulationId: sim.id,
          status: 'IN_PROGRESS',
          resumed: true,
          startedAt: activeAttempt.startedAt,
          remainingSeconds: Math.floor((expiresAt - now) / 1000),
        };
      }
    }

    // Cria nova tentativa
    const [newAttempt] = await db
      .insert(simulationAttempts)
      .values({
        simulationId: sim.id,
        userId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        markedQuestions: [],
      })
      .returning();

    return {
      attemptId: newAttempt.id,
      simulationId: sim.id,
      status: 'IN_PROGRESS',
      resumed: false,
      startedAt: newAttempt.startedAt,
      remainingSeconds: sim.durationMinutes * 60,
    };
  }

  /**
   * Obtém a tentativa ativa e as questões para execução do exame.
   * REGRA ANTI-CHEAT: alternativas não contêm isCorrect e enunciados não contêm officialExplanation.
   */
  static async getCurrentAttempt(simulationId: string, userId: string) {
    const [sim] = await db.select().from(simulations).where(eq(simulations.id, simulationId));
    if (!sim) {
      throw new Error('Simulado não encontrado.');
    }

    const [attempt] = await db
      .select()
      .from(simulationAttempts)
      .where(
        and(
          eq(simulationAttempts.simulationId, simulationId),
          eq(simulationAttempts.userId, userId),
          eq(simulationAttempts.status, 'IN_PROGRESS')
        )
      )
      .orderBy(desc(simulationAttempts.startedAt));

    if (!attempt) {
      throw new Error('Nenhuma tentativa ativa em andamento para este simulado.');
    }

    // Cronômetro autoritativo do servidor
    const durationMs = sim.durationMinutes * 60 * 1000;
    const expiresAt = new Date(attempt.startedAt).getTime() + durationMs;
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

    if (remainingSeconds === 0) {
      // Auto-expiração
      const expiredResult = await this.autoExpireAttempt(attempt.id, sim);
      return {
        expired: true,
        attemptId: attempt.id,
        status: 'EXPIRED',
        message: 'O tempo deste simulado encerrou-se.',
        result: expiredResult,
      };
    }

    // Carrega questões do simulado
    const simQuestions = await db
      .select({
        questionId: simulationQuestions.questionId,
        orderIndex: simulationQuestions.orderIndex,
        points: simulationQuestions.points,
        statement: questions.statement,
        year: questions.year,
        difficulty: questions.difficulty,
        subjectId: questions.subjectId,
        subjectName: subjects.name,
        topicId: questions.topicId,
        topicName: topics.name,
        boardAcronym: examBoards.acronym,
      })
      .from(simulationQuestions)
      .innerJoin(questions, eq(simulationQuestions.questionId, questions.id))
      .leftJoin(subjects, eq(questions.subjectId, subjects.id))
      .leftJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(examBoards, eq(questions.boardId, examBoards.id))
      .where(eq(simulationQuestions.simulationId, simulationId))
      .orderBy(asc(simulationQuestions.orderIndex));

    if (simQuestions.length === 0) {
      throw new Error('Simulado não possui questões vinculadas.');
    }

    const questionIds = simQuestions.map((q: any) => q.questionId);

    // Carrega opções SEM o campo isCorrect (ANTI-CHEAT)
    const optionsRows = await db
      .select({
        id: questionOptions.id,
        questionId: questionOptions.questionId,
        letter: questionOptions.letter,
        text: questionOptions.text,
        orderIndex: questionOptions.orderIndex,
      })
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, questionIds))
      .orderBy(asc(questionOptions.orderIndex));

    const optionsByQuestion = new Map<string, any[]>();
    for (const opt of optionsRows) {
      const list = optionsByQuestion.get(opt.questionId) || [];
      list.push(opt);
      optionsByQuestion.set(opt.questionId, list);
    }

    // Carrega respostas já salvas para este attempt
    const answersRows = await db
      .select({
        questionId: simulationAnswers.questionId,
        selectedOptionId: simulationAnswers.selectedOptionId,
        answeredAt: simulationAnswers.answeredAt,
      })
      .from(simulationAnswers)
      .where(eq(simulationAnswers.simulationAttemptId, attempt.id));

    const savedAnswers: Record<string, string | null> = {};
    for (const ans of answersRows) {
      savedAnswers[ans.questionId] = ans.selectedOptionId;
    }

    const preparedQuestions = simQuestions.map((q: any) => ({
      id: q.questionId,
      orderIndex: q.orderIndex,
      points: q.points,
      statement: q.statement,
      year: q.year,
      difficulty: q.difficulty,
      subjectName: q.subjectName || 'Geral',
      topicName: q.topicName || 'Tópico Geral',
      boardName: q.boardAcronym || 'Oficial',
      options: optionsByQuestion.get(q.questionId) || [],
    }));

    return {
      expired: false,
      attempt: {
        id: attempt.id,
        simulationId: sim.id,
        simulationTitle: sim.title,
        durationMinutes: sim.durationMinutes,
        penaltyRule: sim.penaltyRule,
        penaltyFactor: sim.penaltyFactor,
        startedAt: attempt.startedAt,
        totalQuestions: simQuestions.length,
        markedQuestions: (attempt.markedQuestions as string[]) || [],
      },
      remainingSeconds,
      questions: preparedQuestions,
      savedAnswers,
    };
  }

  /**
   * Salva uma resposta atômica (Auto-Save).
   */
  static async saveAnswer(
    attemptId: string,
    questionId: string,
    selectedOptionId: string | null,
    timeSpentSeconds: number = 0,
    userId: string
  ) {
    const [attempt] = await db
      .select()
      .from(simulationAttempts)
      .where(and(eq(simulationAttempts.id, attemptId), eq(simulationAttempts.userId, userId)));

    if (!attempt) {
      throw new Error('Tentativa não encontrada ou acesso não autorizado.');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new Error('Esta tentativa não está mais em andamento.');
    }

    // Verifica tempo do servidor
    const [sim] = await db.select().from(simulations).where(eq(simulations.id, attempt.simulationId));
    if (sim) {
      const expiresAt = new Date(attempt.startedAt).getTime() + sim.durationMinutes * 60 * 1000;
      if (Date.now() >= expiresAt) {
        await this.autoExpireAttempt(attempt.id, sim);
        return { expired: true, message: 'O tempo limite do simulado expirou.' };
      }
    }

    // Se selecionou uma opção, valida e calcula se é correta no banco
    let isCorrect: boolean | null = null;
    if (selectedOptionId) {
      const [opt] = await db
        .select()
        .from(questionOptions)
        .where(and(eq(questionOptions.id, selectedOptionId), eq(questionOptions.questionId, questionId)));

      if (!opt) {
        throw new Error('Alternativa selecionada inválida para esta questão.');
      }
      isCorrect = opt.isCorrect;
    }

    // Upsert na tabela simulation_answers
    const [existing] = await db
      .select()
      .from(simulationAnswers)
      .where(
        and(
          eq(simulationAnswers.simulationAttemptId, attemptId),
          eq(simulationAnswers.questionId, questionId)
        )
      );

    if (existing) {
      await db
        .update(simulationAnswers)
        .set({
          selectedOptionId,
          isCorrect,
          answeredAt: new Date(),
          timeSpentSeconds: (existing.timeSpentSeconds || 0) + (timeSpentSeconds || 0),
        })
        .where(eq(simulationAnswers.id, existing.id));
    } else {
      await db.insert(simulationAnswers).values({
        simulationAttemptId: attemptId,
        questionId,
        selectedOptionId,
        isCorrect,
        answeredAt: new Date(),
        timeSpentSeconds: timeSpentSeconds || 0,
      });
    }

    return {
      success: true,
      savedAt: new Date().toISOString(),
    };
  }

  /**
   * Alterna a marcação de questão para revisão durante o exame.
   */
  static async toggleMarkQuestion(attemptId: string, questionId: string, userId: string) {
    const [attempt] = await db
      .select()
      .from(simulationAttempts)
      .where(and(eq(simulationAttempts.id, attemptId), eq(simulationAttempts.userId, userId)));

    if (!attempt) {
      throw new Error('Tentativa não encontrada ou acesso não autorizado.');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new Error('Esta tentativa não está mais em andamento.');
    }

    const currentMarks = new Set<string>((attempt.markedQuestions as string[]) || []);
    if (currentMarks.has(questionId)) {
      currentMarks.delete(questionId);
    } else {
      currentMarks.add(questionId);
    }

    const updatedMarks = Array.from(currentMarks);
    await db
      .update(simulationAttempts)
      .set({ markedQuestions: updatedMarks })
      .where(eq(simulationAttempts.id, attemptId));

    return {
      markedQuestions: updatedMarks,
      isMarked: currentMarks.has(questionId),
    };
  }

  /**
   * Finaliza formalmente uma tentativa e calcula o resultado (Modo Concluído).
   */
  static async finishAttempt(attemptId: string, userId: string) {
    const [attempt] = await db
      .select()
      .from(simulationAttempts)
      .where(and(eq(simulationAttempts.id, attemptId), eq(simulationAttempts.userId, userId)));

    if (!attempt) {
      throw new Error('Tentativa não encontrada ou acesso não autorizado.');
    }

    if (attempt.status === 'COMPLETED' || attempt.status === 'EXPIRED') {
      return this.getResult(attemptId, userId, false);
    }

    const [sim] = await db.select().from(simulations).where(eq(simulations.id, attempt.simulationId));
    if (!sim) {
      throw new Error('Simulado associado não encontrado.');
    }

    return this.processFinish(attempt, sim, 'COMPLETED');
  }

  /**
   * Auto-finalização chamada quando o tempo do servidor encerra.
   */
  private static async autoExpireAttempt(attemptId: string, sim: any) {
    const [attempt] = await db.select().from(simulationAttempts).where(eq(simulationAttempts.id, attemptId));
    if (!attempt || attempt.status === 'COMPLETED' || attempt.status === 'EXPIRED') {
      return attempt;
    }
    return this.processFinish(attempt, sim, 'EXPIRED');
  }

  /**
   * Processamento central de encerramento, cálculo de notas e atualização de progresso.
   */
  private static async processFinish(attempt: any, sim: any, finalStatus: 'COMPLETED' | 'EXPIRED') {
    // Busca questões do simulado
    const simQuestions = await db
      .select({
        questionId: simulationQuestions.questionId,
        points: simulationQuestions.points,
        subjectId: questions.subjectId,
        subjectName: subjects.name,
        topicId: questions.topicId,
        topicName: topics.name,
        difficulty: questions.difficulty,
      })
      .from(simulationQuestions)
      .innerJoin(questions, eq(simulationQuestions.questionId, questions.id))
      .leftJoin(subjects, eq(questions.subjectId, subjects.id))
      .leftJoin(topics, eq(questions.topicId, topics.id))
      .where(eq(simulationQuestions.simulationId, sim.id));

    // Busca respostas dadas
    const answers = await db
      .select({
        questionId: simulationAnswers.questionId,
        selectedOptionId: simulationAnswers.selectedOptionId,
        isCorrect: simulationAnswers.isCorrect,
      })
      .from(simulationAnswers)
      .where(eq(simulationAnswers.simulationAttemptId, attempt.id));

    // Calcula resultado autoritativo
    const scored = SimulationScoringService.calculateScore(
      sim.penaltyRule,
      sim.penaltyFactor,
      simQuestions as any,
      answers as any
    );

    const now = new Date();
    const durationSeconds = Math.min(
      sim.durationMinutes * 60,
      Math.max(1, Math.floor((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000))
    );

    // Atualiza tentativa no banco
    const [updatedAttempt] = await db
      .update(simulationAttempts)
      .set({
        status: finalStatus,
        finishedAt: now,
        submittedAt: now,
        totalDurationSeconds: durationSeconds,
        totalScore: scored.totalScore,
        correctCount: scored.correctCount,
        wrongCount: scored.wrongCount,
        blankCount: scored.blankCount,
        percentage: scored.percentage,
        subjectBreakdown: scored.subjectBreakdown,
        topicBreakdown: scored.topicBreakdown,
        difficultyBreakdown: scored.difficultyBreakdown,
      })
      .where(eq(simulationAttempts.id, attempt.id))
      .returning();

    // Atualiza progresso do usuário no concurso correspondente
    try {
      if (sim.contestId) {
        const [prog] = await db
          .select()
          .from(userProgress)
          .where(and(eq(userProgress.userId, attempt.userId), eq(userProgress.contestId, sim.contestId)));

        if (prog) {
          const totalQ = prog.questionsAnswered + scored.answeredQuestions;
          const totalCorrect = prog.correctAnswersCount + scored.correctCount;
          const newAccuracy = totalQ > 0 ? (totalCorrect / totalQ) * 100 : 0;
          await db
            .update(userProgress)
            .set({
              questionsAnswered: totalQ,
              correctAnswersCount: totalCorrect,
              simulationsCompleted: prog.simulationsCompleted + 1,
              accuracyPercentage: newAccuracy.toFixed(2),
              lastActivityAt: now,
            })
            .where(eq(userProgress.id, prog.id));
        }
      }
    } catch (e) {
      console.warn('Erro ao atualizar progresso de estudos no simulado:', e);
    }

    return updatedAttempt;
  }

  /**
   * Retorna o resultado completo de uma tentativa finalizada com GABARITO e REVISÃO.
   */
  static async getResult(attemptId: string, userId: string, isAdmin: boolean = false) {
    const [attempt] = await db.select().from(simulationAttempts).where(eq(simulationAttempts.id, attemptId));
    if (!attempt) {
      throw new Error('Tentativa de simulado não encontrada.');
    }

    if (!isAdmin && attempt.userId !== userId) {
      throw new Error('Acesso negado: esta tentativa pertence a outro usuário.');
    }

    if (attempt.status === 'IN_PROGRESS') {
      throw new Error('Esta tentativa ainda está em andamento. Finalize a prova para ver o gabarito.');
    }

    const [sim] = await db
      .select({
        id: simulations.id,
        contestId: simulations.contestId,
        title: simulations.title,
        description: simulations.description,
        type: simulations.type,
        durationMinutes: simulations.durationMinutes,
        penaltyRule: simulations.penaltyRule,
        penaltyFactor: simulations.penaltyFactor,
        totalQuestions: simulations.totalQuestions,
        difficulty: simulations.difficulty,
        contestTitle: contests.title,
        contestAcronym: agencies.acronym,
      })
      .from(simulations)
      .innerJoin(contests, eq(simulations.contestId, contests.id))
      .leftJoin(agencies, eq(contests.agencyId, agencies.id))
      .where(eq(simulations.id, attempt.simulationId));

    // Carrega questões do simulado com gabarito e explicação comentada
    const simQuestions = await db
      .select({
        questionId: simulationQuestions.questionId,
        orderIndex: simulationQuestions.orderIndex,
        points: simulationQuestions.points,
        statement: questions.statement,
        officialExplanation: questions.officialExplanation,
        year: questions.year,
        difficulty: questions.difficulty,
        subjectId: questions.subjectId,
        subjectName: subjects.name,
        topicId: questions.topicId,
        topicName: topics.name,
        boardAcronym: examBoards.acronym,
      })
      .from(simulationQuestions)
      .innerJoin(questions, eq(simulationQuestions.questionId, questions.id))
      .leftJoin(subjects, eq(questions.subjectId, subjects.id))
      .leftJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(examBoards, eq(questions.boardId, examBoards.id))
      .where(eq(simulationQuestions.simulationId, attempt.simulationId))
      .orderBy(asc(simulationQuestions.orderIndex));

    const questionIds = simQuestions.map((q: any) => q.questionId);

    // Carrega todas as opções com isCorrect agora revelado
    const optionsRows = await db
      .select({
        id: questionOptions.id,
        questionId: questionOptions.questionId,
        letter: questionOptions.letter,
        text: questionOptions.text,
        isCorrect: questionOptions.isCorrect,
        orderIndex: questionOptions.orderIndex,
      })
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, questionIds))
      .orderBy(asc(questionOptions.orderIndex));

    const optionsMap = new Map<string, any[]>();
    for (const opt of optionsRows) {
      const list = optionsMap.get(opt.questionId) || [];
      list.push(opt);
      optionsMap.set(opt.questionId, list);
    }

    // Respostas dadas
    const answersRows = await db
      .select({
        questionId: simulationAnswers.questionId,
        selectedOptionId: simulationAnswers.selectedOptionId,
        isCorrect: simulationAnswers.isCorrect,
        timeSpentSeconds: simulationAnswers.timeSpentSeconds,
      })
      .from(simulationAnswers)
      .where(eq(simulationAnswers.simulationAttemptId, attempt.id));

    const answersMap = new Map<string, any>();
    for (const ans of answersRows) {
      answersMap.set(ans.questionId, ans);
    }

    const markedSet = new Set((attempt.markedQuestions as string[]) || []);

    const reviewedQuestions = simQuestions.map((q: any) => {
      const ans = answersMap.get(q.questionId);
      const opts = optionsMap.get(q.questionId) || [];
      const correctOpt = opts.find((o: any) => o.isCorrect);

      return {
        id: q.questionId,
        orderIndex: q.orderIndex,
        points: q.points,
        statement: q.statement,
        officialExplanation: q.officialExplanation,
        year: q.year,
        difficulty: q.difficulty,
        subjectName: q.subjectName || 'Geral',
        topicName: q.topicName || 'Tópico Geral',
        boardName: q.boardAcronym || 'Oficial',
        options: opts,
        userAnswer: {
          selectedOptionId: ans?.selectedOptionId || null,
          isCorrect: ans ? ans.isCorrect : null,
          timeSpentSeconds: ans?.timeSpentSeconds || 0,
        },
        correctOptionId: correctOpt?.id || null,
        correctLetter: correctOpt?.letter || null,
        isMarkedForReview: markedSet.has(q.questionId),
      };
    });

    return {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
        totalDurationSeconds: attempt.totalDurationSeconds,
        totalScore: attempt.totalScore,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        blankCount: attempt.blankCount,
        percentage: attempt.percentage,
        totalQuestions: simQuestions.length,
        subjectBreakdown: attempt.subjectBreakdown,
        topicBreakdown: attempt.topicBreakdown,
        difficultyBreakdown: attempt.difficultyBreakdown,
      },
      simulation: sim,
      questions: reviewedQuestions,
    };
  }

  /**
   * Retorna histórico de tentativas do estudante.
   */
  static async getHistory(userId: string) {
    const rows = await db
      .select({
        id: simulationAttempts.id,
        attemptId: simulationAttempts.id,
        simulationId: simulationAttempts.simulationId,
        simulationTitle: simulations.title,
        simulationType: simulations.type,
        status: simulationAttempts.status,
        startedAt: simulationAttempts.startedAt,
        finishedAt: simulationAttempts.finishedAt,
        totalDurationSeconds: simulationAttempts.totalDurationSeconds,
        totalScore: simulationAttempts.totalScore,
        correctCount: simulationAttempts.correctCount,
        wrongCount: simulationAttempts.wrongCount,
        blankCount: simulationAttempts.blankCount,
        percentage: simulationAttempts.percentage,
        contestTitle: contests.title,
        agencyAcronym: agencies.acronym,
      })
      .from(simulationAttempts)
      .innerJoin(simulations, eq(simulationAttempts.simulationId, simulations.id))
      .innerJoin(contests, eq(simulations.contestId, contests.id))
      .leftJoin(agencies, eq(contests.agencyId, agencies.id))
      .where(eq(simulationAttempts.userId, userId))
      .orderBy(desc(simulationAttempts.startedAt));

    return rows;
  }

  /**
   * Retorna KPIs e evolução histórica de simulados para gráficos.
   */
  static async getStats(userId: string, contestId?: string) {
    const conditions: any[] = [
      eq(simulationAttempts.userId, userId),
      inArray(simulationAttempts.status, ['COMPLETED', 'EXPIRED']),
    ];

    if (contestId) {
      conditions.push(eq(simulations.contestId, contestId));
    }

    const rows = await db
      .select({
        attemptId: simulationAttempts.id,
        simulationId: simulationAttempts.simulationId,
        simulationTitle: simulations.title,
        percentage: simulationAttempts.percentage,
        totalScore: simulationAttempts.totalScore,
        correctCount: simulationAttempts.correctCount,
        wrongCount: simulationAttempts.wrongCount,
        blankCount: simulationAttempts.blankCount,
        totalDurationSeconds: simulationAttempts.totalDurationSeconds,
        finishedAt: simulationAttempts.finishedAt,
        startedAt: simulationAttempts.startedAt,
      })
      .from(simulationAttempts)
      .innerJoin(simulations, eq(simulationAttempts.simulationId, simulations.id))
      .where(and(...conditions))
      .orderBy(asc(simulationAttempts.finishedAt));

    const totalSimulations = rows.length;
    let sumPercentage = 0;
    let sumScore = 0;
    let bestPercentage = 0;
    let bestScore = 0;
    let totalQuestionsAnswered = 0;
    let minTimeSeconds = totalSimulations > 0 ? 999999 : 0;

    const evolution = rows.map((r: any, idx: number) => {
      const pct = Number(r.percentage) || 0;
      const score = Number(r.totalScore) || 0;
      const duration = r.totalDurationSeconds || 0;

      sumPercentage += pct;
      sumScore += score;
      if (pct > bestPercentage) bestPercentage = pct;
      if (score > bestScore) bestScore = score;
      if (duration > 0 && duration < minTimeSeconds) minTimeSeconds = duration;
      totalQuestionsAnswered += (r.correctCount || 0) + (r.wrongCount || 0);

      return {
        index: idx + 1,
        attemptId: r.attemptId,
        simulationTitle: r.simulationTitle,
        percentage: pct,
        score,
        date: r.finishedAt ? new Date(r.finishedAt).toISOString().slice(0, 10) : new Date(r.startedAt).toISOString().slice(0, 10),
      };
    });

    return {
      totalCompleted: totalSimulations,
      averagePercentage: totalSimulations > 0 ? (sumPercentage / totalSimulations).toFixed(1) : '0.0',
      averageScore: totalSimulations > 0 ? (sumScore / totalSimulations).toFixed(2) : '0.00',
      bestPercentage: bestPercentage.toFixed(1),
      bestScore: bestScore.toFixed(2),
      minTimeMinutes: minTimeSeconds < 999999 ? Math.round(minTimeSeconds / 60) : 0,
      totalQuestionsAnswered,
      evolution,
    };
  }
}
