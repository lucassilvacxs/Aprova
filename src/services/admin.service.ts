import { api } from './api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  roles: string[];
  status: 'active' | 'blocked' | 'inactive';
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminInvitation {
  id: string;
  code: string;
  email: string | null;
  role: string;
  status: 'pending' | 'used' | 'expired' | 'revoked';
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  createdByName: string;
  createdByEmail: string;
}

export interface AdminContest {
  id: string;
  title: string;
  slug: string;
  year: number;
  status: string;
  vacanciesCount: number;
  salaryBase: string;
  agencyId: string;
  agencyName: string;
  agencyAcronym: string;
  boardId: string | null;
  boardAcronym: string | null;
  createdAt: string;
}

export const adminService = {
  async getUsers(): Promise<AdminUser[]> {
    return api.get<AdminUser[]>('/admin/users');
  },

  async updateUserStatus(id: string, status: 'active' | 'blocked' | 'inactive'): Promise<any> {
    return api.patch(`/admin/users/${id}/status`, { status });
  },

  async getInvitations(): Promise<AdminInvitation[]> {
    return api.get<AdminInvitation[]>('/admin/invitations');
  },

  async createInvitation(payload: {
    email?: string;
    role?: 'student' | 'admin';
    expirationDays?: number;
    allowedContestIds?: string[];
  }): Promise<any> {
    return api.post('/admin/invitations', payload);
  },

  async revokeInvitation(id: string): Promise<any> {
    return api.delete(`/admin/invitations/${id}`);
  },

  async getContests(): Promise<AdminContest[]> {
    return api.get<AdminContest[]>('/admin/contests');
  },

  async createContest(payload: any): Promise<any> {
    return api.post('/admin/contests', payload);
  },

  async getAuditLogs(): Promise<any[]> {
    return api.get<any[]>('/admin/audit-logs');
  },
};
