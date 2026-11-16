/**
 * Catálogo canônico da Vistoria 360° (Item 43 — Redesenho de Alta Fidelidade do Laudo).
 *
 * Centraliza:
 *  - Categorias de veículo (Hatch, Sedan, SUV, Picape, Moto) e a resolução a partir do
 *    `size_class` do veículo vindo da API.
 *  - Os 5 ângulos oficiais da vistoria e o mapeamento 1:1 para o enum `DamageViewEnum`
 *    do backend (`isometric | front | rear | right | left`).
 *  - Tipos de avaria e severidades compatíveis com `inspection_damage_points`.
 *  - Detecção heurística da peça atingida a partir da coordenada do toque (editável pelo operador).
 *
 * Os clay renders ficam em `/public/assets/inspection/{categoria}/{angulo}.webp`.
 */

export type VehicleCategory = 'hatch' | 'sedan' | 'suv' | 'picape' | 'moto';
export type InspectionAngle =
  | 'principal'
  | 'frontal'
  | 'traseira'
  | 'lateral_direita'
  | 'lateral_esquerda';
export type ApiDamageView = 'isometric' | 'front' | 'rear' | 'right' | 'left';
export type DamageTypeId = 'scratch' | 'dent' | 'paint_chip' | 'stain' | 'crack' | 'repainted';
export type DamageSeverity = 'low' | 'medium' | 'high';

export interface CategoryOption {
  id: VehicleCategory;
  label: string;
}

export interface AngleOption {
  id: InspectionAngle;
  label: string;
  shortLabel: string;
  apiView: ApiDamageView;
  hint: string;
}

export const VEHICLE_CATEGORIES: CategoryOption[] = [
  { id: 'hatch', label: 'Hatch' },
  { id: 'sedan', label: 'Sedan' },
  { id: 'suv', label: 'SUV' },
  { id: 'picape', label: 'Picape' },
  { id: 'moto', label: 'Moto' },
];

export const INSPECTION_ANGLES: AngleOption[] = [
  {
    id: 'principal',
    label: 'Principal 3/4',
    shortLabel: 'Principal',
    apiView: 'isometric',
    hint: 'Visão geral: capô, para-lama e lateral esquerda',
  },
  {
    id: 'frontal',
    label: 'Frontal',
    shortLabel: 'Frontal',
    apiView: 'front',
    hint: 'Para-choque, grade, faróis, capô e para-brisa',
  },
  {
    id: 'traseira',
    label: 'Traseira',
    shortLabel: 'Traseira',
    apiView: 'rear',
    hint: 'Tampa traseira, lanternas, vidro e para-choque',
  },
  {
    id: 'lateral_direita',
    label: 'Lateral Direita',
    shortLabel: 'Lat. Dir.',
    apiView: 'right',
    hint: 'Portas, para-lamas, rodas e soleira do lado direito',
  },
  {
    id: 'lateral_esquerda',
    label: 'Lateral Esquerda',
    shortLabel: 'Lat. Esq.',
    apiView: 'left',
    hint: 'Portas, para-lamas, rodas e soleira do lado esquerdo',
  },
];

export const DAMAGE_TYPES: { id: DamageTypeId; label: string }[] = [
  { id: 'scratch', label: 'Risco' },
  { id: 'dent', label: 'Amassado' },
  { id: 'paint_chip', label: 'Pedrisco' },
  { id: 'stain', label: 'Mancha' },
  { id: 'crack', label: 'Trinca' },
  { id: 'repainted', label: 'Repintura' },
];

export const DAMAGE_SEVERITIES: { id: DamageSeverity; label: string }[] = [
  { id: 'low', label: 'Leve' },
  { id: 'medium', label: 'Moderada' },
  { id: 'high', label: 'Grave' },
];

export const FUEL_LEVELS = ['Reserva', '1/4', '1/2', '3/4', 'Cheio'] as const;
export type FuelLevel = (typeof FUEL_LEVELS)[number];

export const getDamageTypeLabel = (id: string): string =>
  DAMAGE_TYPES.find((d) => d.id === id)?.label ?? id;

export const getSeverityLabel = (id: string): string =>
  DAMAGE_SEVERITIES.find((s) => s.id === id)?.label ?? id;

export const getAngleOption = (id: InspectionAngle): AngleOption =>
  INSPECTION_ANGLES.find((a) => a.id === id) ?? INSPECTION_ANGLES[0];

export const getAngleImage = (category: VehicleCategory, angle: InspectionAngle): string =>
  `/assets/inspection/${category}/${angle}.png`;

/**
 * Converte o `size_class` do veículo ou infere pelo nome do modelo/descrição
 * na categoria visual da vistoria (hatch, sedan, suv, picape, moto). Fallback seguro: sedan.
 */
export function resolveVehicleCategory(
  sizeClass?: string | null,
  modelText?: string | null
): VehicleCategory {
  const normSize = String(sizeClass ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normSize.includes('moto')) return 'moto';
  if (normSize.includes('hatch')) return 'hatch';
  if (normSize.includes('pick') || normSize.includes('picape')) return 'picape';
  if (normSize.includes('suv') || normSize.includes('van') || normSize.includes('utilit')) return 'suv';
  if (normSize.includes('sedan')) return 'sedan';

  // Se não foi identificado pelo porte, infere pelo nome do modelo
  const normModel = String(modelText ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normModel) {
    if (
      normModel.includes('fiesta') ||
      normModel.includes('onix') ||
      normModel.includes('hb20') ||
      normModel.includes('gol') ||
      normModel.includes('polo') ||
      normModel.includes('mobi') ||
      normModel.includes('kwid') ||
      normModel.includes('argo') ||
      normModel.includes('sandero') ||
      normModel.includes('ka') ||
      normModel.includes('c3') ||
      normModel.includes('208') ||
      normModel.includes('fit') ||
      normModel.includes('clio') ||
      normModel.includes('fox') ||
      normModel.includes('up') ||
      normModel.includes('corsa') ||
      normModel.includes('etios hatch') ||
      normModel.includes('yaris hatch') ||
      normModel.includes('hatch')
    ) {
      return 'hatch';
    }

    if (
      normModel.includes('compass') ||
      normModel.includes('t-cross') ||
      normModel.includes('tcross') ||
      normModel.includes('renegade') ||
      normModel.includes('tracker') ||
      normModel.includes('kicks') ||
      normModel.includes('creta') ||
      normModel.includes('sw4') ||
      normModel.includes('duster') ||
      normModel.includes('ecosport') ||
      normModel.includes('hr-v') ||
      normModel.includes('hrv') ||
      normModel.includes('wr-v') ||
      normModel.includes('wrv') ||
      normModel.includes('corolla cross') ||
      normModel.includes('taos') ||
      normModel.includes('tiguan') ||
      normModel.includes('pulse') ||
      normModel.includes('fastback') ||
      normModel.includes('nivus') ||
      normModel.includes('suv')
    ) {
      return 'suv';
    }

    if (
      normModel.includes('hilux') ||
      normModel.includes('ranger') ||
      normModel.includes('s10') ||
      normModel.includes('toro') ||
      normModel.includes('strada') ||
      normModel.includes('saveiro') ||
      normModel.includes('montana') ||
      normModel.includes('amarok') ||
      normModel.includes('rampage') ||
      normModel.includes('l200') ||
      normModel.includes('oroch') ||
      normModel.includes('frontier') ||
      normModel.includes('maverick') ||
      normModel.includes('picape') ||
      normModel.includes('pickup')
    ) {
      return 'picape';
    }

    if (
      normModel.includes('cg') ||
      normModel.includes('titan') ||
      normModel.includes('fan') ||
      normModel.includes('biz') ||
      normModel.includes('fazer') ||
      normModel.includes('xre') ||
      normModel.includes('bros') ||
      normModel.includes('pcx') ||
      normModel.includes('nmax') ||
      normModel.includes('hornet') ||
      normModel.includes('mt-03') ||
      normModel.includes('mt03') ||
      normModel.includes('mt-07') ||
      normModel.includes('bmw gs') ||
      normModel.includes('moto')
    ) {
      return 'moto';
    }

    if (
      normModel.includes('civic') ||
      normModel.includes('corolla') ||
      normModel.includes('cruze') ||
      normModel.includes('virtus') ||
      normModel.includes('cronos') ||
      normModel.includes('onix plus') ||
      normModel.includes('hb20s') ||
      normModel.includes('versa') ||
      normModel.includes('city') ||
      normModel.includes('sentra') ||
      normModel.includes('jetta') ||
      normModel.includes('voyage') ||
      normModel.includes('siena') ||
      normModel.includes('prisma') ||
      normModel.includes('cerato') ||
      normModel.includes('fusion') ||
      normModel.includes('sedan')
    ) {
      return 'sedan';
    }
  }

  return 'sedan';
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * Heurística de peça atingida a partir da coordenada percentual do toque.
 * Os renders são enquadrados de forma padronizada (veículo centralizado ~82% da largura),
 * então as faixas abaixo cobrem a maioria dos casos. O operador pode editar o texto.
 */
export function detectPart(
  category: VehicleCategory,
  angle: InspectionAngle,
  xPercent: number,
  yPercent: number
): string {
  const x = clamp(xPercent);
  const y = clamp(yPercent);

  if (category === 'moto') return detectMotoPart(angle, x, y);

  const isPickup = category === 'picape';

  switch (angle) {
    case 'frontal': {
      // Na vista frontal, o lado esquerdo da imagem é o lado DIREITO do veículo.
      const side = x < 50 ? 'direito' : 'esquerdo';
      if (y < 30) return 'teto';
      if (y < 45) return x < 22 || x > 78 ? `retrovisor ${side}` : 'para-brisa';
      if (y < 56) return x > 28 && x < 72 ? 'capô' : `farol ${side}`;
      if (y < 68) return x > 32 && x < 68 ? 'grade frontal' : `para-lama dianteiro ${side}`;
      return 'para-choque dianteiro';
    }
    case 'traseira': {
      // Na vista traseira, o lado esquerdo da imagem é o lado ESQUERDO do veículo.
      const side = x < 50 ? 'esquerdo' : 'direito';
      if (y < 30) return 'teto';
      if (y < 46) return isPickup ? 'vidro traseiro da cabine' : 'vidro traseiro';
      if (y < 62) {
        if (x > 30 && x < 70) return isPickup ? 'tampa da caçamba' : 'tampa traseira';
        return `lanterna traseira ${side}`;
      }
      return 'para-choque traseiro';
    }
    case 'lateral_direita':
    case 'lateral_esquerda': {
      const side = angle === 'lateral_direita' ? 'direito' : 'esquerdo';
      const sideFem = angle === 'lateral_direita' ? 'direita' : 'esquerda';
      // t = posição ao longo do carro a partir da frente (0 = dianteira, 100 = traseira)
      const t = angle === 'lateral_direita' ? 100 - x : x;

      if (y > 62 && t > 12 && t < 32) return `roda dianteira ${sideFem}`;
      if (y > 62 && t > 68 && t < 90) return `roda traseira ${sideFem}`;
      if (y < 40) {
        if (t < 36) return 'para-brisa / coluna A';
        if (t < 68) return isPickup ? `vidros da cabine (lado ${sideFem})` : `vidros laterais (lado ${sideFem})`;
        return isPickup ? `borda da caçamba ${sideFem}` : 'coluna C / vidro traseiro';
      }
      if (t < 14) return 'para-choque dianteiro';
      if (t < 32) return `para-lama dianteiro ${side}`;
      if (y > 78 && t < 68) return `soleira ${sideFem}`;
      if (t < 50) return `porta dianteira ${sideFem}`;
      if (isPickup) {
        if (t < 64) return `porta traseira ${sideFem}`;
        if (t < 88) return `lateral da caçamba ${sideFem}`;
      } else {
        if (t < 68) return `porta traseira ${sideFem}`;
        if (t < 88) return `lateral traseira ${sideFem}`;
      }
      return 'para-choque traseiro';
    }
    case 'principal':
    default: {
      if (y < 34) return 'teto / para-brisa';
      if (x < 36) return y < 56 ? 'capô' : 'para-choque dianteiro / farol';
      if (x < 52) return 'para-lama dianteiro esquerdo';
      if (x < 72) return y > 72 ? 'soleira esquerda' : 'portas do lado esquerdo';
      return isPickup ? 'caçamba (lado esquerdo)' : 'lateral traseira esquerda';
    }
  }
}

function detectMotoPart(angle: InspectionAngle, x: number, y: number): string {
  switch (angle) {
    case 'frontal':
      if (y < 30) return 'painel / guidão';
      if (y < 50) return x < 30 || x > 70 ? 'retrovisor / manopla' : 'farol / carenagem frontal';
      if (y < 68) return 'tanque / bengalas';
      return 'para-lama / roda dianteira';
    case 'traseira':
      if (y < 40) return 'rabeta / lanterna traseira';
      if (y < 66) return x > 58 || x < 42 ? 'escapamento / pedaleira' : 'suporte de placa / balança';
      return 'pneu / roda traseira';
    case 'lateral_direita':
    case 'lateral_esquerda': {
      const t = angle === 'lateral_direita' ? 100 - x : x;
      if (t < 26) return y < 45 ? 'farol / guidão' : 'roda / para-lama dianteiro';
      if (t > 74) return y < 50 ? 'rabeta / lanterna' : 'roda traseira / escapamento';
      if (y < 50) return t < 52 ? 'tanque de combustível' : 'banco';
      return 'motor / carenagem lateral';
    }
    case 'principal':
    default:
      if (x < 34) return y < 50 ? 'farol / painel' : 'roda dianteira';
      if (x < 62) return y < 50 ? 'tanque de combustível' : 'motor / carenagem';
      return y < 50 ? 'banco / rabeta' : 'roda traseira / escapamento';
  }
}
