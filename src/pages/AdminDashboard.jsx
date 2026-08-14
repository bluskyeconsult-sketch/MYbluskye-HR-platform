// src/pages/AdminDashboard.jsx
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
//    trivially available. Fixed to real queries where a real table exists;
//    VAs have no database table (confirmed — a hardcoded array in
//    api/index.js), so that count now reflects the real array length (6)
//    instead of an arbitrary number.
//
// FLAGGED, NOT FIXED: three Quick Links point to routes that don't exist
// anywhere in App.jsx — /admin/tester-feedback, /admin/tester-invites,
// /admin/diagnostics. Building three new admin pages is out of scope for a
// bug fix — left in place, flagged for a decision on whether to build them
// or remove the links.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGovernance } from '../contexts/GovernanceContext';
import { 
    Users, Briefcase, BookOpen, ClipboardList, Bot, Mail, 
    Database, Sparkles, BarChart3, Shield, Settings, TrendingUp,
    Clock, CheckCircle, XCircle, AlertCircle, Eye, ShieldAlert
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

    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalJobs: 0,
        totalCourses: 0,
        totalAssessments: 0,
        totalVAs: 6,
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
            const [userCountRes, jobCountRes, pendingJobsRes, courseCountRes, assessmentCountRes] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('external_jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
                supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
                supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('is_active', true)
            ]);

            setStats({
                totalUsers: userCountRes.count || 0,
                totalJobs: jobCountRes.count || 0,
                totalCourses: courseCountRes.count || 0,
                totalAssessments: assessmentCountRes.count || 0,
                // No VA database table exists — this reflects the real
                // hardcoded catalog length in api/index.js's
                // 'virtual-assistants' handler, not a query.
                totalVAs: 6,
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
                                <p className="text-slate-400 text-sm">Active Jobs</p>
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
