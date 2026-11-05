/**
 * CarX SaaS — Definições e Contratos de Planos, Cotas e Feature Flags
 */

export const PlanSlug = {
  ESSENCIAL: 'essencial',
  PROFISSIONAL: 'profissional',
  PREMIUM: 'premium',
} as const;

export type PlanSlugType = (typeof PlanSlug)[keyof typeof PlanSlug];

export const PlanFeatures = {
  WORK_ORDERS: 'work_orders',
  CUSTOMERS: 'customers',
  VEHICLES: 'vehicles',
  QUOTES: 'quotes',
  BASIC_REPORTS: 'basic_reports',
  FINANCIAL: 'financial',
  COMMISSIONS: 'commissions',
  INVENTORY: 'inventory',
  INSPECTION_CHECKLIST: 'inspection_checklist',
  NPS: 'nps',
  WHATSAPP_BASIC: 'whatsapp_basic',
  WHATSAPP_AUTO: 'whatsapp_auto',
  PPF_SPOOL_CONTROL: 'ppf_spool_control',
  MULTI_UNIT: 'multi_unit',
  NFSE: 'nfse',
  API_ACCESS: 'api_access',
  CUSTOM_DOMAIN: 'custom_domain',
} as const;

export type PlanFeatureType = (typeof PlanFeatures)[keyof typeof PlanFeatures];

export interface PlanLimits {
  max_units: number;
  max_users: number;
  max_work_orders_per_month: number;
  max_storage_mb: number;
  max_whatsapp_messages_per_month: number;
}

export interface PlanDefinition {
  name: string;
  slug: PlanSlugType;
  description: string;
  price_cents: number;
  interval: 'monthly' | 'yearly';
  limits: PlanLimits;
  features: readonly PlanFeatureType[];
}

export const CANONICAL_PLANS: Record<PlanSlugType, PlanDefinition> = {
  [PlanSlug.ESSENCIAL]: {
    name: 'Essencial',
    slug: PlanSlug.ESSENCIAL,
    description: 'Para lojas e estéticas automotivas em fase inicial',
    price_cents: 6990, // R$ 69,90/mês
    interval: 'monthly',
    limits: {
      max_units: 1,
      max_users: 3, // Regra estrita: 4º usuário bloqueado
      max_work_orders_per_month: 100,
      max_storage_mb: 1024, // 1 GB
      max_whatsapp_messages_per_month: 200,
    },
    features: [
      PlanFeatures.WORK_ORDERS,
      PlanFeatures.CUSTOMERS,
      PlanFeatures.VEHICLES,
      PlanFeatures.QUOTES,
      PlanFeatures.BASIC_REPORTS,
      PlanFeatures.WHATSAPP_BASIC,
    ],
  },
  [PlanSlug.PROFISSIONAL]: {
    name: 'Profissional',
    slug: PlanSlug.PROFISSIONAL,
    description: 'Para centros automotivos com equipe estruturada e alto volume de produção',
    price_cents: 14990, // R$ 149,90/mês
    interval: 'monthly',
    limits: {
      max_units: 2,
      max_users: 10,
      max_work_orders_per_month: 500,
      max_storage_mb: 10240, // 10 GB
      max_whatsapp_messages_per_month: 1000,
    },
    features: [
      PlanFeatures.WORK_ORDERS,
      PlanFeatures.CUSTOMERS,
      PlanFeatures.VEHICLES,
      PlanFeatures.QUOTES,
      PlanFeatures.BASIC_REPORTS,
      PlanFeatures.FINANCIAL,
      PlanFeatures.COMMISSIONS,
      PlanFeatures.INVENTORY,
      PlanFeatures.INSPECTION_CHECKLIST,
      PlanFeatures.NPS,
      PlanFeatures.WHATSAPP_AUTO,
      PlanFeatures.PPF_SPOOL_CONTROL,
    ],
  },
  [PlanSlug.PREMIUM]: {
    name: 'Premium',
    slug: PlanSlug.PREMIUM,
    description: 'Para redes de oficinas, franquias e operações multiloja de grande porte',
    price_cents: 29990, // R$ 299,90/mês
    interval: 'monthly',
    limits: {
      max_units: 10,
      max_users: 50,
      max_work_orders_per_month: 999999,
      max_storage_mb: 51200, // 50 GB
      max_whatsapp_messages_per_month: 5000,
    },
    features: [
      PlanFeatures.WORK_ORDERS,
      PlanFeatures.CUSTOMERS,
      PlanFeatures.VEHICLES,
      PlanFeatures.QUOTES,
      PlanFeatures.BASIC_REPORTS,
      PlanFeatures.FINANCIAL,
      PlanFeatures.COMMISSIONS,
      PlanFeatures.INVENTORY,
      PlanFeatures.INSPECTION_CHECKLIST,
      PlanFeatures.NPS,
      PlanFeatures.WHATSAPP_AUTO,
      PlanFeatures.PPF_SPOOL_CONTROL,
      PlanFeatures.MULTI_UNIT,
      PlanFeatures.NFSE,
      PlanFeatures.API_ACCESS,
      PlanFeatures.CUSTOM_DOMAIN,
    ],
  },
};

