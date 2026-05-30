// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a;">
            <div style="text-align: center; padding: 40px; background: #1e293b; border-radius: 16px;">
                <h1 style="color: #f1f5f9;">Configuration Error</h1>
                <p style="color: #94a3b8;">Root element not found. Please refresh.</p>
                <button onclick="location.reload()" style="padding: 10px 24px; background: #3b82f6; border: none; border-radius: 8px; color: white;">Refresh</button>
            </div>
        </div>
    `;
} else {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
