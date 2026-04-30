import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Camera, Linkedin, Github, Mail, Phone, Briefcase, Calendar, Bell } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
      setFormData(data || {});
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').update({
      full_name: formData.full_name,
      phone: formData.phone,
      job_title: formData.job_title,
      years_experience: formData.years_experience,
      linkedin_url: formData.linkedin_url,
      github_url: formData.github_url,
      email_notifications: formData.email_notifications
    }).eq('id', user.id);
    
    setProfile({ ...profile, ...formData });
    setEditing(false);
    setSaving(false);
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          {!editing && (
            <button onClick={() => setEditing(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
              Edit Profile
            </button>
          )}
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          {/* Header with Avatar */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center text-3xl font-bold text-white">
                {profile?.full_name?.[0] || 'U'}
              </div>
              <button className="absolute bottom-0 right-0 p-1.5 bg-slate-700 rounded-full hover:bg-slate-600">
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{profile?.full_name || 'User'}</h2>
              <p className="text-slate-400">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${profile?.email_verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {profile?.email_verified ? '✓ Email Verified' : '⚠️ Email Not Verified'}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="p-6 space-y-6">
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                    <input type="text" value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                    <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Job Title</label>
                    <input type="text" value={formData.job_title || ''} onChange={e => setFormData({...formData, job_title: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="e.g., Senior Software Engineer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Years of Experience</label>
                    <input type="number" value={formData.years_experience || ''} onChange={e => setFormData({...formData, years_experience: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">LinkedIn URL</label>
                    <input type="url" value={formData.linkedin_url || ''} onChange={e => setFormData({...formData, linkedin_url: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">GitHub URL</label>
                    <input type="url" value={formData.github_url || ''} onChange={e => setFormData({...formData, github_url: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="https://github.com/..." />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="email_notifications" checked={formData.email_notifications} onChange={e => setFormData({...formData, email_notifications: e.target.checked})} className="w-4 h-4" />
                  <label htmlFor="email_notifications" className="text-slate-300">Receive email notifications about jobs and updates</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">Save Changes</button>
                  <button onClick={() => { setEditing(false); setFormData(profile); }} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-slate-500" /><div><p className="text-xs text-slate-500">Email</p><p className="text-white">{profile?.email}</p></div></div>
                  <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-slate-500" /><div><p className="text-xs text-slate-500">Phone</p><p className="text-white">{profile?.phone || 'Not provided'}</p></div></div>
                  <div className="flex items-center gap-3"><Briefcase className="w-5 h-5 text-slate-500" /><div><p className="text-xs text-slate-500">Job Title</p><p className="text-white">{profile?.job_title || 'Not provided'}</p></div></div>
                  <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-slate-500" /><div><p className="text-xs text-slate-500">Years Experience</p><p className="text-white">{profile?.years_experience || '0'} years</p></div></div>
                </div>
                <div className="space-y-4">
                  {profile?.linkedin_url && <div className="flex items-center gap-3"><Linkedin className="w-5 h-5 text-slate-500" /><a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">LinkedIn Profile</a></div>}
                  {profile?.github_url && <div className="flex items-center gap-3"><Github className="w-5 h-5 text-slate-500" /><a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">GitHub Profile</a></div>}
                  <div className="flex items-center gap-3"><Bell className="w-5 h-5 text-slate-500" /><div><p className="text-xs text-slate-500">Email Notifications</p><p className="text-white">{profile?.email_notifications ? 'Enabled' : 'Disabled'}</p></div></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
