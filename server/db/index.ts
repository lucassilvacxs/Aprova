import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import { neon as neonClient } from '@neondatabase/serverless';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

let dbInstance: any = null;
let poolInstance: any = null;
let neonHttpClient: any = null;
let pgliteInstance: PGlite | null = null;
let currentDbUrl: string | undefined = undefined;

export function initDb(overrideUrl?: string) {
  const dbUrl = overrideUrl || process.env.DATABASE_URL;

  // Se já instanciado com o mesmo banco, reutiliza a conexão
  if (dbInstance && currentDbUrl === dbUrl) return dbInstance;

  currentDbUrl = dbUrl;
  dbInstance = null;
  poolInstance = null;
  neonHttpClient = null;
  pgliteInstance = null;

  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  // Detecção estrita de ambiente Edge / Cloudflare Workers / Serverless
  const isCloudflareOrEdge =
    typeof (globalThis as any).WebSocketPair !== 'undefined' ||
    (typeof navigator !== 'undefined' && navigator.userAgent?.includes('Cloudflare')) ||
    typeof (globalThis as any).EdgeRuntime !== 'undefined' ||
    process.env.CF_PAGES === '1';

  const isNeonOrServerless =
    Boolean(dbUrl && (dbUrl.includes('neon.tech') || dbUrl.includes('sslmode=') || process.env.USE_NEON === 'true')) ||
    isCloudflareOrEdge;

  const useRemotePostgres =
    !isTestEnv &&
    !isCloudflareOrEdge &&
    process.env.USE_PGLITE !== 'true' &&
    dbUrl &&
    !dbUrl.includes('localhost:5432/aprova_db');

  if (isNeonOrServerless && dbUrl) {
    const rawNeon = neonClient(dbUrl);
    neonHttpClient = (query: any, params?: any, options?: any) => {
      if (typeof query === 'string') {
        if (typeof (rawNeon as any).query === 'function') {
          return (rawNeon as any).query(query, params, options);
        }
      }
      return (rawNeon as any)(query, params, options);
    };
    if (typeof (rawNeon as any).query === 'function') {
      (neonHttpClient as any).query = (query: any, params?: any, options?: any) =>
        (rawNeon as any).query(query, params, options);
    }
    dbInstance = drizzleNeonHttp(neonHttpClient, { schema });
    console.log('⚡ Banco de dados: Conectado via HTTP Serverless (Neon/Cloudflare).');
  } else if (isCloudflareOrEdge && !dbUrl) {
    console.warn('⚠️ AVISO CLOUDFLARE: DATABASE_URL não configurada no painel da Cloudflare. Usando banco em memória temporário.');
    try {
      pgliteInstance = new PGlite('memory://');
      dbInstance = drizzlePglite(pgliteInstance, { schema });
    } catch (edgeErr) {
      console.error('❌ Falha ao instanciar PGlite no Edge:', edgeErr);
      pgliteInstance = new PGlite();
      dbInstance = drizzlePglite(pgliteInstance, { schema });
    }
  } else if (useRemotePostgres) {
    poolInstance = new Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    dbInstance = drizzlePg(poolInstance, { schema });
    console.log('📡 Banco de dados: Conectado ao PostgreSQL remoto via pg.Pool.');
  } else if (isTestEnv) {
    // Em ambiente de teste: PostgreSQL em memória ultrarrápido sem filesystem
    pgliteInstance = new PGlite();
    dbInstance = drizzlePglite(pgliteInstance, { schema });
  } else {

    // Em desenvolvimento local Node.js: PostgreSQL persistente em disco
    try {
      if (typeof fs !== 'undefined' && typeof fs.existsSync === 'function') {
        const dataDir = path.resolve(process.cwd(), 'data', 'aprova_db');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        const lockFile = path.resolve(dataDir, 'postmaster.pid');
        if (fs.existsSync(lockFile)) {
          try {
            fs.unlinkSync(lockFile);
          } catch {}
        }

        pgliteInstance = new PGlite(dataDir);
        dbInstance = drizzlePglite(pgliteInstance, { schema });
        console.log(`📁 Banco de dados: PGlite (PostgreSQL WASM persistente em ${dataDir}).`);
      } else {
        pgliteInstance = new PGlite();
        dbInstance = drizzlePglite(pgliteInstance, { schema });
      }
    } catch (diskErr) {
      console.warn('⚠️ Falha ao inicializar PGlite em disco, usando fallback em memória:', diskErr);
      pgliteInstance = new PGlite();
      dbInstance = drizzlePglite(pgliteInstance, { schema });
    }
  }

  return dbInstance;
}

// Limpeza limpa no encerramento do processo em Node.js
if (
  typeof process !== 'undefined' &&
  typeof process.on === 'function' &&
  typeof (globalThis as any).WebSocketPair === 'undefined'
) {
  try {
    const cleanShutdown = async () => {
      if (pgliteInstance) {
        try {
          await pgliteInstance.close();
        } catch {}
      }
    };
    process.once('SIGINT', cleanShutdown);
    process.once('SIGTERM', cleanShutdown);
  } catch {}
}

export const pool = new Proxy({} as any, {
  get(_t, prop) {
    initDb();
    return poolInstance?.[prop];
  },
});

export const pglite = new Proxy({} as any, {
  get(_t, prop) {
    initDb();
    return (pgliteInstance as any)?.[prop];
  },
});

export const db: any = new Proxy({} as any, {
  get(_t, prop) {
    const instance = initDb();
    return instance[prop];
  },
});

/**
 * Executa SQL bruto diretamente no backend ativo.
 */
export async function executeRawSql(query: string, params: any[] = []): Promise<any> {
  initDb();
  if (neonHttpClient) {
    let res: any;
    if (typeof neonHttpClient.query === 'function') {
      res = params && params.length > 0 ? await neonHttpClient.query(query, params) : await neonHttpClient.query(query);
    } else {
      res = await neonHttpClient(query);
    }
    const rows = Array.isArray(res) ? res : (res?.rows || []);
    return { rows };
  }
  if (pgliteInstance) {
    if (params.length === 0) {
      return pgliteInstance.exec(query);
    }
    return pgliteInstance.query(query, params);
  }
  if (poolInstance) {
    return poolInstance.query(query, params);
  }
  throw new Error('Nenhum driver de banco de dados ativo.');
}

