import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  adminApi,
  PlatformBillingSettingsDto,
  TestGatewayResultDto,
} from '../services/api';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Key,
  Copy,
  Check,
  ExternalLink,
  Lock,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Server,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export function PlatformSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Estados de Configuração
  const [gateway, setGateway] = useState('mercadopago');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cnpj');
  const [apiKey, setApiKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState(5);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Estados de Interface e Feedback
  const [loading, setLoading] = useState(true);
  const [savingGateway, setSavingGateway] = useState(false);
  const [testingGateway, setTestingGateway] = useState(false);
  const [testResult, setTestResult] = useState<TestGatewayResultDto | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // URL dinâmica do webhook de faturamento
  const apiBase = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3333` : 'http://137.131.151.125:3333');
  const webhookUrl = `${apiBase.replace(/\/+$/, '')}/billing/webhook`;

  useEffect(() => {
    fetchSettings();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPlatformBillingSettings();
      if (data) {
        setGateway(data.payment_gateway || data.gateway || 'mercadopago');
        setEnvironment(data.environment || (data.sandbox_mode ? 'sandbox' : 'production'));
        setPixKey(data.pix_key || '');
        setPixKeyType(data.pix_key_type || 'cnpj');
        setPublicKey(data.gateway_public_key || data.public_key || '');
        setGracePeriodDays(Number(data.grace_period_days || 5));
        setHasApiKey(Boolean(data.has_api_key || data.hasAccessToken));
        if (data.gateway_api_key || data.access_token) {
          setApiKey(data.gateway_api_key || data.access_token || '');
        }
        if (data.webhook_secret) {
          setWebhookSecret(data.webhook_secret);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações da plataforma:', err);
      showNotification('error', err.message || 'Erro ao carregar parâmetros da plataforma.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGateway(true);
    setFeedback(null);
    try {
      const payload = {
        payment_gateway: gateway,
        environment,
        sandbox_mode: environment === 'sandbox',
        pix_key: pixKey,
        pix_key_type: pixKeyType,
        gateway_api_key: apiKey,
        access_token: apiKey,
        gateway_public_key: publicKey,
        public_key: publicKey,
        webhook_secret: webhookSecret,
        grace_period_days: Number(gracePeriodDays),
      };

      const res = await adminApi.savePlatformBillingSettings(payload);
      if (res) {
        if (res.has_api_key !== undefined) setHasApiKey(res.has_api_key);
        if (res.gateway_api_key) setApiKey(res.gateway_api_key);
      }
      showNotification('success', 'Configurações de cobrança do SaaS salvas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar cobrança:', err);
      showNotification('error', err.message || 'Erro ao salvar as configurações.');
    } finally {
      setSavingGateway(false);
    }
  };

  const handleTestGateway = async () => {
    setTestingGateway(true);
    setTestResult(null);
    try {
      const res = await adminApi.testGatewayConnection({
        payment_gateway: gateway,
        gateway_api_key: apiKey,
      });
      setTestResult(res);
      if (res.success) {
        showNotification('success', res.message || 'Conexão validada com sucesso!');
      } else {
        showNotification('error', res.message || 'Falha na validação das credenciais.');
      }
    } catch (err: any) {
      const failObj: TestGatewayResultDto = {
        success: false,
        message: err.message || 'Erro ao conectar à API do gateway de pagamento.',
      };
      setTestResult(failObj);
      showNotification('error', failObj.message);
    } finally {
      setTestingGateway(false);
    }
  };

  const handleCopyWebhook = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(webhookUrl);
      } else {
        const input = document.createElement('input');
        input.value = webhookUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedWebhook(true);
      showNotification('success', 'URL do Webhook copiada com sucesso!');
      setTimeout(() => setCopiedWebhook(false), 3000);
    } catch (err) {
      showNotification('error', 'Não foi possível copiar automaticamente para a área de transferência.');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente encerrar a sessão de Super Administrador do CarX?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-6xl mx-auto">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              Configurações da Plataforma
            </h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-volt text-asfalto shadow-sm">
              SaaS Master
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
            Gerencie o gateway de cobrança das mensalidades das oficinas, chave PIX oficial, webhooks e segurança mestre.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-aco/40 hover:bg-aco text-xs font-semibold text-texto transition-colors border border-aco/50 cursor-pointer self-start sm:self-center"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-volt' : 'text-muted'} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Banner de Feedback Global */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <XCircle size={16} className="text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-muted hover:text-white text-xs font-bold px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-20 text-center text-xs text-muted italic flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-volt" />
          <span>Carregando parâmetros globais da plataforma CarX...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card 1: Cobrança Automática do SaaS & Gateway Master */}
          <div className="rounded-2xl border border-aco/50 bg-grafite/90 shadow-xl p-6 sm:p-7 space-y-6">
            {/* Topo do Card com Seletor de Ambiente */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-aco/40">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-volt/10 border border-volt/30 flex items-center justify-center text-volt">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg sm:text-xl text-white">
                    Gateway de Pagamento SaaS & Chave PIX
                  </h3>
                  <p className="text-xs text-muted">
                    Configurações de recebimento das mensalidades pagas pelas oficinas clientes.
                  </p>
                </div>
              </div>

              {/* Seletor de Ambiente Sandbox / Produção */}
              <div className="flex items-center gap-2.5 self-start sm:self-center">
                <span className="text-xs text-muted font-medium">Ambiente:</span>
                <div className="inline-flex rounded-xl p-1 bg-asfalto border border-aco/60">
                  <button
                    type="button"
                    onClick={() => setEnvironment('sandbox')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      environment === 'sandbox'
                        ? 'bg-volt text-asfalto shadow-sm shadow-volt/20'
                        : 'text-muted hover:text-texto'
                    }`}
                  >
                    Sandbox (Testes)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironment('production')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      environment === 'production'
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'text-muted hover:text-texto'
                    }`}
                  >
                    Produção (Real)
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveGateway} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Provedor de Pagamento */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Provedor / Gateway Integrado
                  </label>
                  <select
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                    className="w-full text-xs bg-asfalto/80 border border-aco/70 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-volt transition-colors cursor-pointer"
                  >
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="sandbox">Simulador Sandbox (Nativo CarX)</option>
                    <option value="asaas">Asaas Pagamentos</option>
                    <option value="stripe">Stripe</option>
                  </select>
                  <p className="text-[11px] text-muted/80 mt-1">
                    Processa a geração do QR Code e a baixa automática das mensalidades do software.
                  </p>
                </div>

                {/* Dias de Carência Padrão */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Tolerância de Carência (Grace Period)
                  </label>
                  <select
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                    className="w-full text-xs bg-asfalto/80 border border-aco/70 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-volt transition-colors cursor-pointer"
                  >
                    <option value={3}>3 dias de carência</option>
                    <option value={5}>5 dias de carência (Recomendado)</option>
                    <option value={7}>7 dias de carência</option>
                    <option value={10}>10 dias de carência</option>
                  </select>
                  <p className="text-[11px] text-muted/80 mt-1">
                    Prazo em que a oficina continua funcionando normalmente após o vencimento antes do bloqueio gradual.
                  </p>
                </div>

                {/* Chave PIX Oficial da Plataforma */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Chave PIX Institucional do SaaS
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value)}
                      className="w-32 text-xs bg-asfalto/80 border border-aco/70 rounded-xl px-2.5 py-2.5 text-white outline-none focus:border-volt cursor-pointer"
                    >
                      <option value="cnpj">CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Celular</option>
                      <option value="random">Aleatória</option>
                    </select>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="ex: 12.345.678/0001-99 ou financeiro@carx.com.br"
                      className="flex-1 text-xs bg-asfalto/80 border border-aco/70 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-volt font-mono placeholder:text-muted/50"
                    />
                  </div>
                  <p className="text-[11px] text-muted/80 mt-1">
                    Utilizada na montagem do payload EMV BR Code dos QR Codes das faturas de mensalidade.
                  </p>
                </div>

                {/* Token Privado de API */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                      Access Token / Chave Privada da API
                    </label>
                    {hasApiKey && (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        Criptografia Ativa (AES-256)
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        hasApiKey
                          ? 'Chave protegida no banco. Digite nova para alterar.'
                          : 'Cole sua chave de API aqui'
                      }
                      className="w-full text-xs font-mono bg-asfalto/80 border border-aco/70 rounded-xl px-3.5 py-2.5 pr-10 text-white outline-none focus:border-volt placeholder:text-muted/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 text-muted hover:text-white p-1 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={testingGateway}
                      onClick={handleTestGateway}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-aco/60 bg-asfalto hover:bg-aco/50 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {testingGateway ? (
                        <>
                          <RefreshCw size={13} className="animate-spin text-volt" />
                          <span>Validando no Mercado Pago...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={13} className="text-volt" />
                          <span>Testar Conexão com Gateway</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-muted">
                      {gateway === 'mercadopago'
                        ? 'Copie o "Access Token" (APP_USR-)'
                        : 'Valida conexão oficial'}
                    </span>
                  </div>

                  {/* Diagnóstico em tempo real */}
                  {testResult && (
                    <div
                      className={`mt-3 p-3.5 rounded-xl text-xs border animate-fade-in ${
                        testResult.success
                          ? testResult.is_sandbox && environment === 'production'
                            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                            : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {testResult.success ? (
                          testResult.is_sandbox && environment === 'production' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          )
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <p className="font-semibold leading-tight">{testResult.message}</p>
                          {testResult.nickname && (
                            <div className="text-[11px] opacity-90 space-y-0.5 pt-1 font-mono">
                              <div>
                                Conta: <strong>{testResult.nickname}</strong> ({testResult.email || 'sem e-mail'})
                              </div>
                              <div>
                                Ambiente da Chave:{' '}
                                <strong>{testResult.is_sandbox ? 'Sandbox (Testes)' : 'Produção Real'}</strong> • País:{' '}
                                <strong>{testResult.country || 'MLB'}</strong>
                              </div>
                            </div>
                          )}
                          {testResult.is_sandbox && environment === 'production' && (
                            <p className="text-[11px] font-bold text-amber-300 pt-1">
                              Aviso Crítico: Chaves TEST- não podem ser pagas por aplicativos bancários reais (Nubank, Itaú, etc.). Para testes reais de R$ 1, utilize as Credenciais de Produção.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chave Pública */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Public Key (Opcional)
                  </label>
                  <input
                    type="text"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder="Cole a chave pública se exigida pelo provedor"
                    className="w-full text-xs font-mono bg-asfalto/80 border border-aco/70 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-volt placeholder:text-muted/50"
                  />
                  <p className="text-[11px] text-muted/80 mt-1">
                    Utilizada em integrações client-side com SDKs ou checkout transparente.
                  </p>
                </div>

                {/* Segredo do Webhook */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Webhook Secret / Assinatura (Opcional)
                  </label>
                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Segredo para validação de integridade HMAC"
                    className="w-full text-xs font-mono bg-asfalto/80 border border-aco/70 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-volt placeholder:text-muted/50"
                  />
                  <p className="text-[11px] text-muted/80 mt-1">
                    Garante que os disparos recebidos foram originados legitimamente pelo Mercado Pago.
                  </p>
                </div>
              </div>

              {/* Caixa da URL de Webhook para colar no Gateway */}
              <div className="p-4 rounded-xl bg-asfalto/90 border border-aco/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Server size={14} className="text-volt" />
                    URL do Webhook para Baixa Automática de Faturas
                  </span>
                  <span className="text-[11px] text-muted">Cole no painel do seu gateway</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full text-xs font-mono bg-grafite text-muted px-3.5 py-2.5 pr-28 rounded-xl border border-aco/50 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className={`absolute right-1 top-1 bottom-1 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      copiedWebhook
                        ? 'bg-emerald-600 text-white'
                        : 'bg-volt hover:bg-volt/90 text-asfalto'
                    }`}
                  >
                    {copiedWebhook ? (
                      <>
                        <Check size={13} />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Botão de Submissão */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingGateway}
                  className="px-6 py-2.5 rounded-xl bg-volt hover:bg-volt/90 text-asfalto text-xs font-bold transition-all shadow-md shadow-volt/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check size={15} />
                  <span>{savingGateway ? 'Salvando Parâmetros...' : 'Salvar Configurações de Cobrança'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Segurança & Conta Master (2FA e Senha) */}
          <div className="rounded-2xl border border-aco/50 bg-grafite/90 shadow-xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-aco/40">
              <div className="w-11 h-11 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl text-white">
                  Segurança & Conta Master
                </h3>
                <p className="text-xs text-muted">
                  Governança da credencial suprema do SaaS e proteção por Segundo Fator (2FA TOTP).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 rounded-xl bg-asfalto/90 border border-aco/60 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted font-bold">
                  E-mail do Administrador Master
                </span>
                <p className="text-sm font-bold text-white font-mono">{user?.email || 'admin@carx.com.br'}</p>
                <p className="text-xs text-muted pt-1">
                  Identificador raiz com permissão para gerenciar planos, faturas e auditoria de todas as oficinas.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-asfalto/90 border border-aco/60 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-muted font-bold">
                      Segundo Fator (2FA TOTP)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                      Protegido (C13)
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Exige código de 6 dígitos via Google Authenticator / Authy no momento do login.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Encerramento de Sessão */}
          <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400 shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Encerrar Sessão Mestre
                </h4>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  Finalize seu acesso ao Painel de Controle SaaS para garantir que nenhum terminal permaneça logado.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl border border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              Sair do Sistema Agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlatformSettingsPage;
