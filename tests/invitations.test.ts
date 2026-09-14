import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';

describe('Sistema de Convites Privados (Invite-Only)', () => {
  let adminToken: string;
  let generatedCode: string;

  beforeAll(async () => {
    await runMigrations();
    await seed();

    const adminRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@aprova.app', password: 'Admin@123456' }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;
  });

  it('deve permitir que o ADMIN crie um novo convite com token criptográfico', async () => {
    const res = await app.request('/api/v1/admin/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: 'novoaluno@aprova.app',
        role: 'student',
        expirationDays: 7,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toBeDefined();
    expect(body.data.code.startsWith('inv_')).toBe(true);
    expect(body.data.status).toBe('pending');
    generatedCode = body.data.code;
  });

  it('deve validar um código de convite existente e pendente', async () => {
    const res = await app.request('/api/v1/auth/invitation/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: generatedCode }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.valid).toBe(true);
    expect(body.data.email).toBe('novoaluno@aprova.app');
  });

  it('deve permitir que o novo usuário conclua o cadastro utilizando o convite válido', async () => {
    const res = await app.request('/api/v1/auth/register-with-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: generatedCode,
        name: 'Carlos Aluno Novo',
        password: 'SenhaSegura@123',
        email: 'novoaluno@aprova.app',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('novoaluno@aprova.app');
  });

  it('deve REJEITAR reutilização do mesmo convite já utilizado (400 Bad Request)', async () => {
    const res = await app.request('/api/v1/auth/register-with-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: generatedCode,
        name: 'Tentativa Fraude',
        password: 'SenhaSegura@123',
        email: 'fraude@aprova.app',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_INVITE');
  });

  it('deve rejeitar validação de código de convite inexistente (404)', async () => {
    const res = await app.request('/api/v1/auth/invitation/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'inv_codigo_inexistente_999' }),
    });

    expect(res.status).toBe(404);
  });
});
