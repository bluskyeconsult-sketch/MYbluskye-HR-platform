// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// LAZY LOADED COMPONENTS
// ============================================

// Core Components (Eager)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PremiumTermsPopup from './components/PremiumTermsPopup';
import CookieConsent from './components/CookieConsent';
import ODUSBABAChat from './components/ODUSBABAChat';
import BrainstormPartner from './components/BrainstormPartner';
import TermsPopup from './components/TermsPopup';
import ScrollingBanner from './components/ScrollingBanner';
import FraudAlertBanner from './components/FraudAlertBanner';
import AnimatedBackground from './components/AnimatedBackground';

// Public Pages (Lazy)
const HomePage = lazy(() => import('./pages/HomePage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const JobDetailPage = lazy(() => import('./pages/JobDetailPage'));
const WorkforceMarketplace = lazy(() => import('./pages/WorkforceMarketplace'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const CourseDetailsPage = lazy(() => import('./pages/CourseDetailsPage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const TakeAssessment = lazy(() => import('./pages/TakeAssessment'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults'));
const HireVirtualAssistant = lazy(() => import('./pages/HireVirtualAssistant'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const FraudPreventionPage = lazy(() => import('./pages/FraudPreventionPage'));
const MoreProductsPage = lazy(() => import('./pages/MoreProductsPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));

// User Pages (Lazy)
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const UserApplications = lazy(() => import('./pages/UserApplications'));
const UserSkills = lazy(() => import('./pages/UserSkills'));
const UserMessages = lazy(() => import('./pages/UserMessages'));
const UserSettings = lazy(() => import('./pages/UserSettings'));
const SavedJobsPage = lazy(() => import('./pages/SavedJobsPage'));
const JobAlertsPage = lazy(() => import('./pages/JobAlertsPage'));
const MyLearningPage = lazy(() => import('./pages/MyLearningPage'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));

// Employer Pages (Lazy)
const CompanyProfile = lazy(() => import('./pages/CompanyProfile'));
const EmployerJobsPage = lazy(() => import('./pages/EmployerJobsPage'));
const EmployerApplicationsPage = lazy(() => import('./pages/EmployerApplicationsPage'));

// Tester Pages (Lazy)
const TesterLoginPage = lazy(() => import('./pages/tester/TesterLoginPage'));
const TesterRegisterPage = lazy(() => import('./pages/tester/TesterRegisterPage'));
const TesterDashboard = lazy(() => import('./pages/tester/TesterDashboard'));

// Admin Pages (Lazy)
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminResetPassword = lazy(() => import('./pages/AdminResetPassword'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'));
const AdminExternalJobs = lazy(() => import('./pages/admin/AdminExternalJobs'));
const AdminAnalytics = lazy(() => import('./pages/admin/AnalyticsDashboard'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'));
const AdminBooks = lazy(() => import('./pages/admin/AdminBooks'));
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'));
const AdminVirtualAssistants = lazy(() => import('./pages/admin/AdminVirtualAssistants'));
const AdminAssessments = lazy(() => import('./pages/admin/AdminAssessments'));
const AffiliateManagement = lazy(() => import('./pages/admin/AffiliateManagement'));
const TesterVisibilitySettings = lazy(() => import('./pages/admin/TesterVisibilitySettings'));
const CountryManagement = lazy(() => import('./pages/admin/super/CountryManagement'));
const TestingModeSettings = lazy(() => import('./pages/admin/TestingModeSettings'));
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor'));

// Legal Pages (Lazy)
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage'));
const AcceptableUsePage = lazy(() => import('./pages/legal/AcceptableUsePage'));

// ============================================
// COMPONENTS
// ============================================

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

function AnimatedPage({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

const routeCache = new Map();

function ProtectedRoute({ children, allowedRoles = [] }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const cacheKey = 'auth_check';
      const cached = routeCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < 60000) {
        setUser(cached.user);
        setProfile(cached.profile);
        setLoading(false);
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('user_type, tier')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
        routeCache.set(cacheKey, { user: session.user, profile: data, timestamp: now });
      }
    } catch (err) { console.error('Auth error:', err); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile?.user_type)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
          <h1 className="text-7xl md:text-8xl font-bold text-white mb-4">404</h1>
          <p className="text-xl text-slate-400 mb-4">Page Not Found</p>
          <p className="text-slate-500 mb-8 max-w-md">The page you're looking for doesn't exist or has been moved.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Go Home</button>
            <button onClick={() => window.history.back()} className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700">Go Back</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

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
      <FraudAlertBanner />
      <ScrollingBanner />
      <main className="min-h-screen relative z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes location={location} key={location.pathname}>
                  {/* Public Routes */}
                  <Route path="/" element={<AnimatedPage><HomePage /></AnimatedPage>} />
                  <Route path="/jobs" element={<AnimatedPage><JobsPage /></AnimatedPage>} />
                  <Route path="/jobs/:id" element={<AnimatedPage><JobDetailPage /></AnimatedPage>} />
                  <Route path="/workforce" element={<AnimatedPage><WorkforceMarketplace /></AnimatedPage>} />
                  <Route path="/courses" element={<AnimatedPage><CoursesPage /></AnimatedPage>} />
                  <Route path="/courses/:id" element={<AnimatedPage><CourseDetailsPage /></AnimatedPage>} />
                  <Route path="/books" element={<AnimatedPage><BooksPage /></AnimatedPage>} />
                  <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                  <Route path="/assessment/:id" element={<AnimatedPage><TakeAssessment /></AnimatedPage>} />
                  <Route path="/assessment/results/:id" element={<AnimatedPage><AssessmentResults /></AnimatedPage>} />
                  <Route path="/hire-va" element={<AnimatedPage><HireVirtualAssistant /></AnimatedPage>} />
                  <Route path="/newsletter" element={<AnimatedPage><NewsletterPage /></AnimatedPage>} />
                  <Route path="/about" element={<AnimatedPage><AboutPage /></AnimatedPage>} />
                  <Route path="/contact" element={<AnimatedPage><ContactPage /></AnimatedPage>} />
                  <Route path="/pricing" element={<AnimatedPage><PricingPage /></AnimatedPage>} />
                  <Route path="/faq" element={<AnimatedPage><FAQPage /></AnimatedPage>} />
                  <Route path="/fraud-prevention" element={<AnimatedPage><FraudPreventionPage /></AnimatedPage>} />
                  <Route path="/more-products" element={<AnimatedPage><MoreProductsPage /></AnimatedPage>} />
                  <Route path="/sign-in" element={<AnimatedPage><SignInPage /></AnimatedPage>} />
                  <Route path="/sign-up" element={<AnimatedPage><SignUpPage /></AnimatedPage>} />
                  <Route path="/admin-login" element={<AnimatedPage><AdminLogin /></AnimatedPage>} />
                  <Route path="/admin-reset-password" element={<AnimatedPage><AdminResetPassword /></AnimatedPage>} />

                  {/* User Routes */}
                  <Route path="/dashboard" element={<ProtectedRoute><AnimatedPage><UserDashboard /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><AnimatedPage><UserProfile /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/applications" element={<ProtectedRoute><AnimatedPage><UserApplications /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/skills" element={<ProtectedRoute><AnimatedPage><UserSkills /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><AnimatedPage><UserMessages /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><AnimatedPage><UserSettings /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/saved-jobs" element={<ProtectedRoute><AnimatedPage><SavedJobsPage /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/job-alerts" element={<ProtectedRoute><AnimatedPage><JobAlertsPage /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/my-learning" element={<ProtectedRoute><AnimatedPage><MyLearningPage /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/affiliate" element={<ProtectedRoute><AnimatedPage><AffiliateDashboard /></AnimatedPage></ProtectedRoute>} />

                  {/* Employer Routes */}
                  <Route path="/company-profile" element={<ProtectedRoute allowedRoles={['employer', 'business']}><AnimatedPage><CompanyProfile /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/employer/jobs" element={<ProtectedRoute allowedRoles={['employer', 'business']}><AnimatedPage><EmployerJobsPage /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/employer/applications" element={<ProtectedRoute allowedRoles={['employer', 'business']}><AnimatedPage><EmployerApplicationsPage /></AnimatedPage></ProtectedRoute>} />

                  {/* Tester Routes */}
                  <Route path="/tester-login" element={<AnimatedPage><TesterLoginPage /></AnimatedPage>} />
                  <Route path="/tester-register" element={<AnimatedPage><TesterRegisterPage /></AnimatedPage>} />
                  <Route path="/tester/dashboard" element={<ProtectedRoute allowedRoles={['tester']}><AnimatedPage><TesterDashboard /></AnimatedPage></ProtectedRoute>} />

                  {/* Admin Routes */}
                  <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminDashboard /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><AnimatedPage><AdminUsers /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/jobs" element={<ProtectedRoute allowedRoles={['super_admin']}><AnimatedPage><AdminJobs /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/external-jobs" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminExternalJobs /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminAnalytics /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={['super_admin']}><AnimatedPage><AdminAudit /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/books" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminBooks /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminCourses /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/articles" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminArticles /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/articles/new" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><ArticleEditor /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/articles/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><ArticleEditor /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/virtual-assistants" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminVirtualAssistants /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/assessments" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminAssessments /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/affiliates" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AffiliateManagement /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/settings/tester-visibility" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><TesterVisibilitySettings /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/super/countries" element={<ProtectedRoute allowedRoles={['super_admin']}><AnimatedPage><CountryManagement /></AnimatedPage></ProtectedRoute>} />
                  <Route path="/admin/testing-mode" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><TestingModeSettings /></AnimatedPage></ProtectedRoute>} />

                  {/* Legal Routes */}
                  <Route path="/legal/terms" element={<AnimatedPage><TermsPage /></AnimatedPage>} />
                  <Route path="/legal/privacy" element={<AnimatedPage><PrivacyPage /></AnimatedPage>} />
                  <Route path="/legal/cookies" element={<AnimatedPage><CookiesPage /></AnimatedPage>} />
                  <Route path="/legal/disclaimer" element={<AnimatedPage><DisclaimerPage /></AnimatedPage>} />
                  <Route path="/legal/acceptable-use" element={<AnimatedPage><AcceptableUsePage /></AnimatedPage>} />

                  {/* 404 Fallback */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
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
