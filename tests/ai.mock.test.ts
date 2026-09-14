import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../server/services/ai/mock.provider';

describe('AIService Mock Provider (Desacoplamento de IA)', () => {
  const ai = new MockAIProvider();

  it('deve gerar temas estruturados com textos motivadores', async () => {
    const theme = await ai.generateEssayTheme({
      contestTitle: 'PRF 2026',
      themeArea: 'Segurança Pública',
    });

    expect(theme.title).toBeDefined();
    expect(theme.motivatingTexts.length).toBeGreaterThanOrEqual(2);
    expect(theme.instructions.length).toBeGreaterThan(0);
    expect(theme.minLines).toBe(20);
    expect(theme.maxLines).toBe(30);
  });

  it('deve avaliar redações segundo os 5 critérios formais de bancas federais', async () => {
    const evaluation = await ai.correctEssay({
      essayText: 'A segurança pública é dever do Estado e responsabilidade de todos...',
      prompt: {
        id: '1',
        contestId: '1',
        title: 'Tema Teste',
        themeArea: 'Segurança',
        motivatingTexts: [],
        instructions: [],
        minLines: 20,
        maxLines: 30,
        isAiGenerated: false,
        createdAt: new Date().toISOString(),
      },
    });

    expect(evaluation.overallScore).toBeGreaterThan(0);
    expect(evaluation.maxPossibleScore).toBe(100);
    expect(evaluation.pedagogicalDisclaimer).toContain('treino pedagógico');

    // Assegura as 5 competências avaliadas
    expect(evaluation.criteria.themeAdherence.score).toBeDefined();
    expect(evaluation.criteria.structure.score).toBeDefined();
    expect(evaluation.criteria.argumentation.score).toBeDefined();
    expect(evaluation.criteria.cohesion.score).toBeDefined();
    expect(evaluation.criteria.grammar.score).toBeDefined();
  });

  it('deve gerar conselho estratégico a partir da análise de desempenho', async () => {
    const insights = await ai.analyzePerformance({
      userId: 'user-1',
      totalQuestionsAnswered: 100,
      accuracyBySubject: {
        'Direito Constitucional': 85,
        'Raciocínio Lógico': 45,
      },
    });

    expect(insights.weakestSubjects).toContain('Raciocínio Lógico-Matemático');
    expect(insights.strategicAdvice).toBeDefined();
  });
});
