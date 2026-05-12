// src/pages/admin/AdminUsers.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Search, Loader2, CheckCircle, XCircle, Mail, Calendar } from 'lucide-react';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        checkAdminAndLoadUsers();
    }, []);

    async function checkAdminAndLoadUsers() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.email !== 'bluskyeconsult@gmail.com') {
            window.location.href = '/admin-login';
            return;
        }
        await loadUsers();
    }

    async function loadUsers() {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        setUsers(data || []);
        setLoading(false);
    }

    async function toggleUserStatus(userId, currentStatus) {
        await supabase
            .from('profiles')
            .update({ is_suspended: !currentStatus })
            .eq('id', userId);
        loadUsers();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    const filteredUsers = users.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manage Users</h1>
                    <p className="text-slate-400">View and manage all user accounts</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search users..."
                        className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr><th className="px-4 py-3 text-left text-white text-sm">User</th><th className="px-4 py-3 text-left text-white text-sm">Type</th><th className="px-4 py-3 text-left text-white text-sm">Joined</th><th className="px-4 py-3 text-left text-white text-sm">Status</th><th className="px-4 py-3 text-left text-white text-sm">Action</th></tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                                    <td className="px-4 py-3"><div><p className="text-white text-sm">{user.full_name || 'N/A'}</p><p className="text-slate-400 text-xs">{user.email}</p></div></td>
                                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-400">{user.user_type || 'user'}</span></td>
                                    <td className="px-4 py-3 text-slate-400 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">{user.is_suspended ? <span className="text-red-400 text-sm">Suspended</span> : <span className="text-emerald-400 text-sm">Active</span>}</td>
                                    <td className="px-4 py-3"><button onClick={() => toggleUserStatus(user.id, user.is_suspended)} className={`px-3 py-1 rounded-lg text-xs ${user.is_suspended ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} text-white`}>{user.is_suspended ? 'Activate' : 'Suspend'}</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
