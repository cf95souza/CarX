import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Smartphone,
  ArrowRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { copyToClipboard } from '../../utils/clipboard';
import { toast } from '../../utils/toast';

export interface ModalPagamentoPixSaaSProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  billingStatus?: any;
  onPaymentSuccess?: () => void;
}

export const ModalPagamentoPixSaaS: React.FC<ModalPagamentoPixSaaSProps> = ({
  isOpen,
  onClose,
  invoice,
  billingStatus,
  onPaymentSuccess,
}) => {
  const [currentInvoice, setCurrentInvoice] = useState<any>(invoice);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setCurrentInvoice(invoice);
  }, [invoice]);

  const isSandbox = Boolean(billingStatus?.is_sandbox) || process.env.NODE_ENV !== 'production';

  // Polling automático enquanto o modal estiver aberto para detectar baixa imediata
  useEffect(() => {
    if (!isOpen || !currentInvoice || !currentInvoice.id) return;

    const interval = setInterval(async () => {
      try {
        const status = await api.billing.getStatus();
        const found = status?.active_invoices?.find((inv: any) => inv.id === currentInvoice.id);

        // Se a fatura não estiver mais ativa ou tiver sido marcada como paga
        if (!found || found.status === 'paid') {
          toast.success('Pagamento confirmado com sucesso! Sua assinatura foi regularizada.');
          if (onPaymentSuccess) onPaymentSuccess();
          onClose();
        }
      } catch {
        // Silencioso no polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, currentInvoice, onClose, onPaymentSuccess]);

  if (!isOpen || !currentInvoice) return null;

  const handleCopy = async () => {
    const pixCode = currentInvoice.pix_code || currentInvoice.pix_copy_paste;
    if (!pixCode) return;

    const ok = await copyToClipboard(pixCode);
    if (ok) {
      setCopied(true);
      toast.success('Código PIX Copia e Cola copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
    }
  };

  const handleRefreshPix = async () => {
    if (!currentInvoice?.id) return;
    setRefreshing(true);
    try {
      const res = await api.billing.refreshPix(currentInvoice.id);
      if (res?.invoice) {
        setCurrentInvoice(res.invoice);
        toast.success('QR Code PIX atualizado com sucesso!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao atualizar QR Code.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      const res = await api.billing.simulatePayment(currentInvoice.id);
      toast.success(res?.message || 'Pagamento compensado com sucesso! Oficina reativada.');
      if (onPaymentSuccess) onPaymentSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao simular pagamento.');
    } finally {
      setSimulating(false);
    }
  };

  const amountReais = ((currentInvoice.amount_cents || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const dueDateFormatted = currentInvoice.due_date
    ? new Date(currentInvoice.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR')
    : 'Imediato';

  const pixCode = currentInvoice.pix_code || currentInvoice.pix_copy_paste || '';
  const pixQr = currentInvoice.pix_qr || currentInvoice.pix_qr_code || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#171C24] rounded-3xl shadow-2xl border border-[#262D35] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topbar com Botão Fechar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#262D35] bg-[#0E1116]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C8F52E]/15 border border-[#C8F52E]/30 flex items-center justify-center text-[#C8F52E]">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white tracking-tight">
                Pagamento da Licença via PIX
              </h3>
              <p className="text-[11px] text-slate-300">
                Baixa automática e compensação instantânea
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#232A35] hover:bg-[#2E3744] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-white">
          {/* Card de Valor e Vencimento */}
          <div className="p-5 rounded-2xl bg-[#0E1116] border border-[#262D35] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Valor Total da Mensalidade
              </span>
              <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                {amountReais}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Vencimento
              </span>
              <span className="text-xs font-bold text-[#C8F52E] flex items-center justify-end gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                {dueDateFormatted}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-[#C8F52E] flex items-center justify-center">
              {pixQr ? (
                <img
                  src={pixQr}
                  alt="QR Code PIX CarX"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#0E1116]" />
                  <span className="text-xs font-semibold text-slate-600">Gerando QR Code...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E1116] border border-[#262D35] text-[11px] text-slate-300">
                <span className="w-2 h-2 rounded-full bg-[#C8F52E] animate-ping" />
                Aguardando transferência bancária
              </span>
              <button
                type="button"
                onClick={handleRefreshPix}
                disabled={refreshing}
                className="p-1.5 rounded-lg bg-[#232A35] hover:bg-[#2E3744] text-slate-300 hover:text-white transition disabled:opacity-50"
                title="Atualizar QR Code"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#C8F52E]' : ''}`} />
              </button>
            </div>
          </div>

          {/* PIX Copia e Cola */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Código PIX Copia e Cola
              </label>
              <span className="text-[11px] text-slate-400">
                Válido em qualquer banco
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={pixCode || 'Gerando código PIX...'}
                className="flex-1 bg-[#0E1116] border border-[#262D35] rounded-xl px-3.5 py-3 text-xs font-mono text-slate-300 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                disabled={!pixCode}
                className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116]'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Instruções de Pagamento */}
          <div className="p-4 rounded-2xl bg-[#0E1116] border border-[#262D35] space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5 text-[#C8F52E]" /> Como realizar o pagamento:
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1 font-medium">
              <li>Abra o aplicativo do seu banco ou internet banking.</li>
              <li>Escolha pagar via <strong>PIX com QR Code</strong> ou <strong>Copia e Cola</strong>.</li>
              <li>Escaneie a imagem acima ou cole o código copiado.</li>
              <li>Confirme os dados e conclua o pagamento.</li>
              <li>O CarX detectará o pagamento automaticamente em <strong>poucos segundos</strong>.</li>
            </ol>
          </div>

          {/* Botão de Simulação em Sandbox / Teste (Padrão OperaBeauty) */}
          {isSandbox && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Modo de Testes / Sandbox Ativo
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  DEV / TEST
                </span>
              </div>
              <p className="text-xs text-amber-200 leading-relaxed">
                Você pode simular a liquidação instantânea desta fatura sem debitar dinheiro real, reativando a oficina e renovando o contrato imediatamente.
              </p>
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={simulating}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0E1116] font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md"
              >
                {simulating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Simular Pagamento e Desbloqueio Imediato</span>
              </button>
            </div>
          )}
        </div>

        {/* Rodapé Seguro */}
        <div className="px-6 py-4 border-t border-[#262D35] bg-[#0E1116] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Transação Segura &amp; Criptografada</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-300 hover:text-white transition"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalPagamentoPixSaaS;
