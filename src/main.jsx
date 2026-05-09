// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Use the singleton pattern - only one Supabase client
import { supabase } from './lib/supabase';

// Optional: Log that supabase is initialized (only once)
console.log('✅ Supabase client initialized');

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
