// src/pages/admin/AdminBannerMessages.jsx
//
// NEW (2026-08-30) — the real, missing admin interface for the site-wide
// scrolling banner. ScrollingBanner.jsx previously had zero backend and
// zero way to change its content without editing code and redeploying.
// This is the actual "feed it new announcements" page - create, edit,
// deactivate, and reorder messages, all backed by the real
// banner_messages table.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, Save, X, Eye, EyeOff, Loader2 } from 'lucide-react';

const ICON_OPTIONS = ['🎓', '🚀', '📚', '💼', '🤖', '📊', '⭐', '🎯', '⚡', '🔔', '📢'];

export default function AdminBannerMessages() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ text: '', link: '', link_text: '', icon: '🔔', priority: 0, is_active: true });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadMessages(); }, []);

    async function loadMessages() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('banner_messages')
                .select('*')
                .order('priority', { ascending: true });
            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Failed to load banner messages:', err);
        } finally {
            setLoading(false);
        }
    }

    function startEdit(msg) {
        setEditingId(msg.id);
        setCreating(false);
        setForm({
            text: msg.text || '',
            link: msg.link || '',
            link_text: msg.link_text || '',
            icon: msg.icon || '🔔',
            priority: msg.priority ?? 0,
            is_active: msg.is_active
        });
    }

    function startCreate() {
        setCreating(true);
        setEditingId(null);
        setForm({ text: '', link: '', link_text: '', icon: '🔔', priority: messages.length, is_active: true });
    }

    function cancelEdit() {
        setEditingId(null);
        setCreating(false);
    }

    async function saveMessage() {
        if (!form.text.trim()) {
            alert('Message text is required.');
            return;
        }
        setSaving(true);
        try {
            if (creating) {
                const { error } = await supabase.from('banner_messages').insert(form);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('banner_messages').update(form).eq('id', editingId);
                if (error) throw error;
            }
            await loadMessages();
            cancelEdit();
        } catch (err) {
            alert(`Failed to save: ${err.message}`);
        } finally {
            setSaving(false);
        }
    }

    async function toggleActive(msg) {
        try {
            const { error } = await supabase
                .from('banner_messages')
                .update({ is_active: !msg.is_active })
                .eq('id', msg.id);
            if (error) throw error;
            await loadMessages();
        } catch (err) {
            alert(`Failed to update: ${err.message}`);
        }
    }

    async function deleteMessage(id) {
        if (!confirm('Delete this message permanently? This cannot be undone.')) return;
        try {
            const { error } = await supabase.from('banner_messages').delete().eq('id', id);
            if (error) throw error;
            await loadMessages();
        } catch (err) {
            alert(`Failed to delete: ${err.message}`);
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Banner Messages</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        These scroll across the top of every page on the live site. Only active messages within their date window are shown.
                    </p>
                </div>
                <button
                    onClick={startCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition"
                >
                    <Plus className="w-4 h-4" /> New Message
                </button>
            </div>

            {(creating || editingId) && (
                <div className="bg-slate-900 border border-primary-500/30 rounded-xl p-5 mb-6">
                    <h3 className="text-white font-medium mb-4">{creating ? 'New Message' : 'Edit Message'}</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Message text</label>
                            <input
                                type="text"
                                value={form.text}
                                onChange={(e) => setForm({ ...form, text: e.target.value })}
                                placeholder="e.g. New feature just launched!"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Link (optional)</label>
                                <input
                                    type="text"
                                    value={form.link}
                                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                                    placeholder="/pricing"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Link text (optional)</label>
                                <input
                                    type="text"
                                    value={form.link_text}
                                    onChange={(e) => setForm({ ...form, link_text: e.target.value })}
                                    placeholder="Learn More"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Icon</label>
                                <select
                                    value={form.icon}
                                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                >
                                    {ICON_OPTIONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Priority (lower shows first)</label>
                                <input
                                    type="number"
                                    value={form.priority}
                                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={saveMessage} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                            </button>
                            <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition">
                                <X className="w-4 h-4" /> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>
            ) : messages.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-12">No banner messages yet. Create one above.</p>
            ) : (
                <div className="space-y-2">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex items-center gap-3 p-4 rounded-lg border ${msg.is_active ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/50 border-slate-800/50 opacity-60'}`}>
                            <span className="text-lg flex-shrink-0">{msg.icon}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm truncate">{msg.text}</p>
                                {msg.link && <p className="text-slate-500 text-xs">{msg.link} {msg.link_text && `→ "${msg.link_text}"`}</p>}
                            </div>
                            <span className="text-xs text-slate-500 flex-shrink-0">Priority {msg.priority}</span>
                            <button onClick={() => toggleActive(msg)} className="p-2 text-slate-400 hover:text-white transition" title={msg.is_active ? 'Deactivate' : 'Activate'}>
                                {msg.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button onClick={() => startEdit(msg)} className="p-2 text-slate-400 hover:text-white transition" title="Edit">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteMessage(msg.id)} className="p-2 text-slate-400 hover:text-red-400 transition" title="Delete">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
