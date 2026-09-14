import { request } from './api';

export interface OfficialDocument {
  id: string;
  contestId: string;
  sourceId: string;
  title: string;
  description?: string | null;
  documentType: 'EDITAL' | 'RETIFICATION' | 'NOTICE' | 'RESULT' | 'CRONOGRAMA' | 'ANSWER_KEY' | 'CALL' | 'OTHER';
  fileUrl?: string | null;
  externalUrl?: string | null;
  fileSizeBytes: number;
  publicationDate: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  contestTitle?: string;
  contestSlug?: string;
  sourceName?: string;
  sourceWebsiteUrl?: string;
  sourceTrustLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceType?: 'OFFICIAL' | 'EDUCATIONAL' | 'NEWS' | 'OTHER';
}

export interface DocumentFilters {
  contestId?: string;
  documentType?: string;
  sourceId?: string;
  period?: 'today' | 'week' | 'month' | 'year' | 'all';
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}

export interface DocumentListResponse {
  items: OfficialDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const documentService = {
  // ==================== ALUNO / PÚBLICO ====================

  async listDocuments(filters: DocumentFilters = {}): Promise<DocumentListResponse> {
    const params = new URLSearchParams();
    if (filters.contestId) params.append('contestId', filters.contestId);
    if (filters.documentType) params.append('documentType', filters.documentType);
    if (filters.sourceId) params.append('sourceId', filters.sourceId);
    if (filters.period) params.append('period', filters.period);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const qs = params.toString();
    return await request<DocumentListResponse>(`/documents${qs ? `?${qs}` : ''}`);
  },

  async getDocumentById(id: string): Promise<OfficialDocument> {
    return await request<OfficialDocument>(`/documents/${id}`);
  },

  // ==================== ADMIN ====================

  async listAdminDocuments(filters: DocumentFilters = {}): Promise<DocumentListResponse> {
    const params = new URLSearchParams();
    if (filters.contestId) params.append('contestId', filters.contestId);
    if (filters.documentType) params.append('documentType', filters.documentType);
    if (filters.sourceId) params.append('sourceId', filters.sourceId);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const qs = params.toString();
    return await request<DocumentListResponse>(`/admin/documents${qs ? `?${qs}` : ''}`);
  },

  async createDocument(data: any): Promise<OfficialDocument> {
    return await request<OfficialDocument>('/admin/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDocument(id: string, data: any): Promise<OfficialDocument> {
    return await request<OfficialDocument>(`/admin/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async publishDocument(id: string): Promise<OfficialDocument> {
    return await request<OfficialDocument>(`/admin/documents/${id}/publish`, {
      method: 'POST',
    });
  },

  async archiveDocument(id: string): Promise<OfficialDocument> {
    return await request<OfficialDocument>(`/admin/documents/${id}/archive`, {
      method: 'POST',
    });
  },

  async deleteDocument(id: string): Promise<any> {
    return await request<any>(`/admin/documents/${id}`, {
      method: 'DELETE',
    });
  },
};
