import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Save,
  AlertCircle,
  Info,
  MousePointer2,
  Trash2,
  ShieldCheck,
  ChevronRight,
  Camera,
  QrCode,
  FileText,
  Sparkles,
  Car,
  RotateCcw,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { useBrand } from '../../contexts/BrandContext';
import { useOrders } from '../../hooks/useData';
import { api } from '../../services/api';
import { sendWhatsApp, getVehicleReceivedMsg } from '../../utils/whatsappUtils';
import { toast } from '../../utils/toast';
import QRCodeModal from './QRCodeModal';
import VcrReportModal, { getViewLabelPT } from './VcrReportModal';
import { AiInspectionAssistantModal } from './AiInspectionAssistantModal';
import {
  resolveVehicleCategory,
  VEHICLE_CATEGORIES,
  FUEL_LEVELS,
  getDamageTypeLabel,
} from './inspection/inspectionCatalog';

const normalizeApiViewToLocal = (view, category) => {
  if (!view) return 'superior';
  const v = String(view).toLowerCase().trim();
  if (v === 'isometric' || v === 'top' || v === 'principal' || v === 'superior') {
    return 'superior';
  }
  if (v === 'front' || v === 'frontal') {
    return 'frontal';
  }
  if (v === 'rear' || v === 'traseira') {
    return 'traseira';
  }
  if (v === 'left' || v === 'lateral_esquerda' || v === 'perfil_esq') {
    return category === 'moto' ? 'perfil_esq' : 'lateral_esquerda';
  }
  if (v === 'right' || v === 'lateral_direita' || v === 'perfil_dir') {
    return category === 'moto' ? 'perfil_dir' : 'lateral_direita';
  }
  return v;
};

const getFriendlyDamageLabel = (rawType) => {
  if (!rawType) return '⚡ Risco / Arranhão';
  const lower = String(rawType).toLowerCase();
  if (lower === 'scratch' || lower.includes('risco')) return '⚡ Risco / Arranhão';
  if (lower === 'dent' || lower.includes('amassado')) return '🔨 Amassado (PDR)';
  if (lower === 'paint_chip' || lower.includes('lasca') || lower.includes('pedrisco')) return '⚡ Lasca de Pintura / Pedrisco';
  if (lower === 'stain' || lower.includes('mancha') || lower.includes('oxida')) return '🌧️ Mancha / Oxidação';
  if (lower === 'crack' || lower.includes('trinca')) return '⚡ Trinca / Vidro';
  if (lower === 'repainted' || lower.includes('repint')) return '🎨 Repintura Prévia';
  const label = getDamageTypeLabel(rawType);
  return label || rawType;
};

// Pad de Assinatura Digital do Cliente
const SignaturePad = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#0E1116';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (isDrawing) {
      e.preventDefault();
      setIsDrawing(false);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div
        ref={containerRef}
        className="bg-white rounded-2xl border-2 border-dashed border-[#2E3744] p-0 w-full aspect-[2/1] md:aspect-[3/1] overflow-hidden shadow-inner relative"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-400 font-bold uppercase tracking-wider">
            Assine aqui com o dedo ou mouse
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-4 w-full">
        <button
          type="button"
          onClick={clear}
          className="flex-1 py-3 text-xs font-bold uppercase text-[#9AA7B8] hover:text-[#F2F5F8] bg-[#171C24] hover:bg-[#202732] border border-[#2E3744] rounded-xl transition-all"
        >
          Limpar
        </button>
        <button
          type="button"
          disabled={!hasDrawn}
          onClick={() => {
            if (!hasDrawn) return;
            onSave(canvasRef.current.toDataURL());
          }}
          className={`flex-[2] py-3 text-xs font-extrabold uppercase rounded-xl transition-all ${
            hasDrawn
              ? 'bg-[#C8F52E] hover:bg-[#bbf01f] text-[#0E1116] shadow-lg shadow-[#C8F52E]/20'
              : 'bg-[#2E3744] text-[#6B7A90] cursor-not-allowed'
          }`}
        >
          Confirmar Assinatura
        </button>
      </div>
    </div>
  );
};

const CarVisualChecklist = ({ onClose, osData }) => {
  const { name } = useBrand();
  const [points, setPoints] = useState([]);
  const [activeView, setActiveView] = useState('superior');
  const [generalNotes, setGeneralNotes] = useState('');
  const [km, setKm] = useState('');
  const [fuelLevel, setFuelLevel] = useState('1/2');
  const [showSignature, setShowSignature] = useState(false);
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showVcrModal, setShowVcrModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [signature, setSignature] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { saveOrderChecklist, uploadOsPhoto } = useOrders();

  // Normalização de dados do cliente e veículo
  const customerName = useMemo(() => {
    return osData?.customer?.name || osData?.cliente_nome || osData?.customerName || 'Cliente';
  }, [osData]);

  const customerPhone = useMemo(() => {
    return osData?.customer?.phone || osData?.cliente_telefone || osData?.customerPhone || '';
  }, [osData]);

  const vehicleDesc = useMemo(() => {
    if (osData?.vehicle) {
      const brand =
        osData.vehicle.brand && osData.vehicle.brand.toLowerCase() !== 'geral'
          ? osData.vehicle.brand.trim()
          : '';
      const model = (osData.vehicle.model || '').trim();
      if (brand && model.toLowerCase().startsWith(brand.toLowerCase())) {
        return model;
      }
      return `${brand ? brand + ' ' : ''}${model}`.trim() || 'Veículo';
    }
    return osData?.veiculo_desc || osData?.vehicleModel || 'Veículo';
  }, [osData]);

  const vehiclePlate = useMemo(() => {
    return osData?.vehicle?.plate || osData?.veiculo_placa || osData?.plate || 'SEM PLACA';
  }, [osData]);

  // Resolução canônica de porte do veículo (Hatch, Sedan, SUV, Picape, Moto)
  const detectedCategory = useMemo(() => {
    return resolveVehicleCategory(
      osData?.vehicle?.sizeClass ||
        osData?.vehicleSizeClass ||
        osData?.porte ||
        osData?.tipo ||
        osData?.veiculo_tipo,
      osData?.vehicle?.model || osData?.veiculo_desc || osData?.vehicleModel || osData?.vehicle?.brand
    );
  }, [osData]);

  const [vehicleCategory, setVehicleCategory] = useState(detectedCategory);

  useEffect(() => {
    setVehicleCategory(detectedCategory);
  }, [detectedCategory]);

  const views = useMemo(() => {
    if (vehicleCategory === 'moto') {
      return [
        { id: 'superior', label: 'Superior' },
        { id: 'frontal', label: 'Frontal' },
        { id: 'perfil_esq', label: 'Lateral Esq.' },
        { id: 'perfil_dir', label: 'Lateral Dir.' },
      ];
    }
    return [
      { id: 'superior', label: 'Visão 3/4' },
      { id: 'frontal', label: 'Frente' },
      { id: 'traseira', label: 'Traseira' },
      { id: 'lateral_esquerda', label: 'Lat. Esquerda' },
      { id: 'lateral_direita', label: 'Lat. Direita' },
    ];
  }, [vehicleCategory]);

  // Garante que a view ativa pertença às views suportadas pela categoria atual
  useEffect(() => {
    const validIds = views.map((v) => v.id);
    if (!validIds.includes(activeView)) {
      setActiveView(validIds[0]);
    }
  }, [vehicleCategory, views, activeView]);

  const getPointsCountForView = (viewId) => {
    return points.filter((p) => p.view === viewId).length;
  };

  // Carrega vistoria salva anteriormente
  useEffect(() => {
    const loadSavedChecklist = async () => {
      const orderId = osData?.id || osData?.workOrderId;
      if (!orderId) return;
      try {
        setIsLoading(true);
        const res = await api.inspections.getByWorkOrder(orderId);
        const list = res?.inspections || (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          const insp = list[0];
          if (insp.damagePoints && Array.isArray(insp.damagePoints)) {
            setPoints(
              insp.damagePoints.map((p) => {
                const localView = normalizeApiViewToLocal(p.view, detectedCategory);
                return {
                  id: p.id || Date.now() + Math.random(),
                  view: localView,
                  x: Number(p.xPercent ?? p.x ?? p.x_percent ?? 50),
                  y: Number(p.yPercent ?? p.y ?? p.y_percent ?? 50),
                  tipo: getFriendlyDamageLabel(p.damageType || p.damage_type),
                  descricao: p.notes || p.description || p.descricao || '',
                  fotoUrl: p.photoUrl || p.photo_url || '',
                  part: p.part || 'lataria',
                  severity: p.severity || 'low',
                };
              })
            );
          }
          if (insp.currentKm) setKm(String(insp.currentKm));
          if (insp.fuelLevel) setFuelLevel(String(insp.fuelLevel));
          if (insp.notes) setGeneralNotes(insp.notes);
          if (insp.signatureUrl || insp.customerSignatureUrl) {
            setSignature(insp.signatureUrl || insp.customerSignatureUrl);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar laudo de inspeção:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedChecklist();
  }, [osData, detectedCategory]);

  const handleContainerClick = (e, view) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newPoint = {
      id: Date.now() + Math.random(),
      view,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      tipo: '⚡ Risco / Arranhão',
      descricao: '',
      fotoUrl: '',
    };
    setPoints([...points, newPoint]);
    setSelectedPoint(newPoint);
  };

  const removePoint = (id) => setPoints(points.filter((p) => p.id !== id));

  const handleApplyDamagesFromAi = (aiDamages) => {
    const newPoints = aiDamages.map((dmg) => {
      let mappedView = 'superior';
      if (dmg.view === 'front') mappedView = 'frontal';
      else if (dmg.view === 'rear') mappedView = 'traseira';
      else if (dmg.view === 'left') mappedView = 'lateral_esquerda';
      else if (dmg.view === 'right') mappedView = 'lateral_direita';

      let tipoLabel = '⚡ Risco / Arranhão';
      if (dmg.damageType === 'paint_chip') tipoLabel = '⚡ Lasca de Pintura / Pedrisco';
      else if (dmg.damageType === 'dent') tipoLabel = '🔨 Amassado (PDR)';
      else if (dmg.damageType === 'swirl_marks') tipoLabel = '⚡ Micro-riscos / Hologramas';
      else if (dmg.damageType === 'oxidation') tipoLabel = '🌧️ Mancha / Oxidação';

      return {
        id: Date.now() + Math.random(),
        view: mappedView,
        x: dmg.xPercent || 50,
        y: dmg.yPercent || 50,
        tipo: tipoLabel,
        descricao: `${dmg.description || ''} [IA - Confiança: ${Math.round(
          (dmg.confidence || 0.9) * 100
        )}%]`.trim(),
        fotoUrl: '',
      };
    });

    setPoints((prev) => [...prev, ...newPoints]);
  };

  const handleApplyVoiceFromAi = (data) => {
    if (data.currentKm) setKm(String(data.currentKm));
    if (data.generalNotes) {
      setGeneralNotes((prev) => (prev ? `${prev}\n${data.generalNotes}` : data.generalNotes));
    }
  };

  const handleFinalSave = async (signatureData) => {
    const orderId = osData?.id || osData?.workOrderId;
    const vehicleId = osData?.vehicle?.id || osData?.vehicleId || osData?.veiculo_id;
    if (!orderId) {
      toast.error('Erro: ID da Ordem de Serviço não encontrado.');
      return;
    }

    setIsSaving(true);
    const result = await saveOrderChecklist(
      orderId,
      {
        vehicleId,
        vehicleCategory,
        customerName,
        points,
        generalNotes,
        km,
        fuelLevel: fuelLevel || '1/2',
      },
      signatureData
    );

    setIsSaving(false);
    if (result.success) {
      setSignature(signatureData);
      setShowSignature(false);
      setShowWhatsAppPrompt(true);
      toast.success('Laudo de inspeção salvo com sucesso!');
    } else {
      console.error('Erro ao salvar checklist:', result.error);
      toast.error(
        `Erro ao salvar laudo: ${
          result.error?.message || result.error?.details || 'Tente novamente.'
        }`
      );
    }
  };

  // Helper para resolver o caminho da imagem de cada ângulo
  const getAngleImagePath = (cat, angleId) => {
    let fileName = angleId;
    if (angleId === 'superior') fileName = 'principal';
    if (angleId === 'perfil_esq') fileName = 'lateral_esquerda';
    if (angleId === 'perfil_dir') fileName = 'lateral_direita';
    return `/assets/inspection/${cat}/${fileName}.png`;
  };

  const ImageView = ({
    title,
    viewId,
    className = '',
    imageClassName = 'object-contain',
    containerClassName = 'h-[240px] md:h-[300px]',
  }) => {
    const [imgError, setImgError] = useState(false);
    const pointsInView = points.filter((p) => p.view === viewId);

    return (
      <div
        className={`relative flex flex-col gap-2.5 p-3 sm:p-4 bg-[#171C24] rounded-2xl border border-[#2E3744] hover:border-[#C8F52E]/40 transition-all overflow-hidden group shadow-md ${className}`}
      >
        <div className="flex items-center justify-between w-full px-1 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] md:text-xs font-black uppercase text-[#F2F5F8] tracking-[0.12em]">
              {title}
            </span>
            {pointsInView.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black tabular-nums">
                {pointsInView.length} {pointsInView.length === 1 ? 'dano' : 'danos'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#9AA7B8] font-bold">
            <Camera size={14} className="group-hover:text-[#C8F52E] transition-colors" />
            <span className="hidden sm:inline">Toque para marcar</span>
          </div>
        </div>

        <div
          style={{
            background: 'radial-gradient(circle at 50% 50%, #FFFFFF 0%, #E9ECEF 100%)',
          }}
          className={`relative w-full cursor-crosshair rounded-xl overflow-hidden flex items-center justify-center border border-[#2E3744]/40 shadow-inner ${containerClassName}`}
          onClick={(e) => handleContainerClick(e, viewId)}
        >
          {!imgError ? (
            <img
              src={getAngleImagePath(vehicleCategory, viewId)}
              alt={title}
              className={`w-full h-full p-2 sm:p-4 mix-blend-multiply opacity-95 select-none transition-transform duration-300 group-hover:scale-[1.02] ${imageClassName}`}
              onError={(e) => {
                if (!e.currentTarget.dataset.fallback) {
                  e.currentTarget.dataset.fallback = 'true';
                  e.currentTarget.src = `/assets/checklist/${vehicleCategory}/${viewId}.png`;
                } else {
                  setImgError(true);
                }
              }}
            />
          ) : (
            <div className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2">
              <Car size={16} /> Render {vehicleCategory}/{viewId}.png indisponível
            </div>
          )}

          <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-lg">
            {pointsInView.map((p) => {
              const ptIdx = points.findIndex((item) => item.id === p.id) + 1;
              return (
                <g
                  key={p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPoint(p);
                  }}
                  className="pointer-events-auto cursor-pointer transition-transform hover:scale-125"
                  title={`#${ptIdx} - ${p.tipo || 'Dano'}`}
                >
                  <circle
                    cx={`${p.x}%`}
                    cy={`${p.y}%`}
                    r="15"
                    className="fill-rose-500/25 stroke-rose-500 stroke-[2.5] animate-pulse"
                  />
                  <circle cx={`${p.x}%`} cy={`${p.y}%`} r="10" className="fill-rose-600" />
                  <text
                    x={`${p.x}%`}
                    y={`${p.y}%`}
                    textAnchor="middle"
                    dy=".35em"
                    className="fill-white text-[9px] font-black pointer-events-none"
                  >
                    {ptIdx > 0 ? ptIdx : ''}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden font-sans">
      <div className="bg-[#0E1116] rounded-2xl w-full max-w-7xl h-full flex flex-col overflow-hidden shadow-2xl border border-[#2E3744] max-h-[96vh]">
        {/* Cabeçalho Novo — Design System Rebrand CarX */}
        <div className="p-4 sm:p-5 md:p-6 bg-[#171C24] flex flex-wrap items-center justify-between border-b border-[#262D35] gap-4 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 md:w-12 md:h-12 bg-[#0E1116] border border-[#2E3744] rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck size={24} className="text-[#C8F52E]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-[#F2F5F8] uppercase leading-none">
                Laudo de Inspeção Digital
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#F2F5F8]">{customerName}</span>
                <span className="text-[#6B7A90]">·</span>
                <span className="text-xs font-medium text-[#9AA7B8]">{vehicleDesc}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-[#2E3744] bg-[#0E1116] text-[#F2F5F8] font-mono text-[11px] font-bold">
                  {vehiclePlate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Seletor de Categoria do Veículo */}
            <div className="hidden lg:flex items-center bg-[#0E1116] border border-[#2E3744] rounded-xl p-1 gap-1">
              {VEHICLE_CATEGORIES.map((c) => {
                const isActive = c.id === vehicleCategory;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setVehicleCategory(c.id);
                      toast.info(`Silhueta alterada para ${c.label}.`);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      isActive
                        ? 'bg-[#C8F52E] text-[#0E1116]'
                        : 'text-[#9AA7B8] hover:text-[#F2F5F8] hover:bg-[#171C24]'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Botão Vistoria com IA — Alto Contraste */}
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-[#C8F52E] hover:bg-[#bbf01f] text-[#0E1116] rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <Sparkles size={16} className="text-[#0E1116]" />
              <span>Vistoria com IA</span>
            </button>

            {/* Botão Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-[#0E1116] hover:bg-[#202732] border border-[#2E3744] text-[#9AA7B8] hover:text-white flex items-center justify-center transition-all"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Barra de Categoria no Mobile/Tablet */}
        <div className="lg:hidden px-4 py-2 bg-[#131820] border-b border-[#262D35] flex items-center justify-between gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold text-[#9AA7B8] uppercase">Porte:</span>
          <div className="flex items-center gap-1">
            {VEHICLE_CATEGORIES.map((c) => {
              const isActive = c.id === vehicleCategory;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setVehicleCategory(c.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isActive ? 'bg-[#C8F52E] text-[#0E1116]' : 'text-[#9AA7B8] bg-[#171C24]'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0E1116]">
            <div className="w-10 h-10 border-3 border-[#C8F52E]/30 border-t-[#C8F52E] rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-bold text-[#9AA7B8] uppercase tracking-widest animate-pulse">
              Carregando dados da inspeção...
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0E1116]">
            <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 flex flex-col lg:flex-row gap-5 md:gap-6 items-start">
              {/* Seção Principal de Imagens */}
              <div className="flex-1 w-full min-w-0 flex flex-col gap-4">
                {/* Abas de Navegação Rápida entre Ângulos */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {views.map((v) => {
                    const count = getPointsCountForView(v.id);
                    const isActive = activeView === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setActiveView(v.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                          isActive
                            ? 'bg-[#171C24] text-[#C8F52E] border-[#C8F52E]'
                            : 'bg-[#131820] text-[#9AA7B8] border-[#2E3744] hover:text-[#F2F5F8] hover:border-[#9AA7B8]/40'
                        }`}
                      >
                        <span>{v.label}</span>
                        {count > 0 && (
                          <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Grade de Imagens da Vistoria */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {/* Visão Ativa em Destaque Expandido */}
                  <ImageView
                    title={views.find((v) => v.id === activeView)?.label || 'Visão Principal'}
                    viewId={activeView}
                    className="md:col-span-2"
                    containerClassName="h-[320px] sm:h-[400px] md:h-[460px]"
                  />

                  {/* As outras vistas em cards menores abaixo */}
                  {views
                    .filter((v) => v.id !== activeView)
                    .map((v) => (
                      <ImageView
                        key={v.id}
                        title={v.label}
                        viewId={v.id}
                        containerClassName="h-[200px] sm:h-[240px] md:h-[280px]"
                      />
                    ))}
                </div>
              </div>

              {/* Painel Lateral do Formulário (Sticky) */}
              <div className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-4 lg:self-start">
                <div className="bg-[#171C24] rounded-2xl border border-[#2E3744] p-5 flex flex-col gap-5 shadow-xl">
                  {/* Resumo de Avarias */}
                  <div className="flex items-center justify-between border-b border-[#262D35] pb-3">
                    <h4 className="text-xs font-black uppercase text-[#F2F5F8] tracking-wider">
                      Resumo do Laudo
                    </h4>
                    <div
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        points.length > 0
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-[#2E3744] text-[#9AA7B8]'
                      }`}
                    >
                      {points.length} {points.length === 1 ? 'Avaria' : 'Avarias'}
                    </div>
                  </div>

                  {/* Campos do Laudo */}
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#9AA7B8] tracking-wider mb-1.5 block">
                        Relato Técnico Geral
                      </label>
                      <textarea
                        className="w-full min-h-[110px] p-3 border border-[#2E3744] rounded-xl text-xs bg-[#0E1116] text-[#F2F5F8] focus:border-[#C8F52E] outline-none transition-all font-medium placeholder:text-[#6B7A90] resize-none"
                        value={generalNotes}
                        placeholder="Escreva observações gerais do veículo..."
                        onChange={(e) => setGeneralNotes(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#9AA7B8] tracking-wider block mb-1.5">
                        Quilometragem (KM)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full p-3 border border-[#2E3744] rounded-xl text-xs font-bold bg-[#0E1116] text-[#F2F5F8] focus:border-[#C8F52E] outline-none transition-all placeholder:text-[#6B7A90]"
                          placeholder="Ex: 45.000"
                          value={km}
                          onChange={(e) => setKm(e.target.value)}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#6B7A90] uppercase">
                          KM
                        </span>
                      </div>
                    </div>

                    {/* Seletor Visual de Nível de Combustível */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-bold uppercase text-[#9AA7B8] tracking-wider block">
                          Nível de Combustível
                        </label>
                        <span className="text-[10px] font-extrabold text-[#C8F52E] tracking-wider uppercase">
                          {fuelLevel}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#0E1116] rounded-xl border border-[#2E3744]">
                        {FUEL_LEVELS.map((lvl, idx) => {
                          const activeIdx = FUEL_LEVELS.indexOf(fuelLevel);
                          const filled = idx <= activeIdx;
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setFuelLevel(lvl)}
                              className="flex flex-col items-center gap-1.5 p-1 rounded-lg hover:bg-[#171C24] transition-all group"
                              title={`Nível de Combustível: ${lvl}`}
                            >
                              <span
                                className={`h-2.5 w-full rounded-sm transition-colors duration-150 ${
                                  filled
                                    ? activeIdx === 0
                                      ? 'bg-[#FF9500]'
                                      : 'bg-[#C8F52E]'
                                    : 'bg-[#2E3744]'
                                }`}
                              />
                              <span
                                className={`text-[10px] font-extrabold transition-colors ${
                                  fuelLevel === lvl ? 'text-[#F2F5F8]' : 'text-[#9AA7B8]'
                                }`}
                              >
                                {lvl}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {signature && (
                      <div className="p-3 bg-[#0E1116] rounded-xl border border-[#2E3744]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-black uppercase text-[#9AA7B8]">
                            Assinatura do Cliente
                          </span>
                          <span className="text-[9px] font-bold text-[#C8F52E] flex items-center gap-1">
                            <CheckCircle2 size={12} /> Confirmada
                          </span>
                        </div>
                        <img
                          src={signature}
                          alt="Signature"
                          className="h-10 w-full object-contain bg-white rounded-lg p-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Botões de Ação Inferiores */}
                  <div className="border-t border-[#262D35] pt-4 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setShowVcrModal(true)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={16} /> Ver Laudo Digital (VCR PDF)
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSignature(true)}
                      disabled={isSaving}
                      className={`w-full py-3.5 bg-[#C8F52E] hover:bg-[#bbf01f] text-[#0E1116] rounded-xl text-xs font-black uppercase tracking-wider shadow-xl shadow-[#C8F52E]/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${
                        isSaving ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#0E1116]/30 border-t-[#0E1116] rounded-full animate-spin"></div>
                          Salvando...
                        </div>
                      ) : (
                        <>
                          <Save size={16} /> Finalizar e Assinar
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 text-xs font-bold text-[#9AA7B8] hover:text-[#F2F5F8] bg-[#0E1116] hover:bg-[#202732] border border-[#2E3744] rounded-xl uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Assinatura Digital do Cliente */}
      {showSignature && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-[#171C24] rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden border border-[#2E3744]">
            <div className="p-5 bg-[#171C24] border-b border-[#262D35] flex items-center justify-between">
              <div>
                <h4 className="text-lg font-extrabold text-[#F2F5F8] uppercase tracking-tight">
                  Assinatura do Cliente
                </h4>
                <p className="text-[11px] text-[#9AA7B8] font-medium mt-0.5">
                  Termo de vistoria e recebimento do veículo na loja.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSignature(false)}
                className="w-9 h-9 rounded-xl bg-[#0E1116] border border-[#2E3744] text-[#9AA7B8] hover:text-white flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <SignaturePad onSave={handleFinalSave} onCancel={() => setShowSignature(false)} />

              <div className="flex items-center gap-2.5 p-3.5 bg-[#0E1116] rounded-xl border border-[#2E3744] text-[11px] text-[#9AA7B8] font-medium">
                <Info size={16} className="text-[#C8F52E] shrink-0" />
                <span>
                  Ao assinar, o cliente confirma as condições visuais e quilometragem registradas
                  neste laudo digital.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pós-Vistoria (WhatsApp / QR Code) */}
      {showWhatsAppPrompt && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[400] flex items-center justify-center p-4">
          <div className="bg-[#171C24] rounded-2xl p-6 max-w-md w-full shadow-2xl text-center border border-[#2E3744]">
            <div className="w-16 h-16 bg-[#0E1116] text-[#C8F52E] border border-[#2E3744] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <ShieldCheck size={32} />
            </div>
            <h4 className="text-xl font-extrabold text-[#F2F5F8] uppercase mb-1">
              Checklist Gravado!
            </h4>
            <p className="text-xs text-[#9AA7B8] font-medium mb-6 px-2 leading-relaxed">
              Laudo assinado e registrado. Deseja enviar o link de acompanhamento e termo digital ao
              cliente agora?
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowWhatsAppPrompt(false);
                  setShowQRModal(true);
                }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <QrCode size={16} /> Exibir QR Code na Recepção
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = (customerPhone || '').replace(/\D/g, '');
                  sendWhatsApp(
                    cleanPhone || '11999999999',
                    getVehicleReceivedMsg(
                      customerName,
                      vehicleDesc,
                      osData?.tracking_token || osData?.id
                    )
                  );
                  setShowWhatsAppPrompt(false);
                  onClose();
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg transition-all"
              >
                Enviar Link por WhatsApp
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWhatsAppPrompt(false);
                  onClose();
                }}
                className="w-full py-2.5 bg-[#0E1116] hover:bg-[#202732] text-[#9AA7B8] hover:text-[#F2F5F8] rounded-xl text-xs font-bold uppercase tracking-wider border border-[#2E3744] transition-all"
              >
                Concluir sem Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {showQRModal && (
        <QRCodeModal
          os={osData}
          onClose={() => {
            setShowQRModal(false);
            onClose();
          }}
        />
      )}

      {showVcrModal && (
        <VcrReportModal
          isOpen={showVcrModal}
          onClose={() => setShowVcrModal(false)}
          osData={osData}
          points={points}
          generalNotes={generalNotes}
          km={km}
          fuelLevel={fuelLevel}
          signature={signature}
        />
      )}

      {/* Modal de Detalhamento da Avaria Selecionada */}
      {selectedPoint && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-[#171C24] rounded-2xl w-full max-w-md p-5 shadow-2xl border border-[#2E3744] space-y-4">
            <div className="flex items-center justify-between border-b border-[#262D35] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center">
                  {points.findIndex((p) => p.id === selectedPoint.id) + 1 || '#'}
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#F2F5F8]">
                  Registrar Avaria · {getViewLabelPT(selectedPoint.view)}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoint(null)}
                className="text-[#9AA7B8] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-2">
                Tipo de Avaria
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  '⚡ Risco / Arranhão',
                  '🔨 Amassado / Mossa',
                  '🎨 Pintura Queimada',
                  '🪟 Trinca / Vidro',
                  '🫧 Mancha / Resina',
                  '❓ Outro / Desgaste',
                ].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const updated = points.map((p) =>
                        p.id === selectedPoint.id ? { ...p, tipo: t } : p
                      );
                      setPoints(updated);
                      setSelectedPoint({ ...selectedPoint, tipo: t });
                    }}
                    className={`py-2 px-2.5 rounded-xl text-[10px] font-bold uppercase text-left truncate border transition-all ${
                      (selectedPoint.tipo || '⚡ Risco / Arranhão') === t
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md'
                        : 'bg-[#0E1116] text-[#9AA7B8] border-[#2E3744] hover:border-[#9AA7B8]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-1">
                Descrição do Dano
              </label>
              <input
                type="text"
                value={selectedPoint.descricao || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const updated = points.map((p) =>
                    p.id === selectedPoint.id ? { ...p, descricao: val } : p
                  );
                  setPoints(updated);
                  setSelectedPoint({ ...selectedPoint, descricao: val });
                }}
                placeholder="Ex: Risco de 5cm próximo à maçaneta"
                className="w-full p-2.5 bg-[#0E1116] border border-[#2E3744] rounded-xl text-xs font-medium text-[#F2F5F8] focus:border-[#C8F52E] outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B8] block mb-1">
                Foto de Evidência (Opcional)
              </label>
              <div className="flex items-center gap-3">
                {selectedPoint.fotoUrl && (
                  <div className="relative w-16 h-14 rounded-xl overflow-hidden border border-[#2E3744] group shrink-0">
                    <img
                      src={selectedPoint.fotoUrl}
                      alt="Avaria"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = points.map((p) =>
                          p.id === selectedPoint.id ? { ...p, fotoUrl: '' } : p
                        );
                        setPoints(updated);
                        setSelectedPoint({ ...selectedPoint, fotoUrl: '' });
                      }}
                      className="absolute inset-0 bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                <label className="flex-1 py-2.5 px-3 bg-[#0E1116] hover:bg-[#202732] text-[#9AA7B8] hover:text-[#F2F5F8] rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 border border-dashed border-[#2E3744] transition-all">
                  {isUploadingPhoto ? (
                    <span className="animate-pulse">Enviando...</span>
                  ) : (
                    <>
                      <Camera size={14} className="text-[#C8F52E]" />
                      <span>
                        {selectedPoint.fotoUrl ? 'Trocar Foto' : 'Anexar Foto da Avaria'}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={isUploadingPhoto}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const orderId = osData?.id || osData?.workOrderId;
                      setIsUploadingPhoto(true);
                      try {
                        const res = await uploadOsPhoto(orderId, file, 'antes', 'livre');
                        if (res.success && res.url) {
                          const updated = points.map((p) =>
                            p.id === selectedPoint.id ? { ...p, fotoUrl: res.url } : p
                          );
                          setPoints(updated);
                          setSelectedPoint({ ...selectedPoint, fotoUrl: res.url });
                          toast.success('Foto da avaria anexada!');
                        } else {
                          toast.error(
                            'Erro ao enviar foto: ' + (res.error?.message || 'Tente novamente')
                          );
                        }
                      } catch (err) {
                        console.error(err);
                        toast.error('Erro ao enviar foto.');
                      } finally {
                        setIsUploadingPhoto(false);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#262D35]">
              <button
                type="button"
                onClick={() => {
                  removePoint(selectedPoint.id);
                  setSelectedPoint(null);
                }}
                className="py-2 px-3 bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Excluir Ponto
              </button>

              <button
                type="button"
                onClick={() => setSelectedPoint(null)}
                className="py-2 px-5 bg-[#C8F52E] hover:bg-[#bbf01f] text-[#0E1116] rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all"
              >
                Confirmar Dano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Assistente de IA de Vistoria (T6.14) */}
      <AiInspectionAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        workOrderId={osData?.id || osData?.workOrderId}
        vehicleType={vehicleCategory}
        onApplyDamagesToDiagram={handleApplyDamagesFromAi}
        onApplyVoiceChecklist={handleApplyVoiceFromAi}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
};

export default CarVisualChecklist;
