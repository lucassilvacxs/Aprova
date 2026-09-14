import {
  AIService,
  GenerateThemeParams,
  CorrectEssayParams,
  AnalyzePerformanceParams,
  PerformanceInsights,
  ExplainQuestionParams,
  QuestionExplanationResult,
  GenerateStudyPlanParams,
  SummarizeContentParams,
} from './ai.interface';
import { EssayEvaluation, EssayPrompt } from '@/core/types/essay';
import { StudyPlan } from '@/core/types/study';

export class MockAIProvider implements AIService {
  async generateEssayTheme(params: GenerateThemeParams): Promise<Omit<EssayPrompt, 'id' | 'createdAt'>> {
    return {
      contestId: 'mock-contest-id',
      boardId: 'mock-board-id',
      title: `Tema Gerado por IA: O Papel das Forças de Segurança em ${params.themeArea || 'Segurança Pública'}`,
      themeArea: params.themeArea || 'Segurança Pública e Direitos Fundamentais',
      motivatingTexts: [
        {
          id: 'text-1',
          title: 'Texto Motivador I - Dados Estatísticos',
          source: 'Ministério da Justiça e Segurança Pública (DEMO)',
          content: 'A integração entre a Polícia Rodoviária Federal e a Polícia Federal resultou na apreensão recorde de ilícitos em corredores logísticos estratégicos.',
        },
        {
          id: 'text-2',
          title: 'Texto Motivador II - Marco Legal',
          source: 'Constituição da República de 1988, Art. 144 (DEMO)',
          content: 'A segurança pública, dever do Estado, direito e responsabilidade de todos, é exercida para a preservação da ordem pública e da incolumidade das pessoas e do patrimônio.',
        },
      ],
      instructions: [
        'Redija texto dissertativo-argumentativo em norma-padrão da língua portuguesa.',
        'Aborde necessariamente os três aspectos solicitados.',
        'Extensão máxima de 30 linhas.',
      ],
      minLines: 20,
      maxLines: 30,
      isAiGenerated: true,
    };
  }

  async correctEssay(_params: CorrectEssayParams): Promise<Omit<EssayEvaluation, 'id' | 'essayId' | 'createdAt'>> {
    return {
      overallScore: 84.0,
      maxPossibleScore: 100.0,
      aiModel: 'mock-ai-provider',
      pedagogicalDisclaimer:
        'Aviso: Esta avaliação é uma estimativa diagnóstica gerada por inteligência artificial para treino pedagógico e não substitui a banca examinadora oficial.',
      criteria: {
        themeAdherence: {
          score: 18.0,
          maxScore: 20.0,
          feedback: 'Excelente adequação aos tópicos solicitados na proposta dissertativa.',
        },
        structure: {
          score: 17.0,
          maxScore: 20.0,
          feedback: 'Estrutura clássica bem delimitada em introdução, desenvolvimento e conclusão.',
        },
        argumentation: {
          score: 16.0,
          maxScore: 20.0,
          feedback: 'Boa sustentação dos argumentos com menção a dispositivos normativos.',
        },
        cohesion: {
          score: 17.0,
          maxScore: 20.0,
          feedback: 'Bom uso de conectivos interparágrafos e coesão referencial fluida.',
        },
        grammar: {
          score: 16.0,
          maxScore: 20.0,
          feedback: 'Poucos desvios de pontuação e concordância verbal pontual.',
        },
      },
      generalComments: [
        'Texto bem articulado e focado no tema proposto.',
        'Recomenda-se aprofundar a fundamentação do segundo aspecto no parágrafo 3.',
      ],
      highlightedIssues: [
        {
          startOffset: 12,
          endOffset: 25,
          originalText: 'de encontro a',
          category: 'vocabulary',
          explanation: 'Expressão utilizada em sentido contrário ao pretendido.',
          suggestion: 'ao encontro de',
        },
      ],
    };
  }

  async analyzePerformance(params: AnalyzePerformanceParams): Promise<PerformanceInsights> {
    const advice =
      params.accuracyBySubject['Raciocínio Lógico'] && params.accuracyBySubject['Raciocínio Lógico'] < 50
        ? 'Sua taxa de acertos em RLM está abaixo da média recomendada para carreiras policiais. Aumente a frequência de resolução de questões com cronômetro.'
        : 'Mantenha o ritmo equilibrado de estudos.';

    return {
      weakestSubjects: ['Raciocínio Lógico-Matemático', 'Legislação Especial'],
      strongestSubjects: ['Direito Constitucional', 'Língua Portuguesa'],
      strategicAdvice: advice,
      suggestedFocusForNext7Days: [
        'Resolução de 30 questões/dia de RLM',
        'Revisão de Legislação de Trânsito (Resoluções CONTRAN)',
      ],
    };
  }

  async explainQuestion(_params: ExplainQuestionParams): Promise<QuestionExplanationResult> {
    return {
      overview: 'Questão aborda as garantias fundamentais previstas no art. 5º da CF/88.',
      whyCorrect: 'O item está CORRETO conforme jurisprudência pacífica do Supremo Tribunal Federal.',
      distractorsAnalysis: {},
      keyLegalConcepts: ['CF/88 art. 5º, XI', 'Inviolabilidade de domicílio', 'Flagrante delito'],
    };
  }

  async generateStudyPlan(params: GenerateStudyPlanParams): Promise<Partial<StudyPlan>> {
    return {
      weeklyHoursGoal: params.weeklyHoursAvailable,
      active: true,
      sessions: [],
    };
  }

  async summarizeContent(_params: SummarizeContentParams): Promise<string> {
    return 'Resumo esquemático do conteúdo para revisão rápida.';
  }
}
