import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, Globe, Calendar, Users, Briefcase } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CompanyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => { loadCompanyProfile(); }, []);

  async function loadCompanyProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let { data } = await supabase.from('company_profiles').select('*').eq('user_id', user.id).single();
      if (!data) {
        const { data: newProfile } = await supabase.from('company_profiles').insert({ user_id: user.id, company_name: 'My Company' }).select().single();
        data = newProfile;
      }
      setProfile(data);
      setFormData(data);
    }
    setLoading(false);
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('company_profiles').update(formData).eq('user_id', user.id);
    setProfile(formData);
    setEditing(false);
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8"><h1 className="text-3xl font-bold text-white">Company Profile</h1>{!editing && <button onClick={() => setEditing(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Edit Profile</button>}</div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
          {editing ? (
            <div className="space-y-4">
              <input type="text" placeholder="Company Name" value={formData.company_name || ''} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <textarea placeholder="Company Description" rows={4} value={formData.company_description || ''} onChange={e => setFormData({...formData, company_description: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <input type="url" placeholder="Website URL" value={formData.company_website || ''} onChange={e => setFormData({...formData, company_website: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <select value={formData.company_size || ''} onChange={e => setFormData({...formData, company_size: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                <option value="">Select Company Size</option><option value="1-10">1-10 employees</option><option value="11-50">11-50 employees</option><option value="51-200">51-200 employees</option><option value="201-500">201-500 employees</option><option value="500+">500+ employees</option>
              </select>
              <input type="text" placeholder="Industry" value={formData.industry || ''} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <div className="flex gap-3"><button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Save</button><button onClick={() => setEditing(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg">Cancel</button></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3"><Building2 className="w-5 h-5 text-slate-500" /><div><p className="text-xs text-slate-500">Company Name</p><p className="text-white text-lg font-semibold">{profile?.company_name}</p></div></div>
              {profile?.company_description && <div><p className="text-xs text-slate-500">Description</p><p className="text-slate-300">{profile.company_description}</p></div>}
              <div className="grid grid-cols-2 gap-4"><div className="flex items-center gap-3"><Globe className="w-5 h-5 text-slate-500" /><div><p className="text-xs text-slate-500">Website</p>{profile?.company_website ? <a href={profile.company_website} target="_blank" className="text-emerald-400 hover:underline">Visit Website</a> : <p className="text-slate-500">Not provided</p>}</div></div>
              <div className="flex items-center gap-3"><Users className="w-5 h-5 text-slate-500" /><div><p className="text-xs text-slate-500">Company Size</p><p className="text-white">{profile?.company_size || 'Not specified'}</p></div></div>
              <div className="flex items-center gap-3"><Briefcase className="w-5 h-5 text-slate-500" /><div><p className="text-xs text-slate-500">Industry</p><p className="text-white">{profile?.industry || 'Not specified'}</p></div></div></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
