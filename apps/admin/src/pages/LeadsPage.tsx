import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { LeadDto, ConvertLeadDto } from '@carx/shared';
import { Pagination } from '../components/Pagination';
import {
  Users2,
  Phone,
  Mail,
  Building2,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

export function LeadsPage() {
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Conversão de Lead
  const [selectedLead, setSelectedLead] = useState<LeadDto | null>(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertData, setConvertData] = useState<ConvertLeadDto>({
    trade_name: '',
    slug: '',
    plan_slug: 'pro',
    is_trial: true,
  });

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listLeads();
      setLeads(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleOpenConvert = (lead: LeadDto) => {
    setSelectedLead(lead);
    const suggestedTradeName = lead.company_name || lead.name;
    const suggestedSlug = suggestedTradeName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    setConvertData({
      trade_name: suggestedTradeName,
      slug: suggestedSlug,
      plan_slug: 'pro',
      is_trial: true,
    });
    setConvertError(null);
    setConvertModalOpen(true);
  };

  const handleConfirmConvert = async () => {
    if (!selectedLead) return;
    if (!convertData.slug.trim()) {
      setConvertError('Slug do subdomínio é obrigatório.');
      return;
    }

    setConvertLoading(true);
    setConvertError(null);
    try {
      await adminApi.convertLead(selectedLead.id, convertData);
      setConvertModalOpen(false);
      loadLeads();
      alert(`Lead ${selectedLead.name} convertido com sucesso em oficina cliente!`);
    } catch (err: unknown) {
      setConvertError(err instanceof Error ? err.message : 'Falha ao converter lead');
    } finally {
      setConvertLoading(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    return (
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.company_name && l.company_name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-info/10 text-semantic-info border border-semantic-info/20">
            Novo
          </span>
        );
      case 'contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-alert/10 text-semantic-alert border border-semantic-alert/20">
            Contatado
          </span>
        );
      case 'qualified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-volt/10 text-volt border border-volt/20">
            Qualificado
          </span>
        );
      case 'converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-success/10 text-semantic-success border border-semantic-success/20">
            <CheckCircle2 size={10} /> Convertido
          </span>
        );
      case 'lost':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/10 text-muted border border-muted/20">
            Perdido
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-aco/40">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Funil de Leads & Prospecção
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Interessados captados pela landing page comercial prontos para conversão em oficina.
          </p>
        </div>

        <button
          onClick={loadLeads}
          disabled={loading}
          className="px-3 py-2 bg-grafite hover:bg-aco border border-aco rounded-btn text-xs font-medium text-texto flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-grafite border border-aco/50 rounded-card p-4">
        <div className="max-w-md relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nome, email ou empresa..."
            className="w-full pl-9 pr-3.5 py-2 bg-asfalto/80 border border-aco rounded-input text-xs text-texto placeholder:text-muted/60 focus:outline-none focus:border-volt transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-card bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadLeads} className="underline font-semibold ml-2">
            Recarregar
          </button>
        </div>
      )}

      {/* Tabela de Leads */}
      <div className="bg-grafite border border-aco/50 rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aco/40 bg-asfalto/50 text-muted uppercase font-semibold text-[10px]">
                <th className="py-3 px-4">Nome do Contato</th>
                <th className="py-3 px-4">Empresa / Oficina</th>
                <th className="py-3 px-4">Contato (Email & Tel)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Data Captação</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/20">
              {loading && leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="w-6 h-6 border-2 border-volt/20 border-t-volt rounded-full animate-spin mx-auto mb-2" />
                    Carregando leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <Users2 size={32} className="mx-auto text-muted/40 mb-2" />
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : (
                filteredLeads
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((lead) => (
                  <tr key={lead.id} className="hover:bg-aco/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">{lead.name}</div>
                      {lead.notes && (
                        <div className="text-[11px] text-muted italic truncate max-w-xs">
                          "{lead.notes}"
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-texto">
                        {lead.company_name || 'Particular / Não informado'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-texto">
                        <Mail size={12} className="text-muted" />
                        <span>{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-muted text-[11px] mt-0.5">
                          <Phone size={11} className="text-volt" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(lead.status)}
                    </td>

                    <td className="py-3.5 px-4 text-center text-muted text-[11px]">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {lead.status !== 'converted' ? (
                        <button
                          onClick={() => handleOpenConvert(lead)}
                          className="px-3 py-1.5 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-[11px] inline-flex items-center gap-1.5 transition-all shadow-sm shadow-volt/20"
                        >
                          <Sparkles size={13} />
                          <span>Converter</span>
                        </button>
                      ) : (
                        <span className="text-semantic-success text-[11px] font-semibold flex items-center gap-1 justify-end">
                          <CheckCircle2 size={13} /> Convertido
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredLeads.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredLeads.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 15, 25, 50, 100]}
          />
        )}
      </div>

      {/* Modal de Conversão de Lead */}
      {convertModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-asfalto/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-grafite border border-aco rounded-modal p-6 shadow-2xl relative">
            <button
              onClick={() => setConvertModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-texto p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-volt/10 border border-volt/30 text-volt flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Converter Lead em Oficina
                </h3>
                <p className="text-xs text-muted">
                  Crie o tenant para <strong>{selectedLead.name}</strong> instantaneamente.
                </p>
              </div>
            </div>

            {convertError && (
              <div className="mb-4 p-3 rounded-btn bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs">
                {convertError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  Nome da Oficina (Trade Name)
                </label>
                <input
                  type="text"
                  required
                  value={convertData.trade_name}
                  onChange={(e) => setConvertData({ ...convertData, trade_name: e.target.value })}
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto focus:outline-none focus:border-volt"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  Slug / Subdomínio
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={convertData.slug}
                    onChange={(e) => setConvertData({ ...convertData, slug: e.target.value })}
                    className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-volt font-mono focus:outline-none focus:border-volt"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[11px] pointer-events-none">
                    .carx.com.br
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                  Plano Escolhido
                </label>
                <select
                  value={convertData.plan_slug}
                  onChange={(e) => setConvertData({ ...convertData, plan_slug: e.target.value })}
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto focus:outline-none focus:border-volt"
                >
                  <option value="start">Start (R$ 69,90/mês)</option>
                  <option value="pro">Pro (R$ 149,90/mês)</option>
                  <option value="prime">Prime (R$ 299,90/mês)</option>
                  <option value="enterprise">Enterprise (R$ 599,90/mês)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between p-2.5 rounded-btn bg-asfalto/60 border border-aco/30 text-xs">
                <span className="text-texto font-medium">Conceder 14 dias de Trial?</span>
                <input
                  type="checkbox"
                  checked={convertData.is_trial}
                  onChange={(e) => setConvertData({ ...convertData, is_trial: e.target.checked })}
                  className="w-4 h-4 accent-volt rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setConvertModalOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-texto"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConvert}
                  disabled={convertLoading}
                  className="px-4 py-2 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-xs flex items-center gap-1.5 transition-all shadow-md shadow-volt/20 disabled:opacity-50"
                >
                  {convertLoading ? (
                    <div className="w-4 h-4 border-2 border-asfalto/30 border-t-asfalto rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Confirmar Conversão</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

