import { formatDateBR, formatTimeBR } from '../../utils/dateUtils';
import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Code2, 
  Terminal, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Zap, 
  Lock, 
  RefreshCw,
  ExternalLink,
  BookOpen,
  Play,
  ShieldCheck
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirm';
import { api } from '../../services/api';

const CANONICAL_WEBHOOK_EVENTS = [
  { id: 'work_order.created', label: 'OS Criada', desc: 'Disparado ao criar uma nova Ordem de Serviço' },
  { id: 'work_order.updated', label: 'OS Atualizada', desc: 'Disparado ao alterar serviços ou dados da OS' },
  { id: 'work_order.ready', label: 'Veículo Pronto', desc: 'Disparado quando a OS entra em status Pronto' },
  { id: 'work_order.delivered', label: 'OS Entregue', desc: 'Disparado ao finalizar e entregar o veículo' },
  { id: 'customer.created', label: 'Novo Cliente', desc: 'Disparado no cadastro de novos clientes' },
  { id: 'nps.answered', label: 'NPS Respondido', desc: 'Disparado quando o cliente avalia a loja' },
];

const CANONICAL_SCOPES = [
  { id: 'read:work_orders', label: 'Ler Ordens de Serviço' },
  { id: 'write:work_orders', label: 'Criar / Alterar OS' },
  { id: 'read:customers', label: 'Consultar Clientes' },
  { id: 'read:nps', label: 'Consultar Pesquisas NPS' },
];

const ApiWebhooksManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('TOKENS'); // 'TOKENS', 'SWAGGER', 'WEBHOOKS'
  const [loading, setLoading] = useState(false);

  // --- ESTADO: CHAVES DE API ---
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState(['read:work_orders', 'read:customers']);
  const [rateLimit, setRateLimit] = useState(60);
  const [expiresInDays, setExpiresInDays] = useState(null);
  const [generatedKeyVisible, setGeneratedKeyVisible] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // --- ESTADO: SWAGGER INTERATIVO ---
  const [selectedEndpoint, setSelectedEndpoint] = useState('GET_ORDERS');
  const [testResponse, setTestResponse] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedLang, setSelectedLang] = useState('CURL'); // CURL, JS, PYTHON

  // --- ESTADO: WEBHOOKS ---
  const [webhooks, setWebhooks] = useState([]);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [whName, setWhName] = useState('');
  const [whDescription, setWhDescription] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whEvents, setWhEvents] = useState(['work_order.created', 'work_order.delivered']);
  const [testingWhId, setTestingWhId] = useState(null);
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);

  // Carregar Chaves e Webhooks do Backend
  const loadData = async () => {
    setLoading(true);
    try {
      const [keysRes, whRes] = await Promise.allSettled([
        api.integrations.listApiKeys(),
        api.integrations.listWebhooks(),
      ]);

      if (keysRes.status === 'fulfilled') {
        setApiKeys(keysRes.value?.apiKeys || []);
      }
      if (whRes.status === 'fulfilled') {
        setWebhooks(whRes.value?.webhooks || []);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados de integração:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Gerar nova chave de API Real
  const handleGenerateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.warning('Digite um nome para identificar a aplicação que usará esta chave.');
      return;
    }
    if (selectedScopes.length === 0) {
      toast.warning('Selecione pelo menos um escopo de permissão para a chave.');
      return;
    }

    setIsCreatingKey(true);
    try {
      const res = await api.integrations.createApiKey({
        name: newKeyName.trim(),
        permissions: selectedScopes,
        rateLimitPerMinute: Number(rateLimit) || 60,
        expiresInDays: expiresInDays ? Number(expiresInDays) : null,
      });

      if (res?.token) {
        setGeneratedKeyVisible(res.token);
        if (res.apiKey) {
          setApiKeys((prev) => [res.apiKey, ...prev]);
        }
        setNewKeyName('');
        setNewKeyModal(false);
        toast.success('Chave de API gerada com sucesso! Copie o token agora.');
      } else {
        toast.error('Erro ao gerar chave de API.');
      }
    } catch (err) {
      toast.error(err?.message || 'Erro ao gerar chave no servidor Fastify.');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id) => {
    const ok = await confirmDialog(
      'Revogar Chave de API',
      'Tem certeza que deseja revogar esta chave? Qualquer integração externa (ERP, Zapier, Bling) perderá o acesso imediatamente.',
      'Revogar Token',
      'Cancelar'
    );
    if (!ok) return;

    try {
      await api.integrations.revokeApiKey(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('Chave de API revogada com sucesso!');
    } catch (err) {
      toast.error(err?.message || 'Erro ao revogar chave.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedToken(false), 3000);
  };

  // Cadastro de Webhook Real
  const handleAddWebhook = async (e) => {
    e.preventDefault();
    if (!whName.trim() || !whUrl.trim()) {
      toast.warning('Preencha o nome e a URL válida de destino (https:// ou http://).');
      return;
    }
    if (whEvents.length === 0) {
      toast.warning('Selecione pelo menos um evento gatilho.');
      return;
    }

    setIsCreatingWebhook(true);
    try {
      const res = await api.integrations.createWebhook({
        name: whName.trim(),
        description: whDescription.trim() || undefined,
        url: whUrl.trim(),
        events: whEvents,
      });

      if (res?.webhook) {
        setWebhooks((prev) => [res.webhook, ...prev]);
        setShowWebhookModal(false);
        setWhName('');
        setWhDescription('');
        setWhUrl('');
        toast.success('Endpoint de Webhook cadastrado com sucesso!');
      }
    } catch (err) {
      toast.error(err?.message || 'Erro ao cadastrar endpoint de webhook.');
    } finally {
      setIsCreatingWebhook(false);
    }
  };

  // Testar Disparo de Webhook Real
  const handleTestWebhook = async (wh) => {
    setTestingWhId(wh.id);
    toast.info(`Disparando ping de teste assinado para: ${wh.name}...`);

    try {
      const res = await api.integrations.testWebhook(wh.id);
      toast.success(res?.message || 'Webhook testado com sucesso!');
      // Atualiza o estado visual
      setWebhooks((prev) =>
        prev.map((w) => {
          if (w.id === wh.id) {
            return {
              ...w,
              failureCount: 0,
              updatedAt: new Date().toISOString(),
            };
          }
          return w;
        })
      );
    } catch (err) {
      toast.error(err?.message || 'Erro ao disparar teste de webhook.');
    } finally {
      setTestingWhId(null);
    }
  };

  const handleDeleteWebhook = async (id) => {
    const ok = await confirmDialog(
      'Excluir Endpoint de Webhook',
      'Deseja remover este webhook? O sistema deixará de enviar eventos em tempo real para essa URL.',
      'Excluir Webhook',
      'Cancelar'
    );
    if (!ok) return;

    try {
      await api.integrations.deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success('Webhook excluído com sucesso!');
    } catch (err) {
      toast.error(err?.message || 'Erro ao excluir webhook.');
    }
  };

  const toggleEventSelection = (ev) => {
    if (whEvents.includes(ev)) {
      setWhEvents(whEvents.filter((e) => e !== ev));
    } else {
      setWhEvents([...whEvents, ev]);
    }
  };

  const toggleScopeSelection = (scope) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  // Execução ao vivo do Swagger / Testador
  const handleRunSwaggerTest = async () => {
    setIsTesting(true);
    setTestResponse(null);

    try {
      if (selectedEndpoint === 'GET_ORDERS') {
        const res = await api.workOrders.list({ limit: 3 });
        const data = res?.workOrders || (Array.isArray(res) ? res : []);
        setTestResponse({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json; charset=utf-8', 'x-ratelimit-remaining': '59/60' },
          data,
        });
      } else if (selectedEndpoint === 'GET_CLIENTS') {
        const res = await api.customers.list();
        const data = res?.customers || (Array.isArray(res) ? res : []);
        setTestResponse({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          data,
        });
      } else if (selectedEndpoint === 'GET_NPS') {
        const metrics = await api.nps.getMetrics();
        setTestResponse({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          data: metrics,
        });
      }
    } catch (err) {
      setTestResponse({
        status: err?.statusCode || 500,
        statusText: 'ERROR',
        error: err?.message || 'Erro ao consultar API Fastify',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Exemplo de código do snippet
  const getExampleCode = () => {
    const origin = window.location.origin;
    const epUrl =
      selectedEndpoint === 'GET_ORDERS'
        ? `${origin}/v1/work-orders`
        : selectedEndpoint === 'GET_CLIENTS'
        ? `${origin}/v1/customers`
        : `${origin}/v1/nps`;

    if (selectedLang === 'CURL') {
      return `curl -X GET "${epUrl}" \\
  -H "Authorization: Bearer carx_live_9f8a7c6d5e4f3b2a1..." \\
  -H "Content-Type: application/json"`;
    } else if (selectedLang === 'JS') {
      return `const response = await fetch("${epUrl}", {
  method: "GET",
  headers: {
    "Authorization": "Bearer carx_live_9f8a7c6d5e4f3b2a1...",
    "Content-Type": "application/json"
  }
});
const data = await response.json();
console.log(data);`;
    } else {
      return `import requests

headers = {
    "Authorization": "Bearer carx_live_9f8a7c6d5e4f3b2a1...",
    "Content-Type": "application/json"
}

response = requests.get("${epUrl}", headers=headers)
print(response.json())`;
    }
  };

  const openSwaggerDocs = () => {
    window.open(`${window.location.origin}/v1/docs`, '_blank');
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Banner Superior Dark Card - Informações e Segurança */}
      <div className="bg-[#171C24] p-6 rounded-3xl text-[#F2F5F8] shadow-xl border border-[#2E3744]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#C8F52E]/10 text-[#C8F52E] rounded-2xl border border-[#C8F52E]/20 flex-shrink-0 mt-1">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C8F52E]/15 text-[#C8F52E] font-black text-[9px] uppercase tracking-wider border border-[#C8F52E]/30">
                  CarX API Gateway • Criptografia SHA-256
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-black text-[9px] uppercase tracking-wider border border-blue-500/30">
                  Single-Tenant RLS
                </span>
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight mt-1">
                Integrações REST, Tokens & Webhooks
              </h3>
              <p className="text-xs text-[#8A9BA8] mt-1 max-w-2xl font-medium leading-relaxed">
                Tokens secretos com prefixo <code className="text-[#C8F52E] bg-[#0E1116] px-1.5 py-0.5 rounded border border-[#2E3744] font-mono">carx_live_...</code> gerados e criptografados no servidor. Conecte com segurança seu ERP (Bling, Tiny), ferramentas de automação (Zapier, Make, n8n) e CRMs externos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center bg-[#0E1116] p-1.5 rounded-2xl border border-[#2E3744]">
            <button
              onClick={() => setActiveSubTab('TOKENS')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeSubTab === 'TOKENS'
                  ? 'bg-[#C8F52E] text-[#0E1116] shadow-sm'
                  : 'text-[#8A9BA8] hover:text-[#F2F5F8]'
              }`}
            >
              <Key size={14} />
              <span>Chaves API ({apiKeys.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('SWAGGER')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeSubTab === 'SWAGGER'
                  ? 'bg-[#C8F52E] text-[#0E1116] shadow-sm'
                  : 'text-[#8A9BA8] hover:text-[#F2F5F8]'
              }`}
            >
              <Code2 size={14} />
              <span>Swagger & Docs</span>
            </button>
            <button
              onClick={() => setActiveSubTab('WEBHOOKS')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeSubTab === 'WEBHOOKS'
                  ? 'bg-[#C8F52E] text-[#0E1116] shadow-sm'
                  : 'text-[#8A9BA8] hover:text-[#F2F5F8]'
              }`}
            >
              <Zap size={14} />
              <span>Webhooks ({webhooks.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: GESTÃO DE CHAVES DE API */}
      {/* ============================================================== */}
      {activeSubTab === 'TOKENS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#171C24] p-6 rounded-3xl border border-[#2E3744] shadow-sm">
            <div>
              <h4 className="text-base font-black uppercase text-[#F2F5F8] flex items-center gap-2">
                <Key size={18} className="text-[#C8F52E]" />
                <span>Tokens de Integração Ativos</span>
              </h4>
              <p className="text-xs text-[#8A9BA8] font-medium mt-0.5">
                Chaves autenticam requisições HTTP da sua oficina com isolamento Single-Tenant garantido por RLS.
              </p>
            </div>
            <button
              onClick={() => {
                setGeneratedKeyVisible(null);
                setNewKeyModal(true);
              }}
              className="px-5 py-2.5 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>Gerar Nova Chave API</span>
            </button>
          </div>

          {/* Banner quando uma chave acaba de ser gerada */}
          {generatedKeyVisible && (
            <div className="bg-[#171C24] p-6 rounded-3xl border-2 border-[#C8F52E] shadow-xl animate-scaleUp">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#C8F52E] text-[#0E1116] rounded-2xl font-black">
                    <Key size={22} />
                  </div>
                  <div>
                    <h5 className="text-sm font-black uppercase text-[#C8F52E]">
                      Chave Gerada com Sucesso! Copie Imediatamente ⚠️
                    </h5>
                    <p className="text-xs text-[#8A9BA8] font-medium mt-0.5">
                      Por segurança criptográfica SHA-256 no banco, este token nunca mais será exibido na íntegra.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setGeneratedKeyVisible(null)}
                  className="text-xs font-bold uppercase px-3 py-1.5 bg-[#0E1116] text-[#8A9BA8] hover:text-[#F2F5F8] rounded-xl border border-[#2E3744] transition-all"
                >
                  Concluí a cópia
                </button>
              </div>

              <div className="mt-4 p-4 bg-[#0E1116] text-[#C8F52E] font-mono text-xs rounded-2xl flex items-center justify-between gap-4 border border-[#2E3744] overflow-x-auto">
                <span className="select-all break-all">{generatedKeyVisible}</span>
                <button
                  onClick={() => copyToClipboard(generatedKeyVisible)}
                  className="px-4 py-2 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] font-black rounded-xl flex items-center gap-2 flex-shrink-0 transition-all active:scale-95 text-xs"
                >
                  {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedToken ? 'Copiado!' : 'Copiar Token'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tabela de Chaves */}
          <div className="bg-[#171C24] rounded-3xl border border-[#2E3744] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0E1116] border-b border-[#2E3744] text-[10px] font-black uppercase text-[#8A9BA8]">
                  <th className="p-4">Aplicação / Sistema</th>
                  <th className="p-4">Prefixo do Token</th>
                  <th className="p-4">Permissões (Scopes)</th>
                  <th className="p-4">Criado em</th>
                  <th className="p-4">Rate Limit</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E3744] font-medium">
                {apiKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-[#1f2631] transition-all">
                    <td className="p-4 font-bold text-[#F2F5F8] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#C8F52E]/10 text-[#C8F52E] flex items-center justify-center font-black">
                        <Terminal size={15} />
                      </div>
                      <span>{k.name}</span>
                    </td>
                    <td className="p-4 font-mono text-[#8A9BA8]">
                      <code className="bg-[#0E1116] text-[#C8F52E] px-2 py-1 rounded border border-[#2E3744] font-bold">
                        {k.prefix}
                      </code>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(k.permissions || []).map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded bg-[#0E1116] text-[#8A9BA8] border border-[#2E3744] text-[10px] font-mono"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-[#8A9BA8]">
                      {k.createdAt ? formatDateBR(k.createdAt) : '--/--/----'}
                    </td>
                    <td className="p-4 text-[#8A9BA8] font-mono">
                      {k.rateLimitPerMinute || 60} req/min
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                          k.status === 'active'
                            ? 'bg-[#C8F52E]/15 text-[#C8F52E] border-[#C8F52E]/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        ● {k.status === 'active' ? 'Ativo' : 'Revogado'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {k.status === 'active' && (
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                          title="Revogar e Excluir Chave"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {apiKeys.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[#8A9BA8]">
                      <Key size={36} className="mx-auto mb-2 opacity-30 text-[#8A9BA8]" />
                      <p className="font-bold text-xs uppercase">Nenhuma chave de API gerada até o momento.</p>
                      <p className="text-[11px] text-[#8A9BA8] mt-1">
                        Clique em "Gerar Nova Chave API" para integrar sua oficina com ferramentas externas.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: SWAGGER INTERATIVO & DOCS */}
      {/* ============================================================== */}
      {activeSubTab === 'SWAGGER' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Lateral de Endpoints */}
          <div className="bg-[#171C24] p-6 rounded-3xl border border-[#2E3744] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-[#8A9BA8] tracking-widest flex items-center gap-2">
                <BookOpen size={16} className="text-[#C8F52E]" />
                <span>Endpoints REST</span>
              </h4>
              <button
                onClick={openSwaggerDocs}
                className="text-[10px] font-bold uppercase text-[#C8F52E] hover:underline flex items-center gap-1"
                title="Abrir Swagger UI em nova aba"
              >
                <span>Swagger UI</span>
                <ExternalLink size={12} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setSelectedEndpoint('GET_ORDERS');
                  setTestResponse(null);
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  selectedEndpoint === 'GET_ORDERS'
                    ? 'bg-[#0E1116] text-[#C8F52E] border-[#C8F52E] shadow-sm'
                    : 'bg-[#171C24] text-[#8A9BA8] border-[#2E3744] hover:border-[#8A9BA8]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-[#C8F52E] text-[#0E1116]">
                    GET
                  </span>
                  <span className="text-xs font-bold font-mono">/v1/work-orders</span>
                </div>
                <span className="text-[10px] font-bold opacity-60">Ordens de Serviço</span>
              </button>

              <button
                onClick={() => {
                  setSelectedEndpoint('GET_CLIENTS');
                  setTestResponse(null);
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  selectedEndpoint === 'GET_CLIENTS'
                    ? 'bg-[#0E1116] text-[#C8F52E] border-[#C8F52E] shadow-sm'
                    : 'bg-[#171C24] text-[#8A9BA8] border-[#2E3744] hover:border-[#8A9BA8]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-[#C8F52E] text-[#0E1116]">
                    GET
                  </span>
                  <span className="text-xs font-bold font-mono">/v1/customers</span>
                </div>
                <span className="text-[10px] font-bold opacity-60">Clientes</span>
              </button>

              <button
                onClick={() => {
                  setSelectedEndpoint('GET_NPS');
                  setTestResponse(null);
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  selectedEndpoint === 'GET_NPS'
                    ? 'bg-[#0E1116] text-[#C8F52E] border-[#C8F52E] shadow-sm'
                    : 'bg-[#171C24] text-[#8A9BA8] border-[#2E3744] hover:border-[#8A9BA8]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-[#C8F52E] text-[#0E1116]">
                    GET
                  </span>
                  <span className="text-xs font-bold font-mono">/v1/nps</span>
                </div>
                <span className="text-[10px] font-bold opacity-60">Pesquisas NPS</span>
              </button>
            </div>

            <div className="p-4 bg-[#0E1116] rounded-2xl border border-[#2E3744] text-[11px] text-[#8A9BA8] space-y-2">
              <p className="font-bold text-[#F2F5F8]">🛡️ Cabeçalho de Autenticação:</p>
              <p>Envie o token no header HTTP de cada requisição:</p>
              <code className="block bg-[#171C24] text-[#C8F52E] p-2 rounded font-mono text-[10px] border border-[#2E3744]">
                Authorization: Bearer carx_live_...
              </code>
            </div>
          </div>

          {/* Detalhes do Endpoint & Testador */}
          <div className="lg:col-span-2 bg-[#171C24] p-6 rounded-3xl border border-[#2E3744] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2E3744] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded font-mono font-black text-xs bg-[#C8F52E] text-[#0E1116]">
                    GET
                  </span>
                  <h3 className="text-lg font-black font-mono text-[#F2F5F8]">
                    {selectedEndpoint === 'GET_ORDERS' && '/v1/work-orders'}
                    {selectedEndpoint === 'GET_CLIENTS' && '/v1/customers'}
                    {selectedEndpoint === 'GET_NPS' && '/v1/nps'}
                  </h3>
                </div>
                <p className="text-xs text-[#8A9BA8] font-medium mt-1">
                  {selectedEndpoint === 'GET_ORDERS' &&
                    'Retorna a listagem de Ordens de Serviço da oficina com status, totais e dados do veículo.'}
                  {selectedEndpoint === 'GET_CLIENTS' &&
                    'Lista os clientes cadastrados com telefone, e-mail e dados de contato.'}
                  {selectedEndpoint === 'GET_NPS' &&
                    'Consulta o histórico de notas e avaliações NPS dos clientes.'}
                </p>
              </div>

              <button
                onClick={handleRunSwaggerTest}
                disabled={isTesting}
                className="px-5 py-2.5 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
              >
                {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                <span>{isTesting ? 'Consultando...' : 'Testar ao Vivo'}</span>
              </button>
            </div>

            {/* Snippet Code */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-[#8A9BA8] tracking-wider">
                  Exemplo de Requisição (Code Snippet)
                </span>
                <div className="flex gap-1 bg-[#0E1116] p-1 rounded-xl border border-[#2E3744]">
                  {['CURL', 'JS', 'PYTHON'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLang(lang)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        selectedLang === lang
                          ? 'bg-[#C8F52E] text-[#0E1116]'
                          : 'text-[#8A9BA8] hover:text-[#F2F5F8]'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative group">
                <pre className="bg-[#0E1116] text-[#C8F52E] font-mono text-xs p-4 rounded-2xl overflow-x-auto border border-[#2E3744] leading-relaxed">
                  {getExampleCode()}
                </pre>
                <button
                  onClick={() => copyToClipboard(getExampleCode())}
                  className="absolute top-3 right-3 p-2 bg-[#171C24] text-[#F2F5F8] border border-[#2E3744] rounded-lg opacity-0 group-hover:opacity-100 transition-all text-xs"
                  title="Copiar snippet"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Resultado do Teste ao Vivo */}
            {testResponse && (
              <div className="space-y-2 border-t border-[#2E3744] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[#8A9BA8] tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#C8F52E]" />
                    <span>Resposta da API Real (Live Execution)</span>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded font-black text-[10px] ${
                      testResponse.status === 200
                        ? 'bg-[#C8F52E]/15 text-[#C8F52E] border border-[#C8F52E]/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    Status: {testResponse.status} {testResponse.statusText}
                  </span>
                </div>

                <pre className="bg-[#0E1116] text-[#F2F5F8] font-mono text-xs p-4 rounded-2xl overflow-x-auto max-h-64 border border-[#2E3744] leading-relaxed custom-scrollbar">
                  {JSON.stringify(testResponse.data || testResponse.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: WEBHOOKS */}
      {/* ============================================================== */}
      {activeSubTab === 'WEBHOOKS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#171C24] p-6 rounded-3xl border border-[#2E3744] shadow-sm">
            <div>
              <h4 className="text-base font-black uppercase text-[#F2F5F8] flex items-center gap-2">
                <Zap size={18} className="text-[#C8F52E]" />
                <span>Endpoints de Webhook (Eventos em Tempo Real)</span>
              </h4>
              <p className="text-xs text-[#8A9BA8] font-medium mt-0.5">
                Disparo compulsório de HTTP POST assinado com HMAC SHA-256 para cada evento disparado na oficina.
              </p>
            </div>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="px-5 py-2.5 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>Cadastrar Novo Webhook</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="bg-[#171C24] p-6 rounded-3xl border border-[#2E3744] shadow-sm space-y-4 hover:border-[#8A9BA8] transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#C8F52E]/10 text-[#C8F52E] rounded-2xl border border-[#C8F52E]/20">
                      <Globe size={22} />
                    </div>
                    <div>
                      <h5 className="font-black text-[#F2F5F8] text-base">{wh.name}</h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            wh.status === 'active'
                              ? 'bg-[#C8F52E]/15 text-[#C8F52E] border-[#C8F52E]/30'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          ● {wh.status === 'active' ? 'Ativo' : wh.status}
                        </span>
                        {wh.description && (
                          <span className="text-[10px] text-[#8A9BA8] truncate max-w-[180px]">
                            {wh.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteWebhook(wh.id)}
                    className="text-[#8A9BA8] hover:text-rose-400 p-2 rounded-xl transition-all hover:bg-rose-500/10"
                    title="Excluir Webhook"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="p-3 bg-[#0E1116] rounded-2xl border border-[#2E3744] font-mono text-xs text-[#8A9BA8] break-all">
                  {wh.url}
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-[#8A9BA8] mb-1.5">Eventos Inscritos:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(wh.events || []).map((ev) => (
                      <span
                        key={ev}
                        className="px-2 py-1 rounded-lg bg-[#0E1116] text-[#C8F52E] font-black text-[10px] font-mono border border-[#2E3744]"
                      >
                        ⚡ {ev}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#2E3744] pt-4 text-xs">
                  <span className="text-[#8A9BA8] font-medium text-[11px]">
                    Falhas: <strong className="text-[#F2F5F8]">{wh.failureCount || 0}</strong>
                  </span>
                  <button
                    onClick={() => handleTestWebhook(wh)}
                    disabled={testingWhId === wh.id}
                    className="px-4 py-2 bg-[#0E1116] hover:bg-[#2E3744] text-[#F2F5F8] border border-[#2E3744] rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {testingWhId === wh.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>{testingWhId === wh.id ? 'Testando...' : 'Disparar Teste'}</span>
                  </button>
                </div>
              </div>
            ))}

            {webhooks.length === 0 && !loading && (
              <div className="col-span-full text-center py-16 bg-[#171C24] rounded-3xl border border-[#2E3744] text-[#8A9BA8]">
                <Globe size={40} className="mx-auto mb-2 opacity-30 text-[#8A9BA8]" />
                <p className="font-black uppercase text-xs">Nenhum webhook cadastrado ainda.</p>
                <p className="text-[11px] text-[#8A9BA8] mt-1">
                  Cadastre URLs para receber notificações automáticas em tempo real sobre Ordens de Serviço.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVA CHAVE DE API */}
      {/* ============================================================== */}
      {newKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#171C24] rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl border border-[#2E3744] text-[#F2F5F8]">
            <h3 className="text-xl font-black uppercase mb-1">Gerar Nova Chave API</h3>
            <p className="text-xs text-[#8A9BA8] mb-6 font-medium">
              Chave com hash criptográfico SHA-256 no banco e escopo restrito à sua oficina.
            </p>

            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-[#8A9BA8] tracking-widest block mb-1">
                  Nome da Aplicação / Identificador
                </label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Ex: ERP Bling, Zapier, Webhook Make, App Próprio"
                  className="w-full p-4 bg-[#0E1116] border border-[#2E3744] rounded-2xl text-xs font-bold outline-none focus:border-[#C8F52E] text-[#F2F5F8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[#8A9BA8] tracking-widest block mb-2">
                  Escopos de Permissão (Scopes)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CANONICAL_SCOPES.map((sc) => {
                    const sel = selectedScopes.includes(sc.id);
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => toggleScopeSelection(sc.id)}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                          sel
                            ? 'bg-[#C8F52E]/15 text-[#C8F52E] border-[#C8F52E]'
                            : 'bg-[#0E1116] text-[#8A9BA8] border-[#2E3744]'
                        }`}
                      >
                        <span className="text-[11px]">{sc.label}</span>
                        {sel && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-[#8A9BA8] tracking-widest block mb-1">
                    Rate Limit (Req / Min)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(e.target.value)}
                    className="w-full p-3.5 bg-[#0E1116] border border-[#2E3744] rounded-2xl text-xs font-mono font-bold outline-none focus:border-[#C8F52E] text-[#F2F5F8]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[#8A9BA8] tracking-widest block mb-1">
                    Validade em Dias
                  </label>
                  <select
                    value={expiresInDays || ''}
                    onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : null)}
                    className="w-full p-3.5 bg-[#0E1116] border border-[#2E3744] rounded-2xl text-xs font-bold outline-none focus:border-[#C8F52E] text-[#F2F5F8]"
                  >
                    <option value="">Sem expiração (Permanente)</option>
                    <option value="30">30 dias</option>
                    <option value="90">90 dias</option>
                    <option value="180">180 dias</option>
                    <option value="365">365 dias (1 ano)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setNewKeyModal(false)}
                  className="flex-1 py-4 bg-[#0E1116] text-[#8A9BA8] hover:text-[#F2F5F8] border border-[#2E3744] rounded-2xl font-bold uppercase text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingKey}
                  className="flex-1 py-4 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] rounded-2xl font-black uppercase text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingKey && <RefreshCw size={14} className="animate-spin" />}
                  <span>{isCreatingKey ? 'Criando...' : 'Criar Chave Secreta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVO WEBHOOK */}
      {/* ============================================================== */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#171C24] rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl border border-[#2E3744] text-[#F2F5F8]">
            <h3 className="text-xl font-black uppercase mb-1">Cadastrar Webhook</h3>
            <p className="text-xs text-[#8A9BA8] mb-6 font-medium">
              Sua URL externa receberá requisições HTTP POST automáticas assinadas com chave secreta HMAC.
            </p>

            <form onSubmit={handleAddWebhook} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-[#8A9BA8] tracking-widest block mb-1">
                  Nome do Disparo / Sistema Destino
                </label>
                <input
                  type="text"
                  required
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  placeholder="Ex: Alerta de Nova OS no Slack, Webhook Zapier"
                  className="w-full p-4 bg-[#0E1116] border border-[#2E3744] rounded-2xl text-xs font-bold outline-none focus:border-[#C8F52E] text-[#F2F5F8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[#8A9BA8] tracking-widest block mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={whDescription}
                  onChange={(e) => setWhDescription(e.target.value)}
                  placeholder="Ex: Dispara quando a OS mudar para pronta ou entregue"
                  className="w-full p-3.5 bg-[#0E1116] border border-[#2E3744] rounded-2xl text-xs font-bold outline-none focus:border-[#C8F52E] text-[#F2F5F8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[#8A9BA8] tracking-widest block mb-1">
                  URL de Destino (Endpoint HTTP POST)
                </label>
                <input
                  type="url"
                  required
                  value={whUrl}
                  onChange={(e) => setWhUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="w-full p-4 bg-[#0E1116] border border-[#2E3744] rounded-2xl text-xs font-mono outline-none focus:border-[#C8F52E] text-[#F2F5F8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[#8A9BA8] tracking-widest block mb-2">
                  Selecione os Eventos Gatilho
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CANONICAL_WEBHOOK_EVENTS.map((ev) => {
                    const sel = whEvents.includes(ev.id);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => toggleEventSelection(ev.id)}
                        className={`p-3 rounded-xl border text-left font-mono text-[10px] font-bold transition-all flex items-center justify-between ${
                          sel
                            ? 'bg-[#C8F52E]/15 text-[#C8F52E] border-[#C8F52E]'
                            : 'bg-[#0E1116] text-[#8A9BA8] border-[#2E3744]'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{ev.label}</div>
                          <div className="text-[9px] opacity-70 font-sans">{ev.id}</div>
                        </div>
                        {sel && <Check size={14} className="shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="flex-1 py-4 bg-[#0E1116] text-[#8A9BA8] hover:text-[#F2F5F8] border border-[#2E3744] rounded-2xl font-bold uppercase text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWebhook}
                  className="flex-1 py-4 bg-[#C8F52E] hover:bg-[#b8e520] text-[#0E1116] rounded-2xl font-black uppercase text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingWebhook && <RefreshCw size={14} className="animate-spin" />}
                  <span>{isCreatingWebhook ? 'Ativando...' : 'Ativar Webhook'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiWebhooksManager;
