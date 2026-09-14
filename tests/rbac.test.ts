import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';

describe('Autorização e Controle de Acesso (RBAC & Guards)', () => {
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    await runMigrations();
    await seed();

    // Login Admin
    const adminRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@aprova.app', password: 'Admin@123456' }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;

    // Login Aluno
    const studentRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno@aprova.app', password: 'Aluno@123456' }),
    });
    const studentData = await studentRes.json();
    studentToken = studentData.data.token;
  });

  it('deve rejeitar acesso anônimo à rota administrativa com 401 Unauthorized', async () => {
    const res = await app.request('/api/v1/admin/users', {
      method: 'GET',
    });
    expect(res.status).toBe(401);
  });

  it('deve REJEITAR acesso de ALUNO à rota administrativa de usuários com 403 Forbidden', async () => {
    const res = await app.request('/api/v1/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('deve REJEITAR acesso de ALUNO à rota administrativa de convites com 403 Forbidden', async () => {
    const res = await app.request('/api/v1/admin/invitations', {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('deve PERMITIR acesso de ADMIN à rota administrativa de usuários (200 OK)', async () => {
    const res = await app.request('/api/v1/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('deve PERMITIR acesso de ADMIN à rota administrativa de concursos (200 OK)', async () => {
    const res = await app.request('/api/v1/admin/contests', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('deve PERMITIR acesso de ALUNO à sua área de estudos e concursos (200 OK)', async () => {
    const res = await app.request('/api/v1/contests', {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
