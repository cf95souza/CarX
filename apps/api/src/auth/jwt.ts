import crypto from 'crypto';

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  'chave_secreta_jwt_minimo_32_caracteres_aleatorios_aqui';

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'chave_secreta_refresh_minimo_32_caracteres_aleatorios_aqui';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  tenant_id?: string | null;
  role?: string;
  isSuperadmin?: boolean;
  type?: 'access' | 'temp_2fa';
  [key: string]: unknown;
}

/**
 * Assina um JWT HMAC-SHA256 padrão RFC 7519
 */
export function signJwt(
  payload: JwtPayload,
  expiresInSeconds = 15 * 60, // 15 minutos padrão
  secret = ACCESS_SECRET
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));

  const data = `${headerB64}.${payloadB64}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

/**
 * Valida e decodifica um JWT
 */
export function verifyJwt<T = JwtPayload>(token: string, secret = ACCESS_SECRET): T {
  if (!token || typeof token !== 'string') {
    throw new Error('Token JWT ausente');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Formato de token JWT inválido');
  }

  const [headerB64, payloadB64, signature] = parts;
  const data = `${headerB64}.${payloadB64}`;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Comparação em tempo constante contra timing attacks
  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw new Error('Assinatura do token JWT inválida');
  }

  const decodedPayload = JSON.parse(base64UrlDecode(payloadB64));
  const now = Math.floor(Date.now() / 1000);

  if (decodedPayload.exp && decodedPayload.exp < now) {
    throw new Error('Token JWT expirado');
  }

  return decodedPayload as T;
}

export { ACCESS_SECRET, REFRESH_SECRET };
