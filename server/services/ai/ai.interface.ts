import { EssayEvaluation, EssayPrompt } from '@/core/types/essay';
import { Question } from '@/core/types/question';
import { StudyPlan } from '@/core/types/study';

export interface GenerateThemeParams {
  contestTitle: string;
  themeArea?: string;
  examBoard?: string;
  keywords?: string[];
}

export interface CorrectEssayParams {
  essayText: string;
  prompt: EssayPrompt;
  maxScore?: number;
}

export interface AnalyzePerformanceParams {
  userId: string;
  accuracyBySubject: Record<string, number>;
  totalQuestionsAnswered: number;
}

export interface PerformanceInsights {
  weakestSubjects: string[];
  strongestSubjects: string[];
  strategicAdvice: string;
  suggestedFocusForNext7Days: string[];
}

export interface ExplainQuestionParams {
  question: Question;
  selectedOptionLetter?: string;
}

export interface QuestionExplanationResult {
  overview: string;
  whyCorrect: string;
  distractorsAnalysis: Record<string, string>;
  keyLegalConcepts: string[];
}

export interface GenerateStudyPlanParams {
  weeklyHoursAvailable: number;
  targetExamDate?: string;
  subjectsWithWeights: { subjectId: string; subjectName: string; weight: number }[];
}

export interface SummarizeContentParams {
  rawText: string;
  targetLength?: 'brief' | 'medium' | 'detailed';
}

/**
 * Interface abstrata para provedores de Inteligência Artificial.
 * Permite trocar entre Google Gemini, Anthropic Claude, OpenAI ou Mock local.
 */
export interface AIService {
  generateEssayTheme(params: GenerateThemeParams): Promise<Omit<EssayPrompt, 'id' | 'createdAt'>>;
  correctEssay(params: CorrectEssayParams): Promise<Omit<EssayEvaluation, 'id' | 'essayId' | 'createdAt'>>;
  analyzePerformance(params: AnalyzePerformanceParams): Promise<PerformanceInsights>;
  explainQuestion(params: ExplainQuestionParams): Promise<QuestionExplanationResult>;
  generateStudyPlan(params: GenerateStudyPlanParams): Promise<Partial<StudyPlan>>;
  summarizeContent(params: SummarizeContentParams): Promise<string>;
}
