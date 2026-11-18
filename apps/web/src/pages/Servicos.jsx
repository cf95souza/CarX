import React, { useState } from 'react';
import { Plus, Search, Wrench, ShieldCheck, MoreHorizontal, DollarSign, Loader2, Type, Car, Trash2, X, Zap, AlertCircle, Clock, Percent, Sparkles, Check } from 'lucide-react';
import { useCatalog, useInventory } from '../hooks/useData';
import Pagination from '../components/ui/Pagination';
import { toast } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';

const ServicosView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formService, setFormService] = useState({
    nome: '',
    descricao: '',
    preco_base: '',
    categoria: 'Geral',
    tipo_veiculo: 'AMBOS',
    garantia: '12 meses',
    tempo_estimado: 60,
    comissao_percent: 10,
    controle_estoque: false,
    materiais: [],
    precos_por_classe: {},
    is_combo: false,
    itens_combo: []
  });

  const { inventory } = useInventory();

  const { services, loading, saveService, updateService, deleteService } = useCatalog();

  const handleOpenEdit = (service) => {
    setEditingService(service);
    const rawWarranty = service.warranty_months !== undefined ? Number(service.warranty_months) : (Number(service.garantia) || 12);
    let initialGarantia = '12 meses';
    if (rawWarranty === 0) initialGarantia = 'Sem garantia';
    else if (rawWarranty === 24) initialGarantia = '2 anos';
    else if (rawWarranty === 60) initialGarantia = '5 anos';
    else initialGarantia = `${rawWarranty} meses`;

    setFormService({
      nome: service.nome || service.name || '',
      descricao: service.descricao || service.description || '',
      preco_base: service.preco_base !== undefined ? service.preco_base : (service.price_cents ? service.price_cents / 100 : ''),
      categoria: service.categoria || service.category || 'Geral',
      tipo_veiculo: service.tipo_veiculo || service.segment || 'AMBOS',
      garantia: initialGarantia,
      tempo_estimado: service.tempo_estimado || service.estimated_minutes || 60,
      comissao_percent: service.comissao_percent !== undefined ? service.comissao_percent : (service.material_consumption_estimate?.comissao_percent ?? 10),
      controle_estoque: service.controle_estoque || false,
      materiais: service.materiais || [],
      precos_por_classe: service.precos_por_classe || {},
      is_combo: service.is_combo || false,
      itens_combo: service.itens_combo || []
    });
    setShowAddModal(true);
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const cleanedPrecos = {};
    if (formService.precos_por_classe) {
      Object.entries(formService.precos_por_classe).forEach(([key, val]) => {
        const num = parseFloat(val);
        if (num && num > 0) {
          cleanedPrecos[key] = num;
        }
      });
    }

    const garStr = String(formService.garantia || '').toLowerCase().trim();
    let computedWarrantyMonths = 0;
    if (!garStr.includes('sem') && garStr !== '0') {
      const num = parseInt(garStr.replace(/\D/g, ''), 10) || 0;
      computedWarrantyMonths = garStr.includes('ano') ? num * 12 : num;
    }

    const serviceData = {
      ...formService,
      name: formService.nome,
      description: formService.descricao,
      category: formService.categoria,
      segment: formService.tipo_veiculo,
      preco_base: parseFloat(formService.preco_base) || 0,
      price_cents: Math.round((parseFloat(formService.preco_base) || 0) * 100),
      estimated_minutes: parseInt(formService.tempo_estimado, 10) || 60,
      warranty_months: computedWarrantyMonths,
      garantia: formService.garantia,
      precos_por_classe: cleanedPrecos,
      comissao_percent: parseFloat(formService.comissao_percent) || 0,
      material_consumption_estimate: {
        comissao_percent: parseFloat(formService.comissao_percent) || 0,
        materiais: formService.materiais || []
      },
      is_combo: formService.is_combo || false,
      itens_combo: formService.is_combo ? (formService.itens_combo || []) : []
    };

    let res;
    if (editingService) {
      res = await updateService(editingService.id, serviceData);
    } else {
      res = await saveService(serviceData);
    }

    setIsSaving(false);
    if (res.success) {
      toast.success(editingService ? 'Serviço atualizado com sucesso!' : 'Novo serviço adicionado ao catálogo!');
      setShowAddModal(false);
      setEditingService(null);
      setFormService({ nome: '', descricao: '', preco_base: '', categoria: 'Geral', tipo_veiculo: 'AMBOS', garantia: '12 meses', tempo_estimado: 60, comissao_percent: 10, controle_estoque: false, materiais: [], precos_por_classe: {}, is_combo: false, itens_combo: [] });
    }
  };

  const handleOpenAdd = () => {
     setEditingService(null);
     setFormService({ nome: '', descricao: '', preco_base: '', categoria: 'Geral', tipo_veiculo: 'AMBOS', garantia: '12 meses', tempo_estimado: 60, comissao_percent: 10, controle_estoque: false, materiais: [], precos_por_classe: {}, is_combo: false, itens_combo: [] });
     setShowAddModal(true);
  };

  const filteredServices = services.filter(s => 
    (s.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.categoria || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans text-[#0E1116]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0E1116] tracking-tight">Catálogo de Serviços & Combos</h1>
          <p className="text-sm text-[#5B6674] mt-0.5">Preços por porte de veículo, tempo estimado de aplicação e garantia certificada.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="carx-btn-volt"
        >
          <Plus size={18} /> Novo Serviço
        </button>
      </div>

      <div className="relative w-full">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6674]" />
        <input 
          type="text" 
          placeholder="Buscar serviço por nome ou categoria..." 
          className="w-full pl-11 pr-4 py-3 bg-white border border-[#E1E6EC] rounded-xl outline-none focus:border-[#0E1116] transition-all text-sm font-medium text-[#0E1116] placeholder:text-[#5B6674]"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredServices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((s) => (
          <div key={s.id} className="carx-card p-6 flex flex-col justify-between hover:border-[#0E1116] transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F3F5F7] flex items-center justify-center text-[#0E1116] border border-[#E1E6EC]">
                  <Wrench size={22} />
                </div>
                <div>
                  <h4 className="font-display font-bold text-[#0E1116] text-base leading-tight">{s.nome}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-2 py-0.5 rounded-md">{s.categoria || 'Geral'}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${
                      s.tipo_veiculo === 'MOTO' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                      s.tipo_veiculo === 'CARRO' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {s.tipo_veiculo === 'MOTO' ? 'Moto' : s.tipo_veiculo === 'CARRO' ? 'Carro' : 'Ambos'}
                    </span>
                    {s.is_combo && (
                      <span className="text-[8px] font-black uppercase tracking-[0.1em] text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                        🎁 Combo ({s.itens_combo?.length || 0} itens)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative">
                <button 
                  onClick={async () => {
                    const confirm = await confirmDialog(
                      'Excluir Serviço',
                      `Tem certeza que deseja remover "${s.nome}" do catálogo?`,
                      'Excluir',
                      'Cancelar'
                    );
                    if (confirm) {
                      const res = await deleteService(s.id);
                      if (res.success) {
                        toast.success('Serviço excluído!');
                      } else {
                        toast.error('Erro ao excluir serviço.');
                      }
                    }
                  }}
                  className="text-slate-300 hover:text-rose-600 p-2 transition-colors rounded-full hover:bg-rose-50"
                  title="Excluir Serviço"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-slate-500 mb-8 line-clamp-3 font-medium leading-relaxed italic">{s.descricao || 'Sem descrição cadastrada.'}</p>
            
            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <div className="flex flex-wrap items-center gap-5 sm:gap-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 items-center flex gap-1">
                    <ShieldCheck size={12} className="text-emerald-500" /> Garantia
                  </span>
                  <span className="text-xs font-bold text-slate-700">{s.garantia ? `${s.garantia}` : 'Consultar'}</span>
                </div>

                <div className="flex flex-col border-l border-slate-100 pl-5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 items-center flex gap-1">
                    <Clock size={12} className="text-amber-500" /> Tempo Estimado
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {s.tempo_estimado || s.estimated_minutes ? `${s.tempo_estimado || s.estimated_minutes} min` : '60 min'}
                  </span>
                </div>
                
                {s.controle_estoque && (
                  <div className="flex flex-col border-l border-slate-100 pl-5">
                     <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 items-center flex gap-1">
                      <ShieldCheck size={12} className="text-blue-500" /> Estoque
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest mt-0.5">Controlado</span>
                  </div>
                )}
                
                <div className="flex flex-col border-l border-slate-100 pl-5">
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 items-center flex gap-1">
                    <DollarSign size={12} className="text-emerald-600" /> Investimento
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-black text-slate-900 tracking-tight font-mono">
                      {s.preco_base ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.preco_base) : '---'}
                    </span>
                    {s.precos_por_classe && Object.keys(s.precos_por_classe).length > 0 && (
                      <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded shadow-sm" title="Preços dinâmicos ativos por porte de veículo">
                        ⚡ {Object.keys(s.precos_por_classe).length} {Object.keys(s.precos_por_classe).length === 1 ? 'Porte' : 'Portes'}
                      </span>
                    )}
                    {(() => {
                      if (!s.is_combo || !s.itens_combo?.length) return null;
                      const somaAvulso = s.itens_combo.reduce((acc, id) => {
                        const srv = services.find(x => x.id === id);
                        return acc + (Number(srv?.preco_base) || 0);
                      }, 0);
                      if (somaAvulso > s.preco_base && s.preco_base > 0) {
                        const perc = Math.round(((somaAvulso - s.preco_base) / somaAvulso) * 100);
                        return (
                          <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded shadow-sm" title={`Valor avulso: R$ ${somaAvulso.toLocaleString('pt-BR')}`}>
                            🔥 {perc}% OFF
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleOpenEdit(s)}
                className="text-xs font-bold text-slate-800 hover:text-emerald-600 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-emerald-500/40 transition-colors shrink-0"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
        {filteredServices.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-30">
            <Wrench size={48} className="mx-auto mb-3" />
            <p className="font-black uppercase tracking-widest text-xs">Nenhum serviço no catálogo</p>
          </div>
        )}
      </div>
      <Pagination 
        currentPage={currentPage}
        totalItems={filteredServices.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        className="rounded-[2rem] border border-slate-100 mt-4 shadow-sm"
      />

      {/* Modal - Novo Serviço / Edição (CarX Dark Card Design System) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0E1116]/80 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#171C24] border border-[#2E3744] text-[#F2F5F8] rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header Fixo */}
            <div className="p-5 sm:p-6 border-b border-[#2E3744] flex justify-between items-center bg-[#171C24] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0E1116] border border-[#2E3744] flex items-center justify-center text-[#C8F52E]">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
                    {editingService ? 'Editar Serviço' : 'Cadastrar Serviço'}
                  </h3>
                  <p className="text-xs text-[#9AA7B8]">
                    Catálogo técnico de estética, prazos, comissão e precificação
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="w-9 h-9 rounded-xl bg-[#0E1116] border border-[#2E3744] flex items-center justify-center text-[#9AA7B8] hover:text-white hover:border-[#C8F52E] transition-all"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Conteúdo Rolável */}
            <form onSubmit={handleAddService} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nome do Serviço */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9AA7B8]">
                    Nome do Serviço <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Wrench className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6674]" size={16} />
                    <input 
                      required 
                      className="w-full pl-10 pr-4 py-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-sm font-medium focus:border-[#C8F52E] focus:outline-none transition-colors placeholder:text-[#5B6674]" 
                      placeholder="Ex: PPF Frontal Completo ou Vitrificação 9H"
                      value={formService.nome}
                      onChange={e => setFormService({...formService, nome: e.target.value})}
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9AA7B8]">Categoria</label>
                  <div className="relative">
                    <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6674]" size={16} />
                    <select 
                      className="w-full pl-10 pr-4 py-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-sm font-medium focus:border-[#C8F52E] focus:outline-none transition-colors appearance-none cursor-pointer"
                      value={formService.categoria}
                      onChange={e => setFormService({...formService, categoria: e.target.value})}
                    >
                      <option value="Geral">Geral</option>
                      <option value="PPF">PPF (Proteção de Pintura)</option>
                      <option value="Estética">Estética & Polimento</option>
                      <option value="Insulfilm">Insulfilm & Películas</option>
                      <option value="Adesivagem">Adesivagem & Envelopamento</option>
                      <option value="Lavagem Técnica">Lavagem Técnica & Higienização</option>
                    </select>
                  </div>
                </div>

                {/* Veículos Compatíveis */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9AA7B8]">Veículos Compatíveis</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-[#0E1116] p-1 rounded-xl border border-[#2E3744]">
                    {[
                      { val: 'AMBOS', label: 'Ambos' },
                      { val: 'CARRO', label: 'Carro' },
                      { val: 'MOTO', label: 'Moto' }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setFormService({...formService, tipo_veiculo: opt.val})}
                        className={`py-2 text-xs font-bold rounded-lg transition-all ${
                          formService.tipo_veiculo === opt.val
                            ? 'bg-[#C8F52E] text-[#0E1116] shadow-sm'
                            : 'text-[#9AA7B8] hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tempo Estimado de Aplicação (Tátil Moderno) */}
                <div className="space-y-2 md:col-span-2 bg-[#0E1116] border border-[#2E3744] rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Clock size={15} className="text-[#C8F52E]" /> Tempo Estimado de Aplicação
                    </label>
                    <span className="text-xs font-mono font-bold text-[#C8F52E]">
                      {formService.tempo_estimado} minutos ({Math.floor(formService.tempo_estimado / 60)}h {formService.tempo_estimado % 60 > 0 ? `${formService.tempo_estimado % 60}m` : ''})
                    </span>
                  </div>
                  
                  {/* Atalhos táteis */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { min: 30, label: '30 min' },
                      { min: 60, label: '1 hora' },
                      { min: 120, label: '2 horas' },
                      { min: 240, label: '4 horas' },
                      { min: 480, label: '8 horas (1 dia)' },
                      { min: 960, label: '16 horas (2 dias)' }
                    ].map(t => (
                      <button
                        key={t.min}
                        type="button"
                        onClick={() => setFormService({...formService, tempo_estimado: t.min})}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          Number(formService.tempo_estimado) === t.min
                            ? 'bg-[#C8F52E]/10 border-[#C8F52E] text-[#C8F52E]'
                            : 'bg-[#171C24] border-[#2E3744] text-[#9AA7B8] hover:text-white hover:border-[#5B6674]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1">
                    <input 
                      type="number"
                      min="5"
                      step="5"
                      className="w-full px-3.5 py-2 bg-[#171C24] border border-[#2E3744] rounded-xl text-white text-xs font-mono font-bold focus:border-[#C8F52E] focus:outline-none transition-colors"
                      placeholder="Ou digite o tempo livre em minutos..."
                      value={formService.tempo_estimado}
                      onChange={e => setFormService({...formService, tempo_estimado: parseInt(e.target.value, 10) || ''})}
                    />
                  </div>
                </div>

                {/* Tempo de Garantia Certificada (Tátil Moderno) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9AA7B8] flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" /> Garantia Certificada
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Sem garantia', '3 meses', '6 meses', '12 meses', '2 anos', '5 anos'].map(g => {
                      const cur = String(formService.garantia || '').toLowerCase().trim();
                      const isSelected = g === 'Sem garantia'
                        ? (cur.includes('sem') || cur === '0' || cur === '')
                        : (
                            g.includes('ano')
                              ? (parseInt(g, 10) * 12 === (cur.includes('ano') ? parseInt(cur, 10) * 12 : parseInt(cur.replace(/\D/g, ''), 10)))
                              : (parseInt(g, 10) === (cur.includes('ano') ? parseInt(cur, 10) * 12 : parseInt(cur.replace(/\D/g, ''), 10)))
                          );

                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setFormService({...formService, garantia: g})}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-[#C8F52E]/10 border-[#C8F52E] text-[#C8F52E]'
                              : 'bg-[#0E1116] border-[#2E3744] text-[#9AA7B8] hover:text-white'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                  <input 
                    className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-xs font-medium focus:border-[#C8F52E] focus:outline-none transition-colors" 
                    placeholder="Ex: 12 meses"
                    value={formService.garantia}
                    onChange={e => setFormService({...formService, garantia: e.target.value})}
                  />
                </div>

                {/* Comissão do Operador / Técnico (Tátil Moderno) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9AA7B8] flex items-center gap-1.5">
                    <Percent size={14} className="text-[#C8F52E]" /> Comissão do Colaborador
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 5, 10, 15, 20].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormService({...formService, comissao_percent: c})}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                          Number(formService.comissao_percent) === c
                            ? 'bg-[#C8F52E]/10 border-[#C8F52E] text-[#C8F52E]'
                            : 'bg-[#0E1116] border-[#2E3744] text-[#9AA7B8] hover:text-white'
                        }`}
                      >
                        {c}%
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="w-full pl-3.5 pr-8 py-2.5 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-xs font-mono font-bold focus:border-[#C8F52E] focus:outline-none transition-colors"
                      placeholder="Percentual de comissão..."
                      value={formService.comissao_percent}
                      onChange={e => setFormService({...formService, comissao_percent: e.target.value})}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5B6674]">%</span>
                  </div>
                </div>

                {/* Preço Base (R$) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9AA7B8]">
                    Preço Base Padrão (R$) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-[#C8F52E] text-base">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      className="w-full pl-12 pr-4 py-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white font-mono font-bold text-base focus:border-[#C8F52E] focus:outline-none transition-colors placeholder:text-[#5B6674]" 
                      placeholder="0,00"
                      value={formService.preco_base}
                      onChange={e => setFormService({...formService, preco_base: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              {/* Descrição Detalhada */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#9AA7B8]">Detalhamento Técnico / Escopo</label>
                <textarea 
                  className="w-full h-24 px-4 py-3 bg-[#0E1116] border border-[#2E3744] rounded-xl text-white text-sm focus:border-[#C8F52E] focus:outline-none transition-colors resize-none placeholder:text-[#5B6674]" 
                  placeholder="Descreva as etapas, materiais inclusos e instruções de aplicação..."
                  value={formService.descricao}
                  onChange={e => setFormService({...formService, descricao: e.target.value})}
                />
              </div>

              {/* Seção de Preço Dinâmico por Porte (Dark Card) */}
              <div className="bg-[#0E1116] border border-[#2E3744] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#C8F52E] flex items-center gap-2">
                    <Zap size={15} /> Preço Diferenciado por Porte do Veículo (Opcional)
                  </label>
                </div>
                <p className="text-xs text-[#9AA7B8] leading-relaxed">
                  Defina valores específicos por categoria. Se deixado em branco, o sistema usará o <strong>Preço Base</strong> automaticamente.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  {['Hatch', 'Sedan', 'SUV', 'Pickup', 'Esportivo', 'Moto'].map((porte) => (
                    <div key={porte} className="space-y-1 bg-[#171C24] border border-[#2E3744] rounded-xl p-3">
                      <label className="text-[10px] font-bold text-[#9AA7B8] uppercase tracking-wider block">{porte}</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#5B6674]">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full pl-8 pr-2 py-1.5 bg-[#0E1116] border border-[#2E3744] rounded-lg text-white font-mono font-bold text-xs focus:border-[#C8F52E] focus:outline-none transition-colors"
                          placeholder="Base"
                          value={formService.precos_por_classe?.[porte] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormService({
                              ...formService,
                              precos_por_classe: {
                                ...(formService.precos_por_classe || {}),
                                [porte]: val
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção de Pacotes e Combos de Serviços */}
              <div className="bg-[#1a1528] border border-[#3b2b52] rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="is_combo" 
                    className="w-5 h-5 rounded text-purple-500 bg-[#0E1116] border-[#3b2b52] focus:ring-0 cursor-pointer"
                    checked={formService.is_combo || false}
                    onChange={(e) => setFormService({...formService, is_combo: e.target.checked, itens_combo: e.target.checked ? (formService.itens_combo || []) : []})}
                  />
                  <label htmlFor="is_combo" className="cursor-pointer select-none">
                    <span className="block text-sm font-bold text-purple-200">
                      🎁 Este Serviço é um Pacote / Combo Promocional?
                    </span>
                    <span className="block text-xs text-purple-300/70 mt-0.5">
                      Agrupa múltiplos serviços do catálogo com desconto especial.
                    </span>
                  </label>
                </div>

                {formService.is_combo && (
                  <div className="pt-3 border-t border-[#3b2b52] space-y-3 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-purple-200 uppercase tracking-wider block">
                      Selecione os Serviços Inclusos no Pacote:
                    </label>
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-[#3b2b52] bg-[#0E1116] p-2.5 rounded-xl">
                      {services.filter(s => s.id !== editingService?.id && !s.is_combo).length === 0 ? (
                        <p className="text-xs text-[#9AA7B8] py-2 text-center">Nenhum serviço avulso disponível para agrupar.</p>
                      ) : (
                        services.filter(s => s.id !== editingService?.id && !s.is_combo).map(srv => {
                          const isSelected = (formService.itens_combo || []).includes(srv.id);
                          return (
                            <div 
                              key={srv.id} 
                              onClick={() => {
                                const current = formService.itens_combo || [];
                                const next = isSelected ? current.filter(id => id !== srv.id) : [...current, srv.id];
                                setFormService({ ...formService, itens_combo: next });
                              }}
                              className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                isSelected ? 'bg-purple-900/40 border-purple-500 text-white font-bold' : 'bg-[#171C24] border-[#2E3744] hover:border-[#3b2b52] text-[#9AA7B8]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input 
                                  type="checkbox" 
                                  checked={isSelected} 
                                  onChange={() => {}} 
                                  className="w-4 h-4 rounded text-purple-500 border-[#2E3744] pointer-events-none" 
                                />
                                <div>
                                  <p className="text-xs text-white">{srv.nome}</p>
                                  <p className="text-[10px] text-[#9AA7B8] uppercase">{srv.categoria}</p>
                                </div>
                              </div>
                              <span className="text-xs font-mono font-bold text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(srv.preco_base || 0)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Seção de Controle de Estoque */}
              <div className="bg-[#101b2b] border border-[#1e3450] rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="controle_estoque" 
                    className="w-5 h-5 rounded text-blue-500 bg-[#0E1116] border-[#1e3450] focus:ring-0 cursor-pointer"
                    checked={formService.controle_estoque}
                    onChange={(e) => setFormService({...formService, controle_estoque: e.target.checked})}
                  />
                  <label htmlFor="controle_estoque" className="cursor-pointer select-none">
                    <span className="block text-sm font-bold text-blue-200">Habilitar Controle de Estoque de Insumos</span>
                    <span className="block text-xs text-blue-300/70 mt-0.5">Exige baixa obrigatória de material ou bobina na execução da OS.</span>
                  </label>
                </div>

                {formService.controle_estoque && (
                  <div className="pt-3 border-t border-[#1e3450] space-y-3 animate-in fade-in duration-200">
                    {(formService.materiais || []).map((mat, matIdx) => (
                      <div key={mat.id || matIdx} className="flex items-end gap-2.5">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Insumo do Almoxarifado</label>
                          <select 
                            className="w-full px-3 py-2 bg-[#0E1116] border border-[#1e3450] rounded-xl text-white text-xs font-medium focus:outline-none"
                            value={mat.material_id || ''}
                            onChange={e => {
                              const next = [...(formService.materiais || [])];
                              next[matIdx].material_id = e.target.value;
                              setFormService({ ...formService, materiais: next });
                            }}
                          >
                            <option value="">Selecione o Insumo...</option>
                            {inventory.map(inv => (
                              <option key={inv.id} value={inv.id}>{inv.nome} ({inv.quantidade} {inv.unidade})</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-20 space-y-1">
                          <label className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Qtd</label>
                          <input 
                            type="number" 
                            min="0.1" 
                            step="any"
                            className="w-full px-2.5 py-2 bg-[#0E1116] border border-[#1e3450] rounded-xl text-white text-xs font-bold text-center focus:outline-none"
                            value={mat.quantidade}
                            onChange={e => {
                              const next = [...(formService.materiais || [])];
                              next[matIdx].quantidade = e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
                              setFormService({ ...formService, materiais: next });
                            }}
                            placeholder="0"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const next = (formService.materiais || []).filter((_, i) => i !== matIdx);
                            setFormService({ ...formService, materiais: next });
                          }}
                          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}

                    <button 
                      type="button"
                      onClick={() => {
                        const next = [...(formService.materiais || []), { id: Date.now(), material_id: '', quantidade: '' }];
                        setFormService({ ...formService, materiais: next });
                      }}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={14} /> Adicionar Insumo Vinculado
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Rodapé Fixo */}
            <div className="p-4 sm:p-5 border-t border-[#2E3744] bg-[#171C24] shrink-0 flex items-center justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#9AA7B8] hover:text-white hover:bg-[#202734] transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddService}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#C8F52E] hover:bg-[#b8e520] active:scale-[0.98] text-[#0E1116] font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                <span>{editingService ? 'Atualizar Serviço' : 'Salvar no Catálogo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicosView;
