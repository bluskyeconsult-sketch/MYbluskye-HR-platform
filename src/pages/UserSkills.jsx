import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function UserSkills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newSkill, setNewSkill] = useState({ skill_name: '', category: '', years_experience: 0 });

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('skills').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setSkills(data || []);
    }
    setLoading(false);
  }

  async function submitSkill() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('skills').insert({ user_id: user.id, skill_name: newSkill.skill_name, category: newSkill.category, years_experience: newSkill.years_experience, verification_status: 'pending' });
    setShowForm(false);
    setNewSkill({ skill_name: '', category: '', years_experience: 0 });
    loadSkills();
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">My Skills</h1>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">Add Skill</button>
        </div>
        
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Submit New Skill</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Skill Name" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" value={newSkill.skill_name} onChange={e => setNewSkill({...newSkill, skill_name: e.target.value})} />
                <input type="text" placeholder="Category" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" value={newSkill.category} onChange={e => setNewSkill({...newSkill, category: e.target.value})} />
                <input type="number" placeholder="Years of Experience" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" value={newSkill.years_experience} onChange={e => setNewSkill({...newSkill, years_experience: parseInt(e.target.value)})} />
                <div className="flex gap-3">
                  <button onClick={submitSkill} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">Submit</button>
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {skills.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400">No skills submitted yet. Add your first skill!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {skills.map(skill => (
              <div key={skill.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-white">{skill.skill_name}</h2>
                  <p className="text-sm text-slate-400">{skill.category} • {skill.years_experience} years</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${skill.verification_status === 'verified' ? 'bg-emerald-500/10 text-emerald-400' : skill.verification_status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{skill.verification_status}</span>
                  {skill.trust_score > 0 && <div className="text-xs text-slate-500 mt-1">Trust Score: {skill.trust_score}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
