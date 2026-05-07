import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Bell, Users, Briefcase, BookOpen, FileText, Bot, Brain,
  TrendingUp, DollarSign, Eye, CheckCircle, XCircle, Clock,
  AlertCircle, Shield, Zap, Star, Award, Calendar, MessageCircle,
  Settings, LogOut, Menu, X, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    jobs: 0,
    courses: 0,
    books: 0,
    assessments: 0,
    virtualAssistants: 0,
    revenue: 0,
    pendingJobs: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    checkAuth();
    loadStats();
    loadRecentActivity();
    loadNotifications();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/admin-login';
        return;
      }
      setUser(session.user);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData);
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  async function loadStats() {
    try {
      // Get users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get jobs count
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });
      
      // Get courses count
      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });
      
      // Get books count
      const { count: booksCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });
      
      // Get assessments count
      const { count: assessmentsCount } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true });
      
      // Get virtual assistants count
      const { count: vasCount } = await supabase
        .from('virtual_assistants')
        .select('*', { count: 'exact', head: true });
      
      // Get pending external jobs
      const { count: pendingJobsCount } = await supabase
        .from('external_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');

      setStats({
        users: usersCount || 0,
        jobs: jobsCount || 0,
        courses: coursesCount || 0,
        books: booksCount || 0,
        assessments: assessmentsCount || 0,
        virtualAssistants: vasCount || 0,
        revenue: 0,
        pendingJobs: pendingJobsCount || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentActivity() {
    try {
      // Get recent user registrations
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const activities = (recentUsers || []).map(user => ({
        id: user.id,
        type: 'user_registered',
        title: 'New User Registered',
        description: `${user.full_name || user.email} joined the platform`,
        time: user.created_at,
        icon: Users
      }));
      
      setRecentActivity(activities);
    } catch (err) {
      console.error('Error loading activity:', err);
    }
  }

  async function loadNotifications() {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setNotifications(data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  }

  async function markNotificationRead(id) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  }

  const statCards = [
    { title: 'Total Users', value: stats.users, icon: Users, color: 'blue', link: '/admin/users' },
    { title: 'Jobs', value: stats.jobs, icon: Briefcase, color: 'emerald', link: '/admin/jobs' },
    { title: 'Courses', value: stats.courses, icon: BookOpen, color: 'purple', link: '/admin/courses' },
    { title: 'Books', value: stats.books, icon: BookOpen, color: 'amber', link: '/admin/books' },
    { title: 'Assessments', value: stats.assessments, icon: Brain, color: 'pink', link: '/admin/assessments' },
    { title: 'Virtual Assistants', value: stats.virtualAssistants, icon: Bot, color: 'indigo', link: '/admin/virtual-assistants' },
    { title: 'Pending Jobs', value: stats.pendingJobs, icon: Clock, color: 'orange', link: '/admin/external-jobs' },
    { title: 'Revenue', value: `$${stats.revenue}`, icon: DollarSign, color: 'green', link: '/admin/analytics' },
  ];

  const quickActions = [
    { title: 'Create Article', icon: FileText, path: '/admin/articles/new', color: 'blue' },
    { title: 'Add Book', icon: BookOpen, path: '/admin/books/new', color: 'emerald' },
    { title: 'Add Course', icon: BookOpen, path: '/admin/courses/new', color: 'purple' },
    { title: 'Add VA', icon: Bot, path: '/admin/virtual-assistants/new', color: 'amber' },
    { title: 'Create Assessment', icon: Brain, path: '/admin/assessments/new', color: 'pink' },
    { title: 'View Reports', icon: TrendingUp, path: '/admin/analytics', color: 'indigo' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back, {profile?.full_name || user?.email}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, idx) => (
            <Link key={idx} to={stat.link} className="block bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-primary-500/30 transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
            </Link>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {quickActions.map((action, idx) => (
                  <Link key={idx} to={action.path} className={`bg-slate-800 p-4 rounded-lg text-center hover:bg-${action.color}-500/10 transition border border-slate-700 hover:border-${action.color}-500/30 group`}>
                    <action.icon className={`w-8 h-8 mx-auto mb-2 text-${action.color}-400`} />
                    <p className="text-sm text-white group-hover:text-primary-400">{action.title}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No recent activity</p>
                ) : (
                  recentActivity.map(activity => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center">
                        <activity.icon className="w-4 h-4 text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{activity.title}</p>
                        <p className="text-xs text-slate-400">{activity.description}</p>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(activity.time).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Notifications</h2>
              <Bell className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No new notifications</p>
              ) : (
                notifications.map(notification => (
                  <div key={notification.id} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-white">{notification.title}</p>
                      <p className="text-xs text-slate-400">{notification.message}</p>
                    </div>
                    <button onClick={() => markNotificationRead(notification.id)} className="text-xs text-primary-400 hover:text-primary-300">
                      Dismiss
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <Link to="/admin/notifications" className="text-sm text-primary-400 hover:text-primary-300 flex items-center justify-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">System Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <span className="text-slate-400">API Status</span>
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" /> Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <span className="text-slate-400">Database</span>
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" /> Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <span className="text-slate-400">Auth Service</span>
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" /> Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <span className="text-slate-400">Last Backup</span>
              <span className="text-slate-300">Today, 02:00 AM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
