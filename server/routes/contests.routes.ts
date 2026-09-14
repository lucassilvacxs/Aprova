import { Hono } from 'hono';
import { db } from '../db';
import {
  contests,
  agencies,
  examBoards,
  contestSubjects,
  subjects,
  positions,
  userProgress,
  userSubjectProgress,
} from '../db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/auth.middleware';

export const contestRoutes = new Hono();

/**
 * GET /api/v1/contests
 * Lista os concursos disponíveis para o usuário autenticado com o progresso real.
 */
contestRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user');

  // Constrói query de concursos
  let contestRows = await db
    .select({
      id: contests.id,
      title: contests.title,
      slug: contests.slug,
      year: contests.year,
      status: contests.status,
      vacanciesCount: contests.vacanciesCount,
      salaryBase: contests.salaryBase,
      description: contests.description,
      agencyId: contests.agencyId,
      agencyName: agencies.name,
      agencyAcronym: agencies.acronym,
      boardId: contests.boardId,
      boardAcronym: examBoards.acronym,
    })
    .from(contests)
    .innerJoin(agencies, eq(contests.agencyId, agencies.id))
    .leftJoin(examBoards, eq(contests.boardId, examBoards.id))
    .where(eq(contests.status, 'active'));

  // Se for aluno e tiver allowedContestIds, filtra apenas os permitidos
  if (!user.roles.includes('admin') && user.allowedContestIds.length > 0) {
    contestRows = contestRows.filter((row: any) => user.allowedContestIds.includes(row.id));
  }

  // Busca o progresso do usuário para esses concursos
  const contestIds = contestRows.map((r: any) => r.id);
  let progressMap: Record<string, any> = {};

  if (contestIds.length > 0) {
    const userProg = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, user.id), inArray(userProgress.contestId, contestIds)));

    for (const p of userProg) {
      progressMap[p.contestId] = p;
    }
  }

  const result = contestRows.map((c: any) => {
    const prog = progressMap[c.id];
    return {
      id: c.id,
      acronym: c.agencyAcronym,
      agencyName: c.agencyName,
      agencyFull: c.title,
      slug: c.slug,
      year: c.year,
      status: c.status,
      vacanciesCount: c.vacanciesCount,
      salaryBase: c.salaryBase,
      boardName: c.boardAcronym,
      colorAccent: c.agencyAcronym === 'PRF' ? '#7C5CFA' : '#22C55E',
      userProgress: prog ? parseFloat(prog.overallPercentage) : 0,
      questionsAnswered: prog ? prog.questionsAnswered : 0,
      simulationsCompleted: 0,
      essaysWritten: 0,
      lastStudied: prog?.lastActivityAt ? new Date(prog.lastActivityAt).toISOString().slice(0, 10) : null,
    };
  });

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/v1/contests/:id
 * Retorna detalhes do concurso com suas disciplinas, cargos e progresso do aluno.
 */
contestRoutes.get('/:id', requireAuth, async (c) => {
  const contestId = c.req.param('id');
  const user = c.get('user');

  // Busca o concurso por ID ou SLUG
  const [contest] = await db
    .select({
      id: contests.id,
      title: contests.title,
      slug: contests.slug,
      year: contests.year,
      status: contests.status,
      vacanciesCount: contests.vacanciesCount,
      salaryBase: contests.salaryBase,
      description: contests.description,
      officialPageUrl: contests.officialPageUrl,
      agencyName: agencies.name,
      agencyAcronym: agencies.acronym,
      boardName: examBoards.name,
      boardAcronym: examBoards.acronym,
    })
    .from(contests)
    .innerJoin(agencies, eq(contests.agencyId, agencies.id))
    .leftJoin(examBoards, eq(contests.boardId, examBoards.id))
    .where(eq(contests.id, contestId));

  if (!contest) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Concurso não encontrado.' } }, 404);
  }

  // Busca disciplinas vinculadas ao concurso
  const contestSubjectRows = await db
    .select({
      subjectId: subjects.id,
      name: subjects.name,
      shortName: subjects.shortName,
      slug: subjects.slug,
      colorToken: subjects.colorToken,
      weight: contestSubjects.weight,
      expectedQuestionsCount: contestSubjects.expectedQuestionsCount,
    })
    .from(contestSubjects)
    .innerJoin(subjects, eq(contestSubjects.subjectId, subjects.id))
    .where(eq(contestSubjects.contestId, contest.id));

  // Busca cargos
  const positionsList = await db
    .select()
    .from(positions)
    .where(eq(positions.contestId, contest.id));

  // Busca progresso do aluno neste concurso
  const [prog] = await db
    .select()
    .from(userProgress)
    .where(and(eq(userProgress.userId, user.id), eq(userProgress.contestId, contest.id)));

  // Busca progresso por disciplina do aluno
  const userSubjProg = await db
    .select()
    .from(userSubjectProgress)
    .where(and(eq(userSubjectProgress.userId, user.id), eq(userSubjectProgress.contestId, contest.id)));

  const subjProgMap: Record<string, any> = {};
  for (const sp of userSubjProg) {
    subjProgMap[sp.subjectId] = sp;
  }

  const seenSubjectIds = new Set<string>();
  const enrichedSubjects = contestSubjectRows
    .filter((s: any) => {
      if (seenSubjectIds.has(s.subjectId)) return false;
      seenSubjectIds.add(s.subjectId);
      return true;
    })
    .map((s: any) => {
      const sp = subjProgMap[s.subjectId];
      return {
        id: s.subjectId,
        name: s.name,
        shortName: s.shortName,
        slug: s.slug,
        colorToken: s.colorToken,
        weight: parseFloat(s.weight),
        questionsCount: s.expectedQuestionsCount,
        progress: sp ? parseFloat(sp.progressPercentage) : 0,
        accuracy: sp ? parseFloat(sp.accuracyPercentage) : 0,
        questionsAnswered: sp ? sp.questionsAnswered : 0,
      };
    });

  return c.json({
    success: true,
    data: {
      ...contest,
      userProgress: prog ? parseFloat(prog.overallPercentage) : 0,
      questionsAnswered: prog ? prog.questionsAnswered : 0,
      positions: positionsList,
      subjects: enrichedSubjects,
    },
  });
});

/**
 * GET /api/v1/contests/subjects/list
 * Lista todas as disciplinas com dados de desempenho do usuário.
 */
contestRoutes.get('/subjects/list', requireAuth, async (c) => {
  const user = c.get('user');

  const allSubjects = await db.select().from(subjects);

  // Busca progresso do aluno por disciplina
  const userSubjProg = await db
    .select()
    .from(userSubjectProgress)
    .where(eq(userSubjectProgress.userId, user.id));

  const progMap: Record<string, any> = {};
  for (const sp of userSubjProg) {
    progMap[sp.subjectId] = sp;
  }

  const result = allSubjects.map((s: any) => {
    const p = progMap[s.id];
    return {
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      slug: s.slug,
      description: s.description,
      colorToken: s.colorToken,
      accuracy: p ? parseFloat(p.accuracyPercentage) : 0,
      progress: p ? parseFloat(p.progressPercentage) : 0,
      questions: p ? p.questionsAnswered : 0,
      lastStudied: p?.lastStudiedAt ? 'Recente' : 'Não iniciado',
    };
  });

  return c.json({
    success: true,
    data: result,
  });
});
