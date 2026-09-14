import { db } from '../db';
import { modules } from '../db/schema';
import { eq, asc } from 'drizzle-orm';

export const ModuleService = {
  /**
   * Cria novo módulo dentro de um curso (Admin).
   */
  async createModule(data: {
    courseId: string;
    subjectId?: string | null;
    title: string;
    description?: string | null;
    orderIndex?: number;
    status?: string;
  }) {
    let order = data.orderIndex;

    if (order === undefined) {
      // Determina a última ordem existente no curso
      const existing = await db
        .select({ orderIndex: modules.orderIndex })
        .from(modules)
        .where(eq(modules.courseId, data.courseId))
        .orderBy(asc(modules.orderIndex));

      order = existing.length > 0 ? existing[existing.length - 1].orderIndex + 1 : 1;
    }

    const [created] = await db
      .insert(modules)
      .values({
        courseId: data.courseId,
        subjectId: data.subjectId || null,
        title: data.title,
        description: data.description || null,
        orderIndex: order,
        status: data.status || 'published',
      })
      .returning();

    return created;
  },

  /**
   * Atualiza informações do módulo (Admin).
   */
  async updateModule(
    moduleId: string,
    data: {
      title?: string;
      description?: string | null;
      status?: string;
    }
  ) {
    const [updated] = await db
      .update(modules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(modules.id, moduleId))
      .returning();

    return updated;
  },

  /**
   * Reordena módulo para cima ou para baixo (Admin).
   */
  async reorderModule(moduleId: string, direction: 'up' | 'down') {
    const [target] = await db.select().from(modules).where(eq(modules.id, moduleId));
    if (!target) return null;

    const siblings = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, target.courseId))
      .orderBy(asc(modules.orderIndex), asc(modules.createdAt));

    const currentIndex = siblings.findIndex((m: any) => m.id === moduleId);
    if (currentIndex === -1) return target;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) {
      // Já está no extremo
      return target;
    }

    const other = siblings[swapIndex];

    // Troca os orderIndexes
    await db.transaction(async (tx: any) => {
      await tx
        .update(modules)
        .set({ orderIndex: other.orderIndex, updatedAt: new Date() })
        .where(eq(modules.id, target.id));

      await tx
        .update(modules)
        .set({ orderIndex: target.orderIndex, updatedAt: new Date() })
        .where(eq(modules.id, other.id));
    });

    const [refreshed] = await db.select().from(modules).where(eq(modules.id, moduleId));
    return refreshed;
  },

  /**
   * Arquiva módulo (Soft delete).
   */
  async archiveModule(moduleId: string) {
    const [archived] = await db
      .update(modules)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(modules.id, moduleId))
      .returning();

    return archived;
  },
};
