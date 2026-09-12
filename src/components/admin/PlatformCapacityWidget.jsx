// src/components/admin/PlatformCapacityWidget.jsx
// NEW (2026-09-11): shows real, current usage against Supabase's
// actual free-tier limits, and surfaces a clear upgrade recommendation
// once any metric crosses 70% - a safe margin before the hard cap,
// not waiting until something actually breaks.
//
// Honest scope note, shown directly to the admin: this measures what's
// genuinely queryable from inside the database (size, storage, active
// users). Vercel's bandwidth/function usage and Supabase's own egress
// bandwidth are platform-level metrics tracked by their own
// infrastructure - not visible here, and still need checking directly
// on each platform's dashboard.

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../lib/authFetch';
import { Database, HardDrive, Users, AlertTriangle, ExternalLink } from 'lucide-react';

const METRIC_ICONS = {
    'Database Size': Database,
    'File Storage': HardDrive,
    'Monthly Active Users': Users
};

function formatBytes(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${bytes} bytes`;
}

export default function PlatformCapacityWidget() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCapacity();
    }, []);

    async function loadCapacity() {
        setLoading(true);
        setError(null);
        try {
            const result = await authenticatedFetch('admin-platform-capacity');
            if (!result.success) throw new Error(result.error);
            setData(result);
        } catch (err) {
            console.error('Failed to load platform capacity:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <p className="text-slate-500 text-sm">Loading platform capacity...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <p className="text-red-400 text-sm">Could not load capacity data: {error}</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Platform Capacity (Supabase Free Tier)</h2>
                <button onClick={loadCapacity} className="text-xs text-slate-400 hover:text-white">Refresh</button>
            </div>

            {data.shouldRecommendUpgrade && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-300 text-sm font-medium">
                            Recommended: upgrade Supabase to Pro
                        </p>
                        <p className="text-amber-400/80 text-xs mt-1">
                            {data.highestMetric} is at {data.highestPercentage}% of the free tier limit — crossing {data.threshold}% is the safe point to upgrade, before you hit the hard cap.
                        </p>
                        <a
                            href="https://supabase.com/dashboard/org/_/billing"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-amber-300 underline mt-2"
                        >
                            Upgrade on Supabase <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {data.metrics.map((metric) => {
                    const Icon = METRIC_ICONS[metric.name] || Database;
                    const barColor = metric.percentage >= 70 ? 'bg-amber-500' : metric.percentage >= 90 ? 'bg-red-500' : 'bg-emerald-500';
                    return (
                        <div key={metric.name}>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-300">{metric.name}</span>
                                </div>
                                <span className="text-xs text-slate-500">
                                    {metric.unit === 'bytes' ? `${formatBytes(metric.used)} / ${formatBytes(metric.limit)}` : `${metric.used.toLocaleString()} / ${metric.limit.toLocaleString()}`}
                                    {' '}({metric.percentage}%)
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${barColor} transition-all`}
                                    style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-slate-600 mt-4 border-t border-slate-800 pt-3">
                {data.note}
            </p>
        </div>
    );
}
