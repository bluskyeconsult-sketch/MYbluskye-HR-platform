// src/main.jsx
// OPTIMIZED ENTRY POINT - Clean, fast, and error-free with no external dependencies

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// ============================================
// PERFORMANCE METRICS (No external deps)
// ============================================

const startTime = performance.now();

function reportLoadTime() {
    const loadTime = performance.now() - startTime;
    console.log(`✅ App loaded in ${loadTime.toFixed(0)}ms`);
    
    // Get basic navigation timing
    if (performance.getEntriesByType) {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
            console.log(`📊 DNS: ${(nav.domainLookupEnd - nav.domainLookupStart).toFixed(0)}ms | ` +
                       `TCP: ${(nav.connectEnd - nav.connectStart).toFixed(0)}ms | ` +
                       `Load: ${(nav.loadEventEnd - nav.startTime).toFixed(0)}ms`);
        }
    }
    
    // Log paint timings if available
    if (performance.getEntriesByType('paint')) {
        const paints = performance.getEntriesByType('paint');
        paints.forEach(paint => {
            console.log(`📊 ${paint.name}: ${paint.startTime.toFixed(0)}ms`);
        });
    }
}

// ============================================
// SUPABASE CONNECTION CHECK (Non-blocking)
// ============================================

async function checkSupabaseConnection() {
    try {
        const start = performance.now();
        const { data, error } = await supabase.auth.getSession();
        const duration = performance.now() - start;
        
        if (error) {
            console.warn('⚠️ Supabase connection error:', error.message);
            return false;
        }
        
        console.log(`✅ Supabase connected (${duration.toFixed(0)}ms)`);
        
        if (data?.session?.user) {
            console.log(`👤 User session: ${data.session.user.email}`);
        }
        
        return true;
    } catch (err) {
        console.warn('⚠️ Supabase unavailable:', err.message);
        return false;
    }
}

// ============================================
// SERVICE WORKER CLEANUP (Prevents caching issues)
// ============================================

async function cleanupServiceWorkers() {
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
            if (registrations.length > 0) {
                console.log('✅ Service workers cleaned up');
            }
        } catch (err) {
            console.debug('Service worker cleanup error:', err);
        }
    }
}

// ============================================
// GLOBAL ERROR HANDLING
// ============================================

// Handle uncaught errors
window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error?.message || event.message);
    
    // Log to console only, don't show to users
    if (isDevelopment && event.error) {
        console.debug('Error details:', event.error);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled Promise rejection:', event.reason);
});

// ============================================
// NETWORK STATUS
// ============================================

window.addEventListener('online', () => console.log('🌐 Back online'));
window.addEventListener('offline', () => console.warn('⚠️ Offline mode'));

// ============================================
// LOAD EVENT
// ============================================

window.addEventListener('load', () => {
    reportLoadTime();
    console.log('🚀 Application ready');
    
    if (!navigator.onLine) {
        console.warn('⚠️ Offline mode - some features may be limited');
    }
});

// ============================================
// INITIALIZE APPLICATION
// ============================================

const rootElement = document.getElementById('root');

if (!rootElement) {
    console.error('❌ Root element missing!');
    document.body.innerHTML = `
        <div style="padding: 40px; text-align: center; font-family: system-ui, -apple-system, sans-serif; background: #0f172a; min-height: 100vh; color: white;">
            <h1 style="color: #ef4444; margin-bottom: 16px;">Configuration Error</h1>
            <p style="color: #94a3b8; margin-bottom: 24px;">Root element not found. Please check your HTML file.</p>
            <button onclick="location.reload()" style="padding: 10px 20px; background: #3b82f6; border: none; border-radius: 8px; color: white; cursor: pointer;">
                Refresh Page
            </button>
        </div>
    `;
} else {
    // Non-blocking initialization (don't block rendering)
    cleanupServiceWorkers().catch(() => {});
    checkSupabaseConnection().catch(() => {});
    
    // Render app
    try {
        ReactDOM.createRoot(rootElement).render(
            <React.StrictMode>
                <ErrorBoundary>
                    <App />
                </ErrorBoundary>
            </React.StrictMode>
        );
        console.log('🎯 App rendered successfully');
    } catch (error) {
        console.error('❌ Render failed:', error);
        rootElement.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: system-ui, -apple-system, sans-serif; background: #0f172a; min-height: 100vh; color: white;">
                <h1 style="color: #ef4444; margin-bottom: 16px;">Failed to Load Application</h1>
                <p style="color: #94a3b8; margin-bottom: 24px;">${error.message}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #3b82f6; border: none; border-radius: 8px; color: white; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
    }
}

// ============================================
// HOT MODULE REPLACEMENT (Development only)
// ============================================

if (isDevelopment && import.meta.hot) {
    import.meta.hot.accept();
    console.log('🔥 HMR active - hot reload enabled');
}

// ============================================
// DEBUG TOOLS (Development only)
// ============================================

if (isDevelopment) {
    window.__APP_DEBUG__ = {
        version: '1.0.0',
        env: import.meta.env.MODE,
        checkSupabase: () => checkSupabaseConnection(),
        reload: () => window.location.reload(),
        clearStorage: () => {
            localStorage.clear();
            sessionStorage.clear();
            console.log('✅ Storage cleared');
        }
    };
    console.log('🐛 Debug tools: window.__APP_DEBUG__');
}
