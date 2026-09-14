import { api } from './api';

export interface QuestionOption {
  id: string;
  letter: string;
  text: string;
  orderIndex: number;
  isCorrect?: boolean; // Apenas disponível após resolução ou para admin
}

export interface QuestionUserAttempt {
  isCorrect: boolean;
  selectedOptionId: string;
  createdAt: string;
  durationSeconds?: number;
}

export interface QuestionItem {
  id: string;
  contestId: string | null;
  subjectId: string | null;
  topicId: string;
  boardId: string;
  originContestId: string | null;
  year: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'very_hard';
  format: 'multiple_choice' | 'true_false';
  statement: string;
  officialExplanation?: string | null;
  source: 'BANCA_OFICIAL' | 'QUESTAO_AUTORAL' | 'IMPORTADA' | 'DEMO' | 'OUTRA';
  sourceReference?: string | null;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  topicName?: string | null;
  subjectName?: string | null;
  subjectColor?: string | null;
  boardName?: string | null;
  boardAcronym?: string | null;
  contestTitle?: string | null;
  agencyAcronym?: string | null;
  isFavorited?: boolean;
  isMarkedForReview?: boolean;
  userAttempt?: QuestionUserAttempt | null;
}

export interface QuestionDetail extends QuestionItem {
  options: QuestionOption[];
  hasAttempted: boolean;
  userAttempts: QuestionUserAttempt[];
  latestAttempt: QuestionUserAttempt | null;
}

export interface QuestionsListFilter {
  contestId?: string;
  subjectId?: string;
  topicId?: string;
  boardId?: string;
  year?: number | string;
  difficulty?: string;
  format?: string;
  source?: string;
  status?: string;
  search?: string;
  resolutionStatus?: 'all' | 'unanswered' | 'correct' | 'wrong';
  onlyFavorites?: boolean;
  onlyReview?: boolean;
  page?: number;
  limit?: number;
}

export interface AttemptResult {
  attemptId: string;
  isCorrect: boolean;
  selectedOptionId: string;
  correctOptionId: string;
  explanation: string;
}

export interface QuestionStats {
  overall: {
    totalAnswered: number;
    totalCorrect: number;
    totalWrong: number;
    accuracy: number;
    avgDurationSec: number;
  };
  bySubject: {
    subjectId: string;
    subjectName: string;
    colorToken: string;
    answered: number;
    correct: number;
    wrong: number;
    accuracy: number;
  }[];
  byDifficulty: {
    difficulty: string;
    answered: number;
    correct: number;
    accuracy: number;
  }[];
  byBoard: {
    boardId: string;
    boardAcronym: string;
    boardName: string;
    answered: number;
    correct: number;
    accuracy: number;
  }[];
}

export interface RecommendedQuestion {
  id: string;
  statement: string;
  year: number;
  difficulty: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  topicName: string | null;
  boardAcronym: string | null;
  recommendationReason: string;
  priorityScore: number;
}

export interface FilterOptionData {
  boards: { id: string; name: string; acronym: string }[];
  subjects: { id: string; name: string; slug: string; colorToken: string }[];
  topics: { id: string; subjectId: string; name: string }[];
  contests: { id: string; title: string; slug: string }[];
  difficulties: { value: string; label: string }[];
  formats: { value: string; label: string }[];
  sources: { value: string; label: string }[];
}

export interface CreateQuestionInput {
  contestId?: string | null;
  subjectId?: string | null;
  topicId: string;
  boardId: string;
  year: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'very_hard';
  format?: 'multiple_choice' | 'true_false';
  statement: string;
  officialExplanation: string;
  source?: 'BANCA_OFICIAL' | 'QUESTAO_AUTORAL' | 'IMPORTADA' | 'DEMO' | 'OUTRA';
  sourceReference?: string | null;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
  options: {
    letter: string;
    text: string;
    isCorrect: boolean;
    orderIndex?: number;
  }[];
}

export const questionService = {
  /**
   * Busca listagem paginada de questões com filtros avançados
   */
  async getQuestions(filters: QuestionsListFilter = {}) {
    const params = new URLSearchParams();
    if (filters.contestId) params.append('contestId', filters.contestId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.topicId) params.append('topicId', filters.topicId);
    if (filters.boardId) params.append('boardId', filters.boardId);
    if (filters.year) params.append('year', String(filters.year));
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.format) params.append('format', filters.format);
    if (filters.source) params.append('source', filters.source);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.resolutionStatus && filters.resolutionStatus !== 'all') {
      params.append('resolutionStatus', filters.resolutionStatus);
    }
    if (filters.onlyFavorites) params.append('onlyFavorites', 'true');
    if (filters.onlyReview) params.append('onlyReview', 'true');
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<{ data: QuestionItem[]; meta: any }>(`/questions${queryStr}`);
    return {
      items: res.data || [],
      meta: (res as any).meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },

  /**
   * Busca detalhes da questão com proteção pedagógica anti-cheat
   */
  async getQuestion(id: string) {
    const res = await api.get<{ data: QuestionDetail }>(`/questions/${id}`);
    return res.data;
  },

  /**
   * Submete a resposta da questão e obtém o gabarito comentado
   */
  async submitAttempt(id: string, payload: { selectedOptionId: string; durationSeconds?: number; source?: string }) {
    const res = await api.post<{ data: AttemptResult }>(`/questions/${id}/attempt`, payload);
    return res.data;
  },

  /**
   * Alterna favorito da questão
   */
  async toggleFavorite(id: string) {
    const res = await api.post<{ data: { favorited: boolean } }>(`/questions/${id}/favorite`);
    return res.data;
  },

  /**
   * Alterna marcação para revisão periódica
   */
  async toggleReview(id: string) {
    const res = await api.post<{ data: { markedForReview: boolean } }>(`/questions/${id}/review`);
    return res.data;
  },

  /**
   * Envia reporte de erro na questão
   */
  async reportQuestion(id: string, payload: { type: string; description: string }) {
    const res = await api.post<{ data: any }>(`/questions/${id}/report`, payload);
    return res.data;
  },

  /**
   * Obtém estatísticas reais de desempenho do aluno
   */
  async getStats(contestId?: string) {
    const query = contestId ? `?contestId=${contestId}` : '';
    const res = await api.get<{ data: QuestionStats }>(`/questions/stats${query}`);
    return res.data;
  },

  /**
   * Obtém histórico cronológico de resoluções
   */
  async getAttemptHistory(filters: { contestId?: string; subjectId?: string; isCorrect?: boolean; page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (filters.contestId) params.append('contestId', filters.contestId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.isCorrect !== undefined) params.append('isCorrect', String(filters.isCorrect));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<{ data: any[]; meta: any }>(`/questions/history${query}`);
    return {
      items: res.data || [],
      meta: (res as any).meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },

  /**
   * Obtém recomendações algorítmicas de estudo
   */
  async getRecommendations(contestId?: string, limit: number = 5) {
    const params = new URLSearchParams();
    if (contestId) params.append('contestId', contestId);
    if (limit) params.append('limit', String(limit));

    const res = await api.get<{ data: RecommendedQuestion[] }>(`/questions/recommendations?${params.toString()}`);
    return res.data || [];
  },

  /**
   * Obtém dados de bancas, disciplinas e tópicos para os filtros
   */
  async getFiltersData() {
    const res = await api.get<{ data: FilterOptionData }>('/questions/filters-data');
    return res.data;
  },

  // ── MÉTODOS ADMINISTRATIVOS ───────────────────────────────────────────
  async createQuestion(data: CreateQuestionInput) {
    const res = await api.post<{ data: QuestionDetail }>('/questions', data);
    return res.data;
  },

  async updateQuestion(id: string, data: Partial<CreateQuestionInput>) {
    const res = await api.put<{ data: QuestionDetail }>(`/questions/${id}`, data);
    return res.data;
  },

  async duplicateQuestion(id: string) {
    const res = await api.post<{ data: QuestionDetail }>(`/questions/${id}/duplicate`);
    return res.data;
  },

  async togglePublish(id: string) {
    const res = await api.patch<{ data: { id: string; status: string } }>(`/questions/${id}/toggle-publish`);
    return res.data;
  },

  async archiveQuestion(id: string) {
    const res = await api.delete<{ data: { id: string; status: string } }>(`/questions/${id}`);
    return res.data;
  },

  async getReports(filters: { status?: string; page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const res = await api.get<{ data: any[]; meta: any }>(`/questions/reports?${params.toString()}`);
    return {
      items: res.data || [],
      meta: (res as any).meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },

  async resolveReport(id: string, status: 'resolved' | 'rejected') {
    const res = await api.patch<{ data: any }>(`/questions/reports/${id}`, { status });
    return res.data;
  },

  async importBatch(records: any[], dryRun: boolean = false) {
    const res = await api.post<{ data: any }>('/questions/import', { questions: records, dryRun });
    return res.data;
  },
};
