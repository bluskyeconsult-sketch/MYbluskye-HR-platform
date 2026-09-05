// src/pages/admin/ReadinessCheck.jsx
//
// NEW (2026-09-04) — a real, working verification page implementing
// the readiness plan directly, rather than leaving it as a manual
// document. Calls the new readiness-check backend action and displays
// genuine, live results - not a static checklist.

import { useState } from 'react';
import { authenticatedFetch } from '../../lib/authFetch';
import { CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

export default function ReadinessCheck() {
    const [checks, setChecks] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function runCheck() {
        setLoading(true);
        setError(null);
        try {
            const data = await authenticatedFetch('readiness-check', {});
            if (!data.success) throw new Error('Check failed to run');
            setChecks(data.checks);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function statusIcon(status) {
        if (status === 'pass') return <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
        if (status === 'fail') return <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />;
        if (status === 'warn') return <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
        return <AlertTriangle className="w-5 h-5 text-slate-500 flex-shrink-0" />;
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Readiness Check</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Real, live verification of the specific items identified as unconfirmed - not a static checklist.
                    </p>
                </div>
                <button
                    onClick={runCheck}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Run Check
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {!checks && !loading && !error && (
                <p className="text-slate-500 text-sm text-center py-12">Click "Run Check" to verify current status.</p>
            )}

            {checks && (
                <div className="space-y-2">
                    {checks.map((check, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-4 bg-slate-900 border border-slate-800 rounded-lg">
                            {statusIcon(check.status)}
                            <div>
                                <p className="text-white text-sm font-medium">{check.item}</p>
                                <p className="text-slate-400 text-xs mt-0.5">{check.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
