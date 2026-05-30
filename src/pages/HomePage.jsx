// src/pages/HomePage.jsx
// COMPLETE HOMEPAGE - Optimized with unified API, performance improvements, and all features preserved

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
    Briefcase, Users, BookOpen, Brain, Bot, Mail, 
    Zap, Shield, TrendingUp, Award, Globe, Sparkles,
    ChevronRight, Star, Clock, CheckCircle, ArrowRight,
    Building2, MapPin, Calendar, Loader2
} from 'lucide-react';
import HeroSection from '../components/HeroSection';
import PromoBanner from '../components/PromoBanner';
import CinematicTextAdvert from '../components/CinematicTextAdvert';
import { supabase, apiCall } from '../lib/supabase';

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
        coursesAvailable: 0, 
        assessmentsTaken: 0 
    });
    const [articles, setArticles] = useState([]);
    const [countryStats, setCountryStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isStatsVisible, setIsStatsVisible] = useState(false);
    const [isFeaturesVisible, setIsFeaturesVisible] = useState(false);
    const [error, setError] = useState(null);
    
    const statsRef = useRef(null);
    const featuresRef = useRef(null);

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
        { icon: Sparkles, title: "AI-Powered Intelligence", description: "ODUSBABA learns from every interaction to provide smarter recommendations", color: "primary" },
        { icon: Shield, title: "Governed Trust", description: "Every skill verified through AI and human oversight", color: "emerald" },
        { icon: Globe, title: "Global Workforce", description: "Connect with professionals from around the world", color: "purple" },
        { icon: Users, title: "8+ Countries", description: "UK, Nigeria, US, Canada, AU, DE, FR, IE - with more coming", color: "blue", highlight: true },
        { icon: Zap, title: "Real-Time Matching", description: "Instant job and skill matching powered by AI", color: "amber" },
        { icon: Award, title: "Value Partnership", description: "Creating Value for Partnership in every interaction", color: "pink" }
    ], []);

    const statsCards = useMemo(() => [
        { icon: Users, value: stats.activeUsers, label: "Active Users", suffix: "+", color: "blue", bgColor: "bg-blue-500/10", iconColor: "text-blue-400" },
        { icon: Briefcase, value: stats.jobsPosted, label: "Jobs Posted", suffix: "+", color: "emerald", bgColor: "bg-emerald-500/10", iconColor: "text-emerald-400" },
        { icon: BookOpen, value: stats.coursesAvailable, label: "Courses Available", suffix: "+", color: "purple", bgColor: "bg-purple-500/10", iconColor: "text-purple-400" },
        { icon: Brain, value: stats.assessmentsTaken, label: "Assessments", suffix: "+", color: "pink", bgColor: "bg-pink-500/10", iconColor: "text-pink-400" }
    ], [stats]);

    // Optimized fetch with Promise.all for parallel requests
    const fetchStats = useCallback(async () => {
        try {
            const [activeUsersResult, jobsResult, coursesResult, assessmentsResult] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('compliance_status', 'approved'),
                supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
                supabase.from('user_assessments').select('*', { count: 'exact', head: true })
            ]);

            setStats({
                activeUsers: activeUsersResult.count || 0,
                jobsPosted: jobsResult.count || 0,
                coursesAvailable: coursesResult.count || 0,
                assessmentsTaken: assessmentsResult.count || 0
            });
            
            // Track page view analytics
            try {
                await apiCall('track-event', { event_type: 'homepage_stats_loaded' });
            } catch (e) {}
            
        } catch (error) {
            console.error('Error fetching stats:', error);
            setError('Failed to load statistics');
            // Fallback to reasonable defaults
            setStats({
                activeUsers: 0,
                jobsPosted: 82,
                coursesAvailable: 1,
                assessmentsTaken: 170
            });
        }
    }, []);

    const loadCountryStats = useCallback(async () => {
        try {
            const countryData = await Promise.all(
                countries.map(async (country) => {
                    const { count } = await supabase
                        .from('jobs')
                        .select('*', { count: 'exact', head: true })
                        .eq('country_code', country.code)
                        .eq('is_active', true)
                        .eq('compliance_status', 'approved');
                    return { ...country, jobCount: count || 0 };
                })
            );
            setCountryStats(countryData);
        } catch (err) { 
            console.error('Error loading country stats:', err); 
        }
    }, [countries]);

    const loadArticles = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('articles')
                .select('id, title, excerpt, slug, created_at, view_count')
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .limit(3);
            setArticles(data || []);
        } catch (err) { 
            console.error('Error loading articles:', err); 
        } finally { 
            setLoading(false); 
        }
    }, []);

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

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 overflow-x-hidden">
            <HeroSection />
            <PromoBanner />
            <CinematicTextAdvert />

            {/* Stats Section */}
            <div ref={statsRef} id="stats-section" className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm mb-4">
                        <TrendingUp className="w-4 h-4" />
                        Platform Growth
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Trusted by professionals worldwide</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">Real-time metrics from our growing community</p>
                </div>

                {error ? (
                    <div className="text-center py-8">
                        <p className="text-amber-400 text-sm">{error}</p>
                    </div>
                ) : (
                    <motion.div
                        initial="hidden"
                        animate={isStatsVisible ? "visible" : "hidden"}
                        variants={containerVariants}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
                    >
                        {statsCards.map((stat, idx) => (
                            <motion.div 
                                key={idx} 
                                variants={itemVariants} 
                                className={`${stat.bgColor} border border-slate-700 rounded-xl p-6 text-center hover:border-${stat.color}-500/30 transition-all hover:-translate-y-1 group`}
                            >
                                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition`}>
                                    <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                                </div>
                                <div className="text-2xl md:text-3xl font-bold text-white">{stat.value.toLocaleString()}{stat.suffix}</div>
                                <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Features Section */}
            <div ref={featuresRef} id="features-section" className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm mb-4">
                        <Sparkles className="w-4 h-4" />
                        Why Choose ODUSBABA
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">An intelligent governance system for the modern workforce</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">Experience the future of HR with AI-powered intelligence and verified trust</p>
                </div>
                
                <motion.div
                    initial="hidden"
                    animate={isFeaturesVisible ? "visible" : "hidden"}
                    variants={containerVariants}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {features.map((feature, idx) => (
                        <motion.div key={idx} variants={itemVariants}>
                            <div className={`bg-slate-900/30 border rounded-xl p-6 backdrop-blur-sm transition-all hover:-translate-y-1 ${feature.highlight ? 'border-primary-500/30 bg-primary-500/5' : 'border-slate-800'}`}>
                                <div className={`w-12 h-12 rounded-lg bg-${feature.color}-500/10 flex items-center justify-center mb-4`}>
                                    <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm">{feature.description}</p>
                                {feature.highlight && (
                                    <div className="mt-4 pt-3 border-t border-slate-700">
                                        <div className="flex flex-wrap gap-2">
                                            {countryStats.slice(0, 6).map(country => (
                                                <span key={country.code} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 rounded-full">
                                                    <span>{country.flag}</span>
                                                    <span className="text-slate-300">{country.code}</span>
                                                    <span className="text-primary-400">({country.jobCount})</span>
                                                </span>
                                            ))}
                                            {countryStats.length > 6 && (
                                                <span className="text-xs px-2 py-1 bg-slate-800 rounded-full text-slate-300">
                                                    +{countryStats.length - 6} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Countries Section */}
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Global Presence</h2>
                    <p className="text-slate-400">Connecting professionals and employers across {countries.length} countries</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {countryStats.map(country => (
                        <Link 
                            key={country.code} 
                            to={`/jobs?country=${country.code}`} 
                            className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center hover:border-primary-500/30 transition-all hover:-translate-y-1 group"
                        >
                            <div className="text-2xl mb-1">{country.flag}</div>
                            <div className="text-sm font-medium text-white group-hover:text-primary-400 transition">{country.code}</div>
                            <div className="text-xs text-slate-400">{country.name.split(' ')[0]}</div>
                            <div className="text-xs text-primary-400 mt-1">{country.jobCount} jobs</div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Articles Section */}
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white">Latest Insights</h2>
                        <p className="text-slate-400 mt-1">Stay informed with our latest articles</p>
                    </div>
                    <Link to="/articles" className="text-primary-400 hover:text-primary-300 flex items-center gap-1 transition">
                        View all <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 animate-pulse">
                                <div className="h-4 bg-slate-700 rounded w-3/4 mb-4"></div>
                                <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
                                <div className="h-3 bg-slate-700 rounded w-2/3"></div>
                            </div>
                        ))}
                    </div>
                ) : articles.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No articles yet. Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {articles.map(article => (
                            <Link 
                                key={article.id} 
                                to={`/articles/${article.slug}`} 
                                className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all hover:-translate-y-1"
                            >
                                <div className="p-6">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        <span className="w-1 h-1 bg-slate-600 rounded-full" />
                                        <Star className="w-3 h-3" />
                                        {article.view_count || 0} views
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition line-clamp-2">{article.title}</h3>
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

            {/* Final CTA Section */}
            <div className="max-w-7xl mx-auto px-4 py-16 pb-24 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-r from-primary-600/20 via-purple-600/20 to-primary-600/20 border border-primary-500/20 rounded-2xl p-8 md:p-12 text-center">
                    <div className="max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm mb-4">
                            <Zap className="w-4 h-4" />
                            Get Started Today
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Transform Your HR Experience?</h2>
                        <p className="text-slate-400 mb-8">
                            Join thousands of professionals and employers using ODUSBABA to build trust, verify skills, and create meaningful partnerships.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Link to="/sign-up" className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/20">
                                Get Started Free <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link to="/tester-register" className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all duration-200 border border-slate-700">
                                Become a Tester
                            </Link>
                        </div>
                        <p className="text-xs text-slate-500 mt-6">No credit card required. Free trial available for testers.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
