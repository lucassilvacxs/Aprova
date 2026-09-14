import { api } from './api';

export interface DashboardMetrics {
  activeSubjectsCount: number;
  completedLessonsCount: number;
  totalQuestionsAnswered: number;
  overallAccuracyRate: number;
  totalStudyHours: number;
  currentStreakDays: number;
  simulationsCompleted?: number;
  bestSimulationPercentage?: string;
  weakestSubjects: Array<{
    subjectId: string;
    subjectName: string;
    accuracyPercentage: number;
    recommendedAction?: string;
  }>;
  strongestSubjects: Array<{
    subjectId: string;
    subjectName: string;
    accuracyPercentage: number;
  }>;
}

export interface DashboardSubjectPerformance {
  subjectId: string;
  name: string;
  shortName: string;
  accuracy: number;
  progress: number;
  questions: number;
  colorKey: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  subjectPerformance: DashboardSubjectPerformance[];
  userContests: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
  }>;
  activeSimulation?: {
    attemptId: string;
    simulationId: string;
    simulationTitle: string;
    durationMinutes: number;
    remainingSeconds: number;
    startedAt: string;
  } | null;
  todayStudyPlan?: {
    hasActivePlan: boolean;
    todayDate: string;
    plan?: {
      id: string;
      name: string;
    };
    sessions: Array<{
      id: string;
      studyPlanId: string;
      subjectId: string;
      subjectName?: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
      plannedMinutes: number;
      type: string;
      status: string;
      lessonTitle?: string;
      simulationTitle?: string;
      explanation?: string;
    }>;
    summary: {
      totalSessions: number;
      completedSessions: number;
      plannedMinutes: number;
      completedMinutes: number;
    };
  };
  hasStartedStudying: boolean;
  latestNews?: Array<{
    id: string;
    title: string;
    summary: string;
    contestTitle?: string;
    sourceName: string;
    publishedAt: string;
    category: string;
    isImportant: boolean;
    isFeatured: boolean;
  }>;
}

export const dashboardService = {
  async getDashboard(): Promise<DashboardData> {
    return api.get<DashboardData>('/dashboard');
  },
};
