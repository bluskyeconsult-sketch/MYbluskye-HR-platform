// src/App.jsx - INTERMEDIATE TEST VERSION 3
// Added: User Dashboard, Sign In/Up, AI Chat, Protected Routes

import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';

// ============================================
// SIMPLE SCROLL TO TOP
// ============================================
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

// ============================================
// SIMPLE NEWSLETTER SIGNUP
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
// SIMPLE AI CHAT (Minimal working version)
// ============================================
function SimpleAIChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!message.trim()) return;
        
        const userMsg = { role: 'user', content: message };
        setMessages(prev => [...prev, userMsg]);
        setMessage('');
        setLoading(true);

        try {
            const response = await fetch('/api/index?action=chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history: messages })
            });
            const data = await response.json();
            
            if (data.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700">
                    <div className="p-3 bg-primary-600 rounded-t-lg text-white font-semibold">
                        ODUSBABA AI Assistant
                    </div>
                    <div className="h-80 overflow-y-auto p-3 space-y-2">
                        {messages.length === 0 && (
                            <p className="text-slate-400 text-sm text-center">Ask me about jobs, careers, or anything!</p>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`p-2 rounded-lg ${msg.role === 'user' ? 'bg-primary-600/20 ml-8' : 'bg-slate-700 mr-8'}`}>
                                <p className="text-white text-sm">{msg.content}</p>
                            </div>
                        ))}
                        {loading && <p className="text-slate-400 text-sm">Thinking...</p>}
                    </div>
                    <div className="p-3 border-t border-slate-700 flex gap-2">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type your question..."
                            className="flex-1 px-3 py-2 bg-slate-700 rounded-lg text-white text-sm"
                        />
                        <button onClick={sendMessage} className="px-3 py-2 bg-primary-600 rounded-lg text-white">
                            Send
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// ============================================
// SIMPLE NAVBAR (Added Auth Links)
// ============================================
function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    useEffect(() => {
        // Check if user is logged in
        const checkAuth = async () => {
            try {
                const { supabase } = await import('./lib/supabase');
                const { data: { user } } = await supabase.auth.getUser();
                setIsLoggedIn(!!user);
            } catch (e) {
                setIsLoggedIn(false);
            }
        };
        checkAuth();
    }, []);

    return (
        <nav className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-3">
                <a href="/" className="text-white font-bold text-xl">ODUSBABA</a>
                <div className="flex gap-4 flex-wrap">
                    <a href="/" className="text-slate-300 hover:text-white transition">Home</a>
                    <a href="/jobs" className="text-slate-300 hover:text-white transition">Jobs</a>
                    <a href="/assessments" className="text-slate-300 hover:text-white transition">Assessments</a>
                    <a href="/courses" className="text-slate-300 hover:text-white transition">Courses</a>
                    {isLoggedIn ? (
                        <a href="/dashboard" className="text-primary-400 hover:text-primary-300 transition">Dashboard</a>
                    ) : (
                        <>
                            <a href="/sign-in" className="text-slate-300 hover:text-white transition">Sign In</a>
                            <a href="/sign-up" className="bg-primary-600 px-3 py-1 rounded-lg text-white hover:bg-primary-700 transition">Sign Up</a>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

// ============================================
// SIMPLE FOOTER
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
// PROTECTED ROUTE WRAPPER
// ============================================
function ProtectedRoute({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { supabase } = await import('./lib/supabase');
                const { data: { user } } = await supabase.auth.getUser();
                setIsAuthenticated(!!user);
            } catch (e) {
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);
    
    if (isAuthenticated === null) return <PageLoader />;
    
    return isAuthenticated ? children : <Navigate to="/sign-in" replace />;
}

// ============================================
// LAZY LOADED PAGES
// ============================================
const HomePage = lazy(() => import('./pages/HomePage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));

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
                        {/* Public Routes */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/jobs" element={<JobsPage />} />
                        <Route path="/assessments" element={<AssessmentsPage />} />
                        <Route path="/courses" element={<CoursesPage />} />
                        <Route path="/sign-in" element={<SignInPage />} />
                        <Route path="/sign-up" element={<SignUpPage />} />
                        
                        {/* Protected Routes */}
                        <Route path="/dashboard" element={
                            <ProtectedRoute>
                                <UserDashboard />
                            </ProtectedRoute>
                        } />
                        
                        {/* 404 */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </main>
            <SimpleNewsletterSignup />
            <SimpleAIChat />
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
