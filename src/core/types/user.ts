export type UserRole = 'admin' | 'student';

export type UserStatus = 'active' | 'blocked' | 'pending';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string | null;
  allowedContestIds: string[]; // Lista de IDs de concursos que o usuário tem acesso
  createdAt: string;
  updatedAt: string;
}

export type InvitationStatus = 'valid' | 'used' | 'revoked' | 'expired';

export interface Invitation {
  id: string;
  code: string;
  createdBy: string;
  usedBy?: string | null;
  allowedContestIds: string[];
  expiresAt: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}
