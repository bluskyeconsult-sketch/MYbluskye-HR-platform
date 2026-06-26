// tailwind.config.js - UNIFIED & OPTIMIZED FOR MOBILE
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    
    // ============================================
    // SAFELIST - Preserve dynamic classes (From Code 1)
    // ============================================
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
            // RESPONSIVE BREAKPOINTS (Mobile-first)
            // ============================================
            screens: {
                'xs': '375px',   // Small phones
                'sm': '640px',   // Larger phones
                'md': '768px',   // Tablets
                'lg': '1024px',  // Laptops
                'xl': '1280px',  // Desktops
                '2xl': '1536px', // Large screens
            },
            
            // ============================================
            // CONTAINER UTILITIES (Mobile-optimized)
            // ============================================
            container: {
                center: true,
                padding: {
                    DEFAULT: '1rem',    // 16px on mobile
                    sm: '1.5rem',       // 24px on larger phones
                    md: '2rem',         // 32px on tablets
                    lg: '2rem',         // 32px on desktops
                    xl: '2rem',         // 32px on large screens
                },
            },
            
            // ============================================
            // FONT FAMILY (With fallbacks for performance)
            // ============================================
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
            },
            
            // ============================================
            // TYPOGRAPHY SCALE (Optimized for mobile reading)
            // ============================================
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem' }],     // 12px
                'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
                'base': ['1rem', { lineHeight: '1.5rem' }],    // 16px
                'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
                '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }],// 30px
                '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px
                // Additional responsive sizes
                '5xl': ['3rem', { lineHeight: '1' }],          // 48px
                '6xl': ['3.75rem', { lineHeight: '1' }],       // 60px
            },
            
            // ============================================
            // TOUCH-FRIENDLY SPACING (WCAG 2.5.5 - 44px minimum)
            // ============================================
            spacing: {
                'touch': '44px',
                'safe-top': 'env(safe-area-inset-top)',
                'safe-bottom': 'env(safe-area-inset-bottom)',
                'safe-left': 'env(safe-area-inset-left)',
                'safe-right': 'env(safe-area-inset-right)',
            },
            
            // Touch-friendly minimum dimensions
            minHeight: {
                'touch': '44px',
            },
            minWidth: {
                'touch': '44px',
            },
            
            // ============================================
            // ODUSBABA BRAND COLORS (From Code 1 - comprehensive)
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
            // ANIMATIONS (Combined from Code 1)
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
            
            // ============================================
            // ADDITIONAL UTILITIES
            // ============================================
            backgroundImage: {
                'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
            },
        },
    },
    plugins: [],
};
