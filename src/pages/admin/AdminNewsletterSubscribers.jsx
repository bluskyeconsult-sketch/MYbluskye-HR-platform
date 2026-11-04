// src/pages/admin/AdminNewsletterSubscribers.jsx
// Every newsletter subscriber and what they submitted: email, name, status, whether they are a member, when and where they
// signed up, how many register invitations they were sent, and their topic choices. Search, filter, export. Admin only.
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { authenticatedFetch } from '../../lib/authFetch';
import { Download, Search, Loader2 } from 'lucide-react';

function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const PAGE = 50;
const STATUS = { active: 'bg-emerald-500/20 text-emerald-300', pending: 'bg-amber-500/20 text-amber-300', unsubscribed: 'bg-slate-500/20 text-slate-300', blocked: 'bg-red-500/20 text-red-300' };
const topics = (p) => p && typeof p === 'object' ? Object.entries(p).filter(([, v]) => v).map(([k]) => k).join(', ') : '';
const day = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '';

export default function AdminNewsletterSubscribers() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('all');
    const [member, setMember] = useState('all');
    const [page, setPage] = useState(0);

    const load = async () => {
        setLoading(true); setErr('');
        try { const r = await authenticatedFetch('newsletter-subscribers', {}); setRows(r.subscribers || []); }
        catch (e) { setErr(e.message); } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        return rows.filter(r => (status === 'all' || r.status === status)
            && (member === 'all' || (member === 'yes') === !!r.user_id)
            && (!t || String(r.email || '').toLowerCase().includes(t) || String(r.name || '').toLowerCase().includes(t)));
    }, [rows, q, status, member]);
    useEffect(() => { setPage(0); }, [q, status, member]);
    const counts = useMemo(() => rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}), [rows]);
    const view = filtered.slice(page * PAGE, page * PAGE + PAGE);

    const exportCsv = () => {
        const head = ['Email', 'Name', 'Status', 'Member', 'Subscribed', 'Confirmed', 'Source', 'Invitations sent', 'Topics'];
        const lines = filtered.map(r => [r.email, r.name, r.status, r.user_id ? 'yes' : 'no', day(r.subscribed_at), day(r.confirmed_at), r.source || '', r.nudge_count || 0, topics(r.preferences)].map(csvCell).join(','));
        const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
    };
    const block = async (r) => {
        if (!confirm(`Block ${r.email} from all email? Use this only for abuse, scraping or spam sign-ups.`)) return;
        try { await authenticatedFetch('admin-newsletter-block', { email: r.email, reason: 'abuse' }); await load(); } catch (e) { setErr(e.message); }
    };
    const sel = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white';
    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white">Newsletter subscribers</h1>
                <Link to="/admin/newsletter" className="text-sm text-primary-400">Back to Newsletter</Link>
            </div>
            <p className="text-sm text-slate-400 mb-4">Personal data: use it only to run the newsletter. {rows.length} rows: {['active', 'pending', 'unsubscribed', 'blocked'].map(s => `${counts[s] || 0} ${s}`).join(', ')}.</p>
            <div className="flex flex-wrap gap-2 items-center mb-3">
                <div className="relative"><Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search email or name" aria-label="Search" className={sel + ' pl-9'} /></div>
                <select value={status} onChange={e => setStatus(e.target.value)} className={sel} aria-label="Status"><option value="all">All statuses</option>{Object.keys(STATUS).map(s => <option key={s} value={s}>{s}</option>)}</select>
                <select value={member} onChange={e => setMember(e.target.value)} className={sel} aria-label="Member"><option value="all">Members and not</option><option value="yes">Has an account</option><option value="no">No account yet</option></select>
                <button onClick={exportCsv} disabled={!filtered.length} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded-lg text-sm inline-flex items-center gap-2"><Download className="w-4 h-4" />Export {filtered.length}</button>
            </div>
            {err && <p className="text-sm text-red-300 mb-2">{err}</p>}
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-slate-400 bg-slate-900"><tr>{['Email', 'Name', 'Status', 'Account', 'Subscribed', 'Source', 'Invited', 'Topics', ''].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                        <tbody>{view.map(r => (
                            <tr key={r.id || r.email} className="border-t border-slate-800 text-slate-200">
                                <td className="px-3 py-2 break-all">{r.email}</td>
                                <td className="px-3 py-2">{r.name || ''}</td>
                                <td className="px-3 py-2"><span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS[r.status] || 'bg-slate-500/20 text-slate-300'}`}>{r.status}</span></td>
                                <td className="px-3 py-2">{r.user_id ? 'Yes' : 'No'}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{day(r.subscribed_at)}</td>
                                <td className="px-3 py-2">{r.source || ''}</td>
                                <td className="px-3 py-2">{r.nudge_count || 0}</td>
                                <td className="px-3 py-2 text-xs text-slate-400">{topics(r.preferences)}</td>
                                <td className="px-3 py-2 text-right">{r.status !== 'blocked' && <button onClick={() => block(r)} className="text-xs text-red-300 hover:text-red-200">Block</button>}</td>
                            </tr>))}
                            {!view.length && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No subscribers match.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="mt-3 flex items-center gap-3 text-sm text-slate-400">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-40">Previous</button>
                <span>Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / PAGE))}</span>
                <button disabled={(page + 1) * PAGE >= filtered.length} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-40">Next</button>
            </div>
        </div>
    );
}
