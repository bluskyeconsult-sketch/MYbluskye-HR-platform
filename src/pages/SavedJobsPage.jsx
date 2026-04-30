import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BookmarkCheck, Briefcase, MapPin, Clock } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSavedJobs(); }, []);

  async function loadSavedJobs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('saved_jobs').select('*, jobs:job_id(*)').eq('user_id', user.id);
      setSavedJobs(data || []);
    }
    setLoading(false);
  }

  async function removeSaved(jobId) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
    loadSavedJobs();
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Saved Jobs</h1>
        {savedJobs.length === 0 ? <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center"><BookmarkCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No saved jobs yet. Click the bookmark icon on jobs to save them!</p></div> : <div className="space-y-4">{savedJobs.map(item => item.jobs && (<div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all"><div className="flex justify-between items-start"><div><h2 className="text-xl font-semibold text-white">{item.jobs.title}</h2><p className="text-slate-400 mt-1">{item.jobs.company} • {item.jobs.location || 'Remote'}</p><div className="flex flex-wrap gap-4 mt-3"><span className="text-xs text-emerald-400">{item.jobs.job_type}</span><span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Saved {new Date(item.saved_at).toLocaleDateString()}</span></div></div><div className="flex gap-2"><button onClick={() => window.location.href = `/jobs/${item.jobs.id}`} className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg">Apply Now</button><button onClick={() => removeSaved(item.jobs.id)} className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-lg">Remove</button></div></div></div>))}</div>}
      </div>
    </div>
  );
}
