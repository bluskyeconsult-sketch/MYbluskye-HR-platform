// src/pages/ProductsPage.jsx
// COMPLETE PRODUCTS PAGE - Showcases all ODUSBABA offerings (No external dependencies)

import { Link } from 'react-router-dom';

const products = [
    { 
        name: 'Job Board', 
        description: 'Browse thousands of verified job opportunities from trusted employers across 7 countries.', 
        icon: '💼',
        link: '/jobs', 
        color: 'from-blue-500/20 to-blue-600/20',
        features: ['AI job matching', 'Saved jobs', 'Job alerts'],
        featured: true
    },
    { 
        name: 'Workforce Marketplace', 
        description: 'Connect with verified professionals. Every skill is authenticated through AI and human review.', 
        icon: '🤝',
        link: '/workforce', 
        color: 'from-emerald-500/20 to-emerald-600/20',
        features: ['Trust scores', 'Skill verification', 'Global talent'],
        featured: true
    },
    { 
        name: 'Courses', 
        description: 'AI-powered learning with certificates. Master new skills at your own pace.', 
        icon: '📚',
        link: '/courses', 
        color: 'from-purple-500/20 to-purple-600/20',
        features: ['AI audio narration', 'Quizzes', 'Certificates'],
        featured: true
    },
    { 
        name: 'Books', 
        description: 'Expert knowledge at your fingertips. Download PDFs and read online.', 
        icon: '📖',
        link: '/books', 
        color: 'from-amber-500/20 to-amber-600/20',
        features: ['PDF downloads', 'Featured titles', 'Expert authors']
    },
    { 
        name: 'Assessments', 
        description: '7 psychometric and skill evaluations to discover your strengths.', 
        icon: '📊',
        link: '/assessments', 
        color: 'from-pink-500/20 to-pink-600/20',
        features: ['Personality tests', 'Skill gaps', 'Career matching'],
        featured: true
    },
    { 
        name: 'Newsletter', 
        description: 'Weekly career insights, job market trends, and expert advice delivered to your inbox.', 
        icon: '📧',
        link: '/newsletter', 
        color: 'from-cyan-500/20 to-cyan-600/20',
        features: ['Weekly updates', 'Career tips', 'Free subscription']
    },
    { 
        name: 'Virtual Assistants', 
        description: '24 AI-powered task helpers for CV optimization, cover letters, LinkedIn makeover, and more.', 
        icon: '🤖',
        link: '/hire-va', 
        color: 'from-orange-500/20 to-orange-600/20',
        features: ['CV Optimizer', 'Cover Letter Writer', 'Salary Coach'],
        featured: true
    },
    { 
        name: 'ODUSBABA Chat', 
        description: 'AI career advisor available 24/7. Ask about jobs, CV tips, interview prep, or salary negotiation.', 
        icon: '💬',
        link: '#', 
        color: 'from-indigo-500/20 to-indigo-600/20',
        features: ['24/7 availability', 'Career advice', 'CV feedback'],
        isChat: true
    },
    { 
        name: 'Affiliate Program', 
        description: 'Earn commissions on referrals. Share ODUSBABA and get paid for every signup.', 
        icon: '💰',
        link: '/affiliate', 
        color: 'from-emerald-500/20 to-emerald-600/20',
        features: ['20% commission', 'Real-time tracking', 'Monthly payouts']
    },
    { 
        name: 'Fraud Protection', 
        description: 'Employer verification, fraud reporting, and legal disclaimers to keep you safe.', 
        icon: '🛡️',
        link: '/legal/fraud-prevention', 
        color: 'from-red-500/20 to-red-600/20',
        features: ['Employer verification', 'Fraud reporting', 'Safety tips']
    },
    { 
        name: 'Certificates', 
        description: 'Earn verifiable certificates upon course completion. Share on LinkedIn.', 
        icon: '🎓',
        link: '/learning', 
        color: 'from-yellow-500/20 to-yellow-600/20',
        features: ['Verified certificates', 'Shareable links', 'Course completion']
    }
];

// Star Icon Component (Inline SVG)
const StarIcon = () => (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

// CheckCircle Icon Component (Inline SVG)
const CheckCircleIcon = () => (
    <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// ExternalLink Icon Component (Inline SVG)
const ExternalLinkIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
);

// MessageCircle Icon Component (Inline SVG)
const MessageCircleIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

export default function ProductsPage() {
    const handleChatClick = () => {
        const chatButton = document.querySelector('button[class*="fixed bottom-6 right-6"]');
        if (chatButton) chatButton.click();
    };

    return (
        <div className="min-h-screen bg-slate-950 py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header Section */}
                <div className="text-center mb-12 md:mb-16">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 mb-4">
                        <span className="text-primary-400 text-sm font-medium">OUR ECOSYSTEM</span>
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                        Explore All <span className="text-primary-400">ODUSBABA</span> Offerings
                    </h1>
                    <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto">
                        Everything you need to advance your career, grow your workforce, and build trust
                    </p>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                    {products.map((product, idx) => (
                        <div
                            key={idx}
                            onClick={product.isChat ? handleChatClick : undefined}
                            className={`group bg-gradient-to-br ${product.color} border border-slate-700 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-500/10 ${
                                product.isChat ? 'cursor-pointer' : ''
                            }`}
                        >
                            {!product.isChat ? (
                                <Link to={product.link}>
                                    {/* Header with Icon and Featured Badge */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-2xl">
                                            {product.icon}
                                        </div>
                                        {product.featured && (
                                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                                                <StarIcon /> Featured
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                                        {product.name}
                                    </h3>
                                    
                                    {/* Description */}
                                    <p className="text-slate-400 text-sm mb-3 leading-relaxed">
                                        {product.description}
                                    </p>
                                    
                                    {/* Features */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {product.features?.slice(0, 2).map((feature, i) => (
                                            <span key={i} className="text-xs text-slate-500 flex items-center gap-1">
                                                <CheckCircleIcon /> {feature}
                                            </span>
                                        ))}
                                        {product.features?.length > 2 && (
                                            <span className="text-xs text-slate-500">
                                                +{product.features.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Learn More Link */}
                                    <div className="mt-3 text-primary-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Learn More <ExternalLinkIcon />
                                    </div>
                                </Link>
                            ) : (
                                <div className="cursor-pointer">
                                    {/* Header for Chat */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-2xl">
                                            {product.icon}
                                        </div>
                                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded-full">
                                            <MessageCircleIcon /> Live
                                        </span>
                                    </div>
                                    
                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-white mb-2">
                                        {product.name}
                                    </h3>
                                    
                                    {/* Description */}
                                    <p className="text-slate-400 text-sm mb-3 leading-relaxed">
                                        {product.description}
                                    </p>
                                    
                                    {/* Features */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {product.features?.slice(0, 2).map((feature, i) => (
                                            <span key={i} className="text-xs text-slate-500 flex items-center gap-1">
                                                <CheckCircleIcon /> {feature}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    {/* Chat CTA */}
                                    <div className="mt-3 text-primary-400 text-sm flex items-center gap-1">
                                        Click to Chat → <MessageCircleIcon />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="mt-12 md:mt-16 p-6 md:p-8 bg-gradient-to-r from-primary-900/20 to-slate-900 rounded-2xl text-center border border-primary-500/20">
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                        Not sure where to start?
                    </h2>
                    <p className="text-slate-400 mb-4">
                        Become a tester and explore all features for free
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link 
                            to="/tester-register" 
                            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-primary-500/20"
                        >
                            Become a Tester →
                        </Link>
                        <Link 
                            to="/contact" 
                            className="px-6 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 hover:border-slate-500 transition-all duration-200"
                        >
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
