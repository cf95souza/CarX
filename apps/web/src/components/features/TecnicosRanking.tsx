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
      <div className="p-5 sm:p-6 bg-[#171C24] border border-[#2E3744] rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0E1116] text-[#C8F52E] border border-[#2E3744] flex items-center justify-center shrink-0">
              <Trophy size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-display font-bold text-white tracking-tight">
                  Ranking de Técnicos & Gamificação
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/30">
                  Auditado em Tempo Real
                </span>
              </div>
              <p className="text-xs text-[#9AA7B8] mt-0.5">
                Dias sem retrabalho calculados via laudos de QA e máquina de estados oficial da OS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Ordenação */}
            <div className="flex items-center bg-[#0E1116] border border-[#2E3744] rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setSortBy('streak')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  sortBy === 'streak'
                    ? 'bg-[#C8F52E] text-[#0E1116] shadow-sm'
                    : 'text-[#9AA7B8] hover:text-white'
                }`}
              >
                <Flame size={13} />
                Streak Invicto
              </button>
              <button
                type="button"
                onClick={() => setSortBy('qa')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  sortBy === 'qa'
                    ? 'bg-[#C8F52E] text-[#0E1116] shadow-sm'
                    : 'text-[#9AA7B8] hover:text-white'
                }`}
              >
                <Star size={13} />
                Nota QA
              </button>
              <button
                type="button"
                onClick={() => setSortBy('revenue')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  sortBy === 'revenue'
                    ? 'bg-[#C8F52E] text-[#0E1116] shadow-sm'
                    : 'text-[#9AA7B8] hover:text-white'
                }`}
              >
                <TrendingUp size={13} />
                Faturamento
              </button>
              <button
                type="button"
                onClick={() => setSortBy('volume')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  sortBy === 'volume'
                    ? 'bg-[#C8F52E] text-[#0E1116] shadow-sm'
                    : 'text-[#9AA7B8] hover:text-white'
                }`}
              >
                <CheckCircle2 size={13} />
                OS Entregues
              </button>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0E1116] hover:bg-[#202734] text-white border border-[#2E3744] transition-colors"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Pódio dos Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* 2º Lugar (Prata) */}
          {top3[1] && (
            <div className="p-6 bg-[#171C24] border border-[#2E3744] rounded-2xl relative overflow-hidden order-2 md:order-1 text-center shadow-md">
              <div className="w-12 h-12 rounded-full bg-slate-400/10 text-slate-300 border border-slate-400/30 flex items-center justify-center mx-auto mb-3 font-display font-bold text-base">
                2º
              </div>
              <h3 className="text-base font-display font-bold text-white truncate">
                {top3[1].technicianName}
              </h3>
              <div className="mt-2.5 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0E1116] border border-[#2E3744] text-slate-300">
                  <Flame size={13} className="text-amber-400" />
                  {top3[1].streakDaysWithoutRework}d Invicto
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/30">
                  {top3[1].averageQaScore > 0 ? `QA ${top3[1].averageQaScore.toFixed(1)}★` : 'Sem QA'}
                </span>
              </div>
              <div className="mt-4 pt-3.5 border-t border-[#2E3744] flex justify-between text-xs text-[#9AA7B8]">
                <span>OS: <strong className="text-white">{top3[1].workOrdersCount}</strong></span>
                <span>Produzido: <strong className="text-white font-mono">{formatCurrency(top3[1].totalProducedCents)}</strong></span>
              </div>
            </div>
          )}

          {/* 1º Lugar (Líder / Ouro / Volt) */}
          {top3[0] && (
            <div className="p-7 bg-[#171C24] border-2 border-[#C8F52E] shadow-xl shadow-[#C8F52E]/10 rounded-2xl relative overflow-hidden order-1 md:order-2 text-center md:-translate-y-2">
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C8F52E] text-[#0E1116] shadow-sm">
                  LÍDER DO PÁTIO
                </span>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-[#C8F52E]/10 text-[#C8F52E] border-2 border-[#C8F52E] flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-[#C8F52E]/20">
                <Trophy size={28} />
              </div>
              <h3 className="text-lg font-display font-bold text-white truncate">
                {top3[0].technicianName}
              </h3>
              <div className="mt-2.5 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#C8F52E] text-[#0E1116] shadow-sm">
                  <Flame size={14} className="fill-[#0E1116]" />
                  {top3[0].streakDaysWithoutRework} Dias Sem Retrabalho
                </span>
              </div>
              <div className="mt-2.5 text-xs text-[#9AA7B8] flex items-center justify-center gap-3">
                <span>Nota QA: <strong className="text-[#C8F52E]">{top3[0].averageQaScore > 0 ? `${top3[0].averageQaScore.toFixed(1)} ★` : 'Sem QA'}</strong></span>
                <span>Volume: <strong className="text-emerald-400">{top3[0].workOrdersCount} OS</strong></span>
              </div>
              <div className="mt-5 pt-3.5 border-t border-[#2E3744] flex justify-between text-xs text-[#9AA7B8]">
                <span>Total OS: <strong className="text-white font-mono">{top3[0].workOrdersCount} OS</strong></span>
                <span>Produzido: <strong className="text-[#C8F52E] font-mono font-bold">{formatCurrency(top3[0].totalProducedCents)}</strong></span>
              </div>
            </div>
          )}

          {/* 3º Lugar (Bronze) */}
          {top3[2] && (
            <div className="p-6 bg-[#171C24] border border-[#2E3744] rounded-2xl relative overflow-hidden order-3 text-center shadow-md">
              <div className="w-12 h-12 rounded-full bg-amber-700/10 text-amber-500 border border-amber-700/30 flex items-center justify-center mx-auto mb-3 font-display font-bold text-base">
                3º
              </div>
              <h3 className="text-base font-display font-bold text-white truncate">
                {top3[2].technicianName}
              </h3>
              <div className="mt-2.5 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0E1116] border border-[#2E3744] text-amber-400">
                  <Flame size={13} className="text-amber-400" />
                  {top3[2].streakDaysWithoutRework}d Invicto
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/30">
                  {top3[2].averageQaScore > 0 ? `QA ${top3[2].averageQaScore.toFixed(1)}★` : 'Sem QA'}
                </span>
              </div>
              <div className="mt-4 pt-3.5 border-t border-[#2E3744] flex justify-between text-xs text-[#9AA7B8]">
                <span>OS: <strong className="text-white">{top3[2].workOrdersCount}</strong></span>
                <span>Produzido: <strong className="text-white font-mono">{formatCurrency(top3[2].totalProducedCents)}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela de Classificação Completa */}
      <div className="p-5 sm:p-6 bg-[#171C24] border border-[#2E3744] rounded-2xl shadow-sm">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Award size={16} className="text-[#C8F52E]" />
          Quadro Geral de Desempenho e Confiabilidade Operacional
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2E3744] text-[#9AA7B8] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Posição</th>
                <th className="py-3 px-3">Profissional</th>
                <th className="py-3 px-3 text-center">Streak Auditado</th>
                <th className="py-3 px-3 text-center">Nota Média QA</th>
                <th className="py-3 px-3 text-center">OS Produzidas</th>
                <th className="py-3 px-3 text-right">Faturamento Produzido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E3744]">
              {sortedRanking.map((tech, idx) => (
                <tr
                  key={tech.technicianId}
                  className="hover:bg-[#0E1116]/60 transition-colors"
                >
                  <td className="py-3.5 px-3 font-mono font-bold">
                    {idx === 0 ? (
                      <span className="w-6 h-6 rounded-md bg-[#C8F52E] text-[#0E1116] flex items-center justify-center text-xs font-bold">
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
                      <span className="text-[#9AA7B8] pl-1.5">{idx + 1}º</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#0E1116] border border-[#2E3744] flex items-center justify-center text-xs font-bold text-white">
                        {tech.technicianName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">{tech.technicianName}</p>
                        {tech.streakDaysWithoutRework >= 14 && (
                          <span className="text-[10px] text-[#C8F52E] font-bold uppercase tracking-wider block">
                            ★ Invicto 2+ Semanas
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        tech.streakDaysWithoutRework >= 10 
                          ? 'bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/30'
                          : tech.streakDaysWithoutRework >= 5 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                          : 'bg-[#0E1116] text-[#9AA7B8] border border-[#2E3744]'
                      }`}
                    >
                      <Flame size={12} className={tech.streakDaysWithoutRework >= 5 ? 'text-amber-400' : ''} />
                      {tech.streakDaysWithoutRework} dias
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono">
                    {tech.averageQaScore > 0 ? (
                      <>
                        <span className="text-white font-bold">{tech.averageQaScore.toFixed(1)}</span>
                        <span className="text-amber-400 ml-1">★</span>
                      </>
                    ) : (
                      <span className="text-[#9AA7B8]">-</span>
                    )}
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
                  <td colSpan={6} className="py-8 text-center text-[#9AA7B8]">
                    Nenhum dado de produtividade registrado ainda para a equipe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TecnicosRanking;
