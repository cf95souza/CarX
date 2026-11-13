import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Building2,
  Save,
  Zap,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';
import type { TenantFiscalSettingsDto, UpdateFiscalSettingsInputDto } from '@carx/shared';

export const FiscalSettingsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState<UpdateFiscalSettingsInputDto>({
    environment: 'sandbox',
    provider: 'focus_nfe',
    apiToken: '',
    companyLegalName: '',
    companyCnpj: '',
    municipalInscription: '',
    taxRegime: 'simples_nacional',
    specialTaxRegime: '',
    defaultServiceCode: '14.01',
    cnaeCode: '4520-0/05',
    defaultIssRateBasisPoints: 200,
    issRetentionDefault: false,
    autoIssueOnDelivery: false,
    autoIssueOnPayment: false,
    sendEmailToCustomer: true,
    rpsSeries: '1',
  });

  const [hasStoredToken, setHasStoredToken] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data: TenantFiscalSettingsDto = await api.fiscal.getSettings();
      setHasStoredToken(data.hasApiToken);
      setFormData({
        environment: data.environment,
        provider: data.provider,
        apiToken: '', // Segredo não é exibido
        companyLegalName: data.companyLegalName || '',
        companyCnpj: data.companyCnpj || '',
        municipalInscription: data.municipalInscription || '',
        taxRegime: data.taxRegime,
        specialTaxRegime: data.specialTaxRegime || '',
        defaultServiceCode: data.defaultServiceCode || '14.01',
        cnaeCode: data.cnaeCode || '4520-0/05',
        defaultIssRateBasisPoints: data.defaultIssRateBasisPoints || 200,
        issRetentionDefault: data.issRetentionDefault,
        autoIssueOnDelivery: data.autoIssueOnDelivery,
        autoIssueOnPayment: data.autoIssueOnPayment,
        sendEmailToCustomer: data.sendEmailToCustomer,
        rpsSeries: data.rpsSeries || '1',
      });
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao carregar preferências fiscais.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload: UpdateFiscalSettingsInputDto = { ...formData };
      if (!payload.apiToken?.trim()) {
        delete (payload as any).apiToken; // Mantém o token existente no servidor
      }

      await api.fiscal.updateSettings(payload);
      setFeedback({ type: 'success', message: 'Preferências fiscais atualizadas com sucesso!' });
      await loadSettings();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao salvar dados fiscais da oficina.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E1E6EC] p-8 flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#C8F52E] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Carregando módulo fiscal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E1E6EC] p-6 lg:p-8 shadow-sm">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#E1E6EC] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#0E1116] text-[#C8F52E]">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[#0E1116] font-space">
              Módulo Fiscal · Emissão de NFS-e Municipal
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Transmissão automática de notas fiscais de serviço integrada à entrega e liquidação de ordens de serviço.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              formData.environment === 'production'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                formData.environment === 'production' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            Ambiente: {formData.environment === 'production' ? 'Produção Real' : 'Homologação (Sandbox)'}
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`mt-6 p-4 rounded-xl flex items-center gap-3 text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        {/* Seção 1: Dados da Empresa */}
        <div>
          <h3 className="text-sm font-bold text-[#0E1116] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            1. Dados da Oficina Prestadora
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Razão Social Oficial
              </label>
              <input
                type="text"
                value={formData.companyLegalName || ''}
                onChange={(e) => setFormData({ ...formData, companyLegalName: e.target.value })}
                placeholder="Ex: Auto Care Estética Automotiva LTDA"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E1E6EC] text-xs focus:outline-none focus:ring-2 focus:ring-[#C8F52E]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                CNPJ da Loja
              </label>
              <input
                type="text"
                value={formData.companyCnpj || ''}
                onChange={(e) => setFormData({ ...formData, companyCnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E1E6EC] text-xs focus:outline-none focus:ring-2 focus:ring-[#C8F52E]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Inscrição Municipal (CCM)
              </label>
              <input
                type="text"
                value={formData.municipalInscription || ''}
                onChange={(e) => setFormData({ ...formData, municipalInscription: e.target.value })}
                placeholder="Ex: 1234567-8"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E1E6EC] text-xs focus:outline-none focus:ring-2 focus:ring-[#C8F52E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Regime Tributário
              </label>
              <select
                value={formData.taxRegime}
                onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E1E6EC] text-xs focus:outline-none focus:ring-2 focus:ring-[#C8F52E] bg-white"
              >
                <option value="simples_nacional">Simples Nacional (Padrão oficinas)</option>
                <option value="lucro_presumido">Lucro Presumido</option>
                <option value="lucro_real">Lucro Real</option>
                <option value="mei">Microempreendedor Individual (MEI)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ambiente de Transmissão
              </label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E1E6EC] text-xs focus:outline-none focus:ring-2 focus:ring-[#C8F52E] bg-white font-semibold"
              >
                <option value="sandbox">Homologação / Testes (Sem valor fiscal)</option>
                <option value="production">Produção Real (Validade jurídica Sefaz)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Seção 2: Parametrização Tributária */}
        <div>
          <h3 className="text-sm font-bold text-[#0E1116] uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-500" />
            2. Enquadramento de Serviços & Alíquotas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Código de Serviço LC 116
              </label>
              <input
                type="text"
                value={formData.defaultServiceCode}
                onChange={(e) => setFormData({ ...formData, defaultServiceCode: e.target.value })}
                placeholder="14.01"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E1E6EC] text-xs focus:outline-none focus:ring-2 focus:ring-[#C8F52E]"
                required
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                14.01 = Lubrificação, limpeza, polimento e lavagem
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                CNAE Automotivo Padrão
              </label>
              <input
                type="text"
                value={formData.cnaeCode}
                onChange={(e) => setFormData({ ...formData, cnaeCode: e.target.value })}
                placeholder="4520-0/05"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E1E6EC] text-xs focus:outline-none focus:ring-2 focus:ring-[#C8F52E]"
                required
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                4520-0/05 = Serviços de lavagem, lubrificação e polimento
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Alíquota de ISS Municipal (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={((formData.defaultIssRateBasisPoints || 0) / 100).toFixed(2)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, defaultIssRateBasisPoints: Math.round(val * 100) });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E1E6EC] text-xs focus:outline-none focus:ring-2 focus:ring-[#C8F52E]"
                  required
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-500">
                  %
                </span>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Geralmente entre 2.00% e 5.00% conforme seu município
              </span>
            </div>
          </div>
        </div>

        {/* Seção 3: Provedor e Chaves */}
        <div>
          <h3 className="text-sm font-bold text-[#0E1116] uppercase tracking-wider mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-gray-500" />
            3. Integração Fiscal Focus NFe
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Token de Acesso da API Focus NFe
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.apiToken || ''}
                  onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                  placeholder={hasStoredToken ? '•••••••••••••••••••••••• (Configurado)' : 'Cole aqui seu token'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E1E6EC] text-xs focus:outline-none focus:ring-2 focus:ring-[#C8F52E]"
                />
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                {hasStoredToken ? 'Token criptografado em cofre AES-256 no banco.' : 'Deixe em branco para usar simulador interno.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Série de RPS da Loja
              </label>
              <input
                type="text"
                value={formData.rpsSeries || '1'}
                onChange={(e) => setFormData({ ...formData, rpsSeries: e.target.value })}
                placeholder="1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E1E6EC] text-xs focus:outline-none focus:ring-2 focus:ring-[#C8F52E]"
              />
            </div>
          </div>
        </div>

        {/* Seção 4: Automação Inteligente de Emissão */}
        <div className="bg-[#F8FAFC] border border-[#E1E6EC] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#0E1116] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#C8F52E] fill-current text-emerald-600" />
            4. Automação de Disparo
          </h3>
          <p className="text-xs text-gray-600 mb-4">
            Configure se o sistema deve transmitir a NFS-e automaticamente na máquina de estados ou aguardar seu comando manual.
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoIssueOnDelivery}
                onChange={(e) => setFormData({ ...formData, autoIssueOnDelivery: e.target.checked })}
                className="w-4 h-4 text-[#0E1116] rounded border-[#E1E6EC] focus:ring-[#C8F52E]"
              />
              <span className="text-xs font-medium text-[#0E1116]">
                Emitir NFS-e automaticamente ao entregar o carro (Transição para status <strong>DELIVERED</strong>)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoIssueOnPayment}
                onChange={(e) => setFormData({ ...formData, autoIssueOnPayment: e.target.checked })}
                className="w-4 h-4 text-[#0E1116] rounded border-[#E1E6EC] focus:ring-[#C8F52E]"
              />
              <span className="text-xs font-medium text-[#0E1116]">
                Emitir NFS-e automaticamente na quitação integral via Pix / Caixa
              </span>
            </label>
          </div>
        </div>

        {/* Rodapé com botão de ação */}
        <div className="pt-4 flex items-center justify-between border-t border-[#E1E6EC]">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 text-gray-400" />
            <span>Garantia de segurança: dados fiscais e credenciais são criptografados ponta a ponta.</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-[#0E1116] text-[#C8F52E] font-bold text-xs uppercase tracking-wider hover:bg-black transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#C8F52E] border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Configurações Fiscais
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

