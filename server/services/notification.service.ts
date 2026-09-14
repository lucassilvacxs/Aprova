import { db } from '../db';
import { notifications, userNotifications, users } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export interface NotificationPayload {
  title: string;
  message: string;
  type?: string; // 'NEWS' | 'DOCUMENT' | 'CONTEST' | 'STUDY_PLAN' | 'ESSAY' | 'SIMULATION' | 'system'
  actionUrl?: string;
  contestId?: string | null;
}

export class NotificationService {
  /**
   * Envia uma notificação interna para usuários cadastrados no concurso ou para todos os alunos.
   */
  static async notifyUsers({
    title,
    message,
    type = 'NEWS',
    actionUrl,
    contestId,
  }: NotificationPayload): Promise<string> {
    // 1. Cria a notificação base
    const [inserted] = await db
      .insert(notifications)
      .values({
        title,
        message,
        type,
        actionUrl,
      })
      .returning();

    // 2. Localiza os usuários destinatários
    const allUsers = await db
      .select({ id: users.id, allowedContestIds: users.allowedContestIds, status: users.status })
      .from(users)
      .where(eq(users.status, 'active'));

    const recipientUserIds: string[] = [];
    for (const u of allUsers) {
      if (!contestId) {
        recipientUserIds.push(u.id);
      } else if (Array.isArray(u.allowedContestIds) && u.allowedContestIds.includes(contestId)) {
        recipientUserIds.push(u.id);
      }
    }

    // 3. Associa a notificação aos usuários
    if (recipientUserIds.length > 0) {
      const links = recipientUserIds.map((userId) => ({
        userId,
        notificationId: inserted.id,
      }));
      await db.insert(userNotifications).values(links);
    }

    return inserted.id;
  }

  /**
   * Lista as notificações do usuário ordenadas por data.
   */
  static async getUserNotifications(userId: string, limit = 20) {
    return await db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        actionUrl: notifications.actionUrl,
        createdAt: notifications.createdAt,
        readAt: userNotifications.readAt,
      })
      .from(userNotifications)
      .innerJoin(notifications, eq(userNotifications.notificationId, notifications.id))
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  /**
   * Marca uma notificação específica como lida.
   */
  static async markAsRead(userId: string, notificationId: string) {
    await db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.notificationId, notificationId)
        )
      );
  }
}
