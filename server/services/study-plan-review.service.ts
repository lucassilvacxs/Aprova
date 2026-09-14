import { db } from '../db';
import { studyPlanReviews } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class StudyPlanReviewService {
  /**
   * Agenda o ciclo de revisões espaçadas para uma sessão de aula concluída.
   * Por padrão: D+1, D+7, D+14, D+30.
   */
  static async scheduleSpacedReviews(
    studyPlanId: string,
    sourceSessionId: string,
    subjectId: string,
    topicId: string | null,
    lessonId: string | null,
    baseDateStr: string, // "YYYY-MM-DD"
    intervals: number[] = [1, 7, 14, 30]
  ) {
    const baseDate = new Date(`${baseDateStr}T12:00:00Z`);

    const reviewsToInsert: any[] = [];
    for (const interval of intervals) {
      const scheduledDate = new Date(baseDate);
      scheduledDate.setDate(scheduledDate.getDate() + interval);
      const scheduledDateStr = scheduledDate.toISOString().split('T')[0];

      reviewsToInsert.push({
        studyPlanId,
        sourceSessionId,
        subjectId,
        topicId: topicId || null,
        lessonId: lessonId || null,
        intervalDay: interval,
        scheduledDate: scheduledDateStr,
        status: 'PENDING',
      });
    }

    if (reviewsToInsert.length > 0) {
      await db.insert(studyPlanReviews).values(reviewsToInsert);
    }
  }

  /**
   * Obtém as revisões pendentes para uma data específica.
   */
  static async getPendingReviewsForDate(studyPlanId: string, dateStr: string) {
    return db
      .select()
      .from(studyPlanReviews)
      .where(
        and(
          eq(studyPlanReviews.studyPlanId, studyPlanId),
          eq(studyPlanReviews.scheduledDate, dateStr),
          eq(studyPlanReviews.status, 'PENDING')
        )
      );
  }

  /**
   * Marca uma revisão como concluída.
   */
  static async completeReview(reviewId: string) {
    const [updated] = await db
      .update(studyPlanReviews)
      .set({
        status: 'COMPLETED',
        completedAt: new Date(),
      })
      .where(eq(studyPlanReviews.id, reviewId))
      .returning();

    return updated;
  }
}
