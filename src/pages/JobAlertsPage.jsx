import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bell, Plus, Trash2 } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function JobAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAlert, setNewAlert] = useState({ keywords: '', location: '', job_type: '' });

  useEffect(() => { loadAlerts(); }, []);

  async function loadAlerts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('job_alerts').select('*').eq('user_id', user.id);
      setAlerts(data || []);
    }
    setLoading(false);
  }

  async function createAlert() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('job_alerts').insert({ user_id: user.id, ...newAlert });
    setShowForm(false);
    setNewAlert({ keywords: '', location: '', job_type: '' });
    loadAlerts();
  }

  async function deleteAlert(id) {
    await supabase.from('job_alerts').delete().eq('id', id);
    loadAlerts();
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Job Alerts</h1>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">+ Create Alert</button>
        </div>

        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">New Job Alert</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Keywords (e.g., Software Engineer, HR Manager)" value={newAlert.keywords} onChange={e => setNewAlert({...newAlert, keywords: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <input type="text" placeholder="Location (e.g., London, Remote)" value={newAlert.location} onChange={e => setNewAlert({...newAlert, location: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <select value={newAlert.job_type} onChange={e => setNewAlert({...newAlert, job_type: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                <option value="">All Job Types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="remote">Remote</option>
              </select>
              <div className="flex gap-3"><button onClick={createAlert} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Create Alert</button><button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg">Cancel</button></div>
            </div>
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center"><Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No job alerts yet. Create one to get notified about new jobs!</p></div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                <div><p className="font-medium text-white">{alert.keywords || 'Any keywords'}</p><p className="text-sm text-slate-400">{alert.location || 'Any location'} • {alert.job_type || 'Any type'}</p></div>
                <button onClick={() => deleteAlert(alert.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
