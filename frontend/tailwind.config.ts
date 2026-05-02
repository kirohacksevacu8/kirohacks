import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#0A0E17',
          raised: '#111827',
          overlay: '#1F2937',
          border: '#374151',
          hover: '#2D3748',
        },
        fire: {
          low: '#FCD34D',
          medium: '#F97316',
          high: '#DC2626',
          extreme: '#991B1B',
          active: '#FF6B35',
        },
        route: {
          safe: '#00E5FF',
          caution: '#FFD600',
          danger: '#FF1744',
        },
        zone: {
          safe: '#10B981',
          warning: '#F59E0B',
          critical: '#EF4444',
        },
        elevation: {
          low: '#1B4332',
          mid: '#6B705C',
          high: '#D4A373',
          peak: '#FEFAE0',
        },
        accent: {
          primary: '#3B82F6',
          'primary-hover': '#2563EB',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
      fontFamily: {
        ui: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      spacing: {
        header: '48px',
        'control-panel': '320px',
        'results-panel': '380px',
      },
      boxShadow: {
        'glow-fire': '0 0 20px rgba(255, 107, 53, 0.3)',
        'glow-safe': '0 0 20px rgba(0, 229, 255, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 300ms ease-out',
        glow: 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 107, 53, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 107, 53, 0.5)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
