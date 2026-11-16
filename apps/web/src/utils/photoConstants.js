export const PHOTO_PHASES = [
  { id: 'antes', label: 'Antes (Recepção)', shortLabel: 'Antes', iconKey: 'Camera', color: 'amber', description: 'Registro do estado inicial na recepção do veículo.' },
  { id: 'durante', label: 'Durante (Processo)', shortLabel: 'Durante', iconKey: 'Wrench', color: 'blue', description: 'Registro de etapas intermediárias e detalhes técnicos.' },
  { id: 'depois', label: 'Depois (Acabamento)', shortLabel: 'Depois', iconKey: 'Sparkles', color: 'emerald', description: 'Registro do resultado final e acabamento para entrega.' }
];

export const PHOTO_ANGLES = [
  { id: 'frontal', label: 'Frontal', iconKey: 'Car', description: 'Vista frontal (Capô, para-choque e faróis)' },
  { id: 'lateral_esq', label: 'Lateral Esquerda', iconKey: 'Car', description: 'Perfil esquerdo (Portas, para-lamas e rodas)' },
  { id: 'lateral_dir', label: 'Lateral Direita', iconKey: 'Car', description: 'Perfil direito (Portas, para-lamas e rodas)' },
  { id: 'traseira', label: 'Traseira', iconKey: 'Car', description: 'Vista traseira (Porta-malas, para-choque e lanternas)' },
  { id: 'livre', label: 'Detalhe / Livre', iconKey: 'Focus', description: 'Close-up de acabamento ou outro ângulo' }
];

export const getPhaseInfo = (phaseId) => {
  return PHOTO_PHASES.find(p => p.id === phaseId) || PHOTO_PHASES[1];
};

export const getAngleInfo = (angleId) => {
  return PHOTO_ANGLES.find(a => a.id === angleId) || PHOTO_ANGLES[4];
};
