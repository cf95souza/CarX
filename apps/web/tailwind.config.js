import carxTailwindPreset from '../../packages/ui/src/tailwind-preset.ts';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [carxTailwindPreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Configurando Tailwind para usar as variáveis CSS injetadas pelo BrandContext */
        primary: "var(--color-primary, #C8F52E)",
        secondary: "var(--color-secondary, #171C24)",
        accent: "var(--color-accent, #5CC8FF)",
        "primary-light": "var(--color-primary-light, rgba(200, 245, 46, 0.1))",
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}
