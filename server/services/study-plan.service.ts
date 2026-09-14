import { db } from '../db';
import {
  studyPlans,
  studyAvailabilities,
  studyPlanPreferences,
  studyPlanSubjects,
  studyPlanTopics,
  studyPlanSessions,
  contests,
  agencies,
  subjects,
  lessons,
  simulations,
} from '../db/schema';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import { StudyPlanGenerationService } from './study-plan-generation.service';

export interface CreateStudyPlanInput {
  contestId: string;
  name?: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
  weeklyHours?: number;
  dailyMinutes?: number;
  strategy?: string;
  availabilities: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    availableMinutes: number;
    enabled: boolean;
  }>;
  preferences?: {
    minSessionMinutes?: number;
    maxSessionMinutes?: number;
    breakMinutes?: number;
    defaultQuestionsPerSession?: number;
    revisionFrequency?: string;
    prioritizeWeakSubjects?: boolean;
    prioritizeBehindSchedule?: boolean;
    balancedDistribution?: boolean;
  };
  subjects: Array<{
    subjectId: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    weight?: number;
    targetPercentage?: number;
  }>;
  topics?: Array<{
    topicId: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
}

export class StudyPlanService {
  /**
   * Lista todos os planos de estudo do usuário autenticado.
   */
  static async listUserPlans(userId: string) {
    const rows = await db
      .select({
        id: studyPlans.id,
        name: studyPlans.name,
        description: studyPlans.description,
        contestId: studyPlans.contestId,
        startDate: studyPlans.startDate,
        targetDate: studyPlans.targetDate,
        weeklyHours: studyPlans.weeklyHours,
        dailyMinutes: studyPlans.dailyMinutes,
        status: studyPlans.status,
        strategy: studyPlans.strategy,
        createdAt: studyPlans.createdAt,
        updatedAt: studyPlans.updatedAt,
        contestTitle: contests.title,
        agencyAcronym: agencies.acronym,
      })
      .from(studyPlans)
      .innerJoin(contests, eq(studyPlans.contestId, contests.id))
      .leftJoin(agencies, eq(contests.agencyId, agencies.id))
      .where(eq(studyPlans.userId, userId))
      .orderBy(desc(studyPlans.createdAt));

    return rows;
  }

  /**
   * Retorna o plano de estudos atualmente ativo do usuário.
   */
  static async getActivePlan(userId: string) {
    const [active] = await db
      .select({ id: studyPlans.id })
      .from(studyPlans)
      .where(and(eq(studyPlans.userId, userId), eq(studyPlans.status, 'ACTIVE')))
      .limit(1);

    if (!active) return null;
    return this.getPlanById(active.id, userId);
  }

  /**
   * Retorna os detalhes completos de um plano de estudos com suas relações.
   */
  static async getPlanById(planId: string, userId: string) {
    const [planRow] = await db
      .select({
        id: studyPlans.id,
        userId: studyPlans.userId,
        contestId: studyPlans.contestId,
        name: studyPlans.name,
        description: studyPlans.description,
        startDate: studyPlans.startDate,
        targetDate: studyPlans.targetDate,
        weeklyHours: studyPlans.weeklyHours,
        dailyMinutes: studyPlans.dailyMinutes,
        status: studyPlans.status,
        strategy: studyPlans.strategy,
        horizonWeeks: studyPlans.horizonWeeks,
        createdAt: studyPlans.createdAt,
        updatedAt: studyPlans.updatedAt,
        contestTitle: contests.title,
        agencyAcronym: agencies.acronym,
      })
      .from(studyPlans)
      .innerJoin(contests, eq(studyPlans.contestId, contests.id))
      .leftJoin(agencies, eq(contests.agencyId, agencies.id))
      .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)));

    if (!planRow) {
      throw new Error('Plano de estudos não encontrado ou acesso não autorizado.');
    }

    // Carrega disponibilidades
    const availabilities = await db
      .select()
      .from(studyAvailabilities)
      .where(eq(studyAvailabilities.studyPlanId, planId))
      .orderBy(asc(studyAvailabilities.dayOfWeek));

    // Carrega preferências
    const [preferences] = await db
      .select()
      .from(studyPlanPreferences)
      .where(eq(studyPlanPreferences.studyPlanId, planId));

    // Carrega disciplinas
    const planSubs = await db
      .select({
        id: studyPlanSubjects.id,
        subjectId: studyPlanSubjects.subjectId,
        priority: studyPlanSubjects.priority,
        weight: studyPlanSubjects.weight,
        targetPercentage: studyPlanSubjects.targetPercentage,
        targetMinutes: studyPlanSubjects.targetMinutes,
        enabled: studyPlanSubjects.enabled,
        name: subjects.name,
        colorToken: subjects.colorToken,
      })
      .from(studyPlanSubjects)
      .innerJoin(subjects, eq(studyPlanSubjects.subjectId, subjects.id))
      .where(eq(studyPlanSubjects.studyPlanId, planId));

    return {
      ...planRow,
      availabilities,
      preferences,
      subjects: planSubs,
    };
  }

  /**
   * Cria um novo plano de estudos com disponibilidade, preferências e disciplinas.
   */
  static async createPlan(userId: string, input: CreateStudyPlanInput) {
    const name = input.name?.trim() || 'Meu Plano de Estudos';
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const targetDate = input.targetDate ? new Date(input.targetDate) : null;

    // Calcula total de horas semanais a partir da disponibilidade
    const totalWeeklyMinutes = input.availabilities
      .filter((a) => a.enabled)
      .reduce((acc, a) => acc + (a.availableMinutes || 0), 0);
    const weeklyHours = (totalWeeklyMinutes / 60).toFixed(2);
    const dailyMinutes = Math.round(totalWeeklyMinutes / (input.availabilities.filter((a) => a.enabled).length || 1));

    // 1. Cria o plano
    const [newPlan] = await db
      .insert(studyPlans)
      .values({
        userId,
        contestId: input.contestId,
        name,
        description: input.description,
        startDate,
        targetDate,
        weeklyHours,
        dailyMinutes,
        status: 'DRAFT',
        strategy: input.strategy || 'balanced',
        horizonWeeks: 4,
      })
      .returning();

    // 2. Insere disponibilidades
    if (input.availabilities.length > 0) {
      await db.insert(studyAvailabilities).values(
        input.availabilities.map((a) => ({
          studyPlanId: newPlan.id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime || '19:00',
          endTime: a.endTime || '21:00',
          availableMinutes: a.availableMinutes || 120,
          enabled: a.enabled !== undefined ? a.enabled : true,
        }))
      );
    }

    // 3. Insere preferências
    await db.insert(studyPlanPreferences).values({
      studyPlanId: newPlan.id,
      minSessionMinutes: input.preferences?.minSessionMinutes || 30,
      maxSessionMinutes: input.preferences?.maxSessionMinutes || 60,
      breakMinutes: input.preferences?.breakMinutes || 10,
      defaultQuestionsPerSession: input.preferences?.defaultQuestionsPerSession || 20,
      revisionFrequency: input.preferences?.revisionFrequency || 'spaced',
      prioritizeWeakSubjects: input.preferences?.prioritizeWeakSubjects !== undefined ? input.preferences.prioritizeWeakSubjects : true,
      prioritizeBehindSchedule: input.preferences?.prioritizeBehindSchedule !== undefined ? input.preferences.prioritizeBehindSchedule : true,
      balancedDistribution: input.preferences?.balancedDistribution !== undefined ? input.preferences.balancedDistribution : true,
    });

    // 4. Insere disciplinas
    if (input.subjects.length > 0) {
      await db.insert(studyPlanSubjects).values(
        input.subjects.map((s) => ({
          studyPlanId: newPlan.id,
          subjectId: s.subjectId,
          priority: s.priority || 'MEDIUM',
          weight: String(s.weight || '1.00'),
          targetPercentage: String(s.targetPercentage || '0.00'),
          targetMinutes: 0,
          enabled: true,
        }))
      );
    }

    // 5. Insere tópicos opcionais
    if (input.topics && input.topics.length > 0) {
      await db.insert(studyPlanTopics).values(
        input.topics.map((t) => ({
          studyPlanId: newPlan.id,
          topicId: t.topicId,
          priority: t.priority || 'MEDIUM',
          targetMinutes: 0,
          enabled: true,
        }))
      );
    }

    return this.getPlanById(newPlan.id, userId);
  }

  /**
   * Ativa o plano de estudos e gera as sessões no horizonte definido.
   */
  static async activatePlan(planId: string, userId: string) {
    // Valida ownership
    await this.getPlanById(planId, userId);

    // Pausa qualquer outro plano anteriormente ativo do usuário
    await db
      .update(studyPlans)
      .set({ status: 'PAUSED', updatedAt: new Date() })
      .where(and(eq(studyPlans.userId, userId), eq(studyPlans.status, 'ACTIVE')));

    // Gera as sessões e persiste
    await StudyPlanGenerationService.generateSessions(planId, userId, { persist: true });

    // Atualiza status do plano para ACTIVE
    const [updated] = await db
      .update(studyPlans)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(studyPlans.id, planId))
      .returning();

    return updated;
  }

  /**
   * Pausa o plano ativo.
   */
  static async pausePlan(planId: string, userId: string) {
    const [updated] = await db
      .update(studyPlans)
      .set({ status: 'PAUSED', updatedAt: new Date() })
      .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error('Plano de estudos não encontrado ou acesso não autorizado.');
    }
    return updated;
  }

  /**
   * Reativa o plano pausado.
   */
  static async resumePlan(planId: string, userId: string) {
    const [updated] = await db
      .update(studyPlans)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error('Plano de estudos não encontrado ou acesso não autorizado.');
    }
    return updated;
  }

  /**
   * Arquiva o plano de estudos (soft delete).
   */
  static async archivePlan(planId: string, userId: string) {
    const [updated] = await db
      .update(studyPlans)
      .set({ status: 'ARCHIVED', archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error('Plano de estudos não encontrado ou acesso não autorizado.');
    }
    return updated;
  }

  /**
   * Retorna as sessões de um plano filtradas por data e/ou status.
   */
  static async getSessions(
    planId: string,
    userId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      date?: string;
      status?: string;
      type?: string;
    }
  ) {
    // Valida ownership
    const [plan] = await db
      .select({ id: studyPlans.id })
      .from(studyPlans)
      .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)));

    if (!plan) {
      throw new Error('Plano de estudos não encontrado ou acesso não autorizado.');
    }

    const conditions: any[] = [eq(studyPlanSessions.studyPlanId, planId)];

    if (filters?.date) {
      conditions.push(eq(studyPlanSessions.sessionDate, filters.date));
    }
    if (filters?.startDate) {
      conditions.push(gte(studyPlanSessions.sessionDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(studyPlanSessions.sessionDate, filters.endDate));
    }
    if (filters?.status) {
      conditions.push(eq(studyPlanSessions.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(studyPlanSessions.type, filters.type));
    }

    const rows = await db
      .select({
        id: studyPlanSessions.id,
        studyPlanId: studyPlanSessions.studyPlanId,
        subjectId: studyPlanSessions.subjectId,
        topicId: studyPlanSessions.topicId,
        lessonId: studyPlanSessions.lessonId,
        simulationId: studyPlanSessions.simulationId,
        sessionDate: studyPlanSessions.sessionDate,
        startTime: studyPlanSessions.startTime,
        endTime: studyPlanSessions.endTime,
        plannedMinutes: studyPlanSessions.plannedMinutes,
        actualMinutes: studyPlanSessions.actualMinutes,
        type: studyPlanSessions.type,
        targetQuestionsCount: studyPlanSessions.targetQuestionsCount,
        completedQuestionsCount: studyPlanSessions.completedQuestionsCount,
        status: studyPlanSessions.status,
        ordering: studyPlanSessions.ordering,
        notes: studyPlanSessions.notes,
        explanation: studyPlanSessions.explanation,
        startedAt: studyPlanSessions.startedAt,
        completedAt: studyPlanSessions.completedAt,
        subjectName: subjects.name,
        subjectColor: subjects.colorToken,
        lessonTitle: lessons.title,
        simulationTitle: simulations.title,
      })
      .from(studyPlanSessions)
      .innerJoin(subjects, eq(studyPlanSessions.subjectId, subjects.id))
      .leftJoin(lessons, eq(studyPlanSessions.lessonId, lessons.id))
      .leftJoin(simulations, eq(studyPlanSessions.simulationId, simulations.id))
      .where(and(...conditions))
      .orderBy(asc(studyPlanSessions.sessionDate), asc(studyPlanSessions.ordering));

    return rows;
  }

  /**
   * Retorna a agenda de hoje do aluno com base no plano ativo.
   */
  static async getTodaySessions(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];

    const [activePlan] = await db
      .select({ id: studyPlans.id, name: studyPlans.name })
      .from(studyPlans)
      .where(and(eq(studyPlans.userId, userId), eq(studyPlans.status, 'ACTIVE')))
      .limit(1);

    if (!activePlan) {
      return {
        hasActivePlan: false,
        todayDate: todayStr,
        plan: null,
        sessions: [],
        completedCount: 0,
        totalCount: 0,
        nextSession: null,
      };
    }

    const sessions = await this.getSessions(activePlan.id, userId, { date: todayStr });
    const completedCount = sessions.filter((s: any) => s.status === 'COMPLETED').length;
    const nextSession = sessions.find((s: any) => s.status === 'PLANNED' || s.status === 'IN_PROGRESS') || null;
    const plannedMinutes = sessions.reduce((acc: number, s: any) => acc + (s.plannedMinutes || 0), 0);
    const completedMinutes = sessions
      .filter((s: any) => s.status === 'COMPLETED')
      .reduce((acc: number, s: any) => acc + (s.actualMinutes || s.plannedMinutes || 0), 0);

    return {
      hasActivePlan: true,
      todayDate: todayStr,
      plan: activePlan,
      sessions,
      completedCount,
      totalCount: sessions.length,
      nextSession,
      summary: {
        totalSessions: sessions.length,
        completedSessions: completedCount,
        plannedMinutes,
        completedMinutes,
      },
    };
  }
}
