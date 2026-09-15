import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      // Inicializa banco de dados uma vez ao subir o servidor de desenvolvimento
      import('./server/db/migrate').then(({ ensureDbReady }) => {
        ensureDbReady().catch((err) => {
          console.warn('[APROVA] Aviso: falha na auto-migração do banco de dados:', err);
        });
      });

      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
          try {
            const { getRequestListener } = await import('@hono/node-server');
            const { app } = await import('./server/app');
            const handler = getRequestListener(app.fetch);
            handler(req, res);
          } catch (err) {
            console.error('API dev server error:', err);
            next(err);
          }
        } else {
          next();
        }
      });
    },
  };
}


export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'charts-vendor': ['recharts'],
          'ui-vendor':     ['lucide-react', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
});
