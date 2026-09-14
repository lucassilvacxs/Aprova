import { db } from '../db';
import {
  simulations,
  simulationQuestions,
  simulationAttempts,
  questions,
  contests,
  agencies,
  subjects,
} from '../db/schema';
import { eq, and, or, inArray, sql, desc, asc } from 'drizzle-orm';
import { SimulationQuestionSelectionService } from './simulation-selection.service';

export interface ListSimulationsFilters {
  contestId?: string;
  type?: string; // 'FIXED' | 'RANDOM' | 'CUSTOM' | 'ALL'
  status?: string; // 'published' | 'draft' | 'archived'
  difficulty?: string;
  search?: string;
  tab?: 'all' | 'available' | 'in_progress' | 'completed' | 'custom';
}

export class SimulationService {
  /**
   * Lista simulados com filtros, suporte a pesquisa e status das tentativas do estudante.
   */
  static async listSimulations(filters: ListSimulationsFilters, userId?: string, isAdmin: boolean = false) {
    const conditions: any[] = [];

    // Aluno visualiza apenas publicados, ou simulados customizados criados por ele próprio
    if (!isAdmin) {
      if (userId) {
        conditions.push(
          or(
            and(eq(simulations.status, 'published'), eq(simulations.isPublic, true)),
            and(eq(simulations.type, 'CUSTOM'), eq(simulations.createdBy, userId))
          )
        );
      } else {
        conditions.push(and(eq(simulations.status, 'published'), eq(simulations.isPublic, true)));
      }
    } else if (filters.status) {
      conditions.push(eq(simulations.status, filters.status));
    }

    if (filters.contestId) {
      conditions.push(eq(simulations.contestId, filters.contestId));
    }

    if (filters.type && filters.type !== 'ALL') {
      conditions.push(eq(simulations.type, filters.type));
    }

    if (filters.difficulty && filters.difficulty !== 'ALL') {
      conditions.push(eq(simulations.difficulty, filters.difficulty.toUpperCase()));
    }

    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(or(sql`${simulations.title} ILIKE ${q}`, sql`${simulations.description} ILIKE ${q}`));
    }

    const simRows = await db
      .select({
        id: simulations.id,
        contestId: simulations.contestId,
        title: simulations.title,
        description: simulations.description,
        type: simulations.type,
        durationMinutes: simulations.durationMinutes,
        penaltyRule: simulations.penaltyRule,
        penaltyFactor: simulations.penaltyFactor,
        totalQuestions: simulations.totalQuestions,
        difficulty: simulations.difficulty,
        status: simulations.status,
        isOfficial: simulations.isOfficial,
        isPublic: simulations.isPublic,
        filterConfig: simulations.filterConfig,
        createdBy: simulations.createdBy,
        createdAt: simulations.createdAt,
        updatedAt: simulations.updatedAt,
        publishedAt: simulations.publishedAt,
        contestTitle: contests.title,
        contestSlug: contests.slug,
        agencyAcronym: agencies.acronym,
      })
      .from(simulations)
      .innerJoin(contests, eq(simulations.contestId, contests.id))
      .leftJoin(agencies, eq(contests.agencyId, agencies.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(simulations.createdAt));

    // Se houver userId, busca as tentativas do usuário para enriquecer os cards
    let userAttemptsMap = new Map<string, { latestStatus: string; inProgressId: string | null; bestScore: string | null; bestPercentage: string | null; attemptsCount: number }>();
    if (userId && simRows.length > 0) {
      const simIds = simRows.map((s: any) => s.id);
      const attempts = await db
        .select({
          id: simulationAttempts.id,
          simulationId: simulationAttempts.simulationId,
          status: simulationAttempts.status,
          percentage: simulationAttempts.percentage,
          totalScore: simulationAttempts.totalScore,
          startedAt: simulationAttempts.startedAt,
        })
        .from(simulationAttempts)
        .where(and(eq(simulationAttempts.userId, userId), inArray(simulationAttempts.simulationId, simIds)))
        .orderBy(desc(simulationAttempts.startedAt));

      for (const att of attempts) {
        const cur = userAttemptsMap.get(att.simulationId) || {
          latestStatus: att.status,
          inProgressId: att.status === 'IN_PROGRESS' ? att.id : null,
          bestScore: null,
          bestPercentage: null,
          attemptsCount: 0,
        };
        cur.attemptsCount++;
        if (att.status === 'IN_PROGRESS' && !cur.inProgressId) {
          cur.inProgressId = att.id;
          cur.latestStatus = 'IN_PROGRESS';
        }
        if (att.percentage) {
          const numPct = Number(att.percentage);
          const bestNum = cur.bestPercentage ? Number(cur.bestPercentage) : -1;
          if (numPct > bestNum) {
            cur.bestPercentage = att.percentage;
            cur.bestScore = att.totalScore;
          }
        }
        userAttemptsMap.set(att.simulationId, cur);
      }
    }

    // Busca as disciplinas envolvidas em cada simulado fixo
    const result = await Promise.all(
      simRows.map(async (s: any) => {
        const userStat = userAttemptsMap.get(s.id);

        // Busca nomes de disciplinas
        const qSubjects = await db
          .select({
            subjectName: subjects.name,
            subjectShort: subjects.shortName,
          })
          .from(simulationQuestions)
          .innerJoin(questions, eq(simulationQuestions.questionId, questions.id))
          .innerJoin(subjects, eq(questions.subjectId, subjects.id))
          .where(eq(simulationQuestions.simulationId, s.id));

        const subjectNames = Array.from(new Set(qSubjects.map((q: any) => q.subjectShort || q.subjectName)));

        return {
          ...s,
          subjects: subjectNames,
          userStatus: userStat?.latestStatus || 'NOT_STARTED',
          userActiveAttemptId: userStat?.inProgressId || null,
          userBestScore: userStat?.bestScore || null,
          userBestPercentage: userStat?.bestPercentage || null,
          attemptsCount: userStat?.attemptsCount || 0,
        };
      })
    );

    // Filtra pela aba se solicitada
    if (filters.tab) {
      if (filters.tab === 'in_progress') {
        return result.filter((s) => s.userStatus === 'IN_PROGRESS');
      }
      if (filters.tab === 'completed') {
        return result.filter((s) => s.userStatus === 'COMPLETED' || s.userStatus === 'EXPIRED');
      }
      if (filters.tab === 'available') {
        return result.filter((s) => s.userStatus === 'NOT_STARTED');
      }
      if (filters.tab === 'custom') {
        return result.filter((s) => s.type === 'CUSTOM');
      }
    }

    return result;
  }

  /**
   * Retorna detalhes completos de um simulado para tela de preparação.
   */
  static async getSimulationById(simulationId: string, userId?: string, isAdmin: boolean = false) {
    const [sim] = await db
      .select({
        id: simulations.id,
        contestId: simulations.contestId,
        title: simulations.title,
        description: simulations.description,
        type: simulations.type,
        durationMinutes: simulations.durationMinutes,
        penaltyRule: simulations.penaltyRule,
        penaltyFactor: simulations.penaltyFactor,
        totalQuestions: simulations.totalQuestions,
        difficulty: simulations.difficulty,
        status: simulations.status,
        isOfficial: simulations.isOfficial,
        isPublic: simulations.isPublic,
        filterConfig: simulations.filterConfig,
        createdBy: simulations.createdBy,
        createdAt: simulations.createdAt,
        updatedAt: simulations.updatedAt,
        publishedAt: simulations.publishedAt,
        contestTitle: contests.title,
        contestSlug: contests.slug,
        agencyAcronym: agencies.acronym,
      })
      .from(simulations)
      .innerJoin(contests, eq(simulations.contestId, contests.id))
      .leftJoin(agencies, eq(contests.agencyId, agencies.id))
      .where(eq(simulations.id, simulationId));

    if (!sim) {
      throw new Error('Simulado não encontrado.');
    }

    if (!isAdmin && sim.status !== 'published' && sim.createdBy !== userId) {
      throw new Error('Simulado não disponível.');
    }

    // Busca disciplinas e total real de questões vinculadas
    const simQuestions = await db
      .select({
        questionId: simulationQuestions.questionId,
        orderIndex: simulationQuestions.orderIndex,
        points: simulationQuestions.points,
        subjectId: questions.subjectId,
        subjectName: subjects.name,
      })
      .from(simulationQuestions)
      .innerJoin(questions, eq(simulationQuestions.questionId, questions.id))
      .leftJoin(subjects, eq(questions.subjectId, subjects.id))
      .where(eq(simulationQuestions.simulationId, simulationId))
      .orderBy(asc(simulationQuestions.orderIndex));

    const subjectMap: Record<string, { name: string; count: number }> = {};
    for (const sq of simQuestions) {
      const sName = sq.subjectName || 'Geral';
      if (!subjectMap[sName]) {
        subjectMap[sName] = { name: sName, count: 0 };
      }
      subjectMap[sName].count++;
    }

    // Busca tentativa ativa do aluno se houver
    let activeAttempt: any = null;
    if (userId) {
      const [att] = await db
        .select()
        .from(simulationAttempts)
        .where(
          and(
            eq(simulationAttempts.simulationId, simulationId),
            eq(simulationAttempts.userId, userId),
            eq(simulationAttempts.status, 'IN_PROGRESS')
          )
        )
        .orderBy(desc(simulationAttempts.startedAt));

      if (att) {
        // Valida se o tempo já estourou no relógio do servidor
        const expiresAt = new Date(att.startedAt).getTime() + sim.durationMinutes * 60 * 1000;
        const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        activeAttempt = {
          ...att,
          remainingSeconds,
          isExpired: remainingSeconds === 0,
        };
      }
    }

    return {
      ...sim,
      actualQuestionsCount: simQuestions.length,
      subjectsBreakdown: Object.values(subjectMap),
      activeAttempt,
    };
  }

  /**
   * Criação de simulado personalizado pelo aluno (Modo Wizard / Monte seu Simulado).
   */
  static async createCustomSimulation(
    userId: string,
    data: {
      contestId: string;
      title?: string;
      subjectIds?: string[];
      topicIds?: string[];
      boardId?: string;
      difficulty?: string;
      questionCount: number;
      durationMinutes?: number;
      penaltyRule?: string;
    }
  ) {
    const questionCount = Math.max(1, Math.min(120, data.questionCount || 30));
    const durationMinutes = data.durationMinutes || Math.max(15, questionCount * 2); // 2 min por questão por padrão

    const filters = {
      contestId: data.contestId,
      subjectIds: data.subjectIds,
      topicIds: data.topicIds,
      boardId: data.boardId,
      difficulty: data.difficulty,
    };

    // Validação de disponibilidade antes de criar
    const available = await SimulationQuestionSelectionService.countAvailableQuestions(filters);
    if (available === 0) {
      const err: any = new Error('Nenhuma questão encontrada para os filtros selecionados.');
      err.code = 'NO_QUESTIONS_AVAILABLE';
      err.available = 0;
      throw err;
    }

    if (available < questionCount) {
      const err: any = new Error(
        `Não existem questões suficientes para esses filtros. Encontramos ${available} questões disponíveis.`
      );
      err.code = 'INSUFFICIENT_QUESTIONS';
      err.available = available;
      err.requested = questionCount;
      throw err;
    }

    // Seleciona as questões com algoritmo anti-repetição
    const selectedQuestionIds = await SimulationQuestionSelectionService.selectQuestions(
      filters,
      questionCount,
      userId
    );

    // Cria o simulado customizado
    const title = data.title?.trim() || `Simulado Personalizado (${selectedQuestionIds.length} questões)`;

    const [newSim] = await db
      .insert(simulations)
      .values({
        contestId: data.contestId,
        title,
        description: `Simulado personalizado criado em ${new Date().toLocaleDateString('pt-BR')}`,
        type: 'CUSTOM',
        durationMinutes,
        penaltyRule: data.penaltyRule || 'none',
        totalQuestions: selectedQuestionIds.length,
        difficulty: (data.difficulty || 'MEDIO').toUpperCase(),
        status: 'published',
        isOfficial: false,
        isPublic: false,
        createdBy: userId,
        publishedAt: new Date(),
        filterConfig: filters,
      })
      .returning();

    // Insere as questões selecionadas
    for (let idx = 0; idx < selectedQuestionIds.length; idx++) {
      await db.insert(simulationQuestions).values({
        simulationId: newSim.id,
        questionId: selectedQuestionIds[idx],
        orderIndex: idx + 1,
        points: '1.00',
      });
    }

    return newSim;
  }

  // ── MÉTODOS DE ADMINISTRAÇÃO (ADMIN) ────────────────────────────────────────

  static async createSimulation(
    adminId: string,
    data: {
      contestId: string;
      title: string;
      description?: string;
      type: 'FIXED' | 'RANDOM';
      durationMinutes: number;
      penaltyRule?: string;
      penaltyFactor?: string;
      difficulty?: string;
      isOfficial?: boolean;
      status?: 'draft' | 'published';
      questionIds?: string[]; // se FIXED
      filterConfig?: any; // se RANDOM
      totalQuestions?: number;
    }
  ) {
    const status = data.status || 'draft';
    const totalQuestions = data.type === 'FIXED' ? (data.questionIds?.length || 0) : (data.totalQuestions || 30);

    const [newSim] = await db
      .insert(simulations)
      .values({
        contestId: data.contestId,
        title: data.title,
        description: data.description,
        type: data.type,
        durationMinutes: data.durationMinutes || 60,
        penaltyRule: data.penaltyRule || 'none',
        penaltyFactor: data.penaltyFactor || '1.00',
        totalQuestions,
        difficulty: (data.difficulty || 'MEDIO').toUpperCase(),
        status,
        isOfficial: data.isOfficial !== undefined ? data.isOfficial : true,
        isPublic: true,
        createdBy: adminId,
        filterConfig: data.filterConfig || null,
        publishedAt: status === 'published' ? new Date() : null,
      })
      .returning();

    if (data.type === 'FIXED' && data.questionIds && data.questionIds.length > 0) {
      for (let idx = 0; idx < data.questionIds.length; idx++) {
        await db.insert(simulationQuestions).values({
          simulationId: newSim.id,
          questionId: data.questionIds[idx],
          orderIndex: idx + 1,
          points: '1.00',
        });
      }
    }

    return newSim;
  }

  static async updateSimulation(
    simulationId: string,
    _adminId: string,
    data: {
      title?: string;
      description?: string;
      durationMinutes?: number;
      penaltyRule?: string;
      penaltyFactor?: string;
      difficulty?: string;
      isOfficial?: boolean;
      status?: string;
      questionIds?: string[];
      filterConfig?: any;
    }
  ) {
    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.durationMinutes !== undefined) updatePayload.durationMinutes = data.durationMinutes;
    if (data.penaltyRule !== undefined) updatePayload.penaltyRule = data.penaltyRule;
    if (data.penaltyFactor !== undefined) updatePayload.penaltyFactor = data.penaltyFactor;
    if (data.difficulty !== undefined) updatePayload.difficulty = data.difficulty.toUpperCase();
    if (data.isOfficial !== undefined) updatePayload.isOfficial = data.isOfficial;
    if (data.status !== undefined) {
      updatePayload.status = data.status;
      if (data.status === 'published') updatePayload.publishedAt = new Date();
    }
    if (data.filterConfig !== undefined) updatePayload.filterConfig = data.filterConfig;

    if (data.questionIds !== undefined) {
      updatePayload.totalQuestions = data.questionIds.length;
      // Substitui questões vinculadas
      await db.delete(simulationQuestions).where(eq(simulationQuestions.simulationId, simulationId));
      for (let idx = 0; idx < data.questionIds.length; idx++) {
        await db.insert(simulationQuestions).values({
          simulationId,
          questionId: data.questionIds[idx],
          orderIndex: idx + 1,
          points: '1.00',
        });
      }
    }

    const [updated] = await db
      .update(simulations)
      .set(updatePayload)
      .where(eq(simulations.id, simulationId))
      .returning();

    return updated;
  }

  static async publishSimulation(simulationId: string, _adminId: string) {
    const [updated] = await db
      .update(simulations)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(simulations.id, simulationId))
      .returning();
    return updated;
  }

  static async unpublishSimulation(simulationId: string, _adminId: string) {
    const [updated] = await db
      .update(simulations)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(simulations.id, simulationId))
      .returning();
    return updated;
  }

  static async archiveSimulation(simulationId: string, _adminId: string) {
    const [updated] = await db
      .update(simulations)
      .set({ status: 'archived', archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(simulations.id, simulationId))
      .returning();
    return updated;
  }

  static async duplicateSimulation(simulationId: string, adminId: string) {
    const [source] = await db.select().from(simulations).where(eq(simulations.id, simulationId));
    if (!source) throw new Error('Simulado não encontrado para duplicação.');

    const [cloned] = await db
      .insert(simulations)
      .values({
        contestId: source.contestId,
        title: `${source.title} (Cópia)`,
        description: source.description,
        type: source.type,
        durationMinutes: source.durationMinutes,
        penaltyRule: source.penaltyRule,
        penaltyFactor: source.penaltyFactor,
        totalQuestions: source.totalQuestions,
        difficulty: source.difficulty,
        status: 'draft',
        isOfficial: source.isOfficial,
        isPublic: source.isPublic,
        filterConfig: source.filterConfig,
        createdBy: adminId,
      })
      .returning();

    // Copia questões vinculadas
    const sourceQuestions = await db
      .select()
      .from(simulationQuestions)
      .where(eq(simulationQuestions.simulationId, simulationId))
      .orderBy(asc(simulationQuestions.orderIndex));

    for (const sq of sourceQuestions) {
      await db.insert(simulationQuestions).values({
        simulationId: cloned.id,
        questionId: sq.questionId,
        orderIndex: sq.orderIndex,
        points: sq.points,
      });
    }

    return cloned;
  }

  static async reorderQuestions(simulationId: string, questionIds: string[], _adminId: string) {
    for (let idx = 0; idx < questionIds.length; idx++) {
      await db
        .update(simulationQuestions)
        .set({ orderIndex: idx + 1 })
        .where(
          and(
            eq(simulationQuestions.simulationId, simulationId),
            eq(simulationQuestions.questionId, questionIds[idx])
          )
        );
    }
    return { success: true };
  }
}
