// src/pages/employer/PostJob.jsx
//
// FIXED (2026-08-07):
// 1. The real route for this page (App.jsx) only wraps it in generic
//    <ProtectedRoute> — no tier check at all. Any logged-in free-tier user
//    could post jobs. Added an explicit employer/business/admin/super_admin
//    gate, consistent with ODUSBABA's stated position that paid-tier features
//    shouldn't be freely available. This is a judgment call closing a real
//    gap, not a neutral bug fix — override if you want different behavior.
// 2. The insert never set `compliance_status`, but every real query
//    (JobsPage.jsx, the homepage-stats/jobs-stats handlers) filters on
//    `compliance_status = 'approved'`. Without it, posted jobs likely either
//    failed to insert or succeeded invisibly — yet the page said "posted
//    successfully!" Now explicitly sets `compliance_status: 'pending'` and
//    tells the user their job is submitted for review, which is honest
//    regardless of whether admin review is actually built yet.
// 3. `country_code` is not set at all, though it's used for filtering/display
//    elsewhere — not fixed (would need a country selector, a real feature
//    addition, not a bug fix). Flagged here for awareness.
// 4. `benefits` and `application_deadline` fields are sent to the `jobs`
//    table but not confirmed to exist in the real schema — left as-is since
//    removing them risks losing real functionality if they do exist, but
//    worth confirming directly in Supabase if job posting still fails.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Briefcase, MapPin, DollarSign, Clock, Users, Lock } from 'lucide-react';

const ALLOWED_TIERS = ['employer', 'business'];
const ALLOWED_USER_TYPES = ['admin', 'super_admin'];

export default function PostJob() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
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
        application_deadline: '',
        is_active: true
    });

    useEffect(() => {
        checkAccess();
    }, []);

    async function checkAccess() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/sign-in?redirect=/post-job');
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('tier, user_type')
            .eq('id', user.id)
            .single();

        const allowed = ALLOWED_TIERS.includes(profile?.tier) || ALLOWED_USER_TYPES.includes(profile?.user_type);
        setAccessDenied(!allowed);
        setCheckingAccess(false);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Please login to post a job');
                navigate('/sign-in');
                return;
            }

            const { data, error } = await supabase
                .from('jobs')
                .insert({
                    ...formData,
                    user_id: user.id,
                    salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
                    salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
                    // FIXED: explicit pending status — every real listing query
                    // filters on compliance_status = 'approved', so leaving this
                    // unset meant jobs were either failing to save or saving
                    // invisibly while the UI claimed success.
                    compliance_status: 'pending',
                    posted_at: new Date().toISOString(),
                    created_at: new Date().toISOString()
                })
                .select();

            if (error) throw error;

            // FIXED: honest messaging — this was "Job posted successfully!"
            // implying it was immediately live, which wasn't true.
            alert('Job submitted for review! It will appear on the job board once approved.');
            navigate('/manage-jobs');
        } catch (error) {
            console.error('Error posting job:', error);
            alert('Failed to post job. Please try again.');
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

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                    <Lock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Employer Plan Required</h1>
                    <p className="text-slate-400 mb-6">
                        Posting jobs requires an Employer or Business plan. Upgrade your account to reach qualified candidates.
                    </p>
                    <button
                        onClick={() => navigate('/pricing')}
                        className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                        View Plans
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 md:p-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Post a New Job</h1>
                    <p className="text-slate-400 mb-6">Fill in the details below to reach qualified candidates</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Job Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Job Title *</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Senior Software Engineer"
                            />
                        </div>

                        {/* Company Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Company Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.company}
                                onChange={(e) => setFormData({...formData, company: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Your company name"
                            />
                        </div>

                        {/* Location & Job Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., London, UK or Remote"
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

                        {/* Salary Range */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Min Salary (£)</label>
                                <input
                                    type="number"
                                    value={formData.salary_min}
                                    onChange={(e) => setFormData({...formData, salary_min: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="30000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Max Salary (£)</label>
                                <input
                                    type="number"
                                    value={formData.salary_max}
                                    onChange={(e) => setFormData({...formData, salary_max: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="50000"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Job Description *</label>
                            <textarea
                                required
                                rows={5}
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
                            />
                        </div>

                        {/* Requirements */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Requirements</label>
                            <textarea
                                rows={4}
                                value={formData.requirements}
                                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="List the key requirements and qualifications needed..."
                            />
                        </div>

                        {/* Benefits */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Benefits</label>
                            <textarea
                                rows={3}
                                value={formData.benefits}
                                onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="What benefits does this role offer? (e.g., Health insurance, Remote work, etc.)"
                            />
                        </div>

                        {/* Application Deadline */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Application Deadline</label>
                            <input
                                type="date"
                                value={formData.application_deadline}
                                onChange={(e) => setFormData({...formData, application_deadline: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Briefcase className="w-5 h-5" />}
                                {loading ? 'Submitting...' : 'Submit for Review'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/company-profile')}
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
