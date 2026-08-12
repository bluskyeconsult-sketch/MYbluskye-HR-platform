// src/pages/admin/AdminJobs.jsx
// COMPLETE JOB MANAGEMENT
//
// FIXED (2026-08-07):
// 1. loadJobs/toggleStatus/toggleFeatured/deleteJob all called
//    /api/index?action=admin-* actions that don't exist anywhere in
//    api/index.js. loadJobs happened to fall back correctly (it checks
//    data.success, which is falsy for the metadata response), but
//    toggleStatus/toggleFeatured/deleteJob only checked response.ok — which
//    is true even for that meaningless metadata response — so clicking
//    those buttons silently did nothing at all, no error, no actual change.
//    Simplified all four to go straight to Supabase, removing the dead
//    API-first attempts entirely.
// 2. The job details modal called .map() on selectedJob.requirements, but
//    PostJob.jsx saves it as a plain textarea string, not an array — this
//    would throw a TypeError the first time an admin opened details for any
//    employer-posted job. Fixed to render either shape.
// 3. Salary display only checked salary_range (a string field set by the
//    external RSS job-fetching pipeline), but employer-posted jobs from
//    PostJob.jsx store salary_min/salary_max as separate numbers instead —
//    now checks both.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Briefcase, Search, Loader2, CheckCircle, XCircle, Eye, 
    RefreshCw, Filter, MapPin, Calendar, Building2, DollarSign,
    Clock, AlertCircle, Trash2, Edit, ExternalLink, Users,
    TrendingUp, Award, Shield, Star
} from 'lucide-react';

export default function AdminJobs() {
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedJob, setSelectedJob] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        featured: 0,
        remote: 0,
        hybrid: 0
    });

    const jobTypes = [
        { value: 'all', label: 'All Types', icon: Briefcase },
        { value: 'full_time', label: 'Full Time', color: 'blue' },
        { value: 'part_time', label: 'Part Time', color: 'amber' },
        { value: 'remote', label: 'Remote', color: 'emerald' },
        { value: 'hybrid', label: 'Hybrid', color: 'purple' },
        { value: 'contract', label: 'Contract', color: 'orange' }
    ];

    useEffect(() => {
        loadJobs();
    }, []);

    useEffect(() => {
        filterJobs();
    }, [jobs, searchTerm, statusFilter, typeFilter]);

    async function loadJobs() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setJobs(data || []);
            calculateStats(data || []);
        } catch (err) {
            console.error('Error loading jobs:', err);
        } finally {
            setLoading(false);
        }
    }

    async function refreshJobs() {
        setRefreshing(true);
        await loadJobs();
        setRefreshing(false);
    }

    function calculateStats(jobList) {
        const total = jobList.length;
        const active = jobList.filter(j => j.is_active).length;
        const inactive = jobList.filter(j => !j.is_active).length;
        const featured = jobList.filter(j => j.is_featured).length;
        const remote = jobList.filter(j => j.job_type === 'remote').length;
        const hybrid = jobList.filter(j => j.job_type === 'hybrid').length;
        
        setStats({ total, active, inactive, featured, remote, hybrid });
    }

    function filterJobs() {
        let filtered = [...jobs];
        
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(j => 
                j.title?.toLowerCase().includes(term) ||
                j.company?.toLowerCase().includes(term) ||
                j.location?.toLowerCase().includes(term) ||
                j.description?.toLowerCase().includes(term)
            );
        }
        
        if (statusFilter === 'active') {
            filtered = filtered.filter(j => j.is_active);
        } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(j => !j.is_active);
        }
        
        if (typeFilter !== 'all') {
            filtered = filtered.filter(j => j.job_type === typeFilter);
        }
        
        setFilteredJobs(filtered);
    }

    async function toggleStatus(jobId, currentStatus) {
        try {
            await supabase.from('jobs').update({ is_active: !currentStatus }).eq('id', jobId);
            await loadJobs();
        } catch (err) {
            console.error('Error toggling job status:', err);
        }
    }

    async function toggleFeatured(jobId, currentFeatured) {
        try {
            await supabase.from('jobs').update({ is_featured: !currentFeatured }).eq('id', jobId);
            await loadJobs();
        } catch (err) {
            console.error('Error toggling featured:', err);
        }
    }

    async function deleteJob(jobId) {
        if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return;
        
        try {
            await supabase.from('jobs').delete().eq('id', jobId);
            await loadJobs();
        } catch (err) {
            console.error('Error deleting job:', err);
        }
    }

    function getJobTypeBadge(jobType) {
        const config = {
            full_time: { label: 'Full Time', color: 'bg-blue-500/20 text-blue-400' },
            part_time: { label: 'Part Time', color: 'bg-amber-500/20 text-amber-400' },
            remote: { label: 'Remote', color: 'bg-emerald-500/20 text-emerald-400' },
            hybrid: { label: 'Hybrid', color: 'bg-purple-500/20 text-purple-400' },
            contract: { label: 'Contract', color: 'bg-orange-500/20 text-orange-400' },
            freelance: { label: 'Freelance', color: 'bg-pink-500/20 text-pink-400' }
        };
        const { label, color } = config[jobType] || { label: 'Full Time', color: 'bg-slate-500/20 text-slate-400' };
        return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
    }

    function getSalaryDisplay(job) {
        if (job.salary_range) return job.salary_range;
        if (job.salary_min && job.salary_max) return `£${job.salary_min.toLocaleString()} - £${job.salary_max.toLocaleString()}`;
        return 'Competitive';
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Job Management</h1>
                    <p className="text-slate-400">View, moderate, and manage job listings</p>
                </div>
                <button
                    onClick={refreshJobs}
                    disabled={refreshing}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-slate-400">Total Jobs</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
                    <p className="text-xs text-slate-400">Active</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
                    <p className="text-xs text-slate-400">Inactive</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-400">{stats.featured}</p>
                    <p className="text-xs text-slate-400">Featured</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{stats.remote}</p>
                    <p className="text-xs text-slate-400">Remote</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-400">{stats.hybrid}</p>
                    <p className="text-xs text-slate-400">Hybrid</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by title, company, or location..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Types</option>
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="contract">Contract</option>
                    </select>
                    {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('all');
                                setTypeFilter('all');
                            }}
                            className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition text-sm"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Job Title</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Company</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Location</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Type</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Posted</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Status</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Featured</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredJobs.map((job) => (
                                <tr key={job.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition group">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="text-white text-sm font-medium">{job.title}</p>
                                            {(job.salary_range || (job.salary_min && job.salary_max)) && (
                                                <p className="text-xs text-emerald-400 mt-0.5">{getSalaryDisplay(job)}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <Building2 className="w-3 h-3 text-slate-500" />
                                            <span className="text-slate-300 text-sm">{job.company}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-slate-500" />
                                            <span className="text-slate-400 text-sm">{job.location || 'Remote'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {getJobTypeBadge(job.job_type)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-slate-500" />
                                            <span className="text-slate-400 text-sm">
                                                {new Date(job.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {job.is_active ? (
                                            <span className="text-emerald-400 text-sm flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="text-red-400 text-sm flex items-center gap-1">
                                                <XCircle className="w-3 h-3" /> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => toggleFeatured(job.id, job.is_featured)}
                                            className={`p-1 rounded transition ${
                                                job.is_featured 
                                                    ? 'text-amber-400 hover:text-amber-300' 
                                                    : 'text-slate-500 hover:text-amber-400'
                                            }`}
                                            title={job.is_featured ? 'Remove featured' : 'Mark as featured'}
                                        >
                                            <Star className="w-4 h-4" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedJob(job);
                                                    setShowDetailsModal(true);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-700"
                                                title="View details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleStatus(job.id, job.is_active)}
                                                className={`p-1.5 rounded-lg transition ${
                                                    job.is_active 
                                                        ? 'text-red-400 hover:bg-red-500/20' 
                                                        : 'text-emerald-400 hover:bg-emerald-500/20'
                                                }`}
                                                title={job.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {job.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => deleteJob(job.id)}
                                                className="p-1.5 text-red-400 hover:text-red-300 transition rounded-lg hover:bg-red-500/20"
                                                title="Delete job"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filteredJobs.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        <p>No jobs found matching your criteria</p>
                        {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setTypeFilter('all');
                                }}
                                className="mt-3 text-sm text-primary-400 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Job Details Modal */}
            {showDetailsModal && selectedJob && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Job Details</h2>
                            <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-white">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white">{selectedJob.title}</h3>
                                <p className="text-primary-400 text-sm">{selectedJob.company}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-500" />
                                    <span className="text-slate-300">{selectedJob.location || 'Remote'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-slate-500" />
                                    <span className="text-slate-300">{getSalaryDisplay(selectedJob)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-slate-500" />
                                    <span className="text-slate-300">{selectedJob.job_type?.replace('_', ' ') || 'Full Time'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-500" />
                                    <span className="text-slate-300">Posted: {new Date(selectedJob.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            
                            {selectedJob.description && (
                                <div>
                                    <h4 className="text-white font-semibold mb-2">Description</h4>
                                    <p className="text-slate-400 text-sm whitespace-pre-wrap">{selectedJob.description}</p>
                                </div>
                            )}
                            
                            {/* FIXED: PostJob.jsx saves requirements as a plain
                                string, not an array — .map() would crash.
                                Now handles either shape. */}
                            {selectedJob.requirements && (
                                <div>
                                    <h4 className="text-white font-semibold mb-2">Requirements</h4>
                                    {Array.isArray(selectedJob.requirements) ? (
                                        <ul className="list-disc list-inside space-y-1">
                                            {selectedJob.requirements.map((req, idx) => (
                                                <li key={idx} className="text-slate-400 text-sm">{req}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-slate-400 text-sm whitespace-pre-wrap">{selectedJob.requirements}</p>
                                    )}
                                </div>
                            )}
                            
                            <div className="flex gap-3 pt-4 border-t border-slate-800">
                                <button
                                    onClick={() => {
                                        window.open(`/jobs/${selectedJob.id}`, '_blank');
                                    }}
                                    className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View Public Page
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        // Open edit modal if available
                                    }}
                                    className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Job
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
