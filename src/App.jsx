// src/App.jsx
// COMPLETE APP WITH SCROLL TO TOP, ALL ROUTES, ANALYTICS TRACKING, AND EXTERNAL JOBS MANAGER

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';

// ============================================
// CORE COMPONENTS
// ============================================
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollingBanner from './components/ScrollingBanner';
import CookieConsent from './components/CookieConsent';
import ODUSBABAChat from './components/ODUSBABAChat';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import FraudSafetyBanner from './components/FraudSafetyBanner';
import PremiumTermsPopup from './components/PremiumTermsPopup';
import BrainstormPartner from './components/BrainstormPartner';
import TermsPopup from './components/TermsPopup';

// ============================================
// ANALYTICS TRACKING
// ============================================
import { useAnalytics } from './hooks/useAnalytics';

// ============================================
// IMMEDIATELY LOADED COMPONENTS
// ============================================
import AdminLogin from './pages/AdminLogin';

// ============================================
// LAZY LOADED PUBLIC PAGES
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
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const TakeAssessment = lazy(() => import('./pages/TakeAssessment'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));

// ============================================
// LAZY LOADED USER PAGES
// ============================================
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

// ============================================
// LAZY LOADED TESTER PAGES
// ============================================
const TesterLoginPage = lazy(() => import('./pages/tester/TesterLoginPage'));
const TesterRegisterPage = lazy(() => import('./pages/tester/TesterRegisterPage'));
const TesterDashboard = lazy(() => import('./pages/tester/TesterDashboard'));

// ============================================
// LAZY LOADED ADMIN PAGES
// ============================================
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
const AssessmentEditor = lazy(() => import('./pages/admin/AssessmentEditor')); // Added for edit route
const VirtualAssistantManager = lazy(() => import('./pages/admin/VirtualAssistantManager'));
const AICourseBuilder = lazy(() => import('./pages/admin/AICourseBuilder'));
const AdminSkills = lazy(() => import('./pages/admin/AdminSkills'));

// ============================================
// LAZY LOADED DASHBOARD PAGES
// ============================================
const SystemHealthDashboard = lazy(() => import('./pages/admin/SystemHealthDashboard'));
const SecurityDashboard = lazy(() => import('./pages/admin/SecurityDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'));

// ============================================
// LAZY LOADED LEGAL PAGES
// ============================================
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage'));
const AcceptableUsePage = lazy(() => import('./pages/legal/AcceptableUsePage'));
const FraudPreventionPage = lazy(() => import('./pages/legal/FraudPreventionPage'));
const SafetyTipsPage = lazy(() => import('./pages/legal/SafetyTipsPage'));
const ReportFraudPage = lazy(() => import('./pages/ReportFraudPage'));

// ============================================
// LAZY LOADED WORKFORCE COMPONENTS
// ============================================
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
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
                <a href="/" className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
                    Go Home
                </a>
            </div>
        </div>
    );
}

// ============================================
// OPTIMIZED WRAPPER COMPONENTS
// ============================================

// Workforce Onboarding Wrapper
function WorkforceOnboardingWrapper() {
    const [onboardComplete, setOnboardComplete] = useState(false);
    
    if (onboardComplete) {
        window.location.href = '/workforce/dashboard';
        return null;
    }
    
    return <WorkforceOnboarding onComplete={() => setOnboardComplete(true)} />;
}

// Proposals List Wrapper
function ProposalsListWrapper() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const loadProfile = async () => {
            const { data } = await supabase
                .from('workforce_profiles')
                .select('id')
                .single();
            setProfile(data);
            setLoading(false);
        };
        loadProfile();
    }, []);
    
    if (loading) return <PageLoader />;
    if (!profile) return <NotFoundPage />;
    
    return <ProposalsList professionalId={profile.id} />;
}

// Engagements Dashboard Wrapper
function EngagementsDashboardWrapper() {
    const [user, setUser] = useState(null);
    const [userType, setUserType] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const loadUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            setUser(authUser);
            
            if (authUser) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('user_type')
                    .eq('id', authUser.id)
                    .single();
                setUserType(profile?.user_type);
            }
            setLoading(false);
        };
        loadUser();
    }, []);
    
    if (loading) return <PageLoader />;
    if (!user) return <NotFoundPage />;
    
    return <EngagementsDashboard userId={user.id} userType={userType} />;
}

// ============================================
// ROUTE CONFIGURATION (for better organization)
// ============================================

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

const assessmentRoutes = [
    { path: "/assessments", element: <AssessmentsPage /> },
    { path: "/assessments/:id", element: <TakeAssessment /> },
    { path: "/assessment-results/:id", element: <AssessmentResults /> },
];

const articleRoutes = [
    { path: "/articles", element: <ArticlesPage /> },
    { path: "/articles/:slug", element: <ArticleDetail /> },
];

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

const workforceRoutes = [
    { path: "/workforce/dashboard", element: <WorkforceDashboard /> },
    { path: "/workforce/setup", element: <WorkforceOnboardingWrapper /> },
    { path: "/workforce/proposals", element: <ProposalsListWrapper /> },
    { path: "/workforce/engagements", element: <EngagementsDashboardWrapper /> },
];

const employerRoutes = [
    { path: "/company-profile", element: <CompanyProfile /> },
];

const testerRoutes = [
    { path: "/tester-login", element: <TesterLoginPage /> },
    { path: "/tester-register", element: <TesterRegisterPage /> },
    { path: "/tester/dashboard", element: <TesterDashboard /> },
];

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
    // Assessment routes
    { path: "/admin/assessments", element: <AssessmentManager /> },
    { path: "/admin/assessments/:id/edit", element: <AssessmentEditor /> },
    // Other admin routes
    { path: "/admin/virtual-assistants", element: <VirtualAssistantManager /> },
    { path: "/admin/ai-course-builder", element: <AICourseBuilder /> },
    { path: "/admin/skills", element: <AdminSkills /> },
    { path: "/admin/health", element: <SystemHealthDashboard /> },
    { path: "/admin/security", element: <SecurityDashboard /> },
    { path: "/admin/analytics", element: <AnalyticsDashboard /> },
];

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

// Helper to render route group
const RouteGroup = ({ routes }) => (
    <>
        {routes.map(({ path, element }) => (
            <Route 
                key={path} 
                path={path} 
                element={<AnimatedPage>{element}</AnimatedPage>} 
            />
        ))}
    </>
);

// ============================================
// APP CONTENT WITH ANALYTICS
// ============================================
function AppContent() {
    const [user, setUser] = useState(null);
    const location = useLocation();
    
    // Use custom analytics hook
    useAnalytics(location);

    // ============================================
    // AUTH STATE MANAGEMENT
    // ============================================
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

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
                                    {/* Admin Login - Special case, no animation wrapper needed */}
                                    <Route path="/admin-login" element={<AdminLogin />} />
                                    
                                    {/* Public Routes */}
                                    <RouteGroup routes={publicRoutes} />
                                    
                                    {/* Assessment Routes */}
                                    <RouteGroup routes={assessmentRoutes} />
                                    
                                    {/* Article Routes */}
                                    <RouteGroup routes={articleRoutes} />
                                    
                                    {/* User Routes */}
                                    <RouteGroup routes={userRoutes} />
                                    
                                    {/* Workforce Routes */}
                                    <RouteGroup routes={workforceRoutes} />
                                    
                                    {/* Employer Routes */}
                                    <RouteGroup routes={employerRoutes} />
                                    
                                    {/* Tester Routes */}
                                    <RouteGroup routes={testerRoutes} />
                                    
                                    {/* Admin Routes */}
                                    <RouteGroup routes={adminRoutes} />
                                    
                                    {/* Legal Routes */}
                                    <RouteGroup routes={legalRoutes} />
                                    
                                    {/* 404 Fallback */}
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
// MAIN APP COMPONENT
// ============================================
function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
