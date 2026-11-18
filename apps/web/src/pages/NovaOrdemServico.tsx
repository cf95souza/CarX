import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { dispatchQuoteNotification, getBudgetMsg } from '../utils/whatsappUtils';
import { toast } from '../utils/toast';
import { copyToClipboard } from '../utils/clipboard';
import { Copy, Check, ExternalLink, X, Tag } from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  selected: boolean;
  category?: string;
}

export const NovaOrdemServico: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dados do Cliente e Veículo reais (sem dados mockados)
  const [customer, setCustomer] = useState<{ id?: string; name: string; phone: string; history?: string }>({
    id: '',
    name: '',
    phone: '',
    history: '',
  });

  // Dados do Veículo
  const [vehicle, setVehicle] = useState<{ id?: string; plate: string; brand?: string; model: string; color: string; sizeClass: string }>({
    id: '',
    plate: '',
    brand: '',
    model: '',
    color: '',
    sizeClass: 'SEDAN',
  });

  const [isSearchingPlate, setIsSearchingPlate] = useState(false);
  const [plateBadgeText, setPlateBadgeText] = useState('Digite a placa');
  const [plateBadgeColor, setPlateBadgeColor] = useState<'volt' | 'neutral' | 'error'>('neutral');

  const handleLookupPlate = async (rawPlate: string) => {
    const clean = rawPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setVehicle((prev) => ({ ...prev, plate: clean }));

    if (clean.length >= 7) {
      setIsSearchingPlate(true);
      setPlateBadgeText('Consultando placa...');
      try {
        const res = await api.vehicles.lookupPlate(clean);

        // Se a placa for nova ou não encontrada, limpa campos e não força valores estáticos
        if (res.source === 'not_found' || (!res.brand && !res.model)) {
          setPlateBadgeText('Placa livre / Digite os dados');
          setPlateBadgeColor('neutral');
          setVehicle((prev) => ({
            ...prev,
            plate: clean,
            brand: '',
            model: '',
            color: '',
          }));
          return;
        }

        const modelStr = res.model ? `${res.brand ? res.brand + ' ' : ''}${res.model}`.trim() : (res.brand || '');
        const sizeClassStr = res.sizeClass ? res.sizeClass.toUpperCase() : vehicle.sizeClass || 'SEDAN';

        setVehicle((prev) => ({
          ...prev,
          id: (res as any).id || prev.id || '',
          plate: res.plate || clean,
          brand: res.brand || prev.brand || '',
          model: modelStr || prev.model || '',
          color: res.color || prev.color || '',
          sizeClass: sizeClassStr,
        }));

        if (res.existingCustomer) {
          setCustomer({
            id: res.existingCustomer.id,
            name: res.existingCustomer.name,
            phone: res.existingCustomer.phone || customer.phone,
            history: 'Cliente registrado na oficina',
          });
          setPlateBadgeText('Veículo da oficina');
        } else if (res.source === 'cache') {
          setPlateBadgeText('Placa identificada');
        } else {
          setPlateBadgeText('Placa identificada');
        }
        setPlateBadgeColor('volt');
      } catch (err: any) {
        setPlateBadgeText('Nova placa / Digite os dados');
        setPlateBadgeColor('neutral');
      } finally {
        setIsSearchingPlate(false);
      }
    } else {
      setPlateBadgeText('Digite a placa');
      setPlateBadgeColor('neutral');
    }
  };

  // Catálogo de serviços reais do backend da oficina
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [comboActive, setComboActive] = useState<boolean>(false);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [isEditingDiscount, setIsEditingDiscount] = useState<boolean>(false);
  const [tempDiscountValue, setTempDiscountValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Consulta serviços reais do backend
  const { data: catalogData, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['catalog-services-list'],
    queryFn: () => api.catalog.getServices(),
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (catalogData) {
      const backendServices = Array.isArray(catalogData)
        ? catalogData
        : (catalogData as any).services || [];
      if (backendServices.length > 0) {
        const backendMapped = backendServices.map((bs: any, idx: number) => ({
          id: bs.id || `srv-bk-${idx}`,
          name: bs.name || bs.nome,
          price: bs.price_cents ? bs.price_cents / 100 : (bs.price || bs.preco_base || 0),
          selected: false,
          category: bs.category || bs.categoria || 'Geral',
        }));
        setServices(backendMapped);
      }
    }
  }, [catalogData]);

  // Alterna seleção de serviço
  const toggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  // Cálculo de valores
  const selectedServices = useMemo(() => services.filter((s) => s.selected), [services]);

  const subtotal = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  }, [selectedServices]);

  // Cálculo do desconto: suporta combo sugerido e/ou desconto manual (em R$ ou %)
  const discountAmount = useMemo(() => {
    let amount = 0;
    if (comboActive) {
      amount += subtotal * 0.1;
    }
    if (manualDiscount > 0) {
      if (discountType === 'percent') {
        amount += (subtotal * manualDiscount) / 100;
      } else {
        amount += manualDiscount;
      }
    }
    return Math.min(subtotal, Math.round(amount * 100) / 100);
  }, [comboActive, manualDiscount, discountType, subtotal]);

  // Remover e zerar qualquer desconto aplicado
  const handleRemoveDiscount = () => {
    setComboActive(false);
    setManualDiscount(0);
    setTempDiscountValue('');
    setIsEditingDiscount(false);
    toast.info('Desconto removido.');
  };

  const total = Math.max(0, subtotal - discountAmount);
  // Exigência opcional de sinal Pix (por padrão NÃO exige sinal e NÃO injeta falso adiantamento)
  const [requireDeposit, setRequireDeposit] = useState<boolean>(false);
  const [customDepositValue, setCustomDepositValue] = useState<number>(0);
  const depositPix = requireDeposit ? (customDepositValue > 0 ? customDepositValue : (total > 0 ? 50 : 0)) : 0;

  // Garante que o cliente e veículo existam no banco do tenant antes de criar a OS
  const resolveCustomerAndVehicle = async (): Promise<{ customerId: string; vehicleId: string }> => {
    let finalCustomerId: string = customer.id || '';
    if (!finalCustomerId) {
      if (!customer.name.trim()) {
        throw new Error('Informe o nome do cliente.');
      }
      const createdCust: any = await api.customers.create({
        name: customer.name.trim(),
        phone: customer.phone.trim() || undefined,
      });
      finalCustomerId = String(createdCust.id);
      setCustomer((prev) => ({ ...prev, id: finalCustomerId }));
    }

    let finalVehicleId: string = vehicle.id || '';
    if (!finalVehicleId) {
      if (!vehicle.plate.trim()) {
        throw new Error('Informe a placa do veículo.');
      }
      let rawBrand = (vehicle.brand || '').trim();
      let rawModel = (vehicle.model || '').trim();

      // Se o usuário digitou marca e modelo juntos (ex: "Honda Civic") e a marca ficou vazia
      if (!rawBrand && rawModel) {
        const words = rawModel.split(/\s+/);
        if (words.length > 1) {
          rawBrand = words[0];
          rawModel = words.slice(1).join(' ');
        } else {
          rawBrand = words[0];
        }
      }

      const createdVeh: any = await api.vehicles.create({
        customerId: finalCustomerId,
        plate: vehicle.plate.trim().toUpperCase(),
        brand: rawBrand || rawModel || 'Veículo',
        model: rawModel || rawBrand || 'Veículo',
        color: vehicle.color?.trim() || 'Padrão',
        sizeClass: (vehicle.sizeClass?.toLowerCase() as any) || 'sedan',
      });
      finalVehicleId = String(createdVeh.id);
      setVehicle((prev) => ({ ...prev, id: finalVehicleId, brand: rawBrand, model: rawModel }));
    }

    return { customerId: finalCustomerId, vehicleId: finalVehicleId };
  };

  // Ação: Salvar / Gerar OS
  const handleSave = async (isQuote: boolean) => {
    if (!customer.name.trim()) {
      toast.warning('Por favor, informe o nome do cliente.');
      return;
    }
    if (!vehicle.plate.trim()) {
      toast.warning('Por favor, informe a placa do veículo.');
      return;
    }
    if (selectedServices.length === 0) {
      toast.warning('Selecione pelo menos um serviço para prosseguir.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { customerId: resolvedCustId, vehicleId: resolvedVehId } = await resolveCustomerAndVehicle();

      // Cria a ordem de serviço ou orçamento no backend real
      await api.workOrders.create({
        customerId: resolvedCustId,
        vehicleId: resolvedVehId,
        status: isQuote ? 'QUOTE' : 'SCHEDULED',
        depositRequiredCents: Math.round(depositPix * 100),
        discountCents: Math.round(discountAmount * 100),
        services: selectedServices.map((s) => ({
          serviceId: s.id,
          name: s.name,
          unitPriceCents: Math.round(s.price * 100),
          quantity: 1,
        })),
        notes: `Cliente: ${customer.name} (${customer.phone || 'Sem fone'}). Veículo: ${vehicle.model || 'Veículo'} - ${vehicle.plate}. Porte: ${vehicle.sizeClass}.${requireDeposit && depositPix > 0 ? ` Sinal Pix exigido: R$ ${depositPix.toFixed(2)}.` : ''}`,
        scheduledAt: isQuote ? undefined : new Date().toISOString(),
      } as any);

      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['quotes-list'] });
      queryClient.invalidateQueries({ queryKey: ['smart-schedule-overview'] });
      toast.success(isQuote ? 'Orçamento salvo com sucesso!' : 'Ordem de Serviço gerada e agendada com sucesso!');
      if (isQuote) {
        navigate('/vendas');
      } else {
        navigate('/ordens');
      }
    } catch (err: any) {
      toast.error(err.message || (isQuote ? 'Erro ao salvar orçamento.' : 'Erro ao gerar ordem de serviço.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const [createdQuoteToken, setCreatedQuoteToken] = useState<string | null>(null);
  const [createdQuoteId, setCreatedQuoteId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Enviar orçamento via WhatsApp respeitando o plano da oficina
  const handleSendWhatsApp = async () => {
    const cleanPhone = customer.phone.replace(/\D/g, '');
    let targetQuoteId = createdQuoteId;
    let targetToken = createdQuoteToken;

    // Se ainda não salvou a proposta, salva preliminarmente no banco para obter o tracking_token
    if (!targetQuoteId) {
      try {
        const { customerId: resolvedCustId, vehicleId: resolvedVehId } = await resolveCustomerAndVehicle();

        const created: any = await api.workOrders.create({
          customerId: resolvedCustId,
          vehicleId: resolvedVehId,
          status: 'QUOTE',
          depositRequiredCents: Math.round(depositPix * 100),
          services: selectedServices.map((s) => ({
            serviceId: s.id,
            name: s.name,
            unitPriceCents: Math.round(s.price * 100),
            quantity: 1,
          })),
          notes: `Proposta gerada para ${customer.name}. Veículo: ${vehicle.model} (${vehicle.plate}).${requireDeposit && depositPix > 0 ? ` Sinal Pix exigido: R$ ${depositPix.toFixed(2)}.` : ''}`,
        } as any);

        targetQuoteId = created?.id;
        targetToken = created?.trackingToken || created?.tracking_token;
        if (targetQuoteId) setCreatedQuoteId(targetQuoteId);
        if (targetToken) setCreatedQuoteToken(targetToken);
      } catch (err: any) {
        // Fallback para abertura direta
      }
    }

    const msg = getBudgetMsg(
      customer.name,
      `${vehicle.model} (${vehicle.plate})`,
      total,
      selectedServices,
      '',
      targetToken || ''
    );

    if (targetQuoteId && cleanPhone) {
      await dispatchQuoteNotification(targetQuoteId, cleanPhone, msg);
    } else if (cleanPhone) {
      window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const handleCopyQuoteLink = async () => {
    const tokenToUse = createdQuoteToken || 'demo-proposta';
    const link = `${window.location.origin}/proposta/${tokenToUse}`;
    await copyToClipboard(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '844px',
        background: '#F3F5F7',
        fontFamily: 'Inter, sans-serif',
        color: '#0E1116',
        padding: '28px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. CABEÇALHO COM TÍTULO E STEPPER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '30px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
          }}
        >
          Nova ordem de serviço
        </div>

        {/* Stepper oficial do Rebrand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#5B6674',
          }}
        >
          <i
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#0E1116',
              color: '#C8F52E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontStyle: 'normal',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            ✓
          </i>
          <span style={{ color: '#0E1116' }}>Cliente</span>

          <i
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#0E1116',
              color: '#C8F52E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontStyle: 'normal',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            ✓
          </i>
          <span style={{ color: '#0E1116' }}>Veículo</span>

          <i
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#C8F52E',
              color: '#0E1116',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontStyle: 'normal',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            3
          </i>
          <span style={{ color: '#0E1116' }}>Serviços</span>

          <i
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#E1E6EC',
              color: '#5B6674',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontStyle: 'normal',
              fontSize: '13px',
            }}
          >
            4
          </i>
          <span>Checklist</span>

          <i
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#E1E6EC',
              color: '#5B6674',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontStyle: 'normal',
              fontSize: '13px',
            }}
          >
            5
          </i>
          <span>Agenda</span>
        </div>
      </div>

      {/* 2. GRID PRINCIPAL (COLUNA DE CONTEÚDO + COLUNA RESUMO) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: '22px',
          alignItems: 'start',
        }}
      >
        {/* COLUNA ESQUERDA: CLIENTE, VEÍCULO E SERVIÇOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* CARDS CLIENTE E VEÍCULO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            {/* CARD CLIENTE */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px' }}>
                Cliente
              </h3>
              <input
                type="text"
                placeholder="Nome do cliente *"
                value={customer.name}
                onChange={(e) => setCustomer((prev) => ({ ...prev, name: e.target.value }))}
                style={{
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #E1E6EC',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  outline: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Telefone / WhatsApp (ex: 11999998888)"
                value={customer.phone}
                onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                style={{
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #E1E6EC',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {customer.history ? (
                <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
                  ✓ {customer.history}
                </div>
              ) : null}
            </div>

            {/* CARD VEÍCULO */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px' }}>
                Veículo
              </h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  maxLength={8}
                  value={vehicle.plate}
                  onChange={(e) => handleLookupPlate(e.target.value)}
                  placeholder="Placa *"
                  style={{
                    height: '42px',
                    width: '124px',
                    padding: '0 12px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '10px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    color: '#0E1116',
                    background: '#fff',
                    outline: 'none',
                    textTransform: 'uppercase',
                    fontSize: '14px',
                  }}
                  title="Digite a placa para preenchimento automático inteligente"
                />
                <div
                  style={{
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    background: plateBadgeColor === 'error' ? '#FEE2E2' : '#0E1116',
                    color: plateBadgeColor === 'error' ? '#991B1B' : '#C8F52E',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    gap: '6px',
                  }}
                >
                  {isSearchingPlate && <span className="animate-spin text-xs">⏳</span>}
                  {plateBadgeText}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Marca (ex: Honda)"
                  value={vehicle.brand || ''}
                  onChange={(e) => setVehicle((prev) => ({ ...prev, brand: e.target.value }))}
                  style={{
                    flex: '1 1 120px',
                    height: '38px',
                    padding: '0 10px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Modelo (ex: Civic)"
                  value={vehicle.model}
                  onChange={(e) => setVehicle((prev) => ({ ...prev, model: e.target.value }))}
                  style={{
                    flex: '1.5 1 160px',
                    height: '38px',
                    padding: '0 10px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Cor"
                  value={vehicle.color}
                  onChange={(e) => setVehicle((prev) => ({ ...prev, color: e.target.value }))}
                  style={{
                    flex: 1,
                    height: '38px',
                    padding: '0 10px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <select
                  value={vehicle.sizeClass}
                  onChange={(e) => setVehicle((prev) => ({ ...prev, sizeClass: e.target.value }))}
                  style={{
                    height: '38px',
                    padding: '0 8px',
                    border: '1px solid #E1E6EC',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: '#fff',
                    outline: 'none',
                  }}
                >
                  <option value="HATCH">Hatch</option>
                  <option value="SEDAN">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="PICKUP">Picape</option>
                  <option value="VAN">Van</option>
                </select>
              </div>
            </div>
          </div>

          {/* CARD SERVIÇOS */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #E1E6EC',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px' }}>
              Serviços
            </h3>

            {/* Banner Combo sugerido */}
            <div
              style={{
                background: comboActive ? '#F0FDF4' : '#F6FBE6',
                border: comboActive ? '1px solid #86EFAC' : '1px solid #C8F52E',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '14px',
                color: '#0E1116',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <span>
                {comboActive
                  ? '✓ Combo promocional ativo: 10% de desconto aplicado'
                  : 'Combo sugerido: Insulfilme + Vitrificação com 10% de desconto'}
              </span>
              {comboActive ? (
                <button
                  type="button"
                  onClick={handleRemoveDiscount}
                  style={{
                    border: '1px solid #FCA5A5',
                    background: '#FEE2E2',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontWeight: 700,
                    fontSize: '12px',
                    color: '#DC2626',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <X size={13} /> Remover desconto
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setServices((prev) =>
                      prev.map((s) => {
                        if (s.name.includes('Insulfilme') || s.name.includes('Vitrificação')) {
                          return { ...s, selected: true };
                        }
                        return s;
                      })
                    );
                    setComboActive(true);
                    toast.success('Combo aplicado com 10% de desconto!');
                  }}
                  style={{
                    border: 0,
                    background: 'transparent',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#0E1116',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  Aplicar
                </button>
              )}
            </div>

            {/* Lista de Serviços */}
            {services.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  background: '#F9FAFB',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '12px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>
                  Nenhum serviço cadastrado na oficina ainda
                </div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  Acesse o menu Serviços para cadastrar o catálogo oficial da sua oficina.
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/servicos')}
                  style={{
                    marginTop: '6px',
                    padding: '8px 16px',
                    background: '#0E1116',
                    color: '#C8F52E',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  + Cadastrar Serviços
                </button>
              </div>
            ) : (
              services.map((item) => {
                const isSelected = item.selected;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleService(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      border: isSelected ? '2px solid #0E1116' : '1px solid #E1E6EC',
                      background: isSelected ? '#F6FBE6' : '#fff',
                      borderRadius: '14px',
                      padding: isSelected ? '11px 13px' : '12px 14px',
                      fontSize: '15px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '7px',
                        border: isSelected ? '2px solid #0E1116' : '2px solid #9AA7B8',
                        background: isSelected ? '#0E1116' : '#fff',
                        flex: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <span style={{ color: '#C8F52E', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                      )}
                    </span>
                    <span style={{ fontWeight: isSelected ? 600 : 400, color: '#0E1116' }}>
                      {item.name}
                    </span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#0E1116' }}>
                      {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                );
              })
            )}

            <div style={{ fontSize: '13px', color: '#5B6674' }}>
              Preços calculados pelo porte do veículo.
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: RESUMO STICKY */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E1E6EC',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            position: 'sticky',
            top: '20px',
          }}
        >
          <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px' }}>
            Resumo
          </h3>

          {selectedServices.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '15px',
                color: '#5B6674',
              }}
            >
              <span>{s.name}</span>
              <b style={{ color: '#0E1116', fontWeight: 600 }}>
                {s.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </b>
            </div>
          ))}

          {/* Linha de Desconto com suporte a Remoção e Edição */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '15px',
                color: '#5B6674',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Desconto</span>
                {discountAmount > 0 && (
                  <button
                    type="button"
                    onClick={handleRemoveDiscount}
                    title="Remover desconto"
                    style={{
                      background: '#FEE2E2',
                      border: '1px solid #FCA5A5',
                      color: '#DC2626',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <X size={12} /> Remover
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <b style={{ color: discountAmount > 0 ? '#DC2626' : '#0E1116', fontWeight: 600 }}>
                  {discountAmount > 0
                    ? `- ${discountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                    : 'R$ 0,00'}
                </b>
                {!isEditingDiscount && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingDiscount(true);
                      setTempDiscountValue(manualDiscount > 0 ? String(manualDiscount) : '');
                    }}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: '#059669',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {discountAmount > 0 ? 'Editar' : '+ Outro valor'}
                  </button>
                )}
              </div>
            </div>

            {/* Painel expansível de desconto customizado */}
            {isEditingDiscount && (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    style={{
                      flex: 1,
                      padding: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: discountType === 'fixed' ? '1px solid #0E1116' : '1px solid #CBD5E1',
                      background: discountType === 'fixed' ? '#0E1116' : '#FFFFFF',
                      color: discountType === 'fixed' ? '#FFFFFF' : '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    Reais (R$)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    style={{
                      flex: 1,
                      padding: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: discountType === 'percent' ? '1px solid #0E1116' : '1px solid #CBD5E1',
                      background: discountType === 'percent' ? '#0E1116' : '#FFFFFF',
                      color: discountType === 'percent' ? '#FFFFFF' : '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    Porcentagem (%)
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={tempDiscountValue}
                    onChange={(e) => setTempDiscountValue(e.target.value)}
                    placeholder={discountType === 'fixed' ? 'Valor em R$ (Ex: 50)' : 'Percentual (Ex: 10%)'}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '13px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseFloat(tempDiscountValue.replace(',', '.'));
                      if (!isNaN(parsed) && parsed > 0) {
                        setManualDiscount(parsed);
                        setIsEditingDiscount(false);
                        toast.success('Desconto aplicado!');
                      } else {
                        handleRemoveDiscount();
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#C8F52E',
                      color: '#0E1116',
                      fontWeight: 700,
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: 0,
                      cursor: 'pointer',
                    }}
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingDiscount(false)}
                    style={{
                      padding: '6px 8px',
                      background: 'transparent',
                      color: '#64748B',
                      fontSize: '12px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1px solid #E1E6EC',
              paddingTop: '14px',
              fontSize: '18px',
            }}
          >
            <span style={{ color: '#0E1116', fontWeight: 600 }}>Total</span>
            <b
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '26px',
                color: '#0E1116',
                fontWeight: 700,
              }}
            >
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </b>
          </div>

          {requireDeposit && depositPix > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '15px',
                color: '#5B6674',
              }}
            >
              <span>Sinal por Pix</span>
              <b style={{ color: '#0E1116', fontWeight: 600 }}>
                {depositPix.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </b>
            </div>
          )}

          {/* Botão Primário: Gerar OS e agendar */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            style={{
              height: '52px',
              border: 0,
              borderRadius: '14px',
              background: '#C8F52E',
              color: '#0E1116',
              font: '700 16px Inter, sans-serif',
              cursor: 'pointer',
              marginTop: '4px',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {isSubmitting ? 'Gerando...' : 'Gerar OS e agendar'}
          </button>

          {/* Botão Secundário: Salvar como orçamento */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(true)}
            style={{
              height: '48px',
              border: '1px solid #E1E6EC',
              borderRadius: '14px',
              background: '#fff',
              color: '#0E1116',
              font: '600 15px Inter, sans-serif',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            Salvar como orçamento
          </button>

          {/* Botão Terciário: Enviar orçamento por WhatsApp */}
          <button
            type="button"
            onClick={handleSendWhatsApp}
            style={{
              height: '44px',
              border: 0,
              background: 'transparent',
              color: '#5B6674',
              font: '500 14px Inter, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0E1116')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#5B6674')}
          >
            Enviar orçamento por WhatsApp
          </button>

          {/* Link / Ação rápida: Copiar link da proposta online */}
          {createdQuoteToken && (
            <button
              type="button"
              onClick={handleCopyQuoteLink}
              style={{
                height: '36px',
                border: '1px dashed #C8F52E',
                borderRadius: '10px',
                background: '#F7FEE7',
                color: '#3F6212',
                font: '600 12px Inter, sans-serif',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '4px',
              }}
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              {copiedLink ? 'Link copiado!' : 'Copiar link da proposta online'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NovaOrdemServico;
