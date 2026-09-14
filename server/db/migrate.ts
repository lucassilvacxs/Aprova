import fs from 'fs';
import path from 'path';
import { executeRawSql } from './index';

/**
 * Utilitário de migração automática do APROVA.
 * Executa as migrações SQL geradas pelo Drizzle Kit em ordem.
 */
export async function runMigrations() {
  const drizzleDir = path.resolve(process.cwd(), 'drizzle');
  if (!fs.existsSync(drizzleDir)) {
    return;
  }

  // Cria tabela de controle de migrações se não existir
  try {
    await executeRawSql(
      `CREATE TABLE IF NOT EXISTS "__aprova_migrations" (
        "name" varchar(255) PRIMARY KEY,
        "applied_at" timestamp with time zone DEFAULT now() NOT NULL
      );`
    );
  } catch {
    // Ignora erro
  }

  // Busca migrações já executadas
  let appliedNames = new Set<string>();
  try {
    const res = await executeRawSql('SELECT name FROM "__aprova_migrations";');
    const rows = res?.rows || (Array.isArray(res) && res[0]?.rows ? res[0].rows : []);
    for (const r of rows) {
      appliedNames.add(r.name);
    }
  } catch {
    // Tabela pode ter acabado de ser criada
  }

  const sqlFiles = fs
    .readdirSync(drizzleDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of sqlFiles) {
    if (appliedNames.has(file) && !process.argv.includes('--force')) {
      continue;
    }

    const filePath = path.join(drizzleDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');

    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await executeRawSql(stmt);
      } catch (err: any) {
        if (
          !err.message?.includes('already exists') &&
          !err.message?.includes('duplicate key') &&
          !err.message?.includes('already a partition')
        ) {
          console.warn(`Aviso na migração ${file}:`, err.message);
        }
      }
    }

    // Registra migração como aplicada
    try {
      await executeRawSql(
        `INSERT INTO "__aprova_migrations" ("name") VALUES ('${file}') ON CONFLICT ("name") DO NOTHING;`
      );
    } catch {
      // Ignora
    }
  }
}

// Se executado diretamente via CLI
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.includes('migrate')) {
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
