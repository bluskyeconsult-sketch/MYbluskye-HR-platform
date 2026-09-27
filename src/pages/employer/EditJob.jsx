// src/pages/employer/EditJob.jsx
//
// NEW (2026-09-25): the genuinely missing edit-job page -
// ManageJobs.jsx's Edit button has been honestly disabled with
// "coming soon" since 2026-08-23, confirmed via a direct search that
// no /edit-job/:id route existed anywhere at all. Mirrors PostJob.jsx's
// real form and access-gating exactly, but loads and updates an
// existing job instead of creating one.
//
// Deliberate choice: editing does NOT reset status/compliance_status
// back to pending - re-triggering a full admin review over a typo fix
// would be disruptive. The job stays live (or stays pending, whatever
// it already was) through an edit.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Briefcase, Lock } from 'lucide-react';

const ALLOWED_TIERS = ['employer', 'business'];
const ALLOWED_USER_TYPES = ['admin', 'super_admin'];

export default function EditJob() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        location: '',
        job_type: 'full_time',
        salary_min: '',
        salary_max: '',
        description: '',
        requirements: '',
        benefits: '',
        application_deadline: ''
    });

    useEffect(() => {
        loadJob();
    }, [id]);

    async function loadJob() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate(`/sign-in?redirect=/edit-job/${id}`);
            return;
        }

        const { data: job, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !job) {
            setNotFound(true);
            setCheckingAccess(false);
            return;
        }

        // Real authorization - same pattern as get-job-applicants:
        // confirms genuine ownership before letting anyone edit a job,
        // not just checking they're logged in.
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();
        const isAdmin = ALLOWED_USER_TYPES.includes(profile?.user_type);

        if (job.user_id !== user.id && !isAdmin) {
            setAccessDenied(true);
            setCheckingAccess(false);
            return;
        }

        setFormData({
            title: job.title || '',
            company: job.company || '',
            location: job.location || '',
            job_type: job.job_type || 'full_time',
            salary_min: job.salary_min || '',
            salary_max: job.salary_max || '',
            description: job.description || '',
            requirements: job.requirements || '',
            benefits: job.benefits || '',
            application_deadline: job.application_deadline || ''
        });
        setCheckingAccess(false);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('jobs')
                .update({
                    ...formData,
                    salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
                    salary_max: formData.salary_max ? parseInt(formData.salary_max) : null
                    // Deliberately NOT touching status/compliance_status
                    // here - an edit shouldn't silently take a live job
                    // down for re-review.
                })
                .eq('id', id);

            if (error) throw error;

            // NEW (2026-09-25): fire-and-forget - never awaited, so
            // this can't slow down or block a real save.
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (!user) return;
                supabase.auth.getSession().then(({ data: { session } }) => {
                    fetch('/api/index?action=log-user-activity', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                        body: JSON.stringify({ userId: user.id, userEmail: user.email, actionType: 'job_edited', details: { jobId: id, title: formData.title } })
                    }).catch(() => {});
                });
            });

            alert('Job updated successfully.');
            navigate('/manage-jobs');
        } catch (error) {
            console.error('Error updating job:', error);
            alert('Failed to update job. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingAccess) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                    <h1 className="text-xl font-bold text-white mb-2">Job Not Found</h1>
                    <p className="text-slate-400 mb-6">This job listing doesn't exist or has been removed.</p>
                    <button onClick={() => navigate('/manage-jobs')} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                        Back to Manage Jobs
                    </button>
                </div>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                    <Lock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Not Your Job Posting</h1>
                    <p className="text-slate-400 mb-6">You can only edit jobs you posted yourself.</p>
                    <button onClick={() => navigate('/manage-jobs')} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                        Back to Manage Jobs
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 md:p-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Edit Job</h1>
                    <p className="text-slate-400 mb-6">Update the details below</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Job Title *</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Company Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.company}
                                onChange={(e) => setFormData({...formData, company: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Job Type</label>
                                <select
                                    value={formData.job_type}
                                    onChange={(e) => setFormData({...formData, job_type: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="full_time">Full Time</option>
                                    <option value="part_time">Part Time</option>
                                    <option value="contract">Contract</option>
                                    <option value="freelance">Freelance</option>
                                    <option value="remote">Remote</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Min Salary</label>
                                <input
                                    type="number"
                                    value={formData.salary_min}
                                    onChange={(e) => setFormData({...formData, salary_min: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Max Salary</label>
                                <input
                                    type="number"
                                    value={formData.salary_max}
                                    onChange={(e) => setFormData({...formData, salary_max: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Job Description *</label>
                            <textarea
                                required
                                rows={5}
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Requirements</label>
                            <textarea
                                rows={4}
                                value={formData.requirements}
                                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Benefits</label>
                            <textarea
                                rows={3}
                                value={formData.benefits}
                                onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Application Deadline</label>
                            <input
                                type="date"
                                value={formData.application_deadline}
                                onChange={(e) => setFormData({...formData, application_deadline: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Briefcase className="w-5 h-5" />}
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/manage-jobs')}
                                className="px-6 py-3 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
