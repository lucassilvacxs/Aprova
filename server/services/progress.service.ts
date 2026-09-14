import { db } from '../db';
import {
  userLessonProgress,
  lessons,
  modules,
  courses,
  subjects,
  userProgress,
  userSubjectProgress,
} from '../db/schema';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';

export const ProgressService = {
  /**
   * Alterna a conclusão de uma aula pelo aluno (Idempotente e Atômico).
   * Recalcula os percentuais de progresso de módulo, curso, disciplina e concurso.
   */
  async toggleLessonComplete(userId: string, lessonId: string) {
    // 1. Verifica se a aula existe e busca suas hierarquias
    const [lesson] = await db
      .select({
        id: lessons.id,
        moduleId: lessons.moduleId,
        title: lessons.title,
        status: lessons.status,
        courseId: modules.courseId,
        subjectId: courses.subjectId,
        contestId: courses.contestId,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(eq(lessons.id, lessonId));

    if (!lesson) {
      throw new Error('AULA_NOT_FOUND');
    }

    // 2. Alterna o status na tabela userLessonProgress
    let isNowCompleted = false;

    await db.transaction(async (tx: any) => {
      const existing = await tx
        .select()
        .from(userLessonProgress)
        .where(
          and(
            eq(userLessonProgress.userId, userId),
            eq(userLessonProgress.lessonId, lessonId)
          )
        );

      if (existing.length === 0) {
        // Primeira interação: marca como concluída
        await tx.insert(userLessonProgress).values({
          userId,
          lessonId,
          status: 'completed',
          completedAt: new Date(),
        });
        isNowCompleted = true;
      } else if (existing[0].status === 'completed') {
        // Já estava concluída: desmarca
        await tx
          .update(userLessonProgress)
          .set({
            status: 'started',
            completedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(userLessonProgress.id, existing[0].id));
        isNowCompleted = false;
      } else {
        // Estava apenas iniciada: marca como concluída
        await tx
          .update(userLessonProgress)
          .set({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userLessonProgress.id, existing[0].id));
        isNowCompleted = true;
      }
    });

    // 3. Recalcula métricas do curso
    const courseModuleRows = await db
      .select({ id: modules.id })
      .from(modules)
      .where(and(eq(modules.courseId, lesson.courseId), eq(modules.status, 'published')));

    const courseModuleIds = courseModuleRows.map((m: any) => m.id);

    let courseTotalLessons = 0;
    let courseCompletedLessons = 0;

    if (courseModuleIds.length > 0) {
      const courseLessonRows = await db
        .select({ id: lessons.id })
        .from(lessons)
        .where(and(inArray(lessons.moduleId, courseModuleIds), eq(lessons.status, 'published')));

      courseTotalLessons = courseLessonRows.length;
      const allCourseLessonIds = courseLessonRows.map((l: any) => l.id);

      if (allCourseLessonIds.length > 0) {
        const userDone = await db
          .select({ id: userLessonProgress.id })
          .from(userLessonProgress)
          .where(
            and(
              eq(userLessonProgress.userId, userId),
              eq(userLessonProgress.status, 'completed'),
              inArray(userLessonProgress.lessonId, allCourseLessonIds)
            )
          );
        courseCompletedLessons = userDone.length;
      }
    }

    const courseProgressPercentage =
      courseTotalLessons > 0 ? Math.round((courseCompletedLessons / courseTotalLessons) * 100) : 0;

    // 4. Se tiver concurso vinculado, atualiza ou insere userProgress
    if (lesson.contestId) {
      // Conta todas as aulas publicadas e concluídas de todos os cursos deste concurso
      const contestCourses = await db
        .select({ id: courses.id })
        .from(courses)
        .where(and(eq(courses.contestId, lesson.contestId), eq(courses.status, 'published')));

      const cCourseIds = contestCourses.map((c: any) => c.id);

      let contestTotalLessons = 0;
      let contestCompletedLessons = 0;

      if (cCourseIds.length > 0) {
        const cModules = await db
          .select({ id: modules.id })
          .from(modules)
          .where(and(inArray(modules.courseId, cCourseIds), eq(modules.status, 'published')));

        const cModIds = cModules.map((m: any) => m.id);
        if (cModIds.length > 0) {
          const cLessons = await db
            .select({ id: lessons.id })
            .from(lessons)
            .where(and(inArray(lessons.moduleId, cModIds), eq(lessons.status, 'published')));

          contestTotalLessons = cLessons.length;
          const cLessonIds = cLessons.map((l: any) => l.id);

          if (cLessonIds.length > 0) {
            const done = await db
              .select({ id: userLessonProgress.id })
              .from(userLessonProgress)
              .where(
                and(
                  eq(userLessonProgress.userId, userId),
                  eq(userLessonProgress.status, 'completed'),
                  inArray(userLessonProgress.lessonId, cLessonIds)
                )
              );
            contestCompletedLessons = done.length;
          }
        }
      }

      const overallPercentage =
        contestTotalLessons > 0 ? ((contestCompletedLessons / contestTotalLessons) * 100).toFixed(2) : '0.00';

      const existingProg = await db
        .select()
        .from(userProgress)
        .where(and(eq(userProgress.userId, userId), eq(userProgress.contestId, lesson.contestId)));

      if (existingProg.length > 0) {
        await db
          .update(userProgress)
          .set({
            completedLessonsCount: contestCompletedLessons,
            overallPercentage,
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userProgress.id, existingProg[0].id));
      } else {
        await db.insert(userProgress).values({
          userId,
          contestId: lesson.contestId,
          completedLessonsCount: contestCompletedLessons,
          overallPercentage,
          lastActivityAt: new Date(),
        });
      }
    }

    // 5. Se tiver disciplina vinculada, atualiza userSubjectProgress
    if (lesson.subjectId) {
      const existingSubjProg = await db
        .select()
        .from(userSubjectProgress)
        .where(
          and(
            eq(userSubjectProgress.userId, userId),
            eq(userSubjectProgress.subjectId, lesson.subjectId)
          )
        );

      if (existingSubjProg.length > 0) {
        await db
          .update(userSubjectProgress)
          .set({
            progressPercentage: courseProgressPercentage.toFixed(2),
            lastStudiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userSubjectProgress.id, existingSubjProg[0].id));
      } else {
        await db.insert(userSubjectProgress).values({
          userId,
          subjectId: lesson.subjectId,
          contestId: lesson.contestId,
          progressPercentage: courseProgressPercentage.toFixed(2),
          lastStudiedAt: new Date(),
        });
      }
    }

    return {
      lessonId,
      isCompleted: isNowCompleted,
      courseProgress: courseProgressPercentage,
      courseTotalLessons,
      courseCompletedLessons,
    };
  },

  /**
   * Retorna os dados para o card "Continue Estudando" no Dashboard.
   */
  async getContinueStudying(userId: string, preferredContestId?: string) {
    // 1. Procura a última aula estudada pelo aluno
    const lastProgress = await db
      .select({
        lessonId: userLessonProgress.lessonId,
        status: userLessonProgress.status,
        updatedAt: userLessonProgress.updatedAt,
      })
      .from(userLessonProgress)
      .innerJoin(lessons, eq(userLessonProgress.lessonId, lessons.id))
      .where(and(eq(userLessonProgress.userId, userId), eq(lessons.status, 'published')))
      .orderBy(desc(userLessonProgress.updatedAt))
      .limit(1);

    let targetLessonId: string | null = null;

    if (lastProgress.length > 0) {
      // Se a última aula estava apenas 'started', continua nela
      if (lastProgress[0].status === 'started') {
        targetLessonId = lastProgress[0].lessonId;
      } else {
        // Se já foi concluída, busca a próxima aula sequencial no mesmo módulo
        const [currLesson] = await db
          .select({ moduleId: lessons.moduleId, orderIndex: lessons.orderIndex })
          .from(lessons)
          .where(eq(lessons.id, lastProgress[0].lessonId));

        if (currLesson) {
          const nextInModule = await db
            .select({ id: lessons.id })
            .from(lessons)
            .where(
              and(
                eq(lessons.moduleId, currLesson.moduleId),
                eq(lessons.status, 'published')
              )
            )
            .orderBy(asc(lessons.orderIndex));

          const nextPending = nextInModule.find((l: any) => l.id !== lastProgress[0].lessonId);
          targetLessonId = nextPending ? nextPending.id : lastProgress[0].lessonId;
        }
      }
    }

    // Se ainda não estudou nenhuma, pega a primeira aula publicada do concurso ativo ou do primeiro curso
    if (!targetLessonId) {
      let firstLessonQuery = db
        .select({ id: lessons.id })
        .from(lessons)
        .innerJoin(modules, eq(lessons.moduleId, modules.id))
        .innerJoin(courses, eq(modules.courseId, courses.id))
        .where(
          and(
            eq(lessons.status, 'published'),
            eq(modules.status, 'published'),
            eq(courses.status, 'published')
          )
        )
        .orderBy(asc(courses.orderIndex), asc(modules.orderIndex), asc(lessons.orderIndex))
        .limit(1);

      if (preferredContestId) {
        firstLessonQuery = db
          .select({ id: lessons.id })
          .from(lessons)
          .innerJoin(modules, eq(lessons.moduleId, modules.id))
          .innerJoin(courses, eq(modules.courseId, courses.id))
          .where(
            and(
              eq(courses.contestId, preferredContestId),
              eq(lessons.status, 'published'),
              eq(modules.status, 'published'),
              eq(courses.status, 'published')
            )
          )
          .orderBy(asc(courses.orderIndex), asc(modules.orderIndex), asc(lessons.orderIndex))
          .limit(1) as any;
      }

      const firstRows = await firstLessonQuery;
      if (firstRows.length > 0) {
        targetLessonId = firstRows[0].id;
      }
    }

    if (!targetLessonId) return null;

    // Busca detalhes completos para exibição no card
    const [lessonDetail] = await db
      .select({
        lessonId: lessons.id,
        lessonTitle: lessons.title,
        estimatedDurationMin: lessons.estimatedDurationMin,
        type: lessons.type,
        moduleId: modules.id,
        moduleTitle: modules.title,
        courseId: courses.id,
        courseTitle: courses.title,
        contestId: courses.contestId,
        subjectId: courses.subjectId,
        subjectName: subjects.name,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .leftJoin(subjects, eq(courses.subjectId, subjects.id))
      .where(eq(lessons.id, targetLessonId));

    return lessonDetail || null;
  },
};
