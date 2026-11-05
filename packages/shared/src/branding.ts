import { z } from 'zod';

/**
 * PWA Manifest Web App Specification
 */
export const PwaManifestIconSchema = z.object({
  src: z.string(),
  sizes: z.string(),
  type: z.string(),
  purpose: z.string().optional(),
});

export type PwaManifestIcon = z.infer<typeof PwaManifestIconSchema>;

export const PwaManifestSchema = z.object({
  name: z.string().min(1),
  short_name: z.string().min(1),
  description: z.string().optional(),
  start_url: z.string(),
  scope: z.string(),
  display: z.enum(['standalone', 'fullscreen', 'minimal-ui', 'browser']).default('standalone'),
  theme_color: z.string(),
  background_color: z.string().default('#0B0F19'),
  orientation: z.string().optional().default('portrait'),
  lang: z.string().optional().default('pt-BR'),
  icons: z.array(PwaManifestIconSchema),
});

export type PwaManifestDto = z.infer<typeof PwaManifestSchema>;

/**
 * Schema e Tipagem de Branding por Oficina (White Label)
 */
export const HexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const TenantBrandingSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  trade_name: z.string().min(1).max(255).nullable().optional(),
  tagline: z.string().max(255).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  logo_icon_url: z.string().url().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  primary_color: z.string().regex(HexColorRegex, 'Cor primária deve ser um valor hexadecimal válido (#RRGGBB)').default('#E63946'),
  secondary_color: z.string().regex(HexColorRegex, 'Cor secundária deve ser um valor hexadecimal válido (#RRGGBB)').default('#1D3557'),
  accent_color: z.string().regex(HexColorRegex, 'Cor de destaque deve ser um valor hexadecimal válido (#RRGGBB)').default('#457B9D'),
  app_title: z.string().max(255).nullable().optional(),
  app_short_name: z.string().max(50).nullable().optional(),
  description: z.string().nullable().optional(),
  whatsapp_phone: z.string().max(30).nullable().optional(),
  social_instagram: z.string().max(100).nullable().optional(),
  social_facebook: z.string().max(100).nullable().optional(),
  website_url: z.string().max(255).nullable().optional(),
  receipt_footer_notes: z.string().nullable().optional(),
  theme_mode: z.enum(['dark', 'light', 'system']).default('system'),
  custom_css: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]).optional(),
  updated_at: z.union([z.string(), z.date()]).optional(),
});

export type TenantBrandingDto = z.infer<typeof TenantBrandingSchema>;

export const UpdateTenantBrandingSchema = z.object({
  trade_name: z.string().min(1).max(255).optional(),
  tagline: z.string().max(255).nullable().optional(),
  logo_url: z.string().url('URL de logo inválida').nullable().optional(),
  logo_icon_url: z.string().url('URL de ícone inválida').nullable().optional(),
  cover_url: z.string().url('URL de capa inválida').nullable().optional(),
  primary_color: z.string().regex(HexColorRegex, 'Cor primária deve ser um valor hexadecimal (#RRGGBB)').optional(),
  secondary_color: z.string().regex(HexColorRegex, 'Cor secundária deve ser um valor hexadecimal (#RRGGBB)').optional(),
  accent_color: z.string().regex(HexColorRegex, 'Cor de destaque deve ser um valor hexadecimal (#RRGGBB)').optional(),
  app_title: z.string().max(255).optional(),
  app_short_name: z.string().max(50).optional(),
  description: z.string().nullable().optional(),
  whatsapp_phone: z.string().max(30).nullable().optional(),
  social_instagram: z.string().max(100).nullable().optional(),
  social_facebook: z.string().max(100).nullable().optional(),
  website_url: z.string().max(255).nullable().optional(),
  receipt_footer_notes: z.string().nullable().optional(),
  theme_mode: z.enum(['dark', 'light', 'system']).optional(),
  custom_css: z.string().nullable().optional(),
});

export type UpdateTenantBrandingDto = z.infer<typeof UpdateTenantBrandingSchema>;

/**
 * Constantes de Branding Padrão da Plataforma CarX
 */
export const DEFAULT_CARX_BRANDING = {
  trade_name: 'CarX Automação Automotiva',
  tagline: 'Sistema de Alta Performance para Oficinas e Estéticas Automotivas',
  logo_url: '/assets/carx-logo.svg',
  logo_icon_url: '/assets/carx-icon.png',
  cover_url: null,
  primary_color: '#E63946',
  secondary_color: '#1D3557',
  accent_color: '#457B9D',
  app_title: 'CarX',
  app_short_name: 'CarX',
  description: 'Gestão Inteligente, Ordens de Serviço e Checklist Digital',
  whatsapp_phone: null,
  social_instagram: null,
  social_facebook: null,
  website_url: 'https://carx.com.br',
  receipt_footer_notes: 'Documento emitido pelo CarX Sistema de Gestão Automotiva.',
  theme_mode: 'system' as const,
  custom_css: null,
};

