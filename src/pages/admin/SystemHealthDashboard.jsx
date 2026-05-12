// src/pages/admin/SystemHealthDashboard.jsx
// Complete System Health Dashboard - Real-time service monitoring

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Activity, CheckCircle, XCircle, AlertCircle, Loader2, 
    Server, Database, Mail, Brain, RefreshCw, Clock, 
    Wifi, HardDrive, Zap, Bell, Shield, TrendingUp
} from 'lucide-react';
import { checkSystemHealth, getHealthHistory, getCurrentServiceStatus } from '../../services/healthService';

export default function SystemHealthDashboard() {
    const [health, setHealth] = useState(null);
    const [history, setHistory] = useState([]);
    const [statusMap, setStatusMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('24h');

    useEffect(() => {
        loadAllData();
        const interval = setInterval(loadAllData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [selectedPeriod]);

    async function loadAllData() {
        setRefreshing(true);
        try {
            const [healthData, historyData, statusData] = await Promise.all([
                checkSystemHealth(),
                getHealthHistory(selectedPeriod === '24h' ? 24 : selectedPeriod === '7d' ? 168 : 720),
                getCurrentServiceStatus()
            ]);
            setHealth(healthData);
            setHistory(historyData);
            setStatusMap(statusData);
        } catch (error) {
            console.error('Error loading health data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function getStatusIcon(status) {
        if (status === 'healthy') return <CheckCircle className="w-5 h-5 text-emerald-400" />;
        if (status === 'degraded') return <AlertCircle className="w-5 h-5 text-amber-400" />;
        if (status === 'down') return <XCircle className="w-5 h-5 text-red-400" />;
        return <Activity className="w-5 h-5 text-slate-400" />;
    }

    function getServiceIcon(serviceName) {
        if (serviceName.includes('Database')) return <Database className="w-5 h-5" />;
        if (serviceName.includes('Storage')) return <HardDrive className="w-5 h-5" />;
        if (serviceName.includes('Auth')) return <Shield className="w-5 h-5" />;
        if (serviceName.includes('OpenAI')) return <Brain className="w-5 h-5" />;
        if (serviceName.includes('Email')) return <Mail className="w-5 h-5" />;
        return <Server className="w-5 h-5" />;
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
                    <h1 className="text-2xl font-bold text-white">System Health Dashboard</h1>
                    <p className="text-slate-400">Real-time system monitoring and diagnostics</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        value={selectedPeriod} 
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                    <button
                        onClick={loadAllData}
                        disabled={refreshing}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overall Status Banner */}
            <div className={`p-4 rounded-xl border ${
                health?.overall === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' :
                health?.overall === 'degraded' ? 'bg-amber-500/10 border-amber-500/20' :
                'bg-red-500/10 border-red-500/20'
            }`}>
                <div className="flex items-center gap-3">
                    {getStatusIcon(health?.overall)}
                    <div>
                        <p className="text-white font-semibold text-lg">
                            System Status: {health?.overall?.toUpperCase()}
                        </p>
                        <p className="text-slate-400 text-sm">
                            Last checked: {new Date(health?.timestamp).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Service Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {health?.checks.map((check, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {getServiceIcon(check.service)}
                                <span className="text-white font-medium">{check.service}</span>
                            </div>
                            {getStatusIcon(check.status)}
                        </div>
                        <p className="text-2xl font-bold text-white">{check.responseTimeMs}ms</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">{check.details}</p>
                        {statusMap[check.service] && (
                            <p className="text-xs text-slate-500 mt-2">
                                Last check: {new Date(statusMap[check.service].lastChecked).toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Health History */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-400" />
                    Recent Health Checks
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.slice(0, 30).map((log, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 border-b border-slate-800 hover:bg-slate-800/30 rounded">
                            <div className="flex items-center gap-2">
                                {getStatusIcon(log.status)}
                                <span className="text-slate-300 text-sm">{log.service_name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-slate-500 text-xs">{log.response_time_ms}ms</span>
                                <span className="text-slate-500 text-xs">
                                    {new Date(log.checked_at).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))}
                    {history.length === 0 && (
                        <p className="text-slate-400 text-center py-4">No health check history available</p>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button 
                    onClick={() => window.location.href = '/admin/security'}
                    className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group"
                >
                    <Shield className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                    <span className="text-white text-sm">Security Dashboard</span>
                </button>
                <button 
                    onClick={() => window.location.href = '/admin/analytics'}
                    className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group"
                >
                    <TrendingUp className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                    <span className="text-white text-sm">Analytics Dashboard</span>
                </button>
                <button 
                    onClick={() => window.location.href = '/admin/diagnostics'}
                    className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group"
                >
                    <Zap className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                    <span className="text-white text-sm">Run Diagnostics</span>
                </button>
            </div>
        </div>
    );
}
