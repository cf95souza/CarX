import crypto from 'crypto';

/**
 * Gera um token aleatório criptograficamente seguro em hexadecimal
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Gera o hash SHA-256 do token para armazenamento seguro no banco
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}
