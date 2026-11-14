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
    return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
  }
  if (s.includes('APPROVED') || s.includes('APROVADO')) {
    return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
  }
  if (s.includes('SCHEDULED') || s.includes('AGENDADO') || s.includes('AGUARDA')) {
    return 'bg-sky-500/10 text-sky-500 border-sky-500/30';
  }
  if (s.includes('CHECKED_IN') || s.includes('CHECK_IN')) {
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
  }
  if (s.includes('IN_PROGRESS') || s.includes('EXECU')) {
    return 'bg-[#C8F52E]/15 text-[#88ab14] dark:text-[#C8F52E] border-[#C8F52E]/40 font-bold';
  }
  if (s.includes('PAUSED') || s.includes('PAUSADO')) {
    return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
  }
  if (s.includes('QA') || s.includes('QUALITY')) {
    return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
  }
  if (s.includes('READY') || s.includes('PRONTO')) {
    return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
  }
  if (s.includes('DELIVERED') || s.includes('ENTREGUE') || s.includes('CONCLU') || s.includes('COMPLETED')) {
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40';
  }
  if (s.includes('REJEITADO') || s.includes('CANCEL')) {
    return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
  }

  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
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
