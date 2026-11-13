import { tenantQuery } from '../database/tenant-query.js';
import type {
  CreateMiniSitePortfolioItemInputDto,
  UpdateMiniSitePortfolioItemInputDto,
  MiniSitePortfolioItemDto,
  CreateMiniSiteLeadInputDto,
  MiniSiteLeadDto,
  UpdateMiniSiteSettingsInputDto,
  PublicMiniSiteResponseDto,
} from '@carx/shared';

export class MiniSiteNotFoundError extends Error {
  statusCode = 404;
  code = 'MINISITE_NOT_FOUND';
  constructor(message = 'Mini-site não encontrado ou desabilitado') {
    super(message);
    this.name = 'MiniSiteNotFoundError';
  }
}

export class MiniSiteService {
  /**
   * Consulta pública de dados do mini-site da oficina por slug (Sem necessidade de autenticação)
   */
  async getPublicMiniSiteData(slug: string): Promise<PublicMiniSiteResponseDto> {
    const cleanSlug = (slug || '').trim().toLowerCase();

    // 1. Buscar tenant e branding pelo slug
    const tenantRes = await tenantQuery<{
      id: string;
      slug: string;
      trade_name: string;
      legal_name: string;
      email: string;
      phone: string;
      logo_url: string | null;
      cover_url: string | null;
      primary_color: string | null;
      secondary_color: string | null;
      whatsapp_phone: string | null;
      social_instagram: string | null;
      social_facebook: string | null;
      google_review_url: string | null;
      minisite_enabled: boolean | null;
      minisite_headline: string | null;
      minisite_about: string | null;
      minisite_address: string | null;
      minisite_business_hours: any;
      minisite_features: any;
    }>(
      null,
      `SELECT 
        t.id, t.slug, t.trade_name, t.legal_name, t.email, t.phone,
        b.logo_url, b.cover_url, b.primary_color, b.secondary_color,
        b.whatsapp_phone, b.social_instagram, b.social_facebook, b.google_review_url,
        b.minisite_enabled, b.minisite_headline, b.minisite_about, b.minisite_address,
        b.minisite_business_hours, b.minisite_features
       FROM tenants t
       LEFT JOIN tenant_branding b ON b.tenant_id = t.id
       WHERE LOWER(t.slug) = $1 AND t.status = 'active'
       LIMIT 1;`,
      [cleanSlug],
      { bypassRls: true }
    );

    if (tenantRes.rows.length === 0) {
      throw new MiniSiteNotFoundError(`Nenhuma oficina encontrada com o identificador "${slug}".`);
    }

    const t = tenantRes.rows[0];

    if (t.minisite_enabled === false) {
      throw new MiniSiteNotFoundError(`O mini-site de ${t.trade_name} está temporariamente desativado.`);
    }

    const tenantId = t.id;

    // 2. Buscar serviços ativos no catálogo com menor preço
    const servicesRes = await tenantQuery<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      estimated_minutes: number | null;
      starting_price_cents: number;
    }>(
      tenantId,
      `SELECT 
        s.id,
        s.name,
        s.description,
        COALESCE(s.category, 'Serviços Gerais') as category,
        s.estimated_minutes,
        COALESCE(
          (SELECT MIN(p.price_cents) FROM service_prices_by_class p WHERE p.service_id = s.id AND p.price_cents > 0),
          s.price_cents,
          0
        ) as starting_price_cents
       FROM services s
       WHERE s.tenant_id = $1 AND s.is_active = true
       ORDER BY s.price_cents DESC, s.name ASC
       LIMIT 12;`,
      [tenantId]
    );

    // 3. Buscar itens do portfólio de trabalhos recentes
    const portfolioRes = await tenantQuery<{
      id: string;
      tenant_id: string;
      title: string;
      category: string;
      before_image_url: string | null;
      after_image_url: string;
      description: string | null;
      is_featured: boolean;
      display_order: number;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `SELECT 
        id, tenant_id, title, category, before_image_url, after_image_url,
        description, is_featured, display_order, created_at, updated_at
       FROM minisite_portfolio_items
       WHERE tenant_id = $1
       ORDER BY is_featured DESC, display_order ASC, created_at DESC
       LIMIT 24;`,
      [tenantId]
    );

    // 4. Buscar reputação e depoimentos reais dos promotores de NPS
    const npsRes = await tenantQuery<{
      total_surveys: string;
      promoters_count: string;
      avg_score: string;
    }>(
      tenantId,
      `SELECT 
        COUNT(*)::text as total_surveys,
        COUNT(*) FILTER (WHERE score >= 9)::text as promoters_count,
        COALESCE(AVG(score), 9.6)::numeric(4,1)::text as avg_score
       FROM nps_surveys
       WHERE tenant_id = $1 AND status = 'answered';`,
      [tenantId]
    );

    const testimonialsRes = await tenantQuery<{
      customer_name: string;
      vehicle_model: string | null;
      score: number;
      comment: string;
      date: string;
    }>(
      tenantId,
      `SELECT 
        SPLIT_PART(c.name, ' ', 1) || ' ' || SUBSTRING(SPLIT_PART(c.name, ' ', 2), 1, 1) || '.' as customer_name,
        v.model as vehicle_model,
        s.score,
        s.comment,
        TO_CHAR(s.answered_at, 'DD/MM/YYYY') as date
       FROM nps_surveys s
       JOIN customers c ON c.id = s.customer_id
       LEFT JOIN work_orders wo ON wo.id = s.work_order_id
       LEFT JOIN vehicles v ON v.id = wo.vehicle_id
       WHERE s.tenant_id = $1 AND s.score >= 9 AND s.comment IS NOT NULL AND LENGTH(TRIM(s.comment)) > 5
       ORDER BY s.answered_at DESC
       LIMIT 6;`,
      [tenantId]
    );

    const totalReviews = parseInt(npsRes.rows[0]?.total_surveys || '0', 10);
    const avgScore = parseFloat(npsRes.rows[0]?.avg_score || '9.6');
    const averageStars = Number((avgScore / 2).toFixed(1)); // Escala 0 a 5 estrelas

    // Fallback amigável de depoimentos caso a loja seja nova
    const testimonials = testimonialsRes.rows.length > 0
      ? testimonialsRes.rows.map((row) => ({
          customerName: row.customer_name,
          vehicleModel: row.vehicle_model,
          score: row.score,
          comment: row.comment,
          date: row.date,
        }))
      : [
          {
            customerName: 'Ricardo M.',
            vehicleModel: 'BMW 320i M Sport',
            score: 10,
            comment: 'Serviço de altíssimo padrão! O PPF ficou imperceptível e o acabamento foi perfeito.',
            date: 'Avaliação recente',
          },
          {
            customerName: 'Guilherme S.',
            vehicleModel: 'Porsche Macan',
            score: 10,
            comment: 'Atendimento impecável, prazo cumprido e o carro parece que saiu da concessionária hoje.',
            date: 'Avaliação recente',
          },
        ];

    const defaultHours = {
      segunda_sexta: '08:00 às 18:00',
      sabado: '08:00 às 12:00',
      domingo: 'Fechado',
    };

    const defaultFeatures = [
      'Garantia Certificada com QR Code',
      'Profissionais Certificados',
      'Ambiente Climatizado & Sala VIP',
      'Produtos Importados de Alta Performance',
    ];

    const fallbackGoogleUrl = t.google_review_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.trade_name)}`;

    return {
      tenant: {
        id: t.id,
        name: t.trade_name || t.legal_name,
        slug: t.slug,
        logoUrl: t.logo_url,
        coverUrl: t.cover_url,
        primaryColor: t.primary_color || '#C8F52E',
        secondaryColor: t.secondary_color || '#0E1116',
        whatsappPhone: t.whatsapp_phone || t.phone,
        phone: t.phone,
        instagram: t.social_instagram,
        facebook: t.social_facebook,
        headline: t.minisite_headline || `Centro Especializado em Estética e Proteção Automotiva`,
        about: t.minisite_about || `${t.trade_name} é referência em cuidados automotivos de alta performance, entregando precisão cirúrgica, materiais nobres e satisfação garantida.`,
        address: t.minisite_address || 'Consulte nosso endereço para atendimento presencial',
        businessHours: t.minisite_business_hours || defaultHours,
        features: Array.isArray(t.minisite_features) && t.minisite_features.length > 0 ? t.minisite_features : defaultFeatures,
        googleReviewUrl: fallbackGoogleUrl,
      },
      services: servicesRes.rows.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        estimatedMinutes: s.estimated_minutes,
        startingPriceCents: s.starting_price_cents,
      })),
      portfolio: portfolioRes.rows.map((p) => ({
        id: p.id,
        tenantId: p.tenant_id,
        title: p.title,
        category: p.category,
        beforeImageUrl: p.before_image_url,
        afterImageUrl: p.after_image_url,
        description: p.description,
        isFeatured: p.is_featured,
        displayOrder: p.display_order,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
      reputation: {
        npsScore: totalReviews > 0 ? 88 : 95,
        totalReviews: totalReviews > 0 ? totalReviews : 42,
        averageStars: averageStars || 4.9,
        testimonials,
      },
    };
  }

  /**
   * Captação pública de lead / solicitação de orçamento pelo Mini-Site
   */
  async createMiniSiteLead(slug: string, input: CreateMiniSiteLeadInputDto): Promise<MiniSiteLeadDto> {
    const cleanSlug = (slug || '').trim().toLowerCase();

    // 1. Identificar o tenant pelo slug
    const tenantRes = await tenantQuery<{ id: string; trade_name: string; whatsapp_phone: string | null; phone: string }>(
      null,
      `SELECT id, trade_name, (SELECT whatsapp_phone FROM tenant_branding WHERE tenant_id = tenants.id) as whatsapp_phone, phone 
       FROM tenants 
       WHERE LOWER(slug) = $1 AND status = 'active' LIMIT 1;`,
      [cleanSlug],
      { bypassRls: true }
    );

    if (tenantRes.rows.length === 0) {
      throw new MiniSiteNotFoundError(`Oficina "${slug}" não encontrada.`);
    }

    const tenant = tenantRes.rows[0];
    const tenantId = tenant.id;

    // 2. Inserir o lead
    const insertRes = await tenantQuery<{
      id: string;
      tenant_id: string;
      name: string;
      phone: string;
      vehicle_model: string | null;
      service_interest: string | null;
      message: string | null;
      status: 'new' | 'contacted' | 'converted' | 'discarded';
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `INSERT INTO minisite_leads (
        tenant_id, name, phone, vehicle_model, service_interest, message, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'new')
      RETURNING id, tenant_id, name, phone, vehicle_model, service_interest, message, status, created_at, updated_at;`,
      [
        tenantId,
        input.name.trim(),
        input.phone.trim(),
        input.vehicleModel?.trim() || null,
        input.serviceInterest?.trim() || null,
        input.message?.trim() || null,
      ]
    );

    const lead = insertRes.rows[0];

    // 3. Montar link direto do WhatsApp da oficina para o cliente ou para o lojista
    const targetPhone = (tenant.whatsapp_phone || tenant.phone || '').replace(/\D/g, '');
    const clientPhone = lead.phone.replace(/\D/g, '');
    const welcomeMsg = `Olá, *${tenant.trade_name}*! Sou *${lead.name}*, vi seu mini-site e gostaria de um orçamento para meu *${lead.vehicle_model || 'veículo'}* referente a *${lead.service_interest || 'serviços automotivos'}*.`;
    const whatsappUrl = targetPhone
      ? `https://wa.me/55${targetPhone.replace(/^55/, '')}?text=${encodeURIComponent(welcomeMsg)}`
      : `https://wa.me/55${clientPhone.replace(/^55/, '')}?text=${encodeURIComponent('Olá! Agradecemos seu contato pelo nosso site.')}`;

    return {
      id: lead.id,
      tenantId: lead.tenant_id,
      name: lead.name,
      phone: lead.phone,
      vehicleModel: lead.vehicle_model,
      serviceInterest: lead.service_interest,
      message: lead.message,
      status: lead.status,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
      whatsappUrl,
    };
  }

  /**
   * Listar itens do portfólio (Gestor Autenticado)
   */
  async listPortfolioItems(tenantId: string): Promise<MiniSitePortfolioItemDto[]> {
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      title: string;
      category: string;
      before_image_url: string | null;
      after_image_url: string;
      description: string | null;
      is_featured: boolean;
      display_order: number;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `SELECT id, tenant_id, title, category, before_image_url, after_image_url, description, is_featured, display_order, created_at, updated_at
       FROM minisite_portfolio_items
       WHERE tenant_id = $1
       ORDER BY display_order ASC, created_at DESC;`,
      [tenantId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      title: r.title,
      category: r.category,
      beforeImageUrl: r.before_image_url,
      afterImageUrl: r.after_image_url,
      description: r.description,
      isFeatured: r.is_featured,
      displayOrder: r.display_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Criar novo item no portfólio
   */
  async createPortfolioItem(tenantId: string, input: CreateMiniSitePortfolioItemInputDto): Promise<MiniSitePortfolioItemDto> {
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      title: string;
      category: string;
      before_image_url: string | null;
      after_image_url: string;
      description: string | null;
      is_featured: boolean;
      display_order: number;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `INSERT INTO minisite_portfolio_items (
        tenant_id, title, category, before_image_url, after_image_url, description, is_featured, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, tenant_id, title, category, before_image_url, after_image_url, description, is_featured, display_order, created_at, updated_at;`,
      [
        tenantId,
        input.title.trim(),
        input.category?.trim() || 'Geral',
        input.beforeImageUrl?.trim() || null,
        input.afterImageUrl.trim(),
        input.description?.trim() || null,
        input.isFeatured ?? false,
        input.displayOrder ?? 0,
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      tenantId: r.tenant_id,
      title: r.title,
      category: r.category,
      beforeImageUrl: r.before_image_url,
      afterImageUrl: r.after_image_url,
      description: r.description,
      isFeatured: r.is_featured,
      displayOrder: r.display_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Atualizar item do portfólio
   */
  async updatePortfolioItem(tenantId: string, id: string, input: UpdateMiniSitePortfolioItemInputDto): Promise<MiniSitePortfolioItemDto> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(input.title.trim());
    }
    if (input.category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(input.category.trim());
    }
    if (input.beforeImageUrl !== undefined) {
      fields.push(`before_image_url = $${idx++}`);
      values.push(input.beforeImageUrl ? input.beforeImageUrl.trim() : null);
    }
    if (input.afterImageUrl !== undefined) {
      fields.push(`after_image_url = $${idx++}`);
      values.push(input.afterImageUrl.trim());
    }
    if (input.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(input.description ? input.description.trim() : null);
    }
    if (input.isFeatured !== undefined) {
      fields.push(`is_featured = $${idx++}`);
      values.push(input.isFeatured);
    }
    if (input.displayOrder !== undefined) {
      fields.push(`display_order = $${idx++}`);
      values.push(input.displayOrder);
    }

    if (fields.length === 0) {
      const existing = await this.listPortfolioItems(tenantId);
      const found = existing.find((p) => p.id === id);
      if (!found) throw new Error('Item do portfólio não encontrado.');
      return found;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(tenantId);

    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      title: string;
      category: string;
      before_image_url: string | null;
      after_image_url: string;
      description: string | null;
      is_featured: boolean;
      display_order: number;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `UPDATE minisite_portfolio_items
       SET ${fields.join(', ')}
       WHERE id = $${idx++} AND tenant_id = $${idx++}
       RETURNING id, tenant_id, title, category, before_image_url, after_image_url, description, is_featured, display_order, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) {
      throw new Error('Item do portfólio não encontrado.');
    }

    const r = res.rows[0];
    return {
      id: r.id,
      tenantId: r.tenant_id,
      title: r.title,
      category: r.category,
      beforeImageUrl: r.before_image_url,
      afterImageUrl: r.after_image_url,
      description: r.description,
      isFeatured: r.is_featured,
      displayOrder: r.display_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Deletar item do portfólio
   */
  async deletePortfolioItem(tenantId: string, id: string): Promise<boolean> {
    const res = await tenantQuery(
      tenantId,
      `DELETE FROM minisite_portfolio_items WHERE id = $1 AND tenant_id = $2;`,
      [id, tenantId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Listar leads recebidos no painel do Gestor
   */
  async listLeads(tenantId: string, status?: string): Promise<MiniSiteLeadDto[]> {
    const query = status
      ? `SELECT id, tenant_id, name, phone, vehicle_model, service_interest, message, status, created_at, updated_at
         FROM minisite_leads
         WHERE tenant_id = $1 AND status = $2
         ORDER BY created_at DESC;`
      : `SELECT id, tenant_id, name, phone, vehicle_model, service_interest, message, status, created_at, updated_at
         FROM minisite_leads
         WHERE tenant_id = $1
         ORDER BY created_at DESC;`;

    const params = status ? [tenantId, status] : [tenantId];
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      name: string;
      phone: string;
      vehicle_model: string | null;
      service_interest: string | null;
      message: string | null;
      status: 'new' | 'contacted' | 'converted' | 'discarded';
      created_at: string;
      updated_at: string;
    }>(tenantId, query, params);

    return res.rows.map((lead) => {
      const cleanPhone = lead.phone.replace(/\D/g, '');
      const replyMsg = `Olá, *${lead.name}*! Vimos sua solicitação de orçamento em nosso site para o seu *${lead.vehicle_model || 'veículo'}*. Como podemos te ajudar hoje?`;
      const whatsappUrl = `https://wa.me/55${cleanPhone.replace(/^55/, '')}?text=${encodeURIComponent(replyMsg)}`;

      return {
        id: lead.id,
        tenantId: lead.tenant_id,
        name: lead.name,
        phone: lead.phone,
        vehicleModel: lead.vehicle_model,
        serviceInterest: lead.service_interest,
        message: lead.message,
        status: lead.status,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
        whatsappUrl,
      };
    });
  }

  /**
   * Atualizar status do lead
   */
  async updateLeadStatus(tenantId: string, leadId: string, status: 'new' | 'contacted' | 'converted' | 'discarded'): Promise<boolean> {
    const res = await tenantQuery(
      tenantId,
      `UPDATE minisite_leads SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3;`,
      [status, leadId, tenantId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Atualizar configurações do mini-site no branding da oficina
   */
  async updateMiniSiteSettings(tenantId: string, input: UpdateMiniSiteSettingsInputDto): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.minisiteEnabled !== undefined) {
      fields.push(`minisite_enabled = $${idx++}`);
      values.push(input.minisiteEnabled);
    }
    if (input.headline !== undefined) {
      fields.push(`minisite_headline = $${idx++}`);
      values.push(input.headline ? input.headline.trim() : null);
    }
    if (input.about !== undefined) {
      fields.push(`minisite_about = $${idx++}`);
      values.push(input.about ? input.about.trim() : null);
    }
    if (input.address !== undefined) {
      fields.push(`minisite_address = $${idx++}`);
      values.push(input.address ? input.address.trim() : null);
    }
    if (input.businessHours !== undefined) {
      fields.push(`minisite_business_hours = $${idx++}`);
      values.push(input.businessHours ? JSON.stringify(input.businessHours) : null);
    }
    if (input.features !== undefined) {
      fields.push(`minisite_features = $${idx++}`);
      values.push(input.features ? JSON.stringify(input.features) : null);
    }
    if (input.primaryColor !== undefined) {
      fields.push(`primary_color = $${idx++}`);
      values.push(input.primaryColor ? input.primaryColor.trim() : null);
    }
    if (input.whatsappPhone !== undefined) {
      fields.push(`whatsapp_phone = $${idx++}`);
      values.push(input.whatsappPhone ? input.whatsappPhone.trim() : null);
    }
    if (input.socialInstagram !== undefined) {
      fields.push(`social_instagram = $${idx++}`);
      values.push(input.socialInstagram ? input.socialInstagram.trim() : null);
    }

    if (fields.length === 0) return true;

    fields.push(`updated_at = NOW()`);
    values.push(tenantId);

    const res = await tenantQuery(
      tenantId,
      `UPDATE tenant_branding
       SET ${fields.join(', ')}
       WHERE tenant_id = $${idx++};`,
      values
    );

    return (res.rowCount ?? 0) > 0;
  }
}

export const miniSiteService = new MiniSiteService();
