export interface CriterionScoreInput {
  criterionId: string;
  score: number;
  maxScore: number;
  weight?: number;
  name?: string;
  feedback?: string;
}

export interface EssayScoringResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  level: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'INSUFFICIENT';
  levelLabel: string;
  isPassed: boolean;
  criteriaBreakdown: Array<{
    criterionId: string;
    score: number;
    maxScore: number;
    weight: number;
    weightedScore: number;
    percentage: number;
    name?: string;
    feedback?: string;
  }>;
}

export class EssayScoringService {
  /**
   * Valida e calcula com precisão matemática a pontuação formal e ponderada da redação
   */
  static calculateScore(
    scores: CriterionScoreInput[],
    passingPercentageCutoff: number = 50.0
  ): EssayScoringResult {
    if (!scores || scores.length === 0) {
      throw new Error('Nenhuma pontuação de critério foi informada para avaliação.');
    }

    let totalWeightedScore = 0;
    let totalMaxScore = 0;

    const breakdown = scores.map((item) => {
      const weight = Number(item.weight) > 0 ? Number(item.weight) : 1.0;
      const score = Number(item.score);
      const maxScore = Number(item.maxScore);

      if (isNaN(score) || score < 0) {
        throw new Error(`Nota inválida para o critério "${item.name || item.criterionId}": deve ser maior ou igual a zero.`);
      }

      if (isNaN(maxScore) || maxScore <= 0) {
        throw new Error(`Nota máxima inválida para o critério "${item.name || item.criterionId}".`);
      }

      if (score > maxScore) {
        throw new Error(
          `A nota atribuída (${score}) excede a pontuação máxima permitida (${maxScore}) para o critério "${item.name || item.criterionId}".`
        );
      }

      const weightedScore = score * weight;
      const weightedMaxScore = maxScore * weight;
      const itemPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

      totalWeightedScore += weightedScore;
      totalMaxScore += weightedMaxScore;

      return {
        criterionId: item.criterionId,
        score: Math.round(score * 100) / 100,
        maxScore: Math.round(maxScore * 100) / 100,
        weight,
        weightedScore: Math.round(weightedScore * 100) / 100,
        percentage: Math.round(itemPercentage * 100) / 100,
        name: item.name,
        feedback: item.feedback,
      };
    });

    const roundedTotalScore = Math.round(totalWeightedScore * 100) / 100;
    const roundedMaxScore = Math.round(totalMaxScore * 100) / 100;
    const percentage =
      roundedMaxScore > 0
        ? Math.round(((roundedTotalScore / roundedMaxScore) * 100) * 100) / 100
        : 0;

    let level: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'INSUFFICIENT' = 'INSUFFICIENT';
    let levelLabel = 'Abaixo do Corte';

    if (percentage >= 90) {
      level = 'EXCELLENT';
      levelLabel = 'Excelente';
    } else if (percentage >= 75) {
      level = 'GOOD';
      levelLabel = 'Bom';
    } else if (percentage >= passingPercentageCutoff) {
      level = 'AVERAGE';
      levelLabel = 'Regular (Aprovado)';
    }

    const isPassed = percentage >= passingPercentageCutoff;

    return {
      totalScore: roundedTotalScore,
      maxScore: roundedMaxScore,
      percentage,
      level,
      levelLabel,
      isPassed,
      criteriaBreakdown: breakdown,
    };
  }
}
