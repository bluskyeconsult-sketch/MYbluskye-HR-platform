// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Briefcase, BookOpen, FileText, Bot, Brain, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, jobs: 0, courses: 0, assessments: 0, vas: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/admin-login'; return; }
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        window.location.href = '/dashboard';
        return;
      }
      
      setIsAuthorized(true);
      await loadStats();
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadStats() {
    try {
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: jobsCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
      const { count: coursesCount } = await supabase.from('courses').select('*', { count: 'exact', head: true });
      const { count: assessmentsCount } = await supabase.from('assessments').select('*', { count: 'exact', head: true });
      const { count: vasCount } = await supabase.from('virtual_assistants').select('*', { count: 'exact', head: true });
      
      setStats({
        users: usersCount || 0,
        jobs: jobsCount || 0,
        courses: coursesCount || 0,
        assessments: assessmentsCount || 0,
        vas: vasCount || 0
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  const cards = [
    { title: 'Total Users', value: stats.users, icon: Users, color: 'blue', link: '/admin/users' },
    { title: 'Total Jobs', value: stats.jobs, icon: Briefcase, color: 'emerald', link: '/admin/jobs' },
    { title: 'Courses', value: stats.courses, icon: BookOpen, color: 'purple', link: '/admin/courses' },
    { title: 'Assessments', value: stats.assessments, icon: Brain, color: 'pink', link: '/admin/assessments' },
    { title: 'Virtual Assistants', value: stats.vas, icon: Bot, color: 'amber', link: '/admin/virtual-assistants' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-slate-400 mb-6">Welcome back, {user?.email}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((card, idx) => (
            <Link key={idx} to={card.link} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
              <div className={`w-10 h-10 rounded-lg bg-${card.color}-500/10 flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 text-${card.color}-400`} />
              </div>
              <p className="text-slate-400 text-xs">{card.title}</p>
              <p className="text-2xl font-bold text-white">{card.value.toLocaleString()}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/admin/courses" className="bg-slate-800 p-3 rounded-lg text-center hover:bg-slate-700">📚 Manage Courses</Link>
            <Link to="/admin/jobs" className="bg-slate-800 p-3 rounded-lg text-center hover:bg-slate-700">💼 Manage Jobs</Link>
            <Link to="/admin/external-jobs" className="bg-slate-800 p-3 rounded-lg text-center hover:bg-slate-700">🌐 External Jobs</Link>
            <Link to="/admin/assessments" className="bg-slate-800 p-3 rounded-lg text-center hover:bg-slate-700">📊 Assessments</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
