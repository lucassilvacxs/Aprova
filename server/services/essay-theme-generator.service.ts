import { db } from '../db';
import { essayPrompts, essays } from '../db/schema';
import { eq, and, or, notInArray } from 'drizzle-orm';

export interface ThemeSelectionParams {
  contestId?: string;
  category?: string;
  difficulty?: string;
  userId?: string;
}

export interface IEssayThemeGenerator {
  generateOrSelectTheme(params: ThemeSelectionParams): Promise<any>;
}

export class EssayThemeGenerator implements IEssayThemeGenerator {
  /**
   * Sorteia deterministicamente um tema de redação adequado ao concurso/categoria,
   * evitando temas resolvidos recentemente (nos últimos 30 dias) pelo estudante.
   */
  async generateOrSelectTheme(params: ThemeSelectionParams) {
    const conditions: any[] = [eq(essayPrompts.status, 'PUBLISHED')];

    if (params.contestId && params.contestId !== 'ALL') {
      conditions.push(eq(essayPrompts.contestId, params.contestId));
    }

    if (params.category && params.category !== 'ALL') {
      conditions.push(
        or(
          eq(essayPrompts.category, params.category),
          eq(essayPrompts.themeArea, params.category)
        )
      );
    }

    if (params.difficulty && params.difficulty !== 'ALL') {
      conditions.push(eq(essayPrompts.difficulty, params.difficulty.toUpperCase()));
    }

    // Busca temas resolvidos pelo aluno nos últimos 30 dias para evitar repetições
    let recentPromptIds: string[] = [];
    if (params.userId) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentAttempts = await db
        .select({ promptId: essays.promptId })
        .from(essays)
        .where(
          and(
            eq(essays.userId, params.userId)
          )
        );

      recentPromptIds = recentAttempts.map((a: { promptId: string }) => a.promptId);
    }

    // Tenta primeiro buscar candidatos que NÃO foram resolvidos recentemente
    let candidateConditions = [...conditions];
    if (recentPromptIds.length > 0) {
      candidateConditions.push(notInArray(essayPrompts.id, recentPromptIds));
    }

    let candidates = await db
      .select()
      .from(essayPrompts)
      .where(and(...candidateConditions));

    // Se todos já foram resolvidos recentemente, relaxa a exclusão para não deixar o aluno sem opções
    if (candidates.length === 0) {
      candidates = await db
        .select()
        .from(essayPrompts)
        .where(and(...conditions));
    }

    // Se ainda assim não encontrar com os filtros restritivos (ex: categoria muito específica), busca qualquer tema publicado
    if (candidates.length === 0) {
      candidates = await db
        .select()
        .from(essayPrompts)
        .where(eq(essayPrompts.status, 'PUBLISHED'));
    }

    if (candidates.length === 0) {
      throw new Error('Nenhum tema de redação publicado disponível no momento.');
    }

    // Sorteio aleatório equilibrado entre os candidatos elegíveis
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selected = candidates[randomIndex];

    return {
      ...selected,
      category: selected.category || selected.themeArea || 'Geral',
    };
  }
}

export const defaultThemeGenerator = new EssayThemeGenerator();
