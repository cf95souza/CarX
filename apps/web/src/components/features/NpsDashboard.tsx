import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Star,
  MessageCircle,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Smile,
  Meh,
  Frown,
  Award,
  RefreshCw,
} from 'lucide-react';
import { Card, Badge, Button, Input } from '@carx/ui';
import { api } from '../../services/api';
import type { NpsMetricsDto } from '@carx/shared';

interface NpsDashboardProps {
  onOpenSendModal?: (workOrderId?: string) => void;
}

export const NpsDashboard: React.FC<NpsDashboardProps> = () => {
  const [filterClass, setFilterClass] = useState<'ALL' | 'promoter' | 'neutral' | 'detractor'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: metrics,
    isLoading: loadingMetrics,
    refetch: refetchMetrics,
  } = useQuery<NpsMetricsDto>({
    queryKey: ['nps-metrics'],
    queryFn: () => api.nps.getMetrics(),
  });

  const {
    data: surveys = [],
    isLoading: loadingSurveys,
    refetch: refetchSurveys,
  } = useQuery<any[]>({
    queryKey: ['nps-surveys', filterClass],
    queryFn: () =>
      api.nps.listSurveys({
        classification: filterClass !== 'ALL' ? filterClass : undefined,
      }),
  });

  const score = metrics?.npsScore ?? 0;
  const total = metrics?.totalAnswered ?? 0;
  const promoters = metrics?.promotersCount ?? 0;
  const passives = metrics?.passivesCount ?? 0;
  const detractors = metrics?.detractorsCount ?? 0;
  const pPromoters = metrics?.promotersPercent ?? 0;
  const pDetractors = metrics?.detractorsPercent ?? 0;
  const pPassives = metrics?.passivesPercent ?? (total > 0 ? Math.max(0, 100 - pPromoters - pDetractors) : 0);

  let zonaLabel = 'Aperfeiçoamento';
  let zonaVariant: 'volt' | 'neutral' | 'alert' | 'error' = 'neutral';
  if (score >= 75) {
    zonaLabel = 'Zona de Excelência 🏆';
    zonaVariant = 'volt';
  } else if (score >= 50) {
    zonaLabel = 'Zona de Qualidade 👍';
    zonaVariant = 'volt';
  } else if (score < 0) {
    zonaLabel = 'Zona Crítica 🚨';
    zonaVariant = 'error';
  }

  const filteredSurveys = surveys.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.customer_name?.toLowerCase().includes(term) ||
      s.plate?.toLowerCase().includes(term) ||
      s.comment?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header do NPS */}
      <Card variant="default" className="p-4 sm:p-6 bg-grafite border-aco/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-volt/10 text-volt border border-volt/20 flex items-center justify-center">
              <Star size={24} className="fill-volt" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  NPS & Satisfação do Cliente (Pós-Venda)
                </h2>
                <Badge variant={zonaVariant}>
                  {zonaLabel}
                </Badge>
              </div>
              <p className="text-xs text-cinza-muted mt-0.5">
                Pesquisas enviadas via WhatsApp e apuradas em tempo real com histórico auditado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                refetchMetrics();
                refetchSurveys();
              }}
              className="gap-1.5"
            >
              <RefreshCw size={14} />
              Atualizar
            </Button>
          </div>
        </div>
      </Card>

      {/* Cards de Métricas do NPS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Score Geral */}
        <Card
          variant="default"
          className="p-5 bg-grafite border-volt/40 relative overflow-hidden shadow-lg shadow-volt/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-volt">
              Net Promoter Score
            </span>
            <div className="w-8 h-8 rounded-xl bg-volt/20 text-volt flex items-center justify-center">
              <Award size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-volt font-mono">
                {score > 0 ? `+${score}` : score}
              </p>
              <span className="text-xs text-cinza-muted font-bold">/ 100</span>
            </div>
            <p className="text-[11px] text-cinza-muted mt-1">
              Base: <strong className="text-white">{total} avaliações respondidas</strong>
            </p>
          </div>
        </Card>

        {/* Promotores */}
        <Card variant="default" className="p-5 bg-grafite border-aco/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Promotores (9-10)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Smile size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-emerald-400 font-mono">{promoters}</p>
              <Badge variant="volt">{pPromoters}%</Badge>
            </div>
            <p className="text-[11px] text-cinza-muted mt-1">
              Clientes promotores e defensores da marca
            </p>
          </div>
        </Card>

        {/* Neutros */}
        <Card variant="default" className="p-5 bg-grafite border-aco/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Neutros (7-8)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Meh size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-amber-400 font-mono">{passives}</p>
              <Badge variant="neutral">{pPassives}%</Badge>
            </div>
            <p className="text-[11px] text-cinza-muted mt-1">
              Satisfeitos porém vulneráveis à concorrência
            </p>
          </div>
        </Card>

        {/* Detratores */}
        <Card variant="default" className="p-5 bg-grafite border-aco/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400">
              Detratores (0-6)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Frown size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-rose-400 font-mono">{detractors}</p>
              <Badge variant={detractors > 0 ? 'error' : 'neutral'}>
                {pDetractors}%
              </Badge>
            </div>
            <p className="text-[11px] text-cinza-muted mt-1">
              Exigem contato e recuperação imediata (SLA 24h)
            </p>
          </div>
        </Card>
      </div>

      {/* Barra de Distribuição */}
      <Card variant="default" className="p-4 bg-grafite border-aco/60">
        <div className="flex justify-between text-xs text-cinza-muted mb-2 font-bold">
          <span className="text-emerald-400">Promotores: {pPromoters}%</span>
          <span className="text-amber-400">Neutros: {pPassives}%</span>
          <span className="text-rose-400">Detratores: {pDetractors}%</span>
        </div>
        <div className="w-full h-3 bg-asfalto rounded-full overflow-hidden flex border border-aco">
          <div
            className="bg-emerald-500 h-full transition-all duration-700"
            style={{ width: `${pPromoters}%` }}
          />
          <div
            className="bg-amber-400 h-full transition-all duration-700"
            style={{ width: `${pPassives}%` }}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-700"
            style={{ width: `${pDetractors}%` }}
          />
        </div>
      </Card>

      {/* Filtros e Busca de Feedbacks */}
      <Card variant="default" className="p-6 bg-grafite border-aco/60">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center bg-asfalto border border-aco/50 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setFilterClass('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterClass === 'ALL'
                  ? 'bg-volt text-asfalto shadow font-black'
                  : 'text-cinza-muted hover:text-white'
              }`}
            >
              Todos ({total})
            </button>
            <button
              type="button"
              onClick={() => setFilterClass('promoter')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterClass === 'promoter'
                  ? 'bg-emerald-500 text-white shadow font-black'
                  : 'text-cinza-muted hover:text-white'
              }`}
            >
              Promotores ({promoters})
            </button>
            <button
              type="button"
              onClick={() => setFilterClass('neutral')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterClass === 'neutral'
                  ? 'bg-amber-500 text-white shadow font-black'
                  : 'text-cinza-muted hover:text-white'
              }`}
            >
              Neutros ({passives})
            </button>
            <button
              type="button"
              onClick={() => setFilterClass('detractor')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterClass === 'detractor'
                  ? 'bg-rose-500 text-white shadow font-black'
                  : 'text-cinza-muted hover:text-white'
              }`}
            >
              Detratores ({detractors})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar por cliente, placa ou termo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Tabela de Feedbacks */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aco/60 text-cinza-muted uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Cliente / Veículo</th>
                <th className="py-3 px-3 text-center">Nota</th>
                <th className="py-3 px-3">Classificação</th>
                <th className="py-3 px-3">Comentário / Depoimento</th>
                <th className="py-3 px-3">Data</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/40">
              {filteredSurveys.map((fb: any) => {
                const isPromoter = fb.score >= 9;
                const isDetractor = fb.score <= 6;
                const badgeVariant: 'volt' | 'error' | 'alert' = isPromoter ? 'volt' : isDetractor ? 'error' : 'alert';
                const badgeText = isPromoter ? 'Promotor' : isDetractor ? 'Detrator' : 'Neutro';

                return (
                  <tr key={fb.id} className="hover:bg-asfalto/50 transition-colors">
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-white">{fb.customer_name || 'Cliente'}</p>
                      <p className="text-[11px] text-cinza-muted font-mono">{fb.plate || 'Sem Placa'}</p>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-mono font-black text-sm ${
                          isPromoter
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : isDetractor
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {fb.score ?? '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant={badgeVariant}>
                        {badgeText}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 max-w-xs">
                      <p className="text-cinza-claro italic truncate">
                        {fb.comment ? `"${fb.comment}"` : <span className="text-cinza-muted">Sem comentário escrito</span>}
                      </p>
                    </td>
                    <td className="py-3.5 px-3 text-cinza-muted font-mono text-[11px]">
                      {fb.answered_at ? new Date(fb.answered_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {fb.phone && (
                        <a
                          href={`https://wa.me/55${fb.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg transition-colors"
                        >
                          <MessageCircle size={12} />
                          WhatsApp
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredSurveys.length === 0 && !loadingSurveys && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-cinza-muted">
                    Nenhuma avaliação encontrada com os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default NpsDashboard;
