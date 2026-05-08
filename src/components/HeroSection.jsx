// src/components/HeroSection.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Globe, Zap, Users, Award, Sparkles, CheckCircle } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SUPPORTED_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', count: 0 },
  { code: 'US', name: 'United States', flag: '🇺🇸', count: 0 },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', count: 0 },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', count: 0 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', count: 0 },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', count: 0 },
  { code: 'FR', name: 'France', flag: '🇫🇷', count: 0 }
];

export default function HeroSection() {
  const [stats, setStats] = useState({
    taskSuccessRate: 0,
    availableAssistants: 0,
    documentsGenerated: 0,
    totalUsers: 0,
    totalJobs: 0
  });
  const [loading, setLoading] = useState(true);
  const [countryJobs, setCountryJobs] = useState(SUPPORTED_COUNTRIES);

  useEffect(() => {
    loadStats();
    loadCountryJobs();
  }, []);

  async function loadStats() {
    try {
      // Get VA completion rate
      const { data: vas } = await supabase
        .from('virtual_assistants')
        .select('tasks_completed, qa_score');
      
      const totalTasks = vas?.reduce((sum, va) => sum + (va.tasks_completed || 0), 0) || 0;
      const avgQAScore = vas?.reduce((sum, va) => sum + (va.qa_score || 0), 0) / (vas?.length || 1);
      
      // Get certificates count (documents generated)
      const { count: certificatesCount } = await supabase
        .from('course_certificates')
        .select('*', { count: 'exact', head: true });
      
      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get total jobs
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        taskSuccessRate: Math.round(avgQAScore || 94),
        availableAssistants: vas?.length || 7,
        documentsGenerated: certificatesCount || 1250,
        totalUsers: usersCount || 0,
        totalJobs: jobsCount || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      // Fallback values
      setStats({
        taskSuccessRate: 94,
        availableAssistants: 24,
        documentsGenerated: 1250,
        totalUsers: 0,
        totalJobs: 0
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadCountryJobs() {
    try {
      const updatedCountries = [...SUPPORTED_COUNTRIES];
      for (let i = 0; i < updatedCountries.length; i++) {
        const { count } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('country_code', updatedCountries[i].code);
        updatedCountries[i].count = count || 0;
      }
      setCountryJobs(updatedCountries);
    } catch (err) {
      console.error('Error loading country jobs:', err);
    }
  }

  const features = [
    { icon: Sparkles, title: "AI-Powered Intelligence", description: "ODUSBABA learns from every interaction to provide smarter recommendations" },
    { icon: Shield, title: "Governed Trust", description: "Every skill verified through AI and human oversight for maximum reliability" },
    { icon: Globe, title: "Global Workforce", description: "Connect with professionals and employers from around the world" },
    { icon: Users, title: "7 Countries", description: "UK, Nigeria, US, Canada, AU, DE, FR - with more coming", highlight: true },
    { icon: Zap, title: "Real-Time Matching", description: "Instant job and skill matching powered by advanced AI algorithms" },
    { icon: Award, title: "Value Partnership", description: "Creating Value for Partnership in every interaction and transaction" }
  ];

  if (loading) {
    return (
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-16 text-center">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="text-3xl font-bold text-primary-400">{stats.taskSuccessRate}%</div>
            <div className="text-sm text-slate-400 mt-1">CONFIDENCE</div>
            <div className="text-xs text-slate-500">Task Execution Success Rate</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="text-3xl font-bold text-primary-400">{stats.availableAssistants}/7</div>
            <div className="text-sm text-slate-400 mt-1">AVAILABILITY</div>
            <div className="text-xs text-slate-500">Always-on AI Assistance</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="text-3xl font-bold text-primary-400">{Math.floor(stats.documentsGenerated / 1000)}k+</div>
            <div className="text-sm text-slate-400 mt-1">IMPACT</div>
            <div className="text-xs text-slate-500">Documents Generated Globally</div>
          </div>
        </div>

        {/* Hero Text */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            AI GOVERNED WORKFORCE PLATFORM
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Experience the future of HR with{' '}
            <span className="bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
              ODUSBABA's Intelligence
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            An intelligent governance system for the modern workforce
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, idx) => (
            <div key={idx} className={`bg-slate-900/30 border rounded-xl p-6 backdrop-blur-sm transition-all hover:-translate-y-1 ${feature.highlight ? 'border-primary-500/30 bg-primary-500/5' : 'border-slate-800'}`}>
              <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
              {feature.highlight && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {countryJobs.map(country => (
                    <span key={country.code} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 rounded-full">
                      <span>{country.flag}</span>
                      <span className="text-slate-300">{country.code}</span>
                      <span className="text-primary-400">({country.countryJobs})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Link 
            to="/tester-register" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/20"
          >
            Start Free Trial →
          </Link>
          <p className="text-sm text-slate-500 mt-4">Get 4 weeks of full access as a tester. No credit card required.</p>
        </div>
      </div>
    </div>
  );
}
