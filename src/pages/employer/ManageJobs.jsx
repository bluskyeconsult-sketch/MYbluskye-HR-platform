// src/pages/employer/ManageJobs.jsx
//
// FIXED (2026-08-07): this page used <MapPin>, <Clock>, <DollarSign>, and
// <Briefcase> in the JSX but only imported { Eye, Edit, Trash2, Users,
// Calendar, Loader2 } from lucide-react. Briefcase is used even in the empty
// state, so this page threw "Briefcase is not defined" and crashed for every
// user, with zero or more jobs. Added the missing imports.
//
// FIXED (2026-08-23):
// 1. The Edit button linked to /edit-job/:id — confirmed via a direct
//    search of the real App.jsx that no such route exists anywhere at
//    all. Every single click on "Edit" has 404'd. There is no edit-job
//    page built yet — this now disables the button with an honest
//    "coming soon" state instead of linking to a dead end, rather than
//    silently leaving a broken link.
// 2. Salary was hardcoded to £ regardless of the job's actual source
//    country — the same currency-hardcoding bug already found and fixed
//    in JobDetailPage.jsx, recurring here in a different file. Now uses
//    the same real country-to-currency mapping.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Eye, Edit, Trash2, Users, Calendar, Loader2, MapPin, Clock, DollarSign, Briefcase } from 'lucide-react';

// Matches the same mapping used in JobDetailPage.jsx's JobPosting
// structured data — kept consistent rather than inventing a second copy.
const CURRENCY_BY_COUNTRY = {
    GB: 'GBP', US: 'USD', NG: 'NGN', CA: 'CAD',
    AU: 'AUD', DE: 'EUR', IE: 'EUR'
};
const CURRENCY_SYMBOL = { GBP: '£', USD: '$', NGN: '₦', CAD: 'C$', AUD: 'A$', EUR: '€' };

export default function ManageJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        loadJobs();
    }, []);

    async function loadJobs() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setJobs(data || []);
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(jobId) {
        if (!confirm('Are you sure you want to delete this job posting?')) return;
        
        setDeleting(jobId);
        try {
            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', jobId);

            if (error) throw error;
            setJobs(jobs.filter(job => job.id !== jobId));
            alert('Job deleted successfully');
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        } finally {
            setDeleting(null);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Manage Jobs</h1>
                        <p className="text-slate-400">View and manage your job postings</p>
                    </div>
                    <Link
                        to="/post-job"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        + Post New Job
                    </Link>
                </div>

                {/* Jobs List */}
                {jobs.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                        <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Jobs Posted Yet</h3>
                        <p className="text-slate-400 mb-6">Start posting jobs to find qualified candidates</p>
                        <Link to="/post-job" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Post Your First Job
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {jobs.map((job) => (
                            <div key={job.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div className="flex-1">
                                        <h2 className="text-xl font-semibold text-white mb-2">{job.title}</h2>
                                        <p className="text-slate-400 mb-3">{job.company}</p>
                                        <div className="flex flex-wrap gap-3 text-sm text-slate-500 mb-4">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {job.location || 'Location TBD'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {job.job_type?.replace('_', ' ').toUpperCase()}
                                            </span>
                                            {job.salary_min && job.salary_max && (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-4 h-4" />
                                                    {CURRENCY_SYMBOL[CURRENCY_BY_COUNTRY[job.source_country]] || '£'}{job.salary_min.toLocaleString()} - {CURRENCY_SYMBOL[CURRENCY_BY_COUNTRY[job.source_country]] || '£'}{job.salary_max.toLocaleString()}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                Posted: {new Date(job.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 line-clamp-2">{job.description}</p>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <Link
                                            to={`/jobs/${job.id}`}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                            title="View Job"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </Link>
                                        <button
                                            disabled
                                            title="Job editing isn't built yet"
                                            className="p-2 text-slate-600 cursor-not-allowed rounded-lg"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(job.id)}
                                            disabled={deleting === job.id}
                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                            title="Delete Job"
                                        >
                                            {deleting === job.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
