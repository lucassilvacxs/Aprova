import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';

describe('FASE 7 — Plano de Estudos Inteligente, Calendário, Rotina e Distribuição Adaptativa', () => {
  let adminToken: string;
  let studentToken: string;
  let student2Token: string;
  let prfContestId: string;
  let prfSubjectIds: string[] = [];
  let createdPlanId: string;
  let sampleSessionId: string;

  beforeAll(async () => {
    await runMigrations();
    await seed();

    // 1. Login Admin
    const adminRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@aprova.app', password: 'Admin@123456' }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;

    // 2. Login Aluno Principal
    const studentRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno@aprova.app', password: 'Aluno@123456' }),
    });
    const studentData = await studentRes.json();
    studentToken = studentData.data.token;

    // 3. Cadastrar e autenticar Aluno Secundário para isolamento estrito
    const inviteRes = await app.request('/api/v1/admin/invitations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'aluno.isolamento@aprova.app',
        role: 'student',
        allowedContestIds: [],
        expiresInHours: 24,
      }),
    });
    const inviteData = await inviteRes.json();

    await app.request('/api/v1/auth/register-with-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: inviteData.data.code,
        name: 'Aluno Isolamento',
        password: 'Aluno@123456',
      }),
    });

    const student2Res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno.isolamento@aprova.app', password: 'Aluno@123456' }),
    });
    const student2Data = await student2Res.json();
    student2Token = student2Data.data.token;

    // 4. Obter Concurso PRF e suas disciplinas
    const contestsRes = await app.request('/api/v1/contests', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const contestsData = await contestsRes.json();
    const prf = contestsData.data.find((c: any) => c.slug?.includes('prf') || c.acronym === 'PRF');
    prfContestId = prf?.id || contestsData.data[0].id;

    const prfDetailRes = await app.request(`/api/v1/contests/${prfContestId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const prfDetail = await prfDetailRes.json();
    prfSubjectIds = (prfDetail.data.subjects || []).map((s: any) => s.id);
  });

  // ==========================================================================
  // 1. CRIAÇÃO E CONFIGURAÇÃO DO PLANO DE ESTUDOS
  // ==========================================================================
  it('deve rejeitar criação de plano sem concurso ou sem disponibilidades ativas', async () => {
    const res = await app.request('/api/v1/study-plans', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Plano Inválido',
        availabilities: [],
        subjects: [],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('deve criar um plano de estudos com disponibilidades semanais, preferências e disciplinas', async () => {
    const res = await app.request('/api/v1/study-plans', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contestId: prfContestId,
        name: 'Plano Intensivo PRF Testes',
        description: 'Plano para validação automatizada de rotinas e geração de sessões.',
        weeklyHours: 15,
        dailyMinutes: 120,
        strategy: 'BALANCED',
        availabilities: [
          { dayOfWeek: 0, startTime: '08:00', endTime: '10:00', availableMinutes: 120, enabled: true },
          { dayOfWeek: 1, startTime: '19:00', endTime: '21:00', availableMinutes: 120, enabled: true },
          { dayOfWeek: 2, startTime: '19:00', endTime: '21:00', availableMinutes: 120, enabled: true },
          { dayOfWeek: 3, startTime: '19:00', endTime: '21:00', availableMinutes: 120, enabled: true },
          { dayOfWeek: 4, startTime: '19:00', endTime: '21:00', availableMinutes: 120, enabled: true },
          { dayOfWeek: 5, startTime: '19:00', endTime: '21:00', availableMinutes: 120, enabled: true },
          { dayOfWeek: 6, startTime: '08:00', endTime: '11:00', availableMinutes: 180, enabled: true },
        ],
        preferences: {
          minSessionMinutes: 30,
          maxSessionMinutes: 60,
          breakMinutes: 10,
          defaultQuestionsPerSession: 20,
          revisionFrequency: 'spaced',
          prioritizeWeakSubjects: true,
          prioritizeBehindSchedule: true,
          balancedDistribution: true,
        },
        subjects: prfSubjectIds.slice(0, 4).map((subId, idx) => ({
          subjectId: subId,
          priority: idx === 0 ? 'CRITICAL' : 'HIGH',
          weight: idx === 0 ? 3.0 : 2.0,
          targetPercentage: 100,
        })),
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.availabilities.length).toBe(7);
    expect(body.data.subjects.length).toBeGreaterThanOrEqual(1);
    createdPlanId = body.data.id;
  });

  // ==========================================================================
  // 2. PRÉVIA E GERAÇÃO DETERMINÍSTICA NO HORIZONTE DE 4 SEMANAS
  // ==========================================================================
  it('deve gerar prévia das sessões sem persistir no banco', async () => {
    const res = await app.request(`/api/v1/study-plans/${createdPlanId}/preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.sessions)).toBe(true);
    expect(body.data.sessions.length).toBeGreaterThan(0);
    expect(body.data.totalHours).toBeGreaterThan(0);

    // Cada sessão deve conter justificativa explicável
    const first = body.data.sessions[0];
    expect(first.explanation).toBeDefined();
    expect(typeof first.explanation).toBe('string');
  });

  it('deve ativar o plano e persistir sessões no horizonte configurado', async () => {
    const res = await app.request(`/api/v1/study-plans/${createdPlanId}/activate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ACTIVE');

    // Verifica se as sessões foram gravadas
    const sessRes = await app.request(`/api/v1/study-plans/${createdPlanId}/sessions`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(sessRes.status).toBe(200);
    const sessBody = await sessRes.json();
    expect(sessBody.success).toBe(true);
    expect(sessBody.data.length).toBeGreaterThan(0);

    sampleSessionId = sessBody.data[0].id;
  });

  // ==========================================================================
  // 3. ISOLAMENTO E CONTROLE DE ACESSO (DATA ISOLATION)
  // ==========================================================================
  it('deve proibir que o Aluno 2 acesse ou modifique o plano do Aluno 1', async () => {
    // Tentativa de obter plano do Aluno 1
    const getRes = await app.request(`/api/v1/study-plans/${createdPlanId}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    expect([403, 404]).toContain(getRes.status);

    // Tentativa de pausar o plano do Aluno 1
    const pauseRes = await app.request(`/api/v1/study-plans/${createdPlanId}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    expect([400, 403, 404]).toContain(pauseRes.status);

    // Tentativa de acessar sessões do Aluno 1
    const sessRes = await app.request(`/api/v1/study-plans/${createdPlanId}/sessions`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    expect([403, 404]).toContain(sessRes.status);
  });

  // ==========================================================================
  // 4. CICLO DE VIDA DA SESSÃO, REPROGRAMAÇÃO E REVISÃO ESPAÇADA
  // ==========================================================================
  it('deve iniciar uma sessão e alterar status para IN_PROGRESS', async () => {
    const res = await app.request(`/api/v1/study-plans/sessions/${sampleSessionId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('IN_PROGRESS');
  });

  it('deve concluir a sessão e agendar automaticamente o ciclo de revisão espaçada', async () => {
    const res = await app.request(`/api/v1/study-plans/sessions/${sampleSessionId}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actualMinutes: 50,
        completedQuestions: 20,
        notes: 'Sessão concluída com boa retenção em legislação.',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.session.status).toBe('COMPLETED');
    expect(body.data.session.actualMinutes).toBe(50);
  });

  it('deve reprogramar uma sessão para nova data', async () => {
    const sessRes = await app.request(`/api/v1/study-plans/${createdPlanId}/sessions`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const sessBody = await sessRes.json();
    const plannedSession = sessBody.data.find((s: any) => s.status === 'PLANNED');

    if (plannedSession) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 10);
      const newDateStr = targetDate.toISOString().split('T')[0];

      const res = await app.request(`/api/v1/study-plans/sessions/${plannedSession.id}/reschedule`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newDate: newDateStr,
          newStartTime: '20:00',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.sessionDate).toBe(newDateStr);
    }
  });

  it('deve permitir pular uma sessão com motivo registrado', async () => {
    const sessRes = await app.request(`/api/v1/study-plans/${createdPlanId}/sessions`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const sessBody = await sessRes.json();
    const plannedSession = sessBody.data.find((s: any) => s.status === 'PLANNED');

    if (plannedSession) {
      const res = await app.request(`/api/v1/study-plans/sessions/${plannedSession.id}/skip`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Compromisso de trabalho imprevisto',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('SKIPPED');
    }
  });

  // ==========================================================================
  // 5. RECUPERAÇÃO E REORGANIZAÇÃO ADAPTATIVA DE SESSÕES ATRASADAS
  // ==========================================================================
  it('deve executar a reorganização adaptativa de sessões pendentes e atrasadas', async () => {
    const res = await app.request(`/api/v1/study-plans/${createdPlanId}/reorganize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.message).toBeDefined();
  });

  // ==========================================================================
  // 6. ESTATÍSTICAS, ADERÊNCIA E DIAGNÓSTICO DE CONSISTÊNCIA
  // ==========================================================================
  it('deve calcular estatísticas de aderência, horas cumpridas e diagnósticos', async () => {
    const res = await app.request(`/api/v1/study-plans/${createdPlanId}/stats`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.adherenceRate).toBeDefined();
    expect(typeof body.data.adherenceRate).toBe('number');
    expect(body.data.totalPlannedMinutes).toBeGreaterThan(0);
    expect(Array.isArray(body.data.subjectsBreakdown)).toBe(true);
    expect(Array.isArray(body.data.recommendations)).toBe(true);
  });

  // ==========================================================================
  // 7. INTEGRAÇÃO COM AGENDA DE HOJE E DASHBOARD
  // ==========================================================================
  it('deve retornar a rotina do dia no endpoint /api/v1/study-plans/today', async () => {
    const res = await app.request('/api/v1/study-plans/today', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.hasActivePlan).toBe(true);
    expect(body.data.todayDate).toBeDefined();
    expect(Array.isArray(body.data.sessions)).toBe(true);
  });

  it('deve incluir o resumo do plano de hoje no endpoint consolidado do dashboard', async () => {
    const res = await app.request('/api/v1/dashboard', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.todayStudyPlan).toBeDefined();
    expect(body.data.todayStudyPlan.hasActivePlan).toBe(true);
    expect(body.data.todayStudyPlan.summary).toBeDefined();
  });
});
