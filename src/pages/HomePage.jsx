// src/pages/HomePage.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import HeroSection from '../components/HeroSection';
import { Link } from 'react-router-dom';
import { Briefcase, Users, BookOpen, Brain, Bot, Mail, Zap, Shield, TrendingUp, Award, Globe } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HomePage() {
  const [stats, setStats] = useState({ users: 0, jobs: 0, courses: 0, assessments: 0 });
  const [articles, setArticles] = useState([]);
  const [countryStats, setCountryStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const countries = [
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' }
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
        .select('id, title, excerpt, slug, created_at')
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <HeroSection />

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <Users className="w-8 h-8 text-primary-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{stats.users.toLocaleString()}+</div>
            <div className="text-sm text-slate-400">Active Users</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <Briefcase className="w-8 h-8 text-primary-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{stats.jobs.toLocaleString()}+</div>
            <div className="text-sm text-slate-400">Jobs Posted</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <BookOpen className="w-8 h-8 text-primary-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{stats.courses.toLocaleString()}+</div>
            <div className="text-sm text-slate-400">Courses Available</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <Brain className="w-8 h-8 text-primary-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{stats.assessments.toLocaleString()}+</div>
            <div className="text-sm text-slate-400">Assessments</div>
          </div>
        </div>
      </div>

      {/* Countries Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Global Presence</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Connecting professionals and employers across 7 countries
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {countryStats.map(country => (
            <div key={country.code} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center hover:border-primary-500/30 transition">
              <div className="text-3xl mb-2">{country.flag}</div>
              <div className="text-sm font-medium text-white">{country.code}</div>
              <div className="text-xs text-slate-400">{country.name}</div>
              <div className="text-xs text-primary-400 mt-1">{country.jobCount} jobs</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-primary-600/20 to-purple-600/20 border border-primary-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Transform Your HR Experience?</h2>
          <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
            Join thousands of professionals and employers using ODUSBABA to build trust, verify skills, and create meaningful partnerships.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/sign-up" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition">
              Get Started Free
            </Link>
            <Link to="/tester-register" className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">
              Become a Tester
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-4">No credit card required. Free trial available for testers.</p>
        </div>
      </div>
    </div>
  );
}
