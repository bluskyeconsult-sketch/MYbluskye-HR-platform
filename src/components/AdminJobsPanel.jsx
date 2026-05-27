// src/components/AdminJobsPanel.jsx (Optimized Component)
// Separated UI logic from service logic

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
    fetchAndSaveExternalJobs,
    getCacheStatus,
    getPendingExternalJobs,
    approveExternalJob,
    rejectExternalJob,
    batchApproveExternalJobs,
    getExternalJobsStats,
    getFetchLogs
} from '../../services/externalJobService';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminJobsPanel() {
    const { user } = useAuth();
    const [fetching, setFetching] = useState(false);
    const [pendingJobs, setPendingJobs] = useState([]);
    const [stats, setStats] = useState({});
    const [fetchLogs, setFetchLogs] = useState([]);
    const [selectedJobs, setSelectedJobs] = useState(new Set());
    const [cacheStatus, setCacheStatus] = useState(null);

    useEffect(() => {
        loadJobs();
        loadStats();
        loadFetchLogs();
        updateCacheStatus();
    }, []);

    const updateCacheStatus = () => {
        const status = getCacheStatus();
        setCacheStatus(status);
    };

    const loadJobs = async () => {
        const jobs = await getPendingExternalJobs();
        setPendingJobs(jobs);
    };

    const loadStats = async () => {
        const statsData = await getExternalJobsStats();
        setStats(statsData);
    };

    const loadFetchLogs = async () => {
        const logs = await getFetchLogs(10);
        setFetchLogs(logs);
    };

    // Unified fetch handler
    const handleFetchJobs = async (forceRefresh = false) => {
        setFetching(true);
        const toastId = forceRefresh ? 'force-refresh' : 'fetch-jobs';
        toast.loading(
            forceRefresh ? 'Force refreshing government jobs...' : 'Fetching jobs from government portals...', 
            { id: toastId }
        );
        
        try {
            const result = await fetchAndSaveExternalJobs({ 
                forceRefresh, 
                userId: user?.id 
            });
            
            if (result.success) {
                if (result.newCount > 0) {
                    toast.success(result.message, { id: toastId });
                } else {
                    toast.info(result.message, { id: toastId });
                }
                
                await loadJobs();
                await loadStats();
                await loadFetchLogs();
                updateCacheStatus();
            } else {
                toast.error(result.message, { id: toastId });
            }
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Failed to fetch jobs', { id: toastId });
        } finally {
            setFetching(false);
        }
    };

    const handleApproveJob = async (jobId) => {
        toast.loading('Approving job...', { id: 'approve-job' });
        const result = await approveExternalJob(jobId);
        
        if (result.success) {
            toast.success('Job approved successfully', { id: 'approve-job' });
            await loadJobs();
            await loadStats();
        } else {
            toast.error(result.error || 'Failed to approve job', { id: 'approve-job' });
        }
    };

    const handleRejectJob = async (jobId, reason = '') => {
        toast.loading('Rejecting job...', { id: 'reject-job' });
        const result = await rejectExternalJob(jobId, reason);
        
        if (result.success) {
            toast.success('Job rejected', { id: 'reject-job' });
            await loadJobs();
            await loadStats();
        } else {
            toast.error(result.error || 'Failed to reject job', { id: 'reject-job' });
        }
    };

    const handleBatchApprove = async () => {
        const jobIds = Array.from(selectedJobs);
        if (jobIds.length === 0) {
            toast.error('No jobs selected');
            return;
        }
        
        toast.loading(`Approving ${jobIds.length} jobs...`, { id: 'batch-approve' });
        const result = await batchApproveExternalJobs(jobIds);
        
        if (result.success) {
            toast.success(`Approved ${result.approved} jobs`, { id: 'batch-approve' });
            setSelectedJobs(new Set());
            await loadJobs();
            await loadStats();
        } else {
            toast.error(result.error || 'Batch approval failed', { id: 'batch-approve' });
        }
    };

    const toggleSelectJob = (jobId) => {
        const newSelected = new Set(selectedJobs);
        if (newSelected.has(jobId)) {
            newSelected.delete(jobId);
        } else {
            newSelected.add(jobId);
        }
        setSelectedJobs(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedJobs.size === pendingJobs.length) {
            setSelectedJobs(new Set());
        } else {
            setSelectedJobs(new Set(pendingJobs.map(job => job.id)));
        }
    };

    return (
        <div className="admin-jobs-panel">
            {/* Header with Stats */}
            <div className="stats-header">
                <div className="stat-card">
                    <h3>Pending</h3>
                    <p className="stat-number">{stats.pending || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Approved</h3>
                    <p className="stat-number">{stats.approved || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Active Jobs</h3>
                    <p className="stat-number">{stats.active || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Total</h3>
                    <p className="stat-number">{stats.total || 0}</p>
                </div>
            </div>

            {/* Cache Status */}
            {cacheStatus && (
                <div className="cache-status">
                    <span>Cache: {cacheStatus.isFresh ? '✅ Fresh' : '⏰ Stale'}</span>
                    {cacheStatus.isFresh && (
                        <span> (Expires in {Math.round(cacheStatus.remaining / 1000)}s)</span>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="action-buttons">
                <button 
                    onClick={() => handleFetchJobs(false)} 
                    disabled={fetching}
                    className="btn-primary"
                >
                    {fetching ? 'Fetching...' : 'Fetch New Jobs'}
                </button>
                
                <button 
                    onClick={() => handleFetchJobs(true)} 
                    disabled={fetching}
                    className="btn-secondary"
                >
                    {fetching ? 'Refreshing...' : 'Force Refresh'}
                </button>
                
                {selectedJobs.size > 0 && (
                    <button 
                        onClick={handleBatchApprove}
                        className="btn-success"
                    >
                        Approve Selected ({selectedJobs.size})
                    </button>
                )}
            </div>

            {/* Pending Jobs Table */}
            <div className="jobs-table-container">
                {pendingJobs.length > 0 && (
                    <div className="table-controls">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={selectedJobs.size === pendingJobs.length}
                                onChange={toggleSelectAll}
                            />
                            Select All
                        </label>
                    </div>
                )}
                
                <table className="jobs-table">
                    <thead>
                        <tr>
                            <th>Select</th>
                            <th>Title</th>
                            <th>Company</th>
                            <th>Location</th>
                            <th>Sponsorship</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingJobs.map(job => (
                            <tr key={job.id}>
                                <td>
                                    <input 
                                        type="checkbox"
                                        checked={selectedJobs.has(job.id)}
                                        onChange={() => toggleSelectJob(job.id)}
                                    />
                                </td>
                                <td>{job.title}</td>
                                <td>{job.company}</td>
                                <td>{job.location || job.source_country}</td>
                                <td>
                                    {job.sponsorship_eligible ? (
                                        <span className="badge-success">Yes</span>
                                    ) : (
                                        <span className="badge-secondary">No</span>
                                    )}
                                </td>
                                <td>{new Date(job.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button 
                                        onClick={() => handleApproveJob(job.id)}
                                        className="btn-small btn-success"
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={() => handleRejectJob(job.id)}
                                        className="btn-small btn-danger"
                                    >
                                        Reject
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {pendingJobs.length === 0 && (
                    <div className="empty-state">
                        <p>No pending jobs to review</p>
                    </div>
                )}
            </div>

            {/* Fetch Logs */}
            {fetchLogs.length > 0 && (
                <div className="fetch-logs">
                    <h3>Recent Fetch Logs</h3>
                    <ul>
                        {fetchLogs.slice(0, 5).map(log => (
                            <li key={log.id}>
                                {new Date(log.created_at).toLocaleString()} - 
                                {log.source_name}: {log.jobs_new} new jobs
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
