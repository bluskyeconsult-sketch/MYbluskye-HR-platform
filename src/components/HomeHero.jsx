// src/components/HomeHero.jsx
// PROFESSIONAL HOME HERO - Dynamic stats with fallback values

import { useState, useEffect } from 'react';

export default function HomeHero() {
    const [stats, setStats] = useState({
        confidence: 98,
        availability: 24,
        impact: 10,
        verifiedJobs: 112,
        earlyMembers: 2
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch real stats from API with error handling
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/index?action=homepage-stats');
                
                // Check if response is ok
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.stats) {
                    setStats(prevStats => ({
                        ...prevStats,
                        ...data.stats
                    }));
                }
            } catch (error) {
                console.error('Stats fetch error:', error);
                // Keep default stats, don't break the UI
            } finally {
                setLoading(false);
            }
        };
        
        fetchStats();
    }, []);

    // Calculate remaining spots safely
    const remainingSpots = Math.max(0, 100 - (stats.earlyMembers || 0));
    const earlyMembersText = stats.earlyMembers !== undefined ? `${100 - stats.earlyMembers} SPOTS LEFT` : 'EARLY ACCESS';

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-72 h-72 bg-primary-500 rounded-full filter blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-500 rounded-full filter blur-3xl"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
                <div className="text-center">
                    {/* Early Access Badge */}
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6">
                        <span className="text-amber-400 text-sm font-medium">
                            EARLY ACCESS · {remainingSpots !== 100 ? `${remainingSpots} SPOTS LEFT` : earlyMembersText}
                        </span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
                        BluSkye Integrated Consult
                        <span className="block text-primary-400 text-2xl sm:text-3xl mt-2">powered by ODUSBABA intelligence</span>
                    </h1>

                    {/* Subheadings */}
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-3">
                        The Governed Workforce Platform. Verified skills. Trusted hiring.
                    </p>
                    <p className="text-slate-400 italic">
                        "An Experience of Value and solution to possible HR realities."
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap justify-center gap-4 mt-8">
                        <a 
                            href="/jobs" 
                            className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-primary-500/20"
                        >
                            Browse Jobs
                        </a>
                        <a 
                            href="/workforce" 
                            className="px-6 py-3 border border-slate-600 text-white rounded-xl hover:bg-slate-800 hover:border-slate-500 transition-all duration-200"
                        >
                            Workforce Market
                        </a>
                        <a 
                            href="/tester-register" 
                            className="px-6 py-3 border border-amber-500/50 text-amber-400 rounded-xl hover:bg-amber-500/10 hover:border-amber-500 transition-all duration-200"
                        >
                            Become a Tester
                        </a>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-16">
                    {/* Confidence Score */}
                    <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                        <div className="text-2xl sm:text-3xl font-bold text-primary-400">{stats.confidence}%</div>
                        <div className="text-slate-400 text-sm mt-1">CONFIDENCE</div>
                        <div className="text-xs text-slate-500">AI-Verified Trust Score</div>
                    </div>

                    {/* Availability */}
                    <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                        <div className="text-2xl sm:text-3xl font-bold text-primary-400">{stats.availability}/7</div>
                        <div className="text-slate-400 text-sm mt-1">AVAILABILITY</div>
                        <div className="text-xs text-slate-500">24/7 AI-Powered Support</div>
                    </div>

                    {/* Impact */}
                    <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                        <div className="text-2xl sm:text-3xl font-bold text-primary-400">{stats.impact}k+</div>
                        <div className="text-slate-400 text-sm mt-1">IMPACT</div>
                        <div className="text-xs text-slate-500">Documents Generated</div>
                    </div>

                    {/* Verified Jobs */}
                    <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200">
                        <div className="text-2xl sm:text-3xl font-bold text-primary-400">{stats.verifiedJobs}+</div>
                        <div className="text-slate-400 text-sm mt-1">Verified Jobs</div>
                        <div className="text-xs text-slate-500">From trusted employers</div>
                    </div>
                </div>

                {/* Tester Card */}
                <div className="mt-12 bg-gradient-to-r from-primary-600/20 to-sky-600/20 border border-primary-500/30 rounded-2xl p-6 text-center backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-2">Free Tester Access</h3>
                    <p className="text-slate-300 mb-4">Get 4 weeks of full platform access as a tester. No credit card required.</p>
                    
                    <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-6">
                        <span className="flex items-center gap-2 text-slate-300 text-sm">
                            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            24/7 AI Support
                        </span>
                        <span className="flex items-center gap-2 text-slate-300 text-sm">
                            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            100% Free
                        </span>
                        <span className="flex items-center gap-2 text-slate-300 text-sm">
                            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            No Card Required
                        </span>
                    </div>

                    <a 
                        href="/tester-register" 
                        className="inline-block px-6 py-3 bg-amber-500 text-slate-900 font-semibold rounded-xl hover:bg-amber-400 transition-all duration-200 hover:scale-105 shadow-lg shadow-amber-500/20"
                    >
                        Become a Tester →
                    </a>
                </div>
            </div>
        </div>
    );
}
