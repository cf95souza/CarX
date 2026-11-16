import React, { useState } from 'react';
import { X, DollarSign, Wallet, History, ArrowRight, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirm';
import { formatCurrency, formatOsNumber } from '../../utils/statusUtils';
import { formatDateBR } from '../../utils/dateUtils';

const PagamentoModal = ({ os, onClose, onSave, onDelete }) => {
  const totalReal = Number(os.valor_total ?? os.valor ?? (os.finalCents ? os.finalCents / 100 : 0));
  const pagoReal = Number(os.valor_pago ?? (os.paidCents ? os.paidCents / 100 : 0));
  const saldoReal = Math.max(0, totalReal - pagoReal);

  const [valor, setValor] = useState(saldoReal > 0 ? saldoReal : (totalReal > 0 ? totalReal : ''));
  const [metodo, setMetodo] = useState('pix');
  const [isSaving, setIsSaving] = useState(false);

  const metodos = [
    { id: 'pix', label: 'PIX Instantâneo', icon: '⚡' },
    { id: 'cash', label: 'Dinheiro', icon: '💵' },
    { id: 'credit_card', label: 'Cartão de Crédito', icon: '💳' },
    { id: 'debit_card', label: 'Cartão de Débito', icon: '🏧' },
  ];

  const handleSave = async () => {
    const numValor = Number(valor);
    if (isNaN(numValor) || numValor <= 0) {
      toast.warning('O valor deve ser maior que zero');
      return;
    }

    setIsSaving(true);
    try {
      const res = await onSave(os.id, {
        valor: numValor,
        metodo,
        tipo: pagoReal === 0 ? 'SINAL' : (numValor >= saldoReal ? 'QUITACAO' : 'PARCIAL'),
      });

      if (res && res.success !== false) {
        toast.success('Pagamento registrado com sucesso!');
        onClose();
      } else {
        throw new Error(res?.error?.message || 'Falha ao processar pagamento');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar pagamento: ' + (err.message || 'Erro inesperado'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-[#171C24] border border-[#2E3744] rounded-[2rem] w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl animate-scaleUp max-h-[90vh] text-[#F2F5F8]">
        {/* Header Fixo */}
        <div className="p-6 md:p-8 border-b border-[#2E3744] bg-[#0E1116] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#C8F52E]/15 text-[#C8F52E] rounded-2xl flex items-center justify-center border border-[#C8F52E]/30 shadow-inner">
              <DollarSign size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#F2F5F8] uppercase tracking-tight">Registrar Pagamento</h3>
              <p className="text-xs text-[#9AA7B8] font-mono font-bold uppercase tracking-wider mt-0.5">
                {formatOsNumber(os.os_number || os.id)} • {os.cliente_nome}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-[#232A35] hover:bg-[#2E3744] text-[#9AA7B8] hover:text-[#F2F5F8] rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo Rolável */}
        <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar text-left">
          {/* Card de Resumo Financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#0E1116] p-4 rounded-xl border border-[#2E3744] text-center">
              <span className="text-[10px] font-black text-[#9AA7B8] uppercase tracking-widest block mb-1">Valor Total</span>
              <span className="text-base font-black text-[#F2F5F8] font-mono">{formatCurrency(totalReal)}</span>
            </div>
            <div className="bg-[#0E1116] p-4 rounded-xl border border-[#2E3744] text-center">
              <span className="text-[10px] font-black text-[#5CC8FF] uppercase tracking-widest block mb-1">Total Já Pago</span>
              <span className="text-base font-black text-[#5CC8FF] font-mono">{formatCurrency(pagoReal)}</span>
            </div>
            <div className="bg-[#0E1116] p-4 rounded-xl border border-[#2E3744] text-center">
              <span className="text-[10px] font-black text-[#C8F52E] uppercase tracking-widest block mb-1">Saldo Devedor</span>
              <span className="text-base font-black text-[#C8F52E] font-mono">{formatCurrency(saldoReal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário de Pagamento */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#9AA7B8] uppercase tracking-widest ml-1">
                  Valor a Receber Agora
                </label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#9AA7B8]">R$</div>
                   <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    className="w-full pl-12 pr-4 py-3.5 bg-[#0E1116] border border-[#2E3744] focus:border-[#C8F52E] rounded-xl outline-none transition-all text-xl font-black text-[#F2F5F8] font-mono"
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#9AA7B8] uppercase tracking-widest ml-1">
                  Método de Pagamento
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {metodos.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetodo(m.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        metodo === m.id 
                          ? 'border-[#C8F52E] bg-[#C8F52E]/10 text-[#C8F52E] font-bold' 
                          : 'border-[#2E3744] bg-[#0E1116] hover:border-[#9AA7B8]/40 text-[#9AA7B8]'
                      }`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-xs font-bold uppercase tracking-wider">{m.label}</span>
                      {metodo === m.id && <CheckCircle2 size={16} className="ml-auto text-[#C8F52E]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Histórico de Pagamentos */}
            <div className="space-y-2">
               <label className="text-[10px] font-black text-[#9AA7B8] uppercase tracking-widest ml-1 flex items-center gap-1.5">
                 <History size={14} /> Histórico desta OS
               </label>
               <div className="bg-[#0E1116] rounded-2xl p-4 border border-[#2E3744] space-y-3 min-h-[220px]">
                 {os.historico_pagamentos && os.historico_pagamentos.length > 0 ? (
                    os.historico_pagamentos.map((p, idx) => (
                      <div key={idx} className="bg-[#171C24] p-3 rounded-xl border border-[#2E3744] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#C8F52E]/10 text-[#C8F52E] flex items-center justify-center">
                            <DollarSign size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-[#F2F5F8] font-mono">{formatCurrency(p.valor)}</p>
                            <p className="text-[9px] text-[#9AA7B8] uppercase">{p.metodo} • {formatDateBR(p.data)}</p>
                          </div>
                        </div>
                        {onDelete && (
                          <button 
                            type="button"
                            onClick={async () => {
                              const confirm = await confirmDialog(
                                'Estornar Pagamento',
                                `Deseja remover este registro de ${formatCurrency(p.valor)}? O valor pago da OS será recalculado.`,
                                'Remover',
                                'Voltar'
                              );
                              if (confirm) {
                                const res = await onDelete(os.id, idx);
                                if (res?.success) toast.success('Pagamento estornado!');
                              }
                            }}
                            className="p-1.5 text-[#9AA7B8] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                            title="Remover lançamento"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                      <Wallet size={36} className="mb-2 text-[#9AA7B8]" />
                      <p className="text-xs font-bold text-[#9AA7B8] uppercase tracking-wider">Nenhum pagamento registrado</p>
                    </div>
                 )}
               </div>
            </div>
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="p-6 md:p-8 border-t border-[#2E3744] bg-[#0E1116] flex items-center gap-4 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#9AA7B8] hover:text-[#F2F5F8] transition-all"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-4 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] font-bold"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-[#0E1116]/30 border-t-[#0E1116] rounded-full animate-spin"></div>
            ) : (
              <><ArrowRight size={18} /> Confirmar Recebimento</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PagamentoModal;
