import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function UserApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('job_applications').select('*, jobs:job_id (title, company)').eq('applicant_id', user.id).order('applied_at', { ascending: false });
      setApplications(data || []);
    }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-6">My Applications</h1>
        {applications.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400">No applications yet. Start applying to jobs!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(app => (
              <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h2 className="text-lg font-semibold text-white">{app.jobs?.title || 'Unknown Job'}</h2>
                <p className="text-slate-400">{app.jobs?.company}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">{app.status}</span>
                  <span className="text-xs text-slate-500">Applied: {new Date(app.applied_at).toLocaleDateString()}</span>
                  {app.match_score && <span className="text-xs text-sky-400">Match: {app.match_score}%</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
