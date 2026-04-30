/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B3C5D',
          deep: '#0B3C5D',
        },
        slate: {
          800: '#1F2937',
          500: '#64748B',
        },
        emerald: {
          500: '#10B981',
          600: '#059669',
        },
        sky: {
          400: '#38BDF8',
        },
        amber: {
          500: '#F59E0B',
        },
        red: {
          500: '#EF4444',
          600: '#DC2626',
        },
        background: '#020617',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        '3xl': ['30px', { lineHeight: '1.2' }],
        '2xl': ['24px', { lineHeight: '1.3' }],
        'xl': ['20px', { lineHeight: '1.4' }],
        'lg': ['18px', { lineHeight: '1.5' }],
        'base': ['16px', { lineHeight: '1.5' }],
        'sm': ['14px', { lineHeight: '1.5' }],
        'xs': ['12px', { lineHeight: '1.5' }],
      },
      animation: {
        'fade-up': 'fadeUp 120ms ease-out',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
