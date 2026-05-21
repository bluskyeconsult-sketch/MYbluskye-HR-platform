// src/App.jsx
// SIMPLE WORKING ROUTER - NO LAZY LOADING

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Simple components to test routing
function HomePage() {
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px' }}>
            <h1 style={{ color: '#3b82f6' }}>ODUSBABA Platform</h1>
            <p>Router is working correctly!</p>
            <hr />
            <ul>
                <li><a href="/admin-login" style={{ color: '#3b82f6' }}>Admin Login</a></li>
                <li><a href="/dashboard" style={{ color: '#3b82f6' }}>Dashboard</a></li>
                <li><a href="/jobs" style={{ color: '#3b82f6' }}>Jobs</a></li>
            </ul>
        </div>
    );
}

function AdminLoginPage() {
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px' }}>
            <h1 style={{ color: '#3b82f6' }}>Admin Login</h1>
            <p>This is a test page. The real admin login will be restored shortly.</p>
            <a href="/" style={{ color: '#3b82f6' }}>← Back to Home</a>
        </div>
    );
}

function DashboardPage() {
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px' }}>
            <h1 style={{ color: '#3b82f6' }}>Dashboard</h1>
            <p>This is a test page.</p>
            <a href="/" style={{ color: '#3b82f6' }}>← Back to Home</a>
        </div>
    );
}

function JobsPage() {
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px' }}>
            <h1 style={{ color: '#3b82f6' }}>Jobs Board</h1>
            <p>This is a test page.</p>
            <a href="/" style={{ color: '#3b82f6' }}>← Back to Home</a>
        </div>
    );
}

function NotFoundPage() {
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: '#ef4444' }}>404 - Page Not Found</h1>
            <a href="/" style={{ color: '#3b82f6' }}>Go Home →</a>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/admin-login" element={<AdminLoginPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
