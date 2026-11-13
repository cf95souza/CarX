import { pool } from '../database/db.js';
import { auditService } from '../audit/audit-service.js';
import { planService } from '../plans/plan-service.js';
import {
  CouponDto,
  CreateCouponDto,
  ValidateCouponInputDto,
  ValidateCouponResponseDto,
} from '@carx/shared';
import type pg from 'pg';

export class CouponError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'CouponError';
    this.statusCode = statusCode;
  }
}

export class CouponService {
  /**
   * Super Admin: Lista todos os cupons cadastrados
   */
  async listCouponsAdmin(): Promise<CouponDto[]> {
    const res = await pool.query<any>(
      `SELECT 
         id,
         code,
         description,
         discount_type,
         discount_value,
         duration_months,
         max_uses,
         current_uses,
         valid_from,
         valid_until,
         applicable_plan_slugs,
         is_active,
         created_at,
         updated_at
       FROM coupons
       ORDER BY created_at DESC;`
    );

    return res.rows.map((row: any) => ({
      ...row,
      applicable_plan_slugs: Array.isArray(row.applicable_plan_slugs)
        ? row.applicable_plan_slugs
        : typeof row.applicable_plan_slugs === 'string'
        ? JSON.parse(row.applicable_plan_slugs)
        : [],
    }));
  }

  /**
   * Busca cupom por ID
   */
  async getCouponById(id: string): Promise<CouponDto | null> {
    const res = await pool.query<any>(
      `SELECT * FROM coupons WHERE id = $1 LIMIT 1;`,
      [id]
    );
    if (!res.rows[0]) return null;

    const row = res.rows[0];
    return {
      ...row,
      applicable_plan_slugs: Array.isArray(row.applicable_plan_slugs)
        ? row.applicable_plan_slugs
        : typeof row.applicable_plan_slugs === 'string'
        ? JSON.parse(row.applicable_plan_slugs)
        : [],
    };
  }

  /**
   * Busca cupom por Código
   */
  async getCouponByCode(code: string): Promise<CouponDto | null> {
    const cleanCode = code.toUpperCase().trim();
    const res = await pool.query<any>(
      `SELECT * FROM coupons WHERE UPPER(code) = $1 LIMIT 1;`,
      [cleanCode]
    );
    if (!res.rows[0]) return null;

    const row = res.rows[0];
    return {
      ...row,
      applicable_plan_slugs: Array.isArray(row.applicable_plan_slugs)
        ? row.applicable_plan_slugs
        : typeof row.applicable_plan_slugs === 'string'
        ? JSON.parse(row.applicable_plan_slugs)
        : [],
    };
  }

  /**
   * Super Admin: Cria um novo cupom promocional
   */
  async createCoupon(input: CreateCouponDto, adminUserId?: string): Promise<CouponDto> {
    const {
      code,
      description,
      discount_type,
      discount_value,
      duration_months = null,
      max_uses = null,
      valid_from = new Date().toISOString(),
      valid_until = null,
      applicable_plan_slugs = [],
      is_active = true,
    } = input;

    if (!code || code.trim().length < 3) {
      throw new CouponError('O código do cupom deve conter no mínimo 3 caracteres.');
    }

    const cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
    const existing = await this.getCouponByCode(cleanCode);
    if (existing) {
      throw new CouponError(`Já existe um cupom com o código "${cleanCode}".`);
    }

    if (!['free_months', 'promotional_price', 'percentage', 'fixed_amount'].includes(discount_type)) {
      throw new CouponError('Tipo de desconto inválido.');
    }

    if (discount_type === 'percentage' && (discount_value <= 0 || discount_value > 100)) {
      throw new CouponError('Desconto percentual deve estar entre 1% e 100%.');
    }

    if ((discount_type === 'fixed_amount' || discount_type === 'promotional_price') && discount_value <= 0) {
      throw new CouponError('O valor do desconto ou preço promocional deve ser maior que zero.');
    }

    const res = await pool.query<any>(
      `INSERT INTO coupons (
         code, description, discount_type, discount_value, duration_months,
         max_uses, valid_from, valid_until, applicable_plan_slugs, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *;`,
      [
        cleanCode,
        description ? description.trim() : null,
        discount_type,
        discount_value,
        duration_months && duration_months > 0 ? duration_months : null,
        max_uses && max_uses > 0 ? max_uses : null,
        valid_from,
        valid_until || null,
        JSON.stringify(applicable_plan_slugs),
        is_active,
      ]
    );

    const created = res.rows[0];

    if (adminUserId) {
      await auditService.record({
        tenantId: created.id,
        userId: adminUserId,
        action: 'COUPON_CREATED',
        entity: 'coupons',
        entityId: created.id,
        newValues: {
          code: created.code,
          discount_type: created.discount_type,
          discount_value: created.discount_value,
          duration_months: created.duration_months,
        },
      }).catch(() => {});
    }

    return {
      ...created,
      applicable_plan_slugs: Array.isArray(created.applicable_plan_slugs)
        ? created.applicable_plan_slugs
        : [],
    };
  }

  /**
   * Super Admin: Desativa um cupom promocional
   */
  async deactivateCoupon(id: string, adminUserId?: string): Promise<CouponDto> {
    const existing = await this.getCouponById(id);
    if (!existing) {
      throw new CouponError(`Cupom com ID ${id} não encontrado.`, 404);
    }

    const res = await pool.query<any>(
      `UPDATE coupons SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [id]
    );

    const updated = res.rows[0];
    if (adminUserId) {
      await auditService.record({
        tenantId: id,
        userId: adminUserId,
        action: 'COUPON_DEACTIVATED',
        entity: 'coupons',
        entityId: id,
        oldValues: { is_active: existing.is_active },
        newValues: { is_active: false },
      }).catch(() => {});
    }

    return {
      ...updated,
      applicable_plan_slugs: Array.isArray(updated.applicable_plan_slugs)
        ? updated.applicable_plan_slugs
        : [],
    };
  }

  /**
   * Validação de Cupom para Checkout / Provisionamento de Oficina
   */
  async validateCoupon(input: ValidateCouponInputDto): Promise<ValidateCouponResponseDto> {
    const { code, plan_slug } = input;
    if (!code) {
      return {
        valid: false,
        message: 'Código do cupom não informado.',
        original_price_cents: 0,
        discounted_price_cents: 0,
        discount_description: '',
        duration_text: '',
      };
    }

    const coupon = await this.getCouponByCode(code);
    if (!coupon) {
      return {
        valid: false,
        message: `Cupom "${code}" não encontrado.`,
        original_price_cents: 0,
        discounted_price_cents: 0,
        discount_description: '',
        duration_text: '',
      };
    }

    if (!coupon.is_active) {
      return {
        valid: false,
        coupon,
        message: `O cupom "${coupon.code}" está inativo ou foi revogado.`,
        original_price_cents: 0,
        discounted_price_cents: 0,
        discount_description: '',
        duration_text: '',
      };
    }

    const now = new Date();
    if (new Date(coupon.valid_from) > now) {
      return {
        valid: false,
        coupon,
        message: `O cupom "${coupon.code}" ainda não iniciou seu período de vigência.`,
        original_price_cents: 0,
        discounted_price_cents: 0,
        discount_description: '',
        duration_text: '',
      };
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return {
        valid: false,
        coupon,
        message: `O cupom "${coupon.code}" expirou em ${new Date(coupon.valid_until).toLocaleDateString('pt-BR')}.`,
        original_price_cents: 0,
        discounted_price_cents: 0,
        discount_description: '',
        duration_text: '',
      };
    }

    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return {
        valid: false,
        coupon,
        message: `O cupom "${coupon.code}" atingiu o limite máximo de resgates permitidos.`,
        original_price_cents: 0,
        discounted_price_cents: 0,
        discount_description: '',
        duration_text: '',
      };
    }

    // Valida elegibilidade do plano
    if (
      coupon.applicable_plan_slugs &&
      coupon.applicable_plan_slugs.length > 0 &&
      !coupon.applicable_plan_slugs.includes(plan_slug)
    ) {
      return {
        valid: false,
        coupon,
        message: `Este cupom é exclusivo para os planos: ${coupon.applicable_plan_slugs.join(', ')}.`,
        original_price_cents: 0,
        discounted_price_cents: 0,
        discount_description: '',
        duration_text: '',
      };
    }

    // Busca preço original do plano
    const plan = await planService.getPlanBySlug(plan_slug);
    const originalPriceCents = plan ? plan.price_cents : 14990;

    let discountedPriceCents = originalPriceCents;
    let discountDescription = '';

    if (coupon.discount_type === 'free_months') {
      discountedPriceCents = 0;
      discountDescription =
        coupon.duration_months && coupon.duration_months > 1
          ? `${coupon.duration_months} meses 100% grátis`
          : '1 mês 100% grátis';
    } else if (coupon.discount_type === 'promotional_price') {
      discountedPriceCents = Math.min(originalPriceCents, coupon.discount_value);
      const formattedPromo = (coupon.discount_value / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      discountDescription =
        coupon.duration_months && coupon.duration_months > 1
          ? `${coupon.duration_months} meses por ${formattedPromo}/mês`
          : `Primeiro mês por ${formattedPromo}`;
    } else if (coupon.discount_type === 'percentage') {
      const discountAmount = Math.round((originalPriceCents * coupon.discount_value) / 100);
      discountedPriceCents = Math.max(0, originalPriceCents - discountAmount);
      discountDescription = `${coupon.discount_value}% de desconto`;
    } else if (coupon.discount_type === 'fixed_amount') {
      discountedPriceCents = Math.max(0, originalPriceCents - coupon.discount_value);
      const formattedDiff = (coupon.discount_value / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      discountDescription = `${formattedDiff} de desconto`;
    }

    const durationText = coupon.duration_months
      ? `Válido por ${coupon.duration_months} meses`
      : 'Válido na primeira cobrança';

    return {
      valid: true,
      coupon,
      message: 'Cupom válido e aplicado com sucesso!',
      original_price_cents: originalPriceCents,
      discounted_price_cents: discountedPriceCents,
      discount_description: discountDescription,
      duration_text: durationText,
    };
  }

  /**
   * Resgata e consome o cupom vinculando à oficina
   */
  async redeemCoupon(
    code: string,
    tenantId: string,
    planSlug: string,
    client?: pg.PoolClient
  ): Promise<{ redemptionId: string; expiresAt: Date | null; discountedPriceCents: number }> {
    const validation = await this.validateCoupon({ code, plan_slug: planSlug });
    if (!validation.valid || !validation.coupon) {
      throw new CouponError(validation.message || 'Cupom inválido.');
    }

    const coupon = validation.coupon;
    const db = client || pool;

    let expiresAt: Date | null = null;
    if (coupon.duration_months && coupon.duration_months > 0) {
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + coupon.duration_months);
    }

    const discountAppliedCents = validation.original_price_cents - validation.discounted_price_cents;

    // 1. Grava o resgate
    const redemptionRes = await db.query<any>(
      `INSERT INTO coupon_redemptions (
         coupon_id, tenant_id, duration_months, expires_at, discount_applied_cents, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id;`,
      [
        coupon.id,
        tenantId,
        coupon.duration_months,
        expiresAt,
        discountAppliedCents,
        JSON.stringify({
          coupon_code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          original_price_cents: validation.original_price_cents,
          discounted_price_cents: validation.discounted_price_cents,
        }),
      ]
    );

    // 2. Incrementa contador de resgates atômico no cupom
    await db.query(
      `UPDATE coupons SET current_uses = current_uses + 1, updated_at = NOW() WHERE id = $1;`,
      [coupon.id]
    );

    return {
      redemptionId: redemptionRes.rows[0].id,
      expiresAt,
      discountedPriceCents: validation.discounted_price_cents,
    };
  }
}

export const couponService = new CouponService();
