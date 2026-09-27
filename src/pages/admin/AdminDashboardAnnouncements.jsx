// src/pages/admin/AdminDashboardAnnouncements.jsx
//
// NEW (2026-09-25): admin UI for the dashboard announcement popup
// system - create new announcements and deactivate old ones.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Megaphone, Loader2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboardAnnouncements() {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ title: '', message: '', ctaLabel: '', ctaUrl: '' });

    useEffect(() => {
        loadAnnouncements();
    }, []);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };
    }

    async function loadAnnouncements() {
        setLoading(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=admin-list-dashboard-announcements', { headers });
            const data = await response.json();
            setAnnouncements(data.announcements || []);
        } catch (err) {
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!form.title.trim() || !form.message.trim()) {
            toast.error('Title and message are required');
            return;
        }
        setCreating(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=admin-create-dashboard-announcement', {
                method: 'POST',
                headers,
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            toast.success('Announcement created - it will now show to users on their dashboard.');
            setForm({ title: '', message: '', ctaLabel: '', ctaUrl: '' });
            loadAnnouncements();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
    }

    async function handleDeactivate(id) {
        if (!confirm('Deactivate this announcement? It will stop showing to users who haven\'t seen it yet.')) return;
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=admin-deactivate-dashboard-announcement', {
                method: 'POST',
                headers,
                body: JSON.stringify({ announcementId: id })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            toast.success('Deactivated');
            loadAnnouncements();
        } catch (err) {
            toast.error(err.message);
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-primary-400" /> Dashboard Announcements
            </h1>
            <p className="text-slate-400 text-sm mb-6">
                A real, dismissible popup shown once to each user on their dashboard - genuinely distinct from the top banner. Use sparingly, for things that need to actually be seen.
            </p>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-8">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> New Announcement</h2>
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                    <textarea
                        placeholder="Message"
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="Button label (optional)"
                            value={form.ctaLabel}
                            onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                        <input
                            type="text"
                            placeholder="Button link (optional)"
                            value={form.ctaUrl}
                            onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 text-sm font-medium"
                    >
                        {creating ? 'Creating...' : 'Create & Show to Users'}
                    </button>
                </div>
            </div>

            <h2 className="text-white font-semibold mb-3">History</h2>
            {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
            ) : announcements.length === 0 ? (
                <p className="text-slate-500 text-sm">No announcements yet.</p>
            ) : (
                <div className="space-y-2">
                    {announcements.map(a => (
                        <div key={a.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex justify-between items-start gap-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-white font-medium text-sm">{a.title}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                        {a.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p className="text-slate-400 text-xs">{a.message}</p>
                                <p className="text-slate-600 text-xs mt-1">{new Date(a.created_at).toLocaleString()}</p>
                            </div>
                            {a.is_active && (
                                <button onClick={() => handleDeactivate(a.id)} className="text-slate-500 hover:text-red-400 transition flex-shrink-0" title="Deactivate">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
