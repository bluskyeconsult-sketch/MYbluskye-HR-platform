// src/pages/FAQPage.jsx
// COMPLETE PROFESSIONAL FAQ PAGE - With unified API, search, filters, and analytics tracking

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Search, ChevronDown, ChevronUp, HelpCircle, Mail, MessageCircle,
    ThumbsUp, ThumbsDown, BookOpen, Users, CreditCard, Shield, Bot, 
    FileText, Filter, Sparkles, TrendingUp, Award, Clock, Star,
    Loader2, AlertCircle
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
                    a: "Yes! We offer a free tier with basic features. Professional and employer plans start at $39.99/month. New users also get 4 weeks of free tester access, which includes unlimited assessments, course previews, and basic job matching features.",
                    keywords: ["free", "trial", "cost", "price"],
                    link: "/pricing",
                    popularity: 98
                },
                { 
                    q: "What is the tester program?", 
                    a: "Testers get 10 free uses and 30 days of full access to all features. Register with an invite code at /tester-register. Your feedback helps us improve!",
                    keywords: ["tester", "invite", "beta"],
                    link: "/tester-register",
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
                    a: "Jobs marked with 'Verified Source' come directly from government websites like Civil Service Jobs, USAJobs, and NHS Jobs. These are pre-approved and trustworthy.",
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
                    a: "Click the chat bubble in the bottom right corner. Ask about jobs, CV tips, interview preparation, salary negotiation, or career advice. Free users get 5 messages, registered users get 20.",
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
                    a: "When your credits are low, a notification will appear in chat. Click 'Purchase Credits' to buy more. Professional plan includes 100 messages/month.",
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
                    a: "Yes! Our AI generates audio narration for every lesson. You can listen while reading. Adjust playback speed in the audio player.",
                    keywords: ["audio", "narration", "listen", "playback"],
                    link: "/courses",
                    popularity: 89
                },
                { 
                    q: "How do I get my certificate?", 
                    a: "Complete all lessons and pass the final quiz with 70% or higher. Your certificate will be available for download in the learner dashboard at /learning.",
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
                },
                { 
                    q: "How does geo-pricing work?", 
                    a: "Prices are adjusted based on your country. Tier 1 (US, UK, CA, AU, DE) pay standard price. Tier 5 (Nigeria, India, Kenya) pay 65% less.",
                    keywords: ["geo", "regional", "pricing", "country"],
                    link: "/pricing",
                    popularity: 85
                }
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
    const handleFeedback = useCallback(async (faqId, faqTitle, helpful) => {
        setFeedback(prev => ({ ...prev, [faqId]: helpful }));
        
        // Send feedback via unified API
        try {
            await apiCall('faq-feedback', {
                faq_id: faqId,
                faq_title: faqTitle,
                helpful,
                timestamp: new Date().toISOString()
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

// Missing import
import { ChevronRight } from 'lucide-react';
