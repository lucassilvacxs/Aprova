import { db } from '../db';
import {
  studyPlans,
  studyAvailabilities,
  studyPlanPreferences,
  studyPlanSubjects,
  studyPlanSessions,
  subjects,
  courses,
  modules,
  lessons,
  userLessonProgress,
  userSubjectProgress,
  simulations,
} from '../db/schema';
import { eq, and, inArray, asc } from 'drizzle-orm';
import {
  StudyPlanRecommendationService,
  SubjectDiagnosticInput,
} from './study-plan-recommendation.service';

export interface PlannedSessionPreview {
  sessionDate: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  type: 'LESSON' | 'QUESTIONS' | 'REVIEW' | 'SIMULATION' | 'REVISION' | 'MIXED';
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  lessonId?: string;
  lessonTitle?: string;
  simulationId?: string;
  simulationTitle?: string;
  targetQuestionsCount: number;
  ordering: number;
  explanation: string;
}

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export class StudyPlanGenerationService {
  /**
   * Gera a grade completa de sessões (em memória para prévia ou persistida no banco)
   * cobrindo o horizonte definido (padrão: 4 semanas = 28 dias).
   */
  static async generateSessions(
    studyPlanId: string,
    userId: string,
    options: { persist: boolean } = { persist: true }
  ): Promise<{ sessions: PlannedSessionPreview[]; totalHours: number; totalSessions: number; totalQuestions: number }> {
    // 1. Carrega plano de estudos e valida ownership
    const [plan] = await db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.id, studyPlanId), eq(studyPlans.userId, userId)));

    if (!plan) {
      throw new Error('Plano de estudos não encontrado ou acesso não autorizado.');
    }

    // 2. Carrega disponibilidades por dia da semana
    const availabilities = await db
      .select()
      .from(studyAvailabilities)
      .where(eq(studyAvailabilities.studyPlanId, studyPlanId))
      .orderBy(asc(studyAvailabilities.dayOfWeek));

    const activeAvailabilities = availabilities.filter((a: any) => a.enabled && a.availableMinutes > 0);
    if (activeAvailabilities.length === 0) {
      throw new Error('Nenhum dia da semana com disponibilidade ativa foi configurado no plano.');
    }

    // 3. Carrega preferências
    const [prefs] = await db
      .select()
      .from(studyPlanPreferences)
      .where(eq(studyPlanPreferences.studyPlanId, studyPlanId));

    const minSession = prefs?.minSessionMinutes || 30;
    const maxSession = prefs?.maxSessionMinutes || 60;
    const defaultQuestions = prefs?.defaultQuestionsPerSession || 20;
    const minShare = Number(prefs?.minSubjectShare) || 0.05;
    const maxShare = Number(prefs?.maxSubjectShare) || 0.40;

    // 4. Carrega disciplinas vinculadas ao plano
    const planSubjectsRows = await db
      .select({
        id: studyPlanSubjects.id,
        subjectId: studyPlanSubjects.subjectId,
        priority: studyPlanSubjects.priority,
        weight: studyPlanSubjects.weight,
        name: subjects.name,
        colorToken: subjects.colorToken,
      })
      .from(studyPlanSubjects)
      .innerJoin(subjects, eq(studyPlanSubjects.subjectId, subjects.id))
      .where(and(eq(studyPlanSubjects.studyPlanId, studyPlanId), eq(studyPlanSubjects.enabled, true)));

    if (planSubjectsRows.length === 0) {
      throw new Error('Selecione pelo menos uma disciplina para gerar o plano de estudos.');
    }

    const subjectIds = planSubjectsRows.map((s: any) => s.subjectId);

    // 5. Carrega dados reais de desempenho do aluno por disciplina
    const progressRows = await db
      .select()
      .from(userSubjectProgress)
      .where(and(eq(userSubjectProgress.userId, userId), inArray(userSubjectProgress.subjectId, subjectIds)));

    const progressMap = new Map<string, any>();
    for (const p of progressRows) {
      progressMap.set(p.subjectId, p);
    }

    // 6. Carrega aulas pendentes de cada disciplina
    const allSubjectLessons = await db
      .select({
        lessonId: lessons.id,
        lessonTitle: lessons.title,
        lessonOrder: lessons.orderIndex,
        subjectId: modules.subjectId,
        moduleId: modules.id,
        moduleOrder: modules.orderIndex,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(
        and(
          eq(courses.contestId, plan.contestId),
          inArray(modules.subjectId, subjectIds),
          eq(lessons.status, 'published')
        )
      )
      .orderBy(asc(modules.orderIndex), asc(lessons.orderIndex));

    // Aulas já concluídas pelo aluno
    const completedLessonRows = await db
      .select({ lessonId: userLessonProgress.lessonId })
      .from(userLessonProgress)
      .where(and(eq(userLessonProgress.userId, userId), eq(userLessonProgress.status, 'completed')));

    const completedLessonIds = new Set(completedLessonRows.map((c: any) => c.lessonId));

    // Mapeia aulas pendentes ordenadas por disciplina
    const pendingLessonsBySubject = new Map<string, Array<{ id: string; title: string }>>();
    for (const l of allSubjectLessons) {
      if (!completedLessonIds.has(l.lessonId)) {
        const list = pendingLessonsBySubject.get(l.subjectId) || [];
        list.push({ id: l.lessonId, title: l.lessonTitle });
        pendingLessonsBySubject.set(l.subjectId, list);
      }
    }

    // 7. Busca simulado oficial disponível para agendamento no final de semana
    const [officialSim] = await db
      .select({ id: simulations.id, title: simulations.title })
      .from(simulations)
      .where(and(eq(simulations.contestId, plan.contestId), eq(simulations.status, 'published')))
      .limit(1);

    // 8. Executa o diagnóstico pedagógico determinístico para cada disciplina
    const diagnosticInputs: SubjectDiagnosticInput[] = planSubjectsRows.map((s: any) => {
      const prog = progressMap.get(s.subjectId);
      const pendingList = pendingLessonsBySubject.get(s.subjectId) || [];
      const accuracy = prog ? parseFloat(prog.accuracyPercentage) || 0 : 0;
      const answered = prog ? prog.questionsAnswered || 0 : 0;

      return {
        subjectId: s.subjectId,
        subjectName: s.name,
        contestWeight: parseFloat(s.weight) || 1.0,
        userAccuracyPercentage: accuracy,
        questionsAnswered: answered,
        totalPendingLessons: pendingList.length,
        userConfiguredPriority: s.priority as any,
      };
    });

    const rawDiagnoses = diagnosticInputs.map((inp) =>
      StudyPlanRecommendationService.calculateSubjectPriority(inp)
    );
    const normalizedDiagnoses = StudyPlanRecommendationService.normalizeDistributionShares(
      rawDiagnoses,
      minShare,
      maxShare
    );

    const diagnosisMap = new Map<string, any>();
    for (const d of normalizedDiagnoses) {
      diagnosisMap.set(d.subjectId, d);
    }

    // 9. Geração dos slots diários ao longo do horizonte (4 semanas = 28 dias)
    const horizonDays = (plan.horizonWeeks || 4) * 7;
    const startDate = new Date(plan.startDate);
    const generatedSessions: PlannedSessionPreview[] = [];

    // Fila circular ponderada de disciplinas para garantir alternância
    const subjectQueue: string[] = [];
    for (const d of normalizedDiagnoses) {
      const tickets = Math.max(1, Math.round(d.targetSharePercentage * 20));
      for (let i = 0; i < tickets; i++) {
        subjectQueue.push(d.subjectId);
      }
    }
    // Embaralha levemente a fila para alternar matérias
    for (let i = subjectQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [subjectQueue[i], subjectQueue[j]] = [subjectQueue[j], subjectQueue[i]];
    }

    let queueIndex = 0;
    const lessonCursor = new Map<string, number>();

    for (let dayOffset = 0; dayOffset < horizonDays; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + dayOffset);
      const dayOfWeek = currentDate.getDay(); // 0 a 6
      const dateStr = currentDate.toISOString().split('T')[0];

      const dayAvailability = activeAvailabilities.find((a: any) => a.dayOfWeek === dayOfWeek);
      if (!dayAvailability || dayAvailability.availableMinutes <= 0) {
        continue;
      }

      let remainingDailyMinutes = dayAvailability.availableMinutes;
      const [startHourStr, startMinStr] = dayAvailability.startTime.split(':');
      let currentClockMinute = parseInt(startHourStr, 10) * 60 + parseInt(startMinStr, 10);
      let sessionOrder = 1;

      // Se for Domingo (dayOfWeek = 0) e restar tempo para simulado semanal
      if (dayOfWeek === 0 && dayAvailability.availableMinutes >= 90 && officialSim) {
        const simDuration = Math.min(120, dayAvailability.availableMinutes);
        const startH = String(Math.floor(currentClockMinute / 60)).padStart(2, '0');
        const startM = String(currentClockMinute % 60).padStart(2, '0');
        currentClockMinute += simDuration;
        const endH = String(Math.floor(currentClockMinute / 60)).padStart(2, '0');
        const endM = String(currentClockMinute % 60).padStart(2, '0');

        generatedSessions.push({
          sessionDate: dateStr,
          dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          startTime: `${startH}:${startM}`,
          endTime: `${endH}:${endM}`,
          plannedMinutes: simDuration,
          type: 'SIMULATION',
          subjectId: planSubjectsRows[0].subjectId,
          subjectName: 'Simulado Semanal',
          subjectColor: 'indigo',
          simulationId: officialSim.id,
          simulationTitle: officialSim.title,
          targetQuestionsCount: 50,
          ordering: sessionOrder++,
          explanation: 'Simulado programado de final de semana para aferição geral de retenção e ritmo de prova.',
        });

        remainingDailyMinutes -= simDuration;
      }

      // Preenche o tempo diário com blocos pedagógicos de estudo (Teoria + Prática)
      while (remainingDailyMinutes >= minSession) {
        const subId = subjectQueue[queueIndex % subjectQueue.length];
        queueIndex++;

        const subMeta = planSubjectsRows.find((s: any) => s.subjectId === subId) || planSubjectsRows[0];
        const diagnosis = diagnosisMap.get(subId);
        const pendingList = pendingLessonsBySubject.get(subId) || [];
        const curCursor = lessonCursor.get(subId) || 0;
        const hasPendingLesson = curCursor < pendingList.length;

        const blockSize = Math.min(maxSession, remainingDailyMinutes);

        const startH = String(Math.floor(currentClockMinute / 60)).padStart(2, '0');
        const startM = String(currentClockMinute % 60).padStart(2, '0');
        currentClockMinute += blockSize;
        const endH = String(Math.floor(currentClockMinute / 60)).padStart(2, '0');
        const endM = String(currentClockMinute % 60).padStart(2, '0');

        // Alterna entre aula teórica e resolução de questões
        if (hasPendingLesson && sessionOrder % 2 !== 0) {
          const lesson = pendingList[curCursor];
          lessonCursor.set(subId, curCursor + 1);

          generatedSessions.push({
            sessionDate: dateStr,
            dayOfWeek,
            dayName: DAY_NAMES[dayOfWeek],
            startTime: `${startH}:${startM}`,
            endTime: `${endH}:${endM}`,
            plannedMinutes: blockSize,
            type: 'LESSON',
            subjectId: subMeta.subjectId,
            subjectName: subMeta.name,
            subjectColor: subMeta.colorToken || 'purple',
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            targetQuestionsCount: 0,
            ordering: sessionOrder++,
            explanation: diagnosis?.explanation || `Estudo teórico prioritário de ${subMeta.name}.`,
          });
        } else {
          // Sessão de Questões ou Revisão Prática
          const isReview = sessionOrder > 2 && dayOffset % 5 === 0;
          const sessionType = isReview ? 'REVIEW' : 'QUESTIONS';

          generatedSessions.push({
            sessionDate: dateStr,
            dayOfWeek,
            dayName: DAY_NAMES[dayOfWeek],
            startTime: `${startH}:${startM}`,
            endTime: `${endH}:${endM}`,
            plannedMinutes: blockSize,
            type: sessionType,
            subjectId: subMeta.subjectId,
            subjectName: subMeta.name,
            subjectColor: subMeta.colorToken || 'purple',
            targetQuestionsCount: isReview ? 15 : defaultQuestions,
            ordering: sessionOrder++,
            explanation: isReview
              ? `Revisão de fixação e resolução de questões de ${subMeta.name} para consolidação da memória.`
              : `Treino prático direcionado com questões selecionadas de ${subMeta.name}.`,
          });
        }

        remainingDailyMinutes -= blockSize;
        // Intervalo de descanso recomendado se sobrar tempo
        if (remainingDailyMinutes >= minSession + (prefs?.breakMinutes || 10)) {
          currentClockMinute += prefs?.breakMinutes || 10;
          remainingDailyMinutes -= prefs?.breakMinutes || 10;
        }
      }
    }

    // 10. Se persist = true, grava atomicamente no banco
    if (options.persist) {
      // Remove sessões planejadas anteriores deste plano
      await db.delete(studyPlanSessions).where(eq(studyPlanSessions.studyPlanId, studyPlanId));

      // Insere em lotes de 50 para alta performance
      const chunkSize = 50;
      for (let i = 0; i < generatedSessions.length; i += chunkSize) {
        const chunk = generatedSessions.slice(i, i + chunkSize);
        await db.insert(studyPlanSessions).values(
          chunk.map((s) => ({
            studyPlanId,
            subjectId: s.subjectId,
            lessonId: s.lessonId || null,
            simulationId: s.simulationId || null,
            sessionDate: s.sessionDate,
            startTime: s.startTime,
            endTime: s.endTime,
            plannedMinutes: s.plannedMinutes,
            actualMinutes: 0,
            type: s.type,
            targetQuestionsCount: s.targetQuestionsCount,
            completedQuestionsCount: 0,
            status: 'PLANNED',
            ordering: s.ordering,
            explanation: s.explanation,
          }))
        );
      }
    }

    const totalMinutes = generatedSessions.reduce((acc, s) => acc + s.plannedMinutes, 0);
    const totalQuestions = generatedSessions.reduce((acc, s) => acc + (s.targetQuestionsCount || 0), 0);

    return {
      sessions: generatedSessions,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalSessions: generatedSessions.length,
      totalQuestions,
    };
  }
}
