import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/app';
import { ensureDbReady } from '../server/db/migrate';

describe('Auto-migration & Direct Auth Verification', () => {
  beforeAll(async () => {
    // Simula o comportamento do server/index.ts ou worker.ts:
    // garante que as migrações e seed estejam aplicados antes das requisições
    await ensureDbReady();
  });

  it('deve realizar auto-migração sob demanda e cadastrar usuário direto com sucesso', async () => {
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auto Migration Test User',
        email: 'automigration.test@aprova.app',
        password: 'Password123!',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.token).toBeDefined();
    expect(data.data.user.email).toBe('automigration.test@aprova.app');
  });

  it('deve autenticar via Google Sign-In sob demanda', async () => {
    const res = await app.request('/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'mock_google_alunoteste@gmail.com_Aluno Teste',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe('alunoteste@gmail.com');
  });
});
