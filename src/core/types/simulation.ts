export type PenaltyRule = 'none' | 'one_error_cancels_one_correct' | 'custom_factor';

export interface Simulation {
  id: string;
  contestId: string;
  title: string; // ex: "Simulado Geral PRF - Edital Completo"
  description?: string;
  durationMinutes: number; // ex: 270 (4h30)
  penaltyRule: PenaltyRule;
  penaltyFactor?: number; // ex: 1.0 (para Cebraspe) ou 0.5
  totalQuestions: number;
  isOfficial: boolean;
  questionIds: string[];
  createdAt: string;
}

export interface SubjectPerformanceBreakdown {
  subjectId: string;
  subjectName: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  netScore: number; // Nota líquida (ex: certas - erradas)
  accuracyPercentage: number;
}

export interface SimulationAttempt {
  id: string;
  simulationId: string;
  userId: string;
  startedAt: string;
  finishedAt?: string | null;
  totalDurationSeconds: number;
  totalScore: number;
  maxPossibleScore: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  percentage: number;
  subjectBreakdown: SubjectPerformanceBreakdown[];
  answers: {
    questionId: string;
    selectedOptionId?: string | null;
    isCorrect?: boolean | null;
  }[];
}
