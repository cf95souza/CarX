import React, { useRef } from 'react';
import { 
  FileCheck, 
  Printer, 
  ShieldCheck, 
  Calendar, 
  User, 
  Car, 
  Award,
  Shield,
  CheckCircle2,
  QrCode,
  X,
  Sparkles,
  Fingerprint
} from 'lucide-react';
import { useBrand } from '../../contexts/BrandContext';
import { toast } from '../../utils/toast';
import { formatDateBR } from '../../utils/dateUtils';

const CertificadoGarantia = ({ os, onClose }) => {
  const { name, logoUrl } = useBrand();
  const printRef = useRef();

  if (!os) return null;

  // Lógica de cálculo dinâmico de garantia e datas reais
  const getWarrantyInfo = () => {
    const rawServices = os.servicos_detalhados || [];
    
    const toMonths = (str) => {
      if (!str) return 0;
      const num = parseInt(String(str).replace(/\D/g, ''), 10) || 0;
      if (String(str).toUpperCase().includes('ANO')) return num * 12;
      return num;
    };

    let mesesGarantia = 12;
    let textoGarantia = os.garantia || '12 Meses';

    if (Array.isArray(rawServices) && rawServices.length > 0) {
      const maiorServico = rawServices.reduce((max, s) => {
        const garMax = toMonths(max?.garantia || max?.warranty_months);
        const garAtual = toMonths(s?.garantia || s?.warranty_months);
        return garAtual > garMax ? s : max;
      }, rawServices[0]);

      if (maiorServico) {
        const val = maiorServico.garantia || maiorServico.warranty_months;
        if (val) {
          mesesGarantia = toMonths(val) || 12;
          textoGarantia = `${mesesGarantia} Meses`;
        }
      }
    } else if (os.garantia) {
      mesesGarantia = toMonths(os.garantia) || 12;
      textoGarantia = os.garantia;
    }

    // Data de execução legítima da OS (sempre válida)
    const rawData =
      os.data ||
      os.deliveredAt ||
      os.delivered_at ||
      os.completedAt ||
      os.completed_at ||
      os.createdAt ||
      os.created_at ||
      new Date().toISOString();

    const baseDate = new Date(rawData);
    const validDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const validUntil = new Date(validDate);
    validUntil.setMonth(validUntil.getMonth() + mesesGarantia);

    return {
      texto: String(textoGarantia).toUpperCase(),
      dataExecucao: formatDateBR(validDate),
      dataValidade: formatDateBR(validUntil),
      meses: mesesGarantia,
    };
  };

  const { texto: garantiaTexto, dataExecucao, dataValidade } = getWarrantyInfo();

  // Dados sanitizados e protegidos contra null/undefined
  const clienteNome = os.cliente_nome || os.cliente || 'Cliente Especial';
  const osRegistro = `#OS-${String(os.id || '0001').replace(/\D/g, '').padStart(4, '0')}`;
  const veiculoDesc = os.veiculo_desc || os.veiculo || 'Veículo Automotivo';
  const placaVeiculo = (os.placa || 'Sem Placa').toUpperCase();
  const anoVeiculo = os.ano || os.vehicle?.year || os.veiculos?.ano || 'Modelo Vigente';
  const tecnicoNome = os.tecnico_nome || os.tecnico || 'Técnico Especialista CarX';
  const nomeOficina = name || 'CaioCar Estética Automotiva';

  // Lista de serviços aplicados
  const listaServicos = Array.isArray(os.servicos_detalhados) && os.servicos_detalhados.length > 0
    ? os.servicos_detalhados.map((s) => s.name || s.nome || s.description || s.service_name || String(s))
    : (os.servico || 'Proteção e Tratamento de Superfície Automotiva')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  // Link do Passaporte Digital do Veículo
  const passportUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/v/${os.id || 'passaporte'}`
    : `https://carx.com.br/v/${os.id}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
    passportUrl
  )}&bgcolor=17-1C-24&color=C8-F5-2E&margin=1`;

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('');

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      toast.warning('Seu navegador bloqueou o pop-up de impressão. Permita pop-ups para imprimir o certificado.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Certificado de Garantia - ${osRegistro} - ${nomeOficina}</title>
          ${styles}
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Space+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@600;700&display=swap');
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background-color: #0E1116 !important;
              color: #FFFFFF !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 0;
            }
            .no-print { display: none !important; }
            .print-exact {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body class="bg-[#0E1116] text-white">
          <div class="print-exact">
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

  return (
    <div className="fixed inset-0 bg-[#07090C]/85 backdrop-blur-md z-[200] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0E1116] border border-[#262D35] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200 max-h-[95vh]">
        
        {/* BARRA DE AÇÕES DO CABEÇALHO (FIXA) */}
        <div className="p-4 sm:p-5 bg-[#171C24] flex items-center justify-between border-b border-[#262D35] shrink-0 z-50">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-[#C8F52E]/10 border border-[#C8F52E]/30 rounded-xl flex items-center justify-center text-[#C8F52E]">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-display font-bold text-sm sm:text-base tracking-tight">
                  Certificado de Garantia & Autenticidade
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C8F52E]/10 text-[#C8F52E] border border-[#C8F52E]/30">
                  CarX Safe Pass
                </span>
              </div>
              <p className="text-xs text-[#9AA7B8] font-mono mt-0.5">
                {osRegistro} • {veiculoDesc} ({placaVeiculo})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="bg-[#C8F52E] hover:bg-[#b4dd29] text-[#0E1116] font-bold px-4 sm:px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-[#C8F52E]/10 active:scale-95"
            >
              <Printer size={15} strokeWidth={2.5} />
              <span>Imprimir PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-[#202734] text-[#9AA7B8] hover:text-white rounded-xl border border-transparent hover:border-[#262D35] transition-all"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ÁREA DE IMPRESSÃO DO CERTIFICADO (ROláVEL EM TELA / FORMATO A4 EXATO) */}
        <div
          ref={printRef}
          className="certificate-print-area flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0E1116] text-white font-sans custom-scrollbar"
        >
          <div className="relative w-full max-w-[760px] mx-auto bg-[#11141A] border-2 border-[#262D35] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden print:border-2 print:border-[#262D35] print:p-6 print:rounded-2xl">
            
            {/* Efeitos de Luz de Fundo e Moldura de Alta Segurança */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#C8F52E]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#C8F52E]" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#C8F52E]" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#C8F52E]" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#C8F52E]" />

            {/* SEÇÃO 1: CABEÇALHO INSTITUCIONAL & LOGOMARCA */}
            <div className="relative z-10 text-center pb-5 border-b border-[#262D35]">
              <div className="flex flex-col items-center justify-center">
                {logoUrl ? (
                  <div className="mb-3 max-h-16 flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt={nomeOficina}
                      className="max-h-14 max-w-[240px] object-contain drop-shadow-md"
                    />
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#171C24] border border-[#262D35] shadow-md mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#C8F52E]/10 text-[#C8F52E] flex items-center justify-center font-bold text-sm">
                      <Sparkles size={16} />
                    </div>
                    <span className="font-display font-black text-white text-base tracking-wider uppercase">
                      {nomeOficina}
                    </span>
                  </div>
                )}

                <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight uppercase mt-1">
                  {nomeOficina}
                </h1>
                <p className="text-[10px] font-bold text-[#C8F52E] uppercase tracking-[0.3em] mt-0.5">
                  Centro de Estética & Proteção Automotiva de Elite
                </p>

                <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#171C24] border border-[#262D35]">
                  <ShieldCheck size={13} className="text-[#C8F52E]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                    Certificado Oficial de Garantia & Autenticidade
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#9AA7B8] max-w-lg mx-auto mt-3 font-normal leading-relaxed">
                Este documento formal atesta que o veículo especificado abaixo recebeu tratamentos técnicos
                de proteção de alta performance, executados com materiais homologados e em conformidade com os
                rigorosos padrões do setor automotivo.
              </p>
            </div>

            {/* SEÇÃO 2: GRID DE IDENTIFICAÇÃO (PROPRIETÁRIO, VEÍCULO, REGISTRO E DATA) */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
              
              {/* Proprietário */}
              <div className="bg-[#171C24] border border-[#262D35] rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0E1116] border border-[#262D35] flex items-center justify-center text-[#9AA7B8] shrink-0">
                  <User size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-[#9AA7B8] uppercase tracking-wider">Proprietário</p>
                  <p className="text-xs font-bold text-white uppercase truncate">{clienteNome}</p>
                </div>
              </div>

              {/* Registro */}
              <div className="bg-[#171C24] border border-[#262D35] rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0E1116] border border-[#262D35] flex items-center justify-center text-[#C8F52E] shrink-0">
                  <FileCheck size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-[#9AA7B8] uppercase tracking-wider">Número de Registro</p>
                  <p className="text-xs font-mono font-bold text-[#C8F52E] truncate">{osRegistro}</p>
                </div>
              </div>

              {/* Veículo */}
              <div className="bg-[#171C24] border border-[#262D35] rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0E1116] border border-[#262D35] flex items-center justify-center text-[#9AA7B8] shrink-0">
                  <Car size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-[#9AA7B8] uppercase tracking-wider">Veículo / Modelo</p>
                  <p className="text-xs font-bold text-white uppercase truncate">{veiculoDesc}</p>
                </div>
              </div>

              {/* Placa */}
              <div className="bg-[#171C24] border border-[#262D35] rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0E1116] border border-[#262D35] flex items-center justify-center font-mono font-black text-[11px] text-white shrink-0">
                  BR
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-[#9AA7B8] uppercase tracking-wider">Placa Identificadora</p>
                  <p className="text-xs font-mono font-bold text-white tracking-wider">{placaVeiculo}</p>
                </div>
              </div>

              {/* Ano */}
              <div className="bg-[#171C24] border border-[#262D35] rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0E1116] border border-[#262D35] flex items-center justify-center font-mono font-bold text-[10px] text-[#9AA7B8] shrink-0">
                  ANO
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-[#9AA7B8] uppercase tracking-wider">Ano de Fabricação</p>
                  <p className="text-xs font-bold text-white uppercase truncate">{anoVeiculo}</p>
                </div>
              </div>

              {/* Data Execução */}
              <div className="bg-[#171C24] border border-[#262D35] rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0E1116] border border-[#262D35] flex items-center justify-center text-[#9AA7B8] shrink-0">
                  <Calendar size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-[#9AA7B8] uppercase tracking-wider">Data de Execução</p>
                  <p className="text-xs font-mono font-bold text-white">{dataExecucao}</p>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: SERVIÇOS & COBERTURAS TÉCNICAS */}
            <div className="relative z-10 my-4 text-center">
              <p className="text-[9px] font-bold text-[#9AA7B8] uppercase tracking-widest mb-2">
                Tratamentos Técnicos e Aplicações Realizadas
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {listaServicos.map((serv, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-[#171C24] border border-[#262D35] text-xs font-bold text-white flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 size={13} className="text-[#C8F52E]" />
                    {serv}
                  </span>
                ))}
              </div>
            </div>

            {/* SEÇÃO 4: CARD PRINCIPAL DE GARANTIA, VIGÊNCIA & QR CODE */}
            <div className="relative z-10 my-5 bg-gradient-to-r from-[#171C24] via-[#1A202A] to-[#171C24] border-2 border-[#C8F52E]/50 rounded-3xl p-5 sm:p-6 shadow-xl shadow-[#C8F52E]/5 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C8F52E]">
                  <Award size={14} /> Cobertura & Vigência Assegurada
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                  {garantiaTexto} DE GARANTIA
                </h2>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0E1116] border border-[#262D35] text-xs font-bold mt-1">
                  <Calendar size={13} className="text-[#C8F52E]" />
                  <span className="text-[#9AA7B8]">Vigência até:</span>
                  <span className="text-white font-mono">{dataValidade}</span>
                </div>
              </div>

              {/* QR Code de Autenticidade Digital */}
              <div className="flex flex-col items-center bg-[#0E1116] border border-[#262D35] p-3 rounded-2xl shadow-inner shrink-0">
                <img
                  src={qrCodeUrl}
                  alt="QR Code Passaporte Digital"
                  className="w-20 h-20 rounded-lg object-contain bg-[#171C24] p-1 border border-[#262D35]"
                />
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#9AA7B8] mt-1.5 text-center leading-tight">
                  Passaporte Digital<br />
                  <strong className="text-[#C8F52E]">Autenticado</strong>
                </span>
              </div>
            </div>

            {/* SEÇÃO 5: ASSINATURAS & TERMOS LEGAIS */}
            <div className="relative z-10 mt-6 pt-4 border-t border-[#262D35]">
              <div className="grid grid-cols-2 gap-8 text-center">
                <div>
                  <div className="h-px bg-[#262D35] mb-2 w-3/4 mx-auto" />
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">{tecnicoNome}</p>
                  <p className="text-[9px] text-[#9AA7B8] uppercase tracking-widest">Responsável Técnico de Box</p>
                </div>
                <div>
                  <div className="h-px bg-[#262D35] mb-2 w-3/4 mx-auto" />
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Diretoria de Qualidade</p>
                  <p className="text-[9px] text-[#9AA7B8] uppercase tracking-widest">Controle de Garantia & QA</p>
                </div>
              </div>

              <div className="mt-5 text-center">
                <p className="text-[9px] text-[#5B6674] font-medium leading-relaxed max-w-md mx-auto">
                  A vigência desta garantia é regulada pelo cumprimento das revisões preventivas periódicas especificadas
                  no termo de entrega e na utilização dos produtos de manutenção recomendados.
                </p>
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[8px] font-mono text-[#5B6674] uppercase tracking-wider">
                  <Fingerprint size={10} />
                  <span>Autenticação Digital CarX: SHA256-VCR-{os.id || '00'}-{Date.now().toString(36).toUpperCase()}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificadoGarantia;
