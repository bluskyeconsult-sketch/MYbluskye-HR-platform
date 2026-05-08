import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, Briefcase, BookOpen, FileText, Bot, Brain,
  TrendingUp, DollarSign, Eye, CheckCircle, XCircle, Clock,
  AlertCircle, Shield, Zap, Star, Award, Calendar,
  ChevronRight, Globe, MapPin, RefreshCw, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SUPPORTED_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' }
];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    jobs: 0,
    courses: 0,
    books: 0,
    assessments: 0,
    virtualAssistants: 0,
    pendingJobs: 0,
    externalJobs: 0,
    jobsByCountry: {}
  });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/admin-login';
        return;
      }
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        toast.error('Access denied. Admin privileges required.');
        window.location.href = '/dashboard';
        return;
      }
      
      setIsAuthorized(true);
      await loadStats();
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      // Get users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get jobs count by country
      const { data: jobs } = await supabase
        .from('jobs')
        .select('country_code');
      
      const jobsByCountry = {};
      SUPPORTED_COUNTRIES.forEach(country => {
        jobsByCountry[country.code] = jobs?.filter(j => j.country_code === country.code).length || 0;
      });
      
      // Get courses count
      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });
      
      // Get books count
      const { count: booksCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });
      
      // Get assessments count
      const { count: assessmentsCount } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true });
      
      // Get virtual assistants count
      const { count: vasCount } = await supabase
        .from('virtual_assistants')
        .select('*', { count: 'exact', head: true });
      
      // Get pending external jobs
      const { count: pendingJobsCount } = await supabase
        .from('external_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');
      
      // Get total external jobs
      const { count: externalJobsCount } = await supabase
        .from('external_jobs')
        .select('*', { count: 'exact', head: true });

      setStats({
        users: usersCount || 0,
        jobs: jobs?.length || 0,
        jobsByCountry: jobsByCountry,
        courses: coursesCount || 0,
        books: booksCount || 0,
        assessments: assessmentsCount || 0,
        virtualAssistants: vasCount || 0,
        pendingJobs: pendingJobsCount || 0,
        externalJobs: externalJobsCount || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      toast.error('Failed to load dashboard data');
    }
  }

  async function refreshData() {
    toast.loading('Refreshing...', { id: 'refresh' });
    await loadStats();
    toast.success('Dashboard refreshed', { id: 'refresh' });
  }

  const statCards = [
    { title: 'Total Users', value: stats.users, icon: Users, color: 'blue', link: '/admin/users' },
    { title: 'Total Jobs', value: stats.jobs, icon: Briefcase, color: 'emerald', link: '/admin/jobs' },
    { title: 'Courses', value: stats.courses, icon: BookOpen, color: 'purple', link: '/admin/courses' },
    { title: 'Books', value: stats.books, icon: BookOpen, color: 'amber', link: '/admin/books' },
    { title: 'Assessments', value: stats.assessments, icon: Brain, color: 'pink', link: '/admin/assessments' },
    { title: 'Virtual Assistants', value: stats.virtualAssistants, icon: Bot, color: 'indigo', link: '/admin/virtual-assistants' },
    { title: 'Pending External', value: stats.pendingJobs, icon: Clock, color: 'orange', link: '/admin/external-jobs' },
    { title: 'Total External', value: stats.externalJobs, icon: Globe, color: 'cyan', link: '/admin/external-jobs' }
  ];

  if (!isAuthorized && !loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">Access Denied. Admin privileges required.</p>
          <button onClick={() => window.location.href = '/admin-login'} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-400" /> Admin Dashboard
            </h1>
            <p className="text-slate-400 text-sm">Welcome back, {user?.email}</p>
          </div>
          <button onClick={refreshData} className="px-4 py-2 bg-slate-700 text-white rounded-lg flex items-center gap-2 hover:bg-slate-600">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, idx) => (
            <Link key={idx} to={stat.link} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-slate-400 text-xs">{stat.title}</p>
              <p className="text-xl font-bold text-white">{stat.value.toLocaleString()}</p>
            </Link>
          ))}
        </div>

        {/* Jobs by Country */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-400" /> Jobs by Country
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {SUPPORTED_COUNTRIES.map(country => (
              <Link key={country.code} to={`/admin/jobs?country=${country.code}`} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center hover:border-primary-500/30 transition-all">
                <div className="text-2xl mb-1">{country.flag}</div>
                <p className="text-xs text-slate-400">{country.code}</p>
                <p className="text-xl font-bold text-white">{stats.jobsByCountry[country.code] || 0}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/admin/jobs" className="bg-slate-800 p-3 rounded-lg text-center hover:bg-slate-700 transition">
              <Briefcase className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
              <span className="text-sm text-white">Manage Jobs</span>
            </Link>
            <Link to="/admin/users" className="bg-slate-800 p-3 rounded-lg text-center hover:bg-slate-700 transition">
              <Users className="w-5 h-5 mx-auto mb-1 text-blue-400" />
              <span className="text-sm text-white">Manage Users</span>
            </Link>
            <Link to="/admin/external-jobs" className="bg-slate-800 p-3 rounded-lg text-center hover:bg-slate-700 transition">
              <Globe className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
              <span className="text-sm text-white">External Jobs</span>
            </Link>
            <Link to="/admin/analytics" className="bg-slate-800 p-3 rounded-lg text-center hover:bg-slate-700 transition">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-purple-400" />
              <span className="text-sm text-white">Analytics</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
