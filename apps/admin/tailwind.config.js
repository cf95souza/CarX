/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        volt: {
          DEFAULT: '#C8F52E',
          hover: '#B5E21F',
          active: '#9ECE15',
          contrast: '#0E1116',
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
        semantic: {
          alert: '#FFB020',
          info: '#5CC8FF',
          error: '#FF6B5E',
          success: '#C8F52E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      borderRadius: {
        btn: '0.875rem',
        input: '0.875rem',
        card: '1.25rem',
        modal: '1.5rem',
      },
    },
  },
  plugins: [],
};

