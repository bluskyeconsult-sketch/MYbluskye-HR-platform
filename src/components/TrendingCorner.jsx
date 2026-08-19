// src/components/TrendingCorner.jsx
// NEW FILE (2026-08-16) — public-facing "Latest Trend Corner" widget,
// powered by the same trending-topics action feeding the admin
// opportunity-gaps page. Shows real, current search/chat activity, not
// curated or fabricated content.

import { useState, useEffect } from 'react';
import { TrendingUp, MessageCircle } from 'lucide-react';

export default function TrendingCorner() {
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTrending();
    }, []);

    async function loadTrending() {
        try {
            const response = await fetch('/api/index?action=trending-topics&days=7');
            const data = await response.json();
            if (data.success) setTrending(data.trending || []);
        } catch (err) {
            console.warn('Failed to load trending topics:', err);
        } finally {
            setLoading(false);
        }
    }

    // Nothing meaningful to show yet (new platform, or a quiet week) —
    // don't render an empty/awkward section rather than force a widget
    // with no real content.
    if (!loading && trending.length === 0) return null;

    return (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">What People Are Searching For</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">Real, current trends from our community this week</p>

            {loading ? (
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-8 w-24 bg-slate-800 rounded-full animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {trending.map((t, idx) => (
                        <a
                            key={idx}
                            href={`/jobs?search=${encodeURIComponent(t.topic)}`}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-sm text-slate-300 hover:text-white transition flex items-center gap-1.5"
                        >
                            <MessageCircle className="w-3 h-3 text-slate-500" />
                            {t.topic}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
