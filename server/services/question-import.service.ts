import { db } from '../db';
import { questions, questionOptions, subjects, topics, examBoards, contests } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface ImportQuestionRecord {
  contestSlug?: string;
  subjectSlug: string;
  topicName: string;
  boardAcronym: string;
  year: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'very_hard';
  format?: 'multiple_choice' | 'true_false';
  statement: string;
  officialExplanation: string;
  source?: 'BANCA_OFICIAL' | 'QUESTAO_AUTORAL' | 'IMPORTADA' | 'DEMO' | 'OUTRA';
  sourceReference?: string;
  tags?: string[];
  options: {
    letter: string;
    text: string;
    isCorrect: boolean;
  }[];
}

export interface ImportResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: { index: number; message: string; data?: any }[];
  importedIds: string[];
}

export const QuestionImportService = {
  /**
   * Importa lote estruturado de questões com validação prévia e mapeamento automático de entidades.
   * Suporta modo de simulação (dryRun) para conferência prévia sem persistir no banco.
   */
  async importBatch(records: ImportQuestionRecord[], userId: string, dryRun: boolean = false): Promise<ImportResult> {
    const result: ImportResult = {
      totalProcessed: records.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      importedIds: [],
    };

    // Cache local de busca de bancas e disciplinas para otimizar importação em massa
    const allBoards = await db.select().from(examBoards);
    const allSubjects = await db.select().from(subjects);
    const allContests = await db.select().from(contests);

    const boardMap = new Map(allBoards.map((b: any) => [b.acronym.toUpperCase(), b.id]));
    const subjectMap = new Map(allSubjects.map((s: any) => [s.slug.toLowerCase(), s.id]));
    const contestMap = new Map(allContests.map((c: any) => [c.slug.toLowerCase(), c.id]));

    for (let i = 0; i < records.length; i++) {
      const item = records[i];

      try {
        if (!item.statement || item.statement.trim() === '') {
          throw new Error('Enunciado não pode ser vazio');
        }
        if (!item.officialExplanation || item.officialExplanation.trim() === '') {
          throw new Error('Comentário do professor / explicação oficial é obrigatório');
        }
        if (!item.year || isNaN(item.year)) {
          throw new Error('Ano inválido');
        }

        const boardId = boardMap.get(item.boardAcronym.toUpperCase());
        if (!boardId) {
          throw new Error(`Banca "${item.boardAcronym}" não encontrada no sistema`);
        }

        const subjectId = subjectMap.get(item.subjectSlug.toLowerCase());
        if (!subjectId) {
          throw new Error(`Disciplina com slug "${item.subjectSlug}" não encontrada`);
        }

        const contestId = item.contestSlug ? contestMap.get(item.contestSlug.toLowerCase()) : undefined;

        // Procura ou cria o tópico se não existir
        const [existingTopic] = await db
          .select()
          .from(topics)
          .where(eq(topics.subjectId, subjectId as string));

        let topicId = existingTopic?.id;
        if (!topicId) {
          throw new Error(`Nenhum tópico encontrado para a disciplina "${item.subjectSlug}"`);
        }

        if (!item.options || item.options.length < 2) {
          throw new Error('A questão precisa ter no mínimo 2 opções');
        }

        const correctCount = item.options.filter((o) => o.isCorrect).length;
        if (correctCount !== 1) {
          throw new Error(`A questão deve possuir exatamente 1 opção correta (encontradas: ${correctCount})`);
        }

        if (!dryRun) {
          await db.transaction(async (tx: any) => {
            const [q] = await tx
              .insert(questions)
              .values({
                contestId: contestId || null,
                subjectId,
                topicId,
                boardId,
                year: item.year,
                difficulty: item.difficulty || 'medium',
                format: item.format || 'multiple_choice',
                statement: item.statement.trim(),
                officialExplanation: item.officialExplanation.trim(),
                source: item.source || 'IMPORTADA',
                sourceReference: item.sourceReference || 'Lote de Importação',
                tags: item.tags || [],
                status: 'published',
                createdBy: userId,
                updatedBy: userId,
              })
              .returning();

            const optionsToInsert = item.options.map((opt, idx) => ({
              questionId: q.id,
              letter: opt.letter.toUpperCase().trim(),
              text: opt.text.trim(),
              isCorrect: opt.isCorrect,
              orderIndex: idx + 1,
            }));

            await tx.insert(questionOptions).values(optionsToInsert);

            result.importedIds.push(q.id);
          });
        }

        result.successCount++;
      } catch (err: any) {
        result.errorCount++;
        result.errors.push({
          index: i,
          message: err.message || 'Erro desconhecido',
          data: { statementSnippet: item.statement?.slice(0, 50) },
        });
      }
    }

    return result;
  },
};
