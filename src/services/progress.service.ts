import { api } from './api';

export interface ToggleProgressResponse {
  lessonId: string;
  isCompleted: boolean;
  courseProgress: number;
  courseTotalLessons: number;
  courseCompletedLessons: number;
}

export interface ContinueStudyingData {
  lessonId: string;
  lessonTitle: string;
  estimatedDurationMin: number;
  type: string;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  contestId?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
}

export const progressService = {
  async toggleLessonComplete(lessonId: string): Promise<ToggleProgressResponse> {
    return api.post<ToggleProgressResponse>(`/progress/lessons/${lessonId}/toggle`);
  },

  async getContinueStudying(contestId?: string): Promise<ContinueStudyingData | null> {
    const query = contestId ? `?contestId=${contestId}` : '';
    return api.get<ContinueStudyingData | null>(`/progress/continue${query}`);
  },
};
