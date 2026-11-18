import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';
import { copyToClipboard } from '../utils/clipboard';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, EmptyState, Input } from '@carx/ui';
import NovoOrcamentoModal from '../components/features/NovoOrcamentoModal';
import CarVisualChecklist from '../components/features/CarVisualChecklist';
import { VcrReportModal } from '../components/features/VcrReportModal';
import QaChecklistModal from '../components/features/QaChecklistModal';
import ModalEntregaVeiculo from '../components/features/ModalEntregaVeiculo';
import CertificadoGarantia from '../components/features/CertificadoGarantia';
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
  Copy,
  Check,
  CreditCard,
  Banknote,
  AlertCircle,
  MessageSquare,
  Send,
  FileText,
  Download,
  Ban,
  Receipt,
  ClipboardCheck,
  KeyRound,
  Award,
} from 'lucide-react';
import type {
  WorkOrderStatusType,
  WorkOrderPixChargeResultDto,
  SendTransactionalWhatsAppResultDto,
  WhatsAppTransactionalEventType,
  FiscalInvoiceDto,
} from '@carx/shared';

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

function getVehicleDisplay(veh?: any) {
  if (!veh) return 'Veículo';
  const brand = veh.brand && veh.brand.toLowerCase() !== 'geral' ? veh.brand.trim() : '';
  const model = (veh.model || '').trim();
  if (brand && model.toLowerCase().startsWith(brand.toLowerCase())) {
    return model;
  }
  return `${brand ? brand + ' ' : ''}${model}`.trim() || 'Veículo';
}

function getStatusBadge(status: string) {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-[#C8F52E]/30 text-[#0E1116] border-[#0E1116]/30 dark:bg-[#C8F52E]/20 dark:text-[#C8F52E] dark:border-[#C8F52E]/40">
          <span className="w-2 h-2 rounded-full bg-[#0E1116] dark:bg-[#C8F52E] animate-pulse" />
          <span>Em Execução</span>
        </span>
      );
    case 'QA':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700">
          <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400" />
          <span>Vistoria QA</span>
        </span>
      );
    case 'READY':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700">
          <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400" />
          <span>Pronto p/ Entrega</span>
        </span>
      );
    case 'DELIVERED':
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700">
          <span>Entregue</span>
        </span>
      );
    case 'CHECKED_IN':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700">
          <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          <span>No Pátio</span>
        </span>
      );
    case 'SCHEDULED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700">
          <span>Agendado</span>
        </span>
      );
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700">
          <span>Aprovado</span>
        </span>
      );
    case 'QUOTE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
          <span>Orçamento</span>
        </span>
      );
    case 'PAUSED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700">
          <span>Pausado</span>
        </span>
      );
    case 'CANCELED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700">
          <span>Cancelado</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
          <span>{status}</span>
        </span>
      );
  }
}

export const OrdensServico: React.FC = () => {
  const navigate = useNavigate();
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

  // Estados para Cobrança Pix Integrada (T6.3)
  const [pixCharge, setPixCharge] = useState<WorkOrderPixChargeResultDto | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [isSimulatingPix, setIsSimulatingPix] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixSettled, setPixSettled] = useState(false);

  // Estados para Notificação WhatsApp por Evento de OS (T6.4)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppEvent, setWhatsAppEvent] = useState<WhatsAppTransactionalEventType>('READY');
  const [whatsAppCustomMessage, setWhatsAppCustomMessage] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppResult, setWhatsAppResult] = useState<SendTransactionalWhatsAppResultDto | null>(null);

  // Estados para Módulo Fiscal (NFS-e Automática - T6.10)
  const [fiscalInvoice, setFiscalInvoice] = useState<FiscalInvoiceDto | null>(null);
  const [loadingFiscal, setLoadingFiscal] = useState<boolean>(false);
  const [issuingFiscal, setIssuingFiscal] = useState<boolean>(false);
  const [cancellingFiscal, setCancellingFiscal] = useState<boolean>(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [fiscalFeedback, setFiscalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados para Laudo Técnico & Checklist de Entrada (VCR)
  const [inspectionsList, setInspectionsList] = useState<any[]>([]);
  const [loadingInspections, setLoadingInspections] = useState<boolean>(false);
  const [isVcrModalOpen, setIsVcrModalOpen] = useState<boolean>(false);
  const [activeInspectionForReport, setActiveInspectionForReport] = useState<any | null>(null);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Estados para Auditoria de Qualidade (QA)
  const [isQaModalOpen, setIsQaModalOpen] = useState<boolean>(false);
  const [qaTargetOrder, setQaTargetOrder] = useState<any | null>(null);

  const handleOpenQaModal = (order: any) => {
    setQaTargetOrder(order);
    setIsQaModalOpen(true);
  };

  // Estados para Entrega Técnica do Veículo & Garantia (Item 64)
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);
  const [deliveryTargetOrder, setDeliveryTargetOrder] = useState<any | null>(null);
  const [isCertificadoModalOpen, setIsCertificadoModalOpen] = useState<boolean>(false);
  const [certificadoTargetOrder, setCertificadoTargetOrder] = useState<any | null>(null);

  const handleOpenDeliveryModal = (order: any) => {
    setDeliveryTargetOrder(order);
    setIsDeliveryModalOpen(true);
  };

  const handleOpenCertificadoModal = (order: any) => {
    setCertificadoTargetOrder(order);
    setIsCertificadoModalOpen(true);
  };

  const normalizedForCertificate = useMemo(() => {
    if (!certificadoTargetOrder) return null;
    return {
      ...certificadoTargetOrder,
      id: certificadoTargetOrder.osNumber || certificadoTargetOrder.os_number || certificadoTargetOrder.id,
      cliente_nome:
        certificadoTargetOrder.customer?.name ||
        certificadoTargetOrder.cliente_nome ||
        certificadoTargetOrder.cliente ||
        'Cliente',
      cliente_telefone:
        certificadoTargetOrder.customer?.phone || certificadoTargetOrder.cliente_telefone || '',
      veiculo_desc: certificadoTargetOrder.vehicle
        ? `${certificadoTargetOrder.vehicle.brand || ''} ${certificadoTargetOrder.vehicle.model || ''} ${
            certificadoTargetOrder.vehicle.year ? `(${certificadoTargetOrder.vehicle.year})` : ''
          }`.trim()
        : certificadoTargetOrder.veiculo_desc || certificadoTargetOrder.veiculo || 'Veículo',
      placa: certificadoTargetOrder.vehicle?.plate || certificadoTargetOrder.placa || '',
      servicos_detalhados:
        certificadoTargetOrder.items || certificadoTargetOrder.servicos_detalhados || [],
      garantia: `${certificadoTargetOrder.warrantyMonths || 12} Meses`,
    };
  }, [certificadoTargetOrder]);

  // Carregar laudos de inspeção quando uma OS é selecionada
  React.useEffect(() => {
    if (!selectedOrder?.id) {
      setInspectionsList([]);
      return;
    }

    let isMounted = true;
    setLoadingInspections(true);

    api.inspections
      .getByWorkOrder(selectedOrder.id)
      .then((res: any) => {
        if (isMounted) {
          const list = Array.isArray(res) ? res : res?.inspections || [];
          setInspectionsList(list);
        }
      })
      .catch((err) => {
        console.warn('Inspeções não encontradas ou erro ao carregar:', err);
        if (isMounted) setInspectionsList([]);
      })
      .finally(() => {
        if (isMounted) setLoadingInspections(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedOrder?.id]);

  // Carregar dados de NFS-e quando uma OS é selecionada
  React.useEffect(() => {
    if (!selectedOrder?.id) {
      setFiscalInvoice(null);
      setFiscalFeedback(null);
      return;
    }

    let isMounted = true;
    setLoadingFiscal(true);
    setFiscalFeedback(null);

    api.fiscal
      .getInvoiceByWorkOrder(selectedOrder.id)
      .then((inv) => {
        if (isMounted) setFiscalInvoice(inv);
      })
      .catch((err) => {
        console.warn('NFS-e não encontrada ou erro ao carregar:', err);
        if (isMounted) setFiscalInvoice(null);
      })
      .finally(() => {
        if (isMounted) setLoadingFiscal(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedOrder?.id]);

  // Monitoramento do status do Pix (Polling a cada 3s caso esteja aguardando pagamento)
  React.useEffect(() => {
    if (!pixCharge || pixSettled) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.workOrders.getPixStatus(pixCharge.workOrderId, pixCharge.txid);
        if (res.status === 'approved') {
          setPixSettled(true);
          queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
        }
      } catch (err) {
        // silencioso
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pixCharge, pixSettled, queryClient]);

  const handleOpenPaymentModal = (os: any) => {
    setSelectedOrder(os);
    const balanceCents = Math.max(0, (os.finalCents || os.totalCents || 0) - (os.paidCents || 0));
    setPaymentAmount((balanceCents / 100).toFixed(2));
    setPaymentMethod('pix');
    setPixCharge(null);
    setPixSettled(false);
    setPixCopied(false);
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPixCharge(null);
    setPixSettled(false);
    setPixCopied(false);
    setPaymentAmount('');
  };

  const handleGeneratePix = async () => {
    if (!selectedOrder) return;
    const amountVal = parseFloat(paymentAmount.replace(',', '.'));
    const amountCents = !isNaN(amountVal) && amountVal > 0 ? Math.round(amountVal * 100) : undefined;

    setIsGeneratingPix(true);
    try {
      const charge = await api.workOrders.createPixCharge(selectedOrder.id, amountCents);
      setPixCharge(charge);
      setPixSettled(false);
      setPixCopied(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar cobrança Pix.');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const handleSimulatePixWebhook = async () => {
    if (!pixCharge) return;
    setIsSimulatingPix(true);
    try {
      await api.workOrders.confirmPixPayment({
        txid: pixCharge.txid,
        amountCents: pixCharge.amountCents,
        payerName: selectedOrder?.customer?.name || 'Cliente Caixa',
      });
      setPixSettled(true);
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
      toast.success('Pagamento Pix confirmado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao simular confirmação Pix.');
    } finally {
      setIsSimulatingPix(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (!pixCharge?.pixCode) return;
    await copyToClipboard(pixCharge.pixCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
  };

  // Disparo Transacional de WhatsApp (T6.4)
  const handleOpenWhatsAppModal = (os: any) => {
    setSelectedOrder(os);
    let suggestedEvent: WhatsAppTransactionalEventType = 'READY';
    if (os.status === 'CHECKED_IN') suggestedEvent = 'CHECKED_IN';
    else if (os.status === 'IN_PROGRESS') suggestedEvent = 'IN_PROGRESS';
    else if (os.status === 'DELIVERED') suggestedEvent = 'DELIVERED';
    else if (os.status === 'SCHEDULED') suggestedEvent = 'APPOINTMENT_CONFIRMED';

    setWhatsAppEvent(suggestedEvent);
    setWhatsAppCustomMessage('');
    setWhatsAppResult(null);
    setIsWhatsAppModalOpen(true);
  };

  const handleCloseWhatsAppModal = () => {
    setIsWhatsAppModalOpen(false);
    setWhatsAppResult(null);
    setWhatsAppCustomMessage('');
  };

  const handleSendWhatsAppNotification = async () => {
    if (!selectedOrder) return;
    setIsSendingWhatsApp(true);
    setWhatsAppResult(null);
    try {
      const res = await api.workOrders.notifyWhatsApp(selectedOrder.id, {
        eventType: whatsAppEvent,
        customMessage: whatsAppCustomMessage.trim() || undefined,
      });
      setWhatsAppResult(res);
      if (res.mode === 'manual' && res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao disparar notificação de WhatsApp.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Emissão e Cancelamento de NFS-e (T6.10)
  const handleIssueFiscal = async () => {
    if (!selectedOrder?.id) return;
    setIssuingFiscal(true);
    setFiscalFeedback(null);
    try {
      const res = await api.fiscal.issueNfse(selectedOrder.id);
      setFiscalInvoice(res);
      setFiscalFeedback({
        type: 'success',
        message:
          res.status === 'authorized'
            ? `NFS-e #${res.invoiceNumber || res.rpsNumber} autorizada com sucesso!`
            : 'NFS-e enviada com sucesso e em processamento na prefeitura.',
      });
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
    } catch (err: any) {
      setFiscalFeedback({
        type: 'error',
        message: err.message || 'Erro ao emitir NFS-e da ordem de serviço.',
      });
    } finally {
      setIssuingFiscal(false);
    }
  };

  const handleOpenCancelModal = () => {
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancelFiscal = async () => {
    if (!fiscalInvoice?.id) return;
    if (!cancelReason.trim() || cancelReason.trim().length < 15) {
      toast.warning('A justificativa de cancelamento deve ter pelo menos 15 caracteres.');
      return;
    }

    setCancellingFiscal(true);
    try {
      const res = await api.fiscal.cancelNfse(fiscalInvoice.id, cancelReason.trim());
      setFiscalInvoice(res);
      setIsCancelModalOpen(false);
      setFiscalFeedback({
        type: 'success',
        message: 'NFS-e cancelada com sucesso junto à prefeitura.',
      });
      toast.success('NFS-e cancelada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar a NFS-e.');
    } finally {
      setCancellingFiscal(false);
    }
  };

  // Consulta de Ordens de Serviço
  const { data: woData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['work-orders-list', selectedStatus, searchTerm, page],
    queryFn: () =>
      api.workOrders.list({
        status: selectedStatus === 'TODOS' ? undefined : selectedStatus,
        excludeQuote: selectedStatus === 'TODOS',
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

  // Download Seguro do PDF do Laudo Técnico
  const handleDownloadInspectionPdf = async (inspectionId: string, vehiclePlate?: string) => {
    setIsDownloadingPdf(true);
    try {
      toast.info('Baixando PDF oficial do Laudo Técnico...');
      const blob = await api.inspections.downloadPdfBlob(inspectionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laudo_Vistoria_${vehiclePlate || 'Veiculo'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Laudo Técnico em PDF baixado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao baixar PDF do laudo: ' + (err.message || ''));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleOpenVcrReport = (inspection: any) => {
    setActiveInspectionForReport(inspection);
    setIsVcrModalOpen(true);
  };

  // Transição de Status
  const handleTransition = async (orderId: string, nextStatus: WorkOrderStatusType) => {
    try {
      await api.workOrders.updateStatus(orderId, nextStatus);
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
      toast.success('Status da OS atualizado com sucesso!');
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: nextStatus });
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status da OS.');
    }
  };

  // Registro de Pagamento
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const amountVal = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.warning('Informe um valor de pagamento válido.');
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
      toast.success('Pagamento registrado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pagamento.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-[#0E1116]">
      {/* Header OS Canônico Rebrand */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0E1116] tracking-tight">
            Ordens de serviço
          </h1>
          <p className="text-sm text-[#5B6674] mt-0.5">
            Gestão do ciclo operacional automotivo: orçamentos, execução técnica, pagamentos e garantia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="carx-pill !h-12 !px-4 hover:bg-white"
            title="Atualizar"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={() => navigate('/ordens/nova')}
            className="carx-btn-volt"
          >
            <Plus size={18} />
            <span>Nova OS</span>
          </button>
        </div>
      </div>

      {/* Cards de Status (KPIs Brancos Rebrand) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'CHECKED_IN' ? 'TODOS' : 'CHECKED_IN')}
          className={`carx-card p-5 cursor-pointer transition-all ${
            selectedStatus === 'CHECKED_IN' ? 'border-[#0E1116] shadow-sm' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Aguardando Início</span>
            <Clock size={16} className="text-[#5B6674]" />
          </div>
          <h3 className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] mt-2">{stats.aguardando}</h3>
          <span className="text-xs text-[#5B6674]">Aprovadas / No Pátio</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'IN_PROGRESS' ? 'TODOS' : 'IN_PROGRESS')}
          className={`carx-card p-5 cursor-pointer transition-all ${
            selectedStatus === 'IN_PROGRESS' ? 'border-2 border-[#C8F52E] shadow-sm' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0E1116]">Em Execução</span>
            <TrendingUp size={16} className="text-[#0E1116]" />
          </div>
          <h3 className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] mt-2">{stats.executando}</h3>
          <span className="text-xs text-[#5B6674]">Trabalho nos Boxes</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'QA' ? 'TODOS' : 'QA')}
          className={`carx-card p-5 cursor-pointer transition-all ${
            selectedStatus === 'QA' ? 'border-[#0E1116] shadow-sm' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Vistoria & Prontos</span>
            <CheckCircle2 size={16} className="text-[#0E1116]" />
          </div>
          <h3 className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] mt-2">{stats.concluidas}</h3>
          <span className="text-xs text-[#5B6674]">Aguardando Retirada</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'DELIVERED' ? 'TODOS' : 'DELIVERED')}
          className={`carx-card p-5 cursor-pointer transition-all ${
            selectedStatus === 'DELIVERED' ? 'border-[#0E1116] shadow-sm' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B6674]">Entregues</span>
            <ShieldCheck size={16} className="text-[#0E1116]" />
          </div>
          <h3 className="font-display text-2xl lg:text-3xl font-bold text-[#0E1116] mt-2">{stats.entregues}</h3>
          <span className="text-xs text-[#5B6674]">Garantia Ativa</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6674]" size={16} />
          <input
            type="text"
            placeholder="Buscar por placa, cliente ou número..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 pl-10 pr-4 bg-white border border-[#E1E6EC] rounded-xl text-xs text-[#0E1116] placeholder:text-[#5B6674] focus:outline-none focus:border-[#0E1116]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          {[
            { key: 'TODOS', label: 'Todos os Status' },
            { key: 'QUOTE', label: 'Orçamentos' },
            { key: 'APPROVED', label: 'Aprovadas' },
            { key: 'IN_PROGRESS', label: 'Em Execução' },
            { key: 'QA', label: 'Controle QA' },
            { key: 'READY', label: 'Prontos' },
            { key: 'DELIVERED', label: 'Entregues' },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => {
                setSelectedStatus(st.key);
                setPage(1);
              }}
              className={`h-10 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === st.key
                  ? 'bg-[#0E1116] text-white shadow-sm'
                  : 'bg-white border border-[#E1E6EC] text-[#5B6674] hover:text-[#0E1116]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Ordens de Serviço */}
      <div className="bg-white border border-[#E1E6EC] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F3F5F7] text-[#5B6674] uppercase tracking-wider border-b border-[#E1E6EC] font-semibold">
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
                      className="hover:bg-[#F3F5F7] cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0E1116]">
                        #{os.osNumber}
                        <span className="block text-[10px] text-[#5B6674] font-normal">
                          {formatDateBR(os.createdAt)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0E1116]">
                          {getVehicleDisplay(os.vehicle)}
                        </div>
                        <span className="text-[11px] text-[#0E1116] font-mono font-bold tracking-wider">
                          {os.vehicle?.plate || 'SEM PLACA'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#0E1116]">
                        <div className="font-medium">{os.customer?.name}</div>
                        <span className="text-[11px] text-[#5B6674] font-mono">{os.customer?.phone}</span>
                      </td>

                      <td className="py-3.5 px-4">{getStatusBadge(os.status)}</td>

                      <td className="py-3.5 px-4 text-[#5B6674]">
                        {os.technician?.name || <span className="text-[#5B6674]/50 italic">Não alocado</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-center gap-1 w-24 mx-auto">
                          <span className="text-[10px] font-mono text-[#5B6674] font-bold">
                            {os.progress !== undefined && os.progress !== null ? os.progress : (os.progresso || 0)}%
                          </span>
                          <div className="w-full h-1.5 bg-[#F3F5F7] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#C8F52E] transition-all duration-300"
                              style={{ width: `${os.progress !== undefined && os.progress !== null ? os.progress : (os.progresso || 0)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-[#0E1116]">
                          {formatBRL(os.finalCents || os.totalCents, true)}
                        </div>
                        {balanceCents > 0 ? (
                          <span className="text-[10px] text-[#E5484D] block">
                            Falta {formatBRL(balanceCents, true)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#0E1116] font-bold block">Pago Total</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(os)}
                            className="p-1.5 text-[#5B6674] hover:text-[#0E1116] hover:bg-[#F3F5F7] rounded-lg transition-colors"
                            title="Ver Detalhes e Laudo"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => setSelectedOrder(os)}
                            className="p-1.5 text-[#5B6674] hover:text-[#0E1116] hover:bg-[#F3F5F7] rounded-lg transition-colors"
                            title="Laudo Técnico & Checklist (VCR)"
                          >
                            <ClipboardCheck size={16} />
                          </button>

                          <button
                            onClick={() => handleOpenWhatsAppModal(os)}
                            className="p-1.5 text-[#10B981] hover:bg-[#10B981]/15 rounded-lg transition-colors"
                            title="Notificar Cliente via WhatsApp"
                          >
                            <MessageSquare size={16} />
                          </button>

                          {String(os.status).toUpperCase() === 'QA' && (
                            <button
                              onClick={() => handleOpenQaModal(os)}
                              className="px-2.5 py-1.5 text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-all font-bold flex items-center gap-1.5 shadow-sm text-xs cursor-pointer"
                              title="Realizar Inspeção de Qualidade (QA) para Liberação do Veículo"
                            >
                              <ClipboardCheck size={14} />
                              <span>Vistoria QA</span>
                            </button>
                          )}

                          {String(os.status).toUpperCase() === 'READY' && (
                            <button
                              onClick={() => handleOpenDeliveryModal(os)}
                              className="px-2.5 py-1.5 text-[#0E1116] bg-[#C8F52E] hover:brightness-105 rounded-lg transition-all font-bold flex items-center gap-1.5 shadow-sm text-xs cursor-pointer border border-[#0E1116]/10"
                              title="Realizar Entrega Técnica do Veículo e Emitir Certificado de Garantia"
                            >
                              <KeyRound size={14} className="text-[#0E1116]" />
                              <span>Entregar Carro</span>
                            </button>
                          )}

                          {['DELIVERED', 'COMPLETED', 'CONCLUIDO'].includes(String(os.status).toUpperCase()) && (
                            <button
                              onClick={() => handleOpenCertificadoModal(os)}
                              className="px-2.5 py-1.5 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-all font-bold flex items-center gap-1.5 text-xs shadow-sm cursor-pointer"
                              title="Visualizar / Imprimir Certificado de Garantia Digital"
                            >
                              <Award size={14} className="text-emerald-700" />
                              <span>Garantia</span>
                            </button>
                          )}

                          {balanceCents > 0 && (
                            <button
                              onClick={() => handleOpenPaymentModal(os)}
                              className="px-2 py-1.5 text-[#0E1116] bg-[#C8F52E] hover:brightness-105 rounded-lg transition-all font-bold flex items-center gap-1 shadow-sm text-xs"
                              title="Receber Pagamento no Caixa (Pix Dinâmico, Cartão ou Dinheiro)"
                            >
                              <DollarSign size={14} />
                              <span>Receber</span>
                            </button>
                          )}

                          {os.status === 'APPROVED' && (
                            <button
                              onClick={() => handleTransition(os.id, 'CHECKED_IN')}
                              className="p-1.5 text-[#0E1116] bg-[#C8F52E] hover:brightness-105 rounded-lg transition-colors"
                              title="Realizar Check-in no Pátio"
                            >
                              <Play size={16} />
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
          <div className="p-4 bg-[#F3F5F7] border-t border-[#E1E6EC] flex items-center justify-between text-xs text-[#5B6674]">
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
      </div>

      {/* Modal Wizard: Nova OS e Orçamento */}
      <NovoOrcamentoModal
        isOpen={isNovoModalOpen}
        onClose={() => setIsNovoModalOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
        }}
      />

      {/* Modal de Pagamento Rápido com Pix Integrado (T6.3) */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-[#0E1116]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E1E6EC] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            {/* Cabeçalho */}
            <div className="px-6 py-5 border-b border-[#E1E6EC] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold text-[#0E1116]">
                    Caixa & Recebimento
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#E1E6EC] text-[#0E1116]">
                    OS #{selectedOrder.osNumber}
                  </span>
                </div>
                <p className="text-xs text-[#5B6674] mt-0.5">
                  {selectedOrder.customer?.name} · {selectedOrder.vehicle ? `${getVehicleDisplay(selectedOrder.vehicle)} (${selectedOrder.vehicle.plate})` : ''}
                </p>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="text-[#5B6674] hover:text-[#0E1116] p-1.5 rounded-lg hover:bg-[#E1E6EC] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Resumo de Valores */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E1E6EC] text-xs">
                <div>
                  <span className="text-[#5B6674] block">Total OS</span>
                  <span className="font-bold text-[#0E1116] text-sm font-mono">
                    {formatBRL(selectedOrder.finalCents || selectedOrder.totalCents, true)}
                  </span>
                </div>
                <div>
                  <span className="text-[#5B6674] block">Já Pago</span>
                  <span className="font-bold text-[#10B981] text-sm font-mono">
                    {formatBRL(selectedOrder.paidCents || 0, true)}
                  </span>
                </div>
                <div>
                  <span className="text-[#5B6674] block">Saldo Restante</span>
                  <span className="font-bold text-[#E5484D] text-sm font-mono">
                    {formatBRL(Math.max(0, (selectedOrder.finalCents || selectedOrder.totalCents || 0) - (selectedOrder.paidCents || 0)), true)}
                  </span>
                </div>
              </div>

              {/* Seletor de Método de Pagamento */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'pix', label: 'Pix Dinâmico', icon: QrCode },
                  { id: 'credit_card', label: 'Crédito', icon: CreditCard },
                  { id: 'debit_card', label: 'Débito', icon: CreditCard },
                  { id: 'cash', label: 'Dinheiro', icon: Banknote },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(m.id);
                        if (m.id !== 'pix') setPixCharge(null);
                      }}
                      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-[#C8F52E]/15 border-[#0E1116] text-[#0E1116] shadow-sm'
                          : 'bg-white border-[#E1E6EC] text-[#5B6674] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <Icon size={18} className={isSelected ? 'text-[#0E1116]' : 'text-[#5B6674]'} />
                      <span className="mt-1">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* FLUXO PIX DINÂMICO BACEN (T6.3) */}
              {paymentMethod === 'pix' ? (
                <div className="space-y-4">
                  {pixSettled ? (
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                      <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                        <Check size={28} />
                      </div>
                      <div>
                        <h4 className="font-display text-lg font-bold text-emerald-900">
                          Pagamento Pix Confirmado!
                        </h4>
                        <p className="text-xs text-emerald-700 mt-1">
                          A ordem de serviço foi atualizada instantaneamente e o saldo foi liquidado no caixa.
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleClosePaymentModal}
                          className="carx-btn-volt w-full justify-center !h-11"
                        >
                          Concluir e Fechar
                        </button>
                      </div>
                    </div>
                  ) : pixCharge ? (
                    <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E1E6EC] space-y-4 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        Aguardando leitura do cliente...
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-[#E1E6EC] inline-block shadow-sm">
                        <img
                          src={pixCharge.pixQrBase64}
                          alt="QR Code Pix"
                          className="w-48 h-48 mx-auto object-contain"
                        />
                      </div>

                      <div>
                        <span className="text-xs text-[#5B6674] block">Valor a pagar</span>
                        <span className="font-display text-2xl font-black text-[#0E1116]">
                          {formatBRL(pixCharge.amountCents, true)}
                        </span>
                      </div>

                      {/* Copia e Cola */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={pixCharge.pixCode}
                          className="flex-1 h-10 px-3 bg-white border border-[#E1E6EC] rounded-lg text-xs font-mono text-[#5B6674] truncate select-all"
                        />
                        <button
                          type="button"
                          onClick={handleCopyPixCode}
                          className="h-10 px-3 carx-pill !bg-white hover:!bg-[#E1E6EC] text-xs font-semibold flex items-center gap-1.5"
                        >
                          {pixCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{pixCopied ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>

                      {/* Ações de Teste e Troca */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#E1E6EC]">
                        <button
                          type="button"
                          onClick={() => setPixCharge(null)}
                          className="text-xs text-[#5B6674] hover:text-[#0E1116] underline"
                        >
                          Alterar valor da cobrança
                        </button>

                        <button
                          type="button"
                          disabled={isSimulatingPix}
                          onClick={handleSimulatePixWebhook}
                          className="text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                          title="Simula a confirmação via webhook bancário instantâneo"
                        >
                          <CheckCircle2 size={13} />
                          <span>{isSimulatingPix ? 'Confirmando...' : 'Simular Baixa Bancária'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[#5B6674]">
                          Valor da Cobrança Pix (R$)
                        </label>
                        <input
                          type="text"
                          required
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0,00"
                          className="w-full h-12 px-4 rounded-xl bg-white border border-[#E1E6EC] text-[#0E1116] font-display font-bold text-lg focus:outline-none focus:border-[#0E1116]"
                        />
                        <span className="text-[11px] text-[#5B6674]">
                          Gera QR Code dinâmico do Banco Central para recebimento no caixa ou balcão.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleGeneratePix}
                        disabled={isGeneratingPix}
                        className="carx-btn-volt w-full justify-center !h-12 !text-sm"
                      >
                        <QrCode size={18} />
                        <span>{isGeneratingPix ? 'Gerando QR Code...' : 'Gerar QR Code Pix Dinâmico'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* OUTROS MÉTODOS DE PAGAMENTO (CARTÃO / DINHEIRO) */
                <form onSubmit={handleRegisterPayment} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#5B6674]">
                      Valor a Pagar (R$) *
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full h-12 px-4 rounded-xl bg-white border border-[#E1E6EC] text-[#0E1116] font-display font-bold text-lg focus:outline-none focus:border-[#0E1116]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleClosePaymentModal}
                      className="carx-pill !h-11 !px-4"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingPayment}
                      className="carx-btn-volt !h-11 !px-6"
                    >
                      {isSubmittingPayment ? 'Registrando...' : 'Confirmar Pagamento'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Ordem Selecionada */}
      {selectedOrder && !isPaymentModalOpen && !isWhatsAppModalOpen && (
        <div className="fixed inset-0 bg-[#0E1116]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E1E6EC] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#F8FAFC] border-b border-[#E1E6EC] flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[#0E1116]">
                  Ordem de Serviço #{selectedOrder.osNumber}
                </h3>
                <span className="text-xs text-[#5B6674] font-mono">
                  {selectedOrder.trackingToken ? `Token: ${selectedOrder.trackingToken.slice(0, 8)}...` : ''}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-[#5B6674] hover:text-[#0E1116] p-1.5 rounded-lg hover:bg-[#E1E6EC] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#5B6674]">Status Operacional</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {selectedOrder.status === 'QA' && (
                <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <ClipboardCheck size={18} />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-[#0E1116]">Aguardando Vistoria de Qualidade (QA)</h5>
                      <p className="text-[11px] text-[#5B6674]">Serviço finalizado pelo técnico. Realize a auditoria para liberar o carro.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenQaModal(selectedOrder)}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all text-xs cursor-pointer whitespace-nowrap"
                  >
                    <ClipboardCheck size={14} />
                    <span>Iniciar QA</span>
                  </button>
                </div>
              )}

              {selectedOrder.status === 'READY' && (
                <div className="bg-[#C8F52E]/15 border border-[#C8F52E]/40 p-3.5 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#C8F52E] text-[#0E1116] flex items-center justify-center shrink-0 shadow-sm font-bold">
                      <KeyRound size={18} />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-[#0E1116]">Veículo Pronto para Devolução</h5>
                      <p className="text-[11px] text-[#5B6674]">Vistoria técnica aprovada. Realize a entrega técnica e emita o certificado de garantia.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDeliveryModal(selectedOrder)}
                    className="px-3.5 py-2 bg-[#0E1116] hover:bg-black text-[#C8F52E] font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all text-xs cursor-pointer whitespace-nowrap font-['Space_Grotesk']"
                  >
                    <KeyRound size={14} />
                    <span>Entregar Carro</span>
                  </button>
                </div>
              )}

              {(selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'COMPLETED') && (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Award size={18} />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-emerald-950">Veículo Entregue & Garantia Ativa</h5>
                      <p className="text-[11px] text-emerald-700">Entrega finalizada com sucesso. Certificado digital emitido.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCertificadoModal(selectedOrder)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all text-xs cursor-pointer whitespace-nowrap"
                  >
                    <Award size={14} />
                    <span>Ver Certificado</span>
                  </button>
                </div>
              )}

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E1E6EC] space-y-2">
                <div className="flex items-center gap-3">
                  <Car size={18} className="text-[#0E1116]" />
                  <div>
                    <h5 className="font-bold text-sm text-[#0E1116]">
                      {getVehicleDisplay(selectedOrder.vehicle)}
                    </h5>
                    <span className="text-[#5B6674] font-mono">{selectedOrder.vehicle?.plate}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E1E6EC] flex items-center gap-3">
                  <User size={18} className="text-[#5B6674]" />
                  <div>
                    <span className="font-medium text-[#0E1116]">{selectedOrder.customer?.name}</span>
                    <span className="text-[#5B6674] block font-mono">{selectedOrder.customer?.phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E1E6EC] space-y-2">
                <div className="flex justify-between text-[#5B6674]">
                  <span>Valor Total da OS</span>
                  <span className="font-bold text-[#0E1116] font-mono">
                    {formatBRL(selectedOrder.finalCents || selectedOrder.totalCents, true)}
                  </span>
                </div>
                <div className="flex justify-between text-[#5B6674]">
                  <span>Valor Já Pago</span>
                  <span className="font-bold text-[#10B981] font-mono">
                    {formatBRL(selectedOrder.paidCents || 0, true)}
                  </span>
                </div>
                <div className="flex justify-between text-[#E5484D] pt-1 border-t border-[#E1E6EC]">
                  <span>Saldo a Pagar</span>
                  <span className="font-bold font-mono">
                    {formatBRL(Math.max(0, (selectedOrder.finalCents || selectedOrder.totalCents || 0) - (selectedOrder.paidCents || 0)), true)}
                  </span>
                </div>
              </div>

              {/* Módulo de Laudo Técnico & Checklist de Entrada (VCR) */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E1E6EC] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={16} className="text-[#0E1116]" />
                    <span className="font-bold text-[#0E1116] text-xs">
                      Laudo Técnico & Checklist de Entrada
                    </span>
                  </div>
                  {inspectionsList.length > 0 && (
                    <Badge variant="volt">
                      {inspectionsList[0].status === 'signed'
                        ? 'Laudo Assinado'
                        : inspectionsList[0].status === 'completed'
                        ? 'Concluído'
                        : 'Vistoriado'}
                    </Badge>
                  )}
                </div>

                {loadingInspections ? (
                  <div className="py-2 text-center text-xs text-[#5B6674]">
                    <Clock size={14} className="inline mr-1.5 animate-spin" />
                    Carregando laudo técnico...
                  </div>
                ) : inspectionsList.length > 0 ? (
                  (() => {
                    const currentInsp = inspectionsList[0];
                    const totalDamage = currentInsp.damagePoints?.length || 0;
                    return (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-[#E1E6EC]">
                          <div>
                            <span className="text-[#5B6674] block text-[11px]">Km Registrado</span>
                            <span className="font-mono font-bold text-[#0E1116]">
                              {currentInsp.currentKm ? `${Number(currentInsp.currentKm).toLocaleString('pt-BR')} km` : '--'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#5B6674] block text-[11px]">Combustível</span>
                            <span className="font-mono font-bold text-[#0E1116]">
                              {currentInsp.fuelLevel || '--'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#5B6674] block text-[11px]">Avarias Apontadas</span>
                            <span className="font-mono font-bold text-[#0E1116]">
                              {totalDamage > 0 ? (
                                <span className="text-amber-600 font-bold">{totalDamage} avaria(s)</span>
                              ) : (
                                <span className="text-emerald-600 font-bold">Sem avarias</span>
                              )}
                            </span>
                          </div>
                          {currentInsp.customerSignatureName && (
                            <div className="col-span-3 pt-1 border-t border-[#E1E6EC] flex items-center justify-between">
                              <span className="text-[#5B6674] text-[11px]">
                                Assinado digitalmente pelo cliente:
                              </span>
                              <span className="font-bold text-[#0E1116]">
                                {currentInsp.customerSignatureName}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Ações do Laudo */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenVcrReport(currentInsp)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-[#E1E6EC] hover:bg-[#F8FAFC] text-[#0E1116] font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Eye size={13} />
                            Visualizar Laudo
                          </button>
                          <button
                            type="button"
                            disabled={isDownloadingPdf}
                            onClick={() => handleDownloadInspectionPdf(currentInsp.id, selectedOrder.vehicle?.plate)}
                            className="carx-btn-volt !h-8 !px-3 !text-xs inline-flex items-center gap-1.5"
                          >
                            <Download size={13} className={isDownloadingPdf ? 'animate-spin' : ''} />
                            {isDownloadingPdf ? 'Gerando PDF...' : 'Baixar Laudo em PDF'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsChecklistModalOpen(true)}
                            className="px-2.5 py-1.5 rounded-lg text-[#5B6674] hover:text-[#0E1116] hover:bg-[#E1E6EC] font-medium inline-flex items-center gap-1 text-[11px] transition-colors"
                            title="Editar ou refazer o checklist"
                          >
                            <RefreshCw size={12} />
                            Atualizar
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-[#E1E6EC] flex items-center justify-between gap-3">
                    <span className="text-xs text-[#5B6674]">Nenhum checklist de vistoria realizado para esta OS.</span>
                    <button
                      type="button"
                      onClick={() => setIsChecklistModalOpen(true)}
                      className="carx-btn-volt !h-8 !px-3 !text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus size={13} />
                      Realizar Checklist
                    </button>
                  </div>
                )}
              </div>

              {/* Módulo Fiscal (NFS-e) - T6.10 */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E1E6EC] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-[#0E1116]" />
                    <span className="font-bold text-[#0E1116] text-xs">Nota Fiscal Eletrônica (NFS-e)</span>
                  </div>
                  {fiscalInvoice && (
                    <Badge
                      variant={
                        fiscalInvoice.status === 'authorized'
                          ? 'volt'
                          : fiscalInvoice.status === 'processing'
                          ? 'alert'
                          : fiscalInvoice.status === 'error'
                          ? 'error'
                          : 'neutral'
                      }
                    >
                      {fiscalInvoice.status === 'authorized'
                        ? 'Autorizada'
                        : fiscalInvoice.status === 'processing'
                        ? 'Processando'
                        : fiscalInvoice.status === 'error'
                        ? 'Erro de Emissão'
                        : fiscalInvoice.status === 'cancelled'
                        ? 'Cancelada'
                        : fiscalInvoice.status}
                    </Badge>
                  )}
                </div>

                {fiscalFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                      fiscalFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {fiscalFeedback.type === 'success' ? (
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    )}
                    <span>{fiscalFeedback.message}</span>
                  </div>
                )}

                {loadingFiscal ? (
                  <div className="py-2 text-center text-xs text-[#5B6674]">
                    <Clock size={14} className="inline mr-1.5 animate-spin" />
                    Consultando status fiscal na prefeitura...
                  </div>
                ) : fiscalInvoice ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-[#E1E6EC]">
                      <div>
                        <span className="text-[#5B6674] block text-[11px]">Número NFS-e</span>
                        <span className="font-mono font-bold text-[#0E1116]">
                          {fiscalInvoice.invoiceNumber ? `#${fiscalInvoice.invoiceNumber}` : '--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5B6674] block text-[11px]">RPS</span>
                        <span className="font-mono font-bold text-[#0E1116]">
                          #{fiscalInvoice.rpsNumber} (Série {fiscalInvoice.rpsSeries})
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5B6674] block text-[11px]">Base ISS</span>
                        <span className="font-mono font-bold text-[#0E1116]">
                          {formatBRL(fiscalInvoice.grossAmountCents, true)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5B6674] block text-[11px]">Alíquota ISS</span>
                        <span className="font-mono font-bold text-[#0E1116]">
                          {(fiscalInvoice.issRateBasisPoints / 100).toFixed(2)}% ({formatBRL(fiscalInvoice.issAmountCents, true)})
                        </span>
                      </div>
                      {fiscalInvoice.verificationCode && (
                        <div className="col-span-2 pt-1 border-t border-[#E1E6EC]">
                          <span className="text-[#5B6674] block text-[11px]">Cód. Verificação</span>
                          <span className="font-mono text-[#0E1116] break-all">
                            {fiscalInvoice.verificationCode}
                          </span>
                        </div>
                      )}
                    </div>

                    {fiscalInvoice.errorMessage && fiscalInvoice.status === 'error' && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px]">
                        <strong>Retorno da Prefeitura:</strong> {fiscalInvoice.errorMessage}
                      </div>
                    )}

                    {/* Ações da Nota Fiscal */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {fiscalInvoice.pdfUrl && (
                        <a
                          href={fiscalInvoice.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#E1E6EC] hover:bg-[#F8FAFC] text-[#0E1116] font-medium inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Download size={13} />
                          Baixar PDF
                        </a>
                      )}
                      {fiscalInvoice.xmlUrl && (
                        <a
                          href={fiscalInvoice.xmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#E1E6EC] hover:bg-[#F8FAFC] text-[#0E1116] font-medium inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Download size={13} />
                          Baixar XML
                        </a>
                      )}
                      {fiscalInvoice.status === 'authorized' && (
                        <button
                          type="button"
                          onClick={handleOpenCancelModal}
                          className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-medium inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Ban size={13} />
                          Cancelar NFS-e
                        </button>
                      )}
                      {fiscalInvoice.status === 'error' && (
                        <button
                          type="button"
                          disabled={issuingFiscal}
                          onClick={handleIssueFiscal}
                          className="px-3 py-1.5 rounded-lg bg-[#0E1116] text-white hover:bg-[#1E232B] font-medium inline-flex items-center gap-1.5 transition-colors"
                        >
                          <RefreshCw size={13} className={issuingFiscal ? 'animate-spin' : ''} />
                          {issuingFiscal ? 'Reenviando...' : 'Reenviar NFS-e'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-[#E1E6EC] flex items-center justify-between gap-3">
                    <span className="text-xs text-[#5B6674]">Nenhuma NFS-e emitida para esta OS.</span>
                    <button
                      type="button"
                      disabled={issuingFiscal}
                      onClick={handleIssueFiscal}
                      className="carx-btn-volt !h-8 !px-3 !text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <FileText size={13} />
                      {issuingFiscal ? 'Emitindo...' : 'Emitir NFS-e'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border-t border-[#E1E6EC] flex items-center justify-end gap-2">
              {selectedOrder.status === 'QA' && (
                <button
                  type="button"
                  onClick={() => handleOpenQaModal(selectedOrder)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <ClipboardCheck size={14} />
                  Vistoria QA
                </button>
              )}
              {selectedOrder.status === 'READY' && (
                <button
                  type="button"
                  onClick={() => handleOpenDeliveryModal(selectedOrder)}
                  className="px-3.5 py-2 text-xs font-bold text-[#0E1116] bg-[#C8F52E] hover:brightness-105 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm font-['Space_Grotesk']"
                >
                  <KeyRound size={14} />
                  Entregar Carro
                </button>
              )}
              {(selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'COMPLETED') && (
                <button
                  type="button"
                  onClick={() => handleOpenCertificadoModal(selectedOrder)}
                  className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Award size={14} />
                  Certificado de Garantia
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenWhatsAppModal(selectedOrder)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare size={14} />
                Notificar via WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-medium text-[#5B6674] hover:text-[#0E1116] hover:bg-[#E1E6EC] rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notificação Transacional por WhatsApp (T6.4) */}
      {isWhatsAppModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-[#0E1116]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E1E6EC] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            {/* Cabeçalho */}
            <div className="px-6 py-5 border-b border-[#E1E6EC] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#0E1116]">
                    Notificação WhatsApp · OS #{selectedOrder.osNumber}
                  </h3>
                  <p className="text-xs text-[#5B6674]">
                    {selectedOrder.customer?.name} ({selectedOrder.customer?.phone || 'Sem telefone'})
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseWhatsAppModal}
                className="text-[#5B6674] hover:text-[#0E1116] p-1.5 rounded-lg hover:bg-[#E1E6EC] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Info de Gating / Como funciona */}
              <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-[#166534] flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>
                  <strong>Política de Envio:</strong> Lojas no plano Profissional/Premium com WhatsApp conectado enviam automaticamente em segundo plano pelo número da própria oficina. No plano Essencial ou com aparelho desconectado, o CarX gera o link oficial <code>wa.me</code> para envio imediato com 1 clique.
                </span>
              </div>

              {/* Seletor de Evento */}
              <div>
                <label className="block text-xs font-bold text-[#0E1116] mb-1.5">
                  Tipo de Mensagem / Evento
                </label>
                <select
                  value={whatsAppEvent}
                  onChange={(e) => setWhatsAppEvent(e.target.value as WhatsAppTransactionalEventType)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E1E6EC] bg-white text-xs font-medium text-[#0E1116] focus:outline-none focus:border-[#0E1116]"
                >
                  <option value="CHECKED_IN">🚗 Check-in: Veículo Recebido no Pátio</option>
                  <option value="IN_PROGRESS">🔧 Em Execução: Serviços Iniciados</option>
                  <option value="READY">✨ Veículo Pronto: Aguardando Retirada e Saldo</option>
                  <option value="DELIVERED">🌟 Entrega Finalizada: Termo de Garantia Digital</option>
                  <option value="APPOINTMENT_CONFIRMED">📅 Agendamento Confirmado</option>
                </select>
              </div>

              {/* Mensagem Personalizada (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-[#0E1116] mb-1.5">
                  Mensagem Adicional ou Personalizada <span className="text-[#5B6674] font-normal">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={whatsAppCustomMessage}
                  onChange={(e) => setWhatsAppCustomMessage(e.target.value)}
                  placeholder="Deixe em branco para usar o modelo inteligente com dados do veículo e link da proposta..."
                  className="w-full p-3 rounded-xl border border-[#E1E6EC] text-xs font-medium text-[#0E1116] focus:outline-none focus:border-[#0E1116] resize-none"
                />
              </div>

              {/* Feedback de Envio */}
              {whatsAppResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    whatsAppResult.mode === 'gateway'
                      ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
                      : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 size={16} />
                    {whatsAppResult.mode === 'gateway'
                      ? 'Mensagem enviada com sucesso pelo WhatsApp oficial da oficina!'
                      : 'Link manual wa.me gerado!'}
                  </div>

                  {whatsAppResult.warning && (
                    <div className="text-[11px] text-[#854D0E] bg-[#FEF9C3] p-2 rounded-lg border border-[#FDE047]">
                      {whatsAppResult.warning}
                    </div>
                  )}

                  {whatsAppResult.mode === 'manual' && whatsAppResult.whatsappUrl && (
                    <div className="pt-1">
                      <a
                        href={whatsAppResult.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white font-bold hover:bg-[#1EBE5D] transition-colors"
                      >
                        <ExternalLink size={14} />
                        Abrir Conversa no WhatsApp Web
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="p-4 bg-[#F8FAFC] border-t border-[#E1E6EC] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseWhatsAppModal}
                className="px-4 py-2 text-xs font-medium text-[#5B6674] hover:text-[#0E1116] hover:bg-[#E1E6EC] rounded-xl transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={isSendingWhatsApp}
                onClick={handleSendWhatsAppNotification}
                className="carx-btn-volt !h-10 !px-5 flex items-center gap-1.5"
              >
                <Send size={14} />
                {isSendingWhatsApp ? 'Enviando...' : 'Enviar Notificação'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sub-modal de Cancelamento de NFS-e (T6.10) */}
      {isCancelModalOpen && fiscalInvoice && (
        <div className="fixed inset-0 bg-[#0E1116]/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E1E6EC] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E1E6EC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban size={16} className="text-rose-600" />
                <h4 className="font-display text-sm font-bold text-[#0E1116]">
                  Cancelar NFS-e #{fiscalInvoice.invoiceNumber || fiscalInvoice.rpsNumber}
                </h4>
              </div>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-[#5B6674] hover:text-[#0E1116] p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                <strong>Atenção:</strong> O cancelamento é irreversível e será comunicado imediatamente à prefeitura municipal.
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0E1116] mb-1.5">
                  Motivo / Justificativa do Cancelamento <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Informe o motivo detalhado (mínimo de 15 caracteres)..."
                  className="w-full p-3 rounded-xl border border-[#E1E6EC] text-xs font-medium text-[#0E1116] focus:outline-none focus:border-[#0E1116] resize-none"
                />
                <span className="text-[11px] text-[#5B6674] block mt-1">
                  Mínimo de 15 caracteres exigido pelo fisco municipal ({cancelReason.length}/15).
                </span>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border-t border-[#E1E6EC] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#5B6674] hover:text-[#0E1116] rounded-xl"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancellingFiscal || cancelReason.trim().length < 15}
                onClick={handleConfirmCancelFiscal}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {cancellingFiscal ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Laudo Técnico Completo (VCR) */}
      {isVcrModalOpen && activeInspectionForReport && selectedOrder && (
        <VcrReportModal
          isOpen={isVcrModalOpen}
          onClose={() => {
            setIsVcrModalOpen(false);
            setActiveInspectionForReport(null);
          }}
          osData={selectedOrder}
          points={activeInspectionForReport.damagePoints || []}
          generalNotes={activeInspectionForReport.notes || ''}
          km={activeInspectionForReport.currentKm}
          fuelLevel={activeInspectionForReport.fuelLevel}
          signature={activeInspectionForReport.customerSignatureUrl}
        />
      )}

      {/* Modal Interativo de Checklist e Desenho Visual */}
      {isChecklistModalOpen && selectedOrder && (
        <CarVisualChecklist
          osData={selectedOrder}
          onClose={() => {
            setIsChecklistModalOpen(false);
            api.inspections
              .getByWorkOrder(selectedOrder.id)
              .then((res: any) => {
                const list = Array.isArray(res) ? res : res?.inspections || [];
                setInspectionsList(list);
              })
              .catch(() => {});
          }}
        />
      )}

      {/* Modal de Auditoria e Inspeção de Qualidade (QA) */}
      {isQaModalOpen && qaTargetOrder && (
        <QaChecklistModal
          os={qaTargetOrder}
          isOpen={isQaModalOpen}
          onClose={() => {
            setIsQaModalOpen(false);
            setQaTargetOrder(null);
          }}
          onSuccess={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
            if (selectedOrder?.id === qaTargetOrder?.id) {
              setSelectedOrder({ ...selectedOrder, status: 'READY', progress: 100 });
            }
          }}
        />
      )}

      {/* Modal de Entrega Técnica do Veículo (Item 64) */}
      {isDeliveryModalOpen && deliveryTargetOrder && (
        <ModalEntregaVeiculo
          isOpen={isDeliveryModalOpen}
          os={deliveryTargetOrder}
          onClose={() => {
            setIsDeliveryModalOpen(false);
            setDeliveryTargetOrder(null);
          }}
          onOpenPaymentModal={(order) => {
            handleOpenPaymentModal(order);
          }}
          onSuccess={(deliveredOs) => {
            setIsDeliveryModalOpen(false);
            setDeliveryTargetOrder(null);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
            if (selectedOrder?.id === deliveredOs?.id) {
              setSelectedOrder({ ...selectedOrder, status: 'DELIVERED', progress: 100 });
            }
            // Abre o Certificado de Garantia Digital automaticamente após a entrega
            setCertificadoTargetOrder(deliveredOs);
            setIsCertificadoModalOpen(true);
          }}
        />
      )}

      {/* Modal de Certificado de Garantia Digital (Item 64) */}
      {isCertificadoModalOpen && normalizedForCertificate && (
        <CertificadoGarantia
          os={normalizedForCertificate}
          onClose={() => {
            setIsCertificadoModalOpen(false);
            setCertificadoTargetOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default OrdensServico;

