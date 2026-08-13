// src/pages/admin/ExternalJobsManager.jsx
// PROFESSIONAL ADMIN UI - Manage jobs from government RSS feeds, Jobicy API, and commercial sources
//
// FIXED (2026-08-07):
// 1. handleFetchRSSJobs() called ?action=jobs — a real, confirmed handler,
//    but one that only fetches and returns job listings; it never inserts
//    anything into external_jobs. Since that handler genuinely returns
//    {success: true}, the button showed "✅ Added 0 new jobs" — a
//    true-looking success message for an action that changed nothing.
//    handleExternalFetch()/handleSyncJobs() called external-jobs-fetch/
//    jobs-sync, neither of which exist at all (these at least correctly
//    showed an error). All three now call the proven-working
//    fetchExternalJobs() service function directly — the same one already
//    used correctly by Force Refresh — instead of three different broken
//    API paths. Removed the now-redundant handleDirectFetch and unused
//    API_ACTIONS/API_BASE constants.
// 2. handleBatchApprove() referenced the checkbox selection in its confirm
//    dialog ("Approve N job(s)?") but called batchApproveExternalJobs()
//    with no arguments — the selected ids were collected but never passed.
//    Now passes Array.from(selectedJobs). NOTE: this assumes
//    batchApproveExternalJobs() accepts an id array — worth confirming
//    against the real rssJobService.js signature.
// 3. The job preview used dangerouslySetInnerHTML on job.description, which
//    comes from external RSS feeds and third-party APIs you don't control
//    — a real XSS risk on an admin page. Now renders as plain text.

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
    Wifi,
    Sparkles,
    Settings,
    Rss,
    Search,
    Download,
    X
} from 'lucide-react';

// ============================================
// RSS FEED SOURCES CONFIGURATION (informational display only —
// the actual sources fetched are whatever rssJobService.js implements)
// ============================================

const RSS_FEEDS = [
    { name: 'UK Civil Service Jobs', url: 'https://www.civilservicejobs.service.gov.uk/feeds/jobs.xml', country: 'UK', active: true },
    { name: 'NHS Jobs', url: 'https://www.jobs.nhs.uk/feeds/jobs.xml', country: 'UK', active: true },
    { name: 'Find a Job - UK Government', url: 'https://www.findajob.dwp.gov.uk/feeds/jobs.xml', country: 'UK', active: true },
    { name: 'Public Jobs Ireland', url: 'https://www.publicjobs.ie/feeds/jobs.xml', country: 'Ireland', active: true },
    { name: 'GC Jobs Canada', url: 'https://www.jobs-emplois.gc.ca/feeds/jobs.xml', country: 'Canada', active: true },
    { name: 'APS Jobs Australia', url: 'https://www.apsjobs.gov.au/feeds/jobs.xml', country: 'Australia', active: true },
    { name: 'USAJobs', url: 'https://www.usajobs.gov/feeds/jobs.xml', country: 'USA', active: true },
    { name: 'Bund.de', url: 'https://www.bund.de/feeds/jobs.xml', country: 'Germany', active: true },
    { name: 'Jobicy', url: 'https://jobicy.com/api/v2/remote-jobs', country: 'Global', active: true, isApi: true },
    { name: 'Remote OK', url: 'https://remoteok.com/api', country: 'Global', active: true, isApi: true },
    { name: 'We Work Remotely', url: 'https://weworkremotely.com/feed.xml', country: 'Global', active: true },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com/jobs/feed', country: 'Global', active: true },
    { name: 'Zapier', url: 'https://zapier.com/feeds/jobs.xml', country: 'Global', active: true }
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ExternalJobsManager() {
    // State Management
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
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
    const [showSettings, setShowSettings] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');

    useEffect(() => {
        loadJobs();
        loadStats();
    }, [activeTab]);

    useEffect(() => {
        filterJobs();
    }, [jobs, searchTerm, sourceFilter]);

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
            } else if (activeTab === 'rejected') {
                const { data: rejected } = await supabase
                    .from('external_jobs')
                    .select('*')
                    .eq('status', 'rejected')
                    .order('reviewed_at', { ascending: false });
                data = rejected;
            } else {
                const { data: all } = await supabase
                    .from('external_jobs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(200);
                data = all;
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

    function filterJobs() {
        let filtered = [...jobs];
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(job => 
                job.title?.toLowerCase().includes(term) ||
                job.company?.toLowerCase().includes(term) ||
                job.source_name?.toLowerCase().includes(term) ||
                job.location?.toLowerCase().includes(term)
            );
        }
        
        if (sourceFilter !== 'all') {
            filtered = filtered.filter(job => job.source_name === sourceFilter);
        }
        
        setFilteredJobs(filtered);
    }

    // FIXED: all three fetch/sync buttons now call the one real, proven
    // fetchExternalJobs() service function instead of three different
    // broken/nonexistent API paths (see file header for details).
    async function handleFetchRSSJobs() {
        setSyncing(true);
        setSyncResult(null);
        
        try {
            const result = await fetchExternalJobs(false);
            setSyncResult({ success: true, inserted: result.totalAdded, message: `Added ${result.totalAdded} new jobs` });
            await loadJobs();
            await loadStats();
        } catch (error) {
            console.error('Fetch RSS error:', error);
            setSyncResult({ success: false, error: error.message });
        } finally {
            setSyncing(false);
        }
    }

    async function handleSyncJobs() {
        setSyncing(true);
        setSyncResult(null);
        
        try {
            const result = await fetchExternalJobs(false);
            setSyncResult({ success: true, inserted: result.totalAdded, message: `Synced ${result.totalAdded} jobs` });
            await loadJobs();
            await loadStats();
        } catch (error) {
            console.error('Sync error:', error);
            setSyncResult({ success: false, error: error.message });
        } finally {
            setSyncing(false);
        }
    }

    async function handleExternalFetch() {
        setSyncing(true);
        setSyncResult(null);
        
        try {
            const result = await fetchExternalJobs(false);
            setSyncResult({ success: true, inserted: result.totalAdded, message: `Added ${result.totalAdded} external jobs` });
            await loadJobs();
            await loadStats();
        } catch (error) {
            console.error('External fetch error:', error);
            setSyncResult({ success: false, error: error.message });
        } finally {
            setSyncing(false);
        }
    }

    async function handleForceRefresh() {
        if (!confirm('⚠️ WARNING: This will clear ALL pending external jobs and fetch fresh data. Continue?')) return;
        
        setSyncing(true);
        setSyncResult(null);
        
        try {
            const result = await fetchExternalJobs(true);
            setSyncResult({ success: true, inserted: result.totalAdded, forceRefresh: true, message: `Force refresh complete. Added ${result.totalAdded} jobs.` });
            await loadJobs();
            await loadStats();
        } catch (error) {
            setSyncResult({ success: false, error: error.message });
        } finally {
            setSyncing(false);
        }
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
            await rejectExternalJob(jobId, reason || undefined);
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

    // FIXED: now passes the actual selected job ids — previously called with
    // no arguments despite the confirm dialog referencing a specific count.
    async function handleBatchApprove() {
        if (selectedJobs.size === 0) {
            alert('No jobs selected');
            return;
        }
        
        if (!confirm(`Approve ${selectedJobs.size} job(s)?`)) return;
        
        setProcessingId('batch');
        try {
            const batchResult = await batchApproveExternalJobs(Array.from(selectedJobs));
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
        if (selectedJobs.size === filteredJobs.length) {
            setSelectedJobs(new Set());
        } else {
            setSelectedJobs(new Set(filteredJobs.map(job => job.id)));
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

    function exportJobs() {
        const exportData = filteredJobs.map(job => ({
            title: job.title,
            company: job.company,
            location: job.location,
            salary: job.salary_range,
            source: job.source_name,
            status: job.status,
            job_type: job.job_type,
            sponsorship_eligible: job.sponsorship_eligible,
            created_at: job.created_at
        }));
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `external_jobs_${activeTab}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
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
            'Remote OK': 'bg-slate-500/20 text-slate-400'
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

    const uniqueSources = ['all', ...new Set(jobs.map(job => job.source_name).filter(Boolean))];

    if (loading && jobs.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                <span className="ml-2 text-slate-400">Loading jobs...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Globe className="w-6 h-6 text-primary-400" />
                        External Jobs Manager
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Manage jobs from government RSS feeds, Jobicy API, and commercial sources
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 flex items-center gap-2 text-sm transition"
                    >
                        <Settings className="w-4 h-4" />
                        RSS Feeds
                    </button>
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
                        onClick={handleFetchRSSJobs}
                        disabled={syncing}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 transition"
                    >
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
                        {syncing ? 'Fetching...' : 'Fetch RSS'}
                    </button>
                    <button
                        onClick={handleExternalFetch}
                        disabled={syncing}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition"
                    >
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {syncing ? 'Fetching...' : 'Fetch API'}
                    </button>
                    <button
                        onClick={handleSyncJobs}
                        disabled={syncing}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition"
                    >
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {syncing ? 'Syncing...' : 'Sync Jobs'}
                    </button>
                </div>
            </div>

            {/* RSS Feeds Settings Panel */}
            {showSettings && (
                <div className="p-4 bg-slate-900/80 border border-slate-700 rounded-xl">
                    <h3 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                        <Rss className="w-4 h-4" />
                        Active RSS Feed Sources ({RSS_FEEDS.filter(f => f.active).length} of {RSS_FEEDS.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        {RSS_FEEDS.map(feed => (
                            <div key={feed.name} className="flex items-center gap-2 text-slate-400">
                                <span className={feed.active ? 'text-emerald-400' : 'text-red-400'}>
                                    {feed.active ? '✅' : '❌'}
                                </span>
                                <span>{feed.name}</span>
                                <span className="text-xs text-slate-500">({feed.country})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sync Result Banner */}
            {syncResult && (
                <div className={`p-3 rounded-lg ${syncResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <p className={syncResult.success ? 'text-emerald-400' : 'text-red-400'}>
                        {syncResult.success 
                            ? `✅ ${syncResult.message || `Sync complete: ${syncResult.inserted} new jobs added`}${syncResult.forceRefresh ? ' (force refresh)' : ''}`
                            : `❌ Sync failed: ${syncResult.error}`}
                    </p>
                </div>
            )}

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-primary-500/50 transition group" 
                    onClick={() => setActiveTab('pending')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Pending Approval</p>
                            <p className="text-2xl font-bold text-white group-hover:text-primary-400 transition">{stats.pending}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-yellow-400 opacity-70 group-hover:opacity-100 transition" />
                    </div>
                </div>
                <div 
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-primary-500/50 transition group" 
                    onClick={() => setActiveTab('approved')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Approved</p>
                            <p className="text-2xl font-bold text-white group-hover:text-primary-400 transition">{stats.approved}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-emerald-400 opacity-70 group-hover:opacity-100 transition" />
                    </div>
                </div>
                <div 
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-primary-500/50 transition group" 
                    onClick={() => setActiveTab('rejected')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Rejected</p>
                            <p className="text-2xl font-bold text-white group-hover:text-primary-400 transition">{stats.rejected}</p>
                        </div>
                        <XCircle className="w-8 h-8 text-red-400 opacity-70 group-hover:opacity-100 transition" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Active RSS Feeds</p>
                            <p className="text-2xl font-bold text-white">{RSS_FEEDS.filter(f => f.active).length}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-primary-400 opacity-70" />
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-800 flex-wrap">
                {['pending', 'approved', 'rejected', 'all'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium transition capitalize ${
                            activeTab === tab 
                                ? 'text-primary-400 border-b-2 border-primary-400' 
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        {tab} {tab === 'pending' && `(${stats.pending})`}
                        {tab === 'approved' && `(${stats.approved})`}
                        {tab === 'rejected' && `(${stats.rejected})`}
                        {tab === 'all' && `(${stats.total})`}
                    </button>
                ))}
            </div>

            {/* Search and Filter Bar */}
            {(activeTab === 'pending' || activeTab === 'all') && jobs.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by title, company, location, or source..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        {uniqueSources.map(source => (
                            <option key={source} value={source}>
                                {source === 'all' ? 'All Sources' : source}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={exportJobs}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 transition"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            )}

            {/* Batch Actions (Pending only) */}
            {activeTab === 'pending' && filteredJobs.length > 0 && (
                <div className="flex gap-2">
                    <button
                        onClick={toggleSelectAll}
                        className="px-3 py-1.5 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm flex items-center gap-1 transition"
                    >
                        {selectedJobs.size === filteredJobs.length ? <Square className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
                        {selectedJobs.size === filteredJobs.length ? 'Deselect All' : 'Select All'}
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
            {filteredJobs.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    {activeTab === 'pending' ? (
                        <>
                            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No Pending Jobs</h3>
                            <p className="text-slate-400">Click "Fetch RSS" or "Fetch API" to import external job listings.</p>
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
                    {filteredJobs.map((job) => (
                        <div 
                            key={job.id} 
                            className={`bg-slate-900/50 border rounded-xl p-5 transition ${
                                selectedJobs.has(job.id) 
                                    ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500' 
                                    : 'border-slate-800 hover:border-primary-500/30'
                            }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                {/* Job Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        {activeTab === 'pending' && (
                                            <button
                                                onClick={() => toggleSelectJob(job.id)}
                                                className="p-1 hover:bg-slate-800 rounded transition"
                                                aria-label={selectedJobs.has(job.id) ? 'Deselect' : 'Select'}
                                            >
                                                {selectedJobs.has(job.id) 
                                                    ? <CheckSquare className="w-4 h-4 text-primary-400" /> 
                                                    : <Square className="w-4 h-4 text-slate-500" />}
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
                                
                                {/* Actions */}
                                <div className="flex flex-row md:flex-col gap-2">
                                    <button
                                        onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                                        className="px-3 py-1.5 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm flex items-center gap-1 transition hover:bg-slate-800"
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
                                                disabled={processingId === job.id}
                                                className="px-3 py-1.5 bg-red-600/70 text-white rounded-lg hover:bg-red-600 transition text-sm flex items-center gap-1 disabled:opacity-50"
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
                                    {/* FIXED: was dangerouslySetInnerHTML on
                                        externally-sourced content — a real XSS
                                        risk. Renders as plain text now. */}
                                    <div className="text-slate-400 text-sm whitespace-pre-wrap">
                                        {job.description || 'No description provided.'}
                                    </div>
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
