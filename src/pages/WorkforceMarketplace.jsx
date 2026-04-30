import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function WorkforceMarketplace() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    const { data } = await supabase
      .from('skills')
      .select('*, profiles:user_id (full_name, email)')
      .eq('verification_status', 'verified')
      .order('trust_score', { ascending: false })
      .limit(20);
    
    setSkills(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-48 bg-slate-800 rounded"></div>
              <div className="h-48 bg-slate-800 rounded"></div>
              <div className="h-48 bg-slate-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Workforce Marketplace</h1>
        <p className="text-slate-400 mb-4">Browse verified skills across industries. Hire with confidence.</p>
        <div className="border-l-2 border-emerald-500 pl-3 text-xs text-slate-500 mb-8">
          Listings are reviewed using AI and human oversight. Trust scores reflect verified activity and completed work.
        </div>
        
        {skills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No verified skills yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map(skill => (
              <div key={skill.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
                <h2 className="text-lg font-semibold text-white">{skill.skill_name}</h2>
                <p className="text-sm text-slate-400 mt-1">{skill.category || 'General'} • Trust Score {skill.trust_score}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">✓ AI + Human Reviewed</span>
                  <button className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700">Contact Professional</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
