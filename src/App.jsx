// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Components (Eager)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import ODUSBABAChat from './components/ODUSBABAChat';
import BrainstormPartner from './components/BrainstormPartner';
import AnimatedBackground from './components/AnimatedBackground';

// Lazy-loaded Pages
const HomePage = lazy(() => import('./pages/HomePage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const JobDetailPage = lazy(() => import('./pages/JobDetailPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const HireVirtualAssistant = lazy(() => import('./pages/HireVirtualAssistant'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const FraudPreventionPage = lazy(() => import('./pages/FraudPreventionPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const UserApplications = lazy(() => import('./pages/UserApplications'));
const UserSkills = lazy(() => import('./pages/UserSkills'));
const SavedJobsPage = lazy(() => import('./pages/SavedJobsPage'));
const JobAlertsPage = lazy(() => import('./pages/JobAlertsPage'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage'));
const AcceptableUsePage = lazy(() => import('./pages/legal/AcceptableUsePage'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p className="text-slate-400">Loading...</p>
    </div>
  );
}

function AnimatedPage({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }
  return children;
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-slate-400 mb-4">Page Not Found</p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-primary-500 text-white rounded-lg">
          Go Home
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <AnimatedBackground />
      <Navbar />
      <main className="min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<AnimatedPage><HomePage /></AnimatedPage>} />
                <Route path="/jobs" element={<AnimatedPage><JobsPage /></AnimatedPage>} />
                <Route path="/jobs/:id" element={<AnimatedPage><JobDetailPage /></AnimatedPage>} />
                <Route path="/courses" element={<AnimatedPage><CoursesPage /></AnimatedPage>} />
                <Route path="/books" element={<AnimatedPage><BooksPage /></AnimatedPage>} />
                <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                <Route path="/hire-va" element={<AnimatedPage><HireVirtualAssistant /></AnimatedPage>} />
                <Route path="/newsletter" element={<AnimatedPage><NewsletterPage /></AnimatedPage>} />
                <Route path="/about" element={<AnimatedPage><AboutPage /></AnimatedPage>} />
                <Route path="/contact" element={<AnimatedPage><ContactPage /></AnimatedPage>} />
                <Route path="/pricing" element={<AnimatedPage><PricingPage /></AnimatedPage>} />
                <Route path="/faq" element={<AnimatedPage><FAQPage /></AnimatedPage>} />
                <Route path="/fraud-prevention" element={<AnimatedPage><FraudPreventionPage /></AnimatedPage>} />
                <Route path="/sign-in" element={<AnimatedPage><SignInPage /></AnimatedPage>} />
                <Route path="/sign-up" element={<AnimatedPage><SignUpPage /></AnimatedPage>} />
                <Route path="/admin-login" element={<AnimatedPage><AdminLogin /></AnimatedPage>} />
                <Route path="/dashboard" element={<ProtectedRoute><AnimatedPage><UserDashboard /></AnimatedPage></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><AnimatedPage><UserProfile /></AnimatedPage></ProtectedRoute>} />
                <Route path="/applications" element={<ProtectedRoute><AnimatedPage><UserApplications /></AnimatedPage></ProtectedRoute>} />
                <Route path="/skills" element={<ProtectedRoute><AnimatedPage><UserSkills /></AnimatedPage></ProtectedRoute>} />
                <Route path="/saved-jobs" element={<ProtectedRoute><AnimatedPage><SavedJobsPage /></AnimatedPage></ProtectedRoute>} />
                <Route path="/job-alerts" element={<ProtectedRoute><AnimatedPage><JobAlertsPage /></AnimatedPage></ProtectedRoute>} />
                <Route path="/affiliate" element={<ProtectedRoute><AnimatedPage><AffiliateDashboard /></AnimatedPage></ProtectedRoute>} />
                <Route path="/admin/dashboard" element={<ProtectedRoute><AnimatedPage><AdminDashboard /></AnimatedPage></ProtectedRoute>} />
                <Route path="/legal/terms" element={<AnimatedPage><TermsPage /></AnimatedPage>} />
                <Route path="/legal/privacy" element={<AnimatedPage><PrivacyPage /></AnimatedPage>} />
                <Route path="/legal/cookies" element={<AnimatedPage><CookiesPage /></AnimatedPage>} />
                <Route path="/legal/disclaimer" element={<AnimatedPage><DisclaimerPage /></AnimatedPage>} />
                <Route path="/legal/acceptable-use" element={<AnimatedPage><AcceptableUsePage /></AnimatedPage>} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
      <CookieConsent />
      <ODUSBABAChat />
      <BrainstormPartner />
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
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
