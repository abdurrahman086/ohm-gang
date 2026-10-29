/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary - Ceria Pastel Blue (UI Guidelines §2)
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#F0F6FF',
          100: '#E0EDFF',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        // Accent - Ceria Sunshine Yellow
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          100: '#FEF9C3',
          400: '#FACC15',
          500: '#EAB308',
        },
        // Health Indicator Colors (UI Guidelines §2)
        health: {
          healthy: '#10B981',
          warning: '#F59E0B',
          critical: '#EF4444',
        },
        // Background & Neutral
        bgCanvas: '#F8FAFC',
        cardBg: '#FFFFFF',
        textPrimary: '#0F172A', // Slate 900
        textSecondary: '#64748B', // Slate 500

        // Token komponen (shadcn / CSS vars)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'dialog-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'dialog-in': 'dialog-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        'overlay-in': 'overlay-in 160ms ease-out',
      },
    },
  },
  plugins: [],
};