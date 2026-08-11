// src/pages/SavedJobsPage.jsx
// COMPLETE PROFESSIONAL SAVED JOBS - With filtering and enhanced UI
//
// FIXED (2026-08-07):
// 1. Was creating its own separate Supabase client instead of importing the
//    shared singleton from lib/supabase.js. The singleton uses a custom
//    storage key for the session; a fresh client with no config uses a
//    different default key, so it couldn't see a logged-in user's session at
//    all — this page effectively always looked logged out. Now imports the
//    shared client.
// 2. Was calling /api/index?action=user-saved-jobs and
//    ?action=user-saved-job-remove — neither exists as a backend handler, so
//    this page always failed with an error for every real user. Replaced with
//    direct Supabase queries against saved_jobs joined to jobs, the same
//    proven pattern JobsPage.jsx already uses successfully.
// 3. Cleaned up the FileText icon import (was a stray second import statement
//    after the JOB_TYPES array — worked due to import hoisting, but confusing).

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    BookmarkCheck, Briefcase, MapPin, Clock, DollarSign, 
    Building2, Filter, Search, Trash2, Eye, Loader2,
    AlertCircle, TrendingUp, Star, Zap, Calendar, X, FileText
} from 'lucide-react';

const JOB_TYPES = [
    { id: 'all', name: 'All Types', icon: Briefcase },
    { id: 'full_time', name: 'Full Time', icon: Briefcase },
    { id: 'part_time', name: 'Part Time', icon: Clock },
    { id: 'remote', name: 'Remote', icon: Zap },
    { id: 'contract', name: 'Contract', icon: FileText },
    { id: 'freelance', name: 'Freelance', icon: Star }
];

export default function SavedJobsPage() {
    const navigate = useNavigate();
    const [savedJobs, setSavedJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [jobTypeFilter, setJobTypeFilter] = useState('all');
    const [stats, setStats] = useState({ total: 0, fullTime: 0, remote: 0, recent: 0 });

    useEffect(() => { loadSavedJobs(); }, []);
    useEffect(() => { filterJobs(); }, [savedJobs, searchQuery, jobTypeFilter]);

    async function loadSavedJobs() {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/sign-in?redirect=/saved-jobs');
                return;
            }

            const { data, error: queryError } = await supabase
                .from('saved_jobs')
                .select('id, user_id, job_id, saved_at, jobs:job_id (*)')
                .eq('user_id', user.id)
                .order('saved_at', { ascending: false });

            if (queryError) throw queryError;

            const jobs = data || [];
            setSavedJobs(jobs);

            const fullTimeCount = jobs.filter(j => j.jobs?.job_type === 'full_time').length;
            const remoteCount = jobs.filter(j => j.jobs?.job_type === 'remote' || j.jobs?.is_remote).length;
            const recentCount = jobs.filter(j => {
                const savedDate = new Date(j.saved_at);
                const daysAgo = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysAgo <= 7;
            }).length;

            setStats({ total: jobs.length, fullTime: fullTimeCount, remote: remoteCount, recent: recentCount });
        } catch (err) {
            console.error('Error loading saved jobs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function removeSaved(jobId) {
        setRemovingId(jobId);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/sign-in?redirect=/saved-jobs');
                return;
            }

            const { error: deleteError } = await supabase
                .from('saved_jobs')
                .delete()
                .eq('user_id', user.id)
                .eq('job_id', jobId);

            if (deleteError) throw deleteError;
            await loadSavedJobs();
        } catch (err) {
            console.error('Error removing saved job:', err);
            setError(err.message);
        } finally {
            setRemovingId(null);
        }
    }

    function filterJobs() {
        let filtered = [...savedJobs];

        if (jobTypeFilter !== 'all') {
            filtered = filtered.filter(item =>
                item.jobs?.job_type === jobTypeFilter ||
                (jobTypeFilter === 'remote' && item.jobs?.is_remote)
            );
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.jobs?.title?.toLowerCase().includes(query) ||
                item.jobs?.company?.toLowerCase().includes(query) ||
                item.jobs?.location?.toLowerCase().includes(query)
            );
        }

        filtered.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
        setFilteredJobs(filtered);
    }

    function formatSalary(salaryMin, salaryMax) {
        if (!salaryMin && !salaryMax) return null;
        if (salaryMin && salaryMax) return `$${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}`;
        if (salaryMin) return `$${salaryMin.toLocaleString()}+`;
        return `Up to $${salaryMax.toLocaleString()}`;
    }

    function getJobTypeBadge(jobType) {
        const config = {
            full_time: { label: 'Full Time', color: 'bg-emerald-500/20 text-emerald-400' },
            part_time: { label: 'Part Time', color: 'bg-blue-500/20 text-blue-400' },
            remote: { label: 'Remote', color: 'bg-purple-500/20 text-purple-400' },
            contract: { label: 'Contract', color: 'bg-amber-500/20 text-amber-400' },
            freelance: { label: 'Freelance', color: 'bg-pink-500/20 text-pink-400' }
        };
        const { label, color } = config[jobType] || { label: jobType || 'Full Time', color: 'bg-slate-500/20 text-slate-400' };
        return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <BookmarkCheck className="w-8 h-8 text-primary-400" />
                        <h1 className="text-3xl font-bold text-white">Saved Jobs</h1>
                    </div>
                    <p className="text-slate-400">Jobs you've saved for later consideration</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center hover:border-primary-500/30 transition">
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                        <div className="text-xs text-slate-400">Total Saved</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center hover:border-primary-500/30 transition">
                        <div className="text-2xl font-bold text-emerald-400">{stats.fullTime}</div>
                        <div className="text-xs text-slate-400">Full Time</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center hover:border-primary-500/30 transition">
                        <div className="text-2xl font-bold text-purple-400">{stats.remote}</div>
                        <div className="text-xs text-slate-400">Remote</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center hover:border-primary-500/30 transition">
                        <div className="text-2xl font-bold text-amber-400">{stats.recent}</div>
                        <div className="text-xs text-slate-400">Saved This Week</div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search saved jobs by title, company, or location..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {JOB_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setJobTypeFilter(type.id)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                                    jobTypeFilter === type.id
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                <type.icon className="w-3 h-3" />
                                {type.name}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredJobs.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                        {savedJobs.length === 0 ? (
                            <>
                                <BookmarkCheck className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Saved Jobs Yet</h3>
                                <p className="text-slate-400 mb-6">
                                    Click the bookmark icon on job listings to save them for later.
                                </p>
                                <Link
                                    to="/jobs"
                                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-flex items-center gap-2"
                                >
                                    Browse Jobs
                                </Link>
                            </>
                        ) : (
                            <>
                                <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Matching Saved Jobs</h3>
                                <p className="text-slate-400 mb-6">
                                    No saved jobs match "{searchQuery}" or the selected filter.
                                </p>
                                <button
                                    onClick={() => { setSearchQuery(''); setJobTypeFilter('all'); }}
                                    className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                >
                                    Clear Filters
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredJobs.map((item) => {
                            const job = item.jobs;
                            if (!job) return null;

                            const salaryText = formatSalary(job.salary_min, job.salary_max);
                            const savedDate = new Date(item.saved_at);
                            const daysAgo = Math.floor((Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24));

                            return (
                                <div
                                    key={item.id}
                                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all duration-200 group"
                                >
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h2 className="text-xl font-semibold text-white group-hover:text-primary-400 transition">
                                                        {job.title}
                                                    </h2>
                                                    <p className="text-slate-400 mt-1 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {job.company}
                                                    </p>
                                                </div>
                                                {getJobTypeBadge(job.job_type)}
                                            </div>

                                            <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                                                {job.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {job.location}
                                                    </span>
                                                )}
                                                {salaryText && (
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign className="w-3 h-3" />
                                                        {salaryText}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Saved {daysAgo === 0 ? 'today' : `${daysAgo} days ago`}
                                                </span>
                                            </div>

                                            {job.description && (
                                                <p className="text-slate-400 text-sm mt-3 line-clamp-2">
                                                    {job.description.substring(0, 200)}...
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-row md:flex-col gap-2">
                                            <Link to={`/jobs/${job.id}`}>
                                                <button className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition text-sm flex items-center gap-1">
                                                    <Eye className="w-3 h-3" />
                                                    View & Apply
                                                </button>
                                            </Link>
                                            <button
                                                onClick={() => removeSaved(job.id)}
                                                disabled={removingId === job.id}
                                                className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                                            >
                                                {removingId === job.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3" />
                                                )}
                                                Remove
                                            </button>
                                        </div>
                                    </div>

                                    {daysAgo <= 3 && (
                                        <div className="mt-3 pt-3 border-t border-slate-800">
                                            <p className="text-xs text-amber-400 flex items-center gap-1">
                                                <Zap className="w-3 h-3" />
                                                Recently saved - don't miss this opportunity!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {filteredJobs.length > 0 && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">
                            Showing {filteredJobs.length} of {savedJobs.length} saved jobs
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
