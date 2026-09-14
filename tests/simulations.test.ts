import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';

describe('FASE 6 — Simulados Completos, Provas Personalizadas e Modo Exame', () => {
  let adminToken: string;
  let studentToken: string;
  let student2Token: string;
  let prfContestId: string;
  let sampleQuestionIds: string[] = [];
  let createdSimId: string;
  let customSimId: string;
  let studentAttemptId: string;

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

    // 3. Cadastrar Aluno Secundário para testes de isolamento
    const inviteRes = await app.request('/api/v1/admin/invitations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'aluno2@aprova.app',
        role: 'student',
        allowedContestIds: [],
        expiresInHours: 24,
      }),
    });
    const inviteData = await inviteRes.json();
    const inviteCode = inviteData.data.code;

    await app.request('/api/v1/auth/register-with-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: inviteCode,
        name: 'Aluno 2 Isolamento',
        password: 'Aluno2@123456',
      }),
    });

    const s2LoginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno2@aprova.app', password: 'Aluno2@123456' }),
    });
    const s2Data = await s2LoginRes.json();
    student2Token = s2Data.data.token;

    // 4. Buscar Concurso PRF e Questões disponíveis
    const contestsRes = await app.request('/api/v1/contests', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const contestsData = await contestsRes.json();
    const prf = contestsData.data.find((c: any) => c.acronym === 'PRF');
    prfContestId = prf?.id || contestsData.data[0]?.id;

    // Buscar questões do banco para vincular ao simulado fixo
    const questionsRes = await app.request('/api/v1/questions?limit=10', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const qData = await questionsRes.json();
    sampleQuestionIds = qData.data.slice(0, 5).map((q: any) => q.id);
  });

  // ==========================================================================
  // 1. GESTÃO DE SIMULADOS PELO ADMIN
  // ==========================================================================
  it('deve permitir que o ADMIN crie um simulado FIXO com questões selecionadas', async () => {
    const res = await app.request('/api/v1/simulations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contestId: prfContestId,
        title: 'Simulado Oficial Teste Admin',
        description: 'Simulado fixo criado na suíte de testes',
        type: 'FIXED',
        durationMinutes: 45,
        penaltyRule: 'one_error_cancels_one_correct',
        penaltyFactor: '1.00',
        difficulty: 'MEDIO',
        isOfficial: true,
        status: 'draft',
        questionIds: sampleQuestionIds,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.type).toBe('FIXED');
    expect(body.data.totalQuestions).toBe(sampleQuestionIds.length);
    createdSimId = body.data.id;
  });

  it('deve impedir que ALUNO crie simulado oficial de administração (403 Forbidden)', async () => {
    const res = await app.request('/api/v1/simulations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contestId: prfContestId,
        title: 'Simulado Tentativa Aluno',
        type: 'FIXED',
        durationMinutes: 30,
        penaltyRule: 'none',
        difficulty: 'FACIL',
        questionIds: sampleQuestionIds,
      }),
    });

    expect(res.status).toBe(403);
  });

  it('deve permitir que o ADMIN publique e altere o status do simulado', async () => {
    const res = await app.request(`/api/v1/simulations/${createdSimId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('published');
  });

  it('deve permitir que o ADMIN duplique um simulado existente', async () => {
    const res = await app.request(`/api/v1/simulations/${createdSimId}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toContain('(Cópia)');
    expect(body.data.status).toBe('draft');
  });

  // ==========================================================================
  // 2. DISPONIBILIDADE E CRIAÇÃO PERSONALIZADA PELO ALUNO
  // ==========================================================================
  it('deve consultar a contagem de questões disponíveis antes de gerar simulado personalizado', async () => {
    const res = await app.request('/api/v1/simulations/custom/validate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contestId: prfContestId,
        difficulty: 'misto',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.availableQuestions).toBe('number');
    expect(body.data.availableQuestions).toBeGreaterThanOrEqual(1);
  });

  it('deve permitir que o ALUNO crie um simulado PERSONALIZADO com algoritmo anti-repetição', async () => {
    const res = await app.request('/api/v1/simulations/custom', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contestId: prfContestId,
        title: 'Meu Treino Personalizado Teste',
        questionCount: 2,
        durationMinutes: 30,
        penaltyRule: 'one_error_cancels_one_correct',
        difficulty: 'misto',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.type).toBe('CUSTOM');
    expect(body.data.isOfficial).toBe(false);
    customSimId = body.data.id;

    // Garante que o simulado personalizado gerado pode ser iniciado pelo aluno criador
    const startCustomRes = await app.request(`/api/v1/simulations/${customSimId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(startCustomRes.status).toBe(200);
    const customStartData = await startCustomRes.json();
    expect(customStartData.data.simulationId).toBe(customSimId);
  });

  // ==========================================================================
  // 3. MODO EXAME, ANTI-COLA E PROTEÇÃO DE RESPOSTAS
  // ==========================================================================
  it('deve iniciar uma tentativa e ocultar gabarito oficial e explicações no payload de exame (Anti-Cheat)', async () => {
    const startRes = await app.request(`/api/v1/simulations/${createdSimId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(startRes.status).toBe(200);
    const startBody = await startRes.json();
    expect(startBody.success).toBe(true);
    expect(startBody.data.attemptId).toBeDefined();
    expect(startBody.data.status).toBe('IN_PROGRESS');
    studentAttemptId = startBody.data.attemptId;

    // Carrega os dados da prova em andamento
    const examRes = await app.request(`/api/v1/simulations/${createdSimId}/attempt`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(examRes.status).toBe(200);
    const body = await examRes.json();
    expect(body.success).toBe(true);
    expect(body.data.attempt.id).toBe(studentAttemptId);
    expect(body.data.remainingSeconds).toBeGreaterThan(0);
    expect(Array.isArray(body.data.questions)).toBe(true);
    expect(body.data.questions.length).toBeGreaterThan(0);

    // Validação estrita de Anti-Cheat: NENHUMA questão ou alternativa deve conter gabarito ou comentário!
    for (const q of body.data.questions) {
      expect(q.officialExplanation).toBeUndefined();
      for (const opt of q.options) {
        expect(opt.isCorrect).toBeUndefined();
      }
    }
  });

  it('deve permitir salvar respostas atômicas com autosave', async () => {
    const examRes = await app.request(`/api/v1/simulations/${createdSimId}/attempt`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const examData = await examRes.json();
    const firstQ = examData.data.questions[0];
    const optionToSelect = firstQ.options[0]?.id;

    const res = await app.request(`/api/v1/simulations/${createdSimId}/attempt/answer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attemptId: studentAttemptId,
        questionId: firstQ.id,
        selectedOptionId: optionToSelect,
        timeSpentSeconds: 42,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.success).toBe(true);
  });

  it('deve permitir marcar e desmarcar questão para revisão durante o exame', async () => {
    const examRes = await app.request(`/api/v1/simulations/${createdSimId}/attempt`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const examData = await examRes.json();
    const firstQ = examData.data.questions[0];

    // Marcar para revisão
    const res1 = await app.request(`/api/v1/simulations/${createdSimId}/attempt/mark`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attemptId: studentAttemptId,
        questionId: firstQ.id,
      }),
    });

    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.success).toBe(true);
    expect(body1.data.isMarked).toBe(true);
    expect(body1.data.markedQuestions).toContain(firstQ.id);

    // Desmarcar da revisão
    const res2 = await app.request(`/api/v1/simulations/${createdSimId}/attempt/mark`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attemptId: studentAttemptId,
        questionId: firstQ.id,
      }),
    });

    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.success).toBe(true);
    expect(body2.data.isMarked).toBe(false);
    expect(body2.data.markedQuestions).not.toContain(firstQ.id);
  });

  // ==========================================================================
  // 4. ISOLAMENTO DE DADOS & SEGURANÇA (OWNERSHIP)
  // ==========================================================================
  it('deve impedir que outro aluno visualize o exame em andamento da tentativa alheia (400/403/404)', async () => {
    const res = await app.request(`/api/v1/simulations/${createdSimId}/attempt`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('deve impedir que outro aluno envie respostas para a tentativa alheia (403 Forbidden)', async () => {
    const res = await app.request(`/api/v1/simulations/${createdSimId}/attempt/answer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attemptId: studentAttemptId,
        questionId: sampleQuestionIds[0],
        selectedOptionId: 'opcao-invalida',
        timeSpentSeconds: 10,
      }),
    });

    expect(res.status).toBe(403);
  });

  // ==========================================================================
  // 5. FINALIZAÇÃO, CORREÇÃO E DIAGNÓSTICO (MOTOR CEBRASPE)
  // ==========================================================================
  it('deve finalizar o simulado e calcular a pontuação líquida com regra Cebraspe', async () => {
    const res = await app.request(`/api/v1/simulations/${createdSimId}/attempt/finish`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attemptId: studentAttemptId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('COMPLETED');
    expect(body.data.totalScore).toBeDefined();
    expect(typeof body.data.correctCount).toBe('number');
    expect(typeof body.data.wrongCount).toBe('number');
    expect(typeof body.data.blankCount).toBe('number');
    expect(body.data.finishedAt).toBeDefined();

    // Valida que a soma de certas, erradas e em branco é igual ao total de questões
    const totalProcessed = body.data.correctCount + body.data.wrongCount + body.data.blankCount;
    expect(totalProcessed).toBe(sampleQuestionIds.length);
  });

  it('deve rejeitar submissão adicional de respostas após finalização (400 Bad Request)', async () => {
    const res = await app.request(`/api/v1/simulations/${createdSimId}/attempt/answer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attemptId: studentAttemptId,
        questionId: sampleQuestionIds[0],
        selectedOptionId: null,
        timeSpentSeconds: 5,
      }),
    });

    expect(res.status).toBe(400);
  });

  it('deve liberar o gabarito comentado completo e diagnóstico por assunto no resultado pós-prova', async () => {
    const res = await app.request(`/api/v1/simulations/attempts/${studentAttemptId}/result`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.attempt.status).toBe('COMPLETED');
    expect(body.data.attempt.subjectBreakdown).toBeDefined();
    expect(Array.isArray(body.data.attempt.subjectBreakdown)).toBe(true);

    // Agora, no modo resultado, as respostas oficiais e comentários DEVEM estar visíveis
    expect(body.data.questions.length).toBeGreaterThan(0);
    const firstResultQ = body.data.questions[0];
    expect(firstResultQ.statement).toBeDefined();
    // Pelo menos uma opção deve ter isCorrect = true
    const hasCorrectFlag = firstResultQ.options.some((o: any) => o.isCorrect === true);
    expect(hasCorrectFlag).toBe(true);
  });

  // ==========================================================================
  // 6. HISTÓRICO E ESTATÍSTICAS DO ALUNO
  // ==========================================================================
  it('deve listar o histórico de tentativas com métricas consolidadas', async () => {
    const res = await app.request('/api/v1/simulations/history', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const recorded = body.data.find((item: any) => item.id === studentAttemptId);
    expect(recorded).toBeDefined();
    expect(recorded.status).toBe('COMPLETED');
  });

  it('deve calcular estatísticas de evolução e acurácia do aluno em simulados', async () => {
    const res = await app.request('/api/v1/simulations/stats', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalCompleted).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.data.evolution)).toBe(true);
  });

  // ==========================================================================
  // 7. INTEGRAÇÃO COM O DASHBOARD
  // ==========================================================================
  it('deve refletir métricas de simulados concluídos e nota máxima no dashboard do aluno', async () => {
    const res = await app.request('/api/v1/dashboard', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.metrics.simulationsCompleted).toBeGreaterThanOrEqual(1);
    expect(body.data.metrics.bestSimulationPercentage).toBeDefined();
  });
});
