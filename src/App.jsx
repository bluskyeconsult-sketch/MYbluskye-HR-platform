// ============================================
// EXISTING IMPORTS (keep these)
// ============================================
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
import EmailTest from './pages/admin/EmailTest';

// ============================================
// NEW IMPORTS - MUST HAVE .jsx EXTENSION
// ============================================
import ProductsPage from './pages/ProductsPage.jsx';
import FAQPage from './pages/FAQPage.jsx';
import KnowledgeSourceManager from './pages/admin/KnowledgeSourceManager.jsx';
import ManageBooks from './pages/admin/ManageBooks.jsx';

// Pages - Legal
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import CookiesPage from './pages/legal/CookiesPage';
import DisclaimerPage from './pages/legal/DisclaimerPage';
import AcceptableUsePage from './pages/legal/AcceptableUsePage';

// ============================================
// SUPABASE CLIENT (Singleton)
// ============================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// ANIMATION WRAPPER & 404 PAGE (keep as is)
// ============================================
function AnimatedPage({ children }) { ... }
function NotFoundPage() { ... }

// ============================================
// APP CONTENT (keep as is)
// ============================================
function AppContent() { ... }

function App() { ... }

export default App;
