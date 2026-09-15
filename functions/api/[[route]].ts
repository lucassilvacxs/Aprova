import { app } from '../../server/app';
import { initDb } from '../../server/db';
import { ensureDbReady } from '../../server/db/migrate';

interface PagesFunctionContext {
  request: Request;
  env: Record<string, any>;
  next: () => Promise<Response>;
  data: Record<string, any>;
}

export const onRequest = async (context: PagesFunctionContext): Promise<Response> => {
  // Sincroniza variáveis de ambiente do Cloudflare Pages com process.env
  if (context.env && typeof context.env === 'object') {
    for (const [key, value] of Object.entries(context.env)) {
      if (typeof value === 'string') {
        process.env[key] = value;
      }
    }
  }

  // Inicializa o banco de dados caso DATABASE_URL tenha sido injetada pelo Cloudflare
  if (process.env.DATABASE_URL) {
    initDb(process.env.DATABASE_URL);
  }

  // Garante que as tabelas existem antes de atender a requisição
  await ensureDbReady();

  return app.fetch(context.request, context.env, context);
};

