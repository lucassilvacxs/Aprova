import { db } from '../db';
import {
  essays,
  essayPrompts,
  essayVersions,
  essayCorrections,
  essayCorrectionCriteria,
  essayCriteria,
  studyPlanSessions,
  studyPlans,
  contests,
  users,
  notifications,
  userNotifications,
} from '../db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

export interface AutosaveData {
  title?: string;
  content: string;
}

export class EssayService {
  /**
   * Calcula métricas de texto em tempo real (palavras, caracteres, linhas estimadas)
   */
  static calculateTextMetrics(content: string = '') {
    const trimmed = content.trim();
    const characterCount = content.length;
    const wordCount = trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;

    // Cálculo realista de linhas de redação (considera quebras de linha e quebras por extensão de ~70 caracteres)
    let lineCount = 0;
    if (trimmed.length > 0) {
      const paragraphs = content.split('\n');
      for (const p of paragraphs) {
        lineCount += Math.max(1, Math.ceil((p.length || 1) / 70));
      }
    }

    return { characterCount, wordCount, lineCount };
  }

  /**
   * Busca o rascunho em aberto do usuário
   */
  static async getActiveDraft(userId: string, promptId?: string) {
    const conditions = [
      eq(essays.userId, userId),
      or(eq(essays.status, 'DRAFT'), eq(essays.status, 'draft')),
    ];

    if (promptId) {
      conditions.push(eq(essays.promptId, promptId));
    }

    const [draft] = await db
      .select({
        id: essays.id,
        userId: essays.userId,
        contestId: essays.contestId,
        promptId: essays.promptId,
        title: essays.title,
        content: essays.content,
        wordCount: essays.wordCount,
        characterCount: essays.characterCount,
        lineCount: essays.lineCount,
        status: essays.status,
        startedAt: essays.startedAt,
        lastSavedAt: essays.lastSavedAt,
        createdAt: essays.createdAt,
        updatedAt: essays.updatedAt,
        promptTitle: essayPrompts.title,
        promptCategory: essayPrompts.category,
        promptMinWords: essayPrompts.minWords,
        promptMaxWords: essayPrompts.maxWords,
        promptMinLines: essayPrompts.minLines,
        promptMaxLines: essayPrompts.maxLines,
      })
      .from(essays)
      .leftJoin(essayPrompts, eq(essays.promptId, essayPrompts.id))
      .where(and(...conditions))
      .orderBy(desc(essays.lastSavedAt))
      .limit(1);

    return draft || null;
  }

  /**
   * Inicia ou recupera uma redação (criação de rascunho DRAFT)
   */
  static async startEssay(userId: string, promptId: string, contestId?: string, title?: string) {
    // 1. Verifica se já existe rascunho ativo para este tema
    const existingDraft = await this.getActiveDraft(userId, promptId);
    if (existingDraft) {
      return existingDraft;
    }

    // 2. Busca informações do tema
    const [prompt] = await db
      .select()
      .from(essayPrompts)
      .where(eq(essayPrompts.id, promptId))
      .limit(1);

    if (!prompt) {
      throw new Error('Tema de redação não encontrado.');
    }

    const effectiveContestId = contestId || prompt.contestId;

    // Se o tema não tiver contestId associado, busca qualquer concurso ativo para manter integridade
    let finalContestId = effectiveContestId;
    if (!finalContestId) {
      const [firstContest] = await db.select({ id: contests.id }).from(contests).limit(1);
      finalContestId = firstContest?.id;
    }

    if (!finalContestId) {
      throw new Error('Nenhum concurso vinculado ao tema ou disponível no sistema.');
    }

    const [created] = await db
      .insert(essays)
      .values({
        userId,
        promptId,
        contestId: finalContestId,
        title: title?.trim() || prompt.title,
        content: '',
        wordCount: 0,
        characterCount: 0,
        lineCount: 0,
        linesCount: 0,
        status: 'DRAFT',
        startedAt: new Date(),
        lastSavedAt: new Date(),
      })
      .returning();

    // Cria versão inicial
    await db.insert(essayVersions).values({
      essayId: created.id,
      content: '',
      wordCount: 0,
      characterCount: 0,
    });

    return {
      ...created,
      promptTitle: prompt.title,
      promptCategory: prompt.category || prompt.themeArea,
      promptMinWords: prompt.minWords,
      promptMaxWords: prompt.maxWords,
      promptMinLines: prompt.minLines,
      promptMaxLines: prompt.maxLines,
    };
  }

  /**
   * Salvamento automático periódico (Autosave com debounce no frontend)
   */
  static async autosave(essayId: string, userId: string, data: AutosaveData) {
    const [essay] = await db
      .select()
      .from(essays)
      .where(eq(essays.id, essayId))
      .limit(1);

    if (!essay) {
      throw new Error('Redação não encontrada.');
    }

    // Isolamento estrito de usuário
    if (essay.userId !== userId) {
      throw new Error('Acesso não autorizado: você não tem permissão para editar esta redação.');
    }

    // Bloqueio rigoroso de integridade: após submetida, não permite alteração
    if (essay.status !== 'DRAFT' && essay.status !== 'draft') {
      throw new Error('Esta redação já foi submetida para correção e está bloqueada para edições.');
    }

    const content = data.content !== undefined ? data.content : essay.content;
    const { characterCount, wordCount, lineCount } = this.calculateTextMetrics(content);

    const now = new Date();

    const [updated] = await db
      .update(essays)
      .set({
        title: data.title !== undefined ? data.title.trim() : essay.title,
        content,
        wordCount,
        characterCount,
        lineCount,
        linesCount: lineCount,
        lastSavedAt: now,
        updatedAt: now,
      })
      .where(eq(essays.id, essayId))
      .returning();

    // Snapshot de versão caso a alteração seja significativa (> 120 caracteres de diferença do último snapshot)
    const [latestVersion] = await db
      .select()
      .from(essayVersions)
      .where(eq(essayVersions.essayId, essayId))
      .orderBy(desc(essayVersions.createdAt))
      .limit(1);

    const charDiff = Math.abs(characterCount - (latestVersion?.characterCount || 0));
    if (!latestVersion || charDiff >= 120) {
      await db.insert(essayVersions).values({
        essayId,
        content,
        wordCount,
        characterCount,
      });
    }

    return updated;
  }

  /**
   * Submissão definitiva da redação para correção
   */
  static async submitEssay(essayId: string, userId: string) {
    const [essay] = await db
      .select()
      .from(essays)
      .where(eq(essays.id, essayId))
      .limit(1);

    if (!essay) {
      throw new Error('Redação não encontrada.');
    }

    if (essay.userId !== userId) {
      throw new Error('Acesso não autorizado para submeter esta redação.');
    }

    if (essay.status !== 'DRAFT' && essay.status !== 'draft') {
      throw new Error('Esta redação já foi enviada anteriormente.');
    }

    const [prompt] = await db
      .select()
      .from(essayPrompts)
      .where(eq(essayPrompts.id, essay.promptId))
      .limit(1);

    // Validações formais de texto
    const content = essay.content.trim();
    if (content.length === 0) {
      throw new Error('Não é possível enviar uma redação em branco.');
    }

    const { wordCount, characterCount, lineCount } = this.calculateTextMetrics(content);

    const minWords = prompt?.minWords || 100;
    if (wordCount < minWords) {
      throw new Error(
        `O texto possui apenas ${wordCount} palavra(s). O mínimo exigido para este tema é de ${minWords} palavras.`
      );
    }

    const now = new Date();

    // Atualiza status para SUBMITTED
    const [submitted] = await db
      .update(essays)
      .set({
        wordCount,
        characterCount,
        lineCount,
        linesCount: lineCount,
        status: 'SUBMITTED',
        submittedAt: now,
        updatedAt: now,
      })
      .where(eq(essays.id, essayId))
      .returning();

    // Snapshot final da submissão
    await db.insert(essayVersions).values({
      essayId,
      content: essay.content,
      wordCount,
      characterCount,
    });

    // ── Integração com o Plano de Estudos (Fase 7) ──────────────────────────
    try {
      // Procura plano ativo do estudante
      const [activePlan] = await db
        .select({ id: studyPlans.id })
        .from(studyPlans)
        .where(and(eq(studyPlans.userId, userId), eq(studyPlans.status, 'ACTIVE')))
        .limit(1);

      if (activePlan) {
        // Verifica se há sessão do tipo 'ESSAY' planejada para hoje ou pendente
        const [pendingEssaySession] = await db
          .select({ id: studyPlanSessions.id })
          .from(studyPlanSessions)
          .where(
            and(
              eq(studyPlanSessions.studyPlanId, activePlan.id),
              eq(studyPlanSessions.type, 'ESSAY'),
              or(
                eq(studyPlanSessions.status, 'PLANNED'),
                eq(studyPlanSessions.status, 'IN_PROGRESS')
              )
            )
          )
          .orderBy(studyPlanSessions.sessionDate)
          .limit(1);

        if (pendingEssaySession) {
          const durationMinutes = Math.max(
            30,
            Math.round((now.getTime() - new Date(essay.startedAt || now).getTime()) / 60000)
          );

          await db
            .update(studyPlanSessions)
            .set({
              status: 'COMPLETED',
              completedAt: now,
              actualMinutes: durationMinutes,
              notes: `Redação submetida: ${prompt?.title || 'Tema'} (${wordCount} palavras).`,
            })
            .where(eq(studyPlanSessions.id, pendingEssaySession.id));
        }
      }
    } catch {
      // Erro na integração do plano de estudos não interrompe a submissão
    }

    // ── Notificação interna de confirmação de envio ──────────────────────────
    try {
      const [notification] = await db
        .insert(notifications)
        .values({
          title: 'Redação Enviada com Sucesso!',
          message: `Sua redação sobre "${prompt?.title || 'Tema'}" foi submetida e aguarda avaliação dos professores.`,
          type: 'essay_submitted',
          actionUrl: `/redacao/${essayId}`,
        })
        .returning();

      if (notification) {
        await db.insert(userNotifications).values({
          userId,
          notificationId: notification.id,
        });
      }
    } catch {
      // Ignora erro de notificação
    }

    return submitted;
  }

  /**
   * Descarta um rascunho não enviado
   */
  static async discardDraft(essayId: string, userId: string) {
    const [essay] = await db
      .select()
      .from(essays)
      .where(eq(essays.id, essayId))
      .limit(1);

    if (!essay) {
      throw new Error('Redação não encontrada.');
    }

    if (essay.userId !== userId) {
      throw new Error('Acesso não autorizado.');
    }

    if (essay.status !== 'DRAFT' && essay.status !== 'draft') {
      throw new Error('Apenas rascunhos podem ser descartados.');
    }

    await db.delete(essays).where(eq(essays.id, essayId));

    return { success: true, message: 'Rascunho descartado com sucesso.' };
  }

  /**
   * Consulta os detalhes da redação, tema motivador e correção
   */
  static async getEssayDetail(essayId: string, userId?: string, isAdmin: boolean = false) {
    const [essay] = await db
      .select({
        id: essays.id,
        userId: essays.userId,
        contestId: essays.contestId,
        promptId: essays.promptId,
        title: essays.title,
        content: essays.content,
        wordCount: essays.wordCount,
        characterCount: essays.characterCount,
        lineCount: essays.lineCount,
        status: essays.status,
        startedAt: essays.startedAt,
        lastSavedAt: essays.lastSavedAt,
        submittedAt: essays.submittedAt,
        createdAt: essays.createdAt,
        updatedAt: essays.updatedAt,
        studentName: users.name,
        studentEmail: users.email,
      })
      .from(essays)
      .leftJoin(users, eq(essays.userId, users.id))
      .where(eq(essays.id, essayId))
      .limit(1);

    if (!essay) {
      return null;
    }

    // Isolamento de dados
    if (!isAdmin && userId && essay.userId !== userId) {
      throw new Error('Acesso não autorizado a esta redação.');
    }

    // Busca detalhes do tema
    const [prompt] = await db
      .select()
      .from(essayPrompts)
      .where(eq(essayPrompts.id, essay.promptId))
      .limit(1);

    // Busca correção (se houver)
    let correction = null;
    let criteriaScores: any[] = [];

    const [corr] = await db
      .select()
      .from(essayCorrections)
      .where(eq(essayCorrections.essayId, essayId))
      .limit(1);

    if (corr) {
      correction = corr;
      criteriaScores = await db
        .select({
          id: essayCorrectionCriteria.id,
          criterionId: essayCorrectionCriteria.criterionId,
          score: essayCorrectionCriteria.score,
          feedback: essayCorrectionCriteria.feedback,
          criterionName: essayCriteria.name,
          criterionDescription: essayCriteria.description,
          maxScore: essayCriteria.maxScore,
          weight: essayCriteria.weight,
        })
        .from(essayCorrectionCriteria)
        .leftJoin(essayCriteria, eq(essayCorrectionCriteria.criterionId, essayCriteria.id))
        .where(eq(essayCorrectionCriteria.correctionId, corr.id))
        .orderBy(essayCriteria.ordering);
    }

    return {
      ...essay,
      prompt: prompt
        ? {
            ...prompt,
            category: prompt.category || prompt.themeArea || 'Geral',
          }
        : null,
      correction,
      criteriaScores,
    };
  }

  /**
   * Lista histórico de redações do estudante autenticado
   */
  static async listUserEssays(
    userId: string,
    filters?: { status?: string; contestId?: string; search?: string }
  ) {
    const conditions = [eq(essays.userId, userId)];

    if (filters?.status && filters.status !== 'ALL') {
      conditions.push(eq(essays.status, filters.status));
    }

    if (filters?.contestId && filters.contestId !== 'ALL') {
      conditions.push(eq(essays.contestId, filters.contestId));
    }

    const items = await db
      .select({
        id: essays.id,
        title: essays.title,
        promptId: essays.promptId,
        contestId: essays.contestId,
        status: essays.status,
        wordCount: essays.wordCount,
        characterCount: essays.characterCount,
        lineCount: essays.lineCount,
        startedAt: essays.startedAt,
        lastSavedAt: essays.lastSavedAt,
        submittedAt: essays.submittedAt,
        createdAt: essays.createdAt,
        updatedAt: essays.updatedAt,
        promptTitle: essayPrompts.title,
        promptCategory: essayPrompts.category,
        promptDifficulty: essayPrompts.difficulty,
        contestTitle: contests.title,
        contestSlug: contests.slug,
        totalScore: essayCorrections.totalScore,
        maxScore: essayCorrections.maxScore,
        percentage: essayCorrections.percentage,
      })
      .from(essays)
      .leftJoin(essayPrompts, eq(essays.promptId, essayPrompts.id))
      .leftJoin(contests, eq(essays.contestId, contests.id))
      .leftJoin(essayCorrections, eq(essays.id, essayCorrections.essayId))
      .where(and(...conditions))
      .orderBy(desc(essays.updatedAt));

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      return items.filter(
        (i: any) =>
          i.title?.toLowerCase().includes(q) ||
          i.promptTitle?.toLowerCase().includes(q) ||
          i.promptCategory?.toLowerCase().includes(q)
      );
    }

    return items;
  }

  /**
   * Fila administrativa de redações para correção
   */
  static async listAdminQueue(filters?: { status?: string; contestId?: string; search?: string }) {
    const conditions: any[] = [];

    if (filters?.status && filters.status !== 'ALL') {
      conditions.push(eq(essays.status, filters.status));
    } else {
      // Por padrão na fila administrativa mostra submetidas ou em revisão ou corrigidas
      conditions.push(or(eq(essays.status, 'SUBMITTED'), eq(essays.status, 'UNDER_REVIEW'), eq(essays.status, 'CORRECTED')));
    }

    if (filters?.contestId && filters.contestId !== 'ALL') {
      conditions.push(eq(essays.contestId, filters.contestId));
    }

    const items = await db
      .select({
        id: essays.id,
        title: essays.title,
        promptId: essays.promptId,
        contestId: essays.contestId,
        status: essays.status,
        wordCount: essays.wordCount,
        lineCount: essays.lineCount,
        startedAt: essays.startedAt,
        submittedAt: essays.submittedAt,
        updatedAt: essays.updatedAt,
        studentName: users.name,
        studentEmail: users.email,
        promptTitle: essayPrompts.title,
        promptCategory: essayPrompts.category,
        contestTitle: contests.title,
        contestSlug: contests.slug,
        totalScore: essayCorrections.totalScore,
        percentage: essayCorrections.percentage,
      })
      .from(essays)
      .leftJoin(users, eq(essays.userId, users.id))
      .leftJoin(essayPrompts, eq(essays.promptId, essayPrompts.id))
      .leftJoin(contests, eq(essays.contestId, contests.id))
      .leftJoin(essayCorrections, eq(essays.id, essayCorrections.essayId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(essays.submittedAt));

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      return items.filter(
        (i: any) =>
          i.title?.toLowerCase().includes(q) ||
          i.studentName?.toLowerCase().includes(q) ||
          i.studentEmail?.toLowerCase().includes(q) ||
          i.promptTitle?.toLowerCase().includes(q)
      );
    }

    return items;
  }
}
