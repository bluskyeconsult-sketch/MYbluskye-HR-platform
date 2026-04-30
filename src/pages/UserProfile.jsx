import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-6">My Profile</h1>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div><label className="block text-sm text-slate-400">Email</label><div className="text-white">{profile?.email}</div></div>
          <div><label className="block text-sm text-slate-400">Full Name</label><div className="text-white">{profile?.full_name || 'Not set'}</div></div>
          <div><label className="block text-sm text-slate-400">User Type</label><div className="text-white capitalize">{profile?.user_type}</div></div>
          <div><label className="block text-sm text-slate-400">Tier</label><div className="text-white capitalize">{profile?.tier}</div></div>
        </div>
      </div>
    </div>
  );
}
