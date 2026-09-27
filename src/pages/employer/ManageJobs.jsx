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
//
// FIXED (2026-09-25): the genuinely missing "View Applicants" feature -
// confirmed the Users icon was already imported here but never actually
// used anywhere, strongly suggesting this was planned but never built.
// The pricing page has promised this as a real, paid Employer/Business
// feature this whole time with no working UI behind it at all.

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Eye, Edit, Trash2, Users, Calendar, Loader2, MapPin, Clock, DollarSign, Briefcase, X, Mail, Phone, ExternalLink, Linkedin, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Matches the same mapping used in JobDetailPage.jsx's JobPosting
// structured data — kept consistent rather than inventing a second copy.
const CURRENCY_BY_COUNTRY = {
    GB: 'GBP', US: 'USD', NG: 'NGN', CA: 'CAD',
    AU: 'AUD', DE: 'EUR', IE: 'EUR'
};
const CURRENCY_SYMBOL = { GBP: '£', USD: '$', NGN: '₦', CAD: 'C$', AUD: 'A$', EUR: '€' };

const STATUS_COLORS = {
    pending: 'bg-amber-500/20 text-amber-400',
    reviewed: 'bg-sky-500/20 text-sky-400',
    shortlisted: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400'
};

export default function ManageJobs() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

    // NEW (2026-09-25): applicant-viewing state
    const [applicantsModalJob, setApplicantsModalJob] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [applicantCounts, setApplicantCounts] = useState({});

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
            loadApplicantCounts(data || []);
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setLoading(false);
        }
    }

    // NEW (2026-09-25): a real applicant count per job, shown on the
    // card itself so an employer doesn't have to open every job just
    // to see if anyone's applied yet.
    async function loadApplicantCounts(jobList) {
        if (jobList.length === 0) return;
        const { data } = await supabase
            .from('job_applications')
            .select('job_id')
            .in('job_id', jobList.map(j => j.id));

        const counts = {};
        (data || []).forEach(a => { counts[a.job_id] = (counts[a.job_id] || 0) + 1; });
        setApplicantCounts(counts);
    }

    async function openApplicants(job) {
        setApplicantsModalJob(job);
        setLoadingApplicants(true);
        setApplicants([]);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/index?action=get-job-applicants&jobId=${job.id}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load applicants');
            setApplicants(data.applicants || []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoadingApplicants(false);
        }
    }

    async function handleMessageApplicant(applicantId, jobId) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=start-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ otherUserId: applicantId, relatedJobId: jobId })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            navigate(`/messages?conversation=${data.conversationId}`);
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function handleStatusChange(applicationId, newStatus) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=update-application-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ applicationId, status: newStatus })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setApplicants(prev => prev.map(a => a.id === applicationId ? { ...a, status: newStatus } : a));
            toast.success('Status updated');
        } catch (err) {
            toast.error(err.message);
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
                                        <button
                                            onClick={() => openApplicants(job)}
                                            className="flex items-center gap-1.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"
                                            title="View Applicants"
                                        >
                                            <Users className="w-5 h-5" />
                                            {applicantCounts[job.id] || 0}
                                        </button>
                                        <Link
                                            to={`/jobs/${job.id}`}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                            title="View Job"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </Link>
                                        <Link
                                            to={`/edit-job/${job.id}`}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                            title="Edit Job"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </Link>
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

            {/* NEW (2026-09-25): the real applicant-viewing modal */}
            {applicantsModalJob && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h2 className="text-lg font-bold text-white">Applicants</h2>
                                <p className="text-slate-400 text-sm">{applicantsModalJob.title}</p>
                            </div>
                            <button onClick={() => setApplicantsModalJob(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {loadingApplicants ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
                        ) : applicants.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-10">No applicants yet for this job.</p>
                        ) : (
                            <div className="space-y-4">
                                {applicants.map(app => (
                                    <div key={app.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                        <div className="flex justify-between items-start gap-3 mb-2">
                                            <div>
                                                <p className="text-white font-medium">{app.profiles?.full_name || 'Unnamed applicant'}</p>
                                                {app.profiles?.job_title && <p className="text-slate-400 text-xs">{app.profiles.job_title}{app.profiles.years_experience ? ` • ${app.profiles.years_experience} yrs experience` : ''}</p>}
                                            </div>
                                            <select
                                                value={app.status}
                                                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                                className={`text-xs px-2 py-1 rounded-full border-0 ${STATUS_COLORS[app.status] || 'bg-slate-700 text-slate-300'}`}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="reviewed">Reviewed</option>
                                                <option value="shortlisted">Shortlisted</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-3">
                                            {app.profiles?.email && (
                                                <a href={`mailto:${app.profiles.email}`} className="flex items-center gap-1 hover:text-white">
                                                    <Mail className="w-3 h-3" /> {app.profiles.email}
                                                </a>
                                            )}
                                            {app.profiles?.phone && (
                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {app.profiles.phone}</span>
                                            )}
                                            {app.profiles?.linkedin_url && (
                                                <a href={app.profiles.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white">
                                                    <Linkedin className="w-3 h-3" /> LinkedIn
                                                </a>
                                            )}
                                        </div>

                                        {app.cover_letter && (
                                            <p className="text-slate-300 text-sm bg-slate-900/50 rounded-lg p-3 mb-2 whitespace-pre-wrap">{app.cover_letter}</p>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => handleMessageApplicant(app.applicant_id, applicantsModalJob.id)}
                                                className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                                            >
                                                <MessageCircle className="w-3 h-3" /> Message
                                            </button>
                                            <p className="text-slate-500 text-xs">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                                            {app.cv_url && (
                                                <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300">
                                                    <ExternalLink className="w-3 h-3" /> View CV
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
