import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@carx/ui';
import {
  Wrench,
  Lock,
  Mail,
  ShieldCheck,
  Building2,
  ArrowRight,
  KeyRound,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [showTenantField, setShowTenantField] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, verify2fa, cancel2fa, temp2faToken, user, role, loading, isOperador } = useAuth();
  const { whatsapp, name } = useBrand();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = (location.state as any)?.from?.pathname;

  // Redirecionamento automático se já estiver logado
  useEffect(() => {
    if (!loading && user && role) {
      if (isOperador) {
        navigate('/operador', { replace: true });
      } else {
        navigate(redirectPath || '/', { replace: true });
      }
    }
  }, [user, role, loading, isOperador, navigate, redirectPath]);

  // Submissão do Passo 1: Credenciais
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await signIn(email, password, tenantSlug || undefined);

      if (res.requires2fa) {
        // Aguarda entrada do código TOTP
        return;
      }

      // Redireciona com base no cargo
      const userRole = (res.role || '').toUpperCase();
      if (userRole === 'TECNICO' || userRole === 'OPERADOR') {
        navigate('/operador', { replace: true });
      } else {
        navigate(redirectPath || '/', { replace: true });
      }
    } catch (err: any) {
      let msg = 'Credenciais inválidas ou loja não encontrada.';
      if (err?.statusCode === 429) {
        msg = 'Muitas tentativas sem sucesso. Acesso temporariamente bloqueado por 15 minutos.';
      } else if (err?.statusCode === 403) {
        msg = 'Sua conta de usuário está inativa. Contate a administração da oficina.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submissão do Passo 2: Verificação 2FA TOTP
  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.trim().length !== 6) {
      setError('O código autenticador deve conter exatamente 6 dígitos numéricos.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await verify2fa(totpCode.trim());
      const userRole = (res.role || '').toUpperCase();
      if (userRole === 'TECNICO' || userRole === 'OPERADOR') {
        navigate('/operador', { replace: true });
      } else {
        navigate(redirectPath || '/', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Código autenticador inválido ou expirado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel2fa = () => {
    cancel2fa();
    setTotpCode('');
    setError(null);
  };

  if (loading && !user && !isSubmitting) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-asfalto gap-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-aco border-t-volt rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-volt rounded-full animate-ping"></div>
          </div>
        </div>
        <p className="text-muted text-xs font-semibold uppercase tracking-widest animate-pulse">
          Carregando ambiente seguro...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-asfalto relative overflow-hidden font-body px-4 py-8">
      {/* Background Decorativo CarX Dark Volt */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-volt/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-info/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#232A35_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center relative z-10">
        {/* Marca & Identidade CarX */}
        <div className="mb-8 text-center flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-16 h-16 bg-grafite border-2 border-volt/80 rounded-2xl flex items-center justify-center shadow-lg shadow-volt/10 mb-4 transition-transform hover:scale-105">
            <Wrench className="text-volt w-8 h-8 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-black text-texto tracking-tight uppercase">
              Car<span className="text-volt">X</span>
            </h1>
            <Badge variant="volt">PRO</Badge>
          </div>
          <p className="text-muted text-xs font-medium uppercase tracking-[0.2em] mt-1">
            {name ? `${name} · Gestão de Oficina` : 'Gestão Automotiva Inteligente'}
          </p>
        </div>

        {/* Card de Autenticação */}
        <Card className="w-full bg-grafite/95 backdrop-blur-xl border-aco shadow-2xl p-6 sm:p-8">
          {!temp2faToken ? (
            /* PASSO 1: Formulário Principal de Login */
            <div>
              <CardHeader className="text-left mb-6">
                <CardTitle className="text-xl font-bold text-texto">Acesse sua oficina</CardTitle>
                <CardDescription className="text-muted text-xs">
                  Insira suas credenciais corporativas para gerenciar pátio, ordens e equipe.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <Input
                  id="email"
                  type="email"
                  label="E-mail Corporativo"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gestor@oficina.com.br"
                  leftIcon={<Mail size={18} />}
                  autoComplete="email"
                />

                <Input
                  id="password"
                  type="password"
                  label="Senha de Acesso"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  leftIcon={<Lock size={18} />}
                  autoComplete="current-password"
                />

                {/* Slug da Oficina (Opcional / Multi-tenant) */}
                <div className="pt-1">
                  {!showTenantField ? (
                    <button
                      type="button"
                      onClick={() => setShowTenantField(true)}
                      className="text-xs text-muted hover:text-volt flex items-center gap-1.5 transition-colors font-medium"
                    >
                      <Building2 size={14} />
                      Informar código ou slug da loja (opcional)
                    </button>
                  ) : (
                    <Input
                      id="tenantSlug"
                      type="text"
                      label="Código da Loja (Slug)"
                      value={tenantSlug}
                      onChange={(e) => setTenantSlug(e.target.value)}
                      placeholder="ex: matriz-sp"
                      leftIcon={<Building2 size={18} />}
                      helperText="Preencha caso tenha acesso a múltiplas lojas com o mesmo e-mail."
                    />
                  )}
                </div>

                {/* Exibição de Erros */}
                {error && (
                  <div className="flex items-start gap-2.5 bg-error/10 border border-error/30 text-error p-3.5 rounded-input text-xs font-medium animate-in fade-in duration-200">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="volt"
                  size="desktop"
                  isLoading={isSubmitting}
                  className="w-full mt-2"
                  rightIcon={<ArrowRight size={18} />}
                >
                  Entrar no Pátio CarX
                </Button>
              </form>
            </div>
          ) : (
            /* PASSO 2: Desafio de 2FA TOTP */
            <div className="animate-in fade-in duration-300">
              <CardHeader className="text-center mb-6">
                <div className="w-12 h-12 bg-volt/10 border border-volt/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="text-volt w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-bold text-texto">Segundo Fator (2FA)</CardTitle>
                <CardDescription className="text-muted text-xs">
                  Abra o aplicativo autenticador (Google Authenticator ou Authy) e digite o código de 6 dígitos.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleTotpSubmit} className="space-y-5">
                <div className="flex flex-col items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-56 h-14 text-center text-2xl tracking-[0.4em] font-display font-bold text-texto bg-aco/70 border-2 border-linha rounded-input focus:outline-none focus:border-volt focus:ring-2 focus:ring-volt transition-all"
                  />
                  <span className="text-[11px] text-muted mt-2 font-medium">Código dinâmico de 6 dígitos</span>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 bg-error/10 border border-error/30 text-error p-3 rounded-input text-xs font-medium">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="volt"
                    size="desktop"
                    isLoading={isSubmitting}
                    className="w-full"
                    rightIcon={<ShieldCheck size={18} />}
                  >
                    Confirmar e Entrar
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel2fa}
                    leftIcon={<ArrowLeft size={16} />}
                  >
                    Voltar para Login
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Rodapé do Card: Suporte e Recuperação */}
          <div className="mt-6 pt-5 border-t border-aco text-center flex flex-col items-center gap-2">
            <p className="text-xs text-muted font-medium">
              Esqueceu sua senha?{' '}
              <a
                href={
                  whatsapp
                    ? `https://wa.me/55${whatsapp.replace(/\D/g, '')}?text=Olá,%20solicito%20redefinição%20de%20senha%20no%20sistema%20CarX.`
                    : 'mailto:suporte@carx.com.br?subject=Recuperação%20de%20Acesso%20CarX'
                }
                target="_blank"
                rel="noreferrer"
                className="text-volt hover:underline font-semibold"
              >
                Fale com o Administrador
              </a>
            </p>
          </div>
        </Card>

        {/* Rodapé Seguro */}
        <div className="mt-8 flex items-center justify-center gap-3 text-muted/60 text-[11px] uppercase tracking-wider font-semibold">
          <ShieldCheck size={14} className="text-volt/70" />
          <span>CarX Engine v3.0 · Conexão Criptografada SSL</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

