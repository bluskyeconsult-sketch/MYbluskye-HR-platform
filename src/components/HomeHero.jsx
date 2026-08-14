// src/components/HomeHero.jsx - UNIFIED & OPTIMIZED FOR MOBILE
// ODUSBABA HOME HERO - Mobile-First with Dynamic Stats
//
// FIXED (2026-08-07): the main stat grid was already rewired to process
// claims (100% Verified, 24/7, Governed & Protected) plus a real jobsPosted
// count, resolving the earlier flag about permanently fake "Confidence"/
// "Impact" numbers on a trust-sensitive platform. This pass fixes the same
// problem in the "Trusted By" section further down, which still had three
// fabricated numbers (500+ Active Users, 100+ Companies, 4.8/5 Rating) —
// "Active Users" now uses the real activeUsers count already fetched here;
// the other two (no real backing data exists for either) are replaced with
// honest, non-numeric claims instead of invented figures.

import { useState, useEffect } from 'react';

export default function HomeHero() {
    const [stats, setStats] = useState({
        jobsPosted: 0,
        earlyMembers: 2,
        loading: true
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Using unified API
                const response = await fetch('/api/index?action=homepage-stats');
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.stats) {
                    setStats(prevStats => ({
                        ...prevStats,
                        ...data.stats,
                        loading: false
                    }));
                } else {
                    setStats(prev => ({ ...prev, loading: false }));
                }
            } catch (error) {
                console.error('Stats fetch error:', error);
                // Keep default stats, don't break the UI
                setStats(prev => ({ ...prev, loading: false }));
            }
        };
        
        fetchStats();
    }, []);

    // Calculate remaining spots safely
    const remainingSpots = Math.max(0, 100 - (stats.earlyMembers || 0));
    const earlyMembersText = stats.earlyMembers !== undefined ? `${remainingSpots} SPOTS LEFT` : 'EARLY ACCESS';

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Background Pattern - Optimized for mobile */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-48 sm:w-72 h-48 sm:h-72 bg-primary-500 rounded-full filter blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-sky-500 rounded-full filter blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
                
                {/* Early Access Badge - Responsive */}
                <div className="flex justify-center mb-4 sm:mb-6">
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 sm:px-4 sm:py-1.5">
                        <span className="text-amber-400 text-xs sm:text-sm font-medium">
                            EARLY ACCESS · {stats.loading ? '...' : (remainingSpots !== 100 ? `${remainingSpots} SPOTS LEFT` : earlyMembersText)}
                        </span>
                    </div>
                </div>

                {/* Main Heading - Fully Responsive */}
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 leading-tight">
                        BluSkye Integrated Consult
                        <span className="block text-primary-400 text-xl sm:text-2xl md:text-3xl mt-2">
                            powered by ODUSBABA intelligence
                        </span>
                    </h1>
                    
                    <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-2 sm:mb-3">
                        The Governed Workforce Platform. Verified skills. Trusted hiring.
                    </p>
                    <p className="text-slate-400 text-sm sm:text-base italic">
                        "An Experience of Value and solution to possible HR realities."
                    </p>
                    
                    {/* CTA Buttons - Responsive Stack on Mobile */}
                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
                        <a 
                            href="/jobs" 
                            className="px-6 sm:px-8 py-2.5 sm:py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-primary-500/20 text-center text-sm sm:text-base"
                        >
                            Browse Jobs
                        </a>
                        <a 
                            href="/workforce" 
                            className="px-6 sm:px-8 py-2.5 sm:py-3 border border-slate-600 text-white rounded-xl hover:bg-slate-800 hover:border-slate-500 transition-all duration-200 text-center text-sm sm:text-base"
                        >
                            Workforce Market
                        </a>
                        <a 
                            href="/tester-register" 
                            className="px-6 sm:px-8 py-2.5 sm:py-3 border border-amber-500/50 text-amber-400 rounded-xl hover:bg-amber-500/10 hover:border-amber-500 transition-all duration-200 text-center text-sm sm:text-base"
                        >
                            Become a Tester
                        </a>
                    </div>
                </div>

                {/* Stats Grid - 2x2 on mobile, 4x1 on desktop */}
                {/* FIXED (2026-08-07): "Confidence 98%" and "Impact 10k+" were
                    permanently hardcoded, disconnected numbers — the two
                    riskiest kinds of stat for an early-stage platform whose
                    entire brand is built on verification and trust. Replaced
                    with process/quality claims that are true regardless of
                    scale, matching the Stay Safe / Fraud Prevention language
                    used elsewhere on the site. "Verified Jobs" now pulls the
                    real jobsPosted count from homepage-stats instead of a
                    fake number. "24/7 Availability" is unchanged — it was
                    already an honest process claim, not a volume claim. */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mt-12 sm:mt-16">
                    {/* AI + Human Verified */}
                    <div className="text-center p-3 sm:p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                        <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-400">
                            100%
                        </div>
                        <div className="text-slate-400 text-xs sm:text-sm mt-1">VERIFIED</div>
                        <div className="text-[10px] sm:text-xs text-slate-500">AI + Human Verified</div>
                    </div>

                    {/* Availability */}
                    <div className="text-center p-3 sm:p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                        <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-400">
                            24/7
                        </div>
                        <div className="text-slate-400 text-xs sm:text-sm mt-1">AVAILABILITY</div>
                        <div className="text-[10px] sm:text-xs text-slate-500">24/7 AI-Powered Support</div>
                    </div>

                    {/* Governed & Fraud-Protected */}
                    <div className="text-center p-3 sm:p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                        <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-400">
                            Governed
                        </div>
                        <div className="text-slate-400 text-xs sm:text-sm mt-1">& PROTECTED</div>
                        <div className="text-[10px] sm:text-xs text-slate-500">Fraud-Protected Platform</div>
                    </div>

                    {/* Verified Jobs — now real */}
                    <div className="text-center p-3 sm:p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                        <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-400">
                            {stats.loading ? '...' : `${stats.jobsPosted || 0}+`}
                        </div>
                        <div className="text-slate-400 text-xs sm:text-sm mt-1">Verified Jobs</div>
                        <div className="text-[10px] sm:text-xs text-slate-500">From trusted employers</div>
                    </div>
                </div>

                {/* Tester Card - Fully Responsive */}
                <div className="mt-8 sm:mt-12 bg-gradient-to-r from-primary-600/20 to-sky-600/20 border border-primary-500/30 rounded-2xl p-4 sm:p-6 text-center backdrop-blur-sm">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Free Tester Access</h3>
                    <p className="text-slate-300 text-sm sm:text-base mb-4">Get 4 weeks of full platform access as a tester. No credit card required.</p>
                    
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                        <span className="flex items-center gap-1.5 sm:gap-2 text-slate-300 text-xs sm:text-sm">
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            24/7 AI Support
                        </span>
                        <span className="flex items-center gap-1.5 sm:gap-2 text-slate-300 text-xs sm:text-sm">
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            100% Free
                        </span>
                        <span className="flex items-center gap-1.5 sm:gap-2 text-slate-300 text-xs sm:text-sm">
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            No Card Required
                        </span>
                    </div>

                    <a 
                        href="/tester-register" 
                        className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-amber-500 text-slate-900 font-semibold rounded-xl hover:bg-amber-400 transition-all duration-200 hover:scale-105 shadow-lg shadow-amber-500/20 text-sm sm:text-base"
                    >
                        Become a Tester →
                    </a>
                </div>

                {/* Trusted By Section — FIXED: replaced two fabricated
                    numbers with honest claims; "Active Users" now uses the
                    real count already fetched above. */}
                <div className="text-center mt-8 sm:mt-12">
                    <p className="text-slate-500 text-xs sm:text-sm mb-2 sm:mb-3">Trusted by professionals worldwide</p>
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 opacity-50">
                        <span className="text-slate-400 text-xs sm:text-sm">✓ {stats.loading ? '...' : (stats.activeUsers || 0)}+ Active Users</span>
                        <span className="text-slate-400 text-xs sm:text-sm">✓ Verified Employers</span>
                        <span className="text-slate-400 text-xs sm:text-sm">✓ Fraud-Protected Hiring</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
