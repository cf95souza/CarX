export const getStatusLabel = (status) => {
  const s = String(status || '').toUpperCase().trim();

  switch (s) {
    case 'QUOTE':
    case 'ORCAMENTO':
    case 'ORÇAMENTO':
      return 'Orçamento';
    case 'APPROVED':
    case 'APROVADO':
      return 'Aprovado';
    case 'SCHEDULED':
    case 'AGENDADO':
      return 'Agendado';
    case 'CHECKED_IN':
    case 'CHECK_IN':
      return 'Check-in Realizado';
    case 'IN_PROGRESS':
    case 'EM_EXECUCAO':
    case 'EM EXECUÇÃO':
      return 'Em Execução';
    case 'PAUSED':
    case 'PAUSADO':
      return 'Pausado';
    case 'QA':
    case 'QUALITY_CHECK':
      return 'Controle QA';
    case 'READY':
    case 'PRONTO':
      return 'Pronto p/ Retirada';
    case 'DELIVERED':
    case 'ENTREGUE':
      return 'Entregue';
    case 'COMPLETED':
    case 'CONCLUIDO':
    case 'CONCLUÍDO':
      return 'Concluído';
    case 'CANCELED':
    case 'CANCELADO':
      return 'Cancelado';
    case 'WAITING_PARTS':
      return 'Aguardando Peças';
    default:
      return status || 'Orçamento';
  }
};

export const getStatusStyle = (status) => {
  const s = String(status || '').toUpperCase();
  
  if (s.includes('QUOTE') || s.includes('ORCAMENTO') || s.includes('ORÇAMENTO')) {
    return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold';
  }
  if (s.includes('APPROVED') || s.includes('APROVADO')) {
    return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold';
  }
  if (s.includes('SCHEDULED') || s.includes('AGENDADO') || s.includes('AGUARDA')) {
    return 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700 font-bold';
  }
  if (s.includes('CHECKED_IN') || s.includes('CHECK_IN')) {
    return 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700 font-bold';
  }
  if (s.includes('IN_PROGRESS') || s.includes('EXECU')) {
    return 'bg-[#C8F52E]/30 text-[#0E1116] border-[#0E1116]/30 dark:bg-[#C8F52E]/20 dark:text-[#C8F52E] dark:border-[#C8F52E]/40 font-bold';
  }
  if (s.includes('PAUSED') || s.includes('PAUSADO')) {
    return 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700 font-bold';
  }
  if (s.includes('QA') || s.includes('QUALITY')) {
    return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700 font-bold';
  }
  if (s.includes('READY') || s.includes('PRONTO')) {
    return 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700 font-bold';
  }
  if (s.includes('DELIVERED') || s.includes('ENTREGUE') || s.includes('CONCLU') || s.includes('COMPLETED')) {
    return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold';
  }
  if (s.includes('REJEITADO') || s.includes('CANCEL')) {
    return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 font-bold';
  }

  return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 font-bold';
};

export const formatOsNumber = (val) => {
  if (!val) return '#OS-0001';
  if (typeof val === 'number') {
    return `#OS-${String(val).padStart(4, '0')}`;
  }
  const str = String(val).trim();
  if (/^\d+$/.test(str)) {
    return `#OS-${str.padStart(4, '0')}`;
  }
  if (str.length > 12) {
    return `#${str.slice(0, 8).toUpperCase()}`;
  }
  return str.startsWith('#') ? str : `#${str}`;
};

export const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
};
