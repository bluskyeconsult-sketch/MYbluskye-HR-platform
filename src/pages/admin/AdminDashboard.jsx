// src/pages/admin/AdminDashboard.jsx   (App.jsx imports it from ./pages/admin/AdminDashboard)
// COMPLETE ADMIN DASHBOARD
//
// FIXED (2026-08-07):
// 1. Removed a hardcoded admin-email backdoor (bluskyeconsult@gmail.com) —
//    the third instance of this pattern found across the codebase, and the
//    most serious: this one gated the ENTIRE admin dashboard by exact email
//    match instead of checking profiles.user_type like everywhere else,
//    completely bypassing the database-driven role system (and the
//    App.jsx ProtectedRoute requireAdmin wrapper this page is already
//    rendered inside of). Now checks user_type, consistent with the rest
//    of the platform.
// 2. totalCourses, totalAssessments, and totalVAs were hardcoded (1, 7, 24)
//    and never actually queried, despite courses/assessments counts being
//    trivially available. Fixed to real queries.
//
// FIXED (2026-08-21): totalVAs had been left hardcoded to 6 (a stopgap
// from before the VA Architecture Unification made virtual_assistants a
// real table) even after that fix shipped. Now queries the real table —
// confirmed 46 VAs live as of 2026-08-20, no longer a fixed number.
//
// FLAGGED, NOT FIXED: three Quick Links point to routes that don't exist
// anywhere in App.jsx — /admin/tester-feedback, /admin/tester-invites,
// /admin/diagnostics. Building three new admin pages is out of scope for a
// bug fix — left in place, flagged for a decision on whether to build them
// or remove the links.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { authenticatedFetch } from '../../lib/authFetch';
import { useGovernance } from '../../contexts/GovernanceContext';
import PlatformCapacityWidget from '../../components/admin/PlatformCapacityWidget';
import { 
    Users, Briefcase, BookOpen, ClipboardList, Bot, Mail, 
    Database, Sparkles, BarChart3, Shield, Settings, TrendingUp,
    Clock, CheckCircle, XCircle, AlertCircle, Eye, ShieldAlert, DollarSign
} from 'lucide-react';

export default function AdminDashboard() {
    // NEW (2026-08-08): Enforcement Mode toggle. The backend logic for this
    // already existed in full in GovernanceContext.jsx (loading/saving
    // system_config.enforcement_mode, gating changes to canGovern/
    // super_admin) — the only missing piece was ever having a UI to click
    // it. A real logic bug in that backend (observe and block modes
    // producing identical results) was also fixed alongside this.
    const { enforcementMode, setEnforcement, capabilities } = useGovernance();
    const [changingMode, setChangingMode] = useState(false);

    async function handleToggleEnforcement() {
        const newMode = enforcementMode === 'block' ? 'observe' : 'block';
        const confirmMsg = newMode === 'observe'
            ? 'Switch to Observe mode? Every tier-gated action across the site will be ALLOWED for every user, regardless of their tier — only logged, not blocked. Use this to test a new capability matrix safely.'
            : 'Switch to Block mode? Tier-gated actions will be enforced normally again.';
        if (!confirm(confirmMsg)) return;

        setChangingMode(true);
        try {
            await setEnforcement(newMode);
        } catch (err) {
            alert(err.message || 'Failed to change enforcement mode');
        } finally {
            setChangingMode(false);
        }
    }

    // UPDATED (2026-11-11): ONE testing switch. Testing ON = every plan can be tried free (tester caps apply).
    // Announce an end date (everyone on a testing plan is told to subscribe) or press End testing now: testing switches
    // OFF and everyone who has not paid moves to the free Registered level. All the logic lives in the database
    // (SQL 58); this card only calls it (Super Admin only).
    const [testing, setTesting] = useState(null);          // { enabled, end_date, on_testing_plans, paying }
    const [testingError, setTestingError] = useState('');
    const [changingTesting, setChangingTesting] = useState(false);
    const [testingEndInput, setTestingEndInput] = useState('');

    useEffect(() => { loadTestingStatus(); }, []);

    async function loadTestingStatus() {
        try {
            const data = await authenticatedFetch('admin-testing-period', { op: 'status' });
            setTesting(data.status);
            setTestingEndInput(data.status?.end_date || '');
            setTestingError('');
        } catch (err) {
            setTestingError(err.message || 'Could not load the testing status.');
        }
    }

    async function runTestingAction(op, extra, confirmMsg) {
        if (confirmMsg && !confirm(confirmMsg)) return;
        setChangingTesting(true);
        try {
            const data = await authenticatedFetch('admin-testing-period', { op, ...(extra || {}) });
            setTesting(data.status);
            setTestingEndInput(data.status?.end_date || '');
            setTestingError('');
            if (op === 'schedule' && data.result) {
                alert(data.result.end_date ? 'End date saved. ' + data.result.notified + ' people were notified.' : 'End date cleared.');
            }
            if (op === 'end-now' && data.result) alert('Testing has ended. ' + data.result.downgraded + ' account(s) moved to the free Registered level.');
        } catch (err) {
            alert('Not changed: ' + err.message);
        } finally {
            setChangingTesting(false);
        }
    }

    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalJobs: 0,
        totalCourses: 0,
        totalAssessments: 0,
        totalVAs: 0,
        pendingJobs: 0,
        pendingApprovals: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAdminAndLoadStats();
    }, []);

    async function checkAdminAndLoadStats() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/admin-login';
                return;
            }

            // FIXED: real database check instead of a hardcoded email.
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', user.id)
                .single();

            const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
            if (!isAdmin) {
                window.location.href = '/dashboard';
                return;
            }
            setUser(user);

            // FIXED: real queries for courses/assessments, replacing
            // hardcoded fake numbers.
            // FIXED (2026-08-21): totalVAs was still hardcoded to 6 here,
            // left over from before the VA Architecture Unification
            // (2026-08-07) made virtual_assistants a real, database-backed
            // catalog. Confirmed 46 VAs live on /hire-va as of 2026-08-20 —
            // this file just never got the follow-up query. Added one,
            // matching the pattern already used for courses/assessments.
            const [userCountRes, jobCountRes, pendingJobsRes, courseCountRes, assessmentCountRes, vaCountRes] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('external_jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
                supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
                supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('virtual_assistants').select('*', { count: 'exact', head: true }).eq('is_active', true)
            ]);

            setStats({
                totalUsers: userCountRes.count || 0,
                totalJobs: jobCountRes.count || 0,
                totalCourses: courseCountRes.count || 0,
                totalAssessments: assessmentCountRes.count || 0,
                totalVAs: vaCountRes.count || 0,
                pendingJobs: pendingJobsRes.count || 0,
                pendingApprovals: 0
            });
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-slate-400">Welcome back, {user?.email}</p>
                </div>

                {/* NEW (2026-09-11): platform capacity tracking - shows
                    real usage against Supabase's actual free-tier
                    limits, prompting an upgrade recommendation at a
                    safe 70% threshold. */}
                <div className="mb-8">
                    <PlatformCapacityWidget />
                </div>

                {/* Enforcement Mode Toggle */}
                <div className={`mb-8 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    enforcementMode === 'observe'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-slate-900/50 border-slate-800'
                }`}>
                    <div className="flex items-center gap-3">
                        {enforcementMode === 'observe' ? (
                            <Eye className="w-6 h-6 text-amber-400 flex-shrink-0" />
                        ) : (
                            <ShieldAlert className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                        )}
                        <div>
                            <p className="text-white font-semibold">
                                Enforcement Mode: <span className={enforcementMode === 'observe' ? 'text-amber-400' : 'text-emerald-400'}>
                                    {enforcementMode === 'observe' ? 'Observe' : 'Block'}
                                </span>
                            </p>
                            <p className="text-slate-400 text-sm">
                                {enforcementMode === 'observe'
                                    ? 'Tier-gated actions are currently allowed for everyone — only logged, not blocked.'
                                    : 'Tier-gated actions are being enforced normally.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleEnforcement}
                        disabled={changingMode || !capabilities?.canGovern}
                        title={!capabilities?.canGovern ? 'Only super_admin can change enforcement mode' : ''}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                            enforcementMode === 'observe'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-amber-600 text-white hover:bg-amber-700'
                        }`}
                    >
                        {changingMode ? 'Changing...' : enforcementMode === 'observe' ? 'Switch to Block' : 'Switch to Observe'}
                    </button>
                </div>

                {/* ONE testing switch (replaces Free Access Mode, Testing Mode, Promo Mode and the end-date setting).
                    While ON, plans are free to try. Ending it (date or button) moves everyone who has not paid to the
                    free Registered level. */}
                <div className={`mb-8 p-4 rounded-xl border ${testing?.enabled ? 'bg-sky-500/10 border-sky-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <DollarSign className={`w-6 h-6 flex-shrink-0 mt-0.5 ${testing?.enabled ? 'text-sky-400' : 'text-slate-500'}`} />
                            <div>
                                <p className="text-white font-semibold">
                                    Testing period: <span className={testing?.enabled ? 'text-sky-400' : 'text-slate-400'}>
                                        {testing === null ? '...' : testing.enabled ? 'ON — plans are free to try' : 'OFF — real pricing applies'}
                                    </span>
                                </p>
                                {testingError && <p className="text-amber-400 text-sm mt-1">{testingError} (Only a Super Admin can see and change this.)</p>}
                                {testing && (
                                    <p className="text-slate-400 text-sm mt-1">
                                        {testing.on_testing_plans} on a testing plan, {testing.paying} paying.
                                        {testing.enabled && testing.end_date ? ' Ends on ' + testing.end_date + '.' : ''}
                                    </p>
                                )}
                                {testing?.enabled && (
                                    <label className="flex flex-wrap items-center gap-2 mt-2 text-slate-300 text-sm">
                                        Testing ends on:
                                        <input type="date" value={testingEndInput} onChange={(e) => setTestingEndInput(e.target.value)}
                                            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm" />
                                        <button disabled={changingTesting}
                                            onClick={() => runTestingAction('schedule', { date: testingEndInput || '' },
                                                testingEndInput
                                                    ? 'Announce that testing ends on ' + testingEndInput + '? Everyone on a testing plan is notified now to subscribe to keep their plan, and reminded 14 and 3 days before. On that date everyone who has not paid moves to the free Registered level.'
                                                    : 'Clear the end date?')}
                                            className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm disabled:opacity-50">
                                            {testingEndInput ? 'Announce end date' : 'Clear end date'}
                                        </button>
                                    </label>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                            {testing && !testing.enabled && (
                                <button disabled={changingTesting}
                                    onClick={() => runTestingAction('start', null, 'Start the testing period? Plans become free to try again (tester caps apply). Anyone you moved to Registered stays there until they choose a plan.')}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50">
                                    {changingTesting ? 'Working...' : 'Start testing period'}
                                </button>
                            )}
                            {testing?.enabled && (
                                <button disabled={changingTesting}
                                    onClick={() => runTestingAction('end-now', null, 'END TESTING NOW? Testing switches OFF immediately. Everyone who has not paid (' + testing.on_testing_plans + ' people) moves to the free Registered level, loses their plan, tester status and spare credits, and is notified. People who paid keep their plan. This cannot be undone automatically.')}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                                    {changingTesting ? 'Working...' : 'End testing now'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Users</p>
                                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                            </div>
                            <Users className="w-8 h-8 text-primary-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                {/* FIXED (2026-09-16): confirmed this
                                    and System Health's job count are
                                    genuinely different, honest metrics
                                    - this counts all is_active jobs,
                                    System Health additionally requires
                                    compliance_status = 'approved'.
                                    Clarified rather than leaving both
                                    labeled simply "Jobs" with no
                                    distinction. */}
                                <p className="text-slate-400 text-sm">Active Jobs (all)</p>
                                <p className="text-2xl font-bold text-white">{stats.totalJobs}</p>
                            </div>
                            <Briefcase className="w-8 h-8 text-emerald-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Pending Approvals</p>
                                <p className="text-2xl font-bold text-white">{stats.pendingJobs}</p>
                            </div>
                            <Clock className="w-8 h-8 text-amber-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Virtual Assistants</p>
                                <p className="text-2xl font-bold text-white">{stats.totalVAs}</p>
                            </div>
                            <Bot className="w-8 h-8 text-purple-400 opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Quick Actions - New Admin Features */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        <Link to="/admin/assessments" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <ClipboardList className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Assessments</span>
                        </Link>
                        <Link to="/admin/virtual-assistants" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Bot className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Virtual Asst</span>
                        </Link>
                        <Link to="/admin/newsletter" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Mail className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Newsletter</span>
                        </Link>
                        <Link to="/admin/knowledge-sources" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Database className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">AI Sources</span>
                        </Link>
                        <Link to="/admin/books" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <BookOpen className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Books</span>
                        </Link>
                        <Link to="/admin/ai-course-builder" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Sparkles className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">AI Course</span>
                        </Link>
                        {/* NEW (2026-08-09): AffiliateManagement.jsx and
                            UsageMeter.jsx were built as real features but
                            never wired to a route or nav link — added here
                            so they're actually reachable. */}
                        <Link to="/admin/affiliate-management" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Users className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Affiliates</span>
                        </Link>
                        <Link to="/admin/usage-meter" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <TrendingUp className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Usage Meter</span>
                        </Link>
                        <Link to="/admin/audit" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Shield className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Audit Logs</span>
                        </Link>
                        <Link to="/admin/employer-verification" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Briefcase className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Employer Verify</span>
                        </Link>
                        <Link to="/admin/opportunity-gaps" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Sparkles className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Opportunity Gaps</span>
                        </Link>
                        <Link to="/admin/refund-requests" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <DollarSign className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Refund Requests</span>
                        </Link>
                        <Link to="/admin/member-engagement" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Users className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Member Engagement</span>
                        </Link>
                        <Link to="/admin/invitations" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Mail className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">Invite People</span>
                        </Link>
                        <Link to="/admin/health" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition group">
                            <Shield className="w-6 h-6 text-primary-400 mx-auto mb-2 group-hover:scale-110 transition" />
                            <span className="text-white text-sm">System Health</span>
                        </Link>
                    </div>
                </div>

                {/* Main Admin Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Management */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary-400" />
                                User Management
                            </h3>
                            <div className="space-y-2">
                                <Link to="/admin/users" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Manage Users</p>
                                    <p className="text-slate-400 text-sm">View, edit, and moderate user accounts</p>
                                </Link>
                                {/* NOTE: the two links below point to routes not
                                    registered in App.jsx — they currently 404.
                                    Left in place pending a decision on whether to
                                    build these pages or remove the links. */}
                                <Link to="/admin/tester-feedback" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Tester Feedback</p>
                                    <p className="text-slate-400 text-sm">Review tester feedback and suggestions</p>
                                </Link>
                                <Link to="/admin/tester-invites" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Tester Invites</p>
                                    <p className="text-slate-400 text-sm">Generate invite codes for testers</p>
                                </Link>
                            </div>
                        </div>
                        
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-primary-400" />
                                Job Management
                            </h3>
                            <div className="space-y-2">
                                <Link to="/admin/jobs" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Manage Jobs</p>
                                    <p className="text-slate-400 text-sm">Approve, edit, or remove job listings</p>
                                </Link>
                                <Link to="/admin/external-jobs" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">External Jobs</p>
                                    <p className="text-slate-400 text-sm">Review and approve external job submissions</p>
                                </Link>
                                <Link to="/admin/skills" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Skill Verification</p>
                                    <p className="text-slate-400 text-sm">Review and verify user skills</p>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Content & System */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary-400" />
                                Content Management
                            </h3>
                            <div className="space-y-2">
                                <Link to="/admin/articles" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Manage Articles</p>
                                    <p className="text-slate-400 text-sm">Create, edit, and publish articles</p>
                                </Link>
                                <Link to="/admin/books" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Manage Books</p>
                                    <p className="text-slate-400 text-sm">Add, edit, or remove books</p>
                                </Link>
                                <Link to="/admin/assessments" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Manage Assessments</p>
                                    <p className="text-slate-400 text-sm">Create and edit assessments with AI</p>
                                </Link>
                            </div>
                        </div>
                        
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-primary-400" />
                                System & Configuration
                            </h3>
                            <div className="space-y-2">
                                <Link to="/admin/analytics" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Analytics</p>
                                    <p className="text-slate-400 text-sm">View platform analytics and metrics</p>
                                </Link>
                                <Link to="/admin/security" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Security Dashboard</p>
                                    <p className="text-slate-400 text-sm">Monitor security events and alerts</p>
                                </Link>
                                {/* NOTE: not a registered route — see header comment */}
                                <Link to="/admin/diagnostics" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Diagnostics</p>
                                    <p className="text-slate-400 text-sm">Run system health checks</p>
                                </Link>
                                <Link to="/admin/email-test" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">Email Test</p>
                                    <p className="text-slate-400 text-sm">Test email configuration</p>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Status */}
                <div className="mt-8 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span className="text-white font-semibold">System Status: Operational</span>
                    </div>
                    <div className="text-xs text-slate-500">
                        Last checked: {new Date().toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
}
