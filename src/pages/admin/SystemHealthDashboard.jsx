// src/pages/admin/SystemHealthDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, CheckCircle, XCircle, AlertCircle, Loader2, Server, Database, Mail, Brain, RefreshCw, Clock } from 'lucide-react';

export default function SystemHealthDashboard() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        checkHealth();
    }, []);

    async function checkHealth() {
        setRefreshing(true);
        const checks = [];
        
        // Check Supabase
        try {
            const start = Date.now();
            const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            checks.push({
                name: 'Supabase Database',
                status: error ? 'degraded' : 'healthy',
                responseTime: Date.now() - start,
                details: error ? error.message : 'Connected'
            });
        } catch (err) {
            checks.push({ name: 'Supabase Database', status: 'down', responseTime: 0, details: err.message });
        }
        
        // Check Storage
        try {
            const start = Date.now();
            await supabase.storage.listBuckets();
            checks.push({ name: 'Storage Service', status: 'healthy', responseTime: Date.now() - start, details: 'Available' });
        } catch (err) {
            checks.push({ name: 'Storage Service', status: 'down', responseTime: 0, details: err.message });
        }
        
        // Check Auth
        try {
            const start = Date.now();
            await supabase.auth.getSession();
            checks.push({ name: 'Auth Service', status: 'healthy', responseTime: Date.now() - start, details: 'Available' });
        } catch (err) {
            checks.push({ name: 'Auth Service', status: 'degraded', responseTime: 0, details: err.message });
        }
        
        // Check OpenAI
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        checks.push({
            name: 'OpenAI API',
            status: openaiKey ? 'healthy' : 'degraded',
            responseTime: 0,
            details: openaiKey ? 'Key configured' : 'Key missing'
        });
        
        // Check Email
        const smtpHost = import.meta.env.VITE_SMTP_HOST || process.env.SMTP_HOST;
        checks.push({
            name: 'Email Service',
            status: smtpHost ? 'healthy' : 'degraded',
            responseTime: 0,
            details: smtpHost ? 'SMTP configured' : 'SMTP missing'
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
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">System Health Dashboard</h1>
                    <p className="text-slate-400">Real-time system monitoring</p>
                </div>
                <button onClick={checkHealth} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className={`mb-6 p-4 rounded-xl border ${health?.overall === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' : health?.overall === 'degraded' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className="flex items-center gap-3">
                    {health?.overall === 'healthy' ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <AlertCircle className="w-6 h-6 text-amber-400" />}
                    <div>
                        <p className="text-white font-semibold">System Status: {health?.overall?.toUpperCase()}</p>
                        <p className="text-slate-400 text-sm">Last checked: {new Date(health?.timestamp).toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {health?.checks.map((check, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {check.name === 'Supabase Database' && <Database className="w-5 h-5 text-primary-400" />}
                                {check.name === 'Storage Service' && <Server className="w-5 h-5 text-primary-400" />}
                                {check.name === 'Auth Service' && <Activity className="w-5 h-5 text-primary-400" />}
                                {check.name === 'OpenAI API' && <Brain className="w-5 h-5 text-primary-400" />}
                                {check.name === 'Email Service' && <Mail className="w-5 h-5 text-primary-400" />}
                                <span className="text-white font-medium">{check.name}</span>
                            </div>
                            {check.status === 'healthy' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : check.status === 'degraded' ? <AlertCircle className="w-5 h-5 text-amber-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                        </div>
                        <p className="text-2xl font-bold text-white">{check.responseTime}ms</p>
                        <p className="text-xs text-slate-500 mt-1">{check.details}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
