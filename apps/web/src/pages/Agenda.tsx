import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, EmptyState, Input } from '@carx/ui';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Car,
  User,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Phone,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  RefreshCw,
  Building2,
  MapPin,
  Layers,
} from 'lucide-react';

function formatDateBR(dateObj: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

function formatTime(isoStr?: string | null): string {
  if (!isoStr) return '--:--';
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoStr;
  }
}

function getStatusBadge(status: string) {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'IN_PROGRESS':
      return <Badge variant="info" dot>Em Execução</Badge>;
    case 'CONFIRMED':
    case 'APPROVED':
      return <Badge variant="volt" dot>Confirmado</Badge>;
    case 'COMPLETED':
      return <Badge variant="volt">Concluído</Badge>;
    case 'CANCELED':
      return <Badge variant="error">Cancelado</Badge>;
    case 'SCHEDULED':
    default:
      return <Badge variant="neutral" dot>Agendado</Badge>;
  }
}

export const Agenda: React.FC = () => {
  const queryClient = useQueryClient();
  const { isGestor } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedBayId, setSelectedBayId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newDurationMinutes, setNewDurationMinutes] = useState(120);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dateString = useMemo(() => {
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);

  // Consulta de Boxes Físicos da Oficina
  const { data: baysData, isLoading: loadingBays } = useQuery({
    queryKey: ['bays-list'],
    queryFn: () => api.appointments.getBays(),
    staleTime: 1000 * 60,
  });

  // Consulta de Agendamentos do Dia
  const { data: appData, isLoading: loadingAppointments, isFetching, refetch } = useQuery({
    queryKey: ['appointments-list', dateString],
    queryFn: () =>
      api.appointments.list({
        startDate: `${dateString}T00:00:00.000Z`,
        endDate: `${dateString}T23:59:59.999Z`,
      }),
    staleTime: 1000 * 20,
  });

  const bays = useMemo(() => {
    const list = Array.isArray(baysData) ? baysData : (baysData as any)?.bays || [];
    if (list.length === 0) {
      // Fallback gracioso com 3 boxes padrão para experiência rica imediata
      return [
        { id: 'bay-1', name: 'Box 01 · Detailing & Polimento', colorHex: '#C8F52E' },
        { id: 'bay-2', name: 'Box 02 · PPF & Envelopamento', colorHex: '#5CC8FF' },
        { id: 'bay-3', name: 'Box 03 · Lavagem Técnica', colorHex: '#FFB020' },
      ];
    }
    return list;
  }, [baysData]);

  const appointments = useMemo(() => {
    return Array.isArray(appData) ? appData : (appData as any)?.appointments || [];
  }, [appData]);

  // Navegação de Datas
  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Criação de Agendamento por Box
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBayId || !newCustomerName.trim() || !newVehiclePlate.trim()) {
      setFormError('Preencha o box, nome do cliente e placa do veículo.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const startDateTime = `${dateString}T${newStartTime}:00.000Z`;
      const endDate = new Date(new Date(startDateTime).getTime() + newDurationMinutes * 60000);

      await api.appointments.create({
        bayId: selectedBayId,
        customerName: newCustomerName.trim(),
        customerPhone: newCustomerPhone.trim(),
        vehiclePlate: newVehiclePlate.toUpperCase().trim(),
        vehicleModel: newVehicleModel.trim(),
        serviceName: newServiceName.trim() || 'Estética Geral',
        startTime: startDateTime,
        endTime: endDate.toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['appointments-list'] });
      setIsNewModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewVehiclePlate('');
      setNewVehicleModel('');
      setNewServiceName('');
    } catch (err: any) {
      setFormError(err.message || 'Horário indisponível ou em conflito neste Box.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancelar Agendamento
  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Deseja cancelar este agendamento e liberar o Box?')) return;
    try {
      await api.appointments.updateStatus(id, 'CANCELED');
      queryClient.invalidateQueries({ queryKey: ['appointments-list'] });
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar agendamento.');
    }
  };

  const selfBookingUrl = `${window.location.origin}/agendar`;

  return (
    <div className="space-y-6 pb-12 font-body">
      {/* Topo / Header da Agenda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-texto tracking-tight uppercase">
            Agenda Inteligente por Box
          </h1>
          <p className="text-xs md:text-sm text-muted mt-1">
            Planejamento de ocupação dos boxes físicos, tempos estimados e controle anti-conflito.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
          >
            Sincronizar
          </Button>

          <Button
            variant="volt"
            size="desktop"
            onClick={() => {
              setSelectedBayId(bays[0]?.id || '');
              setIsNewModalOpen(true);
            }}
            leftIcon={<Plus size={18} />}
          >
            + Agendar Box
          </Button>
        </div>
      </div>

      {/* Banner Self-Booking Online */}
      <div className="p-4 rounded-card bg-grafite border border-aco flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-volt/10 border border-volt/20 flex items-center justify-center text-volt shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="font-display text-xs font-bold text-texto uppercase tracking-wider">
              Portal Público de Auto-Agendamento (Self-Booking)
            </h4>
            <p className="text-xs text-muted">
              Divulgue seu link exclusivo na bio do Instagram ou WhatsApp para agendamentos online 24h.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(selfBookingUrl);
              alert('Link copiado para a área de transferência!');
            }}
            leftIcon={<Copy size={14} />}
          >
            Copiar Link
          </Button>

          <a href="/agendar" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" rightIcon={<ExternalLink size={14} />}>
              Ver Portal
            </Button>
          </a>
        </div>
      </div>

      {/* Navegador Temporal */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-grafite border border-aco p-4 rounded-card">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevDay} leftIcon={<ChevronLeft size={16} />}>
            Dia Anterior
          </Button>
          <Button variant="secondary" size="sm" onClick={handleToday}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextDay} rightIcon={<ChevronRight size={16} />}>
            Próximo Dia
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <CalendarIcon size={18} className="text-volt" />
          <span className="font-display text-base font-bold text-texto capitalize">
            {formatDateBR(selectedDate)}
          </span>
          <input
            type="date"
            value={dateString}
            onChange={(e) => {
              if (e.target.value) {
                const parts = e.target.value.split('-');
                setSelectedDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
              }
            }}
            className="w-8 h-8 opacity-0 absolute cursor-pointer"
            title="Escolher data no calendário"
          />
        </div>

        <div className="text-xs text-muted font-medium">
          Total de {appointments.length} agendamentos no dia
        </div>
      </div>

      {/* Grade de Boxes Físicos (Colunas por Box) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        {bays.map((bay: any) => {
          const bayAppointments = appointments.filter(
            (app: any) => app.bayId === bay.id || (!app.bayId && bay.id === 'bay-1')
          );

          return (
            <div
              key={bay.id}
              className="bg-grafite border border-aco rounded-card p-4 flex flex-col gap-4 min-h-[460px] shadow-lg"
            >
              {/* Header do Box */}
              <div className="flex items-center justify-between pb-3 border-b border-aco">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: bay.colorHex || '#C8F52E' }}
                  />
                  <div>
                    <h3 className="font-display text-xs font-bold text-texto uppercase tracking-wide">
                      {bay.name}
                    </h3>
                    <span className="text-[10px] text-muted">
                      {bayAppointments.length} veículos alocados
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedBayId(bay.id);
                    setIsNewModalOpen(true);
                  }}
                  title="Novo agendamento neste box"
                >
                  <Plus size={16} />
                </Button>
              </div>

              {/* Lista de Agendamentos no Box */}
              <div className="space-y-3 overflow-y-auto max-h-[620px] pr-1">
                {bayAppointments.map((app: any) => (
                  <Card
                    key={app.id}
                    className="p-4 bg-aco/40 border-linha hover:border-volt/60 transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-volt font-mono font-bold text-xs">
                        <Clock size={14} />
                        <span>
                          {formatTime(app.startTime)} - {formatTime(app.endTime)}
                        </span>
                      </div>
                      {getStatusBadge(app.status)}
                    </div>

                    <div>
                      <h4 className="font-display font-bold text-sm text-texto">
                        {app.vehicleModel || 'Veículo'}
                      </h4>
                      <span className="text-xs text-muted font-mono tracking-wider font-semibold">
                        {app.vehiclePlate || 'SEM PLACA'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-linha flex items-center justify-between text-xs text-muted">
                      <div className="truncate max-w-[140px]">
                        <span className="text-texto font-medium block truncate">
                          {app.customerName || 'Cliente'}
                        </span>
                        <span className="text-[11px] font-mono text-muted">
                          {app.serviceName || 'Serviço Geral'}
                        </span>
                      </div>

                      {app.status !== 'CANCELED' && (
                        <button
                          onClick={() => handleCancelAppointment(app.id)}
                          className="text-muted hover:text-error p-1 rounded transition-colors text-[11px]"
                          title="Cancelar e liberar Box"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </Card>
                ))}

                {bayAppointments.length === 0 && (
                  <div className="py-16 text-center text-muted/50 border border-dashed border-linha rounded-card flex flex-col items-center justify-center gap-2">
                    <Clock size={28} />
                    <p className="text-xs font-medium">Box livre neste dia</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Agendamento por Box */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-asfalto/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="bg-grafite border-aco w-full max-w-md shadow-2xl p-6 font-body">
            <div className="flex items-center justify-between pb-4 border-b border-linha">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-volt/10 border border-volt/20 flex items-center justify-center text-volt">
                  <CalendarIcon size={18} />
                </div>
                <h3 className="font-display text-base font-bold text-texto">
                  Agendar Box de Atendimento
                </h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-muted hover:text-texto p-1"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-error/10 border border-error/30 text-error text-xs rounded-input flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-3.5 mt-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Box de Atendimento *
                </label>
                <select
                  value={selectedBayId}
                  onChange={(e) => setSelectedBayId(e.target.value)}
                  className="h-12 px-3 rounded-input bg-aco/60 border border-linha text-texto text-sm focus:outline-none focus:border-volt"
                >
                  {bays.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Horário de Início *"
                  type="time"
                  required
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Duração Estimada
                  </label>
                  <select
                    value={newDurationMinutes}
                    onChange={(e) => setNewDurationMinutes(parseInt(e.target.value, 10))}
                    className="h-12 px-3 rounded-input bg-aco/60 border border-linha text-texto text-sm focus:outline-none focus:border-volt"
                  >
                    <option value={60}>1 hora (60 min)</option>
                    <option value={120}>2 horas (120 min)</option>
                    <option value={180}>3 horas (180 min)</option>
                    <option value={240}>4 horas (240 min)</option>
                    <option value={480}>Dia Inteiro (8h)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Nome do Cliente *"
                required
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Ex: Roberto Ramos"
              />

              <Input
                label="WhatsApp do Cliente"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="(11) 98888-7777"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Placa do Veículo *"
                  required
                  value={newVehiclePlate}
                  onChange={(e) => setNewVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="BRA2E19"
                />
                <Input
                  label="Modelo do Carro"
                  value={newVehicleModel}
                  onChange={(e) => setNewVehicleModel(e.target.value)}
                  placeholder="Ex: Hilux GR-S"
                />
              </div>

              <Input
                label="Serviço Principal"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Ex: Full PPF Frontal"
              />

              <div className="pt-3 flex justify-end gap-2 border-t border-linha">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="volt"
                  size="desktop"
                  isLoading={isSubmitting}
                >
                  Confirmar no Box
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Agenda;
