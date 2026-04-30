import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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

// Pages - Public
import HomePage from './pages/HomePage';
import AdminLogin from './pages/AdminLogin';
import WorkforceMarketplace from './pages/WorkforceMarketplace';
import JobsPage from './pages/JobsPage';
import CoursesPage from './pages/CoursesPage';
import BooksPage from './pages/BooksPage';
import NewsletterPage from './pages/NewsletterPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PricingPage from './pages/PricingPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

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

// Pages - Employer
import CompanyProfile from './pages/CompanyProfile';

// Pages - Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import CountryManagement from './pages/admin/super/CountryManagement';

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
        <a href="/" className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
          Go Home
        </a>
      </div>
    </div>
  );
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
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route path="/" element={<AnimatedPage><HomePage /></AnimatedPage>} />
          <Route path="/jobs" element={<AnimatedPage><JobsPage /></AnimatedPage>} />
          <Route path="/workforce" element={<AnimatedPage><WorkforceMarketplace /></AnimatedPage>} />
          <Route path="/courses" element={<AnimatedPage><CoursesPage /></AnimatedPage>} />
          <Route path="/books" element={<AnimatedPage><BooksPage /></AnimatedPage>} />
          <Route path="/newsletter" element={<AnimatedPage><NewsletterPage /></AnimatedPage>} />
          <Route path="/about" element={<AnimatedPage><AboutPage /></AnimatedPage>} />
          <Route path="/contact" element={<AnimatedPage><ContactPage /></AnimatedPage>} />
          <Route path="/pricing" element={<AnimatedPage><PricingPage /></AnimatedPage>} />
          <Route path="/sign-in" element={<AnimatedPage><SignInPage /></AnimatedPage>} />
          <Route path="/sign-up" element={<AnimatedPage><SignUpPage /></AnimatedPage>} />
          <Route path="/admin-login" element={<AnimatedPage><AdminLogin /></AnimatedPage>} />

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

          {/* Employer Routes */}
          <Route path="/company-profile" element={<AnimatedPage><CompanyProfile /></AnimatedPage>} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
          <Route path="/admin/super/countries" element={<AnimatedPage><CountryManagement /></AnimatedPage>} />

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
      <Footer />
      <PremiumTermsPopup userId={user?.id} />
      <CookieConsent />
      
      {/* ODUSBABA Floating Chat - Available on EVERY page */}
      <ODUSBABAChat />
      
      {/* Brainstorm Partner - Super Admin only */}
      <BrainstormPartner />
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
