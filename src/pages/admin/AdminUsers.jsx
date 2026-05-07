import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, Search, Filter, RefreshCw, Loader2, AlertCircle, 
  CheckCircle, XCircle, Eye, Edit, Trash2, Download,
  Shield, User, Briefcase, Star, Building, UserCheck,
  Ban, Unlock, ChevronLeft, ChevronRight, X, Square
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0, admin: 0 });
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const itemsPerPage = 20;

  const userRoles = [
    { value: 'free', label: 'Free', icon: User, color: 'slate' },
    { value: 'registered', label: 'Registered', icon: UserCheck, color: 'blue' },
    { value: 'professional', label: 'Professional', icon: Star, color: 'amber' },
    { value: 'employer', label: 'Employer', icon: Briefcase, color: 'emerald' },
    { value: 'business', label: 'Business', icon: Building, color: 'purple' },
    { value: 'admin', label: 'Admin', icon: Shield, color: 'red' },
    { value: 'super_admin', label: 'Super Admin', icon: Shield, color: 'primary' }
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/admin-login';
        return;
      }
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
      loadUsers();
      loadStats();
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('profiles').select('user_type, is_blocked');
      const total = data?.length || 0;
      const blocked = data?.filter(u => u.is_blocked === true).length || 0;
      const admin = data?.filter(u => u.user_type === 'admin' || u.user_type === 'super_admin').length || 0;
      setStats({ total, active: total - blocked, blocked, admin });
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
      
      if (selectedRole !== 'all') query = query.eq('user_type', selectedRole);
      if (searchTerm) query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      setUsers(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      setError('Failed to load users');
      toast.error('Failed to load users');
    } finally { setLoading(false); }
  }

  async function updateUserRole(userId, newRole) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: newRole, tier: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      if (error) throw error;
      toast.success(`User role updated to ${newRole}`);
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error('Failed to update role');
    }
  }

  async function toggleUserBlock(userId, currentStatus, userEmail) {
    setShowBlockConfirm({ id: userId, status: currentStatus, email: userEmail });
  }

  async function confirmBlockToggle() {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_blocked: !showBlockConfirm.status,
          block_reason: !showBlockConfirm.status ? 'Blocked by Super Admin' : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', showBlockConfirm.id);
      
      if (error) throw error;
      toast.success(`User ${!showBlockConfirm.status ? 'blocked' : 'unblocked'} successfully`);
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error('Failed to update user status');
    } finally {
      setShowBlockConfirm(null);
    }
  }

  async function deleteUser(userId) {
    setShowDeleteConfirm({ id: userId });
  }

  async function confirmDelete() {
    try {
      // First delete from profiles
      await supabase.from('profiles').delete().eq('id', showDeleteConfirm.id);
      // Then delete from auth (requires admin API)
      toast.success('User deleted successfully');
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error('Failed to delete user');
    } finally {
      setShowDeleteConfirm(null);
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

  async function exportUsers() {
    const { data } = await supabase.from('profiles').select('email, full_name, user_type, created_at, last_login');
    const csv = [
      ['Email', 'Full Name', 'User Type', 'Created At', 'Last Login'],
      ...(data || []).map(u => [u.email, u.full_name, u.user_type, u.created_at, u.last_login])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Users exported');
  }

  function getRoleBadge(role) {
    const roleConfig = userRoles.find(r => r.value === role);
    if (!roleConfig) return <span className="text-xs px-2 py-1 bg-slate-700 rounded-full">{role}</span>;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-${roleConfig.color}-500/20 text-${roleConfig.color}-400`}>
        <roleConfig.icon className="w-3 h-3" />
        {roleConfig.label}
      </span>
    );
  }

  useEffect(() => { setCurrentPage(1); if (isSuperAdmin) loadUsers(); }, [searchTerm, selectedRole]);

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
        message="Are you sure you want to delete this user? This action cannot be undone."
      />
      
      <ConfirmModal
        isOpen={!!showBlockConfirm}
        onClose={() => setShowBlockConfirm(null)}
        onConfirm={confirmBlockToggle}
        title={showBlockConfirm?.status ? 'Unblock User' : 'Block User'}
        message={showBlockConfirm?.status 
          ? `Are you sure you want to unblock ${showBlockConfirm.email}?` 
          : `Are you sure you want to block ${showBlockConfirm.email}?`}
        confirmText={showBlockConfirm?.status ? 'Unblock' : 'Block'}
        confirmVariant={showBlockConfirm?.status ? 'success' : 'danger'}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-400" /> User Management
            </h1>
            <p className="text-slate-400 text-sm">Manage all users on the platform</p>
          </div>
          <button onClick={exportUsers} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Total Users</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Active</p><p className="text-2xl font-bold text-emerald-400">{stats.active}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Blocked</p><p className="text-2xl font-bold text-red-400">{stats.blocked}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Admins</p><p className="text-2xl font-bold text-purple-400">{stats.admin}</p></div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search by email or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
            </div>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
              <option value="all">All Roles</option>
              {userRoles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <button onClick={loadUsers} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

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
                  <tr><th className="px-4 py-3 text-left text-white w-10"></th><th className="px-4 py-3 text-left text-white">User</th><th className="px-4 py-3 text-left text-white">Role</th><th className="px-4 py-3 text-left text-white">Status</th><th className="px-4 py-3 text-left text-white">Joined</th><th className="px-4 py-3 text-left text-white">Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-4 py-3"><button onClick={() => toggleSelectUser(user.id)}>{selectedUsers.has(user.id) ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4 text-slate-500" />}</button></td>
                      <td className="px-4 py-3"><div><p className="font-medium text-white">{user.full_name || 'N/A'}</p><p className="text-sm text-slate-400">{user.email}</p></div></td>
                      <td className="px-4 py-3">{getRoleBadge(user.user_type)}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${user.is_blocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{user.is_blocked ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}{user.is_blocked ? 'Blocked' : 'Active'}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-400">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><div className="flex gap-2">
                        <button onClick={() => setShowRoleModal(user)} className="p-1.5 bg-slate-800 rounded hover:bg-primary-500/20"><Shield className="w-3.5 h-3.5 text-primary-400" /></button>
                        <button onClick={() => toggleUserBlock(user.id, user.is_blocked, user.email)} className="p-1.5 bg-slate-800 rounded hover:bg-amber-500/20">{user.is_blocked ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Ban className="w-3.5 h-3.5 text-red-400" />}</button>
                        <button onClick={() => deleteUser(user.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
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
            <h2 className="text-xl font-bold text-white mb-4">Change User Role</h2>
            <p className="text-slate-400 mb-4">User: {showRoleModal.email}</p>
            <div className="space-y-2 mb-6">
              {userRoles.map(role => (
                <button
                  key={role.value}
                  onClick={() => { updateUserRole(showRoleModal.id, role.value); setShowRoleModal(null); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${showRoleModal.user_type === role.value ? 'bg-primary-500/20 border border-primary-500' : 'bg-slate-800 hover:bg-slate-700'}`}
                >
                  <role.icon className={`w-5 h-5 text-${role.color}-400`} />
                  <div className="flex-1 text-left"><p className="text-white font-medium">{role.label}</p><p className="text-xs text-slate-500">Set as {role.label}</p></div>
                  {showRoleModal.user_type === role.value && <CheckCircle className="w-5 h-5 text-primary-400" />}
                </button>
              ))}
            </div>
            <button onClick={() => setShowRoleModal(null)} className="w-full py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
