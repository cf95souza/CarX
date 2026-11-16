import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Fuel,
  Mic,
  MicOff,
  ShieldCheck,
  Trash2,
  X,
  Eraser,
  Gauge,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { toast } from '../../utils/toast';
import { compressImageClientSide } from '../../utils/imageCompressor';
import VehicleStage, { type StagePin } from './inspection/VehicleStage';
import {
  DAMAGE_SEVERITIES,
  DAMAGE_TYPES,
  FUEL_LEVELS,
  INSPECTION_ANGLES,
  VEHICLE_CATEGORIES,
  detectPart,
  getAngleImage,
  getAngleOption,
  getDamageTypeLabel,
  getSeverityLabel,
  resolveVehicleCategory,
  type DamageSeverity,
  type DamageTypeId,
  type FuelLevel,
  type InspectionAngle,
  type VehicleCategory,
} from './inspection/inspectionCatalog';

export interface OperadorLaudoInspecaoProps {
  os: any;
  onBack: () => void;
  onComplete: () => void;
}

interface DamagePoint {
  id: string;
  angle: InspectionAngle;
  xPercent: number;
  yPercent: number;
  damageType: DamageTypeId;
  severity: DamageSeverity;
  part: string;
  photoFile?: File;
  photoPreview?: string;
}

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatKm = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 7);
  return digits ? Number(digits).toLocaleString('pt-BR') : '';
};

const parseKm = (formatted: string) => parseInt(formatted.replace(/\D/g, ''), 10) || 0;

/**
 * Laudo de Inspeção 360° do Operador — Redesenho de Alta Fidelidade (Item 43).
 *
 * Etapa 1: vistoria guiada nos 5 ângulos oficiais sobre clay renders por categoria,
 *          com marcação tátil de avarias (tipo, severidade, peça e foto de evidência).
 * Etapa 2: resumo do laudo, termo de entrada e assinatura digital do cliente.
 */
export const OperadorLaudoInspecao: React.FC<OperadorLaudoInspecaoProps> = ({
  os,
  onBack,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState<VehicleCategory>(() =>
    resolveVehicleCategory(os?.vehicle?.sizeClass || os?.veiculo_tipo || os?.porte)
  );
  const [activeAngle, setActiveAngle] = useState<InspectionAngle>('principal');
  const [visitedAngles, setVisitedAngles] = useState<Set<InspectionAngle>>(
    () => new Set<InspectionAngle>(['principal'])
  );
  const [points, setPoints] = useState<DamagePoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<DamageTypeId>('scratch');
  const [defaultSeverity, setDefaultSeverity] = useState<DamageSeverity>('low');

  const initialKm = os?.vehicle?.currentKm ?? os?.current_km ?? '';
  const [currentKm, setCurrentKm] = useState<string>(initialKm ? formatKm(String(initialKm)) : '');
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>('1/2');
  const [notes, setNotes] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [customerName, setCustomerName] = useState<string>(
    os?.customer?.name || os?.cliente_nome || ''
  );
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const kmInputRef = useRef<HTMLInputElement | null>(null);
  const photoTargetRef = useRef<string | null>(null);

  const workOrderId: string = os?.workOrderId || os?.id;
  const vehicleDesc =
    os?.veiculo_desc || `${os?.vehicle?.brand || ''} ${os?.vehicle?.model || 'Veículo'}`.trim();
  const vehiclePlate = os?.veiculo_placa || os?.vehicle?.plate || 'SEM PLACA';

  // Pré-carrega os 5 renders da categoria para troca instantânea de ângulo
  useEffect(() => {
    INSPECTION_ANGLES.forEach((a) => {
      const img = new Image();
      img.src = getAngleImage(category, a.id);
    });
  }, [category]);

  // Libera object URLs das fotos ao desmontar
  const pointsRef = useRef(points);
  pointsRef.current = points;
  useEffect(
    () => () => {
      pointsRef.current.forEach((p) => p.photoPreview && URL.revokeObjectURL(p.photoPreview));
      recognitionRef.current?.stop?.();
    },
    []
  );

  const numberById = useMemo(() => {
    const map = new Map<string, number>();
    points.forEach((p, idx) => map.set(p.id, idx + 1));
    return map;
  }, [points]);

  const stagePins: StagePin[] = useMemo(
    () =>
      points
        .filter((p) => p.angle === activeAngle)
        .map((p) => ({
          id: p.id,
          number: numberById.get(p.id) ?? 0,
          xPercent: p.xPercent,
          yPercent: p.yPercent,
          severity: p.severity,
        })),
    [points, activeAngle, numberById]
  );

  const selectedPoint = points.find((p) => p.id === selectedId) ?? null;
  const allAnglesVisited = visitedAngles.size === INSPECTION_ANGLES.length;
  const nextUnvisited = INSPECTION_ANGLES.find((a) => !visitedAngles.has(a.id));

  // ---------------------------------------------------------------------------
  // Navegação entre ângulos
  // ---------------------------------------------------------------------------
  const goToAngle = useCallback((angle: InspectionAngle) => {
    setActiveAngle(angle);
    setVisitedAngles((prev) => {
      if (prev.has(angle)) return prev;
      const next = new Set(prev);
      next.add(angle);
      return next;
    });
  }, []);

  const shiftAngle = useCallback(
    (delta: 1 | -1) => {
      const idx = INSPECTION_ANGLES.findIndex((a) => a.id === activeAngle);
      const nextIdx = (idx + delta + INSPECTION_ANGLES.length) % INSPECTION_ANGLES.length;
      setSelectedId(null);
      goToAngle(INSPECTION_ANGLES[nextIdx].id);
    },
    [activeAngle, goToAngle]
  );

  // ---------------------------------------------------------------------------
  // Marcação de avarias
  // ---------------------------------------------------------------------------
  const handleStageTap = useCallback(
    (xPercent: number, yPercent: number) => {
      const point: DamagePoint = {
        id: createId(),
        angle: activeAngle,
        xPercent,
        yPercent,
        damageType: defaultType,
        severity: defaultSeverity,
        part: detectPart(category, activeAngle, xPercent, yPercent),
      };
      setPoints((prev) => [...prev, point]);
      setSelectedId(point.id);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(25);
      }
    },
    [activeAngle, category, defaultSeverity, defaultType]
  );

  const updatePoint = (id: string, patch: Partial<DamagePoint>) => {
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleSelectType = (type: DamageTypeId) => {
    setDefaultType(type);
    if (selectedPoint) updatePoint(selectedPoint.id, { damageType: type });
  };

  const handleSelectSeverity = (severity: DamageSeverity) => {
    setDefaultSeverity(severity);
    if (selectedPoint) updatePoint(selectedPoint.id, { severity });
  };

  const handleRemovePoint = (id: string) => {
    setPoints((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.photoPreview) URL.revokeObjectURL(target.photoPreview);
      return prev.filter((p) => p.id !== id);
    });
    if (selectedId === id) setSelectedId(null);
  };

  const handleFocusPoint = (point: DamagePoint) => {
    goToAngle(point.angle);
    setSelectedId(point.id);
  };

  const handleCategoryChange = (next: VehicleCategory) => {
    if (next === category) return;
    setCategory(next);
    if (points.length > 0) {
      toast.info('Categoria alterada. As marcações existentes foram mantidas.');
    }
  };

  // ---------------------------------------------------------------------------
  // Foto de evidência por avaria
  // ---------------------------------------------------------------------------
  const requestPhoto = (pointId: string) => {
    photoTargetRef.current = pointId;
    fileInputRef.current?.click();
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = photoTargetRef.current;
    e.target.value = '';
    if (!file || !targetId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      return;
    }

    const compressed = await compressImageClientSide(file, 1280, 1280, 0.8);
    const preview = URL.createObjectURL(compressed);
    setPoints((prev) =>
      prev.map((p) => {
        if (p.id !== targetId) return p;
        if (p.photoPreview) URL.revokeObjectURL(p.photoPreview);
        return { ...p, photoFile: compressed, photoPreview: preview };
      })
    );
    toast.success('Foto de evidência anexada.');
  };

  // ---------------------------------------------------------------------------
  // Relato por voz (Web Speech API) — anexa ao campo de observações
  // ---------------------------------------------------------------------------
  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info('Ditado por voz indisponível neste navegador. Digite as observações no campo.');
      return;
    }

    if (isRecordingVoice) {
      recognitionRef.current?.stop?.();
      setIsRecordingVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsRecordingVoice(true);
      recognition.onresult = (event: any) => {
        const transcript: string = event.results?.[0]?.[0]?.transcript ?? '';
        if (transcript) setNotes((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
      };
      recognition.onerror = () => setIsRecordingVoice(false);
      recognition.onend = () => setIsRecordingVoice(false);
      recognition.start();
    } catch {
      setIsRecordingVoice(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Avanço de etapa
  // ---------------------------------------------------------------------------
  const handlePrimaryAction = () => {
    if (!allAnglesVisited && nextUnvisited) {
      setSelectedId(null);
      goToAngle(nextUnvisited.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (parseKm(currentKm) <= 0) {
      toast.warning('Informe a quilometragem atual do veículo.');
      kmInputRef.current?.focus();
      return;
    }
    setSelectedId(null);
    setStep(2);
    window.scrollTo({ top: 0 });
  };

  // ---------------------------------------------------------------------------
  // Assinatura do cliente (papel claro, tinta escura, PNG opaco para o PDF)
  // ---------------------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#0E1116';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasSignature(false);
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    prepareCanvas();
    window.addEventListener('resize', prepareCanvas);
    return () => window.removeEventListener('resize', prepareCanvas);
  }, [step, prepareCanvas]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleSignStart = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
  };

  const handleSignMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasSignature) setHasSignature(true);
  };

  const handleSignEnd = () => {
    drawingRef.current = false;
  };

  // ---------------------------------------------------------------------------
  // Persistência do laudo
  // ---------------------------------------------------------------------------
  const handleFinalizeInspection = async () => {
    if (!hasSignature) {
      toast.warning('Colete a assinatura do cliente para concluir o laudo.');
      return;
    }
    if (customerName.trim().length < 2) {
      toast.warning('Informe o nome de quem está assinando.');
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureBase64 = canvasRef.current?.toDataURL('image/png') ?? '';
      const categoryLabel = VEHICLE_CATEGORIES.find((c) => c.id === category)?.label ?? category;

      // 1. Inicia checklist e obtém o retorno da inspeção
      const startRes = await api.technician.startWithChecklist(workOrderId, {
        currentKm: parseKm(currentKm),
        fuelLevel,
        notes: notes.trim() || 'Laudo de inspeção 360° realizado pelo operador.',
        checklistItems: [
          { id: 'vistoria_360', label: `Vistoria 360° · 5 ângulos verificados (${categoryLabel})`, checked: true },
          { id: 'avarias', label: `Avarias registradas: ${points.length}`, checked: true },
          { id: 'combustivel', label: `Nível de combustível: ${fuelLevel}`, checked: true },
        ],
      });

      // 2. Extrai o ID da inspeção do retorno direto do endpoint
      let inspectionId: string | undefined = startRes?.inspection?.id;

      // 3. Fallback resiliente: busca por workOrderId aceitando tanto Array quanto Objeto
      if (!inspectionId) {
        try {
          const inspRes: any = await api.inspections.getByWorkOrder(workOrderId);
          if (Array.isArray(inspRes) && inspRes.length > 0) {
            inspectionId = inspRes[0]?.id;
          } else if (inspRes?.inspections && Array.isArray(inspRes.inspections) && inspRes.inspections.length > 0) {
            inspectionId = inspRes.inspections[0]?.id;
          } else if (inspRes?.id) {
            inspectionId = inspRes.id;
          }
        } catch {
          // segue para próximo fallback
        }
      }

      // 4. Fallback de criação caso a inspeção ainda não exista no banco
      if (!inspectionId) {
        const vehicleId = os?.vehicle?.id || os?.vehicle_id;
        if (vehicleId) {
          try {
            const created = await api.inspections.create({
              workOrderId,
              vehicleId,
              inspectionType: 'check_in',
              currentKm: parseKm(currentKm),
              fuelLevel,
              notes: notes.trim() || 'Laudo de inspeção 360° realizado pelo operador.',
            });
            inspectionId = created?.id;
          } catch {
            // falhou ao criar
          }
        }
      }

      if (!inspectionId) {
        throw new Error('Não foi possível inicializar ou localizar a inspeção da Ordem de Serviço.');
      }

      let failed = 0;
      for (const point of points) {
        try {
          let photoFileId: string | undefined;
          if (point.photoFile) {
            const uploaded = await api.storage.upload(point.photoFile, {
              category: 'inspection',
              entityId: inspectionId,
            });
            photoFileId = uploaded?.id;
          }
          await api.inspections.addDamagePoint(inspectionId, {
            part: point.part.trim() || 'lataria',
            damageType: point.damageType,
            severity: point.severity,
            xPercent: point.xPercent,
            yPercent: point.yPercent,
            view: getAngleOption(point.angle).apiView,
            photoFileId,
            notes: `${getDamageTypeLabel(point.damageType)} ${getSeverityLabel(point.severity).toLowerCase()} · ${point.part} (${getAngleOption(point.angle).label})`,
          });
        } catch {
          failed += 1;
        }
      }

      await api.inspections.sign(inspectionId, {
        customerSignatureName: customerName.trim(),
        signatureBase64,
      });

      if (failed > 0) {
        toast.warning(`Laudo salvo, mas ${failed} avaria(s) não foram registradas. Revise no painel.`);
      } else {
        toast.success('Laudo de inspeção concluído! Serviço iniciado no cronômetro oficial.');
      }
      onComplete();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao registrar laudo de inspeção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const activeTypeId = selectedPoint?.damageType ?? defaultType;
  const activeSeverity = selectedPoint?.severity ?? defaultSeverity;
  const angleIndex = INSPECTION_ANGLES.findIndex((a) => a.id === activeAngle);

  return (
    <div className="min-h-screen bg-[#0E1116] text-[#F2F5F8] font-sans flex flex-col px-4 pt-4 pb-6 md:px-6 max-w-md mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* Cabeçalho */}
      <header className="flex items-center gap-3 mb-4">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => (step === 2 ? setStep(1) : onBack())}
          className="w-11 h-11 rounded-full border border-[#2E3744] bg-[#171C24] text-[#F2F5F8] text-xl flex items-center justify-center hover:border-[#9AA7B8]/40 transition-colors duration-150 shrink-0"
        >
          ‹
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-[#9AA7B8] font-medium leading-none mb-1">
            Laudo de inspeção · etapa {step} de 2
          </div>
          <div className="font-grotesk text-xl font-bold text-[#F2F5F8] truncate leading-tight">
            {vehicleDesc}
          </div>
        </div>
        <div className="border border-[#2E3744] bg-[#171C24] text-[#F2F5F8] rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold shrink-0">
          {vehiclePlate}
        </div>
      </header>

      {step === 1 ? (
        <>
          {/* Progresso da vistoria */}
          <section className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold tracking-[2px] text-[#9AA7B8] uppercase">
                Vistoria 360°
              </span>
              <span className="text-[11px] font-semibold text-[#F2F5F8] tabular-nums">
                {visitedAngles.size}/{INSPECTION_ANGLES.length} ângulos
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {INSPECTION_ANGLES.map((a) => (
                <div
                  key={a.id}
                  className={`h-1 rounded-full transition-colors duration-200 ${
                    a.id === activeAngle
                      ? 'bg-[#C8F52E]'
                      : visitedAngles.has(a.id)
                        ? 'bg-[#C8F52E]/45'
                        : 'bg-[#2E3744]'
                  }`}
                />
              ))}
            </div>
          </section>

          {/* Categoria do veículo */}
          <section className="mb-3">
            <div className="grid grid-cols-5 gap-1 rounded-xl border border-[#2E3744] bg-[#171C24] p-1">
              {VEHICLE_CATEGORIES.map((c) => {
                const isActive = c.id === category;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryChange(c.id)}
                    className={`h-8 rounded-lg text-[12px] font-semibold transition-colors duration-150 ${
                      isActive
                        ? 'bg-[#F2F5F8] text-[#0E1116]'
                        : 'text-[#9AA7B8] hover:text-[#F2F5F8]'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Palco de estúdio */}
          <VehicleStage
            category={category}
            angle={activeAngle}
            pins={stagePins}
            selectedPinId={selectedId}
            onTap={handleStageTap}
            onSelectPin={setSelectedId}
            onPrev={() => shiftAngle(-1)}
            onNext={() => shiftAngle(1)}
          />

          {/* Filmstrip de ângulos */}
          <nav className="mt-3 -mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1" aria-label="Ângulos da vistoria">
            {INSPECTION_ANGLES.map((a, idx) => {
              const isActive = a.id === activeAngle;
              const count = points.filter((p) => p.angle === a.id).length;
              const visited = visitedAngles.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    goToAngle(a.id);
                  }}
                  className={`relative shrink-0 w-[78px] rounded-xl border p-1 text-left transition-colors duration-150 ${
                    isActive
                      ? 'border-[#C8F52E] bg-[#171C24]'
                      : 'border-[#2E3744] bg-[#131820] hover:border-[#9AA7B8]/40'
                  }`}
                >
                  <div
                    className="relative h-12 w-full overflow-hidden rounded-lg"
                    style={{ background: 'radial-gradient(circle at 50% 40%, #FFFFFF, #DCE1E7)' }}
                  >
                    <img
                      src={getAngleImage(category, a.id)}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-contain mix-blend-multiply"
                      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                    />
                    {count > 0 && (
                      <span className="absolute right-1 top-1 min-w-4 h-4 px-1 rounded-full bg-[#FF9500] text-[#0E1116] text-[9px] font-bold flex items-center justify-center tabular-nums">
                        {count}
                      </span>
                    )}
                    {visited && !isActive && count === 0 && (
                      <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-[#0E1116] text-[#C8F52E] flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div
                    className={`mt-1 px-0.5 text-[10px] font-semibold truncate ${
                      isActive ? 'text-[#F2F5F8]' : 'text-[#9AA7B8]'
                    }`}
                  >
                    {idx + 1}. {a.shortLabel}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Painel de avaria (edita a selecionada ou define o padrão das próximas) */}
          <section className="mt-3 rounded-xl border border-[#2E3744] bg-[#171C24] p-3">
            <div className="flex items-center justify-between mb-2.5">
              {selectedPoint ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-6 w-6 shrink-0 rounded-full text-[11px] font-bold flex items-center justify-center ${
                      selectedPoint.severity === 'high'
                        ? 'bg-[#FF453A] text-white'
                        : 'bg-[#FF9500] text-[#0E1116]'
                    }`}
                  >
                    {numberById.get(selectedPoint.id)}
                  </span>
                  <span className="text-[13px] font-semibold text-[#F2F5F8] truncate">
                    Editando avaria
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-bold tracking-[2px] text-[#9AA7B8] uppercase">
                  Próxima marcação
                </span>
              )}
              {selectedPoint && (
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="h-7 px-2 rounded-md text-[11px] font-semibold text-[#9AA7B8] hover:text-[#F2F5F8] flex items-center gap-1 transition-colors duration-150"
                >
                  <X size={13} /> Fechar
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {DAMAGE_TYPES.map((t) => {
                const isActive = activeTypeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectType(t.id)}
                    className={`h-9 rounded-lg text-[12px] font-semibold border transition-colors duration-150 ${
                      isActive
                        ? 'border-[#FF9500] text-[#FF9500] bg-[#FF9500]/10'
                        : 'border-[#2E3744] text-[#F2F5F8] bg-[#131820] hover:border-[#9AA7B8]/40'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-[#131820] border border-[#2E3744] p-1">
              {DAMAGE_SEVERITIES.map((s) => {
                const isActive = activeSeverity === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSeverity(s.id)}
                    className={`h-7 rounded-md text-[11px] font-semibold transition-colors duration-150 ${
                      isActive
                        ? s.id === 'high'
                          ? 'bg-[#FF453A] text-white'
                          : 'bg-[#2E3744] text-[#F2F5F8]'
                        : 'text-[#9AA7B8] hover:text-[#F2F5F8]'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {selectedPoint && (
              <div className="mt-2.5 space-y-2">
                <label className="block">
                  <span className="text-[10px] font-bold tracking-[1.5px] text-[#9AA7B8] uppercase">
                    Peça / região
                  </span>
                  <input
                    type="text"
                    value={selectedPoint.part}
                    maxLength={80}
                    onChange={(e) => updatePoint(selectedPoint.id, { part: e.target.value })}
                    className="mt-1 w-full h-10 rounded-lg bg-[#131820] border border-[#2E3744] px-3 text-sm text-[#F2F5F8] outline-none focus:border-[#C8F52E]/60 transition-colors duration-150"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => requestPhoto(selectedPoint.id)}
                    className="flex-1 h-10 rounded-lg bg-[#131820] border border-[#2E3744] text-[12px] font-semibold text-[#F2F5F8] flex items-center justify-center gap-1.5 hover:border-[#9AA7B8]/40 transition-colors duration-150"
                  >
                    {selectedPoint.photoPreview ? (
                      <>
                        <img src={selectedPoint.photoPreview} alt="" className="h-6 w-6 rounded object-cover" />
                        Trocar foto
                      </>
                    ) : (
                      <>
                        <Camera size={15} className="text-[#C8F52E]" /> Foto de evidência
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Excluir avaria"
                    onClick={() => handleRemovePoint(selectedPoint.id)}
                    className="h-10 w-10 rounded-lg bg-[#131820] border border-[#2E3744] text-[#9AA7B8] hover:text-[#FF6B5E] hover:border-[#FF6B5E]/40 flex items-center justify-center transition-colors duration-150"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}

            {!selectedPoint && (
              <p className="mt-2 text-[11px] text-[#9AA7B8]">
                Toque sobre a carroceria no render para registrar. Arraste para os lados para trocar de ângulo.
              </p>
            )}
          </section>

          {/* Avarias registradas */}
          <section className="mt-4 space-y-2">
            <div className="text-[10px] font-bold tracking-[2px] text-[#9AA7B8] uppercase px-0.5">
              Avarias registradas · {points.length}
            </div>
            {points.length === 0 ? (
              <div className="p-3.5 bg-[#131820] rounded-xl border border-dashed border-[#2E3744] text-center text-xs text-[#9AA7B8]">
                Nenhuma avaria apontada até agora.
              </div>
            ) : (
              points.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleFocusPoint(p)}
                    className={`w-full text-left bg-[#171C24] border rounded-xl p-2.5 flex items-center gap-2.5 transition-colors duration-150 ${
                      isSelected ? 'border-[#C8F52E]/60' : 'border-[#2E3744] hover:border-[#9AA7B8]/40'
                    }`}
                  >
                    <span
                      className={`h-7 w-7 shrink-0 rounded-full text-xs font-bold flex items-center justify-center ${
                        p.severity === 'high' ? 'bg-[#FF453A] text-white' : 'bg-[#FF9500] text-[#0E1116]'
                      }`}
                    >
                      {numberById.get(p.id)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-[#F2F5F8] truncate">
                        {getDamageTypeLabel(p.damageType)} · {p.part}
                      </span>
                      <span className="block text-[11px] text-[#9AA7B8] truncate">
                        {getAngleOption(p.angle).label} · {getSeverityLabel(p.severity)}
                      </span>
                    </span>
                    {p.photoPreview ? (
                      <img src={p.photoPreview} alt="Evidência" className="h-9 w-9 rounded-md object-cover border border-[#2E3744] shrink-0" />
                    ) : (
                      <span className="h-9 w-9 rounded-md border border-dashed border-[#2E3744] text-[#9AA7B8] flex items-center justify-center shrink-0">
                        <Camera size={14} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </section>

          {/* Dados de entrada */}
          <section className="mt-4 pt-4 border-t border-[#2E3744] space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="bg-[#171C24] border border-[#2E3744] rounded-xl px-3 py-2 focus-within:border-[#C8F52E]/60 transition-colors duration-150">
                <span className="flex items-center gap-1 text-[10px] font-bold tracking-[1.5px] text-[#9AA7B8] uppercase">
                  <Gauge size={12} /> Km atual
                </span>
                <input
                  ref={kmInputRef}
                  type="text"
                  inputMode="numeric"
                  value={currentKm}
                  onChange={(e) => setCurrentKm(formatKm(e.target.value))}
                  placeholder="0"
                  className="mt-0.5 w-full bg-transparent text-base font-bold text-[#F2F5F8] outline-none font-mono tabular-nums"
                />
              </label>
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`bg-[#171C24] border rounded-xl px-3 py-2 flex items-center justify-center gap-2 text-[12px] font-semibold transition-colors duration-150 ${
                  isRecordingVoice
                    ? 'border-[#FF6B5E] text-[#FF6B5E] animate-pulse'
                    : 'border-[#2E3744] text-[#F2F5F8] hover:border-[#9AA7B8]/40'
                }`}
              >
                {isRecordingVoice ? <MicOff size={15} /> : <Mic size={15} className="text-[#C8F52E]" />}
                {isRecordingVoice ? 'Ouvindo...' : 'Relato por voz'}
              </button>
            </div>

            <div className="bg-[#171C24] border border-[#2E3744] rounded-xl px-3 py-2">
              <span className="flex items-center gap-1 text-[10px] font-bold tracking-[1.5px] text-[#9AA7B8] uppercase mb-1.5">
                <Fuel size={12} /> Combustível
              </span>
              <div className="grid grid-cols-5 gap-1">
                {FUEL_LEVELS.map((level, idx) => {
                  const activeIdx = FUEL_LEVELS.indexOf(fuelLevel);
                  const filled = idx <= activeIdx;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFuelLevel(level)}
                      className="flex flex-col items-center gap-1"
                      aria-pressed={fuelLevel === level}
                    >
                      <span
                        className={`h-2 w-full rounded-sm transition-colors duration-150 ${
                          filled ? (activeIdx === 0 ? 'bg-[#FF9500]' : 'bg-[#C8F52E]') : 'bg-[#2E3744]'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-semibold ${
                          fuelLevel === level ? 'text-[#F2F5F8]' : 'text-[#9AA7B8]'
                        }`}
                      >
                        {level}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Observações técnicas (objetos no veículo, queixas do cliente...)"
              className="w-full resize-none rounded-xl bg-[#171C24] border border-[#2E3744] px-3 py-2.5 text-[13px] text-[#F2F5F8] placeholder:text-[#9AA7B8]/70 outline-none focus:border-[#C8F52E]/60 transition-colors duration-150"
            />

            <button
              type="button"
              onClick={handlePrimaryAction}
              className="w-full h-14 rounded-xl bg-[#C8F52E] text-[#0E1116] font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-[#b8e520] transition-colors duration-150 active:scale-[0.99]"
            >
              {allAnglesVisited ? (
                <>Próximo: assinatura do cliente</>
              ) : (
                <>
                  Próximo ângulo: {nextUnvisited?.label}
                  <ChevronRight size={18} />
                </>
              )}
            </button>
            {!allAnglesVisited && (
              <p className="text-center text-[11px] text-[#9AA7B8]">
                Verifique os 5 ângulos para liberar a assinatura · ângulo {angleIndex + 1} de {INSPECTION_ANGLES.length}
              </p>
            )}
          </section>
        </>
      ) : (
        /* ETAPA 2 — Resumo, termo e assinatura */
        <div className="flex-1 flex flex-col gap-4">
          <section className="rounded-xl border border-[#2E3744] bg-[#171C24] p-3">
            <div className="text-[10px] font-bold tracking-[2px] text-[#9AA7B8] uppercase mb-2">
              Resumo da vistoria
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {INSPECTION_ANGLES.map((a) => {
                const count = points.filter((p) => p.angle === a.id).length;
                return (
                  <div key={a.id} className="text-center">
                    <div
                      className="relative h-11 rounded-md overflow-hidden"
                      style={{ background: 'radial-gradient(circle at 50% 40%, #FFFFFF, #DCE1E7)' }}
                    >
                      <img
                        src={getAngleImage(category, a.id)}
                        alt=""
                        className="h-full w-full object-contain mix-blend-multiply"
                        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                      />
                      {count > 0 && (
                        <span className="absolute right-0.5 top-0.5 min-w-4 h-4 px-1 rounded-full bg-[#FF9500] text-[#0E1116] text-[9px] font-bold flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[9px] font-semibold text-[#9AA7B8] truncate">{a.shortLabel}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[#131820] border border-[#2E3744] py-2">
                <div className="font-grotesk text-lg font-bold tabular-nums">{points.length}</div>
                <div className="text-[10px] text-[#9AA7B8]">Avarias</div>
              </div>
              <div className="rounded-lg bg-[#131820] border border-[#2E3744] py-2">
                <div className="font-grotesk text-lg font-bold tabular-nums">{currentKm || '—'}</div>
                <div className="text-[10px] text-[#9AA7B8]">Km</div>
              </div>
              <div className="rounded-lg bg-[#131820] border border-[#2E3744] py-2">
                <div className="font-grotesk text-lg font-bold">{fuelLevel}</div>
                <div className="text-[10px] text-[#9AA7B8]">Combustível</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#2E3744] bg-[#171C24] p-3 space-y-2">
            <div className="flex items-center gap-2 text-[#C8F52E] text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck size={15} /> Termo de entrada do veículo
            </div>
            <p className="text-xs text-[#9AA7B8] leading-relaxed">
              Declaro que o veículo <strong className="text-[#F2F5F8]">{vehicleDesc}</strong> (placa{' '}
              <strong className="text-[#F2F5F8]">{vehiclePlate}</strong>) foi entregue à oficina com{' '}
              <strong className="text-[#F2F5F8]">{points.length} avaria(s)</strong> apontada(s) na vistoria
              360°, quilometragem de <strong className="text-[#F2F5F8]">{currentKm} km</strong> e combustível em{' '}
              <strong className="text-[#F2F5F8]">{fuelLevel}</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <label className="block">
              <span className="text-[10px] font-bold tracking-[1.5px] text-[#9AA7B8] uppercase">
                Nome de quem assina
              </span>
              <input
                type="text"
                value={customerName}
                maxLength={120}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome completo do cliente"
                className="mt-1 w-full h-11 rounded-xl bg-[#171C24] border border-[#2E3744] px-3 text-sm text-[#F2F5F8] outline-none focus:border-[#C8F52E]/60 transition-colors duration-150"
              />
            </label>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[1.5px] text-[#9AA7B8] uppercase">
                Assinatura do cliente
              </span>
              <button
                type="button"
                onClick={prepareCanvas}
                className="text-[11px] font-semibold text-[#9AA7B8] hover:text-[#FF6B5E] flex items-center gap-1 transition-colors duration-150"
              >
                <Eraser size={13} /> Limpar
              </button>
            </div>
            <div className="relative h-48 rounded-xl overflow-hidden border border-[#2E3744] bg-white">
              <canvas
                ref={canvasRef}
                onPointerDown={handleSignStart}
                onPointerMove={handleSignMove}
                onPointerUp={handleSignEnd}
                onPointerCancel={handleSignEnd}
                className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
              />
              <div className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-[#C3CAD3]" />
              {!hasSignature && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-[#9AA7B8] uppercase tracking-widest font-bold">
                  Assine com o dedo
                </div>
              )}
            </div>
          </section>

          <div className="mt-auto space-y-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalizeInspection}
              className="w-full h-14 rounded-xl bg-[#C8F52E] text-[#0E1116] font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-[#b8e520] transition-colors duration-150 disabled:opacity-60"
            >
              {isSubmitting ? 'Salvando laudo...' : 'Confirmar e iniciar serviço'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full h-12 rounded-xl bg-[#171C24] border border-[#2E3744] text-[#F2F5F8] font-semibold text-sm hover:border-[#9AA7B8]/40 transition-colors duration-150"
            >
              Voltar para a vistoria
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperadorLaudoInspecao;
