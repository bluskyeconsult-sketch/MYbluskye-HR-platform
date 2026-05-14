// src/pages/admin/ExternalJobsManager.jsx
// Admin page to manage external jobs fetched from RSS feeds

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { syncExternalJobs } from '../../services/jobFeedService';
import { CheckCircle, XCircle, Eye, RefreshCw, Loader2, Globe, Briefcase, MapPin, Calendar } from 'lucide-react';

export default function ExternalJobsManager() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [syncResult, setSyncResult] = useState(null);

    useEffect(() => {
        loadPendingJobs();
    }, []);

    async function loadPendingJobs() {
        setLoading(true);
        const { data, error } = await supabase
            .from('external_jobs')
            .select('*')
            .eq('status', 'pending_approval')
            .order('created_at', { ascending: false });
        
        if (!error) setJobs(data || []);
        setLoading(false);
    }

    async function handleSync() {
        setSyncing(true);
        setSyncResult(null);
        
        const result = await syncExternalJobs({
            techmapApiKey: import.meta.env.VITE_TECHMAP_API_KEY,
            jobicyRegions: ['usa', 'uk', 'emea', 'apac', 'canada', 'australia']
        });
        
        setSyncResult(result);
        await loadPendingJobs();
        setSyncing(false);
    }

    async function handleApprove(jobId) {
        setProcessingId(jobId);
        
        const { data: externalJob } = await supabase
            .from('external_jobs')
            .select('*')
            .eq('id', jobId)
            .single();
        
        if (externalJob) {
            await supabase
                .from('jobs')
                .insert({
                    title: externalJob.title,
                    company: externalJob.company,
                    location: externalJob.location,
                    description: externalJob.description,
                    salary_range: externalJob.salary_range,
                    salary_min: externalJob.salary_min,
                    salary_max: externalJob.salary_max,
                    country_code: externalJob.country_code,
                    job_type: externalJob.job_type,
                    source_type: 'authoritative',
                    source_name: externalJob.source_name,
                    external_apply_url: externalJob.external_apply_url,
                    compliance_status: 'approved',
                    is_active: true,
                    posted_at: new Date().toISOString()
                });
            
            await supabase
                .from('external_jobs')
                .update({ status: 'approved', approved_at: new Date().toISOString() })
                .eq('id', jobId);
        }
        
        setProcessingId(null);
        loadPendingJobs();
    }

    async function handleReject(jobId) {
        setProcessingId(jobId);
        await supabase
            .from('external_jobs')
            .update({ status: 'rejected' })
            .eq('id', jobId);
        setProcessingId(null);
        loadPendingJobs();
    }

    function getSourceBadge(sourceName) {
        const colors = {
            Himalayas: 'bg-emerald-500/20 text-emerald-400',
            HireWeb3: 'bg-purple-500/20 text-purple-400',
            Jobicy: 'bg-blue-500/20 text-blue-400',
            Techmap: 'bg-amber-500/20 text-amber-400'
        };
        const color = colors[sourceName] || 'bg-slate-500/20 text-slate-400';
        return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{sourceName}</span>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">External Jobs Manager</h1>
                    <p className="text-slate-400">Fetch and approve jobs from RSS feeds (Himalayas, HireWeb3, Jobicy, Techmap)</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {syncing ? 'Syncing...' : 'Fetch New Jobs'}
                </button>
            </div>

            {syncResult && (
                <div className={`mb-4 p-3 rounded-lg ${syncResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <p className={syncResult.success ? 'text-emerald-400' : 'text-red-400'}>
                        {syncResult.success 
                            ? `✅ Sync complete: ${syncResult.inserted} new jobs, ${syncResult.skipped} duplicates`
                            : `❌ Sync failed: ${syncResult.error}`}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Globe className="w-8 h-8 text-primary-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{jobs.length}</div>
                            <div className="text-sm text-slate-400">Pending Approval</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-emerald-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">4</div>
                            <div className="text-sm text-slate-400">Active Sources</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-amber-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">Daily</div>
                            <div className="text-sm text-slate-400">Auto-sync Schedule</div>
                        </div>
                    </div>
                </div>
            </div>

            {jobs.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Pending Jobs</h3>
                    <p className="text-slate-400">Click "Fetch New Jobs" to import external job listings.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {jobs.map((job) => (
                        <div key={job.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                                        {getSourceBadge(job.source_name)}
                                    </div>
                                    <p className="text-primary-400 text-sm mb-2">{job.company}</p>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location || 'Remote'}</span>
                                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.job_type?.replace('_', ' ') || 'Full Time'}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Received: {new Date(job.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-400 text-sm line-clamp-2">{job.description?.substring(0, 200)}...</p>
                                    {job.salary_range && job.salary_range !== 'Competitive' && (
                                        <p className="text-emerald-400 text-sm mt-2">💰 {job.salary_range}</p>
                                    )}
                                </div>
                                <div className="flex flex-row md:flex-col gap-2">
                                    <button
                                        onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                                        className="px-3 py-1.5 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm flex items-center gap-1"
                                    >
                                        <Eye className="w-3 h-3" /> Preview
                                    </button>
                                    <button
                                        onClick={() => handleApprove(job.id)}
                                        disabled={processingId === job.id}
                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition text-sm flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {processingId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(job.id)}
                                        className="px-3 py-1.5 bg-red-600/70 text-white rounded-lg hover:bg-red-600 transition text-sm flex items-center gap-1"
                                    >
                                        <XCircle className="w-3 h-3" /> Reject
                                    </button>
                                </div>
                            </div>
                            {selectedJob?.id === job.id && (
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <h4 className="text-white font-semibold mb-2">Full Description</h4>
                                    <div className="text-slate-400 text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: job.description || 'No description provided.' }} />
                                    {job.external_apply_url && (
                                        <a href={job.external_apply_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-primary-400 text-sm hover:underline">
                                            View original posting →
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
