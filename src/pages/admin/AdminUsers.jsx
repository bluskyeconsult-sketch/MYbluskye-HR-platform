// src/pages/admin/AdminUsers.jsx
// User Management

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Search, Loader2, CheckCircle, XCircle, Mail, Calendar, Shield, RefreshCw } from 'lucide-react';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setUsers(data || []);
        setLoading(false);
    }

    async function toggleSuspend(userId, currentStatus) {
        await supabase
            .from('profiles')
            .update({ is_suspended: !currentStatus, suspended_at: !currentStatus ? new Date().toISOString() : null })
            .eq('id', userId);
        loadUsers();
    }

    const filteredUsers = users.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /></div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div><h1 className="text-2xl font-bold text-white">User Management</h1><p className="text-slate-400">View and manage user accounts</p></div>
                <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search users..." className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" /></div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800"><tr><th className="px-4 py-3 text-left text-white">User</th><th className="px-4 py-3 text-left text-white">Email</th><th className="px-4 py-3 text-left text-white">Type</th><th className="px-4 py-3 text-left text-white">Joined</th><th className="px-4 py-3 text-left text-white">Status</th><th className="px-4 py-3 text-left text-white">Actions</th></tr></thead>
                        <tbody>{filteredUsers.map(user => (<tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/30"><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center"><span className="text-primary-400 text-sm">{user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}</span></div><span className="text-white text-sm">{user.full_name || 'N/A'}</span></div></td><td className="px-4 py-3 text-slate-300 text-sm">{user.email}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${user.user_type === 'admin' ? 'bg-purple-500/20 text-purple-400' : user.user_type === 'super_admin' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>{user.user_type || 'user'}</span></td><td className="px-4 py-3 text-slate-400 text-sm">{new Date(user.created_at).toLocaleDateString()}</td><td className="px-4 py-3">{user.is_suspended ? <span className="text-red-400 text-sm"><XCircle className="w-3 h-3 inline mr-1" /> Suspended</span> : <span className="text-emerald-400 text-sm"><CheckCircle className="w-3 h-3 inline mr-1" /> Active</span>}</td><td className="px-4 py-3"><button onClick={() => toggleSuspend(user.id, user.is_suspended)} className={`px-3 py-1 rounded-lg text-xs ${user.is_suspended ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>{user.is_suspended ? 'Activate' : 'Suspend'}</button></td></tr>))}</tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && <div className="text-center py-8 text-slate-400">No users found</div>}
            </div>
        </div>
    );
}
