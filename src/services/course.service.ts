import { api } from './api';

export interface CourseItem {
  id: string;
  contestId?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status: 'draft' | 'published' | 'archived';
  orderIndex: number;
  contestTitle?: string;
  agencyAcronym?: string;
  contestAcronym?: string;
  subjectName?: string;
  subjectColor?: string;
  modulesCount: number;
  lessonsCount: number;
  completedLessonsCount: number;
  progress: number;
  totalDurationMin: number;
}

export type CreateCourseInput = {
  title: string;
  slug?: string;
  description?: string;
  contestId?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  thumbnailUrl?: string | null;
  status?: 'draft' | 'published' | 'archived';
};

export type UpdateCourseInput = Partial<CreateCourseInput>;

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  description?: string | null;
  orderIndex: number;
  estimatedDurationMin: number;
  type: 'text' | 'video' | 'pdf' | 'audio' | 'link' | 'mixed';
  videoUrl?: string | null;
  status: 'draft' | 'published' | 'archived';
  isCompleted: boolean;
}

export interface CourseModule {
  id: string;
  courseId: string;
  subjectId?: string | null;
  title: string;
  description?: string | null;
  orderIndex: number;
  status: 'draft' | 'published' | 'archived';
  lessonsCount: number;
  completedLessonsCount: number;
  progress: number;
  durationMinutes: number;
  lessons: CourseLesson[];
}

export interface CourseDetail extends CourseItem {
  modules: CourseModule[];
}

export const courseService = {
  async getCourses(params?: {
    contestId?: string;
    subjectId?: string;
    status?: string;
    search?: string;
  }): Promise<CourseItem[]> {
    const query = new URLSearchParams();
    if (params?.contestId) query.append('contestId', params.contestId);
    if (params?.subjectId) query.append('subjectId', params.subjectId);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    const qs = query.toString();
    return api.get<CourseItem[]>(`/courses${qs ? `?${qs}` : ''}`);
  },

  async listCourses(params?: {
    contestId?: string;
    subjectId?: string;
    status?: string;
    search?: string;
  }): Promise<CourseItem[]> {
    return courseService.getCourses(params);
  },

  async getCourseById(id: string): Promise<CourseDetail> {
    return api.get<CourseDetail>(`/courses/${id}`);
  },

  async createCourse(data: {
    title: string;
    slug?: string;
    description?: string;
    contestId?: string | null;
    subjectId?: string | null;
    topicId?: string | null;
    thumbnailUrl?: string | null;
    status?: 'draft' | 'published' | 'archived';
  }): Promise<CourseItem> {
    return api.post<CourseItem>('/courses', data);
  },

  async updateCourse(
    id: string,
    data: Partial<{
      title: string;
      slug: string;
      description: string;
      contestId: string | null;
      subjectId: string | null;
      topicId: string | null;
      thumbnailUrl: string | null;
      status: 'draft' | 'published' | 'archived';
    }>
  ): Promise<CourseItem> {
    return api.put<CourseItem>(`/courses/${id}`, data);
  },

  async archiveCourse(id: string): Promise<void> {
    await api.delete(`/courses/${id}`);
  },
};
