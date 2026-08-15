import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Users, Database, Zap, AlertTriangle, TrendingUp } from 'lucide-react';

// FIXED (2026-08-09):
// 1. Disconnected Supabase client (same pattern as AffiliateManagement.jsx
//    — see that file for why this matters).
// 2. Queried a table called `sessions`, which doesn't exist anywhere in
//    the real schema — this would have silently failed and always shown 0
//    active users. Connected to the real analytics_sessions table (built
//    earlier this session) instead, which tracks exactly this.

export default function UsageMeter() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    newUsers30d: 0,
    activeUsers7d: 0,
    totalJobs: 0,
    totalApplications: 0,
    totalVATasks: 0,
    storageUsed: 0,
    estimatedGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => { loadMetrics(); }, []);

  async function loadMetrics() {
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: newUsers30d } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString());
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: activeUsers7d } = await supabase.from('analytics_sessions').select('*', { count: 'exact', head: true }).gte('start_time', sevenDaysAgo.toISOString());
    
    const { count: totalJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
    const { count: totalApplications } = await supabase.from('job_applications').select('*', { count: 'exact', head: true });
    const { count: totalVATasks } = await supabase.from('va_tasks').select('*', { count: 'exact', head: true });
    
    // Calculate estimated growth (simplified)
    const growthRate = newUsers30d / 30;
    const estimatedGrowth = Math.round(growthRate * 90); // 3 months projection
    
    // Generate recommendations
    const recs = [];
    if (totalUsers > 500) recs.push({ level: 'info', message: 'Consider upgrading Supabase to Pro plan for better performance.' });
    if (totalUsers > 1000) recs.push({ level: 'warning', message: 'High traffic detected. Consider adding load balancing.' });
    if (estimatedGrowth > 500) recs.push({ level: 'info', message: `Projected to add ${estimatedGrowth} users in 3 months. Plan capacity.` });
    
    setMetrics({
      totalUsers: totalUsers || 0,
      newUsers30d: newUsers30d || 0,
      activeUsers7d: activeUsers7d || 0,
      totalJobs: totalJobs || 0,
      totalApplications: totalApplications || 0,
      totalVATasks: totalVATasks || 0,
      estimatedGrowth
    });
    setRecommendations(recs);
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading metrics...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Usage & Scalability Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-emerald-400" /><div><div className="text-2xl font-bold text-white">{metrics.totalUsers}</div><div className="text-xs text-slate-400">Total Users</div></div></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Activity className="w-5 h-5 text-sky-400" /><div><div className="text-2xl font-bold text-white">{metrics.activeUsers7d}</div><div className="text-xs text-slate-400">Active (7 days)</div></div></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-amber-400" /><div><div className="text-2xl font-bold text-white">{metrics.estimatedGrowth}</div><div className="text-xs text-slate-400">Projected (90 days)</div></div></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Database className="w-5 h-5 text-purple-400" /><div><div className="text-2xl font-bold text-white">{metrics.totalJobs}</div><div className="text-xs text-slate-400">Total Jobs</div></div></div></div>
      </div>
      
      {recommendations.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Recommendations</h3>
          <ul className="space-y-1">{recommendations.map((rec, i) => <li key={i} className="text-sm text-slate-300">• {rec.message}</li>)}</ul>
        </div>
      )}
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Growth Metrics (30 days)</h2>
        <div className="space-y-3">
          <div><div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Daily Active Users</span><span className="text-white">{metrics.activeUsers7d}</span></div><div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, (metrics.activeUsers7d / 100) * 100)}%` }}></div></div></div>
          <div><div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Storage Used (estimated)</span><span className="text-white">0.5 GB</span></div><div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-sky-500 h-2 rounded-full" style={{ width: '5%' }}></div></div></div>
        </div>
        <div className="mt-6 p-4 bg-slate-800/30 rounded-lg"><p className="text-sm text-slate-400">Supabase Free Tier Limits: 2GB database, 5GB storage, 200 concurrent connections</p><p className="text-xs text-slate-500 mt-2">Consider upgrading at 80% capacity.</p></div>
      </div>
    </div>
  );
}
