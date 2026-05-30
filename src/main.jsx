// src/main.jsx
// COMPLETE PRODUCTION READY - Optimized entry point with error handling

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import supabase to ensure it initializes before app renders
import { supabase } from './lib/supabase';

// ============================================
// PERFORMANCE MONITORING (Development only)
// ============================================

const isDevelopment = import.meta.env.DEV;
const startTime = performance.now();

// Report load time in development
if (isDevelopment) {
    window.addEventListener('load', () => {
        const loadTime = performance.now() - startTime;
        console.log(`✅ App loaded in ${loadTime.toFixed(0)}ms`);
    });
}

// ============================================
// GLOBAL ERROR HANDLING
// ============================================

// Handle uncaught errors
window.addEventListener('error', (event) => {
    console.error('❌ Uncaught error:', event.error?.message || event.message);
    if (isDevelopment && event.error?.stack) {
        console.debug('Stack:', event.error.stack);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled rejection:', event.reason?.message || event.reason);
});

// ============================================
// SUPABASE INITIALIZATION LOGGING
// ============================================

if (isDevelopment) {
    console.log('✅ Supabase client initialized');
    console.log(`🔗 Endpoint: ${import.meta.env.VITE_SUPABASE_URL?.substring(0, 30)}...`);
}

// ============================================
// ROOT ELEMENT VALIDATION & RENDER
// ============================================

const rootElement = document.getElementById('root');

if (!rootElement) {
    // Fallback error UI when root element is missing
    console.error('❌ Root element with id "root" not found!');
    
    const errorHtml = `
        <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #0f172a;
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 20px;
        ">
            <div style="
                text-align: center;
                padding: 40px;
                background: #1e293b;
                border-radius: 16px;
                max-width: 400px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h1 style="color: #f1f5f9; margin-bottom: 12px; font-size: 24px;">Configuration Error</h1>
                <p style="color: #94a3b8; margin-bottom: 24px; line-height: 1.5;">
                    The application could not start because the root element was not found.
                    Please refresh the page or contact support if the issue persists.
                </p>
                <button 
                    onclick="location.reload()" 
                    style="
                        padding: 12px 28px;
                        background: #3b82f6;
                        border: none;
                        border-radius: 8px;
                        color: white;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background 0.2s;
                    "
                    onmouseover="this.style.background='#2563eb'"
                    onmouseout="this.style.background='#3b82f6'"
                >
                    Refresh Page
                </button>
                <p style="color: #475569; font-size: 12px; margin-top: 24px;">
                    <a href="/" style="color: #64748b; text-decoration: none;">← Back to Home</a>
                </p>
            </div>
        </div>
    `;
    
    document.body.innerHTML = errorHtml;
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.backgroundColor = '#0f172a';
} else {
    // Render the app
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
    
    // Log successful render in development
    if (isDevelopment) {
        console.log('🎯 App rendered successfully');
    }
}

// ============================================
// SERVICE WORKER CLEANUP (Optional)
// ============================================

if ('serviceWorker' in navigator && isDevelopment) {
    // Clean up old service workers in development to prevent caching issues
    window.addEventListener('load', async () => {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log('✅ Unregistered old service worker');
            }
        } catch (err) {
            console.debug('Service worker cleanup:', err.message);
        }
    });
}

// ============================================
// ONLINE/OFFLINE STATUS
// ============================================

window.addEventListener('online', () => {
    if (isDevelopment) console.log('🌐 Application is online');
});

window.addEventListener('offline', () => {
    console.warn('⚠️ Application is offline - some features may be limited');
});
