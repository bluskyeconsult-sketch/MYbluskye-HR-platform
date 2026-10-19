// src/components/admin/ShareStatsCard.jsx
//
// NEW (2026-10-19): admin card showing how the Share buttons are used: total shares, which channels
// (WhatsApp, LinkedIn, X...), which kinds of content and the most shared pages. Placed on the
// Analytics page. Reads the anonymous counts written by the track-share action.

import { useState, useEffect } from 'react';
import { Share2, Loader2, RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '../../lib/authFetch';

const CHANNEL_LABEL = {
    whatsapp: 'WhatsApp', facebook: 'Facebook', twitter: 'X (Twitter)', linkedin: 'LinkedIn',
    email: 'Email', native: 'Phone share sheet', copy_link: 'Copy link', copy_caption: 'Copy post caption'
};

function Bars({ rows, labelFor }) {
    const max = Math.max(1, ...rows.map(r => r.count));
    if (!rows.length) return <p className="text-slate-500 text-sm">Nothing yet.</p>;
    return (
        <div className="space-y-2">
            {rows.map(r => (
                <div key={r.name}>
                    <div className="flex justify-between text-sm text-slate-300">
                        <span className="truncate pr-2">{labelFor ? labelFor(r.name) : r.name}</span>
                        <span className="text-slate-400">{r.count}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.max(3, (r.count / max) * 100)}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ShareStatsCard({ days = 30 }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function load() {
        setLoading(true);
        setError('');
        try {
            const r = await authenticatedFetch('share-stats', { days: Math.min(90, Number(days) || 30) });
            setData(r);
        } catch (err) {
            setError(err.message || 'Could not load share statistics.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary-400" /> Social sharing
                    {data?.days ? <span className="text-xs font-normal text-slate-500">last {data.days} days</span> : null}
                </h2>
                <button onClick={load} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700" aria-label="Refresh">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-300" /> : <RefreshCw className="w-4 h-4 text-slate-300" />}
                </button>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {data?.tableMissing && (
                <p className="text-sm text-amber-300">Share counting is not switched on yet. Run <code>add-share-events.sql</code> in Supabase once.</p>
            )}

            {data && !data.tableMissing && (
                data.total === 0 ? (
                    <p className="text-slate-400 text-sm">No shares recorded in this period yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-3xl font-bold text-white mb-1">{data.total}{data.truncated ? '+' : ''}</p>
                            <p className="text-xs text-slate-500 mb-4">share button clicks</p>
                            <h3 className="text-sm font-medium text-slate-300 mb-2">By content type</h3>
                            <Bars rows={data.byKind} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-300 mb-2">By channel</h3>
                            <Bars rows={data.byChannel} labelFor={(n) => CHANNEL_LABEL[n] || n} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-300 mb-2">Most shared pages</h3>
                            <Bars rows={data.topPaths} />
                        </div>
                    </div>
                )
            )}
            <p className="text-xs text-slate-600 mt-4">Counts button clicks, not completed posts. In your site analytics, visitors from shares carry utm_source (whatsapp, linkedin, twitter...) and utm_campaign=share.</p>
        </div>
    );
}
