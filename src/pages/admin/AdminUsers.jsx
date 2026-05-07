import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, Search, Filter, RefreshCw, Loader2, AlertCircle, 
  CheckCircle, XCircle, Eye, Edit, Trash2, Download,
  Shield, User, Briefcase, Star, Building, UserCheck,
  Ban, Unlock, ChevronLeft, ChevronRight, X, Square,
  Mail, Calendar, Globe, Activity, Clock, Filter as FilterIcon
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminUsers() {
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [stats, setStats] = useState({ 
    total: 0, active: 0, blocked: 0, 
    free: 0, registered: 0, professional: 0, 
    employer: 0, business: 0, admin: 0 
  });
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const itemsPerPage = 20;

  // User roles configuration
  const userRoles = useMemo(() => [
    { value: 'free', label: 'Free', icon: User, color: 'slate', description: 'Basic browsing access' },
    { value: 'registered', label: 'Registered', icon: UserCheck, color: 'blue', description: 'Can apply to jobs, submit skills' },
    { value: 'professional', label: 'Professional', icon: Star, color: 'amber', description: 'Paid monthly subscription' },
    { value: 'employer', label: 'Employer', icon: Briefcase, color: 'emerald', description: 'Hiring organization' },
    { value: 'business', label: 'Business', icon: Building, color: 'purple', description: 'Enterprise tier' },
    { value: 'admin', label: 'Admin', icon: Shield, color: 'red', description: 'Platform administrator' },
    { value: 'super_admin', label: 'Super Admin', icon: Shield, color: 'primary', description: 'Full system control' }
  ], []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Check authentication and super admin status
  useEffect(() => {
    checkAuth();
  }, []);

  // Load users when filters change
  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [debouncedSearch, selectedRole, selectedStatus, currentPage, isSuperAdmin]);

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
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('profiles').select('user_type, is_blocked');
      const total = data?.length || 0;
      const active = data?.filter(u => !u.is_blocked).length || 0;
      const blocked = data?.filter(u => u.is_blocked).length || 0;
      
      const roleCounts = {
        free: data?.filter(u => u.user_type === 'free').length || 0,
        registered: data?.filter(u => u.user_type === 'registered').length || 0,
        professional: data?.filter(u => u.user_type === 'professional').length || 0,
        employer: data?.filter(u => u.user_type === 'employer').length || 0,
        business: data?.filter(u => u.user_type === 'business').length || 0,
        admin: data?.filter(u => u.user_type === 'admin' || u.user_type === 'super_admin').length || 0
      };
      
      setStats({ total, active, blocked, ...roleCounts });
    } catch (err) { 
      console.error('Stats error:', err); 
    }
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
        query = query.eq('is_blocked', selectedStatus === 'blocked');
      }
      if (debouncedSearch) {
        query = query.or(`email.ilike.%${debouncedSearch}%,full_name.ilike.%${debouncedSearch}%`);
      }
      
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      setUsers(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Load users error:', err);
      setError('Failed to load users. Please refresh.');
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
        .update({ 
          user_type: newRole, 
          tier: newRole, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Log the action to audit table
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'role_change',
        target_id: userId,
        details: { old_role: showRoleModal?.user_type, new_role: newRole },
        created_at: new Date().toISOString()
      });
      
      toast.success(`User role updated to ${newRole}`, { id: 'role-update' });
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
      console.error('Role update error:', err);
      toast.error('Failed to update role', { id: 'role-update' });
    }
  }

  async function toggleUserBlock(userId, currentStatus, userEmail) {
    setShowBlockConfirm({ id: userId, status: currentStatus, email: userEmail });
  }

  async function confirmBlockToggle() {
    toast.loading(`${showBlockConfirm.status ? 'Unblocking' : 'Blocking'} user...`, { id: 'block-toggle' });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_blocked: !showBlockConfirm.status,
          block_reason: !showBlockConfirm.status ? 'Blocked by Super Admin' : null,
          blocked_at: !showBlockConfirm.status ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', showBlockConfirm.id);
      
      if (error) throw error;
      
      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: !showBlockConfirm.status ? 'block_user' : 'unblock_user',
        target_id: showBlockConfirm.id,
        details: { email: showBlockConfirm.email },
        created_at: new Date().toISOString()
      });
      
      toast.success(`User ${!showBlockConfirm.status ? 'blocked' : 'unblocked'} successfully`, { id: 'block-toggle' });
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
      console.error('Block toggle error:', err);
      toast.error('Failed to update user status', { id: 'block-toggle' });
    } finally {
      setShowBlockConfirm(null);
    }
  }

  async function deleteUser(userId) {
    setShowDeleteConfirm({ id: userId });
  }

  async function confirmDelete() {
    toast.loading('Deleting user...', { id: 'delete-user' });
    try {
      // First get user email for logging
      const { data: userData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', showDeleteConfirm.id)
        .single();
      
      // Delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (profileError) throw profileError;
      
      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'delete_user',
        target_id: showDeleteConfirm.id,
        details: { email: userData?.email },
        created_at: new Date().toISOString()
      });
      
      toast.success('User deleted successfully', { id: 'delete-user' });
      await Promise.all([loadUsers(), loadStats()]);
      setSelectedUsers(new Set());
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete user', { id: 'delete-user' });
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function loadUserActivity(userId, userEmail) {
    setShowActivityModal({ id: userId, email: userEmail });
    try {
      // Get auth logs (simulated - you'd need actual auth logs table)
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('target_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setUserActivity(auditLogs || []);
    } catch (err) {
      console.error('Activity error:', err);
      setUserActivity([]);
    }
  }

  async function exportUsers() {
    setExporting(true);
    toast.loading('Exporting users...', { id: 'export' });
    try {
      const { data } = await supabase
        .from('profiles')
        .select('email, full_name, user_type, is_blocked, created_at, last_login, country_code');
      
      const headers = ['Email', 'Full Name', 'User Type', 'Status', 'Created At', 'Last Login', 'Country'];
      const rows = (data || []).map(u => [
        u.email,
        u.full_name || 'N/A',
        u.user_type,
        u.is_blocked ? 'Blocked' : 'Active',
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
      toast.success('Users exported successfully', { id: 'export' });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export users', { id: 'export' });
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

  async function bulkAction(action) {
    if (action === 'delete') {
      setShowDeleteConfirm({ ids: Array.from(selectedUsers), type: 'bulk', count: selectedUsers.size });
    } else if (action === 'block') {
      setShowBlockConfirm({ ids: Array.from(selectedUsers), type: 'bulk', count: selectedUsers.size, action: 'block' });
    }
  }

  async function confirmBulkAction() {
    toast.loading(`Processing ${showDeleteConfirm?.count || showBlockConfirm?.count} users...`, { id: 'bulk-action' });
    try {
      if (showDeleteConfirm?.type === 'bulk') {
        for (const id of showDeleteConfirm.ids) {
          await supabase.from('profiles').delete().eq('id', id);
        }
        toast.success(`Deleted ${showDeleteConfirm.ids.length} users`, { id: 'bulk-action' });
        setSelectedUsers(new Set());
      } else if (showBlockConfirm?.type === 'bulk') {
        for (const id of showBlockConfirm.ids) {
          await supabase
            .from('profiles')
            .update({ is_blocked: true, blocked_at: new Date().toISOString() })
            .eq('id', id);
        }
        toast.success(`Blocked ${showBlockConfirm.ids.length} users`, { id: 'bulk-action' });
        setSelectedUsers(new Set());
      }
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
      console.error('Bulk action error:', err);
      toast.error('Failed to process bulk action', { id: 'bulk-action' });
    } finally {
      setShowDeleteConfirm(null);
      setShowBlockConfirm(null);
    }
  }

  function getRoleBadge(role) {
    const roleConfig = userRoles.find(r => r.value === role);
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

  const statCards = [
    { title: 'Total Users', value: stats.total, icon: Users, color: 'primary' },
    { title: 'Active', value: stats.active, icon: UserCheck, color: 'emerald' },
    { title: 'Blocked', value: stats.blocked, icon: Ban, color: 'red' },
    { title: 'Free', value: stats.free, icon: User, color: 'slate' },
    { title: 'Registered', value: stats.registered, icon: UserCheck, color: 'blue' },
    { title: 'Professional', value: stats.professional, icon: Star, color: 'amber' },
    { title: 'Employer', value: stats.employer, icon: Briefcase, color: 'emerald' },
    { title: 'Business', value: stats.business, icon: Building, color: 'purple' },
    { title: 'Admins', value: stats.admin, icon: Shield, color: 'primary' }
  ];

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      
      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={showDeleteConfirm?.type === 'bulk' ? confirmBulkAction : confirmDelete}
        title="Confirm Delete"
        message={showDeleteConfirm?.type === 'bulk' 
          ? `Are you sure you want to delete ${showDeleteConfirm.count} users? This action cannot be undone.`
          : 'Are you sure you want to delete this user? This action cannot be undone.'}
      />
      
      <ConfirmModal
        isOpen={!!showBlockConfirm && !showBlockConfirm.type}
        onClose={() => setShowBlockConfirm(null)}
        onConfirm={confirmBlockToggle}
        title={showBlockConfirm?.status ? 'Unblock User' : 'Block User'}
        message={showBlockConfirm?.status 
          ? `Are you sure you want to unblock ${showBlockConfirm.email}?` 
          : `Are you sure you want to block ${showBlockConfirm.email}?`}
        confirmText={showBlockConfirm?.status ? 'Unblock' : 'Block'}
        confirmVariant={showBlockConfirm?.status ? 'success' : 'danger'}
      />
      
      <ConfirmModal
        isOpen={!!showBlockConfirm?.type === 'bulk'}
        onClose={() => setShowBlockConfirm(null)}
        onConfirm={confirmBulkAction}
        title="Confirm Bulk Block"
        message={`Are you sure you want to block ${showBlockConfirm?.count} users?`}
        confirmText="Block"
        confirmVariant="danger"
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
          <button 
            onClick={exportUsers} 
            disabled={exporting}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>

        {/* Stats Grid - Scrollable on mobile */}
        <div className="overflow-x-auto pb-4 mb-6">
          <div className="flex gap-4 min-w-max">
            {statCards.map((stat, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 min-w-[120px]">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
                  <p className="text-slate-400 text-xs">{stat.title}</p>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Roles</option>
              {userRoles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
            
            <button
              onClick={() => loadUsers()}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="text-white">{selectedUsers.size} user(s) selected</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => bulkAction('block')}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Block Selected
              </button>
              <button
                onClick={() => bulkAction('delete')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
            <button onClick={loadUsers} className="mt-4 text-primary-400 hover:text-primary-300">Try Again</button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">No users found</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                {selectedUsers.size === users.length ? (
                  <CheckCircle className="w-4 h-4 text-primary-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-sm">Select All ({users.length})</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 rounded-t-xl">
                  <tr>
                    <th className="px-4 py-3 text-left text-white text-sm w-10"></th>
                    <th className="px-4 py-3 text-left text-white text-sm">User</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Role</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Status</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Joined</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr key={userItem.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelectUser(userItem.id)}>
                          {selectedUsers.has(userItem.id) ? (
                            <CheckCircle className="w-4 h-4 text-primary-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{userItem.full_name || 'N/A'}</p>
                          <p className="text-sm text-slate-400">{userItem.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(userItem.user_type)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          userItem.is_blocked 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {userItem.is_blocked ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {userItem.is_blocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                        {new Date(userItem.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowRoleModal({ id: userItem.id, email: userItem.email, user_type: userItem.user_type })}
                            className="p-1.5 bg-slate-800 rounded hover:bg-primary-500/20 transition-colors"
                            title="Change Role"
                          >
                            <Shield className="w-3.5 h-3.5 text-primary-400" />
                          </button>
                          <button
                            onClick={() => loadUserActivity(userItem.id, userItem.email)}
                            className="p-1.5 bg-slate-800 rounded hover:bg-blue-500/20 transition-colors"
                            title="View Activity"
                          >
                            <Activity className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          <button
                            onClick={() => toggleUserBlock(userItem.id, userItem.is_blocked, userItem.email)}
                            className="p-1.5 bg-slate-800 rounded hover:bg-amber-500/20 transition-colors"
                            title={userItem.is_blocked ? 'Unblock' : 'Block'}
                          >
                            {userItem.is_blocked ? (
                              <Unlock className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Ban className="w-3.5 h-3.5 text-red-400" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteUser(userItem.id)}
                            className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap justify-between items-center gap-4 mt-6">
                <p className="text-sm text-slate-400">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} users
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Change User Role</h2>
              <button onClick={() => setShowRoleModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 mb-4 pb-3 border-b border-slate-800">
              User: <span className="text-white font-medium">{showRoleModal.email}</span>
            </p>
            <div className="space-y-2 mb-6">
              {userRoles.map(role => (
                <button
                  key={role.value}
                  onClick={() => {
                    updateUserRole(showRoleModal.id, role.value);
                    setShowRoleModal(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    showRoleModal.user_type === role.value
                      ? 'bg-primary-500/20 border border-primary-500'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  <role.icon className={`w-5 h-5 text-${role.color}-400`} />
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">{role.label}</p>
                    <p className="text-xs text-slate-500">{role.description}</p>
                  </div>
                  {showRoleModal.user_type === role.value && (
                    <CheckCircle className="w-5 h-5 text-primary-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">User Activity</h2>
              <button onClick={() => setShowActivityModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 mb-4">
              User: <span className="text-white font-medium">{showActivityModal.email}</span>
            </p>
            {userActivity.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No activity records found</p>
            ) : (
              <div className="space-y-3">
                {userActivity.map(activity => (
                  <div key={activity.id} className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-white">{activity.action}</p>
                    {activity.details && (
                      <pre className="text-xs text-slate-400 mt-1 overflow-x-auto">
                        {JSON.stringify(activity.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
