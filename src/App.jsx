// src/App.jsx
// COMPLETE ERROR-FREE APP - All features active and ready

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ============================================
// CORE COMPONENTS (Always loaded)
// ============================================
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollingBanner from './components/ScrollingBanner';
import CookieConsent from './components/CookieConsent';
import ODUSBABAChat from './components/ODUSBABAChat';
import ErrorBoundary from './components/ErrorBoundary';
import FraudSafetyBanner from './components/FraudSafetyBanner';
import ScrollToTop from './components/ScrollToTop';
import NewsletterSignup from './components/NewsletterSignup';

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
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));

// Assessment Pages
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const TakeAssessment = lazy(() => import('./pages/TakeAssessment'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults'));

// Article Pages
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));

// Admin Pages
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'));
const AdminFraudReports = lazy(() => import('./pages/admin/AdminFraudReports'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'));
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor'));
const AssessmentManager = lazy(() => import('./pages/admin/AssessmentManager'));
const AssessmentEditor = lazy(() => import('./pages/admin/AssessmentEditor'));
const AICourseBuilder = lazy(() => import('./pages/admin/AICourseBuilder'));
const VirtualAssistantManager = lazy(() => import('./pages/admin/VirtualAssistantManager'));
const SystemHealthDashboard = lazy(() => import('./pages/admin/SystemHealthDashboard'));
const SecurityDashboard = lazy(() => import('./pages/admin/SecurityDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'));
const ExternalJobsManager = lazy(() => import('./pages/admin/ExternalJobsManager'));
const NewsletterAdmin = lazy(() => import('./pages/admin/NewsletterAdmin'));
const ManageBooks = lazy(() => import('./pages/admin/ManageBooks'));

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
// LOADING COMPONENT
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
// SCROLL TO TOP COMPONENT (Simplified)
// ============================================
function ScrollToTopHandler() {
    const { pathname } = useLocation();
    
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);
    
    return null;
}

// ============================================
// NOT FOUND PAGE
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
// MAIN APP CONTENT
// ============================================
function AppContent() {
    const location = useLocation();

    return (
        <>
            <ScrollToTopHandler />
            <Navbar />
            <ScrollingBanner />
            
            <main className="min-h-screen bg-slate-950">
                <Suspense fallback={<PageLoader />}>
                    <AnimatePresence mode="wait">
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
                            
                            {/* Assessment Routes */}
                            <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                            <Route path="/assessments/:id" element={<AnimatedPage><TakeAssessment /></AnimatedPage>} />
                            <Route path="/assessment-results/:id" element={<AnimatedPage><AssessmentResults /></AnimatedPage>} />
                            
                            {/* Article Routes */}
                            <Route path="/articles" element={<AnimatedPage><ArticlesPage /></AnimatedPage>} />
                            <Route path="/articles/:slug" element={<AnimatedPage><ArticleDetail /></AnimatedPage>} />
                            
                            {/* Admin Routes */}
                            <Route path="/admin-login" element={<AnimatedPage><AdminLogin /></AnimatedPage>} />
                            <Route path="/admin/dashboard" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
                            <Route path="/admin/users" element={<AnimatedPage><AdminUsers /></AnimatedPage>} />
                            <Route path="/admin/jobs" element={<AnimatedPage><AdminJobs /></AnimatedPage>} />
                            <Route path="/admin/fraud-reports" element={<AnimatedPage><AdminFraudReports /></AnimatedPage>} />
                            <Route path="/admin/articles" element={<AnimatedPage><AdminArticles /></AnimatedPage>} />
                            <Route path="/admin/articles/new" element={<AnimatedPage><ArticleEditor /></AnimatedPage>} />
                            <Route path="/admin/articles/:id" element={<AnimatedPage><ArticleEditor /></AnimatedPage>} />
                            <Route path="/admin/assessments" element={<AnimatedPage><AssessmentManager /></AnimatedPage>} />
                            <Route path="/admin/assessments/:id/edit" element={<AnimatedPage><AssessmentEditor /></AnimatedPage>} />
                            <Route path="/admin/ai-course-builder" element={<AnimatedPage><AICourseBuilder /></AnimatedPage>} />
                            <Route path="/admin/virtual-assistants" element={<AnimatedPage><VirtualAssistantManager /></AnimatedPage>} />
                            <Route path="/admin/health" element={<AnimatedPage><SystemHealthDashboard /></AnimatedPage>} />
                            <Route path="/admin/security" element={<AnimatedPage><SecurityDashboard /></AnimatedPage>} />
                            <Route path="/admin/analytics" element={<AnimatedPage><AnalyticsDashboard /></AnimatedPage>} />
                            <Route path="/admin/external-jobs" element={<AnimatedPage><ExternalJobsManager /></AnimatedPage>} />
                            <Route path="/admin/newsletter" element={<AnimatedPage><NewsletterAdmin /></AnimatedPage>} />
                            <Route path="/admin/books" element={<AnimatedPage><ManageBooks /></AnimatedPage>} />
                            
                            {/* User Dashboard Routes */}
                            <Route path="/dashboard" element={<AnimatedPage><UserDashboard /></AnimatedPage>} />
                            <Route path="/profile" element={<AnimatedPage><UserProfile /></AnimatedPage>} />
                            <Route path="/applications" element={<AnimatedPage><UserApplications /></AnimatedPage>} />
                            <Route path="/skills" element={<AnimatedPage><UserSkills /></AnimatedPage>} />
                            <Route path="/messages" element={<AnimatedPage><UserMessages /></AnimatedPage>} />
                            <Route path="/settings" element={<AnimatedPage><UserSettings /></AnimatedPage>} />
                            <Route path="/saved-jobs" element={<AnimatedPage><SavedJobsPage /></AnimatedPage>} />
                            <Route path="/job-alerts" element={<AnimatedPage><JobAlertsPage /></AnimatedPage>} />
                            <Route path="/affiliate" element={<AnimatedPage><AffiliateDashboard /></AnimatedPage>} />
                            <Route path="/learning" element={<AnimatedPage><LearnerDashboard /></AnimatedPage>} />
                            <Route path="/company-profile" element={<AnimatedPage><CompanyProfile /></AnimatedPage>} />
                            <Route path="/workforce/dashboard" element={<AnimatedPage><WorkforceDashboard /></AnimatedPage>} />
                            
                            {/* Employer Routes */}
                            <Route path="/post-job" element={<AnimatedPage><PostJob /></AnimatedPage>} />
                            <Route path="/manage-jobs" element={<AnimatedPage><ManageJobs /></AnimatedPage>} />
                            
                            {/* Tester Routes */}
                            <Route path="/tester-login" element={<AnimatedPage><TesterLoginPage /></AnimatedPage>} />
                            <Route path="/tester-register" element={<AnimatedPage><TesterRegisterPage /></AnimatedPage>} />
                            <Route path="/tester/dashboard" element={<AnimatedPage><TesterDashboard /></AnimatedPage>} />
                            
                            {/* Workforce Routes */}
                            <Route path="/workforce/setup" element={<AnimatedPage><WorkforceOnboarding /></AnimatedPage>} />
                            <Route path="/workforce/proposals" element={<AnimatedPage><ProposalsList /></AnimatedPage>} />
                            <Route path="/workforce/engagements" element={<AnimatedPage><EngagementsDashboard /></AnimatedPage>} />
                            
                            {/* Legal Routes */}
                            <Route path="/legal/terms" element={<AnimatedPage><TermsPage /></AnimatedPage>} />
                            <Route path="/legal/privacy" element={<AnimatedPage><PrivacyPage /></AnimatedPage>} />
                            <Route path="/legal/cookies" element={<AnimatedPage><CookiesPage /></AnimatedPage>} />
                            <Route path="/legal/disclaimer" element={<AnimatedPage><DisclaimerPage /></AnimatedPage>} />
                            <Route path="/legal/acceptable-use" element={<AnimatedPage><AcceptableUsePage /></AnimatedPage>} />
                            <Route path="/legal/fraud-prevention" element={<AnimatedPage><FraudPreventionPage /></AnimatedPage>} />
                            <Route path="/safety-tips" element={<AnimatedPage><SafetyTipsPage /></AnimatedPage>} />
                            <Route path="/report-fraud" element={<AnimatedPage><ReportFraudPage /></AnimatedPage>} />
                            
                            {/* Catch all */}
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </AnimatePresence>
                </Suspense>
            </main>
            
            <NewsletterSignup />
            <Footer />
            <CookieConsent />
            <ODUSBABAChat />
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
