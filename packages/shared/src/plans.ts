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
  WHATSAPP_GATEWAY: 'whatsapp_gateway',
  CUSTOMER_PORTAL: 'customer_portal',
} as const;

export type PlanFeatureType = (typeof PlanFeatures)[keyof typeof PlanFeatures];

export interface FeatureMetadata {
  key: string;
  label: string;
  description: string;
  category: 'operacional' | 'financeiro' | 'comunicacao' | 'avancado';
}

export const ALL_PLAN_FEATURES: FeatureMetadata[] = [
  {
    key: PlanFeatures.WORK_ORDERS,
    label: 'Ordens de Serviço (OS)',
    description: 'Gestão completa do fluxo de OS, status Kanban e laudos.',
    category: 'operacional',
  },
  {
    key: PlanFeatures.CUSTOMERS,
    label: 'Clientes e Frotas',
    description: 'Cadastro de clientes, veículos e histórico.',
    category: 'operacional',
  },
  {
    key: PlanFeatures.VEHICLES,
    label: 'Gestão de Veículos',
    description: 'Identificação por placa Mercosul e histórico de manutenções.',
    category: 'operacional',
  },
  {
    key: PlanFeatures.QUOTES,
    label: 'Orçamentos e Vendas',
    description: 'Elaboração e envio de orçamentos detalhados.',
    category: 'operacional',
  },
  {
    key: PlanFeatures.INSPECTION_CHECKLIST,
    label: 'Vistoria e Checklist VCR',
    description: 'Checklist com marcação de avarias, micragem de pintura e fotos.',
    category: 'operacional',
  },
  {
    key: PlanFeatures.PPF_SPOOL_CONTROL,
    label: 'Controle de Bobinas PPF',
    description: 'Rastreabilidade de lotes, corte e consumo de películas.',
    category: 'operacional',
  },
  {
    key: PlanFeatures.FINANCIAL,
    label: 'Módulo Financeiro e DRE',
    description: 'Contas a pagar/receber, conciliação e DRE automotivo.',
    category: 'financeiro',
  },
  {
    key: PlanFeatures.COMMISSIONS,
    label: 'Comissões de Técnicos',
    description: 'Regras de comissão por serviço, produção e ranking.',
    category: 'financeiro',
  },
  {
    key: PlanFeatures.INVENTORY,
    label: 'Estoque de Peças e Insumos',
    description: 'Controle de saldo, ponto de reposição e movimentações.',
    category: 'financeiro',
  },
  {
    key: PlanFeatures.NFSE,
    label: 'Emissão de NFS-e',
    description: 'Integração municipal para emissão fiscal de serviços.',
    category: 'financeiro',
  },
  {
    key: PlanFeatures.WHATSAPP_BASIC,
    label: 'WhatsApp Básico (wa.me)',
    description: 'Envio manual através de links profundos wa.me.',
    category: 'comunicacao',
  },
  {
    key: PlanFeatures.WHATSAPP_AUTO,
    label: 'WhatsApp Automações',
    description: 'Disparos transacionais automáticos de OS e orçamentos.',
    category: 'comunicacao',
  },
  {
    key: PlanFeatures.WHATSAPP_GATEWAY,
    label: 'Gateway WhatsApp Próprio',
    description: 'Pareamento e conexão de instância Baileys própria da oficina.',
    category: 'comunicacao',
  },
  {
    key: PlanFeatures.CUSTOMER_PORTAL,
    label: 'Portal Meu Veículo',
    description: 'Área do cliente com login OTP por WhatsApp, fotos e garantias.',
    category: 'comunicacao',
  },
  {
    key: PlanFeatures.NPS,
    label: 'Pesquisas de Satisfação NPS',
    description: 'Envio automatizado de pesquisa e alerta de detratores.',
    category: 'comunicacao',
  },
  {
    key: PlanFeatures.MULTI_UNIT,
    label: 'Multi-Filiais',
    description: 'Gestão integrada de matriz e filiais sob a mesma conta.',
    category: 'avancado',
  },
  {
    key: PlanFeatures.CUSTOM_DOMAIN,
    label: 'Domínio Próprio White-Label',
    description: 'Acesso via subdomínio ou domínio personalizado da oficina.',
    category: 'avancado',
  },
  {
    key: PlanFeatures.API_ACCESS,
    label: 'API Pública e Webhooks',
    description: 'Acesso programático via API Keys e disparos de webhook.',
    category: 'avancado',
  },
  {
    key: PlanFeatures.BASIC_REPORTS,
    label: 'Relatórios Gerenciais',
    description: 'Dashboards analíticos de produtividade e faturamento.',
    category: 'avancado',
  },
];

export interface AdminPlanDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  interval: 'monthly' | 'yearly' | 'quarterly' | 'semi_annual';
  limits: PlanLimits;
  features: string[];
  is_active: boolean;
  tenants_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanDto {
  name: string;
  slug: string;
  description?: string;
  price_cents: number;
  interval?: 'monthly' | 'yearly';
  limits: PlanLimits;
  features: string[];
  is_active?: boolean;
}

export interface UpdatePlanDto {
  name?: string;
  description?: string;
  price_cents?: number;
  interval?: 'monthly' | 'yearly';
  limits?: PlanLimits;
  features?: string[];
  is_active?: boolean;
}

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
      PlanFeatures.WHATSAPP_GATEWAY,
      PlanFeatures.PPF_SPOOL_CONTROL,
      PlanFeatures.NFSE,
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
      PlanFeatures.WHATSAPP_GATEWAY,
      PlanFeatures.PPF_SPOOL_CONTROL,
      PlanFeatures.MULTI_UNIT,
      PlanFeatures.NFSE,
      PlanFeatures.API_ACCESS,
      PlanFeatures.CUSTOM_DOMAIN,
    ],
  },
};

