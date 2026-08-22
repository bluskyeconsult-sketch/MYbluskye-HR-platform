// src/components/ExternalJobs.jsx
//
// FIXED (2026-08-21):
// 1. Imported supabase from '../config/supabase' — a path that doesn't
//    exist anywhere else in this project (the real shared client lives at
//    src/lib/supabase.js, one folder shallower than src/pages/admin/ files
//    that import it as '../../lib/supabase' — this file sits directly
//    under src/components/, so the correct relative path here is
//    '../lib/supabase'). Fixed to the correct path.
// 2. Used plain semantic CSS class names ("external-jobs-loading",
//    "job-card", "spinner", etc.) instead of Tailwind utility classes —
//    every other file in this project, without exception, uses Tailwind,
//    and there's no evidence anywhere of a matching stylesheet for these
//    class names. This would have rendered completely unstyled in
//    production. Rewrote with Tailwind, matching the dark theme and layout
//    conventions used everywhere else (including a responsive grid) — same
//    treatment already applied to this component's admin-page counterpart,
//    src/pages/admin/ExternalJobs.jsx.
// 3. Read job.external_url only — the admin approval tool for this same
//    table (ExternalJobsManager.jsx) reads job.external_apply_url instead.
//    The real column name isn't confirmed from this file alone, so this
//    now checks both rather than guessing which one is correct — same fix
//    already applied to the admin-page counterpart.

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle, Briefcase, MapPin, ExternalLink, RefreshCw } from 'lucide-react';

export default function ExternalJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('approved');
    const hasFetchedRef = useRef(false);

    useEffect(() => {
        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchJobs();
        } else {
            fetchJobs();
        }
    }, [filter]);

    async function fetchJobs() {
        try {
            setLoading(true);
            setError(null);

            const { data, error: supabaseError } = await supabase
                .from('external_jobs')
                .select('*')
                .eq('status', filter)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (supabaseError) throw supabaseError;

            setJobs(data || []);
        } catch (err) {
            console.error('Error fetching external jobs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                <p className="text-slate-400 text-sm">Loading opportunities...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-slate-300">Unable to load jobs: {error}</p>
                <button
                    onClick={fetchJobs}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" /> Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex gap-2 mb-6 border-b border-slate-800">
                <button
                    onClick={() => setFilter('approved')}
                    className={`px-4 py-2 text-sm font-medium transition ${
                        filter === 'approved'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Approved Jobs
                </button>
                <button
                    onClick={() => setFilter('pending_approval')}
                    className={`px-4 py-2 text-sm font-medium transition ${
                        filter === 'pending_approval'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Pending Review
                </button>
            </div>

            {jobs.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No {filter.replace('_', ' ')} jobs found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobs.map(job => (
                        <div key={job.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition">
                            <h3 className="text-white font-semibold mb-1">{job.title}</h3>
                            <p className="text-primary-400 text-sm mb-1">{job.company}</p>
                            <p className="text-slate-400 text-sm flex items-center gap-1 mb-3">
                                <MapPin className="w-3 h-3" /> {job.location || 'Remote'}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {job.job_type && (
                                    <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-300">
                                        {job.job_type.replace('_', ' ')}
                                    </span>
                                )}
                                {job.source_name && (
                                    <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-500">
                                        {job.source_name}
                                    </span>
                                )}
                            </div>
                            <a
                                href={job.external_apply_url || job.external_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-400 text-sm hover:underline flex items-center gap-1"
                            >
                                View Opportunity <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
