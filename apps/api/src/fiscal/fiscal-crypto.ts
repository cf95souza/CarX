import crypto from 'node:crypto';

/**
 * Utilitário de Criptografia Simétrica Segura (AES-256-GCM)
 * Utilizado para proteger tokens de API e certificados A1 de tenants no banco de dados.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recomendado para GCM

function getDerivedKey(): Buffer {
  const secret = process.env.FISCAL_ENCRYPTION_KEY || process.env.JWT_SECRET || 'carx-fiscal-default-master-key-secure-2026';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Criptografa uma string em formato seguro iv:tag:ciphertext (Hex)
 */
export function encryptFiscalSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getDerivedKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decriptografa uma string gerada pelo encryptFiscalSecret
 */
export function decryptFiscalSecret(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato inválido de dado criptografado');
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const key = getDerivedKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

