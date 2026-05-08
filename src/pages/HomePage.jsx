// src/pages/HomePage.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Tilt from 'react-tilt';
import { createClient } from '@supabase/supabase-js';
import HeroSection from '../components/HeroSection';
import { Link } from 'react-router-dom';
import { Briefcase, Users, BookOpen, Brain, Bot, Mail, Zap, Shield, TrendingUp, Award, Globe, Sparkles, CheckCircle } from 'lucide-react';

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
  
  const statsRef = useRef(null);
  const isStatsInView = useInView(statsRef, { once: true, margin: "-100px" });
  const featuresRef = useRef(null);
  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "-100px" });

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
    } catch (err) { console.error(err); }
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
    } catch (err) { console.error(err); }
  }

  async function loadArticles() {
    try {
      const { data } = await supabase
        .from('articles')
        .select('id, title, excerpt, slug, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);
      setArticles(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 overflow-x-hidden">
      <HeroSection />

      {/* Stats Section with Reveal */}
      <div ref={statsRef} className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isStatsInView ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { icon: Users, value: stats.users, label: "Active Users", suffix: "+" },
            { icon: Briefcase, value: stats.jobs, label: "Jobs Posted", suffix: "+" },
            { icon: BookOpen, value: stats.courses, label: "Courses Available", suffix: "+" },
            { icon: Brain, value: stats.assessments, label: "Assessments", suffix: "+" }
          ].map((stat, idx) => (
            <motion.div key={idx} variants={itemVariants} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center card-hover particle-burst">
              <stat.icon className="w-8 h-8 text-primary-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white">{stat.value.toLocaleString()}{stat.suffix}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Features Section with Stagger Reveal */}
      <div ref={featuresRef} className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Why ODUSBABA is Different</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">An intelligent governance system for the modern workforce</p>
        </div>
        
        <motion.div
          initial="hidden"
          animate={isFeaturesInView ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <Tilt options={{ max: 8, scale: 1.02, perspective: 1000, glare: true, "max-glare": 0.2 }}>
                <div className={`bg-slate-900/30 border rounded-xl p-6 backdrop-blur-sm hover:-translate-y-1 transition-all duration-300 ${feature.highlight ? 'border-primary-500/30 bg-primary-500/5' : 'border-slate-800'}`}>
                  <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                  {feature.highlight && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {countryStats.map(country => (
                        <span key={country.code} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 rounded-full">
                          <span>{country.flag}</span>
                          <span className="text-slate-300">{country.code}</span>
                          <span className="text-primary-400">({country.jobCount})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Tilt>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-primary-600/20 to-purple-600/20 border border-primary-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Transform Your HR Experience?</h2>
          <p className="text-slate-400 mb-6 max-w-2xl mx-auto">Join thousands of professionals and employers using ODUSBABA to build trust, verify skills, and create meaningful partnerships.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/sign-up" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition animate-pulse-glow">Get Started Free</Link>
            <Link to="/tester-register" className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">Become a Tester</Link>
          </div>
          <p className="text-xs text-slate-500 mt-4">No credit card required. Free trial available for testers.</p>
        </div>
      </div>
    </div>
  );
}
