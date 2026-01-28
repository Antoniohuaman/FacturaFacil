/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],

  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],     // Texto base y UI
        display: ['Poppins', 'sans-serif'],             // Encabezados
        mono: ['Fira Code', 'monospace'],               // Código / técnico
        // Mantener compatibilidad con nombres anteriores
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'poppins': ['Poppins', 'system-ui', 'sans-serif'],
        'fira-code': ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },

      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },

      fontSize: {
        // 🧠 TITULARES (Poppins)
        'display': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['32px', { lineHeight: '1.3', fontWeight: '600' }],
        'h2': ['24px', { lineHeight: '1.4', fontWeight: '500' }],
        'h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['18px', { lineHeight: '1.5', fontWeight: '500' }],
        'h5': ['16px', { lineHeight: '1.5', fontWeight: '600' }],

        // 💬 TEXTO BASE Y UI (Inter)
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'ui-base': ['14px', { lineHeight: '1.5', fontWeight: '500' }],
        'ui-sm': ['13px', { lineHeight: '1.5', fontWeight: '500' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],

        // 💻 CÓDIGO Y DATOS (Fira Code)
        'code-inline': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        'code-block': ['13px', { lineHeight: '1.6', fontWeight: '400' }],
      },

      colors: {
        // === TOKENS BASE ===
        primary: {
          DEFAULT: '#1662C5',
          dark: '#3B7FE0',
          hover: '#1456AD',
          hoverDark: '#5291E8',
          light: '#E3EFFF',
          pressed: '#104A95',
          pressedDark: '#6BA3F0',
        },
        neutral: {
          130: '#131C2C',
          120: '#0c1220',
          110: '#1a2332',
          100: '#1E293B',
          90: '#334155',
          80: '#475569',
          70: '#64748B',
          60: '#94A3B8',
          50: '#CBD5E1',
          40: '#E2E8F0',
          30: '#F1F5F9',
          20: '#F8FAFC',
          10: '#FCFDFE',
          0: '#FFFFFF',
        },
        neutralSecondary: {
          100: '#525C6B',
          90: '#616B79',
          80: '#73808D',
          70: '#8591A0',
          60: '#98A2B0',
          50: '#ABB4C0',
          40: '#BFC6D0',
          30: '#D3D8DF',
          20: '#E6E9ED',
          10: '#F3F5F7',
          0: '#FFFFFF',
        },
        border: {
          muted: '#131b27',
          DEFAULT: '#232f42',
          strong: '#2a3648',
        },
        success: {
          DEFAULT: '#10B981',
          dark: '#34D399',       // Color base para dark mode
          hover: '#059669',
          hoverDark: '#6EE7B7',
          bg: '#ECFDF5',
          bgDark: '#064E3B',
          border: '#A7F3D0',
          borderDark: '#065F46',
        },
        error: {
          DEFAULT: '#EF4444',
          dark: '#F87171',       // Color base para dark mode
          hover: '#DC2626',
          hoverDark: '#FCA5A5',
          bg: '#FEF2F2',
          bgDark: '#7F1D1D',
          border: '#FECACA',
          borderDark: '#991B1B',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#FBBF24',       // Color base para dark mode
          hover: '#D97706',
          hoverDark: '#FCD34D',
          bg: '#FFFBEB',
          bgDark: '#78350F',
          border: '#FDE68A',
          borderDark: '#92400E',
        },
        info: {
          DEFAULT: '#3B82F6',
          dark: '#60A5FA',       // Color base para dark mode
          hover: '#2563EB',
          hoverDark: '#93C5FD',
          bg: '#EFF6FF',
          bgDark: '#1E3A8A',
          border: '#BFDBFE',
          borderDark: '#1E40AF',
        },
      },

      // === SEMANTIC TOKENS ===
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        inverse: 'var(--text-inverse)',
        disabled: 'var(--text-disabled)',
        // Brand colors
        brand: 'var(--primary)',
        'brand-hover': 'var(--primary-hover)',
        // State colors
        error: 'var(--error)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        info: 'var(--info)',
      },
      backgroundColor: {
        'surface-0': 'var(--surface-0)',
        'surface-1': 'var(--surface-1)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        'surface-hover': 'var(--surface-hover)',
        'surface-pressed': 'var(--surface-pressed)',
        // Brand colors
        brand: 'var(--primary)',
        'brand-hover': 'var(--primary-hover)',
        'brand-pressed': 'var(--primary-pressed)',
        'brand-light': 'var(--primary-light)',
        // State backgrounds
        'error-bg': 'var(--error-bg)',
        'success-bg': 'var(--success-bg)',
        'warning-bg': 'var(--warning-bg)',
        'info-bg': 'var(--info-bg)',
      },
      borderColor: {
        muted: 'var(--border-muted)',
        DEFAULT: 'var(--border-default)',
        strong: 'var(--border-strong)',
        focus: 'var(--border-focus)',
        brand: 'var(--border-brand)',
        secondary: 'var(--border-secondary)',
        // Brand borders
        'brand-hover': 'var(--primary-hover)',
        // State borders
        error: 'var(--error)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        info: 'var(--info)',
      },
      ringColor: {
        brand: 'var(--primary)',
        'brand-hover': 'var(--primary-hover)',
        // State rings
        error: 'var(--error)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        info: 'var(--info)',
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(15deg)' },
          '50%': { transform: 'translateY(-20px) rotate(20deg)' },
        },
        'float-delayed': {
          '0%, 100%': { transform: 'translateY(0) rotate(-10deg)' },
          '50%': { transform: 'translateY(-20px) rotate(-5deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0) rotate(25deg)' },
          '50%': { transform: 'translateY(-20px) rotate(30deg)' },
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float-delayed 5s ease-in-out infinite 1s',
        'float-slow': 'float-slow 7s ease-in-out infinite 0.5s',
      }
    },
  },
  plugins: [],
}