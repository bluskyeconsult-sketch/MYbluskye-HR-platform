// tailwind.config.js - COMPLETE MOBILE OPTIMIZATION WITH ODUSBABA COLOR SCHEME
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    // Safelist to prevent purging of dynamically used classes (From Code 2)
    safelist: [
        // Responsive grid classes
        'grid-responsive',
        'grid-responsive-2',
        'card-responsive',
        'card-mobile',
        'stats-number',
        'btn-touch',
        'container-responsive',
        'container-mobile',
        'section-padding',
        'overflow-safe',
        // Animation classes
        'animate-fade-in',
        'animate-slide-up',
        'animate-slide-down',
        'animate-slide-in-left',
        'animate-slide-in-right',
        'animate-scale-in',
        'animate-pulse-glow',
        'animate-glow-pulse',
        'animate-float',
        'animate-blink',
        'animate-pulse-slow',
        'animate-shimmer',
        // Glass and hover effects
        'glass',
        'card-hover',
        'nav-active-glow',
        'nav-item-hover',
        // Text utility classes
        'text-responsive-xs',
        'text-responsive-sm',
        'text-responsive-base',
        'text-responsive-lg',
        'text-responsive-xl',
        'line-clamp-1',
        'line-clamp-2',
        'line-clamp-3',
        // Touch and accessibility
        'tap-highlight-transparent',
        'scrollbar-hide',
        'overscroll-auto',
        'overscroll-contain',
        'fixed-mobile-menu',
        'safe-top',
        'safe-bottom',
        'safe-left',
        'safe-right',
        'safe-area-bottom',
        // Shimmer fallback
        'shimmer',
    ],
    theme: {
        extend: {
            // ============================================
            // RESPONSIVE BREAKPOINTS (Enhanced mobile support)
            // ============================================
            screens: {
                'xs': '375px',
                'sm': '640px',
                'md': '768px',
                'lg': '1024px',
                'xl': '1280px',
                '2xl': '1536px',
            },
            
            // ============================================
            // CONTAINER UTILITIES (Enhanced from Code 2)
            // ============================================
            container: {
                center: true,
                padding: {
                    DEFAULT: '1rem',
                    sm: '1.5rem',
                    lg: '2rem',
                    xl: '2rem',
                },
            },
            
            // ============================================
            // FONT FAMILY (With fallbacks)
            // ============================================
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
            },
            
            // ============================================
            // TYPOGRAPHY SCALE (With line-height)
            // ============================================
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem' }],
                'sm': ['0.875rem', { lineHeight: '1.25rem' }],
                'base': ['1rem', { lineHeight: '1.5rem' }],
                'lg': ['1.125rem', { lineHeight: '1.75rem' }],
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.5rem', { lineHeight: '2rem' }],
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
                '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
            },
            
            // ============================================
            // TOUCH-FRIENDLY SPACING (WCAG compliant 44px minimum)
            // ============================================
            spacing: {
                'touch': '44px',
            },
            
            // Touch-friendly minimum dimensions
            minHeight: {
                'touch': '44px',
            },
            minWidth: {
                'touch': '44px',
            },
            
            // ============================================
            // ODUSBABA BRAND COLORS (Preserved from Code 1)
            // ============================================
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                    950: '#082f49',
                },
                // Slate colors for consistent UI
                slate: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
                // Background color utility
                background: '#0f172a',
            },
            
            // ============================================
            // ANIMATIONS (Combined)
            // ============================================
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'slide-in-left': 'slideInLeft 0.3s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
                'pulse-glow': 'pulseGlow 2s infinite',
                'glow-pulse': 'glowPulse 2s infinite',
                'float': 'float 8s ease-in-out infinite',
                'blink': 'blink 0.8s step-end infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s infinite',
            },
            
            // ============================================
            // KEYFRAMES FOR ANIMATIONS
            // ============================================
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(14, 165, 233, 0.4)' },
                    '50%': { opacity: '0.8', boxShadow: '0 0 0 8px rgba(14, 165, 233, 0)' },
                },
                glowPulse: {
                    '0%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.4)' },
                    '70%': { boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)' },
                    '100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
        },
    },
    plugins: [],
};
