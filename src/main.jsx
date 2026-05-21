// src/main.jsx
// SIMPLE WORKING VERSION - Guaranteed to load

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Simple error logging
console.log('🚀 ODUSBABA Starting...');

// Create root and render
const rootElement = document.getElementById('root');

if (!rootElement) {
    console.error('❌ Root element not found!');
} else {
    try {
        ReactDOM.createRoot(rootElement).render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
        console.log('✅ App rendered successfully');
    } catch (error) {
        console.error('❌ Failed to render app:', error);
        // Fallback error display
        rootElement.innerHTML = `
            <div style="min-height:100vh; background:#0f172a; color:white; display:flex; align-items:center; justify-content:center; flex-direction:column; padding:20px; text-align:center; font-family:sans-serif;">
                <h1 style="color:#ef4444;">⚠️ Failed to load application</h1>
                <p>Error: ${error.message}</p>
                <button onclick="location.reload()" style="margin-top:20px; padding:10px 20px; background:#3b82f6; color:white; border:none; border-radius:8px; cursor:pointer;">Refresh Page</button>
            </div>
        `;
    }
}
