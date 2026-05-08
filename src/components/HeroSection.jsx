// src/components/HeroSection.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import CountUp from 'react-countup';
import { Sparkles, Users, Briefcase, BookOpen, Brain, Award, CheckCircle, TrendingUp, Shield, Globe, Zap } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import Typewriter from './Typewriter';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HeroSection() {
  const [stats, setStats] = useState({
    taskSuccessRate: 0,
    availableAssistants: 0,
    documentsGenerated: 0,
    totalJobs: 0,
    totalUsers: 0,
    totalCourses: 0
  });
  const [loading, setLoading] = useState(true);
  const { ref: statsRef, inView: statsInView } = useInView({ triggerOnce: true, threshold: 0.3 });
  const heroRef = useRef(null);

  useEffect(() => {
    loadStats();
    
    // Parallax effect on scroll
    const handleScroll = () => {
      if (heroRef.current) {
        const scrolled = window.scrollY;
        heroRef.current.style.transform = `translateY(${scrolled * 0.15}px)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function loadStats() {
    try {
      // Get VA stats
      const { data: vas } = await supabase
        .from('virtual_assistants')
        .select('tasks_completed, qa_score');
      
      const totalTasks = vas?.reduce((sum, va) => sum + (va.tasks_completed || 0), 0) || 0;
      const avgQAScore = vas?.reduce((sum, va) => sum + (va.qa_score || 0), 0) / (vas?.length || 1);
      
      // Get certificates count
      const { count: certificatesCount } = await supabase
        .from('course_certificates')
        .select('*', { count: 'exact', head: true });
      
      // Get jobs count
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });
      
      // Get users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get courses count
      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        taskSuccessRate: Math.round(avgQAScore || 94),
        availableAssistants: vas?.length || 7,
        documentsGenerated: certificatesCount || 1250,
        totalJobs: jobsCount || 0,
        totalUsers: usersCount || 0,
        totalCourses: coursesCount || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setStats({
        taskSuccessRate: 94,
        availableAssistants: 7,
        documentsGenerated: 1250,
        totalJobs: 0,
        totalUsers: 0,
        totalCourses: 0
      });
    } finally {
      setLoading(false);
    }
  }

  const taglines = [
    'An intelligent governance system for the modern workforce',
    'Verified skills. Trusted hiring. Global partnerships.',
    'AI-powered matching for jobs and candidates.',
    'Real-time analytics and compliance monitoring.',
    'Connecting professionals across 7 countries.'
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      
      <div ref={heroRef} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 transition-transform duration-300">
        
        {/* Tagline with Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm mb-6 animate-pulse">
            <Sparkles className="w-4 h-4" />
            AI GOVERNED WORKFORCE PLATFORM
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Experience the future of HR with{' '}
            <span className="bg-gradient-to-r from-primary-400 via-purple-400 to-primary-400 bg-clip-text text-transparent animate-gradient">
              ODUSBABA's Intelligence
            </span>
          </h1>
          
          {/* Custom Typewriter Component */}
          <div className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto min-h-[100px]">
            <Typewriter
              words={taglines}
              delay={3000}
              typingSpeed={60}
              deletingSpeed={40}
              loop={true}
              className="text-slate-300"
            />
          </div>
        </div>

        {/* Stats Row with Count Up Animation */}
        <div 
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 mt-12 mb-16"
        >
          {/* Confidence Score */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 md:p-6 text-center hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="text-2xl md:text-3xl font-bold text-primary-400">
              {statsInView ? (
                <CountUp end={stats.taskSuccessRate} duration={2.5} suffix="%" />
              ) : (
                '0%'
              )}
            </div>
            <div className="text-xs md:text-sm text-slate-400 mt-1">CONFIDENCE</div>
            <div className="text-[10px] md:text-xs text-slate-500">Task Execution Rate</div>
          </div>
          
          {/* Availability */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 md:p-6 text-center hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="text-2xl md:text-3xl font-bold text-primary-400">
              {statsInView ? (
                <CountUp end={stats.availableAssistants} duration={2} suffix="/7" />
              ) : (
                '0/7'
              )}
            </div>
            <div className="text-xs md:text-sm text-slate-400 mt-1">AVAILABILITY</div>
            <div className="text-[10px] md:text-xs text-slate-500">Always-on AI</div>
          </div>
          
          {/* Impact */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 md:p-6 text-center hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="text-2xl md:text-3xl font-bold text-primary-400">
              {statsInView ? (
                <CountUp end={Math.floor(stats.documentsGenerated / 1000)} duration={2.5} suffix="k+" />
              ) : (
                '0k+'
              )}
            </div>
            <div className="text-xs md:text-sm text-slate-400 mt-1">IMPACT</div>
            <div className="text-[10px] md:text-xs text-slate-500">Documents Generated</div>
          </div>
          
          {/* Jobs */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 md:p-6 text-center hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="text-2xl md:text-3xl font-bold text-primary-400">
              {statsInView ? (
                <CountUp end={stats.totalJobs} duration={2} suffix="+" />
              ) : (
                '0+'
              )}
            </div>
            <div className="text-xs md:text-sm text-slate-400 mt-1">OPPORTUNITIES</div>
            <div className="text-[10px] md:text-xs text-slate-500">Active Jobs</div>
          </div>
          
          {/* Users */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 md:p-6 text-center hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="text-2xl md:text-3xl font-bold text-primary-400">
              {statsInView ? (
                <CountUp end={stats.totalUsers} duration={2.5} suffix="+" />
              ) : (
                '0+'
              )}
            </div>
            <div className="text-xs md:text-sm text-slate-400 mt-1">MEMBERS</div>
            <div className="text-[10px] md:text-xs text-slate-500">Active Users</div>
          </div>
          
          {/* Courses */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 md:p-6 text-center hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="text-2xl md:text-3xl font-bold text-primary-400">
              {statsInView ? (
                <CountUp end={stats.totalCourses} duration={2} suffix="+" />
              ) : (
                '0+'
              )}
            </div>
            <div className="text-xs md:text-sm text-slate-400 mt-1">COURSES</div>
            <div className="text-[10px] md:text-xs text-slate-500">Learning Paths</div>
          </div>
        </div>

        {/* CTA Buttons with Pulse Animation */}
        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <Link 
            to="/jobs" 
            className="group px-6 md:px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/20 animate-pulse-glow flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            Browse Jobs
          </Link>
          <Link 
            to="/tester-register" 
            className="group px-6 md:px-8 py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-all duration-200 border border-slate-700 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Become a Tester
          </Link>
          <Link 
            to="/contact" 
            className="group px-6 md:px-8 py-3 bg-transparent text-slate-300 font-semibold rounded-xl hover:bg-slate-800/50 transition-all duration-200 border border-slate-700 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Contact Sales
          </Link>
        </div>
        
        <p className="text-center text-xs md:text-sm text-slate-500 mt-6">
          🎓 Get 4 weeks of full access as a tester. No credit card required.
        </p>
        
        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-8 pt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> GDPR Compliant</span>
          <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-primary-400" /> 256-bit Encryption</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3 text-blue-400" /> 7 Countries</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> 24/7 Support</span>
        </div>
      </div>
    </div>
  );
}
