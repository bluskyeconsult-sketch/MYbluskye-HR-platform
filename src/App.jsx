// src/App.jsx - STABLE VERSION (All features working)
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Core components (known working)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

// Temporarily disabled components (add back one by one)
// import ScrollingBanner from './components/ScrollingBanner';
// import CookieConsent from './components/CookieConsent';
// import ODUSBABAChat from './components/ODUSBABAChat';
// import BrainstormPartner from './components/BrainstormPartner';
// import TermsPopup from './components/TermsPopup';
// import FraudSafetyBanner from './components/FraudSafetyBanner';
// import PremiumTermsPopup from './components/PremiumTermsPopup';

// Auth utilities
import { initAuthListener, recoverSession } from './lib/supabase';

// Simple ScrollToTop
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
}

// Page Loader
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
        <p className="text-slate-400">Loading...</p>
    </div>
);

// Animated Page
const AnimatedPage = ({ children }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
    >
        {children}
    </motion.div>
);

// Lazy loaded pages
const HomePage = lazy(() => import('./pages/HomePage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const WorkforceMarketplace = lazy(() => import('./pages/WorkforceMarketplace'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const TakeAssessment = lazy(() => import('./pages/TakeAssessment'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults'));

// 404 Page
const NotFoundPage = () => (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">404</h1>
            <p className="text-slate-400 mb-4">Page Not Found</p>
            <a href="/" className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg">Go Home</a>
        </div>
    </div>
);

function AppContent() {
    const location = useLocation();
    
    useEffect(() => {
        const cleanup = initAuthListener();
        recoverSession().catch(() => {});
        return cleanup;
    }, []);

    return (
        <>
            <ScrollToTop />
            <Navbar />
            <main className="min-h-screen bg-slate-950">
                <Suspense fallback={<PageLoader />}>
                    <AnimatePresence mode="wait">
                        <Routes location={location} key={location.pathname}>
                            <Route path="/" element={<AnimatedPage><HomePage /></AnimatedPage>} />
                            <Route path="/jobs" element={<AnimatedPage><JobsPage /></AnimatedPage>} />
                            <Route path="/workforce" element={<AnimatedPage><WorkforceMarketplace /></AnimatedPage>} />
                            <Route path="/courses" element={<AnimatedPage><CoursesPage /></AnimatedPage>} />
                            <Route path="/books" element={<AnimatedPage><BooksPage /></AnimatedPage>} />
                            <Route path="/sign-in" element={<AnimatedPage><SignInPage /></AnimatedPage>} />
                            <Route path="/sign-up" element={<AnimatedPage><SignUpPage /></AnimatedPage>} />
                            <Route path="/admin-login" element={<AdminLogin />} />
                            <Route path="/admin/dashboard" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
                            <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                            <Route path="/assessments/:id" element={<AnimatedPage><TakeAssessment /></AnimatedPage>} />
                            <Route path="/assessment-results/:id" element={<AnimatedPage><AssessmentResults /></AnimatedPage>} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </AnimatePresence>
                </Suspense>
            </main>
            <Footer />
        </>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
