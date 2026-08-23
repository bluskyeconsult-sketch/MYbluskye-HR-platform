import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileText, Search, RefreshCw, Loader2, AlertCircle,
  Download, Calendar, User, Shield, Briefcase, Users,
  CheckCircle, XCircle, Edit, Trash2, Eye, Activity,
  TrendingUp, Award, Clock, Filter, Brain
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// FIXED (2026-08-22):
// 1. Disconnected Supabase client (createClient() directly) — same
//    pattern found and fixed repeatedly this session. Now uses the
//    shared singleton.
// 2. `Brain` was used as an icon in the actionTypes array (evaluated at
//    module load, before anything renders) but never imported — this
//    threw `ReferenceError: Brain is not defined` immediately, crashing
//    this entire page before any UI could appear, every single time it
//    was visited. Same bug class as the Briefcase/Palette import
//    fix already applied to AICourseBuilder.jsx. Added the import.

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [dateRange, setDateRange] = useState('7');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, approved: 0, denied: 0, avgRiskScore: 0 });
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const itemsPerPage = 30;

  const actionTypes = [
    { value: 'all', label: 'All Actions', icon: Activity },
    { value: 'role_change', label: 'Role Changes', icon: Shield },
    { value: 'job_approved', label: 'Job Approvals', icon: CheckCircle },
    { value: 'job_rejected', label: 'Job Rejections', icon: XCircle },
    { value: 'job_delete', label: 'Job Deletions', icon: Trash2 },
    { value: 'block_user', label: 'User Blocks', icon: Users },
    { value: 'unblock_user', label: 'User Unblocks', icon: Users },
    { value: 'delete_user', label: 'User Deletions', icon: Trash2 },
    { value: 'ai_decision', label: 'AI Decisions', icon: Brain },
  ];

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAuditLogs();
      loadStats();
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

  async function loadStats() {
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('was_allowed, risk_score')
        .gte('created_at', getDateRangeFilter());
      
      const total = data?.length || 0;
      const approved = data?.filter(l => l.was_allowed === true).length || 0;
      const denied = data?.filter(l => l.was_allowed === false).length || 0;
      const avgRiskScore = data?.reduce((sum, l) => sum + (l.risk_score || 0), 0) / (total || 1);
      
      setStats({ total, approved, denied, avgRiskScore: Math.round(avgRiskScore) });
    } catch (err) {
      console.error('Stats error:', err);
    }
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
        if (selectedAction === 'ai_decision') {
          query = query.not('odusbaba_decision_id', 'is', null);
        } else {
          query = query.eq('action_type', selectedAction);
        }
      }
      if (searchTerm) {
        query = query.or(`action_type.ilike.%${searchTerm}%,details::text.ilike.%${searchTerm}%,jurisdiction.ilike.%${searchTerm}%`);
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
            .select('email, full_name')
            .eq('id', log.user_id)
            .single();
          return { ...log, user_email: profile?.email || 'Unknown', user_name: profile?.full_name };
        }
        return { ...log, user_email: 'System', user_name: 'System' };
      }));
      
      setLogs(enrichedLogs);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Load logs error:', err);
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
      
      const headers = ['Timestamp', 'Action', 'User ID', 'Jurisdiction', 'Risk Score', 'Was Allowed', 'Deny Reason', 'Details'];
      const rows = (data || []).map(log => [
        new Date(log.created_at).toLocaleString(),
        log.action_type || 'N/A',
        log.user_id || 'System',
        log.jurisdiction || 'N/A',
        log.risk_score || 'N/A',
        log.was_allowed ? 'Yes' : 'No',
        log.deny_reason || 'N/A',
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

  function getActionIcon(actionType) {
    switch(actionType) {
      case 'role_change': return <Shield className="w-4 h-4 text-purple-400" />;
      case 'job_approved': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'job_rejected': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'job_delete': return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'block_user': return <Users className="w-4 h-4 text-amber-400" />;
      case 'unblock_user': return <Users className="w-4 h-4 text-emerald-400" />;
      case 'delete_user': return <Trash2 className="w-4 h-4 text-red-400" />;
      default: 
        if (actionType && actionType.includes('odusbaba')) {
          return <Brain className="w-4 h-4 text-blue-400" />;
        }
        return <Eye className="w-4 h-4 text-slate-400" />;
    }
  }

  function getRiskBadge(riskScore) {
    if (!riskScore) return null;
    if (riskScore >= 80) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">High Risk</span>;
    if (riskScore >= 50) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Medium Risk</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Low Risk</span>;
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
            <p className="text-slate-400 text-sm">Complete system activity and AI decision history</p>
          </div>
          <button onClick={exportLogs} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-blue-400" /><p className="text-slate-400 text-xs">Total Events</p></div><p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-emerald-400" /><p className="text-slate-400 text-xs">Approved</p></div><p className="text-2xl font-bold text-white">{stats.approved.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><XCircle className="w-4 h-4 text-red-400" /><p className="text-slate-400 text-xs">Denied</p></div><p className="text-2xl font-bold text-white">{stats.denied.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-amber-400" /><p className="text-slate-400 text-xs">Avg Risk Score</p></div><p className="text-2xl font-bold text-white">{stats.avgRiskScore}</p></div>
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
              <option value="365">Last year</option>
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
                  <tr>
                    <th className="px-4 py-3 text-left text-white text-sm">Timestamp</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Action</th>
                    <th className="px-4 py-3 text-left text-white text-sm">User</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Jurisdiction</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Risk</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Result</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-sm">
                          {getActionIcon(log.action_type)} 
                          {log.action_type || (log.odusbaba_decision_id ? 'AI Decision' : 'Unknown')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-white">{log.user_name || 'System'}</p>
                          <p className="text-xs text-slate-500">{log.user_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {log.jurisdiction || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {getRiskBadge(log.risk_score)}
                        {log.risk_score && <span className="text-xs text-slate-500 ml-1">({log.risk_score})</span>}
                      </td>
                      <td className="px-4 py-3">
                        {log.was_allowed !== undefined ? (
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${log.was_allowed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {log.was_allowed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {log.was_allowed ? 'Allowed' : 'Denied'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                        {log.deny_reason || (log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details).substring(0, 50) : String(log.details).substring(0, 50)) : '-')}
                        {log.deny_reason && log.deny_reason.length > 50 ? '...' : ''}
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
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} logs
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
