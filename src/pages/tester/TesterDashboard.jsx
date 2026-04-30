import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getTesterStatus } from '../../services/testerService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TesterDashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const testerStatus = await getTesterStatus(user.id);
      setStatus(testerStatus);
    }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Tester Dashboard</h1>
        <p className="text-slate-400 mb-8">Thank you for helping us improve the platform</p>
        
        {status?.isActive ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4"><span className="text-white">Remaining Uses</span><span className="text-2xl font-bold text-emerald-400">{status.remainingUses} / {status.allocatedUses}</span></div>
            <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(status.remainingUses / status.allocatedUses) * 100}%` }}></div></div>
            <div className="mt-4 text-center"><p className="text-slate-400">Expires in {status.daysRemaining} days</p></div>
          </div>
        ) : (<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center"><p className="text-red-400">Your tester account has expired. Thank you for your participation!</p></div>)}
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6"><h2 className="text-xl font-bold text-white mb-4">Feedback Form</h2><p className="text-slate-400">Share your experience to help us improve.</p><button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">Submit Feedback</button></div>
      </div>
    </div>
  );
}
