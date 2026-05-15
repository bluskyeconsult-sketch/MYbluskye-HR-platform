// src/pages/admin/AnalyticsDashboard.jsx
// COMPLETE ANALYTICS DASHBOARD - Fixed version with direct Supabase queries

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Users, Eye, Globe, Loader2, RefreshCw, 
    TrendingUp, Clock, MapPin, Monitor, Smartphone,
    Tablet, BarChart3, Activity, User, Calendar,
    Download, Filter, Search, ChevronDown, Briefcase, 
    FileText, Award, Zap, Shield, AlertCircle, CheckCircle
} from 'lucide-react';

export default function AnalyticsDashboard() {
    const [stats, setStats] = useState({ 
        totalUsers: 0, 
        totalJobs: 0, 
        totalApplications: 0, 
        totalVisits: 0,
        uniqueVisitors: 0,
        totalSessions: 0,
        avgSessionDuration: 0,
        bounceRate: 0
    });
    const [pageViews, setPageViews] = useState([]);
    const [growthData, setGrowthData] = useState([]);
    const [locationStats, setLocationStats] = useState([]);
    const [deviceStats, setDeviceStats] = useState({ desktop: 0, mobile: 0, tablet: 0 });
    const [recentVisitors, setRecentVisitors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [days, setDays] = useState(30);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadAllAnalytics();
    }, [days]);

    async function loadAllAnalytics() {
        setRefreshing(true);
        try {
            await Promise.all([
                loadBasicStats(),
                loadPageViews(),
                loadGrowthData(),
                loadLocationStats(),
                loadDeviceStats(),
                loadRecentVisitors()
            ]);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function loadBasicStats() {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const [userCount, jobCount, appCount, pageCount] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('jobs').select('*', { count: 'exact', head: true }),
            supabase.from('job_applications').select('*', { count: 'exact', head: true }),
            supabase.from('analytics_page_views').select('*', { count: 'exact', head: true }).gte('created_at', cutoff)
        ]);
        
        // Get unique visitors (by IP)
        const { data: uniqueData } = await supabase
            .from('analytics_page_views')
            .select('ip_address')
            .gte('created_at', cutoff);
        
        const uniqueVisitors = new Set(uniqueData?.map(v => v.ip_address) || []).size;
        
        // Get session stats
        const { data: sessions } = await supabase
            .from('analytics_sessions')
            .select('duration_seconds')
            .gte('start_time', cutoff);
        
        const totalSessions = sessions?.length || 0;
        const avgDuration = sessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / (totalSessions || 1);
        const avgMinutes = Math.floor(avgDuration / 60);
        
        // Calculate bounce rate (sessions with only 1 page view)
        const { data: bounceSessions } = await supabase
            .from('analytics_sessions')
            .select('page_count')
            .gte('start_time', cutoff);
        
        const bounceCount = bounceSessions?.filter(s => s.page_count === 1).length || 0;
        const bounceRate = totalSessions > 0 ? Math.round((bounceCount / totalSessions) * 100) : 0;
        
        setStats({
            totalUsers: userCount.count || 0,
            totalJobs: jobCount.count || 0,
            totalApplications: appCount.count || 0,
            totalVisits: pageCount.count || 0,
            uniqueVisitors: uniqueVisitors,
            totalSessions: totalSessions,
            avgSessionDuration: avgMinutes,
            bounceRate: bounceRate
        });
    }

    async function loadPageViews() {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: pages } = await supabase
            .from('analytics_page_views')
            .select('page_url, view_duration_seconds')
            .gte('created_at', cutoff);
        
        const pageStats = {};
        (pages || []).forEach(p => {
            pageStats[p.page_url] = (pageStats[p.page_url] || 0) + 1;
        });
        
        setPageViews(Object.entries(pageStats).map(([path, views]) => ({ path, views })).sort((a,b) => b.views - a.views));
    }

    async function loadGrowthData() {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: profiles } = await supabase
            .from('profiles')
            .select('created_at')
            .gte('created_at', cutoff)
            .order('created_at', { ascending: false });
        
        const daily = {};
        (profiles || []).forEach(p => {
            const date = new Date(p.created_at).toLocaleDateString();
            daily[date] = (daily[date] || 0) + 1;
        });
        
        setGrowthData(Object.entries(daily).slice(0, 14));
    }

    async function loadLocationStats() {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: views } = await supabase
            .from('analytics_page_views')
            .select('country, city, ip_address')
            .gte('created_at', cutoff);
        
        const countryStats = {};
        (views || []).forEach(v => {
            const country = v.country || 'Unknown';
            countryStats[country] = (countryStats[country] || 0) + 1;
        });
        
        setLocationStats(Object.entries(countryStats).map(([country, count]) => ({ country, count })).sort((a,b) => b.count - a.count));
    }

    async function loadDeviceStats() {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: views } = await supabase
            .from('analytics_page_views')
            .select('device_type')
            .gte('created_at', cutoff);
        
        const devices = { desktop: 0, mobile: 0, tablet: 0 };
        (views || []).forEach(v => {
            if (v.device_type === 'desktop') devices.desktop++;
            else if (v.device_type === 'mobile') devices.mobile++;
            else if (v.device_type === 'tablet') devices.tablet++;
        });
        
        const total = devices.desktop + devices.mobile + devices.tablet;
        setDeviceStats({
            desktop: total > 0 ? Math.round((devices.desktop / total) * 100) : 0,
            mobile: total > 0 ? Math.round((devices.mobile / total) * 100) : 0,
            tablet: total > 0 ? Math.round((devices.tablet / total) * 100) : 0
        });
    }

    async function loadRecentVisitors() {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: sessions } = await supabase
            .from('analytics_sessions')
            .select('*')
            .gte('start_time', cutoff)
            .order('start_time', { ascending: false })
            .limit(50);
        
        const visitors = (sessions || []).map(session => ({
            time: session.start_time,
            city: session.city || 'Unknown',
            country: session.country || 'Unknown',
            device: session.device_type || 'desktop',
            browser: session.browser || 'unknown',
            pages: session.page_count || 0,
            duration: session.duration_seconds || 0,
            ip: session.ip_address
        }));
        
        setRecentVisitors(visitors);
    }

    async function exportAnalytics() {
        const exportData = {
            stats,
            pageViews,
            growthData,
            locationStats,
            deviceStats,
            recentVisitors,
            exported_at: new Date().toISOString(),
            date_range_days: days
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

    const filteredVisitors = recentVisitors.filter(v => 
        v.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.device?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        onClick={loadAllAnalytics} 
                        disabled={refreshing} 
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-800 pb-2 flex-wrap">
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
                    Pages
                </button>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <>
                    {/* Summary Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Unique Visitors</p><p className="text-2xl font-bold text-white">{stats.uniqueVisitors}</p></div>
                                <Activity className="w-8 h-8 text-purple-400 opacity-50" />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Bounce Rate</p><p className="text-2xl font-bold text-white">{stats.bounceRate}%</p></div>
                                <TrendingUp className="w-8 h-8 text-red-400 opacity-50" />
                            </div>
                        </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* User Growth */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary-400" />
                                User Growth (Last {days} Days)
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {growthData.map(([date, count], idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 border-b border-slate-800">
                                        <span className="text-slate-400 text-sm">{date}</span>
                                        <span className="text-white text-sm font-medium">+{count} users</span>
                                    </div>
                                ))}
                                {growthData.length === 0 && (
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
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${deviceStats.desktop}%` }}></div>
                                        </div>
                                        <span className="text-white text-sm font-medium w-12">{deviceStats.desktop}%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-emerald-400" /><span className="text-slate-300">Mobile</span></div>
                                    <div className="flex items-center gap-3 flex-1 ml-4">
                                        <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-48">
                                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${deviceStats.mobile}%` }}></div>
                                        </div>
                                        <span className="text-white text-sm font-medium w-12">{deviceStats.mobile}%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2"><Tablet className="w-4 h-4 text-purple-400" /><span className="text-slate-300">Tablet</span></div>
                                    <div className="flex items-center gap-3 flex-1 ml-4">
                                        <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-48">
                                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${deviceStats.tablet}%` }}></div>
                                        </div>
                                        <span className="text-white text-sm font-medium w-12">{deviceStats.tablet}%</span>
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
                            {locationStats.map(({ country, count }) => (
                                <div key={country} className="flex justify-between items-center p-2 border-b border-slate-800">
                                    <span className="text-slate-300">{country}</span>
                                    <div className="flex items-center gap-3 flex-1 ml-4">
                                        <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-32">
                                            <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.min(100, (count / stats.uniqueVisitors) * 100)}%` }}></div>
                                        </div>
                                        <span className="text-white text-sm font-medium">{count} visitors</span>
                                    </div>
                                </div>
                            ))}
                            {locationStats.length === 0 && (
                                <p className="text-slate-400 text-center py-4">No location data available</p>
                            )}
                        </div>
                    </div>

                    {/* Recent Visitors Table */}
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
                                        <th className="px-3 py-2 text-left text-white">Pages</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVisitors.map((visitor, idx) => (
                                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                                            <td className="px-3 py-2 text-slate-400 text-xs">{new Date(visitor.time).toLocaleString()}</td>
                                            <td className="px-3 py-2"><span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary-400" /> {visitor.city}, {visitor.country}</span></td>
                                            <td className="px-3 py-2 capitalize">{visitor.device}</td>
                                            <td className="px-3 py-2">{visitor.pages} pages</td>
                                        </tr>
                                    ))}
                                    {filteredVisitors.length === 0 && (
                                        <tr><td colSpan="4" className="px-3 py-8 text-center text-slate-400">No visitor data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* PAGES TAB */}
            {activeTab === 'pages' && (
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
                                {pageViews.slice(0, 20).map((page, idx) => (
                                    <tr key={idx} className="border-b border-slate-800">
                                        <td className="px-4 py-2 text-slate-500 text-sm">{idx + 1}</td>
                                        <td className="px-4 py-2 text-slate-300 text-sm font-mono">{page.path}</td>
                                        <td className="px-4 py-2 text-slate-300 text-sm text-right font-medium">{page.views}</td>
                                    </tr>
                                ))}
                                {pageViews.length === 0 && (
                                    <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-400">No page view data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
