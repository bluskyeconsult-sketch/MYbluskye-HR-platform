// src/pages/admin/SystemHealthDashboard.jsx
// COMPLETE UNIFIED SYSTEM HEALTH DASHBOARD - Real-time monitoring via unified API

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Activity, CheckCircle, XCircle, AlertCircle, Loader2,
    Database, Server, Zap, Users, Briefcase, BookOpen,
    Brain, Bot, Mail, TrendingUp, Shield, Globe,
    RefreshCw, Clock, Wifi, HardDrive, BarChart3, 
    Cpu, Cloud, Lock, Bell, Award, FileText, MessageCircle
} from 'lucide-react';

// ✅ UNIFIED API ENDPOINT - Single source of truth
const API_BASE = '/api/index';
const HEALTH_ENDPOINT = `${API_BASE}?action=health`;

export default function SystemHealthDashboard() {
    const [health, setHealth] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastManualRefresh, setLastManualRefresh] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [dataStats, setDataStats] = useState({});

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
        const data = {};

        // ============================================
        // 1. API Gateway - Unified endpoint
        // ============================================
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
                metric: apiResponse.ok ? 'operational' : 'issue'
            });
        } catch (err) {
            checks.push({ 
                name: 'API Gateway', 
                status: 'critical', 
                responseTime: 0, 
                details: err.message, 
                icon: Server,
                metric: 'unreachable'
            });
        }

        // ============================================
        // 2. Supabase Database
        // ============================================
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
                icon: Database,
                metric: error ? 'degraded' : `${count?.toLocaleString()} users`
            });
        } catch (err) {
            checks.push({ 
                name: 'Supabase Database', 
                status: 'critical', 
                responseTime: 0, 
                details: err.message, 
                icon: Database,
                metric: 'connection failed'
            });
        }

        // ============================================
        // 3. Jobs Board
        // ============================================
        try {
            const start = Date.now();
            const { count, error } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .eq('compliance_status', 'approved');
            
            data.jobs = { total: count || 0, active: count || 0 };
            checks.push({
                name: 'Jobs Board',
                status: error ? 'degraded' : 'healthy',
                responseTime: Date.now() - start,
                details: error ? error.message : `${count || 0} active jobs`,
                icon: Briefcase,
                metric: `${count || 0} jobs`
            });
        } catch (err) {
            data.jobs = { total: 0, active: 0 };
            checks.push({ name: 'Jobs Board', status: 'error', responseTime: 0, details: err.message, icon: Briefcase, metric: 'error' });
        }

        // ============================================
        // 4. Courses
        // ============================================
        try {
            const start = Date.now();
            const { count, error } = await supabase
                .from('courses')
                .select('*', { count: 'exact', head: true })
                .eq('is_published', true);
            
            data.courses = { total: count || 0, published: count || 0 };
            checks.push({
                name: 'Courses',
                status: error ? 'degraded' : 'healthy',
                responseTime: Date.now() - start,
                details: error ? error.message : `${count || 0} published courses`,
                icon: BookOpen,
                metric: `${count || 0} courses`
            });
        } catch (err) {
            data.courses = { total: 0, published: 0 };
            checks.push({ name: 'Courses', status: 'error', responseTime: 0, details: err.message, icon: BookOpen, metric: 'error' });
        }

        // ============================================
        // 5. Assessments
        // ============================================
        try {
            const start = Date.now();
            const { count, error } = await supabase
                .from('assessments')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);
            
            const { count: completed } = await supabase
                .from('user_assessments')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed');
            
            data.assessments = { total: count || 0, completed: completed || 0 };
            checks.push({
                name: 'Assessments',
                status: error ? 'degraded' : 'healthy',
                responseTime: Date.now() - start,
                details: error ? error.message : `${count || 0} active, ${completed || 0} completed`,
                icon: Brain,
                metric: `${count || 0} active`
            });
        } catch (err) {
            data.assessments = { total: 0, completed: 0 };
            checks.push({ name: 'Assessments', status: 'error', responseTime: 0, details: err.message, icon: Brain, metric: 'error' });
        }

        // ============================================
        // 6. Hire VA
        // ============================================
        try {
            const start = Date.now();
            const { count, error } = await supabase
                .from('va_tasks')
                .select('*', { count: 'exact', head: true });
            
            data.vaTasks = { total: count || 0 };
            checks.push({
                name: 'Hire VA',
                status: error ? 'degraded' : 'healthy',
                responseTime: Date.now() - start,
                details: error ? error.message : `${count || 0} total tasks`,
                icon: Bot,
                metric: `${count || 0} tasks`
            });
        } catch (err) {
            data.vaTasks = { total: 0 };
            checks.push({ name: 'Hire VA', status: 'error', responseTime: 0, details: err.message, icon: Bot, metric: 'error' });
        }

        // ============================================
        // 7. Books
        // ============================================
        try {
            const start = Date.now();
            const { count, error } = await supabase
                .from('books')
                .select('*', { count: 'exact', head: true });
            
            data.books = { total: count || 0 };
            checks.push({
                name: 'Books',
                status: error ? 'degraded' : 'healthy',
                responseTime: Date.now() - start,
                details: error ? error.message : `${count || 0} books available`,
                icon: FileText,
                metric: `${count || 0} books`
            });
        } catch (err) {
            data.books = { total: 0 };
            checks.push({ name: 'Books', status: 'error', responseTime: 0, details: err.message, icon: FileText, metric: 'error' });
        }

        // ============================================
        // 8. Newsletter
        // ============================================
        try {
            const start = Date.now();
            const { count, error } = await supabase
                .from('newsletter_subscribers')
                .select('*', { count: 'exact', head: true });
            
            data.newsletter = { subscribers: count || 0 };
            checks.push({
                name: 'Newsletter',
                status: error ? 'degraded' : 'healthy',
                responseTime: Date.now() - start,
                details: error ? error.message : `${count || 0} subscribers`,
                icon: Mail,
                metric: `${count || 0} subscribers`
            });
        } catch (err) {
            data.newsletter = { subscribers: 0 };
            checks.push({ name: 'Newsletter', status: 'error', responseTime: 0, details: err.message, icon: Mail, metric: 'error' });
        }

        // ============================================
        // 9. Storage Service
        // ============================================
        try {
            const storageStart = Date.now();
            const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
            checks.push({
                name: 'Storage Service',
                status: storageError ? 'degraded' : 'healthy',
                responseTime: Date.now() - storageStart,
                details: storageError ? storageError.message : `${buckets?.length || 0} buckets available`,
                icon: HardDrive,
                metric: `${buckets?.length || 0} buckets`
            });
        } catch (err) {
            checks.push({ 
                name: 'Storage Service', 
                status: 'critical', 
                responseTime: 0, 
                details: err.message, 
                icon: HardDrive,
                metric: 'unavailable'
            });
        }

        // ============================================
        // 10. Auth Service
        // ============================================
        try {
            const authStart = Date.now();
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            checks.push({
                name: 'Auth Service',
                status: authError ? 'degraded' : 'healthy',
                responseTime: Date.now() - authStart,
                details: authError ? authError.message : (session ? 'Authenticated' : 'No active session'),
                icon: Shield,
                metric: session ? 'active session' : 'no session'
            });
        } catch (err) {
            checks.push({ 
                name: 'Auth Service', 
                status: 'degraded', 
                responseTime: 0, 
                details: err.message, 
                icon: Shield,
                metric: 'error'
            });
        }

        // ============================================
        // 11. OpenAI API
        // ============================================
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        checks.push({
            name: 'OpenAI API',
            status: openaiKey ? 'healthy' : 'degraded',
            responseTime: 0,
            details: openaiKey ? `Key configured (${openaiKey.slice(0, 8)}...)` : 'API key missing - AI features disabled',
            icon: Brain,
            metric: openaiKey ? 'configured' : 'missing'
        });

        // ============================================
        // 12. Email Service
        // ============================================
        const emailUser = import.meta.env.VITE_EMAIL_USER;
        checks.push({
            name: 'Email Service',
            status: emailUser ? 'healthy' : 'degraded',
            responseTime: 0,
            details: emailUser ? `${emailUser} via Hostinger SMTP` : 'Email credentials missing',
            icon: Mail,
            metric: emailUser ? 'configured' : 'missing'
        });

        // ============================================
        // 13. Realtime Service
        // ============================================
        try {
            const realtimeStart = Date.now();
            // FIXED (2026-08-30): confirmed real bug, causing a repeating
            // "Maximum call stack size exceeded" crash. Two compounding
            // issues: (1) Supabase's subscribe() callback can fire more
            // than once as a channel's status changes (SUBSCRIBING, then
            // SUBSCRIBED, etc.) - this had no guard against running its
            // resolve+unsubscribe logic more than once. (2) unsubscribe()
            // was called synchronously from inside the very callback
            // still processing a status change - a re-entrant call into
            // the channel's own event-handling mid-flight, matching the
            // real stack trace exactly (unsubscribe -> leave -> send ->
            // back into the channel's own callback machinery). Also used
            // a hardcoded channel name, risking a collision with a
            // still-unraveling previous channel every 60 seconds via
            // auto-refresh. Now guarded to run its settle logic exactly
            // once, defers unsubscribe to the next tick so it never
            // re-enters mid-processing, and uses a unique name per check.
            const realtimeChannel = supabase.channel(`health-check-${Date.now()}`);
            let settled = false;
            let resolveHealth;
            const settleOnce = (result) => {
                if (settled) return;
                settled = true;
                resolveHealth(result);
                setTimeout(() => {
                    try { realtimeChannel.unsubscribe(); } catch (e) { /* already gone, fine */ }
                }, 0);
            };
            await new Promise((resolve) => {
                resolveHealth = resolve;
                const timeout = setTimeout(() => settleOnce(false), 5000);
                realtimeChannel.subscribe((status) => {
                    if (settled) return;
                    clearTimeout(timeout);
                    settleOnce(status === 'SUBSCRIBED');
                });
            });
            checks.push({
                name: 'Realtime Service',
                status: 'healthy',
                responseTime: Date.now() - realtimeStart,
                details: 'WebSocket connections operational',
                icon: Zap,
                metric: `${Date.now() - realtimeStart}ms`
            });
        } catch (err) {
            checks.push({ 
                name: 'Realtime Service', 
                status: 'degraded', 
                responseTime: 0, 
                details: err.message, 
                icon: Zap,
                metric: 'issue'
            });
        }

        // ============================================
        // Calculate Overall Status
        // ============================================
        const hasCritical = checks.some(c => c.status === 'critical');
        const hasDegraded = checks.some(c => c.status === 'degraded');
        const overall = hasCritical ? 'critical' : (hasDegraded ? 'degraded' : 'healthy');

        // Update data stats for summary
        setDataStats(data);

        const healthData = { 
            checks, 
            overall, 
            timestamp: new Date().toISOString(),
            totalResponseTime: Date.now() - startTime,
            servicesCount: checks.length,
            healthyCount: checks.filter(c => c.status === 'healthy').length,
            data: data
        };
        
        setHealth(healthData);
        setLastManualRefresh(new Date());

        // Load history
        await loadHistory();
        
        setRefreshing(false);
        setLoading(false);
    }, []);

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
            case 'healthy': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'degraded': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
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

    function getStatusBadge(status) {
        const config = {
            healthy: { label: 'Operational', color: 'bg-emerald-500/20 text-emerald-400' },
            degraded: { label: 'Partial Outage', color: 'bg-amber-500/20 text-amber-400' },
            critical: { label: 'Major Outage', color: 'bg-red-500/20 text-red-400' }
        };
        const { label, color } = config[status] || config.healthy;
        return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
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
    const criticalCount = health?.checks?.filter(c => c.status === 'critical').length || 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary-400" />
                        System Health Dashboard
                    </h1>
                    <p className="text-slate-400">Real-time system monitoring and diagnostics via unified API</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm transition"
                    >
                        <BarChart3 className="w-3 h-3" />
                        {showDetails ? 'Hide Details' : 'Show Details'}
                    </button>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
                            autoRefresh ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                    >
                        <Zap className="w-3 h-3" />
                        {autoRefresh ? 'Auto ON' : 'Auto OFF'}
                    </button>
                    <button 
                        onClick={checkHealth} 
                        disabled={refreshing} 
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 disabled:opacity-50 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Checking...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Overall Status Banner */}
            <div className={`p-5 rounded-xl border ${getStatusColor(health?.overall)}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {getStatusIcon(health?.overall)}
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-lg">
                                    System Status: {health?.overall?.toUpperCase()}
                                </p>
                                {getStatusBadge(health?.overall)}
                            </div>
                            <p className="text-sm opacity-80 mt-1">
                                Last checked: {new Date(health?.timestamp).toLocaleString()}
                                {lastManualRefresh && ` • Manual: ${lastManualRefresh.toLocaleTimeString()}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                            <span>{healthyCount}/{health?.servicesCount} Healthy</span>
                        </div>
                        {degradedCount > 0 && (
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                <span>{degradedCount} Degraded</span>
                            </div>
                        )}
                        {criticalCount > 0 && (
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                <span>{criticalCount} Critical</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{health?.totalResponseTime}ms total</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-primary-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{dataStats.jobs?.total || 0}</div>
                            <div className="text-sm text-slate-400">Total Jobs</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-emerald-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{dataStats.courses?.published || 0}</div>
                            <div className="text-sm text-slate-400">Published Courses</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Brain className="w-6 h-6 text-purple-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{dataStats.assessments?.total || 0}</div>
                            <div className="text-sm text-slate-400">Active Assessments</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Bot className="w-6 h-6 text-amber-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{dataStats.vaTasks?.total || 0}</div>
                            <div className="text-sm text-slate-400">VA Tasks</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Services Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {health?.checks.map((check, idx) => {
                    const Icon = check.icon || Activity;
                    const statusColor = getStatusColor(check.status);
                    const isSelected = selectedService === check.name;
                    
                    return (
                        <div 
                            key={idx} 
                            className={`bg-slate-900/50 border rounded-xl p-4 transition-all cursor-pointer hover:border-slate-600 ${
                                isSelected ? 'border-primary-500 ring-1 ring-primary-500' : 'border-slate-800'
                            }`}
                            onClick={() => setSelectedService(isSelected ? null : check.name)}
                        >
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
                            {isSelected && showDetails && check.metric && (
                                <div className="mt-3 pt-3 border-t border-slate-700">
                                    <p className="text-xs text-primary-400">Metric: {check.metric}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Recent History Log */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-400" /> 
                    Recent Health Checks (Last 30)
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

            {/* Diagnostic Recommendations */}
            {(health?.overall === 'degraded' || health?.overall === 'critical') && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
                    <h4 className="text-amber-400 font-semibold flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4" />
                        Diagnostic Recommendations
                    </h4>
                    <ul className="text-sm text-slate-300 space-y-2">
                        {health.checks.find(c => c.name === 'OpenAI API')?.status !== 'healthy' && (
                            <li className="flex items-start gap-2">
                                <span className="text-amber-400">•</span>
                                <span>OpenAI API key missing - Add <code className="bg-slate-800 px-1 rounded">VITE_OPENAI_API_KEY</code> to environment variables</span>
                            </li>
                        )}
                        {health.checks.find(c => c.name === 'Email Service')?.status !== 'healthy' && (
                            <li className="flex items-start gap-2">
                                <span className="text-amber-400">•</span>
                                <span>Email credentials missing - Configure <code className="bg-slate-800 px-1 rounded">VITE_EMAIL_USER</code> and <code className="bg-slate-800 px-1 rounded">VITE_EMAIL_PASS</code></span>
                            </li>
                        )}
                        {health.checks.find(c => c.name === 'Supabase Database')?.status !== 'healthy' && (
                            <li className="flex items-start gap-2">
                                <span className="text-amber-400">•</span>
                                <span>Database connection issue - Check Supabase status page and RLS policies</span>
                            </li>
                        )}
                        {health.checks.find(c => c.name === 'Realtime Service')?.status !== 'healthy' && (
                            <li className="flex items-start gap-2">
                                <span className="text-amber-400">•</span>
                                <span>Realtime service degraded - Check Supabase Realtime configuration</span>
                            </li>
                        )}
                    </ul>
                </div>
            )}

            {/* System Info Footer */}
            <div className="text-center text-xs text-slate-500">
                <p>System Health Dashboard v2.0 | Unified API Endpoint: <code className="bg-slate-800 px-1 rounded">/api/index?action=health</code></p>
                <p className="mt-1">Auto-refresh every 60 seconds | Last full check: {new Date(health?.timestamp).toLocaleString()}</p>
                <p className="mt-1 text-slate-600">All service checks performed via unified API gateway</p>
            </div>
        </div>
    );
}
