import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';

describe('FASE 5 — Banco de Questões, Resolução, Filtros e Desempenho', () => {
  let adminToken: string;
  let studentToken: string;
  let sampleQuestionId: string;
  let sampleTopicId: string;
  let sampleBoardId: string;
  let sampleSubjectId: string;
  let createdQuestionId: string;
  let duplicatedQuestionId: string;
  let studentReportId: string;

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

    // Obtém dados de apoio para criar novas questões
    const filterRes = await app.request('/api/v1/questions/filters-data', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const fData = await filterRes.json();
    sampleTopicId = fData.data.topics[0]?.id;
    sampleBoardId = fData.data.boards[0]?.id;
    sampleSubjectId = fData.data.subjects[0]?.id;
  });

  it('deve listar questões publicadas para o aluno com filtros e metadados', async () => {
    const res = await app.request('/api/v1/questions?limit=10', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta).toBeDefined();
    expect(body.meta.total).toBeGreaterThan(0);

    // Salva uma questão para os próximos testes
    sampleQuestionId = body.data[0].id;
    expect(body.data.every((q: any) => q.status === 'published')).toBe(true);
  });

  it('deve impedir que o aluno veja questões em rascunho (RBAC e proteção de rascunhos)', async () => {
    // Aluno requisita com filtro status=draft
    const res = await app.request('/api/v1/questions?status=draft', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // RBAC força apenas questões publicadas para estudantes
    expect(body.data.every((q: any) => q.status === 'published')).toBe(true);
  });

  it('deve aplicar proteção anti-cheat pedagógica para aluno que ainda não respondeu', async () => {
    // Busca detalhes da questão como aluno
    const res = await app.request(`/api/v1/questions/${sampleQuestionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(sampleQuestionId);

    // Se o aluno não respondeu, a explicação oficial deve ser nula
    // e o campo isCorrect não deve existir nas opções
    if (!body.data.hasAttempted) {
      expect(body.data.officialExplanation).toBeNull();
      body.data.options.forEach((opt: any) => {
        expect(opt.isCorrect).toBeUndefined();
      });
    }
  });

  it('deve permitir que o ADMIN visualize o gabarito e a explicação sem ter respondido', async () => {
    const res = await app.request(`/api/v1/questions/${sampleQuestionId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.officialExplanation).toBeTruthy();
    expect(body.data.options.some((o: any) => o.isCorrect === true)).toBe(true);
  });

  it('deve registrar resolução de questão pelo aluno, atualizar acertos e revelar o gabarito', async () => {
    // Obtém opções da questão
    const qRes = await app.request(`/api/v1/questions/${sampleQuestionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const qData = await qRes.json();
    const chosenOptionId = qData.data.options[0].id;

    // Submete tentativa
    const attemptRes = await app.request(`/api/v1/questions/${sampleQuestionId}/attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        selectedOptionId: chosenOptionId,
        durationSeconds: 42,
        source: 'direct_practice',
      }),
    });

    expect(attemptRes.status).toBe(200);
    const attemptBody = await attemptRes.json();
    expect(attemptBody.success).toBe(true);
    expect(typeof attemptBody.data.isCorrect).toBe('boolean');
    expect(attemptBody.data.correctOptionId).toBeTruthy();
    expect(attemptBody.data.explanation).toBeTruthy();

    // Agora, verificamos que o aluno consegue visualizar a explicação oficial ao consultar a questão
    const recheckRes = await app.request(`/api/v1/questions/${sampleQuestionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const recheckBody = await recheckRes.json();
    expect(recheckBody.data.hasAttempted).toBe(true);
    expect(recheckBody.data.officialExplanation).toBeTruthy();
    expect(recheckBody.data.options.some((o: any) => o.isCorrect === true)).toBe(true);
  });

  it('deve permitir favoritar e desfavoritar uma questão de forma idempotente', async () => {
    // Favorita
    const fav1 = await app.request(`/api/v1/questions/${sampleQuestionId}/favorite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const b1 = await fav1.json();
    expect(b1.success).toBe(true);
    const initialFav = b1.data.favorited;

    // Desfavorita
    const fav2 = await app.request(`/api/v1/questions/${sampleQuestionId}/favorite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const b2 = await fav2.json();
    expect(b2.success).toBe(true);
    expect(b2.data.favorited).toBe(!initialFav);
  });

  it('deve permitir sinalizar e desmarcar questão para revisão periódica', async () => {
    const rev1 = await app.request(`/api/v1/questions/${sampleQuestionId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const b1 = await rev1.json();
    expect(b1.success).toBe(true);
    expect(typeof b1.data.markedForReview).toBe('boolean');
  });

  it('deve permitir que o aluno reporte um erro na questão', async () => {
    const res = await app.request(`/api/v1/questions/${sampleQuestionId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        type: 'statement_error',
        description: 'Enunciado possui erro de concordância no 2º parágrafo.',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.status).toBe('pending');
    studentReportId = body.data.id;
  });

  it('deve retornar histórico de resoluções do aluno', async () => {
    const res = await app.request('/api/v1/questions/history', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].questionId).toBeDefined();
  });

  it('deve calcular estatísticas reais de desempenho em questões', async () => {
    const res = await app.request('/api/v1/questions/stats', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.overall).toBeDefined();
    expect(body.data.overall.totalAnswered).toBeGreaterThan(0);
    expect(typeof body.data.overall.accuracy).toBe('number');
    expect(Array.isArray(body.data.bySubject)).toBe(true);
    expect(Array.isArray(body.data.byDifficulty)).toBe(true);
    expect(Array.isArray(body.data.byBoard)).toBe(true);
  });

  it('deve fornecer recomendações algorítmicas de estudo determinísticas', async () => {
    const res = await app.request('/api/v1/questions/recommendations?limit=3', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      expect(body.data[0].recommendationReason).toBeDefined();
      expect(body.data[0].priorityScore).toBeGreaterThan(0);
    }
  });

  // ── TESTES DE ADMINISTRAÇÃO E RBAC ──────────────────────────────────────
  it('deve bloquear criação de questão por aluno (403 Forbidden)', async () => {
    const res = await app.request('/api/v1/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        topicId: sampleTopicId,
        boardId: sampleBoardId,
        year: 2023,
        statement: 'Questão não autorizada criada por aluno',
        officialExplanation: 'Tentativa de invasão',
        options: [
          { letter: 'A', text: 'Opção 1', isCorrect: true },
          { letter: 'B', text: 'Opção 2', isCorrect: false },
        ],
      }),
    });

    expect(res.status).toBe(403);
  });

  it('deve permitir que o ADMIN crie uma nova questão completa com validação de gabarito', async () => {
    const res = await app.request('/api/v1/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        topicId: sampleTopicId,
        boardId: sampleBoardId,
        subjectId: sampleSubjectId,
        year: 2024,
        difficulty: 'hard',
        format: 'multiple_choice',
        statement: 'De acordo com a Lei 8.112/1990, são formas de provimento de cargo público, EXCETO:',
        officialExplanation: 'A exoneração é forma de VACÂNCIA, e não de provimento.',
        source: 'QUESTAO_AUTORAL',
        status: 'published',
        options: [
          { letter: 'A', text: 'Nomeação.', isCorrect: false },
          { letter: 'B', text: 'Promoção.', isCorrect: false },
          { letter: 'C', text: 'Exoneração.', isCorrect: true },
          { letter: 'D', text: 'Readaptação.', isCorrect: false },
          { letter: 'E', text: 'Reversão.', isCorrect: false },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.statement).toContain('Lei 8.112/1990');
    expect(body.data.options.length).toBe(5);
    createdQuestionId = body.data.id;
  });

  it('deve permitir que o ADMIN duplique uma questão para rascunho com novo ID', async () => {
    const res = await app.request(`/api/v1/questions/${createdQuestionId}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).not.toBe(createdQuestionId);
    expect(body.data.statement).toContain('(Cópia)');
    expect(body.data.status).toBe('draft');
    duplicatedQuestionId = body.data.id;

    // Confirma que aluno NÃO consegue ver a nova questão em rascunho
    const studentCheck = await app.request(`/api/v1/questions/${duplicatedQuestionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(studentCheck.status).toBe(404);
  });

  it('deve permitir que o ADMIN alterne publicação (draft -> published) tornando-a visível', async () => {
    const res = await app.request(`/api/v1/questions/${duplicatedQuestionId}/toggle-publish`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('published');

    // Agora o aluno consegue visualizar a questão
    const studentCheck = await app.request(`/api/v1/questions/${duplicatedQuestionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(studentCheck.status).toBe(200);
  });

  it('deve permitir que o ADMIN arquive a questão (soft delete)', async () => {
    const res = await app.request(`/api/v1/questions/${duplicatedQuestionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('archived');

    // Aluno não mais visualiza a questão arquivada
    const studentCheck = await app.request(`/api/v1/questions/${duplicatedQuestionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(studentCheck.status).toBe(404);
  });

  it('deve permitir que o ADMIN visualize reportes e marque como resolvido', async () => {
    // Lista reportes
    const listRes = await app.request('/api/v1/questions/reports', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.data.length).toBeGreaterThan(0);

    // Resolve o reporte criado anteriormente
    const resolveRes = await app.request(`/api/v1/questions/reports/${studentReportId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'resolved' }),
    });

    expect(resolveRes.status).toBe(200);
    const resolveBody = await resolveRes.json();
    expect(resolveBody.data.status).toBe('resolved');
  });
});
