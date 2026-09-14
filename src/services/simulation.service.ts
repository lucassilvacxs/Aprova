import { api } from './api';

export interface SimulationItem {
  id: string;
  contestId: string;
  contestTitle?: string;
  contestSlug?: string;
  agencyAcronym?: string;
  title: string;
  description?: string;
  type: 'FIXED' | 'RANDOM' | 'CUSTOM';
  durationMinutes: number;
  penaltyRule: string;
  penaltyFactor: string;
  totalQuestions: number;
  difficulty: string;
  status: 'draft' | 'published' | 'archived';
  isOfficial: boolean;
  isPublic: boolean;
  filterConfig?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  subjects?: string[];
  userStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  userActiveAttemptId?: string | null;
  userBestScore?: string | null;
  userBestPercentage?: string | null;
  attemptsCount?: number;
}

export interface SimulationDetail extends SimulationItem {
  actualQuestionsCount: number;
  subjectsBreakdown: { name: string; count: number }[];
  activeAttempt?: {
    id: string;
    startedAt: string;
    remainingSeconds: number;
    isExpired: boolean;
  } | null;
}

export interface ExamOption {
  id: string;
  questionId: string;
  letter: string;
  text: string;
  orderIndex: number;
  isCorrect?: boolean; // Apenas disponível no modo resultado/revisão
}

export interface ExamQuestion {
  id: string;
  orderIndex: number;
  points: string;
  statement: string;
  year?: number;
  difficulty: string;
  subjectName: string;
  topicName: string;
  boardName: string;
  options: ExamOption[];
  userAnswer?: {
    selectedOptionId: string | null;
    isCorrect: boolean | null;
    timeSpentSeconds: number;
  };
  correctOptionId?: string;
  correctLetter?: string;
  officialExplanation?: string;
  isMarkedForReview?: boolean;
}

export interface ExamAttemptData {
  expired: boolean;
  attempt: {
    id: string;
    simulationId: string;
    simulationTitle: string;
    durationMinutes: number;
    penaltyRule: string;
    penaltyFactor: string;
    startedAt: string;
    totalQuestions: number;
    markedQuestions: string[];
  };
  remainingSeconds: number;
  questions: ExamQuestion[];
  savedAnswers: Record<string, string | null>;
}

export interface SimulationResultData {
  attempt: {
    id: string;
    status: 'COMPLETED' | 'EXPIRED';
    startedAt: string;
    finishedAt: string;
    totalDurationSeconds: number;
    totalScore: string;
    correctCount: number;
    wrongCount: number;
    blankCount: number;
    percentage: string;
    totalQuestions: number;
    subjectBreakdown: any[];
    topicBreakdown: any[];
    difficultyBreakdown: any;
  };
  simulation: SimulationItem;
  questions: ExamQuestion[];
}

export interface SimulationStatsData {
  totalCompleted: number;
  averagePercentage: string;
  averageScore: string;
  bestPercentage: string;
  bestScore: string;
  minTimeMinutes: number;
  totalQuestionsAnswered: number;
  evolution: {
    index: number;
    attemptId: string;
    simulationTitle: string;
    percentage: number;
    score: number;
    date: string;
  }[];
}

export interface ActiveSimulationBannerData {
  attemptId: string;
  simulationId: string;
  startedAt: string;
  simulationTitle: string;
  durationMinutes: number;
  remainingSeconds: number;
}

export const simulationService = {
  async list(params?: {
    contestId?: string;
    type?: string;
    status?: string;
    difficulty?: string;
    search?: string;
    tab?: string;
  }): Promise<SimulationItem[]> {
    const query = new URLSearchParams();
    if (params?.contestId) query.set('contestId', params.contestId);
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    if (params?.difficulty) query.set('difficulty', params.difficulty);
    if (params?.search) query.set('search', params.search);
    if (params?.tab) query.set('tab', params.tab);

    return api.get<SimulationItem[]>(
      `/api/v1/simulations${query.toString() ? `?${query.toString()}` : ''}`
    );
  },

  async getById(id: string): Promise<SimulationDetail> {
    return api.get<SimulationDetail>(`/api/v1/simulations/${id}`);
  },

  async getActive(): Promise<ActiveSimulationBannerData | null> {
    return api.get<ActiveSimulationBannerData | null>('/api/v1/simulations/active');
  },

  async getHistory(): Promise<any[]> {
    return api.get<any[]>('/api/v1/simulations/history');
  },

  async getStats(contestId?: string): Promise<SimulationStatsData> {
    const query = contestId ? `?contestId=${contestId}` : '';
    return api.get<SimulationStatsData>(`/api/v1/simulations/stats${query}`);
  },

  async validateCustom(data: {
    contestId: string;
    subjectIds?: string[];
    topicIds?: string[];
    boardId?: string;
    difficulty?: string;
  }): Promise<{ availableQuestions: number }> {
    return api.post<{ availableQuestions: number }>(
      '/api/v1/simulations/custom/validate',
      data
    );
  },

  async createCustom(data: {
    contestId: string;
    title?: string;
    subjectIds?: string[];
    topicIds?: string[];
    boardId?: string;
    difficulty?: string;
    questionCount: number;
    durationMinutes?: number;
    penaltyRule?: string;
  }): Promise<SimulationItem> {
    return api.post<SimulationItem>('/api/v1/simulations/custom', data);
  },

  async startAttempt(simulationId: string): Promise<{
    attemptId: string;
    simulationId: string;
    status: string;
    resumed: boolean;
    remainingSeconds: number;
  }> {
    return api.post<any>(`/api/v1/simulations/${simulationId}/start`);
  },

  async getAttempt(simulationId: string): Promise<ExamAttemptData> {
    return api.get<ExamAttemptData>(`/api/v1/simulations/${simulationId}/attempt`);
  },

  async saveAnswer(
    attemptId: string,
    questionId: string,
    selectedOptionId: string | null,
    timeSpentSeconds: number = 0
  ): Promise<{ success?: boolean; expired?: boolean; message?: string }> {
    return api.post<any>(`/api/v1/simulations/${attemptId}/attempt/answer`, {
      attemptId,
      questionId,
      selectedOptionId,
      timeSpentSeconds,
    });
  },

  async toggleMark(
    attemptId: string,
    questionId: string
  ): Promise<{ markedQuestions: string[]; isMarked: boolean }> {
    return api.post<any>(`/api/v1/simulations/${attemptId}/attempt/mark`, {
      attemptId,
      questionId,
    });
  },

  async finishAttempt(attemptId: string): Promise<any> {
    return api.post<any>(`/api/v1/simulations/${attemptId}/attempt/finish`, {
      attemptId,
    });
  },

  async getResult(attemptId: string): Promise<SimulationResultData> {
    return api.get<SimulationResultData>(
      `/api/v1/simulations/attempts/${attemptId}/result`
    );
  },

  // ── MÉTODOS DE ADMINISTRAÇÃO ───────────────────────────────────────────────

  async adminCreate(data: any): Promise<SimulationItem> {
    return api.post<SimulationItem>('/api/v1/simulations', data);
  },

  async adminUpdate(id: string, data: any): Promise<SimulationItem> {
    return api.put<SimulationItem>(`/api/v1/simulations/${id}`, data);
  },

  async adminArchive(id: string): Promise<SimulationItem> {
    return api.delete<SimulationItem>(`/api/v1/simulations/${id}`);
  },

  async adminPublish(id: string): Promise<SimulationItem> {
    return api.post<SimulationItem>(`/api/v1/simulations/${id}/publish`);
  },

  async adminUnpublish(id: string): Promise<SimulationItem> {
    return api.post<SimulationItem>(`/api/v1/simulations/${id}/unpublish`);
  },

  async adminDuplicate(id: string): Promise<SimulationItem> {
    return api.post<SimulationItem>(`/api/v1/simulations/${id}/duplicate`);
  },

  async adminReorderQuestions(id: string, questionIds: string[]): Promise<{ success: boolean }> {
    return api.put<{ success: boolean }>(
      `/api/v1/simulations/${id}/questions/order`,
      { questionIds }
    );
  },
};
