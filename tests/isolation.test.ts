import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';

describe('Isolamento de Dados & Ownership (Data Privacy)', () => {
  let studentToken: string;

  beforeAll(async () => {
    await runMigrations();
    await seed();

    const studentRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno@aprova.app', password: 'Aluno@123456' }),
    });
    const studentData = await studentRes.json();
    studentToken = studentData.data.token;
  });

  it('deve retornar métricas exclusivas do usuário autenticado no dashboard', async () => {
    const res = await app.request('/api/v1/dashboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.metrics.totalQuestionsAnswered).toBeGreaterThan(0);
    expect(body.data.metrics.overallAccuracyRate).toBe(78.4);
    expect(Array.isArray(body.data.subjectPerformance)).toBe(true);
  });

  it('o dashboard não deve expor dados caso não haja autenticação', async () => {
    const res = await app.request('/api/v1/dashboard', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });
});
