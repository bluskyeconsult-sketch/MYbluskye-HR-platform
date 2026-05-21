// src/App.jsx
// FRESH WORKING VERSION - Guaranteed to load

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ============================================
// DIRECT IMPORTS (NO LAZY LOADING)
// ============================================

// Core Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollingBanner from './components/ScrollingBanner';
import CookieConsent from './components/CookieConsent';
import ODUSBABAChat from './components/ODUSBABAChat';
import ErrorBoundary from './components/ErrorBoundary';
import FraudSafetyBanner from './components/FraudSafetyBanner';

// Public Pages
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

// Auth Pages
import AdminLogin from './pages/AdminLogin';

// User Pages
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

// Tester Pages
import TesterLoginPage from './pages/tester/TesterLoginPage';
import TesterRegisterPage from './pages/tester/TesterRegisterPage';
import TesterDashboard from './pages/tester/TesterDashboard';

// Admin Pages
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

// Dashboard Pages
import SystemHealthDashboard from './pages/admin/SystemHealthDashboard';
import SecurityDashboard from './pages/admin/SecurityDashboard';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';

// Legal Pages
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import CookiesPage from './pages/legal/CookiesPage';
import DisclaimerPage from './pages/legal/DisclaimerPage';
import AcceptableUsePage from './pages/legal/AcceptableUsePage';
import FraudPreventionPage from './pages/legal/FraudPreventionPage';
import SafetyTipsPage from './pages/legal/SafetyTipsPage';
import ReportFraudPage from './pages/ReportFraudPage';

// Workforce Components
import WorkforceOnboarding from './components/workforce/WorkforceOnboarding';
import ProposalsList from './components/workforce/ProposalsList';
import EngagementsDashboard from './components/workforce/EngagementsDashboard';

// Popup Components
import PremiumTermsPopup from './components/PremiumTermsPopup';
import BrainstormPartner from './components/BrainstormPartner';
import TermsPopup from './components/TermsPopup';

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
                <a href="/" className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Go Home
                </a>
            </div>
        </div>
    );
}

// ============================================
// APP COMPONENT
// ============================================
function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Navbar />
                <ScrollingBanner />
                <main className="min-h-screen bg-slate-950">
                    <div className="w-full px-4 sm:px-6 lg:px-8">
                        <div className="max-w-7xl mx-auto">
                            <Routes>
                                {/* Public Routes */}
                                <Route path="/" element={<HomePage />} />
                                <Route path="/jobs" element={<JobsPage />} />
                                <Route path="/workforce" element={<WorkforceMarketplace />} />
                                <Route path="/courses" element={<CoursesPage />} />
                                <Route path="/books" element={<BooksPage />} />
                                <Route path="/newsletter" element={<NewsletterPage />} />
                                <Route path="/hire-va" element={<HireVirtualAssistant />} />
                                <Route path="/about" element={<AboutPage />} />
                                <Route path="/contact" element={<ContactPage />} />
                                <Route path="/pricing" element={<PricingPage />} />
                                <Route path="/sign-in" element={<SignInPage />} />
                                <Route path="/sign-up" element={<SignUpPage />} />
                                <Route path="/products" element={<ProductsPage />} />
                                <Route path="/faq" element={<FAQPage />} />

                                {/* Assessment Routes */}
                                <Route path="/assessments" element={<AssessmentsPage />} />
                                <Route path="/assessments/:id" element={<TakeAssessment />} />
                                <Route path="/assessment-results/:id" element={<AssessmentResults />} />

                                {/* Article Routes */}
                                <Route path="/articles" element={<ArticlesPage />} />
                                <Route path="/articles/:slug" element={<ArticleDetail />} />

                                {/* Admin Login */}
                                <Route path="/admin-login" element={<AdminLogin />} />

                                {/* User Routes */}
                                <Route path="/dashboard" element={<UserDashboard />} />
                                <Route path="/profile" element={<UserProfile />} />
                                <Route path="/applications" element={<UserApplications />} />
                                <Route path="/skills" element={<UserSkills />} />
                                <Route path="/messages" element={<UserMessages />} />
                                <Route path="/settings" element={<UserSettings />} />
                                <Route path="/saved-jobs" element={<SavedJobsPage />} />
                                <Route path="/job-alerts" element={<JobAlertsPage />} />
                                <Route path="/affiliate" element={<AffiliateDashboard />} />
                                <Route path="/learning" element={<LearnerDashboard />} />
                                <Route path="/company-profile" element={<CompanyProfile />} />
                                <Route path="/workforce/dashboard" element={<WorkforceDashboard />} />
                                <Route path="/workforce/setup" element={<WorkforceOnboarding />} />
                                <Route path="/workforce/proposals" element={<ProposalsList />} />
                                <Route path="/workforce/engagements" element={<EngagementsDashboard />} />

                                {/* Tester Routes */}
                                <Route path="/tester-login" element={<TesterLoginPage />} />
                                <Route path="/tester-register" element={<TesterRegisterPage />} />
                                <Route path="/tester/dashboard" element={<TesterDashboard />} />

                                {/* Admin Routes */}
                                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                                <Route path="/admin/users" element={<AdminUsers />} />
                                <Route path="/admin/jobs" element={<AdminJobs />} />
                                <Route path="/admin/fraud-reports" element={<AdminFraudReports />} />
                                <Route path="/admin/articles" element={<AdminArticles />} />
                                <Route path="/admin/articles/new" element={<ArticleEditor />} />
                                <Route path="/admin/articles/:id" element={<ArticleEditor />} />
                                <Route path="/admin/testing-mode" element={<TestingModeSettings />} />
                                <Route path="/admin/settings/tester-visibility" element={<TesterVisibilitySettings />} />
                                <Route path="/admin/email-test" element={<EmailTest />} />
                                <Route path="/admin/external-jobs" element={<ExternalJobs />} />
                                <Route path="/admin/knowledge-sources" element={<KnowledgeSourceManager />} />
                                <Route path="/admin/books" element={<ManageBooks />} />
                                <Route path="/admin/newsletter" element={<NewsletterAdmin />} />
                                <Route path="/admin/assessments" element={<AssessmentManager />} />
                                <Route path="/admin/virtual-assistants" element={<VirtualAssistantManager />} />
                                <Route path="/admin/ai-course-builder" element={<AICourseBuilder />} />
                                <Route path="/admin/skills" element={<AdminSkills />} />
                                <Route path="/admin/health" element={<SystemHealthDashboard />} />
                                <Route path="/admin/security" element={<SecurityDashboard />} />
                                <Route path="/admin/analytics" element={<AnalyticsDashboard />} />

                                {/* Legal Routes */}
                                <Route path="/legal/terms" element={<TermsPage />} />
                                <Route path="/legal/privacy" element={<PrivacyPage />} />
                                <Route path="/legal/cookies" element={<CookiesPage />} />
                                <Route path="/legal/disclaimer" element={<DisclaimerPage />} />
                                <Route path="/legal/acceptable-use" element={<AcceptableUsePage />} />
                                <Route path="/legal/fraud-prevention" element={<FraudPreventionPage />} />
                                <Route path="/safety-tips" element={<SafetyTipsPage />} />
                                <Route path="/report-fraud" element={<ReportFraudPage />} />

                                {/* 404 Fallback */}
                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </div>
                    </div>
                </main>
                <Footer />
                <PremiumTermsPopup />
                <CookieConsent />
                <ODUSBABAChat />
                <BrainstormPartner />
                <TermsPopup />
                <FraudSafetyBanner />
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
