import { UserRole } from './user';

export type Permission =
  // Permissões Administrativas
  | 'create_contest'
  | 'edit_contest'
  | 'delete_contest'
  | 'manage_users'
  | 'manage_invitations'
  | 'manage_questions'
  | 'manage_simulations'
  | 'manage_essays'
  | 'manage_news'
  | 'manage_documents'
  | 'view_audit_logs'
  // Permissões de Aluno / Estudo
  | 'view_contest'
  | 'study_contents'
  | 'answer_question'
  | 'take_simulation'
  | 'write_essay'
  | 'view_news'
  | 'view_documents'
  | 'create_study_plan';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'create_contest',
    'edit_contest',
    'delete_contest',
    'manage_users',
    'manage_invitations',
    'manage_questions',
    'manage_simulations',
    'manage_essays',
    'manage_news',
    'manage_documents',
    'view_audit_logs',
    'view_contest',
    'study_contents',
    'answer_question',
    'take_simulation',
    'write_essay',
    'view_news',
    'view_documents',
    'create_study_plan',
  ],
  student: [
    'view_contest',
    'study_contents',
    'answer_question',
    'take_simulation',
    'write_essay',
    'view_news',
    'view_documents',
    'create_study_plan',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
