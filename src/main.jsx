// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import singleton Supabase (ensures single instance)
import { supabase } from './lib/supabase';

// Optional: Verify Supabase is connected
supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
        console.error('Supabase connection error:', error);
    } else {
        console.log('✅ Supabase connected');
    }
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
