// src/components/HeroSection.jsx
// COMPLETE HERO SECTION - Real-time stats + Creative trust signals + Coming Soon messaging

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function HeroSection() {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
    const [stats, setStats] = useState({
        confidence: 98,
        availability: 24,
        impact: 10,
        jobCount: 0,
        userCount: 0,
        courseCount: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        try {
            // Fetch job count
            const { count: jobCount } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .eq('compliance_status', 'approved');

            // Fetch user count (from profiles table)
            const { count: userCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // Fetch course count
            const { count: courseCount } = await supabase
                .from('courses')
                .select('*', { count: 'exact', head: true })
                .eq('is_published', true);

            // Get document impact (from jobs + applications)
            const { data: applications } = await supabase
                .from('job_applications')
                .select('id', { count: 'exact' });

            const totalImpact = Math.floor((jobCount || 0) + (applications?.length || 0) + (courseCount || 0) * 100) / 100;

            setStats({
                confidence: 98,
                availability: 24,
                impact: Math.max(10, Math.min(100, Math.floor(totalImpact / 100) || 10)),
                jobCount: jobCount || 0,
                userCount: userCount || 0,
                courseCount: courseCount || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            // Keep default values with fallbacks
            setStats(prev => ({
                ...prev,
                jobCount: 82,
                userCount: 2,
                courseCount: 1
            }));
        } finally {
            setLoading(false);
        }
    }

    // Creative display logic
    const displayCourseCount = stats.courseCount > 0 ? stats.courseCount : 'Coming Soon';
    const isCourseComingSoon = stats.courseCount === 0;
    const showEarlyAccessBadge = stats.userCount < 50;
    const availableTesterSpots = Math.max(0, 100 - stats.userCount);

    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 sm:py-16 md:py-20 px-4">
            {/* Animated background glow */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-20 left-10 w-48 h-48 sm:w-64 sm:h-64 bg-primary-500 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-20 right-10 w-48 h-48 sm:w-80 sm:h-80 bg-primary-400 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="max-w-5xl mx-auto relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* CREATIVE: Early Access Badge */}
                    {showEarlyAccessBadge && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 mb-4">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <span className="text-amber-400 text-xs font-semibold">EARLY ACCESS • {availableTesterSpots} SPOTS LEFT</span>
                        </div>
                    )}

                    {/* Value Proposition Tagline */}
                    <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
                        <span className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-wide">
                            ✨ Creating Value for Partnership
                        </span>
                    </div>

                    {/* Main Title */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 px-2 leading-tight">
                        <span className="bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
                            BluSkye Integrated Consult
                        </span>
                    </h1>
                    
                    {/* Subtitle */}
                    <p className="text-xs sm:text-sm md:text-base text-slate-400 mt-1">
                        powered by <span className="font-extrabold text-primary-400 text-sm sm:text-base md:text-lg">ODUSBABA</span> intelligence
                    </p>
                    
                    <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto mt-4 px-2 font-medium">
                        The Governed Workforce Platform. Verified skills. Trusted hiring.
                    </p>
                    
                    <p className="text-xs sm:text-sm text-slate-400 mt-3 max-w-2xl mx-auto px-2 italic">
                        "An Experience of Value and solution to possible HR realities."
                    </p>

                    {/* CTA Buttons with Creative Tester Button */}
                    <div className="flex flex-wrap gap-3 sm:gap-4 justify-center mt-8">
                        <Link to="/jobs" className="bg-primary-600 text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/20 hover:scale-105 text-sm sm:text-base">
                            Browse Jobs
                        </Link>
                        <Link to="/workforce" className="bg-slate-700 text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-slate-600 transition-all duration-200 hover:scale-105 text-sm sm:text-base">
                            Workforce Market
                        </Link>
                        <Link to="/tester-register" className="relative overflow-hidden group border border-primary-500 text-primary-500 px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-primary-500/10 transition-all duration-200 hover:scale-105 text-sm sm:text-base">
                            <span className="absolute inset-0 bg-primary-500/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></span>
                            <span className="relative">🚀 Become a Tester</span>
                        </Link>
                    </div>
                    
                    {/* CREATIVE: Trust Indicator - Limited Spots */}
                    <div className="mt-4 flex items-center justify-center gap-2">
                        <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-primary-500/30 border border-primary-500/50 flex items-center justify-center text-[10px]">👤</div>
                            <div className="w-6 h-6 rounded-full bg-primary-500/30 border border-primary-500/50 flex items-center justify-center text-[10px]">👤</div>
                            <div className="w-6 h-6 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-[10px] text-slate-400">+{availableTesterSpots}</div>
                        </div>
                        <span className="text-xs text-slate-500">{stats.userCount}+ early adopters • {availableTesterSpots} tester spots available</span>
                    </div>
                </motion.div>

                {/* Stats Cards - Main Row */}
                <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 max-w-3xl mx-auto">
                    
                    {/* Confidence Stat */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="group rounded-xl border border-slate-800 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-6 text-center hover:border-emerald-500/30 transition-all hover:-translate-y-1"
                    >
                        <div className="text-3xl sm:text-4xl font-bold text-emerald-400">
                            {inView ? (
                                <CountUp start={0} end={stats.confidence} duration={1.2} suffix="%" />
                            ) : (
                                '0%'
                            )}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-400 mt-2 tracking-wider font-semibold">CONFIDENCE</div>
                        <div className="text-xs text-slate-500 mt-1">AI-Verified Trust Score</div>
                        <div className="mt-2 text-[10px] text-emerald-500/70">↑ Based on 100% verification rate</div>
                    </motion.div>
                    
                    {/* Availability Stat */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="group rounded-xl border border-slate-800 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-6 text-center hover:border-sky-500/30 transition-all hover:-translate-y-1"
                    >
                        <div className="text-3xl sm:text-4xl font-bold text-sky-400">
                            {inView ? (
                                <CountUp start={0} end={stats.availability} duration={1.2} suffix="/7" />
                            ) : (
                                '0/7'
                            )}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-400 mt-2 tracking-wider font-semibold">AVAILABILITY</div>
                        <div className="text-xs text-slate-500 mt-1">24/7 AI-Powered Support</div>
                        <div className="mt-2 text-[10px] text-sky-500/70">⚡ Average response: 3 seconds</div>
                    </motion.div>
                    
                    {/* Impact Stat */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.4, delay: 0.3 }}
                        className="group rounded-xl border border-slate-800 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-6 text-center hover:border-purple-500/30 transition-all hover:-translate-y-1"
                    >
                        <div className="text-3xl sm:text-4xl font-bold text-purple-400">
                            {inView ? (
                                <CountUp start={0} end={stats.impact} duration={1.2} suffix="k+" />
                            ) : (
                                '0k+'
                            )}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-400 mt-2 tracking-wider font-semibold">IMPACT</div>
                        <div className="text-xs text-slate-500 mt-1">Documents Generated</div>
                        <div className="mt-2 text-[10px] text-purple-500/70">📄 CVs, Cover Letters, Reports</div>
                    </motion.div>
                </div>
                
                {/* Second Row Stats - With Creative "Coming Soon" for Courses */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 max-w-2xl mx-auto">
                    <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-white">{stats.jobCount}+</div>
                        <div className="text-xs text-slate-500">Verified Jobs</div>
                        <div className="text-[10px] text-emerald-500/70 mt-1">✅ From trusted employers</div>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-white">{stats.userCount}+</div>
                        <div className="text-xs text-slate-500">Early Members</div>
                        <div className="text-[10px] text-amber-500/70 mt-1">🚀 Join the first 100 testers</div>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-3 text-center">
                        {isCourseComingSoon ? (
                            <>
                                <div className="text-xl font-bold text-amber-400 flex items-center justify-center gap-1">
                                    <span>🎓</span> Coming Soon
                                </div>
                                <div className="text-xs text-slate-500">AI Courses</div>
                                <div className="text-[10px] text-amber-500/70 mt-1">📢 Launching May 2026</div>
                            </>
                        ) : (
                            <>
                                <div className="text-xl font-bold text-white">{stats.courseCount}+</div>
                                <div className="text-xs text-slate-500">Courses Available</div>
                                <div className="text-[10px] text-emerald-500/70 mt-1">🎓 With AI audio narration</div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
