// src/pages/admin/AnalyticsDashboard.jsx
// Analytics Dashboard - Visitor statistics and growth metrics

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Eye, TrendingUp, Loader2, RefreshCw, Briefcase, FileText, Activity, Calendar, UserPlus, Clock, BarChart3 } from 'lucide-react';

export default function AnalyticsDashboard() {
    const [stats, setStats] = useState({ totalUsers: 0, totalJobs: 0, totalApplications: 0, totalVisits: 0 });
    const [pageViews, setPageViews] = useState([]);
    const [growthData, setGrowthData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [days, setDays] = useState(30);

    useEffect(() => {
        loadStats();
    }, [days]);

    async function loadStats() {
        setRefreshing(true);
        try {
            const [userCount, jobCount, appCount, pageCount] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('jobs').select('*', { count: 'exact', head: true }),
                supabase.from('job_applications').select('*', { count: 'exact', head: true }),
                supabase.from('page_analytics').select('*', { count: 'exact', head: true })
            ]);
            
            const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            const { data: pages } = await supabase
                .from('page_analytics')
                .select('page_path, count')
                .gte('created_at', cutoff);
            
            const pageStats = {};
            (pages || []).forEach(p => {
                pageStats[p.page_path] = (pageStats[p.page_path] || 0) + 1;
            });
            
            setStats({
                totalUsers: userCount.count || 0,
                totalJobs: jobCount.count || 0,
                totalApplications: appCount.count || 0,
                totalVisits: pageCount.count || 0
            });
            setPageViews(Object.entries(pageStats).map(([path, views]) => ({ path, views })).sort((a,b) => b.views - a.views));
            
            // Growth data
            const { data: profiles } = await supabase
                .from('profiles')
                .select('created_at')
                .order('created_at', { ascending: false })
                .limit(100);
            
            const daily = {};
            (profiles || []).forEach(p => {
                const date = new Date(p.created_at).toLocaleDateString();
                daily[date] = (daily[date] || 0) + 1;
            });
            setGrowthData(Object.entries(daily).slice(0, 14));
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                    <p className="text-slate-400">Visitor statistics, page views, and growth metrics</p>
                </div>
                <div className="flex gap-2">
                    <select value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                    <button onClick={loadStats} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Total Users</p><p className="text-2xl font-bold text-white">{stats.totalUsers}</p></div>
                        <Users className="w-8 h-8 text-primary-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Total Jobs</p><p className="text-2xl font-bold text-white">{stats.totalJobs}</p></div>
                        <Briefcase className="w-8 h-8 text-emerald-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Applications</p><p className="text-2xl font-bold text-white">{stats.totalApplications}</p></div>
                        <FileText className="w-8 h-8 text-amber-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Page Views</p><p className="text-2xl font-bold text-white">{stats.totalVisits}</p></div>
                        <Eye className="w-8 h-8 text-blue-400 opacity-50" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-primary-400" /> Top Pages</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {pageViews.slice(0, 10).map((page, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 border-b border-slate-800">
                                <span className="text-slate-300 text-sm">{page.path}</span>
                                <span className="text-white text-sm">{page.views} views</span>
                            </div>
                        ))}
                        {pageViews.length === 0 && <p className="text-slate-400 text-center py-4">No page view data</p>}
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary-400" /> User Growth</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {growthData.map(([date, count], idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 border-b border-slate-800">
                                <span className="text-slate-400 text-sm">{date}</span>
                                <span className="text-white text-sm">+{count} users</span>
                            </div>
                        ))}
                        {growthData.length === 0 && <p className="text-slate-400 text-center py-4">No growth data available</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
