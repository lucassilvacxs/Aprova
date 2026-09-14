/**
 * Serviço de Diagnóstico e Recomendação Pedagógica (Camada de Abstração)
 * 
 * Atualmente implementado com algoritmos determinísticos e explicáveis baseados
 * em regras e métricas reais de desempenho e progresso.
 * 
 * PREPARAÇÃO PARA IA (Fase Futura):
 * Esta classe é o ponto de injeção arquitetural onde um modelo de linguagem (LLM / Gemini)
 * poderá substituir ou aprimorar os pesos e justificativas pedagógicas sem qualquer
 * alteração no schema do banco ou nos contratos de API do sistema.
 */

export interface SubjectDiagnosticInput {
  subjectId: string;
  subjectName: string;
  contestWeight: number; // Peso atribuído no edital (ex: 1.0 a 3.0)
  userAccuracyPercentage: number; // 0 a 100
  questionsAnswered: number;
  totalPendingLessons: number;
  userConfiguredPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SubjectPriorityDiagnosis {
  subjectId: string;
  subjectName: string;
  calculatedScore: number;
  targetSharePercentage: number; // Proporção da carga horária semanal recomendada
  explanation: string;
}

export class StudyPlanRecommendationService {
  /**
   * Calcula a pontuação pedagógica de prioridade de uma disciplina e gera
   * a justificativa explicável em linguagem natural.
   * 
   * Fórmula Determinística:
   * Score = (PesoEdital * 20) + BonusPrioridade + BonusBaixoDesempenho + BonusAulasPendentes
   */
  static calculateSubjectPriority(input: SubjectDiagnosticInput): SubjectPriorityDiagnosis {
    const {
      subjectId,
      subjectName,
      contestWeight,
      userAccuracyPercentage,
      questionsAnswered,
      totalPendingLessons,
      userConfiguredPriority = 'MEDIUM',
    } = input;

    // 1. Componente Peso do Edital (0 a 60 pontos)
    const weightScore = Math.max(1, contestWeight) * 20;

    // 2. Componente Prioridade Escolhida pelo Usuário (0 a 40 pontos)
    let priorityBonus = 10;
    if (userConfiguredPriority === 'CRITICAL') priorityBonus = 40;
    else if (userConfiguredPriority === 'HIGH') priorityBonus = 25;
    else if (userConfiguredPriority === 'MEDIUM') priorityBonus = 10;
    else if (userConfiguredPriority === 'LOW') priorityBonus = 0;

    // 3. Componente Desempenho / Acurácia (0 a 40 pontos)
    let weaknessScore = 0;
    let weaknessDetail = '';
    if (questionsAnswered > 0) {
      if (userAccuracyPercentage < 60) {
        weaknessScore = (100 - userAccuracyPercentage) * 0.45;
        weaknessDetail = `taxa de acertos crítica (${userAccuracyPercentage.toFixed(0)}%) em ${questionsAnswered} questões`;
      } else if (userAccuracyPercentage < 75) {
        weaknessScore = (100 - userAccuracyPercentage) * 0.3;
        weaknessDetail = `aproveitamento intermediário (${userAccuracyPercentage.toFixed(0)}%) com margem para evolução`;
      } else {
        weaknessScore = 5;
        weaknessDetail = `bom domínio demonstrado (${userAccuracyPercentage.toFixed(0)}% de acertos)`;
      }
    } else {
      // Sem histórico de questões: prioridade padrão de exploração
      weaknessScore = 15;
      weaknessDetail = 'sem resolução prévia de questões registradas';
    }

    // 4. Componente Conteúdo Pendente (0 a 30 pontos)
    const pendingScore = Math.min(30, totalPendingLessons * 5);
    const pendingDetail = totalPendingLessons > 0
      ? `${totalPendingLessons} aula(s) teórica(s) pendente(s)`
      : 'conteúdo teórico integralmente concluído';

    const calculatedScore = Math.round(weightScore + priorityBonus + weaknessScore + pendingScore);

    // 5. Geração da Justificativa Explicável (Transparência Pedagógica)
    let explanation = '';
    if (calculatedScore >= 80) {
      explanation = `${subjectName} recebeu prioridade MÁXIMA devido a: ${weaknessDetail}, ${pendingDetail} e peso relevante no edital.`;
    } else if (calculatedScore >= 50) {
      explanation = `${subjectName} com carga horária REGULAR equilibrando ${pendingDetail} e ${weaknessDetail}.`;
    } else {
      explanation = `${subjectName} com carga horária MODERADA de manutenção de fixação (${weaknessDetail}).`;
    }

    return {
      subjectId,
      subjectName,
      calculatedScore,
      targetSharePercentage: 0, // Será normalizado no conjunto de disciplinas
      explanation,
    };
  }

  /**
   * Normaliza os scores calculados de todas as disciplinas para gerar a distribuição percentual
   * equilibrada da semana, respeitando pisos e tetos (ex: min 5%, max 40%).
   */
  static normalizeDistributionShares(
    diagnoses: SubjectPriorityDiagnosis[],
    minShare: number = 0.05,
    maxShare: number = 0.40
  ): SubjectPriorityDiagnosis[] {
    if (diagnoses.length === 0) return [];
    if (diagnoses.length === 1) {
      return [{ ...diagnoses[0], targetSharePercentage: 1.0 }];
    }

    const totalRaw = diagnoses.reduce((acc, d) => acc + Math.max(10, d.calculatedScore), 0);

    // Primeira passada proporcional
    let distributed = diagnoses.map((d) => {
      const rawShare = Math.max(10, d.calculatedScore) / totalRaw;
      const clamped = Math.min(maxShare, Math.max(minShare, rawShare));
      return {
        ...d,
        targetSharePercentage: clamped,
      };
    });

    // Segunda passada: redistribui o resíduo para somar exatamente 1.0
    const currentSum = distributed.reduce((acc, d) => acc + d.targetSharePercentage, 0);
    const diff = 1.0 - currentSum;
    const shareAdjustment = diff / distributed.length;

    return distributed.map((d) => ({
      ...d,
      targetSharePercentage: Math.min(maxShare, Math.max(minShare, d.targetSharePercentage + shareAdjustment)),
    }));
  }
}
