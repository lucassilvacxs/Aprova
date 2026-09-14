export interface ScoringQuestionItem {
  questionId: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  difficulty: string;
  points?: number;
}

export interface ScoringAnswerItem {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
}

export interface SubjectBreakdownItem {
  subjectId: string;
  subjectName: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  percentage: number;
}

export interface TopicBreakdownItem {
  topicId: string;
  topicName: string;
  total: number;
  correct: number;
  wrong: number;
  percentage: number;
  isStrength: boolean; // >= 70%
  needsAttention: boolean; // < 50%
}

export interface DifficultyBreakdown {
  facil: { total: number; correct: number; percentage: number };
  medio: { total: number; correct: number; percentage: number };
  dificil: { total: number; correct: number; percentage: number };
}

export interface ScoringResult {
  totalQuestions: number;
  answeredQuestions: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalScore: string; // ex: "45.00"
  percentage: string; // ex: "75.00"
  subjectBreakdown: SubjectBreakdownItem[];
  topicBreakdown: TopicBreakdownItem[];
  difficultyBreakdown: DifficultyBreakdown;
}

export class SimulationScoringService {
  /**
   * Calcula de forma autoritativa e determinística o resultado completo de uma tentativa de simulado.
   */
  static calculateScore(
    penaltyRule: string = 'none',
    penaltyFactorStr: string = '1.00',
    questionsList: ScoringQuestionItem[],
    answersList: ScoringAnswerItem[]
  ): ScoringResult {
    const totalQuestions = questionsList.length;
    const penaltyFactor = Number(penaltyFactorStr) || 1.0;

    const answerMap = new Map<string, ScoringAnswerItem>();
    for (const ans of answersList) {
      answerMap.set(ans.questionId, ans);
    }

    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let rawScore = 0;

    // Estruturas para breakdowns
    const subjectMap = new Map<string, { subjectId: string; subjectName: string; total: number; correct: number; wrong: number; blank: number }>();
    const topicMap = new Map<string, { topicId: string; topicName: string; total: number; correct: number; wrong: number }>();
    const diffMap = {
      facil: { total: 0, correct: 0 },
      medio: { total: 0, correct: 0 },
      dificil: { total: 0, correct: 0 },
    };

    for (const q of questionsList) {
      const ans = answerMap.get(q.questionId);
      const points = Number(q.points) || 1.0;

      // Normalização de dificuldade
      const dNorm = (q.difficulty || 'medium').toLowerCase();
      const diffKey = (dNorm === 'easy' || dNorm === 'facil') ? 'facil' : (dNorm === 'hard' || dNorm === 'dificil') ? 'dificil' : 'medio';
      diffMap[diffKey].total++;

      // Agrupamento por disciplina
      const sId = q.subjectId || 'geral';
      const sObj = subjectMap.get(sId) || {
        subjectId: sId,
        subjectName: q.subjectName || 'Geral',
        total: 0,
        correct: 0,
        wrong: 0,
        blank: 0,
      };
      sObj.total++;

      // Agrupamento por assunto
      const tId = q.topicId || 'geral';
      const tObj = topicMap.get(tId) || {
        topicId: tId,
        topicName: q.topicName || 'Tópico Geral',
        total: 0,
        correct: 0,
        wrong: 0,
      };
      tObj.total++;

      if (!ans || !ans.selectedOptionId) {
        blankCount++;
        sObj.blank++;
      } else if (ans.isCorrect) {
        correctCount++;
        sObj.correct++;
        tObj.correct++;
        diffMap[diffKey].correct++;
        rawScore += points;
      } else {
        wrongCount++;
        sObj.wrong++;
        tObj.wrong++;
        if (penaltyRule === 'one_error_cancels_one_correct') {
          rawScore -= (points * penaltyFactor);
        }
      }

      subjectMap.set(sId, sObj);
      topicMap.set(tId, tObj);
    }

    const answeredQuestions = correctCount + wrongCount;
    const finalScore = Math.max(0, rawScore);
    const percentage = totalQuestions > 0 ? ((finalScore / totalQuestions) * 100) : 0;

    // Monta subjectBreakdown
    const subjectBreakdown: SubjectBreakdownItem[] = Array.from(subjectMap.values()).map((s) => ({
      ...s,
      percentage: s.total > 0 ? Math.round(((s.correct / s.total) * 100) * 100) / 100 : 0,
    }));

    // Monta topicBreakdown
    const topicBreakdown: TopicBreakdownItem[] = Array.from(topicMap.values()).map((t) => {
      const pct = t.total > 0 ? Math.round(((t.correct / t.total) * 100) * 100) / 100 : 0;
      return {
        ...t,
        percentage: pct,
        isStrength: pct >= 70,
        needsAttention: pct < 50,
      };
    });

    // Monta difficultyBreakdown
    const difficultyBreakdown: DifficultyBreakdown = {
      facil: {
        total: diffMap.facil.total,
        correct: diffMap.facil.correct,
        percentage: diffMap.facil.total > 0 ? Math.round(((diffMap.facil.correct / diffMap.facil.total) * 100) * 100) / 100 : 0,
      },
      medio: {
        total: diffMap.medio.total,
        correct: diffMap.medio.correct,
        percentage: diffMap.medio.total > 0 ? Math.round(((diffMap.medio.correct / diffMap.medio.total) * 100) * 100) / 100 : 0,
      },
      dificil: {
        total: diffMap.dificil.total,
        correct: diffMap.dificil.correct,
        percentage: diffMap.dificil.total > 0 ? Math.round(((diffMap.dificil.correct / diffMap.dificil.total) * 100) * 100) / 100 : 0,
      },
    };

    return {
      totalQuestions,
      answeredQuestions,
      correctCount,
      wrongCount,
      blankCount,
      totalScore: finalScore.toFixed(2),
      percentage: percentage.toFixed(2),
      subjectBreakdown,
      topicBreakdown,
      difficultyBreakdown,
    };
  }
}
