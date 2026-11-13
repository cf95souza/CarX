import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Sparkles, 
  X, 
  Car, 
  Wrench, 
  Tv, 
  Store,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionUrl: string;
}

interface OnboardingStatus {
  is_completed: boolean;
  progress_percent: number;
  steps: OnboardingStep[];
  segment: string;
  days_remaining: number;
}

export const OnboardingGuideBanner: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadStatus() {
      try {
        const data = await api.onboarding.getStatus();
        if (isMounted) {
          setStatus(data);
        }
      } catch (err) {
        // Falha graciosa se tenant não estiver pronto
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStatus();
    return () => { isMounted = false; };
  }, []);

  if (loading || dismissed || !status || status.is_completed) {
    return null;
  }

  const handleDismiss = async () => {
    setDismissed(true);
    try {
      await api.onboarding.complete();
    } catch {
      // Ignora erro de rede ao dispensar
    }
  };

  const stepIcons: Record<string, React.ReactNode> = {
    setup: <Store className="w-4 h-4" />,
    first_customer: <Car className="w-4 h-4" />,
    first_work_order: <Wrench className="w-4 h-4" />,
    explore_pwa: <Tv className="w-4 h-4" />,
  };

  return (
    <div className="mb-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-[#C8F52E]/30 rounded-2xl p-5 md:p-6 text-white shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Detalhe de iluminação de fundo Volt */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#C8F52E]/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Botão fechar / dispensar */}
      <button 
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        title="Dispensar guia de início"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header do Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C8F52E]/10 border border-[#C8F52E]/30 flex items-center justify-center text-[#C8F52E]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base md:text-lg text-white">
                Guia de Início Rápido CarX
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C8F52E]/20 text-[#C8F52E] border border-[#C8F52E]/30">
                {status.segment}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete os 4 passos essenciais para emitir sua primeira OS em menos de 5 minutos • <span className="text-emerald-400 font-bold">{status.days_remaining} dias restantes de Trial</span>
            </p>
          </div>
        </div>

        {/* Barra de Progresso Quantitativa */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 self-start md:self-auto">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Progresso</span>
            <span className="text-sm font-black text-[#C8F52E]">{status.progress_percent}%</span>
          </div>
          <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#C8F52E] transition-all duration-500 rounded-full"
              style={{ width: `${status.progress_percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid com os 4 Passos Guiados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {status.steps.map((step, idx) => {
          const isDone = step.completed;
          return (
            <div
              key={step.id}
              onClick={() => {
                if (!isDone && step.actionUrl) {
                  navigate(step.actionUrl);
                }
              }}
              className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-300'
                  : 'bg-white/5 border-white/10 hover:border-[#C8F52E]/40 hover:bg-white/[0.07] cursor-pointer group'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                    {stepIcons[step.id] || <Store className="w-3.5 h-3.5" />}
                    Passo {idx + 1}
                  </span>
                  {isDone ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Pronto
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 group-hover:text-[#C8F52E]">
                      <Circle className="w-3.5 h-3.5" /> Pendente
                    </span>
                  )}
                </div>
                <h4 className={`text-xs font-bold leading-snug mb-1 ${isDone ? 'text-slate-300 line-through' : 'text-white group-hover:text-[#C8F52E]'}`}>
                  {step.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {step.description}
                </p>
              </div>

              {!isDone && (
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-[#C8F52E]">
                  <span>Fazer agora</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingGuideBanner;

