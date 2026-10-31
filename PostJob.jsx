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

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { apiCall } from '../../services/appraisalApi';
import { Loader2, Briefcase, CreditCard } from 'lucide-react';

// REWRITTEN (2026-10-23): the server now decides who may post. The plan check and the 20-a-month limit used to run in this
// page only, and the database accepted direct inserts, so they could be skipped. Now:
//   - Business and admins post freely; Employer posts up to 20 a month, then may spend a job-post credit.
//   - Anyone else buys a job-post credit (one credit = one post). Credits never expire and come back if a post is rejected.
// Every post still goes in as "pending review" and is not shown on the board until it is approved.

export default function PostJob() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [info, setInfo] = useState(null);
    const [err, setErr] = useState('');
    const [ok, setOk] = useState('');
    const [confirm, setConfirm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        location: '',
        job_type: 'full-time',
        is_remote: false,
        salary_min: '',
        salary_max: '',
        description: '',
        requirements: '',
        benefits: '',
        application_deadline: '',
        is_active: true
    });

    const loadInfo = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/sign-in?redirect=/post-job'); return; }
        try { setInfo(await apiCall('job-post-info', {}, { auth: 'required' })); } catch (e) { setErr(e.message); }
        setCheckingAccess(false);
    }, [navigate]);

    useEffect(() => {
        loadInfo();
        const q = new URLSearchParams(window.location.search).get('credits');
        if (q === 'added') setOk('Payment received. Your job-post credit will show here within a few seconds.');
        if (q === 'cancelled') setErr('The payment was cancelled. You have not been charged.');
    }, [loadInfo]);

    const buy = async (count) => {
        setErr(''); setOk('');
        try { const r = await apiCall('job-post-credits-checkout', { count }, { auth: 'required' }); window.location.href = r.url; }
        catch (e) {
            // The country check could not tell where you are: ask for it rather than showing a bare refusal.
            setErr(e.data?.gate?.needs_country ? 'We could not work out which country you are in. Please set your country in your profile settings, then try again.' : e.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setErr(''); setOk('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/sign-in'); return; }

            // The server checks the plan, the monthly limit and credits, then saves the job as pending review.
            const r = await apiCall('job-post-create', { ...formData, confirm }, { auth: 'required' });

            // Silent, best-effort bonus check: links the account to a verified sponsor record when the company name matches.
            try {
                const { data: { session } } = await supabase.auth.getSession();
                await fetch('/api/index?action=check-employer-sponsor-match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ userId: user.id, companyName: formData.company })
                });
            } catch { /* a bonus check, never a blocker */ }

            // Fire-and-forget activity log; never blocks posting.
            supabase.auth.getSession().then(({ data }) => fetch('/api/index?action=log-user-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session?.access_token}` },
                body: JSON.stringify({ userId: user.id, userEmail: user.email, actionType: 'job_posted', details: { jobId: r.job_id, title: formData.title } })
            })).catch(() => {});

            // Honest wording: the job is not live yet.
            alert('Job submitted for review! It will appear on the job board once approved.' + (r.used_credit ? ` You have ${r.credits} job-post credit${r.credits === 1 ? '' : 's'} left.` : ''));
            navigate('/manage-jobs');
        } catch (error) {
            setErr(error.message || 'Failed to post job. Please try again.');
            await loadInfo();
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

    const canPost = info?.via === 'plan' || info?.via === 'credit';
    const money = (c) => `$${(c / 100).toFixed(2)}`;

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 md:p-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Post a New Job</h1>
                    <p className="text-slate-400 mb-6">Fill in the details below to reach qualified candidates</p>

                    {err && <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{err}</div>}
                    {ok && <div className="mb-4 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">{ok}</div>}

                    {info && (
                        <div className="mb-6 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                            <h2 className="text-white font-medium mb-1 inline-flex items-center gap-1"><CreditCard className="w-4 h-4" />How this post is paid for</h2>
                            {info.via === 'plan' && <p className="text-sm text-slate-300">{info.monthly ? `Included in your Employer plan: ${info.monthly.used} of ${info.monthly.limit} posts used this month.` : 'Included in your plan.'}</p>}
                            {info.via === 'credit' && <p className="text-sm text-slate-300">{info.monthly ? `You have used your ${info.monthly.limit} posts for this month, so this post will use one job-post credit.` : 'This post will use one job-post credit.'} You have {info.credits} credit{info.credits === 1 ? '' : 's'}.</p>}
                            {info.via === 'none' && <p className="text-sm text-amber-200">{info.tier === 'employer' ? `You have used your ${info.monthly?.limit || 20} posts for this month. Buy a single post below, or move to the Business plan for unlimited posts.` : 'Posting a job costs one job-post credit. Buy one below. If you hire often, the Employer plan (20 posts a month) works out cheaper if you post more than about eight jobs in a month.'}</p>}
                            <p className="text-xs text-slate-400 mt-1">A job stays on the board for up to {info.live_days} days (or until your closing date). Every job is checked before it goes live, and if a job is rejected the credit comes back.</p>
                            {(info.via !== 'plan') && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {info.packs.map(p => (
                                        <button key={p.count} type="button" onClick={() => buy(p.count)} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm">
                                            Buy {p.count} post{p.count === 1 ? '' : 's'} for {money(p.cents)}{p.count > 1 ? ` (${money(p.cents / p.count)} each)` : ''}
                                        </button>))}
                                    <Link to="/pricing" className="px-3 py-2 text-sm text-primary-300 underline">See plans</Link>
                                </div>)}
                        </div>)}

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
                                    <option value="full-time">Full Time</option>
                                    <option value="part-time">Part Time</option>
                                    <option value="contract">Contract</option>
                                    <option value="freelance">Freelance</option>
                                    <option value="internship">Internship</option>
                                </select>
                                <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                                    <input type="checkbox" checked={!!formData.is_remote} onChange={(e) => setFormData({...formData, is_remote: e.target.checked})} />
                                    Remote or hybrid friendly
                                </label>
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

                        <label className="flex items-start gap-2 text-sm text-slate-300">
                            <input type="checkbox" className="mt-1" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
                            This is a genuine vacancy, and I am allowed to advertise it for this company.
                        </label>

                        {/* Submit Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading || !canPost || !confirm}
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
