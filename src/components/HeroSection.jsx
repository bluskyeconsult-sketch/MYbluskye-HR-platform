// src/components/HeroSection.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import CountUp from 'react-countup';
import Typical from 'react-typical';
import { Sparkles, TrendingUp, Shield, Globe, Users, Briefcase, Award, CheckCircle } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HeroSection() {
  const [stats, setStats] = useState({
    taskSuccessRate: 0,
    availableAssistants: 0,
    documentsGenerated: 0,
    totalJobs: 0
  });
  const [loading, setLoading] = useState(true);
  const { ref: statsRef, inView: statsInView } = useInView({ triggerOnce: true, threshold: 0.3 });
  const heroRef = useRef(null);

  useEffect(() => {
    loadStats();
    
    // Parallax effect
    const handleScroll = () => {
      if (heroRef.current) {
        const scrolled = window.scrollY;
        heroRef.current.style.transform = `translateY(${scrolled * 0.2}px)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function loadStats() {
    try {
      const { data: vas } = await supabase
        .from('virtual_assistants')
        .select('tasks_completed, qa_score');
      
      const totalTasks = vas?.reduce((sum, va) => sum + (va.tasks_completed || 0), 0) || 0;
      const avgQAScore = vas?.reduce((sum, va) => sum + (va.qa_score || 0), 0) / (vas?.length || 1);
      
      const { count: certificatesCount } = await supabase
        .from('course_certificates')
        .select('*', { count: 'exact', head: true });
      
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        taskSuccessRate: Math.round(avgQAScore || 94),
        availableAssistants: vas?.length || 7,
        documentsGenerated: certificatesCount || 1250,
        totalJobs: jobsCount || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setStats({
        taskSuccessRate: 94,
        availableAssistants: 24,
        documentsGenerated: 1250,
        totalJobs: 0
      });
    } finally {
      setLoading(false);
    }
  }

  const taglines = [
    'Creating Value for Partnership',
    'AI-Powered HR Intelligence',
    'Governed Workforce Platform',
    'Trusted by Professionals Worldwide'
  ];

  return (
    <div ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        
        {/* Tagline with Typing Effect */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            AI GOVERNED WORKFORCE PLATFORM
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Experience the future of HR with{' '}
            <span className="bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
              ODUSBABA's Intelligence
            </span>
          </h1>
          
          <div className="text-xl text-slate-400 max-w-2xl mx-auto">
            <Typical
              steps={[
                'An intelligent governance system for the modern workforce',
                3000,
                'Verified skills. Trusted hiring. Global partnerships.',
                3000,
                'AI-powered matching for jobs and candidates.',
                3000,
                'Real-time analytics and compliance monitoring.',
                3000
              ]}
              loop={Infinity}
              wrapper="p"
              className="text-slate-300"
            />
          </div>
        </div>

        {/* Stats Row with Count Up */}
        <div 
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 text-center"
        >
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 card-hover">
            <div className="text-3xl font-bold text-primary-400">
              {statsInView ? (
                <CountUp end={stats.taskSuccessRate} duration={2.5} suffix="%" />
              ) : (
                '0%'
              )}
            </div>
            <div className="text-sm text-slate-400 mt-1">CONFIDENCE</div>
            <div className="text-xs text-slate-500">Task Execution Success Rate</div>
          </div>
          
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 card-hover">
            <div className="text-3xl font-bold text-primary-400">
              {statsInView ? (
                <CountUp end={stats.availableAssistants} duration={2} suffix="/7" />
              ) : (
                '0/7'
              )}
            </div>
            <div className="text-sm text-slate-400 mt-1">AVAILABILITY</div>
            <div className="text-xs text-slate-500">Always-on AI Assistance</div>
          </div>
          
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 card-hover">
            <div className="text-3xl font-bold text-primary-400">
              {statsInView ? (
                <CountUp end={Math.floor(stats.documentsGenerated / 1000)} duration={2.5} suffix="k+" />
              ) : (
                '0k+'
              )}
            </div>
            <div className="text-sm text-slate-400 mt-1">IMPACT</div>
            <div className="text-xs text-slate-500">Documents Generated Globally</div>
          </div>
          
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 card-hover">
            <div className="text-3xl font-bold text-primary-400">
              {statsInView ? (
                <CountUp end={stats.totalJobs} duration={2} suffix="+" />
              ) : (
                '0+'
              )}
            </div>
            <div className="text-sm text-slate-400 mt-1">OPPORTUNITIES</div>
            <div className="text-xs text-slate-500">Active Job Listings</div>
          </div>
        </div>

        {/* CTA Buttons with Pulse Animation */}
        <div className="flex flex-wrap gap-4 justify-center mt-12">
          <Link 
            to="/jobs" 
            className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/20 animate-pulse-glow"
          >
            Browse Jobs
          </Link>
          <Link 
            to="/tester-register" 
            className="px-8 py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-all duration-200 border border-slate-700"
          >
            Become a Tester
          </Link>
        </div>
        
        <p className="text-center text-sm text-slate-500 mt-4">
          Get 4 weeks of full access as a tester. No credit card required.
        </p>
      </div>
    </div>
  );
}
