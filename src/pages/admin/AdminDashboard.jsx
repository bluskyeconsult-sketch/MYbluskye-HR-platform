import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Bell, Users, Briefcase, BookOpen, FileText, Bot, Brain,
  TrendingUp, DollarSign, Eye, CheckCircle, XCircle, Clock,
  AlertCircle, Shield, Zap, Star, Award, Calendar, MessageCircle,
  Settings, LogOut, Menu, X, ChevronRight, Globe, MapPin,
  Filter, RefreshCw, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define the 7 countries in your platform
const SUPPORTED_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: '£' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: '$' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: '₦' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'C$' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'A$' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: '€' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: '€' }
];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [stats, setStats] = useState({
    users: 0,
    jobs: 0,
    jobsByCountry: {},
    courses: 0,
    books: 0,
    assessments: 0,
    virtualAssistants: 0,
    revenue: 0,
    pendingJobs: 0,
    recentJobs: []
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    checkAuth();
    loadAllData();
    loadNotifications();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/admin-login';
        return;
      }
      setUser(session.user);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData);
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  async function loadAllData() {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadRecentActivity()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    setRefreshing(true);
    await loadAllData();
    toast.success('Dashboard refreshed');
    setRefreshing(false);
  }

  async function loadStats() {
    try {
      // Get users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get jobs count - from jobs table (may have country_code column)
      let jobsQuery = supabase.from('jobs').select('*', { count: 'exact', head: true });
      const { count: jobsCount } = await jobsQuery;
      
      // Get jobs by country - query jobs table or external_jobs
      const jobsByCountry = {};
      for (const country of SUPPORTED_COUNTRIES) {
        // Check both jobs and external_jobs tables for country-specific jobs
        let { count: internalJobs } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('country_code', country.code);
        
        let { count: externalJobs } = await supabase
          .from('external_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('location', country.code);
        
        // Also check location field for country mentions
        let { count: locationJobs } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .ilike('location', `%${country.name}%`);
        
        jobsByCountry[country.code] = (internalJobs || 0) + (externalJobs || 0) + (locationJobs || 0);
      }
      
      // Get recent jobs (last 10)
      const { data: recentJobs } = await supabase
        .from('jobs')
        .select('id, title, company, location, country_code, created_at, status')
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Get pending external jobs
      const { count: pendingJobsCount } = await supabase
        .from('external_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');
      
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

      setStats({
        users: usersCount || 0,
        jobs: jobsCount || 0,
        jobsByCountry: jobsByCountry,
        courses: coursesCount || 0,
        books: booksCount || 0,
        assessments: assessmentsCount || 0,
        virtualAssistants: vasCount || 0,
        revenue: 0,
        pendingJobs: pendingJobsCount || 0,
        recentJobs: recentJobs || []
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      toast.error('Failed to load job statistics');
    }
  }

  async function loadRecentActivity() {
    try {
      // Get recent user registrations
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, country_code')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Get recent job postings
      const { data: recentJobs } = await supabase
        .from('jobs')
        .select('id, title, company, created_at, country_code')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const activities = [];
      
      (recentUsers || []).forEach(user => {
        activities.push({
          id: user.id,
          type: 'user_registered',
          title: 'New User Registered',
          description: `${user.full_name || user.email} joined from ${getCountryName(user.country_code)}`,
          time: user.created_at,
          icon: Users,
          country: user.country_code
        });
      });
      
      (recentJobs || []).forEach(job => {
        activities.push({
          id: job.id,
          type: 'job_posted',
          title: 'New Job Posted',
          description: `${job.title} at ${job.company} in ${getCountryName(job.country_code)}`,
          time: job.created_at,
          icon: Briefcase,
          country: job.country_code
        });
      });
      
      // Sort by time (newest first)
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivity(activities.slice(0, 10));
    } catch (err) {
      console.error('Error loading activity:', err);
    }
  }

  async function loadNotifications() {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setNotifications(data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  }

  async function markNotificationRead(id) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  }

  function getCountryName(countryCode) {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);
    return country ? `${country.flag} ${country.name}` : '🌍 Unknown';
  }

  function getCountryFlag(countryCode) {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);
    return country ? country.flag : '🌍';
  }

  // Calculate filtered job count based on selected country
  const getFilteredJobCount = () => {
    if (selectedCountry === 'all') {
      return stats.jobs;
    }
    return stats.jobsByCountry[selectedCountry] || 0;
  };

  const statCards = [
    { title: 'Total Users', value: stats.users, icon: Users, color: 'blue', link: '/admin/users' },
    { title: 'Total Jobs', value: getFilteredJobCount(), icon: Briefcase, color: 'emerald', link: '/admin/jobs' },
    { title: 'Courses', value: stats.courses, icon: BookOpen, color: 'purple', link: '/admin/courses' },
    { title: 'Books', value: stats.books, icon: BookOpen, color: 'amber', link: '/admin/books' },
    { title: 'Assessments', value: stats.assessments, icon: Brain, color: 'pink', link: '/admin/assessments' },
    { title: 'Virtual Assistants', value: stats.virtualAssistants, icon: Bot, color: 'indigo', link: '/admin/virtual-assistants' },
    { title: 'Pending Jobs', value: stats.pendingJobs, icon: Clock, color: 'orange', link: '/admin/external-jobs' },
    { title: 'Revenue', value: `$${stats.revenue}`, icon: DollarSign, color: 'green', link: '/admin/analytics' },
  ];

  const quickActions = [
    { title: 'Create Article', icon: FileText, path: '/admin/articles/new', color: 'blue' },
    { title: 'Add Book', icon: BookOpen, path: '/admin/books/new', color: 'emerald' },
    { title: 'Add Course', icon: BookOpen, path: '/admin/courses/new', color: 'purple' },
    { title: 'Add VA', icon: Bot, path: '/admin/virtual-assistants/new', color: 'amber' },
    { title: 'Create Assessment', icon: Brain, path: '/admin/assessments/new', color: 'pink' },
    { title: 'View Reports', icon: TrendingUp, path: '/admin/analytics', color: 'indigo' },
    { title: 'Post Job', icon: Briefcase, path: '/admin/jobs/new', color: 'emerald' },
    { title: 'View All Jobs', icon: Globe, path: '/admin/jobs', color: 'cyan' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with Refresh */}
        <div className="flex flex-wrap justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 mt-1">Welcome back, {profile?.full_name || user?.email}</p>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        {/* Country Filter Bar */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-400" />
              <span className="text-white font-medium">Filter by Country:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCountry('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                  selectedCountry === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                All Countries
              </button>
              {SUPPORTED_COUNTRIES.map(country => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                    selectedCountry === country.code
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{country.flag}</span>
                  {country.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, idx) => (
            <Link key={idx} to={stat.link} className="block bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-primary-500/30 transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
            </Link>
          ))}
        </div>

        {/* Jobs by Country Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-400" />
              Jobs by Country
            </h2>
            <Link to="/admin/jobs" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View All Jobs <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            {SUPPORTED_COUNTRIES.map(country => (
              <div
                key={country.code}
                onClick={() => setSelectedCountry(country.code)}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-primary-500/30 transition-all"
              >
                <div className="text-2xl mb-1">{country.flag}</div>
                <p className="text-xs text-slate-400">{country.code}</p>
                <p className="text-xl font-bold text-white">{stats.jobsByCountry[country.code] || 0}</p>
                <p className="text-xs text-slate-500">jobs</p>
              </div>
            ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {quickActions.map((action, idx) => (
                  <Link key={idx} to={action.path} className={`bg-slate-800 p-3 rounded-lg text-center hover:bg-${action.color}-500/10 transition border border-slate-700 hover:border-${action.color}-500/30 group`}>
                    <action.icon className={`w-6 h-6 mx-auto mb-1 text-${action.color}-400`} />
                    <p className="text-xs text-white group-hover:text-primary-400">{action.title}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Jobs */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary-400" />
                  Recent Jobs {selectedCountry !== 'all' && `in ${getCountryName(selectedCountry)}`}
                </h2>
              </div>
              <div className="space-y-3">
                {stats.recentJobs.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No recent jobs found</p>
                ) : (
                  (selectedCountry === 'all' 
                    ? stats.recentJobs 
                    : stats.recentJobs.filter(job => 
                        job.country_code === selectedCountry || 
                        job.location?.includes(getCountryName(selectedCountry))
                      )
                  ).slice(0, 5).map(job => (
                    <div key={job.id} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{job.title}</p>
                        <p className="text-xs text-slate-400">{job.company}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500">{job.location || 'Remote'}</span>
                        <p className="text-xs text-slate-600">{new Date(job.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No recent activity</p>
                ) : (
                  recentActivity.slice(0, 5).map(activity => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center">
                        <activity.icon className="w-4 h-4 text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{activity.title}</p>
                        <p className="text-xs text-slate-400">{activity.description}</p>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(activity.time).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Notifications</h2>
              <Bell className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No new notifications</p>
              ) : (
                notifications.map(notification => (
                  <div key={notification.id} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-white">{notification.title}</p>
                      <p className="text-xs text-slate-400">{notification.message}</p>
                    </div>
                    <button onClick={() => markNotificationRead(notification.id)} className="text-xs text-primary-400 hover:text-primary-300">
                      Dismiss
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <Link to="/admin/notifications" className="text-sm text-primary-400 hover:text-primary-300 flex items-center justify-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">System Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <span className="text-slate-400">API Status</span>
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" /> Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <span className="text-slate-400">Database</span>
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" /> Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <span className="text-slate-400">Auth Service</span>
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" /> Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <span className="text-slate-400">Countries Active</span>
              <span className="text-slate-300">{SUPPORTED_COUNTRIES.length} Countries</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
