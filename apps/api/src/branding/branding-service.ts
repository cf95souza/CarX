import { pool, query } from '../database/db.js';
import { tenantQuery } from '../database/tenant-query.js';
import {
  TenantBrandingDto,
  UpdateTenantBrandingDto,
  UpdateTenantBrandingSchema,
  PwaManifestDto,
  DEFAULT_CARX_BRANDING,
} from '@carx/shared';
import { auditService } from '../audit/audit-service.js';

export interface BrandingActorContext {
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface TenantInfoRow {
  id: string;
  slug: string;
  trade_name: string;
  legal_name: string | null;
  custom_domain: string | null;
  status: string;
}

export class BrandingService {
  /**
   * Obtém a identidade visual (branding) da oficina por tenantId.
   * Se ainda não existirem customizações na tabela tenant_branding,
   * herda o trade_name do tenant e aplica as cores/padrões canônicos CarX.
   */
  async getBrandingByTenantId(tenantId: string): Promise<TenantBrandingDto> {
    const tenantRes = await tenantQuery<TenantInfoRow>(
      tenantId,
      'SELECT id, slug, trade_name, legal_name, custom_domain, status FROM tenants WHERE id = $1 LIMIT 1',
      [tenantId]
    );

    if (tenantRes.rows.length === 0) {
      throw new Error(`Oficina com ID "${tenantId}" não foi encontrada.`);
    }

    const tenant = tenantRes.rows[0];

    const brandingRes = await tenantQuery<TenantBrandingDto>(
      tenantId,
      'SELECT * FROM tenant_branding WHERE tenant_id = $1 LIMIT 1',
      [tenantId]
    );

    if (brandingRes.rows.length > 0) {
      const row = brandingRes.rows[0];
      return {
        ...row,
        slug: tenant.slug,
        trade_name: row.trade_name || tenant.trade_name,
        app_title: row.app_title || row.trade_name || tenant.trade_name,
        app_short_name: row.app_short_name || tenant.trade_name.substring(0, 30),
      };
    }

    // Retorna fallback estruturado
    return {
      tenant_id: tenant.id,
      slug: tenant.slug,
      trade_name: tenant.trade_name,
      tagline: DEFAULT_CARX_BRANDING.tagline,
      logo_url: DEFAULT_CARX_BRANDING.logo_url,
      logo_icon_url: DEFAULT_CARX_BRANDING.logo_icon_url,
      cover_url: DEFAULT_CARX_BRANDING.cover_url,
      primary_color: DEFAULT_CARX_BRANDING.primary_color,
      secondary_color: DEFAULT_CARX_BRANDING.secondary_color,
      accent_color: DEFAULT_CARX_BRANDING.accent_color,
      app_title: tenant.trade_name,
      app_short_name: tenant.trade_name.substring(0, 30),
      description: DEFAULT_CARX_BRANDING.description,
      whatsapp_phone: null,
      social_instagram: null,
      social_facebook: null,
      website_url: tenant.custom_domain ? `https://${tenant.custom_domain}` : DEFAULT_CARX_BRANDING.website_url,
      receipt_footer_notes: DEFAULT_CARX_BRANDING.receipt_footer_notes,
      theme_mode: DEFAULT_CARX_BRANDING.theme_mode,
      custom_css: null,
    };
  }

  /**
   * Obtém a identidade visual pública a partir do slug do subdomínio
   */
  async getBrandingBySlug(slug: string): Promise<TenantBrandingDto & { slug: string }> {
    const tenantRes = await tenantQuery<TenantInfoRow>(
      null,
      'SELECT id, slug FROM tenants WHERE slug = $1 LIMIT 1',
      [slug],
      { bypassRls: true }
    );

    if (tenantRes.rows.length === 0) {
      const error = new Error(`Oficina com subdomínio "${slug}" não foi encontrada.`);
      (error as unknown as { statusCode: number }).statusCode = 404;
      throw error;
    }

    const branding = await this.getBrandingByTenantId(tenantRes.rows[0].id);
    return {
      ...branding,
      slug: tenantRes.rows[0].slug,
    };
  }

  /**
   * Atualiza as configurações de branding e identidade visual da oficina.
   * Emite trilha de auditoria imutável (BRANDING_UPDATED).
   */
  async updateBranding(
    tenantId: string,
    data: UpdateTenantBrandingDto,
    actor?: BrandingActorContext
  ): Promise<TenantBrandingDto> {
    const validated = UpdateTenantBrandingSchema.parse(data);

    // Obtém snapshot anterior para auditoria
    let previousBranding: TenantBrandingDto | null = null;
    try {
      previousBranding = await this.getBrandingByTenantId(tenantId);
    } catch {
      // Ignora se for o primeiro
    }

    const res = await tenantQuery<TenantBrandingDto>(
      tenantId,
      `INSERT INTO tenant_branding (
        tenant_id,
        trade_name,
        tagline,
        logo_url,
        logo_icon_url,
        cover_url,
        primary_color,
        secondary_color,
        accent_color,
        app_title,
        app_short_name,
        description,
        whatsapp_phone,
        social_instagram,
        social_facebook,
        website_url,
        receipt_footer_notes,
        theme_mode,
        custom_css
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        COALESCE($7, '#E63946'),
        COALESCE($8, '#1D3557'),
        COALESCE($9, '#457B9D'),
        $10, $11, $12, $13, $14, $15, $16, $17,
        COALESCE($18, 'system'),
        $19
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        trade_name = COALESCE(EXCLUDED.trade_name, tenant_branding.trade_name),
        tagline = COALESCE(EXCLUDED.tagline, tenant_branding.tagline),
        logo_url = COALESCE(EXCLUDED.logo_url, tenant_branding.logo_url),
        logo_icon_url = COALESCE(EXCLUDED.logo_icon_url, tenant_branding.logo_icon_url),
        cover_url = COALESCE(EXCLUDED.cover_url, tenant_branding.cover_url),
        primary_color = COALESCE(EXCLUDED.primary_color, tenant_branding.primary_color),
        secondary_color = COALESCE(EXCLUDED.secondary_color, tenant_branding.secondary_color),
        accent_color = COALESCE(EXCLUDED.accent_color, tenant_branding.accent_color),
        app_title = COALESCE(EXCLUDED.app_title, tenant_branding.app_title),
        app_short_name = COALESCE(EXCLUDED.app_short_name, tenant_branding.app_short_name),
        description = COALESCE(EXCLUDED.description, tenant_branding.description),
        whatsapp_phone = COALESCE(EXCLUDED.whatsapp_phone, tenant_branding.whatsapp_phone),
        social_instagram = COALESCE(EXCLUDED.social_instagram, tenant_branding.social_instagram),
        social_facebook = COALESCE(EXCLUDED.social_facebook, tenant_branding.social_facebook),
        website_url = COALESCE(EXCLUDED.website_url, tenant_branding.website_url),
        receipt_footer_notes = COALESCE(EXCLUDED.receipt_footer_notes, tenant_branding.receipt_footer_notes),
        theme_mode = COALESCE(EXCLUDED.theme_mode, tenant_branding.theme_mode),
        custom_css = COALESCE(EXCLUDED.custom_css, tenant_branding.custom_css),
        updated_at = NOW()
      RETURNING *;`,
      [
        tenantId,
        validated.trade_name || null,
        validated.tagline || null,
        validated.logo_url || null,
        validated.logo_icon_url || null,
        validated.cover_url || null,
        validated.primary_color || null,
        validated.secondary_color || null,
        validated.accent_color || null,
        validated.app_title || null,
        validated.app_short_name || null,
        validated.description || null,
        validated.whatsapp_phone || null,
        validated.social_instagram || null,
        validated.social_facebook || null,
        validated.website_url || null,
        validated.receipt_footer_notes || null,
        validated.theme_mode || null,
        validated.custom_css || null,
      ]
    );

    const updated = res.rows[0];

    // Grava log imutável de auditoria
    await auditService.record({
      tenantId,
      userId: actor?.userId || null,
      action: 'BRANDING_UPDATED',
      entity: 'tenant_branding',
      entityId: updated.id || tenantId,
      oldValues: previousBranding ? (previousBranding as unknown as Record<string, unknown>) : null,
      newValues: updated as unknown as Record<string, unknown>,
      ipAddress: actor?.ipAddress || null,
      userAgent: actor?.userAgent || null,
    });

    return updated;
  }

  /**
   * Gera dinamicamente o manifesto PWA (manifest.json) para a oficina.
   * Adapta o título, as cores e as URLs de acordo com o modo de execução:
   * - 'tv': Monitor de TV de oficina (fullscreen, layout para TV)
   * - 'staff': App do técnico / atendente (standalone, fluxo de oficina)
   * - 'customer': Portal do cliente / Meu Veículo
   */
  async generatePwaManifest(
    identifier: { tenantId?: string | null; slug?: string | null },
    mode: 'customer' | 'staff' | 'tv' = 'customer'
  ): Promise<PwaManifestDto> {
    let branding: TenantBrandingDto;
    let tenantSlug = identifier.slug;

    if (identifier.tenantId) {
      branding = await this.getBrandingByTenantId(identifier.tenantId);
      if (!tenantSlug) {
        const t = await tenantQuery<TenantInfoRow>(
          identifier.tenantId,
          'SELECT slug FROM tenants WHERE id = $1 LIMIT 1',
          [identifier.tenantId]
        );
        tenantSlug = t.rows[0]?.slug;
      }
    } else if (identifier.slug) {
      const res = await this.getBrandingBySlug(identifier.slug);
      branding = res;
      tenantSlug = res.slug;
    } else {
      // Fallback padrão CarX
      return {
        name: DEFAULT_CARX_BRANDING.trade_name,
        short_name: DEFAULT_CARX_BRANDING.app_short_name,
        description: DEFAULT_CARX_BRANDING.description,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: DEFAULT_CARX_BRANDING.primary_color,
        background_color: '#0B0F19',
        orientation: 'portrait',
        lang: 'pt-BR',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      };
    }

    const shopName = branding.trade_name || 'CarX Oficina';
    const primaryColor = branding.primary_color || DEFAULT_CARX_BRANDING.primary_color;
    const isDark = branding.theme_mode !== 'light';
    const backgroundColor = isDark ? '#0B0F19' : '#FFFFFF';

    let manifestName = shopName;
    let shortName = branding.app_short_name || shopName.substring(0, 15);
    let startUrl = `/${tenantSlug || ''}`;
    let display: 'standalone' | 'fullscreen' = 'standalone';

    if (mode === 'tv') {
      manifestName = `${shopName} — Monitor TV`;
      shortName = `${shortName} TV`;
      startUrl = `/${tenantSlug}/tv`;
      display = 'fullscreen';
    } else if (mode === 'staff') {
      manifestName = `${shopName} — Operação`;
      shortName = `${shortName} App`;
      startUrl = `/${tenantSlug}/app`;
      display = 'standalone';
    } else {
      manifestName = branding.app_title || `${shopName}`;
      startUrl = `/${tenantSlug}/meu-veiculo`;
      display = 'standalone';
    }

    const iconUrl = branding.logo_icon_url || branding.logo_url || '/pwa-192x192.png';

    return {
      name: manifestName,
      short_name: shortName,
      description: branding.description || `Sistema de Atendimento e Acompanhamento ${shopName}`,
      start_url: startUrl,
      scope: `/${tenantSlug ? `${tenantSlug}/` : ''}`,
      display,
      theme_color: primaryColor,
      background_color: backgroundColor,
      orientation: mode === 'tv' ? 'landscape' : 'portrait',
      lang: 'pt-BR',
      icons: [
        {
          src: iconUrl,
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: branding.logo_url || iconUrl,
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: iconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    };
  }
}

export const brandingService = new BrandingService();

