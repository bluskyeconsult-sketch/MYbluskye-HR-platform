// src/main.jsx
// OPTIMIZED ENTRY POINT - Clean, fast, and error-free

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
// SIMPLE PERFORMANCE METRICS
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
                       `Load: ${(nav.loadEventEnd - nav.startTime).toFixed(0)}ms`);
        }
    }
}

// ============================================
// SUPABASE CONNECTION CHECK (Non-blocking)
// ============================================

async function checkSupabase() {
    try {
        const start = performance.now();
        const { error } = await supabase.auth.getSession();
        const duration = performance.now() - start;
        
        if (error) {
            console.warn('⚠️ Supabase:', error.message);
            return false;
        }
        
        console.log(`✅ Supabase connected (${duration.toFixed(0)}ms)`);
        return true;
    } catch (err) {
        console.warn('⚠️ Supabase unavailable:', err.message);
        return false;
    }
}

// ============================================
// CLEANUP SERVICE WORKERS
// ============================================

async function cleanupServiceWorkers() {
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
        }
        if (registrations.length > 0) {
            console.log('✅ Service workers cleaned up');
        }
    }
}

// ============================================
// GLOBAL ERROR HANDLING
// ============================================

window.addEventListener('error', (event) => {
    console.error('❌ Error:', event.error?.message || event.message);
    // Don't show errors to users in production
    if (isDevelopment) {
        const root = document.getElementById('root');
        if (root && !root.innerHTML.includes('error')) {
            // Only show in development
            // root.innerHTML = `<div style="padding:20px;color:red;">Error: ${event.error?.message}</div>`;
        }
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled Promise:', event.reason);
});

// ============================================
// LOAD EVENT
// ============================================

window.addEventListener('load', () => {
    reportLoadTime();
    console.log('🚀 Application ready');
    
    if (!navigator.onLine) {
        console.warn('⚠️ Offline mode');
    }
});

// ============================================
// INITIALIZE APP
// ============================================

const rootElement = document.getElementById('root');

if (!rootElement) {
    console.error('❌ Root element missing!');
    document.body.innerHTML = `
        <div style="padding: 40px; text-align: center; font-family: sans-serif;">
            <h1>Configuration Error</h1>
            <p>Root element not found. Please check your HTML file.</p>
        </div>
    `;
} else {
    // Non-blocking initialization
    cleanupServiceWorkers().catch(() => {});
    checkSupabase().catch(() => {});
    
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
            <div style="padding: 40px; text-align: center; font-family: sans-serif; background: #0f172a; min-height: 100vh; color: white;">
                <h1 style="color: #ef4444;">Failed to Load Application</h1>
                <p>${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; border: none; border-radius: 8px; color: white; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
    }
}

// ============================================
// HOT MODULE REPLACEMENT (Development)
// ============================================

if (isDevelopment && import.meta.hot) {
    import.meta.hot.accept();
    console.log('🔥 HMR active');
}

// ============================================
// DEBUG TOOLS (Development only)
// ============================================

if (isDevelopment) {
    window.__APP_DEBUG__ = {
        version: '1.0.0',
        env: import.meta.env.MODE,
        checkSupabase,
        reload: () => window.location.reload()
    };
    console.log('🐛 Debug tools available: window.__APP_DEBUG__');
}
