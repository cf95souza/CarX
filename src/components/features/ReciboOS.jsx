import React, { useRef } from 'react';
import { formatDateBR } from '../../utils/dateUtils';
import { 
  Printer, 
  X,
  FileText,
  User,
  Car,
  Calendar,
  DollarSign,
  CheckCircle,
  Hash
} from 'lucide-react';
import { useBrand } from '../../contexts/BrandContext';
import { toast } from '../../utils/toast';
import { formatCurrency } from '../../utils/statusUtils';

const ReciboOS = ({ os, onClose }) => {
  const { name, logoUrl } = useBrand();
  const printRef = useRef();

  if (!os) return null;

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('');
      
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast.warning("Seu navegador bloqueou o pop-up. Por favor, permita pop-ups para imprimir o recibo.");
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo de Serviço - OS #${os.id}</title>
          ${styles}
          <style>
            @media print {
              body { background: white !important; margin: 0; padding: 0; }
              @page { size: A4 portrait; margin: 1cm; }
              .no-print { display: none !important; }
              .print-break-inside-avoid { break-inside: avoid; }
            }
            body { background: white; }
          </style>
        </head>
        <body class="bg-white p-0 m-0">
          <div class="font-sans text-slate-900 bg-white">
             ${printContents}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Calcula o total e o que já foi pago
  const valorTotal = os.valor_total || os.valor || 0;
  const valorPago = os.valor_pago || 0;
  const saldoDevedor = os.saldo_devedor || 0;
  
  // Pegando os serviços detalhados ou caindo para o genérico
  const listaServicos = (os.servicos_detalhados && Array.isArray(os.servicos_detalhados) && os.servicos_detalhados.length > 0)
    ? os.servicos_detalhados
    : [{ nome: os.servico || 'Serviços Gerais', valor_sugerido: valorTotal }];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative animate-fadeIn no-print max-h-[90vh]">
        
        {/* Header Ações (No Print) */}
        <div className="p-6 bg-slate-900 flex items-center justify-between border-b border-white/5 no-print shrink-0 z-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <FileText className="text-primary" size={24} />
            </div>
            <div>
                <h3 className="text-white font-black uppercase text-xs tracking-widest">Recibo do Cliente</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Visualização A4</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="bg-primary hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
            >
              <Printer size={16} strokeWidth={3} /> Gerar PDF / Imprimir
            </button>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-white/10 rounded-full transition-all group"
            >
              <X size={24} className="text-slate-500 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Área do Documento para Impressão */}
        <div 
          ref={printRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 text-slate-900 font-sans print:p-0 print:bg-white custom-scrollbar flex justify-center"
        >
          <div className="bg-white p-8 md:p-12 print:p-0 w-full max-w-[794px] min-h-[1123px] print:min-h-0 shadow-sm print:shadow-none relative border border-slate-200 print:border-0 flex flex-col">
            
            {/* Cabeçalho do Recibo */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-6 mb-6">
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                )}
                <div>
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{name || 'Nossa Empresa'}</h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Recibo de Ordem de Serviço</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-slate-800 tracking-tighter">#{String(os.id).padStart(4, '0')}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Emissão: {formatDateBR(new Date().toISOString())}</p>
              </div>
            </div>

            {/* Informações Principais (Cliente e Veículo) */}
            <div className="grid grid-cols-2 gap-6 mb-8 print-break-inside-avoid">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} className="text-slate-400" />
                  <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Dados do Cliente</h3>
                </div>
                <p className="text-sm font-bold text-slate-800 uppercase">{os.cliente_nome || os.cliente}</p>
                <p className="text-sm text-slate-600 mt-1">Telefone: {os.cliente_telefone || 'Não informado'}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Car size={16} className="text-slate-400" />
                  <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Dados do Veículo</h3>
                </div>
                <p className="text-sm font-bold text-slate-800 uppercase">{os.veiculo_desc || os.veiculo}</p>
                <p className="text-sm text-slate-600 mt-1 uppercase">Placa: <span className="font-mono font-bold">{os.placa || 'Sem placa'}</span> {os.ano && `| Ano: ${os.ano}`}</p>
              </div>
            </div>

            {/* Lista de Serviços Executados */}
            <div className="mb-8 flex-1">
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Detalhamento dos Serviços</h3>
              
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[10%]">Item</th>
                    <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[60%]">Descrição</th>
                    <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[30%] text-right">Valor Unitário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listaServicos.map((item, idx) => (
                    <tr key={idx} className="print-break-inside-avoid">
                      <td className="py-4 px-2 text-sm text-slate-500 font-mono">{(idx + 1).toString().padStart(2, '0')}</td>
                      <td className="py-4 px-2 text-sm font-bold text-slate-800 uppercase">{item.nome}</td>
                      <td className="py-4 px-2 text-sm font-bold text-slate-800 text-right">
                        {formatCurrency(item.valor_sugerido || item.valor || valorTotal)}
                      </td>
                    </tr>
                  ))}
                  {os.observacoes && (
                    <tr className="print-break-inside-avoid bg-slate-50/50">
                      <td colSpan="3" className="py-3 px-4 text-xs italic text-slate-600 border-t border-slate-100">
                        <span className="font-bold uppercase tracking-wider text-[10px] not-italic text-slate-400 block mb-1">Notas:</span>
                        {os.observacoes}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumo Financeiro */}
            <div className="flex justify-end print-break-inside-avoid mt-auto">
              <div className="w-full md:w-1/2 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-4">Resumo Financeiro</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black text-slate-800 uppercase">Valor Total dos Serviços:</span>
                    <span className="text-xl font-black text-primary">{formatCurrency(valorTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé (Assinaturas e Avisos) */}
            <div className="mt-12 pt-8 border-t border-slate-200 print-break-inside-avoid">
              <div className="grid grid-cols-2 gap-12">
                <div className="text-center">
                  <div className="h-px bg-slate-400 w-full mb-2"></div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assinatura do Cliente</p>
                </div>
                <div className="text-center">
                  <div className="h-px bg-slate-400 w-full mb-2"></div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assinatura do Responsável</p>
                </div>
              </div>
              <div className="text-center mt-8">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                  Agradecemos a preferência! Este documento é um recibo não fiscal para simples conferência.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}} />
    </div>
  );
};

export default ReciboOS;
