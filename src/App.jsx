// src/App.jsx - INTERMEDIATE TEST VERSION 2
// Added: Assessments, Courses, Newsletter Signup (static first)

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';

// ============================================
// SIMPLE SCROLL TO TOP (Working)
// ============================================
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

// ============================================
// SIMPLE NEWSLETTER SIGNUP (Inline - No external imports)
// ============================================
function SimpleNewsletterSignup() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);
        
        try {
            const response = await fetch('/api/index?action=newsletter-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            
            if (data.success) {
                setStatus({ type: 'success', message: 'Subscribed successfully!' });
                setEmail('');
            } else {
                setStatus({ type: 'error', message: data.error || 'Subscription failed' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Network error. Try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border-y border-slate-800 py-8 mt-8">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <h3 className="text-white font-semibold mb-2">Subscribe to Newsletter</h3>
                <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email"
                        required
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                        {loading ? '...' : 'Subscribe'}
                    </button>
                </form>
                {status && (
                    <p className={`mt-2 text-sm ${status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {status.message}
                    </p>
                )}
            </div>
        </div>
    );
}

// ============================================
// SIMPLE NAVBAR (Working)
// ============================================
function Navbar() {
    return (
        <nav className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-3">
                <span className="text-white font-bold text-xl">ODUSBABA</span>
                <div className="flex gap-4 flex-wrap">
                    <a href="/" className="text-slate-300 hover:text-white transition">Home</a>
                    <a href="/jobs" className="text-slate-300 hover:text-white transition">Jobs</a>
                    <a href="/assessments" className="text-slate-300 hover:text-white transition">Assessments</a>
                    <a href="/courses" className="text-slate-300 hover:text-white transition">Courses</a>
                </div>
            </div>
        </nav>
    );
}

// ============================================
// SIMPLE FOOTER (Working)
// ============================================
function Footer() {
    return (
        <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-8">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-slate-400 text-sm">© 2024 ODUSBABA. All rights reserved.</p>
            </div>
        </footer>
    );
}

// ============================================
// LOADING COMPONENT
// ============================================
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
);

// ============================================
// LAZY LOADED PAGES (Gradual addition)
// ============================================
const HomePage = lazy(() => import('./pages/HomePage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const NotFoundPage = () => (
    <div className="text-center py-20">
        <h1 className="text-4xl font-bold text-white">404</h1>
        <p className="text-slate-400 mt-2">Page not found</p>
        <a href="/" className="text-primary-400 mt-4 inline-block">Go Home</a>
    </div>
);

// ============================================
// MAIN APP CONTENT
// ============================================
function AppContent() {
    const location = useLocation();
    
    return (
        <>
            <ScrollToTop />
            <Navbar />
            <main className="min-h-screen bg-slate-950">
                <Suspense fallback={<PageLoader />}>
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/jobs" element={<JobsPage />} />
                        <Route path="/assessments" element={<AssessmentsPage />} />
                        <Route path="/courses" element={<CoursesPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </main>
            <SimpleNewsletterSignup />
            <Footer />
        </>
    );
}

// ============================================
// MAIN APP
// ============================================
function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
