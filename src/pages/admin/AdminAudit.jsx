import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  FileText, Search, Filter, RefreshCw, Loader2, AlertCircle,
  Download, Calendar, User, Shield, Briefcase, Users,
  CheckCircle, XCircle, Edit, Trash2, Eye
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [dateRange, setDateRange] = useState('7');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const itemsPerPage = 30;

  const actionTypes = [
    { value: 'all', label: 'All Actions', icon: Eye },
    { value: 'role_change', label: 'Role Changes', icon: Shield },
    { value: 'job_approved', label: 'Job Approvals', icon: CheckCircle },
    { value: 'job_rejected', label: 'Job Rejections', icon: XCircle },
    { value: 'job_delete', label: 'Job Deletions', icon: Trash2 },
    { value: 'block_user', label: 'User Blocks', icon: Users },
    { value: 'unblock_user', label: 'User Unblocks', icon: Users },
    { value: 'delete_user', label: 'User Deletions', icon: Trash2 }
  ];

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAuditLogs();
    }
  }, [searchTerm, selectedAction, dateRange, currentPage, isSuperAdmin]);

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

  function getDateRangeFilter() {
    const days = parseInt(dateRange);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  async function loadAuditLogs() {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .gte('created_at', getDateRangeFilter());
      
      if (selectedAction !== 'all') {
        query = query.eq('action', selectedAction);
      }
      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,details::text.ilike.%${searchTerm}%`);
      }
      
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      // Enrich with user emails
      const enrichedLogs = await Promise.all((data || []).map(async (log) => {
        if (log.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', log.user_id)
            .single();
          return { ...log, user_email: profile?.email || 'Unknown' };
        }
        return { ...log, user_email: 'System' };
      }));
      
      setLogs(enrichedLogs);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      setError('Failed to load audit logs');
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  async function exportLogs() {
    toast.loading('Exporting logs...', { id: 'export' });
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      const headers = ['Timestamp', 'Action', 'User ID', 'Target ID', 'Details'];
      const rows = (data || []).map(log => [
        new Date(log.created_at).toLocaleString(),
        log.action,
        log.user_id || 'System',
        log.target_id || 'N/A',
        typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || 'N/A')
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Logs exported', { id: 'export' });
    } catch (err) {
      toast.error('Failed to export', { id: 'export' });
    }
  }

  function getActionIcon(action) {
    switch(action) {
      case 'role_change': return <Shield className="w-4 h-4 text-purple-400" />;
      case 'job_approved': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'job_rejected': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'job_delete': return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'block_user': return <Users className="w-4 h-4 text-amber-400" />;
      case 'unblock_user': return <Users className="w-4 h-4 text-emerald-400" />;
      case 'delete_user': return <Trash2 className="w-4 h-4 text-red-400" />;
      default: return <Eye className="w-4 h-4 text-slate-400" />;
    }
  }

  if (!isSuperAdmin) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-400" /> Audit Logs
            </h1>
            <p className="text-slate-400 text-sm">Complete system activity history</p>
          </div>
          <button onClick={exportLogs} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
            </div>
            <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
              {actionTypes.map(action => <option key={action.value} value={action.value}>{action.label}</option>)}
            </select>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button onClick={loadAuditLogs} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}<button onClick={loadAuditLogs} className="ml-2 text-primary-400">Retry</button></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12"><FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p className="text-slate-400">No audit logs found</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr><th className="px-4 py-3 text-left text-white text-sm">Timestamp</th><th className="px-4 py-3 text-left text-white text-sm">Action</th><th className="px-4 py-3 text-left text-white text-sm">User</th><th className="px-4 py-3 text-left text-white text-sm">Target ID</th><th className="px-4 py-3 text-left text-white text-sm">Details</th></tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-sm">{getActionIcon(log.action)} {log.action.replace('_', ' ')}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-300">{log.user_email}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 font-mono">{log.target_id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <span className="text-sm text-slate-400">Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded-lg">Prev</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 rounded-lg">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
