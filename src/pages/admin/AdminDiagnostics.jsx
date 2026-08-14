// src/pages/admin/AdminDiagnostics.jsx
// NEW FILE (2026-08-07) — fills the /admin/diagnostics link in
// AdminDashboard.jsx, which pointed nowhere since no route or page existed.
//
// SystemHealthDashboard.jsx (already built) covers live status checks
// (OpenAI key, email, database, realtime). This page is deliberately
// different: it's a viewer for historical/automated system events across
// three tables confirmed to exist via the RLS diagnostic query —
// diagnostic_logs, self_heal_actions, and tamper_attempts — none of which
// anything else in the reviewed codebase reads. Exact columns weren't
// confirmed, so this reads flexibly with fallbacks rather than assuming one
// schema, same approach as AdminTesterFeedback.jsx.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Shield, Wrench, Loader2, RefreshCw, AlertTriangle, Clock } from 'lucide-react';

const TABS = [
    { id: 'diagnostic_logs', label: 'Diagnostic Logs', icon: Activity },
    { id: 'self_heal_actions', label: 'Self-Heal Actions', icon: Wrench },
    { id: 'tamper_attempts', label: 'Tamper Attempts', icon: Shield }
];

export default function AdminDiagnostics() {
    const [activeTab, setActiveTab] = useState('diagnostic_logs');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    useEffect(() => {
        if (isAuthorized) loadEntries();
    }, [activeTab, isAuthorized]);

    async function checkAdminAccess() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/admin-login'; return; }

        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
        if (!isAdmin) {
            alert('Access denied. Admin access required.');
            window.location.href = '/admin/dashboard';
            return;
        }

        setIsAuthorized(true);
    }

    async function loadEntries() {
        setLoading(true);
        setRefreshing(true);
        try {
            const { data, error } = await supabase
                .from(activeTab)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setEntries(data || []);
        } catch (err) {
            console.error(`Error loading ${activeTab}:`, err);
            setEntries([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function getSummary(entry) {
        return entry.description || entry.action || entry.message || entry.event_type || entry.details || JSON.stringify(entry).substring(0, 120);
    }

    function getSeverityColor(entry) {
        const sev = (entry.severity || entry.status || '').toLowerCase();
        if (sev === 'critical' || sev === 'failed') return 'text-red-400 bg-red-500/20';
        if (sev === 'warning') return 'text-amber-400 bg-amber-500/20';
        if (sev === 'success' || sev === 'resolved') return 'text-emerald-400 bg-emerald-500/20';
        return 'text-slate-400 bg-slate-500/20';
    }

    if (!isAuthorized) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary-400" /> System Diagnostics
                    </h1>
                    <p className="text-slate-400 text-sm">
                        Historical system events. For live status, see{' '}
                        <a href="/admin/health" className="text-primary-400 hover:underline">System Health</a>.
                    </p>
                </div>
                <button
                    onClick={loadEntries}
                    disabled={refreshing}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            <div className="flex gap-2 border-b border-slate-800 mb-6 flex-wrap">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium transition flex items-center gap-2 ${
                                activeTab === tab.id
                                    ? 'text-primary-400 border-b-2 border-primary-400'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Icon className="w-4 h-4" /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
            ) : entries.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Entries Yet</h3>
                    <p className="text-slate-400">
                        {activeTab === 'diagnostic_logs' && 'Diagnostic events will appear here as they occur.'}
                        {activeTab === 'self_heal_actions' && 'Automated self-heal actions will appear here as they occur.'}
                        {activeTab === 'tamper_attempts' && "No tamper attempts detected — that's good news."}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {entries.map((entry, idx) => (
                        <div key={entry.id || idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                                {activeTab === 'tamper_attempts' && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                                <div className="min-w-0">
                                    <p className="text-slate-300 text-sm break-words">{getSummary(entry)}</p>
                                    {entry.ip_address && (
                                        <p className="text-slate-500 text-xs mt-1">IP: {entry.ip_address}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {(entry.severity || entry.status) && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(entry)}`}>
                                        {entry.severity || entry.status}
                                    </span>
                                )}
                                <span className="text-slate-500 text-xs whitespace-nowrap">
                                    {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
