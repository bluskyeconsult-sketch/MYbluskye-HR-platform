import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, jobs: 0, skills: 0, feedback: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: jobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
    const { count: skills } = await supabase.from('skills').select('*', { count: 'exact', head: true });
    const { count: feedback } = await supabase.from('tester_feedback').select('*', { count: 'exact', head: true });
    setStats({ users: users || 0, jobs: jobs || 0, skills: skills || 0, feedback: feedback || 0 });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Platform Governance Console</h1>
        <p className="text-slate-400 mb-8">All actions are logged. Changes are enforceable and auditable.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-white">{stats.users}</div><div className="text-slate-400">Total Users</div></div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-white">{stats.jobs}</div><div className="text-slate-400">Total Jobs</div></div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-white">{stats.skills}</div><div className="text-slate-400">Skills</div></div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-white">{stats.feedback}</div><div className="text-slate-400">Tester Feedback</div></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/admin/users" className="bg-slate-800 text-center text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">Manage Users</Link>
          <Link to="/admin/jobs" className="bg-slate-800 text-center text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">Moderate Jobs</Link>
          <Link to="/admin/skills" className="bg-slate-800 text-center text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">Verify Skills</Link>
          <Link to="/admin/super/countries" className="bg-slate-800 text-center text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">Countries</Link>
        </div>
      </div>
    </div>
  );
}
