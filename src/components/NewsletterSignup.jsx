// src/components/NewsletterSignup.jsx
// ENHANCED NEWSLETTER SIGNUP - With stats, animations, and no external dependencies

import { useState, useEffect } from 'react';

export default function NewsletterSignup() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ subscribers: 5124, openRate: 68 });
    const [statsLoaded, setStatsLoaded] = useState(false);

    useEffect(() => {
        // Fetch stats from API with fallback
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/index?action=newsletter-stats', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.stats) {
                        setStats(prev => ({ ...prev, ...data.stats }));
                    }
                }
            } catch (error) {
                console.error('Stats fetch error:', error);
                // Keep default stats, don't break UI
            } finally {
                setStatsLoaded(true);
            }
        };
        
        fetchStats();
    }, []);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        
        if (!email) {
            setStatus({ type: 'error', message: 'Email address is required' });
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setStatus({ type: 'error', message: 'Please enter a valid email address' });
            return;
        }
        
        setLoading(true);
        setStatus(null);
        
        try {
            const response = await fetch('/api/index?action=newsletter-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name: name.trim() || null })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setStatus({ type: 'success', message: '🎉 Successfully subscribed! Check your inbox for confirmation.' });
                setEmail('');
                setName('');
                // Optimistically update subscriber count
                setStats(prev => ({ ...prev, subscribers: prev.subscribers + 1 }));
            } else {
                setStatus({ type: 'error', message: data.error || 'Subscription failed. Please try again.' });
            }
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            setStatus({ type: 'error', message: 'Network error. Please check your connection and try again.' });
        } finally {
            setLoading(false);
            
            // Auto-clear success message after 5 seconds
            if (status?.type === 'success') {
                setTimeout(() => setStatus(null), 5000);
            }
        }
    };

    const benefits = [
        { icon: '📧', text: 'Weekly Career Insights' },
        { icon: '💼', text: 'Latest Job Alerts' },
        { icon: '🎓', text: 'Free Course Updates' },
        { icon: '🏆', text: 'Exclusive Content' }
    ];

    return (
        <div className="bg-gradient-to-br from-primary-600/5 via-slate-900 to-sky-600/5 py-12 md:py-16 mt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header Section */}
                <div className="text-center mb-10">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 mb-4">
                        <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-primary-400 text-sm font-medium">Stay Connected</span>
                    </div>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        Subscribe to the <span className="text-primary-400">ODUSBABA</span> Newsletter
                    </h2>
                    <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
                        Join thousands of professionals getting weekly career insights, job opportunities, and expert advice
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-10 max-w-3xl mx-auto">
                    <div className="text-center p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1">
                        <div className="text-2xl md:text-3xl font-bold text-primary-400">
                            {stats.subscribers.toLocaleString()}+
                        </div>
                        <div className="text-slate-400 text-xs md:text-sm mt-1">Active Subscribers</div>
                        <div className="w-12 h-0.5 bg-primary-500/30 mx-auto mt-2"></div>
                    </div>
                    <div className="text-center p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1">
                        <div className="text-2xl md:text-3xl font-bold text-primary-400">
                            Weekly
                        </div>
                        <div className="text-slate-400 text-xs md:text-sm mt-1">Every Tuesday</div>
                        <div className="w-12 h-0.5 bg-primary-500/30 mx-auto mt-2"></div>
                    </div>
                    <div className="text-center p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1">
                        <div className="text-2xl md:text-3xl font-bold text-primary-400">
                            {stats.openRate}%
                        </div>
                        <div className="text-slate-400 text-xs md:text-sm mt-1">Open Rate</div>
                        <div className="w-12 h-0.5 bg-primary-500/30 mx-auto mt-2"></div>
                    </div>
                </div>

                {/* Benefits Row */}
                <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
                    {benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-300 text-sm">
                            <span className="text-lg">{benefit.icon}</span>
                            <span>{benefit.text}</span>
                        </div>
                    ))}
                </div>

                {/* Subscription Form */}
                <div className="max-w-md mx-auto">
                    <form onSubmit={handleSubscribe} className="space-y-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name (optional)"
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                            />
                        </div>
                        
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Your email address *"
                                required
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg hover:from-primary-700 hover:to-primary-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-primary-500/20 hover:shadow-xl hover:scale-[1.02] transform"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Subscribing...
                                </span>
                            ) : (
                                'Subscribe Now →'
                            )}
                        </button>
                    </form>
                    
                    {/* Status Message */}
                    {status && (
                        <div className={`mt-3 p-2 rounded-lg text-center text-sm ${
                            status.type === 'success' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                            {status.message}
                        </div>
                    )}
                    
                    {/* Privacy Note */}
                    <div className="text-center mt-4">
                        <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            We respect your privacy. Unsubscribe at any time.
                        </p>
                    </div>
                </div>

                {/* Social Proof */}
                <div className="mt-8 text-center">
                    <div className="flex justify-center -space-x-2">
                        {[1, 2, 3, 4].map((_, idx) => (
                            <div key={idx} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs">
                                {String.fromCharCode(65 + idx)}
                            </div>
                        ))}
                    </div>
                    <p className="text-slate-500 text-xs mt-2">
                        Trusted by professionals worldwide
                    </p>
                </div>
            </div>
        </div>
    );
}
