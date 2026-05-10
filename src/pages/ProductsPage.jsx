// src/pages/ProductsPage.jsx
// Complete products page - Showcases all ODUSBABA offerings

import { Link } from 'react-router-dom';
import { 
    Briefcase, Users, BookOpen, FileText, Mail, Zap, Brain, 
    Shield, TrendingUp, Award, MessageCircle, ExternalLink, Star, CheckCircle
} from 'lucide-react';

const products = [
    { 
        name: 'Job Board', 
        description: 'Browse thousands of verified job opportunities from trusted employers across 7 countries.', 
        icon: Briefcase, 
        link: '/jobs', 
        color: 'from-blue-500/20 to-blue-600/20',
        features: ['AI job matching', 'Saved jobs', 'Job alerts'],
        featured: true
    },
    { 
        name: 'Workforce Marketplace', 
        description: 'Connect with verified professionals. Every skill is authenticated through AI and human review.', 
        icon: Users, 
        link: '/workforce', 
        color: 'from-emerald-500/20 to-emerald-600/20',
        features: ['Trust scores', 'Skill verification', 'Global talent'],
        featured: true
    },
    { 
        name: 'Courses', 
        description: 'AI-powered learning with certificates. Master new skills at your own pace.', 
        icon: BookOpen, 
        link: '/courses', 
        color: 'from-purple-500/20 to-purple-600/20',
        features: ['AI audio narration', 'Quizzes', 'Certificates'],
        featured: true
    },
    { 
        name: 'Books', 
        description: 'Expert knowledge at your fingertips. Download PDFs and read online.', 
        icon: BookOpen, 
        link: '/books', 
        color: 'from-amber-500/20 to-amber-600/20',
        features: ['PDF downloads', 'Featured titles', 'Expert authors']
    },
    { 
        name: 'Assessments', 
        description: '7 psychometric and skill evaluations to discover your strengths.', 
        icon: FileText, 
        link: '/assessments', 
        color: 'from-pink-500/20 to-pink-600/20',
        features: ['Personality tests', 'Skill gaps', 'Career matching'],
        featured: true
    },
    { 
        name: 'Newsletter', 
        description: 'Weekly career insights, job market trends, and expert advice delivered to your inbox.', 
        icon: Mail, 
        link: '/newsletter', 
        color: 'from-cyan-500/20 to-cyan-600/20',
        features: ['Weekly updates', 'Career tips', 'Free subscription']
    },
    { 
        name: 'Virtual Assistants', 
        description: '24 AI-powered task helpers for CV optimization, cover letters, LinkedIn makeover, and more.', 
        icon: Zap, 
        link: '/hire-va', 
        color: 'from-orange-500/20 to-orange-600/20',
        features: ['CV Optimizer', 'Cover Letter Writer', 'Salary Coach'],
        featured: true
    },
    { 
        name: 'ODUSBABA Chat', 
        description: 'AI career advisor available 24/7. Ask about jobs, CV tips, interview prep, or salary negotiation.', 
        icon: MessageCircle, 
        link: '#', 
        color: 'from-indigo-500/20 to-indigo-600/20',
        features: ['24/7 availability', 'Career advice', 'CV feedback'],
        isChat: true
    },
    { 
        name: 'Affiliate Program', 
        description: 'Earn commissions on referrals. Share ODUSBABA and get paid for every signup.', 
        icon: TrendingUp, 
        link: '/affiliate', 
        color: 'from-emerald-500/20 to-emerald-600/20',
        features: ['20% commission', 'Real-time tracking', 'Monthly payouts']
    },
    { 
        name: 'Fraud Protection', 
        description: 'Employer verification, fraud reporting, and legal disclaimers to keep you safe.', 
        icon: Shield, 
        link: '/legal/fraud-prevention', 
        color: 'from-red-500/20 to-red-600/20',
        features: ['Employer verification', 'Fraud reporting', 'Safety tips']
    },
    { 
        name: 'Certificates', 
        description: 'Earn verifiable certificates upon course completion. Share on LinkedIn.', 
        icon: Award, 
        link: '/learning', 
        color: 'from-yellow-500/20 to-yellow-600/20',
        features: ['Verified certificates', 'Shareable links', 'Course completion']
    }
];

export default function ProductsPage() {
    const handleChatClick = () => {
        const chatButton = document.querySelector('button[class*="fixed bottom-6 right-6"]');
        if (chatButton) chatButton.click();
    };

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                <div className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Explore All <span className="text-primary-400">ODUSBABA</span> Offerings
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Everything you need to advance your career, grow your workforce, and build trust
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product, idx) => (
                        <div
                            key={idx}
                            onClick={product.isChat ? handleChatClick : undefined}
                            className={`bg-gradient-to-br ${product.color} border border-slate-700 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-500/10 ${
                                product.isChat ? 'cursor-pointer' : ''
                            }`}
                        >
                            {!product.isChat ? (
                                <Link to={product.link}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                            <product.icon className="w-5 h-5 text-primary-400" />
                                        </div>
                                        {product.featured && (
                                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                                                <Star className="w-3 h-3" /> Featured
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">{product.name}</h3>
                                    <p className="text-slate-400 text-sm mb-3">{product.description}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {product.features?.slice(0, 2).map((feature, i) => (
                                            <span key={i} className="text-xs text-slate-500 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-emerald-500" /> {feature}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-3 text-primary-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Learn More <ExternalLink className="w-3 h-3" />
                                    </div>
                                </Link>
                            ) : (
                                <div className="cursor-pointer">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                            <product.icon className="w-5 h-5 text-primary-400" />
                                        </div>
                                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded-full">
                                            <MessageCircle className="w-3 h-3" /> Live
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">{product.name}</h3>
                                    <p className="text-slate-400 text-sm mb-3">{product.description}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {product.features?.slice(0, 2).map((feature, i) => (
                                            <span key={i} className="text-xs text-slate-500 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-emerald-500" /> {feature}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-3 text-primary-400 text-sm flex items-center gap-1">
                                        Click to Chat → <MessageCircle className="w-3 h-3" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-12 p-6 bg-gradient-to-r from-primary-900/20 to-slate-900 rounded-2xl text-center border border-primary-500/20">
                    <h2 className="text-2xl font-bold text-white mb-2">Not sure where to start?</h2>
                    <p className="text-slate-400 mb-4">Become a tester and explore all features for free</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link to="/tester-register" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                            Become a Tester →
                        </Link>
                        <Link to="/contact" className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition">
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
