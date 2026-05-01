/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand color - Sky Blue (Trust/Authority)
        primary: {
          DEFAULT: '#0B3C5D',
          50: '#e8f0f5',
          100: '#d1e1eb',
          200: '#a3c3d7',
          300: '#75a5c3',
          400: '#4787af',
          500: '#0B3C5D',
          600: '#09304a',
          700: '#072438',
          800: '#041825',
          900: '#020c12',
        },
        // Secondary - Slate (Professional neutral)
        secondary: {
          DEFAULT: '#1F2937',
          light: '#374151',
          dark: '#111827',
        },
        // Success/Accept - Emerald (ONLY for accept actions)
        success: {
          DEFAULT: '#10B981',
          dark: '#059669',
        },
        // Warning - Amber
        warning: {
          DEFAULT: '#F59E0B',
        },
        // Danger/Reject - Red
        danger: {
          DEFAULT: '#EF4444',
        },
        // Background
        background: '#020617',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
