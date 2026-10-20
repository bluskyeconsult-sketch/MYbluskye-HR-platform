import { useEffect, useState } from 'react';
import { authenticatedFetch } from '../../lib/authFetch';
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
    visitorSessions7d: 0,
    totalJobs: 0,
    totalApplications: 0,
    totalVATasks: 0,
    storageUsed: 0,
    estimatedGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => { loadMetrics(); }, []);

  // REWORKED (2026-10-20): figures now come from the server (service role), so row-level security cannot shrink
  // them and "active users" is not capped at 1,000 rows. The invented "Storage used 0.5 GB" bar and the hard-coded
  // free-tier text are removed: real database/storage/MAU usage against the plan limits is on the Admin Dashboard
  // (Platform Capacity).
  async function loadMetrics() {
    try {
      const t = await authenticatedFetch('health-stats');
      const newUsers30d = t.usage?.newUsers30d || 0;
      const totalUsers = t.users || 0;
      const estimatedGrowth = Math.round((newUsers30d / 30) * 90);
      const recs = [];
      if (estimatedGrowth > 500) recs.push({ level: 'info', message: `Projected to add ${estimatedGrowth} users in 3 months. Check Platform Capacity on the Admin Dashboard.` });
      setMetrics({
        totalUsers,
        newUsers30d,
        activeUsers7d: Math.min(t.usage?.activeUsers7d || 0, totalUsers),
        visitorSessions7d: t.usage?.visitorSessions7d || 0,
        totalJobs: t.jobs?.total || 0,
        totalApplications: t.usage?.applicationsTotal || 0,
        totalVATasks: t.usage?.vaTasks || 0,
        estimatedGrowth
      });
      setRecommendations(recs);
    } catch (e) {
      setLoadError(e.message || 'Could not load usage figures.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading metrics...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Usage & Scalability Dashboard</h1>
      {loadError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">{loadError}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-emerald-400" /><div><div className="text-2xl font-bold text-white">{metrics.totalUsers}</div><div className="text-xs text-slate-400">Total Users</div></div></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Activity className="w-5 h-5 text-sky-400" /><div><div className="text-2xl font-bold text-white">{metrics.activeUsers7d}</div><div className="text-xs text-slate-400">Active users (7 days)</div></div></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Zap className="w-5 h-5 text-rose-400" /><div><div className="text-2xl font-bold text-white">{metrics.visitorSessions7d}</div><div className="text-xs text-slate-400">Visitor sessions (7 days)</div></div></div></div>
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
        <h2 className="text-lg font-semibold text-white mb-4">Growth Metrics</h2>
        <div className="space-y-3">
          <div><div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Registered users active this week</span><span className="text-white">{metrics.activeUsers7d} of {metrics.totalUsers}</span></div><div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${metrics.totalUsers ? Math.min(100, (metrics.activeUsers7d / metrics.totalUsers) * 100) : 0}%` }}></div></div></div>
        </div>
        <div className="mt-6 p-4 bg-slate-800/30 rounded-lg"><p className="text-sm text-slate-400">Total users includes admins and testers. Database size, file storage and monthly active users against your plan limits are on the Admin Dashboard (Platform Capacity).</p></div>
      </div>
    </div>
  );
}
