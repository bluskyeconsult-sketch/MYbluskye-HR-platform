// src/pages/AboutPage.jsx
// CORRECTED - No Database references, pure frontend, robust content

import { Link } from 'react-router-dom';
import { 
    Shield, Brain, Users, Globe, Zap, Sparkles, 
    CheckCircle, Award, Heart, Star, Clock, Target, Eye,
    Briefcase, BookOpen, FileText, MessageCircle, ArrowRight
} from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-primary-950/30 py-20">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 text-sm">Creating Value for Partnership</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                        Welcome to{' '}
                        <span className="bg-gradient-to-r from-primary-400 to-sky-400 bg-clip-text text-transparent">
                            BluSkye Integrated Consult
                        </span>
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
                        Revolutionizing the way professionals connect, grow, and thrive in the modern workforce.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link to="/sign-up" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">
                            Join ODUSBABA <ArrowRight className="inline w-4 h-4 ml-1" />
                        </Link>
                        <Link to="/contact" className="px-6 py-3 border border-slate-600 text-slate-300 rounded-xl font-semibold hover:bg-slate-800 transition">
                            Contact Us
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mission & Vision */}
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                        <Target className="w-12 h-12 text-primary-400 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-3">Our Mission</h2>
                        <p className="text-slate-400">To create a transparent, trustworthy, AI-governed workforce ecosystem where verified skills meet genuine opportunities.</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                        <Eye className="w-12 h-12 text-primary-400 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-3">Our Vision</h2>
                        <p className="text-slate-400">A world where every professional's skills are recognized and valued, and every employer finds the perfect match with confidence.</p>
                    </div>
                </div>
            </div>

            {/* Value Pillars */}
            <div className="bg-slate-900/20 py-16">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">What Makes <span className="text-primary-400">ODUSBABA</span> Different</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: Brain, title: 'AI-Powered Intelligence', desc: 'ODUSBABA learns from every interaction to provide smarter recommendations.' },
                            { icon: Shield, title: 'Governed Trust', desc: 'Every skill verified through AI and human oversight for maximum reliability.' },
                            { icon: Users, title: 'Global Workforce', desc: 'Connect with professionals and employers from 7 countries worldwide.' },
                            { icon: Globe, title: '7 Countries', desc: 'UK, Nigeria, Ireland, Canada, US, Germany, Australia - with more coming.' },
                            { icon: Zap, title: 'Real-Time Matching', desc: 'Instant job and skill matching powered by advanced AI algorithms.' },
                            { icon: Heart, title: 'Value Partnership', desc: 'Creating Value for Partnership in every interaction and transaction.' }
                        ].map((item, i) => (
                            <div key={i} className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 hover:border-primary-500/30 transition">
                                <item.icon className="w-10 h-10 text-primary-400 mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-slate-400">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="max-w-7xl mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold text-white text-center mb-12">Everything You Need to Succeed</h2>
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
                    ].map((feature, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/30 rounded-xl">
                            <feature.icon className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-white font-medium">{feature.title}</h4>
                                <p className="text-slate-500 text-sm">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trust Indicators */}
            <div className="bg-slate-900/20 py-16">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-primary-400">98%</div>
                            <p className="text-white mt-2">User Satisfaction</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-primary-400">24/7</div>
                            <p className="text-white mt-2">AI Availability</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-primary-400">10k+</div>
                            <p className="text-white mt-2">Documents Generated</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Call to Action */}
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="bg-gradient-to-r from-primary-900/30 to-slate-900 rounded-2xl p-8 text-center border border-primary-500/20">
                    <h2 className="text-2xl font-bold text-white mb-4">Ready to Experience the Future of HR?</h2>
                    <p className="text-slate-400 mb-6">Join ODUSBABA today - FREE tier available</p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link to="/sign-up" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700">Get Started Free</Link>
                        <Link to="/tester-register" className="px-6 py-3 border border-primary-500 text-primary-500 rounded-xl font-semibold hover:bg-primary-500/10">Become a Tester</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
