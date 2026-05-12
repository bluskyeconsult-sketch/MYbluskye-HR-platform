// src/pages/admin/AnalyticsDashboard.jsx
// Complete Analytics Dashboard

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Users, Eye, TrendingUp, Loader2, RefreshCw, 
    Briefcase, FileText, Activity, Calendar, MapPin,
    Monitor, Smartphone, Tablet, BarChart3, Award,
    UserPlus, Clock, Globe
} from 'lucide-react';
import { 
    getVisitorStats, 
    getPageAnalytics, 
    getGrowthMetrics,
    getUserActivityStats 
} from '../../services/analyticsService';

export default function AnalyticsDashboard() {
    const [visitorStats, setVisitorStats] = useState(null);
    const [pageStats, setPageStats] = useState([]);
    const [growthMetrics, setGrowthMetrics] = useState([]);
    const [activityStats, setActivityStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [days, setDays] = useState(30);

    useEffect(() => {
        loadAllData();
    }, [days]);

    async function loadAllData() {
        setRefreshing(true);
        try {
            const [visitors, pages, growth, activity] = await Promise.all([
                getVisitorStats(days),
                getPageAnalytics(days),
                getGrowthMetrics(days),
                getUserActivityStats(days)
            ]);
            setVisitorStats(visitors);
            setPageStats(pages);
            setGrowthMetrics(growth);
            setActivityStats(activity);
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                    <p className="text-slate-400">Visitor statistics, page views, and growth metrics</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        value={days} 
                        onChange={(e) => setDays(parseInt(e.target.value))}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                    <button onClick={loadAllData} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Total Visits</p><p className="text-2xl font-bold text-white">{visitorStats?.total_visits || 0}</p></div>
                        <Eye className="w-8 h-8 text-primary-400 opacity-50" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Unique: {visitorStats?.unique_visitors || 0}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Pages Viewed</p><p className="text-2xl font-bold text-white">{pageStats.length}</p></div>
                        <BarChart3 className="w-8 h-8 text-emerald-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Total Users</p><p className="text-2xl font-bold text-white">{growthMetrics[0]?.total_users || 0}</p></div>
                        <Users className="w-8 h-8 text-amber-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Top Action</p><p className="text-2xl font-bold text-white">
                            {Object.entries(activityStats).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                        </p></div>
                        <Activity className="w-8 h-8 text-purple-400 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Visitor Location & Device Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-primary-400" /> Visitors by Country</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {Object.entries(visitorStats?.by_country || {})
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([country, count]) => (
                                <div key={country} className="flex justify-between items-center">
                                    <span className="text-slate-300">{country}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 bg-slate-700 rounded-full h-2">
                                            <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${(count / visitorStats.total_visits) * 100}%` }}></div>
                                        </div>
                                        <span className="text-white text-sm">{count}</span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Monitor className="w-4 h-4 text-primary-400" /> Device Breakdown</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2"><Monitor className="w-4 h-4 text-blue-400" /><span className="text-slate-300">Desktop</span></div>
                            <div className="flex items-center gap-2">
                                <div className="w-48 bg-slate-700 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${visitorStats?.by_device?.desktop || 0}%` }}></div></div>
                                <span className="text-white text-sm">{visitorStats?.by_device?.desktop || 0}%</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-emerald-400" /><span className="text-slate-300">Mobile</span></div>
                            <div className="flex items-center gap-2">
                                <div className="w-48 bg-slate-700 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${visitorStats?.by_device?.mobile || 0}%` }}></div></div>
                                <span className="text-white text-sm">{visitorStats?.by_device?.mobile || 0}%</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2"><Tablet className="w-4 h-4 text-purple-400" /><span className="text-slate-300">Tablet</span></div>
                            <div className="flex items-center gap-2">
                                <div className="w-48 bg-slate-700 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{ width: `${visitorStats?.by_device?.tablet || 0}%` }}></div></div>
                                <span className="text-white text-sm">{visitorStats?.by_device?.tablet || 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Pages */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-primary-400" /> Top Pages</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50">
                            <tr><th className="px-4 py-2 text-left text-white text-sm">Page</th><th className="px-4 py-2 text-right text-white text-sm">Views</th></tr>
                        </thead>
                        <tbody>
                            {pageStats.slice(0, 10).map((page, idx) => (
                                <tr key={idx} className="border-b border-slate-800">
                                    <td className="px-4 py-2 text-slate-300 text-sm">{page.path}</td>
                                    <td className="px-4 py-2 text-slate-300 text-sm text-right">{page.views}</td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>
            </div>

            {/* Growth Chart */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary-400" /> User Growth</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {growthMetrics.slice(0, 14).map((metric, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 border-b border-slate-800">
                            <span className="text-slate-400 text-sm">{metric.metric_date}</span>
                            <div className="flex items-center gap-4">
                                <span className="text-white text-sm">👤 {metric.total_users || 0}</span>
                                <span className="text-emerald-400 text-sm">+{metric.new_users || 0}</span>
                                <span className="text-blue-400 text-sm">🟢 {metric.active_users || 0} active</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
