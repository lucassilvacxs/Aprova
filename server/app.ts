import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import * as dotenv from 'dotenv';
import { authRoutes } from './routes/auth.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { contestRoutes } from './routes/contests.routes';
import { adminRoutes } from './routes/admin.routes';
import { courseRoutes } from './routes/courses.routes';
import { moduleRoutes } from './routes/modules.routes';
import { lessonRoutes } from './routes/lessons.routes';
import { progressRoutes } from './routes/progress.routes';
import { questionRoutes } from './routes/questions.routes';
import { simulationRoutes } from './routes/simulations.routes';
import { studyPlanRoutes } from './routes/study-plans.routes';
import {
  essayRoutes,
  essayPromptRoutes,
  essayAdminRoutes,
  essayCriteriaAdminRoutes,
} from './routes/essays.routes';
import {
  newsRoutes,
  newsSourceRoutes,
  newsAdminRoutes,
  newsSourcesAdminRoutes,
} from './routes/news.routes';
import {
  documentRoutes,
  documentAdminRoutes,
} from './routes/documents.routes';

dotenv.config();

export const app = new Hono();

// Global Middlewares
app.use('*', logger());

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
      if (origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev')) return origin;
      if (process.env.ALLOWED_ORIGINS) {
        const allowed = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
        if (allowed.includes(origin) || allowed.includes('*')) return origin;
      }
      return origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'online',
    appName: process.env.APP_NAME || 'APROVA',
    timestamp: new Date().toISOString(),
    environment: process.env.APP_ENV || 'development',
    version: '1.0.0',
  });
});

// Root API v1 Information Endpoint
app.get('/api/v1', (c) => {
  return c.json({
    message: 'APROVA Core API v1',
    phase: 'FASE 3 - Banco de Dados, Backend, Autenticação e Persistência Real',
    routes: [
      '/api/health',
      '/api/v1/auth/login',
      '/api/v1/auth/logout',
      '/api/v1/auth/me',
      '/api/v1/auth/invitation/validate',
      '/api/v1/auth/register-with-invite',
      '/api/v1/dashboard',
      '/api/v1/contests',
      '/api/v1/contests/:id',
      '/api/v1/contests/subjects/list',
      '/api/v1/admin/users',
      '/api/v1/admin/invitations',
      '/api/v1/admin/contests',
      '/api/v1/admin/subjects',
      '/api/v1/admin/audit-logs',
    ],
  });
});

// ── Montagem dos Módulos da API v1 ───────────────────────────────────────────
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/dashboard', dashboardRoutes);
app.route('/api/v1/contests', contestRoutes);
app.route('/api/v1/admin', adminRoutes);
app.route('/api/v1/courses', courseRoutes);
app.route('/api/v1/modules', moduleRoutes);
app.route('/api/v1/lessons', lessonRoutes);
app.route('/api/v1/progress', progressRoutes);
app.route('/api/v1/questions', questionRoutes);
app.route('/api/v1/simulations', simulationRoutes);
app.route('/api/v1/study-plans', studyPlanRoutes);
app.route('/api/v1/essay-prompts', essayPromptRoutes);
app.route('/api/v1/essays', essayRoutes);
app.route('/api/v1/admin/essays', essayAdminRoutes);
app.route('/api/v1/admin/essay-criteria', essayCriteriaAdminRoutes);
app.route('/api/v1/news', newsRoutes);
app.route('/api/v1/news-sources', newsSourceRoutes);
app.route('/api/v1/documents', documentRoutes);
app.route('/api/v1/admin/news', newsAdminRoutes);
app.route('/api/v1/admin/news-sources', newsSourcesAdminRoutes);
app.route('/api/v1/admin/documents', documentAdminRoutes);

// Central Error Handler
app.onError((err, c) => {
  console.error('Unhandled API error:', err);

  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          code: err.status === 400 ? 'INVALID_REQUEST' : `HTTP_${err.status}`,
          message: err.message || 'Erro ao processar requisição.',
        },
      },
      err.status
    );
  }

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ocorreu um erro interno no servidor.',
        details: process.env.APP_ENV === 'development' ? err.message : undefined,
      },
    },
    500
  );
});


// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'A rota solicitada não foi encontrada.',
      },
    },
    404
  );
});

export default app;
