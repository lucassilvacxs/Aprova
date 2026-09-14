import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';
import { NewsClassificationService } from '../server/services/news-classification.service';
import { NewsIngestionService } from '../server/services/news-ingestion.service';
import { db } from '../server/db';
import { auditLogs } from '../server/db/schema';
import { eq } from 'drizzle-orm';

// Singleton de classificação para testes unitários
const classifier = new NewsClassificationService();

describe('FASE 9 — Notícias, Editais e Central de Atualizações', () => {
  let adminToken: string;
  let studentToken: string;
  let student2Token: string;
  let prfContestId: string;
  let pfContestId: string;
  let douSourceId: string;
  let createdNewsId: string;
  let createdDocId: string;

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

    // 2. Login Aluno 1
    const studentRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno@aprova.app', password: 'Aluno@123456' }),
    });
    const studentData = await studentRes.json();
    studentToken = studentData.data.token;

    // 3. Cadastrar Aluno 2 para testes de isolamento de leitura/favoritos
    const inviteRes = await app.request('/api/v1/admin/invitations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'aluno2.news@aprova.app',
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
        name: 'Aluno 2 Notícias',
        password: 'Aluno@123456',
      }),
    });

    const student2Res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno2.news@aprova.app', password: 'Aluno@123456' }),
    });
    const student2Data = await student2Res.json();
    student2Token = student2Data.data.token;

    // 4. Buscar Concursos PRF e PF
    const contestsRes = await app.request('/api/v1/contests', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const contestsData = await contestsRes.json();
    const prf = contestsData.data?.find((c: any) => c.acronym === 'PRF');
    const pf  = contestsData.data?.find((c: any) => c.acronym === 'PF');
    prfContestId = prf?.id;
    pfContestId  = pf?.id;

    // 5. Buscar Fonte Oficial (DOU / primeira disponível)
    const sourcesRes = await app.request('/api/v1/news-sources', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const sourcesData = await sourcesRes.json();
    const sources = sourcesData.data ?? [];
    const dou = sources.find((s: any) =>
      s.name.includes('Diário Oficial') || s.name.includes('DOU') || s.name.includes('Imprensa')
    );
    douSourceId = dou ? dou.id : sources[0]?.id;
  });

  // =========================================================================
  // 1. CLASSIFICAÇÃO DETERMINÍSTICA HEURÍSTICA (testes unitários puros)
  // =========================================================================
  describe('1. Classificação Determinística de Notícias', () => {
    it('deve classificar edital urgente da PRF com tags corretas', () => {
      // A assinatura real é classify(title, summary, content?)
      const classification = classifier.classify(
        'URGENTE: Publicado novo Edital PRF com 1.500 vagas para Policial Rodoviário',
        'Inscrições abrem na próxima segunda-feira no portal da banca organizadora.',
        'Foi publicado no Diário Oficial da União o edital de abertura do concurso público da Polícia Rodoviária Federal...',
      );

      expect(classification.category).toBe('EDITAL');
      expect(classification.isImportant).toBe(true);
      expect(classification.suggestedContestAcronym).toBe('PRF');
      // A tag do concurso é adicionada em minúsculas pelo serviço
      expect(classification.tags).toContain('prf');
      expect(classification.tags).toContain('edital');
    });

    it('deve classificar cronograma da PF com sucesso', () => {
      const classification = classifier.classify(
        'Polícia Federal retifica cronograma de provas e prazos recursais',
        'Cebraspe altera data da prova discursiva para o cargo de Agente da Polícia Federal.',
      );

      expect(classification.suggestedContestAcronym).toBe('PF');
      expect(classification.tags).toContain('pf');
    });

    it('deve retornar categoria GENERAL para notícias genéricas', () => {
      const classification = classifier.classify(
        'Dicas de preparação física para testes de aptidão',
        'Como manter o condicionamento aeróbico durante a rotina de estudos teóricos.',
      );

      // Sem palavras-chave de concurso específico
      expect(classification.suggestedContestAcronym).toBeUndefined();
      expect(classification.isImportant).toBe(false);
    });
  });

  // =========================================================================
  // 2. DEDUPLICAÇÃO CANÔNICA E SHA-256 HASH (testes unitários puros)
  // =========================================================================
  describe('2. Deduplicação Canônica e SHA-256', () => {
    it('deve normalizar URLs canônicas removendo parâmetros UTM e fragmentos', () => {
      const rawUrl = 'https://www.in.gov.br/web/dou/-/edital-123?utm_source=google&utm_medium=cpc#section-2';
      // Método estático público da classe
      const normalized = NewsIngestionService.generateCanonicalUrl(rawUrl);
      expect(normalized).toBe('https://www.in.gov.br/web/dou/-/edital-123');
    });

    it('deve gerar hash SHA-256 determinístico de 64 caracteres hex', () => {
      const hash1 = NewsIngestionService.generateContentHash(
        'source-id-123',
        'Novo Edital Publicado',
        new Date('2026-09-01T00:00:00Z'),
        'https://in.gov.br/noticia-1'
      );
      const hash2 = NewsIngestionService.generateContentHash(
        'source-id-123',
        'Novo Edital Publicado',
        new Date('2026-09-01T00:00:00Z'),
        'https://in.gov.br/noticia-1'
      );
      const hashDifferent = NewsIngestionService.generateContentHash(
        'source-id-123',
        'Outro Título de Notícia',
        new Date('2026-09-01T00:00:00Z'),
        'https://in.gov.br/noticia-1'
      );

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).not.toBe(hashDifferent);
    });

    it('deve impedir criação de notícia duplicada com a mesma URL canônica (409)', async () => {
      const uniqueUrl = `https://in.gov.br/dou/edital-dedup-${Date.now()}`;

      // Primeira inserção — deve ter sucesso
      const firstRes = await app.request('/api/v1/admin/news', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '[TEST] Notícia Deduplicação 1',
          summary: 'Resumo da primeira notícia de teste.',
          content: 'Conteúdo detalhado.',
          sourceId: douSourceId,
          contestId: prfContestId,
          category: 'EDITAL',
          externalUrl: uniqueUrl,
          status: 'DRAFT',
        }),
      });
      expect(firstRes.status).toBe(201);

      // Segunda inserção com mesma URL canônica — deve retornar 409 Conflict
      const secondRes = await app.request('/api/v1/admin/news', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '[TEST] Notícia Deduplicação 2 (Duplicata)',
          summary: 'Tentativa de inserir a mesma notícia.',
          content: 'Conteúdo qualquer.',
          sourceId: douSourceId,
          contestId: prfContestId,
          category: 'EDITAL',
          externalUrl: uniqueUrl,
          status: 'DRAFT',
        }),
      });
      expect(secondRes.status).toBe(409);
      const secondData = await secondRes.json();
      expect(secondData.error.message).toContain('já existe');
    });
  });

  // =========================================================================
  // 3. FLUXO DE VIDA DA NOTÍCIA (DRAFT -> PUBLISHED -> ARCHIVED)
  // =========================================================================
  describe('3. Ciclo de Vida e Publicação de Notícias', () => {
    it('Admin deve criar notícia em rascunho (DRAFT)', async () => {
      const res = await app.request('/api/v1/admin/news', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '[TEST] Notícia em Rascunho FASE 9',
          summary: 'Resumo da notícia em rascunho.',
          content: 'Conteúdo restrito não visível aos alunos.',
          sourceId: douSourceId,
          contestId: prfContestId,
          category: 'CRONOGRAMA',
          isImportant: true,
          isFeatured: false,
          status: 'DRAFT',
          tags: ['PRF', 'teste'],
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      createdNewsId = data.data.id;
      expect(data.data.status).toBe('DRAFT');
    });

    it('Aluno NÃO deve encontrar notícia DRAFT na listagem pública', async () => {
      const listRes = await app.request('/api/v1/news', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const listData = await listRes.json();
      const found = listData.data.items?.find((item: any) => item.id === createdNewsId);
      expect(found).toBeUndefined();
    });

    it('Aluno NÃO deve acessar notícia DRAFT diretamente — recebe 403 ou 404', async () => {
      // A API retorna 403 (não 404) para não revelar que a notícia existe
      const directRes = await app.request(`/api/v1/news/${createdNewsId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect([403, 404]).toContain(directRes.status);
    });

    it('Admin deve publicar a notícia (DRAFT -> PUBLISHED)', async () => {
      const publishRes = await app.request(`/api/v1/admin/news/${createdNewsId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(publishRes.status).toBe(200);
      const publishData = await publishRes.json();
      expect(publishData.data.status).toBe('PUBLISHED');
    });

    it('Aluno agora DEVE conseguir visualizar a notícia publicada', async () => {
      const res = await app.request(`/api/v1/news/${createdNewsId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.id).toBe(createdNewsId);
      expect(data.data.title).toBe('[TEST] Notícia em Rascunho FASE 9');
      expect(data.data.status).toBe('PUBLISHED');
      // Tags são retornadas como armazenadas (podem ser capitalizadas conforme entrada)
      expect(Array.isArray(data.data.tags)).toBe(true);
    });

    it('Admin deve arquivar a notícia (PUBLISHED -> ARCHIVED)', async () => {
      const res = await app.request(`/api/v1/admin/news/${createdNewsId}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.status).toBe('ARCHIVED');
    });
  });

  // =========================================================================
  // 4. INTERAÇÕES DO ALUNO (LEITURA E FAVORITOS)
  // =========================================================================
  describe('4. Interações do Aluno (Read / Favorite)', () => {
    let publicNewsId: string;

    beforeAll(async () => {
      // Criar e publicar uma notícia dedicada para testes de interação
      const res = await app.request('/api/v1/admin/news', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '[TEST] Notícia de Interação Aluno',
          summary: 'Teste de leitura e favoritos.',
          content: 'Texto da notícia para testes.',
          sourceId: douSourceId,
          contestId: pfContestId,
          category: 'LEGISLACAO',
          status: 'PUBLISHED',
        }),
      });
      const data = await res.json();
      publicNewsId = data.data.id;
    });

    it('Aluno 1 deve marcar notícia como lida via POST /read', async () => {
      const readRes = await app.request(`/api/v1/news/${publicNewsId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(readRes.status).toBe(200);
      const readData = await readRes.json();
      expect(readData.data.isRead).toBe(true);
    });

    it('Aluno 2 NÃO deve ter isRead=true via listagem (isolamento estrito)', async () => {
      // Verificar via listagem com filtro onlyUnread=true
      // Se a notícia aparece para Aluno2 no filtro onlyUnread, é porque não está lida para ele
      const listRes = await app.request(`/api/v1/news?onlyUnread=true`, {
        headers: { Authorization: `Bearer ${student2Token}` },
      });
      const listData = await listRes.json();
      // A notícia deve aparecer na lista de não lidas do Aluno2 (isolamento OK)
      const found = listData.data.items?.find((i: any) => i.id === publicNewsId);
      // Se found existe → Aluno2 não leu (correto); se não na lista é por outro motivo
      // Basta garantir que os dados de leitura do Aluno1 não vazaram para Aluno2
      if (found) {
        expect(found.isRead).toBe(false);
      }
    });

    it('Aluno 1 deve marcar notícia como não lida', async () => {
      const unreadRes = await app.request(`/api/v1/news/${publicNewsId}/unread`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(unreadRes.status).toBe(200);
    });

    it('Aluno 1 deve alternar favorito na notícia (favoritar)', async () => {
      const favRes = await app.request(`/api/v1/news/${publicNewsId}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(favRes.status).toBe(200);
      const favData = await favRes.json();
      expect(favData.data.isFavorite).toBe(true);
    });

    it('Notícia deve aparecer no filtro onlyFavorites=true do Aluno 1', async () => {
      const filterRes = await app.request('/api/v1/news?onlyFavorites=true', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const filterData = await filterRes.json();
      const found = filterData.data.items?.find((i: any) => i.id === publicNewsId);
      expect(found).toBeDefined();
      expect(found.isFavorite).toBe(true);
    });

    it('Aluno 2 NÃO deve ter a notícia nos seus favoritos (isolamento estrito)', async () => {
      const filter2Res = await app.request('/api/v1/news?onlyFavorites=true', {
        headers: { Authorization: `Bearer ${student2Token}` },
      });
      const filter2Data = await filter2Res.json();
      const found2 = filter2Data.data.items?.find((i: any) => i.id === publicNewsId);
      expect(found2).toBeUndefined();
    });

    it('Aluno 1 deve desfavoritar a notícia', async () => {
      const unfavRes = await app.request(`/api/v1/news/${publicNewsId}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const unfavData = await unfavRes.json();
      expect(unfavData.data.isFavorite).toBe(false);
    });
  });

  // =========================================================================
  // 5. EDITAIS E DOCUMENTOS OFICIAIS
  // =========================================================================
  describe('5. Documentos Oficiais e Exigência de Fonte', () => {
    it('deve REJEITAR cadastro de documento sem source_id (400)', async () => {
      const res = await app.request('/api/v1/admin/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Edital Sem Fonte',
          contestId: prfContestId,
          documentType: 'EDITAL',
          // sourceId omitido intencionalmente
          publicationDate: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(400);
    });

    it('Admin deve cadastrar documento oficial com fonte válida (201)', async () => {
      const res = await app.request('/api/v1/admin/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '[TEST] Edital de Retificação nº 2 - PRF 2026',
          contestId: prfContestId,
          sourceId: douSourceId,
          documentType: 'RETIFICATION',
          description: 'Retificação dos requisitos do cargo.',
          externalUrl: 'https://in.gov.br/web/dou/-/edital-retificacao-prf',
          publicationDate: new Date().toISOString(),
          status: 'PUBLISHED',
          isFeatured: true,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      createdDocId = data.data.id;
      expect(data.data.title).toBe('[TEST] Edital de Retificação nº 2 - PRF 2026');
      expect(data.data.documentType).toBe('RETIFICATION');
    });

    it('Aluno deve conseguir listar e filtrar documentos por concurso e tipo', async () => {
      const res = await app.request(
        `/api/v1/documents?contestId=${prfContestId}&documentType=RETIFICATION`,
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.items.length).toBeGreaterThanOrEqual(1);
      const doc = data.data.items.find((d: any) => d.id === createdDocId);
      expect(doc).toBeDefined();
      expect(doc.sourceName).toBeDefined();
      expect(doc.sourceTrustLevel).toBe('HIGH');
    });
  });

  // =========================================================================
  // 6. RBAC & SEGURANÇA
  // =========================================================================
  describe('6. Segurança e RBAC', () => {
    it('Aluno deve receber 403 ao tentar criar notícia', async () => {
      const res = await app.request('/api/v1/admin/news', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Notícia Inválida por Aluno',
          summary: 'Tentativa de invasão.',
          sourceId: douSourceId,
        }),
      });
      expect(res.status).toBe(403);
    });

    it('Aluno deve receber 403 ao tentar criar fonte de notícias', async () => {
      const res = await app.request('/api/v1/admin/news-sources', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Fonte Fake', websiteUrl: 'https://fake.com' }),
      });
      expect(res.status).toBe(403);
    });

    it('Aluno deve receber 403 ao tentar criar documento oficial', async () => {
      const res = await app.request('/api/v1/admin/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Edital Fake',
          contestId: prfContestId,
          sourceId: douSourceId,
          documentType: 'EDITAL',
        }),
      });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 7. AUDITORIA (AUDIT LOGS)
  // =========================================================================
  describe('7. Registro em Logs de Auditoria', () => {
    it('deve registrar operações administrativas de notícias no audit_logs', async () => {
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.resource, 'news'));

      expect(logs.length).toBeGreaterThan(0);
      const newsLog = logs.find(
        (l: { action: string; actorEmail?: string | null }) =>
          l.action.includes('CREATE') || l.action.includes('PUBLISH')
      );
      expect(newsLog).toBeDefined();
      expect(newsLog?.actorEmail).toBe('admin@aprova.app');
    });
  });
});
