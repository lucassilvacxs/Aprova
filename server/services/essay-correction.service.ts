import { db } from '../db';
import {
  essays,
  essayPrompts,
  essayCriteria,
  essayCorrections,
  essayCorrectionCriteria,
  notifications,
  userNotifications,
  auditLogs,
} from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { EssayScoringService, CriterionScoreInput, EssayScoringResult } from './essay-scoring.service';

export interface CorrectionInput {
  essayId: string;
  evaluatorId?: string;
  correctionType?: 'MANUAL' | 'AI' | 'HYBRID';
  generalFeedback: string;
  strengths?: string;
  weaknesses?: string;
  suggestions?: string;
  criteriaScores: Array<{
    criterionId: string;
    score: number;
    feedback?: string;
  }>;
}

export interface EssayCorrectionResult extends EssayScoringResult {
  correctionId: string;
  essayId: string;
  correctionType: string;
  generalFeedback: string;
  strengths?: string | null;
  weaknesses?: string | null;
  suggestions?: string | null;
  correctedAt: Date;
}

export interface IEssayCorrectionService {
  correctEssay(input: CorrectionInput): Promise<EssayCorrectionResult>;
}

export class ManualEssayCorrectionService implements IEssayCorrectionService {
  /**
   * Executa o fluxo oficial de correção por critérios de uma redação submetida
   */
  async correctEssay(input: CorrectionInput): Promise<EssayCorrectionResult> {
    if (!input.essayId) {
      throw new Error('Identificador da redação (essayId) é obrigatório.');
    }
    if (!input.generalFeedback?.trim()) {
      throw new Error('O parecer geral (generalFeedback) é obrigatório.');
    }
    if (!input.criteriaScores || input.criteriaScores.length === 0) {
      throw new Error('Pelo menos uma nota por critério deve ser fornecida.');
    }

    // 1. Busca a redação
    const [essay] = await db
      .select()
      .from(essays)
      .where(eq(essays.id, input.essayId))
      .limit(1);

    if (!essay) {
      throw new Error('Redação não encontrada.');
    }

    if (essay.status === 'DRAFT' || essay.status === 'draft') {
      throw new Error('Esta redação ainda é um rascunho e não foi submetida pelo aluno.');
    }

    // 2. Busca definições dos critérios informados
    const criterionIds = input.criteriaScores.map((c) => c.criterionId);
    const dbCriteria = await db
      .select()
      .from(essayCriteria)
      .where(inArray(essayCriteria.id, criterionIds));

    const criteriaMap = new Map<string, (typeof dbCriteria)[0]>();
    for (const c of dbCriteria) {
      criteriaMap.set(c.id, c);
    }

    // Prepara payload de cálculo
    const scoringInput: CriterionScoreInput[] = input.criteriaScores.map((item) => {
      const def = criteriaMap.get(item.criterionId);
      if (!def) {
        throw new Error(`Critério de avaliação com id "${item.criterionId}" não encontrado.`);
      }

      return {
        criterionId: item.criterionId,
        name: def.name,
        score: Number(item.score),
        maxScore: Number(def.maxScore),
        weight: Number(def.weight || 1.0),
        feedback: item.feedback?.trim(),
      };
    });

    // 3. Executa cálculo formal autoritativo no backend
    const scoringResult = EssayScoringService.calculateScore(scoringInput);

    // 4. Salva ou atualiza a correção no banco
    const [existingCorrection] = await db
      .select()
      .from(essayCorrections)
      .where(eq(essayCorrections.essayId, input.essayId))
      .limit(1);

    let correctionId: string;

    if (existingCorrection) {
      correctionId = existingCorrection.id;
      await db
        .update(essayCorrections)
        .set({
          correctionType: input.correctionType || 'MANUAL',
          totalScore: scoringResult.totalScore.toFixed(2),
          maxScore: scoringResult.maxScore.toFixed(2),
          percentage: scoringResult.percentage.toFixed(2),
          overallScore: scoringResult.totalScore.toFixed(2),
          maxPossibleScore: scoringResult.maxScore.toFixed(2),
          generalFeedback: input.generalFeedback.trim(),
          strengths: input.strengths?.trim() || null,
          weaknesses: input.weaknesses?.trim() || null,
          suggestions: input.suggestions?.trim() || null,
          correctedBy: input.evaluatorId || null,
          updatedAt: new Date(),
        })
        .where(eq(essayCorrections.id, correctionId));

      // Remove notas anteriores por critério para reescrever
      await db
        .delete(essayCorrectionCriteria)
        .where(eq(essayCorrectionCriteria.correctionId, correctionId));
    } else {
      const [inserted] = await db
        .insert(essayCorrections)
        .values({
          essayId: input.essayId,
          correctionType: input.correctionType || 'MANUAL',
          totalScore: scoringResult.totalScore.toFixed(2),
          maxScore: scoringResult.maxScore.toFixed(2),
          percentage: scoringResult.percentage.toFixed(2),
          overallScore: scoringResult.totalScore.toFixed(2),
          maxPossibleScore: scoringResult.maxScore.toFixed(2),
          generalFeedback: input.generalFeedback.trim(),
          strengths: input.strengths?.trim() || null,
          weaknesses: input.weaknesses?.trim() || null,
          suggestions: input.suggestions?.trim() || null,
          correctedBy: input.evaluatorId || null,
          updatedAt: new Date(),
        })
        .returning();

      correctionId = inserted.id;
    }

    // 5. Salva notas granulares por critério
    for (const item of scoringResult.criteriaBreakdown) {
      await db.insert(essayCorrectionCriteria).values({
        correctionId,
        criterionId: item.criterionId,
        score: item.score.toFixed(2),
        feedback: item.feedback || null,
      });
    }

    // 6. Atualiza status da redação para CORRECTED
    await db
      .update(essays)
      .set({
        status: 'CORRECTED',
        updatedAt: new Date(),
      })
      .where(eq(essays.id, input.essayId));

    // 7. Emite notificação interna para o aluno
    try {
      const [prompt] = await db
        .select({ title: essayPrompts.title })
        .from(essayPrompts)
        .where(eq(essayPrompts.id, essay.promptId))
        .limit(1);

      const promptTitle = prompt?.title || 'sua redação';
      const [newNotification] = await db
        .insert(notifications)
        .values({
          title: 'Redação Avaliada!',
          message: `Sua redação sobre "${promptTitle}" foi corrigida. Nota final: ${scoringResult.totalScore}/${scoringResult.maxScore} (${scoringResult.percentage}% - ${scoringResult.levelLabel}).`,
          type: 'essay_corrected',
          actionUrl: `/redacao/${essay.id}`,
        })
        .returning();

      if (newNotification) {
        await db.insert(userNotifications).values({
          userId: essay.userId,
          notificationId: newNotification.id,
        });
      }
    } catch {
      // Falha ao notificar não impede o salvamento da correção
    }

    // 8. Log de auditoria
    if (input.evaluatorId) {
      await db.insert(auditLogs).values({
        userId: input.evaluatorId,
        action: 'essay.corrected',
        resource: 'essays',
        resourceId: essay.id,
        details: {
          totalScore: scoringResult.totalScore,
          percentage: scoringResult.percentage,
          correctionType: input.correctionType || 'MANUAL',
        },
      });
    }

    return {
      ...scoringResult,
      correctionId,
      essayId: essay.id,
      correctionType: input.correctionType || 'MANUAL',
      generalFeedback: input.generalFeedback.trim(),
      strengths: input.strengths?.trim() || null,
      weaknesses: input.weaknesses?.trim() || null,
      suggestions: input.suggestions?.trim() || null,
      correctedAt: new Date(),
    };
  }
}

export const defaultCorrectionService = new ManualEssayCorrectionService();
