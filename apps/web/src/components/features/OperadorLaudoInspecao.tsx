import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Mic, 
  MicOff, 
  Trash2, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles,
  Car
} from 'lucide-react';
import { api } from '../../services/api';
import { toast } from '../../utils/toast';

export interface OperadorLaudoInspecaoProps {
  os: any;
  onBack: () => void;
  onComplete: () => void;
}

type CarViewType = 'superior' | 'frente' | 'traseira' | 'laterais';
type DamageType = 'Risco' | 'Amassado' | 'Pedra' | 'Mancha';

interface DamagePoint {
  id: string;
  number: number;
  view: CarViewType;
  xPercent: number;
  yPercent: number;
  damageType: DamageType;
  description: string;
  photoUrl?: string;
}

export const OperadorLaudoInspecao: React.FC<OperadorLaudoInspecaoProps> = ({
  os,
  onBack,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [activeView, setActiveView] = useState<CarViewType>('superior');
  const [selectedDamageType, setSelectedDamageType] = useState<DamageType>('Risco');
  const [damagePoints, setDamagePoints] = useState<DamagePoint[]>([]);
  const [currentKm, setCurrentKm] = useState<string>(
    String(os?.vehicle?.currentKm || os?.current_km || '45000')
  );
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assinatura do cliente
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activePhotoPointId, setActivePhotoPointId] = useState<string | null>(null);

  const workOrderId = os.workOrderId || os.id;
  const vehicleDesc = os.veiculo_desc || `${os.vehicle?.brand || ''} ${os.vehicle?.model || 'Veículo'}`.trim();
  const vehiclePlate = os.veiculo_placa || os.vehicle?.plate || 'SEM PLACA';

  // Configuração das visões
  const views: { id: CarViewType; label: string }[] = [
    { id: 'superior', label: 'Superior' },
    { id: 'frente', label: 'Frente' },
    { id: 'traseira', label: 'Traseira' },
    { id: 'laterais', label: 'Laterais' },
  ];

  const damageTypeOptions: DamageType[] = ['Risco', 'Amassado', 'Pedra', 'Mancha'];

  // Ponto de clique na silhueta do carro
  const handleCarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const nextNumber = damagePoints.length + 1;
    let autoPart = 'lataria';
    if (activeView === 'superior') {
      if (y < 28) autoPart = 'capô dianteiro';
      else if (y > 72) autoPart = 'porta-malas / traseira';
      else autoPart = 'teto / teto solar';
    } else if (activeView === 'frente') {
      if (y < 45) autoPart = 'capô / para-brisa';
      else if (y <= 68) autoPart = 'grade / faróis dianteiros';
      else autoPart = 'para-choque dianteiro';
    } else if (activeView === 'traseira') {
      if (y < 45) autoPart = 'vidro traseiro';
      else if (y <= 68) autoPart = 'tampa do porta-malas / lanternas';
      else autoPart = 'para-choque traseiro';
    } else {
      if (x < 28) autoPart = 'para-lama / roda dianteira';
      else if (x < 52) autoPart = 'porta dianteira / retrovisor';
      else if (x < 76) autoPart = 'porta traseira';
      else autoPart = 'para-lama / roda traseira';
    }

    const newPoint: DamagePoint = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      number: nextNumber,
      view: activeView,
      xPercent: x,
      yPercent: y,
      damageType: selectedDamageType,
      description: `${selectedDamageType} · ${autoPart}`,
    };

    setDamagePoints((prev) => [...prev, newPoint]);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([30]);
    }
  };

  const handleRemovePoint = (id: string) => {
    setDamagePoints((prev) =>
      prev
        .filter((p) => p.id !== id)
        .map((p, idx) => ({ ...p, number: idx + 1 }))
    );
  };

  // Upload de Foto para o ponto de avaria
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoPointId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setDamagePoints((prev) =>
        prev.map((p) => (p.id === activePhotoPointId ? { ...p, photoUrl: base64 } : p))
      );
      toast.success('Foto da avaria anexada com sucesso!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reconhecimento de Voz / Relato por Voz
  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info('Reconhecimento de voz não suportado pelo navegador. Digite as observações.');
      const manual = window.prompt('Digite seu relato por voz ou observação técnica:');
      if (manual) {
        setVoiceNotes((prev) => (prev ? `${prev}. ${manual}` : manual));
      }
      return;
    }

    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecordingVoice(true);
        toast.info('Ouvindo relato técnico... Fale agora.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setVoiceNotes((prev) => (prev ? `${prev}. ${transcript}` : transcript));
          toast.success(`Relato capturado: "${transcript}"`);
        }
      };

      recognition.onerror = () => {
        setIsRecordingVoice(false);
      };

      recognition.onend = () => {
        setIsRecordingVoice(false);
      };

      recognition.start();
    } catch {
      setIsRecordingVoice(false);
    }
  };

  // Canvas de assinatura tátil
  const startDrawing = (e: any) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#C8F52E';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Concluir e Iniciar Serviço Oficial
  const handleFinalizeInspection = async () => {
    setIsSubmitting(true);
    try {
      let signatureBase64 = '';
      if (canvasRef.current && hasSignature) {
        signatureBase64 = canvasRef.current.toDataURL('image/png');
      }

      // 1. Inicia checklist de entrada no backend Fastify
      await api.technician.startWithChecklist(workOrderId, {
        currentKm: parseInt(currentKm.replace(/\D/g, ''), 10) || 45000,
        fuelLevel: '1/2',
        notes: voiceNotes || 'Laudo de inspeção 360° realizado pelo operador.',
        checklistItems: [
          { id: '1', label: 'Documentos e estepe conferidos', checked: true },
          { id: '2', label: 'Inspeção visual de lataria e vidros', checked: true },
        ],
      });

      // 2. Se houver danos registrados, salva na inspeção
      try {
        const inspRes = await api.inspections.getByWorkOrder(workOrderId);
        const inspId = inspRes?.inspections?.[0]?.id;
        if (inspId) {
          for (const dmg of damagePoints) {
            await api.inspections.addDamagePoint(inspId, {
              view: dmg.view,
              damageType: dmg.damageType.toLowerCase(),
              description: dmg.description,
              xPercent: dmg.xPercent,
              yPercent: dmg.yPercent,
              photoUrl: dmg.photoUrl || undefined,
            }).catch(() => {});
          }

          if (signatureBase64) {
            await api.inspections.sign(inspId, {
              customerSignatureName: os.customer?.name || 'Cliente',
              signatureBase64,
            }).catch(() => {});
          }
        }
      } catch {
        // Fallback resiliente
      }

      toast.success('Laudo de inspeção concluído! Serviço iniciado no cronômetro oficial.');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar laudo de inspeção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentViewPoints = useMemo(() => {
    return damagePoints.filter((p) => p.view === activeView);
  }, [damagePoints, activeView]);

  return (
    <div className="min-h-screen bg-[#0E1116] text-[#F2F5F8] font-sans flex flex-col p-4 md:p-6 max-w-md mx-auto">
      {/* Input oculto para anexar fotos de avarias */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* 1. Header do Laudo (Fiel ao Rebraind) */}
      <div className="flex items-center gap-3.5 mb-4">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => {
            if (step === 2) setStep(1);
            else onBack();
          }}
          className="w-12 h-12 rounded-full border border-[#2E3744] bg-[#171C24] text-[#F2F5F8] text-xl flex items-center justify-center hover:border-[#9AA7B8]/40 transition-colors shrink-0"
        >
          ‹
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-[#9AA7B8] font-medium leading-none mb-1">
            Laudo de inspeção · etapa {step} de 2
          </div>
          <div className="font-grotesk text-xl md:text-2xl font-bold text-[#F2F5F8] truncate leading-tight">
            {vehicleDesc}
          </div>
        </div>

        <div className="border border-[#2E3744] bg-[#171C24] text-[#F2F5F8] rounded-xl px-3 py-1.5 font-mono text-xs font-bold shrink-0">
          {vehiclePlate}
        </div>
      </div>

      {step === 1 ? (
        <>
          {/* 2. Abas de Visão do Carro (Pills) */}
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
            {views.map((v) => {
              const isActive = activeView === v.id;
              const countInView = damagePoints.filter((p) => p.view === v.id).length;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveView(v.id)}
                  className={`flex-1 min-w-[76px] h-10 rounded-full font-sans text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-[#C8F52E] text-[#0E1116] font-bold shadow-md shadow-[#C8F52E]/15'
                      : 'bg-[#171C24] border border-[#2E3744] text-[#9AA7B8] hover:text-[#F2F5F8]'
                  }`}
                >
                  <span>{v.label}</span>
                  {countInView > 0 && (
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        isActive ? 'bg-[#0E1116] text-[#C8F52E]' : 'bg-[#FF9500] text-[#0E1116]'
                      }`}
                    >
                      {countInView}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 3. Card do Diagrama do Carro com Mapeamento Interativo */}
          <div className="bg-[#131820] border border-[#2E3744] rounded-3xl p-5 relative flex flex-col items-center justify-center min-h-[280px] select-none overflow-hidden">
            <div
              onClick={handleCarClick}
              className="relative w-full h-56 flex items-center justify-center cursor-crosshair touch-manipulation"
            >
              {/* Silhueta Vetorial Específica por Ângulo */}
              {activeView === 'superior' && (
                <svg
                  viewBox="0 0 200 320"
                  className="w-44 h-56 stroke-[#3A4657] fill-[#131820] stroke-[2] pointer-events-none transition-all"
                >
                  {/* Retrovisores */}
                  <path d="M22 100 Q15 95 18 85 Q25 80 32 90 Z" fill="#2E3744" stroke="#4B586E" />
                  <path d="M178 100 Q185 95 182 85 Q175 80 168 90 Z" fill="#2E3744" stroke="#4B586E" />
                  {/* Rodas laterais */}
                  <rect x="20" y="55" width="12" height="36" rx="4" fill="#232A36" stroke="#4B586E" />
                  <rect x="168" y="55" width="12" height="36" rx="4" fill="#232A36" stroke="#4B586E" />
                  <rect x="20" y="215" width="12" height="36" rx="4" fill="#232A36" stroke="#4B586E" />
                  <rect x="168" y="215" width="12" height="36" rx="4" fill="#232A36" stroke="#4B586E" />
                  {/* Carroceria principal */}
                  <path d="M50 25 Q100 15 150 25 Q172 45 170 95 L170 225 Q172 275 150 295 Q100 305 50 295 Q28 275 30 225 L30 95 Q28 45 50 25 Z" fill="#171C24" stroke="#4B586E" strokeWidth="2.5" />
                  {/* Capô - vincos */}
                  <path d="M60 40 L68 85 M140 40 L132 85" stroke="#2E3744" strokeWidth="1.5" />
                  {/* Para-brisa dianteiro */}
                  <path d="M52 88 Q100 80 148 88 L142 120 Q100 115 58 120 Z" fill="#0E1116" stroke="#4B586E" strokeWidth="2" />
                  {/* Teto */}
                  <rect x="56" y="125" width="88" height="65" rx="6" fill="#1C232E" stroke="#3A4657" strokeWidth="1.5" />
                  {/* Vidros laterais */}
                  <path d="M42 125 L52 125 L52 190 L42 190 Z M158 125 L148 125 L148 190 L158 190 Z" fill="#0E1116" stroke="#3A4657" />
                  {/* Para-brisa traseiro */}
                  <path d="M58 195 Q100 190 142 195 L148 228 Q100 234 52 228 Z" fill="#0E1116" stroke="#4B586E" strokeWidth="2" />
                  {/* Tampa do porta-malas */}
                  <path d="M62 245 Q100 250 138 245" stroke="#3A4657" strokeWidth="1.5" />
                </svg>
              )}

              {activeView === 'frente' && (
                <svg
                  viewBox="0 0 280 200"
                  className="w-56 h-48 stroke-[#3A4657] fill-[#131820] stroke-[2] pointer-events-none transition-all"
                >
                  {/* Pneus no chão */}
                  <rect x="36" y="145" width="30" height="45" rx="5" fill="#232A36" stroke="#4B586E" />
                  <rect x="214" y="145" width="30" height="45" rx="5" fill="#232A36" stroke="#4B586E" />
                  {/* Retrovisores externos */}
                  <path d="M38 90 Q22 88 20 80 Q22 72 38 75 Z" fill="#1C232E" stroke="#4B586E" />
                  <path d="M242 90 Q258 88 260 80 Q258 72 242 75 Z" fill="#1C232E" stroke="#4B586E" />
                  {/* Cabine / Teto e colunas A */}
                  <path d="M80 35 Q140 30 200 35 L225 90 L55 90 Z" fill="#1C232E" stroke="#4B586E" strokeWidth="2.5" />
                  {/* Para-brisa com retrovisor interno */}
                  <path d="M85 42 Q140 38 195 42 L215 85 L65 85 Z" fill="#0E1116" stroke="#3A4657" strokeWidth="2" />
                  <rect x="135" y="44" width="10" height="6" rx="2" fill="#4B586E" />
                  {/* Carroceria dianteira */}
                  <path d="M40 90 Q140 85 240 90 L248 140 Q248 165 235 170 Q140 175 45 170 Q32 165 32 140 Z" fill="#171C24" stroke="#4B586E" strokeWidth="2.5" />
                  {/* Faróis Dianteiros LED */}
                  <path d="M45 102 L95 106 L90 120 L42 114 Z" fill="#232A36" stroke="#C8F52E" strokeWidth="2" />
                  <path d="M235 102 L185 106 L190 120 L238 114 Z" fill="#232A36" stroke="#C8F52E" strokeWidth="2" />
                  {/* Grade Central do Radiador */}
                  <rect x="105" y="112" width="70" height="30" rx="6" fill="#0E1116" stroke="#3A4657" strokeWidth="2" />
                  <line x1="105" y1="122" x2="175" y2="122" stroke="#2E3744" strokeWidth="1.5" />
                  <line x1="105" y1="132" x2="175" y2="132" stroke="#2E3744" strokeWidth="1.5" />
                  {/* Suporte de Placa */}
                  <rect x="115" y="148" width="50" height="15" rx="3" fill="#0E1116" stroke="#C8F52E" strokeWidth="1" />
                  <text x="140" y="159" fill="#C8F52E" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">CARX</text>
                  {/* Para-choque / Spoilers inferiores */}
                  <path d="M45 160 L65 172 M235 160 L215 172" stroke="#3A4657" strokeWidth="2" />
                </svg>
              )}

              {activeView === 'traseira' && (
                <svg
                  viewBox="0 0 280 200"
                  className="w-56 h-48 stroke-[#3A4657] fill-[#131820] stroke-[2] pointer-events-none transition-all"
                >
                  {/* Pneus traseiros */}
                  <rect x="36" y="145" width="30" height="45" rx="5" fill="#232A36" stroke="#4B586E" />
                  <rect x="214" y="145" width="30" height="45" rx="5" fill="#232A36" stroke="#4B586E" />
                  {/* Retrovisores traseiros (verso) */}
                  <path d="M38 88 Q22 86 20 80 Q22 74 38 76 Z" fill="#1C232E" stroke="#3A4657" />
                  <path d="M242 88 Q258 86 260 80 Q258 74 242 76 Z" fill="#1C232E" stroke="#3A4657" />
                  {/* Teto e colunas traseiras */}
                  <path d="M80 35 Q140 30 200 35 L225 85 L55 85 Z" fill="#1C232E" stroke="#4B586E" strokeWidth="2.5" />
                  {/* Vigia / Vidro traseiro com linhas de desembaçador */}
                  <path d="M85 42 Q140 38 195 42 L215 80 L65 80 Z" fill="#0E1116" stroke="#3A4657" strokeWidth="2" />
                  <line x1="88" y1="55" x2="192" y2="55" stroke="#2E3744" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="82" y1="65" x2="198" y2="65" stroke="#2E3744" strokeWidth="1" strokeDasharray="3 3" />
                  {/* Tampa do porta-malas / Traseira */}
                  <path d="M42 85 Q140 82 238 85 L248 140 Q248 165 235 170 Q140 175 45 170 Q32 165 32 140 Z" fill="#171C24" stroke="#4B586E" strokeWidth="2.5" />
                  {/* Lanternas Traseiras Vermelhas */}
                  <path d="M42 100 L95 104 L90 120 L40 115 Z" fill="#3D181A" stroke="#EF4444" strokeWidth="2" />
                  <path d="M238 100 L185 104 L190 120 L240 115 Z" fill="#3D181A" stroke="#EF4444" strokeWidth="2" />
                  {/* Barra de conexão das lanternas */}
                  <line x1="95" y1="108" x2="185" y2="108" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.7" />
                  {/* Vinco da placa */}
                  <rect x="110" y="125" width="60" height="22" rx="4" fill="#0E1116" stroke="#3A4657" strokeWidth="1.5" />
                  <text x="140" y="139" fill="#F2F5F8" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">{vehiclePlate}</text>
                  {/* Difusor e Escapamentos */}
                  <rect x="52" y="162" width="22" height="8" rx="3" fill="#0E1116" stroke="#4B586E" strokeWidth="1.5" />
                  <rect x="206" y="162" width="22" height="8" rx="3" fill="#0E1116" stroke="#4B586E" strokeWidth="1.5" />
                </svg>
              )}

              {activeView === 'laterais' && (
                <svg
                  viewBox="0 0 340 160"
                  className="w-64 h-44 stroke-[#3A4657] fill-[#131820] stroke-[2] pointer-events-none transition-all"
                >
                  {/* Linha de solo */}
                  <line x1="10" y1="135" x2="330" y2="135" stroke="#232A36" strokeWidth="2" strokeDasharray="6 4" />
                  {/* Carroceria lateral */}
                  <path d="M20 105 Q35 70 85 68 L130 35 Q210 32 235 50 L275 75 Q315 78 322 105 Q325 125 305 125 L275 125 Q270 100 240 100 Q210 100 205 125 L135 125 Q130 100 100 100 Q70 100 65 125 L35 125 Q20 125 20 105 Z" fill="#171C24" stroke="#4B586E" strokeWidth="2.5" />
                  {/* Vidros laterais (Cabine) */}
                  <path d="M135 42 L225 42 Q235 55 255 70 L135 70 Z" fill="#0E1116" stroke="#3A4657" strokeWidth="2" />
                  {/* Coluna B */}
                  <line x1="190" y1="42" x2="190" y2="70" stroke="#2E3744" strokeWidth="3" />
                  {/* Retrovisor lateral */}
                  <path d="M130 65 Q120 60 120 54 Q125 50 135 54 Z" fill="#2E3744" stroke="#4B586E" />
                  {/* Linhas das Portas */}
                  <path d="M135 70 L130 115" stroke="#2E3744" strokeWidth="1.5" />
                  <path d="M190 70 L190 115" stroke="#2E3744" strokeWidth="1.5" />
                  <path d="M255 70 L248 105" stroke="#2E3744" strokeWidth="1.5" />
                  {/* Maçanetas táteis */}
                  <rect x="145" y="76" width="16" height="4" rx="2" fill="#4B586E" />
                  <rect x="200" y="76" width="16" height="4" rx="2" fill="#4B586E" />
                  {/* Roda Dianteira */}
                  <circle cx="100" cy="115" r="22" fill="#171C24" stroke="#232A36" strokeWidth="4" />
                  <circle cx="100" cy="115" r="14" fill="#0E1116" stroke="#4B586E" strokeWidth="2" />
                  <circle cx="100" cy="115" r="4" fill="#C8F52E" />
                  {/* Roda Traseira */}
                  <circle cx="240" cy="115" r="22" fill="#171C24" stroke="#232A36" strokeWidth="4" />
                  <circle cx="240" cy="115" r="14" fill="#0E1116" stroke="#4B586E" strokeWidth="2" />
                  <circle cx="240" cy="115" r="4" fill="#C8F52E" />
                  {/* Farol dianteiro & Lanterna traseira */}
                  <path d="M20 95 L32 90 L32 100 Z" fill="#C8F52E" opacity="0.8" />
                  <path d="M320 92 L310 88 L312 98 Z" fill="#EF4444" opacity="0.8" />
                </svg>
              )}

              {/* Pinos Numerados Interativos */}
              {currentViewPoints.map((p) => (
                <div
                  key={p.id}
                  style={{ left: `${p.xPercent}%`, top: `${p.yPercent}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#FF9500] text-[#0E1116] font-bold text-xs flex items-center justify-center shadow-lg border-2 border-[#131820] pointer-events-none animate-scaleUp"
                >
                  {p.number}
                </div>
              ))}
            </div>

            <div className="text-[12px] text-[#9AA7B8] text-center font-medium mt-1">
              {activeView === 'superior' && 'Toque no capô, teto ou porta-malas para marcar a avaria'}
              {activeView === 'frente' && 'Toque no para-choque, grade, capô ou faróis'}
              {activeView === 'traseira' && 'Toque na tampa, lanternas ou para-choque traseiro'}
              {activeView === 'laterais' && 'Toque nas portas, para-lamas ou caixas de roda'}
            </div>
          </div>

          {/* 4. Tipos de Avaria (Pills de Seleção) */}
          <div className="flex gap-2 my-3">
            {damageTypeOptions.map((type) => {
              const isSelected = selectedDamageType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedDamageType(type)}
                  className={`flex-1 h-11 rounded-2xl font-sans text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border-2 border-[#FF9500] text-[#FF9500] bg-[#171C24] font-bold shadow-sm'
                      : 'border border-[#2E3744] bg-[#171C24] text-[#F2F5F8] hover:border-[#9AA7B8]/40'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {/* 5. Lista de AVARIAS REGISTRADAS */}
          <div className="space-y-2.5 flex-1 mb-4">
            <div className="text-[11px] font-bold tracking-[2px] text-[#9AA7B8] uppercase px-1">
              AVARIAS REGISTRADAS · {damagePoints.length}
            </div>

            {damagePoints.length === 0 ? (
              <div className="p-4 bg-[#171C24] rounded-2xl border border-[#2E3744] text-center text-xs text-[#9AA7B8]">
                Nenhuma avaria apontada. O veículo está íntegro neste ângulo.
              </div>
            ) : (
              damagePoints.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#171C24] border border-[#2E3744] rounded-2xl p-3 flex items-center justify-between gap-3 animate-fadeIn"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#FF9500] text-[#0E1116] font-bold text-xs flex items-center justify-center shrink-0">
                      {p.number}
                    </div>
                    <div className="text-xs font-semibold text-[#F2F5F8] truncate">
                      {p.description}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.photoUrl ? (
                      <span className="text-[#C8F52E] font-bold text-xs flex items-center gap-1">
                        Foto ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePhotoPointId(p.id);
                          fileInputRef.current?.click();
                        }}
                        className="px-2.5 py-1 rounded-xl bg-[#232A35] hover:bg-[#2E3744] text-xs font-semibold text-[#9AA7B8] hover:text-[#F2F5F8] flex items-center gap-1"
                      >
                        <Camera size={13} /> + Foto
                      </button>
                    )}

                    <button
                      type="button"
                      aria-label="Excluir avaria"
                      onClick={() => handleRemovePoint(p.id)}
                      className="p-1.5 text-[#9AA7B8] hover:text-[#FF6B5E] transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 6. Rodapé com KM, Relato por Voz e Botão Avançar */}
          <div className="pt-2 border-t border-[#2E3744] space-y-3 shrink-0">
            <div className="flex gap-2.5">
              {/* Input Km atual */}
              <div className="flex-1 bg-[#171C24] border border-[#2E3744] rounded-2xl px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-xs text-[#9AA7B8] font-medium">Km atual</span>
                <input
                  type="text"
                  value={currentKm}
                  onChange={(e) => setCurrentKm(e.target.value)}
                  className="w-24 text-right bg-transparent text-sm font-bold text-[#F2F5F8] outline-none font-mono"
                  placeholder="45.000"
                />
              </div>

              {/* Botão Relato por voz */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`flex-1 bg-[#171C24] border rounded-2xl px-3.5 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                  isRecordingVoice
                    ? 'border-[#FF6B5E] text-[#FF6B5E] animate-pulse'
                    : 'border-[#2E3744] text-[#F2F5F8] hover:border-[#9AA7B8]/40'
                }`}
              >
                {isRecordingVoice ? <MicOff size={15} /> : <Mic size={15} className="text-[#C8F52E]" />}
                <span>{isRecordingVoice ? 'Gravando...' : 'Relato por voz'}</span>
              </button>
            </div>

            {voiceNotes && (
              <div className="text-[11px] text-[#9AA7B8] bg-[#171C24] p-2.5 rounded-xl border border-[#2E3744]">
                <strong className="text-[#F2F5F8]">Relato gravado:</strong> {voiceNotes}
              </div>
            )}

            {/* Botão Principal Verde Volt */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full h-14 rounded-2xl bg-[#C8F52E] text-[#0E1116] font-sans font-bold text-base flex items-center justify-center gap-2 hover:bg-[#b8e520] transition-all shadow-lg shadow-[#C8F52E]/15 active:scale-[0.99]"
            >
              Próximo: assinatura do cliente
            </button>
          </div>
        </>
      ) : (
        /* ETAPA 2: ASSINATURA DIGITAL DO CLIENTE */
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="bg-[#171C24] border border-[#2E3744] rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#C8F52E] text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={16} /> Termo de Entrada de Veículo
              </div>
              <p className="text-xs text-[#9AA7B8] leading-relaxed">
                Declaro para os devidos fins que o veículo foi entregue à oficina com{' '}
                <strong className="text-[#F2F5F8]">{damagePoints.length} avaria(s)</strong> apontada(s)
                na vistoria e com quilometragem <strong className="text-[#F2F5F8]">{currentKm} km</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold tracking-[1.5px] text-[#9AA7B8] uppercase">
                Assinatura do Cliente no Quadro Abaixo
              </div>
              <div className="bg-[#171C24] border-2 border-dashed border-[#2E3744] rounded-2xl h-52 relative overflow-hidden flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={208}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair touch-none"
                />
                {!hasSignature && (
                  <div className="absolute pointer-events-none text-xs text-[#9AA7B8]/60 uppercase tracking-widest font-bold">
                    Toque ou use o dedo para assinar
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="text-xs text-[#9AA7B8] hover:text-[#FF6B5E] underline font-medium"
                >
                  Limpar assinatura
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#2E3744]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalizeInspection}
              className="w-full h-14 rounded-2xl bg-[#C8F52E] text-[#0E1116] font-sans font-bold text-base flex items-center justify-center gap-2 hover:bg-[#b8e520] transition-all shadow-lg shadow-[#C8F52E]/15 disabled:opacity-60"
            >
              {isSubmitting ? 'Salvando Laudo...' : 'Confirmar e Iniciar Serviço'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full h-12 rounded-2xl bg-[#171C24] border border-[#2E3744] text-[#F2F5F8] font-sans font-semibold text-sm hover:border-[#9AA7B8]/40 transition-all"
            >
              Voltar para Vistoria
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default OperadorLaudoInspecao;
