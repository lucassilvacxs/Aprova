import { api } from './api';

export interface StudyPlanItem {
  id: string;
  name: string;
  description?: string;
  contestId: string;
  contestTitle?: string;
  agencyAcronym?: string;
  startDate: string;
  targetDate?: string;
  weeklyHours: number;
  dailyMinutes: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  strategy: 'BALANCED' | 'EDICT_WEIGHTED' | 'WEAKNESS_FOCUSED' | 'CUSTOM';
  createdAt: string;
  updatedAt: string;
}

export interface StudyAvailability {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  availableMinutes: number;
  enabled: boolean;
}

export interface StudyPlanPreferences {
  id?: string;
  minSessionMinutes?: number;
  maxSessionMinutes?: number;
  breakMinutes?: number;
  defaultQuestionsPerSession?: number;
  revisionFrequency?: 'spaced' | 'daily' | 'weekly' | 'INTERLEAVED';
  prioritizeWeakSubjects?: boolean;
  prioritizeBehindSchedule?: boolean;
  balancedDistribution?: boolean;
}

export interface StudyPlanSubject {
  id?: string;
  subjectId: string;
  name?: string;
  colorToken?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  weight: string | number;
  targetPercentage?: string | number;
  targetMinutes?: number;
  enabled?: boolean;
}

export interface StudyPlanTopic {
  id?: string;
  topicId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled?: boolean;
}

export interface StudyPlanDetail extends StudyPlanItem {
  availabilities: StudyAvailability[];
  preferences: StudyPlanPreferences;
  subjects: StudyPlanSubject[];
  topics: StudyPlanTopic[];
}

export interface StudySessionItem {
  id: string;
  studyPlanId: string;
  subjectId: string;
  topicId?: string | null;
  lessonId?: string | null;
  simulationId?: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  actualMinutes?: number | null;
  type: 'LESSON' | 'QUESTIONS' | 'REVIEW' | 'SIMULATION' | 'REVISION' | 'MIXED';
  targetQuestionsCount?: number | null;
  completedQuestionsCount?: number | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'RESCHEDULED';
  ordering: number;
  notes?: string | null;
  explanation?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  subjectName?: string;
  subjectColor?: string;
  lessonTitle?: string | null;
  simulationTitle?: string | null;
}

export interface TodayScheduleData {
  hasActivePlan: boolean;
  todayDate: string;
  plan?: {
    id: string;
    name: string;
  };
  sessions: StudySessionItem[];
  summary: {
    totalSessions: number;
    completedSessions: number;
    plannedMinutes: number;
    completedMinutes: number;
  };
}

export interface SubjectBreakdownStat {
  subjectId: string;
  name: string;
  colorToken: string;
  plannedMinutes: number;
  completedMinutes: number;
  completionRate: number;
}

export interface DiagnosticRecommendation {
  type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  description: string;
  actionUrl?: string;
}

export interface StudyPlanStats {
  adherenceRate: number;
  totalPlannedMinutes: number;
  totalCompletedMinutes: number;
  totalPlannedHours: number;
  totalCompletedHours: number;
  totalPlannedSessions: number;
  totalCompletedSessions: number;
  skippedSessions: number;
  rescheduledSessions: number;
  currentStreak: number;
  maxStreak: number;
  subjectsBreakdown: SubjectBreakdownStat[];
  recommendations: DiagnosticRecommendation[];
}

export interface GeneratePreviewResult {
  sessions: StudySessionItem[];
  totalHours: number;
  totalSessions: number;
  totalQuestions: number;
}

export interface CreatePlanPayload {
  contestId: string;
  name?: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
  weeklyHours?: number;
  dailyMinutes?: number;
  strategy?: string;
  availabilities: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    availableMinutes: number;
    enabled: boolean;
  }>;
  preferences?: {
    minSessionMinutes?: number;
    maxSessionMinutes?: number;
    breakMinutes?: number;
    defaultQuestionsPerSession?: number;
    revisionFrequency?: string;
    prioritizeWeakSubjects?: boolean;
    prioritizeBehindSchedule?: boolean;
    balancedDistribution?: boolean;
  };
  subjects: Array<{
    subjectId: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    weight?: number;
    targetPercentage?: number;
  }>;
  topics?: Array<{
    topicId: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
}

export const StudyPlanFrontendService = {
  async listUserPlans(): Promise<StudyPlanItem[]> {
    return api.get<StudyPlanItem[]>('/api/v1/study-plans');
  },

  async getActivePlan(): Promise<StudyPlanDetail | null> {
    return api.get<StudyPlanDetail | null>('/api/v1/study-plans/active');
  },

  async getPlanById(id: string): Promise<StudyPlanDetail> {
    return api.get<StudyPlanDetail>(`/api/v1/study-plans/${id}`);
  },

  async createPlan(data: CreatePlanPayload): Promise<StudyPlanDetail> {
    return api.post<StudyPlanDetail>('/api/v1/study-plans', data);
  },

  async updatePlan(id: string, data: Partial<CreatePlanPayload>): Promise<StudyPlanDetail> {
    return api.put<StudyPlanDetail>(`/api/v1/study-plans/${id}`, data);
  },

  async deletePlan(id: string): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(`/api/v1/study-plans/${id}`);
  },

  async activatePlan(id: string): Promise<StudyPlanDetail> {
    return api.post<StudyPlanDetail>(`/api/v1/study-plans/${id}/activate`);
  },

  async pausePlan(id: string): Promise<StudyPlanDetail> {
    return api.post<StudyPlanDetail>(`/api/v1/study-plans/${id}/pause`);
  },

  async resumePlan(id: string): Promise<StudyPlanDetail> {
    return api.post<StudyPlanDetail>(`/api/v1/study-plans/${id}/resume`);
  },

  async archivePlan(id: string): Promise<StudyPlanDetail> {
    return api.post<StudyPlanDetail>(`/api/v1/study-plans/${id}/archive`);
  },

  async previewGeneration(id: string): Promise<GeneratePreviewResult> {
    return api.post<GeneratePreviewResult>(`/api/v1/study-plans/${id}/preview`);
  },

  async getSessions(
    planId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      status?: string;
      type?: string;
    }
  ): Promise<StudySessionItem[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return api.get<StudySessionItem[]>(`/api/v1/study-plans/${planId}/sessions${qs}`);
  },

  async getTodaySessions(): Promise<TodayScheduleData> {
    return api.get<TodayScheduleData>('/api/v1/study-plans/today');
  },

  async startSession(sessionId: string): Promise<StudySessionItem> {
    return api.post<StudySessionItem>(`/api/v1/study-plans/sessions/${sessionId}/start`);
  },

  async completeSession(
    sessionId: string,
    data?: {
      actualMinutes?: number;
      completedQuestions?: number;
      notes?: string;
    }
  ): Promise<{ session: StudySessionItem; nextReviewDate?: string | null }> {
    return api.post<{ session: StudySessionItem; nextReviewDate?: string | null }>(
      `/api/v1/study-plans/sessions/${sessionId}/complete`,
      data
    );
  },

  async skipSession(sessionId: string, reason?: string): Promise<StudySessionItem> {
    return api.post<StudySessionItem>(`/api/v1/study-plans/sessions/${sessionId}/skip`, { reason });
  },

  async rescheduleSession(
    sessionId: string,
    newDate: string,
    newStartTime?: string
  ): Promise<StudySessionItem> {
    return api.post<StudySessionItem>(`/api/v1/study-plans/sessions/${sessionId}/reschedule`, {
      newDate,
      newStartTime,
    });
  },

  async reorganizeSessions(
    planId: string
  ): Promise<{ success: boolean; movedSessionsCount: number; message: string }> {
    return api.post<{ success: boolean; movedSessionsCount: number; message: string }>(
      `/api/v1/study-plans/${planId}/reorganize`
    );
  },

  async getPlanStats(planId: string): Promise<StudyPlanStats> {
    return api.get<StudyPlanStats>(`/api/v1/study-plans/${planId}/stats`);
  },
};
