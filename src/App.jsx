import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// LAZY LOADING FOR PERFORMANCE
// ============================================

// Components (Eager loaded - needed immediately)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PremiumTermsPopup from './components/PremiumTermsPopup';
import CookieConsent from './components/CookieConsent';
import ODUSBABAChat from './components/ODUSBABAChat';
import BrainstormPartner from './components/BrainstormPartner';
import TermsPopup from './components/TermsPopup';
import ScrollingBanner from './components/ScrollingBanner';

// Public Pages (Lazy Loaded)
const HomePage = lazy(() => import('./pages/HomePage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const WorkforceMarketplace = lazy(() => import('./pages/WorkforceMarketplace'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const HireVirtualAssistant = lazy(() => import('./pages/HireVirtualAssistant'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));

// Assessment Pages (Lazy Loaded)
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const TakeAssessment = lazy(() => import('./pages/TakeAssessment'));
const AssessmentResults = lazy(() => import('./pages/AssessmentResults'));

// Article Pages (Lazy Loaded)
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));

// Tester Pages (Lazy Loaded)
const TesterLoginPage = lazy(() => import('./pages/tester/TesterLoginPage'));
const TesterRegisterPage = lazy(() => import('./pages/tester/TesterRegisterPage'));
const TesterDashboard = lazy(() => import('./pages/tester/TesterDashboard'));

// User Pages (Lazy Loaded)
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const UserApplications = lazy(() => import('./pages/UserApplications'));
const UserSkills = lazy(() => import('./pages/UserSkills'));
const UserMessages = lazy(() => import('./pages/UserMessages'));
const UserSettings = lazy(() => import('./pages/UserSettings'));
const SavedJobsPage = lazy(() => import('./pages/SavedJobsPage'));
const JobAlertsPage = lazy(() => import('./pages/JobAlertsPage'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));

// Employer Pages (Lazy Loaded)
const CompanyProfile = lazy(() => import('./pages/CompanyProfile'));

// LMS Pages (Lazy Loaded)
const LearnerDashboard = lazy(() => import('./pages/LearnerDashboard'));
const AICourseBuilder = lazy(() => import('./pages/admin/AICourseBuilder'));

// Admin Pages (Lazy Loaded) - ONLY THOSE THAT EXIST
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const CountryManagement = lazy(() => import('./pages/admin/super/CountryManagement'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'));
const AffiliateManagement = lazy(() => import('./pages/admin/AffiliateManagement'));
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'));
const TesterVisibilitySettings = lazy(() => import('./pages/admin/TesterVisibilitySettings'));
const TestingModeSettings = lazy(() => import('./pages/admin/TestingModeSettings'));

// Legal Pages (Lazy Loaded)
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage'));
const AcceptableUsePage = lazy(() => import('./pages/legal/AcceptableUsePage'));

// Additional Public Pages
const FAQPage = lazy(() => import('./pages/FAQPage'));
const FraudPreventionPage = lazy(() => import('./pages/FraudPreventionPage'));
const MoreProductsPage = lazy(() => import('./pages/MoreProductsPage'));

// ============================================
// COMPONENTS
// ============================================

// Loading Spinner Component
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

// Protected Route Component
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
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('user_type, tier')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile?.user_type)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// 404 Page Component
function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-7xl md:text-8xl font-bold text-white mb-4">404</h1>
          <p className="text-xl text-slate-400 mb-4">Page Not Found</p>
          <p className="text-slate-500 mb-8 max-w-md">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP CONTENT
// ============================================

function AppContent() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Navbar />
      <ScrollingBanner />
      <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes location={location} key={location.pathname}>
                  
                  {/* ========================================== */}
                  {/* PUBLIC ROUTES - No authentication required */}
                  {/* ========================================== */}
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
                  
                  {/* New Public Routes */}
                  <Route path="/faq" element={<AnimatedPage><FAQPage /></AnimatedPage>} />
                  <Route path="/fraud-prevention" element={<AnimatedPage><FraudPreventionPage /></AnimatedPage>} />
                  <Route path="/more-products" element={<AnimatedPage><MoreProductsPage /></AnimatedPage>} />

                  {/* ========================================== */}
                  {/* ASSESSMENT ROUTES */}
                  {/* ========================================== */}
                  <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                  <Route path="/assessment/:id" element={<AnimatedPage><TakeAssessment /></AnimatedPage>} />
                  <Route path="/assessment/results/:id" element={<AnimatedPage><AssessmentResults /></AnimatedPage>} />
                  
                  {/* Backward Compatibility Redirects */}
                  <Route 
                    path="/assessments/:id" 
                    element={<Navigate to="/assessment/:id" replace />} 
                  />
                  <Route 
                    path="/assessment-results/:id" 
                    element={<Navigate to="/assessment/results/:id" replace />} 
                  />

                  {/* ========================================== */}
                  {/* ARTICLE ROUTES */}
                  {/* ========================================== */}
                  <Route path="/articles" element={<AnimatedPage><ArticlesPage /></AnimatedPage>} />
                  <Route path="/articles/:slug" element={<AnimatedPage><ArticleDetail /></AnimatedPage>} />

                  {/* ========================================== */}
                  {/* LMS ROUTES */}
                  {/* ========================================== */}
                  <Route path="/learning" element={<AnimatedPage><LearnerDashboard /></AnimatedPage>} />
                  <Route 
                    path="/admin/ai-course-builder" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                        <AnimatedPage><AICourseBuilder /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />

                  {/* ========================================== */}
                  {/* TESTER ROUTES */}
                  {/* ========================================== */}
                  <Route path="/tester-login" element={<AnimatedPage><TesterLoginPage /></AnimatedPage>} />
                  <Route path="/tester-register" element={<AnimatedPage><TesterRegisterPage /></AnimatedPage>} />
                  <Route 
                    path="/tester/dashboard" 
                    element={
                      <ProtectedRoute allowedRoles={['tester']}>
                        <AnimatedPage><TesterDashboard /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />

                  {/* ========================================== */}
                  {/* USER ROUTES - Authenticated only */}
                  {/* ========================================== */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <AnimatedPage><UserDashboard /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <AnimatedPage><UserProfile /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/applications" 
                    element={
                      <ProtectedRoute>
                        <AnimatedPage><UserApplications /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/skills" 
                    element={
                      <ProtectedRoute>
                        <AnimatedPage><UserSkills /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/messages" 
                    element={
                      <ProtectedRoute>
                        <AnimatedPage><UserMessages /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <AnimatedPage><UserSettings /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/saved-jobs" 
                    element={
                      <ProtectedRoute>
                        <AnimatedPage><SavedJobsPage /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/job-alerts" 
                    element={
                      <ProtectedRoute>
                        <AnimatedPage><JobAlertsPage /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/affiliate" 
                    element={
                      <ProtectedRoute>
                        <AnimatedPage><AffiliateDashboard /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />

                  {/* ========================================== */}
                  {/* EMPLOYER ROUTES */}
                  {/* ========================================== */}
                  <Route 
                    path="/company-profile" 
                    element={
                      <ProtectedRoute allowedRoles={['employer', 'business']}>
                        <AnimatedPage><CompanyProfile /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />

                  {/* ========================================== */}
                  {/* ADMIN ROUTES - ONLY EXISTING FILES */}
                  {/* ========================================== */}
                  <Route 
                    path="/admin/dashboard" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                        <AnimatedPage><AdminDashboard /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/super/countries" 
                    element={
                      <ProtectedRoute allowedRoles={['super_admin']}>
                        <AnimatedPage><CountryManagement /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/analytics" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                        <AnimatedPage><AnalyticsDashboard /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/affiliates" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                        <AnimatedPage><AffiliateManagement /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/articles" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                        <AnimatedPage><AdminArticles /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/articles/new" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                        <AnimatedPage><ArticleEditor /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/articles/:id" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                        <AnimatedPage><ArticleEditor /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/settings/tester-visibility" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                        <AnimatedPage><TesterVisibilitySettings /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/testing-mode" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                        <AnimatedPage><TestingModeSettings /></AnimatedPage>
                      </ProtectedRoute>
                    } 
                  />

                  {/* ========================================== */}
                  {/* LEGAL ROUTES */}
                  {/* ========================================== */}
                  <Route path="/legal/terms" element={<AnimatedPage><TermsPage /></AnimatedPage>} />
                  <Route path="/legal/privacy" element={<AnimatedPage><PrivacyPage /></AnimatedPage>} />
                  <Route path="/legal/cookies" element={<AnimatedPage><CookiesPage /></AnimatedPage>} />
                  <Route path="/legal/disclaimer" element={<AnimatedPage><DisclaimerPage /></AnimatedPage>} />
                  <Route path="/legal/acceptable-use" element={<AnimatedPage><AcceptableUsePage /></AnimatedPage>} />

                  {/* ========================================== */}
                  {/* 404 FALLBACK - MUST BE LAST */}
                  {/* ========================================== */}
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
