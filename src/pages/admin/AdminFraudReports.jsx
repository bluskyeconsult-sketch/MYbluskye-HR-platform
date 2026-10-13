// src/pages/admin/AdminFraudReports.jsx
// Review queue for reports members submit at /report-fraud.
//
// HISTORY: 2026-08-07 - Link icon import fixed; status changes moved to
// Supabase directly.
//
// REVIEWED + FIXED (2026-10-13):
// - updateStatus() never looked at the result of the update. Supabase does
//   not throw on a failed write, so a blocked update still reloaded the
//   list and looked like it worked. It now checks the error and the
//   returned row, and shows a banner saying what happened.
// - Dismiss and Resolve closed a report with a single click. Both now ask
//   for confirmation (Investigate does not, it is reversible).
// - Load failures were only logged; they are now shown.
// - The old loader flipped the whole page to a spinner on every refresh,
//   which also wiped the open filters' scroll position. Refresh now keeps
//   the list on screen.
// - The reporter/reported lookups used reporter:reporter_id(...) embeds,
//   which fail outright when the foreign keys are not named exactly so.
//   The page tries that embed first; if it errors it falls back to a plain
//   read plus a separate profiles lookup, so the queue cannot vanish.
// - "Export" wrote reporter and reported-user email addresses into a JSON
//   file on the admin's machine. It now exports report details with the
//   people identified by id and name only; look the emails up in the app.
// - The details window shows the reporter and reported user ids so you can
//   find them in Users, closes on Escape, and the evidence links only open
//   http(s) addresses.
// - Not changed because the project gives no evidence of them: who handled
//   a report (no handler column is known) and the report's own columns
//   beyond status, resolved_at, updated_at, description, report_type and
//   evidence_urls. If you later add a resolved_by column, record it in
//   updateStatus().

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Flag, AlertTriangle, CheckCircle, XCircle, Eye, Loader2,
    RefreshCw, Clock, User, FileText, Search, Download, Calendar,
    Link as LinkIcon
} from 'lucide-react';

const STATUSES = [
    { value: 'all', label: 'All Reports' },
    { value: 'pending', label: 'Pending' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'dismissed', label: 'Dismissed' }
];

const REPORT_TYPES = [
    { value: 'all', label: 'All Types' },
    { value: 'fraudulent_job', label: 'Fraudulent Job' },
    { value: 'scam_employer', label: 'Scam Employer' },
    { value: 'fake_profile', label: 'Fake Profile' },
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'other', label: 'Other' }
];

const STATUS_BADGES = {
    pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
    investigating: { label: 'Investigating', color: 'bg-blue-500/20 text-blue-400', icon: AlertTriangle },
    resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
    dismissed: { label: 'Dismissed', color: 'bg-red-500/20 text-red-400', icon: XCircle }
};

const TYPE_BADGES = {
    fraudulent_job: { label: 'Fraudulent Job', color: 'bg-red-500/20 text-red-400' },
    scam_employer: { label: 'Scam Employer', color: 'bg-orange-500/20 text-orange-400' },
    fake_profile: { label: 'Fake Profile', color: 'bg-purple-500/20 text-purple-400' },
    spam: { label: 'Spam', color: 'bg-amber-500/20 text-amber-400' },
    harassment: { label: 'Harassment', color: 'bg-pink-500/20 text-pink-400' },
    other: { label: 'Other', color: 'bg-slate-500/20 text-slate-400' }
};

const isHttpUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim());

function StatusBadge({ status }) {
    const { label, color, icon: Icon } = STATUS_BADGES[status] || STATUS_BADGES.pending;
    return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${color}`}>
            <Icon className="w-3 h-3" /> {label}
        </span>
    );
}

function TypeBadge({ type }) {
    const { label, color } = TYPE_BADGES[type] || { label: type?.replace(/_/g, ' ') || 'Unknown', color: 'bg-slate-500/20 text-slate-400' };
    return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

export default function AdminFraudReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState(null);

    const loadReports = useCallback(async () => {
        setRefreshing(true);
        try {
            let rows;
            const embedded = await supabase
                .from('fraud_reports')
                .select('*, reporter:reporter_id(email, full_name), reported_user:reported_user_id(email, full_name)')
                .order('created_at', { ascending: false });

            if (!embedded.error) {
                rows = embedded.data || [];
            } else {
                const plain = await supabase.from('fraud_reports').select('*').order('created_at', { ascending: false });
                if (plain.error) throw plain.error;
                rows = plain.data || [];
                const ids = [...new Set(rows.flatMap(r => [r.reporter_id, r.reported_user_id]).filter(Boolean))];
                if (ids.length > 0) {
                    const { data: people } = await supabase.from('profiles').select('id, email, full_name').in('id', ids);
                    const byId = Object.fromEntries((people || []).map(p => [p.id, p]));
                    rows = rows.map(r => ({
                        ...r,
                        reporter: byId[r.reporter_id] || null,
                        reported_user: byId[r.reported_user_id] || null
                    }));
                }
            }
            setReports(rows);
            setLoadError('');
        } catch (err) {
            console.error('Error loading fraud reports:', err);
            setReports([]);
            setLoadError(err.message || 'Could not load fraud reports.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    useEffect(() => {
        if (!selectedReport) return;
        const onKey = (e) => { if (e.key === 'Escape') setSelectedReport(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedReport]);

    const stats = useMemo(() => ({
        total: reports.length,
        pending: reports.filter(r => r.status === 'pending').length,
        investigating: reports.filter(r => r.status === 'investigating').length,
        resolved: reports.filter(r => r.status === 'resolved').length,
        dismissed: reports.filter(r => r.status === 'dismissed').length
    }), [reports]);

    const filteredReports = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return reports.filter(r =>
            (statusFilter === 'all' || r.status === statusFilter) &&
            (typeFilter === 'all' || r.report_type === typeFilter) &&
            (!term ||
                r.description?.toLowerCase().includes(term) ||
                r.report_type?.toLowerCase().includes(term) ||
                r.reporter?.email?.toLowerCase().includes(term) ||
                r.reported_user?.email?.toLowerCase().includes(term))
        );
    }, [reports, searchTerm, statusFilter, typeFilter]);

    async function updateStatus(report, status) {
        const verb = { investigating: 'mark as under investigation', resolved: 'mark as resolved', dismissed: 'dismiss' }[status];
        if (status !== 'investigating' && !confirm(`Are you sure you want to ${verb} this ${report.report_type?.replace(/_/g, ' ') || ''} report?`)) return;

        setBusyId(report.id);
        setNotice(null);
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('fraud_reports')
            .update({
                status,
                resolved_at: status === 'resolved' ? now : null,
                updated_at: now
            })
            .eq('id', report.id)
            .select('id');
        setBusyId(null);
        if (error || !data || data.length === 0) {
            setNotice({ type: 'error', text: `Could not update the report: ${error?.message || 'no row was changed (check permissions)'}` });
            return;
        }
        setNotice({ type: 'ok', text: `Report ${status === 'investigating' ? 'marked as under investigation' : status}.` });
        setSelectedReport(null);
        loadReports();
    }

    function exportReports() {
        const rows = filteredReports.map(r => ({
            id: r.id,
            report_type: r.report_type,
            status: r.status,
            description: r.description,
            reporter_id: r.reporter_id,
            reporter_name: r.reporter?.full_name || null,
            reported_user_id: r.reported_user_id,
            reported_user_name: r.reported_user?.full_name || null,
            evidence_urls: r.evidence_urls || [],
            created_at: r.created_at,
            resolved_at: r.resolved_at
        }));
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fraud-reports-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function clearFilters() {
        setSearchTerm('');
        setStatusFilter('all');
        setTypeFilter('all');
    }

    const filtersActive = searchTerm || statusFilter !== 'all' || typeFilter !== 'all';

    function ReportActions({ report, compact }) {
        const busy = busyId === report.id;
        const base = compact ? 'px-2 py-1 rounded text-xs text-white transition flex items-center gap-1 disabled:opacity-50' : 'px-3 py-1.5 rounded-lg text-xs text-white flex items-center gap-1 disabled:opacity-50';
        return (
            <div className="flex flex-wrap gap-2">
                {report.status === 'pending' && (
                    <button disabled={busy} onClick={() => updateStatus(report, 'investigating')} className={`${base} bg-blue-600 hover:bg-blue-700`}>
                        <AlertTriangle className="w-3 h-3" /> Investigate
                    </button>
                )}
                {(report.status === 'pending' || report.status === 'investigating') && (
                    <button disabled={busy} onClick={() => updateStatus(report, 'resolved')} className={`${base} bg-emerald-600 hover:bg-emerald-700`}>
                        <CheckCircle className="w-3 h-3" /> Resolve
                    </button>
                )}
                {report.status !== 'dismissed' && (
                    <button disabled={busy} onClick={() => updateStatus(report, 'dismissed')} className={`${base} bg-red-600 hover:bg-red-700`}>
                        <XCircle className="w-3 h-3" /> Dismiss
                    </button>
                )}
                <button onClick={() => setSelectedReport(report)} className={`${base} bg-slate-700 hover:bg-slate-600`} title="View details">
                    <Eye className="w-3 h-3" /> View
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    const statCards = [
        { key: 'all', label: 'Total Reports', value: stats.total, color: 'text-white', hover: 'hover:border-slate-500/50' },
        { key: 'pending', label: 'Pending', value: stats.pending, color: 'text-amber-400', hover: 'hover:border-amber-500/30' },
        { key: 'investigating', label: 'Investigating', value: stats.investigating, color: 'text-blue-400', hover: 'hover:border-blue-500/30' },
        { key: 'resolved', label: 'Resolved', value: stats.resolved, color: 'text-emerald-400', hover: 'hover:border-emerald-500/30' },
        { key: 'dismissed', label: 'Dismissed', value: stats.dismissed, color: 'text-red-400', hover: 'hover:border-red-500/30' }
    ];

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Fraud Reports</h1>
                    <p className="text-slate-400">Review and manage reports submitted at /report-fraud</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadReports} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button onClick={exportReports} disabled={filteredReports.length === 0} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2 disabled:opacity-50" title="Exports the filtered list as JSON, without email addresses">
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {loadError && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">Could not load fraud reports: {loadError}</div>}
            {notice && (
                <div className={`mb-4 p-3 rounded-lg text-sm border ${notice.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>{notice.text}</div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {statCards.map(c => (
                    <button
                        key={c.key}
                        onClick={() => setStatusFilter(c.key)}
                        className={`bg-slate-900/50 border rounded-lg p-3 text-center transition ${c.hover} ${statusFilter === c.key ? 'border-primary-500/50' : 'border-slate-800'}`}
                    >
                        <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                        <p className="text-xs text-slate-400">{c.label}</p>
                    </button>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by description, reporter, or reported user..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div className="flex gap-2">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {filtersActive && (
                        <button onClick={clearFilters} className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition text-sm">Clear</button>
                    )}
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="md:hidden divide-y divide-slate-800">
                    {filteredReports.map(report => (
                        <div key={report.id} className="p-4">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <TypeBadge type={report.report_type} />
                                <StatusBadge status={report.status} />
                            </div>
                            <p className="text-slate-300 text-sm mb-2 line-clamp-2">{report.description || 'No description provided'}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mb-3">
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> From: {report.reporter?.email?.split('@')[0] || 'Unknown'}</span>
                                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> About: {report.reported_user?.email?.split('@')[0] || 'Unknown'}</span>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {report.created_at ? new Date(report.created_at).toLocaleDateString() : '-'}</span>
                            </div>
                            <ReportActions report={report} />
                        </div>
                    ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                {['Type', 'Description', 'Reporter', 'Reported', 'Date', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-white text-sm font-semibold">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map(report => (
                                <tr key={report.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                                    <td className="px-4 py-3"><TypeBadge type={report.report_type} /></td>
                                    <td className="px-4 py-3"><p className="text-slate-300 text-sm max-w-xs truncate">{report.description || 'No description provided'}</p></td>
                                    <td className="px-4 py-3"><span className="text-slate-400 text-sm flex items-center gap-1"><User className="w-3 h-3 text-slate-500" />{report.reporter?.email?.split('@')[0] || 'Unknown'}</span></td>
                                    <td className="px-4 py-3"><span className="text-slate-400 text-sm flex items-center gap-1"><User className="w-3 h-3 text-slate-500" />{report.reported_user?.email?.split('@')[0] || 'Unknown'}</span></td>
                                    <td className="px-4 py-3"><span className="text-slate-400 text-sm flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-500" />{report.created_at ? new Date(report.created_at).toLocaleDateString() : '-'}</span></td>
                                    <td className="px-4 py-3"><StatusBadge status={report.status} /></td>
                                    <td className="px-4 py-3"><ReportActions report={report} compact /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredReports.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Flag className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        <p>{reports.length === 0 ? 'No fraud reports have been submitted yet' : 'No fraud reports match your criteria'}</p>
                        {filtersActive && (
                            <button onClick={clearFilters} className="mt-3 text-sm text-primary-400 hover:underline">Clear filters</button>
                        )}
                    </div>
                )}
            </div>

            {selectedReport && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReport(null)}>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Flag className="w-5 h-5 text-red-400" />
                                <h2 className="text-xl font-bold text-white">Report Details</h2>
                            </div>
                            <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white" aria-label="Close">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500">Report Type</p>
                                    <div className="mt-1"><TypeBadge type={selectedReport.report_type} /></div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Status</p>
                                    <div className="mt-1"><StatusBadge status={selectedReport.status} /></div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Reported Date</p>
                                    <p className="text-white text-sm">{selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleString() : '-'}</p>
                                </div>
                                {selectedReport.resolved_at && (
                                    <div>
                                        <p className="text-xs text-slate-500">Resolved Date</p>
                                        <p className="text-white text-sm">{new Date(selectedReport.resolved_at).toLocaleString()}</p>
                                    </div>
                                )}
                            </div>

                            {[
                                { title: 'Reporter Information', icon: <User className="w-4 h-4 text-primary-400" />, person: selectedReport.reporter, id: selectedReport.reporter_id },
                                { title: 'Reported User', icon: <AlertTriangle className="w-4 h-4 text-red-400" />, person: selectedReport.reported_user, id: selectedReport.reported_user_id }
                            ].map(block => (
                                <div key={block.title} className="border-t border-slate-800 pt-4">
                                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">{block.icon} {block.title}</h3>
                                    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                        <p className="text-sm text-slate-300"><span className="text-slate-500">Email:</span> {block.person?.email || 'Unknown'}</p>
                                        <p className="text-sm text-slate-300"><span className="text-slate-500">Name:</span> {block.person?.full_name || 'N/A'}</p>
                                        {block.id && <p className="text-xs text-slate-500 break-all">User id: {block.id} (search for this under Users)</p>}
                                    </div>
                                </div>
                            ))}

                            <div className="border-t border-slate-800 pt-4">
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary-400" /> Report Description
                                </h3>
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{selectedReport.description || 'No description provided'}</p>
                                </div>
                            </div>

                            {Array.isArray(selectedReport.evidence_urls) && selectedReport.evidence_urls.length > 0 && (
                                <div className="border-t border-slate-800 pt-4">
                                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                        <LinkIcon className="w-4 h-4 text-primary-400" /> Evidence
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedReport.evidence_urls.map((url, idx) => (
                                            isHttpUrl(url) ? (
                                                <a key={idx} href={url.trim()} target="_blank" rel="noopener noreferrer" className="block text-primary-400 text-sm hover:underline break-all">{url}</a>
                                            ) : (
                                                <p key={idx} className="text-slate-400 text-sm break-all">{String(url)} <span className="text-slate-600">(not a web link, not opened)</span></p>
                                            )
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">These links were supplied by the reporter. Treat them with caution before opening.</p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-800">
                                <ReportActions report={selectedReport} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
