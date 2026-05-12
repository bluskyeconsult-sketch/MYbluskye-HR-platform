// src/pages/admin/SystemHealthDashboard.jsx
// System Health Dashboard - Real-time service monitoring

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Activity, CheckCircle, XCircle, AlertCircle, Loader2, 
    Server, Database, Mail, Brain, RefreshCw, Clock, 
    Wifi, HardDrive, Zap, Bell, Shield, TrendingUp
} from 'lucide-react';

export default function SystemHealthDashboard() {
    const [health, setHealth] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 60000);
        return () => clearInterval(interval);
    }, []);

    async function checkHealth() {
        setRefreshing(true);
        const checks = [];
        
        // 1. Check Supabase Database
        try {
            const start = Date.now();
            const { error, count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            checks.push({
                name: 'Supabase Database',
                status: error ? 'degraded' : 'healthy',
                responseTime: Date.now() - start,
                details: error ? error.message : `${count || 0} users`,
                icon: Database
            });
        } catch (err) {
            checks.push({ name: 'Supabase Database', status: 'down', responseTime: 0, details: err.message, icon: Database });
        }
        
        // 2. Check Storage
        try {
            const start = Date.now();
            await supabase.storage.listBuckets();
            checks.push({
                name: 'Storage Service',
                status: 'healthy',
                responseTime: Date.now() - start,
                details: 'Storage accessible',
                icon: HardDrive
            });
        } catch (err) {
            checks.push({ name: 'Storage Service', status: 'down', responseTime: 0, details: err.message, icon: HardDrive });
        }
        
        // 3. Check Auth
        try {
            const start = Date.now();
            await supabase.auth.getSession();
            checks.push({
                name: 'Auth Service',
                status: 'healthy',
                responseTime: Date.now() - start,
                details: 'Authentication service running',
                icon: Shield
            });
        } catch (err) {
            checks.push({ name: 'Auth Service', status: 'degraded', responseTime: 0, details: err.message, icon: Shield });
        }
        
        // 4. Check OpenAI
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        checks.push({
            name: 'OpenAI API',
            status: openaiKey ? 'healthy' : 'degraded',
            responseTime: 0,
            details: openaiKey ? 'API key configured' : 'API key missing',
            icon: Brain
        });
        
        // 5. Check Email
        const smtpHost = import.meta.env.VITE_SMTP_HOST || process.env.SMTP_HOST;
        checks.push({
            name: 'Email Service',
            status: smtpHost ? 'healthy' : 'degraded',
            responseTime: 0,
            details: smtpHost ? 'SMTP configured' : 'SMTP credentials missing',
            icon: Mail
        });
        
        const overall = checks.some(c => c.status === 'down') ? 'critical' : 
                        checks.some(c => c.status === 'degraded') ? 'degraded' : 'healthy';
        
        setHealth({ checks, overall, timestamp: new Date().toISOString() });
        
        // Log to database
        for (const check of checks) {
            await supabase.from('system_health_logs').insert({
                service_name: check.name,
                status: check.status,
                response_time_ms: check.responseTime,
                details: { message: check.details },
                checked_at: new Date().toISOString()
            });
        }
        
        // Load history
        const { data: historyData } = await supabase
            .from('system_health_logs')
            .select('*')
            .order('checked_at', { ascending: false })
            .limit(50);
        setHistory(historyData || []);
        
        setRefreshing(false);
        setLoading(false);
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
                    <h1 className="text-2xl font-bold text-white">System Health Dashboard</h1>
                    <p className="text-slate-400">Real-time system monitoring and diagnostics</p>
                </div>
                <button onClick={checkHealth} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className={`p-4 rounded-xl border ${health?.overall === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' : health?.overall === 'degraded' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className="flex items-center gap-3">
                    {health?.overall === 'healthy' ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <AlertCircle className="w-6 h-6 text-amber-400" />}
                    <div>
                        <p className="text-white font-semibold">System Status: {health?.overall?.toUpperCase()}</p>
                        <p className="text-slate-400 text-sm">Last checked: {new Date(health?.timestamp).toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {health?.checks.map((check, idx) => {
                    const Icon = check.icon || Activity;
                    return (
                        <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-5 h-5 text-primary-400" />
                                    <span className="text-white font-medium">{check.name}</span>
                                </div>
                                {check.status === 'healthy' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : check.status === 'degraded' ? <AlertCircle className="w-5 h-5 text-amber-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                            </div>
                            <p className="text-2xl font-bold text-white">{check.responseTime}ms</p>
                            <p className="text-xs text-slate-500 mt-1">{check.details}</p>
                        </div>
                    );
                })}
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary-400" /> Recent Health Checks</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.slice(0, 20).map((log, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                {log.status === 'healthy' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                                <span className="text-slate-300 text-sm">{log.service_name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-slate-500 text-xs">{log.response_time_ms}ms</span>
                                <span className="text-slate-500 text-xs">{new Date(log.checked_at).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
