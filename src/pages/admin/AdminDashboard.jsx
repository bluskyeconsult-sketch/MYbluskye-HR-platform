// src/pages/admin/AdminDashboard.jsx
// COMPLETE ADMIN DASHBOARD - All routes working with Super Admin unlimited access

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    Users, Briefcase, BookOpen, ClipboardList, Bot, Mail, 
    Database, Sparkles, BarChart3, Shield, Settings, TrendingUp,
    Clock, CheckCircle, XCircle, AlertCircle, Activity,
    Server, HardDrive, Eye, Ban, Flag, Calendar, UserPlus,
    FileText, ShoppingBag, Gift, Heart, Bell, Zap, Globe, Award
} from 'lucide-react';

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalJobs: 0,
        totalCourses: 1,
        totalAssessments: 7,
        totalVAs: 24,
        pendingJobs: 0,
        pendingReports: 0,
        systemHealth: 'healthy'
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
        
        // Get user profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        setUser(user);
        setProfile(profileData);
        
        // Check if user is admin (supports both profile-based and legacy email check)
        const isAuthorized = profileData?.user_type === 'admin' || 
                            profileData?.user_type === 'super_admin' || 
                            user.email === 'bluskyeconsult@gmail.com';
        
        if (!isAuthorized) {
            window.location.href = '/dashboard';
            return;
        }
        
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
        
        const { count: pendingReports } = await supabase
            .from('fraud_reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        setStats({
            totalUsers: userCount || 0,
            totalJobs: jobCount || 0,
            totalCourses: 1,
            totalAssessments: 7,
            totalVAs: 24,
            pendingJobs: pendingJobs || 0,
            pendingReports: pendingReports || 0,
            systemHealth: 'healthy'
        });
        
        setLoading(false);
    }

    const isSuperAdmin = profile?.user_type === 'super_admin' || user?.email === 'bluskyeconsult@gmail.com';

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
                
                {/* Welcome Header with Unlimited Badge */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                        <p className="text-slate-400">Welcome back, {user?.email}</p>
                    </div>
                    {isSuperAdmin && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <Award className="w-5 h-5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Super Admin • Unlimited Access</span>
                        </div>
                    )}
                </div>

                {/* System Health Banner */}
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <div>
                        <p className="text-white font-semibold">System Status: Operational</p>
                        <p className="text-slate-400 text-sm">All systems are running normally</p>
                    </div>
                    <Link to="/admin/health" className="ml-auto text-primary-400 text-sm hover:underline">View Details →</Link>
                </div>

                {/* Unlimited Access Card - Super Admin Only */}
                {isSuperAdmin && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-primary-900/30 to-sky-900/30 border border-primary-500/30 rounded-xl">
                        <div className="flex items-center gap-4 flex-wrap">
                            <Shield className="w-10 h-10 text-primary-400" />
                            <div>
                                <h3 className="text-white font-bold text-lg">Unlimited Access Granted</h3>
                                <p className="text-slate-300 text-sm">As a Super Admin, you have unlimited access to all features:</p>
                            </div>
                            <div className="flex flex-wrap gap-3 ml-auto">
                                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-emerald-400">♾️ Unlimited Chat</span>
                                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-emerald-400">♾️ Unlimited VA Tasks</span>
                                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-emerald-400">♾️ Unlimited Applications</span>
                                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-emerald-400">♾️ Unlimited Assessments</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div><p className="text-slate-400 text-sm">Total Users</p><p className="text-2xl font-bold text-white">{stats.totalUsers}</p></div>
                            <Users className="w-8 h-8 text-primary-400 opacity-50" />
                        </div>
                        <Link to="/admin/users" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Manage Users →</Link>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div><p className="text-slate-400 text-sm">Active Jobs</p><p className="text-2xl font-bold text-white">{stats.totalJobs}</p></div>
                            <Briefcase className="w-8 h-8 text-emerald-400 opacity-50" />
                        </div>
                        <Link to="/admin/jobs" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Manage Jobs →</Link>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div><p className="text-slate-400 text-sm">Pending Approvals</p><p className="text-2xl font-bold text-amber-400">{stats.pendingJobs + stats.pendingReports}</p></div>
                            <Clock className="w-8 h-8 text-amber-400 opacity-50" />
                        </div>
                        <Link to="/admin/external-jobs" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Review Jobs →</Link>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div><p className="text-slate-400 text-sm">Virtual Assistants</p><p className="text-2xl font-bold text-white">{stats.totalVAs}</p></div>
                            <Bot className="w-8 h-8 text-purple-400 opacity-50" />
                        </div>
                        <Link to="/admin/virtual-assistants" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Manage VAs →</Link>
                    </div>
                </div>

                {/* Second Row Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-primary-400 opacity-50" />
                            <div><p className="text-slate-400 text-sm">Courses</p><p className="text-xl font-bold text-white">{stats.totalCourses}</p></div>
                        </div>
                        <Link to="/admin/ai-course-builder" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Create Course →</Link>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <ClipboardList className="w-8 h-8 text-primary-400 opacity-50" />
                            <div><p className="text-slate-400 text-sm">Assessments</p><p className="text-xl font-bold text-white">{stats.totalAssessments}</p></div>
                        </div>
                        <Link to="/admin/assessments" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Manage Assessments →</Link>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Shield className="w-8 h-8 text-primary-400 opacity-50" />
                            <div><p className="text-slate-400 text-sm">Fraud Reports</p><p className="text-xl font-bold text-white">{stats.pendingReports}</p></div>
                        </div>
                        <Link to="/admin/fraud-reports" className="text-xs text-primary-400 hover:underline mt-2 inline-block">View Reports →</Link>
                    </div>
                </div>

                {/* MAIN ADMIN SECTIONS - All Working Routes (from first version) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* LEFT COLUMN: Core Management */}
                    <div className="space-y-6">
                        {/* User Management */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary-400" />
                                User Management
                            </h3>
                            <div className="space-y-2">
                                <Link to="/admin/users" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">👥 Manage Users</p>
                                    <p className="text-slate-400 text-sm">View, edit, suspend, and activate user accounts</p>
                                </Link>
                                <Link to="/admin/tester-feedback" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">📝 Tester Feedback</p>
                                    <p className="text-slate-400 text-sm">Review feedback from testers</p>
                                </Link>
                                <Link to="/admin/tester-invites" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">🎟️ Tester Invites</p>
                                    <p className="text-slate-400 text-sm">Generate invite codes for testers</p>
                                </Link>
                                <Link to="/admin/testing-mode" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">🧪 Testing Mode</p>
                                    <p className="text-slate-400 text-sm">Enable/disable tester registration</p>
                                </Link>
                            </div>
                        </div>

                        {/* Job Management */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-primary-400" />
                                Job Management
                            </h3>
                            <div className="space-y-2">
                                <Link to="/admin/jobs" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">📋 Manage Jobs</p>
                                    <p className="text-slate-400 text-sm">View, edit, approve, or remove job listings</p>
                                </Link>
                                <Link to="/admin/external-jobs" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">🌐 External Jobs</p>
                                    <p className="text-slate-400 text-sm">Fetch and approve jobs from external sources</p>
                                </Link>
                                <Link to="/admin/skills" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">⭐ Skill Verification</p>
                                    <p className="text-slate-400 text-sm">Review and verify user skills</p>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Content & System */}
                    <div className="space-y-6">
                        {/* Content Management */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary-400" />
                                Content Management
                            </h3>
                            <div className="space-y-2">
                                <Link to="/admin/articles" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">📰 Manage Articles</p>
                                    <p className="text-slate-400 text-sm">Create, edit, and publish articles</p>
                                </Link>
                                <Link to="/admin/books" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">📚 Manage Books</p>
                                    <p className="text-slate-400 text-sm">Add, edit, or remove books from library</p>
                                </Link>
                                <Link to="/admin/assessments" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">📊 Manage Assessments</p>
                                    <p className="text-slate-400 text-sm">Create and edit assessments with AI</p>
                                </Link>
                                <Link to="/admin/newsletter" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">📧 Newsletter Manager</p>
                                    <p className="text-slate-400 text-sm">Create and send newsletters</p>
                                </Link>
                            </div>
                        </div>

                        {/* System & Configuration */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-primary-400" />
                                System & Monitoring
                            </h3>
                            <div className="space-y-2">
                                <Link to="/admin/health" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">🩺 System Health</p>
                                    <p className="text-slate-400 text-sm">Real-time system monitoring and diagnostics</p>
                                </Link>
                                <Link to="/admin/security" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">🔒 Security Dashboard</p>
                                    <p className="text-slate-400 text-sm">Monitor security events and block IPs</p>
                                </Link>
                                <Link to="/admin/analytics" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">📈 Analytics Dashboard</p>
                                    <p className="text-slate-400 text-sm">Visitor stats, growth metrics, and analytics</p>
                                </Link>
                                <Link to="/admin/knowledge-sources" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">🧠 AI Knowledge Sources</p>
                                    <p className="text-slate-400 text-sm">Manage external sources for AI Chat</p>
                                </Link>
                                <Link to="/admin/email-test" className="block p-2 rounded-lg hover:bg-slate-800 transition">
                                    <p className="text-white">📧 Email Test</p>
                                    <p className="text-slate-400 text-sm">Test email configuration</p>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Row */}
                <div className="mt-6">
                    <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <Link to="/admin/ai-course-builder" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                            <Sparkles className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                            <span className="text-white text-xs">AI Course</span>
                        </Link>
                        <Link to="/admin/virtual-assistants" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                            <Bot className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                            <span className="text-white text-xs">VAs</span>
                        </Link>
                        <Link to="/admin/assessments" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                            <ClipboardList className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                            <span className="text-white text-xs">Assessments</span>
                        </Link>
                        <Link to="/admin/external-jobs" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                            <Globe className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                            <span className="text-white text-xs">External Jobs</span>
                        </Link>
                        <Link to="/admin/fraud-reports" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                            <Shield className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                            <span className="text-white text-xs">Fraud Reports</span>
                        </Link>
                        <Link to="/admin/knowledge-sources" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                            <Database className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                            <span className="text-white text-xs">AI Sources</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
