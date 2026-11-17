import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Star,
  Car,
  User,
  Sparkles,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Wrench,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { api } from '../../services/api';
import { toast } from '../../utils/toast';
import { Modal } from '@carx/ui';
import { Button } from '@carx/ui';
import { Badge } from '@carx/ui';

export interface QaChecklistModalProps {
  os: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QaChecklistModal: React.FC<QaChecklistModalProps> = ({
  os,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [checks, setChecks] = useState({
    acabamento: false,
    bordas: false,
    montagem: false,
    limpeza: false,
    vcrFinal: false,
  });

  const [qaScore, setQaScore] = useState<number>(5);
  const [observacao, setObservacao] = useState<string>('');
  const [showReworkConfirm, setShowReworkConfirm] = useState<boolean>(false);
  const [reworkReason, setReworkReason] = useState<string>('');

  if (!os || !isOpen) return null;

  const workOrderId = os.workOrderId || os.id;
  const allChecked =
    checks.acabamento &&
    checks.bordas &&
    checks.montagem &&
    checks.limpeza &&
    checks.vcrFinal;

  const handleToggle = (key: keyof typeof checks) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Mutation para gravação de auditoria QA no banco relacional
  const createAuditMutation = useMutation({
    mutationFn: async (payload: {
      status: 'approved' | 'rejected_rework';
      score: number;
      reworkReason?: string;
    }) => {
      const checklistPayload = [
        { id: 'acabamento', label: 'Acabamento superficial e ausência de bolhas/marcas', passed: Boolean(checks.acabamento), checked: Boolean(checks.acabamento), notes: null },
        { id: 'bordas', label: 'Alinhamento e refile perfeito das bordas', passed: Boolean(checks.bordas), checked: Boolean(checks.bordas), notes: null },
        { id: 'montagem', label: 'Remontagem de componentes e acabamentos internos', passed: Boolean(checks.montagem), checked: Boolean(checks.montagem), notes: null },
        { id: 'limpeza', label: 'Higienização e desengraxe final do veículo', passed: Boolean(checks.limpeza), checked: Boolean(checks.limpeza), notes: null },
        { id: 'vcrFinal', label: 'Inspeção de saída (VCR) e fotos finais registradas', passed: Boolean(checks.vcrFinal), checked: Boolean(checks.vcrFinal), notes: null },
      ];

      return api.qa.createAudit({
        workOrderId,
        status: payload.status,
        score: Math.max(1, Math.min(5, Math.round(payload.score || 5))),
        checklistItems: checklistPayload,
        reworkReason: payload.reworkReason?.trim() || undefined,
        notes: observacao?.trim() || undefined,
      });
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'approved') {
        toast.success('Inspeção QA aprovada! Ordem liberada para retirada e garantia emitida.');
      } else {
        toast.error('Retrabalho registrado no QA! Ordem devolvida ao topo da fila do técnico.');
      }

      // Invalida filas e painel
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['technician-queue'] });
      queryClient.invalidateQueries({ queryKey: ['technicians-ranking'] });
      queryClient.invalidateQueries({ queryKey: ['technicians-ranking'] });

      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error('Erro ao registrar QA: ' + (err.message || 'Falha de comunicação com o servidor'));
    },
  });

  const handleAprovar = () => {
    if (!allChecked) {
      toast.warning('Atenção: Todos os 5 pontos de auditoria de qualidade devem ser checados!');
      return;
    }

    createAuditMutation.mutate({
      status: 'approved',
      score: qaScore,
    });
  };

  const handleReprovar = () => {
    if (!reworkReason.trim() && !observacao.trim()) {
      toast.warning('Para solicitar retrabalho, informe o motivo ou defeito constatado.');
      return;
    }

    createAuditMutation.mutate({
      status: 'rejected_rework',
      score: Math.min(qaScore, 2),
      reworkReason: reworkReason.trim() || observacao.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Auditoria QA • OS #${String(os.osNumber || os.os_number || os.id).padStart(4, '0')}`}
      size="lg"
    >
      <div className="space-y-6 text-texto">
        {/* Banner do Veículo e Técnico Responsável */}
        <div className="bg-asfalto p-4 rounded-xl border border-aco flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-grafite border border-aco flex items-center justify-center text-volt">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-texto uppercase">
                {os.veiculo_desc || `${os.vehicle?.brand || ''} ${os.vehicle?.model || ''}`.trim() || 'Veículo'}
              </h4>
              <p className="text-xs text-muted">
                Placa: <span className="font-mono text-texto font-bold">{os.veiculo_placa || os.vehicle?.plate || 'SEM PLACA'}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted block">Técnico Encarregado</span>
            <span className="text-xs font-black text-volt">
              {os.tecnico || os.tecnico_nome || os.technician?.name || 'Técnico Especialista'}
            </span>
          </div>
        </div>

        {/* 5 Critérios Obrigatórios da Auditoria */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-black uppercase tracking-wider text-muted flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-volt" /> Critérios de Conformidade de Qualidade
            </h5>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setChecks({
                    acabamento: true,
                    bordas: true,
                    montagem: true,
                    limpeza: true,
                    vcrFinal: true,
                  })
                }
                className="text-[10px] font-bold text-volt hover:underline cursor-pointer"
              >
                Marcar Todos Conformes
              </button>
              <span className="text-[10px] font-bold text-muted">
                {Object.values(checks).filter(Boolean).length}/5 Concluídos
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {[
              {
                id: 'acabamento' as const,
                title: 'Acabamento Superficial & Padrão Estético',
                desc: 'Ausência de bolhas, marcas de estiramento de película, contaminações ou poeira sob o filme.',
              },
              {
                id: 'bordas' as const,
                title: 'Refile & Adesão Perfeita das Bordas',
                desc: 'Bordas devidamente acomodadas sem descolamentos, recortes precisos e selamento térmico concluído.',
              },
              {
                id: 'montagem' as const,
                title: 'Alinhamento & Remontagem de Componentes',
                desc: 'Lanternas, maçanetas, frisos e borrachas reinstalados no alinhamento original de fábrica.',
              },
              {
                id: 'limpeza' as const,
                title: 'Limpeza, Desengraxe & Remoção de Resíduos',
                desc: 'Vidros higienizados sem excesso de solução de aplicação, painel limpo e lataria sem marcas de dedos.',
              },
              {
                id: 'vcrFinal' as const,
                title: 'Vistoria Final de Saída & Fotos Registradas',
                desc: 'Fotos da fase "Depois" nos 5 ângulos corporativos arquivadas no MinIO e sem avarias pós-intervenção.',
              },
            ].map((item) => (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  checks[item.id]
                    ? 'bg-asfalto border-volt/60 shadow-sm shadow-volt/10'
                    : 'bg-asfalto/50 border-aco hover:border-aco/80'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checks[item.id]}
                  onChange={() => handleToggle(item.id)}
                  className="w-5 h-5 mt-0.5 rounded text-volt focus:ring-volt accent-[#C8F52E] flex-shrink-0 cursor-pointer"
                />
                <div className="flex-1">
                  <p className={`text-xs font-bold uppercase tracking-tight ${checks[item.id] ? 'text-volt' : 'text-texto'}`}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Avaliação por Estrelas (Score 1 a 5) */}
        <div className="bg-asfalto p-4 rounded-xl border border-aco space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted block">
            Nota de Qualidade do Serviço (Score QA)
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setQaScore(star)}
                className="p-1 text-muted hover:text-warning transition-colors cursor-pointer"
              >
                <Star
                  className={`w-7 h-7 ${
                    star <= qaScore ? 'fill-warning text-warning' : 'text-aco'
                  }`}
                />
              </button>
            ))}
            <span className="text-xs font-bold text-texto ml-2">
              {qaScore === 5 ? '5.0 — Padrão Showroom' : `${qaScore}.0 Estrelas`}
            </span>
          </div>
        </div>

        {/* Parecer Técnico e Observações */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted block">
            Parecer do Auditor e Recomendações
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Registre observações para o cliente, cuidados adicionais nas primeiras 48h ou anotações de auditoria..."
            rows={3}
            className="w-full bg-asfalto border border-aco rounded-xl p-3 text-xs text-texto placeholder:text-muted outline-none focus:border-volt resize-none leading-relaxed"
          />
        </div>

        {/* Seção de Retrabalho (Caso Haja Pendência) */}
        {showReworkConfirm && (
          <div className="p-4 bg-error/10 border border-error/40 rounded-xl space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h5 className="text-xs font-bold uppercase tracking-wider">
                Solicitar Retrabalho ao Técnico
              </h5>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Ao reprovar no QA, a OS retornará ao topo da fila do técnico com prioridade máxima e
              a sequência sem retrabalho será zerada para fins de auditoria no DRE.
            </p>
            <input
              type="text"
              value={reworkReason}
              onChange={(e) => setReworkReason(e.target.value)}
              placeholder="Descreva o motivo obrigatório do retrabalho (ex: bolha no capô, acabamento solto)..."
              className="w-full bg-asfalto border border-error/60 rounded-lg p-2.5 text-xs text-texto outline-none focus:border-error"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowReworkConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={createAuditMutation.isPending}
                onClick={handleReprovar}
              >
                Confirmar Retrabalho
              </Button>
            </div>
          </div>
        )}

        {/* Ações do Modal */}
        {!showReworkConfirm && (
          <div className="flex items-center gap-3 pt-3 border-t border-aco">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowReworkConfirm(true)}
              className="text-xs uppercase font-bold text-error border-error/40 hover:bg-error/10"
              leftIcon={<ThumbsDown className="w-4 h-4" />}
            >
              Reprovar / Retrabalho
            </Button>

            <Button
              type="button"
              variant="volt"
              size="desktop"
              disabled={!allChecked || createAuditMutation.isPending}
              isLoading={createAuditMutation.isPending}
              onClick={handleAprovar}
              className="flex-1 font-black uppercase text-xs tracking-wider"
              leftIcon={<CheckCircle2 className="w-4 h-4 fill-asfalto text-asfalto" />}
            >
              Aprovar Vistoria & Liberar Veículo
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QaChecklistModal;

