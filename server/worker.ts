import { app } from './app';
import { initDb } from './db';
import { ensureDbReady } from './db/migrate';

interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Sincroniza variáveis de ambiente do Cloudflare com process.env
    if (env && typeof env === 'object') {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          process.env[key] = value;
        }
      }
    }

    // Inicializa banco de dados serverless (Neon) se DATABASE_URL estiver presente
    if (process.env.DATABASE_URL) {
      initDb(process.env.DATABASE_URL);
    }

    // Garante que as tabelas existem antes de atender rotas de API
    // No Cloudflare Workers, o body stream não é consumido até app.fetch() chamar request.json()
    if (url.pathname.startsWith('/api')) {
      await ensureDbReady();
      return app.fetch(request, env, ctx);
    }

    // Se houver binding ASSETS (Cloudflare Workers com Static Assets), serve o frontend
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // Fallback padrão para a aplicação
    return app.fetch(request, env, ctx);
  },
};
