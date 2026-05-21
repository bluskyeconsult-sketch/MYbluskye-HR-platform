// src/main.jsx
// COMPLETE ENTRY POINT - With Error Boundary, Performance Monitoring, and Supabase Connection Check

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
// PERFORMANCE MONITORING
// ============================================

// Measure initial page load time
const pageLoadStartTime = performance.now();

// Function to report performance metrics
const reportPerformanceMetrics = () => {
    const loadTime = performance.now() - pageLoadStartTime;
    console.log(`📊 Page load time: ${loadTime.toFixed(2)}ms`);
    
    // Get navigation timing data
    if (performance.getEntriesByType) {
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        if (navigationEntry) {
            console.log('📊 Performance metrics:', {
                'DNS lookup': `${navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart}ms`,
                'TCP connection': `${navigationEntry.connectEnd - navigationEntry.connectStart}ms`,
                'Request time': `${navigationEntry.responseStart - navigationEntry.requestStart}ms`,
                'DOM parsing': `${navigationEntry.domInteractive - navigationEntry.responseEnd}ms`,
                'Page load': `${navigationEntry.loadEventEnd - navigationEntry.startTime}ms`
            });
        }
    }
};

// Report Core Web Vitals (production only)
const reportWebVitals = (metric) => {
    if (isProduction) {
        console.log(`🔍 Web Vital - ${metric.name}: ${metric.value}`);
        
        // Optional: Send to analytics service
        // You can send to Google Analytics, Plausible, or your own API
        /*
        fetch('/api/metrics/web-vitals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: metric.name,
                value: metric.value,
                rating: metric.rating,
                delta: metric.delta,
                id: metric.id,
                url: window.location.href
            })
        }).catch(console.debug);
        */
    }
};

// Lazy load web-vitals only in production
if (isProduction) {
    import('web-vitals').then(({ onCLS, onFID, onLCP, onTTFB, onINP }) => {
        onCLS(reportWebVitals);
        onFID(reportWebVitals);
        onLCP(reportWebVitals);
        onTTFB(reportWebVitals);
        onINP(reportWebVitals);
        console.log('✅ Web Vitals monitoring enabled');
    }).catch(err => {
        console.debug('Web Vitals not loaded:', err);
    });
}

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
            console.warn('Some features may not work correctly');
            return false;
        }
        
        console.log(`✅ Supabase connected (${duration.toFixed(0)}ms)`);
        
        // Optional: Check if user is already logged in
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
// GLOBAL ERROR HANDLING
// ============================================

// Handle uncaught promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // Optional: Send to error tracking service
    if (isProduction) {
        // You can send to Sentry or custom API
        // fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ error: event.reason }) });
    }
});

// Handle global JavaScript errors
window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
    
    // Optional: Send to error tracking service
    if (isProduction) {
        // fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ error: event.error }) });
    }
});

// ============================================
// LOAD COMPLETE EVENT
// ============================================

window.addEventListener('load', () => {
    reportPerformanceMetrics();
    console.log('🚀 Application fully loaded');
});

// ============================================
// INITIALIZE APPLICATION
// ============================================

// Verify Supabase connection (non-blocking)
verifySupabaseConnection();

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
