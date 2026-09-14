import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { runMigrations } from '../server/db/migrate';
import { seed } from '../server/db/seed';

describe('FASE 4 — Cursos, Módulos, Aulas e Progresso (RBAC & Pedagógico)', () => {
  let adminToken: string;
  let studentToken: string;
  let createdCourseId: string;
  let createdModuleId: string;
  let publishedLessonId: string;
  let draftLessonId: string;

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

  describe('1. Cursos e RBAC de Criação/Edição', () => {
    it('deve listar cursos publicados para o aluno', async () => {
      const res = await app.request('/api/v1/courses', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      // Todos os cursos para o aluno devem estar published
      body.data.forEach((c: any) => {
        expect(c.status).toBe('published');
      });
    });

    it('deve impedir que ALUNO crie um curso com 403 Forbidden', async () => {
      const res = await app.request('/api/v1/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          title: 'Curso Tentativa Aluno',
          description: 'Não deve ser autorizado',
          status: 'draft',
        }),
      });
      expect(res.status).toBe(403);
    });

    it('deve permitir que ADMIN crie um novo curso', async () => {
      const res = await app.request('/api/v1/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Curso Teste Admin PRF',
          slug: `curso-teste-admin-${Date.now()}`,
          description: 'Descrição de teste oficial',
          status: 'published',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe('Curso Teste Admin PRF');
      createdCourseId = body.data.id;
    });

    it('deve permitir que ADMIN atualize os dados do curso', async () => {
      const res = await app.request(`/api/v1/courses/${createdCourseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          description: 'Descrição atualizada com sucesso',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.description).toBe('Descrição atualizada com sucesso');
    });

    it('deve impedir que ALUNO atualize o curso (403 Forbidden)', async () => {
      const res = await app.request(`/api/v1/courses/${createdCourseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ title: 'Hack Course' }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('2. Módulos e Aulas: Estrutura, Rascunhos e Reordenação', () => {
    it('deve permitir que ADMIN crie um módulo no curso', async () => {
      const res = await app.request('/api/v1/modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          courseId: createdCourseId,
          title: 'Módulo 1: Fundamentos',
          description: 'Conceitos iniciais',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Módulo 1: Fundamentos');
      createdModuleId = body.data.id;
    });

    it('deve impedir que ALUNO crie módulos (403 Forbidden)', async () => {
      const res = await app.request('/api/v1/modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          courseId: createdCourseId,
          title: 'Módulo Aluno',
        }),
      });
      expect(res.status).toBe(403);
    });

    it('deve permitir que ADMIN crie uma aula publicada com conteúdo markdown e materiais', async () => {
      const res = await app.request('/api/v1/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          moduleId: createdModuleId,
          title: 'Aula 1: Introdução ao CTB',
          slug: `aula-1-ctb-${Date.now()}`,
          description: 'Visão geral do código de trânsito',
          estimatedDurationMin: 25,
          type: 'mixed',
          status: 'published',
          videoUrl: 'https://youtube.com/watch?v=demo',
          contentBody: '# CTB em Foco\n\nTexto explicativo com **destaque**.',
          resources: [
            { title: 'CTB PDF', type: 'pdf', url: 'https://exemplo.com/ctb.pdf' },
          ],
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      publishedLessonId = body.data.id;
    });

    it('deve permitir que ADMIN crie uma aula em rascunho (draft)', async () => {
      const res = await app.request('/api/v1/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          moduleId: createdModuleId,
          title: 'Aula 2: Rascunho Confidencial',
          slug: `aula-2-rascunho-${Date.now()}`,
          status: 'draft',
          contentBody: 'Conteúdo ainda em elaboração pelo professor.',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      draftLessonId = body.data.id;
    });

    it('deve impedir que ALUNO visualize aula em rascunho com 404 ou 403', async () => {
      const res = await app.request(`/api/v1/lessons/${draftLessonId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(404);
    });

    it('deve permitir que ADMIN visualize a aula em rascunho', async () => {
      const res = await app.request(`/api/v1/lessons/${draftLessonId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe('draft');
    });

    it('deve permitir que ALUNO acesse aula publicada completa', async () => {
      const res = await app.request(`/api/v1/lessons/${publishedLessonId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(publishedLessonId);
      expect(body.data.contents.length).toBeGreaterThan(0);
      expect(body.data.resources.length).toBeGreaterThan(0);
    });
  });

  describe('3. Progresso Real do Aluno e "Continue Estudando"', () => {
    it('deve permitir que ALUNO conclua uma aula (toggle)', async () => {
      const res = await app.request(`/api/v1/progress/lessons/${publishedLessonId}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.lessonId).toBe(publishedLessonId);
      expect(body.data.isCompleted).toBe(true);
    });

    it('deve ser idempotente/reversível: desmarcar ao clicar novamente no toggle', async () => {
      const res = await app.request(`/api/v1/progress/lessons/${publishedLessonId}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.isCompleted).toBe(false);

      // Marca novamente como concluída para os próximos testes
      await app.request(`/api/v1/progress/lessons/${publishedLessonId}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
    });

    it('deve fornecer recomendação de estudo em /api/v1/progress/continue', async () => {
      const res = await app.request('/api/v1/progress/continue', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      if (body.data) {
        expect(body.data.lessonId).toBeDefined();
        expect(body.data.courseTitle).toBeDefined();
      }
    });

    it('deve rejeitar toggle de progresso sem autenticação (401)', async () => {
      const res = await app.request(`/api/v1/progress/lessons/${publishedLessonId}/toggle`, {
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });
  });
});
