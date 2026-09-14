export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export type QuestionFormat = 'true_false' | 'multiple_choice';

export interface QuestionOption {
  id: string;
  questionId: string;
  letter: string; // "C", "E" ou "A", "B", "C", "D", "E"
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  topicId: string;
  boardId: string;
  originContestId?: string | null;
  year: number;
  difficulty: QuestionDifficulty;
  format: QuestionFormat;
  statement: string; // Enunciado com suporte a Markdown
  officialExplanation: string; // Comentário da resolução
  sourceReference?: string; // ex: "Cebraspe - 2021 - PRF - Policial Rodoviário"
  tags: string[];
  options: QuestionOption[];
  createdAt: string;
}

export interface QuestionAttempt {
  id: string;
  userId: string;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  durationSeconds: number;
  source: 'direct_practice' | 'simulation';
  createdAt: string;
}

export interface QuestionFilter {
  contestId?: string;
  subjectId?: string;
  topicId?: string;
  boardId?: string;
  year?: number;
  difficulty?: QuestionDifficulty;
  format?: QuestionFormat;
  status?: 'all' | 'unanswered' | 'correct' | 'wrong';
  mistakeNotebookOnly?: boolean;
}
