// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './lib/supabase';

// Report performance metrics (optional)
if (import.meta.env.PROD) {
    // Report Core Web Vitals
    const reportWebVitals = (metric) => {
        console.log(metric.name, metric.value);
        // You can send to analytics here
    };
    // Uncomment to enable
    // import('web-vitals').then(({ onCLS, onFID, onLCP }) => {
    //     onCLS(reportWebVitals);
    //     onFID(reportWebVitals);
    //     onLCP(reportWebVitals);
    // });
}

// Verify Supabase connection (non-blocking)
supabase.auth.getSession().then(({ error }) => {
    if (error) console.error('Supabase connection error:', error);
    else console.log('✅ Supabase connected');
});

// Measure initial load time
const startTime = performance.now();
window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime;
    console.log(`Page load time: ${loadTime.toFixed(2)}ms`);
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>
);
