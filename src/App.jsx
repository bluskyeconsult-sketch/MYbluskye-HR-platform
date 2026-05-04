import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PremiumTermsPopup from './components/PremiumTermsPopup';
import CookieConsent from './components/CookieConsent';
import ODUSBABAChat from './components/ODUSBABAChat';
import BrainstormPartner from './components/BrainstormPartner';
import TermsPopup from './components/TermsPopup';
import ScrollingBanner from './components/ScrollingBanner';

// Pages - Public
import HomePage from './pages/HomePage';
import AdminLogin from './pages/AdminLogin';
import WorkforceMarketplace from './pages/WorkforceMarketplace';
import JobsPage from './pages/JobsPage';
import CoursesPage from './pages/CoursesPage';
import BooksPage from './pages/BooksPage';
import NewsletterPage from './pages/NewsletterPage';
import HireVirtualAssistant from './pages/HireVirtualAssistant';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PricingPage from './pages/PricingPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

// Pages - Assessments
import AssessmentsPage from './pages/AssessmentsPage';
import TakeAssessment from './pages/TakeAssessment';
import AssessmentResults from './pages/AssessmentResults';

// Pages - Articles & Blog
import ArticlesPage from './pages/ArticlesPage';
import ArticleDetail from './pages/ArticleDetail';

// Pages - Tester
import TesterLoginPage from './pages/tester/TesterLoginPage';
import TesterRegisterPage from './pages/tester/TesterRegisterPage';
import TesterDashboard from './pages/tester/TesterDashboard';

// Pages - User
import UserDashboard from './pages/UserDashboard';
import UserProfile from './pages/UserProfile';
import UserApplications from './pages/UserApplications';
import UserSkills from './pages/UserSkills';
import UserMessages from './pages/UserMessages';
import UserSettings from './pages/UserSettings';
import SavedJobsPage from './pages/SavedJobsPage';
import JobAlertsPage from './pages/JobAlertsPage';
import AffiliateDashboard from './pages/AffiliateDashboard';

// Pages - Employer
import CompanyProfile from './pages/CompanyProfile';

// Pages - LMS (Learning Management System)
import LearnerDashboard from './pages/LearnerDashboard';
import AICourseBuilder from './pages/admin/AICourseBuilder';

// Pages - Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import CountryManagement from './pages/admin/super/CountryManagement';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import AffiliateManagement from './pages/admin/AffiliateManagement';
import ArticleEditor from './pages/admin/ArticleEditor';
import AdminArticles from './pages/admin/AdminArticles';
import TesterVisibilitySettings from './pages/admin/TesterVisibilitySettings';
import TestingModeSettings from './pages/admin/TestingModeSettings';

// Pages - Legal
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import CookiesPage from './pages/legal/CookiesPage';
import DisclaimerPage from './pages/legal/DisclaimerPage';
import AcceptableUsePage from './pages/legal/AcceptableUsePage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Animation wrapper for page transitions
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

// 404 Page Component
function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
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

// Redirect component for backward compatibility
function RedirectToAssessment({ id }) {
  return <Navigate to={`/assessment/${id}`} replace />;
}

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
    <>
      <Navbar />
      <ScrollingBanner />
      <main className="min-h-screen bg-background">
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
                <Route path="/admin-login" element={<AnimatedPage><AdminLogin /></AnimatedPage>} />

                {/* Assessment Routes - NEW URL STRUCTURE */}
                <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                <Route path="/assessment/:id" element={<AnimatedPage><TakeAssessment /></AnimatedPage>} />
                <Route path="/assessment/results/:id" element={<AnimatedPage><AssessmentResults /></AnimatedPage>} />
                
                {/* BACKWARD COMPATIBILITY: Redirect old assessment routes to new ones */}
                <Route 
                  path="/assessments/:id" 
                  element={<Navigate to="/assessment/:id" replace />} 
                />
                <Route 
                  path="/assessment-results/:id" 
                  element={<Navigate to="/assessment/results/:id" replace />} 
                />

                {/* Article Routes */}
                <Route path="/articles" element={<AnimatedPage><ArticlesPage /></AnimatedPage>} />
                <Route path="/articles/:slug" element={<AnimatedPage><ArticleDetail /></AnimatedPage>} />

                {/* LMS Routes */}
                <Route path="/learning" element={<AnimatedPage><LearnerDashboard /></AnimatedPage>} />
                <Route path="/admin/ai-course-builder" element={<AnimatedPage><AICourseBuilder /></AnimatedPage>} />

                {/* Tester Routes */}
                <Route path="/tester-login" element={<AnimatedPage><TesterLoginPage /></AnimatedPage>} />
                <Route path="/tester-register" element={<AnimatedPage><TesterRegisterPage /></AnimatedPage>} />
                <Route path="/tester/dashboard" element={<AnimatedPage><TesterDashboard /></AnimatedPage>} />

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

                {/* Employer Routes */}
                <Route path="/company-profile" element={<AnimatedPage><CompanyProfile /></AnimatedPage>} />

                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
                <Route path="/admin/super/countries" element={<AnimatedPage><CountryManagement /></AnimatedPage>} />
                <Route path="/admin/analytics" element={<AnimatedPage><AnalyticsDashboard /></AnimatedPage>} />
                <Route path="/admin/affiliates" element={<AnimatedPage><AffiliateManagement /></AnimatedPage>} />
                <Route path="/admin/articles" element={<AnimatedPage><AdminArticles /></AnimatedPage>} />
                <Route path="/admin/articles/new" element={<AnimatedPage><ArticleEditor /></AnimatedPage>} />
                <Route path="/admin/articles/:id" element={<AnimatedPage><ArticleEditor /></AnimatedPage>} />
                <Route path="/admin/settings/tester-visibility" element={<AnimatedPage><TesterVisibilitySettings /></AnimatedPage>} />
                <Route path="/admin/testing-mode" element={<AnimatedPage><TestingModeSettings /></AnimatedPage>} />

                {/* Legal Routes */}
                <Route path="/legal/terms" element={<AnimatedPage><TermsPage /></AnimatedPage>} />
                <Route path="/legal/privacy" element={<AnimatedPage><PrivacyPage /></AnimatedPage>} />
                <Route path="/legal/cookies" element={<AnimatedPage><CookiesPage /></AnimatedPage>} />
                <Route path="/legal/disclaimer" element={<AnimatedPage><DisclaimerPage /></AnimatedPage>} />
                <Route path="/legal/acceptable-use" element={<AnimatedPage><AcceptableUsePage /></AnimatedPage>} />

                {/* 404 Fallback Route - MUST BE LAST */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AnimatePresence>
          </div>
        </div>
      </main>
      <Footer />
      <PremiumTermsPopup userId={user?.id} />
      <CookieConsent />
      <ODUSBABAChat />
      <BrainstormPartner />
      <TermsPopup />
    </>
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
