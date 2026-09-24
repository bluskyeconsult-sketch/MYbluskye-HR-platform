// src/components/GlobalTrendsWidget.jsx
//
// NEW (2026-09-24): genuinely separate from TrendingCorner.jsx (which
// correctly shows real, on-site search/chat activity under the
// honest label "What People Are Searching For") - this shows real,
// external internet trends via the same Google Trends integration
// already proven in the newsletter composer. Neither widget touches
// the other; both exist side by side with honest, distinct labels.

import { useState, useEffect } from 'react';
import { Globe, Search } from 'lucide-react';

export default function GlobalTrendsWidget() {
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTrending();
    }, []);

    async function loadTrending() {
        try {
            const response = await fetch('/api/index?action=external-trending-topics');
            const data = await response.json();
            if (data.success) setTrending(data.trending || []);
        } catch (err) {
            console.warn('Failed to load external trends:', err);
        } finally {
            setLoading(false);
        }
    }

    // Same honest pattern as TrendingCorner.jsx - nothing meaningful
    // to show (the external fetch genuinely failed or returned
    // nothing) means no awkward, empty section forced onto the page.
    if (!loading && trending.length === 0) return null;

    return (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-bold text-white">Trending on the Internet</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">Real, current search trends from around the web right now</p>

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
                            href={`https://www.google.com/search?q=${encodeURIComponent(t.topic)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-sm text-slate-300 hover:text-white transition flex items-center gap-1.5"
                        >
                            <Search className="w-3 h-3 text-slate-500" />
                            {t.topic}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
