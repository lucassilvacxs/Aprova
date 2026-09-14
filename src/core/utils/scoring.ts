/**
 * Utilitários de domínio para cálculo de notas e métricas de desempenho.
 */

export interface CebraspeScoreResult {
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalQuestions: number;
  grossScore: number;
  penaltyPoints: number;
  netScore: number; // Nota líquida (Certas - (Erradas * Fator))
  percentage: number; // Percentual da pontuação máxima
}

/**
 * Calcula a nota no estilo Cebraspe / CESPE:
 * Cada questão errada anula uma questão certa (ou fração multiplicada pelo penaltyFactor).
 * Questões deixadas em branco não somam nem subtraem pontos.
 * A nota mínima teórica pode ser negativa em bancas que não truncam em 0, mas por padrão
 * permitimos valores negativos para refletir a realidade do edital.
 */
export function calculateCebraspeScore(
  correctCount: number,
  wrongCount: number,
  blankCount: number,
  penaltyFactor: number = 1.0,
  allowNegative: boolean = true
): CebraspeScoreResult {
  const totalQuestions = correctCount + wrongCount + blankCount;
  const grossScore = correctCount;
  const penaltyPoints = wrongCount * penaltyFactor;
  let netScore = grossScore - penaltyPoints;

  if (!allowNegative && netScore < 0) {
    netScore = 0;
  }

  const percentage = totalQuestions > 0 ? Math.max(0, (netScore / totalQuestions) * 100) : 0;

  return {
    correctCount,
    wrongCount,
    blankCount,
    totalQuestions,
    grossScore,
    penaltyPoints,
    netScore,
    percentage: Math.round(percentage * 100) / 100,
  };
}

/**
 * Calcula a nota padrão para provas de Múltipla Escolha:
 * Cada questão correta soma 1 (ou o peso da questão).
 * Questões erradas e em branco não pontuam.
 */
export function calculateStandardScore(
  correctCount: number,
  wrongCount: number,
  blankCount: number
): {
  totalQuestions: number;
  score: number;
  percentage: number;
} {
  const totalQuestions = correctCount + wrongCount + blankCount;
  const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  return {
    totalQuestions,
    score: correctCount,
    percentage: Math.round(percentage * 100) / 100,
  };
}

/**
 * Formata segundos em formato legível HH:MM:SS ou MM:SS
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
