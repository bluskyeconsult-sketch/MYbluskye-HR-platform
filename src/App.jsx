// src/App.jsx
// OPTIMIZED WORKING VERSION - With ErrorBoundary, ScrollToTop, and Animations

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
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
import FraudSafetyBanner from './components/FraudSafetyBanner';
import ScrollToTop from './components/ScrollToTop';
import PremiumTermsPopup from './components/PremiumTermsPopup';
import BrainstormPartner from './components/BrainstormPartner';
import TermsPopup from './components/TermsPopup';

// ============================================
// PUBLIC PAGES
// ============================================
import HomePage from './pages/HomePage';
import JobsPage from './pages/JobsPage';
import WorkforceMarketplace from './pages/WorkforceMarketplace';
import CoursesPage from './pages/CoursesPage';
import BooksPage from './pages/BooksPage';
import NewsletterPage from './pages/NewsletterPage';
import HireVirtualAssistant from './pages/HireVirtualAssistant';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PricingPage from './pages/PricingPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import AssessmentsPage from './pages/AssessmentsPage';
import TakeAssessment from './pages/TakeAssessment';
import AssessmentResults from './pages/AssessmentResults';
import ArticlesPage from './pages/ArticlesPage';
import ArticleDetail from './pages/ArticleDetail';
import ProductsPage from './pages/ProductsPage';
import FAQPage from './pages/FAQPage';

// ============================================
// AUTH PAGES
// ============================================
import AdminLogin from './pages/AdminLogin';

// ============================================
// USER PAGES
// ============================================
import UserDashboard from './pages/UserDashboard';
import UserProfile from './pages/UserProfile';
import UserApplications from './pages/UserApplications';
import UserSkills from './pages/UserSkills';
import UserMessages from './pages/UserMessages';
import UserSettings from './pages/UserSettings';
import SavedJobsPage from './pages/SavedJobsPage';
import JobAlertsPage from './pages/JobAlertsPage';
import AffiliateDashboard from './pages/AffiliateDashboard';
import LearnerDashboard from './pages/LearnerDashboard';
import CompanyProfile from './pages/CompanyProfile';
import WorkforceDashboard from './pages/WorkforceDashboard';

// ============================================
// TESTER PAGES
// ============================================
import TesterLoginPage from './pages/tester/TesterLoginPage';
import TesterRegisterPage from './pages/tester/TesterRegisterPage';
import TesterDashboard from './pages/tester/TesterDashboard';

// ============================================
// ADMIN PAGES
// ============================================
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminJobs from './pages/admin/AdminJobs';
import AdminFraudReports from './pages/admin/AdminFraudReports';
import AdminArticles from './pages/admin/AdminArticles';
import ArticleEditor from './pages/admin/ArticleEditor';
import TestingModeSettings from './pages/admin/TestingModeSettings';
import TesterVisibilitySettings from './pages/admin/TesterVisibilitySettings';
import EmailTest from './pages/admin/EmailTest';
import ExternalJobs from './pages/admin/AdminExternalJobs';
import KnowledgeSourceManager from './pages/admin/KnowledgeSourceManager';
import ManageBooks from './pages/admin/ManageBooks';
import NewsletterAdmin from './pages/admin/NewsletterAdmin';
import AssessmentManager from './pages/admin/AssessmentManager';
import VirtualAssistantManager from './pages/admin/VirtualAssistantManager';
import AICourseBuilder from './pages/admin/AICourseBuilder';
import AdminSkills from './pages/admin/AdminSkills';

// ============================================
// DASHBOARD PAGES
// ============================================
import SystemHealthDashboard from './pages/admin/SystemHealthDashboard';
import SecurityDashboard from './pages/admin/SecurityDashboard';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';

// ============================================
// LEGAL PAGES
// ============================================
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import CookiesPage from './pages/legal/CookiesPage';
import DisclaimerPage from './pages/legal/DisclaimerPage';
import AcceptableUsePage from './pages/legal/AcceptableUsePage';
import FraudPreventionPage from './pages/legal/FraudPreventionPage';
import SafetyTipsPage from './pages/legal/SafetyTipsPage';
import ReportFraudPage from './pages/ReportFraudPage';

// ============================================
// WORKFORCE COMPONENTS
// ============================================
import WorkforceOnboarding from './components/workforce/WorkforceOnboarding';
import ProposalsList from './components/workforce/ProposalsList';
import EngagementsDashboard from './components/workforce/EngagementsDashboard';

// ============================================
// ANIMATED PAGE WRAPPER
// ============================================
function AnimatedPage({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// SIMPLE 404 PAGE
// ============================================
function NotFoundPage() {
    return (
        <AnimatedPage>
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
        </AnimatedPage>
    );
}

// ============================================
// MAIN APP COMPONENT
// ============================================
function AppContent() {
    const location = useLocation();
    
    // Log that app mounted successfully
    useEffect(() => {
        console.log('✅ App mounted successfully with animations');
    }, []);

    return (
        <>
            {/* Scroll to top on route change */}
            <ScrollToTop />
            
            {/* Core Layout Components */}
            <Navbar />
            <ScrollingBanner />
            
            {/* Main Content with Animations */}
            <main className="min-h-screen bg-slate-950">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
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

                                {/* Assessment Routes */}
                                <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                                <Route path="/assessments/:id" element={<AnimatedPage><TakeAssessment /></AnimatedPage>} />
                                <Route path="/assessment-results/:id" element={<AnimatedPage><AssessmentResults /></AnimatedPage>} />

                                {/* Article Routes */}
                                <Route path="/articles" element={<AnimatedPage><ArticlesPage /></AnimatedPage>} />
                                <Route path="/articles/:slug" element={<AnimatedPage><ArticleDetail /></AnimatedPage>} />

                                {/* Auth Routes */}
                                <Route path="/admin-login" element={<AnimatedPage><AdminLogin /></AnimatedPage>} />

                                {/* User Routes */}
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
                                <Route path="/workforce/setup" element={<AnimatedPage><WorkforceOnboarding /></AnimatedPage>} />
                                <Route path="/workforce/proposals" element={<AnimatedPage><ProposalsList /></AnimatedPage>} />
                                <Route path="/workforce/engagements" element={<AnimatedPage><EngagementsDashboard /></AnimatedPage>} />

                                {/* Tester Routes */}
                                <Route path="/tester-login" element={<AnimatedPage><TesterLoginPage /></AnimatedPage>} />
                                <Route path="/tester-register" element={<AnimatedPage><TesterRegisterPage /></AnimatedPage>} />
                                <Route path="/tester/dashboard" element={<AnimatedPage><TesterDashboard /></AnimatedPage>} />

                                {/* Admin Routes */}
                                <Route path="/admin/dashboard" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
                                <Route path="/admin/users" element={<AnimatedPage><AdminUsers /></AnimatedPage>} />
                                <Route path="/admin/jobs" element={<AnimatedPage><AdminJobs /></AnimatedPage>} />
                                <Route path="/admin/fraud-reports" element={<AnimatedPage><AdminFraudReports /></AnimatedPage>} />
                                <Route path="/admin/articles" element={<AnimatedPage><AdminArticles /></AnimatedPage>} />
                                <Route path="/admin/articles/new" element={<AnimatedPage><ArticleEditor /></AnimatedPage>} />
                                <Route path="/admin/articles/:id" element={<AnimatedPage><ArticleEditor /></AnimatedPage>} />
                                <Route path="/admin/testing-mode" element={<AnimatedPage><TestingModeSettings /></AnimatedPage>} />
                                <Route path="/admin/settings/tester-visibility" element={<AnimatedPage><TesterVisibilitySettings /></AnimatedPage>} />
                                <Route path="/admin/email-test" element={<AnimatedPage><EmailTest /></AnimatedPage>} />
                                <Route path="/admin/external-jobs" element={<AnimatedPage><ExternalJobs /></AnimatedPage>} />
                                <Route path="/admin/knowledge-sources" element={<AnimatedPage><KnowledgeSourceManager /></AnimatedPage>} />
                                <Route path="/admin/books" element={<AnimatedPage><ManageBooks /></AnimatedPage>} />
                                <Route path="/admin/newsletter" element={<AnimatedPage><NewsletterAdmin /></AnimatedPage>} />
                                <Route path="/admin/assessments" element={<AnimatedPage><AssessmentManager /></AnimatedPage>} />
                                <Route path="/admin/virtual-assistants" element={<AnimatedPage><VirtualAssistantManager /></AnimatedPage>} />
                                <Route path="/admin/ai-course-builder" element={<AnimatedPage><AICourseBuilder /></AnimatedPage>} />
                                <Route path="/admin/skills" element={<AnimatedPage><AdminSkills /></AnimatedPage>} />
                                <Route path="/admin/health" element={<AnimatedPage><SystemHealthDashboard /></AnimatedPage>} />
                                <Route path="/admin/security" element={<AnimatedPage><SecurityDashboard /></AnimatedPage>} />
                                <Route path="/admin/analytics" element={<AnimatedPage><AnalyticsDashboard /></AnimatedPage>} />

                                {/* Legal Routes */}
                                <Route path="/legal/terms" element={<AnimatedPage><TermsPage /></AnimatedPage>} />
                                <Route path="/legal/privacy" element={<AnimatedPage><PrivacyPage /></AnimatedPage>} />
                                <Route path="/legal/cookies" element={<AnimatedPage><CookiesPage /></AnimatedPage>} />
                                <Route path="/legal/disclaimer" element={<AnimatedPage><DisclaimerPage /></AnimatedPage>} />
                                <Route path="/legal/acceptable-use" element={<AnimatedPage><AcceptableUsePage /></AnimatedPage>} />
                                <Route path="/legal/fraud-prevention" element={<AnimatedPage><FraudPreventionPage /></AnimatedPage>} />
                                <Route path="/safety-tips" element={<AnimatedPage><SafetyTipsPage /></AnimatedPage>} />
                                <Route path="/report-fraud" element={<AnimatedPage><ReportFraudPage /></AnimatedPage>} />

                                {/* 404 Fallback - Must be last */}
                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </AnimatePresence>
                    </div>
                </div>
            </main>
            
            {/* Footer & Popups */}
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
// MAIN APP COMPONENT WITH ROUTER
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
