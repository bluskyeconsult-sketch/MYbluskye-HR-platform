// src/components/admin/StaffPermissionsModal.jsx
//
// NEW (2026-09-19): lets a super admin create a genuine staff account
// directly from the dashboard, and grant/revoke specific, named
// permissions - not full admin access. Only ever reachable by a
// genuine super_admin (enforced server-side too, not just hidden in
// the UI) - creating accounts and changing permissions are both
// "sacred," restricted actions.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Loader2, UserPlus, Shield } from 'lucide-react';

const PERMISSION_OPTIONS = [
    { key: 'can_manage_jobs', label: 'Manage Jobs', description: 'Approve, reject, edit job listings' },
    { key: 'can_manage_users', label: 'Manage Users', description: 'View users, change roles, block/unblock' },
    { key: 'can_manage_content', label: 'Manage Content', description: 'Articles, banner messages, knowledge sources' },
    { key: 'can_manage_courses', label: 'Manage Courses', description: 'Create/edit courses and assessments' },
    { key: 'can_manage_books', label: 'Manage Books', description: 'Upload and edit books' },
    { key: 'can_view_analytics', label: 'View Analytics', description: 'Read-only access to visitor/usage data' },
    { key: 'can_manage_security', label: 'Manage Security', description: 'View security settings, audit log' },
    { key: 'can_manage_communications', label: 'Manage Communications', description: 'Newsletter, email tests' },
    { key: 'can_manage_finance', label: 'Manage Finance', description: 'Refund requests, affiliate payouts' }
];

export default function StaffPermissionsModal({ mode, existingUser, onClose, onSuccess }) {
    // mode: 'create' | 'edit'
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [permissions, setPermissions] = useState(
        Object.fromEntries(PERMISSION_OPTIONS.map(p => [p.key, false]))
    );
    const [loading, setLoading] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(mode === 'edit');
    const [error, setError] = useState('');

    useEffect(() => {
        if (mode === 'edit' && existingUser) {
            loadExistingPermissions();
        }
    }, [mode, existingUser]);

    async function loadExistingPermissions() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/index?action=admin-get-staff-permissions&userId=${existingUser.id}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await response.json();
            if (data.permissions) {
                setPermissions(Object.fromEntries(
                    PERMISSION_OPTIONS.map(p => [p.key, !!data.permissions[p.key]])
                ));
            }
        } catch (err) {
            console.error('Failed to load existing permissions:', err);
        } finally {
            setLoadingExisting(false);
        }
    }

    function togglePermission(key) {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    }

    async function handleSubmit() {
        setError('');
        if (mode === 'create' && (!email.trim() || !fullName.trim())) {
            setError('Email and full name are required.');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            };

            if (mode === 'create') {
                const response = await fetch('/api/index?action=admin-create-staff-user', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ email, fullName, permissions })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to create staff account');
            } else {
                const response = await fetch('/api/index?action=admin-update-staff-permissions', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ userId: existingUser.id, permissions })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to update permissions');
            }

            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {mode === 'create' ? <UserPlus className="w-5 h-5 text-primary-400" /> : <Shield className="w-5 h-5 text-primary-400" />}
                        {mode === 'create' ? 'Create Staff Account' : `Edit Permissions — ${existingUser?.full_name || existingUser?.email}`}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {mode === 'create' && (
                    <p className="text-slate-400 text-sm mb-4">
                        Creates a real account directly - they'll receive a password-reset email to set their own password. They only get the specific permissions you check below, nothing more.
                    </p>
                )}

                {loadingExisting ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
                ) : (
                    <>
                        {mode === 'create' && (
                            <div className="space-y-3 mb-5">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                        )}

                        <p className="text-slate-300 text-sm font-medium mb-2">Permissions</p>
                        <div className="space-y-2 mb-5">
                            {PERMISSION_OPTIONS.map(perm => (
                                <label key={perm.key} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800">
                                    <input
                                        type="checkbox"
                                        checked={permissions[perm.key]}
                                        onChange={() => togglePermission(perm.key)}
                                        className="mt-1"
                                    />
                                    <div>
                                        <p className="text-white text-sm font-medium">{perm.label}</p>
                                        <p className="text-slate-400 text-xs">{perm.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {mode === 'create' ? 'Create Staff Account' : 'Save Permissions'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
