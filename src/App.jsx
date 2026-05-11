// src/App.jsx
// OPTIMIZED - With lazy loading, code splitting, and scroll to top

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';

// ============================================
// LAZY LOAD COMPONENTS (Code Splitting for faster initial load)
// ============================================

// Core components (always loaded)
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ScrollingBanner from './components/ScrollingBanner.jsx';
import CookieConsent from './components/CookieConsent.jsx';
import ODUSBABAChat from './components/ODUSBABAChat.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Lazy loaded components (loaded on demand)
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx'));
const WorkforceMarketplace = lazy(() => import('./pages/WorkforceMarketplace.jsx'));
const JobsPage = lazy(() => import('./pages/JobsPage.jsx'));
const CoursesPage = lazy(() => import('./pages/CoursesPage.jsx'));
const BooksPage = lazy(() => import('./pages/BooksPage.jsx'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage.jsx'));
const HireVirtualAssistant = lazy(() => import('./pages/HireVirtualAssistant.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));
const PricingPage = lazy(() => import('./pages/PricingPage.jsx'));
const SignInPage = lazy(() => import('./pages/SignInPage.jsx'));
const SignUpPage = lazy(() => import('./pages/SignUpPage.jsx'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage.jsx'));
const TakeAssessment = lazy(() => import('./pages/TakeAssessment.jsx'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults.jsx'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage.jsx'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail.jsx'));
const LearnerDashboard = lazy(() => import('./pages/LearnerDashboard.jsx'));
const AICourseBuilder = lazy(() => import('./pages/admin/AICourseBuilder.jsx'));
const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx'));
const FAQPage = lazy(() => import('./pages/FAQPage.jsx'));
const WorkforceDashboard = lazy(() => import('./pages/WorkforceDashboard.jsx'));
const UserDashboard = lazy(() => import('./pages/UserDashboard.jsx'));
const UserProfile = lazy(() => import('./pages/UserProfile.jsx'));
const UserApplications = lazy(() => import('./pages/UserApplications.jsx'));
const UserSkills = lazy(() => import('./pages/UserSkills.jsx'));
const UserMessages = lazy(() => import('./pages/UserMessages.jsx'));
const UserSettings = lazy(() => import('./pages/UserSettings.jsx'));
const SavedJobsPage = lazy(() => import('./pages/SavedJobsPage.jsx'));
const JobAlertsPage = lazy(() => import('./pages/JobAlertsPage.jsx'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard.jsx'));
const TesterLoginPage = lazy(() => import('./pages/tester/TesterLoginPage.jsx'));
const TesterRegisterPage = lazy(() => import('./pages/tester/TesterRegisterPage.jsx'));
const TesterDashboard = lazy(() => import('./pages/tester/TesterDashboard.jsx'));
const CompanyProfile = lazy(() => import('./pages/CompanyProfile.jsx'));

// Admin pages (lazy loaded)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const CountryManagement = lazy(() => import('./pages/admin/super/CountryManagement.jsx'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard.jsx'));
const AffiliateManagement = lazy(() => import('./pages/admin/AffiliateManagement.jsx'));
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor.jsx'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles.jsx'));
const TesterVisibilitySettings = lazy(() => import('./pages/admin/TesterVisibilitySettings.jsx'));
const TestingModeSettings = lazy(() => import('./pages/admin/TestingModeSettings.jsx'));
const EmailTest = lazy(() => import('./pages/admin/EmailTest.jsx'));
const KnowledgeSourceManager = lazy(() => import('./pages/admin/KnowledgeSourceManager.jsx'));
const ManageBooks = lazy(() => import('./pages/admin/ManageBooks.jsx'));
const NewsletterAdmin = lazy(() => import('./pages/admin/NewsletterAdmin.jsx'));
const AssessmentManager = lazy(() => import('./pages/admin/AssessmentManager.jsx'));
const VirtualAssistantManager = lazy(() => import('./pages/admin/VirtualAssistantManager.jsx'));

// Legal pages (lazy loaded)
const TermsPage = lazy(() => import('./pages/legal/TermsPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage.jsx'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage.jsx'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage.jsx'));
const AcceptableUsePage = lazy(() => import('./pages/legal/AcceptableUsePage.jsx'));
const FraudPreventionPage = lazy(() => import('./pages/legal/FraudPreventionPage.jsx'));
const SafetyTipsPage = lazy(() => import('./pages/legal/SafetyTipsPage.jsx'));
const ReportFraudPage = lazy(() => import('./pages/ReportFraudPage.jsx'));

// Workforce components (lazy loaded)
const WorkforceOnboarding = lazy(() => import('./components/workforce/WorkforceOnboarding.jsx'));
const ProposalsList = lazy(() => import('./components/workforce/ProposalsList.jsx'));
const EngagementsDashboard = lazy(() => import('./components/workforce/EngagementsDashboard.jsx'));
const FraudSafetyBanner = lazy(() => import('./components/FraudSafetyBanner.jsx'));
const PremiumTermsPopup = lazy(() => import('./components/PremiumTermsPopup.jsx'));
const BrainstormPartner = lazy(() => import('./components/BrainstormPartner.jsx'));
const TermsPopup = lazy(() => import('./components/TermsPopup.jsx'));

// ============================================
// SUPABASE CLIENT (Singleton)
// ============================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// ============================================
// LOADING FALLBACK COMPONENT
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
                                    
                                    {/* PUBLIC ROUTES */}
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
                                    <Route path="/admin-login" element={<AnimatedPage><AdminLogin /></AnimatedPage>} />
                                    <Route path="/products" element={<AnimatedPage><ProductsPage /></AnimatedPage>} />
                                    <Route path="/faq" element={<AnimatedPage><FAQPage /></AnimatedPage>} />

                                    {/* ASSESSMENT ROUTES */}
                                    <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                                    <Route path="/assessments/:id" element={<AnimatedPage><TakeAssessment /></AnimatedPage>} />
                                    <Route path="/assessment-results/:id" element={<AnimatedPage><AssessmentResults /></AnimatedPage>} />

                                    {/* ARTICLE ROUTES */}
                                    <Route path="/articles" element={<AnimatedPage><ArticlesPage /></AnimatedPage>} />
                                    <Route path="/articles/:slug" element={<AnimatedPage><ArticleDetail /></AnimatedPage>} />

                                    {/* LMS ROUTES */}
                                    <Route path="/learning" element={<AnimatedPage><LearnerDashboard /></AnimatedPage>} />
                                    <Route path="/admin/ai-course-builder" element={<AnimatedPage><AICourseBuilder /></AnimatedPage>} />

                                    {/* WORKFORCE MARKETPLACE ROUTES */}
                                    <Route path="/workforce/dashboard" element={<AnimatedPage><WorkforceDashboard /></AnimatedPage>} />
                                    <Route path="/workforce/setup" element={<AnimatedPage><WorkforceOnboardingWrapper /></AnimatedPage>} />
                                    <Route path="/workforce/proposals" element={<AnimatedPage><ProposalsListWrapper /></AnimatedPage>} />
                                    <Route path="/workforce/engagements" element={<AnimatedPage><EngagementsDashboardWrapper /></AnimatedPage>} />

                                    {/* TESTER ROUTES */}
                                    <Route path="/tester-login" element={<AnimatedPage><TesterLoginPage /></AnimatedPage>} />
                                    <Route path="/tester-register" element={<AnimatedPage><TesterRegisterPage /></AnimatedPage>} />
                                    <Route path="/tester/dashboard" element={<AnimatedPage><TesterDashboard /></AnimatedPage>} />

                                    {/* USER ROUTES */}
                                    <Route path="/dashboard" element={<AnimatedPage><UserDashboard /></AnimatedPage>} />
                                    <Route path="/profile" element={<AnimatedPage><UserProfile /></AnimatedPage>} />
                                    <Route path="/applications" element={<AnimatedPage><UserApplications /></AnimatedPage>} />
                                    <Route path="/skills" element={<AnimatedPage><UserSkills /></AnimatedPage>} />
                                    <Route path="/messages" element={<AnimatedPage><UserMessages /></AnimatedPage>} />
                                    <Route path="/settings" element={<AnimatedPage><UserSettings /></AnimatedPage>} />
                                    <Route path="/saved-jobs" element={<AnimatedPage><SavedJobsPage /></AnimatedPage>} />
                                    <Route path="/job-alerts" element={<AnimatedPage><JobAlertsPage /></AnimatedPage>} />
                                    <Route path="/affiliate" element={<AnimatedPage><AffiliateDashboard /></AnimatedPage>} />

                                    {/* EMPLOYER ROUTES */}
                                    <Route path="/company-profile" element={<AnimatedPage><CompanyProfile /></AnimatedPage>} />

                                    {/* ADMIN ROUTES */}
                                    <Route path="/admin/dashboard" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
                                    <Route path="/admin/super/countries" element={<AnimatedPage><CountryManagement /></AnimatedPage>} />
                                    <Route path="/admin/analytics" element={<AnimatedPage><AnalyticsDashboard /></AnimatedPage>} />
                                    <Route path="/admin/affiliates" element={<AnimatedPage><AffiliateManagement /></AnimatedPage>} />
                                    <Route path="/admin/articles" element={<AnimatedPage><AdminArticles /></AnimatedPage>} />
                                    <Route path="/admin/articles/new" element={<AnimatedPage><ArticleEditor /></AnimatedPage>} />
                                    <Route path="/admin/articles/:id" element={<AnimatedPage><ArticleEditor /></AnimatedPage>} />
                                    <Route path="/admin/settings/tester-visibility" element={<AnimatedPage><TesterVisibilitySettings /></AnimatedPage>} />
                                    <Route path="/admin/testing-mode" element={<AnimatedPage><TestingModeSettings /></AnimatedPage>} />
                                    <Route path="/admin/email-test" element={<AnimatedPage><EmailTest /></AnimatedPage>} />
                                    <Route path="/admin/knowledge-sources" element={<AnimatedPage><KnowledgeSourceManager /></AnimatedPage>} />
                                    <Route path="/admin/books" element={<AnimatedPage><ManageBooks /></AnimatedPage>} />
                                    <Route path="/admin/newsletter" element={<AnimatedPage><NewsletterAdmin /></AnimatedPage>} />
                                    <Route path="/admin/assessments" element={<AnimatedPage><AssessmentManager /></AnimatedPage>} />
                                    <Route path="/admin/virtual-assistants" element={<AnimatedPage><VirtualAssistantManager /></AnimatedPage>} />

                                    {/* LEGAL & SAFETY ROUTES */}
                                    <Route path="/legal/terms" element={<AnimatedPage><TermsPage /></AnimatedPage>} />
                                    <Route path="/legal/privacy" element={<AnimatedPage><PrivacyPage /></AnimatedPage>} />
                                    <Route path="/legal/cookies" element={<AnimatedPage><CookiesPage /></AnimatedPage>} />
                                    <Route path="/legal/disclaimer" element={<AnimatedPage><DisclaimerPage /></AnimatedPage>} />
                                    <Route path="/legal/acceptable-use" element={<AnimatedPage><AcceptableUsePage /></AnimatedPage>} />
                                    <Route path="/legal/fraud-prevention" element={<AnimatedPage><FraudPreventionPage /></AnimatedPage>} />
                                    <Route path="/safety-tips" element={<AnimatedPage><SafetyTipsPage /></AnimatedPage>} />
                                    <Route path="/report-fraud" element={<AnimatedPage><ReportFraudPage /></AnimatedPage>} />

                                    {/* 404 FALLBACK */}
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
function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
