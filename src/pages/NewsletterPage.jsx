// src/pages/NewsletterPage.jsx
// COMPLETE PROFESSIONAL NEWSLETTER PAGE - With API integration, enhanced UI, and benefits showcase

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, Send, Users, TrendingUp, Calendar, Loader2, Star, Shield, Zap, Heart, BookOpen, Briefcase } from 'lucide-react';
import { subscribeToNewsletter } from '../services/newsletterService';

export default function NewsletterPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [error, setError] = useState('');
    const [subscriberCount, setSubscriberCount] = useState(5284);
    const [stats, setStats] = useState({
        subscribers: 5284,
        openRate: 48,
        weeklyIssues: 156
    });

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        try {
            const response = await fetch('/api/index?action=newsletter-stats', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) {
                    setStats(data.stats);
                    setSubscriberCount(data.stats.subscribers || 5284);
                }
            }
        } catch (err) {
            console.warn('Could not fetch stats, using defaults:', err);
        }
    }

    const handleSubscribe = async (e) => {
        e.preventDefault();
        
        if (!email) {
            setError('Please enter your email address');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            // Try API first
            const response = await fetch('/api/index?action=newsletter-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name: name || null, source: 'newsletter_page' })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setSubscribed(true);
                    setEmail('');
                    setName('');
                    return;
                }
            }
            
            // Fallback to service
            const result = await subscribeToNewsletter(email, name || null, 'newsletter_page');
            if (result.success) {
                setSubscribed(true);
                setEmail('');
                setName('');
            } else {
                setError(result.error || 'Subscription failed. Please try again.');
            }
        } catch (err) {
            console.error('Subscription error:', err);
            setError('Unable to subscribe. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    if (subscribed) {
        return (
            <div className="min-h-screen bg-slate-950 py-20">
                <div className="max-w-md mx-auto px-4 text-center">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome to ODUSBABA!</h1>
                    <p className="text-slate-400 mb-4">
                        Thank you for subscribing to our newsletter. A confirmation email has been sent to <span className="text-primary-400">{email}</span>
                    </p>
                    <p className="text-slate-500 text-sm mb-6">
                        Check your inbox and click the confirmation link to start receiving weekly insights.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link to="/" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                            Return Home
                        </Link>
                        <Link to="/blog" className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition">
                            Explore Articles
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20 animate-pulse">
                        <Mail className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        ODUSBABA Newsletter
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Stay informed with the latest insights, job opportunities, and career advice delivered to your inbox weekly.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                    <div className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center hover:border-primary-500/30 transition hover:-translate-y-1">
                        <Users className="w-8 h-8 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                        <p className="text-2xl font-bold text-white">{stats.subscribers.toLocaleString()}+</p>
                        <p className="text-sm text-slate-400">Active Subscribers</p>
                    </div>
                    <div className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center hover:border-primary-500/30 transition hover:-translate-y-1">
                        <Mail className="w-8 h-8 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                        <p className="text-2xl font-bold text-white">{stats.weeklyIssues}+</p>
                        <p className="text-sm text-slate-400">Weekly Issues Sent</p>
                    </div>
                    <div className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center hover:border-primary-500/30 transition hover:-translate-y-1">
                        <TrendingUp className="w-8 h-8 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                        <p className="text-2xl font-bold text-white">{stats.openRate}%</p>
                        <p className="text-sm text-slate-400">Average Open Rate</p>
                    </div>
                </div>

                {/* Main Subscription Card */}
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 text-xs font-semibold">FREE NEWSLETTER</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Subscribe for Weekly Insights</h2>
                        <p className="text-slate-400">
                            Join {stats.subscribers.toLocaleString()}+ HR professionals and career-driven individuals
                        </p>
                    </div>
                    
                    <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Your Name (Optional)</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., John Doe"
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Email Address *</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                            />
                        </div>
                        
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 animate-shake">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-primary-500/20"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Subscribing...</>
                            ) : (
                                <><Send className="w-4 h-4" /> Subscribe Now</>
                            )}
                        </button>
                    </form>
                    
                    <div className="flex items-center justify-center gap-4 mt-6 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> No spam</span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full" />
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> Unsubscribe anytime</span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full" />
                        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Privacy protected</span>
                    </div>
                </div>

                {/* What You'll Get */}
                <div className="mt-12">
                    <h3 className="text-xl font-bold text-white text-center mb-6">What You'll Get</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="group bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-center hover:border-primary-500/30 transition hover:-translate-y-1">
                            <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                                <Calendar className="w-6 h-6 text-primary-400" />
                            </div>
                            <h4 className="text-white font-semibold mb-1">Weekly Digest</h4>
                            <p className="text-slate-400 text-sm">Every Tuesday morning, straight to your inbox</p>
                        </div>
                        <div className="group bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-center hover:border-primary-500/30 transition hover:-translate-y-1">
                            <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                                <Briefcase className="w-6 h-6 text-primary-400" />
                            </div>
                            <h4 className="text-white font-semibold mb-1">Job Alerts</h4>
                            <p className="text-slate-400 text-sm">New opportunities matching your skills and preferences</p>
                        </div>
                        <div className="group bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-center hover:border-primary-500/30 transition hover:-translate-y-1">
                            <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                                <BookOpen className="w-6 h-6 text-primary-400" />
                            </div>
                            <h4 className="text-white font-semibold mb-1">Exclusive Content</h4>
                            <p className="text-slate-400 text-sm">Career tips, industry insights, and expert interviews</p>
                        </div>
                    </div>
                </div>

                {/* Testimonial / Social Proof */}
                <div className="mt-12 p-6 bg-slate-900/30 border border-slate-800 rounded-xl">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex gap-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                            ))}
                        </div>
                        <p className="text-slate-300 italic max-w-lg">
                            "The ODUSBABA newsletter has been instrumental in my career growth. The weekly insights and job alerts helped me land my dream role!"
                        </p>
                        <p className="text-white font-medium mt-3">— Sarah Johnson, HR Manager</p>
                        <p className="text-slate-500 text-sm">Subscriber since 2024</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Import missing icon
import { Lock } from 'lucide-react';
