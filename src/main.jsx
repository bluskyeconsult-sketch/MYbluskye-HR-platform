// src/main.jsx
// PRODUCTION ENTRY POINT - Optimized for www.bluskyeconsult.com
// No Supabase calls here - only app initialization

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// ============================================
// CONFIGURATION
// ============================================

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const startTime = performance.now();

// Prevent double initialization
let isRendered = false;
let reactRoot = null;

// Performance metrics
const performanceMetrics = {
    appLoadStart: startTime,
    dnsLookup: 0,
    tcpConnection: 0,
    domLoading: 0,
    firstPaint: 0
};

// ============================================
// PERFORMANCE MONITORING (Development only)
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
if (typeof PerformanceObserver !== 'undefined' && isDevelopment) {
    const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.name === 'first-paint') {
                performanceMetrics.firstPaint = entry.startTime;
                console.log(`📊 first-paint: ${entry.startTime.toFixed(0)}ms`);
            }
        }
    });
    paintObserver.observe({ entryTypes: ['paint'] });
}

// ============================================
// GLOBAL ERROR HANDLING
// ============================================

window.addEventListener('error', (event) => {
    // Fix for "object is not extensible" error
    if (event.error?.message?.includes('object is not extensible')) {
        console.warn('⚠️ Object not extensible error caught - this is usually harmless');
        return;
    }
    console.error('❌ Global error:', event.error?.message || event.message);
    if (isDevelopment && event.error) {
        console.debug('Stack:', event.error.stack);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    // Fix for "object is not extensible" error in promises
    if (event.reason?.message?.includes('object is not extensible')) {
        console.warn('⚠️ Unhandled rejection: object not extensible - usually harmless');
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
    window.addEventListener('load', () => {
        reportPerformanceMetrics();
        console.log('🚀 Application ready - www.bluskyeconsult.com');
        
        if (!navigator.onLine) {
            console.warn('⚠️ Offline mode - features may be limited');
        }
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
            
            if (isDevelopment) {
                console.log('🎯 App rendered successfully');
            }
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
// DEVELOPMENT TOOLS
// ============================================

if (isDevelopment && typeof window !== 'undefined') {
    window.__APP_DEBUG__ = {
        version: '1.0.0',
        env: import.meta.env.MODE,
        domain: 'www.bluskyeconsult.com',
        reload: () => window.location.reload(),
        clearStorage: () => {
            localStorage.clear();
            sessionStorage.clear();
            console.log('✅ Storage cleared');
        },
        getMetrics: () => performanceMetrics
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
        console.log('🔥 HMR cleanup completed');
    });
}

if (isDevelopment) {
    console.log('📦 Main module loaded - www.bluskyeconsult.com');
}
