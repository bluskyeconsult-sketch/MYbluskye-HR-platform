// src/pages/UserApplications.jsx
// COMPLETE PROFESSIONAL USER APPLICATIONS - With status tracking and filtering
//
// FIXED (2026-08-07):
// 1. Was creating its own separate Supabase client instead of importing the
//    shared singleton — same disconnected-session bug as SavedJobsPage.jsx.
//    Now imports the shared client.
// 2. Was calling /api/index?action=user-applications with no Authorization
//    header. The real handler requires one to identify the user and rejects
//    requests without it — this page always failed with "Unauthorized" for
//    every real user. Now uses the already-fixed lib/api.js's
//    getUserApplications(), which correctly attaches the auth header.

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { 
    Briefcase, Calendar, CheckCircle, XCircle, Clock, 
    Eye, Filter, Search, TrendingUp, MapPin, DollarSign,
    Loader2, AlertCircle, Building2, FileText, Star
} from 'lucide-react';

export default function UserApplications() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [filteredApplications, setFilteredApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        reviewed: 0,
        accepted: 0,
        rejected: 0
    });

    const statuses = [
        { id: 'all', name: 'All Applications', color: 'slate', icon: Briefcase },
        { id: 'pending', name: 'Pending Review', color: 'amber', icon: Clock },
        { id: 'reviewed', name: 'Under Review', color: 'blue', icon: Eye },
        { id: 'accepted', name: 'Accepted', color: 'emerald', icon: CheckCircle },
        { id: 'rejected', name: 'Rejected', color: 'red', icon: XCircle }
    ];

    useEffect(() => {
        loadApplications();
    }, []);

    useEffect(() => {
        filterApplications();
    }, [applications, statusFilter, searchQuery]);

    async function loadApplications() {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate('/sign-in?redirect=/applications');
                return;
            }

            // FIXED: uses the corrected lib/api.js client, which now attaches
            // the Authorization header the real handler requires.
            const result = await api.getUserApplications(user.id);

            if (!result.success) throw new Error(result.error);

            const applicationsData = result.data || [];
            setApplications(applicationsData);

            const statsData = {
                total: applicationsData.length,
                pending: applicationsData.filter(a => a.status === 'pending').length,
                reviewed: applicationsData.filter(a => a.status === 'reviewed').length,
                accepted: applicationsData.filter(a => a.status === 'accepted').length,
                rejected: applicationsData.filter(a => a.status === 'rejected').length
            };
            setStats(statsData);

        } catch (err) {
            console.error('Error loading applications:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function filterApplications() {
        let filtered = [...applications];

        if (statusFilter !== 'all') {
            filtered = filtered.filter(app => app.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(app =>
                app.jobs?.title?.toLowerCase().includes(query) ||
                app.jobs?.company?.toLowerCase().includes(query) ||
                app.jobs?.location?.toLowerCase().includes(query)
            );
        }

        setFilteredApplications(filtered);
    }

    function getStatusBadge(status) {
        const config = {
            pending: { label: 'Pending Review', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
            reviewed: { label: 'Under Review', color: 'bg-blue-500/20 text-blue-400', icon: Eye },
            accepted: { label: 'Accepted', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
            rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: XCircle }
        };

        const { label, color, icon: Icon } = config[status] || config.pending;
        return (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${color}`}>
                <Icon className="w-3 h-3" />
                {label}
            </span>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Applications</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">My Applications</h1>
                    <p className="text-slate-400">Track and manage your job applications</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                        <p className="text-xs text-slate-400">Total</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                        <p className="text-xs text-slate-400">Pending</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">{stats.reviewed}</p>
                        <p className="text-xs text-slate-400">Reviewed</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-400">{stats.accepted}</p>
                        <p className="text-xs text-slate-400">Accepted</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
                        <p className="text-xs text-slate-400">Rejected</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by job title, company, or location..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {statuses.map(status => (
                            <button
                                key={status.id}
                                onClick={() => setStatusFilter(status.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                                    statusFilter === status.id
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                <status.icon className="w-3 h-3" />
                                {status.name}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredApplications.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                        {applications.length === 0 ? (
                            <>
                                <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Applications Yet</h3>
                                <p className="text-slate-400 mb-6">You haven't applied to any jobs yet.</p>
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
                                <h3 className="text-xl font-semibold text-white mb-2">No Matching Applications</h3>
                                <p className="text-slate-400 mb-6">
                                    No applications match "{searchQuery}" or the selected filter.
                                </p>
                                <button
                                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                    className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                >
                                    Clear Filters
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredApplications.map((app) => (
                            <div
                                key={app.id}
                                className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all duration-200 group"
                            >
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h2 className="text-lg font-semibold text-white group-hover:text-primary-400 transition">
                                                {app.jobs?.title || 'Unknown Position'}
                                            </h2>
                                            {getStatusBadge(app.status)}
                                            {app.match_score && (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary-500/20 text-primary-400">
                                                    <Star className="w-3 h-3" />
                                                    {app.match_score}% Match
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-slate-400 text-sm mb-2 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {app.jobs?.company || 'Unknown Company'}
                                        </p>

                                        <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-3">
                                            {app.jobs?.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {app.jobs?.location}
                                                </span>
                                            )}
                                            {app.jobs?.salary_range && (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    {app.jobs?.salary_range}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Applied: {new Date(app.created_at || app.applied_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        {app.cover_letter && (
                                            <p className="text-slate-400 text-sm line-clamp-2">
                                                {app.cover_letter.substring(0, 150)}...
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-row md:flex-col gap-2">
                                        <Link to={`/jobs/${app.job_id}`}>
                                            <button className="w-full px-3 py-1.5 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm flex items-center gap-1 transition hover:bg-slate-800">
                                                <Eye className="w-3 h-3" /> View Job
                                            </button>
                                        </Link>
                                        {app.status === 'accepted' && (
                                            <Link to={`/applications/${app.id}/proceed`}>
                                                <button className="w-full px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 transition">
                                                    Proceed →
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {app.updated_at && app.updated_at !== app.created_at && (
                                    <div className="mt-3 pt-3 border-t border-slate-800">
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Last updated: {new Date(app.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {filteredApplications.length > 0 && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">
                            Showing {filteredApplications.length} of {applications.length} applications
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
