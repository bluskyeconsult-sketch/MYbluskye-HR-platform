// src/App.jsx - UNIFIED & OPTIMIZED FOR MOBILE WITH FIXED ANIMATIONS
// ODUSBABA v13.1 - Complete Production Ready with Mobile-First Layout
// ✅ All links lead to correct pages
// ✅ All data fetches from database
// ✅ All forms submit correctly
// ✅ Authentication works
// ✅ Single API endpoint (unified)
// ✅ Mobile-optimized container structure
// ✅ Integrated FraudSafetyBanner & CookieConsent
// ✅ Assessment Results page integrated
// ✅ Admin Course Management routes added
// ✅ GovernanceProvider for capability management
// ✅ ErrorBoundary for error handling
// ✅ Workforce Marketplace & HR Tools routes added
// ✅ Container-responsive wrapper with max-w-7xl
// ✅ Optimized animations (reduced flickering on mobile)

import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

// ============================================
// SUPABASE CLIENT (Direct import for reliability)
// ============================================
import { supabase } from './lib/supabase';

// ============================================
// COMPONENT IMPORTS
// ============================================
import FraudSafetyBanner from './components/FraudSafetyBanner';
import CookieConsent from './components/CookieConsent';
import { GovernanceProvider } from './contexts/GovernanceContext';
import ErrorBoundary from './components/ErrorBoundary';
import ODUSBABAChat from './components/ODUSBABAChat';

// ============================================
// SIMPLE SCROLL TO TOP
// ============================================
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);
    return null;
}

// ============================================
// ANIMATED PAGE WRAPPER (Optimized for mobile - no flickering)
// ============================================
function AnimatedPage({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full"
        >
            {children}
        </motion.div>
    );
}

// ============================================
// NEWSLETTER SIGNUP (Fully Functional)
// ============================================
function NewsletterSignup() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email) {
            setStatus({ type: 'error', message: 'Email is required' });
            return;
        }
        
        setLoading(true);
        setStatus(null);
        
        try {
            // Using unified API
            const response = await fetch('/api/index?action=newsletter-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name })
            });
            const data = await response.json();
            
            if (data.success) {
                setStatus({ type: 'success', message: 'Successfully subscribed!' });
                setEmail('');
                setName('');
            } else {
                setStatus({ type: 'error', message: data.error || 'Subscription failed' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border-y border-slate-800 py-8 mt-8">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h3 className="text-white font-semibold mb-2">Subscribe to Newsletter</h3>
                    <p className="text-slate-400 text-sm mb-4">Get latest jobs, courses, and career tips</p>
                    <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name (optional)"
                            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                        />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Your email *"
                            required
                            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
                        >
                            {loading ? '...' : 'Subscribe'}
                        </button>
                    </form>
                    {status && (
                        <p className={`mt-3 text-sm ${status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {status.message}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// AI CHAT (Legacy - kept for backward compatibility)
// ============================================
function AIChat() {
    return <ODUSBABAChat />;
}

// ============================================
// COMPLETE NAVBAR (All Links Functional)
// ============================================
function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const [userName, setUserName] = useState('');
    
    const adminDropdownRef = useRef(null);
    const accountDropdownRef = useRef(null);
    
    const checkAuth = useCallback(async () => {
        try {
            // Using unified API for session check
            const response = await fetch('/api/index?action=session', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            
            if (data.user) {
                setIsLoggedIn(true);
                // Get profile using unified API
                const profileResponse = await fetch('/api/index?action=profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: data.user.id })
                });
                const profileData = await profileResponse.json();
                setUserName(profileData.data?.full_name || data.user.email?.split('@')[0] || 'User');
                const isAdminUser = profileData.data?.user_type === 'admin' || profileData.data?.user_type === 'super_admin';
                setIsAdmin(isAdminUser);
            } else {
                setIsLoggedIn(false);
                setIsAdmin(false);
            }
        } catch (error) {
            // Fallback to direct Supabase
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setIsLoggedIn(!!user);
                
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, user_type')
                        .eq('id', user.id)
                        .single();
                    setUserName(profile?.full_name || user.email?.split('@')[0] || 'User');
                    const isAdminUser = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
                    setIsAdmin(isAdminUser);
                }
            } catch (fallbackError) {
                console.error('Fallback auth error:', fallbackError);
                setIsLoggedIn(false);
                setIsAdmin(false);
            }
        }
    }, []);

    useEffect(() => {
        checkAuth();
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            checkAuth();
        });
        
        return () => subscription?.unsubscribe();
    }, [checkAuth]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) {
                setAdminDropdownOpen(false);
            }
            if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
                setAccountDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            // Using unified API
            await fetch('/api/index?action=logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            window.location.href = '/';
        } catch (error) {
            // Fallback to direct Supabase
            await supabase.auth.signOut();
            window.location.href = '/';
        }
    };

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Jobs', path: '/jobs' },
        { name: 'Assessments', path: '/assessments' },
        { name: 'Courses', path: '/courses' },
        { name: 'Workforce', path: '/workforce' },
        { name: 'Hire VA', path: '/hire-va' },
        { name: 'Books', path: '/books' },
        { name: 'Blog', path: '/blog' },
        { name: 'HR Tools', path: '/hr-tools' },
        { name: 'Contact', path: '/contact' },
    ];

    return (
        <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3">
                    <a href="/" className="text-white font-bold text-xl hover:text-primary-400 transition">ODUSBABA</a>

                    <div className="hidden md:flex items-center gap-5">
                        {navLinks.map(link => (
                            <a key={link.path} href={link.path} className="text-slate-300 hover:text-white transition text-sm">
                                {link.name}
                            </a>
                        ))}
                        
                        {isAdmin && (
                            <div className="relative" ref={adminDropdownRef}>
                                <button 
                                    onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                                    className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1"
                                >
                                    Admin 
                                    <svg className={`w-3 h-3 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {adminDropdownOpen && (
                                    <div className="absolute right-0 mt-2 bg-slate-800 rounded-lg shadow-lg py-2 w-56 z-50 border border-slate-700">
                                        <a href="/admin/dashboard" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Dashboard</a>
                                        <a href="/admin/users" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Users</a>
                                        <a href="/admin/jobs" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Jobs</a>
                                        <a href="/admin/courses" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Courses</a>
                                        <a href="/admin/assessments" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Assessments</a>
                                        <a href="/admin/ai-course-builder" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">AI Course Builder</a>
                                        <a href="/admin/virtual-assistants" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Virtual Assistants</a>
                                        <a href="/admin/health" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">System Health</a>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {isLoggedIn ? (
                            <div className="relative" ref={accountDropdownRef}>
                                <button 
                                    onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                                    className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
                                >
                                    👤 {userName}
                                    <svg className={`w-3 h-3 transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {accountDropdownOpen && (
                                    <div className="absolute right-0 mt-2 bg-slate-800 rounded-lg shadow-lg py-2 w-48 z-50 border border-slate-700">
                                        <a href="/dashboard" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Dashboard</a>
                                        <a href="/profile" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Profile</a>
                                        <a href="/applications" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Applications</a>
                                        <a href="/saved-jobs" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">Saved Jobs</a>
                                        <a href="/learning" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm">My Learning</a>
                                        <hr className="border-slate-700 my-1" />
                                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-700 text-sm">Logout</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <a href="/sign-in" className="text-slate-300 hover:text-white text-sm">Sign In</a>
                                <a href="/sign-up" className="bg-primary-600 px-4 py-1.5 rounded-lg text-white hover:bg-primary-700 text-sm">Sign Up</a>
                            </div>
                        )}
                    </div>

                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                        </svg>
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="md:hidden py-3 border-t border-slate-800 max-h-80 overflow-y-auto">
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
                                <a href="/admin/courses" className="block py-2 text-slate-300 hover:text-white">Courses</a>
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
// FOOTER (All Links Functional)
// ============================================
function Footer() {
    return (
        <footer className="bg-slate-900 border-t border-slate-800 py-8 mt-8">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
                    <div>
                        <h4 className="text-white font-semibold mb-3">ODUSBABA</h4>
                        <p className="text-slate-400 text-sm">AI-Powered Career Platform</p>
                        <p className="text-slate-500 text-xs mt-2">© 2024 All rights reserved</p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-3">Quick Links</h4>
                        <ul className="space-y-1">
                            <li><a href="/jobs" className="text-slate-400 text-sm hover:text-white transition">Browse Jobs</a></li>
                            <li><a href="/courses" className="text-slate-400 text-sm hover:text-white transition">Take Courses</a></li>
                            <li><a href="/assessments" className="text-slate-400 text-sm hover:text-white transition">Take Assessments</a></li>
                            <li><a href="/hire-va" className="text-slate-400 text-sm hover:text-white transition">Hire Virtual Assistant</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-3">Resources</h4>
                        <ul className="space-y-1">
                            <li><a href="/blog" className="text-slate-400 text-sm hover:text-white transition">Career Blog</a></li>
                            <li><a href="/faq" className="text-slate-400 text-sm hover:text-white transition">FAQ</a></li>
                            <li><a href="/pricing" className="text-slate-400 text-sm hover:text-white transition">Pricing Plans</a></li>
                            <li><a href="/about" className="text-slate-400 text-sm hover:text-white transition">About Us</a></li>
                            <li><a href="/contact" className="text-slate-400 text-sm hover:text-white transition">Contact Support</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-3">Legal</h4>
                        <ul className="space-y-1">
                            <li><a href="/legal/terms" className="text-slate-400 text-sm hover:text-white transition">Terms of Service</a></li>
                            <li><a href="/legal/privacy" className="text-slate-400 text-sm hover:text-white transition">Privacy Policy</a></li>
                            <li><a href="/legal/cookies" className="text-slate-400 text-sm hover:text-white transition">Cookie Policy</a></li>
                            <li><a href="/report-fraud" className="text-slate-400 text-sm hover:text-white transition">Report Fraud</a></li>
                            <li><a href="/safety-tips" className="text-slate-400 text-sm hover:text-white transition">Safety Tips</a></li>
                        </ul>
                    </div>
                </div>
                <div className="text-center pt-4 border-t border-slate-800">
                    <p className="text-slate-500 text-sm">Questions? Contact us at <a href="mailto:support@bluskyeconsult.com" className="text-primary-400 hover:underline">support@bluskyeconsult.com</a></p>
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
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-slate-400 animate-pulse">Loading...</p>
        </div>
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
                // Using unified API
                const response = await fetch('/api/index?action=session', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                
                if (!data.user) {
                    setAuthState({ loading: false, isAuthenticated: false, isAdmin: false });
                    return;
                }
                
                let isAdmin = false;
                if (requireAdmin) {
                    const profileResponse = await fetch('/api/index?action=profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: data.user.id })
                    });
                    const profileData = await profileResponse.json();
                    isAdmin = profileData.data?.user_type === 'admin' || profileData.data?.user_type === 'super_admin';
                }
                
                setAuthState({ loading: false, isAuthenticated: true, isAdmin });
            } catch (error) {
                // Fallback to direct Supabase
                try {
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
                } catch (fallbackError) {
                    setAuthState({ loading: false, isAuthenticated: false, isAdmin: false });
                }
            }
        };
        checkAuth();
    }, [requireAdmin]);
    
    if (authState.loading) return <PageLoader />;
    if (!authState.isAuthenticated) return <Navigate to={`/sign-in?redirect=${window.location.pathname}`} replace />;
    if (requireAdmin && !authState.isAdmin) return <Navigate to="/dashboard" replace />;
    
    return children;
}

// ============================================
// LAZY LOADED PAGES (All from 1st code)
// ============================================
const HomePage = lazy(() => import('./pages/HomePage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const WorkforceMarketplace = lazy(() => import('./pages/WorkforceMarketplace'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const HireVirtualAssistant = lazy(() => import('./pages/HireVirtualAssistant'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const TakeAssessment = lazy(() => import('./pages/TakeAssessment'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const UserApplications = lazy(() => import('./pages/UserApplications'));
const UserSkills = lazy(() => import('./pages/UserSkills'));
const UserMessages = lazy(() => import('./pages/UserMessages'));
const UserSettings = lazy(() => import('./pages/UserSettings'));
const SavedJobsPage = lazy(() => import('./pages/SavedJobsPage'));
const JobAlertsPage = lazy(() => import('./pages/JobAlertsPage'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));
const LearnerDashboard = lazy(() => import('./pages/LearnerDashboard'));
const CompanyProfile = lazy(() => import('./pages/CompanyProfile'));
const WorkforceDashboard = lazy(() => import('./pages/WorkforceDashboard'));
const PostJob = lazy(() => import('./pages/employer/PostJob'));
const ManageJobs = lazy(() => import('./pages/employer/ManageJobs'));
const TesterLoginPage = lazy(() => import('./pages/tester/TesterLoginPage'));
const TesterRegisterPage = lazy(() => import('./pages/tester/TesterRegisterPage'));
const TesterDashboard = lazy(() => import('./pages/tester/TesterDashboard'));
const HRToolsPage = lazy(() => import('./pages/HRToolsPage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'));
const AdminFraudReports = lazy(() => import('./pages/admin/AdminFraudReports'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'));
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor'));
const TestingModeSettings = lazy(() => import('./pages/admin/TestingModeSettings'));
const TesterVisibilitySettings = lazy(() => import('./pages/admin/TesterVisibilitySettings'));
const EmailTest = lazy(() => import('./pages/admin/EmailTest'));
const ExternalJobs = lazy(() => import('./pages/admin/ExternalJobs'));
const ExternalJobsManager = lazy(() => import('./pages/admin/ExternalJobsManager'));
const KnowledgeSourceManager = lazy(() => import('./pages/admin/KnowledgeSourceManager'));
const ManageBooks = lazy(() => import('./pages/admin/ManageBooks'));
const NewsletterAdmin = lazy(() => import('./pages/admin/NewsletterAdmin'));
const AssessmentManager = lazy(() => import('./pages/admin/AssessmentManager'));
const AssessmentEditor = lazy(() => import('./pages/admin/AssessmentEditor'));
const VirtualAssistantManager = lazy(() => import('./pages/admin/VirtualAssistantManager'));
const AICourseBuilder = lazy(() => import('./pages/admin/AICourseBuilder'));
const AdminSkills = lazy(() => import('./pages/admin/AdminSkills'));
const SystemHealthDashboard = lazy(() => import('./pages/admin/SystemHealthDashboard'));
const SecurityDashboard = lazy(() => import('./pages/admin/SecurityDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'));
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const CourseEditor = lazy(() => import('./pages/admin/CourseEditor'));
const WorkforceOnboarding = lazy(() => import('./components/workforce/WorkforceOnboarding'));
const ProposalsList = lazy(() => import('./components/workforce/ProposalsList'));
const EngagementsDashboard = lazy(() => import('./components/workforce/EngagementsDashboard'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage'));
const AcceptableUsePage = lazy(() => import('./pages/legal/AcceptableUsePage'));
const FraudPreventionPage = lazy(() => import('./pages/legal/FraudPreventionPage'));
const SafetyTipsPage = lazy(() => import('./pages/legal/SafetyTipsPage'));
const ReportFraudPage = lazy(() => import('./pages/ReportFraudPage'));

// 404 Page
const NotFoundPage = () => (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">404</h1>
            <p className="text-xl text-slate-400 mb-4">Page Not Found</p>
            <p className="text-slate-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
            <a href="/" className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
                Go Home
            </a>
        </div>
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
            <FraudSafetyBanner />
            
            {/* ✅ Mobile-optimized main container */}
            <main className="min-h-screen bg-slate-950 overflow-x-hidden">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Suspense fallback={<PageLoader />}>
                        {/* ✅ Removed AnimatePresence to prevent flickering (From Code 2) */}
                        <Routes location={location} key={location.pathname}>
                            {/* Public Routes */}
                            <Route path="/" element={<AnimatedPage><HomePage /></AnimatedPage>} />
                            <Route path="/jobs" element={<AnimatedPage><JobsPage /></AnimatedPage>} />
                            <Route path="/workforce" element={<AnimatedPage><WorkforceMarketplace /></AnimatedPage>} />
                            <Route path="/courses" element={<AnimatedPage><CoursesPage /></AnimatedPage>} />
                            <Route path="/books" element={<AnimatedPage><BooksPage /></AnimatedPage>} />
                            <Route path="/newsletter" element={<AnimatedPage><NewsletterPage /></AnimatedPage>} />
                            <Route path="/hire-va" element={<AnimatedPage><HireVirtualAssistant /></AnimatedPage>} />
                            <Route path="/about" element={<AnimatedPage><AboutPage /></AnimatedPage>} />
                            <Route path="/contact" element={<AnimatedPage><ContactPage /></AnimatedPage>} />
                            <Route path="/pricing" element={<AnimatedPage><PricingPage /></AnimatedPage>} />
                            <Route path="/sign-in" element={<AnimatedPage><SignInPage /></AnimatedPage>} />
                            <Route path="/sign-up" element={<AnimatedPage><SignUpPage /></AnimatedPage>} />
                            <Route path="/products" element={<AnimatedPage><ProductsPage /></AnimatedPage>} />
                            <Route path="/faq" element={<AnimatedPage><FAQPage /></AnimatedPage>} />
                            <Route path="/blog" element={<AnimatedPage><BlogPage /></AnimatedPage>} />
                            <Route path="/hr-tools" element={<AnimatedPage><HRToolsPage /></AnimatedPage>} />
                            
                            {/* Assessment Routes */}
                            <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                            <Route path="/assessments/:id" element={<AnimatedPage><TakeAssessment /></AnimatedPage>} />
                            <Route path="/assessment-results/:id" element={<AnimatedPage><AssessmentResults /></AnimatedPage>} />
                            
                            {/* Article Routes */}
                            <Route path="/articles" element={<AnimatedPage><ArticlesPage /></AnimatedPage>} />
                            <Route path="/articles/:slug" element={<AnimatedPage><ArticleDetail /></AnimatedPage>} />
                            
                            {/* Admin Login */}
                            <Route path="/admin-login" element={<AdminLogin />} />
                            
                            {/* Admin Routes - Protected */}
                            <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
                            <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
                            <Route path="/admin/jobs" element={<ProtectedRoute requireAdmin><AdminJobs /></ProtectedRoute>} />
                            <Route path="/admin/courses" element={<ProtectedRoute requireAdmin><AdminCourses /></ProtectedRoute>} />
                            <Route path="/admin/courses/new" element={<ProtectedRoute requireAdmin><CourseEditor /></ProtectedRoute>} />
                            <Route path="/admin/courses/:id/edit" element={<ProtectedRoute requireAdmin><CourseEditor /></ProtectedRoute>} />
                            <Route path="/admin/fraud-reports" element={<ProtectedRoute requireAdmin><AdminFraudReports /></ProtectedRoute>} />
                            <Route path="/admin/articles" element={<ProtectedRoute requireAdmin><AdminArticles /></ProtectedRoute>} />
                            <Route path="/admin/articles/new" element={<ProtectedRoute requireAdmin><ArticleEditor /></ProtectedRoute>} />
                            <Route path="/admin/articles/:id" element={<ProtectedRoute requireAdmin><ArticleEditor /></ProtectedRoute>} />
                            <Route path="/admin/testing-mode" element={<ProtectedRoute requireAdmin><TestingModeSettings /></ProtectedRoute>} />
                            <Route path="/admin/settings/tester-visibility" element={<ProtectedRoute requireAdmin><TesterVisibilitySettings /></ProtectedRoute>} />
                            <Route path="/admin/email-test" element={<ProtectedRoute requireAdmin><EmailTest /></ProtectedRoute>} />
                            <Route path="/admin/external-jobs" element={<ProtectedRoute requireAdmin><ExternalJobs /></ProtectedRoute>} />
                            <Route path="/admin/external-jobs-manager" element={<ProtectedRoute requireAdmin><ExternalJobsManager /></ProtectedRoute>} />
                            <Route path="/admin/knowledge-sources" element={<ProtectedRoute requireAdmin><KnowledgeSourceManager /></ProtectedRoute>} />
                            <Route path="/admin/books" element={<ProtectedRoute requireAdmin><ManageBooks /></ProtectedRoute>} />
                            <Route path="/admin/newsletter" element={<ProtectedRoute requireAdmin><NewsletterAdmin /></ProtectedRoute>} />
                            <Route path="/admin/assessments" element={<ProtectedRoute requireAdmin><AssessmentManager /></ProtectedRoute>} />
                            <Route path="/admin/assessments/:id/edit" element={<ProtectedRoute requireAdmin><AssessmentEditor /></ProtectedRoute>} />
                            <Route path="/admin/virtual-assistants" element={<ProtectedRoute requireAdmin><VirtualAssistantManager /></ProtectedRoute>} />
                            <Route path="/admin/ai-course-builder" element={<ProtectedRoute requireAdmin><AICourseBuilder /></ProtectedRoute>} />
                            <Route path="/admin/skills" element={<ProtectedRoute requireAdmin><AdminSkills /></ProtectedRoute>} />
                            <Route path="/admin/health" element={<ProtectedRoute requireAdmin><SystemHealthDashboard /></ProtectedRoute>} />
                            <Route path="/admin/security" element={<ProtectedRoute requireAdmin><SecurityDashboard /></ProtectedRoute>} />
                            <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><AnalyticsDashboard /></ProtectedRoute>} />
                            
                            {/* User Routes - Protected */}
                            <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                            <Route path="/applications" element={<ProtectedRoute><UserApplications /></ProtectedRoute>} />
                            <Route path="/skills" element={<ProtectedRoute><UserSkills /></ProtectedRoute>} />
                            <Route path="/messages" element={<ProtectedRoute><UserMessages /></ProtectedRoute>} />
                            <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
                            <Route path="/saved-jobs" element={<ProtectedRoute><SavedJobsPage /></ProtectedRoute>} />
                            <Route path="/job-alerts" element={<ProtectedRoute><JobAlertsPage /></ProtectedRoute>} />
                            <Route path="/affiliate" element={<ProtectedRoute><AffiliateDashboard /></ProtectedRoute>} />
                            <Route path="/learning" element={<ProtectedRoute><LearnerDashboard /></ProtectedRoute>} />
                            <Route path="/company-profile" element={<ProtectedRoute><CompanyProfile /></ProtectedRoute>} />
                            <Route path="/workforce/dashboard" element={<ProtectedRoute><WorkforceDashboard /></ProtectedRoute>} />
                            
                            {/* Employer Routes - Protected */}
                            <Route path="/post-job" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
                            <Route path="/manage-jobs" element={<ProtectedRoute><ManageJobs /></ProtectedRoute>} />
                            
                            {/* Tester Routes */}
                            <Route path="/tester-login" element={<TesterLoginPage />} />
                            <Route path="/tester-register" element={<TesterRegisterPage />} />
                            <Route path="/tester/dashboard" element={<ProtectedRoute><TesterDashboard /></ProtectedRoute>} />
                            
                            {/* Workforce Routes */}
                            <Route path="/workforce/setup" element={<WorkforceOnboarding />} />
                            <Route path="/workforce/proposals" element={<ProposalsList />} />
                            <Route path="/workforce/engagements" element={<EngagementsDashboard />} />
                            
                            {/* Legal Routes */}
                            <Route path="/legal/terms" element={<TermsPage />} />
                            <Route path="/legal/privacy" element={<PrivacyPage />} />
                            <Route path="/legal/cookies" element={<CookiesPage />} />
                            <Route path="/legal/disclaimer" element={<DisclaimerPage />} />
                            <Route path="/legal/acceptable-use" element={<AcceptableUsePage />} />
                            <Route path="/legal/fraud-prevention" element={<FraudPreventionPage />} />
                            <Route path="/safety-tips" element={<SafetyTipsPage />} />
                            <Route path="/report-fraud" element={<ReportFraudPage />} />
                            
                            {/* 404 */}
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </Suspense>
                </div>
            </main>
            
            <NewsletterSignup />
            <ODUSBABAChat />
            <CookieConsent />
            <Footer />
        </>
    );
}

// ============================================
// MAIN APP (Wrapped with ErrorBoundary & GovernanceProvider)
// ============================================
function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <GovernanceProvider>
                    <AppContent />
                </GovernanceProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
