import React, { useState, useRef, useEffect } from 'react';
import {
  Car,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ShieldCheck,
  FileCheck,
  X,
  Gauge,
  Fuel,
  User,
  PenTool,
  RotateCcw,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import { toast } from '../../utils/toast';

export interface ModalEntregaVeiculoProps {
  isOpen: boolean;
  onClose: () => void;
  os: any;
  onSuccess: (deliveredOrder: any) => void;
  onOpenPaymentModal?: (os: any) => void;
}

export const ModalEntregaVeiculo: React.FC<ModalEntregaVeiculoProps> = ({
  isOpen,
  onClose,
  os,
  onSuccess,
  onOpenPaymentModal,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dados financeiros
  const totalCents = Number(
    os?.finalCents ?? os?.totalCents ?? (os?.valor_total ? Math.round(Number(os.valor_total) * 100) : 0)
  );
  const paidCents = Number(
    os?.paidCents ?? (os?.valor_pago ? Math.round(Number(os.valor_pago) * 100) : 0)
  );
  const balanceCents = Math.max(0, totalCents - paidCents);
  const [allowBilledDelivery, setAllowBilledDelivery] = useState(false);

  // Dados de entrega
  const [finalKm, setFinalKm] = useState<string>('');
  const [fuelLevel, setFuelLevel] = useState<string>('1/2');
  const [deliveredTo, setDeliveredTo] = useState<string>('');
  const [deliveredDocument, setDeliveredDocument] = useState<string>('');
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [emitWarranty, setEmitWarranty] = useState<boolean>(true);
  const [deliveryNotes, setDeliveryNotes] = useState<string>(
    'Veículo inspecionado e entregue ao proprietário em perfeitas condições estéticas e operacionais.'
  );

  // Canvas de assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (os) {
      setDeliveredTo(os.customer?.name || os.cliente_nome || os.cliente || '');
      setDeliveredDocument(os.customer?.document || os.customer?.cpf || '');
      // Se houver km cadastrado na entrada, sugere como ponto de partida
      if (os.km_entrada || os.vehicle?.currentKm) {
        setFinalKm(String(os.km_entrada || os.vehicle?.currentKm || ''));
      }
    }
  }, [os]);

  if (!isOpen || !os) return null;

  // Lógica do Canvas de Assinatura
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.strokeStyle = '#0E1116';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmitDelivery = async () => {
    // 1. Validação Financeira
    if (balanceCents > 0 && !allowBilledDelivery) {
      toast.warning('Existe saldo devedor pendente. Receba no caixa ou marque a autorização a prazo.');
      return;
    }

    // 2. Validação de responsável
    if (!deliveredTo.trim()) {
      toast.warning('Informe o nome da pessoa que está retirando o veículo.');
      return;
    }

    setIsSubmitting(true);
    try {
      let signatureUrl: string | undefined = undefined;
      if (hasSignature && canvasRef.current) {
        signatureUrl = canvasRef.current.toDataURL('image/png');
      }

      // 3. Emite Garantia Digital se solicitado
      if (emitWarranty) {
        try {
          const primaryItem = os.items?.[0] || os.servicos_detalhados?.[0];
          const serviceName =
            primaryItem?.name ||
            primaryItem?.servico ||
            os.service_summary ||
            'Proteção e Estética Automotiva de Alta Performance';

          await api.qa.createWarranty({
            workOrderId: os.id,
            serviceId: primaryItem?.serviceId || null,
            serviceName,
            warrantyMonths: Number(warrantyMonths) || 12,
            notes: deliveryNotes || 'Certificado emitido na entrega técnica presencial do veículo.',
          });
        } catch (wErr: any) {
          console.warn('[ModalEntregaVeiculo] Aviso não impeditivo ao registrar garantia:', wErr);
        }
      }

      // 4. Transição de estado atômica para DELIVERED
      const metadata = {
        deliveredAt: new Date().toISOString(),
        deliveredToName: deliveredTo.trim(),
        deliveredToDocument: deliveredDocument.trim() || undefined,
        odometerFinal: finalKm ? Number(finalKm) : undefined,
        fuelLevelOnDelivery: fuelLevel,
        warrantyMonths: Number(warrantyMonths) || 12,
        hasSignature: Boolean(hasSignature),
        deliverySignatureUrl: signatureUrl,
        balanceAtDeliveryCents: balanceCents,
        wasBilledDelivery: balanceCents > 0 && allowBilledDelivery,
      };

      await api.workOrders.updateStatus(os.id, 'DELIVERED', deliveryNotes, metadata);

      toast.success(`Veículo da OS #${os.osNumber || os.id} entregue com sucesso!`);
      const updatedOs = {
        ...os,
        status: 'DELIVERED',
        delivered_at: new Date().toISOString(),
        deliveredToName: deliveredTo.trim(),
        warrantyMonths: Number(warrantyMonths) || 12,
      };

      onSuccess(updatedOs);
    } catch (err: any) {
      console.error('[ModalEntregaVeiculo] Falha na entrega:', err);
      toast.error(err.message || 'Erro ao confirmar entrega do veículo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const vehiclePlate = os.vehicle?.plate || os.placa || 'Sem Placa';
  const vehicleName = os.vehicle
    ? `${os.vehicle.brand || ''} ${os.vehicle.model || ''}`.trim()
    : os.veiculo_desc || os.veiculo || 'Veículo';

  return (
    <div className="fixed inset-0 bg-[#0E1116]/75 backdrop-blur-sm z-[150] flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E1E6EC] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-[#E1E6EC] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C8F52E] text-[#0E1116] flex items-center justify-center shadow-sm">
              <KeyRound size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Space_Grotesk'] text-base md:text-lg font-bold text-[#0E1116]">
                  Entrega Técnica & Devolução do Veículo
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C8F52E]/30 text-[#0E1116] border border-[#0E1116]/20">
                  OS #{os.osNumber || os.id}
                </span>
              </div>
              <p className="text-xs text-[#5B6674] mt-0.5">
                {vehicleName} · Placa <strong className="font-mono text-[#0E1116]">{vehiclePlate}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5B6674] hover:text-[#0E1116] p-2 rounded-xl hover:bg-[#E1E6EC] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#0E1116]">
          {/* 1. SEÇÃO FINANCEIRA: CONFERÊNCIA DE CAIXA */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              balanceCents > 0
                ? 'bg-amber-50/80 border-amber-300'
                : 'bg-emerald-50/80 border-emerald-300'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    balanceCents > 0
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-emerald-600 text-white shadow-sm'
                  }`}
                >
                  {balanceCents > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                </div>
                <div>
                  <h4
                    className={`text-sm font-bold font-['Space_Grotesk'] ${
                      balanceCents > 0 ? 'text-amber-950' : 'text-emerald-950'
                    }`}
                  >
                    {balanceCents > 0 ? 'Saldo Devedor Pendente' : 'Pagamento 100% Quitado'}
                  </h4>
                  <p className="text-xs text-[#5B6674] mt-0.5">
                    Total: <strong>R$ {(totalCents / 100).toFixed(2).replace('.', ',')}</strong> · Pago:{' '}
                    <strong>R$ {(paidCents / 100).toFixed(2).replace('.', ',')}</strong>
                  </p>
                  {balanceCents > 0 && (
                    <p className="text-sm font-bold text-amber-900 mt-1">
                      Falta Pagar: R$ {(balanceCents / 100).toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>
              </div>

              {/* Botão de Pagamento se houver saldo */}
              {balanceCents > 0 && onOpenPaymentModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPaymentModal(os);
                  }}
                  className="px-3.5 py-2 bg-[#0E1116] hover:bg-black text-[#C8F52E] font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer text-xs"
                >
                  <DollarSign size={14} />
                  <span>Receber no Caixa</span>
                </button>
              )}
            </div>

            {/* Checkbox de liberação faturada se houver saldo devedor */}
            {balanceCents > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowBilled"
                  checked={allowBilledDelivery}
                  onChange={(e) => setAllowBilledDelivery(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0E1116] accent-[#0E1116] cursor-pointer"
                />
                <label htmlFor="allowBilled" className="text-xs text-amber-950 font-medium cursor-pointer">
                  Autorizar liberação do veículo com <strong>faturamento a prazo / convênio</strong> acordado com o cliente.
                </label>
              </div>
            )}
          </div>

          {/* 2. DADOS DE SAÍDA DO VEÍCULO (HODÔMETRO E COMBUSTÍVEL) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E1E6EC] space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#0E1116]">
                <Gauge size={14} className="text-[#5B6674]" />
                Km de Devolução (Hodômetro Final)
              </label>
              <input
                type="number"
                placeholder="Ex: 58240"
                value={finalKm}
                onChange={(e) => setFinalKm(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E1E6EC] bg-white text-xs font-semibold text-[#0E1116] focus:outline-none focus:border-[#0E1116]"
              />
              <span className="text-[10px] text-[#5B6674] block">
                Comprova que o veículo não rodou fora dos testes autorizados da oficina.
              </span>
            </div>

            <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E1E6EC] space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#0E1116]">
                <Fuel size={14} className="text-[#5B6674]" />
                Nível de Combustível na Retirada
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {['Reserva', '1/4', '1/2', '3/4', 'Cheio'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFuelLevel(level)}
                    className={`h-9 rounded-xl text-[11px] font-bold transition-all border ${
                      fuelLevel === level
                        ? 'bg-[#0E1116] text-[#C8F52E] border-[#0E1116] shadow-sm'
                        : 'bg-white text-[#5B6674] border-[#E1E6EC] hover:bg-[#F3F5F7]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-[#5B6674] block">
                Nível conferido: <strong>{fuelLevel}</strong>
              </span>
            </div>
          </div>

          {/* 3. DADOS DE QUEM ESTÁ RETIRANDO */}
          <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E1E6EC] space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#5B6674] flex items-center gap-1.5">
              <User size={14} /> Responsável pela Retirada do Veículo
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#0E1116] mb-1">
                  Nome Completo <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={deliveredTo}
                  onChange={(e) => setDeliveredTo(e.target.value)}
                  placeholder="Nome do cliente ou portador autorizado"
                  className="w-full h-10 px-3 rounded-xl border border-[#E1E6EC] bg-white text-xs font-semibold text-[#0E1116] focus:outline-none focus:border-[#0E1116]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#0E1116] mb-1">
                  CPF / RG do Retirante
                </label>
                <input
                  type="text"
                  value={deliveredDocument}
                  onChange={(e) => setDeliveredDocument(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full h-10 px-3 rounded-xl border border-[#E1E6EC] bg-white text-xs font-semibold text-[#0E1116] focus:outline-none focus:border-[#0E1116]"
                />
              </div>
            </div>
          </div>

          {/* 4. GARANTIA DIGITAL & PASSAPORTE */}
          <div className="bg-[#F0FDF4] p-4 rounded-2xl border border-[#BBF7D0] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-emerald-950 font-['Space_Grotesk']">
                    Certificado de Garantia Digital & Passaporte
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Gera QR Code antifraude e registro nacional do serviço executado.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emitWarranty}
                onChange={(e) => setEmitWarranty(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
              />
            </div>

            {emitWarranty && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    Prazo da Garantia
                  </label>
                  <select
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-[#0E1116] focus:outline-none focus:border-emerald-600"
                  >
                    <option value={3}>3 Meses (Legal)</option>
                    <option value={6}>6 Meses</option>
                    <option value={12}>12 Meses (1 Ano - Padrão)</option>
                    <option value={24}>24 Meses (2 Anos)</option>
                    <option value={36}>36 Meses (3 Anos)</option>
                    <option value={60}>60 Meses (5 Anos - PPF Premium)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    Recomendações e Observações de Cuidados
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Ex: Não lavar nas primeiras 48h; evitar produtos químicos fortes..."
                    className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-medium text-[#0E1116] focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. ASSINATURA DIGITAL DO CLIENTE */}
          <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E1E6EC] space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#0E1116]">
                <PenTool size={14} className="text-[#5B6674]" />
                Assinatura de Retirada do Cliente / Portador
              </label>
              {hasSignature && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Limpar
                </button>
              )}
            </div>
            <div className="border border-[#CBD5E1] rounded-xl bg-white overflow-hidden shadow-inner relative">
              <canvas
                ref={canvasRef}
                width={600}
                height={130}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[120px] touch-none cursor-crosshair block"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-[#94A3B8] font-medium">
                  Assine aqui usando o dedo ou mouse
                </div>
              )}
            </div>
            <p className="text-[10px] text-[#5B6674]">
              Ao confirmar a entrega, o termo de quitação e o certificado de garantia digital são registrados no sistema com data e hora.
            </p>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E1E6EC] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-[#5B6674] hover:text-[#0E1116] hover:bg-[#E1E6EC] rounded-xl transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={isSubmitting || (!deliveredTo.trim()) || (balanceCents > 0 && !allowBilledDelivery)}
            onClick={handleSubmitDelivery}
            className="px-6 py-2.5 text-xs font-bold text-[#0E1116] bg-[#C8F52E] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer font-['Space_Grotesk']"
          >
            {isSubmitting ? (
              <span>Finalizando Entrega...</span>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Confirmar Entrega & Emitir Garantia</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEntregaVeiculo;
