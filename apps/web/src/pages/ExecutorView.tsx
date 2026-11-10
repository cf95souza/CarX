import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  Camera,
  MessageSquare,
  Clock,
  Car,
  AlertTriangle,
  X,
  Loader2,
  Wrench,
  Fuel,
  Gauge,
  Sparkles,
  ClipboardCheck,
  FileCheck2,
} from 'lucide-react';

import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';
import PhotoGuideGallery from '../components/features/PhotoGuideGallery';
import { Button } from '@carx/ui';
import { Card } from '@carx/ui';
import { Badge } from '@carx/ui';
import { Stopwatch } from '@carx/ui';
import { Modal } from '@carx/ui';
import { Input } from '@carx/ui';

export interface ExecutorViewProps {
  os: any;
  onBack: () => void;
  onComplete: () => void;
}

interface ServiceItemState {
  id: string;
  nome: string;
  tempo?: number;
  progresso: number;
}

export const ExecutorView: React.FC<ExecutorViewProps> = ({ os, onBack, onComplete }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const workOrderId = os.workOrderId || os.id;

  // Estado dos serviços
  const [servicosDetalhados, setServicosDetalhados] = useState<ServiceItemState[]>(() => {
    if (os.servicos_detalhados && Array.isArray(os.servicos_detalhados) && os.servicos_detalhados.length > 0) {
      return os.servicos_detalhados.map((s: any, idx: number) => ({
        id: s.id || String(idx),
        nome: s.nome || s.serviceName || `Serviço ${idx + 1}`,
        tempo: s.tempo || s.estimatedMinutes || 60,
        progresso: Number(s.progresso) || 0,
      }));
    }
    const servicoStr = os.servico || '';
    return servicoStr
      .split(',')
      .map((s: string, idx: number) => ({
        id: String(idx),
        nome: s.trim(),
        tempo: 60,
        progresso: 0,
      }))
      .filter((s: ServiceItemState) => Boolean(s.nome));
  });

  // Progresso geral calculado
  const [progress, setProgress] = useState<number>(() => {
    if (servicosDetalhados.length === 0) return Number(os.progresso) || 0;
    const sum = servicosDetalhados.reduce((acc, curr) => acc + curr.progresso, 0);
    return Math.round(sum / servicosDetalhados.length);
  });

  const [notes, setNotes] = useState<string>(os.obs_tecnico || '');
  const [photos, setPhotos] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('Pausa operacional');

  // Campos do checklist rápido de entrada
  const [checklistKm, setChecklistKm] = useState<number>(os.vehicle?.currentKm || 0);
  const [checklistFuel, setChecklistFuel] = useState<string>('1/2');
  const [checklistItems, setChecklistItems] = useState([
    { id: '1', label: 'Documentos e manual no porta-luvas', checked: true },
    { id: '2', label: 'Estepe, macaco e chave de roda presentes', checked: true },
    { id: '3', label: 'Tapetes e acabamentos internos preservados', checked: true },
    { id: '4', label: 'Luzes, faróis e painel em funcionamento', checked: true },
    { id: '5', label: 'Pintura/lataria inspecionada contra avarias prévias', checked: true },
  ]);

  // 1. Cronômetro Oficial do Servidor via React Query
  const { data: timerData, refetch: refetchTimer } = useQuery({
    queryKey: ['technician-timer', workOrderId],
    queryFn: () => api.technician.getTimer(workOrderId),
    refetchInterval: 10000, // Revalida a cada 10s para manter integridade com o backend
  });

  const isTimerRunning = Boolean(timerData?.isTimerRunning ?? os.isTimerRunning);
  const totalElapsedSeconds = Number(timerData?.totalElapsedSeconds ?? os.totalElapsedSeconds ?? 0);

  // Efeito local para incremento suave do cronômetro enquanto estiver ativo
  const [displaySeconds, setDisplaySeconds] = useState(totalElapsedSeconds);

  useEffect(() => {
    setDisplaySeconds(totalElapsedSeconds);
  }, [totalElapsedSeconds]);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setDisplaySeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Mutations para o cronômetro oficial do servidor
  const startTimerMutation = useMutation({
    mutationFn: () => api.technician.start(workOrderId),
    onSuccess: () => {
      toast.success('Cronômetro oficial iniciado no servidor!');
      queryClient.invalidateQueries({ queryKey: ['technician-timer', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['technician-queue'] });
      refetchTimer();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([30]);
    },
    onError: (err: any) => {
      toast.error('Erro ao iniciar cronômetro: ' + (err.message || 'Falha de comunicação'));
    },
  });

  const pauseTimerMutation = useMutation({
    mutationFn: (reason?: string) => api.technician.pause(workOrderId, reason),
    onSuccess: () => {
      toast.warning('Cronômetro oficial pausado.');
      setShowPauseModal(false);
      queryClient.invalidateQueries({ queryKey: ['technician-timer', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['technician-queue'] });
      refetchTimer();
    },
    onError: (err: any) => {
      toast.error('Erro ao pausar: ' + (err.message || 'Falha de comunicação'));
    },
  });

  const resumeTimerMutation = useMutation({
    mutationFn: () => api.technician.resume(workOrderId),
    onSuccess: () => {
      toast.success('Atividade retomada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['technician-timer', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['technician-queue'] });
      refetchTimer();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([30]);
    },
    onError: (err: any) => {
      toast.error('Erro ao retomar: ' + (err.message || 'Falha de comunicação'));
    },
  });

  // Checklist de entrada instantâneo ("Nunca bloquear sem saída")
  const startWithChecklistMutation = useMutation({
    mutationFn: (data: any) => api.technician.startWithChecklist(workOrderId, data),
    onSuccess: () => {
      toast.success('Checklist registrado e cronômetro iniciado com sucesso!');
      setShowChecklistModal(false);
      os.has_checklist = true;
      os.checklist_concluido = true;
      queryClient.invalidateQueries({ queryKey: ['technician-timer', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['technician-queue'] });
      refetchTimer();
    },
    onError: (err: any) => {
      toast.error('Erro no checklist: ' + (err.message || 'Falha de validação'));
    },
  });

  // Finalização da Ordem de Serviço para QA
  const finishWorkOrderMutation = useMutation({
    mutationFn: async () => {
      // 1. Para o cronômetro oficial
      await api.technician.stop(workOrderId).catch(() => {});
      // 2. Transiciona status da OS para QA (Inspeção de Qualidade)
      await api.workOrders.updateStatus(workOrderId, 'QA', notes);
    },
    onSuccess: () => {
      toast.success('Serviço concluído com sucesso! Encaminhado para Inspeção QA.');
      setShowConfirmFinish(false);
      queryClient.invalidateQueries({ queryKey: ['technician-queue'] });
      onComplete();
    },
    onError: (err: any) => {
      toast.error('Erro ao finalizar serviço: ' + (err.message || 'Erro de comunicação'));
    },
  });

  // Atualização individual de cada sub-serviço
  const handleSubServiceProgress = (idx: number, val: number) => {
    const newItems = servicosDetalhados.map((item, i) =>
      i === idx ? { ...item, progresso: val } : item
    );
    setServicosDetalhados(newItems);

    const sum = newItems.reduce((acc, curr) => acc + curr.progresso, 0);
    const newTotal = Math.round(sum / (newItems.length || 1));
    setProgress(newTotal);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && val === 100) {
      navigator.vibrate?.([20]);
    }
  };

  // Upload de Fotos integrado com MinIO
  const handlePhotoUpload = async (file: File, fase = 'durante', angulo = 'livre') => {
    if (!file) return;

    setIsUploading(true);
    try {
      const uploaded = await api.storage.upload(file, {
        category: 'inspection',
        entityId: workOrderId,
      });

      const newPhotoObj = {
        id: uploaded.id || String(Date.now()),
        url: uploaded.url,
        fase_execucao: fase,
        angulo: angulo,
      };

      setPhotos((prev) => [newPhotoObj, ...prev]);
      toast.success(`Foto ${fase.toUpperCase()} (${angulo}) registrada no MinIO!`);
    } catch (err: any) {
      toast.error('Erro no upload: ' + (err.message || 'Falha ao salvar foto'));
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoDelete = async (photoId: string, url: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId && p.url !== url));
    toast.success('Foto removida.');
  };

  const hasChecklist = Boolean(os.has_checklist || os.checklist_concluido);

  return (
    <div className="flex flex-col bg-grafite rounded-2xl border border-aco shadow-lg overflow-hidden mb-6 max-w-3xl mx-auto">
      {/* 1. Header Fixo Tátil com Retorno */}
      <div className="p-4 md:p-6 bg-asfalto border-b border-aco flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="p-3 bg-grafite hover:bg-aco text-muted hover:text-volt rounded-xl border border-aco transition-all flex items-center gap-2 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">
            Voltar à Fila
          </span>
        </button>

        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] font-black text-muted uppercase tracking-widest leading-none">
              OS #{String(os.osNumber || os.os_number || os.id).padStart(4, '0')}
            </span>
            <div className="px-2 py-0.5 bg-grafite border border-aco rounded text-texto font-mono font-black text-xs uppercase">
              {os.veiculo_placa || os.vehicle?.plate || 'SEM PLACA'}
            </div>
          </div>
          <h2 className="text-base font-extrabold text-texto tracking-tight uppercase mt-1">
            {os.veiculo_desc || `${os.vehicle?.brand || ''} ${os.vehicle?.model || ''}`.trim() || 'Veículo'}
          </h2>
        </div>
      </div>

      {/* 2. Banner de Cronômetro Oficial do Servidor */}
      <div className="p-4 bg-asfalto/60 border-b border-aco/80 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
              isTimerRunning
                ? 'bg-volt text-asfalto border-volt animate-pulse'
                : 'bg-grafite text-muted border-aco'
            }`}
          >
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted">
              Cronômetro Oficial (Servidor)
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Stopwatch
                seconds={displaySeconds}
                isActive={isTimerRunning}
                size="md"
                showIcon={false}
              />
              <Badge
                variant={isTimerRunning ? 'volt' : 'neutral'}
                dot
                className="text-[9px] uppercase font-bold"
              >
                {isTimerRunning ? 'Em Andamento' : 'Pausado'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Botões de Ação do Cronômetro */}
        <div className="flex items-center gap-2">
          {isTimerRunning ? (
            <Button
              type="button"
              variant="outline"
              size="desktop"
              onClick={() => setShowPauseModal(true)}
              isLoading={pauseTimerMutation.isPending}
              leftIcon={<Pause className="w-4 h-4" />}
              className="text-xs font-bold uppercase"
            >
              Pausar
            </Button>
          ) : (
            <Button
              type="button"
              variant="volt"
              size="desktop"
              onClick={() => {
                if (totalElapsedSeconds > 0) {
                  resumeTimerMutation.mutate();
                } else if (hasChecklist) {
                  startTimerMutation.mutate();
                } else {
                  setShowChecklistModal(true);
                }
              }}
              isLoading={startTimerMutation.isPending || resumeTimerMutation.isPending}
              leftIcon={<Play className="w-4 h-4 fill-asfalto text-asfalto" />}
              className="text-xs font-black uppercase tracking-wider"
            >
              {totalElapsedSeconds > 0 ? 'Retomar' : 'Iniciar'}
            </Button>
          )}
        </div>
      </div>

      {/* 3. Banner de Checklist de Entrada com Ação Inteligente */}
      {!hasChecklist && (
        <div className="m-4 p-4 rounded-xl bg-alert/10 border border-alert/30 text-texto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-alert/20 text-alert rounded-xl flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-alert">
                Checklist de Entrada Pendente
              </h4>
              <p className="text-[11px] text-muted mt-0.5">
                Faça a vistoria inicial rápida para registrar as avarias e liberar a execução.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="volt"
            size="sm"
            onClick={() => setShowChecklistModal(true)}
            leftIcon={<ClipboardCheck className="w-4 h-4" />}
            className="font-bold text-xs uppercase"
          >
            Fazer Checklist Rápido
          </Button>
        </div>
      )}

      {/* 4. Lista de Serviços e Progresso Individual */}
      <div className="p-4 md:p-6 space-y-6">
        <div className="bg-asfalto rounded-xl p-5 border border-aco space-y-5">
          <div className="flex justify-between items-end border-b border-aco/60 pb-4">
            <div>
              <h4 className="text-xs font-black uppercase text-muted tracking-widest">
                Status de Execução
              </h4>
              <p className="text-xs text-muted mt-0.5">
                Atualize o progresso conforme avança em cada etapa da oficina.
              </p>
            </div>
            <div className="text-right">
              <span className="text-volt font-black text-3xl tracking-tight leading-none">
                {progress}%
              </span>
              <span className="text-[9px] font-black text-muted uppercase tracking-widest block mt-0.5">
                Geral
              </span>
            </div>
          </div>

          {/* Instruções do Gestor (Read-only) */}
          {(os.observacoes || os.notes) && (
            <div className="bg-grafite p-4 rounded-xl border border-aco">
              <h5 className="text-[10px] font-black text-volt uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Instruções da Recepção
              </h5>
              <p className="text-xs text-muted italic leading-relaxed">
                "{os.observacoes || os.notes}"
              </p>
            </div>
          )}

          {/* Sub-serviços com sliders e botão "Feito" */}
          <div className="divide-y divide-aco/50">
            {servicosDetalhados.map((s, idx) => (
              <div key={s.id || idx} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        s.progresso === 100
                          ? 'bg-volt shadow-sm shadow-volt/40'
                          : s.progresso > 0
                          ? 'bg-alert'
                          : 'bg-aco'
                      }`}
                    />
                    <p className="text-xs font-bold text-texto uppercase tracking-tight">{s.nome}</p>
                  </div>
                  <span
                    className={`text-xs font-black ${
                      s.progresso === 100 ? 'text-volt' : 'text-muted'
                    }`}
                  >
                    {s.progresso}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 relative h-3 bg-grafite rounded-full border border-aco overflow-hidden">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={s.progresso}
                      onChange={(e) => handleSubServiceProgress(idx, parseInt(e.target.value, 10))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        s.progresso === 100 ? 'bg-volt' : 'bg-volt/60'
                      }`}
                      style={{ width: `${s.progresso}%` }}
                    />
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={s.progresso === 100 ? 'volt' : 'secondary'}
                    onClick={() => handleSubServiceProgress(idx, 100)}
                    className="text-[10px] font-black uppercase px-3 py-1"
                  >
                    {s.progresso === 100 ? 'Feito ✓' : 'Concluir'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Documentação Fotográfica Guiada 360° */}
        <div className="space-y-4">
          <PhotoGuideGallery
            photos={photos as any}
            onUpload={handlePhotoUpload}
            onDelete={handlePhotoDelete}
            isReadOnly={false}
            loading={isUploading}
            vehicleDesc={os.veiculo_desc || 'Veículo'}
            osId={workOrderId}
          />

          {/* Notas do Técnico */}
          <div className="bg-asfalto rounded-xl p-4 border border-aco space-y-2">
            <label
              htmlFor="notes-area"
              className="text-[10px] font-black text-muted uppercase tracking-widest block"
            >
              Diário Técnico e Observações
            </label>
            <textarea
              id="notes-area"
              className="w-full text-xs bg-grafite border border-aco rounded-lg p-3 outline-none focus:border-volt text-texto placeholder:text-muted placeholder:italic resize-none font-medium leading-relaxed"
              placeholder="Descreva detalhes importantes da aplicação, números de série de bobinas utilizadas, tempo de cura ou orientações ao cliente..."
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 6. Footer Fixo com Botão Tátil de Finalização (56px) */}
      <div className="sticky bottom-0 z-30 p-4 md:p-6 bg-asfalto border-t border-aco shrink-0 shadow-2xl">
        <Button
          type="button"
          size="mobile"
          variant="volt"
          disabled={progress < 100 || finishWorkOrderMutation.isPending}
          onClick={() => setShowConfirmFinish(true)}
          isLoading={finishWorkOrderMutation.isPending}
          className="w-full font-black uppercase text-xs tracking-widest"
          leftIcon={<CheckCircle2 className="w-5 h-5 fill-asfalto text-asfalto" />}
        >
          {progress === 100
            ? 'Finalizar Serviço & Enviar para QA'
            : `Conclua todos os itens para finalizar (${progress}%)`}
        </Button>
      </div>

      {/* Modal de Checklist Rápido de Entrada */}
      <Modal
        isOpen={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        title="Checklist Rápido de Entrada"
        size="md"
      >
        <div className="space-y-4 text-texto">
          <p className="text-xs text-muted">
            Preencha os dados essenciais para registrar a entrada do veículo e iniciar o serviço
            imediatamente.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted block mb-1">
                Quilometragem (KM)
              </label>
              <Input
                type="number"
                value={checklistKm || ''}
                onChange={(e) => setChecklistKm(Number(e.target.value))}
                placeholder="Ex: 45000"
                leftIcon={<Gauge className="w-4 h-4 text-volt" />}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted block mb-1">
                Combustível
              </label>
              <select
                value={checklistFuel}
                onChange={(e) => setChecklistFuel(e.target.value)}
                className="w-full bg-asfalto border border-aco rounded-lg h-12 px-3 text-xs text-texto outline-none focus:border-volt"
              >
                <option value="Reserva">Reserva</option>
                <option value="1/4">1/4</option>
                <option value="1/2">1/2 (Meio Tanque)</option>
                <option value="3/4">3/4</option>
                <option value="Cheio">Cheio</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-aco">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted">
              Itens Vistoriados
            </p>
            {checklistItems.map((item, idx) => (
              <label
                key={item.id}
                className="flex items-center gap-2.5 p-2 bg-asfalto rounded-lg border border-aco cursor-pointer hover:border-volt/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setChecklistItems((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, checked } : it))
                    );
                  }}
                  className="w-4 h-4 rounded text-volt focus:ring-volt accent-[#C8F52E]"
                />
                <span className="text-xs font-medium text-texto">{item.label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t border-aco">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowChecklistModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="volt"
              className="flex-1 font-bold uppercase text-xs"
              isLoading={startWithChecklistMutation.isPending}
              onClick={() => {
                startWithChecklistMutation.mutate({
                  currentKm: checklistKm,
                  fuelLevel: checklistFuel,
                  checklistItems: checklistItems.map((it) => ({
                    id: it.id,
                    label: it.label,
                    checked: it.checked,
                  })),
                  notes,
                });
              }}
            >
              Salvar & Iniciar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Pausa do Cronômetro */}
      <Modal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        title="Pausar Atividade"
        size="sm"
      >
        <div className="space-y-4 text-texto">
          <p className="text-xs text-muted">
            Informe o motivo da pausa para registro na linha do tempo da OS:
          </p>

          <div className="space-y-2">
            {[
              'Aguardando Secagem / Cura',
              'Almoço / Intervalo',
              'Aguardando Peça / Material',
              'Ajuste de Checklist / Recepção',
              'Outro Motivo',
            ].map((reason) => (
              <label
                key={reason}
                className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                  pauseReason === reason ? 'bg-asfalto border-volt' : 'bg-asfalto/50 border-aco'
                }`}
              >
                <input
                  type="radio"
                  name="pauseReason"
                  checked={pauseReason === reason}
                  onChange={() => setPauseReason(reason)}
                  className="accent-[#C8F52E]"
                />
                <span className="text-xs font-semibold">{reason}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2 pt-3 border-t border-aco">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowPauseModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="volt"
              className="flex-1 font-bold uppercase text-xs"
              isLoading={pauseTimerMutation.isPending}
              onClick={() => pauseTimerMutation.mutate(pauseReason)}
            >
              Confirmar Pausa
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Entrega para QA */}
      <Modal
        isOpen={showConfirmFinish}
        onClose={() => setShowConfirmFinish(false)}
        title="Finalizar Serviço & Enviar para QA"
        size="sm"
      >
        <div className="space-y-4 text-center text-texto p-2">
          <div className="w-16 h-16 bg-volt/15 text-volt rounded-2xl flex items-center justify-center mx-auto border border-volt/30 shadow-lg shadow-volt/10">
            <FileCheck2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-extrabold uppercase">Tudo Concluído?</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              O cronômetro oficial será finalizado e o veículo será movido para o setor de{' '}
              <strong className="text-volt">Inspeção de Qualidade (QA)</strong> para auditoria e
              emissão do certificado de garantia.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-aco">
            <Button
              type="button"
              variant="volt"
              size="mobile"
              className="w-full font-black uppercase text-xs tracking-wider"
              isLoading={finishWorkOrderMutation.isPending}
              onClick={() => finishWorkOrderMutation.mutate()}
            >
              Confirmar Conclusão
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs"
              disabled={finishWorkOrderMutation.isPending}
              onClick={() => setShowConfirmFinish(false)}
            >
              Voltar e Revisar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExecutorView;
