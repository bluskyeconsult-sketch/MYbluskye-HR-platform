// src/App.jsx
// OPTIMIZED FOR www.bluskyeconsult.com - With lazy loading, animations, and mount protection

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ============================================
// CORE COMPONENTS (Always needed - no lazy loading)
// ============================================
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollingBanner from './components/ScrollingBanner';
import CookieConsent from './components/CookieConsent';
import ODUSBABAChat from './components/ODUSBABAChat';
import ErrorBoundary from './components/ErrorBoundary';
import FraudSafetyBanner from './components/FraudSafetyBanner';
import ScrollToTop from './components/ScrollToTop';
import PremiumTermsPopup from './components/PremiumTermsPopup';
import BrainstormPartner from './components/BrainstormPartner';
import TermsPopup from './components/TermsPopup';

// ============================================
// LAZY LOADED PAGES (Code splitting)
// ============================================

// Public Pages
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
const BlogPage = lazy(() => import('./pages/BlogPage'));

// Auth Pages
const AdminLogin = lazy(() => import('./pages/AdminLogin'));

// User Dashboard Pages
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

// Employer Pages
const PostJob = lazy(() => import('./pages/employer/PostJob'));
const ManageJobs = lazy(() => import('./pages/employer/ManageJobs'));

// Tester Pages
const TesterLoginPage = lazy(() => import('./pages/tester/TesterLoginPage'));
const TesterRegisterPage = lazy(() => import('./pages/tester/TesterRegisterPage'));
const TesterDashboard = lazy(() => import('./pages/tester/TesterDashboard'));

// Admin Pages
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

// Dashboard Pages
const SystemHealthDashboard = lazy(() => import('./pages/admin/SystemHealthDashboard'));
const SecurityDashboard = lazy(() => import('./pages/admin/SecurityDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'));

// Legal Pages
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage'));
const AcceptableUsePage = lazy(() => import('./pages/legal/AcceptableUsePage'));
const FraudPreventionPage = lazy(() => import('./pages/legal/FraudPreventionPage'));
const SafetyTipsPage = lazy(() => import('./pages/legal/SafetyTipsPage'));
const ReportFraudPage = lazy(() => import('./pages/ReportFraudPage'));

// Workforce Components
const WorkforceOnboarding = lazy(() => import('./components/workforce/WorkforceOnboarding'));
const ProposalsList = lazy(() => import('./components/workforce/ProposalsList'));
const EngagementsDashboard = lazy(() => import('./components/workforce/EngagementsDashboard'));

// ============================================
// LOADING FALLBACK COMPONENT
// ============================================
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading...</p>
        </div>
    </div>
);

// ============================================
// ANIMATED PAGE WRAPPER
// ============================================
const AnimatedPage = ({ children }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
        {children}
    </motion.div>
);

// ============================================
// 404 NOT FOUND PAGE
// ============================================
const NotFoundPage = () => (
    <AnimatedPage>
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
    </AnimatedPage>
);

// ============================================
// ROUTE CONFIGURATION (Centralized for maintainability)
// ============================================
const routeGroups = {
    public: [
        { path: '/', element: <HomePage /> },
        { path: '/jobs', element: <JobsPage /> },
        { path: '/workforce', element: <WorkforceMarketplace /> },
        { path: '/courses', element: <CoursesPage /> },
        { path: '/books', element: <BooksPage /> },
        { path: '/newsletter', element: <NewsletterPage /> },
        { path: '/hire-va', element: <HireVirtualAssistant /> },
        { path: '/about', element: <AboutPage /> },
        { path: '/contact', element: <ContactPage /> },
        { path: '/pricing', element: <PricingPage /> },
        { path: '/sign-in', element: <SignInPage /> },
        { path: '/sign-up', element: <SignUpPage /> },
        { path: '/products', element: <ProductsPage /> },
        { path: '/faq', element: <FAQPage /> },
        { path: '/blog', element: <BlogPage /> }
    ],
    assessments: [
        { path: '/assessments', element: <AssessmentsPage /> },
        { path: '/assessments/:id', element: <TakeAssessment /> },
        { path: '/assessment-results/:id', element: <AssessmentResults /> }
    ],
    articles: [
        { path: '/articles', element: <ArticlesPage /> },
        { path: '/articles/:slug', element: <ArticleDetail /> }
    ],
    auth: [
        { path: '/admin-login', element: <AdminLogin /> }
    ],
    user: [
        { path: '/dashboard', element: <UserDashboard /> },
        { path: '/profile', element: <UserProfile /> },
        { path: '/applications', element: <UserApplications /> },
        { path: '/skills', element: <UserSkills /> },
        { path: '/messages', element: <UserMessages /> },
        { path: '/settings', element: <UserSettings /> },
        { path: '/saved-jobs', element: <SavedJobsPage /> },
        { path: '/job-alerts', element: <JobAlertsPage /> },
        { path: '/affiliate', element: <AffiliateDashboard /> },
        { path: '/learning', element: <LearnerDashboard /> },
        { path: '/company-profile', element: <CompanyProfile /> },
        { path: '/workforce/dashboard', element: <WorkforceDashboard /> }
    ],
    employer: [
        { path: '/post-job', element: <PostJob /> },
        { path: '/manage-jobs', element: <ManageJobs /> }
    ],
    tester: [
        { path: '/tester-login', element: <TesterLoginPage /> },
        { path: '/tester-register', element: <TesterRegisterPage /> },
        { path: '/tester/dashboard', element: <TesterDashboard /> }
    ],
    admin: [
        { path: '/admin/dashboard', element: <AdminDashboard /> },
        { path: '/admin/users', element: <AdminUsers /> },
        { path: '/admin/jobs', element: <AdminJobs /> },
        { path: '/admin/fraud-reports', element: <AdminFraudReports /> },
        { path: '/admin/articles', element: <AdminArticles /> },
        { path: '/admin/articles/new', element: <ArticleEditor /> },
        { path: '/admin/articles/:id', element: <ArticleEditor /> },
        { path: '/admin/testing-mode', element: <TestingModeSettings /> },
        { path: '/admin/settings/tester-visibility', element: <TesterVisibilitySettings /> },
        { path: '/admin/email-test', element: <EmailTest /> },
        { path: '/admin/external-jobs', element: <ExternalJobs /> },
        { path: '/admin/external-jobs-manager', element: <ExternalJobsManager /> },
        { path: '/admin/knowledge-sources', element: <KnowledgeSourceManager /> },
        { path: '/admin/books', element: <ManageBooks /> },
        { path: '/admin/newsletter', element: <NewsletterAdmin /> },
        { path: '/admin/assessments', element: <AssessmentManager /> },
        { path: '/admin/assessments/:id/edit', element: <AssessmentEditor /> },
        { path: '/admin/virtual-assistants', element: <VirtualAssistantManager /> },
        { path: '/admin/ai-course-builder', element: <AICourseBuilder /> },
        { path: '/admin/skills', element: <AdminSkills /> },
        { path: '/admin/health', element: <SystemHealthDashboard /> },
        { path: '/admin/security', element: <SecurityDashboard /> },
        { path: '/admin/analytics', element: <AnalyticsDashboard /> }
    ],
    workforce: [
        { path: '/workforce/setup', element: <WorkforceOnboarding /> },
        { path: '/workforce/proposals', element: <ProposalsList /> },
        { path: '/workforce/engagements', element: <EngagementsDashboard /> }
    ],
    legal: [
        { path: '/legal/terms', element: <TermsPage /> },
        { path: '/legal/privacy', element: <PrivacyPage /> },
        { path: '/legal/cookies', element: <CookiesPage /> },
        { path: '/legal/disclaimer', element: <DisclaimerPage /> },
        { path: '/legal/acceptable-use', element: <AcceptableUsePage /> },
        { path: '/legal/fraud-prevention', element: <FraudPreventionPage /> },
        { path: '/safety-tips', element: <SafetyTipsPage /> },
        { path: '/report-fraud', element: <ReportFraudPage /> }
    ]
};

// ============================================
// MAIN APP CONTENT
// ============================================
function AppContent() {
    const location = useLocation();
    const mountCount = useRef(0);
    
    useEffect(() => {
        mountCount.current++;
        // Only log in development
        if (import.meta.env.DEV) {
            console.log(`✅ App mounted (mount #${mountCount.current}) - www.bluskyeconsult.com`);
        }
        
        return () => {
            if (import.meta.env.DEV) {
                console.log(`🔄 App unmounting (was mounted ${mountCount.current} times)`);
            }
        };
    }, []);

    // Helper to render route group
    const renderRouteGroup = (routes) => 
        routes.map(({ path, element }) => (
            <Route 
                key={path} 
                path={path} 
                element={<AnimatedPage>{element}</AnimatedPage>} 
            />
        ));

    return (
        <>
            <ScrollToTop />
            <Navbar />
            <ScrollingBanner />
            
            <main className="min-h-screen bg-slate-950">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <Suspense fallback={<PageLoader />}>
                            <AnimatePresence mode="wait">
                                <Routes location={location} key={location.pathname}>
                                    {/* Render all route groups */}
                                    {renderRouteGroup(routeGroups.public)}
                                    {renderRouteGroup(routeGroups.assessments)}
                                    {renderRouteGroup(routeGroups.articles)}
                                    {renderRouteGroup(routeGroups.auth)}
                                    {renderRouteGroup(routeGroups.user)}
                                    {renderRouteGroup(routeGroups.employer)}
                                    {renderRouteGroup(routeGroups.tester)}
                                    {renderRouteGroup(routeGroups.admin)}
                                    {renderRouteGroup(routeGroups.workforce)}
                                    {renderRouteGroup(routeGroups.legal)}
                                    
                                    {/* 404 Fallback */}
                                    <Route path="*" element={<NotFoundPage />} />
                                </Routes>
                            </AnimatePresence>
                        </Suspense>
                    </div>
                </div>
            </main>
            
            <Footer />
            <PremiumTermsPopup />
            <CookieConsent />
            <ODUSBABAChat />
            <BrainstormPartner />
            <TermsPopup />
            <FraudSafetyBanner />
        </>
    );
}

// ============================================
// MAIN APP COMPONENT
// ============================================
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
