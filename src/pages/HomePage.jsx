// src/pages/HomePage.jsx - UNIFIED & OPTIMIZED WITH COMPLETE FIXES
// ODUSBABA Home Page - Complete with All Features, Error Handling & Fixed Articles
//
// FIXED (2026-08-07):
// 1. loadCountryStats() called /api/index?action=country-jobs — this action
//    doesn't exist as a backend handler, so every country silently showed "0
//    jobs" permanently (the fetch "succeeds" with the unknown-action fallback
//    response, which has no `count` field, so it never threw and never
//    surfaced as an error — just quietly wrong for every visitor). Replaced
//    with a direct Supabase count query, the same pattern JobsPage.jsx and
//    the confirmed real jobs-stats handler already use successfully.
// 2. loadArticles() assumed a `status` text column on `articles` and only
//    fell back (via a fragile string-match on the Postgres error message) to
//    a query with NO published-filter at all when that guess failed — meaning
//    unpublished draft articles could show up publicly on the homepage. The
//    confirmed real `articles-list` handler in api/index.js already filters
//    correctly on the real `is_published` boolean column, so this now just
//    calls that handler directly instead of duplicating (and getting wrong)
//    the same query client-side.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Briefcase, Users, BookOpen, FileText, TrendingUp, Award, Globe, 
    Zap, Shield, Sparkles, ChevronRight, ArrowRight, Calendar, Star,
    AlertCircle, RefreshCw
} from 'lucide-react';
import HomeHero from '../components/HomeHero';
import CTASection from '../components/CTASection';
import PromoBanner from '../components/PromoBanner';
import CinematicTextAdvert from '../components/CinematicTextAdvert';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function HomePage() {
    const [stats, setStats] = useState({
        activeUsers: 0,
        jobsPosted: 0,
        courses: 0,
        assessments: 0,
        earlyAdopters: 0,
        testerSpots: 100,
        loading: true,
        fallback: false,
        error: null
    });
    const [articles, setArticles] = useState([]);
    const [countryStats, setCountryStats] = useState([]);
    const [isStatsVisible, setIsStatsVisible] = useState(false);
    const [isFeaturesVisible, setIsFeaturesVisible] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    
    const statsRef = useRef(null);
    const featuresRef = useRef(null);

    // Static data with useMemo for performance
    const countries = useMemo(() => [
        { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
        { code: 'US', name: 'United States', flag: '🇺🇸' },
        { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
        { code: 'CA', name: 'Canada', flag: '🇨🇦' },
        { code: 'AU', name: 'Australia', flag: '🇦🇺' },
        { code: 'DE', name: 'Germany', flag: '🇩🇪' },
        { code: 'FR', name: 'France', flag: '🇫🇷' },
        { code: 'IE', name: 'Ireland', flag: '🇮🇪' }
    ], []);

    const features = useMemo(() => [
        { 
            icon: Zap, 
            title: 'AI-Powered Intelligence', 
            description: 'ODUSBABA learns from every interaction to provide smarter recommendations',
            color: 'primary',
            iconColor: 'text-primary-400',
            bgColor: 'bg-primary-500/10'
        },
        { 
            icon: Shield, 
            title: 'Governed Trust', 
            description: 'Every skill verified through AI and human oversight',
            color: 'emerald',
            iconColor: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10'
        },
        { 
            icon: Globe, 
            title: 'Global Workforce', 
            description: 'Connect with professionals from around the world',
            color: 'blue',
            iconColor: 'text-blue-400',
            bgColor: 'bg-blue-500/10'
        },
        { 
            icon: TrendingUp, 
            title: 'Real-Time Matching', 
            description: 'Instant job and skill matching powered by AI',
            color: 'amber',
            iconColor: 'text-amber-400',
            bgColor: 'bg-amber-500/10'
        },
        { 
            icon: Award, 
            title: 'Value Partnership', 
            description: 'Creating Value for Partnership in every interaction',
            color: 'purple',
            iconColor: 'text-purple-400',
            bgColor: 'bg-purple-500/10'
        }
    ], []);

    // Stats cards configuration
    const statCards = useMemo(() => [
        {
            icon: Users,
            value: stats.activeUsers,
            label: 'Active Users',
            description: 'Early adopters',
            color: 'text-primary-400',
            bgColor: 'bg-primary-500/10'
        },
        {
            icon: Briefcase,
            value: stats.jobsPosted,
            label: 'Jobs Posted',
            description: 'Verified positions',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10'
        },
        {
            icon: BookOpen,
            value: stats.courses,
            label: 'Courses',
            description: 'AI-powered learning',
            color: 'text-sky-400',
            bgColor: 'bg-sky-500/10'
        },
        {
            icon: FileText,
            value: stats.assessments,
            label: 'Assessments',
            description: 'Skills verified',
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/10'
        }
    ], [stats]);

    // Fetch stats using the confirmed real homepage-stats handler
    const fetchStats = useCallback(async () => {
        setStats(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const response = await fetch('/api/index?action=homepage-stats', {
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.stats) {
                setStats({
                    activeUsers: data.stats.activeUsers || 0,
                    jobsPosted: data.stats.jobsPosted || 0,
                    courses: data.stats.courses || 0,
                    assessments: data.stats.assessments || 0,
                    earlyAdopters: data.stats.earlyMembers || 0,
                    testerSpots: data.stats.testerSpots || 55,
                    loading: false,
                    fallback: data.stats.fallback || false,
                    error: data.stats.error || null
                });
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Stats fetch error:', error);
            // Use fallback data
            setStats({
                activeUsers: 125,
                jobsPosted: 82,
                courses: 15,
                assessments: 8,
                earlyAdopters: 45,
                testerSpots: 55,
                loading: false,
                fallback: true,
                error: error.message
            });
        }
    }, []);

    // FIXED: direct Supabase count query per country instead of the
    // nonexistent ?action=country-jobs endpoint. Matches the confirmed real
    // jobs schema/filters already used successfully in JobsPage.jsx.
    const loadCountryStats = useCallback(async () => {
        try {
            const countryData = await Promise.all(
                countries.map(async (country) => {
                    try {
                        const { count, error } = await supabase
                            .from('jobs')
                            .select('id', { count: 'exact', head: true })
                            .eq('country_code', country.code)
                            .eq('is_active', true)
                            .eq('compliance_status', 'approved');
                        
                        if (error) throw error;
                        return { ...country, jobCount: count || 0 };
                    } catch {
                        return { ...country, jobCount: 0 };
                    }
                })
            );
            setCountryStats(countryData);
        } catch (err) { 
            console.error('Error loading country stats:', err); 
        }
    }, [countries]);

    // FIXED: was hand-rolling a direct Supabase query that guessed a `status`
    // text column (real column is `is_published`, confirmed via the real
    // articles-list handler) and fell back to an unfiltered query — which
    // could show unpublished drafts publicly — when that guess failed. Now
    // just calls the already-correct backend handler.
    const loadArticles = useCallback(async () => {
        try {
            const response = await fetch('/api/index?action=articles-list', {
                headers: { 'Accept': 'application/json' }
            });
            const data = await response.json();
            
            if (data.success) {
                setArticles((data.articles || []).slice(0, 3));
            } else {
                setArticles([]);
            }
        } catch (err) {
            console.error('Error loading articles:', err);
            setArticles([]);
        }
    }, []);

    // Load all data
    useEffect(() => {
        const loadAllData = async () => {
            await Promise.all([
                fetchStats(),
                loadArticles(),
                loadCountryStats()
            ]);
        };
        
        loadAllData();
        
        // Intersection Observer for scroll animations
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.target.id === 'stats-section') {
                        setIsStatsVisible(entry.isIntersecting);
                    }
                    if (entry.target.id === 'features-section') {
                        setIsFeaturesVisible(entry.isIntersecting);
                    }
                });
            },
            { threshold: 0.2, triggerOnce: true, rootMargin: '100px' }
        );
        
        if (statsRef.current) observer.observe(statsRef.current);
        if (featuresRef.current) observer.observe(featuresRef.current);
        
        return () => observer.disconnect();
    }, [fetchStats, loadArticles, loadCountryStats]);

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        fetchStats();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 overflow-x-hidden">
            {/* Hero Section */}
            <HomeHero />
            
            {/* Promo Banner */}
            <PromoBanner />
            
            {/* Cinematic Text Advert */}
            <CinematicTextAdvert />

            {/* Stats Section - Real-time metrics */}
            <div ref={statsRef} id="stats-section" className="w-full max-w-7xl mx-auto px-4 py-12 sm:py-16 lg:py-20">
                <div className="text-center mb-8 sm:mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-xs sm:text-sm mb-4">
                        <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Platform Growth
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
                        Trusted by professionals worldwide
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                        Real-time metrics from our growing community
                    </p>
                    
                    {/* Fallback indicator */}
                    {stats.fallback && (
                        <div className="mt-2 flex items-center justify-center gap-2 text-amber-400 text-xs">
                            <AlertCircle className="w-3 h-3" />
                            <span>Using estimated data</span>
                            <button 
                                onClick={handleRetry}
                                className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Retry
                            </button>
                        </div>
                    )}
                </div>

                <motion.div
                    initial="hidden"
                    animate={isStatsVisible ? "visible" : "hidden"}
                    variants={containerVariants}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
                >
                    {statCards.map((stat, idx) => (
                        <motion.div 
                            key={idx} 
                            variants={itemVariants} 
                            className={`${stat.bgColor} border border-slate-700/50 rounded-xl p-3 sm:p-4 md:p-6 text-center hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1 group`}
                        >
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${stat.bgColor} flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition`}>
                                <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                            </div>
                            <div className={`text-xl sm:text-2xl md:text-3xl font-bold ${stat.color}`}>
                                {stats.loading ? '...' : `${stat.value}+`}
                            </div>
                            <div className="text-slate-300 text-xs sm:text-sm font-medium mt-0.5 sm:mt-1">
                                {stat.label}
                            </div>
                            <div className="text-slate-500 text-[10px] sm:text-xs mt-0.5">
                                {stat.description}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Features Section - Why Choose ODUSBABA */}
            <div ref={featuresRef} id="features-section" className="w-full max-w-7xl mx-auto px-4 py-12 sm:py-16 lg:py-20">
                <div className="text-center mb-8 sm:mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-xs sm:text-sm mb-4">
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Why Choose ODUSBABA
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-4">
                        An intelligent governance system for the modern workforce
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                        Experience the future of HR with AI-powered intelligence and verified trust
                    </p>
                </div>

                <motion.div
                    initial="hidden"
                    animate={isFeaturesVisible ? "visible" : "hidden"}
                    variants={containerVariants}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                >
                    {features.map((feature, idx) => (
                        <motion.div key={idx} variants={itemVariants}>
                            <div className={`${feature.bgColor} border border-slate-800 rounded-xl p-4 sm:p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-${feature.color}-500/30`}>
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-3 sm:mb-4`}>
                                    <feature.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.iconColor}`} />
                                </div>
                                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-xs sm:text-sm">{feature.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Post Your First Job Free Section */}
            <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
                <div className="bg-gradient-to-r from-primary-600/20 to-sky-600/20 border border-primary-500/30 rounded-2xl p-4 sm:p-6 md:p-8 text-center">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2">
                        Post Your First Job Free
                    </h3>
                    <p className="text-slate-300 text-sm sm:text-base mb-4">
                        Reach qualified candidates and find the perfect hire for your team
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                        <span className="flex items-center gap-1.5 sm:gap-2 text-slate-300 text-xs sm:text-sm">
                            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-400" />
                            7 Days Free Trial
                        </span>
                        <span className="flex items-center gap-1.5 sm:gap-2 text-slate-300 text-xs sm:text-sm">
                            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                            Verified Candidates
                        </span>
                        <span className="flex items-center gap-1.5 sm:gap-2 text-slate-300 text-xs sm:text-sm">
                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                            First Post Free
                        </span>
                    </div>
                    <Link 
                        to="/post-job" 
                        className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-primary-500/20 text-sm sm:text-base"
                    >
                        Post a Job →
                    </Link>
                </div>
            </div>

            {/* Global Presence Section */}
            <div className="w-full max-w-7xl mx-auto px-4 py-12 sm:py-16 lg:py-20">
                <div className="text-center mb-8 sm:mb-12">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                        Global Presence
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base">
                        Connecting professionals and employers across {countries.length} countries
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
                    {countryStats.map((country) => (
                        <Link 
                            key={country.code} 
                            to={`/jobs?country=${country.code}`} 
                            className="bg-slate-900/50 border border-slate-800 rounded-xl p-2 sm:p-3 md:p-4 text-center hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1 group"
                        >
                            <div className="text-xl sm:text-2xl md:text-3xl mb-0.5 sm:mb-1">{country.flag}</div>
                            <div className="text-xs sm:text-sm font-medium text-white group-hover:text-primary-400 transition">{country.code}</div>
                            <div className="text-[10px] sm:text-xs text-slate-400 truncate">{country.name.split(' ')[0]}</div>
                            <div className="text-[10px] sm:text-xs text-primary-400 mt-0.5 sm:mt-1">{country.jobCount} jobs</div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Latest Insights Section */}
            <div className="w-full max-w-7xl mx-auto px-4 py-12 sm:py-16 lg:py-20 bg-slate-900/30 rounded-3xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                    <div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                            Latest Insights
                        </h2>
                        <p className="text-slate-400 text-sm">Stay informed with our latest articles</p>
                    </div>
                    <Link to="/blog" className="text-primary-400 hover:text-primary-300 text-sm sm:text-base flex items-center gap-1 transition">
                        View all <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                {stats.loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-6 animate-pulse">
                                <div className="h-4 bg-slate-700 rounded w-3/4 mb-4"></div>
                                <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
                                <div className="h-3 bg-slate-700 rounded w-2/3"></div>
                            </div>
                        ))}
                    </div>
                ) : articles.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm sm:text-base">No articles yet. Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        {articles.map(article => (
                            <Link 
                                key={article.id} 
                                to={`/articles/${article.slug}`} 
                                className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        <span className="w-1 h-1 bg-slate-600 rounded-full" />
                                        <Star className="w-3 h-3" />
                                        {article.view_count || 0} views
                                    </div>
                                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition line-clamp-2">
                                        {article.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm line-clamp-3">{article.excerpt}</p>
                                    <div className="mt-4 flex items-center text-primary-400 text-sm font-medium">
                                        Read more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* CTA Section */}
            <CTASection />
        </div>
    );
}
