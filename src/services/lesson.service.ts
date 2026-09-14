import { api } from './api';

export interface LessonContent {
  id: string;
  lessonId: string;
  type: string;
  body?: string | null;
  fileUrl?: string | null;
  orderIndex: number;
}

export interface LessonResource {
  id: string;
  lessonId: string;
  title: string;
  type: 'pdf' | 'link' | 'file';
  url: string;
  orderIndex: number;
  status: string;
}

export interface CurriculumItem {
  id: string;
  title: string;
  orderIndex: number;
  estimatedDurationMin: number;
  type: string;
  status: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface LessonDetail {
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
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  subjectId?: string | null;
  subjectName?: string | null;
  isCompleted: boolean;
  contents: LessonContent[];
  resources: LessonResource[];
  previousLesson?: { id: string; title: string } | null;
  nextLesson?: { id: string; title: string } | null;
  curriculum: CurriculumItem[];
}

export const lessonService = {
  async getLessonById(id: string): Promise<LessonDetail> {
    return api.get<LessonDetail>(`/lessons/${id}`);
  },

  async createLesson(data: {
    moduleId: string;
    title: string;
    slug?: string;
    description?: string | null;
    estimatedDurationMin?: number;
    type?: 'text' | 'video' | 'pdf' | 'audio' | 'link' | 'mixed';
    videoUrl?: string | null;
    status?: 'draft' | 'published' | 'archived';
    contentBody?: string;
    resources?: Array<{ title: string; type: 'pdf' | 'link' | 'file'; url: string }>;
  }): Promise<LessonDetail> {
    return api.post<LessonDetail>('/lessons', data);
  },

  async updateLesson(
    id: string,
    data: {
      title?: string;
      slug?: string;
      description?: string | null;
      estimatedDurationMin?: number;
      type?: 'text' | 'video' | 'pdf' | 'audio' | 'link' | 'mixed';
      videoUrl?: string | null;
      status?: 'draft' | 'published' | 'archived';
      contentBody?: string;
      resources?: Array<{ title: string; type: 'pdf' | 'link' | 'file'; url: string }>;
    }
  ): Promise<LessonDetail> {
    return api.put<LessonDetail>(`/lessons/${id}`, data);
  },

  async reorderLesson(id: string, direction: 'up' | 'down'): Promise<void> {
    await api.patch(`/lessons/${id}/reorder`, { direction });
  },

  async archiveLesson(id: string): Promise<void> {
    await api.delete(`/lessons/${id}`);
  },
};
