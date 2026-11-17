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
              @page { size: A4 portrait; margin: 1cm; }
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

  const getViewLabel = (viewId: string) => {
    const map: Record<string, string> = {
      superior: 'Visão Superior (Teto / Capô)',
      frontal: 'Vista Frontal (Frente)',
      traseira: 'Vista Traseira (Atrás)',
      lateral_esquerda: 'Lateral Esquerda',
      lateral_direita: 'Lateral Direita',
      top: 'Superior / Teto',
      front: 'Frontal',
      rear: 'Traseira',
      left: 'Lateral Esquerda',
      right: 'Lateral Direita',
    };
    return map[viewId] || viewId;
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
            <span className="text-xs font-bold uppercase text-texto">Laudo de Condição Veicular</span>
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

          {/* 1. Mapa Visual da Silhueta 3D (VCR Touch) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                1. Mapa de Avarias e Condição da Carroceria (VCR Touch)
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase">
                Silhueta: {vehicleCategory.toUpperCase()} · Vistoria 360°
              </span>
            </div>

            <div className="relative w-full h-[200px] sm:h-[230px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-3">
              <img
                src={`/assets/inspection/${vehicleCategory}/principal.png`}
                alt={`Silhueta ${vehicleCategory}`}
                className="max-h-full max-w-full object-contain mix-blend-multiply select-none"
                onError={(e) => {
                  (e.currentTarget as any).src = '/assets/inspection/sedan/principal.png';
                }}
              />
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {points.map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={`${pt.xPercent ?? pt.x ?? 50}%`}
                      cy={`${pt.yPercent ?? pt.y ?? 50}%`}
                      r="10"
                      className="fill-rose-600 stroke-white stroke-2"
                    />
                    <text
                      x={`${pt.xPercent ?? pt.x ?? 50}%`}
                      y={`${pt.yPercent ?? pt.y ?? 50}%`}
                      textAnchor="middle"
                      dy=".35em"
                      className="fill-white text-[8px] font-black"
                    >
                      {idx + 1}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* 2. Tabela de Avarias */}
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
                      <th className="p-2">Avaria</th>
                      <th className="p-2">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {points.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-bold bg-slate-100">{idx + 1}</td>
                        <td className="p-2 uppercase font-bold text-slate-700">{getViewLabel(pt.view || pt.part)}</td>
                        <td className="p-2">
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                            {pt.damageType || pt.tipo || 'Risco / Amassado'}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600">{pt.notes || pt.descricao || 'Registrado na vistoria de entrada'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assinatura e Termo */}
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
                  <span className="text-[10px] font-mono font-bold">{osData.tracking_token || osData.trackingToken || osData.id}</span>
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
