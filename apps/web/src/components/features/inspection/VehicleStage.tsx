import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, Hand } from 'lucide-react';
import {
  type InspectionAngle,
  type VehicleCategory,
  type DamageSeverity,
  getAngleImage,
  getAngleOption,
} from './inspectionCatalog';

export interface StagePin {
  id: string;
  number: number;
  xPercent: number;
  yPercent: number;
  severity: DamageSeverity;
}

interface VehicleStageProps {
  category: VehicleCategory;
  angle: InspectionAngle;
  pins: StagePin[];
  selectedPinId: string | null;
  onTap: (xPercent: number, yPercent: number) => void;
  onSelectPin: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

const DEFAULT_ASPECT = 4 / 3;
const SWIPE_THRESHOLD_PX = 48;
const TAP_TOLERANCE_PX = 10;

/**
 * Palco de estúdio da vistoria: exibe o clay render do ângulo atual sobre fundo de estúdio
 * claro (o branco do render é fundido via mix-blend-multiply), recebe toques para marcar
 * avarias e gestos de swipe para alternar ângulos.
 *
 * As coordenadas são calculadas sobre o retângulo exato da imagem (aspect-ratio natural),
 * garantindo que os pinos fiquem no mesmo ponto da carroceria em qualquer tamanho de tela.
 */
export const VehicleStage: React.FC<VehicleStageProps> = ({
  category,
  angle,
  pins,
  selectedPinId,
  onTap,
  onSelectPin,
  onPrev,
  onNext,
}) => {
  const src = getAngleImage(category, angle);
  const angleInfo = getAngleOption(angle);
  const [aspect, setAspect] = useState<number>(DEFAULT_ASPECT);
  // Estado de carregamento vinculado ao `src` atual (evita corrida ao trocar de ângulo)
  const [loadState, setLoadState] = useState<{ src: string; ok: boolean } | null>(null);
  const status: 'loading' | 'ready' | 'error' =
    loadState?.src === src ? (loadState.ok ? 'ready' : 'error') : 'loading';
  const [ripple, setRipple] = useState<{ key: number; x: number; y: number } | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ripple) return;
    const timer = window.setTimeout(() => setRipple(null), 650);
    return () => window.clearTimeout(timer);
  }, [ripple]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start) return;
      if ((e.target as HTMLElement).closest('[data-pin]')) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;

      if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) onNext();
        else onPrev();
        return;
      }

      if (Math.hypot(dx, dy) > TAP_TOLERANCE_PX || status !== 'ready') return;

      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;

      const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
      if (x < 0 || x > 100 || y < 0 || y > 100) return;

      setRipple({ key: Date.now(), x, y });
      onTap(x, y);
    },
    [onNext, onPrev, onTap, status]
  );

  return (
    <div className="relative rounded-2xl border border-[#2E3744] overflow-hidden select-none">
      {/* Fundo de estúdio neutro (cyclorama claro) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 85% at 50% 30%, #FFFFFF 0%, #F1F3F6 45%, #DCE1E7 100%)',
        }}
      />

      {/* Cabeçalho do palco */}
      <div className="relative z-10 flex items-center justify-between px-3 pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0E1116]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1.5px] text-[#F2F5F8]">
          {angleInfo.label}
        </span>
        <span
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1px] ${
            pins.length > 0 ? 'bg-[#FF9500] text-[#0E1116]' : 'bg-white/80 text-[#5B6674] border border-[#D5DBE2]'
          }`}
        >
          {pins.length > 0 ? `${pins.length} avaria${pins.length > 1 ? 's' : ''}` : 'Sem avarias'}
        </span>
      </div>

      {/* Superfície interativa (proporção exata do render) */}
      <div className="relative z-0 px-2 pb-2">
        <div
          ref={surfaceRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => (pointerStart.current = null)}
          className="relative w-full cursor-crosshair touch-pan-y"
          style={{ aspectRatio: String(aspect) }}
          role="application"
          aria-label={`Render ${angleInfo.label}. Toque para marcar uma avaria.`}
        >
          {status !== 'error' && (
            <img
              key={src}
              src={src}
              alt={`Veículo · ${angleInfo.label}`}
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setAspect(img.naturalWidth / img.naturalHeight);
                }
                setLoadState({ src, ok: true });
              }}
              onError={() => setLoadState({ src, ok: false })}
              className={`absolute inset-0 h-full w-full object-contain mix-blend-multiply pointer-events-none transition-opacity duration-200 ${
                status === 'ready' ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-[#C3CAD3] border-t-[#5B6674] animate-spin" />
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#5B6674]">
              <ImageOff size={28} />
              <span className="text-xs font-semibold">Render indisponível para este ângulo</span>
            </div>
          )}

          {/* Feedback do toque */}
          {ripple && (
            <span
              key={ripple.key}
              style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
              className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0E1116]/50 animate-ping"
            />
          )}

          {/* Pinos de avaria */}
          {pins.map((p) => {
            const isSelected = p.id === selectedPinId;
            const isHigh = p.severity === 'high';
            return (
              <button
                key={p.id}
                type="button"
                data-pin
                aria-label={`Avaria ${p.number}`}
                onClick={() => onSelectPin(p.id)}
                style={{ left: `${p.xPercent}%`, top: `${p.yPercent}%` }}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 p-1.5"
              >
                {isSelected && (
                  <span
                    className={`absolute inset-1 rounded-full animate-ping ${
                      isHigh ? 'bg-[#FF453A]/40' : 'bg-[#FF9500]/40'
                    }`}
                  />
                )}
                <span
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold tabular-nums shadow-md shadow-black/30 transition-transform duration-150 ${
                    isHigh ? 'bg-[#FF453A] text-white' : 'bg-[#FF9500] text-[#0E1116]'
                  } ${isSelected ? 'scale-110 ring-[3px] ring-[#0E1116]' : 'ring-2 ring-white'}`}
                >
                  {p.number}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navegação entre ângulos */}
      <button
        type="button"
        aria-label="Ângulo anterior"
        onClick={onPrev}
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 border border-[#D5DBE2] text-[#0E1116] shadow-sm shadow-black/10 hover:bg-white transition-colors duration-150"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label="Próximo ângulo"
        onClick={onNext}
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 border border-[#D5DBE2] text-[#0E1116] shadow-sm shadow-black/10 hover:bg-white transition-colors duration-150"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dica de uso */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 pb-3 text-[11px] font-medium text-[#5B6674]">
        <Hand size={12} />
        <span>{angleInfo.hint}</span>
      </div>
    </div>
  );
};

export default VehicleStage;
