import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';
import { db } from '../server/db';
import { users } from '../server/db/schema';

describe('Autenticação & Sessão (Auth Routes)', () => {
  beforeAll(async () => {
    await runMigrations();
    await seed();
  });


  it('deve realizar login com sucesso com credenciais válidas do Admin', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@aprova.app',
        password: 'Admin@123456',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('admin@aprova.app');
    expect(body.data.user.role).toBe('admin');
  });

  it('deve realizar login com sucesso com credenciais válidas do Aluno Demo', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aluno@aprova.app',
        password: 'Aluno@123456',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('aluno@aprova.app');
    expect(body.data.user.role).toBe('student');
  });

  it('deve rejeitar login com senha incorreta com mensagem genérica (401)', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@aprova.app',
        password: 'SenhaErrada123',
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('deve rejeitar login de usuário inexistente com a mesma mensagem genérica (401)', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'naoexiste@aprova.app',
        password: 'QualquerSenha123',
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('deve bloquear login de usuário com status "blocked" (403)', async () => {
    // Cria temporariamente um usuário bloqueado
    await db
      .insert(users)
      .values({
        name: 'Usuário Bloqueado',
        email: 'bloqueado@aprova.app',
        passwordHash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        status: 'blocked',
      })
      .onConflictDoNothing()
      .returning();

    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bloqueado@aprova.app',
        password: 'qualquer_senha',
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('ACCOUNT_BLOCKED');
  });

  it('deve retornar dados do usuário autenticado no endpoint /api/v1/auth/me', async () => {
    // Login prévio
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aluno@aprova.app',
        password: 'Aluno@123456',
      }),
    });
    const { data } = await loginRes.json();

    const meRes = await app.request('/api/v1/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${data.token}` },
    });

    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.data.user.email).toBe('aluno@aprova.app');
  });

  it('deve rejeitar requisição sem token no endpoint /api/v1/auth/me (401)', async () => {
    const res = await app.request('/api/v1/auth/me', {
      method: 'GET',
    });
    expect(res.status).toBe(401);
  });

  it('deve registrar e autenticar um novo usuário via Google Sign-In', async () => {
    const res = await app.request('/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'mock_google_novo.aluno@gmail.com_Novo Aluno Google',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('novo.aluno@gmail.com');
    expect(body.data.user.name).toBe('Novo Aluno Google');
    expect(body.data.user.role).toBe('student');
  });

  it('deve atribuir o papel ADMIN automaticamente ao logar com o email lucassilvaytb1999@gmail.com via Google', async () => {
    const res = await app.request('/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'mock_google_lucassilvaytb1999@gmail.com_Lucas Silva Admin',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('lucassilvaytb1999@gmail.com');
    expect(body.data.user.role).toBe('admin');
  });

  it('deve permitir cadastro direto e aberto com email e senha sem convite', async () => {
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aluno Direto',
        email: 'aluno.direto@aprova.app',
        password: 'SenhaForte123@',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('aluno.direto@aprova.app');
    expect(body.data.user.name).toBe('Aluno Direto');
    expect(body.data.user.role).toBe('student');
  });

  it('deve rejeitar cadastro direto com email duplicado (409 Conflict)', async () => {
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aluno Repetido',
        email: 'aluno.direto@aprova.app',
        password: 'OutraSenha123@',
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});
