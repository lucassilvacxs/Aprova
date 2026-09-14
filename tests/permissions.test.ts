import { describe, it, expect } from 'vitest';
import { hasPermission, ROLE_PERMISSIONS } from '../src/core/types/permissions';

describe('RBAC Authorization (Permissões e Papéis)', () => {
  it('ROLE_PERMISSIONS deve mapear papéis válidos para listas de permissões', () => {
    expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(ROLE_PERMISSIONS.student.length);
    expect(ROLE_PERMISSIONS.admin).toContain('manage_users');
    expect(ROLE_PERMISSIONS.student).not.toContain('manage_users');
  });

  it('ADMIN deve possuir privilégios de gerenciamento e de criação de concursos', () => {
    expect(hasPermission('admin', 'create_contest')).toBe(true);
    expect(hasPermission('admin', 'edit_contest')).toBe(true);
    expect(hasPermission('admin', 'delete_contest')).toBe(true);
    expect(hasPermission('admin', 'manage_users')).toBe(true);
    expect(hasPermission('admin', 'manage_invitations')).toBe(true);
    expect(hasPermission('admin', 'manage_questions')).toBe(true);
    expect(hasPermission('admin', 'view_audit_logs')).toBe(true);
  });

  it('ALUNO (student) NÃO deve ter permissões administrativas', () => {
    expect(hasPermission('student', 'create_contest')).toBe(false);
    expect(hasPermission('student', 'edit_contest')).toBe(false);
    expect(hasPermission('student', 'delete_contest')).toBe(false);
    expect(hasPermission('student', 'manage_users')).toBe(false);
    expect(hasPermission('student', 'manage_invitations')).toBe(false);
    expect(hasPermission('student', 'manage_questions')).toBe(false);
    expect(hasPermission('student', 'view_audit_logs')).toBe(false);
  });

  it('ALUNO (student) deve possuir permissões essenciais de estudo e avaliação', () => {
    expect(hasPermission('student', 'view_contest')).toBe(true);
    expect(hasPermission('student', 'study_contents')).toBe(true);
    expect(hasPermission('student', 'answer_question')).toBe(true);
    expect(hasPermission('student', 'take_simulation')).toBe(true);
    expect(hasPermission('student', 'write_essay')).toBe(true);
    expect(hasPermission('student', 'view_news')).toBe(true);
    expect(hasPermission('student', 'view_documents')).toBe(true);
    expect(hasPermission('student', 'create_study_plan')).toBe(true);
  });

  it('deve rejeitar permissões para papéis não cadastrados', () => {
    // @ts-expect-error teste com papel inválido
    expect(hasPermission('anonymous', 'view_contest')).toBe(false);
  });
});
