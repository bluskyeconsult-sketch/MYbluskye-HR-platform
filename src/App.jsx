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

// ============================================
// ANALYTICS TRACKING SERVICE
// ============================================
import { 
    startSession, 
    endSession, 
    trackPageView, 
    updatePageViewMetrics,
    trackEvent 
} from './services/analyticsTrackingService';

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
const FraudSafetyBanner = lazy(() => import('./components/FraudSafetyBanner'));
const PremiumTermsPopup = lazy(() => import('./components/PremiumTermsPopup'));
const BrainstormPartner = lazy(() => import('./components/BrainstormPartner'));
const TermsPopup = lazy(() => import('./components/TermsPopup'));

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

    // ============================================
    // ANALYTICS TRACKING
    // ============================================
    useEffect(() => {
        // Start session on app load
        startSession();
        
        // Track page view on route change
        const trackCurrentPage = () => {
            const path = location.pathname;
            const title = document.title;
            trackPageView(path, title);
        };
        
        // Track initial page
        trackCurrentPage();
        
        // Track scroll depth
        let maxScroll = 0;
        const handleScroll = () => {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = scrollHeight > 0 
                ? (window.scrollY / scrollHeight) * 100 
                : 0;
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                updatePageViewMetrics(Math.round(maxScroll), null);
                
                // Track milestone scroll events
                if (maxScroll >= 25 && maxScroll < 30) {
                    trackEvent('scroll_25_percent', { page: location.pathname });
                } else if (maxScroll >= 50 && maxScroll < 55) {
                    trackEvent('scroll_50_percent', { page: location.pathname });
                } else if (maxScroll >= 75 && maxScroll < 80) {
                    trackEvent('scroll_75_percent', { page: location.pathname });
                } else if (maxScroll >= 90) {
                    trackEvent('scroll_almost_complete', { page: location.pathname });
                }
            }
        };
        
        // Track clicks
        let clickCount = 0;
        const handleClick = (e) => {
            clickCount++;
            updatePageViewMetrics(null, clickCount);
            
            // Track specific important clicks
            const target = e.target.closest('a, button, [role="button"]');
            if (target) {
                const elementType = target.tagName.toLowerCase();
                const elementText = target.innerText?.substring(0, 100) || '';
                const elementHref = target.getAttribute('href') || '';
                
                // Don't track every click, just important ones
                if (elementText.includes('Apply') || 
                    elementText.includes('Sign') ||
                    elementText.includes('Register') ||
                    elementText.includes('Purchase') ||
                    elementText.includes('Contact')) {
                    trackEvent('important_click', {
                        element: elementType,
                        text: elementText,
                        href: elementHref,
                        page: location.pathname
                    });
                }
            }
        };
        
        // Track time on page (every 30 seconds)
        let timeOnPage = 0;
        const timeInterval = setInterval(() => {
            timeOnPage += 30;
            if (timeOnPage === 30) {
                trackEvent('time_on_page_30s', { page: location.pathname });
            } else if (timeOnPage === 60) {
                trackEvent('time_on_page_1m', { page: location.pathname });
            } else if (timeOnPage === 120) {
                trackEvent('time_on_page_2m', { page: location.pathname });
            } else if (timeOnPage === 300) {
                trackEvent('time_on_page_5m', { page: location.pathname });
            }
        }, 30000);
        
        window.addEventListener('scroll', handleScroll);
        document.addEventListener('click', handleClick);
        
        // End session on page unload
        const handleBeforeUnload = () => {
            endSession();
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('click', handleClick);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            clearInterval(timeInterval);
            endSession();
        };
    }, [location.pathname]);

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
                                    <Route path="/products" element={<AnimatedPage><ProductsPage /></AnimatedPage>} />
                                    <Route path="/faq" element={<AnimatedPage><FAQPage /></AnimatedPage>} />

                                    {/* ADMIN LOGIN */}
                                    <Route path="/admin-login" element={<AdminLogin />} />

                                    {/* ASSESSMENT ROUTES */}
                                    <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                                    <Route path="/assessments/:id" element={<AnimatedPage><TakeAssessment /></AnimatedPage>} />
                                    <Route path="/assessment-results/:id" element={<AnimatedPage><AssessmentResults /></AnimatedPage>} />

                                    {/* ARTICLE ROUTES */}
                                    <Route path="/articles" element={<AnimatedPage><ArticlesPage /></AnimatedPage>} />
                                    <Route path="/articles/:slug" element={<AnimatedPage><ArticleDetail /></AnimatedPage>} />

                                    {/* LMS ROUTES */}
                                    <Route path="/learning" element={<AnimatedPage><LearnerDashboard /></AnimatedPage>} />

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
                                    <Route path="/admin/external-jobs-manager" element={<AnimatedPage><ExternalJobsManager /></AnimatedPage>} />
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

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
