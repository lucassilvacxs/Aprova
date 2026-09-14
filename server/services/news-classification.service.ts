export interface ClassificationResult {
  category: string;
  suggestedContestAcronym?: string;
  isImportant: boolean;
  tags: string[];
}

export interface INewsClassificationService {
  classify(title: string, summary: string, content?: string): ClassificationResult;
}

export class NewsClassificationService implements INewsClassificationService {
  /**
   * Classificador determinístico baseado em termos-chave, expressões regulares
   * e regras pedagógicas para concursos públicos.
   * Arquitetura desacoplada via interface para permitir futura troca por IA.
   */
  classify(title: string, summary: string, content = ''): ClassificationResult {
    const fullText = `${title} ${summary} ${content}`.toLowerCase();

    // 1. Classificação de Categoria
    let category = 'GENERAL';
    if (/\b(retifica[çc][ãa]o|retificado|errata)\b/i.test(fullText)) {
      category = 'RETIFICATION';
    } else if (/\b(edital|abertura de concurso|novo edital)\b/i.test(fullText)) {
      category = 'EDITAL';
    } else if (/\b(gabarito|resultado|aprovad[oa]s?|classifica[çc][ãa]o|nota de corte)\b/i.test(fullText)) {
      category = 'RESULT';
    } else if (/\b(inscri[çc][ãa]o|inscri[çc][õo]es|isen[çc][ãa]o|taxa de inscri[çc][ãa]o)\b/i.test(fullText)) {
      category = 'REGISTRATION';
    } else if (/\b(prova|local de prova|data da prova|exame|discursiva|taf|teste de aptid[ãa]o)\b/i.test(fullText)) {
      category = 'EXAM';
    } else if (/\b(convoca[çc][ãa]o|nomea[çc][ãa]o|posse|curso de forma[çc][ãa]o|cfp)\b/i.test(fullText)) {
      category = 'APPOINTMENT';
    } else if (/\b(sal[áa]rio|remunera[çc][ãa]o|subs[íi]dio|carreira|vagas|plano de cargos)\b/i.test(fullText)) {
      category = 'CAREER';
    } else if (/\b(dica|estudo|revis[ãa]o|plano de estudo|como estudar|quest[õo]es)\b/i.test(fullText)) {
      category = 'STUDY';
    } else if (/\b(comunicado|aviso|nota oficial|informe)\b/i.test(fullText)) {
      category = 'NOTICE';
    } else if (/\b(concurso|certame|autoriza[çc][ãa]o|comiss[ãa]o)\b/i.test(fullText)) {
      category = 'CONTEST';
    }

    // 2. Detecção de Concurso Sugerido
    let suggestedContestAcronym: string | undefined = undefined;
    if (/\b(pol[íi]cia rodovi[áa]ria federal|prf|rodovi[áa]rio federal)\b/i.test(fullText)) {
      suggestedContestAcronym = 'PRF';
    } else if (/\b(pol[íi]cia federal|pf|agente federal|escriv[ãa]o da pf|papiloscopista)\b/i.test(fullText)) {
      suggestedContestAcronym = 'PF';
    }

    // 3. Detecção de Importância
    const isImportant =
      /\b(urgente|retifica[çc][ãa]o|adiamento|adiad[oa]|suspenso|suspens[ãa]o|cancelamento|cancelad[oa]|novo edital|gabarito definitivo|resultado final|convoca[çc][ãa]o imediata)\b/i.test(
        title
      ) ||
      /\b(urgente|aten[çc][ãa]o|prazo final|hoje [é|e] o [úu]ltimo dia)\b/i.test(summary);

    // 4. Extração de Tags
    const tagsSet = new Set<string>();
    const tagKeywords: Record<string, RegExp> = {
      edital: /\b(edital|abertura)\b/i,
      retificacao: /\b(retifica[çc][ãa]o|errata)\b/i,
      cebraspe: /\b(cebraspe|cespe)\b/i,
      prova: /\b(prova|exame|gabarito)\b/i,
      cronograma: /\b(cronograma|data|datas|calend[áa]rio)\b/i,
      inscricao: /\b(inscri[çc][ãa]o|inscri[çc][õo]es|taxa)\b/i,
      resultado: /\b(resultado|classifica[çc][ãa]o|nota)\b/i,
      convocacao: /\b(convoca[çc][ãa]o|nomea[çc][ãa]o|posse)\b/i,
      taf: /\b(taf|teste de aptid[ãa]o f[íi]sica)\b/i,
      carreira: /\b(carreira|remunera[çc][ãa]o|subs[íi]dio|vagas)\b/i,
    };

    for (const [tag, regex] of Object.entries(tagKeywords)) {
      if (regex.test(fullText)) {
        tagsSet.add(tag);
      }
    }

    if (suggestedContestAcronym) {
      tagsSet.add(suggestedContestAcronym.toLowerCase());
    }

    return {
      category,
      suggestedContestAcronym,
      isImportant,
      tags: Array.from(tagsSet),
    };
  }
}

export const defaultNewsClassificationService = new NewsClassificationService();
