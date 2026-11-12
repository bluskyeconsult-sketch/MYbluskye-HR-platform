// src/pages/admin/SecurityDashboard.jsx
// Security Dashboard - threat monitoring and IP management
//
// REWORKED (2026-10-13): the security_events and blocked_ips tables are
// deliberately server-only (no browser access at all, per the database
// audit), so the previous version - which queried them straight from the
// browser - could only ever show an empty list, and its Block IP button
// failed silently. Everything now goes through three server actions that
// verify the caller is an admin first:
//   admin-security-overview, admin-block-ip, admin-unblock-ip
// Also added: IP validation (server-side), a choice of block length, the
// event details, a severity filter, visible error messages, a guard
// against blocking your own address (a block covers the whole API, so it
// would lock you out of the admin area too), and a one-click "Block this
// IP" on an event row.
//
// UPDATED (2026-11-12): "Download full report" - one file (JSON, for handing
// to Claude at the next review) or a spreadsheet of the events (CSV), for the
// last 24 hours, 7 days or 30 days. Built by the admin-security-report action
// (Super Admin only). Also: Unblock now says how many old attack events it
// cleared, because the 10-minute security watcher would otherwise re-block the
// address, and it warns before lifting a permanent block.

import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../../lib/authFetch';
import { Shield, AlertTriangle, Ban, Eye, Loader2, RefreshCw, Plus, Trash2, Info, Download } from 'lucide-react';

const DURATIONS = [
    { hours: 1, label: '1 hour' },
    { hours: 24, label: '24 hours' },
    { hours: 48, label: '48 hours' },
    { hours: 24 * 7, label: '7 days' },
    { hours: 24 * 30, label: '30 days' }
];

const REPORT_WINDOWS = [
    { days: 1, label: 'Last 24 hours' },
    { days: 7, label: 'Last 7 days' },
    { days: 30, label: 'Last 30 days' }
];

// A spreadsheet cell: text that starts with = + - @ is defused so Excel cannot run it as a formula.
const csvCell = (v) => {
    let t = v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
};

function saveFile(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const SEVERITY_STYLES = {
    critical: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
    info: 'bg-slate-500/20 text-slate-400'
};

export default function SecurityDashboard() {
    const [events, setEvents] = useState([]);
    const [blockedIPs, setBlockedIPs] = useState([]);
    const [last24h, setLast24h] = useState({ total: 0, critical: 0 });
    const [yourIp, setYourIp] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState(null); // { type: 'ok' | 'error', text }
    const [newBlockIP, setNewBlockIP] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [blockHours, setBlockHours] = useState(48);
    const [blocking, setBlocking] = useState(false);
    const [severityFilter, setSeverityFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [reportDays, setReportDays] = useState(7);
    const [reportBusy, setReportBusy] = useState('');

    const loadData = useCallback(async () => {
        setRefreshing(true);
        try {
            const data = await authenticatedFetch('admin-security-overview');
            setEvents(data.events || []);
            setBlockedIPs(data.blocked || []);
            setLast24h(data.last24h || { total: 0, critical: 0 });
            setYourIp(data.yourIp || '');
            setLoadError('');
        } catch (error) {
            console.error('Error loading security data:', error);
            setLoadError(error.message || 'Could not load security data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(() => {
            if (!document.hidden) loadData();
        }, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    async function blockIp(ip, reason, hours) {
        setBlocking(true);
        setNotice(null);
        try {
            await authenticatedFetch('admin-block-ip', { ip, reason, hours });
            setNotice({ type: 'ok', text: `${ip} is blocked for ${DURATIONS.find(d => d.hours === hours)?.label || `${hours} hours`}.` });
            setNewBlockIP('');
            setBlockReason('');
            await loadData();
        } catch (error) {
            setNotice({ type: 'error', text: error.message });
        } finally {
            setBlocking(false);
        }
    }

    function handleBlockIP() {
        if (!newBlockIP.trim()) {
            setNotice({ type: 'error', text: 'Enter an IP address first.' });
            return;
        }
        blockIp(newBlockIP.trim(), blockReason.trim(), blockHours);
    }

    function handleBlockFromEvent(event) {
        if (!confirm(`Block ${event.ip_address} for 48 hours?\n\nThis stops every request from that address, including sign-in attempts to the admin area.`)) return;
        blockIp(event.ip_address, `Blocked from event: ${event.event_type}`, 48);
    }

    async function handleUnblockIP(ip) {
        const longBlock = ip.is_permanent || new Date(ip.expires_at).getFullYear() > 2100;
        const warn = longBlock ? '\n\nThis is a PERMANENT block, usually set automatically after attack-type activity or during an incident. Only unblock it if you are sure the address is genuine (for example a link-preview crawler or your own device).' : '';
        if (!confirm(`Unblock ${ip.ip_address}?${warn}`)) return;
        setNotice(null);
        try {
            const r = await authenticatedFetch('admin-unblock-ip', { id: ip.id });
            const cleared = r && r.cleared ? ` ${r.cleared} old attack-type event${r.cleared === 1 ? '' : 's'} for it were marked cleared (kept as history) so the automatic watcher does not re-block it. New bad behaviour will block it again.` : '';
            setNotice({ type: 'ok', text: `${ip.ip_address} is unblocked.${cleared}` });
            await loadData();
        } catch (error) {
            setNotice({ type: 'error', text: error.message });
        }
    }

    async function downloadReport(kind) {
        setReportBusy(kind);
        setNotice(null);
        try {
            const d = await authenticatedFetch('admin-security-report', { days: reportDays });
            const report = d && d.report;
            if (!report) throw new Error('The server returned no report.');
            const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
            if (kind === 'json') {
                saveFile(`odusbaba-security-report-${reportDays}d-${stamp}.json`, JSON.stringify(report, null, 2), 'application/json');
            } else {
                const head = ['created_at', 'event_type', 'severity', 'ip_address', 'details'];
                const lines = [head.map(csvCell).join(',')].concat((report.security_events.rows || []).map(r => head.map(h => csvCell(r[h])).join(',')));
                saveFile(`odusbaba-security-events-${reportDays}d-${stamp}.csv`, '\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8');
            }
            const problems = (report.problems_reading_data || []).length;
            setNotice({ type: problems ? 'error' : 'ok', text: problems ? `Report downloaded, but: ${report.problems_reading_data.join(' ')}` : `Report downloaded (${report.security_events.returned} security events, ${report.blocked_ips_live.length} live blocks).` });
        } catch (error) {
            setNotice({ type: 'error', text: error.message || 'Could not build the report.' });
        } finally {
            setReportBusy('');
        }
    }

    const visibleEvents = events.filter(e => severityFilter === 'all' || e.severity === severityFilter);
    const blockedSet = new Set(blockedIPs.map(b => b.ip_address));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
                    <p className="text-slate-400">Monitor security events and manage blocked IP addresses. Refreshes every 30 seconds.</p>
                </div>
                <button onClick={loadData} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 self-start">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold flex items-center gap-2"><Download className="w-4 h-4 text-primary-400" /> Download the full security report</h3>
                        <p className="text-xs text-slate-400 mt-1">One file with the counts, every security event, every live and lifted block, the busiest visitors, admin and refused calls, and sign-in events and sessions. Keep it, and give it to Claude at your next review. Super Admin only. It contains IP addresses and email addresses, so do not share it publicly.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <select value={reportDays} onChange={(e) => setReportDays(parseInt(e.target.value, 10))} className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                            {REPORT_WINDOWS.map(w => <option key={w.days} value={w.days}>{w.label}</option>)}
                        </select>
                        <button onClick={() => downloadReport('json')} disabled={!!reportBusy} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-1">
                            {reportBusy === 'json' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Full report (.json)
                        </button>
                        <button onClick={() => downloadReport('csv')} disabled={!!reportBusy} className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center gap-1">
                            {reportBusy === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Events (.csv)
                        </button>
                    </div>
                </div>
            </div>

            {loadError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                    Could not load security data: {loadError}
                </div>
            )}

            {notice && (
                <div className={`p-3 rounded-lg text-sm border ${notice.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                    {notice.text}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Events (last 24 hours)</p><p className="text-2xl font-bold text-white">{last24h.total}</p></div>
                        <Shield className="w-8 h-8 text-primary-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Critical (last 24 hours)</p><p className="text-2xl font-bold text-red-400">{last24h.critical}</p></div>
                        <AlertTriangle className="w-8 h-8 text-red-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Currently blocked IPs</p><p className="text-2xl font-bold text-white">{blockedIPs.length}</p></div>
                        <Ban className="w-8 h-8 text-amber-400 opacity-50" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4 gap-2">
                        <h3 className="text-white font-semibold flex items-center gap-2"><Eye className="w-4 h-4 text-primary-400" /> Recent Security Events</h3>
                        <select
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value)}
                            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                        >
                            <option value="all">All severities</option>
                            <option value="critical">Critical</option>
                            <option value="warning">Warning</option>
                            <option value="info">Info</option>
                        </select>
                    </div>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                        {visibleEvents.map((event) => {
                            const isOpen = expandedId === event.id;
                            const alreadyBlocked = blockedSet.has(event.ip_address);
                            const isYou = event.ip_address && event.ip_address === yourIp;
                            return (
                                <div key={event.id} className="p-3 border-b border-slate-800">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.info}`}>{event.severity || 'info'}</span>
                                            </div>
                                            <p className="text-slate-300 text-sm mt-1">{event.event_type?.replace(/_/g, ' ')}</p>
                                            <p className="text-slate-500 text-xs font-mono">IP: {event.ip_address}{isYou ? ' (you)' : ''}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                                                <button onClick={() => setExpandedId(isOpen ? null : event.id)} className="text-xs text-primary-400 hover:underline flex items-center gap-1">
                                                    <Info className="w-3 h-3" /> {isOpen ? 'Hide' : 'Details'}
                                                </button>
                                            )}
                                            {event.ip_address && !alreadyBlocked && !isYou && (
                                                <button onClick={() => handleBlockFromEvent(event)} disabled={blocking} className="text-xs text-red-400 hover:underline flex items-center gap-1 disabled:opacity-50">
                                                    <Ban className="w-3 h-3" /> Block IP
                                                </button>
                                            )}
                                            {alreadyBlocked && <span className="text-xs text-amber-400">Blocked</span>}
                                        </div>
                                    </div>
                                    {isOpen && (
                                        <pre className="mt-2 p-2 bg-slate-800/60 rounded text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
                                            {JSON.stringify(event.metadata, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            );
                        })}
                        {visibleEvents.length === 0 && <p className="text-slate-400 text-center py-4">No security events recorded</p>}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">Showing the latest 200 events. Sign-in attempts happen directly with Supabase and are not recorded here.</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Ban className="w-4 h-4 text-primary-400" /> Blocked IP Addresses</h3>

                    <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-white text-sm mb-2">Block an IP address</p>
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input type="text" value={newBlockIP} onChange={(e) => setNewBlockIP(e.target.value)} placeholder="IP address, e.g. 203.0.113.7" className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-mono" />
                                <select value={blockHours} onChange={(e) => setBlockHours(parseInt(e.target.value, 10))} className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                                    {DURATIONS.map(d => <option key={d.hours} value={d.hours}>{d.label}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                                <button onClick={handleBlockIP} disabled={blocking} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1">
                                    {blocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Block IP
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            A block stops every request from that address to the whole site, including the admin area.
                            {yourIp ? ` Your current address is ${yourIp}; the server refuses to block it.` : ''}
                        </p>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {blockedIPs.map((ip) => (
                            <div key={ip.id} className="flex justify-between items-center gap-3 p-2 bg-slate-800/30 rounded-lg">
                                <div className="min-w-0">
                                    <p className="text-white font-mono text-sm">{ip.ip_address}</p>
                                    <p className="text-slate-500 text-xs">Expires: {new Date(ip.expires_at).toLocaleString()}</p>
                                    {ip.reason && <p className="text-slate-500 text-xs truncate">Reason: {ip.reason.replace(/_/g, ' ')}</p>}
                                </div>
                                <button onClick={() => handleUnblockIP(ip)} className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 flex-shrink-0">
                                    <Trash2 className="w-3 h-3 inline mr-1" /> Unblock
                                </button>
                            </div>
                        ))}
                        {blockedIPs.length === 0 && <p className="text-slate-400 text-center py-4">No blocked IPs</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
