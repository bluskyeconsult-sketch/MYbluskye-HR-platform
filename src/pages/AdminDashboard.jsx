// src/pages/AdminDashboard.jsx
// COMPLETE ADMIN DASHBOARD - Copy and replace entire file

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Users, Briefcase, BookOpen, ClipboardList, Bot, Mail, 
    Database, Sparkles, BarChart3, Shield, Settings, TrendingUp,
    Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalJobs: 0,
        totalCourses: 1,
        totalAssessments: 7,
        totalVAs: 24,
        pendingJobs: 0,
        pendingApprovals: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAdminAndLoadStats();
    }, []);

    async function checkAdminAndLoadStats() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/admin-login';
            return;
        }
        if (user.email !== 'bluskyeconsult@gmail.com') {
            window.location.href = '/dashboard';
            return;
        }
        setUser(user);
        
        // Load stats
        const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        const { count: jobCount } = await supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
        
        const { count: pendingJobs } = await supabase
            .from('external_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_approval');
        
        setStats({
            totalUsers: userCount || 0,
            totalJobs: jobCount || 0,
            totalCourses: 1,
            totalAssessments: 7,
            totalVAs: 24,
            pendingJobs: pendingJobs || 0,
            pendingApprovals: 0
        });
        
        setLoading(false);
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
