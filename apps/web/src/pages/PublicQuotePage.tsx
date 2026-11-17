import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  FileText,
  Clock,
  Car,
  QrCode,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  X,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { copyToClipboard } from '../utils/clipboard';

interface PublicQuoteData {
  trackingToken: string;
  osNumber: number;
  status: string;
  tenant: {
    id: string;
    name: string;
    tradeName?: string | null;
    document?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
    whatsappNumber?: string | null;
  };
  customer: {
    name: string;
    phoneMasked?: string | null;
  };
  vehicle: {
    brand: string;
    model: string;
    plate: string;
    year?: number | null;
    color?: string | null;
    sizeCategory?: string | null;
  };
  items: Array<{
    name: string;
    category?: string | null;
    quantity: number;
    unitPriceCents: number;
    discountCents: number;
    finalCents: number;
    estimatedMinutes?: number;
    warrantyMonths?: number;
  }>;
  totalCents: number;
  discountCents: number;
  finalCents: number;
  depositRequiredCents: number;
  depositPaidCents: number;
  depositPixCode?: string | null;
  depositPixQrBase64?: string | null;
  depositPaidAt?: string | null;
  acceptedAt?: string | null;
  acceptedSignatureName?: string | null;
  publicNotes?: string | null;
  photos?: Array<{
    url: string;
    phase: string;
    notes?: string | null;
  }>;
  createdAt: string;
}

export const PublicQuotePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [quote, setQuote] = useState<PublicQuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State do Aceite Online
  const [signatureName, setSignatureName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Modal / Confirmação de Pix
  const [copiedPix, setCopiedPix] = useState(false);
  const [isConfirmingPix, setIsConfirmingPix] = useState(false);
  const [pixSuccessMsg, setPixSuccessMsg] = useState<string | null>(null);

  // Modal de Recusa
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const fetchQuote = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/public/quotes/${token}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Orçamento não encontrado ou link expirado.');
      }
      const data: PublicQuoteData = await res.json();
      setQuote(data);
      if (data.acceptedSignatureName) {
        setSignatureName(data.acceptedSignatureName);
        setTermsAccepted(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar proposta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim() || signatureName.trim().length < 3) {
      setAcceptError('Por favor digite seu nome completo para assinar formalmente.');
      return;
    }
    if (!termsAccepted) {
      setAcceptError('Você precisa concordar com os termos para aprovar.');
      return;
    }

    setIsSubmittingAccept(true);
    setAcceptError(null);

    try {
      const res = await fetch(`/api/public/quotes/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureName: signatureName.trim(),
          termsAccepted: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Erro ao aprovar proposta.');
      }

      await fetchQuote();
    } catch (err: any) {
      setAcceptError(err.message || 'Falha na aprovação da proposta.');
    } finally {
      setIsSubmittingAccept(false);
    }
  };

  const handleCopyPix = async () => {
    if (!quote?.depositPixCode) return;
    await copyToClipboard(quote.depositPixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleConfirmPix = async () => {
    if (!token) return;
    setIsConfirmingPix(true);
    try {
      const res = await fetch(`/api/public/quotes/${token}/pix-confirm`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Não foi possível confirmar o Pix.');
      }
      setPixSuccessMsg(json.message || 'Sinal Pix confirmado com sucesso!');
      await fetchQuote();
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar Pix.');
    } finally {
      setIsConfirmingPix(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmittingReject(true);
    try {
      const res = await fetch(`/api/public/quotes/${token}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || 'Erro ao recusar proposta.');
      }
      setIsRejectModalOpen(false);
      await fetchQuote();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar proposta.');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F3F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #E1E6EC', borderTopColor: '#C8F52E', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#5B6674', fontSize: '15px', fontWeight: 600 }}>Carregando orçamento oficial...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div style={{ minHeight: '100vh', background: '#F3F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: '#fff', borderRadius: '24px', padding: '36px', textAlign: 'center', border: '1px solid #E1E6EC', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <AlertCircle size={48} color="#E53E3E" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0E1116', marginBottom: '8px' }}>Orçamento Indisponível</h2>
          <p style={{ fontSize: '14px', color: '#5B6674', lineHeight: 1.6, marginBottom: '24px' }}>{error || 'O link pode estar expirado ou o código digitado é inválido.'}</p>
        </div>
      </div>
    );
  }

  const isAccepted = Boolean(quote.acceptedAt);
  const isCanceled = quote.status === 'CANCELED';
  const hasDeposit = quote.depositRequiredCents > 0;
  const isDepositPaid = Boolean(quote.depositPaidAt);
  const formattedTotal = (quote.finalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedSubtotal = (quote.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedDiscount = (quote.discountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedDeposit = (quote.depositRequiredCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const whatsappPhone = quote.tenant.whatsappNumber || quote.tenant.phone || '';
  const cleanWaPhone = whatsappPhone.replace(/\D/g, '');
  const waUrl = cleanWaPhone ? `https://wa.me/55${cleanWaPhone}` : null;

  return (
    <div style={{ minHeight: '100vh', background: '#F3F5F7', fontFamily: 'Inter, sans-serif', color: '#0E1116', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* TOPBAR / BRANDING DA OFICINA */}
        <div style={{ background: '#fff', borderRadius: '24px', padding: '20px 24px', border: '1px solid #E1E6EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {quote.tenant.logoUrl ? (
              <img src={quote.tenant.logoUrl} alt={quote.tenant.name} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#0E1116', color: '#C8F52E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '18px' }}>
                CX
              </div>
            )}
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0E1116', letterSpacing: '-0.3px' }}>
                {quote.tenant.name}
              </div>
              <div style={{ fontSize: '12px', color: '#5B6674', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span>Proposta #{quote.osNumber}</span>
                {quote.tenant.phone && <span>• Tel: {quote.tenant.phone}</span>}
              </div>
            </div>
          </div>

          {/* STATUS PILL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isCanceled ? (
              <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                Cancelado
              </span>
            ) : isAccepted ? (
              <span style={{ background: '#D1FAE5', color: '#065F46', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> Aprovado
              </span>
            ) : (
              <span style={{ background: '#FEF3C7', color: '#92400E', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                Aguardando sua aprovação
              </span>
            )}
          </div>
        </div>

        {/* ALERTA DE STATUS / SUCESSO SE JÁ APROVADO */}
        {isAccepted && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '20px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', color: '#065F46' }}>
            <CheckCircle2 size={24} color="#059669" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Orçamento Aprovado Digitalmente</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                Assinado por <strong>{quote.acceptedSignatureName}</strong> em {new Date(quote.acceptedAt!).toLocaleString('pt-BR')}.
              </div>
            </div>
          </div>
        )}

        {/* DADOS DO VEÍCULO E CLIENTE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* CARD DO VEÍCULO COM PLACA MERCOSUL */}
          <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #E1E6EC' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#5B6674', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Veículo do Atendimento
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* PLACA MERCOSUL */}
              <div style={{ width: '100px', height: '42px', borderRadius: '8px', border: '2px solid #003399', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ background: '#003399', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '7px', fontWeight: 800 }}>
                  BRASIL
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', letterSpacing: '1px', color: '#0E1116' }}>
                  {quote.vehicle.plate || 'ABC1D23'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0E1116' }}>
                  {quote.vehicle.brand} {quote.vehicle.model}
                </div>
                <div style={{ fontSize: '13px', color: '#5B6674', marginTop: '2px' }}>
                  {quote.vehicle.year ? `${quote.vehicle.year} • ` : ''}
                  {quote.vehicle.color ? `${quote.vehicle.color} • ` : ''}
                  Porte {quote.vehicle.sizeCategory || 'Médio'}
                </div>
              </div>
            </div>
          </div>

          {/* CARD DO CLIENTE */}
          <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #E1E6EC' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#5B6674', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Destinatário da Proposta
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0E1116' }}>
              {quote.customer.name}
            </div>
            <div style={{ fontSize: '13px', color: '#5B6674', marginTop: '4px' }}>
              Contato cadastrado: {quote.customer.phoneMasked}
            </div>
            <div style={{ fontSize: '11px', color: '#9AA7B8', marginTop: '6px' }}>
              Dados protegidos com conformidade LGPD.
            </div>
          </div>
        </div>

        {/* TABELA DE SERVIÇOS E ITENS */}
        <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #E1E6EC' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0E1116', marginBottom: '16px' }}>
            Serviços e Materiais Inclusos
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quote.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  background: '#F9FAFB',
                  border: '1px solid #EDF0F4',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0E1116' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#5B6674', marginTop: '2px' }}>
                    {item.quantity > 1 ? `${item.quantity}x ` : ''}
                    {item.category ? `${item.category} ` : ''}
                    {item.warrantyMonths ? `• Garantia de ${item.warrantyMonths} meses` : ''}
                  </div>
                </div>

                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0E1116' }}>
                  {(item.finalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
            ))}
          </div>

          {/* TOTALIZAÇÃO */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #EDF0F4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {quote.discountCents > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#5B6674' }}>
                  <span>Subtotal</span>
                  <span>{formattedSubtotal}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#059669', fontWeight: 600 }}>
                  <span>Desconto Especial</span>
                  <span>- {formattedDiscount}</span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0E1116' }}>Valor Total da Proposta</span>
              <span style={{ fontSize: '26px', fontWeight: 900, color: '#0E1116', letterSpacing: '-0.5px' }}>
                {formattedTotal}
              </span>
            </div>

            {hasDeposit && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', background: '#F4FBF0', border: '1px solid #D8F3CE', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', color: '#276718' }}>
                <span>Sinal Exigido para Agendamento (Pix):</span>
                <span style={{ fontWeight: 800 }}>{formattedDeposit}</span>
              </div>
            )}
          </div>
        </div>

        {/* FOTOS DE ENTRADA / VCR SE HOUVER */}
        {quote.photos && quote.photos.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #E1E6EC' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0E1116', marginBottom: '16px' }}>
              Fotos da Vistoria de Recepção
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {quote.photos.map((p, i) => (
                <div key={i} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #EDF0F4' }}>
                  <img src={p.url} alt={`Inspeção ${i + 1}`} style={{ width: '100%', height: '130px', objectFit: 'cover' }} />
                  {p.notes && <div style={{ padding: '6px 10px', fontSize: '11px', color: '#5B6674', background: '#fff' }}>{p.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONDICIONAL: SE TIVER SINAL PIX EXIGIDO E ESTIVER APROVADO / AGUARDANDO SINAL */}
        {hasDeposit && isAccepted && !isDepositPaid && quote.depositPixCode && (
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', border: '2px solid #C8F52E', boxShadow: '0 4px 20px rgba(200, 245, 46, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <QrCode size={24} color="#0E1116" />
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0E1116' }}>
                Pagamento do Sinal via Pix
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#5B6674', lineHeight: 1.5, marginBottom: '20px' }}>
              Efetue o pagamento do sinal de <strong>{formattedDeposit}</strong> para confirmar a reserva de box e horário na oficina.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              {quote.depositPixQrBase64 && (
                <div style={{ padding: '12px', background: '#fff', border: '1px solid #E1E6EC', borderRadius: '16px' }}>
                  <img src={quote.depositPixQrBase64} alt="QR Code Pix" style={{ width: '200px', height: '200px', display: 'block' }} />
                </div>
              )}

              <div style={{ width: '100%', maxWidth: '480px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#5B6674', marginBottom: '6px' }}>Código Pix Copia e Cola:</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={quote.depositPixCode}
                    style={{ flex: 1, height: '44px', borderRadius: '12px', border: '1px solid #E1E6EC', padding: '0 12px', fontSize: '12px', color: '#0E1116', background: '#F8FAFC' }}
                  />
                  <button
                    onClick={handleCopyPix}
                    style={{ height: '44px', padding: '0 18px', borderRadius: '12px', border: 0, background: copiedPix ? '#059669' : '#0E1116', color: '#fff', font: '700 13px Inter, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedPix ? <Check size={16} /> : <Copy size={16} />}
                    {copiedPix ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <button
                onClick={handleConfirmPix}
                disabled={isConfirmingPix}
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  height: '48px',
                  borderRadius: '14px',
                  border: 0,
                  background: '#C8F52E',
                  color: '#0E1116',
                  font: '800 15px Inter, sans-serif',
                  cursor: isConfirmingPix ? 'not-allowed' : 'pointer',
                  marginTop: '10px',
                }}
              >
                {isConfirmingPix ? 'Verificando liquidação...' : 'Já realizei o pagamento Pix'}
              </button>
            </div>
          </div>
        )}

        {/* FEEDBACK DE SINAL LIQUIDADO */}
        {isDepositPaid && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '20px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', color: '#065F46' }}>
            <CheckCircle2 size={24} color="#059669" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Sinal Pix Confirmado e Liquidado</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                Valor de {formattedDeposit} recebido em {new Date(quote.depositPaidAt!).toLocaleString('pt-BR')}. Veículo confirmado na fila da oficina!
              </div>
            </div>
          </div>
        )}

        {/* TERMO DE ACEITE FORMAL (SE AINDA NÃO APROVADO E NÃO CANCELADO) */}
        {!isAccepted && !isCanceled && (
          <form onSubmit={handleAccept} style={{ background: '#fff', borderRadius: '24px', padding: '28px', border: '1px solid #E1E6EC', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} color="#0E1116" />
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0E1116' }}>
                Termo de Aceite & Autorização de Serviços
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
              Eu, proprietário(a) ou responsável legal pelo veículo {quote.vehicle.brand} {quote.vehicle.model} ({quote.vehicle.plate}), autorizo expressamente a oficina <strong>{quote.tenant.name}</strong> a executar os serviços e instalar os componentes discriminados nesta proposta pelo valor total de <strong>{formattedTotal}</strong>. Declaro estar ciente dos prazos e garantias estabelecidas.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0E1116', marginBottom: '8px' }}>
                Nome Completo (Assinatura Digital) *
              </label>
              <input
                type="text"
                placeholder="Ex: Carlos Alberto da Silva"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                required
                style={{ width: '100%', height: '48px', borderRadius: '14px', border: '1px solid #E1E6EC', padding: '0 16px', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#0E1116', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#C8F52E' }}
              />
              <span>Li e concordo com os valores, serviços e condições da proposta.</span>
            </label>

            {acceptError && (
              <div style={{ color: '#E53E3E', fontSize: '13px', fontWeight: 600 }}>
                {acceptError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={isSubmittingAccept}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  height: '52px',
                  borderRadius: '16px',
                  border: 0,
                  background: '#C8F52E',
                  color: '#0E1116',
                  font: '800 16px Inter, sans-serif',
                  cursor: isSubmittingAccept ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isSubmittingAccept ? 'Validando aceite...' : 'Aprovar Orçamento'}
              </button>

              <button
                type="button"
                onClick={() => setIsRejectModalOpen(true)}
                style={{
                  height: '52px',
                  padding: '0 20px',
                  borderRadius: '16px',
                  border: '1px solid #E1E6EC',
                  background: '#fff',
                  color: '#5B6674',
                  font: '600 14px Inter, sans-serif',
                  cursor: 'pointer',
                }}
              >
                Recusar
              </button>
            </div>
          </form>
        )}

        {/* CONTATO DIRETO VIA WHATSAPP COM A OFICINA */}
        {waUrl && (
          <div style={{ textAlign: 'center', margin: '10px 0 24px' }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#065F46',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '14px',
                padding: '10px 18px',
                borderRadius: '20px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
              }}
            >
              <MessageCircle size={18} />
              Dúvidas sobre o orçamento? Fale conosco no WhatsApp
            </a>
          </div>
        )}

      </div>

      {/* MODAL DE RECUSA DA PROPOSTA */}
      {isRejectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '24px', padding: '28px', border: '1px solid #E1E6EC', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0E1116' }}>Recusar Proposta</div>
              <button onClick={() => setIsRejectModalOpen(false)} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#5B6674' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#5B6674', lineHeight: 1.5, marginBottom: '16px' }}>
              Por favor informe o motivo para que a oficina possa entender e entrar em contato se necessário:
            </p>

            <textarea
              rows={3}
              placeholder="Ex: Gostaria de alterar os serviços / valor acima do esperado"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', borderRadius: '12px', border: '1px solid #E1E6EC', padding: '12px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '18px', fontFamily: 'Inter, sans-serif' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                style={{ flex: 1, height: '44px', borderRadius: '12px', border: '1px solid #E1E6EC', background: '#fff', color: '#5B6674', font: '600 14px Inter, sans-serif', cursor: 'pointer' }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmittingReject}
                style={{ flex: 1, height: '44px', borderRadius: '12px', border: 0, background: '#E53E3E', color: '#fff', font: '700 14px Inter, sans-serif', cursor: 'pointer' }}
              >
                {isSubmittingReject ? 'Cancelando...' : 'Confirmar Recusa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicQuotePage;

