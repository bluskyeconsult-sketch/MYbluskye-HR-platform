// src/pages/admin/AdminExternalJobs.jsx
// COMPLETE ADMIN EXTERNAL JOBS PAGE - With server-side fetch, batch approval, search, and filters
// Includes: RSS fetch, Live server fetch, SQL sync, batch approve, search, filters, and comprehensive error handling

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Briefcase, CheckCircle, XCircle, Eye, RefreshCw, 
    AlertCircle, ExternalLink, Loader2, Clock, MapPin, 
    DollarSign, Building2, Database, Wifi, Download,
    Globe, Zap, Shield, TrendingUp, Trash2, Filter,
    Search
} from 'lucide-react';
import { 
    getPendingExternalJobs, 
    approveExternalJob, 
    rejectExternalJob,
    fetchExternalJobs,
    batchApproveExternalJobs,
    loadJobsFromSQL,
    getExternalJobsStats
} from '../../services/externalJobService';

export default function AdminExternalJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [fetching, setFetching] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingId, setRejectingId] = useState(null);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [fetchResult, setFetchResult] = useState(null);
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [filterSource, setFilterSource] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [serverFetching, setServerFetching] = useState(false);
    const [syncingSQL, setSyncingSQL] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        getUser();
        loadPendingJobs();
        loadStats();
    }, []);

    async function getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    }

    async function loadStats() {
        const statsData = await getExternalJobsStats();
        setStats(statsData);
    }

    async function loadPendingJobs() {
        setLoading(true);
        try {
            const data = await getPendingExternalJobs();
            setJobs(data);
            setFetchResult(null);
            setFetchError(null);
            await loadStats();
        } catch (error) {
            console.error('Error loading pending jobs:', error);
            alert('Error loading pending jobs: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    // Fetch from RSS feeds via service
    async function handleFetchJobs() {
        setFetching(true);
        setFetchResult(null);
        setFetchError(null);
        try {
            const result = await fetchExternalJobs();
            setFetchResult({ success: true, totalAdded: result.totalAdded });
            alert(`✅ Job fetch completed!\nAdded: ${result.totalAdded}\nExisting: ${result.results?.filter(r => r.status === 'exists').length || 0}\nErrors: ${result.results?.filter(r => r.status === 'error').length || 0}`);
            await loadPendingJobs();
        } catch (error) {
            console.error('Fetch error:', error);
            setFetchError(error.message);
            alert('❌ Error fetching jobs: ' + error.message);
        } finally {
            setFetching(false);
        }
    }

    // Fetch from server API endpoint (LIVE) - IMPROVED ERROR HANDLING
    async function handleServerFetch() {
        setServerFetching(true);
        setFetchResult(null);
        setFetchError(null);
        
        try {
            const response = await fetch('/api/fetch-jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const responseText = await response.text();
            console.log('Raw server response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}...`);
            }
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            if (data.success) {
                const addedCount = data.added || data.fetched || data.count || 0;
                setFetchResult({ success: true, totalAdded: addedCount });
                alert(data.message || `✅ Server fetch completed!\nAdded: ${addedCount} new jobs`);
                await loadPendingJobs();
            } else {
                throw new Error(data.error || 'Unknown error from server');
            }
        } catch (error) {
            console.error('Server fetch error:', error);
            setFetchError(error.message);
            alert('❌ Server fetch failed: ' + error.message);
        } finally {
            setServerFetching(false);
        }
    }

    // Sync from SQL - marks existing jobs as approved
    async function handleSyncFromSQL() {
        if (!window.confirm('Sync existing SQL jobs? This will mark any jobs already in your database as approved.')) {
            return;
        }
        
        setSyncingSQL(true);
        setFetchError(null);
        try {
            const result = await loadJobsFromSQL();
            alert(`✅ Sync complete!\nSynced: ${result.count} jobs from database`);
            await loadPendingJobs();
        } catch (error) {
            console.error('Sync error:', error);
            setFetchError(error.message);
            alert('Error syncing: ' + error.message);
        } finally {
            setSyncingSQL(false);
        }
    }

    async function handleApprove(jobId) {
        if (!window.confirm('Approve this job? It will appear on the public job board.')) {
            return;
        }
        
        setProcessingId(jobId);
        try {
            const result = await approveExternalJob(jobId);
            if (result.success) {
                alert('✅ Job approved successfully!');
                await loadPendingJobs();
            }
        } catch (error) {
            console.error('Approve error:', error);
            alert('❌ Error approving job: ' + error.message);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleBatchApprove() {
        if (jobs.length === 0) {
            alert('No pending jobs to approve');
            return;
        }
        
        if (!window.confirm(`Approve ALL ${jobs.length} pending jobs? This cannot be undone.`)) {
            return;
        }
        
        setBatchProcessing(true);
        try {
            const result = await batchApproveExternalJobs();
            alert(`✅ Batch approve complete!\nApproved: ${result.approved}\nFailed: ${result.failed}`);
            await loadPendingJobs();
        } catch (error) {
            console.error('Batch approve error:', error);
            alert('Error in batch approval: ' + error.message);
        } finally {
            setBatchProcessing(false);
        }
    }

    async function handleReject(jobId) {
        if (!rejectReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        
        setRejectingId(jobId);
        try {
            const result = await rejectExternalJob(jobId, rejectReason);
            if (result.success) {
                alert('❌ Job rejected');
                setShowRejectModal(false);
                setRejectReason('');
                setSelectedJob(null);
                await loadPendingJobs();
            }
        } catch (error) {
            console.error('Reject error:', error);
            alert('Error rejecting job: ' + error.message);
        } finally {
            setRejectingId(null);
        }
    }

    function openRejectModal(job) {
        setSelectedJob(job);
        setRejectReason('');
        setShowRejectModal(true);
    }

    function getCountryFlag(countryCode) {
        const flags = {
            GB: '🇬🇧', NG: '🇳🇬', IE: '🇮🇪', CA: '🇨🇦', US: '🇺🇸', 
            DE: '🇩🇪', AU: '🇦🇺', FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹'
        };
        return flags[countryCode] || '🌍';
    }

    function getJobTypeBadge(jobType) {
        const types = {
            full_time: { label: 'Full Time', color: 'bg-emerald-500/20 text-emerald-400' },
            part_time: { label: 'Part Time', color: 'bg-blue-500/20 text-blue-400' },
            remote: { label: 'Remote', color: 'bg-purple-500/20 text-purple-400' },
            contract: { label: 'Contract', color: 'bg-amber-500/20 text-amber-400' },
            freelance: { label: 'Freelance', color: 'bg-pink-500/20 text-pink-400' },
            hybrid: { label: 'Hybrid', color: 'bg-cyan-500/20 text-cyan-400' },
            onsite: { label: 'On-site', color: 'bg-slate-500/20 text-slate-400' }
        };
        const info = types[jobType] || { label: jobType || 'Unknown', color: 'bg-slate-500/20 text-slate-400' };
        return <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>;
    }

    // Filter jobs
    const filteredJobs = jobs.filter(job => {
        const matchesSource = filterSource === 'all' || job.source_name === filterSource;
        const matchesSearch = searchTerm === '' || 
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.source_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSource && matchesSearch;
    });

    // Get unique sources for filter
    const uniqueSources = ['all', ...new Set(jobs.map(job => job.source_name).filter(Boolean))];

    const isLoading = fetching || serverFetching || syncingSQL || batchProcessing;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Loading pending jobs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                            <Briefcase className="w-8 h-8 text-primary-400" />
                            External Jobs Approval
                        </h1>
                        <p className="text-slate-400">
                            Review and approve jobs from authoritative government sources across 7+ countries
                        </p>
                    </div>
                    <div className="flex gap-2 mt-4 sm:mt-0 flex-wrap">
                        {/* RSS Feed Fetch */}
                        <button
                            onClick={handleFetchJobs}
                            disabled={isLoading}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                            title="Fetch from RSS feeds"
                        >
                            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                            {fetching ? 'Fetching...' : 'Fetch RSS'}
                        </button>
                        
                        {/* Live Server Fetch */}
                        <button
                            onClick={handleServerFetch}
                            disabled={isLoading}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            title="Fetch from server API"
                        >
                            {serverFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                            {serverFetching ? 'Fetching...' : '🌐 Fetch Live Jobs'}
                        </button>
                        
                        {/* SQL Sync */}
                        <button
                            onClick={handleSyncFromSQL}
                            disabled={syncingSQL}
                            className="px-4 py-2 bg-primary-600/80 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            title="Sync jobs already in database from SQL scripts"
                        >
                            {syncingSQL ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                            Sync SQL
                        </button>
                        
                        {/* Batch Approve */}
                        <button
                            onClick={handleBatchApprove}
                            disabled={batchProcessing || jobs.length === 0}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {batchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Batch Approve ({jobs.length})
                        </button>
                    </div>
                </div>

                {/* Fetch Result Banner */}
                {fetchResult && fetchResult.success && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                        <p className="text-emerald-400">✅ Fetch completed: {fetchResult.totalAdded} new jobs added</p>
                        <button onClick={() => setFetchResult(null)} className="text-emerald-400 hover:text-emerald-300">
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Fetch Error Banner */}
                {fetchError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                        <p className="text-red-400">❌ Error: {fetchError}</p>
                        <button onClick={() => setFetchError(null)} className="text-red-400 hover:text-red-300">
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Clock className="w-6 h-6 text-amber-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.pending}</div>
                                <div className="text-sm text-slate-400">Pending Approval</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Building2 className="w-6 h-6 text-primary-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">7+</div>
                                <div className="text-sm text-slate-400">Countries</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.approved}</div>
                                <div className="text-sm text-slate-400">Approved</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <XCircle className="w-6 h-6 text-red-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.rejected}</div>
                                <div className="text-sm text-slate-400">Rejected</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search jobs by title, company, or source..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value)}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        >
                            {uniqueSources.map(source => (
                                <option key={source} value={source}>
                                    {source === 'all' ? 'All Sources' : source}
                                </option>
                            ))}
                        </select>
                        {(searchTerm || filterSource !== 'all') && (
                            <button
                                onClick={() => { setSearchTerm(''); setFilterSource('all'); }}
                                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Jobs List */}
                {filteredJobs.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            {jobs.length === 0 ? 'No Pending Jobs' : 'No Matching Jobs'}
                        </h3>
                        <p className="text-slate-400">
                            {jobs.length === 0 
                                ? 'All external jobs have been reviewed.'
                                : `No jobs match "${searchTerm}" or the selected filter.`}
                        </p>
                        <div className="mt-4 flex gap-3 justify-center">
                            <button
                                onClick={handleServerFetch}
                                disabled={isLoading}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                🌐 Fetch Live Jobs
                            </button>
                            <button
                                onClick={handleFetchJobs}
                                disabled={isLoading}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                Fetch RSS Jobs
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredJobs.map((job) => (
                            <div key={job.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="text-2xl">{getCountryFlag(job.source_country)}</span>
                                            <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                                            {getJobTypeBadge(job.job_type)}
                                            {job.sponsorship_eligible && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                                    <Shield className="w-3 h-3" /> Sponsorship Available
                                                </span>
                                            )}
                                        </div>
                                        
                                        <p className="text-primary-400 text-sm mb-2 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {job.company || job.source_name}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location || job.source_country}</span>
                                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.salary_range || 'Competitive'}</span>
                                        </div>
                                        
                                        {job.description && (
                                            <p className="text-slate-400 text-sm line-clamp-2">
                                                {job.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                                            </p>
                                        )}
                                        
                                        <div className="flex items-center gap-4 mt-3">
                                            <span className="text-xs text-slate-500">Source: {job.source_name}</span>
                                            <span className="text-xs text-slate-500">Received: {new Date(job.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-row md:flex-col gap-2">
                                        <button 
                                            onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)} 
                                            className="px-3 py-1.5 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm flex items-center gap-1 transition"
                                        >
                                            <Eye className="w-3 h-3" /> Preview
                                        </button>
                                        <button 
                                            onClick={() => handleApprove(job.id)} 
                                            disabled={processingId === job.id} 
                                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {processingId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                            Approve
                                        </button>
                                        <button 
                                            onClick={() => openRejectModal(job)} 
                                            className="px-3 py-1.5 bg-red-600/70 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                                        >
                                            <XCircle className="w-3 h-3" /> Reject
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Expanded Preview */}
                                {selectedJob?.id === job.id && job.description && (
                                    <div className="mt-4 pt-4 border-t border-slate-800">
                                        <h4 className="text-white font-semibold mb-2">Full Description</h4>
                                        <div className="text-slate-400 text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: job.description }} />
                                        {job.external_apply_url && (
                                            <a 
                                                href={job.external_apply_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1 mt-3 text-primary-400 text-sm hover:underline"
                                            >
                                                <ExternalLink className="w-3 h-3" /> View on source website
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && selectedJob && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                                <h2 className="text-xl font-bold text-white">Reject Job</h2>
                            </div>
                            <p className="text-slate-400 mb-4">Rejecting: <span className="text-white font-medium">{selectedJob.title}</span></p>
                            <textarea 
                                value={rejectReason} 
                                onChange={(e) => setRejectReason(e.target.value)} 
                                placeholder="Reason for rejection (required)..." 
                                rows={3} 
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 mb-4" 
                            />
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => handleReject(selectedJob.id)} 
                                    disabled={rejectingId === selectedJob.id} 
                                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {rejectingId === selectedJob.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} 
                                    Confirm Reject
                                </button>
                                <button 
                                    onClick={() => { setShowRejectModal(false); setSelectedJob(null); setRejectReason(''); }} 
                                    className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
