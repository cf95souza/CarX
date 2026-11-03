/**
 * CarX Design System — Tokens Oficiais de Marca
 * Baseados nas referências visuais de /rebraind e CarX_Documento_Unico.md
 */

export const colors = {
  volt: {
    DEFAULT: '#C8F52E',
    hover: '#B5E21F',
    active: '#9ECE15',
    contrast: '#0E1116', // Texto sobre Volt é SEMPRE Asfalto (contraste > 4.5:1)
  },
  asfalto: {
    DEFAULT: '#0E1116',
    dark: '#080A0D',
  },
  grafite: {
    DEFAULT: '#171C24',
    light: '#1F2631',
  },
  aco: {
    DEFAULT: '#232A35',
    border: '#2F3846',
  },
  linha: {
    DEFAULT: '#2E3744',
  },
  texto: {
    DEFAULT: '#F2F5F8',
    dark: '#0E1116',
  },
  muted: {
    DEFAULT: '#9AA7B8',
    dark: '#64748B',
  },
  nevoa: {
    DEFAULT: '#F3F5F7',
  },
  semantic: {
    alert: '#FFB020',
    info: '#5CC8FF',
    error: '#FF6B5E',
    errorLight: '#E5484D',
    success: '#C8F52E',
  },
} as const;

export const typography = {
  fontDisplay: 'Space Grotesk, sans-serif',
  fontBody: 'Inter, sans-serif',
} as const;

export const radii = {
  button: '0.875rem', // 14px
  input: '0.875rem',  // 14px
  card: '1.25rem',   // 20px - 24px
  modal: '1.5rem',   // 24px
  badge: '9999px',   // Pill
} as const;

export const touchTargets = {
  mobileButtonMinHeight: '3.5rem', // 56px para chão de oficina
  desktopButtonMinHeight: '3rem',  // 48px
  mobileTouchTargetMin: '3.5rem',  // 56px
} as const;
