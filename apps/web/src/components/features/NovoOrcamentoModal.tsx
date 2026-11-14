import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Button, Input, Card, Badge } from '@carx/ui';
import {
  X,
  User,
  Car,
  Wrench,
  DollarSign,
  Plus,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';

export interface NovoOrcamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (order: any) => void;
  initialCustomerId?: string;
}

function formatBRL(reais: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reais || 0);
}

export const NovoOrcamentoModal: React.FC<NovoOrcamentoModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialCustomerId,
}) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<number>(initialCustomerId ? 2 : 1);

  // Estados Passo 1: Cliente
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientDoc, setNewClientDoc] = useState('');

  // Estados Passo 2: Veículo
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newSizeClass, setNewSizeClass] = useState('Sedan');

  // Estados Passo 3: Serviços
  const [selectedServices, setSelectedServices] = useState<
    Array<{
      id: string;
      name: string;
      unitPriceCents: number;
      quantity: number;
      estimatedMinutes: number;
      warrantyMonths: number;
    }>
  >([]);

  // Estados Passo 4: Resumo e Agendamento
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [notes, setNotes] = useState<string>('');
  const [depositAmountReais, setDepositAmountReais] = useState<string>('');
  const [depositMethod, setDepositMethod] = useState<string>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Queries
  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers-list', clientSearch],
    queryFn: () => api.customers.list(clientSearch || undefined),
    enabled: isOpen && step === 1,
  });

  const { data: vehiclesData, isLoading: loadingVehicles, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles-list', selectedClient?.id],
    queryFn: () => api.vehicles.list(selectedClient?.id),
    enabled: isOpen && !!selectedClient?.id && step === 2,
  });

  const { data: catalogData, isLoading: loadingCatalog } = useQuery({
    queryKey: ['catalog-services'],
    queryFn: () => api.catalog.getServices(),
    enabled: isOpen && step === 3,
  });

  const customersList = useMemo(() => {
    if (!customersData) return [];
    return Array.isArray(customersData) ? customersData : (customersData as any).customers || [];
  }, [customersData]);

  const vehiclesList = useMemo(() => {
    if (!vehiclesData) return [];
    return Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData as any).vehicles || [];
  }, [vehiclesData]);

  const catalogServices = useMemo(() => {
    if (!catalogData) return [];
    return Array.isArray(catalogData) ? catalogData : (catalogData as any).services || [];
  }, [catalogData]);

  // Cálculos Financeiros
  const subtotalCents = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + s.unitPriceCents * s.quantity, 0);
  }, [selectedServices]);

  const discountCents = useMemo(() => {
    if (discountPercent <= 0) return 0;
    return Math.round((subtotalCents * discountPercent) / 100);
  }, [subtotalCents, discountPercent]);

  const totalCents = useMemo(() => {
    return Math.max(0, subtotalCents - discountCents);
  }, [subtotalCents, discountCents]);

  const depositCents = useMemo(() => {
    const parsed = parseFloat(depositAmountReais.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  }, [depositAmountReais]);

  if (!isOpen) return null;

  // Ações de Criação Rápida
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) {
      setErrorMessage('Nome e Telefone são campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.customers.create({
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: newClientEmail.trim() || undefined,
        document: newClientDoc.trim() || undefined,
      });

      setSelectedClient(res);
      setShowNewClientForm(false);
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao cadastrar cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim() || !newBrand.trim() || !newModel.trim()) {
      setErrorMessage('Placa, Marca e Modelo são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.vehicles.create({
        customerId: selectedClient.id,
        plate: newPlate.toUpperCase().trim(),
        brand: newBrand.trim(),
        model: newModel.trim(),
        color: newColor.trim() || undefined,
        sizeClass: newSizeClass,
      });

      setSelectedVehicle(res);
      setShowNewVehicleForm(false);
      await refetchVehicles();
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao cadastrar veículo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleService = (service: any) => {
    const exists = selectedServices.find((s) => s.id === service.id);
    if (exists) {
      setSelectedServices(selectedServices.filter((s) => s.id !== service.id));
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          id: service.id,
          name: service.name,
          unitPriceCents: service.basePriceCents || 0,
          quantity: 1,
          estimatedMinutes: service.estimatedMinutes || 60,
          warrantyMonths: service.warrantyMonths || 3,
        },
      ]);
    }
  };

  const handleFinalSubmit = async (initialStatus: 'QUOTE' | 'APPROVED') => {
    if (!selectedClient?.id || !selectedVehicle?.id || selectedServices.length === 0) {
      setErrorMessage('Selecione o cliente, o veículo e ao menos 1 serviço.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Monta datetime de agendamento se fornecido
      let scheduledAt: string | undefined = undefined;
      if (scheduledDate) {
        scheduledAt = `${scheduledDate}T${scheduledTime || '09:00'}:00.000Z`;
      }

      // 2. Criação da OS via endpoint oficial Fastify com itens e desconto
      const mappedItems = selectedServices.map((s) => ({
        serviceId: s.id,
        name: s.name,
        unitPriceCents: s.unitPriceCents,
        quantity: s.quantity,
        estimatedMinutes: s.estimatedMinutes,
        warrantyMonths: s.warrantyMonths,
      }));

      const payload = {
        customerId: selectedClient.id,
        vehicleId: selectedVehicle.id,
        notes: notes.trim() || undefined,
        scheduledAt,
        discountCents,
        items: mappedItems,
        services: mappedItems,
      };

      const createdWo = await api.workOrders.create(payload as any);

      // 3. Se status inicial for APPROVED e veio como QUOTE, atualiza status
      if (initialStatus === 'APPROVED' && createdWo.status === 'QUOTE') {
        await api.workOrders.updateStatus(createdWo.id, 'APPROVED', 'Aprovado na criação');
      }

      // 4. Se houver sinal/adiantamento registrado
      if (depositCents > 0 && createdWo.id) {
        try {
          await api.payments.create(createdWo.id, {
            amountCents: depositCents,
            method: depositMethod,
            notes: 'Adiantamento (Sinal) na abertura da OS',
          });
        } catch (payErr) {
          console.warn('Aviso: OS criada, falha ao computar sinal:', payErr);
        }
      }

      // Invalida cache de ordens para atualizar o Pátio ao Vivo instantaneamente
      queryClient.invalidateQueries({ queryKey: ['dashboard-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });

      if (onCreated) {
        onCreated(createdWo);
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao emitir ordem de serviço.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-asfalto/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <Card className="bg-grafite border-aco w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] p-0 font-body">
        {/* Header do Wizard */}
        <div className="p-6 bg-aco/50 border-b border-linha flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-volt/10 border border-volt/20 flex items-center justify-center text-volt">
              <Plus size={22} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-texto">
                Nova Ordem de Serviço & Orçamento
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step === s
                          ? 'bg-volt text-asfalto'
                          : step > s
                          ? 'bg-volt/20 text-volt'
                          : 'bg-aco text-muted'
                      }`}
                    >
                      {step > s ? '✓' : s}
                    </span>
                    {s < 4 && <div className="w-4 h-0.5 bg-linha" />}
                  </div>
                ))}
                <span className="text-[11px] text-muted font-medium ml-2">
                  Passo {step} de 4
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-texto p-1.5 rounded-lg hover:bg-aco transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mensagem de Erro Geral */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-error/10 border border-error/30 text-error text-xs rounded-input flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Conteúdo Dinâmico por Passo */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* ========================================================================= */}
          {/* PASSO 1: SELEÇÃO / CADASTRO DE CLIENTE                                    */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-sm font-bold text-texto">
                    Identificação do Cliente
                  </h4>
                  <p className="text-xs text-muted">
                    Selecione um cliente cadastrado ou adicione rapidamente um novo.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewClientForm(!showNewClientForm)}
                  leftIcon={<Plus size={14} />}
                >
                  {showNewClientForm ? 'Buscar Existente' : 'Novo Cliente'}
                </Button>
              </div>

              {!showNewClientForm ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome, telefone ou CPF..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full h-11 pl-9 pr-4 bg-aco/50 border border-linha rounded-input text-xs text-texto placeholder:text-muted focus:outline-none focus:border-volt"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-linha border border-linha rounded-card bg-aco/20">
                    {loadingCustomers ? (
                      <p className="p-4 text-center text-xs text-muted animate-pulse">
                        Carregando clientes...
                      </p>
                    ) : customersList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted">
                        Nenhum cliente localizado. Clique em "+ Novo Cliente" para cadastrar.
                      </div>
                    ) : (
                      customersList.map((c: any) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedClient(c);
                            setStep(2);
                          }}
                          className={`p-3.5 flex items-center justify-between hover:bg-aco/50 cursor-pointer transition-colors ${
                            selectedClient?.id === c.id ? 'bg-volt/10 border-l-2 border-volt' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-aco flex items-center justify-center text-muted">
                              <User size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-texto">{c.name}</p>
                              <p className="text-[11px] text-muted font-mono">{c.phone || c.email}</p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-muted" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateCustomer} className="space-y-3 bg-aco/30 p-4 rounded-card border border-linha">
                  <Input
                    label="Nome Completo *"
                    required
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silveira"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="WhatsApp / Telefone *"
                      required
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="(11) 99999-8888"
                    />
                    <Input
                      label="E-mail (opcional)"
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <Input
                    label="CPF ou CNPJ (opcional)"
                    value={newClientDoc}
                    onChange={(e) => setNewClientDoc(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                  <div className="pt-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewClientForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="volt" size="sm" isLoading={isSubmitting}>
                      Salvar Cliente e Avançar
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASSO 2: VEÍCULO DO CLIENTE                                               */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-sm font-bold text-texto">
                    Veículo de {selectedClient?.name}
                  </h4>
                  <p className="text-xs text-muted">
                    Selecione o veículo para aplicação dos serviços ou cadastre um novo.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewVehicleForm(!showNewVehicleForm)}
                  leftIcon={<Plus size={14} />}
                >
                  {showNewVehicleForm ? 'Ver Existentes' : 'Novo Veículo'}
                </Button>
              </div>

              {!showNewVehicleForm ? (
                <div className="space-y-3">
                  <div className="max-h-60 overflow-y-auto divide-y divide-linha border border-linha rounded-card bg-aco/20">
                    {loadingVehicles ? (
                      <p className="p-4 text-center text-xs text-muted animate-pulse">
                        Carregando veículos...
                      </p>
                    ) : vehiclesList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted">
                        Nenhum veículo vinculado a este cliente. Cadastre o primeiro veículo abaixo.
                      </div>
                    ) : (
                      vehiclesList.map((v: any) => (
                        <div
                          key={v.id}
                          onClick={() => {
                            setSelectedVehicle(v);
                            setStep(3);
                          }}
                          className={`p-3.5 flex items-center justify-between hover:bg-aco/50 cursor-pointer transition-colors ${
                            selectedVehicle?.id === v.id ? 'bg-volt/10 border-l-2 border-volt' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-aco flex items-center justify-center text-volt">
                              <Car size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-texto">
                                {v.brand} {v.model}
                              </p>
                              <p className="text-[11px] text-muted font-mono">
                                Placa: {v.plate} · Porte: {v.sizeClass || 'Sedan'}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-muted" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateVehicle} className="space-y-3 bg-aco/30 p-4 rounded-card border border-linha">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Placa *"
                      required
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                      placeholder="ABC1D23"
                    />
                    <Input
                      label="Marca *"
                      required
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="Ex: BMW"
                    />
                    <Input
                      label="Modelo *"
                      required
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="Ex: M3 Competition"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Cor do Veículo"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      placeholder="Ex: Preto Fosco / Cinza Nardo"
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Porte do Veículo
                      </label>
                      <select
                        value={newSizeClass}
                        onChange={(e) => setNewSizeClass(e.target.value)}
                        className="h-12 px-3 rounded-input bg-aco/60 border border-linha text-texto text-sm focus:outline-none focus:border-volt"
                      >
                        <option value="Hatch">Hatch / Compacto</option>
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV / Crossover</option>
                        <option value="Pickup">Picape Grande</option>
                        <option value="Esportivo">Esportivo / Supercar</option>
                        <option value="Moto">Motocicleta</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewVehicleForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="volt" size="sm" isLoading={isSubmitting}>
                      Salvar Veículo e Avançar
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASSO 3: SERVIÇOS DO CATÁLOGO                                             */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-sm font-bold text-texto">
                    Catálogo de Serviços da Oficina
                  </h4>
                  <p className="text-xs text-muted">
                    Selecione os serviços automotivos para este veículo.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted block">Subtotal</span>
                  <span className="font-display text-base font-bold text-volt font-mono">
                    {formatBRL(subtotalCents / 100)}
                  </span>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 border border-linha rounded-card p-3 bg-aco/20">
                {loadingCatalog ? (
                  <p className="p-4 text-center text-xs text-muted animate-pulse">
                    Carregando serviços...
                  </p>
                ) : catalogServices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted">
                    Nenhum serviço disponível no catálogo no momento.
                  </div>
                ) : (
                  catalogServices.map((service: any) => {
                    const isSelected = selectedServices.some((s) => s.id === service.id);
                    const priceReais = (service.basePriceCents || 0) / 100;
                    return (
                      <div
                        key={service.id}
                        onClick={() => toggleService(service)}
                        className={`p-3 rounded-input border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-volt/10 border-volt text-texto'
                            : 'bg-aco/40 border-linha text-muted hover:border-volt/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border text-xs ${
                              isSelected
                                ? 'bg-volt border-volt text-asfalto font-bold'
                                : 'border-linha bg-asfalto'
                            }`}
                          >
                            {isSelected && '✓'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-texto">{service.name}</p>
                            <span className="text-[11px] text-muted">
                              {service.category || 'Estética'} · {service.estimatedMinutes || 60} min
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs text-texto">
                          {formatBRL(priceReais)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASSO 4: RESUMO, AGENDAMENTO E SINAL                                      */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-4">
              <h4 className="font-display text-sm font-bold text-texto">
                Revisão e Condições Comerciais
              </h4>

              {/* Resumo de Cliente e Veículo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-aco/30 p-3.5 rounded-card border border-linha text-xs">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Cliente</span>
                  <span className="font-bold text-texto">{selectedClient?.name}</span>
                  <span className="text-muted block font-mono">{selectedClient?.phone}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Veículo</span>
                  <span className="font-bold text-texto">
                    {selectedVehicle?.brand} {selectedVehicle?.model}
                  </span>
                  <span className="text-volt block font-mono font-bold">{selectedVehicle?.plate}</span>
                </div>
              </div>

              {/* Agendamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Data Prevista de Início"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
                <Input
                  label="Horário Agendado"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>

              {/* Condições Financeiras: Desconto e Sinal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Desconto (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent === 0 ? '' : discountPercent}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setDiscountPercent(0);
                    } else {
                      const num = parseFloat(val);
                      setDiscountPercent(isNaN(num) ? 0 : Math.min(100, Math.max(0, num)));
                    }
                  }}
                  placeholder="0%"
                />
                <Input
                  label="Adiantamento (Sinal R$)"
                  type="text"
                  value={depositAmountReais}
                  onChange={(e) => setDepositAmountReais(e.target.value)}
                  placeholder="0,00"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Método do Sinal
                  </label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value)}
                    className="h-12 px-3 rounded-input bg-aco/60 border border-linha text-texto text-sm focus:outline-none focus:border-volt"
                  >
                    <option value="pix">PIX Instantâneo</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                    <option value="cash">Dinheiro em Espécie</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <Input
                label="Observações Internas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Cuidado especial com frisos e rodas diamantadas."
              />

              {/* Totalizadores Finais */}
              <div className="bg-asfalto p-4 rounded-card border border-linha space-y-1.5 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Subtotal dos Serviços ({selectedServices.length})</span>
                  <span className="font-mono text-texto">{formatBRL(subtotalCents / 100)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-alert">
                    <span>Desconto ({discountPercent}%)</span>
                    <span className="font-mono">-{formatBRL(discountCents / 100)}</span>
                  </div>
                )}
                {depositCents > 0 && (
                  <div className="flex justify-between text-info">
                    <span>Sinal / Adiantamento</span>
                    <span className="font-mono">-{formatBRL(depositCents / 100)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-linha flex justify-between items-center text-sm font-bold text-texto">
                  <span className="font-display">Valor Total da OS</span>
                  <span className="font-display text-lg text-volt font-mono font-black">
                    {formatBRL(totalCents / 100)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Navegação dos Passos */}
        <div className="p-5 bg-aco/40 border-t border-linha flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
                leftIcon={<ChevronLeft size={16} />}
              >
                Voltar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <Button
                variant="volt"
                size="desktop"
                onClick={() => {
                  if (step === 1 && !selectedClient) {
                    setErrorMessage('Selecione um cliente para prosseguir.');
                    return;
                  }
                  if (step === 2 && !selectedVehicle) {
                    setErrorMessage('Selecione um veículo para prosseguir.');
                    return;
                  }
                  if (step === 3 && selectedServices.length === 0) {
                    setErrorMessage('Selecione pelo menos um serviço.');
                    return;
                  }
                  setErrorMessage(null);
                  setStep(step + 1);
                }}
                rightIcon={<ChevronRight size={16} />}
              >
                Avançar Passo
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="desktop"
                  isLoading={isSubmitting}
                  onClick={() => handleFinalSubmit('QUOTE')}
                >
                  Salvar Orçamento
                </Button>
                <Button
                  variant="volt"
                  size="desktop"
                  isLoading={isSubmitting}
                  onClick={() => handleFinalSubmit('APPROVED')}
                  rightIcon={<Check size={18} />}
                >
                  Aprovar & Emitir OS
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NovoOrcamentoModal;

