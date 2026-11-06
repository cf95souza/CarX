import React, { useState } from 'react';
import {
  MessageSquareCode,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  RefreshCw,
  Zap,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  Clock,
} from 'lucide-react';

interface WhatsAppInstance {
  id: string;
  tenantName: string;
  slug: string;
  status: 'connected' | 'disconnected' | 'qrcode_pending';
  phoneNumber?: string;
  messagesToday: number;
  dailyLimit: number;
  lastActive: string;
}

export function WhatsAppManagerPage() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([
    {
      id: 'inst-01',
      tenantName: 'Auto Mecânica Matriz',
      slug: 'auto-mecanica-matriz',
      status: 'connected',
      phoneNumber: '+55 11 98765-4321',
      messagesToday: 142,
      dailyLimit: 500,
      lastActive: 'Há 4 minutos',
    },
    {
      id: 'inst-02',
      tenantName: 'Oficina São Paulo Sul',
      slug: 'oficina-sp-sul',
      status: 'connected',
      phoneNumber: '+55 11 97123-9988',
      messagesToday: 89,
      dailyLimit: 300,
      lastActive: 'Há 12 minutos',
    },
    {
      id: 'inst-03',
      tenantName: 'Centro Automotivo Alpha',
      slug: 'alpha-auto',
      status: 'qrcode_pending',
      phoneNumber: undefined,
      messagesToday: 0,
      dailyLimit: 300,
      lastActive: 'Aguardando pareamento',
    },
    {
      id: 'inst-04',
      tenantName: 'Mecânica Express Campinas',
      slug: 'express-campinas',
      status: 'disconnected',
      phoneNumber: '+55 19 98888-1122',
      messagesToday: 24,
      dailyLimit: 300,
      lastActive: 'Há 2 dias',
    },
  ]);

  const [filter, setFilter] = useState('all');

  const filteredInstances = instances.filter((i) => {
    if (filter === 'all') return true;
    return i.status === filter;
  });

  const getStatusBadge = (status: WhatsAppInstance['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-volt/10 text-volt border border-volt/20">
            <CheckCircle2 size={10} /> Conectado
          </span>
        );
      case 'qrcode_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-alert/10 text-semantic-alert border border-semantic-alert/20">
            <QrCode size={10} /> QR Code Pendente
          </span>
        );
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-error/10 text-semantic-error border border-semantic-error/20">
            <AlertTriangle size={10} /> Desconectado
          </span>
        );
    }
  };

  const handleReconnect = (id: string) => {
    alert(`Comando de reinicialização da instância ${id} enviado ao serviço de gateway WhatsApp.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-aco/40">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Gerenciador Global de WhatsApp
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Monitoramento de instâncias Baileys/Evolution por loja, fila de mensagens, anti-bloqueio e reconexão.
          </p>
        </div>

        <button
          onClick={() => {}}
          className="px-3 py-2 bg-grafite hover:bg-aco border border-aco rounded-btn text-xs font-medium text-texto flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={14} />
          <span>Atualizar Sessões</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Instâncias Ativas
          </div>
          <div className="font-display text-2xl font-bold text-volt">
            {instances.filter((i) => i.status === 'connected').length} <span className="text-xs text-muted font-normal">/ {instances.length} total</span>
          </div>
          <p className="text-[11px] text-muted mt-2">Disparando laudos e OS em tempo real</p>
        </div>

        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Mensagens Hoje
          </div>
          <div className="font-display text-2xl font-bold text-white">
            {instances.reduce((acc, curr) => acc + curr.messagesToday, 0)}
          </div>
          <p className="text-[11px] text-muted mt-2">Envios de orçamentos e avisos</p>
        </div>

        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Sessões Pendentes
          </div>
          <div className="font-display text-2xl font-bold text-semantic-alert">
            {instances.filter((i) => i.status === 'qrcode_pending').length}
          </div>
          <p className="text-[11px] text-muted mt-2">Aguardando leitura de QR Code</p>
        </div>

        <div className="bg-grafite border border-aco/50 rounded-card p-5">
          <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            Desconexões
          </div>
          <div className="font-display text-2xl font-bold text-semantic-error">
            {instances.filter((i) => i.status === 'disconnected').length}
          </div>
          <p className="text-[11px] text-muted mt-2">Requer atenção ou pareamento</p>
        </div>
      </div>

      {/* Tabela de Instâncias */}
      <div className="bg-grafite border border-aco/50 rounded-card overflow-hidden">
        <div className="p-4 border-b border-aco/40 flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-white">Instâncias por Loja</h3>
          <div className="flex items-center gap-1.5">
            {['all', 'connected', 'qrcode_pending', 'disconnected'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filter === s
                    ? 'bg-volt text-asfalto font-semibold'
                    : 'bg-aco/40 text-muted hover:text-texto'
                }`}
              >
                {s === 'all'
                  ? 'Todas'
                  : s === 'connected'
                  ? 'Conectadas'
                  : s === 'qrcode_pending'
                  ? 'QR Pendente'
                  : 'Desconectadas'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aco/40 bg-asfalto/50 text-muted uppercase font-semibold text-[10px]">
                <th className="py-3 px-4">Oficina / Slug</th>
                <th className="py-3 px-4">Número Pareado</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Disparos Hoje / Limite</th>
                <th className="py-3 px-4 text-center">Última Atividade</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/20">
              {filteredInstances.map((inst) => {
                const percent = ((inst.messagesToday / inst.dailyLimit) * 100).toFixed(0);
                return (
                  <tr key={inst.id} className="hover:bg-aco/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">{inst.tenantName}</div>
                      <div className="font-mono text-[10px] text-volt">{inst.slug}.carx.com.br</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-texto">
                      {inst.phoneNumber || <span className="text-muted italic">Não configurado</span>}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(inst.status)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-semibold text-white">
                          {inst.messagesToday}{' '}
                          <span className="text-muted font-normal text-[10px]">/ {inst.dailyLimit}</span>
                        </span>
                        <div className="w-20 h-1.5 bg-aco rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              Number(percent) > 80 ? 'bg-semantic-alert' : 'bg-volt'
                            }`}
                            style={{ width: `${Math.min(100, Number(percent))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center text-muted text-[11px]">
                      {inst.lastActive}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleReconnect(inst.id)}
                        className="px-2.5 py-1.5 rounded-btn bg-aco/50 hover:bg-aco text-texto text-[11px] font-medium transition-colors"
                      >
                        Reiniciar Sessão
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

