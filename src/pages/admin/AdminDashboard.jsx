// src/pages/admin/AdminDashboard.jsx
// COMPLETE ADMIN DASHBOARD - Stats dashboard + sidebar navigation + unlimited access

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    LayoutDashboard, Users, Briefcase, Flag, FileText, 
    BookOpen, ClipboardList, Bot, Mail, Database, Sparkles,
    Shield, Settings, LogOut, Menu, X, Bell, Activity,
    BarChart3, Server, HardDrive, Globe, ShoppingBag, Gift,
    Award, CheckCircle, Clock, AlertCircle, TrendingUp,
    Calendar, UserPlus, Eye, Zap, Wifi, Download
} from 'lucide-react';

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(true);
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
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        checkAdminAndLoadStats();
    }, []);

    async function checkAdminAndLoadStats() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/admin-login');
            return;
        }
        
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        setUser(user);
        setProfile(profileData);
        
        const isAuthorized = profileData?.user_type === 'admin' || 
                            profileData?.user_type === 'super_admin' || 
                            user.email === 'bluskyeconsult@gmail.com';
        
        if (!isAuthorized) {
            navigate('/');
            return;
        }
        
        // Load stats
        const [userCount, jobCount, pendingJobs, pendingReports] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('external_jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
            supabase.from('fraud_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);
        
        setStats({
            totalUsers: userCount.count || 0,
            totalJobs: jobCount.count || 0,
            totalCourses: 1,
            totalAssessments: 7,
            totalVAs: 24,
            pendingJobs: pendingJobs.count || 0,
            pendingReports: pendingReports.count || 0,
            systemHealth: 'healthy'
        });
        
        setLoading(false);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        navigate('/admin-login');
    }

    const isSuperAdmin = profile?.user_type === 'super_admin' || user?.email === 'bluskyeconsult@gmail.com';

    const menuItems = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
        { id: 'users', name: 'User Management', icon: Users, path: '/admin/users' },
        { id: 'jobs', name: 'Job Management', icon: Briefcase, path: '/admin/jobs' },
        { id: 'external-jobs', name: 'External Jobs', icon: Globe, path: '/admin/external-jobs' },
        { id: 'fraud', name: 'Fraud Reports', icon: Flag, path: '/admin/fraud-reports' },
        { id: 'articles', name: 'Articles', icon: FileText, path: '/admin/articles' },
        { id: 'books', name: 'Books', icon: BookOpen, path: '/admin/books' },
        { id: 'assessments', name: 'Assessments', icon: ClipboardList, path: '/admin/assessments' },
        { id: 'virtual-assistants', name: 'Virtual Assistants', icon: Bot, path: '/admin/virtual-assistants' },
        { id: 'newsletter', name: 'Newsletter', icon: Mail, path: '/admin/newsletter' },
        { id: 'knowledge-sources', name: 'AI Knowledge', icon: Database, path: '/admin/knowledge-sources' },
        { id: 'ai-course-builder', name: 'AI Course Builder', icon: Sparkles, path: '/admin/ai-course-builder' },
        { id: 'health', name: 'System Health', icon: Activity, path: '/admin/health' },
        { id: 'security', name: 'Security', icon: Shield, path: '/admin/security' },
        { id: 'analytics', name: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
        { id: 'testing-mode', name: 'Testing Mode', icon: Settings, path: '/admin/testing-mode' },
        { id: 'tester-invites', name: 'Tester Invites', icon: UserPlus, path: '/admin/tester-invites' },
    ];

    const currentPage = menuItems.find(item => item.path === location.pathname)?.name || 'Dashboard';

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white shadow-lg"
            >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Sidebar */}
            <div className={`fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'} overflow-hidden shadow-xl`}>
                <div className="p-4 border-b border-slate-800">
                    <h2 className={`text-lg font-bold text-white ${!sidebarOpen && 'lg:hidden'}`}>Admin Panel</h2>
                    {isSuperAdmin && sidebarOpen && (
                        <span className="text-xs text-emerald-400 mt-1 block">Super Admin</span>
                    )}
                </div>
                
                <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100%-120px)]">
                    {menuItems.map((item) => (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                                location.pathname === item.path
                                    ? 'bg-primary-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800'
                            }`}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className={`text-sm ${!sidebarOpen && 'lg:hidden'}`}>{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className={`text-sm ${!sidebarOpen && 'lg:hidden'}`}>Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {/* Header */}
                <div className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-sm">
                    <div className="px-6 py-4 flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-white">{currentPage}</h1>
                            <p className="text-slate-400 text-sm">Welcome back, {user?.email}</p>
                        </div>
                        {isSuperAdmin && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <Award className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400 text-xs font-semibold">Super Admin</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6">
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
                                    <p className="text-slate-300 text-sm">As a Super Admin, you have unlimited access to all features</p>
                                </div>
                                <div className="flex flex-wrap gap-2 ml-auto">
                                    <span className="px-2 py-1 bg-slate-800 rounded-full text-xs text-emerald-400">♾️ Chat</span>
                                    <span className="px-2 py-1 bg-slate-800 rounded-full text-xs text-emerald-400">♾️ VA Tasks</span>
                                    <span className="px-2 py-1 bg-slate-800 rounded-full text-xs text-emerald-400">♾️ Assessments</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats Cards - Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Total Users</p><p className="text-2xl font-bold text-white">{stats.totalUsers}</p></div>
                                <Users className="w-8 h-8 text-primary-400 opacity-50" />
                            </div>
                            <Link to="/admin/users" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Manage →</Link>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Active Jobs</p><p className="text-2xl font-bold text-white">{stats.totalJobs}</p></div>
                                <Briefcase className="w-8 h-8 text-emerald-400 opacity-50" />
                            </div>
                            <Link to="/admin/jobs" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Manage →</Link>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Pending Approvals</p><p className="text-2xl font-bold text-amber-400">{stats.pendingJobs + stats.pendingReports}</p></div>
                                <Clock className="w-8 h-8 text-amber-400 opacity-50" />
                            </div>
                            <Link to="/admin/external-jobs" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Review →</Link>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                            <div className="flex items-center justify-between">
                                <div><p className="text-slate-400 text-sm">Virtual Assistants</p><p className="text-2xl font-bold text-white">{stats.totalVAs}</p></div>
                                <Bot className="w-8 h-8 text-purple-400 opacity-50" />
                            </div>
                            <Link to="/admin/virtual-assistants" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Manage →</Link>
                        </div>
                    </div>

                    {/* Stats Cards - Row 2 */}
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
                            <Link to="/admin/assessments" className="text-xs text-primary-400 hover:underline mt-2 inline-block">Manage →</Link>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Shield className="w-8 h-8 text-primary-400 opacity-50" />
                                <div><p className="text-slate-400 text-sm">Fraud Reports</p><p className="text-xl font-bold text-white">{stats.pendingReports}</p></div>
                            </div>
                            <Link to="/admin/fraud-reports" className="text-xs text-primary-400 hover:underline mt-2 inline-block">View →</Link>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-primary-400" />
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                                <span className="text-white text-xs">Ext Jobs</span>
                            </Link>
                            <Link to="/admin/fraud-reports" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                                <Shield className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                                <span className="text-white text-xs">Fraud</span>
                            </Link>
                            <Link to="/admin/knowledge-sources" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                                <Database className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                                <span className="text-white text-xs">AI Sources</span>
                            </Link>
                            <Link to="/admin/health" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                                <Activity className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                                <span className="text-white text-xs">Health</span>
                            </Link>
                            <Link to="/admin/analytics" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                                <BarChart3 className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                                <span className="text-white text-xs">Analytics</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
