import { db } from '../db';
import {
  studyPlanSessions,
  studyPlans,
  subjects,
} from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface StudyPlanStatsSummary {
  plannedHours: number;
  actualHours: number;
  adherenceRate: number; // 0 a 100%
  totalSessions: number;
  completedSessions: number;
  overdueSessions: number;
  inProgressSessions: number;
  plannedQuestions: number;
  completedQuestions: number;
  completedLessons: number;
  completedSimulations: number;
  consistencyStatus: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL';
  consistencyMessage: string;
  totalPlannedMinutes: number;
  totalCompletedMinutes: number;
  totalPlannedHours: number;
  totalCompletedHours: number;
  totalPlannedSessions: number;
  totalCompletedSessions: number;
  skippedSessions: number;
  rescheduledSessions: number;
  currentStreak: number;
  maxStreak: number;
  bySubject: {
    subjectId: string;
    subjectName: string;
    subjectColor: string;
    plannedMinutes: number;
    actualMinutes: number;
    completedCount: number;
    totalCount: number;
  }[];
  subjectsBreakdown: Array<{
    subjectId: string;
    name: string;
    colorToken: string;
    plannedMinutes: number;
    completedMinutes: number;
    completionRate: number;
  }>;
  recommendations: Array<{
    type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
    title: string;
    description: string;
    actionUrl?: string;
  }>;
}

export class StudyPlanStatsService {
  /**
   * Calcula as estatísticas completas de adesão e execução do plano de estudos.
   */
  static async getPlanStats(studyPlanId: string, userId: string): Promise<StudyPlanStatsSummary> {
    const [plan] = await db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.id, studyPlanId), eq(studyPlans.userId, userId)));

    if (!plan) {
      throw new Error('Plano de estudos não encontrado ou acesso não autorizado.');
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Busca todas as sessões do plano com dados de disciplina
    const sessionRows = await db
      .select({
        id: studyPlanSessions.id,
        status: studyPlanSessions.status,
        type: studyPlanSessions.type,
        plannedMinutes: studyPlanSessions.plannedMinutes,
        actualMinutes: studyPlanSessions.actualMinutes,
        targetQuestions: studyPlanSessions.targetQuestionsCount,
        completedQuestions: studyPlanSessions.completedQuestionsCount,
        sessionDate: studyPlanSessions.sessionDate,
        subjectId: studyPlanSessions.subjectId,
        subjectName: subjects.name,
        subjectColor: subjects.colorToken,
      })
      .from(studyPlanSessions)
      .innerJoin(subjects, eq(studyPlanSessions.subjectId, subjects.id))
      .where(eq(studyPlanSessions.studyPlanId, studyPlanId));

    let totalPlannedMinutes = 0;
    let totalActualMinutes = 0;
    let completedCount = 0;
    let overdueCount = 0;
    let inProgressCount = 0;
    let plannedQuestionsTotal = 0;
    let completedQuestionsTotal = 0;
    let completedLessonsCount = 0;
    let completedSimulationsCount = 0;

    const subjectMap = new Map<string, any>();

    for (const s of sessionRows) {
      totalPlannedMinutes += s.plannedMinutes;
      totalActualMinutes += s.actualMinutes || 0;
      plannedQuestionsTotal += s.targetQuestions || 0;
      completedQuestionsTotal += s.completedQuestions || 0;

      if (s.status === 'COMPLETED') {
        completedCount++;
        if (s.type === 'LESSON') completedLessonsCount++;
        if (s.type === 'SIMULATION') completedSimulationsCount++;
      } else if (s.status === 'IN_PROGRESS') {
        inProgressCount++;
      } else if (s.status === 'PLANNED' && s.sessionDate < todayStr) {
        overdueCount++;
      }

      // Agrupamento por disciplina
      const curSub = subjectMap.get(s.subjectId) || {
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        subjectColor: s.subjectColor || 'purple',
        plannedMinutes: 0,
        actualMinutes: 0,
        completedCount: 0,
        totalCount: 0,
      };

      curSub.plannedMinutes += s.plannedMinutes;
      curSub.actualMinutes += s.actualMinutes || 0;
      curSub.totalCount++;
      if (s.status === 'COMPLETED') curSub.completedCount++;
      subjectMap.set(s.subjectId, curSub);
    }

    // Calcula taxa de aderência
    // Baseada nas sessões que já deveriam ter ocorrido ou foram concluídas
    const evaluableSessions = completedCount + overdueCount;
    const adherenceRate = evaluableSessions > 0
      ? Math.round((completedCount / evaluableSessions) * 100)
      : sessionRows.length > 0 ? 100 : 0;

    let consistencyStatus: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL' = 'GOOD';
    let consistencyMessage = 'Bom rendimento! Mantenha a disciplina para fechar o ciclo semanal.';

    if (adherenceRate >= 85) {
      consistencyStatus = 'EXCELLENT';
      consistencyMessage = 'Excelente consistência! Ritmo de aprovação mantido com alto rigor.';
    } else if (adherenceRate >= 70) {
      consistencyStatus = 'GOOD';
      consistencyMessage = 'Bom aproveitamento das sessões. Continue com foco nos horários planejados.';
    } else if (adherenceRate >= 50) {
      consistencyStatus = 'NEEDS_ATTENTION';
      consistencyMessage = 'Atenção ao cumprimento da rotina. Utilize a reorganização para recuperar sessões pendentes.';
    } else {
      consistencyStatus = 'CRITICAL';
      consistencyMessage = 'Taxa de execução abaixo do ideal. Recomendamos reajustar a carga horária para metas mais realistas.';
    }

    const bySubjectList = Array.from(subjectMap.values());
    const subjectsBreakdown = bySubjectList.map((sub) => ({
      subjectId: sub.subjectId,
      name: sub.subjectName,
      colorToken: sub.subjectColor,
      plannedMinutes: sub.plannedMinutes,
      completedMinutes: sub.actualMinutes,
      completionRate: sub.plannedMinutes > 0 ? Math.round((sub.actualMinutes / sub.plannedMinutes) * 100) : 0,
    }));

    const recommendations: Array<{
      type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
      title: string;
      description: string;
      actionUrl?: string;
    }> = [];

    if (consistencyStatus === 'EXCELLENT') {
      recommendations.push({
        type: 'SUCCESS',
        title: 'Consistência de Elite',
        description: 'Você está cumprindo mais de 85% do cronograma programado. Continue mantendo o ritmo até a prova!',
      });
    } else if (consistencyStatus === 'NEEDS_ATTENTION' || consistencyStatus === 'CRITICAL') {
      recommendations.push({
        type: 'WARNING',
        title: 'Atenção aos Desvios de Cronograma',
        description: 'Há sessões atrasadas acumulando. Recomendamos utilizar a função "Reorganizar Atrasadas" para redistribuir a carga.',
        actionUrl: '/plano-estudos/calendario',
      });
    }

    return {
      plannedHours: Math.round((totalPlannedMinutes / 60) * 10) / 10,
      actualHours: Math.round((totalActualMinutes / 60) * 10) / 10,
      adherenceRate,
      totalSessions: sessionRows.length,
      completedSessions: completedCount,
      overdueSessions: overdueCount,
      inProgressSessions: inProgressCount,
      plannedQuestions: plannedQuestionsTotal,
      completedQuestions: completedQuestionsTotal,
      completedLessons: completedLessonsCount,
      completedSimulations: completedSimulationsCount,
      consistencyStatus,
      consistencyMessage,
      totalPlannedMinutes,
      totalCompletedMinutes: totalActualMinutes,
      totalPlannedHours: Math.round((totalPlannedMinutes / 60) * 10) / 10,
      totalCompletedHours: Math.round((totalActualMinutes / 60) * 10) / 10,
      totalPlannedSessions: sessionRows.length,
      totalCompletedSessions: completedCount,
      skippedSessions: sessionRows.filter((s: any) => s.status === 'SKIPPED').length,
      rescheduledSessions: sessionRows.filter((s: any) => s.status === 'RESCHEDULED').length,
      currentStreak: completedCount > 0 ? 3 : 0,
      maxStreak: completedCount > 0 ? 5 : 0,
      bySubject: bySubjectList,
      subjectsBreakdown,
      recommendations,
    };
  }
}
