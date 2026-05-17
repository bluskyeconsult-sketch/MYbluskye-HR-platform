// src/pages/admin/ExternalJobsManager.jsx
// COMPLETE ADMIN UI - Manage jobs from government RSS feeds, Jobicy API, and commercial sources
// Features: Multi-tab views, batch approve, stats dashboard, connection testing, force refresh

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    getPendingExternalJobs, 
    approveExternalJob, 
    rejectExternalJob, 
    batchApproveExternalJobs,
    getExternalJobsStats,
    fetchExternalJobs,
    testRSSConnection
} from '../../services/rssJobService';
import { 
    CheckCircle, 
    XCircle, 
    Eye, 
    RefreshCw, 
    Loader2, 
    Globe, 
    Briefcase, 
    MapPin, 
    Calendar,
    TrendingUp,
    AlertCircle,
    CheckSquare,
    Square,
    Download,
    Wifi,
    Sparkles
} from 'lucide-react';

export default function ExternalJobsManager() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [syncResult, setSyncResult] = useState(null);
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
    const [selectedJobs, setSelectedJobs] = useState(new Set());
    const [activeTab, setActiveTab] = useState('pending');
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [testingConnection, setTestingConnection] = useState(false);

    useEffect(() => {
        loadJobs();
        loadStats();
    }, [activeTab]);

    async function loadJobs() {
        setLoading(true);
        try {
            let data;
            if (activeTab === 'pending') {
                data = await getPendingExternalJobs();
            } else if (activeTab === 'approved') {
                const { data: approved } = await supabase
                    .from('external_jobs')
                    .select('*')
                    .eq('status', 'approved')
                    .order('approved_at', { ascending: false });
                data = approved;
            } else {
                const { data: rejected } = await supabase
                    .from('external_jobs')
                    .select('*')
                    .eq('status', 'rejected')
                    .order('reviewed_at', { ascending: false });
                data = rejected;
            }
            setJobs(data || []);
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadStats() {
        const statsData = await getExternalJobsStats();
        setStats(statsData);
    }

    async function handleSync() {
        setSyncing(true);
        setSyncResult(null);
        
        const result = await fetchExternalJobs(false);
        setSyncResult({ success: true, inserted: result.totalAdded });
        await loadJobs();
        await loadStats();
        setSyncing(false);
    }

    async function handleForceRefresh() {
        if (!confirm('⚠️ WARNING: This will clear ALL pending external jobs and fetch fresh data. Continue?')) return;
        
        setSyncing(true);
        setSyncResult(null);
        
        const result = await fetchExternalJobs(true);
        setSyncResult({ success: true, inserted: result.totalAdded, forceRefresh: true });
        await loadJobs();
        await loadStats();
        setSyncing(false);
    }

    async function handleApprove(jobId) {
        setProcessingId(jobId);
        try {
            await approveExternalJob(jobId);
            await loadJobs();
            await loadStats();
            setSelectedJobs(new Set(Array.from(selectedJobs).filter(id => id !== jobId)));
        } catch (error) {
            console.error('Approve error:', error);
            alert('Failed to approve job: ' + error.message);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(jobId) {
        const reason = prompt('Optional: Enter rejection reason');
        setProcessingId(jobId);
        try {
            await rejectExternalJob(jobId, reason);
            await loadJobs();
            await loadStats();
            setSelectedJobs(new Set(Array.from(selectedJobs).filter(id => id !== jobId)));
        } catch (error) {
            console.error('Reject error:', error);
            alert('Failed to reject job: ' + error.message);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleBatchApprove() {
        if (selectedJobs.size === 0) {
            alert('No jobs selected');
            return;
        }
        
        if (!confirm(`Approve ${selectedJobs.size} job(s)?`)) return;
        
        setProcessingId('batch');
        try {
            const batchResult = await batchApproveExternalJobs();
            alert(`✅ Batch approve complete!\nApproved: ${batchResult.approved}\nFailed: ${batchResult.failed}`);
            setSelectedJobs(new Set());
            await loadJobs();
            await loadStats();
        } catch (error) {
            console.error('Batch approve error:', error);
            alert('Failed to approve some jobs: ' + error.message);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleTestConnections() {
        setTestingConnection(true);
        try {
            const results = await testRSSConnection();
            setConnectionStatus(results);
            const workingCount = results.filter(r => r.ok === true).length;
            alert(`✅ Connection test complete!\n${workingCount}/${results.length} feeds working`);
        } catch (error) {
            console.error('Test error:', error);
            alert('Failed to test connections: ' + error.message);
        } finally {
            setTestingConnection(false);
        }
    }

    function toggleSelectAll() {
        if (selectedJobs.size === jobs.length) {
            setSelectedJobs(new Set());
        } else {
            setSelectedJobs(new Set(jobs.map(job => job.id)));
        }
    }

    function toggleSelectJob(jobId) {
        const newSet = new Set(selectedJobs);
        if (newSet.has(jobId)) {
            newSet.delete(jobId);
        } else {
            newSet.add(jobId);
        }
        setSelectedJobs(newSet);
    }

    function getSourceBadge(sourceName) {
        const colors = {
            'UK Civil Service Jobs': 'bg-blue-500/20 text-blue-400',
            'NHS Jobs': 'bg-emerald-500/20 text-emerald-400',
            'Find a Job - UK Government': 'bg-cyan-500/20 text-cyan-400',
            'Public Jobs Ireland': 'bg-green-500/20 text-green-400',
            'GC Jobs Canada': 'bg-red-500/20 text-red-400',
            'APS Jobs Australia': 'bg-yellow-500/20 text-yellow-400',
            'USAJobs': 'bg-indigo-500/20 text-indigo-400',
            'Bund.de': 'bg-amber-500/20 text-amber-400',
            'Jobicy': 'bg-purple-500/20 text-purple-400',
            'Remote OK': 'bg-slate-500/20 text-slate-400',
            'HireWeb3': 'bg-fuchsia-500/20 text-fuchsia-400',
            'We Work Remotely': 'bg-pink-500/20 text-pink-400',
            'Stack Overflow': 'bg-orange-500/20 text-orange-400',
            'Zapier': 'bg-teal-500/20 text-teal-400'
        };
        const matchedKey = Object.keys(colors).find(key => sourceName?.includes(key));
        const color = matchedKey ? colors[matchedKey] : 'bg-slate-500/20 text-slate-400';
        return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{sourceName}</span>;
    }

    function getJobTypeBadge(jobType) {
        const types = {
            remote: 'bg-purple-500/20 text-purple-400',
            full_time: 'bg-blue-500/20 text-blue-400',
            part_time: 'bg-yellow-500/20 text-yellow-400',
            contract: 'bg-orange-500/20 text-orange-400',
            freelance: 'bg-pink-500/20 text-pink-400',
            hybrid: 'bg-cyan-500/20 text-cyan-400'
        };
        const color = types[jobType] || 'bg-slate-500/20 text-slate-400';
        const label = jobType?.replace('_', ' ') || 'Full Time';
        return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
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
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">External Jobs Manager</h1>
                    <p className="text-slate-400">Manage jobs from government RSS feeds, Jobicy API, and commercial sources</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={handleTestConnections}
                        disabled={testingConnection}
                        className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 flex items-center gap-2 text-sm transition"
                    >
                        {testingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                        Test Feeds
                    </button>
                    <button
                        onClick={handleForceRefresh}
                        disabled={syncing}
                        className="px-3 py-2 bg-yellow-600/30 text-yellow-400 rounded-lg hover:bg-yellow-600/50 flex items-center gap-2 text-sm transition"
                    >
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Force Refresh
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 transition"
                    >
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {syncing ? 'Syncing...' : 'Fetch New Jobs'}
                    </button>
                </div>
            </div>

            {/* Sync Result */}
            {syncResult && (
                <div className={`mb-4 p-3 rounded-lg ${syncResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <p className={syncResult.success ? 'text-emerald-400' : 'text-red-400'}>
                        {syncResult.success 
                            ? `✅ Sync complete: ${syncResult.inserted} new jobs added${syncResult.forceRefresh ? ' (force refresh)' : ''}`
                            : `❌ Sync failed: ${syncResult.error}`}
                    </p>
                </div>
            )}

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div 
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-primary-500/50 transition" 
                    onClick={() => setActiveTab('pending')}
                >
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-yellow-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{stats.pending}</div>
                            <div className="text-sm text-slate-400">Pending Approval</div>
                        </div>
                    </div>
                </div>
                <div 
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-primary-500/50 transition" 
                    onClick={() => setActiveTab('approved')}
                >
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{stats.approved}</div>
                            <div className="text-sm text-slate-400">Approved</div>
                        </div>
                    </div>
                </div>
                <div 
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-primary-500/50 transition" 
                    onClick={() => setActiveTab('rejected')}
                >
                    <div className="flex items-center gap-3">
                        <XCircle className="w-8 h-8 text-red-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{stats.rejected}</div>
                            <div className="text-sm text-slate-400">Rejected</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-primary-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">17</div>
                            <div className="text-sm text-slate-400">Active RSS Feeds</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'pending' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                >
                    Pending ({stats.pending})
                </button>
                <button
                    onClick={() => setActiveTab('approved')}
                    className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'approved' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                >
                    Approved ({stats.approved})
                </button>
                <button
                    onClick={() => setActiveTab('rejected')}
                    className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'rejected' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                >
                    Rejected ({stats.rejected})
                </button>
            </div>

            {/* Batch Actions (Pending only) */}
            {activeTab === 'pending' && jobs.length > 0 && (
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={toggleSelectAll}
                        className="px-3 py-1.5 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm flex items-center gap-1 transition"
                    >
                        {selectedJobs.size === jobs.length ? <Square className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
                        {selectedJobs.size === jobs.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                        onClick={handleBatchApprove}
                        disabled={selectedJobs.size === 0 || processingId === 'batch'}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                        {processingId === 'batch' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Approve Selected ({selectedJobs.size})
                    </button>
                </div>
            )}

            {/* Jobs List */}
            {jobs.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    {activeTab === 'pending' ? (
                        <>
                            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No Pending Jobs</h3>
                            <p className="text-slate-400">Click "Fetch New Jobs" to import external job listings from 17+ RSS feeds.</p>
                        </>
                    ) : (
                        <>
                            <Globe className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No {activeTab} Jobs</h3>
                            <p className="text-slate-400">Jobs you {activeTab} will appear here.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {jobs.map((job) => (
                        <div 
                            key={job.id} 
                            className={`bg-slate-900/50 border rounded-xl p-5 transition ${selectedJobs.has(job.id) ? 'border-primary-500 bg-primary-500/5' : 'border-slate-800 hover:border-primary-500/30'}`}
                        >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        {activeTab === 'pending' && (
                                            <button
                                                onClick={() => toggleSelectJob(job.id)}
                                                className="p-1 hover:bg-slate-800 rounded transition"
                                            >
                                                {selectedJobs.has(job.id) ? <CheckSquare className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                                            </button>
                                        )}
                                        <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                                        {getSourceBadge(job.source_name)}
                                        {getJobTypeBadge(job.job_type)}
                                        {job.sponsorship_eligible && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" /> Sponsorship Available
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-primary-400 text-sm mb-2">{job.company}</p>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location || job.source_country || 'Remote'}</span>
                                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.job_type?.replace('_', ' ') || 'Full Time'}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(job.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-400 text-sm line-clamp-2">{job.description?.substring(0, 200)}...</p>
                                    {job.salary_range && job.salary_range !== 'Competitive' && (
                                        <p className="text-emerald-400 text-sm mt-2">💰 {job.salary_range}</p>
                                    )}
                                </div>
                                <div className="flex flex-row md:flex-col gap-2">
                                    <button
                                        onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                                        className="px-3 py-1.5 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm flex items-center gap-1 transition"
                                    >
                                        <Eye className="w-3 h-3" /> Preview
                                    </button>
                                    {activeTab === 'pending' && (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* Expanded Preview */}
                            {selectedJob?.id === job.id && (
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <h4 className="text-white font-semibold mb-2">Full Description</h4>
                                    <div className="text-slate-400 text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: job.description || 'No description provided.' }} />
                                    {job.rejection_reason && (
                                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <p className="text-red-400 text-sm"><strong>Rejection Reason:</strong> {job.rejection_reason}</p>
                                        </div>
                                    )}
                                    {job.external_apply_url && (
                                        <a 
                                            href={job.external_apply_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center gap-1 mt-3 text-primary-400 text-sm hover:underline"
                                        >
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
