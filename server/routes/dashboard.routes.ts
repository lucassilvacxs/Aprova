import { Hono } from 'hono';
import { db } from '../db';
import {
  userProgress,
  userSubjectProgress,
  subjects,
  contests,
  simulationAttempts,
  simulations,
} from '../db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { requireAuth } from '../middlewares/auth.middleware';
import { StudyPlanService } from '../services/study-plan.service';
import { NewsService } from '../services/news.service';

export const dashboardRoutes = new Hono();

/**
 * GET /api/v1/dashboard
 * Retorna as métricas e dados de estudo em tempo real do aluno autenticado.
 * Garante estritamente o isolamento de dados (ownership).
 */
dashboardRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user');

  // 1. Busca o progresso consolidado do aluno
  const progressList = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, user.id));

  // 2. Busca o progresso por disciplina do aluno
  const subjectProgressList = await db
    .select({
      id: userSubjectProgress.id,
      subjectId: userSubjectProgress.subjectId,
      contestId: userSubjectProgress.contestId,
      subjectName: subjects.name,
      shortName: subjects.shortName,
      colorToken: subjects.colorToken,
      progressPercentage: userSubjectProgress.progressPercentage,
      accuracyPercentage: userSubjectProgress.accuracyPercentage,
      questionsAnswered: userSubjectProgress.questionsAnswered,
      correctCount: userSubjectProgress.correctCount,
      wrongCount: userSubjectProgress.wrongCount,
      lastStudiedAt: userSubjectProgress.lastStudiedAt,
    })
    .from(userSubjectProgress)
    .innerJoin(subjects, eq(userSubjectProgress.subjectId, subjects.id))
    .where(eq(userSubjectProgress.userId, user.id));

  // Consolidação dos totais
  const totalQuestions = progressList.reduce((acc: number, p: any) => acc + (p.questionsAnswered || 0), 0);
  const totalCorrect = progressList.reduce((acc: number, p: any) => acc + (p.correctQuestionsCount || 0), 0);
  const totalHours = progressList.reduce((acc: number, p: any) => acc + parseFloat(p.totalStudyHours || '0'), 0);
  const completedLessons = progressList.reduce((acc: number, p: any) => acc + (p.completedLessonsCount || 0), 0);
  const maxStreak = progressList.reduce((acc: number, p: any) => Math.max(acc, p.currentStreakDays || 0), 0);

  const overallAccuracy =
    totalQuestions > 0 ? parseFloat(((totalCorrect / totalQuestions) * 100).toFixed(1)) : 0;

  // Disciplinas mais fracas e fortes
  const sortedSubjects = [...subjectProgressList].sort(
    (a, b) => parseFloat(a.accuracyPercentage) - parseFloat(b.accuracyPercentage)
  );

  const weakestSubjects = sortedSubjects.slice(0, 2).map((s) => ({
    subjectId: s.subjectId,
    subjectName: s.subjectName,
    accuracyPercentage: parseFloat(s.accuracyPercentage),
    recommendedAction: 'Aumentar resolução de questões e revisar teoria',
  }));

  const strongestSubjects = [...subjectProgressList]
    .filter((s) => parseFloat(s.accuracyPercentage) >= 80)
    .sort((a, b) => parseFloat(b.accuracyPercentage) - parseFloat(a.accuracyPercentage))
    .slice(0, 2)
    .map((s) => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      accuracyPercentage: parseFloat(s.accuracyPercentage),
    }));

  // Concursos ativos do usuário
  let userContests: any[] = [];
  if (user.allowedContestIds && user.allowedContestIds.length > 0) {
    userContests = await db
      .select({
        id: contests.id,
        title: contests.title,
        slug: contests.slug,
        status: contests.status,
      })
      .from(contests)
      .where(inArray(contests.id, user.allowedContestIds));
  } else if (user.roles.includes('admin')) {
    userContests = await db
      .select({
        id: contests.id,
        title: contests.title,
        slug: contests.slug,
        status: contests.status,
      })
      .from(contests)
      .limit(5);
  }

  // Busca simulados do usuário: tentativa em andamento e concluídos
  const userSimAttempts = await db
    .select({
      id: simulationAttempts.id,
      simulationId: simulationAttempts.simulationId,
      status: simulationAttempts.status,
      percentage: simulationAttempts.percentage,
      totalScore: simulationAttempts.totalScore,
      startedAt: simulationAttempts.startedAt,
      durationMinutes: simulations.durationMinutes,
      simulationTitle: simulations.title,
    })
    .from(simulationAttempts)
    .innerJoin(simulations, eq(simulationAttempts.simulationId, simulations.id))
    .where(eq(simulationAttempts.userId, user.id))
    .orderBy(desc(simulationAttempts.startedAt));

  const completedSims = userSimAttempts.filter((a: any) => a.status === 'COMPLETED' || a.status === 'EXPIRED');
  let bestSimPct = 0;
  for (const cs of completedSims) {
    const p = Number(cs.percentage) || 0;
    if (p > bestSimPct) bestSimPct = p;
  }

  const inProgAttempt = userSimAttempts.find((a: any) => a.status === 'IN_PROGRESS');
  let activeSimulation: any = null;
  if (inProgAttempt) {
    const expiresAt = new Date(inProgAttempt.startedAt).getTime() + inProgAttempt.durationMinutes * 60 * 1000;
    const rem = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    if (rem > 0) {
      activeSimulation = {
        attemptId: inProgAttempt.id,
        simulationId: inProgAttempt.simulationId,
        simulationTitle: inProgAttempt.simulationTitle,
        durationMinutes: inProgAttempt.durationMinutes,
        remainingSeconds: rem,
        startedAt: inProgAttempt.startedAt,
      };
    }
  }

  const todayStudyPlan = await StudyPlanService.getTodaySessions(user.id);

  // Busca as últimas notícias para o concurso ativo do estudante
  const preferredContestId =
    user.allowedContestIds && user.allowedContestIds.length > 0
      ? user.allowedContestIds[0]
      : undefined;

  const latestNewsResult = await NewsService.listNews(
    {
      contestId: preferredContestId,
      limit: 5,
    },
    user.id,
    false
  );

  return c.json({
    success: true,
    data: {
      metrics: {
        activeSubjectsCount: subjectProgressList.length,
        completedLessonsCount: completedLessons,
        totalQuestionsAnswered: totalQuestions,
        overallAccuracyRate: overallAccuracy,
        totalStudyHours: Math.round(totalHours),
        currentStreakDays: maxStreak,
        simulationsCompleted: completedSims.length,
        bestSimulationPercentage: bestSimPct.toFixed(1),
        weakestSubjects,
        strongestSubjects,
      },
      subjectPerformance: subjectProgressList.map((s: any) => ({
        subjectId: s.subjectId,
        name: s.subjectName,
        shortName: s.shortName,
        accuracy: parseFloat(s.accuracyPercentage),
        progress: parseFloat(s.progressPercentage),
        questions: s.questionsAnswered,
        colorKey: s.colorToken || 'purple',
      })),
      userContests,
      activeSimulation,
      todayStudyPlan,
      latestNews: latestNewsResult.items,
      hasStartedStudying: totalQuestions > 0 || completedLessons > 0 || completedSims.length > 0,
    },
  });
});
