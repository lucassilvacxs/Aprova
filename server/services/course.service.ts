import { db } from '../db';
import {
  courses,
  modules,
  lessons,
  userLessonProgress,
  contests,
  agencies,
  subjects,
} from '../db/schema';
import { eq, and, asc, inArray, desc } from 'drizzle-orm';

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

export interface ListCoursesFilter {
  contestId?: string;
  subjectId?: string;
  status?: string;
  search?: string;
  role?: string;
  userId?: string;
}

export const CourseService = {
  /**
   * Lista cursos com filtros, contagem de módulos/aulas e cálculo de progresso do usuário.
   */
  async listCourses(filters: ListCoursesFilter) {
    const isAdmin = filters.role === 'admin';

    // Base query
    let query = db
      .select({
        id: courses.id,
        contestId: courses.contestId,
        subjectId: courses.subjectId,
        topicId: courses.topicId,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        thumbnailUrl: courses.thumbnailUrl,
        status: courses.status,
        orderIndex: courses.orderIndex,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        contestTitle: contests.title,
        agencyAcronym: agencies.acronym,
        subjectName: subjects.name,
        subjectColor: subjects.colorToken,
      })
      .from(courses)
      .leftJoin(contests, eq(courses.contestId, contests.id))
      .leftJoin(agencies, eq(contests.agencyId, agencies.id))
      .leftJoin(subjects, eq(courses.subjectId, subjects.id))
      .orderBy(asc(courses.orderIndex), desc(courses.createdAt));

    const conditions: any[] = [];

    // Aluno enxerga apenas publicados
    if (!isAdmin) {
      conditions.push(eq(courses.status, 'published'));
    } else if (filters.status) {
      conditions.push(eq(courses.status, filters.status));
    }

    if (filters.contestId) {
      conditions.push(eq(courses.contestId, filters.contestId));
    }

    if (filters.subjectId) {
      conditions.push(eq(courses.subjectId, filters.subjectId));
    }

    const rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    if (rows.length === 0) return [];

    const courseIds = rows.map((r: any) => r.id);

    // Busca contagem de módulos e aulas por curso
    const moduleRows = await db
      .select({
        id: modules.id,
        courseId: modules.courseId,
        status: modules.status,
      })
      .from(modules)
      .where(inArray(modules.courseId, courseIds));

    const activeModuleIds = isAdmin
      ? moduleRows.map((m: any) => m.id)
      : moduleRows.filter((m: any) => m.status === 'published').map((m: any) => m.id);

    let lessonRows: any[] = [];
    if (activeModuleIds.length > 0) {
      lessonRows = await db
        .select({
          id: lessons.id,
          moduleId: lessons.moduleId,
          estimatedDurationMin: lessons.estimatedDurationMin,
          status: lessons.status,
        })
        .from(lessons)
        .where(inArray(lessons.moduleId, activeModuleIds));
    }

    // Busca aulas concluídas pelo usuário
    let completedLessonIds = new Set<string>();
    if (filters.userId && lessonRows.length > 0) {
      const allLessonIds = lessonRows.map((l: any) => l.id);
      const userProg = await db
        .select({ lessonId: userLessonProgress.lessonId })
        .from(userLessonProgress)
        .where(
          and(
            eq(userLessonProgress.userId, filters.userId),
            eq(userLessonProgress.status, 'completed'),
            inArray(userLessonProgress.lessonId, allLessonIds)
          )
        );
      completedLessonIds = new Set(userProg.map((p: any) => p.lessonId));
    }

    // Mapeamento por curso
    const moduleCountMap: Record<string, number> = {};
    const moduleToCourseMap: Record<string, string> = {};
    for (const m of moduleRows) {
      if (isAdmin || m.status === 'published') {
        moduleCountMap[m.courseId] = (moduleCountMap[m.courseId] || 0) + 1;
        moduleToCourseMap[m.id] = m.courseId;
      }
    }

    const totalLessonsMap: Record<string, number> = {};
    const completedLessonsMap: Record<string, number> = {};
    const totalDurationMap: Record<string, number> = {};

    for (const l of lessonRows) {
      if (isAdmin || l.status === 'published') {
        const courseId = moduleToCourseMap[l.moduleId];
        if (courseId) {
          totalLessonsMap[courseId] = (totalLessonsMap[courseId] || 0) + 1;
          totalDurationMap[courseId] = (totalDurationMap[courseId] || 0) + (l.estimatedDurationMin || 0);
          if (completedLessonIds.has(l.id)) {
            completedLessonsMap[courseId] = (completedLessonsMap[courseId] || 0) + 1;
          }
        }
      }
    }

    return rows.map((c: any) => {
      const totalLessons = totalLessonsMap[c.id] || 0;
      const completedLessons = completedLessonsMap[c.id] || 0;
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        ...c,
        modulesCount: moduleCountMap[c.id] || 0,
        lessonsCount: totalLessons,
        completedLessonsCount: completedLessons,
        progress,
        totalDurationMin: totalDurationMap[c.id] || 0,
      };
    });
  },

  /**
   * Retorna os detalhes completos de um curso, incluindo sua árvore de módulos e aulas.
   */
  async getCourseById(courseId: string, role?: string, userId?: string) {
    const isAdmin = role === 'admin';

    const [course] = await db
      .select({
        id: courses.id,
        contestId: courses.contestId,
        subjectId: courses.subjectId,
        topicId: courses.topicId,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        thumbnailUrl: courses.thumbnailUrl,
        status: courses.status,
        orderIndex: courses.orderIndex,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        contestTitle: contests.title,
        agencyAcronym: agencies.acronym,
        subjectName: subjects.name,
        subjectColor: subjects.colorToken,
      })
      .from(courses)
      .leftJoin(contests, eq(courses.contestId, contests.id))
      .leftJoin(agencies, eq(contests.agencyId, agencies.id))
      .leftJoin(subjects, eq(courses.subjectId, subjects.id))
      .where(eq(courses.id, courseId));

    if (!course) return null;
    if (!isAdmin && course.status !== 'published') return null;

    // Busca módulos ordenados
    const moduleRows = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.orderIndex), asc(modules.createdAt));

    const visibleModules = isAdmin
      ? moduleRows
      : moduleRows.filter((m: any) => m.status === 'published');

    const moduleIds = visibleModules.map((m: any) => m.id);

    let lessonRows: any[] = [];
    if (moduleIds.length > 0) {
      lessonRows = await db
        .select()
        .from(lessons)
        .where(inArray(lessons.moduleId, moduleIds))
        .orderBy(asc(lessons.orderIndex), asc(lessons.createdAt));
    }

    const visibleLessons = isAdmin
      ? lessonRows
      : lessonRows.filter((l: any) => l.status === 'published');

    // Aulas concluídas pelo usuário
    let completedLessonIds = new Set<string>();
    if (userId && visibleLessons.length > 0) {
      const allLessonIds = visibleLessons.map((l: any) => l.id);
      const userProg = await db
        .select({ lessonId: userLessonProgress.lessonId })
        .from(userLessonProgress)
        .where(
          and(
            eq(userLessonProgress.userId, userId),
            eq(userLessonProgress.status, 'completed'),
            inArray(userLessonProgress.lessonId, allLessonIds)
          )
        );
      completedLessonIds = new Set(userProg.map((p: any) => p.lessonId));
    }

    // Organiza aulas dentro de módulos
    const lessonsByModule: Record<string, any[]> = {};
    for (const l of visibleLessons) {
      if (!lessonsByModule[l.moduleId]) lessonsByModule[l.moduleId] = [];
      lessonsByModule[l.moduleId].push({
        ...l,
        isCompleted: completedLessonIds.has(l.id),
      });
    }

    let courseTotalLessons = 0;
    let courseCompletedLessons = 0;
    let courseTotalDuration = 0;

    const enrichedModules = visibleModules.map((m: any) => {
      const modLessons = lessonsByModule[m.id] || [];
      const totalMod = modLessons.length;
      const completedMod = modLessons.filter((l: any) => l.isCompleted).length;
      const durationMod = modLessons.reduce((acc: number, l: any) => acc + (l.estimatedDurationMin || 0), 0);
      const progressMod = totalMod > 0 ? Math.round((completedMod / totalMod) * 100) : 0;

      courseTotalLessons += totalMod;
      courseCompletedLessons += completedMod;
      courseTotalDuration += durationMod;

      return {
        ...m,
        lessonsCount: totalMod,
        completedLessonsCount: completedMod,
        progress: progressMod,
        durationMinutes: durationMod,
        lessons: modLessons,
      };
    });

    const courseProgress = courseTotalLessons > 0 ? Math.round((courseCompletedLessons / courseTotalLessons) * 100) : 0;

    return {
      ...course,
      modulesCount: enrichedModules.length,
      lessonsCount: courseTotalLessons,
      completedLessonsCount: courseCompletedLessons,
      progress: courseProgress,
      totalDurationMin: courseTotalDuration,
      modules: enrichedModules,
    };
  },

  /**
   * Cria novo curso (Admin).
   */
  async createCourse(data: {
    contestId?: string | null;
    subjectId?: string | null;
    topicId?: string | null;
    title: string;
    slug?: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    status?: string;
  }) {
    const slug = data.slug || `${slugify(data.title)}-${Date.now().toString(36)}`;

    const [created] = await db
      .insert(courses)
      .values({
        contestId: data.contestId || null,
        subjectId: data.subjectId || null,
        topicId: data.topicId || null,
        title: data.title,
        slug,
        description: data.description || null,
        thumbnailUrl: data.thumbnailUrl || null,
        status: data.status || 'published',
      })
      .returning();

    return created;
  },

  /**
   * Atualiza curso existente (Admin).
   */
  async updateCourse(
    courseId: string,
    data: {
      contestId?: string | null;
      subjectId?: string | null;
      topicId?: string | null;
      title?: string;
      slug?: string;
      description?: string | null;
      thumbnailUrl?: string | null;
      status?: string;
      orderIndex?: number;
    }
  ) {
    const [updated] = await db
      .update(courses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    return updated;
  },

  /**
   * Arquiva curso (Soft delete).
   */
  async archiveCourse(courseId: string) {
    const [archived] = await db
      .update(courses)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    return archived;
  },
};
