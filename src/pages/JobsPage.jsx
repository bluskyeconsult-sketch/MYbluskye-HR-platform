import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('compliance_status', 'approved')
      .eq('is_active', true)
      .order('posted_at', { ascending: false })
      .limit(20);
    
    setJobs(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/4"></div>
            <div className="h-4 bg-slate-800 rounded w-1/2"></div>
            <div className="space-y-3">
              <div className="h-24 bg-slate-800 rounded"></div>
              <div className="h-24 bg-slate-800 rounded"></div>
              <div className="h-24 bg-slate-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Job Board</h1>
        <p className="text-slate-400 mb-8">Discover verified opportunities tailored to your skills</p>
        
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No jobs currently available. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
                <h2 className="text-xl font-semibold text-white">{job.title}</h2>
                <p className="text-slate-400 mt-1">{job.company} • {job.location || 'Remote'}</p>
                <p className="text-slate-300 mt-3 line-clamp-2">{job.description}</p>
                <div className="flex gap-4 mt-4">
                  <span className="text-sm text-emerald-400">{job.job_type}</span>
                  {job.salary_min && (
                    <span className="text-sm text-slate-400">${job.salary_min.toLocaleString()} - ${job.salary_max?.toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
