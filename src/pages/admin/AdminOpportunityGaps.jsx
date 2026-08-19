// src/pages/admin/AdminOpportunityGaps.jsx
// NEW FILE (2026-08-16) — surfaces real user needs, gaps, and potential
// products identified from actual search/chat activity, with "auto build
// assist": each gap comes with a concrete suggested build, and where
// applicable, a real starter system prompt ready to drop into a new tool.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Lightbulb, TrendingUp, Loader2, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';

export default function AdminOpportunityGaps() {
    const [gaps, setGaps] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [copiedPrompt, setCopiedPrompt] = useState(null);
    const [signalsAnalyzed, setSignalsAnalyzed] = useState(null);

    useEffect(() => {
        loadTrending();
    }, []);

    async function loadTrending() {
        try {
            const response = await fetch('/api/index?action=trending-topics&days=7');
            const data = await response.json();
            if (data.success) setTrending(data.trending || []);
        } catch (err) {
            console.error('Failed to load trending topics:', err);
        }
    }

    async function runAnalysis() {
        setLoading(true);
        setMessage(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const response = await fetch('/api/index?action=analyze-opportunity-gaps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id })
            });
            const data = await response.json();

            if (!data.success) throw new Error(data.error);

            if (data.gaps && data.gaps.length > 0) {
                setGaps(data.gaps);
                setSignalsAnalyzed(data.signalsAnalyzed);
            } else {
                setMessage(data.message || 'No clear gaps identified from current activity.');
            }
        } catch (err) {
            console.error('Analysis failed:', err);
            setMessage('Analysis failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    function copyPrompt(text, idx) {
        navigator.clipboard.writeText(text);
        setCopiedPrompt(idx);
        setTimeout(() => setCopiedPrompt(null), 2000);
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-amber-400" /> Opportunity Gaps
                </h1>
                <button
                    onClick={runAnalysis}
                    disabled={loading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {loading ? 'Analyzing...' : 'Run Analysis'}
                </button>
            </div>
            <p className="text-slate-400 text-sm mb-6">
                AI-identified needs and opportunities from real user searches and chat activity over the last 30 days — with a concrete suggested build for each, not just a description of the problem.
            </p>

            {/* Trending Topics — same data source powers the public "Latest Trend Corner" */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-6">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Trending This Week
                </h2>
                {trending.length === 0 ? (
                    <p className="text-slate-500 text-sm">Not enough activity yet to show trends.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {trending.map((t, idx) => (
                            <span key={idx} className="px-3 py-1 bg-slate-800 rounded-full text-sm text-slate-300">
                                {t.topic} <span className="text-slate-500">({t.count})</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {message && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-300">{message}</p>
                </div>
            )}

            {signalsAnalyzed && (
                <p className="text-xs text-slate-500 mb-4">Based on {signalsAnalyzed} recent search/chat signals.</p>
            )}

            <div className="space-y-4">
                {gaps.map((gap, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-1">{gap.gap}</h3>
                        <p className="text-slate-400 text-sm mb-3">{gap.evidence}</p>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-3">
                            <p className="text-xs text-emerald-400 font-semibold mb-1">Suggested Build</p>
                            <p className="text-sm text-slate-200">{gap.suggested_build}</p>
                        </div>

                        {gap.starter_prompt && (
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs text-primary-400 font-semibold">Starter System Prompt (ready to use)</p>
                                    <button onClick={() => copyPrompt(gap.starter_prompt, idx)} className="text-slate-400 hover:text-white">
                                        {copiedPrompt === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 font-mono">{gap.starter_prompt}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {gaps.length === 0 && !message && !loading && (
                <div className="text-center py-12 text-slate-500">
                    <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Click "Run Analysis" to identify opportunities from real user activity.</p>
                </div>
            )}
        </div>
    );
}
