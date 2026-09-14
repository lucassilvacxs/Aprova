import { db } from '../db';
import {
  lessons,
  modules,
  courses,
  contents,
  lessonResources,
  userLessonProgress,
  subjects,
} from '../db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const LessonService = {
  /**
   * Obtém a aula detalhada com conteúdos, materiais, navegação e status de conclusão.
   */
  async getLessonById(lessonId: string, role?: string, userId?: string) {
    const isAdmin = role === 'admin';

    const [lesson] = await db
      .select({
        id: lessons.id,
        moduleId: lessons.moduleId,
        title: lessons.title,
        slug: lessons.slug,
        description: lessons.description,
        orderIndex: lessons.orderIndex,
        estimatedDurationMin: lessons.estimatedDurationMin,
        type: lessons.type,
        videoUrl: lessons.videoUrl,
        status: lessons.status,
        createdAt: lessons.createdAt,
        updatedAt: lessons.updatedAt,
        moduleTitle: modules.title,
        moduleStatus: modules.status,
        courseId: modules.courseId,
        courseTitle: courses.title,
        courseStatus: courses.status,
        subjectId: courses.subjectId,
        subjectName: subjects.name,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .leftJoin(subjects, eq(courses.subjectId, subjects.id))
      .where(eq(lessons.id, lessonId));

    if (!lesson) return null;

    // Aluno não enxerga aulas, módulos ou cursos não publicados
    if (!isAdmin) {
      if (
        lesson.status !== 'published' ||
        lesson.moduleStatus !== 'published' ||
        lesson.courseStatus !== 'published'
      ) {
        return null;
      }
    }

    // Busca conteúdos (Markdown)
    const contentRows = await db
      .select()
      .from(contents)
      .where(eq(contents.lessonId, lessonId))
      .orderBy(asc(contents.orderIndex));

    // Busca materiais complementares (PDFs / links)
    const resourceRows = await db
      .select()
      .from(lessonResources)
      .where(
        isAdmin
          ? eq(lessonResources.lessonId, lessonId)
          : and(eq(lessonResources.lessonId, lessonId), eq(lessonResources.status, 'published'))
      )
      .orderBy(asc(lessonResources.orderIndex));

    // Busca irmãos no mesmo módulo para currículo da aula
    const siblingRows = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        orderIndex: lessons.orderIndex,
        estimatedDurationMin: lessons.estimatedDurationMin,
        type: lessons.type,
        status: lessons.status,
      })
      .from(lessons)
      .where(
        isAdmin
          ? eq(lessons.moduleId, lesson.moduleId)
          : and(eq(lessons.moduleId, lesson.moduleId), eq(lessons.status, 'published'))
      )
      .orderBy(asc(lessons.orderIndex), asc(lessons.createdAt));

    // Busca status de conclusão do usuário para os irmãos
    let completedLessonIds = new Set<string>();
    if (userId && siblingRows.length > 0) {
      const sIds = siblingRows.map((s: any) => s.id);
      const userProg = await db
        .select({ lessonId: userLessonProgress.lessonId })
        .from(userLessonProgress)
        .where(
          and(
            eq(userLessonProgress.userId, userId),
            eq(userLessonProgress.status, 'completed'),
            inArray(userLessonProgress.lessonId, sIds)
          )
        );
      completedLessonIds = new Set(userProg.map((p: any) => p.lessonId));
    }

    // Identifica aula anterior e próxima
    const currentIndex = siblingRows.findIndex((s: any) => s.id === lessonId);
    const previousLesson = currentIndex > 0 ? siblingRows[currentIndex - 1] : null;
    const nextLesson = currentIndex >= 0 && currentIndex < siblingRows.length - 1 ? siblingRows[currentIndex + 1] : null;

    const isCompleted = completedLessonIds.has(lessonId);

    const curriculum = siblingRows.map((s: any) => ({
      ...s,
      isCompleted: completedLessonIds.has(s.id),
      isCurrent: s.id === lessonId,
    }));

    return {
      ...lesson,
      isCompleted,
      contents: contentRows,
      resources: resourceRows,
      previousLesson: previousLesson ? { id: previousLesson.id, title: previousLesson.title } : null,
      nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
      curriculum,
    };
  },

  /**
   * Cria nova aula com suporte a conteúdo textual e materiais (Admin).
   */
  async createLesson(data: {
    moduleId: string;
    title: string;
    slug?: string;
    description?: string | null;
    orderIndex?: number;
    estimatedDurationMin?: number;
    type?: string;
    videoUrl?: string | null;
    status?: string;
    contentBody?: string;
    resources?: Array<{ title: string; type: string; url: string }>;
  }) {
    let order = data.orderIndex;
    if (order === undefined) {
      const existing = await db
        .select({ orderIndex: lessons.orderIndex })
        .from(lessons)
        .where(eq(lessons.moduleId, data.moduleId))
        .orderBy(asc(lessons.orderIndex));

      order = existing.length > 0 ? existing[existing.length - 1].orderIndex + 1 : 1;
    }

    const slug = data.slug || `${slugify(data.title)}-${Date.now().toString(36)}`;

    return await db.transaction(async (tx: any) => {
      const [createdLesson] = await tx
        .insert(lessons)
        .values({
          moduleId: data.moduleId,
          title: data.title,
          slug,
          description: data.description || null,
          orderIndex: order,
          estimatedDurationMin: data.estimatedDurationMin || 30,
          type: data.type || 'text',
          videoUrl: data.videoUrl || null,
          status: data.status || 'published',
        })
        .returning();

      // Salva o corpo de conteúdo se fornecido
      if (data.contentBody) {
        await tx.insert(contents).values({
          lessonId: createdLesson.id,
          type: 'text_markdown',
          body: data.contentBody,
          orderIndex: 1,
        });
      }

      // Salva materiais se fornecidos
      if (data.resources && data.resources.length > 0) {
        for (let i = 0; i < data.resources.length; i++) {
          const res = data.resources[i];
          await tx.insert(lessonResources).values({
            lessonId: createdLesson.id,
            title: res.title,
            type: res.type || 'pdf',
            url: res.url,
            orderIndex: i + 1,
            status: 'published',
          });
        }
      }

      return createdLesson;
    });
  },

  /**
   * Atualiza informações da aula, corpo de conteúdo e materiais (Admin).
   */
  async updateLesson(
    lessonId: string,
    data: {
      title?: string;
      slug?: string;
      description?: string | null;
      estimatedDurationMin?: number;
      type?: string;
      videoUrl?: string | null;
      status?: string;
      contentBody?: string;
      resources?: Array<{ title: string; type: string; url: string }>;
    }
  ) {
    return await db.transaction(async (tx: any) => {
      const [updatedLesson] = await tx
        .update(lessons)
        .set({
          title: data.title,
          slug: data.slug,
          description: data.description,
          estimatedDurationMin: data.estimatedDurationMin,
          type: data.type,
          videoUrl: data.videoUrl,
          status: data.status,
          updatedAt: new Date(),
        })
        .where(eq(lessons.id, lessonId))
        .returning();

      // Se enviou contentBody, atualiza ou cria
      if (data.contentBody !== undefined) {
        const existingContent = await tx
          .select()
          .from(contents)
          .where(eq(contents.lessonId, lessonId));

        if (existingContent.length > 0) {
          await tx
            .update(contents)
            .set({ body: data.contentBody })
            .where(eq(contents.id, existingContent[0].id));
        } else {
          await tx.insert(contents).values({
            lessonId,
            type: 'text_markdown',
            body: data.contentBody,
            orderIndex: 1,
          });
        }
      }

      // Se enviou resources, sincroniza
      if (data.resources !== undefined) {
        await tx.delete(lessonResources).where(eq(lessonResources.lessonId, lessonId));
        for (let i = 0; i < data.resources.length; i++) {
          const res = data.resources[i];
          await tx.insert(lessonResources).values({
            lessonId,
            title: res.title,
            type: res.type || 'pdf',
            url: res.url,
            orderIndex: i + 1,
            status: 'published',
          });
        }
      }

      return updatedLesson;
    });
  },

  /**
   * Reordena aula dentro do módulo (Admin).
   */
  async reorderLesson(lessonId: string, direction: 'up' | 'down') {
    const [target] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!target) return null;

    const siblings = await db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, target.moduleId))
      .orderBy(asc(lessons.orderIndex), asc(lessons.createdAt));

    const currentIndex = siblings.findIndex((l: any) => l.id === lessonId);
    if (currentIndex === -1) return target;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) {
      return target;
    }

    const other = siblings[swapIndex];

    await db.transaction(async (tx: any) => {
      await tx
        .update(lessons)
        .set({ orderIndex: other.orderIndex, updatedAt: new Date() })
        .where(eq(lessons.id, target.id));

      await tx
        .update(lessons)
        .set({ orderIndex: target.orderIndex, updatedAt: new Date() })
        .where(eq(lessons.id, other.id));
    });

    const [refreshed] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    return refreshed;
  },

  /**
   * Arquiva aula (Soft delete).
   */
  async archiveLesson(lessonId: string) {
    const [archived] = await db
      .update(lessons)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, lessonId))
      .returning();

    return archived;
  },
};
