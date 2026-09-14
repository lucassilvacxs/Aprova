import { db } from '../db';
import {
  essays,
  essayCorrections,
  essayCorrectionCriteria,
  essayCriteria,
  essayPrompts,
} from '../db/schema';
import { eq, asc, inArray } from 'drizzle-orm';

export interface CriterionPerformanceStat {
  criterionId: string;
  criterionName: string;
  averageScore: number;
  averageMaxScore: number;
  averagePercentage: number;
  evaluationsCount: number;
}

export interface EssayEvolutionPoint {
  essayId: string;
  title: string;
  promptTitle: string;
  category: string;
  date: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
}

export interface EssayUserStats {
  totalEssays: number;
  draftsCount: number;
  submittedCount: number;
  underReviewCount: number;
  correctedCount: number;
  averageScore: number;
  averagePercentage: number;
  bestScore: number;
  bestPercentage: number;
  lowestScore: number;
  lowestPercentage: number;
  averageWordCount: number;
  evolutionSeries: EssayEvolutionPoint[];
  criteriaPerformance: CriterionPerformanceStat[];
}

export class EssayStatsService {
  /**
   * Calcula estatísticas consolidadas de evolução, médias e competências do aluno
   */
  static async getUserStats(userId: string): Promise<EssayUserStats> {
    // 1. Busca todas as redações do usuário
    const userEssays = await db
      .select({
        id: essays.id,
        title: essays.title,
        status: essays.status,
        wordCount: essays.wordCount,
        submittedAt: essays.submittedAt,
        createdAt: essays.createdAt,
        promptTitle: essayPrompts.title,
        promptCategory: essayPrompts.category,
      })
      .from(essays)
      .leftJoin(essayPrompts, eq(essays.promptId, essayPrompts.id))
      .where(eq(essays.userId, userId));

    const totalEssays = userEssays.length;
    let draftsCount = 0;
    let submittedCount = 0;
    let underReviewCount = 0;
    let correctedCount = 0;
    let totalWords = 0;

    for (const e of userEssays) {
      totalWords += e.wordCount || 0;
      const st = (e.status || '').toUpperCase();
      if (st === 'DRAFT') draftsCount++;
      else if (st === 'SUBMITTED') submittedCount++;
      else if (st === 'UNDER_REVIEW') underReviewCount++;
      else if (st === 'CORRECTED') correctedCount++;
    }

    const averageWordCount = totalEssays > 0 ? Math.round(totalWords / totalEssays) : 0;

    // 2. Busca correções das redações corrigidas
    const correctedEssayIds = userEssays
      .filter((e: any) => (e.status || '').toUpperCase() === 'CORRECTED')
      .map((e: any) => e.id);

    let evolutionSeries: EssayEvolutionPoint[] = [];
    let averageScore = 0;
    let averagePercentage = 0;
    let bestScore = 0;
    let bestPercentage = 0;
    let lowestScore = 0;
    let lowestPercentage = 0;
    let criteriaPerformance: CriterionPerformanceStat[] = [];

    if (correctedEssayIds.length > 0) {
      const corrections = await db
        .select({
          essayId: essayCorrections.essayId,
          totalScore: essayCorrections.totalScore,
          maxScore: essayCorrections.maxScore,
          percentage: essayCorrections.percentage,
          createdAt: essayCorrections.createdAt,
        })
        .from(essayCorrections)
        .where(inArray(essayCorrections.essayId, correctedEssayIds))
        .orderBy(asc(essayCorrections.createdAt));

      const essayMap = new Map<string, any>(userEssays.map((e: any) => [e.id, e]));

      let sumScore = 0;
      let sumPercentage = 0;
      let minScore = Infinity;
      let maxScoreFound = -Infinity;
      let minPerc = Infinity;
      let maxPerc = -Infinity;

      evolutionSeries = corrections.map((c: any) => {
        const essayInfo = essayMap.get(c.essayId);
        const score = Number(c.totalScore) || 0;
        const maxSc = Number(c.maxScore) || 100;
        const perc = Number(c.percentage) || (maxSc > 0 ? (score / maxSc) * 100 : 0);

        sumScore += score;
        sumPercentage += perc;

        if (score > maxScoreFound) maxScoreFound = score;
        if (score < minScore) minScore = score;
        if (perc > maxPerc) maxPerc = perc;
        if (perc < minPerc) minPerc = perc;

        return {
          essayId: c.essayId,
          title: essayInfo?.title || essayInfo?.promptTitle || 'Redação',
          promptTitle: essayInfo?.promptTitle || 'Tema Geral',
          category: essayInfo?.promptCategory || 'Geral',
          date: c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '',
          totalScore: Math.round(score * 100) / 100,
          maxScore: Math.round(maxSc * 100) / 100,
          percentage: Math.round(perc * 100) / 100,
        };
      });

      const count = corrections.length;
      if (count > 0) {
        averageScore = Math.round((sumScore / count) * 100) / 100;
        averagePercentage = Math.round((sumPercentage / count) * 100) / 100;
        bestScore = maxScoreFound !== -Infinity ? Math.round(maxScoreFound * 100) / 100 : 0;
        lowestScore = minScore !== Infinity ? Math.round(minScore * 100) / 100 : 0;
        bestPercentage = maxPerc !== -Infinity ? Math.round(maxPerc * 100) / 100 : 0;
        lowestPercentage = minPerc !== Infinity ? Math.round(minPerc * 100) / 100 : 0;
      }

      // 3. Busca notas por critério para mapear competências
      const correctionRecords = await db
        .select({ id: essayCorrections.id })
        .from(essayCorrections)
        .where(inArray(essayCorrections.essayId, correctedEssayIds));

      const corrIds = correctionRecords.map((r: { id: string }) => r.id);

      if (corrIds.length > 0) {
        const criteriaItems = await db
          .select({
            criterionId: essayCorrectionCriteria.criterionId,
            score: essayCorrectionCriteria.score,
            criterionName: essayCriteria.name,
            maxScore: essayCriteria.maxScore,
          })
          .from(essayCorrectionCriteria)
          .leftJoin(essayCriteria, eq(essayCorrectionCriteria.criterionId, essayCriteria.id))
          .where(inArray(essayCorrectionCriteria.correctionId, corrIds));

        const groups = new Map<string, { name: string; totalScore: number; totalMax: number; count: number }>();

        for (const ci of criteriaItems) {
          const key = ci.criterionName || ci.criterionId;
          const current = groups.get(key) || {
            name: ci.criterionName || 'Critério',
            totalScore: 0,
            totalMax: 0,
            count: 0,
          };

          const s = Number(ci.score) || 0;
          const m = Number(ci.maxScore) || 20;

          current.totalScore += s;
          current.totalMax += m;
          current.count++;
          groups.set(key, current);
        }

        criteriaPerformance = Array.from(groups.entries()).map(([criterionId, data]) => {
          const avgScore = data.count > 0 ? data.totalScore / data.count : 0;
          const avgMax = data.count > 0 ? data.totalMax / data.count : 0;
          const avgPercentage = avgMax > 0 ? (avgScore / avgMax) * 100 : 0;

          return {
            criterionId,
            criterionName: data.name,
            averageScore: Math.round(avgScore * 100) / 100,
            averageMaxScore: Math.round(avgMax * 100) / 100,
            averagePercentage: Math.round(avgPercentage * 100) / 100,
            evaluationsCount: data.count,
          };
        });

        // Ordena critérios da maior nota para a menor
        criteriaPerformance.sort((a, b) => b.averagePercentage - a.averagePercentage);
      }
    }

    return {
      totalEssays,
      draftsCount,
      submittedCount,
      underReviewCount,
      correctedCount,
      averageScore,
      averagePercentage,
      bestScore,
      bestPercentage,
      lowestScore,
      lowestPercentage,
      averageWordCount,
      evolutionSeries,
      criteriaPerformance,
    };
  }
}
