// src/main.jsx
// COMPLETE ENTRY POINT - With Error Boundary, Performance Monitoring, and Supabase Connection Check
// No external dependencies - web-vitals removed to prevent build failures

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

// Environment checks
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// ============================================
// PERFORMANCE MONITORING (No external dependencies)
// ============================================

// Measure initial page load time
const pageLoadStartTime = performance.now();

// Function to report performance metrics
const reportPerformanceMetrics = () => {
    const loadTime = performance.now() - pageLoadStartTime;
    console.log(`📊 Page load time: ${loadTime.toFixed(2)}ms`);
    
    // Get navigation timing data (works without external libs)
    if (performance.getEntriesByType) {
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        if (navigationEntry) {
            console.log('📊 Performance metrics:', {
                'DNS lookup': `${(navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart).toFixed(0)}ms`,
                'TCP connection': `${(navigationEntry.connectEnd - navigationEntry.connectStart).toFixed(0)}ms`,
                'Request time': `${(navigationEntry.responseStart - navigationEntry.requestStart).toFixed(0)}ms`,
                'DOM parsing': `${(navigationEntry.domInteractive - navigationEntry.responseEnd).toFixed(0)}ms`,
                'Page load': `${(navigationEntry.loadEventEnd - navigationEntry.startTime).toFixed(0)}ms`
            });
        }
    }
    
    // Measure First Paint and First Contentful Paint (if available)
    if (performance.getEntriesByType('paint')) {
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
            console.log(`📊 ${entry.name}: ${entry.startTime.toFixed(0)}ms`);
        });
    }
};

// Simple Web Vitals measurement (no external dependencies)
const measureWebVitals = () => {
    if (!isProduction) return;
    
    // Measure Largest Contentful Paint (LCP)
    try {
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log(`🔍 LCP: ${lastEntry.startTime.toFixed(0)}ms`);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
        console.debug('LCP observer not supported');
    }
    
    // Measure First Input Delay (FID)
    try {
        const fidObserver = new PerformanceObserver((list) => {
            const firstInput = list.getEntries()[0];
            if (firstInput) {
                console.log(`🔍 FID: ${firstInput.processingStart - firstInput.startTime}ms`);
            }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
        console.debug('FID observer not supported');
    }
    
    // Measure Cumulative Layout Shift (CLS)
    try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            console.log(`🔍 CLS: ${clsValue.toFixed(3)}`);
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
        console.debug('CLS observer not supported');
    }
};

// ============================================
// SUPABASE CONNECTION VERIFICATION
// ============================================

async function verifySupabaseConnection() {
    try {
        const startTime = performance.now();
        const { data, error } = await supabase.auth.getSession();
        const duration = performance.now() - startTime;
        
        if (error) {
            console.error('❌ Supabase connection error:', error.message);
            console.warn('⚠️ Some features may not work correctly');
            return false;
        }
        
        console.log(`✅ Supabase connected (${duration.toFixed(0)}ms)`);
        
        // Check if user is already logged in
        if (data?.session?.user) {
            console.log(`👤 User session found: ${data.session.user.email}`);
        }
        
        return true;
    } catch (err) {
        console.error('❌ Supabase connection failed:', err.message);
        return false;
    }
}

// ============================================
// SERVICE WORKER CLEANUP (Prevents caching issues)
// ============================================

async function clearServiceWorkers() {
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log('✅ Service worker unregistered');
            }
        } catch (err) {
            console.debug('Service worker cleanup error:', err);
        }
    }
}

// ============================================
// GLOBAL ERROR HANDLING
// ============================================

// Handle uncaught promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled Promise Rejection:', event.reason);
    
    // Optional: Send to error tracking service in production
    if (isProduction) {
        // You can send to Sentry or custom API
        // fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ error: event.reason }) })
        //     .catch(() => {});
    }
});

// Handle global JavaScript errors
window.addEventListener('error', (event) => {
    console.error('❌ Global Error:', event.error || event.message);
    
    // Optional: Send to error tracking service in production
    if (isProduction) {
        // fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ error: event.error }) })
        //     .catch(() => {});
    }
});

// ============================================
// LOAD COMPLETE EVENT
// ============================================

window.addEventListener('load', () => {
    reportPerformanceMetrics();
    measureWebVitals();
    console.log('🚀 Application fully loaded');
    
    // Report initial connection status
    if (navigator.onLine) {
        console.log('🌐 Online');
    } else {
        console.warn('⚠️ Offline - some features may be limited');
    }
});

// Handle online/offline events
window.addEventListener('online', () => console.log('🌐 Back online'));
window.addEventListener('offline', () => console.warn('⚠️ Offline mode'));

// ============================================
// INITIALIZE APPLICATION
// ============================================

// Clear service workers (prevents caching issues)
clearServiceWorkers();

// Verify Supabase connection (non-blocking)
verifySupabaseConnection();

// NOTE: Do NOT call initAnalytics() here or in App.jsx
// The useAnalytics hook in App.jsx handles page view tracking automatically
// If you see an error about initAnalytics, comment it out

// Create root and render app
const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Root element not found. Make sure your HTML has a <div id="root"></div>');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>
);

// ============================================
// HOT MODULE REPLACEMENT (Development only)
// ============================================

if (isDevelopment && import.meta.hot) {
    import.meta.hot.accept();
    console.log('🔥 HMR enabled');
}

// ============================================
// EXPORT FOR TESTING (Optional)
// ============================================

// Export for testing purposes
if (isDevelopment) {
    window.__APP_STATE__ = {
        version: '1.0.0',
        env: import.meta.env.MODE,
        supabaseConnected: false
    };
    
    // Update state after connection
    verifySupabaseConnection().then(connected => {
        window.__APP_STATE__.supabaseConnected = connected;
    });
}
