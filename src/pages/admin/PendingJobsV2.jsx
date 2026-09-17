// src/pages/admin/PendingJobsV2.jsx
//
// NEW (2026-09-17): a genuinely fresh, standalone path for reviewing
// pending external jobs - deliberately built from scratch, calling
// only the new pending-jobs-v2/approve-job-v2/reject-job-v2 backend
// actions. Shares zero code with ExternalJobsManager.jsx or
// rssJobService.js's existing functions, even though those were
// already confirmed correct - this exists specifically so a new page,
// new route, and new action names rule out (or bypass) any stale
// bundle/cache issue that may be affecting the old path.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Loader2, RefreshCw, Briefcase } from 'lucide-react';

export default function PendingJobsV2() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadPendingJobs();
    }, []);

    async function loadPendingJobs() {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=pending-jobs-v2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                }
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed to load pending jobs');
            setJobs(data.jobs || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(jobId) {
        setProcessingId(jobId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=approve-job-v2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({ jobId })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            setJobs(prev => prev.filter(j => j.id !== jobId));
        } catch (err) {
            alert('Failed to approve: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(jobId) {
        setProcessingId(jobId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=reject-job-v2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({ jobId })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            setJobs(prev => prev.filter(j => j.id !== jobId));
        } catch (err) {
            alert('Failed to reject: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-primary-400" /> Pending Jobs (v2)
                    </h1>
                    <p className="text-slate-400 text-sm">
                        A fresh, standalone path — separate from External Jobs Manager entirely.
                    </p>
                </div>
                <button
                    onClick={loadPendingJobs}
                    disabled={loading}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
            ) : jobs.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <p className="text-slate-400">No pending jobs found via this fresh path either.</p>
                    <p className="text-slate-500 text-sm mt-2">If jobs are genuinely in the database as pending_approval, this confirms the issue is elsewhere (RLS, or the data itself) - not a stale frontend path.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-slate-400 text-sm mb-2">{jobs.length} pending job(s) found</p>
                    {jobs.map(job => (
                        <div key={job.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-white font-medium truncate">{job.title}</p>
                                <p className="text-slate-500 text-sm">{job.company || job.source_name} — {job.source_name}</p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    onClick={() => handleApprove(job.id)}
                                    disabled={processingId === job.id}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition disabled:opacity-50 flex items-center gap-1.5 text-sm"
                                >
                                    {processingId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleReject(job.id)}
                                    disabled={processingId === job.id}
                                    className="px-3 py-1.5 bg-red-600/80 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-1.5 text-sm"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
