import { executeRawSql } from './index';
import { bundledMigrations } from './migrations-bundle';

let isDbReady = false;
let dbReadyPromise: Promise<void> | null = null;

/**
 * Utilitário de migração automática do APROVA.
 * Executa as migrações SQL compiladas (sem dependência de filesystem/fs),
 * garantindo compatibilidade total com Cloudflare Workers e ambientes Edge.
 */
export async function runMigrations() {
  // Cria tabela de controle de migrações se não existir
  try {
    await executeRawSql(
      `CREATE TABLE IF NOT EXISTS "__aprova_migrations" (
        "name" varchar(255) PRIMARY KEY,
        "applied_at" timestamp with time zone DEFAULT now() NOT NULL
      );`
    );
  } catch {
    // Ignora se já existir
  }

  // Busca migrações já executadas
  const appliedNames = new Set<string>();
  try {
    const res = await executeRawSql('SELECT name FROM "__aprova_migrations";');
    const rows = res?.rows || (Array.isArray(res) && res[0]?.rows ? res[0].rows : []);
    for (const r of rows) {
      if (r?.name) {
        appliedNames.add(r.name);
      }
    }
  } catch {
    // Tabela pode ter acabado de ser criada
  }

  const force = typeof process !== 'undefined' && process.argv?.includes('--force');

  for (const { name, sql } of bundledMigrations) {
    if (appliedNames.has(name) && !force) {
      continue;
    }

    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await executeRawSql(stmt);
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (
          !msg.includes('already exists') &&
          !msg.includes('duplicate key') &&
          !msg.includes('already a partition') &&
          !msg.includes('multiple primary keys')
        ) {
          console.warn(`Aviso na migração ${name}:`, msg);
        }
      }
    }

    // Registra migração como aplicada
    try {
      await executeRawSql(
        `INSERT INTO "__aprova_migrations" ("name") VALUES ('${name}') ON CONFLICT ("name") DO NOTHING;`
      );
    } catch {
      // Ignora
    }
  }
}

/**
 * Garante que o banco de dados possui o schema e tabelas mínimas prontas.
 * Se as tabelas não existirem (ex: primeiro boot no Cloudflare Workers ou Neon vazio),
 * executa as migrações e o seed inicial automaticamente.
 */
export async function ensureDbReady(): Promise<void> {
  if (isDbReady) return;
  if (dbReadyPromise) return dbReadyPromise;

  dbReadyPromise = (async () => {
    try {
      // 1. Garante que todas as migrações SQL estão aplicadas
      await runMigrations();

      // 2. Verifica se o banco possui papéis/usuários iniciais
      let needsSeed = false;
      try {
        const rolesRes = await executeRawSql('SELECT count(*)::int as count FROM "roles";');
        const rolesCount = rolesRes?.rows?.[0]?.count ?? (Array.isArray(rolesRes) ? rolesRes[0]?.rows?.[0]?.count : 0);
        if (!rolesCount || Number(rolesCount) === 0) {
          needsSeed = true;
        }
      } catch {
        needsSeed = true;
      }

      if (needsSeed) {
        console.log('🌱 Inicializando papéis e dados padrão no banco de dados...');
        try {
          const { seed } = await import('./seed');
          await seed();
          console.log('🌱 Seed padrão aplicado com sucesso.');
        } catch (seedErr: any) {
          console.warn('Nota sobre seed inicial:', seedErr?.message || seedErr);
        }
      }

      isDbReady = true;
    } catch (err) {
      console.error('❌ Falha ao assegurar prontidão do banco de dados:', err);
    } finally {
      dbReadyPromise = null;
    }
  })();

  return dbReadyPromise;
}


// Se executado diretamente via CLI em Node.js
if (
  typeof process !== 'undefined' &&
  process.argv &&
  (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.includes('migrate'))
) {
  runMigrations()
    .then(() => {
      console.log('🎉 Migrações concluídas!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Falha ao aplicar migrações:', err);
      process.exit(1);
    });
}

