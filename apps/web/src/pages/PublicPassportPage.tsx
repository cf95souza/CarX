import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Car,
  Calendar,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Share2,
  Download,
  AlertTriangle,
  Building2,
  Sparkles,
  Loader2,
  X,
  FileCheck,
} from 'lucide-react';
import { api } from '../services/api';
import type { PublicVehiclePassportDto } from '@carx/shared';
import { toast } from '../utils/toast';
import { copyToClipboard } from '../utils/clipboard';

export const PublicPassportPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [passport, setPassport] = useState<PublicVehiclePassportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de Transferência de Custódia na Revenda
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const loadPassport = async () => {
    if (!token) {
      setError('Código de verificação do passaporte não informado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.passports.getByToken(token);
      setPassport(data);
    } catch (err: any) {
      setError(
        err?.message || 'Certificado de garantia ou passaporte digital do veículo não localizado no sistema.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassport();
  }, [token]);

  // Ação de Compartilhar Link
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Passaporte Digital: ${passport?.vehicle.brand} ${passport?.vehicle.model}`,
          text: `Confira a autenticidade da garantia e o histórico deste veículo via CarX.`,
          url,
        });
      } catch {
        // Ignora cancelamento pelo usuário
      }
    } else {
      await copyToClipboard(url);
      toast.success('Link do passaporte copiado para a área de transferência!');
    }
  };

  // Envio de Transferência de Titularidade
  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    const formData = new FormData(e.currentTarget);
    const newCustomerName = (formData.get('name') as string)?.trim();
    const newCustomerPhone = (formData.get('phone') as string)?.trim();
    const newCustomerEmail = (formData.get('email') as string)?.trim() || null;
    const odometerKmVal = formData.get('odometerKm') as string;
    const odometerKm = odometerKmVal ? parseInt(odometerKmVal, 10) : null;
    const reason = (formData.get('reason') as string)?.trim() || 'Venda e transferência de propriedade do veículo';

    if (!newCustomerName || newCustomerName.length < 3) {
      toast.error('Informe o nome completo do novo proprietário.');
      return;
    }

    if (!newCustomerPhone || newCustomerPhone.length < 10) {
      toast.error('Informe um WhatsApp válido com DDD do novo proprietário.');
      return;
    }

    setTransferSubmitting(true);
    try {
      const res = await api.passports.transfer(token, {
        newCustomerName,
        newCustomerPhone,
        newCustomerEmail,
        odometerKm,
        reason,
      });

      setTransferSuccess(res.message);
      toast.success('Garantia transferida com sucesso para o novo proprietário!');
      setShowTransferModal(false);
      await loadPassport();
    } catch (err: any) {
      toast.error('Erro ao transferir garantia: ' + (err?.message || 'Falha na requisição'));
    } finally {
      setTransferSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex flex-col items-center justify-center p-6 text-white font-sans">
        <Loader2 className="animate-spin text-[#CCFF00] mb-4" size={48} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
          Validando autenticidade antifraude do veículo...
        </p>
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full bg-[#171C24] border border-rose-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/30 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Passaporte Não Encontrado
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'Não foi possível verificar a autenticidade deste certificado. O link pode ser inválido ou a garantia foi cancelada.'}
          </p>
          <div className="pt-2">
            <a
              href="https://carx.com.br"
              className="inline-block px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs tracking-wider uppercase transition-all"
            >
              Conhecer a Plataforma CarX
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = passport.status === 'expired' || !passport.isValid;
  const isRevoked = passport.status === 'revoked';

  return (
    <div className="min-h-screen bg-[#0E1116] text-white font-sans pb-20 selection:bg-[#CCFF00] selection:text-[#0E1116]">
      {/* TOPO COM LOGO E AUTENTICIDADE */}
      <header className="border-b border-[#232A35] bg-[#0E1116]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-black tracking-tighter text-white">
              CAR<span className="text-[#CCFF00]">X</span>
            </span>
            <span className="h-4 w-px bg-slate-700 hidden sm:inline" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
              Passaporte Digital do Veículo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl bg-[#171C24] hover:bg-[#232A35] border border-[#232A35] text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <Share2 size={15} /> Compartilhar
            </button>
          </div>
        </div>
      </header>

      {/* CONTAINER PRINCIPAL */}
      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        {/* HERO CARD DE AUTENTICIDADE */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#171C24] to-[#12161D] border border-[#232A35] p-6 sm:p-8 shadow-2xl">
          {/* Efeito Neon de Fundo */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-[#CCFF00]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/30">
                <Sparkles size={14} /> Selo de Autenticidade Antifraude
              </div>

              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {passport.vehicle.brand} {passport.vehicle.model}
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  Ano {passport.vehicle.year} • Cor: {passport.vehicle.color || 'Não informada'}
                </p>
              </div>

              {/* Placa Mercosul com Mascaramento LGPD */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white text-[#0E1116] border border-slate-300 shadow-md font-mono font-black text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[#003399]" />
                BRASIL
                <span className="text-[#0E1116] tracking-wider ml-1">{passport.vehicle.plateMasked}</span>
              </div>
            </div>

            {/* BADGE DE STATUS DA GARANTIA */}
            <div className="shrink-0 w-full sm:w-auto p-5 rounded-2xl bg-[#0E1116]/80 border border-[#232A35] text-center sm:text-right space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status da Garantia</p>
              {passport.isValid ? (
                <div className="inline-flex items-center gap-2 text-emerald-400 font-display text-xl font-bold">
                  <ShieldCheck size={24} className="text-[#CCFF00]" />
                  <span>VÁLIDO & ATIVO</span>
                </div>
              ) : isRevoked ? (
                <div className="inline-flex items-center gap-2 text-rose-400 font-display text-xl font-bold">
                  <ShieldAlert size={24} />
                  <span>REVOGADO</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 text-amber-400 font-display text-xl font-bold">
                  <AlertTriangle size={24} />
                  <span>GARANTIA EXPIRADA</span>
                </div>
              )}
              <p className="text-xs text-slate-400 font-medium">
                {passport.isValid
                  ? `${passport.remainingDays} dias restantes de cobertura`
                  : 'Prazo contratual encerrado'}
              </p>
            </div>
          </div>
        </div>

        {/* MENSAGEM DE SUCESSO DE TRANSFERÊNCIA SE HOUVE */}
        {transferSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
            <p className="text-sm font-semibold">{transferSuccess}</p>
          </div>
        )}

        {/* DETALHES DO SERVIÇO & PROCEDÊNCIA DOS MATERIAIS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-3xl bg-[#171C24] border border-[#232A35] space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <FileCheck size={16} className="text-[#CCFF00]" /> Serviço Certificado
            </div>
            <p className="font-display text-lg font-bold text-white">{passport.serviceName}</p>
            <p className="text-xs text-slate-400">
              Garantia de {passport.warrantyMonths} meses contra amarelamento, descolamento e defeitos de aplicação.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#171C24] border border-[#232A35] space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Layers size={16} className="text-[#CCFF00]" /> Procedência & Lote (PPF)
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                {passport.materialRollBrand || 'Película Premium'}
              </p>
              {passport.materialLotNumber ? (
                <div className="inline-block px-2.5 py-1 rounded-md bg-[#0E1116] border border-[#232A35] text-xs font-mono text-[#CCFF00] font-semibold">
                  Lote: {passport.materialLotNumber}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Lote verificado pela oficina</p>
              )}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#171C24] border border-[#232A35] space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Building2 size={16} className="text-[#CCFF00]" /> Centro Certificador
            </div>
            <p className="font-display text-lg font-bold text-white">{passport.workshop.tradeName}</p>
            <p className="text-xs text-slate-400">
              Oficina oficial certificada pela rede CarX SaaS.
            </p>
          </div>
        </div>

        {/* VALIDAÇÃO DE DATAS */}
        <div className="p-6 rounded-3xl bg-[#171C24] border border-[#232A35]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0E1116] border border-[#232A35] flex items-center justify-center text-[#CCFF00]">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Data de Início</p>
                <p className="text-sm font-bold text-white">
                  {new Date(passport.startsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0E1116] border border-[#232A35] flex items-center justify-center text-[#CCFF00]">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vencimento da Cobertura</p>
                <p className="text-sm font-bold text-white">
                  {new Date(passport.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BANNER DE TRANSFERÊNCIA DE CUSTÓDIA NA REVENDA */}
        {passport.isTransferable && passport.isValid && (
          <div className="rounded-3xl bg-gradient-to-r from-[#171C24] via-[#1B212B] to-[#171C24] border border-[#CCFF00]/30 p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#CCFF00]">
                  <ArrowRightLeft size={15} /> Transferível na Revenda
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  Valorize seu carro na Webmotors e OLX
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  A garantia deste veículo não fica presa ao antigo dono: ela é 100% transferível para o novo comprador.
                  Ao fechar a venda, transfira a titularidade em menos de 1 minuto sem custo.
                </p>
              </div>

              <button
                onClick={() => setShowTransferModal(true)}
                className="shrink-0 px-5 py-3.5 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] text-[#0E1116] font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#CCFF00]/10 active:scale-95 flex items-center gap-2"
              >
                <ArrowRightLeft size={16} /> Transferir Titularidade
              </button>
            </div>
          </div>
        )}

        {/* LINHA DO TEMPO DE CUIDADOS E MANUTENÇÕES (TIMELINE) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#171C24] border border-[#232A35] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Clock size={20} className="text-[#CCFF00]" /> Linha do Tempo de Cuidados do Veículo
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {passport.timeline.length} registro(s) auditado(s)
            </span>
          </div>

          <div className="relative border-l-2 border-[#232A35] ml-3 sm:ml-4 space-y-6 pl-6 sm:pl-8">
            {passport.timeline.map((event, idx) => (
              <div key={idx} className="relative group">
                {/* Marcador na linha */}
                <div
                  className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 ${
                    event.type === 'warranty_issued'
                      ? 'bg-[#CCFF00] border-[#0E1116]'
                      : event.type === 'transfer'
                      ? 'bg-sky-400 border-[#0E1116]'
                      : 'bg-emerald-500 border-[#0E1116]'
                  }`}
                />

                <div className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-white">{event.title}</h4>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-xs text-slate-300 leading-relaxed">{event.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span>{event.workshopName}</span>
                    {event.lotNumber && (
                      <span className="px-2 py-0.5 rounded bg-[#0E1116] font-mono text-slate-300">
                        Lote: {event.lotNumber}
                      </span>
                    )}
                    {event.odometerKm && (
                      <span className="font-medium text-slate-300">{event.odometerKm} km</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {passport.timeline.length === 0 && (
              <p className="text-xs text-slate-500">Nenhum evento registrado nesta oficina ainda.</p>
            )}
          </div>
        </div>

        {/* RODAPÉ DO PASSAPORTE & TOKEN DE AUTENTICAÇÃO */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-xs text-slate-500">
            Token Criptográfico Antifraude: <span className="font-mono text-slate-400">{passport.verificationToken}</span>
          </p>
          <p className="text-[11px] text-slate-600 max-w-lg mx-auto">
            Este passaporte é gerado com tecnologia oficial CarX SaaS para proteger oficinas e clientes contra fraudes de películas, vitrificadores e revenda de veículos.
          </p>
        </div>
      </main>

      {/* MODAL DE TRANSFERÊNCIA DE CUSTÓDIA */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#171C24] border border-[#232A35] rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#232A35]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#CCFF00]/10 text-[#CCFF00] flex items-center justify-center">
                  <ArrowRightLeft size={18} />
                </div>
                <h3 className="font-display text-lg font-bold text-white">Transferir Garantia</h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Ao preencher os dados do novo comprador, a titularidade deste certificado será transferida e o histórico de manutenções permanecerá intacto para a posteridade do carro.
              </p>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome do Novo Proprietário *
                </label>
                <input
                  name="name"
                  required
                  placeholder="Ex: Carlos Eduardo Silveira"
                  className="w-full px-4 py-3 rounded-xl bg-[#0E1116] border border-[#232A35] text-sm text-white font-semibold outline-none focus:border-[#CCFF00] transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  WhatsApp com DDD (do novo proprietário) *
                </label>
                <input
                  name="phone"
                  required
                  placeholder="Ex: 11987654321"
                  className="w-full px-4 py-3 rounded-xl bg-[#0E1116] border border-[#232A35] text-sm text-white font-semibold outline-none focus:border-[#CCFF00] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    E-mail (opcional)
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="novo@dono.com"
                    className="w-full px-4 py-3 rounded-xl bg-[#0E1116] border border-[#232A35] text-sm text-white font-semibold outline-none focus:border-[#CCFF00] transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Hodômetro (KM)
                  </label>
                  <input
                    name="odometerKm"
                    type="number"
                    placeholder="Ex: 45000"
                    className="w-full px-4 py-3 rounded-xl bg-[#0E1116] border border-[#232A35] text-sm text-white font-semibold outline-none focus:border-[#CCFF00] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Motivo / Observações
                </label>
                <input
                  name="reason"
                  defaultValue="Venda do veículo e transferência de propriedade"
                  className="w-full px-4 py-3 rounded-xl bg-[#0E1116] border border-[#232A35] text-sm text-white font-semibold outline-none focus:border-[#CCFF00] transition-all"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 bg-white/5 rounded-xl hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="flex-[2] py-3 text-xs font-bold uppercase tracking-wider text-[#0E1116] bg-[#CCFF00] rounded-xl hover:bg-[#b8e600] transition-all flex items-center justify-center gap-2"
                >
                  {transferSubmitting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Confirmar Transferência
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPassportPage;

