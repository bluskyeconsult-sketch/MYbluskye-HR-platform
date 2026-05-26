// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';
    const isProd = mode === 'production';
    const isAnalyze = mode === 'analyze';
    
    return {
        plugins: [react()],
        
        base: '/',
        
        server: {
            port: 3000,
            host: true, // Expose to network for www.bluskyeconsult.com
            open: true,
            proxy: {
                '/api': {
                    target: 'https://www.bluskyeconsult.com',
                    changeOrigin: true,
                    secure: true,
                    rewrite: (path) => path.replace(/^\/api/, '/api'),
                    configure: (proxy) => {
                        if (isDev) {
                            proxy.on('proxyReq', (_, req) => {
                                console.log('[Proxy]', req.method, req.url);
                            });
                        }
                    }
                }
            }
        },
        
        preview: {
            port: 4173,
            host: true,
            open: true
        },
        
        build: {
            outDir: 'dist',
            sourcemap: isDev,
            minify: isProd ? 'terser' : false,
            target: 'es2020',
            cssCodeSplit: true,
            chunkSizeWarningLimit: 1000,
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html')
                },
                output: {
                    manualChunks: {
                        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                        'vendor-animation': ['framer-motion'],
                        'vendor-icons': ['lucide-react'],
                        'vendor-supabase': ['@supabase/supabase-js']
                    },
                    chunkFileNames: (chunkInfo) => {
                        const pattern = 'assets/js/[name]-[hash].js';
                        return pattern;
                    },
                    entryFileNames: 'assets/js/[name]-[hash].js',
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name?.endsWith('.css')) {
                            return 'assets/css/[name]-[hash][extname]';
                        }
                        return 'assets/[name]-[hash][extname]';
                    }
                }
            },
            terserOptions: isProd ? {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                    pure_funcs: ['console.log', 'console.info', 'console.debug']
                },
                format: {
                    comments: false
                }
            } : undefined
        },
        
        optimizeDeps: {
            include: [
                'react',
                'react-dom',
                'react-router-dom',
                'framer-motion',
                'lucide-react',
                '@supabase/supabase-js'
            ],
            exclude: []
        },
        
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
                '@components': resolve(__dirname, 'src/components'),
                '@lib': resolve(__dirname, 'src/lib'),
                '@services': resolve(__dirname, 'src/services'),
                '@hooks': resolve(__dirname, 'src/hooks'),
                '@utils': resolve(__dirname, 'src/utils'),
                '@assets': resolve(__dirname, 'src/assets')
            }
        },
        
        css: {
            devSourcemap: isDev,
            modules: {
                localsConvention: 'camelCase'
            }
        },
        
        esbuild: {
            logOverride: { 'this-is-undefined-in-esm': 'silent' },
            drop: isProd ? ['console', 'debugger'] : []
        },
        
        // Environment variables
        envPrefix: 'VITE_',
        
        // Define global constants
        define: {
            __APP_VERSION__: JSON.stringify('1.0.0'),
            __APP_ENV__: JSON.stringify(mode),
            __BUILD_TIME__: JSON.stringify(new Date().toISOString())
        }
    };
});
