// src/App.jsx - FINAL VERSION 4 (Complete)
// All features: Home, Jobs, Assessments, Courses, User Dashboard, Admin Dashboard, Workforce, Tester, Legal

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
// SIMPLE AI CHAT
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
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700">
                    <div className="p-3 bg-primary-600 rounded-t-lg text-white font-semibold flex justify-between">
                        <span>ODUSBABA AI Assistant</span>
                        <button onClick={() => setIsOpen(false)} className="text-white">✕</button>
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
// COMPLETE NAVBAR (All Menus)
// ============================================
function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { supabase } = await import('./lib/supabase');
                const { data: { user } } = await supabase.auth.getUser();
                setIsLoggedIn(!!user);
                
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('user_type')
                        .eq('id', user.id)
                        .single();
                    const isAdminUser = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
                    setIsAdmin(isAdminUser);
                }
            } catch (e) {
                setIsLoggedIn(false);
                setIsAdmin(false);
            }
        };
        checkAuth();
    }, []);

    const handleLogout = async () => {
        try {
            const { supabase } = await import('./lib/supabase');
            await supabase.auth.signOut();
            window.location.href = '/';
        } catch (e) {
            console.error('Logout error:', e);
        }
    };

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Jobs', path: '/jobs' },
        { name: 'Assessments', path: '/assessments' },
        { name: 'Courses', path: '/courses' },
        { name: 'Workforce', path: '/workforce' },
        { name: 'Books', path: '/books' },
        { name: 'Blog', path: '/blog' },
        { name: 'Contact', path: '/contact' },
    ];

    return (
        <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center py-3">
                    {/* Logo */}
                    <a href="/" className="text-white font-bold text-xl">
                        ODUSBABA
                    </a>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-5">
                        {navLinks.map(link => (
                            <a key={link.path} href={link.path} className="text-slate-300 hover:text-white transition text-sm">
                                {link.name}
                            </a>
                        ))}
                        
                        {/* Admin Dropdown */}
                        {isAdmin && (
                            <div className="relative group">
                                <button className="text-amber-400 hover:text-amber-300 text-sm">Admin ▼</button>
                                <div className="absolute hidden group-hover:block bg-slate-800 rounded-lg shadow-lg mt-2 py-2 w-48">
                                    <a href="/admin/dashboard" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Dashboard</a>
                                    <a href="/admin/users" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Users</a>
                                    <a href="/admin/jobs" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Jobs</a>
                                    <a href="/admin/assessments" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Assessments</a>
                                    <a href="/admin/ai-course-builder" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">AI Course Builder</a>
                                    <a href="/admin/health" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">System Health</a>
                                </div>
                            </div>
                        )}
                        
                        {/* Auth Links */}
                        {isLoggedIn ? (
                            <div className="relative group">
                                <button className="text-primary-400 hover:text-primary-300 text-sm">My Account ▼</button>
                                <div className="absolute hidden group-hover:block bg-slate-800 rounded-lg shadow-lg mt-2 py-2 w-48 right-0">
                                    <a href="/dashboard" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Dashboard</a>
                                    <a href="/profile" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Profile</a>
                                    <a href="/applications" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Applications</a>
                                    <a href="/saved-jobs" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Saved Jobs</a>
                                    <a href="/learning" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">My Learning</a>
                                    <hr className="border-slate-700 my-1" />
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-700 text-sm">Logout</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <a href="/sign-in" className="text-slate-300 hover:text-white text-sm">Sign In</a>
                                <a href="/sign-up" className="bg-primary-600 px-4 py-1.5 rounded-lg text-white hover:bg-primary-700 text-sm">Sign Up</a>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-3 border-t border-slate-800">
                        {navLinks.map(link => (
                            <a key={link.path} href={link.path} className="block py-2 text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                                {link.name}
                            </a>
                        ))}
                        {isAdmin && (
                            <>
                                <div className="text-amber-400 font-semibold pt-2 pb-1">Admin</div>
                                <a href="/admin/dashboard" className="block py-2 text-slate-300 hover:text-white">Dashboard</a>
                                <a href="/admin/users" className="block py-2 text-slate-300 hover:text-white">Users</a>
                                <a href="/admin/assessments" className="block py-2 text-slate-300 hover:text-white">Assessments</a>
                            </>
                        )}
                        {isLoggedIn ? (
                            <>
                                <div className="text-primary-400 font-semibold pt-2 pb-1">Account</div>
                                <a href="/dashboard" className="block py-2 text-slate-300 hover:text-white">Dashboard</a>
                                <a href="/profile" className="block py-2 text-slate-300 hover:text-white">Profile</a>
                                <a href="/applications" className="block py-2 text-slate-300 hover:text-white">Applications</a>
                                <button onClick={handleLogout} className="block w-full text-left py-2 text-red-400">Logout</button>
                            </>
                        ) : (
                            <div className="pt-2">
                                <a href="/sign-in" className="block py-2 text-slate-300 hover:text-white">Sign In</a>
                                <a href="/sign-up" className="block py-2 text-primary-400 hover:text-primary-300">Sign Up</a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}

// ============================================
// SIMPLE FOOTER
// ============================================
function Footer() {
    return (
        <footer className="bg-slate-900 border-t border-slate-800 py-8 mt-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
                    <div>
                        <h4 className="text-white font-semibold mb-3">ODUSBABA</h4>
                        <p className="text-slate-400 text-sm">AI-Powered Career Platform</p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-3">Quick Links</h4>
                        <ul className="space-y-1">
                            <li><a href="/jobs" className="text-slate-400 text-sm hover:text-white">Jobs</a></li>
                            <li><a href="/courses" className="text-slate-400 text-sm hover:text-white">Courses</a></li>
                            <li><a href="/assessments" className="text-slate-400 text-sm hover:text-white">Assessments</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-3">Resources</h4>
                        <ul className="space-y-1">
                            <li><a href="/blog" className="text-slate-400 text-sm hover:text-white">Blog</a></li>
                            <li><a href="/faq" className="text-slate-400 text-sm hover:text-white">FAQ</a></li>
                            <li><a href="/contact" className="text-slate-400 text-sm hover:text-white">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-3">Legal</h4>
                        <ul className="space-y-1">
                            <li><a href="/legal/terms" className="text-slate-400 text-sm hover:text-white">Terms</a></li>
                            <li><a href="/legal/privacy" className="text-slate-400 text-sm hover:text-white">Privacy</a></li>
                            <li><a href="/legal/cookies" className="text-slate-400 text-sm hover:text-white">Cookies</a></li>
                        </ul>
                    </div>
                </div>
                <div className="text-center pt-4 border-t border-slate-800">
                    <p className="text-slate-500 text-sm">© 2024 ODUSBABA. All rights reserved.</p>
                </div>
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
function ProtectedRoute({ children, requireAdmin = false }) {
    const [authState, setAuthState] = useState({ loading: true, isAuthenticated: false, isAdmin: false });
    
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { supabase } = await import('./lib/supabase');
                const { data: { user } } = await supabase.auth.getUser();
                
                if (!user) {
                    setAuthState({ loading: false, isAuthenticated: false, isAdmin: false });
                    return;
                }
                
                let isAdmin = false;
                if (requireAdmin) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('user_type')
                        .eq('id', user.id)
                        .single();
                    isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
                }
                
                setAuthState({ loading: false, isAuthenticated: true, isAdmin });
            } catch (e) {
                setAuthState({ loading: false, isAuthenticated: false, isAdmin: false });
            }
        };
        checkAuth();
    }, [requireAdmin]);
    
    if (authState.loading) return <PageLoader />;
    if (!authState.isAuthenticated) return <Navigate to="/sign-in" replace />;
    if (requireAdmin && !authState.isAdmin) return <Navigate to="/dashboard" replace />;
    
    return children;
}

// ============================================
// LAZY LOADED PAGES (All features)
// ============================================

// Public Pages
const HomePage = lazy(() => import('./pages/HomePage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const TakeAssessment = lazy(() => import('./pages/TakeAssessment'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const WorkforceMarketplace = lazy(() => import('./pages/WorkforceMarketplace'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));

// User Pages
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const UserApplications = lazy(() => import('./pages/UserApplications'));
const UserSkills = lazy(() => import('./pages/UserSkills'));
const SavedJobsPage = lazy(() => import('./pages/SavedJobsPage'));
const LearnerDashboard = lazy(() => import('./pages/LearnerDashboard'));

// Admin Pages
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'));
const AssessmentManager = lazy(() => import('./pages/admin/AssessmentManager'));
const AICourseBuilder = lazy(() => import('./pages/admin/AICourseBuilder'));
const SystemHealthDashboard = lazy(() => import('./pages/admin/SystemHealthDashboard'));

// Tester Pages
const TesterRegisterPage = lazy(() => import('./pages/tester/TesterRegisterPage'));
const TesterDashboard = lazy(() => import('./pages/tester/TesterDashboard'));

// Legal Pages
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));

// 404 Page
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
                        <Route path="/assessments/:id" element={<TakeAssessment />} />
                        <Route path="/assessment-results/:id" element={<AssessmentResults />} />
                        <Route path="/courses" element={<CoursesPage />} />
                        <Route path="/workforce" element={<WorkforceMarketplace />} />
                        <Route path="/books" element={<BooksPage />} />
                        <Route path="/blog" element={<BlogPage />} />
                        <Route path="/contact" element={<ContactPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        <Route path="/faq" element={<FAQPage />} />
                        <Route path="/sign-in" element={<SignInPage />} />
                        <Route path="/sign-up" element={<SignUpPage />} />
                        
                        {/* User Protected Routes */}
                        <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                        <Route path="/applications" element={<ProtectedRoute><UserApplications /></ProtectedRoute>} />
                        <Route path="/skills" element={<ProtectedRoute><UserSkills /></ProtectedRoute>} />
                        <Route path="/saved-jobs" element={<ProtectedRoute><SavedJobsPage /></ProtectedRoute>} />
                        <Route path="/learning" element={<ProtectedRoute><LearnerDashboard /></ProtectedRoute>} />
                        
                        {/* Tester Routes */}
                        <Route path="/tester-register" element={<TesterRegisterPage />} />
                        <Route path="/tester/dashboard" element={<ProtectedRoute><TesterDashboard /></ProtectedRoute>} />
                        
                        {/* Admin Routes */}
                        <Route path="/admin-login" element={<AdminLogin />} />
                        <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
                        <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
                        <Route path="/admin/jobs" element={<ProtectedRoute requireAdmin><AdminJobs /></ProtectedRoute>} />
                        <Route path="/admin/assessments" element={<ProtectedRoute requireAdmin><AssessmentManager /></ProtectedRoute>} />
                        <Route path="/admin/ai-course-builder" element={<ProtectedRoute requireAdmin><AICourseBuilder /></ProtectedRoute>} />
                        <Route path="/admin/health" element={<ProtectedRoute requireAdmin><SystemHealthDashboard /></ProtectedRoute>} />
                        
                        {/* Legal Routes */}
                        <Route path="/legal/terms" element={<TermsPage />} />
                        <Route path="/legal/privacy" element={<PrivacyPage />} />
                        <Route path="/legal/cookies" element={<CookiesPage />} />
                        
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
