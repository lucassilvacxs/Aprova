import { db } from '../db';
import {
  questionFavorites,
  questionReviewFlags,
  questionReports,
  questions,
  users,
} from '../db/schema';
import { eq, and, desc, count } from 'drizzle-orm';

export interface CreateReportDTO {
  type: string;
  description: string;
}

export const QuestionActionsService = {
  /**
   * Alterna a marcação de questão favorita pelo aluno (Idempotente).
   */
  async toggleFavorite(userId: string, questionId: string) {
    const [existing] = await db
      .select()
      .from(questionFavorites)
      .where(
        and(
          eq(questionFavorites.userId, userId),
          eq(questionFavorites.questionId, questionId)
        )
      );

    if (existing) {
      await db
        .delete(questionFavorites)
        .where(eq(questionFavorites.id, existing.id));
      return { favorited: false, questionId };
    } else {
      await db.insert(questionFavorites).values({
        userId,
        questionId,
      });
      return { favorited: true, questionId };
    }
  },

  /**
   * Alterna a sinalização de questão para revisão posterior.
   */
  async toggleReviewFlag(userId: string, questionId: string) {
    const [existing] = await db
      .select()
      .from(questionReviewFlags)
      .where(
        and(
          eq(questionReviewFlags.userId, userId),
          eq(questionReviewFlags.questionId, questionId)
        )
      );

    if (existing) {
      await db
        .delete(questionReviewFlags)
        .where(eq(questionReviewFlags.id, existing.id));
      return { markedForReview: false, questionId };
    } else {
      await db.insert(questionReviewFlags).values({
        userId,
        questionId,
        status: 'pending',
      });
      return { markedForReview: true, questionId };
    }
  },

  /**
   * Envia um reporte de erro ou contestação de questão.
   */
  async createReport(userId: string, questionId: string, data: CreateReportDTO) {
    if (!data.type || data.type.trim() === '') {
      throw new Error('REPORT_TYPE_REQUIRED');
    }
    if (!data.description || data.description.trim() === '') {
      throw new Error('REPORT_DESCRIPTION_REQUIRED');
    }

    const [report] = await db
      .insert(questionReports)
      .values({
        userId,
        questionId,
        type: data.type.trim(),
        description: data.description.trim(),
        status: 'pending',
      })
      .returning();

    return report;
  },

  /**
   * Lista reportes de questões pendentes ou resolvidos (Admin).
   */
  async listReports(filters: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const condition = filters.status ? eq(questionReports.status, filters.status) : undefined;

    const [totalRecord] = await db
      .select({ count: count() })
      .from(questionReports)
      .where(condition);

    const total = Number(totalRecord?.count || 0);

    const rows = await db
      .select({
        id: questionReports.id,
        questionId: questionReports.questionId,
        userId: questionReports.userId,
        type: questionReports.type,
        description: questionReports.description,
        status: questionReports.status,
        createdAt: questionReports.createdAt,
        resolvedAt: questionReports.resolvedAt,
        resolvedBy: questionReports.resolvedBy,
        userName: users.name,
        userEmail: users.email,
        questionStatement: questions.statement,
      })
      .from(questionReports)
      .leftJoin(users, eq(questionReports.userId, users.id))
      .leftJoin(questions, eq(questionReports.questionId, questions.id))
      .where(condition)
      .orderBy(desc(questionReports.createdAt))
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
   * Atualiza status de reporte para resolvido ou rejeitado (Admin).
   */
  async resolveReport(reportId: string, adminId: string, status: 'resolved' | 'rejected') {
    const [report] = await db
      .update(questionReports)
      .set({
        status,
        resolvedAt: new Date(),
        resolvedBy: adminId,
      })
      .where(eq(questionReports.id, reportId))
      .returning();

    if (!report) {
      throw new Error('REPORT_NOT_FOUND');
    }

    return report;
  },
};
