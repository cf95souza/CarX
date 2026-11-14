import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../services/api';
import { AdminTenantSummaryDto, ImpersonateTenantResponse, ResetOwnerPasswordResponseDto } from '@carx/shared';
import { Pagination } from '../components/Pagination';
import {
  Building2,
  Search,
  Filter,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  PlusCircle,
  Eye,
  Lock,
  X,
  Clock,
  Layers,
  HardDrive,
  Key,
  Copy,
  Check,
} from 'lucide-react';

export function TenantsPage() {
  const [tenants, setTenants] = useState<AdminTenantSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modais
  const [selectedTenant, setSelectedTenant] = useState<AdminTenantSummaryDto | null>(null);
  const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [impersonateLoading, setImpersonateLoading] = useState(false);
  const [impersonateResult, setImpersonateResult] = useState<ImpersonateTenantResponse | null>(null);

  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendPassword, setSuspendPassword] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsServices, setDetailsServices] = useState<any[]>([]);
  const [detailsChecklists, setDetailsChecklists] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Redefinição de Senha do Gestor
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState<'generate' | 'manual'>('generate');
  const [resetPasswordManual, setResetPasswordManual] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<ResetOwnerPasswordResponseDto | null>(null);
  const [resetPasswordCopied, setResetPasswordCopied] = useState(false);
  const [resetPasswordMsgCopied, setResetPasswordMsgCopied] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  const handleOpenResetPassword = (tenant: AdminTenantSummaryDto) => {
    setSelectedTenant(tenant);
    setResetPasswordMode('generate');
    setResetPasswordManual('');
    setResetPasswordResult(null);
    setResetPasswordError(null);
    setResetPasswordCopied(false);
    setResetPasswordMsgCopied(false);
    setResetPasswordModalOpen(true);
  };

  const handleSubmitResetPassword = async () => {
    if (!selectedTenant) return;
    if (resetPasswordMode === 'manual' && resetPasswordManual.trim().length < 8) {
      setResetPasswordError('A senha manual deve conter no mínimo 8 caracteres.');
      return;
    }
    setResetPasswordLoading(true);
    setResetPasswordError(null);
    try {
      const res = await adminApi.resetOwnerPassword(selectedTenant.id, {
        new_password: resetPasswordMode === 'manual' ? resetPasswordManual.trim() : undefined,
      });
      setResetPasswordResult(res);
    } catch (err: any) {
      setResetPasswordError(err?.message || 'Falha ao redefinir senha do gestor.');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setResetPasswordCopied(true);
    setTimeout(() => setResetPasswordCopied(false), 2000);
  };

  const handleCopyWhatsAppMessage = (tenant: AdminTenantSummaryDto, result: ResetOwnerPasswordResponseDto) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `Olá ${result.owner_name}! Suas credenciais de acesso ao CarX da sua oficina (${tenant.trade_name}) foram atualizadas com sucesso:\n\n🔗 Acesso: ${baseUrl}/${tenant.slug}/login\n🌐 Mini-site: ${baseUrl}/${tenant.slug}\n📧 Login: ${result.owner_email}\n🔑 Senha: ${result.temporary_password}\n\nRecomendamos alterar a sua senha no primeiro acesso através das configurações do seu perfil.`;
    navigator.clipboard.writeText(text);
    setResetPasswordMsgCopied(true);
    setTimeout(() => setResetPasswordMsgCopied(false), 2000);
  };

  const handleOpenDetails = async (tenant: AdminTenantSummaryDto) => {
    setSelectedTenant(tenant);
    setDetailsModalOpen(true);
    setDetailsLoading(true);
    try {
      const [services, checklists] = await Promise.all([
        adminApi.getTenantServices(tenant.id).catch(() => []),
        adminApi.getTenantChecklists(tenant.id).catch(() => []),
      ]);
      setDetailsServices(services);
      setDetailsChecklists(checklists);
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listTenants({ search, status: statusFilter });
      setTenants(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao listar oficinas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadTenants();
  };

  // Impersonação
  const handleOpenImpersonate = (tenant: AdminTenantSummaryDto) => {
    setSelectedTenant(tenant);
    setImpersonateReason('');
    setImpersonateResult(null);
    setActionError(null);
    setImpersonateModalOpen(true);
  };

  const handleConfirmImpersonate = async () => {
    if (!selectedTenant) return;
    if (!impersonateReason.trim()) {
      setActionError('O motivo da impersonação é obrigatório para compliance e auditoria.');
      return;
    }

    setImpersonateLoading(true);
    setActionError(null);
    try {
      const result = await adminApi.impersonateTenant(selectedTenant.id, impersonateReason);
      setImpersonateResult(result);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao impersonar oficina');
    } finally {
      setImpersonateLoading(false);
    }
  };

  // Suspensão com Confirmação de Senha
  const handleOpenSuspend = (tenant: AdminTenantSummaryDto) => {
    setSelectedTenant(tenant);
    setSuspendReason('');
    setSuspendPassword('');
    setActionError(null);
    setSuspendModalOpen(true);
  };

  const handleConfirmSuspend = async () => {
    if (!selectedTenant) return;
    if (!suspendReason.trim()) {
      setActionError('O motivo da suspensão é obrigatório.');
      return;
    }
    if (!suspendPassword.trim()) {
      setActionError('Digite a sua senha de Super Admin para confirmar a suspensão.');
      return;
    }

    setSuspendLoading(true);
    setActionError(null);
    try {
      await adminApi.suspendTenant(selectedTenant.id, suspendReason);
      setSuspendModalOpen(false);
      loadTenants();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao suspender oficina');
    } finally {
      setSuspendLoading(false);
    }
  };

  // Reativação
  const handleReactivate = async (tenant: AdminTenantSummaryDto) => {
    if (!confirm(`Deseja realmente reativar a oficina "${tenant.trade_name}"?`)) return;
    try {
      await adminApi.reactivateTenant(tenant.id, 'Reativação solicitada pelo Super Admin');
      loadTenants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao reativar oficina');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-volt/10 text-volt border border-volt/20">
            <CheckCircle2 size={10} /> Ativa
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-alert/10 text-semantic-alert border border-semantic-alert/20">
            <Clock size={10} /> Trial
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-semantic-error/10 text-semantic-error border border-semantic-error/20">
            <ShieldAlert size={10} /> Suspensa
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/10 text-muted border border-muted/20">
            Cancelada
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-aco/40">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Oficinas Clientes
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Gestão multi-tenant das empresas cadastradas, limites operacionais, suspensões e impersonação auditada.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadTenants}
            disabled={loading}
            className="px-3 py-2 bg-grafite hover:bg-aco border border-aco rounded-btn text-xs font-medium text-texto flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>

          <Link
            to="/tenants/new"
            className="px-3.5 py-2 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-volt/20"
          >
            <PlusCircle size={15} />
            <span>Nova Oficina</span>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-grafite border border-aco/50 rounded-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou slug..."
            className="w-full pl-9 pr-3.5 py-2 bg-asfalto/80 border border-aco rounded-input text-xs text-texto placeholder:text-muted/60 focus:outline-none focus:border-volt transition-colors"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-muted font-medium flex items-center gap-1 mr-1">
            <Filter size={13} /> Status:
          </span>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'active', label: 'Ativas' },
            { id: 'trialing', label: 'Trials' },
            { id: 'suspended', label: 'Suspensas' },
            { id: 'cancelled', label: 'Canceladas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-volt text-asfalto font-semibold'
                  : 'bg-aco/40 text-muted hover:text-texto hover:bg-aco/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-card bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadTenants} className="underline font-semibold ml-2">
            Recarregar
          </button>
        </div>
      )}

      {/* Tabela de Oficinas */}
      <div className="bg-grafite border border-aco/50 rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aco/40 bg-asfalto/50 text-muted uppercase font-semibold text-[10px]">
                <th className="py-3 px-4">Oficina / Razão Social</th>
                <th className="py-3 px-4">Subdomínio & CNPJ</th>
                <th className="py-3 px-4">Plano</th>
                <th className="py-3 px-4 text-center">Unidades / Users</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aco/20">
              {loading && tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="w-6 h-6 border-2 border-volt/20 border-t-volt rounded-full animate-spin mx-auto mb-2" />
                    Carregando oficinas clientes...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <Building2 size={32} className="mx-auto text-muted/40 mb-2" />
                    Nenhuma oficina encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                tenants
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-aco/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">{tenant.trade_name}</div>
                      <div className="text-[11px] text-muted truncate max-w-xs">
                        {tenant.legal_name || tenant.email}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <a
                        href={`/${tenant.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-volt text-[11px] font-medium hover:underline"
                      >
                        /{tenant.slug}
                      </a>
                      <div className="text-[11px] text-muted">
                        {tenant.cnpj || 'CNPJ não informado'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-aco/50 border border-aco text-[11px] font-medium text-texto">
                        <Layers size={11} className="text-volt" />
                        <span>{tenant.plan_name || 'Personalizado'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center text-muted">
                      <span className="font-semibold text-white">{tenant.units_count}</span> un •{' '}
                      <span className="font-semibold text-white">{tenant.users_count}</span> users
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(tenant.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* Botão Impersonar */}
                        <button
                          onClick={() => handleOpenImpersonate(tenant)}
                          title="Acessar como Loja (Impersonação Auditada)"
                          className="px-2.5 py-1.5 rounded-btn bg-volt/10 hover:bg-volt/20 text-volt border border-volt/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <UserCheck size={13} />
                          <span>Acessar</span>
                        </button>

                        {/* Botão Redefinir Senha do Gestor */}
                        <button
                          onClick={() => handleOpenResetPassword(tenant)}
                          title="Redefinir Senha do Gestor"
                          className="p-1.5 rounded-btn bg-aco/50 hover:bg-aco text-muted hover:text-volt transition-colors"
                        >
                          <Key size={14} />
                        </button>

                        {/* Botão Ver Detalhes */}
                        <button
                          onClick={() => handleOpenDetails(tenant)}
                          title="Ver detalhes técnicos"
                          className="p-1.5 rounded-btn bg-aco/50 hover:bg-aco text-muted hover:text-texto transition-colors"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Botão Suspender ou Reativar */}
                        {tenant.status === 'suspended' ? (
                          <button
                            onClick={() => handleReactivate(tenant)}
                            title="Reativar Oficina"
                            className="px-2.5 py-1.5 rounded-btn bg-semantic-success/10 hover:bg-semantic-success/20 text-semantic-success border border-semantic-success/30 text-[11px] font-semibold transition-colors"
                          >
                            Reativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenSuspend(tenant)}
                            title="Suspender Oficina"
                            className="p-1.5 rounded-btn bg-semantic-error/10 hover:bg-semantic-error/20 text-semantic-error border border-semantic-error/20 transition-colors"
                          >
                            <ShieldAlert size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {tenants.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={tenants.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 15, 25, 50, 100]}
          />
        )}
      </div>

      {/* Modal de Impersonação */}
      {impersonateModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-asfalto/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-grafite border border-aco rounded-modal p-6 shadow-2xl relative">
            <button
              onClick={() => setImpersonateModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-texto p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-volt/10 border border-volt/30 text-volt flex items-center justify-center">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Impersonar Oficina Cliente
                </h3>
                <p className="text-xs text-muted">
                  Acesso administrativo delimitado a 1 hora com rastreabilidade total.
                </p>
              </div>
            </div>

            {actionError && (
              <div className="mb-4 p-3 rounded-btn bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs">
                {actionError}
              </div>
            )}

            {!impersonateResult ? (
              <div className="space-y-4">
                <div className="p-3 rounded-btn bg-asfalto/60 border border-aco/30 text-xs text-muted">
                  Você está solicitando acesso em nome da oficina{' '}
                  <strong className="text-white">{selectedTenant.trade_name}</strong> (slug:{' '}
                  <code className="text-volt">{selectedTenant.slug}</code>). Esta ação será registrada
                  com seu IP, timestamp e hash de auditoria.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
                    Motivo Obrigatório da Impersonação
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={impersonateReason}
                    onChange={(e) => setImpersonateReason(e.target.value)}
                    placeholder="Ex: Suporte técnico para resolução do chamado #1042 referente à emissão de nota fiscal..."
                    className="w-full p-3 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setImpersonateModalOpen(false)}
                    className="px-4 py-2 text-xs text-muted hover:text-texto"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImpersonate}
                    disabled={impersonateLoading || !impersonateReason.trim()}
                    className="px-4 py-2 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {impersonateLoading ? (
                      <div className="w-4 h-4 border-2 border-asfalto/30 border-t-asfalto rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldAlert size={14} />
                        <span>Gerar Token e Acessar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Sucesso na Impersonação */
              <div className="space-y-4">
                <div className="p-4 rounded-btn bg-volt/10 border border-volt/30 text-texto text-xs">
                  <div className="font-semibold text-volt text-sm mb-1 flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Sessão de Impersonação Criada com Sucesso!
                  </div>
                  <p className="text-muted">
                    Token emitido com validade estrita de{' '}
                    <strong>{impersonateResult.expiresInSeconds / 60} minutos</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    Token JWT Temporário de Impersonação
                  </label>
                  <div className="p-2.5 bg-asfalto border border-aco rounded-input font-mono text-[10px] text-muted break-all select-all">
                    {impersonateResult.token}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';
                      const shopAppUrl = `${baseOrigin}/dashboard?impersonation_token=${impersonateResult.token}`;
                      window.open(shopAppUrl, '_blank');
                    }}
                    className="px-4 py-2 bg-volt hover:bg-volt-hover text-asfalto font-semibold rounded-btn text-xs flex items-center gap-1.5 transition-all shadow-md shadow-volt/20"
                  >
                    <ExternalLink size={14} />
                    <span>Abrir App da Oficina em Nova Aba</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Suspensão com Confirmação de Senha Master */}
      {suspendModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-asfalto/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-grafite border border-semantic-error/40 rounded-modal p-6 shadow-2xl relative">
            <button
              onClick={() => setSuspendModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-texto p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-semantic-error/10 border border-semantic-error/30 text-semantic-error flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Suspender Oficina Cliente
                </h3>
                <p className="text-xs text-muted">Ação restritiva com bloqueio imediato de acessos.</p>
              </div>
            </div>

            {actionError && (
              <div className="mb-4 p-3 rounded-btn bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs">
                {actionError}
              </div>
            )}

            <div className="space-y-4">
              <div className="p-3 rounded-btn bg-asfalto/60 border border-aco/30 text-xs text-muted">
                Ao suspender <strong className="text-white">{selectedTenant.trade_name}</strong>, todos
                os colaboradores da oficina receberão erro <strong>HTTP 403 Forbidden</strong> ao tentar
                qualquer requisição na API.
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
                  Motivo da Suspensão
                </label>
                <textarea
                  rows={2}
                  required
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Ex: Inadimplência superior a 15 dias na régua de cobrança..."
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-semantic-error transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={12} className="text-volt" />
                  Confirmação com Senha Master
                </label>
                <input
                  type="password"
                  required
                  value={suspendPassword}
                  onChange={(e) => setSuspendPassword(e.target.value)}
                  placeholder="Digite sua senha de Super Admin"
                  className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSuspendModalOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-texto"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSuspend}
                  disabled={suspendLoading || !suspendReason.trim() || !suspendPassword.trim()}
                  className="px-4 py-2 bg-semantic-error hover:bg-semantic-error/90 text-white font-semibold rounded-btn text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {suspendLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldAlert size={14} />
                      <span>Confirmar Suspensão</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Oficina */}
      {detailsModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-asfalto/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-grafite border border-aco rounded-modal p-6 shadow-2xl relative">
            <button
              onClick={() => setDetailsModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-texto p-1"
            >
              <X size={18} />
            </button>

            <h3 className="font-display font-bold text-lg text-white mb-1">
              {selectedTenant.trade_name}
            </h3>
            <p className="text-xs text-muted mb-4 font-mono">{selectedTenant.id}</p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-btn bg-asfalto/60 border border-aco/30">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Razão Social</span>
                  <span className="font-medium text-texto">{selectedTenant.legal_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">CNPJ</span>
                  <span className="font-medium text-texto">{selectedTenant.cnpj || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">E-mail Principal</span>
                  <span className="font-medium text-texto">{selectedTenant.email}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Telefone</span>
                  <span className="font-medium text-texto">{selectedTenant.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded-btn bg-asfalto/60 border border-aco/30 text-center">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Filiais</span>
                  <span className="font-display font-bold text-base text-volt">{selectedTenant.units_count}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Usuários</span>
                  <span className="font-display font-bold text-base text-white">{selectedTenant.users_count}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Storage S3</span>
                  <span className="font-display font-bold text-base text-texto">{formatBytes(selectedTenant.storage_bytes)}</span>
                </div>
              </div>

              {/* Serviços Provisionados do Segmento */}
              <div className="p-3 rounded-btn bg-asfalto/60 border border-aco/30">
                <span className="text-muted block text-[10px] uppercase font-semibold mb-2 flex items-center justify-between">
                  <span>Catálogo de Serviços ({detailsServices.length})</span>
                  <span className="text-volt font-bold uppercase">{selectedTenant.segment || 'Mecânica'}</span>
                </span>
                {detailsLoading ? (
                  <div className="py-2 text-center text-muted">Carregando serviços...</div>
                ) : detailsServices.length === 0 ? (
                  <div className="text-muted text-[11px] italic">Nenhum serviço cadastrado.</div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {detailsServices.map((svc: any) => (
                      <div
                        key={svc.id}
                        className="flex items-center justify-between p-2 rounded bg-grafite/80 border border-aco/40 text-[11px]"
                      >
                        <div>
                          <div className="font-semibold text-white">{svc.name}</div>
                          <div className="text-[10px] text-muted">{svc.category} • ~{svc.estimated_minutes} min</div>
                        </div>
                        <div className="font-display font-bold text-volt">
                          {(svc.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Template de Checklist */}
              {detailsChecklists.length > 0 && (
                <div className="p-3 rounded-btn bg-asfalto/60 border border-aco/30">
                  <span className="text-muted block text-[10px] uppercase font-semibold mb-1">
                    Checklist Base de Entrada
                  </span>
                  <div className="text-texto font-medium text-[11px]">
                    {detailsChecklists[0]?.name}
                  </div>
                  <div className="text-muted text-[10px] mt-0.5">
                    {detailsChecklists[0]?.items?.length || 0} itens técnicos de inspeção prévia configurados.
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-aco/30 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setDetailsModalOpen(false);
                  if (selectedTenant) handleOpenResetPassword(selectedTenant);
                }}
                className="px-3.5 py-1.5 bg-volt/10 hover:bg-volt/20 text-volt border border-volt/30 rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Key size={13} />
                <span>Redefinir Senha do Gestor</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 bg-aco/50 hover:bg-aco text-texto rounded-btn text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Redefinição de Senha do Gestor */}
      {resetPasswordModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-asfalto/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-grafite border border-aco/60 rounded-card max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setResetPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-volt/10 border border-volt/20 flex items-center justify-center text-volt">
                <Key size={18} />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">Redefinir Senha do Gestor</h3>
                <p className="text-xs text-muted">
                  Oficina: <strong className="text-white">{selectedTenant.trade_name}</strong>
                </p>
              </div>
            </div>

            {resetPasswordResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-btn bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <CheckCircle2 size={16} /> Senha Atualizada com Sucesso!
                  </div>
                  <p className="text-texto text-xs">
                    As credenciais do gestor <strong className="text-white">{resetPasswordResult.owner_name}</strong> foram redefinidas imediatamente.
                  </p>
                </div>

                <div className="p-3.5 rounded-card bg-asfalto/70 border border-aco/40 space-y-2.5 text-xs">
                  <div>
                    <span className="text-muted block text-[10px] uppercase font-semibold">E-mail de Login</span>
                    <span className="font-mono text-white select-all">{resetPasswordResult.owner_email}</span>
                  </div>

                  <div>
                    <span className="text-muted block text-[10px] uppercase font-semibold">Nova Senha Provisória</span>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="font-mono font-bold text-volt text-sm bg-asfalto px-2.5 py-1 rounded border border-aco select-all">
                        {resetPasswordResult.temporary_password}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(resetPasswordResult.temporary_password || '')}
                        className="px-2.5 py-1 bg-aco/50 hover:bg-aco text-texto rounded-btn text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        {resetPasswordCopied ? <Check size={12} className="text-volt" /> : <Copy size={12} />}
                        <span>{resetPasswordCopied ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopyWhatsAppMessage(selectedTenant, resetPasswordResult)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-btn text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-900/30"
                  >
                    {resetPasswordMsgCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{resetPasswordMsgCopied ? 'Mensagem Copiada!' : 'Copiar Mensagem Pronta para WhatsApp'}</span>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setResetPasswordModalOpen(false)}
                    className="px-4 py-2 bg-aco/60 hover:bg-aco text-white rounded-btn text-xs font-semibold transition-colors"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  Esta ação substitui imediatamente a senha do usuário proprietário da oficina no banco de dados e encerra sessões ativas.
                </p>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                    Modo de Definição
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setResetPasswordMode('generate')}
                      className={`p-2.5 rounded-btn border text-xs font-semibold transition-all ${
                        resetPasswordMode === 'generate'
                          ? 'bg-volt/10 border-volt text-volt'
                          : 'bg-asfalto/50 border-aco/40 text-muted hover:text-texto'
                      }`}
                    >
                      Gerar Senha Forte
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetPasswordMode('manual')}
                      className={`p-2.5 rounded-btn border text-xs font-semibold transition-all ${
                        resetPasswordMode === 'manual'
                          ? 'bg-volt/10 border-volt text-volt'
                          : 'bg-asfalto/50 border-aco/40 text-muted hover:text-texto'
                      }`}
                    >
                      Digitar Manualmente
                    </button>
                  </div>
                </div>

                {resetPasswordMode === 'manual' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
                      Nova Senha do Gestor (Mínimo 8 caracteres) *
                    </label>
                    <input
                      type="text"
                      value={resetPasswordManual}
                      onChange={(e) => setResetPasswordManual(e.target.value)}
                      placeholder="Ex: NovaSenhaForte@2026"
                      className="w-full p-2.5 bg-asfalto border border-aco rounded-input text-xs font-mono text-texto placeholder:text-muted/50 focus:outline-none focus:border-volt"
                    />
                  </div>
                )}

                {resetPasswordError && (
                  <div className="p-3 rounded-btn bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-xs flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>{resetPasswordError}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-aco/40 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetPasswordModalOpen(false)}
                    disabled={resetPasswordLoading}
                    className="px-4 py-2 bg-aco/50 hover:bg-aco text-muted hover:text-texto rounded-btn text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitResetPassword}
                    disabled={resetPasswordLoading || (resetPasswordMode === 'manual' && resetPasswordManual.trim().length < 8)}
                    className="px-4 py-2 bg-volt hover:bg-volt-hover active:bg-volt-active text-asfalto font-semibold rounded-btn text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-volt/20 disabled:opacity-50"
                  >
                    {resetPasswordLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-asfalto/30 border-t-asfalto rounded-full animate-spin" />
                    ) : (
                      <>
                        <Key size={14} />
                        <span>Confirmar Redefinição</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

