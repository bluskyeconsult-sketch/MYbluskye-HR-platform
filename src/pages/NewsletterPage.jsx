// src/pages/NewsletterPage.jsx
// ODUSBABA NEWSLETTER PAGE v3.0 - PRODUCTION READY
// ✅ Professional newsletter subscription with preferences
// ✅ Stats display, benefits showcase, testimonial
// ✅ Enhanced UI with preference toggles
// ✅ Complete error handling and success states
//
// FIXED (2026-08-23):
// 1. Initial stats state hardcoded specific fake numbers (5284
//    subscribers, 68% open rate, 156 weekly issues) — shown briefly on
//    every load before the real fetch resolves. The real, already-fixed
//    backend (newsletter-stats) correctly returns a genuine subscriber
//    count but honestly returns null for openRate/weeklyIssues, since
//    no real tracking for either exists — but this page was never
//    updated to handle that, so after the real (honest) data arrived,
//    it would literally render "null+ Weekly Issues Sent" and "null%
//    Average Open Rate" on screen. Now starts at null/loading and hides
//    the two untracked stat cards entirely rather than fabricate or
//    show broken values.
// 2. Removed a specific named testimonial ("Sarah Johnson, HR Manager...
//    Subscriber since 2024") — unverifiable, specific-sounding
//    attributed content, the same category of fabricated social proof
//    already found and removed elsewhere this session (AboutPage.jsx's
//    own header documents the same standard being applied there).

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Mail, CheckCircle, AlertCircle, Send, Users, TrendingUp, 
    Loader2, Star, Shield, Zap, Heart, BookOpen, Briefcase, 
    Calendar, Bell, Award, Lock
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/index';

// ============================================
// MAIN COMPONENT
// ============================================

export default function NewsletterPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({
        subscribers: null,
        openRate: null,
        weeklyIssues: null
    });
    const [preferences, setPreferences] = useState({
        jobs: true,
        courses: true,
        assessments: true,
        products: false
    });

    // ============================================
    // FETCH STATS
    // ============================================

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        try {
            const response = await fetch(`${API_BASE}?action=newsletter-stats`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) {
                    setStats(data.stats);
                }
            }
        } catch (err) {
            console.warn('Could not fetch stats, using defaults:', err);
        }
    }

    // ============================================
    // PREFERENCES
    // ============================================

    const togglePreference = (key) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // ============================================
    // SUBSCRIBE (Unified API)
    // ============================================

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
            // ✅ Using unified API endpoint
            const response = await fetch(`${API_BASE}?action=newsletter-subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    name: name || null, 
                    preferences,
                    source: 'newsletter_page' 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSubscribed(true);
                setEmail('');
                setName('');
            } else {
                setError(data.message || data.error || 'Subscription failed. Please try again.');
            }
        } catch (err) {
            console.error('Subscription error:', err);
            setError('Unable to subscribe. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // SUCCESS SCREEN
    // ============================================

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

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
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
                {/* FIXED (2026-08-23): weeklyIssues/openRate are honestly
                    null from the real backend (nothing tracks either yet)
                    — only render a stat card when there's a real number
                    to show, rather than display "null". */}
                <div className={`grid grid-cols-1 ${stats.subscribers !== null ? 'sm:grid-cols-1 max-w-xs mx-auto' : ''} gap-4 mb-12`}>
                    {stats.subscribers !== null && (
                        <div className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center hover:border-primary-500/30 transition hover:-translate-y-1">
                            <Users className="w-8 h-8 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <p className="text-2xl font-bold text-white">{stats.subscribers.toLocaleString()}+</p>
                            <p className="text-sm text-slate-400">Active Subscribers</p>
                        </div>
                    )}
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
                            {stats.subscribers !== null
                                ? `Join ${stats.subscribers.toLocaleString()}+ HR professionals and career-driven individuals`
                                : 'Join HR professionals and career-driven individuals'}
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

                        {/* Preferences Section */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-400 mb-3">
                                What would you like to receive?
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { key: 'jobs', icon: Briefcase, label: 'New Jobs', description: 'Weekly job alerts' },
                                    { key: 'courses', icon: BookOpen, label: 'Courses & Learning', description: 'New course announcements' },
                                    { key: 'assessments', icon: Award, label: 'Assessments', description: 'New skill assessments' },
                                    { key: 'products', icon: Zap, label: 'Product Updates', description: 'New features and tools' }
                                ].map(item => {
                                    const Icon = item.icon;
                                    const isSelected = preferences[item.key];
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => togglePreference(item.key)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                isSelected 
                                                    ? 'border-primary-500 bg-primary-500/10' 
                                                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                            }`}
                                        >
                                            <Icon className={`w-5 h-5 ${isSelected ? 'text-primary-400' : 'text-slate-500'}`} />
                                            <div className="text-left">
                                                <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>{item.label}</p>
                                                <p className="text-xs text-slate-500">{item.description}</p>
                                            </div>
                                            {isSelected && <CheckCircle className="w-4 h-4 text-primary-400 ml-auto" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
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
                                <><Bell className="w-4 h-4" /> Subscribe Now</>
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

                {/* FIXED (2026-08-23): removed a specific named testimonial
                    ("Sarah Johnson, HR Manager... Subscriber since 2024")
                    — unverifiable, specific-sounding attributed content,
                    the same category already found and removed elsewhere
                    this session. Replaced with an honest value statement
                    instead of an invented quote. */}
                <div className="mt-12 p-6 bg-slate-900/30 border border-slate-800 rounded-xl">
                    <div className="flex flex-col items-center text-center">
                        <Mail className="w-8 h-8 text-primary-400 mb-3" />
                        <p className="text-slate-300 max-w-lg">
                            Real career insights, real job opportunities, delivered weekly — no spam, unsubscribe anytime.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
