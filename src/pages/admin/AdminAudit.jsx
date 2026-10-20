import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { authenticatedFetch } from '../../lib/authFetch';
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

// REWORKED (2026-10-20): all data now comes from the server action `admin-audit-logs` (Super Admin only).
// Before: stats and export were silently capped at 1,000 rows; every row triggered its own profile lookup; the
// filter list used action names the site never logs (job_approved vs job_approval...); search used a database
// filter that can fail; the CSV was not escaped; and admin activity (kept in user_activity_log) was not visible.
// Now: two views (Decisions = audit_logs, Activity = user_activity_log), a filter built from the action names
// really present, debounced search, page reset on any filter change, and a properly escaped CSV export.

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [dateRange, setDateRange] = useState('7');
  const [source, setSource] = useState('decisions');
  const [actionTypes, setActionTypes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);

  const itemsPerPage = 30;

  useEffect(() => { checkAuth(); }, []);

  // Wait for the person to stop typing before searching
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any filter change goes back to page 1
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedAction, dateRange, source]);

  // Switching view clears an action filter that may not exist in the other view
  useEffect(() => { setSelectedAction('all'); }, [source]);

  useEffect(() => {
    if (isSuperAdmin) loadAuditLogs();
  }, [searchTerm, selectedAction, dateRange, source, currentPage, isSuperAdmin]);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/admin-login'; return; }
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', session.user.id).single();
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

  function query(extra = {}) {
    return { source, days: parseInt(dateRange, 10), action: selectedAction, search: searchTerm, ...extra };
  }

  async function loadAuditLogs() {
    try {
      setLoading(true);
      setError(null);
      const r = await authenticatedFetch('admin-audit-logs', query({ page: currentPage }));
      setLogs(r.logs || []);
      setActionTypes(r.actionTypes || []);
      setStats(r.stats || null);
      setTotalPages(r.pages || 1);
      setTotalCount(r.total || 0);
    } catch (err) {
      console.error('Load logs error:', err);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  async function exportLogs() {
    setExporting(true);
    toast.loading('Exporting logs...', { id: 'export' });
    try {
      const r = await authenticatedFetch('admin-audit-logs', query({ export: true }));
      const blob = new Blob(['\uFEFF' + r.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${source}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${r.count} rows` + (r.truncated ? ' (the first 10,000; narrow the dates for the rest)' : ''), { id: 'export' });
    } catch (err) {
      toast.error('Failed to export: ' + err.message, { id: 'export' });
    } finally {
      setExporting(false);
    }
  }

  function getActionIcon(actionType) {
    const t = String(actionType || '');
    if (/role|staff|permission/.test(t)) return <Shield className="w-4 h-4 text-purple-400" />;
    if (/approv/.test(t)) return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (/reject/.test(t)) return <XCircle className="w-4 h-4 text-red-400" />;
    if (/delete|remove/.test(t)) return <Trash2 className="w-4 h-4 text-red-400" />;
    if (/unblock/.test(t)) return <Users className="w-4 h-4 text-emerald-400" />;
    if (/block/.test(t)) return <Users className="w-4 h-4 text-amber-400" />;
    if (/odusbaba/.test(t)) return <Brain className="w-4 h-4 text-blue-400" />;
    return <Eye className="w-4 h-4 text-slate-400" />;
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
            <p className="text-slate-400 text-sm">{source === 'decisions' ? 'Permission decisions and admin actions (allowed or denied)' : 'Everyday activity: sign-ins, applications, purchases, admin changes'}</p>
          </div>
          <button onClick={exportLogs} disabled={exporting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {[['decisions', 'Decisions'], ['activity', 'Activity']].map(([k, label]) => (
            <button key={k} onClick={() => setSource(k)} className={`px-4 py-2 text-sm rounded-lg border ${source === k ? 'border-primary-500 bg-primary-500/10 text-white' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{label}</button>
          ))}
        </div>

        {/* Stats Cards */}
        {stats ? (<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-blue-400" /><p className="text-slate-400 text-xs">Total Events</p></div><p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-emerald-400" /><p className="text-slate-400 text-xs">Approved</p></div><p className="text-2xl font-bold text-white">{stats.approved.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><XCircle className="w-4 h-4 text-red-400" /><p className="text-slate-400 text-xs">Denied</p></div><p className="text-2xl font-bold text-white">{stats.denied.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-amber-400" /><p className="text-slate-400 text-xs">Avg Risk Score</p></div><p className="text-2xl font-bold text-white">{stats.avgRiskScore}</p></div>
        </div>) : (<div className="mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-slate-400">{totalCount.toLocaleString()} events in this period.</div>)}

        {/* Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder={source === 'activity' ? 'Search action or email...' : 'Search action...'} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
            </div>
            <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
              <option value="all">All actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
              <option value="0">All time</option>
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
                    <th className="px-4 py-3 text-left text-white text-sm">Jurisdiction / IP</th>
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
                          {log.action_type ? log.action_type.replace(/_/g, ' ') : (log.odusbaba_decision_id ? 'AI Decision' : 'Unknown')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-white">{log.user_name || 'System'}</p>
                          <p className="text-xs text-slate-500">{log.user_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {log.jurisdiction || log.ip_address || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {getRiskBadge(log.risk_score)}
                        {log.risk_score ? <span className="text-xs text-slate-500 ml-1">({log.risk_score})</span> : null}
                      </td>
                      <td className="px-4 py-3">
                        {log.was_allowed !== undefined && log.was_allowed !== null ? (
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
