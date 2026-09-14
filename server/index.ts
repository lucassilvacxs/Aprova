import { serve } from '@hono/node-server';
import { ensureDbReady } from './db/migrate';
import { app } from './app';

const port = Number(process.env.APP_PORT) || 3000;

if (process.env.NODE_ENV !== 'test') {
  // Assegura migrações e prontidão do banco no boot local
  (async () => {
    try {
      await ensureDbReady();
    } catch (e) {
      console.warn('Nota sobre inicialização de migrações:', e);
    }

    console.log(`🚀 Servidor APROVA iniciado na porta ${port} [${process.env.APP_ENV || 'development'}]`);
    serve({
      fetch: app.fetch,
      port,
    });
  })();
}

export default app;

