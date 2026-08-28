// src/pages/FAQPage.jsx
// COMPLETE PROFESSIONAL FAQ PAGE - With unified API, search, filters, and analytics tracking

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Search, ChevronDown, ChevronUp, HelpCircle, Mail, MessageCircle,
    ThumbsUp, ThumbsDown, BookOpen, Users, CreditCard, Shield, Bot, 
    FileText, Filter, Sparkles, TrendingUp, Award, Clock, Star,
    Wrench, Lock,
    Loader2, AlertCircle, ChevronRight
} from 'lucide-react';
import { apiCall, trackEvent } from '../lib/supabase';

export default function FAQPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [openItems, setOpenItems] = useState({});
    const [feedback, setFeedback] = useState({});
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    const [expandedCount, setExpandedCount] = useState(0);

    // Complete FAQ Data organized by categories
    const faqCategories = {
        general: {
            title: "General Questions",
            icon: HelpCircle,
            color: "purple",
            questions: [
                { 
                    q: "What is ODUSBABA?", 
                    a: "ODUSBABA is an AI-powered HR intelligence platform that connects verified professionals with employers, offering skills assessment, job matching, and workforce management solutions.",
                    keywords: ["platform", "hr", "intelligence", "overview"],
                    link: null,
                    popularity: 95
                },
                { 
                    q: "How do I create an account?", 
                    a: "Click the 'Sign Up' button in the top right corner. Enter your email and password, then verify your email address. You can also sign up using Google or LinkedIn. Once verified, you can complete your profile and start using our services.",
                    keywords: ["signup", "register", "account", "create"],
                    link: "/sign-up",
                    popularity: 92
                },
                { 
                    q: "Is ODUSBABA free to use?", 
                    // FIXED (2026-08-27): stated Employer plans "start at
                    // $39.99/month" - that's the real Professional price.
                    // Employer is actually $129.99/month, Business is
                    // $399.99/month - both confirmed against the real
                    // backend tier constants.
                    a: "Yes! We offer a free tier with basic features. Professional plans start at $39.99/month, Employer at $129.99/month, and Business at $399.99/month.",
                    keywords: ["free", "trial", "cost", "price"],
                    link: "/pricing",
                    popularity: 98
                },
                { 
                    q: "What is the tester program?", 
                    // FIXED (2026-08-27): linked to /tester-register - the
                    // same stale link already fixed in several other files
                    // this engagement; that route now just redirects to
                    // /sign-up, where tester registration actually happens.
                    a: "Testers get a real, admin-configured usage allowance and access period. Register with a valid invite code at /sign-up. Your feedback directly helps us improve!",
                    keywords: ["tester", "invite", "beta"],
                    link: "/sign-up",
                    popularity: 88
                },
                { 
                    q: "How do I reset my password?", 
                    a: "Click 'Forgot Password' on the sign-in page. Enter your email, and we'll send you a reset link. The link expires in 1 hour for security.",
                    keywords: ["password", "reset", "forgot"],
                    link: "/sign-in",
                    popularity: 85
                }
            ]
        },
        jobSearch: {
            title: "Job Search",
            icon: TrendingUp,
            color: "blue",
            questions: [
                { 
                    q: "How do I apply for jobs?", 
                    a: "Browse jobs at /jobs, click on any job card, then click 'Apply Now'. Your application will be sent to the employer. You can track applications in your dashboard.",
                    keywords: ["apply", "job", "application"],
                    link: "/jobs",
                    popularity: 96
                },
                { 
                    q: "Can I save jobs for later?", 
                    a: "Yes! Click the 'Save Job' button on any job listing. Saved jobs appear in your dashboard at /saved-jobs for easy access later.",
                    keywords: ["save", "bookmark", "later"],
                    link: "/saved-jobs",
                    popularity: 90
                },
                { 
                    q: "What are authoritative jobs?", 
                    // FIXED (2026-08-27): named USAJobs and NHS Jobs
                    // specifically as reliable, verified sources - but
                    // direct testing this session confirmed most UK/
                    // government portal sources are currently unreachable
                    // from this platform's infrastructure (several block
                    // automated access as policy, not a bug on our end).
                    // Rewritten to describe what's genuinely true: jobs
                    // are labeled by their real, confirmed origin, and
                    // "Verified" specifically means cross-referenced
                    // against an official source or a real employer
                    // career page - not a blanket claim about which
                    // specific government sites are currently live.
                    a: "Jobs tagged 'Verified' or with a source label come from official government portals (where currently reachable) or from a verified employer's own career page, cross-referenced against real sponsor license registers. Coverage varies by country and can change if a source becomes temporarily unreachable — the label always reflects the job's real, current origin.",
                    keywords: ["verified", "government", "authoritative"],
                    link: "/jobs",
                    popularity: 89
                },
                { 
                    q: "How do job alerts work?", 
                    a: "Create job alerts at /job-alerts. Set your preferences (title, location, salary), and we'll email you when matching jobs are posted.",
                    keywords: ["alert", "notification", "email"],
                    link: "/job-alerts",
                    popularity: 91
                },
                {
                    // NEW (2026-08-27): the Verified Employer Directory
                    // (/verified-employers) is a real, live page with no
                    // FAQ coverage at all until now.
                    q: "What is the Verified Employer Directory?",
                    a: "A real, browsable list of companies cross-referenced against official government sponsor license registers — genuine, verified sponsors, not a generic company list. Some listings show real, current job openings pulled directly from that employer's own careers page.",
                    keywords: ["verified employer", "sponsor", "directory", "companies"],
                    link: "/verified-employers",
                    popularity: 81
                }
            ]
        },
        assessments: {
            title: "Assessments & Skills",
            icon: Award,
            color: "emerald",
            questions: [
                { 
                    q: "What types of assessments are available?", 
                    a: "We offer psychometric tests, workplace skills assessments, career aptitude tests, and role-specific technical evaluations. Each assessment is designed to identify your strengths and growth areas.",
                    keywords: ["assessment", "test", "evaluation", "psychometric", "skills"],
                    link: "/assessments",
                    popularity: 94
                },
                { 
                    q: "How long do assessments take?", 
                    a: "Assessment duration varies by type: mini-assessments take 5-10 minutes, standard assessments take 15-20 minutes, and comprehensive ones take 30-45 minutes.",
                    keywords: ["duration", "time", "length", "long"],
                    link: "/assessments",
                    popularity: 87
                },
                { 
                    q: "Can I retake assessments?", 
                    a: "Yes, you can retake assessments after 90 days to measure your progress. Premium users have access to more frequent retake options.",
                    keywords: ["retake", "again", "repeat", "multiple"],
                    link: "/assessments",
                    popularity: 86
                }
            ]
        },
        virtualAssistant: {
            title: "AI Chat & Virtual Assistants",
            icon: Bot,
            color: "indigo",
            questions: [
                { 
                    q: "How does ODUSBABA Chat work?", 
                    // FIXED (2026-08-23): was "registered users get 20" —
                    // the real, confirmed backend allowance for registered
                    // tier is 10 (same number already corrected on
                    // PricingPage.jsx this session).
                    a: "Click the chat bubble in the bottom right corner. Ask about jobs, CV tips, interview preparation, salary negotiation, or career advice. Free users get 5 messages, registered users get 10.",
                    keywords: ["chat", "ai", "assistant", "messages"],
                    link: "#",
                    isChat: true,
                    popularity: 97
                },
                { 
                    q: "What are Virtual Assistants?", 
                    a: "AI-powered tools that help with specific tasks: CV Optimizer Pro, Cover Letter Writer, LinkedIn Makeover, Interview Question Generator, Salary Negotiation Coach, and more. Find them at /hire-va.",
                    keywords: ["virtual", "assistant", "va", "automation"],
                    link: "/hire-va",
                    popularity: 93
                },
                { 
                    q: "Can I customize my Virtual Assistant?", 
                    a: "Yes! You can train your VA with specific workflows, integrate custom tools, and set preferences for communication style and task priority.",
                    keywords: ["customize", "train", "configure", "settings"],
                    link: "/hire-va",
                    popularity: 88
                },
                { 
                    q: "How do I purchase AI credits?", 
                    // FIXED (2026-08-23): was "100 messages/month" — the
                    // real, confirmed backend allowance for Professional
                    // is 25 (same wrong "100" already found and corrected
                    // on PricingPage.jsx this session — this was the same
                    // error, propagated to a second file).
                    a: "When your credits are low, a notification will appear in chat. Click 'Purchase Credits' to buy more. Professional plan includes 25 messages/month.",
                    keywords: ["credits", "purchase", "buy", "messages"],
                    link: "/pricing",
                    popularity: 92
                },
                { 
                    q: "Is my chat data private?", 
                    a: "Yes. All conversations are encrypted and stored securely. We never share your personal information. You can delete chat history from your settings.",
                    keywords: ["privacy", "data", "secure", "encrypted"],
                    link: "/settings",
                    popularity: 95
                }
            ]
        },
        learning: {
            title: "Learning & Courses",
            icon: BookOpen,
            color: "cyan",
            questions: [
                { 
                    q: "How do I enroll in a course?", 
                    a: "Browse courses at /courses, click on any course, then click 'Enroll Now'. Free courses are immediately accessible. Paid courses require payment.",
                    keywords: ["course", "enroll", "learning"],
                    link: "/courses",
                    popularity: 91
                },
                { 
                    q: "Do courses have audio?", 
                    // FIXED (2026-08-23): "generates audio narration for
                    // every lesson" was false — the real system (confirmed
                    // via the same fix already made to AICourseBuilder.jsx
                    // this session) only auto-generates a text outline;
                    // audio and images are separate, manual, per-lesson
                    // actions taken in the course editor, not automatic.
                    a: "Audio narration can be generated for individual lessons in the course editor. Adjust playback speed in the audio player once available.",
                    keywords: ["audio", "narration", "listen", "playback"],
                    link: "/courses",
                    popularity: 89
                },
                { 
                    q: "How do I get my certificate?", 
                    // FIXED (2026-08-27): stated "pass the final quiz
                    // with 70% or higher" - the real, confirmed
                    // completion logic is reaching 100% lesson progress,
                    // not a quiz score threshold.
                    a: "Complete every lesson in a course to reach 100% progress. Your certificate is issued automatically at a permanent, shareable link — no login required for anyone you send it to. Find it in your learner dashboard at /learning.",
                    keywords: ["certificate", "certification", "complete"],
                    link: "/learning",
                    popularity: 90
                },
                { 
                    q: "Can I track my progress?", 
                    a: "Yes! Your learner dashboard at /learning shows enrolled courses, progress percentage, time spent, and certificates earned.",
                    keywords: ["progress", "track", "dashboard"],
                    link: "/learning",
                    popularity: 88
                }
            ]
        },
        // NEW (2026-08-27): the Workforce Marketplace never had any FAQ
        // coverage at all - this is a real, live feature (job seeker,
        // professional, and tradesperson listings; employer-paid contact
        // unlock) with genuinely different pricing logic worth explaining
        // clearly, since it's easy to confuse with "applying to a job."
        workforceMarketplace: {
            title: "Workforce Marketplace",
            icon: Wrench,
            color: "orange",
            questions: [
                {
                    q: "What is the Workforce Marketplace?",
                    a: "A place to be discovered by employers browsing for talent — genuinely different from applying to a specific job. Your skills are visible to everyone; your contact details and exact location are only ever shared with an employer after they choose to unlock your profile.",
                    keywords: ["workforce", "marketplace", "listing", "discover"],
                    link: "/workforce",
                    popularity: 85
                },
                {
                    q: "Is it free to list myself on the Workforce Marketplace?",
                    a: "Yes, for everyone — job seekers, professionals, and tradespeople all list at no cost. Employers pay only when they choose to unlock a specific profile's contact details, never you.",
                    keywords: ["free", "cost", "listing", "price"],
                    link: "/workforce",
                    popularity: 87
                },
                {
                    q: "What's the difference between the three listing categories?",
                    a: "Job Seeker listings are free and basic to start, automatically upgrading to show your full skills and ratings once you complete an assessment, a course, or verify a few skills. Professional and Tradesperson listings (plumbers, electricians, braiders, handymen, and similar trades) are reviewed and verified by our team before appearing, matching our '100% Verified' marketplace promise.",
                    keywords: ["job seeker", "professional", "tradesperson", "category"],
                    link: "/workforce",
                    popularity: 84
                },
                {
                    q: "How does an employer contact me?",
                    a: "An employer spends real credits to unlock your contact details — once unlocked, they have permanent access and can message you directly. You're never charged for being contacted.",
                    keywords: ["contact", "employer", "unlock", "credits"],
                    link: "/workforce",
                    popularity: 82
                },
                {
                    q: "Does the platform suggest roles I'm suited for?",
                    a: "Yes — an AI feature reviews your real skills and background to suggest specific roles you're genuinely well-suited for, shown directly on your listing.",
                    keywords: ["ai", "roles", "suggestions", "suitable"],
                    link: "/workforce",
                    popularity: 79
                }
            ]
        },
        billing: {
            title: "Payments & Billing",
            icon: CreditCard,
            color: "amber",
            questions: [
                { 
                    q: "What payment methods do you accept?", 
                    a: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for enterprise accounts via Stripe. All payments are secure and encrypted.",
                    keywords: ["payment", "credit card", "paypal", "invoice"],
                    link: "/pricing",
                    popularity: 94
                },
                { 
                    q: "Can I cancel my subscription?", 
                    a: "Yes. Go to Settings → Subscription → Cancel anytime. No cancellation fees. Your access continues until the end of your billing period.",
                    keywords: ["cancel", "refund", "stop", "end"],
                    link: "/settings",
                    popularity: 92
                },
                { 
                    q: "Do you offer refunds?", 
                    a: "We offer a 14-day money-back guarantee for all paid plans. Contact support@bluskyeconsult.com within 14 days of purchase.",
                    keywords: ["refund", "money back", "guarantee"],
                    link: "/contact",
                    popularity: 90
                }
                // FIXED (2026-08-23): removed a FAQ entry claiming a
                // geo-pricing/regional-discount system ("Tier 1 pay
                // standard price, Tier 5 pay 65% less") — no such logic
                // exists anywhere in the real Stripe checkout handlers or
                // PricingPage.jsx checked this session, and it referenced
                // countries (India, Kenya) not in the confirmed real
                // job-source country list (GB, US, NG, CA, AU, DE, IE).
                // Presenting an unconfirmed pricing claim to customers is
                // a real risk — removed rather than guess whether it's a
                // genuine unbuilt feature or entirely fictional.
            ]
        },
        security: {
            title: "Safety & Security",
            icon: Shield,
            color: "red",
            questions: [
                { 
                    q: "Is my data secure?", 
                    a: "We use enterprise-grade encryption (AES-256 for data at rest, TLS 1.3 for data in transit). We're GDPR and CCPA compliant, and undergo annual security audits.",
                    keywords: ["security", "data", "privacy", "encryption"],
                    link: "/legal/privacy",
                    popularity: 96
                },
                {
                    // NEW (2026-08-27): 2FA is a real, complete, working
                    // feature (TOTP-based, real QR provisioning, hashed
                    // backup codes) confirmed this session - previously
                    // had no FAQ coverage AND no real route to reach it
                    // at all (TwoFactorSettings.jsx was completely
                    // orphaned - fixed alongside this entry).
                    q: "Can I enable two-factor authentication?",
                    a: "Yes — a real, TOTP-based 2FA option (compatible with any standard authenticator app) is available to any account. Enable it at Settings → Security; you'll get a QR code to scan and a set of one-time backup codes to save somewhere safe.",
                    keywords: ["2fa", "two-factor", "security", "authenticator"],
                    link: "/settings/security",
                    popularity: 78
                },
                { 
                    q: "How do I report fraud?", 
                    a: "Go to /report-fraud, fill out the form with evidence (screenshots, URLs). Our team investigates within 24 hours. All reports are confidential.",
                    keywords: ["fraud", "report", "scam"],
                    link: "/report-fraud",
                    popularity: 89
                },
                { 
                    q: "What should I do if I suspect a fake job?", 
                    a: "Do not share personal information. Report the job immediately using the 'Report' button on the job listing. Block the employer and cease communication.",
                    keywords: ["fake job", "scam", "suspicious"],
                    link: "/report-fraud",
                    popularity: 91
                },
                { 
                    q: "How do you verify employers?", 
                    a: "Employers must provide business registration documents, tax ID, and verified address. We review before allowing job posts. Verified employers show a badge.",
                    keywords: ["verify", "employer", "badge"],
                    link: "/legal/fraud-prevention",
                    popularity: 88
                },
                { 
                    q: "What information do you collect?", 
                    a: "We collect basic profile info, IP addresses for security, and usage data for improvement. See our Privacy Policy at /legal/privacy for full details.",
                    keywords: ["privacy", "data", "collect", "information"],
                    link: "/legal/privacy",
                    popularity: 93
                }
            ]
        }
    };

    // Flatten FAQ for search with category info
    const allFaqs = useMemo(() => {
        const result = [];
        Object.entries(faqCategories).forEach(([categoryKey, category]) => {
            category.questions.forEach((faq, idx) => {
                result.push({
                    ...faq,
                    categoryKey,
                    categoryTitle: category.title,
                    categoryIcon: category.icon,
                    categoryColor: category.color,
                    id: `${categoryKey}-${idx}`
                });
            });
        });
        // Sort by popularity (most asked first)
        return result.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }, []);

    // Filter FAQs based on search and category
    const filteredFaqs = useMemo(() => {
        let filtered = allFaqs;
        
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(faq => faq.categoryKey === selectedCategory);
        }
        
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(faq => 
                faq.q.toLowerCase().includes(searchLower) ||
                faq.a.toLowerCase().includes(searchLower) ||
                faq.keywords?.some(k => k.toLowerCase().includes(searchLower))
            );
        }
        
        return filtered;
    }, [allFaqs, selectedCategory, searchTerm]);

    // Toggle accordion with analytics
    const toggleItem = useCallback(async (faqId, faqTitle, category) => {
        const isOpening = !openItems[faqId];
        setOpenItems(prev => ({ ...prev, [faqId]: isOpening }));
        
        if (isOpening) {
            setExpandedCount(prev => prev + 1);
            
            // Track FAQ view via unified API
            try {
                await apiCall('track-event', {
                    event_type: 'faq_view',
                    event_data: { faq_id: faqId, faq_title: faqTitle, category }
                });
            } catch (e) {
                console.debug('Analytics error:', e);
            }
        }
    }, [openItems]);

    // Handle feedback
    // FIXED (2026-08-27): confirmed real bug - called apiCall('faq-feedback',
    // ...), an action that doesn't exist anywhere in index.js (only
    // 'track-event' is real, already used correctly by toggleItem above).
    // Every thumbs-up/down click has silently failed since this page was
    // built - the "thank you" message showed regardless, since setFeedback
    // updates the display before the (always-failing) API call runs. Now
    // routed through the same real track-event action, just with its own
    // event_type.
    const handleFeedback = useCallback(async (faqId, faqTitle, helpful) => {
        setFeedback(prev => ({ ...prev, [faqId]: helpful }));
        
        try {
            await apiCall('track-event', {
                event_type: 'faq_feedback',
                event_data: { faq_id: faqId, faq_title: faqTitle, helpful, timestamp: new Date().toISOString() }
            });
        } catch (e) {
            console.debug('Feedback error:', e);
        }
        
        // Show thank you message briefly
        setTimeout(() => {
            setFeedback(prev => ({ ...prev, [faqId]: null }));
        }, 2000);
    }, []);

    // Handle chat click
    const handleChatClick = useCallback(() => {
        const chatButton = document.querySelector('button[class*="fixed bottom-6 right-6"]');
        if (chatButton) chatButton.click();
        
        // Track chat open
        try {
            apiCall('track-event', { event_type: 'faq_chat_click' });
        } catch (e) {}
    }, []);

    // Track search
    const handleSearch = useCallback((term) => {
        setSearchTerm(term);
        if (term.trim().length > 2) {
            try {
                apiCall('track-event', {
                    event_type: 'faq_search',
                    event_data: { search_term: term, results_count: filteredFaqs.length }
                });
            } catch (e) {}
        }
    }, [filteredFaqs.length]);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
        
        // Track page view
        try {
            apiCall('track-event', { event_type: 'faq_page_view' });
        } catch (e) {}
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-sky-600/10" />
                <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HelpCircle className="w-10 h-10 text-primary-400" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Frequently Asked Questions
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
                            Find answers to common questions about ODUSBABA's platform, services, and solutions
                        </p>
                        
                        {/* Search Bar */}
                        <div className="max-w-md mx-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search questions..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Filters */}
            <div className="sticky top-16 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                                selectedCategory === 'all'
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            <Filter className="w-4 h-4" />
                            All Questions
                        </button>
                        {Object.entries(faqCategories).map(([key, category]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedCategory(key)}
                                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                                    selectedCategory === key
                                        ? `bg-${category.color}-600 text-white shadow-lg shadow-${category.color}-600/20`
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                <category.icon className="w-4 h-4" />
                                {category.title}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results Count */}
            {searchTerm && (
                <div className="max-w-4xl mx-auto px-4 pt-6">
                    <p className="text-sm text-slate-400">
                        Found {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''} for "{searchTerm}"
                    </p>
                </div>
            )}

            {/* FAQ Content */}
            <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                {filteredFaqs.length === 0 ? (
                    <div className="text-center py-12">
                        <HelpCircle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No matching questions found</h3>
                        <p className="text-slate-400 mb-4">
                            Try different keywords or browse our categories
                        </p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('all');
                            }}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredFaqs.map((faq) => (
                            <div
                                key={faq.id}
                                className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all"
                            >
                                <button
                                    onClick={() => toggleItem(faq.id, faq.q, faq.categoryTitle)}
                                    className="w-full text-left p-6 flex justify-between items-start hover:bg-slate-800/50 transition-colors group"
                                >
                                    <div className="flex-1 pr-4">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className={`text-xs px-2 py-1 bg-${faq.categoryColor}-600/20 text-${faq.categoryColor}-400 rounded-full`}>
                                                {faq.categoryTitle}
                                            </span>
                                            {faq.popularity && faq.popularity > 90 && (
                                                <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
                                                    <Star className="w-3 h-3" />
                                                    Popular
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition">
                                            {faq.q}
                                        </h3>
                                    </div>
                                    {openItems[faq.id] ? (
                                        <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                    )}
                                </button>
                                
                                {openItems[faq.id] && (
                                    <div className="px-6 pb-6" style={{ animation: 'slide-down 0.2s ease-out' }}>
                                        <div className="pt-4 border-t border-slate-800">
                                            <p className="text-slate-300 leading-relaxed mb-4">
                                                {faq.a}
                                            </p>
                                            
                                            {/* Action Links */}
                                            {faq.link && (
                                                faq.isChat ? (
                                                    <button 
                                                        onClick={handleChatClick} 
                                                        className="inline-flex items-center gap-2 text-primary-400 text-sm hover:underline mb-4 transition"
                                                    >
                                                        <MessageCircle className="w-4 h-4" /> 
                                                        Ask ODUSBABA Chat
                                                    </button>
                                                ) : (
                                                    <Link 
                                                        to={faq.link} 
                                                        className="inline-flex items-center gap-2 text-primary-400 text-sm hover:underline mb-4 transition"
                                                    >
                                                        Learn more <ChevronRight className="w-3 h-3" />
                                                    </Link>
                                                )
                                            )}
                                            
                                            {/* Helpful feedback */}
                                            <div className="flex items-center gap-4 pt-2">
                                                <span className="text-sm text-slate-500">Was this helpful?</span>
                                                <button
                                                    onClick={() => handleFeedback(faq.id, faq.q, true)}
                                                    className={`flex items-center gap-1 text-sm transition-colors ${
                                                        feedback[faq.id] === true
                                                            ? 'text-emerald-400'
                                                            : 'text-slate-500 hover:text-emerald-400'
                                                    }`}
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                    Yes
                                                </button>
                                                <button
                                                    onClick={() => handleFeedback(faq.id, faq.q, false)}
                                                    className={`flex items-center gap-1 text-sm transition-colors ${
                                                        feedback[faq.id] === false
                                                            ? 'text-red-400'
                                                            : 'text-slate-500 hover:text-red-400'
                                                    }`}
                                                >
                                                    <ThumbsDown className="w-4 h-4" />
                                                    No
                                                </button>
                                            </div>
                                            
                                            {/* Thank you message */}
                                            {feedback[faq.id] && (
                                                <p className="text-xs text-emerald-400 mt-2">
                                                    Thank you for your feedback!
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Still need help? */}
                <div className="mt-12 p-6 bg-gradient-to-r from-primary-600/10 to-sky-600/10 border border-primary-500/20 rounded-xl text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">
                        Still have questions?
                    </h3>
                    <p className="text-slate-400 mb-4">
                        Can't find the answer you're looking for? Our support team is here to help.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors"
                        >
                            <Mail className="w-4 h-4" />
                            Contact Support
                        </Link>
                        <button
                            onClick={handleChatClick}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Chat with ODUSBABA
                        </button>
                    </div>
                </div>
            </div>

            {/* Animation styles */}
            <style>{`
                @keyframes slide-down {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
