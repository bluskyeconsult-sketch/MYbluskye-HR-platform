// src/pages/admin/SecurityDashboard.jsx
// Complete Security Monitoring Dashboard

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Shield, AlertTriangle, Ban, Eye, Loader2, CheckCircle, 
    XCircle, Flag, Clock, Globe, Lock, Server, RefreshCw, 
    Plus, Trash2, TrendingUp, Activity
} from 'lucide-react';
import { 
    getSecurityStats, 
    getRecentSecurityEvents, 
    getBlockedIPs, 
    blockIP, 
    unblockIP,
    detectThreats
} from '../../services/securityService';

export default function SecurityDashboard() {
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState(null);
    const [blockedIPs, setBlockedIPs] = useState([]);
    const [threats, setThreats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newBlockIP, setNewBlockIP] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [selectedSeverity, setSelectedSeverity] = useState('all');

    useEffect(() => {
        loadAllData();
        const interval = setInterval(loadAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    async function loadAllData() {
        setRefreshing(true);
        try {
            const [statsData, eventsData, ipsData, threatsData] = await Promise.all([
                getSecurityStats(7),
                getRecentSecurityEvents(100),
                getBlockedIPs(),
                detectThreats()
            ]);
            setStats(statsData);
            setEvents(eventsData);
            setBlockedIPs(ipsData);
            setThreats(threatsData);
        } catch (error) {
            console.error('Error loading security data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleBlockIP() {
        if (!newBlockIP) return;
        await blockIP(newBlockIP, blockReason || 'Manual block');
        setNewBlockIP('');
        setBlockReason('');
        loadAllData();
    }

    async function handleUnblockIP(ipId) {
        await unblockIP(ipId);
        loadAllData();
    }

    function getSeverityBadge(severity) {
        const config = {
            low: 'bg-blue-500/20 text-blue-400',
            medium: 'bg-yellow-500/20 text-yellow-400',
            high: 'bg-orange-500/20 text-orange-400',
            critical: 'bg-red-500/20 text-red-400'
        };
        return config[severity] || config.low;
    }

    const filteredEvents = selectedSeverity === 'all' 
        ? events 
        : events.filter(e => e.severity === selectedSeverity);

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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Security Monitoring Dashboard</h1>
                    <p className="text-slate-400">Real-time security event monitoring and threat detection</p>
                </div>
                <button onClick={loadAllData} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Total Events (7d)</p><p className="text-2xl font-bold text-white">{stats?.total || 0}</p></div>
                        <Shield className="w-8 h-8 text-primary-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Critical Events</p><p className="text-2xl font-bold text-red-400">{stats?.bySeverity?.critical || 0}</p></div>
                        <AlertTriangle className="w-8 h-8 text-red-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Blocked IPs</p><p className="text-2xl font-bold text-white">{blockedIPs.length}</p></div>
                        <Ban className="w-8 h-8 text-amber-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Active Threats</p><p className="text-2xl font-bold text-white">{threats.length}</p></div>
                        <Activity className="w-8 h-8 text-red-400 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Threats Alert */}
            {threats.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Active Threats Detected
                    </h3>
                    <div className="space-y-2">
                        {threats.map((threat, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-slate-800/30 rounded">
                                <div>
                                    <p className="text-white text-sm">{threat.message}</p>
                                    <p className="text-slate-500 text-xs">Type: {threat.type} | Severity: {threat.severity}</p>
                                </div>
                                <button className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">Investigate</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Events */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-semibold flex items-center gap-2"><Eye className="w-4 h-4 text-primary-400" /> Recent Security Events</h3>
                        <select 
                            value={selectedSeverity} 
                            onChange={(e) => setSelectedSeverity(e.target.value)}
                            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                        >
                            <option value="all">All Severities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredEvents.map((event, idx) => (
                            <div key={idx} className="p-3 border-b border-slate-800 hover:bg-slate-800/30 rounded">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${getSeverityBadge(event.severity)}`}>
                                                {event.event_type?.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-slate-400 text-sm mt-1">IP: {event.ip_address} | Path: {event.path || 'N/A'}</p>
                                        {event.details && Object.keys(event.details).length > 0 && (
                                            <p className="text-slate-500 text-xs mt-1">{JSON.stringify(event.details).substring(0, 100)}</p>
                                        )}
                                    </div>
                                    {event.is_blocked && <Ban className="w-4 h-4 text-red-400" />}
                                </div>
                            </div>
                        ))}
                        {filteredEvents.length === 0 && <p className="text-slate-400 text-center py-8">No security events found</p>}
                    </div>
                </div>

                {/* Blocked IPs Management */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Ban className="w-4 h-4 text-primary-400" /> Blocked IP Addresses</h3>
                    
                    <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-white text-sm mb-2">Manually Block IP Address</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input type="text" value={newBlockIP} onChange={(e) => setNewBlockIP(e.target.value)} placeholder="IP Address" className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                            <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason" className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                            <button onClick={handleBlockIP} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 whitespace-nowrap">
                                <Plus className="w-4 h-4 inline mr-1" /> Block IP
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {blockedIPs.map((ip) => (
                            <div key={ip.id} className="flex justify-between items-center p-2 bg-slate-800/30 rounded-lg">
                                <div>
                                    <p className="text-white font-mono text-sm">{ip.ip_address}</p>
                                    <p className="text-slate-500 text-xs">{ip.reason || 'No reason provided'}</p>
                                    <p className="text-slate-500 text-xs">Expires: {new Date(ip.expires_at).toLocaleString()}</p>
                                </div>
                                <button onClick={() => handleUnblockIP(ip.id)} className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700">
                                    <Trash2 className="w-3 h-3 inline mr-1" /> Unblock
                                </button>
                            </div>
                        ))}
                        {blockedIPs.length === 0 && <p className="text-slate-400 text-center py-8">No blocked IP addresses</p>}
                    </div>
                </div>
            </div>

            {/* Event Types Distribution */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Flag className="w-4 h-4 text-primary-400" /> Event Types Distribution</h3>
                <div className="flex flex-wrap gap-3">
                    {Object.entries(stats?.byType || {}).map(([type, count]) => (
                        <div key={type} className="px-3 py-2 bg-slate-800 rounded-lg">
                            <p className="text-white text-sm font-medium">{type.replace(/_/g, ' ')}</p>
                            <p className="text-primary-400 font-bold text-lg">{count}</p>
                        </div>
                    ))}
                    {Object.keys(stats?.byType || {}).length === 0 && (
                        <p className="text-slate-400 text-center py-4">No event data available</p>
                    )}
                </div>
            </div>
        </div>
    );
}
