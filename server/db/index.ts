import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool as NeonPool } from '@neondatabase/serverless';
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
let pgliteInstance: PGlite | null = null;
let currentDbUrl: string | undefined = undefined;

export function initDb(overrideUrl?: string) {
  const dbUrl = overrideUrl || process.env.DATABASE_URL;

  // Se já instanciado com o mesmo banco, reutiliza a conexão
  if (dbInstance && currentDbUrl === dbUrl) return dbInstance;

  currentDbUrl = dbUrl;
  dbInstance = null;
  poolInstance = null;
  pgliteInstance = null;

  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  const isNeonOrServerless =
    dbUrl && (dbUrl.includes('neon.tech') || process.env.USE_NEON === 'true');

  const useRemotePostgres =
    !isTestEnv &&
    process.env.USE_PGLITE !== 'true' &&
    dbUrl &&
    !dbUrl.includes('localhost:5432/aprova_db');

  if (isNeonOrServerless) {
    const neonPool = new NeonPool({ connectionString: dbUrl });
    poolInstance = neonPool;
    dbInstance = drizzleNeon(neonPool, { schema });
    console.log('⚡ Banco de dados: Conectado ao PostgreSQL Serverless (Neon/Cloudflare).');
  } else if (useRemotePostgres) {
    poolInstance = new Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    dbInstance = drizzlePg(poolInstance, { schema });
    console.log('📡 Banco de dados: Conectado ao PostgreSQL remoto via pg.Pool.');
  } else if (isTestEnv) {
    // Em ambiente de teste: PostgreSQL em memória ultrarrápido
    pgliteInstance = new PGlite();
    dbInstance = drizzlePglite(pgliteInstance, { schema });
  } else {
    // Em desenvolvimento local: PostgreSQL persistente em disco (com fallback para memória se edge)
    const dataDir = path.resolve(process.cwd(), 'data', 'aprova_db');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    try {
      pgliteInstance = new PGlite(dataDir);
      dbInstance = drizzlePglite(pgliteInstance, { schema });
      console.log(`📁 Banco de dados: PGlite (PostgreSQL WASM persistente em ${dataDir}).`);
    } catch (diskErr) {
      console.warn('⚠️ Falha ao inicializar PGlite em disco, tentando recuperar lock obsoleto...', diskErr);
      const lockFile = path.resolve(dataDir, 'postmaster.pid');
      if (fs.existsSync(lockFile)) {
        try { fs.unlinkSync(lockFile); } catch {}
      }
      try {
        pgliteInstance = new PGlite(dataDir);
        dbInstance = drizzlePglite(pgliteInstance, { schema });
        console.log(`📁 Banco de dados: PGlite recuperado com sucesso após limpeza de lock.`);
      } catch (retryErr) {
        console.error('❌ Falha persistente ao inicializar PGlite em disco, usando fallback:', retryErr);
        pgliteInstance = new PGlite();
        dbInstance = drizzlePglite(pgliteInstance, { schema });
      }
    }
  }

  return dbInstance;
}

// Limpeza limpa no encerramento do processo
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  const cleanShutdown = async () => {
    if (pgliteInstance) {
      try {
        await pgliteInstance.close();
      } catch {}
    }
  };
  process.once('SIGINT', cleanShutdown);
  process.once('SIGTERM', cleanShutdown);
}

// Inicializa no carregamento do módulo
initDb();

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
