/**
 * CarX SaaS — Tipos e Contratos de Cupons Promocionais (Super Admin & Assinaturas)
 */

export type CouponDiscountType = 'free_months' | 'promotional_price' | 'percentage' | 'fixed_amount';

export interface CouponDto {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number; // Centavos para fixed_amount/promotional_price, ou porcentagem (ex: 100 para 100% off)
  duration_months: number | null; // Ex: 3 para "3 meses de XX por Y"; null para 1 mês / uso único
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  applicable_plan_slugs: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponDto {
  code: string;
  description?: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  duration_months?: number | null;
  max_uses?: number | null;
  valid_from?: string;
  valid_until?: string | null;
  applicable_plan_slugs?: string[];
  is_active?: boolean;
}

export interface ValidateCouponInputDto {
  code: string;
  plan_slug: string;
}

export interface ValidateCouponResponseDto {
  valid: boolean;
  coupon?: CouponDto;
  message?: string;
  original_price_cents: number;
  discounted_price_cents: number;
  discount_description: string;
  duration_text: string;
}

