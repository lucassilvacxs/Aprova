import { api } from './api';
import { CourseModule } from './course.service';

export const moduleService = {
  async createModule(data: {
    courseId: string;
    subjectId?: string | null;
    title: string;
    description?: string | null;
    status?: 'draft' | 'published' | 'archived';
  }): Promise<CourseModule> {
    return api.post<CourseModule>('/modules', data);
  },

  async updateModule(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      status?: 'draft' | 'published' | 'archived';
    }
  ): Promise<CourseModule> {
    return api.put<CourseModule>(`/modules/${id}`, data);
  },

  async reorderModule(id: string, direction: 'up' | 'down'): Promise<CourseModule> {
    return api.patch<CourseModule>(`/modules/${id}/reorder`, { direction });
  },

  async archiveModule(id: string): Promise<void> {
    await api.delete(`/modules/${id}`);
  },
};
