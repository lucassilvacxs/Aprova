import { api } from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  roles?: string[];
  avatarUrl?: string | null;
  allowedContestIds?: string[];
  initials?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface InviteValidationResponse {
  valid: boolean;
  email?: string;
  role: string;
  expiresAt: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>('/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('aprova-token', data.token);
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Falha silenciosa no backend
    } finally {
      localStorage.removeItem('aprova-token');
      localStorage.removeItem('aprova-demo-user');
    }
  },

  async getMe(): Promise<AuthUser> {
    const res = await api.get<{ user: AuthUser }>('/auth/me');
    return res.user;
  },

  async validateInvite(code: string): Promise<InviteValidationResponse> {
    return api.post<InviteValidationResponse>('/auth/invitation/validate', { code });
  },

  async registerWithInvite(payload: {
    code: string;
    name: string;
    password: string;
    email?: string;
  }): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>('/auth/register-with-invite', payload);
    if (data.token) {
      localStorage.setItem('aprova-token', data.token);
    }
    return data;
  },
};
