import { db } from '../db';
import {
  studyPlanSessions,
  studyPlans,
  userLessonProgress,
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { StudyPlanReviewService } from './study-plan-review.service';

export class StudyPlanSessionService {
  /**
   * Inicia a sessão de estudos (status: IN_PROGRESS).
   */
  static async startSession(sessionId: string, userId: string) {
    const [session] = await db
      .select({
        id: studyPlanSessions.id,
        status: studyPlanSessions.status,
        studyPlanId: studyPlanSessions.studyPlanId,
        plannedMinutes: studyPlanSessions.plannedMinutes,
        userId: studyPlans.userId,
      })
      .from(studyPlanSessions)
      .innerJoin(studyPlans, eq(studyPlanSessions.studyPlanId, studyPlans.id))
      .where(and(eq(studyPlanSessions.id, sessionId), eq(studyPlans.userId, userId)));

    if (!session) {
      throw new Error('Sessão de estudos não encontrada ou acesso não autorizado.');
    }

    if (session.status === 'COMPLETED') {
      throw new Error('Esta sessão já foi concluída anteriormente.');
    }

    const [updated] = await db
      .update(studyPlanSessions)
      .set({
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      })
      .where(eq(studyPlanSessions.id, sessionId))
      .returning();

    return updated;
  }

  /**
   * Conclui a sessão de estudos (status: COMPLETED) e atualiza progresso relacional.
   */
  static async completeSession(
    sessionId: string,
    userId: string,
    data: {
      actualMinutes?: number;
      completedQuestionsCount?: number;
      notes?: string;
    }
  ) {
    const [session] = await db
      .select({
        id: studyPlanSessions.id,
        status: studyPlanSessions.status,
        studyPlanId: studyPlanSessions.studyPlanId,
        plannedMinutes: studyPlanSessions.plannedMinutes,
        type: studyPlanSessions.type,
        lessonId: studyPlanSessions.lessonId,
        subjectId: studyPlanSessions.subjectId,
        topicId: studyPlanSessions.topicId,
        sessionDate: studyPlanSessions.sessionDate,
        userId: studyPlans.userId,
      })
      .from(studyPlanSessions)
      .innerJoin(studyPlans, eq(studyPlanSessions.studyPlanId, studyPlans.id))
      .where(and(eq(studyPlanSessions.id, sessionId), eq(studyPlans.userId, userId)));

    if (!session) {
      throw new Error('Sessão de estudos não encontrada ou acesso não autorizado.');
    }

    const actualMinutes = data.actualMinutes !== undefined ? data.actualMinutes : session.plannedMinutes;

    const [updated] = await db
      .update(studyPlanSessions)
      .set({
        status: 'COMPLETED',
        actualMinutes,
        completedQuestionsCount: data.completedQuestionsCount || 0,
        notes: data.notes || null,
        completedAt: new Date(),
      })
      .where(eq(studyPlanSessions.id, sessionId))
      .returning();

    // Se a sessão concluída foi uma aula, marca a aula correspondente como concluída em user_lesson_progress
    if (session.type === 'LESSON' && session.lessonId) {
      const [existingProgress] = await db
        .select()
        .from(userLessonProgress)
        .where(
          and(
            eq(userLessonProgress.userId, userId),
            eq(userLessonProgress.lessonId, session.lessonId)
          )
        );

      if (existingProgress) {
        await db
          .update(userLessonProgress)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(userLessonProgress.id, existingProgress.id));
      } else {
        await db.insert(userLessonProgress).values({
          userId,
          lessonId: session.lessonId,
          status: 'completed',
          completedAt: new Date(),
        });
      }

      // Agenda as revisões espaçadas (+1, +7, +14, +30 dias)
      await StudyPlanReviewService.scheduleSpacedReviews(
        session.studyPlanId,
        session.id,
        session.subjectId,
        session.topicId,
        session.lessonId,
        session.sessionDate
      );
    }

    return updated;
  }

  /**
   * Pula a sessão de estudos (status: SKIPPED).
   */
  static async skipSession(sessionId: string, userId: string, notes?: string) {
    const [session] = await db
      .select({ id: studyPlanSessions.id })
      .from(studyPlanSessions)
      .innerJoin(studyPlans, eq(studyPlanSessions.studyPlanId, studyPlans.id))
      .where(and(eq(studyPlanSessions.id, sessionId), eq(studyPlans.userId, userId)));

    if (!session) {
      throw new Error('Sessão de estudos não encontrada ou acesso não autorizado.');
    }

    const [updated] = await db
      .update(studyPlanSessions)
      .set({
        status: 'SKIPPED',
        notes: notes || 'Sessão pulada pelo estudante.',
      })
      .where(eq(studyPlanSessions.id, sessionId))
      .returning();

    return updated;
  }

  /**
   * Reagenda a sessão de estudos para uma nova data/horário (status da original: RESCHEDULED),
   * criando uma nova ocorrência com status PLANNED.
   */
  static async rescheduleSession(
    sessionId: string,
    userId: string,
    data: {
      newDate: string; // "YYYY-MM-DD"
      newStartTime?: string;
      newEndTime?: string;
    }
  ) {
    const [original] = await db
      .select()
      .from(studyPlanSessions)
      .innerJoin(studyPlans, eq(studyPlanSessions.studyPlanId, studyPlans.id))
      .where(and(eq(studyPlanSessions.id, sessionId), eq(studyPlans.userId, userId)));

    if (!original) {
      throw new Error('Sessão de estudos não encontrada ou acesso não autorizado.');
    }

    const orig = original.study_plan_sessions;

    // 1. Marca a original como RESCHEDULED
    await db
      .update(studyPlanSessions)
      .set({ status: 'RESCHEDULED' })
      .where(eq(studyPlanSessions.id, sessionId));

    // 2. Cria a nova sessão reagendada
    const [newSession] = await db
      .insert(studyPlanSessions)
      .values({
        studyPlanId: orig.studyPlanId,
        subjectId: orig.subjectId,
        topicId: orig.topicId,
        lessonId: orig.lessonId,
        simulationId: orig.simulationId,
        sessionDate: data.newDate,
        startTime: data.newStartTime || orig.startTime,
        endTime: data.newEndTime || orig.endTime,
        plannedMinutes: orig.plannedMinutes,
        actualMinutes: 0,
        type: orig.type,
        targetQuestionsCount: orig.targetQuestionsCount,
        completedQuestionsCount: 0,
        status: 'PLANNED',
        ordering: orig.ordering,
        notes: `Reagendada a partir da sessão original de ${orig.sessionDate}`,
        explanation: orig.explanation,
        rescheduledFromSessionId: orig.id,
      })
      .returning();

    return newSession;
  }
}
