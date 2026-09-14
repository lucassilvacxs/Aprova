import { db } from '../db';
import { essayPrompts, essays } from '../db/schema';
import { eq } from 'drizzle-orm';
import { EssayStatsService } from './essay-stats.service';

export interface EssayRecommendation {
  hasEvaluations: boolean;
  weakestCompetence: string | null;
  weakestPercentage: number;
  strongestCompetence: string | null;
  strongestPercentage: number;
  diagnosticAdvice: string;
  actionPlan: string[];
  recommendedPrompts: Array<any>;
}

export class EssayRecommendationService {
  /**
   * Gera diagnósticos pedagógicos determinísticos e recomendações personalizadas de treino
   */
  static async getRecommendations(userId: string): Promise<EssayRecommendation> {
    const stats = await EssayStatsService.getUserStats(userId);

    // Caso 1: Aluno ainda não possui redações corrigidas
    if (stats.correctedCount === 0) {
      const initialPrompts = await db
        .select({
          id: essayPrompts.id,
          title: essayPrompts.title,
          category: essayPrompts.category,
          difficulty: essayPrompts.difficulty,
          estimatedMinutes: essayPrompts.estimatedMinutes,
          minWords: essayPrompts.minWords,
          maxWords: essayPrompts.maxWords,
        })
        .from(essayPrompts)
        .where(eq(essayPrompts.status, 'PUBLISHED'))
        .limit(3);

      return {
        hasEvaluations: false,
        weakestCompetence: null,
        weakestPercentage: 0,
        strongestCompetence: null,
        strongestPercentage: 0,
        diagnosticAdvice:
          'Inicie sua jornada de preparação discursiva escrevendo sua primeira redação. A prática constante é o pilar decisivo para a aprovação nas bancas federais.',
        actionPlan: [
          'Escolha um dos temas fundamentais sugeridos abaixo.',
          'Leia com atenção os textos motivadores antes de começar a escrever.',
          'Estruture o texto em 4 parágrafos: introdução, dois de desenvolvimento e conclusão.',
          'Envie para correção para receber seu primeiro raio-X de desempenho por critérios.',
        ],
        recommendedPrompts: initialPrompts.map((p: any) => ({
          ...p,
          category: p.category || 'Geral',
        })),
      };
    }

    // Caso 2: Aluno possui correções
    const criteria = [...stats.criteriaPerformance];
    // O array já vem ordenado decrescente por aproveitamento
    const strongest = criteria[0];
    const weakest = criteria[criteria.length - 1];

    const weakestName = weakest?.criterionName || 'Argumentação e Estrutura';
    const weakestPct = weakest?.averagePercentage || 0;
    const strongestName = strongest?.criterionName || 'Apresentação';
    const strongestPct = strongest?.averagePercentage || 0;

    let diagnosticAdvice = '';
    const actionPlan: string[] = [];

    const lowerWeak = weakestName.toLowerCase();
    if (lowerWeak.includes('gramática') || lowerWeak.includes('norma') || lowerWeak.includes('modalidade')) {
      diagnosticAdvice = `Seu ponto mais sensível nas últimas avaliações é o "${weakestName}" (${weakestPct}% de aproveitamento). Pequenos desvios gramaticais, de concordância ou pontuação comprometem pontos preciosos da nota final.`;
      actionPlan.push('Dedique 10 minutos finais de cada treino exclusivamente para revisão gramatical e crase.');
      actionPlan.push('Evite períodos longos demais (com mais de 3 linhas sem ponto final).');
      actionPlan.push('Treine a substituição de conectivos repetitivos por opções formais e variadas.');
    } else if (lowerWeak.includes('tema') || lowerWeak.includes('argument') || lowerWeak.includes('desenvolvimento')) {
      diagnosticAdvice = `Identificamos que seu principal desafio está em "${weakestName}" (${weakestPct}% de aproveitamento). As bancas valorizam fundamentação concreta com dados, leis e doutrina.`;
      actionPlan.push('Sempre cite o marco legal pertinente (ex: Art. 144 da CF/88, leis orgânicas ou súmulas).');
      actionPlan.push('Não apenas mencione o problema: apresente causa, impacto na sociedade e solução articulada.');
      actionPlan.push('Certifique-se de responder pontualmente a cada um dos tópicos solicitados na proposta.');
    } else {
      diagnosticAdvice = `Seu desempenho atual apresenta média geral de ${stats.averageScore} pontos. Seu critério com maior margem de evolução é "${weakestName}" (${weakestPct}% de aproveitamento).`;
      actionPlan.push('Estruture cada parágrafo de desenvolvimento com tópico frasal claro + fundamentação + fechamento.');
      actionPlan.push('Mantenha a caligrafia legível e respeito rigoroso às margens da folha padrão.');
      actionPlan.push('Simule a escrita no tempo limite da prova (média de 60 a 75 minutos).');
    }

    // Busca temas recomendados excluindo os já resolvidos recentemente
    const solvedPromptIds = await db
      .select({ promptId: essays.promptId })
      .from(essays)
      .where(eq(essays.userId, userId));

    const promptIdsToExclude = solvedPromptIds.map((s: { promptId: string }) => s.promptId);

    let recommendedPrompts: any[] = [];
    if (promptIdsToExclude.length > 0) {
      const candidates = await db
        .select({
          id: essayPrompts.id,
          title: essayPrompts.title,
          category: essayPrompts.category,
          difficulty: essayPrompts.difficulty,
          estimatedMinutes: essayPrompts.estimatedMinutes,
          minWords: essayPrompts.minWords,
          maxWords: essayPrompts.maxWords,
        })
        .from(essayPrompts)
        .where(
          eq(essayPrompts.status, 'PUBLISHED')
        )
        .limit(4);

      // Filtra os que não foram feitos se possível
      const unattempted = candidates.filter((p: any) => !promptIdsToExclude.includes(p.id));
      if (unattempted.length > 0) {
        recommendedPrompts = unattempted.slice(0, 3);
      } else {
        recommendedPrompts = candidates.slice(0, 3);
      }
    } else {
      recommendedPrompts = await db
        .select({
          id: essayPrompts.id,
          title: essayPrompts.title,
          category: essayPrompts.category,
          difficulty: essayPrompts.difficulty,
          estimatedMinutes: essayPrompts.estimatedMinutes,
          minWords: essayPrompts.minWords,
          maxWords: essayPrompts.maxWords,
        })
        .from(essayPrompts)
        .where(eq(essayPrompts.status, 'PUBLISHED'))
        .limit(3);
    }

    return {
      hasEvaluations: true,
      weakestCompetence: weakestName,
      weakestPercentage: weakestPct,
      strongestCompetence: strongestName,
      strongestPercentage: strongestPct,
      diagnosticAdvice,
      actionPlan,
      recommendedPrompts: recommendedPrompts.map((p: any) => ({
        ...p,
        category: p.category || 'Geral',
      })),
    };
  }
}
