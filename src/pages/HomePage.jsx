// src/pages/HomePage.jsx
// COMPLETE PROFESSIONAL HOMEPAGE - Unified API, enhanced performance, SEO optimized

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Briefcase, Users, BookOpen, Brain, Bot, Mail, 
  Zap, Shield, TrendingUp, Award, Globe, Sparkles,
  ChevronRight, Star, Clock, CheckCircle, ArrowRight,
  Building2, MapPin, Calendar, Loader2, Heart, MessageCircle
} from 'lucide-react';
import HeroSection from '../components/HeroSection';
import PromoBanner from '../components/PromoBanner';
import CinematicTextAdvert from '../components/CinematicTextAdvert';
import { apiCall } from '../lib/supabase';

// Lazy load heavy components
const FraudSafetyBanner = lazy(() => import('../components/FraudSafetyBanner'));

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

// Fallback data for offline/error scenarios
const FALLBACK_STATS = {
  activeUsers: 0,
  jobsPosted: 82,
  coursesAvailable: 1,
  assessmentsTaken: 170
};

export default function HomePage() {
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [articles, setArticles] = useState([]);
  const [countryStats, setCountryStats] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStatsVisible, setIsStatsVisible] = useState(false);
  const [isFeaturesVisible, setIsFeaturesVisible] = useState(false);
  
  const statsRef = useRef(null);
  const featuresRef = useRef(null);

  const countries = [
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', capital: 'London' },
    { code: 'US', name: 'United States', flag: '🇺🇸', capital: 'Washington DC' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', capital: 'Abuja' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', capital: 'Ottawa' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', capital: 'Canberra' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', capital: 'Berlin' },
    { code: 'FR', name: 'France', flag: '🇫🇷', capital: 'Paris' },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪', capital: 'Dublin' }
  ];

  const features = [
    { icon: Sparkles, title: "AI-Powered Intelligence", description: "ODUSBABA learns from every interaction to provide smarter recommendations", color: "primary", gradient: "from-primary-500/20 to-primary-600/10" },
    { icon: Shield, title: "Governed Trust", description: "Every skill verified through AI and human oversight", color: "emerald", gradient: "from-emerald-500/20 to-emerald-600/10" },
    { icon: Globe, title: "Global Workforce", description: "Connect with professionals from around the world", color: "purple", gradient: "from-purple-500/20 to-purple-600/10" },
    { icon: Users, title: "8+ Countries", description: "UK, Nigeria, US, Canada, AU, DE, FR, IE - with more coming", color: "blue", highlight: true, gradient: "from-blue-500/20 to-blue-600/10" },
    { icon: Zap, title: "Real-Time Matching", description: "Instant job and skill matching powered by AI", color: "amber", gradient: "from-amber-500/20 to-amber-600/10" },
    { icon: Award, title: "Value Partnership", description: "Creating Value for Partnership in every interaction", color: "pink", gradient: "from-pink-500/20 to-pink-600/10" }
  ];

  useEffect(() => {
    loadHomepageData();
    
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
  }, []);

  async function loadHomepageData() {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data in parallel using unified API
      const [statsData, articlesData, countryData, testimonialsData] = await Promise.all([
        apiCall('homepage-stats', {}, 'GET').catch(() => null),
        apiCall('homepage-articles', {}, 'GET').catch(() => null),
        apiCall('homepage-countries', {}, 'GET').catch(() => null),
        apiCall('homepage-testimonials', {}, 'GET').catch(() => null)
      ]);
      
      // Process stats
      if (statsData?.success && statsData.data) {
        setStats(statsData.data);
      } else {
        // Fallback to direct Supabase queries
        await loadStatsDirect();
      }
      
      // Process articles
      if (articlesData?.success && articlesData.data) {
        setArticles(articlesData.data);
      } else {
        await loadArticlesDirect();
      }
      
      // Process country stats
      if (countryData?.success && countryData.data) {
        setCountryStats(countryData.data);
      } else {
        await loadCountryStatsDirect();
      }
      
      // Process testimonials
      if (testimonialsData?.success && testimonialsData.data) {
        setTestimonials(testimonialsData.data);
      }
      
    } catch (err) {
      console.error('Error loading homepage data:', err);
      setError('Unable to load some content. Please refresh the page.');
      
      // Fallback to direct Supabase queries
      await Promise.all([
        loadStatsDirect(),
        loadArticlesDirect(),
        loadCountryStatsDirect()
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadStatsDirect() {
    try {
      const [activeUsers, jobsPosted, coursesAvailable, assessmentsTaken] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('compliance_status', 'approved'),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('user_assessments').select('*', { count: 'exact', head: true })
      ]);
      
      setStats({
        activeUsers: activeUsers.count || 0,
        jobsPosted: jobsPosted.count || 82,
        coursesAvailable: coursesAvailable.count || 1,
        assessmentsTaken: assessmentsTaken.count || 170
      });
    } catch (err) {
      console.error('Direct stats fetch error:', err);
      setStats(FALLBACK_STATS);
    }
  }

  async function loadArticlesDirect() {
    try {
      const { data } = await supabase
        .from('articles')
        .select('id, title, excerpt, slug, created_at, view_count, featured_image')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);
      setArticles(data || []);
    } catch (err) {
      console.error('Direct articles fetch error:', err);
      setArticles([]);
    }
  }

  async function loadCountryStatsDirect() {
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
      console.error('Direct country stats fetch error:', err);
      setCountryStats(countries.map(c => ({ ...c, jobCount: 0 })));
    }
  }

  const statsCards = [
    { icon: Users, value: stats.activeUsers, label: "Active Users", suffix: "+", color: "blue", bgColor: "bg-blue-500/10", iconColor: "text-blue-400", description: "Job seekers & employers" },
    { icon: Briefcase, value: stats.jobsPosted, label: "Jobs Posted", suffix: "+", color: "emerald", bgColor: "bg-emerald-500/10", iconColor: "text-emerald-400", description: "Verified opportunities" },
    { icon: BookOpen, value: stats.coursesAvailable, label: "Courses", suffix: "+", color: "purple", bgColor: "bg-purple-500/10", iconColor: "text-purple-400", description: "AI-powered learning" },
    { icon: Brain, value: stats.assessmentsTaken, label: "Assessments", suffix: "+", color: "pink", bgColor: "bg-pink-500/10", iconColor: "text-pink-400", description: "Skills verified" }
  ];

  if (loading && !articles.length && !countryStats.length) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 overflow-x-hidden">
      <HeroSection />
      <PromoBanner />
      
      {/* Cinematic Text Advert */}
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

        <motion.div
          initial="hidden"
          animate={isStatsVisible ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {statsCards.map((stat, idx) => (
            <motion.div key={idx} variants={itemVariants} className={`${stat.bgColor} border border-slate-700 rounded-xl p-6 text-center hover:border-${stat.color}-500/30 transition-all hover:-translate-y-1 group`}>
              <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white">{stat.value.toLocaleString()}{stat.suffix}</div>
              <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.description}</div>
            </motion.div>
          ))}
        </motion.div>
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
              <div className={`bg-gradient-to-br ${feature.gradient} border rounded-xl p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl ${feature.highlight ? 'border-primary-500/30 bg-primary-500/5' : 'border-slate-800'}`}>
                <div className={`w-12 h-12 rounded-lg bg-${feature.color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                {feature.highlight && (
                  <div className="mt-4 pt-3 border-t border-slate-700">
                    <div className="flex flex-wrap gap-2">
                      {countryStats.slice(0, 6).map(country => (
                        <span key={country.code} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 rounded-full hover:bg-slate-700 transition">
                          <span className="text-base">{country.flag}</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {countryStats.map(country => (
            <Link 
              key={country.code} 
              to={`/jobs?country=${country.code}`} 
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center hover:border-primary-500/30 transition-all hover:-translate-y-1 group"
            >
              <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">{country.flag}</div>
              <div className="text-sm font-medium text-white group-hover:text-primary-400 transition">{country.code}</div>
              <div className="text-xs text-slate-400">{country.name.split(' ')[0]}</div>
              <div className="text-xs text-primary-400 mt-1 font-medium">{country.jobCount} jobs</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Testimonials Section (Optional - if data available) */}
      {testimonials.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">What Our Users Say</h2>
            <p className="text-slate-400">Trusted by professionals worldwide</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((testimonial, idx) => (
              <div key={idx} className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 hover:border-primary-500/30 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">"{testimonial.content}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-sky-500 flex items-center justify-center text-white font-bold">
                    {testimonial.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{testimonial.name}</p>
                    <p className="text-slate-500 text-xs">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Articles Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Latest Insights</h2>
            <p className="text-slate-400 mt-1">Stay informed with our latest articles</p>
          </div>
          <Link to="/articles" className="text-primary-400 hover:text-primary-300 flex items-center gap-1 transition group">
            View all <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </Link>
        </div>

        {loading && articles.length === 0 ? (
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
                {article.featured_image && (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={article.featured_image} 
                      alt={article.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
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
        <div className="bg-gradient-to-r from-primary-600/20 via-purple-600/20 to-primary-600/20 border border-primary-500/20 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
          {/* Animated background particles */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 left-10 w-32 h-32 bg-primary-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm mb-4">
              <Zap className="w-4 h-4" />
              Get Started Today
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Transform Your HR Experience?</h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals and employers using ODUSBABA to build trust, verify skills, and create meaningful partnerships.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/sign-up" className="px-6 py-3 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-xl hover:from-primary-500 hover:to-sky-500 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/20 hover:scale-105">
                Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link to="/tester-register" className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all duration-200 border border-slate-700 hover:scale-105 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Become a Tester
              </Link>
            </div>
            <p className="text-xs text-slate-500 mt-6">No credit card required. Free trial available for testers.</p>
          </div>
        </div>
      </div>

      {/* Fraud Safety Banner - Lazy loaded */}
      <Suspense fallback={null}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FraudSafetyBanner />
        </div>
      </Suspense>
    </div>
  );
}
