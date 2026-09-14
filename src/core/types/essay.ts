export interface MotivatingText {
  id: string;
  title: string;
  source: string;
  content: string;
}

export interface EssayPrompt {
  id: string;
  contestId: string;
  boardId?: string;
  title: string; // ex: "O combate ao crime organizado e a integração das forças federais de segurança"
  themeArea: string; // ex: "Segurança Pública / Legislação / Direitos Humanos"
  motivatingTexts: MotivatingText[];
  instructions: string[];
  minLines: number;
  maxLines: number;
  isAiGenerated: boolean;
  createdAt: string;
}

export type EssayStatus = 'draft' | 'submitted' | 'evaluating' | 'evaluated';

export interface EssayIssue {
  startOffset: number;
  endOffset: number;
  originalText: string;
  category: 'grammar' | 'cohesion' | 'vocabulary' | 'structure' | 'theme_drift';
  explanation: string;
  suggestion: string;
}

export interface EssayCriterionScore {
  score: number;
  maxScore: number;
  feedback: string;
}

export interface EssayEvaluation {
  id: string;
  essayId: string;
  overallScore: number;
  maxPossibleScore: number;
  aiModel: string;
  pedagogicalDisclaimer: string; // Aviso legal de treino pedagógico
  criteria: {
    themeAdherence: EssayCriterionScore; // Adequação ao tema e fuga/tangenciamento
    structure: EssayCriterionScore; // Estrutura formal (introdução, desenvolvimento, conclusão)
    argumentation: EssayCriterionScore; // Capacidade argumentativa e fundamentação
    cohesion: EssayCriterionScore; // Coesão e coerência interparágrafos
    grammar: EssayCriterionScore; // Correção gramatical, pontuação, regência, crase
  };
  generalComments: string[];
  highlightedIssues: EssayIssue[];
  createdAt: string;
}

export interface EssaySubmission {
  id: string;
  userId: string;
  promptId: string;
  title: string;
  content: string; // Texto escrito pelo aluno
  wordCount: number;
  characterCount: number;
  linesCount: number;
  durationMinutes: number;
  status: EssayStatus;
  evaluation?: EssayEvaluation | null;
  createdAt: string;
  updatedAt: string;
}
