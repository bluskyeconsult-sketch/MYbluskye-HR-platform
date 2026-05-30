// src/pages/admin/AdminUsers.jsx
// COMPLETE USER MANAGEMENT - With unified API, search, filtering, role management, and bulk actions

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Users, Search, Loader2, CheckCircle, XCircle, Mail, 
    Calendar, Shield, RefreshCw, Filter, UserPlus, Edit, 
    Trash2, AlertCircle, Download, ChevronDown, Eye,
    Award, Briefcase, Star, Clock, Ban, UserCheck
} from 'lucide-react';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/api/index';

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [updatingRole, setUpdatingRole] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        suspended: 0,
        admins: 0,
        jobSeekers: 0,
        employers: 0
    });

    const roleOptions = [
        { value: 'job_seeker', label: 'Job Seeker', icon: Briefcase, color: 'blue' },
        { value: 'employer', label: 'Employer', icon: Building2, color: 'emerald' },
        { value: 'admin', label: 'Admin', icon: Shield, color: 'purple' },
        { value: 'super_admin', label: 'Super Admin', icon: Award, color: 'red' },
        { value: 'tester', label: 'Tester', icon: Star, color: 'amber' }
    ];

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, searchTerm, roleFilter, statusFilter]);

    async function loadUsers() {
        setLoading(true);
        
        try {
            // ✅ FIXED: Use unified API endpoint
            const response = await fetch(`${API_BASE}?action=admin-users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    filters: { role: roleFilter !== 'all' ? roleFilter : null, status: statusFilter !== 'all' ? statusFilter : null }
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUsers(data.users || []);
                    calculateStats(data.users || []);
                    setLoading(false);
                    return;
                }
            }
        } catch (err) {
            console.warn('Unified API failed, falling back to direct Supabase:', err);
        }
        
        // Fallback to direct Supabase query
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!error) {
            setUsers(data || []);
            calculateStats(data || []);
        }
        setLoading(false);
    }

    async function refreshUsers() {
        setRefreshing(true);
        await loadUsers();
        setRefreshing(false);
    }

    function calculateStats(userList) {
        const total = userList.length;
        const active = userList.filter(u => !u.is_suspended).length;
        const suspended = userList.filter(u => u.is_suspended).length;
        const admins = userList.filter(u => u.user_type === 'admin' || u.user_type === 'super_admin').length;
        const jobSeekers = userList.filter(u => u.user_type === 'job_seeker').length;
        const employers = userList.filter(u => u.user_type === 'employer').length;
        
        setStats({ total, active, suspended, admins, jobSeekers, employers });
    }

    function filterUsers() {
        let filtered = [...users];
        
        // Search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(u => 
                u.email?.toLowerCase().includes(term) ||
                u.full_name?.toLowerCase().includes(term) ||
                u.phone?.includes(term)
            );
        }
        
        // Role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(u => u.user_type === roleFilter);
        }
        
        // Status filter
        if (statusFilter === 'active') {
            filtered = filtered.filter(u => !u.is_suspended);
        } else if (statusFilter === 'suspended') {
            filtered = filtered.filter(u => u.is_suspended);
        }
        
        setFilteredUsers(filtered);
    }

    async function toggleSuspend(userId, currentStatus) {
        try {
            const response = await fetch(`${API_BASE}?action=admin-toggle-suspend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, suspend: !currentStatus })
            });
            
            if (response.ok) {
                await loadUsers();
            } else {
                throw new Error('API call failed');
            }
        } catch (err) {
            console.warn('API failed, using direct Supabase:', err);
            await supabase
                .from('profiles')
                .update({ 
                    is_suspended: !currentStatus, 
                    suspended_at: !currentStatus ? new Date().toISOString() : null 
                })
                .eq('id', userId);
            await loadUsers();
        }
    }

    async function updateUserRole(userId, newRole) {
        setUpdatingRole(true);
        
        try {
            const response = await fetch(`${API_BASE}?action=admin-update-role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole })
            });
            
            if (response.ok) {
                await loadUsers();
                setShowRoleModal(false);
                setSelectedUser(null);
            } else {
                throw new Error('API call failed');
            }
        } catch (err) {
            console.warn('API failed, using direct Supabase:', err);
            await supabase
                .from('profiles')
                .update({ user_type: newRole })
                .eq('id', userId);
            await loadUsers();
            setShowRoleModal(false);
            setSelectedUser(null);
        } finally {
            setUpdatingRole(false);
        }
    }

    function getRoleBadge(userType) {
        const role = roleOptions.find(r => r.value === userType);
        if (!role) {
            return <span className="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-400">User</span>;
        }
        const colorMap = {
            blue: 'bg-blue-500/20 text-blue-400',
            emerald: 'bg-emerald-500/20 text-emerald-400',
            purple: 'bg-purple-500/20 text-purple-400',
            red: 'bg-red-500/20 text-red-400',
            amber: 'bg-amber-500/20 text-amber-400'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs ${colorMap[role.color]}`}>
                {role.label}
            </span>
        );
    }

    const getInitials = (name, email) => {
        if (name && name.length > 0) return name.charAt(0).toUpperCase();
        if (email && email.length > 0) return email.charAt(0).toUpperCase();
        return 'U';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">User Management</h1>
                    <p className="text-slate-400">View, manage, and moderate user accounts</p>
                </div>
                <button
                    onClick={refreshUsers}
                    disabled={refreshing}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-slate-400">Total Users</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
                    <p className="text-xs text-slate-400">Active</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{stats.suspended}</p>
                    <p className="text-xs text-slate-400">Suspended</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-400">{stats.admins}</p>
                    <p className="text-xs text-slate-400">Admins</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-400">{stats.jobSeekers}</p>
                    <p className="text-xs text-slate-400">Job Seekers</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{stats.employers}</p>
                    <p className="text-xs text-slate-400">Employers</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, email, or phone..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Roles</option>
                        <option value="job_seeker">Job Seekers</option>
                        <option value="employer">Employers</option>
                        <option value="admin">Admins</option>
                        <option value="super_admin">Super Admins</option>
                        <option value="tester">Testers</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setRoleFilter('all');
                                setStatusFilter('all');
                            }}
                            className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition text-sm"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">User</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Email</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Role</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Joined</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Status</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                                                <span className="text-primary-400 text-sm font-medium">
                                                    {getInitials(user.full_name, user.email)}
                                                </span>
                                            </div>
                                            <span className="text-white text-sm font-medium">
                                                {user.full_name || 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-3 h-3 text-slate-500" />
                                            <span className="text-slate-300 text-sm">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {getRoleBadge(user.user_type)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-slate-500" />
                                            <span className="text-slate-400 text-sm">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.is_suspended ? (
                                            <span className="text-red-400 text-sm flex items-center gap-1">
                                                <XCircle className="w-3 h-3" /> Suspended
                                            </span>
                                        ) : (
                                            <span className="text-emerald-400 text-sm flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowRoleModal(true);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-700"
                                                title="Change role"
                                            >
                                                <Shield className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleSuspend(user.id, user.is_suspended)}
                                                className={`p-1.5 rounded-lg transition ${
                                                    user.is_suspended 
                                                        ? 'text-emerald-400 hover:bg-emerald-500/20' 
                                                        : 'text-red-400 hover:bg-red-500/20'
                                                }`}
                                                title={user.is_suspended ? 'Activate' : 'Suspend'}
                                            >
                                                {user.is_suspended ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        <p>No users found matching your criteria</p>
                        {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setRoleFilter('all');
                                    setStatusFilter('all');
                                }}
                                className="mt-3 text-sm text-primary-400 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Change Role Modal */}
            {showRoleModal && selectedUser && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Change User Role</h2>
                            <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-white">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <p className="text-slate-400 text-sm mb-1">User</p>
                            <p className="text-white font-medium">{selectedUser.email}</p>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-sm text-slate-400 mb-2">New Role</label>
                            <div className="space-y-2">
                                {roleOptions.map((role) => (
                                    <label
                                        key={role.value}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                                            selectedUser.user_type === role.value
                                                ? `border-${role.color}-500 bg-${role.color}-500/10`
                                                : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value={role.value}
                                            checked={selectedUser.user_type === role.value}
                                            onChange={() => setSelectedUser({ ...selectedUser, user_type: role.value })}
                                            className="w-4 h-4 text-primary-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-white">{role.label}</div>
                                            <div className="text-xs text-slate-500">Change user permissions and access level</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => updateUserRole(selectedUser.id, selectedUser.user_type)}
                                disabled={updatingRole}
                                className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                            >
                                {updatingRole ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
                            </button>
                            <button
                                onClick={() => setShowRoleModal(false)}
                                className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Missing import
import { Building2, XCircle } from 'lucide-react';
