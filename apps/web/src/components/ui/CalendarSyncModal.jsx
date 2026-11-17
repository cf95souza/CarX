import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Download, 
  ExternalLink, 
  Check, 
  X, 
  Share2, 
  Smartphone, 
  Laptop, 
  Copy, 
  Sparkles,
  Award
} from 'lucide-react';
import { 
  generateIcsString, 
  downloadIcsFile, 
  getGoogleCalendarUrl, 
  getOutlookCalendarUrl, 
  formatOrderForCalendar, 
  exportShopAgendaIcs 
} from '../../utils/calendarUtils';
import { toast } from '../../utils/toast';
import { copyToClipboard } from '../../utils/clipboard';

const CalendarSyncModal = ({ 
  isOpen, 
  onClose, 
  order = null, 
  ordersList = [], 
  shopName = 'Estética Automotiva',
  isManagerView = false 
}) => {
  if (!isOpen) return null;

  // Se tiver uma ordem específica, formata para o padrão
  const singleEvent = order ? formatOrderForCalendar(order, shopName) : null;

  const handleDownloadSingleIcs = () => {
    if (!singleEvent) return;
    const icsStr = generateIcsString(singleEvent, `OS ${order?.id} - ${shopName}`);
    downloadIcsFile(`OS-${order?.id}-${shopName.replace(/\s+/g, '-')}.ics`, icsStr);
    toast.success('Arquivo .ics gerado! Abra-o para adicionar ao Apple Calendar ou Outlook.');
  };

  const handleExportAllIcs = () => {
    const count = exportShopAgendaIcs(ordersList, shopName);
    if (count === 0) {
      toast.warning('Nenhum agendamento futuro ou ativo encontrado na agenda para exportar.');
    } else {
      toast.success(`${count} agendamento(s) exportado(s) com sucesso para arquivo .ics! 📅`);
    }
  };

  const handleCopyEventSummary = async () => {
    if (!singleEvent) return;
    const text = `${singleEvent.title}\n📅 Data: ${new Date(singleEvent.start).toLocaleString('pt-BR')}\n📍 Local: ${singleEvent.location}\n\n${singleEvent.description}`;
    await copyToClipboard(text);
    toast.success('Resumo do agendamento copiado para a área de transferência! 📋');
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0E1116] border border-[#262D35] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#171C24] text-slate-400 hover:text-white hover:bg-[#262D35] flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#C8F52E] flex items-center justify-center shadow-lg shadow-[#C8F52E]/10 text-[#0E1116] flex-shrink-0">
            <CalendarIcon className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              {isManagerView ? 'Sincronizar Agenda da Loja' : 'Adicionar ao seu Calendário'}
            </h2>
            <p className="text-xs text-[#94A3B8]">
              {isManagerView 
                ? 'Exporte os agendamentos da loja para seu iPhone, Android ou Google Calendar.' 
                : 'Não perca o dia do serviço! Adicione um lembrete com 1 clique.'}
            </p>
          </div>
        </div>

        {/* Resumo visual do agendamento se for único */}
        {singleEvent && (
          <div className="bg-[#171C24] border border-[#262D35] rounded-2xl p-4 mb-6 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-[#262D35] pb-2">
              <span className="font-mono text-[#C8F52E] font-bold uppercase tracking-wider">{singleEvent.title}</span>
            </div>
            <div className="text-slate-300 flex items-center gap-2 font-semibold">
              <span className="text-slate-500 font-normal">Data & Hora:</span>
              <span className="text-white">{new Date(singleEvent.start).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div className="text-slate-300 flex items-center gap-2">
              <span className="text-slate-500">Local:</span>
              <span>{singleEvent.location}</span>
            </div>
          </div>
        )}

        {/* Grade de Opções de Exportação / Sincronização */}
        <div className="space-y-3 mb-6">
          
          {/* 1. Google Calendar (Web / Universal) */}
          {singleEvent && (
            <a
              href={getGoogleCalendarUrl(singleEvent)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-4 rounded-2xl bg-[#171C24] hover:bg-[#1F242D] border border-[#262D35] hover:border-[#C8F52E]/60 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  G
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    Google Calendar <ExternalLink className="w-3 h-3 text-slate-400" />
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">Adicionar instantaneamente (Web, Android e iOS)</p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-[#C8F52E]/10 text-[#C8F52E] text-xs font-bold border border-[#C8F52E]/30 group-hover:bg-[#C8F52E] group-hover:text-[#0E1116] transition-all">
                + Adicionar
              </span>
            </a>
          )}

          {/* 2. Apple Calendar (.ics) */}
          {singleEvent && (
            <button
              type="button"
              onClick={handleDownloadSingleIcs}
              className="w-full p-4 rounded-2xl bg-[#171C24] hover:bg-[#1F242D] border border-[#262D35] hover:border-[#C8F52E]/60 flex items-center justify-between transition-all group text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  🍏
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    Apple Calendar & Outlook <Download className="w-3 h-3 text-slate-400" />
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">Baixar arquivo iCal (.ics) para iPhone, iPad, Mac ou Windows</p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 text-xs font-bold border border-sky-500/20 group-hover:bg-sky-500 group-hover:text-slate-950 transition-all">
                Baixar .ics
              </span>
            </button>
          )}

          {/* 3. Microsoft Outlook (Web) */}
          {singleEvent && (
            <a
              href={getOutlookCalendarUrl(singleEvent)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-4 rounded-2xl bg-[#171C24] hover:bg-[#1F242D] border border-[#262D35] hover:border-[#C8F52E]/60 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  📧
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    Microsoft Outlook / 365 <ExternalLink className="w-3 h-3 text-slate-400" />
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">Abrir no Outlook Web ou aplicativo de e-mail</p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">
                + Outlook
              </span>
            </a>
          )}

          {/* 4. Opção do Gestor: Exportar Toda a Agenda da Loja */}
          {(isManagerView || ordersList.length > 0) && (
            <div className="pt-2 border-t border-[#262D35]">
              <button
                type="button"
                onClick={handleExportAllIcs}
                className="w-full p-4 rounded-2xl bg-[#171C24] hover:bg-[#1F242D] border border-[#C8F52E]/60 hover:border-[#C8F52E] flex items-center justify-between transition-all group text-left shadow-lg shadow-[#0E1116]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#C8F52E] text-[#0E1116] flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform shadow-md">
                    📅
                  </div>
                  <div>
                    <h3 className="font-bold font-['Space_Grotesk'] text-white text-sm flex items-center gap-1.5">
                      Exportar Toda a Agenda da Loja (.ics)
                    </h3>
                    <p className="text-[11px] text-[#94A3B8]">
                      Baixe o feed completo com todos os agendamentos da loja
                    </p>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 rounded-xl bg-[#C8F52E] text-[#0E1116] text-xs font-black shadow-md hover:bg-[#B8E622] transition-all flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" /> Feed
                </span>
              </button>
            </div>
          )}

        </div>

        {/* Botões de rodapé: Copiar Resumo & Fechar */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#262D35]">
          {singleEvent && (
            <button
              type="button"
              onClick={handleCopyEventSummary}
              className="px-4 py-2.5 rounded-xl bg-[#171C24] hover:bg-[#1F242D] text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-[#262D35]"
            >
              <Copy className="w-3.5 h-3.5 text-[#C8F52E]" />
              <span>Copiar Texto</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-6 py-2.5 rounded-xl bg-[#171C24] hover:bg-[#1F242D] text-white text-xs font-bold transition-all border border-[#262D35]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarSyncModal;
