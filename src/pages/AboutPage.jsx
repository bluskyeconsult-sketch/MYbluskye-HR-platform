// src/pages/AboutPage.jsx
// COMPLETE About Us page - Value-driven, professional, compelling

import { Link } from 'react-router-dom';
import { 
    Shield, Brain, Users, Globe, Zap, Sparkles, 
    CheckCircle, Award, TrendingUp, Heart, Star, 
    Clock, Building2, ClipboardCheck, Handshake,
    ArrowRight, Quote, Rocket, Target, Eye
} from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-primary-950/30">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-20 left-10 w-64 h-64 bg-primary-500 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary-400 rounded-full blur-3xl animate-pulse delay-1000" />
                </div>
                
                <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 sm:py-28 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 text-sm font-medium">Creating Value for Partnership</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
                            Welcome to{' '}
                            <span className="bg-gradient-to-r from-primary-400 to-sky-400 bg-clip-text text-transparent">
                                BluSkye Integrated Consult
                            </span>
                        </h1>
                        <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
                            We're revolutionizing the way professionals connect, grow, and thrive in the modern workforce.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Link to="/sign-up" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all hover:scale-105">
                                Join ODUSBABA <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 border border-slate-600 text-slate-300 rounded-xl font-semibold hover:bg-slate-800 transition-all">
                                Contact Us
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mission & Vision Section */}
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-primary-500/30 transition-all">
                        <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center mb-5">
                            <Target className="w-7 h-7 text-primary-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Our Mission</h2>
                        <p className="text-slate-400 leading-relaxed">
                            To create a transparent, trustworthy, and AI-governed workforce ecosystem where verified skills meet genuine opportunities. We empower professionals to showcase their authentic abilities and enable employers to hire with confidence.
                        </p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-primary-500/30 transition-all">
                        <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-5">
                            <Eye className="w-7 h-7 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Our Vision</h2>
                        <p className="text-slate-400 leading-relaxed">
                            A world where every professional's skills are recognized and valued, and where every employer finds the perfect match with complete confidence and security.
                        </p>
                    </div>
                </div>
            </div>

            {/* The Problem We Solve */}
            <div className="bg-slate-900/20 border-y border-slate-800 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">The Challenge We're Solving</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            The traditional HR landscape is broken. We're fixing it with intelligence, trust, and partnership.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                            <h3 className="text-xl font-semibold text-red-400 mb-3">❌ The Old Way</h3>
                            <ul className="space-y-3 text-slate-400">
                                <li className="flex items-start gap-2">• Unverified skills and fake credentials</li>
                                <li className="flex items-start gap-2">• Fraudulent job postings and scams</li>
                                <li className="flex items-start gap-2">• Wasted time on mismatched candidates</li>
                                <li className="flex items-start gap-2">• No transparency in pricing or verification</li>
                                <li className="flex items-start gap-2">• Limited access to global talent</li>
                            </ul>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
                            <h3 className="text-xl font-semibold text-emerald-400 mb-3">✅ The ODUSBABA Way</h3>
                            <ul className="space-y-3 text-slate-400">
                                <li className="flex items-start gap-2">• AI-verified skills with Trust Scores</li>
                                <li className="flex items-start gap-2">• Employer verification and fraud protection</li>
                                <li className="flex items-start gap-2">• Intelligent matching powered by AI</li>
                                <li className="flex items-start gap-2">• Transparent geo-pricing for fair access</li>
                                <li className="flex items-start gap-2">• Connect with professionals across 7 countries</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Value Proposition Pillars */}
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">What Makes <span className="text-primary-400">ODUSBABA</span> Different</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Six pillars that redefine the workforce experience
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { icon: Brain, title: 'AI-Powered Intelligence', desc: 'ODUSBABA learns from every interaction to provide smarter recommendations and personalized career guidance.', color: 'from-purple-500/20 to-purple-600/20' },
                        { icon: Shield, title: 'Governed Trust', desc: 'Every skill is verified through AI and human oversight. Trust Scores reflect authentic capabilities.', color: 'from-blue-500/20 to-blue-600/20' },
                        { icon: Users, title: 'Global Workforce', desc: 'Connect with professionals and employers from 7 countries, with more coming soon.', color: 'from-emerald-500/20 to-emerald-600/20' },
                        { icon: Globe, title: '7 Countries', desc: 'UK, Nigeria, Ireland, Canada, US, Germany, Australia - with intelligent geo-pricing for fair access.', color: 'from-cyan-500/20 to-cyan-600/20' },
                        { icon: Zap, title: 'Real-Time Matching', desc: 'Instant job and skill matching powered by advanced AI algorithms that learn your preferences.', color: 'from-amber-500/20 to-amber-600/20' },
                        { icon: Handshake, title: 'Value Partnership', desc: 'Creating Value for Partnership in every interaction - we succeed when you succeed.', color: 'from-emerald-500/20 to-emerald-600/20' }
                    ].map((pillar, idx) => (
                        <div key={idx} className={`bg-gradient-to-br ${pillar.color} border border-slate-700 rounded-xl p-6 hover:-translate-y-1 transition-all duration-300`}>
                            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
                                <pillar.icon className="w-6 h-6 text-primary-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{pillar.title}</h3>
                            <p className="text-slate-400">{pillar.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Our Features - Comprehensive List */}
            <div className="bg-slate-900/20 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">Everything You Need to Succeed</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            A complete ecosystem for career growth and talent acquisition
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { icon: Briefcase, title: 'Job Board', desc: 'Browse 1,000+ verified jobs' },
                            { icon: Users, title: 'Workforce Market', desc: 'Find verified professionals' },
                            { icon: BookOpen, title: 'AI Courses', desc: 'Learn with audio narration' },
                            { icon: FileText, title: 'Assessments', desc: '7 psychometric tests' },
                            { icon: Zap, title: '24 Virtual Assistants', desc: 'AI-powered task helpers' },
                            { icon: MessageCircle, title: 'AI Career Chat', desc: '24/7 career advice' },
                            { icon: Shield, title: 'Fraud Protection', desc: 'Employer verification' },
                            { icon: Award, title: 'Certificates', desc: 'Verified credentials' }
                        ].map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3">
                                <feature.icon className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-white font-medium">{feature.title}</h4>
                                    <p className="text-slate-500 text-sm">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Testimonials / Trust Indicators */}
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">Trusted by Professionals Worldwide</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Join thousands who have transformed their careers with ODUSBABA
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center">
                        <div className="text-4xl font-bold text-primary-400 mb-2">98%</div>
                        <p className="text-white font-medium">User Satisfaction</p>
                        <p className="text-slate-500 text-sm">Based on tester feedback</p>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center">
                        <div className="text-4xl font-bold text-primary-400 mb-2">24/7</div>
                        <p className="text-white font-medium">AI Availability</p>
                        <p className="text-slate-500 text-sm">Always-on support</p>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center">
                        <div className="text-4xl font-bold text-primary-400 mb-2">10k+</div>
                        <p className="text-white font-medium">Documents Generated</p>
                        <p className="text-slate-500 text-sm">CVs, letters, and more</p>
                    </div>
                </div>
            </div>

            {/* The Value Promise */}
            <div className="bg-gradient-to-r from-emerald-900/20 to-primary-900/20 py-16 border-y border-emerald-500/20">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <Quote className="w-12 h-12 text-emerald-400 mx-auto mb-4 opacity-50" />
                    <p className="text-xl md:text-2xl text-white font-medium italic mb-6">
                        "We don't just connect people with jobs. We build lasting partnerships based on trust, verification, and shared success."
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <Heart className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Creating Value for Partnership</span>
                    </div>
                </div>
            </div>

            {/* Call to Action */}
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-r from-primary-900/30 to-slate-900 rounded-2xl p-8 text-center border border-primary-500/20">
                    <h2 className="text-2xl font-bold text-white mb-4">Ready to Experience the Future of HR?</h2>
                    <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
                        Join ODUSBABA today and discover how AI-powered governance can transform your career or hiring process.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link to="/sign-up" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all">
                            Get Started Free
                        </Link>
                        <Link to="/tester-register" className="px-6 py-3 border border-primary-500 text-primary-500 rounded-xl font-semibold hover:bg-primary-500/10 transition-all">
                            Become a Tester
                        </Link>
                        <Link to="/contact" className="px-6 py-3 border border-slate-600 text-slate-300 rounded-xl font-semibold hover:bg-slate-800 transition-all">
                            Contact Sales
                        </Link>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">
                        Free tier available • No credit card required • 14-day money-back guarantee
                    </p>
                </div>
            </div>
        </div>
    );
}
