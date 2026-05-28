// src/main.jsx
// PRODUCTION ENTRY POINT - Optimized for www.bluskyeconsult.com

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase, initAuthListener, cleanupAuthListener, recoverSession } from './lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const startTime = performance.now();

// Prevent double initialization
let isRendered = false;
let reactRoot = null;
let authCleanup = null;

// Performance metrics
const performanceMetrics = {
    appLoadStart: startTime,
    dnsLookup: 0,
    tcpConnection: 0,
    domLoading: 0,
    firstPaint: 0
};

// ============================================
// SAFE SUPABASE ERROR HANDLER (Development only)
// ============================================

/**
 * Safely execute Supabase queries with development error suppression
 * Only suppresses expected "table does not exist" errors in development
 */
const safeSupabaseQuery = async (queryFn, tableName) => {
    try {
        return await queryFn();
    } catch (error) {
        if (isDevelopment && error?.message?.includes('does not exist')) {
            console.warn(`⚠️ Development: Table "${tableName}" not found - migration may be pending`);
            return { data: [], error: null };
        }
        throw error;
    }
};

/**
 * Enhanced Supabase client with development helpers
 */
const createSafeSupabase = (client) => {
    if (!isDevelopment) return client;
    
    return {
        ...client,
        safeFrom: (tableName) => ({
            select: (columns) => ({
                then: (callback) => 
                    safeSupabaseQuery(
                        () => client.from(tableName).select(columns).then(callback),
                        tableName
                    ),
                eq: (field, value) => ({
                    then: (callback) =>
                        safeSupabaseQuery(
                            () => client.from(tableName).select(columns).eq(field, value).then(callback),
                            tableName
                        ),
                    single: () => ({
                        then: (callback) =>
                            safeSupabaseQuery(
                                () => client.from(tableName).select(columns).eq(field, value).single().then(callback),
                                tableName
                            )
                    })
                })
            }),
            insert: (data) => ({
                then: (callback) =>
                    safeSupabaseQuery(
                        () => client.from(tableName).insert(data).then(callback),
                        tableName
                    )
            }),
            update: (data) => ({
                eq: (field, value) => ({
                    then: (callback) =>
                        safeSupabaseQuery(
                            () => client.from(tableName).update(data).eq(field, value).then(callback),
                            tableName
                        )
                })
            }),
            delete: () => ({
                eq: (field, value) => ({
                    then: (callback) =>
                        safeSupabaseQuery(
                            () => client.from(tableName).delete().eq(field, value).then(callback),
                            tableName
                        )
                })
            })
        })
    };
};

export const safeSupabase = isDevelopment ? createSafeSupabase(supabase) : supabase;

// ============================================
// AUTH INITIALIZATION
// ============================================

async function initializeAuth() {
    try {
        if (initAuthListener) {
            authCleanup = initAuthListener();
            if (isDevelopment) console.log('✅ Auth listener initialized');
        }
        
        if (recoverSession) {
            const session = await recoverSession();
            if (session) {
                if (isDevelopment) console.log('✅ Session active');
            } else {
                if (isDevelopment) console.log('ℹ️ No existing session found');
            }
        }
    } catch (error) {
        console.warn('⚠️ Auth initialization error:', error.message);
    }
}

// ============================================
// PERFORMANCE MONITORING
// ============================================

function reportPerformanceMetrics() {
    if (!isDevelopment) return;
    
    const loadTime = performance.now() - startTime;
    console.log(`✅ App loaded in ${loadTime.toFixed(0)}ms`);
    
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
        performanceMetrics.dnsLookup = nav.domainLookupEnd - nav.domainLookupStart;
        performanceMetrics.tcpConnection = nav.connectEnd - nav.connectStart;
        performanceMetrics.domLoading = nav.loadEventEnd - nav.startTime;
        
        console.log(`📊 DNS: ${performanceMetrics.dnsLookup.toFixed(0)}ms | TCP: ${performanceMetrics.tcpConnection.toFixed(0)}ms | Load: ${performanceMetrics.domLoading.toFixed(0)}ms`);
    }
    
    const paints = performance.getEntriesByType('paint');
    paints.forEach(paint => {
        if (paint.name === 'first-paint') {
            performanceMetrics.firstPaint = paint.startTime;
        }
        console.log(`📊 ${paint.name}: ${paint.startTime.toFixed(0)}ms`);
    });
}

// Paint observer (non-blocking)
if (typeof PerformanceObserver !== 'undefined') {
    const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.name === 'first-paint' && isDevelopment) {
                performanceMetrics.firstPaint = entry.startTime;
                console.log(`📊 first-paint: ${entry.startTime.toFixed(0)}ms`);
            }
        }
    });
    paintObserver.observe({ entryTypes: ['paint'] });
}

// ============================================
// SUPABASE HEALTH CHECK
// ============================================

async function checkSupabaseConnection() {
    try {
        const start = Date.now();
        const { data, error } = await supabase.auth.getSession();
        const duration = Date.now() - start;
        
        if (error) {
            console.warn('⚠️ Supabase connection issue:', error.message);
            return false;
        }
        
        if (isDevelopment) console.log(`✅ Supabase connected (${duration}ms)`);
        if (data?.session?.user?.email) console.log(`👤 Session: ${data.session.user.email}`);
        
        return true;
    } catch (err) {
        console.warn('⚠️ Supabase unavailable:', err.message);
        return false;
    }
}

// ============================================
// SERVICE WORKER CLEANUP
// ============================================

async function cleanupServiceWorkers() {
    if (!('serviceWorker' in navigator)) return;
    
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
        }
        if (registrations.length > 0 && isDevelopment) console.log('✅ Service workers cleaned up');
    } catch (err) {
        if (isDevelopment) console.debug('Service worker cleanup:', err.message);
    }
}

// ============================================
// GLOBAL ERROR HANDLING
// ============================================

window.addEventListener('error', (event) => {
    if (event.error?.message?.includes('object is not extensible')) {
        console.warn('⚠️ Object not extensible error caught - clearing session');
        localStorage.clear();
        sessionStorage.clear();
        return;
    }
    console.error('❌ Global error:', event.error?.message || event.message);
    if (isDevelopment && event.error) console.debug('Stack:', event.error.stack);
});

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('object is not extensible')) {
        console.warn('⚠️ Unhandled rejection: object not extensible - clearing session');
        localStorage.clear();
        sessionStorage.clear();
        return;
    }
    console.error('❌ Unhandled rejection:', event.reason);
});

window.addEventListener('online', () => {
    if (isDevelopment) console.log('🌐 Online');
});
window.addEventListener('offline', () => {
    console.warn('⚠️ Offline mode - features may be limited');
});

// ============================================
// APP INITIALIZATION
// ============================================

async function initializeApp() {
    await initializeAuth();
    
    Promise.allSettled([
        cleanupServiceWorkers(),
        checkSupabaseConnection()
    ]).catch(() => {});
    
    window.addEventListener('load', () => {
        reportPerformanceMetrics();
        console.log('🚀 Application ready - www.bluskyeconsult.com');
        
        if (!navigator.onLine) console.warn('⚠️ Offline mode - features may be limited');
    });
}

// ============================================
// RENDER APPLICATION
// ============================================

const rootElement = document.getElementById('root');

if (!rootElement) {
    console.error('❌ Root element missing!');
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; font-family: system-ui, sans-serif; margin: 0;">
            <div style="text-align: center; padding: 40px; background: #1e293b; border-radius: 16px; max-width: 500px;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h1 style="color: #f1f5f9; margin-bottom: 12px;">Configuration Error</h1>
                <p style="color: #94a3b8; margin-bottom: 24px;">Root element not found.</p>
                <button onclick="location.reload()" style="padding: 10px 24px; background: #3b82f6; border: none; border-radius: 8px; color: white; cursor: pointer;">Refresh</button>
            </div>
        </div>
    `;
} else if (!isRendered && !reactRoot) {
    isRendered = true;
    initializeApp();
    
    if (!rootElement.hasAttribute('data-react-initialized')) {
        rootElement.setAttribute('data-react-initialized', 'true');
        
        try {
            reactRoot = ReactDOM.createRoot(rootElement);
            reactRoot.render(
                <React.StrictMode>
                    <ErrorBoundary>
                        <App />
                    </ErrorBoundary>
                </React.StrictMode>
            );
            
            if (isDevelopment) console.log('🎯 App rendered successfully');
        } catch (error) {
            console.error('❌ Render failed:', error);
            rootElement.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; font-family: system-ui, sans-serif; margin: 0;">
                    <div style="text-align: center; padding: 40px; background: #1e293b; border-radius: 16px; max-width: 500px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">💥</div>
                        <h1 style="color: #f1f5f9; margin-bottom: 12px;">Failed to Load</h1>
                        <p style="color: #94a3b8; margin-bottom: 24px;">${error.message}</p>
                        <button onclick="location.reload()" style="padding: 10px 24px; background: #ef4444; border: none; border-radius: 8px; color: white; cursor: pointer;">Retry</button>
                    </div>
                </div>
            `;
        }
    }
}

// ============================================
// CLEANUP ON PAGE UNLOAD
// ============================================

window.addEventListener('beforeunload', () => {
    if (authCleanup && typeof authCleanup === 'function') {
        authCleanup();
    }
});

// ============================================
// DEVELOPMENT TOOLS
// ============================================

if (isDevelopment && typeof window !== 'undefined') {
    window.__APP_DEBUG__ = {
        version: '1.0.0',
        env: import.meta.env.MODE,
        domain: 'www.bluskyeconsult.com',
        checkSupabase: () => checkSupabaseConnection(),
        reload: () => window.location.reload(),
        clearStorage: () => {
            localStorage.clear();
            sessionStorage.clear();
            console.log('✅ Storage cleared');
        },
        getMetrics: () => performanceMetrics,
        cleanupAuth: () => {
            if (authCleanup) authCleanup();
            console.log('✅ Auth cleaned up');
        },
        checkTable: async (tableName) => {
            try {
                const { data, error } = await supabase.from(tableName).select('*').limit(1);
                if (error) throw error;
                console.log(`✅ Table "${tableName}" exists`);
                return { exists: true, data };
            } catch (err) {
                console.warn(`⚠️ Table "${tableName}" not found:`, err.message);
                return { exists: false, error: err.message };
            }
        }
    };
    console.log('🐛 Debug: window.__APP_DEBUG__');
}

// ============================================
// HOT MODULE REPLACEMENT
// ============================================

if (isDevelopment && import.meta.hot) {
    import.meta.hot.accept();
    console.log('🔥 HMR active');
    
    import.meta.hot.dispose(() => {
        if (authCleanup && typeof authCleanup === 'function') {
            authCleanup();
        }
        console.log('🔥 HMR cleanup completed');
    });
}

if (isDevelopment) {
    console.log('📦 Main module loaded - www.bluskyeconsult.com');
}
