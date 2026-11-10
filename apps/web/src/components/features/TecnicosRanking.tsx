import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  Flame,
  Star,
  TrendingUp,
  Award,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Card, Badge, Button } from '@carx/ui';
import { api } from '../../services/api';
import type { TechnicianRankingItemDto } from '@carx/shared';

interface TecnicosRankingProps {
  initialStartDate?: string;
  initialEndDate?: string;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export const TecnicosRanking: React.FC<TecnicosRankingProps> = ({
  initialStartDate,
  initialEndDate,
}) => {
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  const [sortBy, setSortBy] = useState<'streak' | 'revenue' | 'volume' | 'qa'>('streak');

  const {
    data: ranking = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<TechnicianRankingItemDto[]>({
    queryKey: ['technicians-ranking', startDate, endDate],
    queryFn: () =>
      api.reports.getRanking({
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
      }),
  });

  const sortedRanking = [...ranking].sort((a, b) => {
    if (sortBy === 'streak') return b.streakDaysWithoutRework - a.streakDaysWithoutRework;
    if (sortBy === 'revenue') return b.totalProducedCents - a.totalProducedCents;
    if (sortBy === 'volume') return b.workOrdersCount - a.workOrdersCount;
    if (sortBy === 'qa') return b.averageQaScore - a.averageQaScore;
    return 0;
  });

  const top3 = sortedRanking.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header do Ranking */}
      <Card variant="default" className="p-4 sm:p-6 bg-grafite border-aco/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-volt/10 text-volt border border-volt/20 flex items-center justify-center">
              <Trophy size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  Ranking de Técnicos & Streak Auditado
                </h2>
                <Badge variant="volt">Auditado no Banco</Badge>
              </div>
              <p className="text-xs text-cinza-muted mt-0.5">
                Dias sem retrabalho calculados via laudos de QA e máquina de estados oficial da OS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Ordenação */}
            <div className="flex items-center bg-asfalto border border-aco/50 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setSortBy('streak')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                  sortBy === 'streak'
                    ? 'bg-volt text-asfalto shadow font-black'
                    : 'text-cinza-muted hover:text-white'
                }`}
              >
                <Flame size={12} />
                Streak Invicto
              </button>
              <button
                type="button"
                onClick={() => setSortBy('qa')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                  sortBy === 'qa'
                    ? 'bg-volt text-asfalto shadow font-black'
                    : 'text-cinza-muted hover:text-white'
                }`}
              >
                <Star size={12} />
                Nota QA
              </button>
              <button
                type="button"
                onClick={() => setSortBy('revenue')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                  sortBy === 'revenue'
                    ? 'bg-volt text-asfalto shadow font-black'
                    : 'text-cinza-muted hover:text-white'
                }`}
              >
                <TrendingUp size={12} />
                Faturamento
              </button>
              <button
                type="button"
                onClick={() => setSortBy('volume')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                  sortBy === 'volume'
                    ? 'bg-volt text-asfalto shadow font-black'
                    : 'text-cinza-muted hover:text-white'
                }`}
              >
                <CheckCircle2 size={12} />
                OS Entregues
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Atualizar
            </Button>
          </div>
        </div>
      </Card>

      {/* Pódio dos Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* 2º Lugar (Prata) */}
          {top3[1] && (
            <Card
              variant="default"
              className="p-6 bg-grafite border-slate-500/40 relative overflow-hidden order-2 md:order-1 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-slate-300/10 text-slate-300 border border-slate-400/30 flex items-center justify-center mx-auto mb-3 font-mono font-black text-lg">
                2º
              </div>
              <h3 className="text-base font-black text-white truncate">
                {top3[1].technicianName}
              </h3>
              <div className="mt-2 flex items-center justify-center gap-2">
                <Badge variant="neutral" className="gap-1 text-slate-300">
                  <Flame size={12} className="text-amber-400" />
                  {top3[1].streakDaysWithoutRework}d Invicto
                </Badge>
                <Badge variant="volt">
                  QA {top3[1].averageQaScore.toFixed(1)}★
                </Badge>
              </div>
              <div className="mt-4 pt-3 border-t border-aco/50 flex justify-between text-xs text-cinza-muted">
                <span>OS: <strong className="text-white">{top3[1].workOrdersCount}</strong></span>
                <span>Produzido: <strong className="text-white font-mono">{formatCurrency(top3[1].totalProducedCents)}</strong></span>
              </div>
            </Card>
          )}

          {/* 1º Lugar (Ouro / Dark Volt) */}
          {top3[0] && (
            <Card
              variant="default"
              className="p-7 bg-grafite border-volt shadow-xl shadow-volt/10 relative overflow-hidden order-1 md:order-2 text-center md:-translate-y-2"
            >
              <div className="absolute top-2 right-2">
                <Badge variant="volt">LÍDER</Badge>
              </div>
              <div className="w-16 h-16 rounded-full bg-volt/20 text-volt border-2 border-volt flex items-center justify-center mx-auto mb-3 font-mono font-black text-2xl shadow-lg shadow-volt/20">
                <Trophy size={28} />
              </div>
              <h3 className="text-lg font-black text-white truncate">
                {top3[0].technicianName}
              </h3>
              <div className="mt-2 flex items-center justify-center gap-2">
                <Badge variant="volt" className="gap-1.5 font-bold">
                  <Flame size={14} className="text-asfalto fill-asfalto" />
                  {top3[0].streakDaysWithoutRework} Dias Sem Retrabalho
                </Badge>
              </div>
              <div className="mt-2 text-xs text-cinza-muted flex items-center justify-center gap-3">
                <span>Nota QA: <strong className="text-volt">{top3[0].averageQaScore.toFixed(1)} ★</strong></span>
                <span>Volume: <strong className="text-emerald-400">{top3[0].workOrdersCount} OS</strong></span>
              </div>
              <div className="mt-4 pt-3 border-t border-aco/50 flex justify-between text-xs text-cinza-muted">
                <span>Total OS: <strong className="text-white font-mono">{top3[0].workOrdersCount} OS</strong></span>
                <span>Produzido: <strong className="text-volt font-mono">{formatCurrency(top3[0].totalProducedCents)}</strong></span>
              </div>
            </Card>
          )}

          {/* 3º Lugar (Bronze) */}
          {top3[2] && (
            <Card
              variant="default"
              className="p-6 bg-grafite border-amber-700/40 relative overflow-hidden order-3 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-amber-700/10 text-amber-500 border border-amber-700/30 flex items-center justify-center mx-auto mb-3 font-mono font-black text-lg">
                3º
              </div>
              <h3 className="text-base font-black text-white truncate">
                {top3[2].technicianName}
              </h3>
              <div className="mt-2 flex items-center justify-center gap-2">
                <Badge variant="neutral" className="gap-1 text-amber-400">
                  <Flame size={12} className="text-amber-400" />
                  {top3[2].streakDaysWithoutRework}d Invicto
                </Badge>
                <Badge variant="volt">
                  QA {top3[2].averageQaScore.toFixed(1)}★
                </Badge>
              </div>
              <div className="mt-4 pt-3 border-t border-aco/50 flex justify-between text-xs text-cinza-muted">
                <span>OS: <strong className="text-white">{top3[2].workOrdersCount}</strong></span>
                <span>Produzido: <strong className="text-white font-mono">{formatCurrency(top3[2].totalProducedCents)}</strong></span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tabela de Classificação Completa */}
      <Card variant="default" className="p-6 bg-grafite border-aco/60">
        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Award size={16} className="text-volt" />
          Quadro Geral de Desempenho e Confiabilidade Operacional
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aco/60 text-cinza-muted uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Posição</th>
                <th className="py-3 px-3">Profissional</th>
                <th className="py-3 px-3 text-center">Streak Auditado</th>
                <th className="py-3 px-3 text-center">Nota Média QA</th>
                <th className="py-3 px-3 text-center">OS Produzidas</th>
                <th className="py-3 px-3 text-right">Faturamento Produzido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/40">
              {sortedRanking.map((tech, idx) => (
                <tr
                  key={tech.technicianId}
                  className="hover:bg-asfalto/50 transition-colors"
                >
                  <td className="py-3.5 px-3 font-mono font-bold">
                    {idx === 0 ? (
                      <span className="w-6 h-6 rounded-md bg-volt text-asfalto flex items-center justify-center text-xs font-black">
                        1º
                      </span>
                    ) : idx === 1 ? (
                      <span className="w-6 h-6 rounded-md bg-slate-300/20 text-slate-300 flex items-center justify-center text-xs font-bold">
                        2º
                      </span>
                    ) : idx === 2 ? (
                      <span className="w-6 h-6 rounded-md bg-amber-600/20 text-amber-500 flex items-center justify-center text-xs font-bold">
                        3º
                      </span>
                    ) : (
                      <span className="text-cinza-muted pl-1.5">{idx + 1}º</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-asfalto border border-aco flex items-center justify-center text-xs font-bold text-white">
                        {tech.technicianName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">{tech.technicianName}</p>
                        {tech.streakDaysWithoutRework >= 14 && (
                          <span className="text-[10px] text-volt font-bold uppercase tracking-wider">
                            ★ Invicto 2+ Semanas
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <Badge
                      variant={tech.streakDaysWithoutRework >= 10 ? 'volt' : tech.streakDaysWithoutRework >= 5 ? 'info' : 'neutral'}
                      className="gap-1"
                    >
                      <Flame size={12} className={tech.streakDaysWithoutRework >= 5 ? 'text-amber-400' : ''} />
                      {tech.streakDaysWithoutRework} dias
                    </Badge>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono">
                    <span className="text-white font-bold">{tech.averageQaScore.toFixed(1)}</span>
                    <span className="text-amber-400 ml-1">★</span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-white">
                    {tech.workOrdersCount} OS
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                    {formatCurrency(tech.totalProducedCents)}
                  </td>
                </tr>
              ))}

              {sortedRanking.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-cinza-muted">
                    Nenhum dado de produtividade encontrado para o período selecionado.
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

export default TecnicosRanking;
