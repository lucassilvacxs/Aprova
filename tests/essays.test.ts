import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';

describe('FASE 8 — Redação, Temas, Escrita, Correção e Desempenho', () => {
  let adminToken: string;
  let studentToken: string;
  let student2Token: string;
  let testPromptId: string;
  let testContestId: string;
  let createdEssayId: string;

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
        email: 'aluno2.redacao@aprova.app',
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
        name: 'Aluno Secundário Redação',
        password: 'Aluno@123456',
      }),
    });

    const student2Res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno2.redacao@aprova.app', password: 'Aluno@123456' }),
    });
    const student2Data = await student2Res.json();
    student2Token = student2Data.data.token;
  });

  describe('1. Banco de Temas e Gerador Inteligente', () => {
    it('deve listar os temas de redação disponíveis para o aluno', async () => {
      const res = await app.request('/api/v1/essay-prompts', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      // Guardar o primeiro tema para os testes seguintes
      testPromptId = body.data[0].id;
      testContestId = body.data[0].contestId;
    });

    it('deve obter os detalhes completos do tema com textos motivadores e critérios', async () => {
      const res = await app.request(`/api/v1/essay-prompts/${testPromptId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(testPromptId);
      expect(body.data.statement).toBeDefined();
      expect(body.data.context).toBeDefined();
    });

    it('deve sortear um tema não repetido via gerador inteligente', async () => {
      const res = await app.request('/api/v1/essay-prompts/random', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contestId: testContestId }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBeDefined();
    });
  });

  describe('2. Ciclo de Vida da Redação, Autosave e Versionamento', () => {
    it('deve iniciar uma nova redação para o aluno', async () => {
      const res = await app.request('/api/v1/essays', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptId: testPromptId,
          contestId: testContestId,
          title: 'A Integração das Forças de Segurança Pública',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.status).toBe('DRAFT');

      createdEssayId = body.data.id;
    });

    it('deve recuperar o rascunho em aberto', async () => {
      const res = await app.request(`/api/v1/essays/active-draft?promptId=${testPromptId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).not.toBeNull();
      expect(body.data.id).toBe(createdEssayId);
    });

    it('deve executar autosave computando palavras, caracteres e linhas em tempo real', async () => {
      const content = `A integração das forças de segurança pública constitui um dos pilares mais relevantes para o enfrentamento qualificado da criminalidade organizada no território brasileiro contemporâneo. Com efeito, a cooperação operacional entre a Polícia Rodoviária Federal e a Polícia Federal viabiliza o bloqueio de corredores estratégicos de escoamento de substâncias ilícitas e mercadorias contrabandeadas.

Nesse diapasão, a aplicação intensiva de inteligência e o compartilhamento dinâmico de dados entre as agências representam medidas indispensáveis para desarticular a governança financeira das facções. Por conseguinte, ferramentas tecnológicas avançadas, a exemplo da identificação automatizada de veículos e do monitoramento por imagens em tempo real, mitigam a assimetria informacional e potencializam as operações nas rodovias.

Em derradeira análise, a fiscalização rigorosa das fronteiras e dos eixos logísticos federais transcende a mera repressão criminal, erigindo-se em garantia da própria soberania nacional e dos direitos fundamentais dos cidadãos. Conclui-se, portanto, que a sinergia institucional permanente assegura a eficácia estatal preconizada pelo artigo cento e quarenta e quatro da Constituição Federal.`;

      const res = await app.request(`/api/v1/essays/${createdEssayId}/autosave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'A Integração das Forças de Segurança Pública — Revisado',
          content,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.wordCount).toBeGreaterThanOrEqual(150);
      expect(body.data.characterCount).toBeGreaterThan(500);
      expect(body.data.lineCount).toBeGreaterThan(0);
    });

    it('deve consultar detalhes da redação em edição', async () => {
      const res = await app.request(`/api/v1/essays/${createdEssayId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toContain('Revisado');
    });
  });

  describe('3. Isolamento Estrito de Dados entre Usuários', () => {
    it('deve PROIBIR que outro aluno acerte ou visualize a redação alheia (403)', async () => {
      const res = await app.request(`/api/v1/essays/${createdEssayId}`, {
        headers: { Authorization: `Bearer ${student2Token}` },
      });
      expect(res.status).toBe(403);
    });

    it('deve PROIBIR que outro aluno realize autosave na redação alheia (403)', async () => {
      const res = await app.request(`/api/v1/essays/${createdEssayId}/autosave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${student2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Tentativa Hacker',
          content: 'Invadindo a redação de outro usuário.',
        }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('4. Envio Definitivo e Bloqueio de Edição', () => {
    it('deve submeter a redação para a fila de correção com sucesso', async () => {
      const res = await app.request(`/api/v1/essays/${createdEssayId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('SUBMITTED');
    });

    it('deve BLOQUEAR tentativas de autosave após a submissão (400 - redação bloqueada)', async () => {
      const res = await app.request(`/api/v1/essays/${createdEssayId}/autosave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Tentativa de alteração pós-submissão',
          content: 'Não deve permitir gravar após envio.',
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('bloqueada');
    });
  });

  describe('5. Fila Admin, Bancada de Avaliação e Scoring por Critérios', () => {
    it('deve listar a redação submetida na fila de correção do admin', async () => {
      const res = await app.request('/api/v1/admin/essays?status=SUBMITTED', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      const item = body.data.find((e: any) => e.id === createdEssayId);
      expect(item).toBeDefined();
      expect(item.status).toBe('SUBMITTED');
    });

    it('deve obter os critérios oficiais de avaliação para a redação', async () => {
      const res = await app.request(`/api/v1/admin/essays/${createdEssayId}/criteria`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('deve rejeitar pontuação que ultrapasse a nota máxima permitida no critério', async () => {
      const criteriaRes = await app.request(`/api/v1/admin/essays/${createdEssayId}/criteria`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const criteriaData = await criteriaRes.json();
      const firstCrit = criteriaData.data[0];

      const res = await app.request(`/api/v1/admin/essays/${createdEssayId}/correct`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generalFeedback: 'Feedback teste nota inválida.',
          criteriaScores: [
            {
              criterionId: firstCrit.id,
              score: Number(firstCrit.maxScore) + 50, // Ultrapassa nota máxima
              feedback: 'Nota excessiva proposital',
            },
          ],
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('excede a pontuação máxima');
    });

    it('deve salvar e publicar a avaliação oficial com notas ponderadas e parecer qualitativo', async () => {
      const criteriaRes = await app.request(`/api/v1/admin/essays/${createdEssayId}/criteria`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const criteriaData = await criteriaRes.json();

      const criteriaScores = criteriaData.data.map((c: any) => ({
        criterionId: c.id,
        score: Math.min(Number(c.maxScore) * 0.85, Number(c.maxScore)), // 85% em cada critério
        feedback: `Atendimento satisfatório ao critério ${c.name}`,
      }));

      const res = await app.request(`/api/v1/admin/essays/${createdEssayId}/correct`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generalFeedback: 'Excelente dissertação. Demonstrou domínio dos conceitos constitucionais e normas de trânsito.',
          strengths: 'Argumentação jurídica consistente e parágrafos bem delimitados.',
          weaknesses: 'Pequenos desvios de pontuação na introdução.',
          suggestions: 'Praticar o uso de conectivos interparágrafos mais variados.',
          correctionType: 'MANUAL',
          criteriaScores,
        }),
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.correctionId).toBeDefined();
      expect(body.data.totalScore).toBeGreaterThan(0);
    });

    it('deve permitir que o aluno consulte a correção oficial detalhada', async () => {
      const res = await app.request(`/api/v1/essays/${createdEssayId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('CORRECTED');
      expect(body.data.correction).not.toBeNull();
      expect(body.data.correction.strengths).toBeDefined();
      expect(Array.isArray(body.data.criteriaScores)).toBe(true);
      expect(body.data.criteriaScores.length).toBeGreaterThan(0);
    });
  });

  describe('6. Painel de Desempenho, Série de Evolução e Recomendações Pedagógicas', () => {
    it('deve retornar as métricas agregadas e série histórica de notas do aluno', async () => {
      const res = await app.request('/api/v1/essays/stats', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.totalEssays).toBeGreaterThanOrEqual(1);
      expect(body.data.correctedCount).toBeGreaterThanOrEqual(1);
      expect(body.data.averageScore).toBeGreaterThan(0);
      expect(Array.isArray(body.data.evolutionSeries)).toBe(true);
      expect(Array.isArray(body.data.criteriaPerformance)).toBe(true);
    });

    it('deve gerar diagnóstico pedagógico com plano de ação e temas recomendados', async () => {
      const res = await app.request('/api/v1/essays/recommendations', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.diagnosticAdvice).toBeDefined();
      expect(Array.isArray(body.data.actionPlan)).toBe(true);
      expect(Array.isArray(body.data.recommendedPrompts)).toBe(true);
    });
  });
});
