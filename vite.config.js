// vite.config.js
// OPTIMIZED FOR www.bluskyeconsult.com

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
    const isDev = mode === 'development';
    const isProd = mode === 'production';
    
    return {
        plugins: [react()],
        
        // Base path - use root for custom domain
        base: '/',
        
        // Development server
        server: {
            port: 3000,
            open: true,
            host: true, // Expose to local network
            proxy: {
                // Proxy API requests to backend (only in dev)
                '/api': {
                    target: isDev ? 'https://www.bluskyeconsult.com' : false,
                    changeOrigin: true,
                    secure: true,
                    rewrite: (path) => path.replace(/^\/api/, '/api'),
                    configure: (proxy, options) => {
                        proxy.on('error', (err, req, res) => {
                            console.log('proxy error', err);
                        });
                        proxy.on('proxyReq', (proxyReq, req, res) => {
                            console.log('Sending Request:', req.method, req.url);
                        });
                    }
                },
                // Optional: Proxy WebSocket connections
                '/socket.io': {
                    target: 'wss://www.bluskyeconsult.com',
                    ws: true,
                    changeOrigin: true
                }
            }
        },
        
        // Build configuration
        build: {
            outDir: 'dist',
            sourcemap: isDev, // Only in development
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: isProd, // Remove console logs in production
                    drop_debugger: isProd
                }
            },
            rollupOptions: {
                output: {
                    manualChunks: {
                        // Core vendor chunks
                        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                        'vendor-ui': ['framer-motion', 'lucide-react'],
                        'vendor-supabase': ['@supabase/supabase-js'],
                        'vendor-utils': ['date-fns', 'react-hook-form']
                    },
                    // Optimize chunk naming
                    chunkFileNames: 'assets/js/[name]-[hash].js',
                    entryFileNames: 'assets/js/[name]-[hash].js',
                    assetFileNames: 'assets/css/[name]-[hash].[ext]'
                }
            },
            // Increase chunk size warning limit
            chunkSizeWarningLimit: 1000,
            // Enable CSS code splitting
            cssCodeSplit: true,
            // Target modern browsers
            target: 'es2020'
        },
        
        // Preview server (for testing production build locally)
        preview: {
            port: 4173,
            open: true,
            host: true
        },
        
        // Environment variables prefix
        envPrefix: 'VITE_',
        
        // Optimize dependencies
        optimizeDeps: {
            include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
            exclude: []
        },
        
        // Resolve aliases (optional - for cleaner imports)
        resolve: {
            alias: {
                '@': '/src',
                '@components': '/src/components',
                '@lib': '/src/lib',
                '@services': '/src/services',
                '@hooks': '/src/hooks',
                '@utils': '/src/utils'
            }
        },
        
        // CSS options
        css: {
            devSourcemap: isDev,
            modules: {
                localsConvention: 'camelCase'
            }
        },
        
        // ESBuild options
        esbuild: {
            logOverride: { 'this-is-undefined-in-esm': 'silent' },
            // Remove console logs in production
            drop: isProd ? ['console', 'debugger'] : []
        }
    };
});
