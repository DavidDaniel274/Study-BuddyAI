import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
        display: ['var(--font-poppins)', 'var(--font-nunito)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'paper-lines':
          'repeating-linear-gradient(to bottom, transparent, transparent 31px, hsl(218 87% 64% / 0.08) 31px, hsl(218 87% 64% / 0.08) 32px)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 0.5rem)',
        sm: 'calc(var(--radius) - 0.75rem)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        paper: {
          DEFAULT: 'hsl(var(--paper))',
          cream: 'hsl(var(--paper-cream))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          violet: 'hsl(var(--primary-violet))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        mint: {
          DEFAULT: 'hsl(var(--mint))',
          foreground: 'hsl(var(--mint-foreground))',
        },
        pink: {
          DEFAULT: 'hsl(var(--pink))',
          foreground: 'hsl(var(--pink-foreground))',
        },
        coral: {
          DEFAULT: 'hsl(var(--coral))',
          foreground: 'hsl(var(--coral-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--error-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      boxShadow: {
        paper:
          '0 1px 0 rgba(0,0,0,0.04), 0 8px 24px -8px rgba(31, 38, 80, 0.18), 0 2px 6px -2px rgba(31, 38, 80, 0.08)',
        'paper-lg':
          '0 2px 0 rgba(0,0,0,0.04), 0 18px 40px -12px rgba(31, 38, 80, 0.28), 0 6px 14px -6px rgba(31, 38, 80, 0.12)',
        'paper-sm':
          '0 1px 0 rgba(0,0,0,0.05), 0 4px 12px -4px rgba(31, 38, 80, 0.16)',
        sticky:
          '0 1px 1px rgba(0,0,0,0.06), 0 6px 16px -4px rgba(31, 38, 80, 0.22), 0 2px 4px -1px rgba(31, 38, 80, 0.10)',
        'inner-paper': 'inset 0 1px 3px rgba(31, 38, 80, 0.08)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(-2deg)' },
          '50%': { transform: 'translateY(-12px) rotate(2deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'soft-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.04)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(24px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        draw: {
          '0%': { strokeDashoffset: '600' },
          '100%': { strokeDashoffset: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0)', opacity: '1' },
          '100%': {
            transform: 'translateY(420px) rotate(720deg)',
            opacity: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 5s ease-in-out infinite',
        'soft-bounce': 'soft-bounce 2s ease-in-out infinite',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        wiggle: 'wiggle 0.5s ease-in-out',
        draw: 'draw 1.4s ease-out forwards',
        shimmer: 'shimmer 2s infinite',
        'check-pop': 'check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        confetti: 'confetti 1.2s ease-out forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
