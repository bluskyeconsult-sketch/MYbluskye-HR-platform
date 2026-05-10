// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './lib/supabase';

// Verify connection
supabase.auth.getSession().then(({ error }) => {
    if (error) console.error('Supabase connection error:', error);
    else console.log('✅ Supabase connected');
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>
);
