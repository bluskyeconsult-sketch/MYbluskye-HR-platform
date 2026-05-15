// src/pages/admin/AnalyticsDashboard.jsx
// COMPLETE ANALYTICS DASHBOARD - Visitor statistics, location tracking, IP logs, user behavior, and growth metrics

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    getVisitorAnalytics, 
    getUserActivity,
    getPageViews,
    getVisitorsByLocation,
    getActiveUsers
} from '../../services/analyticsTrackingService';
import { 
    Users, Eye, Globe, Loader2, RefreshCw, 
    TrendingUp, Clock, MapPin, Monitor, Smartphone,
    Tablet, BarChart3, Activity, User, Calendar,
    Download, Filter, Search, ChevronDown, Briefcase, 
    FileText, Award, Zap, Shield, AlertCircle, CheckCircle
} from 'lucide-react';

export default function AnalyticsDashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [days, setDays] = useState(30);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userActivity, setUserActivity] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // overview, visitors, pages, users
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadAnalytics();
    }, [days]);

    async function loadAnalytics() {
        setRefreshing(true);
        try {
            // Load from enhanced analytics service
            const visitorData = await getVisitorAnalytics(days);
            const pageViewData = await getPageViews(days);
            const locationData = await getVisitorsByLocation(days);
            const activeData = await getActiveUsers();
            
            setAnalytics({
                ...visitorData,
                top_pages: pageViewData,
                by_country: locationData,
                active_users: activeData
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
            // Fallback to direct Supabase queries
            await loadFallbackStats();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function loadFallbackStats() {
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
            
            setAnalytics({
                summary: {
                    total_users: userCount.count || 0,
                    total_jobs: jobCount.count || 0,
                    total_applications: appCount.count || 0,
                    total_visits: pageCount.count || 0,
                    unique_visitors: 0,
                    total_sessions: 0,
                    avg_session_duration: 0,
                    bounce_rate: 0
                },
                top_pages: Object.entries(pageStats).map(([path, views]) => ({ path, views })).sort((a,b) => b.views - a.views),
                growth_data: Object.entries(daily).slice(0, 14),
                by_country: {},
                by_device: { desktop: 0, mobile: 0, tablet: 0 },
                recent_visitors: []
            });
        } catch (error) {
            console.error('Fallback error:', error);
        }
    }

    async function loadUserActivity(userId) {
        const activity = await getUserActivity(userId, days);
        setUserActivity(activity);
        setSelectedUser(userId);
    }

    async function exportAnalytics() {
        const exportData = {
            summary: analytics?.summary,
            top_pages: analytics?.top_pages,
            by_country: analytics?.by_country,
            by_device: analytics?.by_device,
            recent_visitors: analytics?.recent_visitors,
            exported_at: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    const filteredVisitors = analytics?.recent_visitors?.filter(v => 
        v.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.device?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="p-6 space-y-6 max-w-full overflow-x-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                    <p className="text-slate-400">Visitor statistics, location tracking, IP logs, and user behavior</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select 
                        value={days} 
                        onChange={(e) => setDays(parseInt(e.target.value))} 
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                    <button 
                        onClick={exportAnalytics} 
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button 
                        onClick={loadAnalytics} 
                        disabled={refreshing} 
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-lg transition ${activeTab === 'overview' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <BarChart3 className="w-4 h-4 inline mr-2" />
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('visitors')}
                    className={`px-4 py-2 rounded-lg transition ${activeTab === 'visitors' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Globe className="w-4 h-4 inline mr-2" />
                    Visitors & Location
                </button>
                <button 
                    onClick={() => setActiveTab('pages')}
                    className={`px-4 py-2 rounded-lg transition ${activeTab === 'pages' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Eye className="w-4 h-4 inline mr-2" />
                    Pages & Content
                </button>
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg transition ${activeTab === 'users' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Users className="w-4 h-4 inline mr-2" />
                    User Activity
                </button>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <>
                    {/* Summary Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Total Users</p><p className="text-2xl font-bold text-white">{analytics?.summary?.total_users || 0}</p></div>
                                <Users className="w-8 h-8 text-primary-400 opacity-50" />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Total Jobs</p><p className="text-2xl font-bold text-white">{analytics?.summary?.total_jobs || 0}</p></div>
                                <Briefcase className="w-8 h-8 text-emerald-400 opacity-50" />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Applications</p><p className="text-2xl font-bold text-white">{analytics?.summary?.total_applications || 0}</p></div>
                                <FileText className="w-8 h-8 text-amber-400 opacity-50" />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Page Views</p><p className="text-2xl font-bold text-white">{analytics?.summary?.total_visits || 0}</p></div>
                                <Eye className="w-8 h-8 text-blue-400 opacity-50" />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Unique Visitors</p><p className="text-2xl font-bold text-white">{analytics?.summary?.unique_visitors || 0}</p></div>
                                <Activity className="w-8 h-8 text-purple-400 opacity-50" />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Avg. Session</p><p className="text-2xl font-bold text-white">{analytics?.summary?.avg_session_duration || 0}m</p></div>
                                <Clock className="w-8 h-8 text-amber-400 opacity-50" />
                            </div>
                        </div>
                    </div>

                    {/* Two Column Layout for Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* User Growth */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary-400" />
                                User Growth (Last 14 Days)
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {analytics?.growth_data?.map(([date, count], idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 border-b border-slate-800">
                                        <span className="text-slate-400 text-sm">{date}</span>
                                        <span className="text-white text-sm font-medium">+{count} users</span>
                                    </div>
                                ))}
                                {(!analytics?.growth_data || analytics.growth_data.length === 0) && (
                                    <p className="text-slate-400 text-center py-4">No growth data available</p>
                                )}
                            </div>
                        </div>

                        {/* Device Breakdown */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Monitor className="w-4 h-4 text-primary-400" />
                                Device Breakdown
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2"><Monitor className="w-4 h-4 text-blue-400" /><span className="text-slate-300">Desktop</span></div>
                                    <div className="flex items-center gap-3 flex-1 ml-4">
                                        <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-48">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${analytics?.by_device?.desktop || 0}%` }}></div>
                                        </div>
                                        <span className="text-white text-sm font-medium w-12">{analytics?.by_device?.desktop || 0}%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-emerald-400" /><span className="text-slate-300">Mobile</span></div>
                                    <div className="flex items-center gap-3 flex-1 ml-4">
                                        <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-48">
                                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${analytics?.by_device?.mobile || 0}%` }}></div>
                                        </div>
                                        <span className="text-white text-sm font-medium w-12">{analytics?.by_device?.mobile || 0}%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2"><Tablet className="w-4 h-4 text-purple-400" /><span className="text-slate-300">Tablet</span></div>
                                    <div className="flex items-center gap-3 flex-1 ml-4">
                                        <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-48">
                                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${analytics?.by_device?.tablet || 0}%` }}></div>
                                        </div>
                                        <span className="text-white text-sm font-medium w-12">{analytics?.by_device?.tablet || 0}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* VISITORS & LOCATION TAB */}
            {activeTab === 'visitors' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visitors by Country */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary-400" />
                            Visitors by Country
                        </h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {Object.entries(analytics?.by_country || {}).sort((a,b) => b[1] - a[1]).map(([country, count]) => (
                                <div key={country} className="flex justify-between items-center p-2 border-b border-slate-800">
                                    <span className="text-slate-300">{country}</span>
                                    <div className="flex items-center gap-3 flex-1 ml-4">
                                        <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-32">
                                            <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.min(100, (count / (analytics?.summary?.unique_visitors || 1)) * 100)}%` }}></div>
                                        </div>
                                        <span className="text-white text-sm font-medium">{count} visitors</span>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(analytics?.by_country || {}).length === 0 && (
                                <p className="text-slate-400 text-center py-4">No location data available</p>
                            )}
                        </div>
                    </div>

                    {/* Recent Visitors Table (IP, Location, Device) */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <User className="w-4 h-4 text-primary-400" />
                            Recent Visitors
                        </h3>
                        <div className="mb-4 flex items-center gap-2">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter by location or device..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            />
                        </div>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800/50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-white">Time</th>
                                        <th className="px-3 py-2 text-left text-white">Location</th>
                                        <th className="px-3 py-2 text-left text-white">Device</th>
                                        <th className="px-3 py-2 text-left text-white">Browser</th>
                                        <th className="px-3 py-2 text-left text-white">Pages</th>
                                        <th className="px-3 py-2 text-left text-white">Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVisitors.map((visitor, idx) => (
                                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                                            <td className="px-3 py-2 text-slate-400 text-xs">{new Date(visitor.time).toLocaleString()}</td>
                                            <td className="px-3 py-2"><span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary-400" /> {visitor.city}, {visitor.country}</span></td>
                                            <td className="px-3 py-2 capitalize">{visitor.device}</td>
                                            <td className="px-3 py-2">{visitor.browser}</td>
                                            <td className="px-3 py-2">{visitor.pages} pages</td>
                                            <td className="px-3 py-2">{Math.floor(visitor.duration / 60)}m {visitor.duration % 60}s</td>
                                        </tr>
                                    ))}
                                    {filteredVisitors.length === 0 && (
                                        <tr><td colSpan="6" className="px-3 py-8 text-center text-slate-400">No visitor data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* PAGES & CONTENT TAB */}
            {activeTab === 'pages' && (
                <div className="grid grid-cols-1 gap-6">
                    {/* Top Pages */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Eye className="w-4 h-4 text-primary-400" />
                            Top Pages
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-800/50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-white text-sm">#</th>
                                        <th className="px-4 py-2 text-left text-white text-sm">Page</th>
                                        <th className="px-4 py-2 text-right text-white text-sm">Views</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics?.top_pages?.slice(0, 20).map((page, idx) => (
                                        <tr key={idx} className="border-b border-slate-800">
                                            <td className="px-4 py-2 text-slate-500 text-sm">{idx + 1}</td>
                                            <td className="px-4 py-2 text-slate-300 text-sm font-mono">{page.path}</td>
                                            <td className="px-4 py-2 text-slate-300 text-sm text-right font-medium">{page.views}</td>
                                        </tr>
                                    ))}
                                    {(!analytics?.top_pages || analytics.top_pages.length === 0) && (
                                        <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-400">No page view data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* USER ACTIVITY TAB */}
            {activeTab === 'users' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary-400" />
                        User Activity Log
                    </h3>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left text-white">Time</th>
                                    <th className="px-3 py-2 text-left text-white">User</th>
                                    <th className="px-3 py-2 text-left text-white">Action</th>
                                    <th className="px-3 py-2 text-left text-white">Page</th>
                                    <th className="px-3 py-2 text-left text-white">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics?.recent_activities?.map((activity, idx) => (
                                    <tr key={idx} className="border-b border-slate-800">
                                        <td className="px-3 py-2 text-slate-400 text-xs">{new Date(activity.time).toLocaleString()}</td>
                                        <td className="px-3 py-2 text-white text-xs">{activity.user_email || 'Guest'}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                activity.action === 'page_view' ? 'bg-blue-500/20 text-blue-400' :
                                                activity.action === 'click' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>
                                                {activity.action}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-slate-400 text-xs">{activity.page}</td>
                                        <td className="px-3 py-2 text-slate-400 text-xs">{activity.details}</td>
                                    </tr>
                                ))}
                                {(!analytics?.recent_activities || analytics.recent_activities.length === 0) && (
                                    <tr><td colSpan="5" className="px-3 py-8 text-center text-slate-400">No user activity data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
