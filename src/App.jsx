// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Import Auth Context and AI Assist
import { AuthProvider } from './context/AuthContext';
import AIAssistButton from './components/AIAssistButton';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Eager Components (loaded immediately)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import ODUSBABAChat from './components/ODUSBABAChat';
import AnimatedBackground from './components/AnimatedBackground';
import ScrollingBanner from './components/ScrollingBanner';
import FraudAlertBanner from './components/FraudAlertBanner';
import PromoBanner from './components/PromoBanner';

// Lazy-loaded Pages - Public
const HomePage = lazy(() => import('./pages/HomePage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const JobDetailPage = lazy(() => import('./pages/JobDetailPage'));
const WorkforceMarketplace = lazy(() => import('./pages/WorkforceMarketplace'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const CourseDetailsPage = lazy(() => import('./pages/CourseDetailsPage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const HireVirtualAssistant = lazy(() => import('./pages/HireVirtualAssistant'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const FraudPreventionPage = lazy(() => import('./pages/FraudPreventionPage'));
const MoreProductsPage = lazy(() => import('./pages/MoreProductsPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage')); // Added from second code
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));

// Lazy-loaded Pages - User Dashboard
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const UserApplications = lazy(() => import('./pages/UserApplications'));
const UserSkills = lazy(() => import('./pages/UserSkills'));
const SavedJobsPage = lazy(() => import('./pages/SavedJobsPage'));
const JobAlertsPage = lazy(() => import('./pages/JobAlertsPage'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));

// Lazy-loaded Pages - Admin
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'));
const AdminBooks = lazy(() => import('./pages/admin/AdminBooks'));
const ManageBooks = lazy(() => import('./pages/admin/ManageBooks')); // Added from second code
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const AdminVirtualAssistants = lazy(() => import('./pages/admin/AdminVirtualAssistants'));
const AdminAssessments = lazy(() => import('./pages/admin/AdminAssessments'));
const AdminExternalJobs = lazy(() => import('./pages/admin/AdminExternalJobs'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const KnowledgeSourceManager = lazy(() => import('./pages/admin/KnowledgeSourceManager')); // Added from second code

// Lazy-loaded Pages - Legal
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage'));
const AcceptableUsePage = lazy(() => import('./pages/legal/AcceptableUsePage'));

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
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

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
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!user) {
    window.location.href = '/sign-in';
    return null;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile?.user_type)) {
    window.location.href = '/dashboard';
    return null;
  }
  return children;
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-slate-400 mb-4">Page Not Found</p>
        <p className="text-slate-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
          Go Home
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();

  return (
    <>
      <AnimatedBackground />
      <Navbar />
      <FraudAlertBanner />
      <ScrollingBanner />
      <PromoBanner />
      <main className="min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes location={location} key={location.pathname}>
                {/* ========== PUBLIC ROUTES ========== */}
                <Route path="/" element={<AnimatedPage><HomePage /></AnimatedPage>} />
                <Route path="/jobs" element={<AnimatedPage><JobsPage /></AnimatedPage>} />
                <Route path="/jobs/:id" element={<AnimatedPage><JobDetailPage /></AnimatedPage>} />
                <Route path="/workforce" element={<AnimatedPage><WorkforceMarketplace /></AnimatedPage>} />
                <Route path="/courses" element={<AnimatedPage><CoursesPage /></AnimatedPage>} />
                <Route path="/courses/:id" element={<AnimatedPage><CourseDetailsPage /></AnimatedPage>} />
                <Route path="/books" element={<AnimatedPage><BooksPage /></AnimatedPage>} />
                <Route path="/assessments" element={<AnimatedPage><AssessmentsPage /></AnimatedPage>} />
                <Route path="/hire-va" element={<AnimatedPage><HireVirtualAssistant /></AnimatedPage>} />
                <Route path="/newsletter" element={<AnimatedPage><NewsletterPage /></AnimatedPage>} />
                <Route path="/about" element={<AnimatedPage><AboutPage /></AnimatedPage>} />
                <Route path="/contact" element={<AnimatedPage><ContactPage /></AnimatedPage>} />
                <Route path="/pricing" element={<AnimatedPage><PricingPage /></AnimatedPage>} />
                <Route path="/faq" element={<AnimatedPage><FAQPage /></AnimatedPage>} />
                <Route path="/fraud-prevention" element={<AnimatedPage><FraudPreventionPage /></AnimatedPage>} />
                <Route path="/more-products" element={<AnimatedPage><MoreProductsPage /></AnimatedPage>} />
                <Route path="/products" element={<AnimatedPage><ProductsPage /></AnimatedPage>} /> {/* Added from second code */}
                <Route path="/sign-in" element={<AnimatedPage><SignInPage /></AnimatedPage>} />
                <Route path="/sign-up" element={<AnimatedPage><SignUpPage /></AnimatedPage>} />
                <Route path="/admin-login" element={<AnimatedPage><AdminLogin /></AnimatedPage>} />

                {/* ========== USER DASHBOARD ROUTES ========== */}
                <Route path="/dashboard" element={<ProtectedRoute><AnimatedPage><UserDashboard /></AnimatedPage></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><AnimatedPage><UserProfile /></AnimatedPage></ProtectedRoute>} />
                <Route path="/applications" element={<ProtectedRoute><AnimatedPage><UserApplications /></AnimatedPage></ProtectedRoute>} />
                <Route path="/skills" element={<ProtectedRoute><AnimatedPage><UserSkills /></AnimatedPage></ProtectedRoute>} />
                <Route path="/saved-jobs" element={<ProtectedRoute><AnimatedPage><SavedJobsPage /></AnimatedPage></ProtectedRoute>} />
                <Route path="/job-alerts" element={<ProtectedRoute><AnimatedPage><JobAlertsPage /></AnimatedPage></ProtectedRoute>} />
                <Route path="/affiliate" element={<ProtectedRoute><AnimatedPage><AffiliateDashboard /></AnimatedPage></ProtectedRoute>} />

                {/* ========== ADMIN ROUTES ========== */}
                <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminDashboard /></AnimatedPage></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminUsers /></AnimatedPage></ProtectedRoute>} />
                <Route path="/admin/articles" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminArticles /></AnimatedPage></ProtectedRoute>} />
                <Route path="/admin/books" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminBooks /></AnimatedPage></ProtectedRoute>} />
                <Route path="/admin/manage-books" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><ManageBooks /></AnimatedPage></ProtectedRoute>} /> {/* Added from second code */}
                <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminCourses /></AnimatedPage></ProtectedRoute>} />
                <Route path="/admin/virtual-assistants" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminVirtualAssistants /></AnimatedPage></ProtectedRoute>} />
                <Route path="/admin/assessments" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminAssessments /></AnimatedPage></ProtectedRoute>} />
                <Route path="/admin/external-jobs" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminExternalJobs /></AnimatedPage></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><AdminAnalytics /></AnimatedPage></ProtectedRoute>} />
                <Route path="/admin/knowledge-sources" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AnimatedPage><KnowledgeSourceManager /></AnimatedPage></ProtectedRoute>} /> {/* Added from second code */}

                {/* ========== LEGAL ROUTES ========== */}
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
      </main>
      <Footer />
      <CookieConsent />
      <ODUSBABAChat />
      <AIAssistButton />
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
