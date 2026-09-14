import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Fundos em camadas (profundidade sem preto absoluto)
        bg: {
          base: '#0C0E14',      // background root
          surface: '#13151E',   // superfície primária
          card: '#191C28',      // cards normais
          elevated: '#1F2235',  // cards elevados / dropdowns
          overlay: '#252843',   // modais / overlays
        },
        // ── Bordas
        border: {
          subtle:  '#1F2235',   // bordas quase invisíveis
          DEFAULT: '#252843',   // bordas padrão
          muted:   '#313657',   // bordas hover
          strong:  '#4B5280',   // bordas ativas
        },
        // ── Textos
        text: {
          primary:   '#F1F3FA',  // títulos e corpo
          secondary: '#9BA3C2',  // labels e subtítulos
          muted:     '#5C6585',  // placeholders
          disabled:  '#3B4060',  // desabilitados
          inverse:   '#0C0E14',  // texto em botões claros
        },
        // ── Brand Roxo (identidade APROVA)
        brand: {
          50:  '#F3F0FF',
          100: '#E9E3FF',
          200: '#D4C9FF',
          300: '#B5A4FF',
          400: '#9175FF',
          500: '#7C5CFA', // principal
          600: '#6840E0',
          700: '#5530C0',
          800: '#3D2190',
          900: '#271560',
          950: '#140B38',
        },
        // ── Semânticas
        success: { light: '#1A3328', DEFAULT: '#22C55E', text: '#4ADE80' },
        warning: { light: '#2A1F0A', DEFAULT: '#F59E0B', text: '#FCD34D' },
        danger:  { light: '#2A0F14', DEFAULT: '#EF4444', text: '#F87171' },
        info:    { light: '#0D1E30', DEFAULT: '#3B82F6', text: '#60A5FA' },
        // ── Pastéis para KPI Cards (dark variants)
        kpi: {
          orange: { bg: '#251912', border: '#EA580C', text: '#FB923C' },
          purple: { bg: '#1C1530', border: '#9333EA', text: '#C084FC' },
          green:  { bg: '#0F2018', border: '#16A34A', text: '#4ADE80' },
          rose:   { bg: '#230F14', border: '#E11D48', text: '#FB7185' },
          blue:   { bg: '#0B1A2A', border: '#2563EB', text: '#60A5FA' },
          amber:  { bg: '#241A08', border: '#D97706', text: '#FCD34D' },
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
        stats: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        xs:   ['0.75rem',  { lineHeight: '1.1rem' }],
        sm:   ['0.875rem', { lineHeight: '1.35rem' }],
        base: ['1rem',     { lineHeight: '1.6rem' }],
        lg:   ['1.125rem', { lineHeight: '1.75rem' }],
        xl:   ['1.25rem',  { lineHeight: '1.85rem' }],
        '2xl':['1.5rem',   { lineHeight: '2rem' }],
        '3xl':['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl':['3rem',     { lineHeight: '1' }],
      },
      borderRadius: {
        xs:   '0.25rem',
        sm:   '0.375rem',
        DEFAULT:'0.5rem',
        md:   '0.625rem',
        lg:   '0.75rem',
        xl:   '1rem',
        '2xl':'1.25rem',
        '3xl':'1.5rem',
        '4xl':'2rem',
      },
      boxShadow: {
        xs:    '0 1px 2px 0 rgba(0,0,0,0.4)',
        sm:    '0 2px 4px 0 rgba(0,0,0,0.5)',
        DEFAULT:'0 4px 8px -1px rgba(0,0,0,0.6)',
        md:    '0 6px 16px -2px rgba(0,0,0,0.65)',
        lg:    '0 12px 28px -4px rgba(0,0,0,0.7)',
        xl:    '0 20px 48px -8px rgba(0,0,0,0.8)',
        brand: '0 0 20px rgba(124,92,250,0.25)',
        'brand-lg': '0 0 40px rgba(124,92,250,0.3)',
        'inset-border': 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      },
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
        '72':  '18rem',
        '84':  '21rem',
        '88':  '22rem',
        '256': '64rem',
      },
      screens: {
        xs:  '390px',
        sm:  '640px',
        md:  '768px',
        lg:  '1024px',
        xl:  '1280px',
        '2xl':'1440px',
        '3xl':'1920px',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-in':   'slideIn 0.25s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
        'scale-in':   'scaleIn 0.15s ease-out',
        'spin-slow':  'spin 3s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn:   { from: { transform: 'translateX(-16px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        slideUp:   { from: { transform: 'translateY(12px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        scaleIn:   { from: { transform: 'scale(0.95)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
      transitionDuration: {
        DEFAULT: '150ms',
        fast:    '100ms',
        normal:  '200ms',
        slow:    '300ms',
      },
    },
  },
  plugins: [],
};

export default config;
