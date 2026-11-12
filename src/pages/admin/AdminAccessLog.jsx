// src/pages/admin/AdminAccessLog.jsx  (NEW 2026-11-11)
// The permanent record: every signed-in or admin request to the API (reads included), every sign-in session with
// its IP and browser, and Supabase's own sign-in events. Super Admin only. Built after the 8 Nov 2026 incident,
// when reads and short-lived sessions left no trace.
// UPDATED (2026-11-12): also lists (and exports to CSV) the security events written by the site's guards and the
// blocked IP addresses, so every record can be downloaded from this one page.
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '../../lib/authFetch';

const VIEWS = [
    { key: 'api', label: 'API requests' },
    { key: 'sessions', label: 'Sign-in sessions' },
    { key: 'auth', label: 'Supabase sign-in events' },
    { key: 'security', label: 'Security events' },
    { key: 'blocked', label: 'Blocked IPs' }
];
const PAGE = 100;

const csvCell = (v) => {
    let t = v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // stop spreadsheet formula injection
    return '"' + t.replace(/"/g, '""') + '"';
};

export default function AdminAccessLog() {
    const [view, setView] = useState('api');
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [f, setF] = useState({ ip: '', userId: '', action: '', since: '', adminOnly: false, deniedOnly: false, importantOnly: false });

    const load = useCallback(async (off = 0, limit = PAGE) => {
        setLoading(true); setError('');
        try {
            const d = await authenticatedFetch('admin-access-log', {
                view, limit, offset: off, ip: f.ip || undefined, userId: f.userId || undefined, action: f.action || undefined,
                since: f.since ? new Date(f.since).toISOString() : undefined, adminOnly: f.adminOnly || undefined, deniedOnly: f.deniedOnly || undefined, importantOnly: f.importantOnly || undefined
            });
            return d;
        } catch (e) { setError(e.message || 'Could not load the log'); return null; }
        finally { setLoading(false); }
    }, [view, f]);

    const refresh = useCallback(async () => {
        const d = await load(0);
        if (d) { setRows(d.rows || []); setTotal(d.total || 0); setOffset(0); }
    }, [load]);

    useEffect(() => { refresh(); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

    const page = async (off) => {
        const d = await load(off);
        if (d) { setRows(d.rows || []); setTotal(d.total || 0); setOffset(off); }
    };

    const exportCsv = async () => {
        const d = await load(0, 1000);
        if (!d || !d.rows.length) return;
        const cols = Object.keys(d.rows[0]);
        const csv = [cols.map(csvCell).join(',')].concat(d.rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `access-log-${view}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    const cols = view === 'api'
        ? ['created_at', 'ip', 'action', 'status', 'user_id', 'is_admin_call', 'denied', 'target', 'body_keys', 'user_agent']
        : view === 'sessions'
            ? ['started_at', 'last_seen', 'email', 'ip', 'aal', 'user_agent']
            : view === 'auth'
                ? ['created_at', 'ip_address', 'action', 'payload']
                : view === 'security'
                    ? ['created_at', 'event_type', 'severity', 'ip_address', 'details']
                    : ['ip_address', 'reason', 'expires_at', 'is_permanent', 'unblocked_at'];
    const cell = (r, c) => {
        const v = r[c];
        if (v === null || v === undefined) return '';
        if (typeof v === 'boolean') return v ? 'yes' : '';
        if (c.endsWith('_at') || c === 'last_seen') return new Date(v).toLocaleString();
        if (typeof v === 'object') return JSON.stringify(v).slice(0, 140);
        return String(v).slice(0, 140);
    };

    return (
        <div className="px-6 pb-10">
            <h1 className="text-white text-2xl font-bold mb-1">Access Log (permanent)</h1>
            <p className="text-slate-400 text-sm mb-4">Who used the site API, from where, and with what result. Field names are recorded, never field values or passwords. Admin and refused calls are kept for 2 years; other calls for 90 days. "Security events" leaves out routine api_request rows unless you type that event type; "Blocked IPs" shows every address the site has blocked, with the reason and expiry.</p>

            <div className="flex flex-wrap gap-2 mb-3">
                {VIEWS.map((v) => (
                    <button key={v.key} onClick={() => setView(v.key)} className={`px-3 py-1.5 rounded-lg text-sm ${view === v.key ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{v.label}</button>
                ))}
            </div>

            <div className="flex flex-wrap items-end gap-2 mb-3 text-sm">
                <input placeholder="IP address" value={f.ip} onChange={(e) => setF({ ...f, ip: e.target.value })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white w-40" />
                {(view === 'api' || view === 'sessions') && <input placeholder="User id" value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white w-72" />}
                {(view === 'api' || view === 'security') && <input placeholder={view === 'security' ? 'Event type (e.g. threat_honeypot)' : 'Action'} value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white w-64" />}
                {view !== 'blocked' && <input type="datetime-local" value={f.since} onChange={(e) => setF({ ...f, since: e.target.value })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white" />}
                {view === 'api' && <label className="text-slate-300 flex items-center gap-1"><input type="checkbox" checked={f.adminOnly} onChange={(e) => setF({ ...f, adminOnly: e.target.checked })} /> Admin calls only</label>}
                {view === 'security' && <label className="text-slate-300 flex items-center gap-1"><input type="checkbox" checked={f.importantOnly} onChange={(e) => setF({ ...f, importantOnly: e.target.checked })} /> Critical &amp; warning only</label>}
                {view === 'api' && <label className="text-slate-300 flex items-center gap-1"><input type="checkbox" checked={f.deniedOnly} onChange={(e) => setF({ ...f, deniedOnly: e.target.checked })} /> Refused / failed only</label>}
                <button onClick={refresh} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded"><RefreshCw className="w-4 h-4" /> Apply</button>
                <button onClick={exportCsv} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded"><Download className="w-4 h-4" /> CSV (up to 1,000)</button>
            </div>

            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="min-w-full text-xs text-left">
                    <thead className="bg-slate-900 text-slate-400"><tr>{cols.map((c) => <th key={c} className="px-2 py-2 whitespace-nowrap">{c}</th>)}</tr></thead>
                    <tbody className="text-slate-200">
                        {loading && <tr><td colSpan={cols.length} className="px-2 py-4"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading...</td></tr>}
                        {!loading && rows.length === 0 && <tr><td colSpan={cols.length} className="px-2 py-4 text-slate-500">No rows yet for these filters.</td></tr>}
                        {!loading && rows.map((r, i) => (
                            <tr key={r.id || r.session_id || i} className={`border-t border-slate-800 ${r.denied ? 'bg-red-950/30' : ''}`}>
                                {cols.map((c) => <td key={c} className="px-2 py-1.5 align-top break-all max-w-[22rem]">{cell(r, c)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center gap-3 mt-3 text-sm text-slate-300">
                <button disabled={offset === 0 || loading} onClick={() => page(Math.max(0, offset - PAGE))} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40">Newer</button>
                <span>{total ? `${offset + 1}-${Math.min(offset + PAGE, total)} of ${total}` : '0'}</span>
                <button disabled={offset + PAGE >= total || loading} onClick={() => page(offset + PAGE)} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40">Older</button>
            </div>
        </div>
    );
}
