import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bookmark, BookmarkCheck } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SavedJobsButton({ jobId, userId }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && jobId) checkSaved();
    else setLoading(false);
  }, [userId, jobId]);

  async function checkSaved() {
    const { data } = await supabase.from('saved_jobs').select('id').eq('user_id', userId).eq('job_id', jobId).single();
    setSaved(!!data);
    setLoading(false);
  }

  async function toggleSave() {
    if (!userId) {
      window.location.href = '/sign-in';
      return;
    }
    if (saved) {
      await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', jobId);
      setSaved(false);
    } else {
      await supabase.from('saved_jobs').insert({ user_id: userId, job_id: jobId });
      setSaved(true);
    }
  }

  if (loading) return <div className="w-8 h-8 animate-pulse bg-slate-700 rounded"></div>;

  return (
    <button onClick={toggleSave} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
      {saved ? <BookmarkCheck className="w-5 h-5 text-emerald-400" /> : <Bookmark className="w-5 h-5 text-slate-400" />}
    </button>
  );
}
