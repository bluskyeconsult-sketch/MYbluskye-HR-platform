// src/pages/admin/AdminExternalJobs.jsx
// ULTIMATE OPTIMIZED VERSION - All features, modular, performant

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Briefcase, CheckCircle, XCircle, Eye, 
    AlertCircle, ExternalLink, Loader2, Clock, MapPin, 
    DollarSign, Building2, Database, Wifi,
    Globe, Shield, Search, RefreshCw
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

// ============ CONSTANTS ============
const COUNTRY_FLAGS = {
    GB: '🇬🇧', NG: '🇳🇬', IE: '🇮🇪', CA: '🇨🇦', 
    US: '🇺🇸', DE: '🇩🇪', AU: '🇦🇺', FR: '🇫🇷', 
    ES: '🇪🇸', IT: '🇮🇹'
};

const JOB_TYPE_STYLES = {
    full_time: { label: 'Full Time', color: 'bg-emerald-500/20 text-emerald-400' },
    part_time: { label: 'Part Time', color: 'bg-blue-500/20 text-blue-400' },
    remote: { label: 'Remote', color: 'bg-purple-500/20 text-purple-400' },
    contract: { label: 'Contract', color: 'bg-amber-500/20 text-amber-400' },
    freelance: { label: 'Freelance', color: 'bg-pink-500/20 text-pink-400' },
    hybrid: { label: 'Hybrid', color: 'bg-cyan-500/20 text-cyan-400' },
    onsite: { label: 'On-site', color: 'bg-slate-500/20 text-slate-400' }
};

// ============ MAIN COMPONENT ============
export default function AdminExternalJobs() {
    // State
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [fetching, setFetching] = useState({ rss: false, server: false, sql: false, batch: false });
    const [selectedJob, setSelectedJob] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingId, setRejectingId] = useState(null);
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [filterSource, setFilterSource] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState(null);

    // Computed values
    const isProcessing = useMemo(() => 
        Object.values(fetching).some(Boolean) || processingId || rejectingId,
        [fetching, processingId, rejectingId]
    );

    const uniqueSources = useMemo(() => 
        ['all', ...new Set(jobs.map(job => job.source_name).filter(Boolean))],
        [jobs]
    );

    const filteredJobs = useMemo(() => 
        jobs.filter(job => {
            const matchesSource = filterSource === 'all' || job.source_name === filterSource;
            const matchesSearch = !searchTerm || 
                job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                job.source_name?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSource && matchesSearch;
        }),
        [jobs, filterSource, searchTerm]
    );

    // ============ EFFECTS ============
    useEffect(() => {
        loadInitialData();
    }, []);

    // ============ DATA LOADING ============
    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([loadPendingJobs(), loadStats()]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPendingJobs = useCallback(async () => {
        try {
            const data = await getPendingExternalJobs();
            setJobs(data);
        } catch (error) {
            showNotification('error', `Error loading jobs: ${error.message}`);
        }
    }, []);

    const loadStats = useCallback(async () => {
        try {
            const statsData = await getExternalJobsStats();
            setStats(statsData);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }, []);

    // ============ NOTIFICATION ============
    const showNotification = useCallback((type, message, autoHide = true) => {
        setNotification({ type, message });
        if (autoHide) setTimeout(() => setNotification(null), 5000);
    }, []);

    // ============ FETCH HANDLERS ============
    const fetchWithHandler = useCallback(async (fetchFn, fetchType, successMessage) => {
        setFetching(prev => ({ ...prev, [fetchType]: true }));
        try {
            const result = await fetchFn();
            showNotification('success', successMessage(result));
            await Promise.all([loadPendingJobs(), loadStats()]);
            return result;
        } catch (error) {
            showNotification('error', `Failed: ${error.message}`);
            throw error;
        } finally {
            setFetching(prev => ({ ...prev, [fetchType]: false }));
        }
    }, [loadPendingJobs, loadStats, showNotification]);

    const handleRSSFetch = useCallback(() => 
        fetchWithHandler(
            fetchExternalJobs,
            'rss',
            (result) => `✅ RSS fetch complete! Added ${result.totalAdded} new jobs`
        ), [fetchWithHandler]);

    const handleServerFetch = useCallback(() => 
        fetchWithHandler(
            async () => {
                const response = await fetch('/api/fetch-jobs', { method: 'POST' });
                if (!response.ok) throw new Error(await response.text());
                return response.json();
            },
            'server',
            (data) => `✅ Server fetch complete! Received ${data.jobs?.length || 0} jobs`
        ), [fetchWithHandler]);

    const handleSQLSync = useCallback(() => 
        fetchWithHandler(
            loadJobsFromSQL,
            'sql',
            (result) => `✅ SQL sync complete! Synced ${result.count} jobs`
        ), [fetchWithHandler]);

    // ============ JOB ACTIONS ============
    const handleApprove = useCallback(async (jobId) => {
        if (!confirm('Approve this job? It will appear on the public job board.')) return;
        
        setProcessingId(jobId);
        try {
            await approveExternalJob(jobId);
            showNotification('success', 'Job approved successfully!');
            await Promise.all([loadPendingJobs(), loadStats()]);
        } catch (error) {
            showNotification('error', `Error approving job: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    }, [loadPendingJobs, loadStats, showNotification]);

    const handleBatchApprove = useCallback(async () => {
        if (jobs.length === 0) {
            showNotification('warning', 'No pending jobs to approve');
            return;
        }
        
        if (!confirm(`Approve ALL ${jobs.length} pending jobs? This cannot be undone.`)) return;
        
        setFetching(prev => ({ ...prev, batch: true }));
        try {
            const result = await batchApproveExternalJobs();
            showNotification('success', `✅ Batch approve complete! Approved: ${result.approved}, Failed: ${result.failed}`);
            await Promise.all([loadPendingJobs(), loadStats()]);
        } catch (error) {
            showNotification('error', `Batch approval failed: ${error.message}`);
        } finally {
            setFetching(prev => ({ ...prev, batch: false }));
        }
    }, [jobs.length, loadPendingJobs, loadStats, showNotification]);

    const handleReject = useCallback(async (jobId) => {
        if (!rejectReason.trim()) {
            showNotification('warning', 'Please provide a reason for rejection');
            return;
        }
        
        setRejectingId(jobId);
        try {
            await rejectExternalJob(jobId, rejectReason);
            showNotification('success', 'Job rejected');
            setShowRejectModal(false);
            setRejectReason('');
            setSelectedJob(null);
            await Promise.all([loadPendingJobs(), loadStats()]);
        } catch (error) {
            showNotification('error', `Error rejecting job: ${error.message}`);
        } finally {
            setRejectingId(null);
        }
    }, [rejectReason, loadPendingJobs, loadStats, showNotification]);

    // ============ UI HELPERS ============
    const getCountryFlag = useCallback((countryCode) => COUNTRY_FLAGS[countryCode] || '🌍', []);
    
    const getJobTypeBadge = useCallback((jobType) => {
        const info = JOB_TYPE_STYLES[jobType] || { label: jobType || 'Unknown', color: 'bg-slate-500/20 text-slate-400' };
        return <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>;
    }, []);

    const clearFilters = useCallback(() => {
        setSearchTerm('');
        setFilterSource('all');
    }, []);

    // ============ LOADING STATE ============
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    // ============ RENDER ============
    return (
        <div className="min-h-screen bg-slate-950 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Notification */}
                {notification && (
                    <NotificationBanner 
                        notification={notification} 
                        onDismiss={() => setNotification(null)} 
                    />
                )}

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
                    <HeaderTitle />
                    <ActionButtons
                        fetching={fetching}
                        jobsCount={jobs.length}
                        onServerFetch={handleServerFetch}
                        onRSSFetch={handleRSSFetch}
                        onSQLSync={handleSQLSync}
                        onBatchApprove={handleBatchApprove}
                    />
                </div>

                {/* Stats */}
                <StatsCards stats={stats} />

                {/* Search & Filter */}
                <SearchFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterSource={filterSource}
                    onFilterChange={setFilterSource}
                    sources={uniqueSources}
                    onClear={clearFilters}
                    hasActiveFilters={searchTerm !== '' || filterSource !== 'all'}
                />

                {/* Jobs List or Empty State */}
                {filteredJobs.length === 0 ? (
                    <EmptyState 
                        hasJobs={jobs.length > 0}
                        onFetch={handleServerFetch}
                        isProcessing={isProcessing}
                    />
                ) : (
                    <JobsList
                        jobs={filteredJobs}
                        selectedJobId={selectedJob?.id}
                        processingId={processingId}
                        onToggleExpand={(job) => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                        onApprove={handleApprove}
                        onReject={(job) => {
                            setSelectedJob(job);
                            setShowRejectModal(true);
                        }}
                        getCountryFlag={getCountryFlag}
                        getJobTypeBadge={getJobTypeBadge}
                    />
                )}

                {/* Reject Modal */}
                {showRejectModal && selectedJob && (
                    <RejectModal
                        job={selectedJob}
                        rejectReason={rejectReason}
                        onReasonChange={setRejectReason}
                        onConfirm={() => handleReject(selectedJob.id)}
                        onCancel={() => {
                            setShowRejectModal(false);
                            setSelectedJob(null);
                            setRejectReason('');
                        }}
                        isProcessing={rejectingId === selectedJob.id}
                    />
                )}
            </div>
        </div>
    );
}

// ============ SUB-COMPONENTS ============

const NotificationBanner = ({ notification, onDismiss }) => {
    const styles = {
        error: 'bg-red-500/10 border-red-500/20 text-red-400',
        success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    };
    
    return (
        <div className={`mb-6 p-4 rounded-lg flex items-center justify-between border ${styles[notification.type]}`}>
            <p>{notification.message}</p>
            <button onClick={onDismiss}>
                <XCircle className="w-4 h-4" />
            </button>
        </div>
    );
};

const HeaderTitle = () => (
    <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-primary-400" />
            External Jobs Approval
        </h1>
        <p className="text-slate-400">
            Review and approve jobs from authoritative government sources across 7+ countries
        </p>
    </div>
);

const ActionButtons = ({ fetching, jobsCount, onServerFetch, onRSSFetch, onSQLSync, onBatchApprove }) => (
    <div className="flex flex-wrap gap-2">
        <ActionButton
            onClick={onServerFetch}
            loading={fetching.server}
            icon={<Globe className="w-4 h-4" />}
            color="emerald"
        >
            🌐 Fetch Live
        </ActionButton>
        
        <ActionButton
            onClick={onRSSFetch}
            loading={fetching.rss}
            icon={<Wifi className="w-4 h-4" />}
            color="slate"
        >
            Fetch RSS
        </ActionButton>
        
        <ActionButton
            onClick={onSQLSync}
            loading={fetching.sql}
            icon={<Database className="w-4 h-4" />}
            color="primary"
        >
            Sync SQL
        </ActionButton>
        
        <ActionButton
            onClick={onBatchApprove}
            loading={fetching.batch}
            disabled={jobsCount === 0}
            icon={<CheckCircle className="w-4 h-4" />}
            color="emerald"
        >
            Batch ({jobsCount})
        </ActionButton>
    </div>
);

const ActionButton = ({ onClick, loading, disabled, icon, color, children }) => {
    const colors = {
        emerald: 'bg-emerald-600 hover:bg-emerald-700',
        slate: 'bg-slate-700 hover:bg-slate-600',
        primary: 'bg-primary-600/80 hover:bg-primary-700'
    };
    
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${colors[color]}`}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
            {children}
        </button>
    );
};

const StatsCards = ({ stats }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Clock} iconColor="amber" value={stats.pending} label="Pending Approval" />
        <StatCard icon={Building2} iconColor="primary" value="7+" label="Countries" />
        <StatCard icon={CheckCircle} iconColor="emerald" value={stats.approved} label="Approved" />
        <StatCard icon={XCircle} iconColor="red" value={stats.rejected} label="Rejected" />
    </div>
);

const StatCard = ({ icon: Icon, iconColor, value, label }) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 text-${iconColor}-400`} />
            <div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-sm text-slate-400">{label}</div>
            </div>
        </div>
    </div>
);

const SearchFilterBar = ({ searchTerm, onSearchChange, filterSource, onFilterChange, sources, onClear, hasActiveFilters }) => (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
                type="text"
                placeholder="Search jobs by title, company, or source..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
        </div>
        
        <select
            value={filterSource}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
        >
            {sources.map(source => (
                <option key={source} value={source}>
                    {source === 'all' ? 'All Sources' : source}
                </option>
            ))}
        </select>
        
        {hasActiveFilters && (
            <button
                onClick={onClear}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
            >
                Clear Filters
            </button>
        )}
    </div>
);

const EmptyState = ({ hasJobs, onFetch, isProcessing }) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
            {hasJobs ? 'No Matching Jobs' : 'No Pending Jobs'}
        </h3>
        <p className="text-slate-400">
            {hasJobs 
                ? 'No jobs match your search criteria.'
                : 'All external jobs have been reviewed.'}
        </p>
        {!hasJobs && (
            <button
                onClick={onFetch}
                disabled={isProcessing}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Fetch New Jobs
            </button>
        )}
    </div>
);

const JobsList = ({ jobs, selectedJobId, processingId, onToggleExpand, onApprove, onReject, getCountryFlag, getJobTypeBadge }) => (
    <div className="space-y-4">
        {jobs.map(job => (
            <JobCard
                key={job.id}
                job={job}
                isExpanded={selectedJobId === job.id}
                isProcessing={processingId === job.id}
                onToggleExpand={() => onToggleExpand(job)}
                onApprove={() => onApprove(job.id)}
                onReject={() => onReject(job)}
                getCountryFlag={getCountryFlag}
                getJobTypeBadge={getJobTypeBadge}
            />
        ))}
    </div>
);

const JobCard = ({ job, isExpanded, isProcessing, onToggleExpand, onApprove, onReject, getCountryFlag, getJobTypeBadge }) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all">
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
                    <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {job.location || job.source_country}
                    </span>
                    <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> {job.salary_range || 'Competitive'}
                    </span>
                </div>
                
                {job.description && (
                    <p className="text-slate-400 text-sm line-clamp-2">
                        {job.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                    </p>
                )}
                
                <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-slate-500">Source: {job.source_name}</span>
                    <span className="text-xs text-slate-500">
                        Received: {new Date(job.created_at).toLocaleDateString()}
                    </span>
                </div>
            </div>
            
            <div className="flex flex-row md:flex-col gap-2">
                <button 
                    onClick={onToggleExpand} 
                    className="px-3 py-1.5 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm flex items-center gap-1 transition"
                >
                    <Eye className="w-3 h-3" /> Preview
                </button>
                <button 
                    onClick={onApprove} 
                    disabled={isProcessing} 
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Approve
                </button>
                <button 
                    onClick={onReject} 
                    className="px-3 py-1.5 bg-red-600/70 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                >
                    <XCircle className="w-3 h-3" /> Reject
                </button>
            </div>
        </div>
        
        {isExpanded && job.description && (
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
);

const RejectModal = ({ job, rejectReason, onReasonChange, onConfirm, onCancel, isProcessing }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <h2 className="text-xl font-bold text-white">Reject Job</h2>
            </div>
            <p className="text-slate-400 mb-4">
                Rejecting: <span className="text-white font-medium">{job.title}</span>
            </p>
            <textarea 
                value={rejectReason} 
                onChange={(e) => onReasonChange(e.target.value)} 
                placeholder="Reason for rejection (required)..." 
                rows={3} 
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 mb-4" 
            />
            <div className="flex gap-3">
                <button 
                    onClick={onConfirm} 
                    disabled={isProcessing} 
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} 
                    Confirm Reject
                </button>
                <button 
                    onClick={onCancel} 
                    className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
);
