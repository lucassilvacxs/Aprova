import { db } from '../db';
import {
  studyPlanSessions,
  studyPlans,
  studyAvailabilities,
} from '../db/schema';
import { eq, and, asc, lt, gte } from 'drizzle-orm';

export class StudyPlanAdjustmentService {
  /**
   * Reorganiza o cronograma futuro do plano de estudos:
   * 1. Preserva integralmente todas as sessões passadas e já concluídas/puladas.
   * 2. Identifica sessões que ficaram atrasadas (data < hoje e status = PLANNED).
   * 3. Redistribui as sessões atrasadas nos dias futuros com disponibilidade livre.
   */
  static async reorganizeFutureSessions(studyPlanId: string, userId: string) {
    const [plan] = await db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.id, studyPlanId), eq(studyPlans.userId, userId)));

    if (!plan) {
      throw new Error('Plano de estudos não encontrado ou acesso não autorizado.');
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Identifica sessões atrasadas (pendentes no passado)
    const overdueSessions = await db
      .select()
      .from(studyPlanSessions)
      .where(
        and(
          eq(studyPlanSessions.studyPlanId, studyPlanId),
          eq(studyPlanSessions.status, 'PLANNED'),
          lt(studyPlanSessions.sessionDate, todayStr)
        )
      )
      .orderBy(asc(studyPlanSessions.sessionDate), asc(studyPlanSessions.ordering));

    if (overdueSessions.length === 0) {
      return {
        success: true,
        reorganizedCount: 0,
        message: 'Nenhuma sessão atrasada encontrada. Seu plano está em dia!',
      };
    }

    // 2. Busca disponibilidades ativas
    const availabilities = await db
      .select()
      .from(studyAvailabilities)
      .where(and(eq(studyAvailabilities.studyPlanId, studyPlanId), eq(studyAvailabilities.enabled, true)));

    // 3. Busca sessões futuras já agendadas para calcular carga já comprometida
    const futureSessions = await db
      .select()
      .from(studyPlanSessions)
      .where(
        and(
          eq(studyPlanSessions.studyPlanId, studyPlanId),
          gte(studyPlanSessions.sessionDate, todayStr)
        )
      );

    const minutesPlannedByDate = new Map<string, number>();
    for (const fs of futureSessions) {
      const cur = minutesPlannedByDate.get(fs.sessionDate) || 0;
      minutesPlannedByDate.set(fs.sessionDate, cur + fs.plannedMinutes);
    }

    // 4. Encontra slots livres futuros ao longo dos próximos 21 dias
    const today = new Date();
    let overdueIndex = 0;
    let rescheduledCount = 0;

    for (let dayOffset = 0; dayOffset < 21 && overdueIndex < overdueSessions.length; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dayOfWeek = targetDate.getDay();
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const dayAvail = availabilities.find((a: any) => a.dayOfWeek === dayOfWeek);
      if (!dayAvail || dayAvail.availableMinutes <= 0) continue;

      const currentMinutes = minutesPlannedByDate.get(targetDateStr) || 0;
      let remainingCapacity = dayAvail.availableMinutes - currentMinutes;

      while (remainingCapacity >= 30 && overdueIndex < overdueSessions.length) {
        const sessionToMove = overdueSessions[overdueIndex];
        if (sessionToMove.plannedMinutes <= remainingCapacity) {
          // Atualiza a data da sessão atrasada para a data futura
          await db
            .update(studyPlanSessions)
            .set({
              sessionDate: targetDateStr,
              notes: `Recuperada e reorganizada em ${todayStr} (data original: ${sessionToMove.sessionDate})`,
            })
            .where(eq(studyPlanSessions.id, sessionToMove.id));

          remainingCapacity -= sessionToMove.plannedMinutes;
          minutesPlannedByDate.set(targetDateStr, (minutesPlannedByDate.get(targetDateStr) || 0) + sessionToMove.plannedMinutes);
          overdueIndex++;
          rescheduledCount++;
        } else {
          break; // Não cabe mais nesta data, passa para o próximo dia
        }
      }
    }

    return {
      success: true,
      reorganizedCount: rescheduledCount,
      message: `${rescheduledCount} sessão(ões) atrasada(s) foram reorganizadas com sucesso para os próximos dias livres.`,
    };
  }
}
