import React, { useState } from 'react';
import {
  Sparkles,
  Camera,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Plus,
  ArrowRight,
  FileText,
  DollarSign,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { toast } from '../../utils/toast';
import { Button } from '@carx/ui';
import { Badge } from '@carx/ui';
import { Modal } from '@carx/ui';
import type {
  AiDetectedDamageItemDto,
  AiSuggestedServiceItemDto,
  AiDamageDetectionResultDto,
  AiVoiceChecklistResultDto,
} from '@carx/shared';

export interface AiInspectionAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId?: string;
  inspectionId?: string;
  vehicleType?: 'car' | 'motorcycle' | 'truck';
  onApplyDamagesToDiagram: (damages: AiDetectedDamageItemDto[]) => void;
  onApplyVoiceChecklist: (data: {
    currentKm?: number | null;
    fuelLevel?: string | null;
    generalNotes?: string;
    checklistItems?: Array<{ id: string; label: string; checked: boolean }>;
  }) => void;
  onSuccessApplyToWorkOrder?: () => void;
}

export const AiInspectionAssistantModal: React.FC<AiInspectionAssistantModalProps> = ({
  isOpen,
  onClose,
  workOrderId,
  inspectionId,
  vehicleType = 'car',
  onApplyDamagesToDiagram,
  onApplyVoiceChecklist,
  onSuccessApplyToWorkOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'vision' | 'voice' | 'services'>('vision');

  // Estados de Visão Computacional
  const [angleHint, setAngleHint] = useState<string>('front');
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const [visionResult, setVisionResult] = useState<AiDamageDetectionResultDto | null>(null);

  // Estados de Voz
  const [spokenText, setSpokenText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceResult, setVoiceResult] = useState<AiVoiceChecklistResultDto | null>(null);

  // Serviços Selecionados para Inclusão na OS
  const [suggestedServices, setSuggestedServices] = useState<AiSuggestedServiceItemDto[]>([]);
  const [isApplyingToOS, setIsApplyingToOS] = useState(false);

  // 1. Executa Análise de Visão Computacional
  const handleAnalyzeVision = async () => {
    setIsAnalyzingVision(true);
    try {
      const res = await api.ai.analyzeDamage({
        workOrderId,
        inspectionId,
        angleHint,
        vehicleType,
      });

      setVisionResult(res);

      // Adiciona serviços recomendados à lista
      if (res.suggestedServices && res.suggestedServices.length > 0) {
        setSuggestedServices((prev) => {
          const names = new Set(prev.map((s) => s.name));
          const newItems = res.suggestedServices.filter((s) => !names.has(s.name));
          return [...prev, ...newItems];
        });
      }

      toast.success(
        `IA analisou o ângulo ${angleHint.toUpperCase()}: ${res.detectedDamages.length} avaria(s) detectada(s)!`
      );
    } catch (err: any) {
      toast.error('Erro na análise de visão: ' + (err.message || 'Falha de comunicação com a IA'));
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  // 2. Reconhecimento de Fala pelo Navegador (Web Speech API)
  const toggleRecording = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(
        'Seu navegador não possui suporte direto a gravação de voz. Você pode digitar o relato abaixo!'
      );
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        toast.info('🎙️ Ouvindo... Fale a quilometragem, combustível e estado do veículo.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpokenText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
      toast.error('Não foi possível iniciar o microfone.');
    }
  };

  // 3. Processa Transcrição de Voz com IA
  const handleProcessVoice = async () => {
    if (!spokenText.trim()) {
      toast.warning('Digite ou dite uma descrição para a IA analisar.');
      return;
    }

    setIsProcessingVoice(true);
    try {
      const res = await api.ai.extractVoiceChecklist({
        workOrderId,
        inspectionId,
        spokenText,
      });

      setVoiceResult(res);

      if (res.suggestedServices && res.suggestedServices.length > 0) {
        setSuggestedServices((prev) => {
          const names = new Set(prev.map((s) => s.name));
          const newItems = res.suggestedServices.filter((s) => !names.has(s.name));
          return [...prev, ...newItems];
        });
      }

      toast.success('IA extraiu com sucesso KM, combustível e itens de vistoria!');
    } catch (err: any) {
      toast.error('Erro ao processar voz: ' + (err.message || 'Falha de comunicação com a IA'));
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // 4. Aplica Danos Detectados na Silhueta do Veículo
  const handleApplyDamages = () => {
    if (!visionResult || visionResult.detectedDamages.length === 0) return;
    onApplyDamagesToDiagram(visionResult.detectedDamages);
    toast.success(`${visionResult.detectedDamages.length} avaria(s) plotada(s) no diagrama do carro!`);
  };

  // 5. Aplica Dados de Voz no Checklist
  const handleApplyVoice = () => {
    if (!voiceResult) return;
    onApplyVoiceChecklist({
      currentKm: voiceResult.currentKm,
      fuelLevel: voiceResult.fuelLevel,
      generalNotes: voiceResult.generalNotes,
      checklistItems: voiceResult.checklistItems,
    });
    toast.success('Quilometragem, combustível e notas preenchidos no laudo!');
  };

  // 6. Aplicação Direta dos Serviços Sugeridos no Orçamento da OS
  const handleApplyServicesToWorkOrder = async () => {
    if (!workOrderId) {
      toast.warning('É necessário vincular uma Ordem de Serviço para adicionar itens ao orçamento.');
      return;
    }

    const selected = suggestedServices.filter((s) => s.selected);
    if (selected.length === 0) {
      toast.warning('Nenhum serviço selecionado para orçamento.');
      return;
    }

    setIsApplyingToOS(true);
    try {
      const res = await api.ai.applyToWorkOrder({
        workOrderId,
        inspectionId,
        services: selected,
        damages: visionResult?.detectedDamages || [],
        checklist: voiceResult
          ? {
              currentKm: voiceResult.currentKm,
              fuelLevel: voiceResult.fuelLevel,
              generalNotes: voiceResult.generalNotes,
              checklistItems: voiceResult.checklistItems,
            }
          : undefined,
      });

      toast.success(res.message);
      if (onSuccessApplyToWorkOrder) {
        onSuccessApplyToWorkOrder();
      }
      onClose();
    } catch (err: any) {
      toast.error('Falha ao adicionar serviços: ' + (err.message || 'Erro no servidor'));
    } finally {
      setIsApplyingToOS(false);
    }
  };

  // Totalizador de Serviços Sugeridos
  const totalOrçadoCents = suggestedServices
    .filter((s) => s.selected)
    .reduce((acc, curr) => acc + (curr.estimatedPriceCents || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assistente de Vistoria Inteligente com IA"
      size="lg"
    >
      <div className="space-y-5 text-texto">
        {/* Cabeçalho Tecnológico com Destaque */}
        <div className="flex items-center justify-between p-3.5 bg-asfalto rounded-xl border border-aco">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-volt/10 text-volt rounded-lg border border-volt/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-volt">
                  CarX Vision & Voice AI
                </span>
                <span className="text-[10px] bg-volt/20 text-volt font-bold px-1.5 py-0.5 rounded">
                  Oficial
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Detecção automatizada de riscos/amassados e orçamentação dinâmica com 1 clique
              </p>
            </div>
          </div>
        </div>

        {/* Abas Superiores de Navegação */}
        <div className="flex border-b border-aco">
          <button
            type="button"
            onClick={() => setActiveTab('vision')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'vision'
                ? 'border-volt text-volt bg-asfalto/50'
                : 'border-transparent text-muted hover:text-texto'
            }`}
          >
            <Camera className="w-4 h-4" />
            Visão Computacional (Fotos)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'voice'
                ? 'border-volt text-volt bg-asfalto/50'
                : 'border-transparent text-muted hover:text-texto'
            }`}
          >
            <Mic className="w-4 h-4" />
            Checklist por Voz
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'services'
                ? 'border-volt text-volt bg-asfalto/50'
                : 'border-transparent text-muted hover:text-texto'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Serviços para Orçamento ({suggestedServices.length})
          </button>
        </div>

        {/* ABA 1: VISÃO COMPUTACIONAL */}
        {activeTab === 'vision' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Selecione o Ângulo ou Peça do Veículo a Analisar:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'front', label: 'Frente / Capô' },
                  { id: 'lateral_esquerda', label: 'Lateral Esquerda' },
                  { id: 'rear', label: 'Traseira' },
                  { id: 'lateral_direita', label: 'Lateral Direita' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAngleHint(item.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      angleHint === item.id
                        ? 'bg-volt/10 border-volt text-volt shadow-sm'
                        : 'bg-asfalto border-aco text-muted hover:text-texto'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="volt"
              onClick={handleAnalyzeVision}
              disabled={isAnalyzingVision}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase py-3"
            >
              {isAnalyzingVision ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando Redes Neurais da Imagem...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Escanear Avarias com IA
                </>
              )}
            </Button>

            {visionResult && (
              <div className="bg-asfalto/60 rounded-xl border border-aco p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-volt" />
                    <span className="text-xs font-bold text-texto">
                      Diagnóstico: {visionResult.detectedDamages.length} avaria(s) identificada(s)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted">
                    Confiança: {Math.round(visionResult.confidenceScore * 100)}%
                  </span>
                </div>

                <p className="text-xs text-muted leading-relaxed italic bg-grafite/50 p-2.5 rounded-lg border border-aco/50">
                  "{visionResult.summary}"
                </p>

                {/* Lista de Avarias com Badges de Severidade */}
                <div className="space-y-2">
                  {visionResult.detectedDamages.map((dmg, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-grafite border border-aco/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-texto uppercase">
                            {dmg.part.replace(/_/g, ' ')}
                          </span>
                          <Badge
                            variant={
                              dmg.severity === 'low'
                                ? 'volt'
                                : dmg.severity === 'medium'
                                ? 'alert'
                                : 'error'
                            }
                            className="text-[9px] uppercase font-bold"
                          >
                            {dmg.damageType} ({dmg.severity})
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">{dmg.description}</p>
                      </div>
                      <span className="text-[10px] font-mono bg-asfalto px-2 py-1 rounded text-muted">
                        X: {dmg.xPercent}% | Y: {dmg.yPercent}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-aco/60">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyDamages}
                    className="text-xs font-bold"
                  >
                    Plugar Pontos no Diagrama do Carro
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: CHECKLIST POR VOZ */}
        {activeTab === 'voice' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Fale ou Digite a Vistoria de Check-in:
              </label>
              <div className="relative">
                <textarea
                  value={spokenText}
                  onChange={(e) => setSpokenText(e.target.value)}
                  rows={3}
                  placeholder='Ex: "Carro com 48 mil km, tanque meio cheio, estepe no porta-malas, cliente pediu orçamento pra vitrificação..."'
                  className="w-full bg-asfalto border border-aco rounded-xl p-3 text-xs text-texto placeholder:text-muted/60 focus:outline-none focus:border-volt/60 transition-all"
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`absolute right-3 bottom-3 p-2 rounded-lg border transition-all ${
                    isRecording
                      ? 'bg-alerta/20 border-alerta text-alerta animate-pulse'
                      : 'bg-grafite border-aco text-muted hover:text-volt'
                  }`}
                  title={isRecording ? 'Parar gravação' : 'Gravar voz'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              variant="volt"
              onClick={handleProcessVoice}
              disabled={isProcessingVoice || !spokenText.trim()}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase py-3"
            >
              {isProcessingVoice ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando Fala com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extrair Dados do Relato com IA
                </>
              )}
            </Button>

            {voiceResult && (
              <div className="bg-asfalto/60 rounded-xl border border-aco p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-grafite p-2.5 rounded-lg border border-aco/70">
                    <span className="text-[10px] text-muted uppercase font-bold">KM Extraído</span>
                    <p className="text-sm font-black text-texto mt-0.5">
                      {voiceResult.currentKm ? `${voiceResult.currentKm.toLocaleString()} KM` : 'Não citado'}
                    </p>
                  </div>
                  <div className="bg-grafite p-2.5 rounded-lg border border-aco/70">
                    <span className="text-[10px] text-muted uppercase font-bold">Combustível</span>
                    <p className="text-sm font-black text-volt mt-0.5">
                      {voiceResult.fuelLevel || 'Não citado'}
                    </p>
                  </div>
                </div>

                <div className="bg-grafite p-2.5 rounded-lg border border-aco/70">
                  <span className="text-[10px] text-muted uppercase font-bold">Checklist Identificado</span>
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {voiceResult.checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs text-texto">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${item.checked ? 'text-volt' : 'text-alerta'}`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-aco/60">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyVoice}
                    className="text-xs font-bold"
                  >
                    Preencher Dados no Laudo
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: SERVIÇOS SUGERIDOS PARA ORÇAMENTO */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              A IA sugeriu estes serviços de alto ticket com base nas avarias e queixas registradas no
              check-in. Marque os serviços que deseja incluir no orçamento da OS:
            </p>

            {suggestedServices.length === 0 ? (
              <div className="text-center py-8 bg-asfalto/40 rounded-xl border border-aco border-dashed">
                <Sparkles className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-muted">Nenhum serviço sugerido ainda.</p>
                <p className="text-[11px] text-muted/70 mt-1">
                  Execute a Visão Computacional ou Checklist por Voz para gerar recomendações.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {suggestedServices.map((srv, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSuggestedServices((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, selected: !s.selected } : s))
                      );
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      srv.selected
                        ? 'bg-asfalto border-volt/60 shadow-sm'
                        : 'bg-grafite/60 border-aco/50 text-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={srv.selected}
                        onChange={() => {}}
                        className="rounded border-aco text-volt focus:ring-volt"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-texto">{srv.name}</p>
                          {srv.category && (
                            <Badge variant="volt" className="text-[9px] uppercase font-bold">
                              {srv.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">{srv.reason}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black text-volt">
                        R$ {(srv.estimatedPriceCents / 100).toFixed(2)}
                      </p>
                      {srv.estimatedMinutes && (
                        <p className="text-[10px] text-muted">~{srv.estimatedMinutes} min</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Barra de Ação de Inclusão no Orçamento */}
                <div className="p-3.5 bg-asfalto rounded-xl border border-aco flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[10px] text-muted uppercase font-bold">
                      Total Adicional Sugerido
                    </span>
                    <p className="text-base font-extrabold text-volt">
                      R$ {(totalOrçadoCents / 100).toFixed(2)}
                    </p>
                  </div>

                  <Button
                    variant="volt"
                    onClick={handleApplyServicesToWorkOrder}
                    disabled={isApplyingToOS || totalOrçadoCents === 0}
                    className="text-xs font-bold uppercase flex items-center gap-2"
                  >
                    {isApplyingToOS ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Incluir no Orçamento da OS
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

