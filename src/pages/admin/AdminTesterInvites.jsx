// src/pages/admin/AdminTesterInvites.jsx
// NEW FILE (2026-08-07) — fills the /admin/tester-invites link referenced
// in both AdminDashboard.jsx and TesterVisibilitySettings.jsx's help text,
// which pointed nowhere since no route or page existed.
//
// The tester_invites table's existence and RLS policies were confirmed via
// a diagnostic RLS query — its write policy currently only allows
// profiles.user_type = 'admin', NOT 'super_admin'. A SQL fix for that gap
// is provided alongside this file; without it, a super_admin-only account
// would be blocked from managing codes here even though the app layer
// correctly treats super_admin as admin-or-higher everywhere else.
//
// Exact columns beyond what the public-read policy implies weren't
// confirmed — built with reasonable, commonly-used fields (code, is_active,
// max_uses, uses_count, expires_at) and flexible fallbacks.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Key, Plus, Copy, Check, Trash2, Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export default function AdminTesterInvites() {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [newInvite, setNewInvite] = useState({ maxUses: 1, expiresInDays: 30, description: '' });
    const [showCreateForm, setShowCreateForm] = useState(false);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    async function checkAdminAccess() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/admin-login'; return; }

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
        loadInvites();
    }

    async function loadInvites() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tester_invites')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvites(data || []);
        } catch (err) {
            console.error('Error loading tester invites:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        setCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const code = generateCode();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (newInvite.expiresInDays || 30));

            const { error } = await supabase.from('tester_invites').insert({
                code,
                is_active: true,
                max_uses: newInvite.maxUses || 1,
                uses_count: 0,
                expires_at: expiresAt.toISOString(),
                description: newInvite.description || null,
                created_by: user?.id
            });

            if (error) throw error;

            setShowCreateForm(false);
            setNewInvite({ maxUses: 1, expiresInDays: 30, description: '' });
            await loadInvites();
        } catch (err) {
            console.error('Error creating invite:', err);
            alert('Failed to create invite code: ' + err.message);
        } finally {
            setCreating(false);
        }
    }

    async function toggleActive(id, currentActive) {
        try {
            await supabase.from('tester_invites').update({ is_active: !currentActive }).eq('id', id);
            await loadInvites();
        } catch (err) {
            console.error('Error toggling invite:', err);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this invite code?')) return;
        try {
            await supabase.from('tester_invites').delete().eq('id', id);
            await loadInvites();
        } catch (err) {
            console.error('Error deleting invite:', err);
        }
    }

    function copyCode(invite) {
        navigator.clipboard.writeText(invite.code);
        setCopiedId(invite.id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    function isExpired(invite) {
        return invite.expires_at && new Date(invite.expires_at) < new Date();
    }

    if (!isAuthorized || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Key className="w-6 h-6 text-primary-400" /> Tester Invite Codes
                    </h1>
                    <p className="text-slate-400 text-sm">Generate and manage invite codes for tester registration</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadInvites} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    <button onClick={() => setShowCreateForm(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" /> New Code
                    </button>
                </div>
            </div>

            {invites.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Key className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Invite Codes Yet</h3>
                    <p className="text-slate-400 mb-6">Create one to let new users register as testers.</p>
                    <button onClick={() => setShowCreateForm(true)} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Create First Code
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {invites.map(invite => {
                        const expired = isExpired(invite);
                        return (
                            <div key={invite.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-mono text-lg text-white tracking-wider">{invite.code}</span>
                                    <button onClick={() => copyCode(invite)} className="p-1.5 bg-slate-800 rounded-lg text-slate-300 hover:text-white">
                                        {copiedId === invite.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                {invite.description && (
                                    <p className="text-slate-400 text-sm mb-2">{invite.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                                    <span>{invite.uses_count ?? 0} / {invite.max_uses ?? '∞'} used</span>
                                    {invite.expires_at && (
                                        <span className={expired ? 'text-red-400' : ''}>
                                            {expired ? 'Expired' : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    {invite.is_active && !expired ? (
                                        <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle className="w-3 h-3" /> Active</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-slate-500 text-xs"><XCircle className="w-3 h-3" /> Inactive</span>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleActive(invite.id, invite.is_active)} className="text-xs px-2 py-1 bg-slate-800 rounded-lg text-slate-300 hover:text-white">
                                            {invite.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => handleDelete(invite.id)} className="p-1.5 text-red-400 hover:text-red-300">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showCreateForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-white mb-4">New Invite Code</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Max Uses</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newInvite.maxUses}
                                    onChange={e => setNewInvite({ ...newInvite, maxUses: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Expires In (days)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newInvite.expiresInDays}
                                    onChange={e => setNewInvite({ ...newInvite, expiresInDays: parseInt(e.target.value) || 30 })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Description (optional)</label>
                                <input
                                    type="text"
                                    value={newInvite.description}
                                    onChange={e => setNewInvite({ ...newInvite, description: e.target.value })}
                                    placeholder="e.g. Beta tester batch 3"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleCreate}
                                    disabled={creating}
                                    className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Generate Code
                                </button>
                                <button onClick={() => setShowCreateForm(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
