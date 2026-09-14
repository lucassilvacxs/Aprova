import { api } from './api';

export interface EssayPrompt {
  id: string;
  contestId?: string | null;
  boardId?: string | null;
  title: string;
  category: string;
  themeArea?: string;
  statement: string;
  instructions?: string[];
  instructionsText?: string;
  context?: string;
  source?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  estimatedMinutes: number;
  minWords: number;
  maxWords: number;
  minLines: number;
  maxLines: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  contestTitle?: string;
  contestSlug?: string;
  studentStatus?: 'not_started' | 'in_progress' | 'submitted' | 'completed';
  userEssayId?: string;
  criteria?: EssayCriterionAdmin[];
  userEssay?: any;
}

export interface EssayDraft {
  id: string;
  userId: string;
  contestId?: string;
  promptId: string;
  title: string;
  content: string;
  wordCount: number;
  characterCount: number;
  lineCount: number;
  status: string;
  startedAt: string;
  lastSavedAt: string;
  createdAt: string;
  updatedAt: string;
  promptTitle?: string;
  promptCategory?: string;
  promptMinWords?: number;
  promptMaxWords?: number;
  promptMinLines?: number;
  promptMaxLines?: number;
}

export interface EssayItem {
  id: string;
  title: string;
  promptId: string;
  contestId?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTED';
  wordCount: number;
  characterCount: number;
  lineCount: number;
  startedAt: string;
  lastSavedAt: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  promptTitle?: string;
  promptCategory?: string;
  promptDifficulty?: string;
  contestTitle?: string;
  contestSlug?: string;
  totalScore?: string | number;
  score?: string | number;
  maxScore?: string | number;
  percentage?: string | number;
  category?: string;
  studentName?: string;
  studentEmail?: string;
}

export interface EssayCriterionScoreItem {
  id?: string;
  criterionId: string;
  score: number | string;
  feedback?: string;
  criterionName?: string;
  criterionDescription?: string;
  maxScore?: number | string;
  weight?: number | string;
}

export interface EssayCorrectionData {
  id: string;
  essayId: string;
  correctionType: string;
  totalScore: string | number;
  maxScore: string | number;
  percentage: string | number;
  generalFeedback: string;
  strengths?: string | null;
  weaknesses?: string | null;
  suggestions?: string | null;
  correctedBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface EssayDetail {
  id: string;
  userId: string;
  contestId?: string;
  promptId: string;
  title: string;
  content: string;
  wordCount: number;
  characterCount: number;
  lineCount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTED';
  startedAt: string;
  lastSavedAt: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  studentName?: string;
  studentEmail?: string;
  prompt: EssayPrompt | null;
  correction: EssayCorrectionData | null;
  criteriaScores: EssayCriterionScoreItem[];
}

export interface EssayEvolutionPoint {
  essayId: string;
  title: string;
  promptTitle: string;
  category: string;
  date: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
}

export interface CriterionPerformanceStat {
  criterionId: string;
  criterionName: string;
  averageScore: number;
  averageMaxScore: number;
  averagePercentage: number;
  evaluationsCount: number;
}

export interface EssayUserStats {
  totalEssays: number;
  draftsCount: number;
  submittedCount: number;
  underReviewCount: number;
  correctedCount: number;
  averageScore: number;
  averagePercentage: number;
  bestScore: number;
  bestPercentage: number;
  lowestScore: number;
  lowestPercentage: number;
  averageWordCount: number;
  evolutionSeries: EssayEvolutionPoint[];
  criteriaPerformance: CriterionPerformanceStat[];
}

export type EssayStats = EssayUserStats;

export interface EssayRecommendation {
  hasEvaluations: boolean;
  weakestCompetence: string | null;
  weakestPercentage: number;
  strongestCompetence: string | null;
  strongestPercentage: number;
  diagnosticAdvice: string;
  actionPlan: string[];
  recommendedPrompts: Array<{
    id: string;
    title: string;
    category: string;
    difficulty: string;
    estimatedMinutes: number;
    minWords: number;
    maxWords: number;
  }>;
}

export interface EssayCriterionAdmin {
  id: string;
  contestId?: string | null;
  name: string;
  description?: string | null;
  maxScore: string | number;
  weight: string | number;
  ordering: number;
  active: boolean;
}

export class FrontendEssayService {
  // ── Temas de Redação ───────────────────────────────────────────────────────
  static async listPrompts(params?: {
    contestId?: string;
    category?: string;
    difficulty?: string;
    status?: string;
    search?: string;
    userStatus?: string;
  }): Promise<EssayPrompt[]> {
    const query = new URLSearchParams();
    if (params?.contestId) query.append('contestId', params.contestId);
    if (params?.category) query.append('category', params.category);
    if (params?.difficulty) query.append('difficulty', params.difficulty);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.userStatus) query.append('userStatus', params.userStatus);

    const q = query.toString();
    return api.get<EssayPrompt[]>(`/essay-prompts${q ? `?${q}` : ''}`);
  }

  static async getPromptById(id: string): Promise<EssayPrompt> {
    return api.get<EssayPrompt>(`/essay-prompts/${id}`);
  }

  static async getRandomPrompt(params?: {
    contestId?: string;
    category?: string;
    difficulty?: string;
  }): Promise<EssayPrompt> {
    return api.post<EssayPrompt>('/essay-prompts/random', params || {});
  }

  static async createPrompt(data: Partial<EssayPrompt>): Promise<EssayPrompt> {
    return api.post<EssayPrompt>('/essay-prompts', data);
  }

  static async updatePrompt(id: string, data: Partial<EssayPrompt>): Promise<EssayPrompt> {
    return api.put<EssayPrompt>(`/essay-prompts/${id}`, data);
  }

  static async publishPrompt(id: string): Promise<EssayPrompt> {
    return api.post<EssayPrompt>(`/essay-prompts/${id}/publish`, {});
  }

  static async archivePrompt(id: string): Promise<EssayPrompt> {
    return api.post<EssayPrompt>(`/essay-prompts/${id}/archive`, {});
  }

  static async deletePrompt(id: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/essay-prompts/${id}`);
  }

  // ── Redações do Estudante ──────────────────────────────────────────────────
  static async listUserEssays(params?: {
    status?: string;
    contestId?: string;
    search?: string;
  }): Promise<EssayItem[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.contestId) query.append('contestId', params.contestId);
    if (params?.search) query.append('search', params.search);

    const q = query.toString();
    return api.get<EssayItem[]>(`/essays${q ? `?${q}` : ''}`);
  }

  static async getActiveDraft(promptId?: string): Promise<EssayDraft | null> {
    const q = promptId ? `?promptId=${promptId}` : '';
    return api.get<EssayDraft | null>(`/essays/active-draft${q}`);
  }

  static async startEssay(data: {
    promptId: string;
    contestId?: string;
    title?: string;
  }): Promise<EssayDraft> {
    return api.post<EssayDraft>('/essays', data);
  }

  static async getEssayDetail(id: string): Promise<EssayDetail> {
    return api.get<EssayDetail>(`/essays/${id}`);
  }

  static async autosave(
    id: string,
    data: { title?: string; content: string }
  ): Promise<any> {
    return api.post<any>(`/essays/${id}/autosave`, data);
  }

  static async submitEssay(id: string): Promise<any> {
    return api.post<any>(`/essays/${id}/submit`, {});
  }

  static async discardDraft(id: string): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(`/essays/${id}`);
  }

  static async getUserStats(): Promise<EssayUserStats> {
    return api.get<EssayUserStats>('/essays/stats');
  }

  static async getRecommendations(): Promise<EssayRecommendation> {
    return api.get<EssayRecommendation>('/essays/recommendations');
  }

  // ── Administração e Avaliação ──────────────────────────────────────────────
  static async listAdminQueue(params?: {
    status?: string;
    contestId?: string;
    search?: string;
  }): Promise<EssayItem[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.contestId) query.append('contestId', params.contestId);
    if (params?.search) query.append('search', params.search);

    const q = query.toString();
    return api.get<EssayItem[]>(`/admin/essays${q ? `?${q}` : ''}`);
  }

  static async getEssayCriteria(essayId: string): Promise<EssayCriterionAdmin[]> {
    return api.get<EssayCriterionAdmin[]>(`/admin/essays/${essayId}/criteria`);
  }

  static async correctEssay(
    essayId: string,
    data: {
      generalFeedback: string;
      strengths?: string;
      weaknesses?: string;
      suggestions?: string;
      correctionType?: 'MANUAL' | 'AI' | 'HYBRID';
      criteriaScores: Array<{
        criterionId: string;
        score: number;
        feedback?: string;
      }>;
    }
  ): Promise<any> {
    return api.post<any>(`/admin/essays/${essayId}/correct`, data);
  }

  static async listCriteria(contestId?: string): Promise<EssayCriterionAdmin[]> {
    const q = contestId ? `?contestId=${contestId}` : '';
    return api.get<EssayCriterionAdmin[]>(`/admin/essay-criteria${q}`);
  }

  static async createCriterion(data: Partial<EssayCriterionAdmin>): Promise<EssayCriterionAdmin> {
    return api.post<EssayCriterionAdmin>('/admin/essay-criteria', data);
  }

  static async updateCriterion(
    id: string,
    data: Partial<EssayCriterionAdmin>
  ): Promise<EssayCriterionAdmin> {
    return api.put<EssayCriterionAdmin>(`/admin/essay-criteria/${id}`, data);
  }

  static async deleteCriterion(id: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/admin/essay-criteria/${id}`);
  }
}

export const essayService = FrontendEssayService;
