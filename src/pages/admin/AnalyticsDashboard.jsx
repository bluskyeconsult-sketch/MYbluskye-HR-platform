// src/pages/admin/AnalyticsDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Eye, TrendingUp, Loader2, RefreshCw, Briefcase, FileText, Activity, Calendar } from 'lucide-react';

export default function AnalyticsDashboard() {
    const [stats, setStats] = useState({ totalUsers: 0, totalJobs: 0, totalApplications: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        setRefreshing(true);
        try {
            const [userCount, jobCount, appCount] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('jobs').select('*', { count: 'exact', head: true }),
                supabase.from('job_applications').select('*', { count: 'exact', head: true })
            ]);
            setStats({
                totalUsers: userCount.count || 0,
                totalJobs: jobCount.count || 0,
                totalApplications: appCount.count || 0
            });
        } catch (error) {
            console.error('Error loading stats:', error);
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
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                    <p className="text-slate-400">Platform analytics and metrics</p>
                </div>
                <button onClick={loadStats} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary-400" /> Platform Growth</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-slate-400">User Acquisition Rate</span><span className="text-white font-bold">{(stats.totalUsers / 30).toFixed(1)}/day</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-400">Job Posting Rate</span><span className="text-white font-bold">{(stats.totalJobs / 30).toFixed(1)}/day</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-400">Application Rate</span><span className="text-white font-bold">{(stats.totalApplications / 30).toFixed(1)}/day</span></div>
                </div>
            </div>
        </div>
    );
}
