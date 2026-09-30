// src/pages/admin/OpenAIUsageMonitor.jsx
//
// NEW (2026-09-30): real usage monitoring and anomaly detection for
// the platform's OpenAI API key - a genuine, meaningful spend spike
// is one of the most direct, practical signals of a compromised key.
// Also provides real, direct key-rotation guidance, given recent,
// real security incidents across the AI industry make this worth
// having on hand rather than looked up under pressure.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, DollarSign, TrendingUp, Loader2, ShieldAlert, ExternalLink } from 'lucide-react';

export default function OpenAIUsageMonitor() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadSummary();
    }, []);

    async function loadSummary() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=get-openai-usage-summary', {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            setSummary(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>;
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-primary-400" /> OpenAI Usage & Security
            </h1>
            <p className="text-slate-400 text-sm mb-6">
                Real spend tracking and a genuine anomaly check — a real, meaningful spike is one of the fastest signals of a compromised API key.
            </p>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            {summary?.isAnomaly && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-300 font-semibold text-sm">Unusual spend detected today</p>
                        <p className="text-red-200/80 text-sm mt-1">
                            Today's usage (${summary.todayCost}) is more than 3x your real, {summary.daysOfHistory}-day average (${summary.avgDailyCost}). This could be genuinely normal (a large batch task), or it could mean your API key is being used somewhere you don't control. Worth checking OpenAI's own usage dashboard directly to confirm.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <p className="text-slate-400 text-sm flex items-center gap-1.5 mb-1"><DollarSign className="w-4 h-4" /> Today's spend</p>
                    <p className="text-2xl font-bold text-white">${summary?.todayCost ?? '0.0000'}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <p className="text-slate-400 text-sm flex items-center gap-1.5 mb-1"><TrendingUp className="w-4 h-4" /> Real daily average</p>
                    <p className="text-2xl font-bold text-white">${summary?.avgDailyCost ?? '0.0000'}</p>
                    <p className="text-slate-500 text-xs mt-1">over the last {summary?.daysOfHistory ?? 0} days</p>
                </div>
            </div>

            {summary?.todayByType && Object.keys(summary.todayByType).length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-6">
                    <p className="text-white font-medium text-sm mb-3">Today's spend by type</p>
                    <div className="space-y-2">
                        {Object.entries(summary.todayByType).map(([type, cost]) => (
                            <div key={type} className="flex justify-between text-sm">
                                <span className="text-slate-400 capitalize">{type}</span>
                                <span className="text-slate-300">${Math.round(cost * 10000) / 10000}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <p className="text-white font-medium text-sm mb-3">If you ever need to rotate your API key</p>
                <ol className="text-slate-400 text-sm space-y-2 list-decimal list-inside">
                    <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 inline-flex items-center gap-1">platform.openai.com/api-keys <ExternalLink className="w-3 h-3" /></a> and create a new key</li>
                    <li>Update <code className="text-slate-300 bg-slate-800 px-1 rounded">OPENAI_API_KEY</code> (and/or <code className="text-slate-300 bg-slate-800 px-1 rounded">VITE_OPENAI_API_KEY</code>) in Vercel's environment variables</li>
                    <li>Redeploy so the new key takes effect</li>
                    <li>Return to OpenAI's dashboard and delete the old key</li>
                </ol>
                <p className="text-slate-500 text-xs mt-3">
                    Doing this occasionally as routine hygiene — not just when something looks wrong — is a real, low-effort habit worth keeping, especially given the current climate of AI-provider security incidents.
                </p>
            </div>
        </div>
    );
}
