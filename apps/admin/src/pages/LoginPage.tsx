import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, Mail, KeyRound, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';

export function LoginPage() {
  const { login, verify2FA, cancel2FA, requires2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login({ email, password });
      if (!result.requires2FA) {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await verify2FA(twoFactorCode);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Código 2FA inválido ou expirado.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-asfalto flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-volt mb-3 shadow-lg shadow-volt/20">
            <span className="font-display font-extrabold text-2xl text-asfalto">CX</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Car<span className="text-volt">X</span> Super Admin
          </h1>
          <p className="text-xs text-muted mt-1.5">
            Portal Corporativo de Gestão Global e Governança SaaS
          </p>
        </div>

        {/* Card */}
        <div className="bg-grafite border border-aco/50 rounded-card p-6 md:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle accent glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-volt/10 rounded-full blur-3xl pointer-events-none" />

          {error && (
            <div className="mb-5 p-3.5 rounded-btn bg-semantic-error/10 border border-semantic-error/30 flex items-start gap-3 text-semantic-error text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!requires2FA ? (
            /* Passo 1: Credenciais */
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
                  E-mail Administrativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@carx.com.br"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-asfalto/80 border border-aco rounded-input text-texto text-sm placeholder:text-muted/50 focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
                  Senha Master
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-asfalto/80 border border-aco rounded-input text-texto text-sm placeholder:text-muted/50 focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-volt/20 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-asfalto/30 border-t-asfalto rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Autenticar no Sistema</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-aco/30 flex items-center justify-center gap-2 text-[11px] text-muted">
                <Shield size={13} className="text-volt" />
                <span>Ambiente restrito com auditoria imutável</span>
              </div>
            </form>
          ) : (
            /* Passo 2: Segundo Fator (2FA TOTP) */
            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div className="text-center pb-2">
                <div className="w-12 h-12 rounded-full bg-volt/10 border border-volt/30 text-volt mx-auto flex items-center justify-center mb-3">
                  <KeyRound size={22} />
                </div>
                <h3 className="font-display font-semibold text-base text-texto">
                  Autenticação de Dois Fatores
                </h3>
                <p className="text-xs text-muted mt-1">
                  Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador (Google Authenticator, Authy ou 1Password).
                </p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] font-display font-bold text-2xl py-3 bg-asfalto border border-aco rounded-input text-volt placeholder:text-muted/30 focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length < 6}
                  className="w-full py-3 px-4 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-asfalto/30 border-t-asfalto rounded-full animate-spin" />
                  ) : (
                    <span>Validar Código 2FA</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={cancel2FA}
                  className="w-full py-2 text-xs text-muted hover:text-texto flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Voltar para login</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-muted">
          CarX Platform v2.0 • Protegido por RLS e Criptografia em Trânsito
        </div>
      </div>
    </div>
  );
}

