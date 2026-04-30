import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Briefcase, TrendingUp, Calendar, Activity, Award, Clock } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0, totalJobs: 0, totalApplications: 0, totalSkills: 0,
    newUsersThisMonth: 0, activeTesters: 0, expiringTesters: 0, jobsByCountry: {}
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => { loadAnalytics(); }, [timeRange]);

  async function loadAnalytics() {
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: totalJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
    const { count: totalApplications } = await supabase.from('job_applications').select('*', { count: 'exact', head: true });
    const { count: totalSkills } = await supabase.from('skills').select('*', { count: 'exact', head: true });
    
    const startOfPeriod = new Date();
    if (timeRange === 'month') startOfPeriod.setDate(1);
    else if (timeRange === 'week') startOfPeriod.setDate(startOfPeriod.getDate() - 7);
    startOfPeriod.setHours(0,0,0,0);
    const { count: newUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfPeriod.toISOString());
    
    const { count: activeTesters } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'tester').gte('tester_expires_at', new Date().toISOString());
    
    const weekFromNow = new Date(); weekFromNow.setDate(weekFromNow.getDate() + 7);
    const { count: expiringTesters } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'tester').lte('tester_expires_at', weekFromNow.toISOString()).gte('tester_expires_at', new Date().toISOString());
    
    const { data: jobsByCountry } = await supabase.from('jobs').select('country_code').eq('compliance_status', 'approved');
    const countryMap = {};
    jobsByCountry?.forEach(job => { countryMap[job.country_code] = (countryMap[job.country_code] || 0) + 1; });
    
    setStats({ totalUsers: totalUsers || 0, totalJobs: totalJobs || 0, totalApplications: totalApplications || 0, totalSkills: totalSkills || 0, newUsersThisMonth: newUsers || 0, activeTesters: activeTesters || 0, expiringTesters: expiringTesters || 0, jobsByCountry: countryMap });
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Loading analytics...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <div className="flex gap-2">
          <button onClick={() => setTimeRange('week')} className={`px-3 py-1 rounded-lg text-sm ${timeRange === 'week' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Last 7 Days</button>
          <button onClick={() => setTimeRange('month')} className={`px-3 py-1 rounded-lg text-sm ${timeRange === 'month' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>This Month</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-emerald-400" /><div><div className="text-2xl font-bold text-white">{stats.totalUsers}</div><div className="text-xs text-slate-400">Total Users</div></div></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Briefcase className="w-5 h-5 text-emerald-400" /><div><div className="text-2xl font-bold text-white">{stats.totalJobs}</div><div className="text-xs text-slate-400">Total Jobs</div></div></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-emerald-400" /><div><div className="text-2xl font-bold text-white">{stats.totalApplications}</div><div className="text-xs text-slate-400">Applications</div></div></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Award className="w-5 h-5 text-emerald-400" /><div><div className="text-2xl font-bold text-white">{stats.totalSkills}</div><div className="text-xs text-slate-400">Skills Submitted</div></div></div></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-sky-400" /><div><div className="text-2xl font-bold text-white">{stats.newUsersThisMonth}</div><div className="text-xs text-slate-400">New Users ({timeRange === 'week' ? '7 days' : '30 days'})</div></div></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Activity className="w-5 h-5 text-purple-400" /><div><div className="text-2xl font-bold text-white">{stats.activeTesters}</div><div className="text-xs text-slate-400">Active Testers</div></div></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Clock className="w-5 h-5 text-amber-400" /><div><div className="text-2xl font-bold text-white">{stats.expiringTesters}</div><div className="text-xs text-slate-400">Testers Expiring Soon</div></div></div></div>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Jobs by Country</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.jobsByCountry).map(([country, count]) => (
            <div key={country} className="px-3 py-2 bg-slate-800 rounded-lg"><span className="font-medium text-white">{country}</span><span className="ml-2 text-xs text-emerald-400">{count} jobs</span></div>
          ))}
          {Object.keys(stats.jobsByCountry).length === 0 && <p className="text-slate-400">No job data available</p>}
        </div>
      </div>
    </div>
  );
}
