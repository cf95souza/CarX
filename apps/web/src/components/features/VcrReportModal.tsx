import React, { useRef } from 'react';
import {
  Printer,
  MessageCircle,
  X,
  ShieldCheck,
  Car,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Calendar,
} from 'lucide-react';
import { useBrand } from '../../contexts/BrandContext';
import { toast } from '../../utils/toast';
import { sendWhatsApp } from '../../utils/whatsappUtils';
import { formatDateBR, formatTimeBR } from '../../utils/dateUtils';
import { Button } from '@carx/ui';
import { Modal } from '@carx/ui';
import { Badge } from '@carx/ui';
import { resolveVehicleCategory } from './inspection/inspectionCatalog';

export interface VcrReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  osData: any;
  points?: any[];
  generalNotes?: string;
  km?: number | string;
  fuelLevel?: string;
  signature?: string | null;
}

// Normaliza qualquer identificador de vista (legado, enum da API ou string) para os 5 ângulos canônicos
export const normalizeViewId = (viewId?: string): string => {
  if (!viewId) return 'principal';
  const v = String(viewId).toLowerCase().trim();
  if (
    v === 'isometric' ||
    v === 'top' ||
    v === 'principal' ||
    v === 'superior' ||
    v.includes('isometr') ||
    v.includes('3/4')
  ) {
    return 'principal';
  }
  if (v === 'front' || v === 'frontal' || v.includes('frente') || v.includes('capo')) {
    return 'frontal';
  }
  if (v === 'rear' || v === 'traseira' || v.includes('atras') || v.includes('mala')) {
    return 'traseira';
  }
  if (
    v === 'left' ||
    v === 'lateral_esquerda' ||
    v === 'perfil_esq' ||
    v.includes('esquerda')
  ) {
    return 'lateral_esquerda';
  }
  if (
    v === 'right' ||
    v === 'lateral_direita' ||
    v === 'perfil_dir' ||
    v.includes('direita')
  ) {
    return 'lateral_direita';
  }
  return 'principal';
};

// Traduz o identificador de vista para Português do Brasil com rótulo legível
export const getViewLabelPT = (viewId?: string): string => {
  const norm = normalizeViewId(viewId);
  const map: Record<string, string> = {
    principal: 'Visão 3/4 Isométrica (Principal)',
    frontal: 'Visão Frontal (Frente / Para-choque)',
    traseira: 'Visão Traseira (Atrás / Tampa)',
    lateral_esquerda: 'Lateral Esquerda (Perfil Esquerdo)',
    lateral_direita: 'Lateral Direita (Perfil Direito)',
  };
  return map[norm] || 'Visão Geral';
};

// Traduz qualquer enum de avaria para Português do Brasil
export const getDamageTypeLabelPT = (raw?: string): string => {
  if (!raw) return 'Risco / Arranhão';
  const lower = String(raw).toLowerCase().trim();
  if (lower === 'scratch' || lower.includes('risco') || lower.includes('arranh')) return 'Risco / Arranhão';
  if (lower === 'dent' || lower.includes('amassado') || lower.includes('mossa')) return 'Amassado (PDR)';
  if (lower === 'paint_chip' || lower.includes('pedrisco') || lower.includes('lasca')) return 'Pedrisco / Lasca de Pintura';
  if (lower === 'stain' || lower.includes('mancha') || lower.includes('oxida') || lower.includes('resina')) return 'Mancha / Oxidação';
  if (lower === 'crack' || lower.includes('trinca') || lower.includes('vidro')) return 'Trinca / Quebra de Vidro';
  if (lower === 'repainted' || lower.includes('repint')) return 'Repintura Prévia';
  if (lower === 'swirl_marks' || lower.includes('holograma')) return 'Micro-riscos / Hologramas';
  return String(raw).replace(/[⚡🔨🎨🪟🫧❓]/gu, '').trim() || 'Avaria Registrada';
};

export const VcrReportModal: React.FC<VcrReportModalProps> = ({
  isOpen,
  onClose,
  osData,
  points = [],
  generalNotes = '',
  km = '',
  fuelLevel = '',
  signature = null,
}) => {
  const { name, logoUrl, whatsapp } = useBrand();
  const printRef = useRef<HTMLDivElement>(null);

  const vehicleCategory = resolveVehicleCategory(
    osData?.vehicle?.sizeClass || osData?.vehicleSizeClass || osData?.porte,
    osData?.vehicle?.model || osData?.veiculo_desc || osData?.vehicleModel
  );

  if (!isOpen || !osData) return null;

  // Enriquecer os pontos com índice global e vista canônica normalizada
  const enrichedPoints = points.map((pt, idx) => ({
    ...pt,
    globalIndex: idx + 1,
    normalizedView: normalizeViewId(pt.view || pt.part),
    rawX: Number(pt.xPercent ?? pt.x ?? pt.x_percent ?? 50),
    rawY: Number(pt.yPercent ?? pt.y ?? pt.y_percent ?? 50),
  }));

  // Identificar quais vistas distintas possuem avarias
  const distinctViews = Array.from(new Set(enrichedPoints.map((p) => p.normalizedView)));
  // Se não houver pontos, exibe ao menos a vista principal
  const viewsToRender = distinctViews.length > 0 ? distinctViews : ['principal'];

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('');

    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) {
      toast.warning('Seu navegador bloqueou o pop-up. Por favor, autorize para imprimir o laudo.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Laudo de Inspeção Digital (VCR) - OS #${osData.osNumber || osData.id}</title>
          ${styles}
          <style>
            @media print {
              body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              @page { size: A4 portrait; margin: 0.8cm; }
              .no-print { display: none !important; }
            }
            body { background: white; font-family: system-ui, -apple-system, sans-serif; }
          </style>
        </head>
        <body class="bg-white p-0 m-0 text-slate-900">
          <div class="font-sans max-w-[21cm] mx-auto p-4 md:p-8">
             ${printContents}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 600);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSendWhatsApp = () => {
    const trackingUrl = `${window.location.origin}/status/${osData.tracking_token || osData.trackingToken || osData.id}`;
    const totalDanos = points.length;
    const vehicleName = osData.veiculo_desc || `${osData.vehicle?.brand || ''} ${osData.vehicle?.model || ''}`.trim() || 'Veículo';
    const clientName = osData.cliente_nome || osData.customer?.name || 'Cliente';

    let msg = `*LAUDO DE INSPEÇÃO DIGITAL (VCR)* 📋🚗\n\n`;
    msg += `Olá, *${clientName}*! Aqui é da *${name || 'Oficina'}*.\n`;
    msg += `Realizamos a vistoria técnica e checklist visual de entrada do seu *${vehicleName}*.\n\n`;
    msg += `📊 *Resumo da Vistoria:*\n`;
    msg += `• *OS:* #${osData.osNumber || osData.id}\n`;
    if (km) msg += `• *KM na Entrada:* ${km} km\n`;
    if (fuelLevel) msg += `• *Nível de Combustível:* ${fuelLevel}\n`;
    msg += `• *Pontos Mapeados:* ${totalDanos === 0 ? 'Nenhuma avaria inicial constatada' : `${totalDanos} ponto(s) de atenção registrado(s)`}\n`;
    msg += `• *Status da Assinatura:* ${signature ? '✔️ Assinado Digitalmente' : '⏳ Registrado na Recepção'}\n\n`;
    if (generalNotes) {
      msg += `📝 *Observações:* ${generalNotes}\n\n`;
    }
    msg += `🔗 *Acompanhe em Tempo Real e Baixe seu Laudo PDF:*\n${trackingUrl}\n\n`;
    msg += `_Agradecemos pela confiança em nossos serviços!_ ✨`;

    const fone = osData.cliente_telefone || osData.customer?.phone || '';
    if (!fone) {
      toast.error('Telefone do cliente não cadastrado nesta Ordem de Serviço.');
      return;
    }

    sendWhatsApp(fone, msg);
    toast.success('Resumo do laudo enviado via WhatsApp!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Laudo VCR • OS #${String(osData.osNumber || osData.id).padStart(4, '0')}`}
      size="lg"
    >
      <div className="space-y-6 text-texto">
        {/* Barra Superior de Ações */}
        <div className="flex items-center justify-between gap-3 p-3 bg-asfalto rounded-xl border border-aco">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-volt" />
            <span className="text-xs font-bold uppercase text-texto">Laudo de Condição Veicular (VCR)</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendWhatsApp}
              className="text-xs uppercase font-bold text-[#25D366] border-[#25D366]/40 hover:bg-[#25D366]/10"
              leftIcon={<MessageCircle className="w-4 h-4 fill-[#25D366] text-[#25D366]" />}
            >
              Enviar WhatsApp
            </Button>

            <Button
              type="button"
              variant="volt"
              size="sm"
              onClick={handlePrint}
              className="text-xs uppercase font-black"
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Imprimir / Salvar PDF
            </Button>
          </div>
        </div>

        {/* Área Visual do Relatório (Imprimível) */}
        <div
          ref={printRef}
          className="p-6 bg-white text-slate-900 rounded-2xl shadow-inner space-y-6 text-xs"
        >
          {/* Cabeçalho do Laudo */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={name || 'CarX'} className="h-12 object-contain" />
              ) : (
                <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg">
                  {name ? name.substring(0, 2).toUpperCase() : 'CX'}
                </div>
              )}
              <div>
                <h2 className="text-base font-black uppercase text-slate-900 leading-tight">
                  {name || 'Oficina Especializada'}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Laudo Oficial de Inspeção e Condição Veicular (VCR)
                </p>
              </div>
            </div>

            <div className="text-right bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Ordem de Serviço</span>
              <span className="text-base font-black text-slate-900">
                #{String(osData.osNumber || osData.id).padStart(4, '0')}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {formatDateBR(new Date())} às {formatTimeBR(new Date())}
              </span>
            </div>
          </div>

          {/* Dados do Veículo e Cliente */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Cliente</span>
              <span className="font-extrabold text-slate-900 block truncate">
                {osData.cliente_nome || osData.customer?.name || 'Cliente'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {osData.cliente_telefone || osData.customer?.phone || 'Sem telefone'}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Veículo</span>
              <span className="font-extrabold text-slate-900 block truncate">
                {osData.veiculo_desc || `${osData.vehicle?.brand || ''} ${osData.vehicle?.model || ''}`.trim() || 'Veículo'}
              </span>
              <span className="text-[10px] text-slate-500 uppercase">
                {osData.vehicle?.color || osData.veiculo_cor || 'Cor N/A'}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Placa</span>
              <span className="font-mono font-black text-slate-900 bg-slate-200 px-2 py-0.5 rounded text-[11px] inline-block uppercase">
                {osData.veiculo_placa || osData.vehicle?.plate || 'SEM PLACA'}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Hodômetro / Combustível</span>
              <span className="font-extrabold text-slate-900 block truncate">
                {km ? `${km} km` : 'KM N/A'} {fuelLevel ? `· ${fuelLevel}` : ''}
              </span>
              <span className="text-[9px] text-slate-400 uppercase block">Check-in</span>
            </div>
          </div>

          {/* Observações da Recepção */}
          {generalNotes && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-amber-950">
              <span className="text-[10px] font-black uppercase text-amber-700 block mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Observações do Checklist na Recepção
              </span>
              <p className="text-xs leading-relaxed">{generalNotes}</p>
            </div>
          )}

          {/* 1. Mapa Multivistas de Avarias (Silhuetas 3D por Ângulo Marcado) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                1. Mapa de Avarias e Condição da Carroceria (VCR Touch)
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase">
                Silhueta: {vehicleCategory.toUpperCase()} · Vistoria Multivistas ({viewsToRender.length}{' '}
                {viewsToRender.length === 1 ? 'ângulo exibido' : 'ângulos exibidos'})
              </span>
            </div>

            <div
              className={`grid gap-4 ${
                viewsToRender.length === 1
                  ? 'grid-cols-1 max-w-[560px] mx-auto'
                  : 'grid-cols-1 md:grid-cols-2'
              }`}
            >
              {viewsToRender.map((viewAngle) => {
                const viewPoints = enrichedPoints.filter((p) => p.normalizedView === viewAngle);
                return (
                  <div
                    key={viewAngle}
                    className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                        {getViewLabelPT(viewAngle)}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          viewPoints.length > 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {viewPoints.length > 0
                          ? `${viewPoints.length} avaria(s)`
                          : 'Nenhuma avaria'}
                      </span>
                    </div>

                    <div className="relative w-full aspect-[16/10] bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                      <img
                        src={`/assets/inspection/${vehicleCategory}/${viewAngle}.png`}
                        alt={`Silhueta ${vehicleCategory} - ${viewAngle}`}
                        className="max-h-full max-w-full object-contain mix-blend-multiply select-none"
                        onError={(e) => {
                          (e.currentTarget as any).src = `/assets/inspection/sedan/${viewAngle}.png`;
                        }}
                      />
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        {viewPoints.map((pt) => {
                          const cx = pt.rawX;
                          const cy = pt.rawY;
                          return (
                            <g key={pt.globalIndex}>
                              <circle
                                cx={cx}
                                cy={cy}
                                r="4.2"
                                className="fill-rose-500/30"
                              />
                              <circle
                                cx={cx}
                                cy={cy}
                                r="2.8"
                                className="fill-rose-600 stroke-white stroke-[0.8]"
                              />
                              <text
                                x={cx}
                                y={cy}
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="fill-white font-black text-[2.4px]"
                              >
                                {pt.globalIndex}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Tabela de Detalhamento de Avarias (100% em Português) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 2. Detalhamento de Avarias Identificadas ({points.length})
              </h3>
              <span className="text-[10px] font-bold text-slate-500">
                {points.length === 0 ? '✔️ Veículo íntegro na entrada' : '⚠️ Avarias pontuais mapeadas'}
              </span>
            </div>

            {points.length === 0 ? (
              <div className="py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-1">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-black uppercase text-slate-800">Nenhuma Avaria Registrada</p>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                  A inspeção visual inicial atestou integridade na lataria e vidros no momento do check-in.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white text-[9px] font-black uppercase">
                    <tr>
                      <th className="p-2 text-center w-10">#</th>
                      <th className="p-2">Posição / Vista</th>
                      <th className="p-2">Tipo de Avaria</th>
                      <th className="p-2">Descrição e Apontamentos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {enrichedPoints.map((pt) => (
                      <tr key={pt.globalIndex} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-bold bg-slate-100">{pt.globalIndex}</td>
                        <td className="p-2 font-bold text-slate-800">
                          {getViewLabelPT(pt.normalizedView)}
                        </td>
                        <td className="p-2">
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                            {getDamageTypeLabelPT(pt.damageType || pt.tipo)}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600">
                          {pt.notes || pt.descricao || 'Registrado na vistoria de entrada'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assinatura e Termo Legal */}
          <div className="pt-4 border-t-2 border-slate-900 space-y-3">
            <p className="text-[9px] text-slate-500 leading-relaxed italic">
              O cliente/responsável atesta a veracidade das avarias registradas acima neste Laudo de Inspeção Digital (VCR), isentando o estabelecimento de avarias preexistentes.
            </p>

            <div className="grid grid-cols-2 gap-4 items-end pt-2">
              <div className="space-y-1">
                <div className="h-20 border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-1 bg-slate-50">
                  {signature ? (
                    <img src={signature} alt="Assinatura" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Assinatura digital coletada na recepção</span>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase text-slate-800 block truncate">
                  {osData.cliente_nome || osData.customer?.name || 'Cliente'}
                </span>
              </div>

              <div className="text-right">
                <div className="inline-block p-2 bg-slate-900 text-white rounded-lg">
                  <span className="text-[8px] font-black uppercase text-volt block">Código de Rastreio VCR</span>
                  <span className="text-[10px] font-mono font-bold">
                    {osData.tracking_token || osData.trackingToken || osData.id}
                  </span>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">CarX Automotivo</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VcrReportModal;
