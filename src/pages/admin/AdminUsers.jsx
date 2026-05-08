// src/pages/admin/AdminUsers.jsx
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, Search, Filter, RefreshCw, Loader2, AlertCircle, 
  CheckCircle, XCircle, Eye, Edit, Trash2, Download,
  Shield, User, Briefcase, Star, Building, UserCheck,
  Ban, Unlock, ChevronLeft, ChevronRight, X, Square,
  Mail, Calendar, Globe, Activity, Clock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// User roles configuration
const USER_ROLES = [
  { value: 'free', label: 'Free', icon: User, color: 'slate', description: 'Basic browsing access' },
  { value: 'registered', label: 'Registered', icon: UserCheck, color: 'blue', description: 'Can apply to jobs, submit skills' },
  { value: 'professional', label: 'Professional', icon: Star, color: 'amber', description: 'Paid monthly subscription' },
  { value: 'employer', label: 'Employer', icon: Briefcase, color: 'emerald', description: 'Hiring organization' },
  { value: 'business', label: 'Business', icon: Building, color: 'purple', description: 'Enterprise tier' },
  { value: 'admin', label: 'Admin', icon: Shield, color: 'red', description: 'Platform administrator' },
  { value: 'super_admin', label: 'Super Admin', icon: Shield, color: 'primary', description: 'Full system control' },
  { value: 'tester', label: 'Tester', icon: Activity, color: 'orange', description: 'Limited trial access' }
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [stats, setStats] = useState({ 
    total: 0, active: 0, suspended: 0, 
    free: 0, registered: 0, professional: 0, 
    employer: 0, business: 0, admin: 0, tester: 0 
  });
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);

  const itemsPerPage = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Check authentication
  useEffect(() => {
    checkAuth();
  }, []);

  // Load users when filters change
  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
      loadStats();
    }
  }, [debouncedSearch, selectedRole, selectedStatus, currentPage, isSuperAdmin]);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/admin-login'; return; }
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.user_type !== 'super_admin') {
        toast.error('Access denied. Super Admin privileges required.');
        window.location.href = '/admin/dashboard';
        return;
      }
      
      setIsSuperAdmin(true);
    } catch (err) {
      window.location.href = '/admin-login';
    }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('profiles').select('user_type, is_suspended');
      const total = data?.length || 0;
      const active = data?.filter(u => !u.is_suspended).length || 0;
      const suspended = data?.filter(u => u.is_suspended).length || 0;
      
      const roleCounts = {
        free: data?.filter(u => u.user_type === 'free').length || 0,
        registered: data?.filter(u => u.user_type === 'registered').length || 0,
        professional: data?.filter(u => u.user_type === 'professional').length || 0,
        employer: data?.filter(u => u.user_type === 'employer').length || 0,
        business: data?.filter(u => u.user_type === 'business').length || 0,
        admin: data?.filter(u => u.user_type === 'admin' || u.user_type === 'super_admin').length || 0,
        tester: data?.filter(u => u.user_type === 'tester').length || 0
      };
      
      setStats({ total, active, suspended, ...roleCounts });
    } catch (err) { console.error(err); }
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      if (selectedRole !== 'all') {
        query = query.eq('user_type', selectedRole);
      }
      if (selectedStatus !== 'all') {
        query = query.eq('is_suspended', selectedStatus === 'suspended');
      }
      if (debouncedSearch) {
        query = query.or(`email.ilike.%${debouncedSearch}%,full_name.ilike.%${debouncedSearch}%`);
      }
      
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      setUsers(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setTotalCount(count || 0);
    } catch (err) {
      setError('Failed to load users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId, newRole) {
    toast.loading('Updating user role...', { id: 'role-update' });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: newRole, tier: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast.success(`User role updated to ${newRole}`, { id: 'role-update' });
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
      toast.error('Failed to update role', { id: 'role-update' });
    }
  }

  async function toggleUserSuspend(userId, currentStatus, userEmail) {
    setShowSuspendConfirm({ id: userId, status: currentStatus, email: userEmail });
  }

  async function confirmSuspendToggle() {
    toast.loading(`${showSuspendConfirm.status ? 'Unsuspending' : 'Suspending'} user...`, { id: 'suspend-toggle' });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_suspended: !showSuspendConfirm.status,
          suspended_at: !showSuspendConfirm.status ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', showSuspendConfirm.id);
      
      if (error) throw error;
      
      toast.success(`User ${!showSuspendConfirm.status ? 'suspended' : 'unsuspended'}`, { id: 'suspend-toggle' });
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
      toast.error('Failed to update user status', { id: 'suspend-toggle' });
    } finally {
      setShowSuspendConfirm(null);
    }
  }

  async function deleteUser(userId) {
    setShowDeleteConfirm({ id: userId });
  }

  async function confirmDelete() {
    toast.loading('Deleting user...', { id: 'delete-user' });
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', showDeleteConfirm.id);
      if (error) throw error;
      
      toast.success('User deleted', { id: 'delete-user' });
      await Promise.all([loadUsers(), loadStats()]);
      setSelectedUsers(new Set());
    } catch (err) {
      toast.error('Failed to delete user', { id: 'delete-user' });
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function exportUsers() {
    setExporting(true);
    toast.loading('Exporting users...', { id: 'export' });
    try {
      const { data } = await supabase
        .from('profiles')
        .select('email, full_name, user_type, is_suspended, created_at, last_login, country_code');
      
      const headers = ['Email', 'Full Name', 'User Type', 'Status', 'Created At', 'Last Login', 'Country'];
      const rows = (data || []).map(u => [
        u.email,
        u.full_name || 'N/A',
        u.user_type,
        u.is_suspended ? 'Suspended' : 'Active',
        new Date(u.created_at).toLocaleDateString(),
        u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never',
        u.country_code || 'N/A'
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Users exported', { id: 'export' });
    } catch (err) {
      toast.error('Failed to export', { id: 'export' });
    } finally {
      setExporting(false);
    }
  }

  function toggleSelectUser(id) {
    const newSet = new Set(selectedUsers);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedUsers(newSet);
  }

  function toggleSelectAll() {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  }

  function getRoleBadge(role) {
    const roleConfig = USER_ROLES.find(r => r.value === role);
    if (!roleConfig) {
      return <span className="text-xs px-2 py-1 bg-slate-700 rounded-full">{role}</span>;
    }
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-${roleConfig.color}-500/20 text-${roleConfig.color}-400`}>
        <roleConfig.icon className="w-3 h-3" />
        {roleConfig.label}
      </span>
    );
  }

  if (!isSuperAdmin) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      
      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Delete this user? This cannot be undone."
      />
      
      <ConfirmModal
        isOpen={!!showSuspendConfirm}
        onClose={() => setShowSuspendConfirm(null)}
        onConfirm={confirmSuspendToggle}
        title={showSuspendConfirm?.status ? 'Unsuspend User' : 'Suspend User'}
        message={showSuspendConfirm?.status 
          ? `Unsuspend ${showSuspendConfirm.email}?` 
          : `Suspend ${showSuspendConfirm.email}?`}
        confirmText={showSuspendConfirm?.status ? 'Unsuspend' : 'Suspend'}
        confirmVariant={showSuspendConfirm?.status ? 'success' : 'warning'}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-400" /> User Management
            </h1>
            <p className="text-slate-400 text-sm">Manage all users on the platform</p>
          </div>
          <button onClick={exportUsers} disabled={exporting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Active</p><p className="text-2xl font-bold text-emerald-400">{stats.active}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Suspended</p><p className="text-2xl font-bold text-red-400">{stats.suspended}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Free</p><p className="text-2xl font-bold text-slate-300">{stats.free}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Registered</p><p className="text-2xl font-bold text-blue-400">{stats.registered}</p></div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search by email or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"><option value="all">All Roles</option>{USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"><option value="all">All Status</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
            <button onClick={loadUsers} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
            <span className="text-white">{selectedUsers.size} user(s) selected</span>
            <div className="flex gap-3">
              <button onClick={() => {}} className="px-4 py-2 bg-amber-600 text-white rounded-lg flex items-center gap-2"><Ban className="w-4 h-4" /> Suspend</button>
              <button onClick={() => {}} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </div>
        )}

        {/* Users Table */}
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
        : error ? <div className="text-center py-12 text-red-400">{error}<button onClick={loadUsers} className="ml-2 text-primary-400">Retry</button></div>
        : users.length === 0 ? <div className="text-center py-12"><Users className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p className="text-slate-400">No users found</p></div>
        : (
          <>
            <div className="flex items-center gap-2 mb-3"><button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400">{selectedUsers.size === users.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />} Select All ({users.length})</button></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr><th className="px-4 py-3 w-10"></th><th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Joined</th><th className="px-4 py-3 text-left">Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-4 py-3"><button onClick={() => toggleSelectUser(u.id)}>{selectedUsers.has(u.id) ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4 text-slate-500" />}</button></td>
                      <td className="px-4 py-3"><div><p className="font-medium text-white">{u.full_name || 'N/A'}</p><p className="text-sm text-slate-400">{u.email}</p></div></td>
                      <td className="px-4 py-3">{getRoleBadge(u.user_type)}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${u.is_suspended ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{u.is_suspended ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}{u.is_suspended ? 'Suspended' : 'Active'}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><div className="flex gap-2">
                        <button onClick={() => setShowRoleModal(u)} className="p-1.5 bg-slate-800 rounded hover:bg-primary-500/20"><Shield className="w-3.5 h-3.5 text-primary-400" /></button>
                        <button onClick={() => toggleUserSuspend(u.id, u.is_suspended, u.email)} className="p-1.5 bg-slate-800 rounded hover:bg-amber-500/20">{u.is_suspended ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Ban className="w-3.5 h-3.5 text-red-400" />}</button>
                        <button onClick={() => deleteUser(u.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && <div className="flex justify-between mt-6"><span>Page {currentPage} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded-lg">Prev</button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 rounded-lg">Next</button></div></div>}
          </>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-white">Change User Role</h2><button onClick={() => setShowRoleModal(null)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <p className="text-slate-400 mb-4">User: <span className="text-white">{showRoleModal.email}</span></p>
            <div className="space-y-2 mb-6">
              {USER_ROLES.map(role => (
                <button key={role.value} onClick={() => { updateUserRole(showRoleModal.id, role.value); setShowRoleModal(null); }} className={`w-full flex items-center gap-3 p-3 rounded-lg ${showRoleModal.user_type === role.value ? 'bg-primary-500/20 border border-primary-500' : 'bg-slate-800 hover:bg-slate-700'}`}>
                  <role.icon className={`w-5 h-5 text-${role.color}-400`} />
                  <div className="flex-1 text-left"><p className="text-white font-medium">{role.label}</p><p className="text-xs text-slate-500">{role.description}</p></div>
                  {showRoleModal.user_type === role.value && <CheckCircle className="w-5 h-5 text-primary-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
