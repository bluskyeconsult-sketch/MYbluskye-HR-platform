// src/pages/admin/SystemHealthDashboard.jsx
// System Health Dashboard - Real-time service monitoring with unified health API

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Activity, CheckCircle, XCircle, AlertCircle, Loader2, 
    Server, Database, Mail, Brain, RefreshCw, Clock, 
    Wifi, HardDrive, Zap, Bell, Shield, TrendingUp, Globe
} from 'lucide-react';

// Unified API endpoint
const API_BASE = '/api/index';
const HEALTH_ENDPOINT = `${API_BASE}?action=health`;

export default function SystemHealthDashboard() {
    const [health, setHealth] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastManualRefresh, setLastManualRefresh] = useState(null);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        checkHealth();
        let interval;
        if (autoRefresh) {
            interval = setInterval(checkHealth, 60000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    const checkHealth = useCallback(async () => {
        setRefreshing(true);
        const startTime = Date.now();
        const checks = [];
        
        // 1. Check API Gateway (Vercel) - Using unified endpoint
        try {
            const apiStart = Date.now();
            const apiResponse = await fetch(HEALTH_ENDPOINT);
            const apiData = await apiResponse.json();
            checks.push({
                name: 'API Gateway',
                status: apiResponse.ok ? 'healthy' : 'degraded',
                responseTime: Date.now() - apiStart,
                details: apiResponse.ok ? 'Vercel functions operational' : (apiData.error || 'API error'),
                icon: Server,
                data: apiData
            });
        } catch (err) {
            checks.push({ 
                name: 'API Gateway', 
                status: 'down', 
                responseTime: 0, 
                details: err.message, 
                icon: Server 
            });
        }
        
        // 2. Check Supabase Database (Direct)
        try {
            const dbStart = Date.now();
            const { error, count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .limit(1);
            
            checks.push({
                name: 'Supabase Database',
                status: error ? 'degraded' : 'healthy',
                responseTime: Date.now() - dbStart,
                details: error ? error.message : `Connected • ${count?.toLocaleString() || 0} users`,
                icon: Database
            });
        } catch (err) {
            checks.push({ 
                name: 'Supabase Database', 
                status: 'down', 
                responseTime: 0, 
                details: err.message, 
                icon: Database 
            });
        }
        
        // 3. Check Storage
        try {
            const storageStart = Date.now();
            const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
            checks.push({
                name: 'Storage Service',
                status: storageError ? 'degraded' : 'healthy',
                responseTime: Date.now() - storageStart,
                details: storageError ? storageError.message : `${buckets?.length || 0} buckets available`,
                icon: HardDrive
            });
        } catch (err) {
            checks.push({ 
                name: 'Storage Service', 
                status: 'down', 
                responseTime: 0, 
                details: err.message, 
                icon: HardDrive 
            });
        }
        
        // 4. Check Auth Service
        try {
            const authStart = Date.now();
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            checks.push({
                name: 'Auth Service',
                status: authError ? 'degraded' : 'healthy',
                responseTime: Date.now() - authStart,
                details: authError ? authError.message : (session ? 'Authenticated' : 'No active session'),
                icon: Shield
            });
        } catch (err) {
            checks.push({ 
                name: 'Auth Service', 
                status: 'degraded', 
                responseTime: 0, 
                details: err.message, 
                icon: Shield 
            });
        }
        
        // 5. Check OpenAI (via environment variable)
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        checks.push({
            name: 'OpenAI API',
            status: openaiKey ? 'healthy' : 'degraded',
            responseTime: 0,
            details: openaiKey ? `Key configured (${openaiKey.slice(0, 8)}...)` : 'API key missing - AI features disabled',
            icon: Brain
        });
        
        // 6. Check Email Service (via environment)
        const emailUser = import.meta.env.VITE_EMAIL_USER;
        checks.push({
            name: 'Email Service',
            status: emailUser ? 'healthy' : 'degraded',
            responseTime: 0,
            details: emailUser ? `${emailUser} via Hostinger SMTP` : 'Email credentials missing',
            icon: Mail
        });
        
        // 7. Check CDN/Assets
        try {
            const cdnStart = Date.now();
            const cdnResponse = await fetch('/favicon.ico', { method: 'HEAD' });
            checks.push({
                name: 'CDN & Assets',
                status: cdnResponse.ok ? 'healthy' : 'degraded',
                responseTime: Date.now() - cdnStart,
                details: cdnResponse.ok ? 'Static assets reachable' : 'Asset serving issue',
                icon: Globe
            });
        } catch (err) {
            checks.push({ 
                name: 'CDN & Assets', 
                status: 'degraded', 
                responseTime: 0, 
                details: err.message, 
                icon: Globe 
            });
        }
        
        // Calculate overall status
        const hasDown = checks.some(c => c.status === 'down');
        const hasDegraded = checks.some(c => c.status === 'degraded');
        const overall = hasDown ? 'critical' : (hasDegraded ? 'degraded' : 'healthy');
        
        // Calculate uptime percentage (from history)
        const uptimeData = calculateUptime(history);
        
        const healthData = { 
            checks, 
            overall, 
            timestamp: new Date().toISOString(),
            totalResponseTime: Date.now() - startTime,
            uptime: uptimeData
        };
        
        setHealth(healthData);
        setLastManualRefresh(new Date());
        
        // Log to database (async, don't wait)
        logHealthToDatabase(checks).catch(console.warn);
        
        // Load history after logging
        await loadHistory();
        
        setRefreshing(false);
        setLoading(false);
    }, [history.length]);

    // Calculate uptime from history logs
    function calculateUptime(historyLogs) {
        if (historyLogs.length === 0) return { percentage: 100, period: '24h' };
        
        const last24h = historyLogs.filter(log => {
            const logDate = new Date(log.checked_at);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return logDate > oneDayAgo;
        });
        
        if (last24h.length === 0) return { percentage: 100, period: '24h' };
        
        const healthyCount = last24h.filter(log => log.status === 'healthy').length;
        const percentage = (healthyCount / last24h.length) * 100;
        
        return { percentage: Math.round(percentage), period: '24h', totalChecks: last24h.length };
    }

    async function logHealthToDatabase(checks) {
        try {
            for (const check of checks) {
                await supabase.from('system_health_logs').insert({
                    service_name: check.name,
                    status: check.status,
                    response_time_ms: check.responseTime,
                    details: { message: check.details, icon: check.name },
                    checked_at: new Date().toISOString()
                });
            }
        } catch (err) {
            console.debug('Health logging failed:', err.message);
        }
    }

    async function loadHistory() {
        try {
            const { data: historyData } = await supabase
                .from('system_health_logs')
                .select('*')
                .order('checked_at', { ascending: false })
                .limit(50);
            setHistory(historyData || []);
        } catch (err) {
            console.debug('History load failed:', err.message);
        }
    }

    function getStatusColor(status) {
        switch (status) {
            case 'healthy': return 'text-emerald-400 bg-emerald-500/10';
            case 'degraded': return 'text-amber-400 bg-amber-500/10';
            case 'critical': return 'text-red-400 bg-red-500/10';
            default: return 'text-slate-400 bg-slate-500/10';
        }
    }

    function getStatusIcon(status) {
        switch (status) {
            case 'healthy': return <CheckCircle className="w-5 h-5" />;
            case 'degraded': return <AlertCircle className="w-5 h-5" />;
            case 'critical': return <XCircle className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                <span className="ml-2 text-slate-400">Checking system health...</span>
            </div>
        );
    }

    const healthyCount = health?.checks?.filter(c => c.status === 'healthy').length || 0;
    const degradedCount = health?.checks?.filter(c => c.status === 'degraded').length || 0;
    const downCount = health?.checks?.filter(c => c.status === 'down').length || 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary-400" />
                        System Health Dashboard
                    </h1>
                    <p className="text-slate-400">Real-time system monitoring and diagnostics</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
                            autoRefresh ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                    >
                        <Zap className="w-3 h-3" />
                        {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                    </button>
                    <button 
                        onClick={checkHealth} 
                        disabled={refreshing} 
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Checking...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Overall Status Banner */}
            <div className={`p-4 rounded-xl border ${getStatusColor(health?.overall)}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {getStatusIcon(health?.overall)}
                        <div>
                            <p className="font-semibold">
                                System Status: {health?.overall?.toUpperCase()}
                            </p>
                            <p className="text-sm opacity-80">
                                Last checked: {new Date(health?.timestamp).toLocaleTimeString()}
                                {lastManualRefresh && ` • Manual refresh at ${lastManualRefresh.toLocaleTimeString()}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                            <span>{healthyCount} Healthy</span>
                        </div>
                        {degradedCount > 0 && (
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                <span>{degradedCount} Degraded</span>
                            </div>
                        )}
                        {downCount > 0 && (
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                <span>{downCount} Critical</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{health?.totalResponseTime}ms total</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Uptime Stats */}
            {health?.uptime && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                        <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">{health.uptime.percentage}%</div>
                        <div className="text-xs text-slate-500">Uptime ({health.uptime.period})</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                        <Bell className="w-5 h-5 text-primary-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">{history.length}</div>
                        <div className="text-xs text-slate-500">Health Checks (24h)</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                        <Wifi className="w-5 h-5 text-primary-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">
                            {health.checks.find(c => c.name === 'API Gateway')?.responseTime || 0}ms
                        </div>
                        <div className="text-xs text-slate-500">API Response Time</div>
                    </div>
                </div>
            )}

            {/* Service Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {health?.checks.map((check, idx) => {
                    const Icon = check.icon || Activity;
                    const statusColor = getStatusColor(check.status);
                    return (
                        <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-5 h-5 text-primary-400" />
                                    <span className="text-white font-medium">{check.name}</span>
                                </div>
                                <div className={`px-2 py-0.5 rounded-full text-xs ${statusColor}`}>
                                    {check.status}
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-white">
                                {check.responseTime > 0 ? `${check.responseTime}ms` : 'N/A'}
                            </p>
                            <p className="text-xs text-slate-400 mt-2 truncate" title={check.details}>
                                {check.details}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Recent History Log */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-400" /> 
                    Recent Health Checks (Last 50)
                </h3>
                {history.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No health history available yet</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {history.slice(0, 30).map((log, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-800/50 transition">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${
                                        log.status === 'healthy' ? 'bg-emerald-400' : 
                                        log.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
                                    }`} />
                                    <span className="text-slate-300 text-sm">{log.service_name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-slate-500 text-xs">
                                        {log.response_time_ms > 0 ? `${log.response_time_ms}ms` : 'N/A'}
                                    </span>
                                    <span className="text-slate-500 text-xs">
                                        {new Date(log.checked_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Diagnostic Tips */}
            {health?.overall !== 'healthy' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <h4 className="text-amber-400 font-semibold flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        Diagnostic Recommendations
                    </h4>
                    <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                        {health.checks.find(c => c.name === 'OpenAI API')?.status !== 'healthy' && (
                            <li>OpenAI API key missing - Add VITE_OPENAI_API_KEY to environment variables</li>
                        )}
                        {health.checks.find(c => c.name === 'Email Service')?.status !== 'healthy' && (
                            <li>Email credentials missing - Configure VITE_EMAIL_USER in Vercel environment variables</li>
                        )}
                        {health.checks.find(c => c.name === 'Supabase Database')?.status !== 'healthy' && (
                            <li>Database connection issue - Check Supabase status page and RLS policies</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
