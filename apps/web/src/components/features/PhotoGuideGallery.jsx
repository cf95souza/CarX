import React, { useState, useMemo } from 'react';
import { 
  Camera, 
  Eye, 
  Trash2, 
  Loader2, 
  ShieldCheck, 
  Plus, 
  AlertCircle, 
  Sparkles, 
  Download, 
  CheckCircle2,
  X,
  Wrench,
  Layers,
  Car,
  Focus,
  SlidersHorizontal
} from 'lucide-react';
import { PHOTO_PHASES, PHOTO_ANGLES, getPhaseInfo, getAngleInfo } from '../../utils/photoConstants';
import PhotoComparisonModal from './PhotoComparisonModal';
import { compressImageClientSide } from '../../utils/imageCompressor';

// Helper para ícones vetoriais modernos de cada fase
function getPhaseIcon(phaseId) {
  switch (phaseId) {
    case 'antes':
      return Camera;
    case 'durante':
      return Wrench;
    case 'depois':
      return Sparkles;
    default:
      return Camera;
  }
}

// Helper para ícones de ângulos
function getAngleIcon(angleId) {
  switch (angleId) {
    case 'livre':
      return Focus;
    default:
      return Car;
  }
}

const PhotoGuideGallery = ({
  photos = [],
  onUpload,
  onDelete,
  isReadOnly = false,
  loading = false,
  vehicleDesc = 'Veículo',
  osId
}) => {
  const [activePhase, setActivePhase] = useState('durante');
  const [uploadingSlot, setUploadingSlot] = useState(null); // 'fase:angulo'
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  // Verifica se há fotos de antes e depois para liberar o botão comparador
  const hasComparison = useMemo(() => {
    return PHOTO_ANGLES.some(ang => {
      const temAntes = photos.some(p => p.angulo === ang.id && p.fase_execucao === 'antes');
      const temDepois = photos.some(p => p.angulo === ang.id && p.fase_execucao === 'depois');
      return temAntes && temDepois;
    });
  }, [photos]);

  // Handle Upload individual por slot com compactação client-side automática
  const handleSlotUpload = async (e, fase, angulo) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !onUpload) return;

    const slotKey = `${fase}:${angulo}`;
    setUploadingSlot(slotKey);
    try {
      // Compactação em Canvas/WebP (max 1280px / 80% qualidade)
      const compressedFile = await compressImageClientSide(rawFile, 1280, 1280, 0.8);
      await onUpload(compressedFile, fase, angulo);
    } finally {
      setUploadingSlot(null);
      e.target.value = ''; // limpa input
    }
  };

  const activePhaseInfo = getPhaseInfo(activePhase);
  const ActiveIcon = getPhaseIcon(activePhase);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Barra Superior: Status do Rastreamento e Botão Comparador */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#171C24] p-5 md:p-6 rounded-2xl border border-[#2E3744] shadow-sm text-[#F2F5F8]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-[#C8F52E] animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F2F5F8]">
              Vistoria Guiada 360° & Acabamento
            </h4>
          </div>
          <p className="text-[11px] font-bold text-[#8A9BA8]">
            {isReadOnly 
              ? 'Acompanhe a documentação fotográfica do veículo separada por fase e ângulo.' 
              : 'Fotos são compactadas automaticamente no dispositivo (WebP max 1280px) para máxima performance.'}
          </p>
        </div>

        {/* Botão de Comparação Antes x Depois */}
        <button
          type="button"
          onClick={() => setIsComparing(true)}
          disabled={!hasComparison}
          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-sm shrink-0 ${
            hasComparison
              ? 'bg-[#C8F52E] text-[#0E1116] hover:bg-[#b8e520] cursor-pointer'
              : 'bg-[#0E1116] text-[#8A9BA8] border border-[#2E3744] cursor-not-allowed opacity-60'
          }`}
          title={hasComparison ? 'Abra o comparador visual' : 'Registre ao menos uma foto ANTES e DEPOIS do mesmo ângulo para ativar o comparador'}
        >
          <Layers size={16} className={hasComparison ? 'text-[#0E1116]' : 'text-[#8A9BA8]'} />
          <span>Comparar Antes x Depois</span>
          {!hasComparison && <span className="text-[9px] font-bold opacity-75">(Pendente)</span>}
        </button>
      </div>

      {/* Botões das Fases da Vistoria (Antes | Durante | Depois) - Segmented Control Dark */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#0E1116] p-2 rounded-2xl border border-[#2E3744]">
        {PHOTO_PHASES.map((ph) => {
          const count = photos.filter(p => p.fase_execucao === ph.id).length;
          const isActive = activePhase === ph.id;
          const PhaseIcon = getPhaseIcon(ph.id);

          return (
            <button
              key={ph.id}
              type="button"
              onClick={() => setActivePhase(ph.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                isActive
                  ? 'bg-[#171C24] text-[#C8F52E] border-[#C8F52E]/50 shadow-md ring-1 ring-[#C8F52E]/30'
                  : 'bg-[#131820]/60 text-[#8A9BA8] border-transparent hover:text-[#F2F5F8] hover:bg-[#171C24]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <PhaseIcon size={16} className={isActive ? 'text-[#C8F52E]' : 'text-[#8A9BA8]'} />
                <span>{ph.label}</span>
              </div>
              <span className={`h-5 min-w-[22px] px-1.5 flex items-center justify-center rounded-full text-[11px] font-mono font-bold ${
                isActive
                  ? 'bg-[#C8F52E] text-[#0E1116]'
                  : 'bg-[#1E2530] text-[#8A9BA8]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Descrição da Fase Ativa com Ícone Vetorial */}
      <div className="px-1 flex items-center justify-between text-xs">
        <span className="font-bold text-[#8A9BA8] uppercase tracking-wider flex items-center gap-2">
          <ActiveIcon size={14} className="text-[#C8F52E]" />
          <span>{activePhaseInfo.description}</span>
        </span>
        <span className="text-[10px] font-medium text-[#8A9BA8] hidden sm:inline">
          Toque no card para fotografar ou enviar
        </span>
      </div>

      {/* Grid de Ângulos Guiados */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 size={30} className="text-[#C8F52E] animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#8A9BA8]">Carregando fotos da vistoria...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {PHOTO_ANGLES.map((ang) => {
            const slotPhotos = photos.filter(p => p.fase_execucao === activePhase && p.angulo === ang.id);
            const mainPhoto = slotPhotos[0];
            const slotKey = `${activePhase}:${ang.id}`;
            const isUploadingThis = uploadingSlot === slotKey;
            const AngleIcon = getAngleIcon(ang.id);

            return (
              <div
                key={ang.id}
                className={`group relative rounded-2xl overflow-hidden border transition-all flex flex-col ${
                  mainPhoto
                    ? 'bg-[#171C24] border-[#2E3744] shadow-md hover:border-[#8A9BA8]'
                    : 'bg-[#131820] border-dashed border-2 border-[#2E3744] hover:border-[#C8F52E]/50'
                }`}
              >
                {/* Header do Cartão */}
                <div className="p-3 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent absolute top-0 inset-x-0 pointer-events-none">
                  <span className="text-xs font-black text-[#F2F5F8] uppercase tracking-wider flex items-center gap-2 drop-shadow">
                    <AngleIcon size={14} className="text-[#C8F52E]" />
                    <span>{ang.label}</span>
                  </span>
                  {mainPhoto && (
                    <span className="w-5 h-5 rounded-full bg-[#C8F52E] text-[#0E1116] flex items-center justify-center shadow font-black">
                      <CheckCircle2 size={12} />
                    </span>
                  )}
                </div>

                {/* Corpo do Cartão: Imagem ou Dropzone */}
                <div className="aspect-[4/3] w-full relative flex items-center justify-center overflow-hidden">
                  {isUploadingThis ? (
                    <div className="absolute inset-0 bg-[#0E1116]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-[#F2F5F8] z-20">
                      <Loader2 size={24} className="animate-spin text-[#C8F52E]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#C8F52E]">Compactando & Enviando...</span>
                    </div>
                  ) : null}

                  {mainPhoto ? (
                    <>
                      <img
                        src={mainPhoto.url}
                        alt={ang.label}
                        onClick={() => setLightboxPhoto(mainPhoto)}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                      />
                      
                      {/* Badge de contador se houver mais de 1 foto no slot */}
                      {slotPhotos.length > 1 && (
                        <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-[#C8F52E] text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border border-[#2E3744]">
                          +{slotPhotos.length - 1} foto{slotPhotos.length > 2 ? 's' : ''}
                        </span>
                      )}
                    </>
                  ) : (
                    /* Dropzone Vazia sem Emojis */
                    <div className="text-center p-5 flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8A9BA8] group-hover:text-[#C8F52E] group-hover:border-[#C8F52E]/30 transition-all">
                        <AngleIcon size={20} />
                      </div>
                      <p className="text-[10px] font-bold text-[#8A9BA8] max-w-[130px] leading-tight">
                        {ang.description}
                      </p>
                      {!isReadOnly && (
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#C8F52E] bg-[#C8F52E]/10 border border-[#C8F52E]/20 px-2.5 py-1 rounded-full group-hover:bg-[#C8F52E] group-hover:text-[#0E1116] transition-colors">
                          + Fotografar
                        </span>
                      )}
                    </div>
                  )}

                  {/* Input de Arquivo Invisível com Compactação Automática */}
                  {!isReadOnly && onUpload && (
                    <label className="absolute inset-0 cursor-pointer z-10" title={`Adicionar foto em ${ang.label}`}>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        disabled={isUploadingThis}
                        onChange={(e) => handleSlotUpload(e, activePhase, ang.id)}
                      />
                    </label>
                  )}
                </div>

                {/* Footer de Ações Rápidas (Apenas quando já tem foto) */}
                {mainPhoto && (
                  <div className="p-2 bg-[#0E1116] border-t border-[#2E3744] flex items-center justify-between relative z-20">
                    <button
                      type="button"
                      onClick={() => setLightboxPhoto(mainPhoto)}
                      className="text-[10px] font-bold uppercase tracking-wider text-[#8A9BA8] hover:text-[#F2F5F8] flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Eye size={12} /> Ampliar
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Botão de Add foto extra ao slot */}
                      {!isReadOnly && onUpload && (
                        <label className="p-1.5 text-[#8A9BA8] hover:text-[#C8F52E] rounded-lg cursor-pointer transition-colors" title="Adicionar outra foto a este ângulo">
                          <Plus size={14} />
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleSlotUpload(e, activePhase, ang.id)}
                          />
                        </label>
                      )}

                      {/* Botão de Deletar */}
                      {!isReadOnly && onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(mainPhoto.id, mainPhoto.url)}
                          className="p-1.5 text-[#8A9BA8] hover:text-rose-400 rounded-lg transition-colors"
                          title="Excluir esta foto"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lista Secundária de Fotos Extras */}
      {photos.filter(p => p.fase_execucao === activePhase).length > 5 && (
        <div className="space-y-3 pt-4 border-t border-[#2E3744]">
          <h5 className="text-xs font-bold uppercase tracking-wider text-[#8A9BA8] flex items-center gap-2">
            <Camera size={14} className="text-[#C8F52E]" />
            <span>Todas as Fotos Registradas na Fase — {activePhaseInfo.label}</span>
          </h5>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {photos.filter(p => p.fase_execucao === activePhase).map((p, idx) => {
              const angInfo = getAngleInfo(p.angulo);
              const AngleIcon = getAngleIcon(p.angulo);
              return (
                <div
                  key={p.id || idx}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-[#2E3744] bg-[#171C24] shadow-sm hover:border-[#8A9BA8] transition-all cursor-pointer"
                  onClick={() => setLightboxPhoto(p)}
                >
                  <img src={p.url} alt={angInfo.label} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 right-1 bg-black/80 text-[#F2F5F8] text-[8px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded truncate text-center flex items-center justify-center gap-1">
                    <AngleIcon size={10} className="text-[#C8F52E]" />
                    <span>{angInfo.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setLightboxPhoto(null)}>
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            
            <div className="w-full flex items-center justify-between p-4 text-[#F2F5F8]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#C8F52E]">
                  <Camera size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8F52E] block">
                    Fase: {getPhaseInfo(lightboxPhoto.fase_execucao).label}
                  </span>
                  <h4 className="text-lg font-black uppercase">
                    {getAngleInfo(lightboxPhoto.angulo).label}
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="p-3 bg-[#171C24] hover:bg-[#2E3744] border border-[#2E3744] rounded-xl text-[#F2F5F8] transition-all"
                  title="Baixar imagem original"
                >
                  <Download size={18} />
                </a>
                {!isReadOnly && onDelete && (
                  <button
                    type="button"
                    onClick={() => { onDelete(lightboxPhoto.id, lightboxPhoto.url); setLightboxPhoto(null); }}
                    className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all border border-rose-500/20"
                    title="Excluir imagem"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="p-3 bg-[#171C24] hover:bg-[#2E3744] border border-[#2E3744] rounded-xl text-[#F2F5F8] transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl border border-[#2E3744] shadow-2xl bg-black">
              <img src={lightboxPhoto.url} alt="Ampliador" className="max-w-full max-h-[75vh] object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comparação Antes x Depois */}
      <PhotoComparisonModal
        isOpen={isComparing}
        onClose={() => setIsComparing(false)}
        photos={photos}
        vehicleDesc={vehicleDesc}
      />

    </div>
  );
};

export default PhotoGuideGallery;
