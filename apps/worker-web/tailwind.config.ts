import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: 'var(--brand-indigo)',
          'indigo-dark': 'var(--brand-indigo-dark)',
          'indigo-light': 'var(--brand-indigo-light)',
          amber: 'var(--brand-amber)',
          'amber-dark': 'var(--brand-amber-dark)',
          'amber-light': 'var(--brand-amber-light)',
          emerald: 'var(--brand-emerald)',
          'emerald-light': 'var(--brand-emerald-light)',
          red: 'var(--brand-red)',
          'red-light': 'var(--brand-red-light)',
        },
        surface: {
          page: 'var(--surface-page)',
          card: 'var(--surface-card)',
          'card-hover': 'var(--surface-card-hover)',
          dark: 'var(--surface-dark)',
          'dark-2': 'var(--surface-dark-2)',
          subtle: 'var(--surface-subtle)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
          brand: 'var(--text-brand)',
          amber: 'var(--text-amber)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          default: 'var(--border-default)',
          strong: 'var(--border-strong)',
          brand: 'var(--border-brand)',
        },
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        brand: 'var(--shadow-brand)',
        amber: 'var(--shadow-amber)',
        emerald: 'var(--shadow-emerald)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '20': 'var(--space-20)',
      },
      fontFamily: {
        sora: ['var(--font-sora)', 'Sora', 'sans-serif'],
        'dm-sans': ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        'jetbrains-mono': ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
        display: ['var(--font-sora)', 'Sora', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
        hero: 'var(--text-hero)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
        spring: '500ms',
      },
      transitionTimingFunction: {
        fast: 'cubic-bezier(0.4, 0, 0.2, 1)',
        base: 'cubic-bezier(0.4, 0, 0.2, 1)',
        slow: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
