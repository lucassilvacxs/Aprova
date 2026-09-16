import bcrypt from 'bcryptjs';

/**
 * Hash de senha seguro compatível com Node.js e Cloudflare Workers V8 Edge.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, 10);
  } catch {
    // Fallback para ambiente Edge se bcryptjs falhar por falta de Buffer/Node crypto
    const encoder = new TextEncoder();
    const data = encoder.encode(`aprova_salt_v1_${password}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return `sha256_${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
}

/**
 * Comparação de senha segura com suporte a bcryptjs e fallback SHA-256 Edge.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;

  if (hash.startsWith('sha256_')) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`aprova_salt_v1_${password}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = `sha256_${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    return computedHash === hash;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    // Se bcrypt.compare falhar devido ao ambiente Edge sem Buffer, testa a senha com SHA-256 fallback
    const encoder = new TextEncoder();
    const data = encoder.encode(`aprova_salt_v1_${password}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = `sha256_${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    return computedHash === hash;
  }
}
