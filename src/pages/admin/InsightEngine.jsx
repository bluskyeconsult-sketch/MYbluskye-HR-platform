// src/pages/admin/InsightEngine.jsx
// NEW (2026-08-27) — converts real, existing user activity into four
// distinct, actionable "clues" for the team's next creation cycle:
// Course, Newsletter, Product Design, Service Design. Calls the real
// generate-insight-clues backend action, which aggregates
// activity_signals, job_alerts, jobs/regional data, va_tasks, and
// existing courses in one pass - nothing here is invented, every clue
// traces back to real, current platform activity.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles, Loader2, BookOpen, Mail, Layers, Wrench, AlertCircle, RefreshCw, Globe } from 'lucide-react';

const API_BASE = '/api/index';

const CLUE_SECTIONS = [
    { key: 'course_clues', label: 'Course Clues', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { key: 'newsletter_clues', label: 'Newsletter Clues', icon: Mail, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { key: 'product_design_clues', label: 'Product Design Clues', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { key: 'service_design_clues', label: 'Service Design Clues', icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
];

export default function InsightEngine() {
    const [loading, setLoading] = useState(false);
    const [clues, setClues] = useState(null);
    const [dataPoints, setDataPoints] = useState(null);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    async function generateClues() {
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data: { user } } = await supabase.auth.getUser();

            const response = await fetch(`${API_BASE}?action=generate-insight-clues`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ userId: user?.id })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Failed to generate insight clues');

            if (!result.clues) {
                setMessage(result.message || 'Not enough recent activity for meaningful clues yet.');
                return;
            }

            setClues(result.clues);
            setDataPoints(result.dataPoints);
        } catch (err) {
            console.error('Insight generation failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary-400" /> Insight Engine
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Real user activity, converted into actionable clues for what to build next.
                    </p>
                </div>
                <button
                    onClick={generateClues}
                    disabled={loading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {loading ? 'Analyzing real activity...' : 'Generate Clues'}
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {message && (
                <div className="mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 text-sm">
                    {message}
                </div>
            )}

            {dataPoints && (
                <div className="mb-6 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> {dataPoints.signalsAnalyzed} recent chat/search signals</span>
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {dataPoints.alertsAnalyzed} active job alerts</span>
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {dataPoints.regionsRepresented} regions represented</span>
                </div>
            )}

            {!clues && !loading && !message && !error && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Click "Generate Clues" to analyze real, current platform activity.</p>
                </div>
            )}

            {clues && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {CLUE_SECTIONS.map(section => {
                        const items = clues[section.key] || [];
                        const Icon = section.icon;
                        return (
                            <div key={section.key} className={`border rounded-xl p-5 ${section.bg}`}>
                                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${section.color}`}>
                                    <Icon className="w-5 h-5" /> {section.label}
                                </h2>
                                {items.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No clues generated for this category this round.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                                                <p className="text-white font-medium text-sm mb-1">
                                                    {item.topic || item.headline_idea || item.feature_idea || item.service_idea}
                                                </p>
                                                {item.why && <p className="text-slate-400 text-xs mb-2">{item.why}</p>}
                                                {item.suggested_category && (
                                                    <span className="inline-block text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
                                                        Suggested category: {item.suggested_category}
                                                    </span>
                                                )}
                                                {item.angle && <p className="text-slate-500 text-xs italic">Angle: {item.angle}</p>}
                                                {item.evidence && <p className="text-slate-500 text-xs italic">Evidence: {item.evidence}</p>}
                                                {item.target_region && (
                                                    <span className="inline-block text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-400 mt-1">
                                                        <Globe className="w-3 h-3 inline mr-1" />{item.target_region}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
