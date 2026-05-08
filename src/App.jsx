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
const TesterRegisterPage
