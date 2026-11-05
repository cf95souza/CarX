import { pool, adminPool } from '../database/db.js';
import { hashPassword, comparePassword } from './password.js';
import { signJwt, verifyJwt, JwtPayload } from './jwt.js';
import { generateTotpSecret, verifyTotp, generateOtpAuthUri } from './totp.js';
import { authRateLimiter } from './rate-limiter.js';
import { generateRandomToken, hashToken } from './tokens.js';

export class AuthError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export type MembershipRole = 'owner' | 'gestor' | 'atendente' | 'tecnico' | 'financeiro';

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  companyName?: string;
  tenantSlug?: string;
  tenantId?: string;
  role?: MembershipRole;
}

export interface LoginInput {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone?: string;
  is_active: boolean;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  two_factor_temp_secret?: string;
}

export interface MembershipInfo {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  trade_name: string;
  role: MembershipRole;
  is_active: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export class AuthService {
  /**
   * Emite o par de tokens (Access Token curto + Refresh Token rotativo)
   */
  private async issueTokens(
    userId: string,
    email: string,
    name: string,
    primaryMembership?: MembershipInfo,
    isSuperadmin = false,
    existingFamilyId?: string
  ): Promise<AuthTokens> {
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      name,
      tenant_id: primaryMembership?.tenant_id || null,
      role: primaryMembership?.role || 'atendente',
      isSuperadmin,
      type: 'access',
    };

    const accessToken = signJwt(accessPayload, 15 * 60); // 15 minutos

    const rawRefreshToken = generateRandomToken(40);
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = existingFamilyId || generateRandomToken(16);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    // Armazenar hash do refresh token na tabela refresh_tokens
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
       VALUES ($1, $2, $3, $4);`,
      [userId, tokenHash, familyId, expiresAt]
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresInSeconds: 15 * 60,
    };
  }

  /**
   * Cadastro de novo usuário com vínculo imediato de papel na organização
   */
  public async register(input: RegisterUserInput): Promise<{
    user: Omit<UserRow, 'password_hash'>;
    membership: MembershipInfo;
  }> {
    const cleanEmail = input.email.toLowerCase().trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new AuthError('E-mail informado é inválido.', 400);
    }

    if (!input.password || input.password.length < 8) {
      throw new AuthError('A senha deve possuir no mínimo 8 caracteres.', 400);
    }

    // 1. Verificar se usuário já existe
    const existing = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1;',
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      throw new AuthError('Já existe uma conta cadastrada com este e-mail.', 409);
    }

    const passwordHash = await hashPassword(input.password);

    // 2. Resolver ou provisionar Tenant
    let targetTenantId = input.tenantId;
    let targetRole: MembershipRole = input.role || 'atendente';

    if (!targetTenantId) {
      const companyName = input.companyName || `${input.name} Oficina`;
      const baseSlug = input.tenantSlug || companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      // Criar nova oficina/tenant
      const tenantRes = await adminPool.query<{ id: string; slug: string; trade_name: string }>(
        `INSERT INTO tenants (slug, trade_name, email, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id, slug, trade_name;`,
        [slug, companyName, cleanEmail]
      );

      targetTenantId = tenantRes.rows[0].id;
      // Quem cria a oficina é o Proprietário (Owner)
      targetRole = 'owner';
    }

    // 3. Inserir usuário na base global
    const userRes = await adminPool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash, phone, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, email, is_active, two_factor_enabled;`,
      [input.name.trim(), cleanEmail, passwordHash, input.phone || null]
    );

    const newUser = userRes.rows[0];

    // 4. Inserir Membership com o papel correto imediatamente
    const memRes = await adminPool.query<{ id: string; tenant_id: string; role: MembershipRole; is_active: boolean }>(
      `INSERT INTO memberships (tenant_id, user_id, role, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, tenant_id, role, is_active;`,
      [targetTenantId, newUser.id, targetRole]
    );

    const tenantInfo = await adminPool.query<{ slug: string; trade_name: string }>(
      'SELECT slug, trade_name FROM tenants WHERE id = $1;',
      [targetTenantId]
    );

    const membership: MembershipInfo = {
      id: memRes.rows[0].id,
      tenant_id: targetTenantId,
      tenant_slug: tenantInfo.rows[0]?.slug || '',
      trade_name: tenantInfo.rows[0]?.trade_name || '',
      role: targetRole,
      is_active: memRes.rows[0].is_active,
    };

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        is_active: newUser.is_active,
        two_factor_enabled: newUser.two_factor_enabled,
      },
      membership,
    };
  }

  /**
   * Autenticação com e-mail e senha + proteção anti-brute force + suporte a 2FA
   */
  public async login(input: LoginInput): Promise<
    | { requires2fa: true; tempToken: string; user: { id: string; email: string; name: string } }
    | {
        requires2fa: false;
        user: { id: string; email: string; name: string };
        memberships: MembershipInfo[];
        tokens: AuthTokens;
      }
  > {
    const cleanEmail = input.email.toLowerCase().trim();
    const reqIp = input.ip || 'unknown';

    // 1. Barreira contra ataques de força bruta
    if (authRateLimiter.isBlocked(reqIp, cleanEmail)) {
      throw new AuthError(
        'Muitas tentativas inválidas consecutivas. Acesso temporariamente bloqueado por 15 minutos.',
        429
      );
    }

    // 2. Buscar usuário
    const userRes = await adminPool.query<UserRow>(
      `SELECT id, name, email, password_hash, is_active, two_factor_enabled, two_factor_secret
       FROM users
       WHERE email = $1 LIMIT 1;`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      authRateLimiter.recordFailedAttempt(reqIp, cleanEmail);
      throw new AuthError('Credenciais inválidas.', 401);
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      throw new AuthError('Esta conta está inativa. Entre em contato com o suporte.', 403);
    }

    // 3. Comparar senha
    const isPasswordValid = await comparePassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      authRateLimiter.recordFailedAttempt(reqIp, cleanEmail);
      throw new AuthError('Credenciais inválidas.', 401);
    }

    // Sucesso: limpar histórico de tentativas
    authRateLimiter.resetAttempts(reqIp, cleanEmail);

    // 4. Se 2FA estiver ativado, emitir token temporário de segundo fator
    if (user.two_factor_enabled && user.two_factor_secret) {
      const tempToken = signJwt(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          type: 'temp_2fa',
        },
        5 * 60 // 5 minutos para digitar o código de 6 dígitos
      );

      return {
        requires2fa: true,
        tempToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    }

    // 5. Obter memberships e status de superadmin
    const memberships = await this.getUserMemberships(user.id);
    const isSuperadmin = await this.checkIsSuperadmin(user.id);

    // 6. Emitir tokens de sessão
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.name,
      memberships[0],
      isSuperadmin
    );

    return {
      requires2fa: false,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      memberships,
      tokens,
    };
  }

  /**
   * Validação do código 2FA TOTP para conclusão do login
   */
  public async verify2fa(tempToken: string, code: string, ip?: string): Promise<{
    user: { id: string; email: string; name: string };
    memberships: MembershipInfo[];
    tokens: AuthTokens;
  }> {
    let payload: JwtPayload;
    try {
      payload = verifyJwt<JwtPayload>(tempToken);
    } catch {
      throw new AuthError('Sessão de verificação 2FA expirada ou inválida. Faça login novamente.', 401);
    }

    if (payload.type !== 'temp_2fa') {
      throw new AuthError('Tipo de token inválido para validação de 2FA.', 400);
    }

    const userRes = await adminPool.query<UserRow>(
      `SELECT id, name, email, two_factor_enabled, two_factor_secret, is_active
       FROM users
       WHERE id = $1 LIMIT 1;`,
      [payload.sub]
    );

    const user = userRes.rows[0];
    if (!user || !user.two_factor_secret) {
      throw new AuthError('Configuração de 2FA não encontrada para este usuário.', 400);
    }

    const isCodeValid = verifyTotp(code, user.two_factor_secret);

    if (!isCodeValid) {
      authRateLimiter.recordFailedAttempt(ip || 'unknown', user.email);
      throw new AuthError('Código de autenticação de dois fatores incorreto.', 401);
    }

    const memberships = await this.getUserMemberships(user.id);
    const isSuperadmin = await this.checkIsSuperadmin(user.id);

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.name,
      memberships[0],
      isSuperadmin
    );

    return {
      user: { id: user.id, email: user.email, name: user.name },
      memberships,
      tokens,
    };
  }

  /**
   * Inicia o setup de 2FA gerando um segredo e a URI otpauth://
   */
  public async setup2fa(userId: string): Promise<{
    secret: string;
    otpauth_url: string;
  }> {
    const userRes = await adminPool.query<UserRow>(
      'SELECT id, email, name FROM users WHERE id = $1;',
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new AuthError('Usuário não encontrado.', 404);
    }

    const user = userRes.rows[0];
    const secret = generateTotpSecret();

    // Salvar no segredo temporário até o usuário confirmar com um código válido
    await adminPool.query(
      'UPDATE users SET two_factor_temp_secret = $1 WHERE id = $2;',
      [secret, userId]
    );

    const otpauthUrl = generateOtpAuthUri(user.email, 'CarX', secret);

    return {
      secret,
      otpauth_url: otpauthUrl,
    };
  }

  /**
   * Confirma e ativa o 2FA após validação de código correto
   */
  public async enable2fa(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    const userRes = await adminPool.query<UserRow>(
      'SELECT id, two_factor_temp_secret FROM users WHERE id = $1;',
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new AuthError('Usuário não encontrado.', 404);
    }

    const tempSecret = userRes.rows[0].two_factor_temp_secret;
    if (!tempSecret) {
      throw new AuthError('Nenhum processo de configuração de 2FA em andamento.', 400);
    }

    const isValid = verifyTotp(code, tempSecret);
    if (!isValid) {
      throw new AuthError('Código TOTP de confirmação inválido.', 400);
    }

    await adminPool.query(
      `UPDATE users 
       SET two_factor_secret = two_factor_temp_secret, 
           two_factor_enabled = true, 
           two_factor_temp_secret = NULL 
       WHERE id = $1;`,
      [userId]
    );

    return {
      success: true,
      message: 'Autenticação em dois fatores ativada com sucesso.',
    };
  }

  /**
   * Desativa o 2FA mediante verificação do código atual
   */
  public async disable2fa(userId: string, code: string): Promise<{ success: boolean }> {
    const userRes = await adminPool.query<UserRow>(
      'SELECT id, two_factor_secret, two_factor_enabled FROM users WHERE id = $1;',
      [userId]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].two_factor_secret) {
      throw new AuthError('2FA não está ativado para esta conta.', 400);
    }

    const isValid = verifyTotp(code, userRes.rows[0].two_factor_secret);
    if (!isValid) {
      throw new AuthError('Código TOTP incorreto.', 400);
    }

    await adminPool.query(
      'UPDATE users SET two_factor_secret = NULL, two_factor_enabled = false WHERE id = $1;',
      [userId]
    );

    return { success: true };
  }

  /**
   * Rotação de Refresh Token com detecção compulsória de reuso malicioso (Family ID)
   */
  public async rotateRefreshToken(oldRefreshToken: string): Promise<AuthTokens> {
    if (!oldRefreshToken || typeof oldRefreshToken !== 'string') {
      throw new AuthError('Refresh token não informado.', 400);
    }

    const tokenHash = hashToken(oldRefreshToken);

    const tokenRes = await adminPool.query<{
      id: string;
      user_id: string;
      family_id: string;
      is_revoked: boolean;
      expires_at: Date;
    }>(
      `SELECT id, user_id, family_id, is_revoked, expires_at
       FROM refresh_tokens
       WHERE token_hash = $1 LIMIT 1;`,
      [tokenHash]
    );

    if (tokenRes.rows.length === 0) {
      throw new AuthError('Refresh token inválido ou inexistente.', 401);
    }

    const tokenRecord = tokenRes.rows[0];

    // DETECÇÃO DE REUSO MALICIOSO: Se o token já havia sido revogado, alguém o roubou!
    if (tokenRecord.is_revoked) {
      // Ação compulsória: revogar TODAS as sessões desta família de tokens imediatamente
      await adminPool.query(
        'UPDATE refresh_tokens SET is_revoked = true WHERE family_id = $1;',
        [tokenRecord.family_id]
      );

      throw new AuthError(
        'Reuso malicioso de refresh token detectado. Todas as sessões foram encerradas por segurança.',
        401
      );
    }

    // Verificar se expirou
    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new AuthError('Refresh token expirado. Faça login novamente.', 401);
    }

    // Revogar o token antigo utilizado
    await adminPool.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE id = $1;',
      [tokenRecord.id]
    );

    // Buscar dados do usuário para emitir novos tokens
    const userRes = await adminPool.query<UserRow>(
      'SELECT id, email, name, is_active FROM users WHERE id = $1;',
      [tokenRecord.user_id]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      throw new AuthError('Conta de usuário inativa ou inexistente.', 401);
    }

    const user = userRes.rows[0];
    const memberships = await this.getUserMemberships(user.id);
    const isSuperadmin = await this.checkIsSuperadmin(user.id);

    // Emitir novo par mantendo o MESMO family_id
    return this.issueTokens(
      user.id,
      user.email,
      user.name,
      memberships[0],
      isSuperadmin,
      tokenRecord.family_id
    );
  }

  /**
   * Logout revogando o token informado
   */
  public async logout(refreshToken?: string): Promise<{ success: boolean }> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await adminPool.query(
        'UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1;',
        [tokenHash]
      );
    }
    return { success: true };
  }

  /**
   * Solicitação de recuperação de senha via e-mail
   */
  public async requestPasswordReset(email: string): Promise<{ success: boolean; resetToken?: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const userRes = await adminPool.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1;',
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      // Resposta genérica para mitigar enumeração de contas
      return { success: true };
    }

    const userId = userRes.rows[0].id;
    const rawResetToken = generateRandomToken(32);
    const tokenHash = hashToken(rawResetToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hora de validade

    await adminPool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3);`,
      [userId, tokenHash, expiresAt]
    );

    return {
      success: true,
      resetToken: rawResetToken,
    };
  }

  /**
   * Redefinição de senha com token de recuperação
   */
  public async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    if (!token || !newPassword || newPassword.length < 8) {
      throw new AuthError('Token inválido ou nova senha com menos de 8 caracteres.', 400);
    }

    const tokenHash = hashToken(token);

    const resetRes = await adminPool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id 
       FROM password_resets 
       WHERE token_hash = $1 
         AND used_at IS NULL 
         AND expires_at > NOW() 
       LIMIT 1;`,
      [tokenHash]
    );

    if (resetRes.rows.length === 0) {
      throw new AuthError('Token de redefinição inválido ou expirado.', 400);
    }

    const { id: resetId, user_id: userId } = resetRes.rows[0];
    const passwordHash = await hashPassword(newPassword);

    // Atualizar senha
    await adminPool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2;',
      [passwordHash, userId]
    );

    // Marcar token como utilizado
    await adminPool.query(
      'UPDATE password_resets SET used_at = NOW() WHERE id = $1;',
      [resetId]
    );

    // Revogar todas as sessões ativas do usuário para forçar novo login com a nova senha
    await adminPool.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1;',
      [userId]
    );

    return { success: true };
  }

  private async getUserMemberships(userId: string): Promise<MembershipInfo[]> {
    const res = await adminPool.query<{
      id: string;
      tenant_id: string;
      tenant_slug: string;
      trade_name: string;
      role: MembershipRole;
      is_active: boolean;
    }>(
      `SELECT m.id, m.tenant_id, t.slug as tenant_slug, t.trade_name, m.role, m.is_active
       FROM memberships m
       JOIN tenants t ON t.id = m.tenant_id
       WHERE m.user_id = $1 AND m.is_active = true;`,
      [userId]
    );

    return res.rows;
  }

  private async checkIsSuperadmin(userId: string): Promise<boolean> {
    const res = await adminPool.query<{ is_superadmin: boolean }>(
      'SELECT is_superadmin FROM platform_admins WHERE user_id = $1 LIMIT 1;',
      [userId]
    );
    return res.rows[0]?.is_superadmin === true;
  }
}

export const authService = new AuthService();
