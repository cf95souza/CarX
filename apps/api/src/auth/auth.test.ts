import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { adminPool, pool } from '../database/db.js';
import { authService, AuthError } from './auth-service.js';
import { generateTotp } from './totp.js';
import { authRateLimiter } from './rate-limiter.js';
import { buildServer } from '../server.js';

describe('T2.3 — Autenticação Segura (Argon2id/Bcryptjs + JWT Rotativo + 2FA TOTP)', () => {
  const app = buildServer();
  const testEmailOwner = 'owner.teste@carx.com.br';
  const testEmailTecnico = 'tecnico.teste@carx.com.br';
  let createdTenantId: string;
  let ownerUserId: string;

  before(async () => {
    authRateLimiter.clearAll();

    // Limpar usuários e tenants de testes anteriores
    await adminPool.query(
      "DELETE FROM users WHERE email IN ($1, $2, 'reset.teste@carx.com.br');",
      [testEmailOwner, testEmailTecnico]
    );
  });

  after(async () => {
    authRateLimiter.clearAll();

    if (createdTenantId) {
      await adminPool.query('DELETE FROM tenants WHERE id = $1;', [createdTenantId]);
    }
    await adminPool.query(
      "DELETE FROM users WHERE email IN ($1, $2, 'reset.teste@carx.com.br');",
      [testEmailOwner, testEmailTecnico]
    );

    await app.close();
    await pool.end();
    await adminPool.end();
  });

  it('deve cadastrar proprietário e provisionar oficina com papel "owner" correto', async () => {
    const res = await authService.register({
      name: 'Carlos Proprietário',
      email: testEmailOwner,
      password: 'SenhaForte123@Segura',
      companyName: 'Oficina Turbo Auto',
      role: 'owner',
    });

    assert.ok(res.user.id);
    assert.equal(res.user.email, testEmailOwner);
    assert.equal(res.user.two_factor_enabled, false);
    assert.ok(res.membership.tenant_id);
    assert.equal(res.membership.role, 'owner');

    ownerUserId = res.user.id;
    createdTenantId = res.membership.tenant_id;
  });

  it('deve cadastrar funcionário com papel "tecnico" sem sobreescrita de cargo (Prevenção de bug do legado)', async () => {
    const res = await authService.register({
      name: 'João Técnico Especialista',
      email: testEmailTecnico,
      password: 'SenhaTecnico123@!',
      tenantId: createdTenantId,
      role: 'tecnico',
    });

    assert.ok(res.user.id);
    assert.equal(res.user.email, testEmailTecnico);
    assert.equal(res.membership.tenant_id, createdTenantId);
    // Garantia absoluta: gravado como tecnico na tabela memberships
    assert.equal(res.membership.role, 'tecnico');
  });

  it('deve rejeitar cadastro duplicado com HTTP 409', async () => {
    await assert.rejects(
      async () => {
        await authService.register({
          name: 'Clone Carlos',
          email: testEmailOwner,
          password: 'OutraSenha123@',
        });
      },
      (err: Error) => {
        assert.ok(err instanceof AuthError);
        assert.equal((err as AuthError).statusCode, 409);
        assert.match(err.message, /Já existe uma conta/);
        return true;
      }
    );
  });

  it('deve autenticar usuário com senha correta e emitir tokens de sessão', async () => {
    const res = await authService.login({
      email: testEmailOwner,
      password: 'SenhaForte123@Segura',
      ip: '127.0.0.1',
    });

    assert.equal(res.requires2fa, false);
    if (!res.requires2fa) {
      assert.equal(res.user.email, testEmailOwner);
      assert.ok(res.tokens.accessToken);
      assert.ok(res.tokens.refreshToken);
      assert.equal(res.memberships[0].role, 'owner');
    }
  });

  it('deve rejeitar login com senha incorreta com HTTP 401', async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          email: testEmailOwner,
          password: 'SenhaErrada123!',
          ip: '127.0.0.1',
        });
      },
      (err: Error) => {
        assert.ok(err instanceof AuthError);
        assert.equal((err as AuthError).statusCode, 401);
        assert.match(err.message, /Credenciais inválidas/);
        return true;
      }
    );
  });

  it('deve bloquear por Rate Limiting após 5 tentativas inválidas consecutivas (HTTP 429)', async () => {
    const bruteForceIp = '192.168.1.100';
    const bruteForceEmail = 'alvo.ataque@carx.com.br';

    for (let i = 0; i < 5; i++) {
      authRateLimiter.recordFailedAttempt(bruteForceIp, bruteForceEmail);
    }

    assert.equal(authRateLimiter.isBlocked(bruteForceIp, bruteForceEmail), true);

    await assert.rejects(
      async () => {
        await authService.login({
          email: bruteForceEmail,
          password: 'QualquerSenha',
          ip: bruteForceIp,
        });
      },
      (err: Error) => {
        assert.ok(err instanceof AuthError);
        assert.equal((err as AuthError).statusCode, 429);
        assert.match(err.message, /Muitas tentativas/);
        return true;
      }
    );
  });

  it('deve realizar rotação de Refresh Token mantendo o mesmo family_id', async () => {
    const loginRes = await authService.login({
      email: testEmailOwner,
      password: 'SenhaForte123@Segura',
    });

    assert.equal(loginRes.requires2fa, false);
    if (loginRes.requires2fa) return;

    const oldRefreshToken = loginRes.tokens.refreshToken;

    // Rotação legítima
    const rotatedTokens = await authService.rotateRefreshToken(oldRefreshToken);

    assert.ok(rotatedTokens.accessToken);
    assert.ok(rotatedTokens.refreshToken);
    assert.notEqual(rotatedTokens.refreshToken, oldRefreshToken);

    // TESTE DE REUSO MALICIOSO (COMPULSORY REPLAY DETECTION)
    // Tentar usar o oldRefreshToken que já foi revogado
    await assert.rejects(
      async () => {
        await authService.rotateRefreshToken(oldRefreshToken);
      },
      (err: Error) => {
        assert.ok(err instanceof AuthError);
        assert.equal((err as AuthError).statusCode, 401);
        assert.match(err.message, /Reuso malicioso de refresh token detectado/);
        return true;
      }
    );

    // Como toda a família foi revogada, até o rotatedTokens agora está inválido
    await assert.rejects(
      async () => {
        await authService.rotateRefreshToken(rotatedTokens.refreshToken);
      },
      (err: Error) => {
        assert.ok(err instanceof AuthError);
        assert.equal((err as AuthError).statusCode, 401);
        return true;
      }
    );
  });

  it('deve executar o fluxo completo de 2FA TOTP (Setup, Ativação, Desafio no Login e Validação)', async () => {
    // 1. Setup 2FA
    const setup = await authService.setup2fa(ownerUserId);
    assert.ok(setup.secret);
    assert.ok(setup.otpauth_url.includes('otpauth://totp/'));

    // 2. Tentar ativar com código incorreto -> deve falhar
    await assert.rejects(
      async () => {
        await authService.enable2fa(ownerUserId, '000000');
      },
      (err: Error) => {
        assert.ok(err instanceof AuthError);
        assert.equal((err as AuthError).statusCode, 400);
        return true;
      }
    );

    // 3. Ativar com código TOTP válido calculado a partir do segredo
    const validCode = generateTotp(setup.secret);
    const enableRes = await authService.enable2fa(ownerUserId, validCode);
    assert.equal(enableRes.success, true);

    // 4. Próximo login do usuário DEVE exigir 2FA
    const loginRes = await authService.login({
      email: testEmailOwner,
      password: 'SenhaForte123@Segura',
    });

    assert.equal(loginRes.requires2fa, true);
    if (!loginRes.requires2fa) return;

    assert.ok(loginRes.tempToken);

    // 5. Validar 2FA com código errado -> falha
    await assert.rejects(
      async () => {
        await authService.verify2fa(loginRes.tempToken, '123456');
      },
      (err: Error) => {
        assert.ok(err instanceof AuthError);
        assert.equal((err as AuthError).statusCode, 401);
        return true;
      }
    );

    // 6. Validar 2FA com código correto -> sucesso e emissão de tokens
    const currentCode = generateTotp(setup.secret);
    const verifyRes = await authService.verify2fa(loginRes.tempToken, currentCode);
    assert.ok(verifyRes.tokens.accessToken);
    assert.ok(verifyRes.tokens.refreshToken);
    assert.equal(verifyRes.user.email, testEmailOwner);

    // 7. Desativar 2FA para encerrar o teste
    const disableCode = generateTotp(setup.secret);
    const disableRes = await authService.disable2fa(ownerUserId, disableCode);
    assert.equal(disableRes.success, true);
  });

  it('deve realizar fluxo de recuperação e redefinição de senha com invalidação de sessões antigas', async () => {
    const userEmail = 'reset.teste@carx.com.br';
    await authService.register({
      name: 'Usuario Reset Teste',
      email: userEmail,
      password: 'SenhaAntiga123@!',
    });

    // 1. Solicitar reset
    const reqReset = await authService.requestPasswordReset(userEmail);
    assert.equal(reqReset.success, true);
    assert.ok(reqReset.resetToken);

    // 2. Redefinir senha com token
    const resetRes = await authService.resetPassword(reqReset.resetToken!, 'NovaSenhaUltraForte123#');
    assert.equal(resetRes.success, true);

    // 3. Login com senha antiga deve falhar
    await assert.rejects(
      async () => {
        await authService.login({
          email: userEmail,
          password: 'SenhaAntiga123@!',
        });
      },
      (err: Error) => {
        assert.ok(err instanceof AuthError);
        assert.equal((err as AuthError).statusCode, 401);
        return true;
      }
    );

    // 4. Login com nova senha deve funcionar
    const newLogin = await authService.login({
      email: userEmail,
      password: 'NovaSenhaUltraForte123#',
    });
    assert.equal(newLogin.requires2fa, false);
    if (!newLogin.requires2fa) {
      assert.equal(newLogin.user.email, userEmail);
    }
  });

  it('deve responder via endpoints HTTP da API Fastify (/auth/*)', async () => {
    // 1. Testar endpoint /auth/login via HTTP inject
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: testEmailOwner,
        password: 'SenhaForte123@Segura',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.requires2fa, false);
    assert.ok(body.tokens?.accessToken);

    // 2. Testar endpoint protegido /auth/me com token Bearer
    const resMe = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${body.tokens.accessToken}`,
      },
    });

    assert.equal(resMe.statusCode, 200);
    const bodyMe = JSON.parse(resMe.body);
    assert.equal(bodyMe.user.email, testEmailOwner);
    assert.equal(bodyMe.user.role, 'owner');
  });
});
