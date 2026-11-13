import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../../services/api';
import {
  TenantWhatsAppInstanceDto,
  ConnectWhatsAppResponseDto,
} from '@carx/shared';
import {
  MessageSquare,
  QrCode,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  LogOut,
  Smartphone,
  Copy,
  Check,
  ShieldAlert,
  Info,
} from 'lucide-react';

export default function WhatsAppManager() {
  const [instance, setInstance] = useState<TenantWhatsAppInstanceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureDisabled, setFeatureDisabled] = useState(false);

  // Form State
  const [method, setMethod] = useState<'pairing_code' | 'qr_code'>('pairing_code');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [connectResult, setConnectResult] = useState<ConnectWhatsAppResponseDto | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Test Message State
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadInstance = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.whatsapp.getInstance();
      setInstance(data);
      if (data.phone_number && !phoneNumber) {
        setPhoneNumber(data.phone_number);
      }
    } catch (err: any) {
      if (err instanceof ApiError && (err.statusCode === 403 || err.message?.includes('FEATURE_DISABLED'))) {
        setFeatureDisabled(true);
      } else {
        setError(err?.message || 'Falha ao consultar status do WhatsApp.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstance();
  }, []);

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActionLoading(true);
    setError(null);
    setConnectResult(null);
    try {
      const res = await api.whatsapp.connect({
        method,
        phone_number: phoneNumber,
      });
      setConnectResult(res);
      await loadInstance();
    } catch (err: any) {
      if (err instanceof ApiError && (err.statusCode === 403 || err.message?.includes('FEATURE_DISABLED'))) {
        setFeatureDisabled(true);
      } else {
        setError(err?.message || 'Erro ao iniciar conexão do WhatsApp.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar o WhatsApp da sua oficina? Os envios automáticos serão pausados até nova conexão.')) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await api.whatsapp.disconnect();
      setConnectResult(null);
      await loadInstance();
    } catch (err: any) {
      setError(err?.message || 'Falha ao desconectar.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return;
    setTestSending(true);
    setTestResult(null);
    try {
      await api.whatsapp.sendTestMessage({
        to: testPhone,
        message: '🏁 Olá! Teste de integração do WhatsApp realizado com sucesso pelo sistema CarX da sua oficina!',
      });
      setTestResult('Mensagem de teste enviada com sucesso!');
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar mensagem de teste.');
    } finally {
      setTestSending(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (featureDisabled) {
    return (
      <div className="p-6 rounded-card bg-grafite border border-aco/50 space-y-4">
        <div className="flex items-center gap-3 text-semantic-alert">
          <ShieldAlert size={28} />
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Gateway de WhatsApp Não Habilitado
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Esta funcionalidade não está contemplada no plano atual da sua oficina.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-btn bg-asfalto/60 border border-aco/30 text-xs text-texto space-y-2">
          <p>
            Com o Gateway de WhatsApp conectado, sua oficina ganha:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted text-[11px]">
            <li>Envio automático de orçamentos e laudos de vistoria (VCR).</li>
            <li>Notificação em tempo real quando o veículo estiver pronto para retirada.</li>
            <li>Envio de código de segurança (OTP) para o portal do cliente "Meu Veículo".</li>
            <li>Disparo automático de pesquisas NPS de satisfação e garantias digitais.</li>
          </ul>
        </div>
        <p className="text-xs text-muted italic">
          Entre em contato com o suporte ou faça upgrade do plano da sua loja para liberar o WhatsApp Gateway.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-card bg-grafite border border-aco/50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              WhatsApp da Sua Oficina
            </h3>
            <p className="text-xs text-muted">
              Conecte o número oficial da sua oficina para envio de orçamentos, laudos, avisos e login seguro dos clientes.
            </p>
          </div>
        </div>

        <button
          onClick={loadInstance}
          disabled={loading || actionLoading}
          className="px-3.5 py-2 bg-aco/50 hover:bg-aco text-texto rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar Status</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-card bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline font-semibold ml-2">
            Fechar
          </button>
        </div>
      )}

      {/* Estado 1: CONECTADO */}
      {instance?.status === 'CONNECTED' ? (
        <div className="space-y-6">
          <div className="p-6 rounded-card bg-emerald-500/10 border border-emerald-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-base text-white">WhatsApp Conectado</h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-asfalto">
                      Online
                    </span>
                  </div>
                  <p className="font-mono text-sm font-semibold text-emerald-400 mt-0.5">
                    +{instance.phone_number || phoneNumber}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDisconnect}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <LogOut size={14} />
                <span>Desconectar Aparelho</span>
              </button>
            </div>

            {/* Quota Diária de Disparos */}
            <div className="pt-4 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-muted block text-[10px] uppercase font-semibold">Disparos Hoje</span>
                <span className="font-display font-bold text-xl text-white">
                  {instance.daily_messages_count}{' '}
                  <span className="text-xs text-muted font-normal">/ {instance.daily_limit}</span>
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted block text-[10px] uppercase font-semibold mb-1">
                  Consumo Diário Anti-Bloqueio
                </span>
                <div className="w-full h-2 bg-aco rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (instance.daily_messages_count / (instance.daily_limit || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted block mt-1">
                  O limite diário protege a reputação do seu número contra bloqueios do WhatsApp.
                </span>
              </div>
            </div>
          </div>

          {/* Teste Rápido de Disparo */}
          <div className="p-5 rounded-card bg-grafite border border-aco/50 space-y-3">
            <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Send size={15} className="text-volt" /> Enviar Mensagem de Teste
            </h4>
            <p className="text-xs text-muted">
              Envie uma mensagem de verificação para o seu próprio celular para comprovar que o WhatsApp da oficina está disparando perfeitamente.
            </p>
            <form onSubmit={handleSendTest} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                required
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Ex: 11988887777 (com DDD)"
                className="flex-1 p-2.5 bg-asfalto border border-aco rounded-input text-xs font-mono text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
              />
              <button
                type="submit"
                disabled={testSending || !testPhone}
                className="px-4 py-2.5 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-volt/20 disabled:opacity-50"
              >
                {testSending ? (
                  <div className="w-4 h-4 border-2 border-asfalto/30 border-t-asfalto rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={14} />
                    <span>Enviar Teste</span>
                  </>
                )}
              </button>
            </form>
            {testResult && (
              <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={13} />
                <span>{testResult}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Estado 2: DESCONECTADO OU EM PAREAMENTO */
        <div className="space-y-6">
          <div className="p-6 rounded-card bg-grafite border border-aco/50 space-y-5">
            <div className="space-y-1">
              <h4 className="font-display font-bold text-base text-white">Conectar WhatsApp da Oficina</h4>
              <p className="text-xs text-muted">
                Escolha o método mais prático para conectar o WhatsApp da sua loja.
              </p>
            </div>

            {/* Alternador de Método */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('pairing_code')}
                className={`p-3.5 rounded-card border text-left transition-all ${
                  method === 'pairing_code'
                    ? 'bg-volt/10 border-volt shadow-sm shadow-volt/20'
                    : 'bg-asfalto/50 border-aco/40 hover:border-aco text-muted'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Smartphone size={16} className={method === 'pairing_code' ? 'text-volt' : 'text-muted'} />
                  <span className="font-display font-bold text-xs text-white">Código de Pareamento</span>
                </div>
                <p className="text-[11px] text-muted">
                  Mais fácil: digite o código de 8 dígitos no seu celular sem precisar usar câmera.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMethod('qr_code')}
                className={`p-3.5 rounded-card border text-left transition-all ${
                  method === 'qr_code'
                    ? 'bg-volt/10 border-volt shadow-sm shadow-volt/20'
                    : 'bg-asfalto/50 border-aco/40 hover:border-aco text-muted'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <QrCode size={16} className={method === 'qr_code' ? 'text-volt' : 'text-muted'} />
                  <span className="font-display font-bold text-xs text-white">QR Code</span>
                </div>
                <p className="text-[11px] text-muted">
                  Aponte a câmera do WhatsApp para escanear o código na tela do computador.
                </p>
              </button>
            </div>

            {/* Formulário de Pareamento */}
            <form onSubmit={handleConnect} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
                  Número de Telefone do WhatsApp da Oficina *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ex: 11999998888 (com DDD)"
                    className="flex-1 p-2.5 bg-asfalto border border-aco rounded-input text-xs font-mono text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !phoneNumber}
                    className="px-5 py-2.5 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-volt/20 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <div className="w-4 h-4 border-2 border-asfalto/30 border-t-asfalto rounded-full animate-spin" />
                    ) : (
                      <>
                        <Radio size={14} />
                        <span>{method === 'pairing_code' ? 'Gerar Código' : 'Gerar QR Code'}</span>
                      </>
                    )}
                  </button>
                </div>
                <span className="text-[11px] text-muted block mt-1">
                  Informe o número exatamente como cadastrado no WhatsApp (DDD + número).
                </span>
              </div>
            </form>

            {/* Exibição do Código de Pareamento */}
            {(connectResult?.pairing_code || instance?.pairing_code) && (
              <div className="p-4 rounded-card bg-volt/10 border border-volt/30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-volt tracking-wider">
                      Código de Pareamento Gerado
                    </span>
                    <h5 className="font-display font-bold text-2xl text-white tracking-widest mt-0.5">
                      {connectResult?.pairing_code || instance?.pairing_code}
                    </h5>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCode(connectResult?.pairing_code || instance?.pairing_code || '')
                    }
                    className="px-3 py-1.5 bg-asfalto hover:bg-aco text-texto rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-colors border border-aco"
                  >
                    {copiedCode ? <Check size={13} className="text-volt" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-btn bg-asfalto/70 border border-aco/30 text-xs text-muted space-y-1">
                  <span className="font-bold text-white block mb-1">Como conectar no seu celular:</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>Abra o WhatsApp no celular da oficina.</li>
                    <li>Acesse <strong>Configurações ➔ Aparelhos Conectados</strong>.</li>
                    <li>Toque em <strong>Conectar um aparelho</strong>.</li>
                    <li>Selecione <strong>"Conectar com número de telefone"</strong> no rodapé.</li>
                    <li>Digite o código acima: <strong className="text-volt">{connectResult?.pairing_code || instance?.pairing_code}</strong>.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Exibição do QR Code */}
            {(connectResult?.qr_code_base64 || instance?.qr_code_base64) && method === 'qr_code' && (
              <div className="p-4 rounded-card bg-asfalto/80 border border-aco/40 flex flex-col items-center space-y-3 animate-fade-in">
                <span className="text-xs font-semibold text-white">Escaneie o QR Code abaixo com seu WhatsApp:</span>
                <div className="p-3 bg-white rounded-xl shadow-lg">
                  <img
                    src={connectResult?.qr_code_base64 || instance?.qr_code_base64 || ''}
                    alt="QR Code WhatsApp"
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <ol className="list-decimal list-inside text-[11px] text-muted space-y-0.5 text-center">
                  <li>Abra o WhatsApp no celular ➔ <strong>Aparelhos Conectados</strong>.</li>
                  <li>Toque em <strong>Conectar um aparelho</strong> e aponte para o QR Code acima.</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

