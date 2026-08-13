// src/pages/admin/KnowledgeSourceManager.jsx
// SUPER ADMIN ONLY - Manage approved external knowledge sources for AI Chat
//
// FIXED (2026-08-07): checkAdminAccess() only checked
// user.email === 'bluskyeconsult@gmail.com' — no user_type check at all,
// despite the file being explicitly commented "SUPER ADMIN ONLY". This is
// the 7th confirmed instance of the hardcoded admin-email pattern across
// this codebase, and the most exposed one yet — this page had zero
// database-driven access control. Fixed to check profiles.user_type,
// consistent with every other admin page.
//
// FLAGGED, NOT FIXED: handleRefresh() posts to /api/refresh-knowledge,
// which doesn't exist anywhere in this project (real endpoints all go
// through /api/index?action=...). This isn't a simple URL fix — actually
// refreshing a knowledge source means fetching and re-processing external
// URL content for the AI chat, which is a genuinely unbuilt feature, not a
// bug. Left as-is; it will fail with a clear error rather than a false
// success.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database, Plus, Edit2, Trash2, RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function KnowledgeSourceManager() {
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSource, setEditingSource] = useState(null);
    const [refreshingId, setRefreshingId] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [formData, setFormData] = useState({
        source_name: '',
        source_url: '',
        source_type: 'general',
        refresh_interval_hours: 24,
        is_active: true
    });

    useEffect(() => {
        checkAdminAccess();
    }, []);

    async function checkAdminAccess() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/admin-login';
            return;
        }

        // FIXED: real database check instead of a hardcoded email with no
        // fallback at all.
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';

        if (!isAdmin) {
            alert('Access denied. Admin access required.');
            window.location.href = '/admin/dashboard';
            return;
        }

        setIsAuthorized(true);
        fetchSources();
    }

    async function fetchSources() {
        setLoading(true);
        const { data, error } = await supabase
            .from('ai_knowledge_sources')
            .select('*')
            .order('source_type', { ascending: true });
        
        if (!error) setSources(data || []);
        setLoading(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (editingSource) {
            await supabase
                .from('ai_knowledge_sources')
                .update(formData)
                .eq('id', editingSource.id);
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase
                .from('ai_knowledge_sources')
                .insert({ ...formData, created_by: user.id });
        }
        
        setShowModal(false);
        setEditingSource(null);
        setFormData({ source_name: '', source_url: '', source_type: 'general', refresh_interval_hours: 24, is_active: true });
        fetchSources();
    }

    async function handleRefresh(sourceId) {
        setRefreshingId(sourceId);
        
        try {
            const response = await fetch('/api/refresh-knowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceId })
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Knowledge base refreshed successfully');
            } else {
                alert('Failed to refresh: ' + (result.error || 'This feature is not yet built on the backend.'));
            }
        } catch (error) {
            alert('Failed to refresh: this feature is not yet built on the backend.');
        }
        
        setRefreshingId(null);
        fetchSources();
    }

    async function handleDelete(id) {
        if (confirm('Delete this knowledge source?')) {
            await supabase.from('ai_knowledge_sources').delete().eq('id', id);
            fetchSources();
        }
    }

    function getTypeBadge(type) {
        const badges = {
            jobs: 'bg-blue-500/20 text-blue-400',
            laws: 'bg-purple-500/20 text-purple-400',
            immigration: 'bg-amber-500/20 text-amber-400',
            statistics: 'bg-emerald-500/20 text-emerald-400',
            general: 'bg-slate-500/20 text-slate-400'
        };
        return badges[type] || badges.general;
    }

    if (loading || !isAuthorized) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Knowledge Source Manager</h1>
                    <p className="text-slate-400 text-sm">Manage approved external sources for ODUSBABA AI Chat</p>
                </div>
                <button
                    onClick={() => { setEditingSource(null); setFormData({ source_name: '', source_url: '', source_type: 'general', refresh_interval_hours: 24, is_active: true }); setShowModal(true); }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Source
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                {/* Mobile card list */}
                <div className="md:hidden divide-y divide-slate-800">
                    {sources.map(source => (
                        <div key={source.id} className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-white font-medium truncate">{source.source_name}</p>
                                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${getTypeBadge(source.source_type)}`}>
                                    {source.source_type}
                                </span>
                            </div>
                            <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="text-primary-400 text-sm hover:underline block truncate mb-2">
                                {source.source_url}
                            </a>
                            <div className="flex items-center justify-between mb-3">
                                {source.is_active ? (
                                    <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3 h-3" /> Active</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3 h-3" /> Inactive</span>
                                )}
                                <span className="text-slate-500 text-xs">
                                    {source.last_fetched_at ? new Date(source.last_fetched_at).toLocaleDateString() : 'Never fetched'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleRefresh(source.id)} disabled={refreshingId === source.id} className="flex-1 py-2 bg-slate-800 rounded-lg text-slate-300 text-sm flex items-center justify-center gap-1.5">
                                    {refreshingId === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
                                </button>
                                <button onClick={() => { setEditingSource(source); setFormData(source); setShowModal(true); }} className="flex-1 py-2 bg-slate-800 rounded-lg text-slate-300 text-sm flex items-center justify-center gap-1.5">
                                    <Edit2 className="w-4 h-4" /> Edit
                                </button>
                                <button onClick={() => handleDelete(source.id)} className="py-2 px-3 bg-red-500/20 text-red-400 rounded-lg text-sm">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-white">Source Name</th>
                                <th className="px-4 py-3 text-left text-white">URL</th>
                                <th className="px-4 py-3 text-left text-white">Type</th>
                                <th className="px-4 py-3 text-left text-white">Last Fetched</th>
                                <th className="px-4 py-3 text-left text-white">Status</th>
                                <th className="px-4 py-3 text-left text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sources.map(source => (
                                <tr key={source.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                                    <td className="px-4 py-3 text-white">{source.source_name}</td>
                                    <td className="px-4 py-3">
                                        <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="text-primary-400 text-sm hover:underline">
                                            {source.source_url.substring(0, 50)}...
                                        </a>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${getTypeBadge(source.source_type)}`}>
                                            {source.source_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-sm">
                                        {source.last_fetched_at ? new Date(source.last_fetched_at).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {source.is_active ? (
                                            <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle className="w-3 h-3" /> Active</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-400 text-sm"><XCircle className="w-3 h-3" /> Inactive</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRefresh(source.id)} disabled={refreshingId === source.id} className="p-1.5 bg-slate-800 rounded-lg text-slate-300 hover:text-white" title="Refresh knowledge">
                                                {refreshingId === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => { setEditingSource(source); setFormData(source); setShowModal(true); }} className="p-1.5 bg-slate-800 rounded-lg text-slate-300 hover:text-white">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(source.id)} className="p-1.5 bg-slate-800 rounded-lg text-red-400 hover:text-red-300">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold text-white mb-4">{editingSource ? 'Edit Source' : 'Add Knowledge Source'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Source Name</label>
                                <input type="text" value={formData.source_name} onChange={e => setFormData({...formData, source_name: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Source URL</label>
                                <input type="url" value={formData.source_url} onChange={e => setFormData({...formData, source_url: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Source Type</label>
                                <select value={formData.source_type} onChange={e => setFormData({...formData, source_type: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                    <option value="jobs">Jobs</option>
                                    <option value="laws">Laws & Regulations</option>
                                    <option value="immigration">Immigration</option>
                                    <option value="statistics">Statistics</option>
                                    <option value="general">General</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Refresh Interval (hours)</label>
                                <input type="number" value={formData.refresh_interval_hours} onChange={e => setFormData({...formData, refresh_interval_hours: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            </div>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                                <span className="text-white">Active</span>
                            </label>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save</button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
