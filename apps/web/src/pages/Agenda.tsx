import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getStoredTenantSlug } from '../services/api';
import { copyToClipboard } from '../utils/clipboard';
import {
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Clock,
  User,
  Car,
  Phone,
  CheckCircle2,
  Calendar,
  Edit3,
  Move,
  Zap,
} from 'lucide-react';
import type { SmartBayOverviewDto, SmartAppointmentDto } from '@carx/shared';

function formatDateHeader(dateObj: Date): string {
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(dateObj);
  const day = dateObj.getDate();
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(dateObj);
  // Ex: "Sex, 30 de out"
  const cleanWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');
  const cleanMonth = month.replace('.', '');
  return `${cleanWeekday}, ${day} de ${cleanMonth}`;
}

const VEHICLE_SIZE_LABELS: Record<string, { label: string; factor: string }> = {
  hatch: { label: 'Hatch', factor: '0.85x (-15%)' },
  sedan: { label: 'Sedan (Padrão)', factor: '1.0x' },
  suv: { label: 'SUV', factor: '1.25x (+25%)' },
  pickup: { label: 'Picape', factor: '1.35x (+35%)' },
  van: { label: 'Van / Utilitário', factor: '1.5x (+50%)' },
  esportivo: { label: 'Esportivo', factor: '1.1x (+10%)' },
  moto: { label: 'Motocicleta', factor: '0.6x (-40%)' },
};

interface VisualAppointmentItem {
  id: string;
  bayIndex: number;
  bayId?: string;
  title: string;
  subtitle: string;
  top: number;
  height: number;
  bg: string;
  borderColor?: string;
  isDelayed?: boolean;
  delayMinutes?: number;
  isFreeSlot?: boolean;
  raw?: SmartAppointmentDto | any;
}

export const Agenda: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'dia' | 'semana'>('dia');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedDetailApp, setSelectedDetailApp] = useState<SmartAppointmentDto | null>(null);

  // Estados para Modal de Remanejamento / Edição de Agendamento
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<SmartAppointmentDto | null>(null);
  const [editBayId, setEditBayId] = useState<string>('');
  const [editTechnicianId, setEditTechnicianId] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('09:00');
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState<number>(60);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Estados para Drag & Drop visual
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [isDraggingOverSlot, setIsDraggingOverSlot] = useState<string | null>(null);

  // Ouvir eventos SSE em tempo real para sincronização da agenda
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      const url = api.realtime.getEventsUrl();
      es = new EventSource(url);
      const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['smart-schedule-overview'] });
        queryClient.invalidateQueries({ queryKey: ['appointments-list'] });
      };
      es.addEventListener('appointment.updated', handleRefresh);
      es.addEventListener('work_order.updated', handleRefresh);
      es.addEventListener('timer.started', handleRefresh);
      es.addEventListener('timer.stopped', handleRefresh);
    } catch (e) {
      // Ignorar fallback
    }
    return () => {
      es?.close();
    };
  }, [queryClient]);

  // Form State do Modal de Novo Agendamento
  const [selectedBayId, setSelectedBayId] = useState<string>('');
  const [selectedBayIndex, setSelectedBayIndex] = useState<number>(0);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [vehicleSizeClass, setVehicleSizeClass] = useState<string>('sedan');
  const [baseMinutes, setBaseMinutes] = useState<number>(120);
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
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  // Consulta da Visão Inteligente por Box & Atrasos
  const { data: smartOverview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['smart-schedule-overview', dateString],
    queryFn: () => api.appointments.getSmartOverview(dateString),
    staleTime: 1000 * 15,
  });

  // Consulta de Membros / Técnicos da Loja
  const { data: membersList } = useQuery({
    queryKey: ['tenant-members'],
    queryFn: () => api.members.list(),
    staleTime: 1000 * 60,
  });

  const technicians = useMemo(() => {
    if (!Array.isArray(membersList)) return [];
    return membersList.filter((m: any) => m.role === 'tecnico' || m.role === 'gestor' || m.role === 'owner');
  }, [membersList]);

  // Lista consolidada de boxes (da API ou estrutura canônica limpa)
  const boxes = useMemo(() => {
    if (smartOverview?.bays && smartOverview.bays.length > 0) {
      return smartOverview.bays.map((b: SmartBayOverviewDto) => ({
        id: b.id,
        name: b.name,
        color: b.color || '#C8F52E',
        technicianName: b.assignedTechnicianName,
        technicianId: b.assignedTechnicianId,
        occupancyStatus: b.occupancyStatus,
      }));
    }
    return [
      { id: 'bay-1', name: 'Box 1 · Principal', color: '#C8F52E', technicianName: null, occupancyStatus: 'free' as const },
      { id: 'bay-2', name: 'Box 2 · Secundário', color: '#CDEBFB', technicianName: null, occupancyStatus: 'free' as const },
      { id: 'bay-3', name: 'Box 3 · Rápido', color: '#E8EEF4', technicianName: null, occupancyStatus: 'free' as const },
    ];
  }, [smartOverview]);

  // Auto-cálculo de Duração baseado no Porte Veicular
  const handleSizeChange = (newSize: string) => {
    setVehicleSizeClass(newSize);
    const multipliers: Record<string, number> = {
      moto: 0.6,
      hatch: 0.85,
      sedan: 1.0,
      suv: 1.25,
      pickup: 1.35,
      van: 1.5,
      esportivo: 1.1,
    };
    const mult = multipliers[newSize] || 1.0;
    const computed = Math.max(15, Math.round((baseMinutes * mult) / 15) * 15);
    setNewDurationMinutes(computed);
  };

  // Sugestão de porte ao digitar modelo de veículo
  const handleModelChange = (modelText: string) => {
    setNewVehicleModel(modelText);
    const m = modelText.toLowerCase();
    if (m.includes('compass') || m.includes('t-cross') || m.includes('renegade') || m.includes('tracker') || m.includes('kicks') || m.includes('creta') || m.includes('suv') || m.includes('sw4')) {
      handleSizeChange('suv');
    } else if (m.includes('hilux') || m.includes('ranger') || m.includes('s10') || m.includes('toro') || m.includes('strada') || m.includes('saveiro') || m.includes('montana') || m.includes('picape')) {
      handleSizeChange('pickup');
    } else if (m.includes('onix') || m.includes('hb20') || m.includes('polo') || m.includes('gol') || m.includes('mobi') || m.includes('kwid') || m.includes('argo') || m.includes('hatch')) {
      handleSizeChange('hatch');
    } else if (m.includes('fiorino') || m.includes('master') || m.includes('ducato') || m.includes('hr') || m.includes('van')) {
      handleSizeChange('van');
    } else if (m.includes('porsche') || m.includes('ferrari') || m.includes('mustang') || m.includes('camaro') || m.includes('bmw m') || m.includes('audi rs')) {
      handleSizeChange('esportivo');
    }
  };

  // Itens visuais da Timeline de Agendamentos
  const appointments: VisualAppointmentItem[] = useMemo(() => {
    if (smartOverview?.bays && smartOverview.bays.length > 0) {
      const items: VisualAppointmentItem[] = [];

      smartOverview.bays.forEach((bay, bIdx) => {
        // Agendamentos reais do Box
        bay.appointments.forEach((app) => {
          const startDate = new Date(app.startTime);
          const endDate = new Date(app.endTime || startDate.getTime() + (app.estimatedMinutes || 120) * 60000);
          const startHour = startDate.getUTCHours() + startDate.getUTCMinutes() / 60;
          const durationHours = Math.max(1, (endDate.getTime() - startDate.getTime()) / 3600000);

          // Posição proporcional na grade (08h às 18h)
          const top = Math.max(0, Math.round((startHour - 8) * 56));
          const height = Math.max(48, Math.round(durationHours * 56) - 4);

          const woStatus = String(app.workOrderStatus || app.raw?.workOrderStatus || '').toUpperCase();
          const isFinished = app.status === 'completed' || ['QA', 'READY', 'DELIVERED', 'COMPLETED', 'CONCLUIDO', 'ENTREGUE'].includes(woStatus);

          let bg = app.statusColor || '#E8EEF4';
          let borderColor = undefined;

          if (isFinished) {
            bg = '#DCFCE7';
            borderColor = '#22C55E';
          } else if (app.isDelayed) {
            bg = '#FEE2E2';
            borderColor = '#EF4444';
          }

          items.push({
            id: app.id,
            bayIndex: bIdx,
            bayId: bay.id,
            title: app.vehicleModel ? `${app.vehicleModel} (${app.vehiclePlate || ''})` : app.title,
            subtitle: `${app.serviceSummary || app.title} · ${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}`,
            top,
            height,
            bg,
            borderColor,
            isDelayed: isFinished ? false : app.isDelayed,
            delayMinutes: isFinished ? 0 : app.delayMinutes,
            raw: app,
          });
        });

        // Slots Livres Sugeridos
        if (bay.freeSlots && bay.freeSlots.length > 0) {
          const firstFree = bay.freeSlots[0];
          const slotDate = new Date(firstFree.startTime);
          const slotHour = slotDate.getUTCHours();
          if (slotHour >= 8 && slotHour <= 16) {
            const top = Math.max(0, Math.round((slotHour - 8) * 56));
            items.push({
              id: `free-${bay.id}-${slotHour}`,
              bayIndex: bIdx,
              bayId: bay.id,
              title: firstFree.label || `Horário livre · ${slotHour}h`,
              subtitle: '',
              top,
              height: 56,
              bg: 'transparent',
              isFreeSlot: true,
            });
          }
        }
      });

      return items;
    }

    return [];
  }, [smartOverview]);

  const handlePrevDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() - 1);
    setSelectedDate(next);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleCopyLink = async () => {
    const slug = getStoredTenantSlug() || 'caiocar';
    const url = `${window.location.origin}/${slug}/agendar`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleOpenEdit = (app: SmartAppointmentDto) => {
    setEditingApp(app);
    setEditBayId(app.bayId || boxes[0]?.id || '');
    setEditTechnicianId(app.technicianId || '');

    const d = new Date(app.startTime);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    setEditStartTime(`${hh}:${mm}`);

    const yyyy = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    setEditDate(`${yyyy}-${mo}-${da}`);

    setEditEstimatedMinutes(app.estimatedMinutes || 60);
    setEditNotes(app.notes || '');
    setEditError(null);
    setSelectedDetailApp(null);
    setIsEditModalOpen(true);
  };

  const handleSetTimeToNow = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setEditStartTime(`${hh}:${mm}`);

    const yyyy = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const da = String(now.getDate()).padStart(2, '0');
    setEditDate(`${yyyy}-${mo}-${da}`);
  };

  const handleAdjustMinutes = (deltaMinutes: number) => {
    const [h, m] = editStartTime.split(':').map(Number);
    let totalM = (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m) + deltaMinutes;
    if (totalM < 0) totalM = 0;
    if (totalM > 23 * 60 + 59) totalM = 23 * 60 + 59;
    const newH = String(Math.floor(totalM / 60)).padStart(2, '0');
    const newM = String(totalM % 60).padStart(2, '0');
    setEditStartTime(`${newH}:${newM}`);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    setIsSubmittingEdit(true);
    setEditError(null);

    try {
      const startDateTime = `${editDate}T${editStartTime}:00.000Z`;
      const endDateTime = new Date(new Date(startDateTime).getTime() + editEstimatedMinutes * 60000).toISOString();

      await api.appointments.update(editingApp.id, {
        bayId: editBayId || undefined,
        technicianId: editTechnicianId || null,
        startTime: startDateTime,
        endTime: endDateTime,
        estimatedMinutes: editEstimatedMinutes,
        notes: editNotes.trim() || null,
      });

      queryClient.invalidateQueries({ queryKey: ['smart-schedule-overview'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-list'] });
      queryClient.invalidateQueries({ queryKey: ['tv-data'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsEditModalOpen(false);
      setEditingApp(null);
    } catch (err: any) {
      setEditError(err.message || 'Erro ao remanejar agendamento. Verifique choques de horário no Box ou do profissional.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDropOnSlot = async (e: React.DragEvent, targetBayId: string, targetHour: number) => {
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      const appId = data.id;
      const duration = data.duration || 60;

      const hh = String(targetHour).padStart(2, '0');
      const startDateTime = `${dateString}T${hh}:00:00.000Z`;
      const endDateTime = new Date(new Date(startDateTime).getTime() + duration * 60000).toISOString();

      await api.appointments.update(appId, {
        bayId: targetBayId,
        startTime: startDateTime,
        endTime: endDateTime,
        estimatedMinutes: duration,
      });

      queryClient.invalidateQueries({ queryKey: ['smart-schedule-overview'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-list'] });
      queryClient.invalidateQueries({ queryKey: ['tv-data'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      alert(err.message || 'Erro ao remanejar agendamento. Verifique choques de horário no Box ou do profissional.');
    } finally {
      setDraggedAppId(null);
      setIsDraggingOverSlot(null);
    }
  };

  const handleOpenFreeSlot = (bayIndex: number, bayId?: string, defaultHour = '15:00') => {
    setSelectedBayIndex(bayIndex);
    setSelectedBayId(bayId || boxes[bayIndex]?.id || '');
    setNewStartTime(defaultHour);
    setFormError(null);
    setIsNewModalOpen(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newVehiclePlate.trim()) {
      setFormError('Por favor informe o nome do cliente e a placa.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const startDateTime = `${dateString}T${newStartTime}:00.000Z`;
      const endDate = new Date(new Date(startDateTime).getTime() + newDurationMinutes * 60000);

      const targetBay = boxes[selectedBayIndex];
      const bayUuid = selectedBayId && selectedBayId.includes('-') && selectedBayId.length === 36
        ? selectedBayId
        : targetBay?.id?.length === 36 ? targetBay.id : undefined;

      await api.appointments.create({
        bayId: bayUuid,
        technicianId: selectedTechnicianId || undefined,
        customerName: newCustomerName.trim(),
        customerPhone: newCustomerPhone.trim() || undefined,
        vehiclePlate: newVehiclePlate.toUpperCase().trim(),
        vehicleModel: newVehicleModel.trim() || 'Veículo',
        vehicleSizeClass: vehicleSizeClass,
        serviceSummary: newServiceName.trim() || 'Serviço Automotivo',
        title: `${newVehicleModel.trim() || 'Veículo'} · ${newServiceName.trim() || 'Serviço'}`,
        startTime: startDateTime,
        endTime: endDate.toISOString(),
        estimatedMinutes: newDurationMinutes,
      });

      queryClient.invalidateQueries({ queryKey: ['smart-schedule-overview'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-list'] });
      setIsNewModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewVehiclePlate('');
      setNewVehicleModel('');
      setNewServiceName('');
    } catch (err: any) {
      setFormError(err.message || 'Erro ao registrar agendamento. Verifique se não há choque de horário no box ou do profissional.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '844px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. TOPO: TÍTULO, DATA, MODO E NOVO AGENDAMENTO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '30px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            Agenda
          </div>

          {/* Pill de Data com navegação */}
          <div
            style={{
              height: '44px',
              padding: '0 12px',
              border: '1px solid #E1E6EC',
              background: '#fff',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '14px',
              gap: '6px',
            }}
          >
            <button
              onClick={handlePrevDay}
              style={{
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                color: '#5B6674',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Dia anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ cursor: 'pointer' }} onClick={handleToday} title="Clique para voltar a hoje">
              {formatDateHeader(selectedDate)}
            </span>
            <button
              onClick={handleNextDay}
              style={{
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                color: '#5B6674',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Próximo dia"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Modo Dia */}
          <button
            onClick={() => setViewMode('dia')}
            style={{
              height: '44px',
              padding: '0 16px',
              borderRadius: '12px',
              border: viewMode === 'dia' ? '0' : '1px solid #E1E6EC',
              background: viewMode === 'dia' ? '#0E1116' : '#fff',
              color: viewMode === 'dia' ? '#fff' : '#0E1116',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Dia
          </button>

          {/* Modo Semana */}
          <button
            onClick={() => setViewMode('semana')}
            style={{
              height: '44px',
              padding: '0 16px',
              borderRadius: '12px',
              border: viewMode === 'semana' ? '0' : '1px solid #E1E6EC',
              background: viewMode === 'semana' ? '#0E1116' : '#fff',
              color: viewMode === 'semana' ? '#fff' : '#0E1116',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Semana
          </button>
        </div>

        {/* Botão + Novo agendamento */}
        <button
          onClick={() => {
            setSelectedBayIndex(0);
            setSelectedBayId(boxes[0]?.id || '');
            setIsNewModalOpen(true);
          }}
          style={{
            height: '48px',
            padding: '0 24px',
            border: 0,
            borderRadius: '14px',
            background: '#C8F52E',
            color: '#0E1116',
            font: '700 15px Inter, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          + Novo agendamento
        </button>
      </div>

      {/* 2. BARRA DE STATUS: AGENDAMENTO ONLINE ATIVO & ALERTA DE ATRASOS */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E1E6EC',
          borderRadius: '16px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          color: '#5B6674',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>
            <b style={{ color: '#0E1116' }}>Agendamento online ativo</b> · Gestão inteligente com ocupação por box
          </span>
          {smartOverview && smartOverview.delayedCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#FEE2E2',
                color: '#DC2626',
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <AlertTriangle size={14} /> {smartOverview.delayedCount} agendamento(s) com atraso
            </span>
          )}
        </div>
        <span
          onClick={handleCopyLink}
          style={{
            fontWeight: 600,
            color: '#0E1116',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          {copiedLink ? 'Link copiado!' : 'Copiar link da loja'}
        </span>
      </div>

      {/* 3. GRADE DA AGENDA (TIMELINE + BOXES) */}
      <div
        style={{
          display: 'flex',
          background: '#fff',
          border: '1px solid #E1E6EC',
          borderRadius: '20px',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {/* Coluna Horária (08h - 17h) */}
        <div style={{ width: '64px', flex: 'none' }}>
          <div style={{ height: '46px', borderBottom: '1px solid #E1E6EC' }}></div>
          {['08h', '09h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h'].map((hr) => (
            <div
              key={hr}
              style={{
                height: '56px',
                fontSize: '12px',
                color: '#5B6674',
                padding: '4px 10px 0 0',
                textAlign: 'right',
                boxSizing: 'border-box',
              }}
            >
              {hr}
            </div>
          ))}
        </div>

        {/* Colunas dos Boxes */}
        {boxes.map((box, bIdx) => (
          <div key={box.id || bIdx} style={{ flex: 1, minWidth: '200px' }}>
            <div
              style={{
                height: '46px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 600,
                borderLeft: '1px solid #E1E6EC',
                borderBottom: '1px solid #E1E6EC',
                boxSizing: 'border-box',
                background: '#fff',
                color: '#0E1116',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: box.color || '#C8F52E',
                  }}
                />
                <span>{box.name}</span>
              </div>
              {box.occupancyStatus === 'delayed' && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#DC2626',
                    background: '#FEE2E2',
                    padding: '2px 6px',
                    borderRadius: '6px',
                  }}
                >
                  Atraso
                </span>
              )}
            </div>
            <div
              style={{
                position: 'relative',
                borderLeft: '1px solid #E1E6EC',
                height: '560px',
                background: 'repeating-linear-gradient(#fff 0 55px, #E1E6EC 55px 56px)',
              }}
            >
              {/* Slots de hora para Drag & Drop nativo */}
              {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((hour) => {
                const slotKey = `${box.id || bIdx}-${hour}`;
                const isOver = isDraggingOverSlot === slotKey;
                return (
                  <div
                    key={hour}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (isDraggingOverSlot !== slotKey) setIsDraggingOverSlot(slotKey);
                    }}
                    onDragLeave={() => {
                      if (isDraggingOverSlot === slotKey) setIsDraggingOverSlot(null);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDraggingOverSlot(null);
                      await handleDropOnSlot(e, box.id || boxes[bIdx]?.id, hour);
                    }}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${(hour - 8) * 56}px`,
                      height: '56px',
                      background: isOver ? 'rgba(200, 245, 46, 0.2)' : 'transparent',
                      border: isOver ? '2px dashed #C8F52E' : 'none',
                      boxSizing: 'border-box',
                      pointerEvents: draggedAppId ? 'auto' : 'none',
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#15803D',
                    }}
                  >
                    {isOver && `Soltar às ${hour}h em ${box.name}`}
                  </div>
                );
              })}

              {appointments
                .filter((app) => app.bayIndex === bIdx)
                .map((app) => {
                  if (app.isFreeSlot) {
                    return (
                      <div
                        key={app.id}
                        onClick={() => handleOpenFreeSlot(bIdx, app.bayId, '15:00')}
                        style={{
                          position: 'absolute',
                          left: '6px',
                          right: '6px',
                          top: `${app.top}px`,
                          height: `${app.height}px`,
                          border: '2px dashed #C8F52E',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#5B6674',
                          cursor: 'pointer',
                          background: '#fff',
                          boxSizing: 'border-box',
                          transition: 'background 0.2s',
                          zIndex: 3,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F7FEE7')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                      >
                        {app.title}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={app.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({ id: app.id, duration: app.raw?.estimatedMinutes || 60 })
                        );
                        setDraggedAppId(app.id);
                      }}
                      onDragEnd={() => {
                        setDraggedAppId(null);
                        setIsDraggingOverSlot(null);
                      }}
                      onClick={() => {
                        if (app.raw) {
                          setSelectedDetailApp(app.raw);
                        } else {
                          alert(`Agendamento:\n${app.title}\n${app.subtitle}`);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: '6px',
                        right: '6px',
                        top: `${app.top}px`,
                        height: `${app.height}px`,
                        background: app.bg,
                        border: app.borderColor ? `2px solid ${app.borderColor}` : '1px solid transparent',
                        borderRadius: '12px',
                        padding: '8px 10px',
                        fontSize: '13px',
                        lineHeight: '1.3',
                        color: '#0E1116',
                        overflow: 'hidden',
                        cursor: draggedAppId === app.id ? 'grabbing' : 'grab',
                        opacity: draggedAppId === app.id ? 0.6 : 1,
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        zIndex: 4,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {(() => {
                          const rawWoStatus = String(app.raw?.workOrderStatus || '').toUpperCase();
                          const isFinished = app.raw?.status === 'completed' || ['QA', 'READY', 'DELIVERED', 'COMPLETED', 'CONCLUIDO', 'ENTREGUE'].includes(rawWoStatus);

                          if (isFinished) {
                            return (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#15803D',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  marginBottom: '2px',
                                }}
                              >
                                <CheckCircle2 size={12} color="#16A34A" /> Concluído
                              </div>
                            );
                          }

                          if (app.isDelayed) {
                            return (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#DC2626',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  marginBottom: '2px',
                                }}
                              >
                                <AlertTriangle size={12} /> Atraso (+{app.delayMinutes || 15}m)
                              </div>
                            );
                          }

                          return <span />;
                        })()}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            title="Remanejar Horário ou Box"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (app.raw) handleOpenEdit(app.raw);
                            }}
                            style={{
                              border: 0,
                              background: 'rgba(0,0,0,0.08)',
                              borderRadius: '6px',
                              padding: '2px 4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Edit3 size={12} color="#0E1116" />
                          </button>
                        </div>
                      </div>
                      <b style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>
                        {app.title}
                      </b>
                      <div style={{ color: '#4B5563', fontSize: '12px' }}>{app.subtitle}</div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: NOVO AGENDAMENTO COM CÁLCULO DE DURAÇÃO POR PORTE & ANTI-CONFLITO */}
      {isNewModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #E1E6EC',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '520px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '20px',
                    fontWeight: 700,
                  }}
                >
                  Novo agendamento inteligente
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#5B6674' }}>
                  Anti-conflito estrito no Box e do Técnico com duração por porte.
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#5B6674' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Box de Atendimento *
                  </label>
                  <select
                    value={selectedBayIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSelectedBayIndex(idx);
                      setSelectedBayId(boxes[idx]?.id || '');
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    {boxes.map((b, idx) => (
                      <option key={b.id || idx} value={idx}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Profissional / Técnico
                  </label>
                  <select
                    value={selectedTechnicianId}
                    onChange={(e) => setSelectedTechnicianId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value="">Não atribuído</option>
                    {technicians.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do cliente"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Placa do Veículo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ABC1D23"
                    value={newVehiclePlate}
                    onChange={(e) => setNewVehiclePlate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Modelo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Jeep Compass"
                    value={newVehicleModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Porte do Veículo & Duração Inteligente */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0E1116' }}>
                    Porte do Veículo (Duração Calibrada)
                  </label>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#16A34A',
                      background: '#DCFCE7',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    Fator: {VEHICLE_SIZE_LABELS[vehicleSizeClass]?.factor || '1.0x'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {Object.entries(VEHICLE_SIZE_LABELS).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSizeChange(key)}
                      style={{
                        padding: '6px 8px',
                        border: vehicleSizeClass === key ? '2px solid #C8F52E' : '1px solid #E1E6EC',
                        background: vehicleSizeClass === key ? '#0E1116' : '#fff',
                        color: vehicleSizeClass === key ? '#fff' : '#0E1116',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                  Serviço Principal
                </label>
                <input
                  type="text"
                  placeholder="Ex: PPF Frontal Completo"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '10px',
                    padding: '0 12px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Duração Estimada (min)
                  </label>
                  <input
                    type="number"
                    step="15"
                    min="15"
                    value={newDurationMinutes}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setNewDurationMinutes(v);
                      setBaseMinutes(v);
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  style={{
                    flex: 1,
                    height: '46px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '12px',
                    background: '#fff',
                    color: '#0E1116',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    height: '46px',
                    border: 0,
                    borderRadius: '12px',
                    background: '#C8F52E',
                    color: '#0E1116',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Validando conflitos...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DO AGENDAMENTO SELECIONADO */}
      {selectedDetailApp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #E1E6EC',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '460px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                }}
              >
                Detalhes do Agendamento
              </h3>
              <button
                onClick={() => setSelectedDetailApp(null)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#5B6674' }}
              >
                <X size={20} />
              </button>
            </div>

            {(() => {
              const woStatus = String(selectedDetailApp.workOrderStatus || selectedDetailApp.raw?.workOrderStatus || '').toUpperCase();
              const isFinished = selectedDetailApp.status === 'completed' || ['QA', 'READY', 'DELIVERED', 'COMPLETED', 'CONCLUIDO', 'ENTREGUE'].includes(woStatus);

              if (isFinished) {
                return (
                  <div
                    style={{
                      background: '#DCFCE7',
                      border: '1px solid #86EFAC',
                      color: '#15803D',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={18} color="#16A34A" />
                    <span>
                      <b>Serviço Concluído / Entregue:</b> Veículo vistoriado e finalizado no box.
                    </span>
                  </div>
                );
              }

              if (selectedDetailApp.isDelayed) {
                return (
                  <div
                    style={{
                      background: '#FEE2E2',
                      border: '1px solid #FCA5A5',
                      color: '#991B1B',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangle size={18} />
                    <span>
                      <b>Atraso detectado:</b> Agendamento ultrapassou o término previsto em {selectedDetailApp.delayMinutes} minutos.
                    </span>
                  </div>
                );
              }

              return null;
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0E1116' }}>
                <Car size={16} color="#5B6674" />
                <b>Veículo:</b> {selectedDetailApp.vehicleModel || 'Veículo'} ({selectedDetailApp.vehiclePlate || 'Sem placa'})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0E1116' }}>
                <User size={16} color="#5B6674" />
                <b>Cliente:</b> {selectedDetailApp.customerName || 'Não informado'}
              </div>
              {selectedDetailApp.customerPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0E1116' }}>
                  <Phone size={16} color="#5B6674" />
                  <b>Telefone:</b> {selectedDetailApp.customerPhone}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0E1116' }}>
                <Clock size={16} color="#5B6674" />
                <b>Horário:</b> {new Date(selectedDetailApp.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} às {new Date(selectedDetailApp.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} ({selectedDetailApp.estimatedMinutes}m)
              </div>
              {selectedDetailApp.technicianName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0E1116' }}>
                  <User size={16} color="#5B6674" />
                  <b>Técnico:</b> {selectedDetailApp.technicianName}
                </div>
              )}
              {selectedDetailApp.serviceSummary && (
                <div style={{ marginTop: '4px', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                  <b>Serviço:</b> {selectedDetailApp.serviceSummary}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedDetailApp)}
                style={{
                  flex: 1.2,
                  height: '44px',
                  border: '1px solid #0E1116',
                  borderRadius: '12px',
                  background: '#0E1116',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Edit3 size={15} color="#C8F52E" /> Remanejar / Editar
              </button>
              {(() => {
                const woStatus = String(selectedDetailApp.workOrderStatus || selectedDetailApp.raw?.workOrderStatus || '').toUpperCase();
                const isFinished = selectedDetailApp.status === 'completed' || ['QA', 'READY', 'DELIVERED', 'COMPLETED', 'CONCLUIDO', 'ENTREGUE'].includes(woStatus);

                if (isFinished) {
                  return (
                    <div
                      style={{
                        flex: 1,
                        height: '44px',
                        borderRadius: '12px',
                        background: '#DCFCE7',
                        color: '#15803D',
                        border: '1px solid #86EFAC',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={16} color="#16A34A" /> Concluído
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.appointments.updateStatus(selectedDetailApp.id, 'completed');
                        queryClient.invalidateQueries({ queryKey: ['smart-schedule-overview'] });
                        setSelectedDetailApp(null);
                      } catch (e: any) {
                        alert(e.message || 'Erro ao atualizar');
                      }
                    }}
                    style={{
                      flex: 1,
                      height: '44px',
                      border: 0,
                      borderRadius: '12px',
                      background: '#C8F52E',
                      color: '#0E1116',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={15} /> Concluir
                  </button>
                );
              })()}
              <button
                type="button"
                onClick={() => setSelectedDetailApp(null)}
                style={{
                  flex: 0.8,
                  height: '44px',
                  border: '1px solid #E1E6EC',
                  borderRadius: '12px',
                  background: '#fff',
                  color: '#0E1116',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REMANEJAR / EDITAR AGENDAMENTO (HORÁRIO, BOX, TÉCNICO, ADIANTAR P/ AGORA) */}
      {isEditModalOpen && editingApp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #E1E6EC',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '520px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#0E1116',
                  }}
                >
                  Remanejar Agendamento
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#5B6674' }}>
                  {editingApp.vehicleModel || 'Veículo'} ({editingApp.vehiclePlate || 'Sem placa'}) · {editingApp.customerName || 'Cliente'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingApp(null);
                }}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#5B6674' }}
              >
                <X size={20} />
              </button>
            </div>

            {editError && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Box de Atendimento */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                  Box de Atendimento *
                </label>
                <select
                  value={editBayId}
                  onChange={(e) => setEditBayId(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '10px',
                    padding: '0 12px',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: 500,
                  }}
                >
                  {boxes.map((b, idx) => (
                    <option key={b.id || idx} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data e Horário */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Data do Agendamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#5B6674' }}>
                      Horário de Início *
                    </label>
                    <button
                      type="button"
                      onClick={handleSetTimeToNow}
                      style={{
                        border: 0,
                        background: '#DCFCE7',
                        color: '#15803D',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="Preencher com o horário exato de agora"
                    >
                      <Zap size={11} /> Adiantar p/ Agora
                    </button>
                  </div>
                  <input
                    type="time"
                    required
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Botões de Atalho para ajuste rápido de horário */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#F8FAFC',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Ajuste rápido:</span>
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(-30)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  -30m
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(-15)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  -15m
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(15)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  +15m
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(30)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  +30m
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(60)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  +1h
                </button>
              </div>

              {/* Técnico e Duração */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Profissional / Técnico
                  </label>
                  <select
                    value={editTechnicianId}
                    onChange={(e) => setEditTechnicianId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value="">Não atribuído</option>
                    {technicians.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Duração Estimada (min)
                  </label>
                  <input
                    type="number"
                    step="15"
                    min="15"
                    value={editEstimatedMinutes}
                    onChange={(e) => setEditEstimatedMinutes(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #E1E6EC',
                      borderRadius: '10px',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Observações / Notas */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                  Notas Operacionais
                </label>
                <input
                  type="text"
                  placeholder="Ex: Adiantado a pedido do cliente / oficina livre"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '10px',
                    padding: '0 12px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingApp(null);
                  }}
                  style={{
                    flex: 1,
                    height: '46px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '12px',
                    background: '#fff',
                    color: '#0E1116',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  style={{
                    flex: 1.5,
                    height: '46px',
                    border: 0,
                    borderRadius: '12px',
                    background: '#C8F52E',
                    color: '#0E1116',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {isSubmittingEdit ? 'Validando conflitos...' : 'Confirmar Remanejamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
