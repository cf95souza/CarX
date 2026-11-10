import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, EmptyState, Input } from '@carx/ui';
import NovoOrcamentoModal from '../components/features/NovoOrcamentoModal';
import {
  Wrench,
  Search,
  Plus,
  Filter,
  Eye,
  Clock,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Car,
  User,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Phone,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import type { WorkOrderStatusType } from '@carx/shared';

function formatBRL(reaisOrCents: number, isCents = false): string {
  const val = isCents ? (reaisOrCents || 0) / 100 : reaisOrCents || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status: string) {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'IN_PROGRESS':
      return <Badge variant="info" dot>Em Execução</Badge>;
    case 'QA':
      return <Badge variant="alert" dot>Vistoria QA</Badge>;
    case 'READY':
      return <Badge variant="volt" dot>Pronto p/ Entrega</Badge>;
    case 'DELIVERED':
      return <Badge variant="volt">Entregue</Badge>;
    case 'CHECKED_IN':
      return <Badge variant="neutral" dot>No Pátio</Badge>;
    case 'SCHEDULED':
      return <Badge variant="neutral">Agendado</Badge>;
    case 'APPROVED':
      return <Badge variant="neutral">Aprovado</Badge>;
    case 'QUOTE':
      return <Badge variant="neutral">Orçamento</Badge>;
    case 'PAUSED':
      return <Badge variant="alert">Pausado</Badge>;
    case 'CANCELED':
      return <Badge variant="error">Cancelado</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export const OrdensServico: React.FC = () => {
  const queryClient = useQueryClient();
  const { isGestor } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [page, setPage] = useState<number>(1);
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Consulta de Ordens de Serviço
  const { data: woData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['work-orders-list', selectedStatus, searchTerm, page],
    queryFn: () =>
      api.workOrders.list({
        status: selectedStatus === 'TODOS' ? undefined : selectedStatus,
        search: searchTerm || undefined,
        limit: 20,
        offset: (page - 1) * 20,
      }),
    staleTime: 1000 * 20,
  });

  const orders = useMemo(() => woData?.workOrders || [], [woData]);
  const totalOrders = woData?.total || 0;
  const totalPages = Math.ceil(totalOrders / 20) || 1;

  // KPIs
  const stats = useMemo(() => {
    const list = orders;
    return {
      aguardando: list.filter((o) => ['APPROVED', 'SCHEDULED', 'CHECKED_IN'].includes(o.status)).length,
      executando: list.filter((o) => o.status === 'IN_PROGRESS').length,
      concluidas: list.filter((o) => ['QA', 'READY'].includes(o.status)).length,
      entregues: list.filter((o) => o.status === 'DELIVERED').length,
    };
  }, [orders]);

  // Transição de Status
  const handleTransition = async (orderId: string, nextStatus: WorkOrderStatusType) => {
    try {
      await api.workOrders.updateStatus(orderId, nextStatus);
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: nextStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status da OS.');
    }
  };

  // Registro de Pagamento
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const amountVal = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await api.payments.create(selectedOrder.id, {
        amountCents: Math.round(amountVal * 100),
        method: paymentMethod,
        notes: 'Pagamento de saldo registrado pelo gestor',
      });

      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      alert('Pagamento registrado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao processar pagamento.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-body">
      {/* Header OS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-texto tracking-tight uppercase">
            Ordens de Serviço & Orçamentos
          </h1>
          <p className="text-xs md:text-sm text-muted mt-1">
            Gestão do ciclo de vida automotivo: orçamentos, execução técnica, pagamentos e garantia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
          >
            Atualizar
          </Button>

          <Button
            variant="volt"
            size="desktop"
            onClick={() => setIsNovoModalOpen(true)}
            leftIcon={<Plus size={18} />}
          >
            + Nova OS / Orçamento
          </Button>
        </div>
      </div>

      {/* Cards de Status (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          onClick={() => setSelectedStatus(selectedStatus === 'CHECKED_IN' ? 'TODOS' : 'CHECKED_IN')}
          className={`p-4 bg-grafite border cursor-pointer hover:border-volt/50 transition-all ${
            selectedStatus === 'CHECKED_IN' ? 'border-volt bg-volt/5' : 'border-aco'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase">Aguardando Início</span>
            <Clock size={16} className="text-alert" />
          </div>
          <h3 className="font-display text-2xl font-black text-texto mt-2">{stats.aguardando}</h3>
          <span className="text-[10px] text-muted">Aprovadas / No Pátio</span>
        </Card>

        <Card
          onClick={() => setSelectedStatus(selectedStatus === 'IN_PROGRESS' ? 'TODOS' : 'IN_PROGRESS')}
          className={`p-4 bg-grafite border cursor-pointer hover:border-volt/50 transition-all ${
            selectedStatus === 'IN_PROGRESS' ? 'border-volt bg-volt/5' : 'border-aco'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase">Em Execução</span>
            <TrendingUp size={16} className="text-info" />
          </div>
          <h3 className="font-display text-2xl font-black text-texto mt-2">{stats.executando}</h3>
          <span className="text-[10px] text-muted">Trabalho nos Boxes</span>
        </Card>

        <Card
          onClick={() => setSelectedStatus(selectedStatus === 'QA' ? 'TODOS' : 'QA')}
          className={`p-4 bg-grafite border cursor-pointer hover:border-volt/50 transition-all ${
            selectedStatus === 'QA' ? 'border-volt bg-volt/5' : 'border-aco'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase">Vistoria & Prontos</span>
            <CheckCircle2 size={16} className="text-volt" />
          </div>
          <h3 className="font-display text-2xl font-black text-texto mt-2">{stats.concluidas}</h3>
          <span className="text-[10px] text-muted">Aguardando Retirada</span>
        </Card>

        <Card
          onClick={() => setSelectedStatus(selectedStatus === 'DELIVERED' ? 'TODOS' : 'DELIVERED')}
          className={`p-4 bg-grafite border cursor-pointer hover:border-volt/50 transition-all ${
            selectedStatus === 'DELIVERED' ? 'border-volt bg-volt/5' : 'border-aco'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase">Entregues</span>
            <ShieldCheck size={16} className="text-volt" />
          </div>
          <h3 className="font-display text-2xl font-black text-texto mt-2">{stats.entregues}</h3>
          <span className="text-[10px] text-muted">Garantia Ativa</span>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            placeholder="Buscar por placa, cliente ou número..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 pl-10 pr-4 bg-aco/50 border border-linha rounded-input text-xs text-texto placeholder:text-muted focus:outline-none focus:border-volt"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          {['TODOS', 'QUOTE', 'APPROVED', 'IN_PROGRESS', 'QA', 'READY', 'DELIVERED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-input text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === st
                  ? 'bg-volt text-asfalto font-bold'
                  : 'bg-aco/40 text-muted hover:text-texto hover:bg-aco'
              }`}
            >
              {st === 'TODOS' ? 'Todos os Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Ordens de Serviço */}
      <Card className="bg-grafite border-aco overflow-hidden p-0 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-aco/60 text-muted uppercase tracking-wider border-b border-linha font-semibold">
              <tr>
                <th className="py-3.5 px-4">OS #</th>
                <th className="py-3.5 px-4">Veículo</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Técnico</th>
                <th className="py-3.5 px-4 text-center">Progresso</th>
                <th className="py-3.5 px-4">Valores</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted">
                    <div className="w-8 h-8 border-2 border-volt/20 border-t-volt rounded-full animate-spin mx-auto mb-2" />
                    Carregando ordens de serviço...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    Nenhuma ordem de serviço encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                orders.map((os: any) => {
                  const balanceCents = Math.max(0, (os.finalCents || os.totalCents || 0) - (os.paidCents || 0));
                  return (
                    <tr
                      key={os.id}
                      onClick={() => setSelectedOrder(os)}
                      className="hover:bg-aco/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-volt">
                        #{os.osNumber}
                        <span className="block text-[10px] text-muted font-normal">
                          {formatDateBR(os.createdAt)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-texto">
                          {os.vehicle ? `${os.vehicle.brand} ${os.vehicle.model}` : 'Veículo'}
                        </div>
                        <span className="text-[11px] text-volt font-mono font-bold tracking-wider">
                          {os.vehicle?.plate || 'SEM PLACA'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-texto">
                        <div className="font-medium">{os.customer?.name}</div>
                        <span className="text-[11px] text-muted font-mono">{os.customer?.phone}</span>
                      </td>

                      <td className="py-3.5 px-4">{getStatusBadge(os.status)}</td>

                      <td className="py-3.5 px-4 text-muted">
                        {os.technician?.name || <span className="text-muted/40 italic">Não alocado</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-center gap-1 w-24 mx-auto">
                          <span className="text-[10px] font-mono text-muted font-bold">
                            {os.progress || 0}%
                          </span>
                          <div className="w-full h-1.5 bg-asfalto rounded-full overflow-hidden">
                            <div
                              className="h-full bg-volt"
                              style={{ width: `${os.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-texto">
                          {formatBRL(os.finalCents || os.totalCents, true)}
                        </div>
                        {balanceCents > 0 ? (
                          <span className="text-[10px] text-alert block">
                            Falta {formatBRL(balanceCents, true)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-volt block">Pago Total</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(os)}
                            className="p-1.5 text-muted hover:text-texto hover:bg-aco rounded-lg transition-colors"
                            title="Ver Detalhes"
                          >
                            <Eye size={16} />
                          </button>

                          {balanceCents > 0 && (
                            <button
                              onClick={() => {
                                setSelectedOrder(os);
                                setPaymentAmount((balanceCents / 100).toFixed(2));
                                setIsPaymentModalOpen(true);
                              }}
                              className="p-1.5 text-alert hover:text-texto hover:bg-alert/20 rounded-lg transition-colors"
                              title="Registrar Pagamento"
                            >
                              <DollarSign size={16} />
                            </button>
                          )}

                          {os.status === 'APPROVED' && (
                            <button
                              onClick={() => handleTransition(os.id, 'CHECKED_IN')}
                              className="p-1.5 text-volt hover:bg-volt/20 rounded-lg transition-colors"
                              title="Realizar Check-in no Pátio"
                            >
                              <Play size={16} />
                            </button>
                          )}

                          {os.status === 'READY' && (
                            <button
                              onClick={() => handleTransition(os.id, 'DELIVERED')}
                              className="p-1.5 text-volt hover:bg-volt/20 rounded-lg transition-colors"
                              title="Confirmar Entrega ao Cliente"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 bg-aco/40 border-t border-linha flex items-center justify-between text-xs text-muted">
            <span>
              Total: {totalOrders} ordens · Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                leftIcon={<ChevronLeft size={14} />}
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                rightIcon={<ChevronRight size={14} />}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Wizard: Nova OS e Orçamento */}
      <NovoOrcamentoModal
        isOpen={isNovoModalOpen}
        onClose={() => setIsNovoModalOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
        }}
      />

      {/* Modal de Pagamento Rápido */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-asfalto/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="bg-grafite border-aco w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-linha">
              <h3 className="font-display text-base font-bold text-texto">
                Registrar Pagamento · OS #{selectedOrder.osNumber}
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-muted hover:text-texto p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4 mt-4">
              <Input
                label="Valor a Pagar (R$) *"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0,00"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-12 px-3 rounded-input bg-aco/60 border border-linha text-texto text-sm focus:outline-none focus:border-volt"
                >
                  <option value="pix">PIX</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="cash">Dinheiro em Espécie</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="volt"
                  size="desktop"
                  isLoading={isSubmittingPayment}
                >
                  Confirmar Pagamento
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal de Detalhes da Ordem Selecionada */}
      {selectedOrder && !isPaymentModalOpen && (
        <div className="fixed inset-0 bg-asfalto/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="bg-grafite border-aco w-full max-w-lg shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-aco/60 border-b border-linha flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-texto">
                  Ordem de Serviço #{selectedOrder.osNumber}
                </h3>
                <span className="text-xs text-muted font-mono">
                  {selectedOrder.trackingToken ? `Token: ${selectedOrder.trackingToken.slice(0, 8)}...` : ''}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-muted hover:text-texto p-1.5 rounded-lg hover:bg-aco"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Status Operacional</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              <div className="bg-aco/40 p-4 rounded-card border border-linha space-y-2">
                <div className="flex items-center gap-3">
                  <Car size={18} className="text-volt" />
                  <div>
                    <h5 className="font-bold text-sm text-texto">
                      {selectedOrder.vehicle ? `${selectedOrder.vehicle.brand} ${selectedOrder.vehicle.model}` : 'Veículo'}
                    </h5>
                    <span className="text-muted font-mono">{selectedOrder.vehicle?.plate}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-linha/60 flex items-center gap-3">
                  <User size={18} className="text-muted" />
                  <div>
                    <span className="font-medium text-texto">{selectedOrder.customer?.name}</span>
                    <span className="text-muted block font-mono">{selectedOrder.customer?.phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-asfalto p-4 rounded-card border border-linha space-y-2">
                <div className="flex justify-between text-muted">
                  <span>Valor Total da OS</span>
                  <span className="font-bold text-texto font-mono">
                    {formatBRL(selectedOrder.finalCents || selectedOrder.totalCents, true)}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Valor Já Pago</span>
                  <span className="font-bold text-volt font-mono">
                    {formatBRL(selectedOrder.paidCents || 0, true)}
                  </span>
                </div>
                <div className="flex justify-between text-alert pt-1 border-t border-linha">
                  <span>Saldo a Pagar</span>
                  <span className="font-bold font-mono">
                    {formatBRL(Math.max(0, (selectedOrder.finalCents || selectedOrder.totalCents || 0) - (selectedOrder.paidCents || 0)), true)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-aco/40 border-t border-linha flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrdensServico;

