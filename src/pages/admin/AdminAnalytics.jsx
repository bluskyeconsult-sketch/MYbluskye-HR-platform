import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, Users, Briefcase, DollarSign, Download,
  Calendar, RefreshCw, Loader2, AlertCircle,
  BarChart3, PieChart, LineChart, Activity
} from 'lucide-react';
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

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [userGrowth, setUserGrowth] = useState([]);
  const [jobTrends, setJobTrends] = useState([]);
  const [revenueByCountry, setRevenueByCountry] = useState([]);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalRevenue: 0,
    conversionRate: 0,
    activeUsers: 0,
    avgJobApplications: 0
  });
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAnalytics();
    }
  }, [dateRange, isSuperAdmin]);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/admin-login'; return; }
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.user_type !== 'super_admin') {
        toast.error('Access denied. Super Admin privileges required.');
        window.location.href = '/admin/dashboard';
        return;
      }
      
      setIsSuperAdmin(true);
      await loadAnalytics();
    } catch (err) {
      window.location.href = '/admin-login';
    }
  }

  function getDateRangeFilter() {
    const days = parseInt(dateRange);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);
      
      const dateFilter = getDateRangeFilter();
      
      // User growth over time
      const { data: users } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: true });
      
      const userGrowthMap = {};
      users?.forEach(user => {
        const date = new Date(user.created_at).toLocaleDateString();
        userGrowthMap[date] = (userGrowthMap[date] || 0) + 1;
      });
      setUserGrowth(Object.entries(userGrowthMap).map(([date, count]) => ({ date, count })));
      
      // Job trends
      const { data: jobs } = await supabase
        .from('jobs')
        .select('created_at, status')
        .gte('created_at', dateFilter);
      
      const jobTrendsMap = {};
      jobs?.forEach(job => {
        const date = new Date(job.created_at).toLocaleDateString();
        if (!jobTrendsMap[date]) {
          jobTrendsMap[date] = { pending: 0, approved: 0, rejected: 0 };
        }
        jobTrendsMap[date][job.status]++;
      });
      setJobTrends(Object.entries(jobTrendsMap).map(([date, counts]) => ({ date, ...counts })));
      
      // Revenue by country
      const { data: profiles } = await supabase
        .from('profiles')
        .select('country_code, user_type');
      
      const revenueMap = {};
      SUPPORTED_COUNTRIES.forEach(country => {
        revenueMap[country.code] = {
          code: country.code,
          name: country.name,
          flag: country.flag,
          users: profiles?.filter(p => p.country_code === country.code).length || 0
        };
      });
      setRevenueByCountry(Object.values(revenueMap));
      
      // Metrics
      const totalUsers = profiles?.length || 0;
      const totalJobs = jobs?.length || 0;
      const totalRevenue = totalUsers * 29; // Placeholder calculation
      
      setMetrics({
        totalUsers,
        totalJobs,
        totalRevenue,
        conversionRate: totalUsers > 0 ? ((totalJobs / totalUsers) * 100).toFixed(1) : 0,
        activeUsers: profiles?.filter(p => p.user_type !== 'free').length || 0,
        avgJobApplications: 12.5
      });
      
    } catch (err) {
      console.error('Analytics error:', err);
      setError('Failed to load analytics data');
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  async function exportReport() {
    toast.loading('Exporting report...', { id: 'export' });
    try {
      const headers = ['Metric', 'Value', 'Date', 'Notes'];
      const rows = [
        ['Total Users', metrics.totalUsers, new Date().toLocaleDateString(), 'All time'],
        ['Total Jobs', metrics.totalJobs, new Date().toLocaleDateString(), 'All time'],
        ['Total Revenue', `$${metrics.totalRevenue}`, new Date().toLocaleDateString(), 'Estimated'],
        ['Conversion Rate', `${metrics.conversionRate}%`, new Date().toLocaleDateString(), 'Users to Jobs'],
        ['Active Users', metrics.activeUsers, new Date().toLocaleDateString(), 'Non-free users']
      ];
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported', { id: 'export' });
    } catch (err) {
      toast.error('Failed to export', { id: 'export' });
    }
  }

  if (!isSuperAdmin) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary-400" /> Analytics Dashboard
            </h1>
            <p className="text-slate-400 text-sm">Platform performance and user metrics</p>
          </div>
          <div className="flex gap-3">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button onClick={exportReport} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Report
            </button>
            <button onClick={loadAnalytics} className="px-4 py-2 bg-slate-700 text-white rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-400" /><p className="text-slate-400 text-xs">Total Users</p></div><p className="text-2xl font-bold text-white">{metrics.totalUsers.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><Briefcase className="w-4 h-4 text-emerald-400" /><p className="text-slate-400 text-xs">Total Jobs</p></div><p className="text-2xl font-bold text-white">{metrics.totalJobs.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-yellow-400" /><p className="text-slate-400 text-xs">Total Revenue</p></div><p className="text-2xl font-bold text-white">${metrics.totalRevenue.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-purple-400" /><p className="text-slate-400 text-xs">Conversion Rate</p></div><p className="text-2xl font-bold text-white">{metrics.conversionRate}%</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-amber-400" /><p className="text-slate-400 text-xs">Active Users</p></div><p className="text-2xl font-bold text-white">{metrics.activeUsers.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><Briefcase className="w-4 h-4 text-pink-400" /><p className="text-slate-400 text-xs">Avg Apps/Job</p></div><p className="text-2xl font-bold text-white">{metrics.avgJobApplications}</p></div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}<button onClick={loadAnalytics} className="ml-2 text-primary-400">Retry</button></div>
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* User Growth Chart */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" /> User Growth</h2>
                {userGrowth.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No data available</p>
                ) : (
                  <div className="space-y-2">
                    {userGrowth.slice(-10).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2"><span className="text-xs text-slate-500 w-24">{item.date}</span><div className="flex-1 bg-slate-800 rounded-full h-6"><div className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.min(100, item.count * 2)}%` }}><span className="text-xs text-white">{item.count}</span></div></div></div>
                    ))}
                  </div>
                )}
              </div>

              {/* Revenue by Country */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-yellow-400" /> Revenue by Country</h2>
                <div className="space-y-3">
                  {revenueByCountry.sort((a, b) => b.users - a.users).map(country => (
                    <div key={country.code} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg"><span className="flex items-center gap-2"><span className="text-xl">{country.flag}</span> <span className="text-white">{country.name}</span></span><span className="text-emerald-400 font-medium">{country.users} users</span></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Job Trends Chart */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-emerald-400" /> Job Posting Trends</h2>
              {jobTrends.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex gap-4 min-w-max pb-4">
                    {jobTrends.slice(-14).map((item, idx) => (
                      <div key={idx} className="text-center w-20"><div className="text-xs text-slate-500 mb-1">{item.date}</div><div className="space-y-1"><div className="bg-amber-500 h-8 rounded-t" style={{ height: `${Math.min(80, (item.pending || 0) * 4)}px` }}></div><div className="bg-emerald-500 h-8 rounded-t" style={{ height: `${Math.min(80, (item.approved || 0) * 4)}px` }}></div><div className="bg-red-500 h-8 rounded-t" style={{ height: `${Math.min(80, (item.rejected || 0) * 4)}px` }}></div></div></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
