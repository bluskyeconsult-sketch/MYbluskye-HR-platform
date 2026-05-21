// src/App.jsx
// COMPLETE OPTIMIZED APP - All functionality restored

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CORE COMPONENTS (Always loaded)
// ============================================
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import CookieConsent from './components/CookieConsent';
import ODUSBABAChat from './components/ODUSBABAChat';
import FraudSafetyBanner from './components/FraudSafetyBanner';
import PremiumTermsPopup from './components/PremiumTermsPopup';
import BrainstormPartner from './components/BrainstormPartner';
import TermsPopup from './components/TermsPopup';
import ScrollingBanner from './components/ScrollingBanner';

// ============================================
// IMMEDIATELY LOADED PAGES (Critical)
// ============================================
import AdminLogin from './pages/AdminLogin';
import HomePage from './pages/HomePage';
import JobsPage from './pages/JobsPage';
import WorkforceMarketplace from './pages/WorkforceMarketplace';
import CoursesPage from './pages/CoursesPage';
import BooksPage from './pages/BooksPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

// ============================================
// LAZY LOADED PAGES (Performance optimized)
// ============================================
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const HireVirtualAssistant = lazy(() => import('./pages/HireVirtualAssistant'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const TakeAssessment = lazy(() => import('./pages/TakeAssessment'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));

// User pages
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

// Tester pages
const TesterLoginPage = lazy(() => import('./pages/tester/TesterLoginPage'));
const TesterRegisterPage = lazy(() => import('./pages/tester/TesterRegisterPage'));
const TesterDashboard = lazy(() => import('./pages/tester/TesterDashboard'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'));
const AdminFraudReports = lazy(() => import('./pages/admin/AdminFraudReports'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'));
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor'));
const TestingModeSettings = lazy(() => import('./pages/admin/TestingModeSettings'));
const TesterVisibilitySettings = lazy(() => import('./pages/admin/TesterVisibilitySettings'));
const EmailTest = lazy(() => import('./pages/admin/EmailTest'));
const ExternalJobs = lazy(() => import('./pages/admin/AdminExternalJobs'));
const ExternalJobsManager = lazy(() => import('./pages/admin/ExternalJobsManager'));
const KnowledgeSourceManager = lazy(() => import('./pages/admin/KnowledgeSourceManager'));
const ManageBooks = lazy(() => import('./pages/admin/ManageBooks'));
const NewsletterAdmin = lazy(() => import('./pages/admin/NewsletterAdmin'));
const AssessmentManager = lazy(() => import('./pages/admin/AssessmentManager'));
const AssessmentEditor = lazy(() => import('./pages/admin/AssessmentEditor'));
const VirtualAssistantManager = lazy(() => import('./pages/admin/VirtualAssistantManager'));
const AICourseBuilder = lazy(() => import('./pages/admin/AICourseBuilder'));
const AdminSkills = lazy(() => import('./pages/admin/AdminSkills'));

// Dashboard pages
const SystemHealthDashboard = lazy(() => import('./pages/admin/SystemHealthDashboard'));
const SecurityDashboard = lazy(() => import('./pages/admin/SecurityDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'));

// Legal pages
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage'));
const AcceptableUsePage = lazy(() => import('./pages/legal/AcceptableUsePage'));
const FraudPreventionPage = lazy(() => import('./pages/legal/FraudPreventionPage'));
const SafetyTipsPage = lazy(() => import('./pages/legal/SafetyTipsPage'));
const ReportFraudPage = lazy(() => import('./pages/ReportFraudPage'));

// Workforce components
const WorkforceOnboarding = lazy(() => import('./components/workforce/WorkforceOnboarding'));
const ProposalsList = lazy(() => import('./components/workforce/ProposalsList'));
const EngagementsDashboard = lazy(() => import('./components/workforce/EngagementsDashboard'));

// ============================================
// SUPABASE CLIENT
// ============================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// LOADING FALLBACK
// ============================================
function PageLoader() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Loading...</p>
            </div>
        </div>
    );
}

// ============================================
// ANIMATION WRAPPER
// ============================================
function AnimatedPage({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// 404 PAGE
// ============================================
function NotFoundPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                <p className="text-xl text-slate-400 mb-4">Page Not Found</p>
                <p className="text-slate-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
                <a href="/" className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Go Home
                </a>
            </div>
        </div>
    );
}

// ============================================
// WRAPPER COMPONENTS
// ============================================
function WorkforceOnboardingWrapper() {
    const [onboardComplete, setOnboardComplete] = useState(false);
    if (onboardComplete) {
        window.location.href = '/workforce/dashboard';
        return null;
    }
    return <WorkforceOnboarding onComplete={() => setOnboardComplete(true)} />;
}

function ProposalsListWrapper() {
    const [profile, setProfile] = useState(null);
    useEffect(() => {
        supabase.from('workforce_profiles').select('id').single().then(({ data }) => setProfile(data));
    }, []);
    if (!profile) return <PageLoader />;
    return <ProposalsList professionalId={profile.id} />;
}

function EngagementsDashboardWrapper() {
    const [user, setUser] = useState(null);
    const [userType, setUserType] = useState(null);
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
            if (data.user) {
                supabase.from('profiles').select('user_type').eq('id', data.user.id).single().then(({ data: p }) => setUserType(p?.user_type));
            }
        });
    }, []);
    if (!user) return <PageLoader />;
    return <EngagementsDashboard userId={user.id} userType={userType} />;
}

// ============================================
// ROUTE GROUPS (Clean organization)
// ============================================
const RouteGroup = ({ routes }) => (
    <>
        {routes.map(({ path, element }) => (
            <Route key={path} path={path} element={<AnimatedPage>{element}</AnimatedPage>} />
        ))}
    </>
);

// Public routes
const publicRoutes = [
    { path: "/", element: <HomePage /> },
    { path: "/jobs", element: <JobsPage /> },
    { path: "/workforce", element: <WorkforceMarketplace /> },
    { path: "/courses", element: <CoursesPage /> },
    { path: "/books", element: <BooksPage /> },
    { path: "/newsletter", element: <NewsletterPage /> },
    { path: "/hire-va", element: <HireVirtualAssistant /> },
    { path: "/about", element: <AboutPage /> },
    { path: "/contact", element: <ContactPage /> },
    { path: "/pricing", element: <PricingPage /> },
    { path: "/sign-in", element: <SignInPage /> },
    { path: "/sign-up", element: <SignUpPage /> },
    { path: "/products", element: <ProductsPage /> },
    { path: "/faq", element: <FAQPage /> },
];

// Assessment routes
const assessmentRoutes = [
    { path: "/assessments", element: <AssessmentsPage /> },
    { path: "/assessments/:id", element: <TakeAssessment /> },
    { path: "/assessment-results/:id", element: <AssessmentResults /> },
];

// Article routes
const articleRoutes = [
    { path: "/articles", element: <ArticlesPage /> },
    { path: "/articles/:slug", element: <ArticleDetail /> },
];

// User routes
const userRoutes = [
    { path: "/dashboard", element: <UserDashboard /> },
    { path: "/profile", element: <UserProfile /> },
    { path: "/applications", element: <UserApplications /> },
    { path: "/skills", element: <UserSkills /> },
    { path: "/messages", element: <UserMessages /> },
    { path: "/settings", element: <UserSettings /> },
    { path: "/saved-jobs", element: <SavedJobsPage /> },
    { path: "/job-alerts", element: <JobAlertsPage /> },
    { path: "/affiliate", element: <AffiliateDashboard /> },
    { path: "/learning", element: <LearnerDashboard /> },
];

// Workforce routes
const workforceRoutes = [
    { path: "/workforce/dashboard", element: <WorkforceDashboard /> },
    { path: "/workforce/setup", element: <WorkforceOnboardingWrapper /> },
    { path: "/workforce/proposals", element: <ProposalsListWrapper /> },
    { path: "/workforce/engagements", element: <EngagementsDashboardWrapper /> },
];

// Employer routes
const employerRoutes = [
    { path: "/company-profile", element: <CompanyProfile /> },
];

// Tester routes
const testerRoutes = [
    { path: "/tester-login", element: <TesterLoginPage /> },
    { path: "/tester-register", element: <TesterRegisterPage /> },
    { path: "/tester/dashboard", element: <TesterDashboard /> },
];

// Admin routes
const adminRoutes = [
    { path: "/admin/dashboard", element: <AdminDashboard /> },
    { path: "/admin/users", element: <AdminUsers /> },
    { path: "/admin/jobs", element: <AdminJobs /> },
    { path: "/admin/fraud-reports", element: <AdminFraudReports /> },
    { path: "/admin/articles", element: <AdminArticles /> },
    { path: "/admin/articles/new", element: <ArticleEditor /> },
    { path: "/admin/articles/:id", element: <ArticleEditor /> },
    { path: "/admin/testing-mode", element: <TestingModeSettings /> },
    { path: "/admin/settings/tester-visibility", element: <TesterVisibilitySettings /> },
    { path: "/admin/email-test", element: <EmailTest /> },
    { path: "/admin/external-jobs", element: <ExternalJobs /> },
    { path: "/admin/external-jobs-manager", element: <ExternalJobsManager /> },
    { path: "/admin/knowledge-sources", element: <KnowledgeSourceManager /> },
    { path: "/admin/books", element: <ManageBooks /> },
    { path: "/admin/newsletter", element: <NewsletterAdmin /> },
    { path: "/admin/assessments", element: <AssessmentManager /> },
    { path: "/admin/assessments/:id/edit", element: <AssessmentEditor /> },
    { path: "/admin/virtual-assistants", element: <VirtualAssistantManager /> },
    { path: "/admin/ai-course-builder", element: <AICourseBuilder /> },
    { path: "/admin/skills", element: <AdminSkills /> },
    { path: "/admin/health", element: <SystemHealthDashboard /> },
    { path: "/admin/security", element: <SecurityDashboard /> },
    { path: "/admin/analytics", element: <AnalyticsDashboard /> },
];

// Legal routes
const legalRoutes = [
    { path: "/legal/terms", element: <TermsPage /> },
    { path: "/legal/privacy", element: <PrivacyPage /> },
    { path: "/legal/cookies", element: <CookiesPage /> },
    { path: "/legal/disclaimer", element: <DisclaimerPage /> },
    { path: "/legal/acceptable-use", element: <AcceptableUsePage /> },
    { path: "/legal/fraud-prevention", element: <FraudPreventionPage /> },
    { path: "/safety-tips", element: <SafetyTipsPage /> },
    { path: "/report-fraud", element: <ReportFraudPage /> },
];

// ============================================
// APP CONTENT
// ============================================
function AppContent() {
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Track page views
    useEffect(() => {
        console.log('📍 Page:', location.pathname);
    }, [location]);

    return (
        <ErrorBoundary>
            <ScrollToTop />
            <Navbar />
            <ScrollingBanner />
            <main className="min-h-screen bg-slate-950">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <Suspense fallback={<PageLoader />}>
                            <AnimatePresence mode="wait">
                                <Routes location={location} key={location.pathname}>
                                    {/* Critical route - no animation wrapper for login */}
                                    <Route path="/admin-login" element={<AdminLogin />} />
                                    
                                    {/* Route groups */}
                                    <RouteGroup routes={publicRoutes} />
                                    <RouteGroup routes={assessmentRoutes} />
                                    <RouteGroup routes={articleRoutes} />
                                    <RouteGroup routes={userRoutes} />
                                    <RouteGroup routes={workforceRoutes} />
                                    <RouteGroup routes={employerRoutes} />
                                    <RouteGroup routes={testerRoutes} />
                                    <RouteGroup routes={adminRoutes} />
                                    <RouteGroup routes={legalRoutes} />
                                    
                                    {/* 404 fallback */}
                                    <Route path="*" element={<NotFoundPage />} />
                                </Routes>
                            </AnimatePresence>
                        </Suspense>
                    </div>
                </div>
            </main>
            <Footer />
            <PremiumTermsPopup userId={user?.id} />
            <CookieConsent />
            <ODUSBABAChat />
            <BrainstormPartner />
            <TermsPopup />
            <FraudSafetyBanner />
        </ErrorBoundary>
    );
}

// ============================================
// APP EXPORT
// ============================================
export default function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}
