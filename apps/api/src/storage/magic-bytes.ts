/**
 * CARX SAAS — Detector e Validador Estrito de Magic Bytes (Assinaturas Binárias)
 * Garante que extensões renomeadas (ex: virus.exe -> foto.jpg) sejam barradas antes
 * do armazenamento ou processamento.
 */

export class MagicBytesError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, code = 'INVALID_MAGIC_BYTES', statusCode = 400) {
    super(message);
    this.name = 'MagicBytesError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface DetectedMime {
  mime: string;
  extension: string;
  description: string;
}

/**
 * Assinaturas binárias conhecidas (Magic Bytes)
 */
export function detectMagicBytes(buffer: Buffer): DetectedMime | null {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // 1. JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg', description: 'Imagem JPEG' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', extension: 'png', description: 'Imagem PNG' };
  }

  // 3. WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', extension: 'webp', description: 'Imagem WebP' };
  }

  // 4. PDF: 25 50 44 46 (%PDF)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { mime: 'application/pdf', extension: 'pdf', description: 'Documento PDF' };
  }

  // 5. MP4: ftyp at offset 4..7 (66 74 79 70)
  if (
    buffer.length >= 8 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return { mime: 'video/mp4', extension: 'mp4', description: 'Vídeo MP4' };
  }

  return null;
}

/**
 * Detecta explicitamente assinaturas de arquivos perigosos e maliciosos
 */
export function isDangerousExecutableOrScript(buffer: Buffer): { dangerous: boolean; reason?: string } {
  if (!buffer || buffer.length === 0) {
    return { dangerous: true, reason: 'Arquivo vazio ou buffer corrompido' };
  }

  // Windows PE Executable (EXE / DLL / SYS / COM): "MZ"
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { dangerous: true, reason: 'Arquivo executável Windows (PE/MZ) não permitido' };
  }

  // Linux ELF Executable: 7F 45 4C 46 (\x7FELF)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    return { dangerous: true, reason: 'Arquivo binário Linux (ELF) não permitido' };
  }

  // Shell script: "#!" (0x23, 0x21)
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    return { dangerous: true, reason: 'Script de terminal (Shebang #!) não permitido' };
  }

  // Java Bytecode (.class): CA FE BA BE
  if (
    buffer.length >= 4 &&
    buffer[0] === 0xca &&
    buffer[1] === 0xfe &&
    buffer[2] === 0xba &&
    buffer[3] === 0xbe
  ) {
    return { dangerous: true, reason: 'Bytecode compilado (Java/Mach-O) não permitido' };
  }

  // Inspeção de texto para vetores de SVG / HTML / Script
  const previewSize = Math.min(buffer.length, 4096);
  const textPreview = buffer.toString('utf8', 0, previewSize).toLowerCase();

  // SVG proibido explicitamente pelo Documento Único CarX (vetor de XSS em navegadores)
  if (
    textPreview.includes('<svg') ||
    textPreview.includes('xmlns="http://www.w3.org/2000/svg"') ||
    (textPreview.includes('<?xml') && textPreview.includes('svg'))
  ) {
    return { dangerous: true, reason: 'SVG não é aceito como upload por conter potenciais vetores de script (XSS)' };
  }

  // HTML / Javascript / PHP
  if (
    textPreview.includes('<script') ||
    textPreview.includes('<?php') ||
    textPreview.includes('<!doctype html') ||
    textPreview.includes('<html') ||
    textPreview.includes('javascript:')
  ) {
    return { dangerous: true, reason: 'Arquivo contém tags executáveis de script ou marcação HTML não permitidas' };
  }

  return { dangerous: false };
}

/**
 * Tipos MIME autorizados na plataforma CarX para mídias de OS, laudos e fotos
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Validação rigorosa: checa segurança e compatibilidade entre MIME declarado e real
 */
export function validateFileMagicBytes(
  buffer: Buffer,
  declaredMimeType?: string,
  fileName?: string
): DetectedMime {
  // 1. Verificação de assinaturas maliciosas conhecidas
  const dangerCheck = isDangerousExecutableOrScript(buffer);
  if (dangerCheck.dangerous) {
    throw new MagicBytesError(
      `Upload rejeitado por segurança: ${dangerCheck.reason || 'formato de arquivo potencialmente perigoso'}.`,
      'SECURITY_VIOLATION',
      400
    );
  }

  // 2. Detecção real dos magic bytes
  const detected = detectMagicBytes(buffer);
  if (!detected) {
    throw new MagicBytesError(
      `Tipo de arquivo não suportado ou magic bytes desconhecidos. O arquivo ${fileName ? `"${fileName}" ` : ''}não corresponde a uma imagem (JPG, PNG, WebP) ou PDF válido.`,
      'UNSUPPORTED_MAGIC_BYTES',
      400
    );
  }

  // 3. Verifica se o tipo detectado está na lista branca permitida
  if (!ALLOWED_MIME_TYPES.includes(detected.mime as AllowedMimeType)) {
    throw new MagicBytesError(
      `Tipo MIME "${detected.mime}" não é permitido no armazenamento CarX.`,
      'MIME_NOT_ALLOWED',
      400
    );
  }

  // 4. Se o cliente declarou um MIME, verificar se bate com a assinatura real
  if (declaredMimeType) {
    const cleanDeclared = declaredMimeType.toLowerCase().split(';')[0].trim();
    // Mapeamento de equivalências aceitáveis (ex: image/jpg -> image/jpeg)
    const normalizedDeclared = cleanDeclared === 'image/jpg' ? 'image/jpeg' : cleanDeclared;

    if (normalizedDeclared !== detected.mime) {
      throw new MagicBytesError(
        `Divergência de segurança detectada: o arquivo foi enviado como "${declaredMimeType}", mas seus magic bytes reais são de "${detected.mime}".`,
        'MIME_MISMATCH',
        400
      );
    }
  }

  return detected;
}

