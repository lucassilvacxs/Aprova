export type PlannedActivityType =
  | 'theory'
  | 'questions'
  | 'review'
  | 'essay'
  | 'simulation';

export interface StudySession {
  id: string;
  planId: string;
  dayOfWeek: number; // 1 (Segunda) a 7 (Domingo)
  startTime: string; // "08:00"
  endTime: string; // "09:30"
  subjectId: string;
  subjectName: string;
  activityType: PlannedActivityType;
  completed: boolean;
  actualDurationMinutes?: number;
}

export interface StudyPlan {
  id: string;
  userId: string;
  contestId: string;
  weeklyHoursGoal: number; // ex: 25 horas semanais
  targetExamDate?: string | null;
  active: boolean;
  sessions: StudySession[];
  createdAt: string;
  updatedAt: string;
}

export interface UserDashboardMetrics {
  activeSubjectsCount: number;
  completedLessonsCount: number;
  totalQuestionsAnswered: number;
  overallAccuracyRate: number; // 0 a 100%
  totalStudyHours: number;
  currentStreakDays: number; // Dias seguidos de estudo
  simulationsCompletedCount: number;
  essaysWrittenCount: number;
  weakestSubjects: {
    subjectId: string;
    subjectName: string;
    accuracyPercentage: number;
    recommendedAction: string;
  }[];
  strongestSubjects: {
    subjectId: string;
    subjectName: string;
    accuracyPercentage: number;
  }[];
}
