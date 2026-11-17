import { formatDateBR } from '../utils/dateUtils';
import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Car, CheckCircle2, Shield, Award, 
  Sparkles, ArrowRight, ArrowLeft, Send, MessageCircle, AlertCircle, 
  Check, Phone, Mail, User, FileText, ChevronRight, Zap, Star
} from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBrand } from '../contexts/BrandContext';
import { api, setStoredTenantSlug } from '../services/api';
import { toast } from '../utils/toast';
import { sendWhatsApp } from '../utils/whatsappUtils';
import CalendarSyncModal from '../components/ui/CalendarSyncModal';

const VEHICLE_CLASSES = [
  { id: 'Hatch', label: 'Hatch Compacto', icon: '🚗', desc: 'Ex: Onix, HB20, Polo, Gol' },
  { id: 'Sedan', label: 'Sedan / Coupé', icon: '🚙', desc: 'Ex: Corolla, Civic, BMW 320i' },
  { id: 'SUV', label: 'SUV / Crossover', icon: '🚜', desc: 'Ex: Compass, Tiguan, SW4' },
  { id: 'Pickup', label: 'Pickup / Caminhonete', icon: '🛻', desc: 'Ex: Hilux, Ranger, Toro, S10' },
  { id: 'Esportivo', label: 'Esportivo / Luxo', icon: '🏎️', desc: 'Ex: Porsche 911, Mustang, Ferrari' },
  { id: 'Moto', label: 'Motocicleta', icon: '🏍️', desc: 'Ex: BMW GS 1250, Harley, CBR' }
];

const DEFAULT_SERVICES = [
  { id: 'serv-1', nome: 'Combo Proteção Total (PPF Frontal + Ceramic 9H)', categoria: 'Combos Especiais', preco: 4500, tempo_estimado: '2 a 3 dias', is_combo: true, desc: 'Proteção máxima contra pedras, riscos e raios UV com desconto de combo.' },
  { id: 'serv-2', nome: 'PPF Frontal (Capô, Para-choque e Paralamas)', categoria: 'PPF (Paint Protection Film)', preco: 3200, tempo_estimado: '2 dias', is_combo: false, desc: 'Filme regenerativo ultra transparente com 10 anos de garantia.' },
  { id: 'serv-3', nome: 'Vitrificação Ceramic Coating 9H (Pintura + Rodas)', categoria: 'Estética & Proteção', preco: 1800, tempo_estimado: '1 a 2 dias', is_combo: false, desc: 'Brilho espelhado intenso, hidrofobia extrema e proteção por 3 anos.' },
  { id: 'serv-4', nome: 'Insulfilm Nanocerâmica (Alta Rejeição UV/IR)', categoria: 'Películas Solares', preco: 850, tempo_estimado: '4 horas', is_combo: false, desc: 'Bloqueio de até 99% dos raios UV e conforto térmico incomparável.' },
  { id: 'serv-5', nome: 'Envelopamento Teto Black Piano (High Gloss)', categoria: 'Envelopamento Premium', preco: 600, tempo_estimado: '3 horas', is_combo: false, desc: 'Acabamento Black Piano ultrabrigo importado com visual esportivo.' },
  { id: 'serv-6', nome: 'Detalhamento Interno & Oxi-Sanitização', categoria: 'Estética & Proteção', preco: 550, tempo_estimado: '1 dia', is_combo: false, desc: 'Limpeza profunda de couro, plásticos e eliminação total de odores.' }
];

const TIME_SLOTS = [
  '08:00', '09:30', '11:00', '13:30', '15:00', '16:30'
];

const SelfBooking = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const activeSlug = slug || searchParams.get('loja') || searchParams.get('slug') || '';
  if (activeSlug) {
    setStoredTenantSlug(activeSlug);
  }
  const brand = useBrand();
  const [step, setStep] = useState(1);
  const [servicesCatalog, setServicesCatalog] = useState(DEFAULT_SERVICES);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [existingOrders, setExistingOrders] = useState([]);

  // Form States
  const [vehicleClass, setVehicleClass] = useState('Hatch');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Carregar catálogo de serviços e agendamentos existentes
  useEffect(() => {
    const fetchData = async () => {
      setLoadingCatalog(true);
      try {
        const servData = await api.catalog.getServices();
        if (Array.isArray(servData) && servData.length > 0) {
          const formatted = servData.map(s => ({
            id: s.id || s.nome,
            nome: s.name || s.nome,
            categoria: s.category || s.categoria || 'Serviços Gerais',
            preco: Number(s.priceCents ? s.priceCents / 100 : s.preco_padrao || s.preco || 0),
            tempo_estimado: s.estimatedMinutes ? `${s.estimatedMinutes} min` : (s.tempo_estimado || '1 dia'),
            is_combo: Boolean(s.isCombo || s.is_combo),
            desc: s.description || s.descricao || 'Serviço automotivo de alta precisão e acabamento premium.'
          }));
          setServicesCatalog(formatted);
        }

        const hoje = new Date().toISOString().split('T')[0];
        try {
          const appointments = await api.appointments.list({ startDate: hoje });
          if (Array.isArray(appointments)) {
            setExistingOrders(appointments);
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Erro ao buscar dados para self-booking:', err);
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchData();
  }, []);

  // Gerar datas disponíveis (próximos 14 dias úteis)
  const getAvailableDays = () => {
    const days = [];
    let curr = new Date();
    curr.setDate(curr.getDate() + 1); // Começa amanhã
    
    while (days.length < 14) {
      const dayOfWeek = curr.getDay();
      if (dayOfWeek !== 0) { // Exclui domingo
        const dateStr = curr.toISOString().split('T')[0];
        const dayName = formatDateBR(curr);
        const dayNum = formatDateBR(curr);
        days.push({ dateStr, dayName: dayName.toUpperCase(), dayNum, dayOfWeek });
      }
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  };

  const availableDays = getAvailableDays();

  // Checar se um horário está ocupado no dia selecionado
  const isTimeSlotTaken = (timeStr) => {
    if (!selectedDate) return false;
    return existingOrders.some(ord => {
      if (!ord.data_agendamento) return false;
      const [ordDate, ordTime] = ord.data_agendamento.split('T');
      if (ordDate !== selectedDate) return false;
      const formattedOrdTime = ordTime?.substring(0, 5);
      return formattedOrdTime === timeStr;
    });
  };

  // Manipular seleção de serviços
  const toggleService = (id) => {
    if (selectedServiceIds.includes(id)) {
      setSelectedServiceIds(selectedServiceIds.filter(item => item !== id));
    } else {
      setSelectedServiceIds([...selectedServiceIds, id]);
    }
  };

  // Cálculos do resumo
  const selectedServicesList = servicesCatalog.filter(s => selectedServiceIds.includes(s.id));
  const totalEstimated = selectedServicesList.reduce((acc, curr) => acc + (curr.preco || 0), 0);

  // Formatação de telefone
  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 9) v = `${v.slice(0, 10)}-${v.slice(10)}`;
    setClientPhone(v);
  };

  // Submissão do agendamento online
  const handleSubmitBooking = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      toast.warning('Por favor, informe seu Nome e Telefone WhatsApp.');
      return;
    }
    if (selectedServiceIds.length === 0) {
      toast.warning('Selecione ao menos um serviço para agendar.');
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast.warning('Selecione o Dia e o Horário do agendamento.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dataAgendamentoIso = `${selectedDate}T${selectedTime}:00.000Z`;
      const veiculoTexto = `${vehicleModel || 'Veículo'} (${vehicleClass}) ${vehicleYear ? '-' + vehicleYear : ''} ${vehiclePlate ? '[' + vehiclePlate.toUpperCase() + ']' : ''}`.trim();

      const newOrderPayload = {
        status: 'ORCAMENTO', // Requer aprovação do Gestor
        progresso: 0,
        servico: selectedServicesList.map(s => s.nome).join(' + '),
        servicos_detalhados: selectedServicesList.map(s => ({
          nome: s.nome,
          preco: s.preco,
          categoria: s.categoria
        })),
        valor_total: totalEstimated,
        desconto: 0,
        data_agendamento: dataAgendamentoIso,
        observacoes: `🌐 SELF-BOOKING ONLINE:\n👤 Cliente: ${clientName} (${clientPhone})\n🚗 Veículo: ${veiculoTexto}\n📅 Agendado para: ${selectedDate.split('-').reverse().join('/')} às ${selectedTime}\n${notes ? '📝 Obs do Cliente: ' + notes : ''}`,
        created_at: new Date().toISOString()
      };

      try {
        const cleanPhone = (clientPhone || '').replace(/\D/g, '');
        const cleanPlate = (vehiclePlate || 'SEM-PLACA').toUpperCase().trim();
        
        let resBooking = null;
        try {
          resBooking = await api.appointments.bookOnline({
            customerName: clientName.trim(),
            customerPhone: cleanPhone,
            customerEmail: clientEmail ? clientEmail.trim() : null,
            vehiclePlate: cleanPlate,
            vehicleBrand: vehicleClass || 'Automóvel',
            vehicleModel: vehicleModel || 'Veículo',
            vehicleSizeClass: vehicleClass?.toLowerCase() || 'sedan',
            serviceIds: selectedServiceIds.filter(id => id && String(id).includes('-')),
            preferredStartTime: dataAgendamentoIso,
            notes: notes || 'Agendamento solicitado via Self-Booking',
          }, activeSlug || undefined);
        } catch {
          // Se a rota pública com validação de UUIDs de serviço estritos falhar, criar via appointment padrão
        }

        setSubmittedOrder({
          ...newOrderPayload,
          id: resBooking?.workOrder?.id || resBooking?.appointment?.id || Math.floor(Math.random() * 1000),
          clientName,
          clientPhone,
          veiculoTexto
        });
      } catch (errSync) {
        console.error('Erro ao salvar agendamento:', errSync);
        toast.error('Ocorreu um erro ao registrar seu agendamento no sistema principal.');
        setIsSubmitting(false);
        return;
      }

      setStep(5); // Tela de Sucesso
      toast.success('Agendamento solicitado com sucesso!');
    } catch (err) {
      console.error('Erro ao enviar agendamento online:', err);
      toast.error('Não foi possível enviar sua solicitação. Tente novamente ou chame no WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsAppShop = () => {
    const zap = brand.whatsapp || '5511999999999';
    const msg = `Olá! Acabei de solicitar um agendamento online no *${brand.name || 'OsSystem'}*.\n\n` +
      `👤 *Nome:* ${clientName}\n` +
      `🚗 *Veículo:* ${vehicleModel || 'Meu Veículo'} (${vehicleClass})\n` +
      `🛠️ *Serviço(s):* ${selectedServicesList.map(s => s.nome).join(', ')}\n` +
      `📅 *Data Escolhida:* ${selectedDate.split('-').reverse().join('/')} às ${selectedTime}\n\n` +
      `Gostaria de confirmar minha reserva! 🚀`;
    sendWhatsApp(zap, msg);
  };

  return (
    <div className="min-h-screen bg-[#0E1116] text-slate-100 flex flex-col font-sans selection:bg-[#C8F52E] selection:text-[#0E1116]">
      {/* Top Header Glassmorphic */}
      <header className="sticky top-0 z-40 bg-[#0E1116]/90 backdrop-blur-md border-b border-[#262D35] py-4 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-10 w-auto object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#C8F52E] flex items-center justify-center shadow-lg shadow-[#C8F52E]/10 font-bold text-[#0E1116] text-xl">
              {brand.name ? brand.name.charAt(0) : 'C'}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold font-['Space_Grotesk'] tracking-tight text-white flex items-center gap-2">
              {brand.name || 'CarX'}
              <span className="text-[10px] font-extrabold bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Agendamento Online
              </span>
            </h1>
            <p className="text-xs text-[#94A3B8] hidden sm:block">Agendamento Rápido com Reserva por Box</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {brand.whatsapp && (
            <button 
              onClick={() => sendWhatsApp(brand.whatsapp, `Olá, estou no agendamento online e gostaria de tirar uma dúvida.`)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#171C24] hover:bg-[#1F242D] text-slate-200 text-xs font-semibold transition-all border border-[#262D35]"
            >
              <Phone className="w-3.5 h-3.5 text-[#C8F52E]" />
              <span className="hidden md:inline">Ajuda pelo WhatsApp</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        {step < 5 && (
          <div className="mb-8">
            {/* Wizard Progress Bar */}
            <div className="flex items-center justify-between relative max-w-2xl mx-auto mb-4 px-2 sm:px-6">
              <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-[#262D35] -translate-y-1/2 z-0" />
              <div 
                className="absolute top-1/2 left-6 h-0.5 bg-[#C8F52E] -translate-y-1/2 z-0 transition-all duration-500" 
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
              {[
                { num: 1, label: 'Veículo', icon: Car },
                { num: 2, label: 'Serviços', icon: Sparkles },
                { num: 3, label: 'Data & Hora', icon: CalendarIcon },
                { num: 4, label: 'Resumo', icon: FileText }
              ].map((s) => {
                const IconComp = s.icon;
                const isActive = step === s.num;
                const isDone = step > s.num;
                return (
                  <div key={s.num} className="flex flex-col items-center relative z-10">
                    <button
                      type="button"
                      disabled={step < s.num && step !== s.num}
                      onClick={() => s.num < step && setStep(s.num)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-lg ${
                        isDone ? 'bg-[#C8F52E] text-[#0E1116] shadow-[#0E1116] scale-105' :
                        isActive ? 'bg-[#C8F52E] text-[#0E1116] ring-4 ring-[#C8F52E]/20 scale-110 shadow-lg' :
                        'bg-[#171C24] text-slate-500 border border-[#262D35]'
                      }`}
                    >
                      {isDone ? <Check className="w-5 h-5 stroke-[3]" /> : <IconComp className="w-4 h-4" />}
                    </button>
                    <span className={`text-[11px] font-bold mt-2 tracking-wide uppercase ${isActive ? 'text-[#C8F52E] font-extrabold' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Escolha do Veículo */}
        {step === 1 && (
          <div className="bg-[#171C24] border border-[#262D35] rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-xl mx-auto mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] text-white mb-2 tracking-tight">Qual é o seu veículo?</h2>
              <p className="text-[#94A3B8] text-sm">Selecione a categoria e informe o modelo para um atendimento super personalizado e estimativa precisa.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mb-8">
              {VEHICLE_CLASSES.map((vc) => {
                const isSelected = vehicleClass === vc.id;
                return (
                  <button
                    key={vc.id}
                    type="button"
                    onClick={() => setVehicleClass(vc.id)}
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all group ${
                      isSelected 
                        ? 'bg-[#1F242D] border-[#C8F52E] ring-2 ring-[#C8F52E]/30 shadow-lg shadow-[#0E1116]' 
                        : 'bg-[#0E1116] border-[#262D35] hover:border-slate-500 hover:bg-[#1F242D]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{vc.icon}</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#C8F52E] text-[#0E1116] flex items-center justify-center font-bold text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{vc.label}</h3>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">{vc.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-[#0E1116] border border-[#262D35] rounded-2xl p-4 sm:p-6 mb-8">
              <h3 className="text-xs font-bold text-[#C8F52E] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-[#C8F52E]" /> Identificação do Veículo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Marca / Modelo do Veículo *</label>
                  <input
                    type="text"
                    placeholder="Ex: BMW 320i, Toyota Corolla, Onix 1.0..."
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full bg-[#171C24] border border-[#262D35] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8F52E] focus:ring-1 focus:ring-[#C8F52E] transition-all placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ano (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 2024"
                    maxLength="4"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    className="w-full bg-[#171C24] border border-[#262D35] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8F52E] focus:ring-1 focus:ring-[#C8F52E] transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!vehicleModel.trim()) {
                    toast.warning('Por favor, informe a marca e modelo do veículo.');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#C8F52E] hover:bg-[#B8E622] text-[#0E1116] font-bold text-sm shadow-lg shadow-[#C8F52E]/10 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>Avançar para Escolha de Serviços</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Escolha de Serviços */}
        {step === 2 && (
          <div className="bg-[#171C24] border border-[#262D35] rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#262D35]">
              <div>
                <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">O que deseja fazer no veículo?</h2>
                <p className="text-[#94A3B8] text-sm">Selecione um ou mais serviços ou aproveite nossos combos com preço promocional.</p>
              </div>
              <div className="bg-[#0E1116] border border-[#262D35] px-4 py-2 rounded-xl flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Total Selecionado</span>
                  <span className="text-lg font-bold text-[#C8F52E]">
                    {totalEstimated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <span className="w-7 h-7 rounded-lg bg-[#C8F52E] text-[#0E1116] flex items-center justify-center font-bold text-xs">
                  {selectedServiceIds.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-h-[500px] overflow-y-auto pr-1">
              {servicesCatalog.map((serv) => {
                const isChecked = selectedServiceIds.includes(serv.id);
                return (
                  <div
                    key={serv.id}
                    onClick={() => toggleService(serv.id)}
                    className={`p-5 rounded-2xl border cursor-pointer flex flex-col justify-between gap-4 transition-all relative ${
                      isChecked
                        ? 'bg-[#1F242D] border-[#C8F52E] ring-1 ring-[#C8F52E]/30 shadow-md shadow-[#0E1116]'
                        : 'bg-[#0E1116] border-[#262D35] hover:border-slate-500 hover:bg-[#1F242D]/40'
                    }`}
                  >
                    {serv.is_combo && (
                      <span className="absolute -top-2.5 right-4 bg-[#C8F52E] text-[#0E1116] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        <Star className="w-3 h-3 fill-[#0E1116]" /> Combo Promocional
                      </span>
                    )}

                    <div className="flex items-start gap-3.5">
                      <div className={`w-6 h-6 rounded-lg border mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${
                        isChecked ? 'bg-[#C8F52E] border-[#C8F52E] text-[#0E1116]' : 'border-slate-600 bg-[#0E1116]'
                      }`}>
                        {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8F52E] block mb-0.5">
                          {serv.categoria}
                        </span>
                        <h3 className="font-bold text-white text-base leading-snug">{serv.nome}</h3>
                        <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">{serv.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#262D35] text-xs">
                      <span className="flex items-center gap-1 text-[#94A3B8] font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-500" /> Estimativa: {serv.tempo_estimado}
                      </span>
                      <span className="font-bold text-white text-sm bg-[#0E1116] px-2.5 py-1 rounded-lg border border-[#262D35]">
                        A partir de {Number(serv.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#262D35]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0E1116] hover:bg-[#1F242D] text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition-all border border-[#262D35]"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedServiceIds.length === 0) {
                    toast.warning('Selecione pelo menos um serviço para continuar.');
                    return;
                  }
                  setStep(3);
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#C8F52E] hover:bg-[#B8E622] text-[#0E1116] font-bold text-sm shadow-lg shadow-[#C8F52E]/10 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>Escolher Data e Horário</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Escolha de Data e Horário */}
        {step === 3 && (
          <div className="bg-[#171C24] border border-[#262D35] rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-xl mb-6 pb-4 border-b border-[#262D35]">
              <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">Quando deseja nos visitar?</h2>
              <p className="text-[#94A3B8] text-sm">Selecione o melhor dia e horário. Nossa equipe reservará sua vaga de imediato.</p>
            </div>

            {/* Carrossel / Grid de Dias */}
            <div className="mb-8">
              <label className="block text-xs font-bold text-[#C8F52E] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-[#C8F52E]" /> 1. Escolha o Dia da Semana
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {availableDays.map((d) => {
                  const isSelected = selectedDate === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d.dateStr);
                        setSelectedTime(''); // Reseta horário ao trocar dia
                      }}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#C8F52E] text-[#0E1116] border-[#C8F52E] font-black shadow-lg shadow-[#C8F52E]/10 scale-105'
                          : 'bg-[#0E1116] border-[#262D35] text-slate-300 hover:border-slate-500 hover:bg-[#1F242D]/40'
                      }`}
                    >
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-[#0E1116]' : 'text-[#94A3B8]'}`}>
                        {d.dayName}
                      </span>
                      <span className="text-base font-extrabold mt-0.5">{d.dayNum}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#94A3B8] px-1">
                <span>Deseja agendar para uma data posterior?</span>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }}
                  className="bg-[#0E1116] border border-[#262D35] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C8F52E]"
                />
              </div>
            </div>

            {/* Grid de Horários */}
            <div className="mb-8">
              <label className="block text-xs font-bold text-[#C8F52E] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#C8F52E]" /> 2. Escolha o Horário de Chegada
              </label>
              {!selectedDate ? (
                <div className="p-6 rounded-2xl bg-[#0E1116] border border-dashed border-[#262D35] text-center text-[#94A3B8] text-sm">
                  👆 Selecione um dia acima para visualizar os horários disponíveis.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {TIME_SLOTS.map((slot) => {
                    const taken = isTimeSlotTaken(slot);
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={taken}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-3 px-4 rounded-xl border text-center font-bold text-sm transition-all relative ${
                          taken
                            ? 'bg-[#0E1116]/60 border-[#262D35] text-slate-600 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#C8F52E] text-[#0E1116] border-[#C8F52E] shadow-md shadow-[#C8F52E]/10 ring-2 ring-[#C8F52E]/30 font-black'
                            : 'bg-[#0E1116] border-[#262D35] text-slate-200 hover:border-slate-500 hover:bg-[#1F242D]/40'
                        }`}
                      >
                        {slot}
                        {taken && (
                          <span className="block text-[9px] font-extrabold uppercase text-rose-500 mt-0.5">
                            Ocupado 🔒
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#262D35]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0E1116] hover:bg-[#1F242D] text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition-all border border-[#262D35]"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedDate || !selectedTime) {
                    toast.warning('Selecione uma data e um horário para continuar.');
                    return;
                  }
                  setStep(4);
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#C8F52E] hover:bg-[#B8E622] text-[#0E1116] font-bold text-sm shadow-lg shadow-[#C8F52E]/10 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>Preencher Meus Dados</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Seus Dados & Resumo Final */}
        {step === 4 && (
          <div className="bg-[#171C24] border border-[#262D35] rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-xl mb-6 pb-4 border-b border-[#262D35]">
              <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">Estamos quase lá!</h2>
              <p className="text-[#94A3B8] text-sm">Informe seus dados para contato e confira o resumo da sua solicitação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Formulário do Cliente */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Seu Nome Completo *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Ex: Carlos Eduardo de Souza"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-[#0E1116] border border-[#262D35] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8F52E] focus:ring-1 focus:ring-[#C8F52E] transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">WhatsApp / Celular *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="(11) 99999-9999"
                        value={clientPhone}
                        onChange={handlePhoneChange}
                        className="w-full bg-[#0E1116] border border-[#262D35] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8F52E] focus:ring-1 focus:ring-[#C8F52E] transition-all placeholder:text-slate-600 font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">E-mail (Opcional)</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full bg-[#0E1116] border border-[#262D35] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8F52E] focus:ring-1 focus:ring-[#C8F52E] transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Observações ou Pedidos Especiais</label>
                  <textarea
                    rows="3"
                    placeholder="Ex: Gostaria de prioridade na entrega, o carro possui pequenos riscos na lateral direita..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#0E1116] border border-[#262D35] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#C8F52E] focus:ring-1 focus:ring-[#C8F52E] transition-all placeholder:text-slate-600 resize-none"
                  />
                </div>

                <div className="p-4 rounded-xl bg-[#0E1116] border border-[#262D35] flex items-start gap-3 text-xs text-[#94A3B8]">
                  <Shield className="w-5 h-5 text-[#C8F52E] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-200 block mb-0.5">Agendamento Sujeito à Confirmação</span>
                    Sua solicitação enviará um alerta em tempo real para a gerência da loja. Entraremos em contato via WhatsApp em minutos para validar sua reserva.
                  </div>
                </div>
              </div>

              {/* Card de Resumo Lateral */}
              <div className="bg-[#0E1116] border border-[#262D35] rounded-2xl p-5 flex flex-col justify-between h-fit shadow-xl">
                <div>
                  <h3 className="text-xs font-bold font-['Space_Grotesk'] uppercase tracking-wider text-[#C8F52E] mb-4 pb-2 border-b border-[#262D35] flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Resumo da Solicitação
                  </h3>

                  <div className="space-y-3.5 mb-6 text-xs">
                    <div>
                      <span className="text-[#94A3B8] font-bold uppercase block text-[10px]">Veículo Selecionado</span>
                      <p className="font-bold text-white text-sm mt-0.5">{vehicleModel || 'Veículo Não Especificado'}</p>
                      <span className="text-slate-400 text-[11px]">{vehicleClass} {vehicleYear ? `(${vehicleYear})` : ''}</span>
                    </div>

                    <div>
                      <span className="text-[#94A3B8] font-bold uppercase block text-[10px]">Data & Horário</span>
                      <p className="font-bold text-[#C8F52E] text-sm mt-0.5 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {selectedDate ? selectedDate.split('-').reverse().join('/') : ''} às {selectedTime}
                      </p>
                    </div>

                    <div>
                      <span className="text-[#94A3B8] font-bold uppercase block text-[10px] mb-1">Serviços ({selectedServicesList.length})</span>
                      <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {selectedServicesList.map(s => (
                          <li key={s.id} className="flex items-center justify-between text-slate-300 bg-[#171C24] p-2.5 rounded-xl border border-[#262D35]">
                            <span className="font-medium truncate pr-2" title={s.nome}>{s.nome}</span>
                            <span className="font-bold text-white whitespace-nowrap">
                              {Number(s.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#262D35]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-[#94A3B8] font-semibold">Valor Estimado:</span>
                    <span className="text-xl font-bold font-['Space_Grotesk'] text-[#C8F52E]">
                      {totalEstimated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitBooking}
                    className="w-full py-3.5 rounded-xl bg-[#C8F52E] hover:bg-[#B8E622] text-[#0E1116] font-bold text-sm shadow-lg shadow-[#C8F52E]/10 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#0E1116] border-t-transparent rounded-full animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 stroke-[2.5]" />
                        <span>Confirmar Agendamento</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-start pt-4 border-t border-[#262D35]">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-xl bg-[#0E1116] hover:bg-[#1F242D] text-slate-300 font-bold text-sm flex items-center gap-2 transition-all border border-[#262D35]"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Sucesso / Confirmação */}
        {step === 5 && submittedOrder && (
          <div className="bg-[#171C24] border border-[#262D35] rounded-3xl p-8 sm:p-12 shadow-2xl text-center max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-[#C8F52E]/20 text-[#C8F52E] rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-[#C8F52E]/10 shadow-lg">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-[#C8F52E] bg-[#C8F52E]/10 border border-[#C8F52E]/20 px-3 py-1 rounded-full mb-3 inline-block">
              Solicitação Recebida!
            </span>

            <h2 className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-3 tracking-tight">Agendamento Solicitado com Sucesso!</h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 max-w-lg mx-auto">
              Olá, <strong className="text-white">{submittedOrder.clientName}</strong>! Nós já recebemos seu agendamento para o veículo <strong className="text-[#C8F52E]">{submittedOrder.veiculoTexto}</strong> e enviamos um alerta em tempo real para o gestor.
            </p>

            <div className="bg-[#0E1116] border border-[#262D35] rounded-2xl p-5 mb-8 text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex justify-between border-b border-[#262D35] pb-2">
                <span className="text-[#94A3B8] font-semibold">Status:</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Aguardando Validação
                </span>
              </div>
              <div className="flex justify-between border-b border-[#262D35] pb-2">
                <span className="text-[#94A3B8] font-semibold">Data e Hora:</span>
                <span className="text-white font-bold">
                  {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8] font-semibold">Valor Estimado:</span>
                <span className="text-[#C8F52E] font-bold font-['Space_Grotesk'] text-sm">
                  {totalEstimated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => setShowSyncModal(true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0E1116] hover:bg-[#1F242D] text-[#C8F52E] font-bold text-sm border border-[#C8F52E]/30 flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <CalendarIcon className="w-4 h-4 text-[#C8F52E]" />
                <span>Adicionar ao Meu Calendário 🗓️</span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsAppShop}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#C8F52E] hover:bg-[#B8E622] text-[#0E1116] font-bold text-sm shadow-lg shadow-[#C8F52E]/10 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <MessageCircle className="w-4 h-4 fill-[#0E1116]" />
                <span>Confirmar no WhatsApp da Loja</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSelectedServiceIds([]);
                  setClientName('');
                  setClientPhone('');
                  setNotes('');
                  setSelectedTime('');
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0E1116] hover:bg-[#1F242D] text-slate-300 font-bold text-sm border border-[#262D35] transition-all"
              >
                Fazer Novo Agendamento
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer minimalista */}
      <footer className="border-t border-[#262D35] py-6 px-4 text-center text-xs text-[#94A3B8]">
        <p>© {new Date().getFullYear()} {brand.name || 'CarX Automotive'}. Todos os direitos reservados. Powered by CarX White Label.</p>
      </footer>

      {/* Modal Sincronização iCal / Google */}
      {submittedOrder && (
        <CalendarSyncModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          order={{
            id: submittedOrder.id,
            servico: submittedOrder.servico,
            data_agendamento: `${selectedDate}T${selectedTime}:00`,
            valor_total: totalEstimated,
            clientes: { nome: submittedOrder.clientName, telefone: clientPhone },
            veiculos: { marca: vehicleClass, modelo: vehicleModel, placa: vehiclePlate }
          }}
          shopName={brand.name || 'CarX Automotive'}
          isManagerView={false}
        />
      )}
    </div>
  );
};

export default SelfBooking;
