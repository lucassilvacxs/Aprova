import { request } from './api';

export interface NewsItem {
  id: string;
  contestId?: string | null;
  sourceId: string;
  title: string;
  slug: string;
  summary: string;
  content?: string;
  category: string;
  publishedAt: string;
  externalUrl?: string | null;
  imageUrl?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  isImportant: boolean;
  canonicalUrl?: string | null;
  contestTitle?: string;
  contestSlug?: string;
  sourceName: string;
  sourceWebsiteUrl?: string;
  sourceTrustLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceType: 'OFFICIAL' | 'EDUCATIONAL' | 'NEWS' | 'OTHER';
  isRead?: boolean;
  isFavorite?: boolean;
  tags?: string[];
  relatedNews?: Array<{
    id: string;
    title: string;
    slug: string;
    publishedAt: string;
    category: string;
    imageUrl?: string | null;
  }>;
  relatedDocuments?: Array<{
    id: string;
    title: string;
    documentType: string;
    publicationDate: string;
    fileUrl?: string | null;
    externalUrl?: string | null;
  }>;
}

export interface NewsSource {
  id: string;
  name: string;
  description?: string;
  websiteUrl: string;
  logoUrl?: string;
  sourceType: 'OFFICIAL' | 'EDUCATIONAL' | 'NEWS' | 'OTHER';
  trustLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  isActive: boolean;
}

export interface NewsFilters {
  contestId?: string;
  category?: string;
  sourceId?: string;
  period?: 'today' | 'week' | 'month' | 'year' | 'all';
  isImportant?: boolean;
  isFeatured?: boolean;
  onlyFavorites?: boolean;
  onlyUnread?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}

export interface NewsListResponse {
  items: NewsItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminNewsStats {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  important: number;
  featured: number;
}

export const newsService = {
  // ==================== ALUNO / PÚBLICO ====================

  async listNews(filters: NewsFilters = {}): Promise<NewsListResponse> {
    const params = new URLSearchParams();
    if (filters.contestId) params.append('contestId', filters.contestId);
    if (filters.category) params.append('category', filters.category);
    if (filters.sourceId) params.append('sourceId', filters.sourceId);
    if (filters.period) params.append('period', filters.period);
    if (filters.isImportant !== undefined) params.append('isImportant', String(filters.isImportant));
    if (filters.isFeatured !== undefined) params.append('isFeatured', String(filters.isFeatured));
    if (filters.onlyFavorites) params.append('onlyFavorites', 'true');
    if (filters.onlyUnread) params.append('onlyUnread', 'true');
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const qs = params.toString();
    return await request<NewsListResponse>(`/news${qs ? `?${qs}` : ''}`);
  },

  async getFeaturedNews(contestId?: string): Promise<NewsItem[]> {
    const qs = contestId ? `?contestId=${contestId}` : '';
    return await request<NewsItem[]>(`/news/featured${qs}`);
  },

  async getNewsById(id: string): Promise<NewsItem> {
    return await request<NewsItem>(`/news/${id}`);
  },

  async toggleFavorite(id: string): Promise<{ isFavorite: boolean }> {
    return await request<{ isFavorite: boolean }>(`/news/${id}/favorite`, {
      method: 'POST',
    });
  },

  async markAsRead(id: string): Promise<{ isRead: boolean }> {
    return await request<{ isRead: boolean }>(`/news/${id}/read`, {
      method: 'POST',
    });
  },

  async markAsUnread(id: string): Promise<{ isRead: boolean }> {
    return await request<{ isRead: boolean }>(`/news/${id}/unread`, {
      method: 'POST',
    });
  },

  async listSources(): Promise<NewsSource[]> {
    return await request<NewsSource[]>('/news-sources');
  },

  async getSourceById(id: string): Promise<NewsSource> {
    return await request<NewsSource>(`/news-sources/${id}`);
  },

  // ==================== ADMIN ====================

  async listAdminNews(filters: NewsFilters = {}): Promise<NewsListResponse> {
    const params = new URLSearchParams();
    if (filters.contestId) params.append('contestId', filters.contestId);
    if (filters.category) params.append('category', filters.category);
    if (filters.sourceId) params.append('sourceId', filters.sourceId);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const qs = params.toString();
    return await request<NewsListResponse>(`/admin/news${qs ? `?${qs}` : ''}`);
  },

  async getAdminStats(): Promise<AdminNewsStats> {
    return await request<AdminNewsStats>('/admin/news/stats');
  },

  async createNews(data: any): Promise<NewsItem> {
    return await request<NewsItem>('/admin/news', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateNews(id: string, data: any): Promise<NewsItem> {
    return await request<NewsItem>(`/admin/news/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteNews(id: string): Promise<any> {
    return await request<any>(`/admin/news/${id}`, {
      method: 'DELETE',
    });
  },

  async publishNews(id: string): Promise<NewsItem> {
    return await request<NewsItem>(`/admin/news/${id}/publish`, {
      method: 'POST',
    });
  },

  async archiveNews(id: string): Promise<NewsItem> {
    return await request<NewsItem>(`/admin/news/${id}/archive`, {
      method: 'POST',
    });
  },

  async toggleFeatured(id: string): Promise<NewsItem> {
    return await request<NewsItem>(`/admin/news/${id}/toggle-featured`, {
      method: 'POST',
    });
  },

  async toggleImportant(id: string): Promise<NewsItem> {
    return await request<NewsItem>(`/admin/news/${id}/toggle-important`, {
      method: 'POST',
    });
  },

  async classify(data: { title: string; summary: string; content?: string }): Promise<{
    category: string;
    suggestedContestAcronym?: string;
    isImportant: boolean;
    tags: string[];
  }> {
    return await request<any>('/admin/news/classify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listAdminSources(): Promise<NewsSource[]> {
    return await request<NewsSource[]>('/admin/news-sources');
  },

  async createSource(data: any): Promise<NewsSource> {
    return await request<NewsSource>('/admin/news-sources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSource(id: string, data: any): Promise<NewsSource> {
    return await request<NewsSource>(`/admin/news-sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async toggleSourceActive(id: string): Promise<NewsSource> {
    return await request<NewsSource>(`/admin/news-sources/${id}/toggle-active`, {
      method: 'POST',
    });
  },

  async deleteSource(id: string): Promise<any> {
    return await request<any>(`/admin/news-sources/${id}`, {
      method: 'DELETE',
    });
  },
};
