// src/pages/HomePage.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Briefcase, Users, BookOpen, Brain, Bot, Mail, 
  Zap, Shield, TrendingUp, Award, Globe, Sparkles,
  ChevronRight, Star, Clock, CheckCircle, ArrowRight
} from 'lucide-react';
import HeroSection from '../components/HeroSection';
import PromoBanner from '../components/PromoBanner';
import { useInView } from 'react-intersection-observer';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export default function HomePage() {
  const [stats, setStats] = useState({ users: 0, jobs: 0, courses: 0, assessments: 0 });
  const [articles, setArticles] = useState([]);
  const [countryStats, setCountryStats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const statsRef = useInView({ triggerOnce: true, threshold: 0.3 });
  const featuresRef = useInView({ triggerOnce: true, threshold: 0.3 });
  const articlesRef = useInView({ triggerOnce: true, threshold: 0.3 });

  const countries = [
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' }
  ];

  const features = [
    { icon: Sparkles, title: "AI-Powered Intelligence", description: "ODUSBABA learns from every interaction to provide smarter recommendations", color: "primary" },
    { icon: Shield, title: "Governed Trust", description: "Every skill verified through AI and human oversight for maximum reliability", color: "emerald" },
    { icon: Globe, title: "Global Workforce", description: "Connect with professionals and employers from around the world", color: "purple" },
    { icon: Users, title: "7 Countries", description: "UK, Nigeria, US, Canada, AU, DE, FR - with more coming", color: "blue", highlight: true },
    { icon: Zap, title: "Real-Time Matching", description: "Instant job and skill matching powered by advanced AI algorithms", color: "amber" },
    { icon: Award, title: "Value Partnership", description: "Creating Value for Partnership in every interaction and transaction", color: "pink" }
  ];

  useEffect(() => {
    loadStats();
    loadArticles();
    loadCountryStats();
  }, []);

  async function loadStats() {
    try {
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: jobsCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
      const { count: coursesCount } = await supabase.from('courses').select('*', { count: 'exact', head: true });
      const { count: assessmentsCount } = await supabase.from('assessments').select('*', { count: 'exact', head: true });
      
      setStats({
        users: usersCount || 0,
        jobs: jobsCount || 0,
        courses: coursesCount || 0,
        assessments: assessmentsCount || 0
      });
    } catch (err) { 
      console.error('Error loading stats:', err); 
    }
  }

  async function loadCountryStats() {
    try {
      const countryData = [];
      for (const country of countries) {
        const { count } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('country_code', country.code);
        countryData.push({ ...country, jobCount: count || 0 });
      }
      setCountryStats(countryData);
    } catch (err) { 
      console.error('Error loading country stats:', err); 
    }
  }

  async function loadArticles() {
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 overflow-x-hidden">
      <HeroSection />
      <PromoBanner />

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          ref={statsRef.ref}
          initial="hidden"
          animate={statsRef.inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { icon: Users, value: stats.users, label: "Active Users", suffix: "+", color: "blue" },
            { icon: Briefcase, value: stats.jobs, label: "Jobs Posted", suffix: "+", color: "emerald" },
            { icon: BookOpen, value: stats.courses, label: "Courses Available", suffix: "+", color: "purple" },
            { icon: Brain, value: stats.assessments, label: "Assessments", suffix: "+", color: "pink" }
          ].map((stat, idx) => (
            <motion.div key={idx} variants={itemVariants} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center card-hover particle-burst">
              <div className={`w-12 h-12 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center mx-auto mb-3`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
              </div>
              <div className="text-2xl font-bold text-white">{stat.value.toLocaleString()}{stat.suffix}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            Why Choose ODUSBABA
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">An intelligent governance system for the modern workforce</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Experience the future of HR with AI-powered intelligence and verified trust</p>
        </div>
        
        <motion.div
          ref={featuresRef.ref}
          initial="hidden"
          animate={featuresRef.inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <div className={`bg-slate-900/30 border rounded-xl p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl ${feature.highlight ? 'border-primary-500/30 bg-primary-500/5' : 'border-slate-800'}`}>
                <div className={`w-12 h-12 rounded-lg bg-${feature.color}-500/10 flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
                {feature.highlight && (
                  <div className="mt-4 pt-3 border-t border-slate-700">
                    <div className="flex flex-wrap gap-2">
                      {countryStats.map(country => (
                        <span key={country.code} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 rounded-full">
                          <span>{country.flag}</span>
                          <span className="text-slate-300">{country.code}</span>
                          <span className="text-primary-400">({country.jobCount})</span>
                        </span>
                      ))}
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
          <p className="text-slate-400">Connecting professionals and employers across 7 countries</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {countryStats.map(country => (
            <Link key={country.code} to={`/jobs?country=${country.code}`} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center hover:border-primary-500/30 transition-all hover:-translate-y-1">
              <div className="text-3xl mb-2">{country.flag}</div>
              <div className="text-sm font-medium text-white">{country.code}</div>
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
          <Link to="/articles" className="text-primary-400 hover:text-primary-300 flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shimmer h-64" />
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
              <Link key={article.id} to={`/articles/${article.slug}`} className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <Clock className="w-3 h-3" />
                    {new Date(article.created_at).toLocaleDateString()}
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
