import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ applications: 0, skills: 0 });

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { count: applications } = await supabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('applicant_id', user.id);
      const { count: skills } = await supabase.from('skills').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setStats({ applications: applications || 0, skills: skills || 0 });
    }
  }

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">My Dashboard</h1>
        <p className="text-slate-400 mb-8">Welcome back, {user.email}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/applications" className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
            <div className="text-2xl font-bold text-white">{stats.applications}</div>
            <div className="text-slate-400">Job Applications</div>
          </Link>
          <Link to="/skills" className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
            <div className="text-2xl font-bold text-white">{stats.skills}</div>
            <div className="text-slate-400">Verified Skills</div>
          </Link>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="text-2xl font-bold text-white">-</div>
            <div className="text-slate-400">Upgrade to Pro</div>
          </div>
        </div>
      </div>
    </div>
  );
}
