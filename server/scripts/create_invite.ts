import { db } from '../db';
import { users, invitations } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function main() {
  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@aprova.app'));

  if (!admin) {
    console.error('Admin user not found.');
    process.exit(1);
  }

  // Gera convite de Administrador (válido por 30 dias)
  const code = 'inv_' + crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [newInvite] = await db
    .insert(invitations)
    .values({
      code,
      role: 'admin', // Já cria com privilégios totais de Administrador!
      status: 'pending',
      allowedContestIds: [],
      expiresAt,
      createdBy: admin.id,
    })
    .returning();

  console.log('=== CONVITE GERADO COM SUCESSO ===');
  console.log('Código:', newInvite.code);
  console.log('Papel:', newInvite.role);
  console.log('Validade:', newInvite.expiresAt);
  console.log('URL de Cadastro:', `http://localhost:5173/cadastrar?code=${newInvite.code}`);
  console.log('==================================');

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
