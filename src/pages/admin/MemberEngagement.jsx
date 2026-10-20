// src/pages/admin/MemberEngagement.jsx
//
// NEW (2026-10-20): Admin > Member Engagement.
// Controls the automatic daily email that helps registered members finish their profile, start applying, or come
// back. Shows who is due an email today, lets an admin switch the job Off / Test / Live (no redeploy needed), send
// a sample of each email to themselves, and send the due emails now. The sending rules (spacing, limits, opt-outs)
// are enforced on the server (api/cron/engage-inactive-members.js); this page only drives it.

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../lib/authFetch';
import { HeartHandshake, Loader2, RefreshCw, Send, Users, CheckCircle2, AlertTriangle, Power, FlaskConical, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const MODES = [
    { key: 'off', label: 'Off', icon: Power, tone: 'border-slate-600 text-slate-300', active: 'bg-slate-600/40 border-slate-400 text-white', text: 'No engagement emails are sent, not even by the daily job.' },
    { key: 'dry', label: 'Test', icon: FlaskConical, tone: 'border-amber-500/40 text-amber-300', active: 'bg-amber-500/20 border-amber-400 text-amber-200', text: 'The daily job only works out who is due. Nothing is sent until you press "Send due emails now".' },
    { key: 'live', label: 'Live', icon: Zap, tone: 'border-emerald-500/40 text-emerald-300', active: 'bg-emerald-500/20 border-emerald-400 text-emerald-200', text: 'The daily job (09:30 UTC) emails everyone who is due, up to the daily limit.' }
];

function fmtDate(v) {
    if (!v) return '-';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Tile({ label, value, hint }) {
    return (
        <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50">
            <div className="text-2xl font-bold text-white">{value ?? '-'}</div>
            <div className="text-sm text-slate-300">{label}</div>
            {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
        </div>
    );
}

export default function MemberEngagement() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [filter, setFilter] = useState('all');

    async function load() {
        setLoading(true);
        setError('');
        try { setData(await authenticatedFetch('engagement-overview')); }
        catch (e) { setError(e.message || 'Could not load.'); }
        finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function setMode(mode) {
        if (mode === data?.mode) return;
        if (mode === 'live' && !confirm('Switch to Live? From the next daily run, members who are due will be emailed automatically.')) return;
        setBusy('mode');
        try {
            await authenticatedFetch('engagement-set-mode', { mode });
            toast.success(mode === 'live' ? 'Live: emails will go out at the next daily run.' : mode === 'dry' ? 'Test mode: nothing will be sent automatically.' : 'Switched off.');
            await load();
        } catch (e) { toast.error(e.message); }
        finally { setBusy(''); }
    }

    async function sendSample(kind) {
        setBusy('sample-' + kind);
        try { const r = await authenticatedFetch('engagement-send-sample', { kind }); toast.success(`Sample sent to ${r.sentTo}`); }
        catch (e) { toast.error(e.message); }
        finally { setBusy(''); }
    }

    async function runNow() {
        const n = Math.min(data?.dueCount || 0, data?.perRun || 100);
        if (n === 0) return toast('Nobody is due right now.');
        if (!confirm(`Send ${n} email${n === 1 ? '' : 's'} now to the members who are due? This cannot be undone.`)) return;
        setBusy('run');
        try {
            const r = await authenticatedFetch('engagement-run-now', { confirm: true });
            toast.success(`Sent ${r.emailed}` + (r.failed ? `, ${r.failed} failed` : '') + (r.remaining ? `. ${r.remaining} more are due and will go in the next run.` : '.'), { duration: 8000 });
            await load();
        } catch (e) { toast.error(e.message, { duration: 8000 }); }
        finally { setBusy(''); }
    }

    const kinds = data?.kinds || {};
    const rows = (data?.due || []).filter(r => filter === 'all' || r.kind === filter);
    const mode = data?.mode;

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
                <HeartHandshake className="w-7 h-7 text-primary-400" />
                <h1 className="text-2xl font-bold text-white">Member Engagement</h1>
            </div>
            <p className="text-slate-400 text-sm mb-6">Automatic emails that help registered members finish their profile, start applying for jobs, or come back. They run once a day at 09:30 UTC.</p>

            {error && (
                <div className="flex items-start gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>{error} If this says a column does not exist, run <code>add-member-engagement-tracking.sql</code> in Supabase first.</div>
                </div>
            )}

            {/* MODE */}
            <section className="mb-6 p-4 rounded-xl border border-slate-700 bg-slate-800/40">
                <h2 className="text-white font-semibold mb-3">Status</h2>
                <div className="grid sm:grid-cols-3 gap-3">
                    {MODES.map(m => (
                        <button key={m.key} disabled={!data || busy === 'mode'} onClick={() => setMode(m.key)}
                            className={`text-left p-3 rounded-lg border transition ${mode === m.key ? m.active : m.tone + ' hover:bg-slate-800'}`}>
                            <div className="flex items-center gap-2 font-semibold"><m.icon className="w-4 h-4" /> {m.label}{mode === m.key && <CheckCircle2 className="w-4 h-4 ml-auto" />}</div>
                            <div className="text-xs mt-1 opacity-80">{m.text}</div>
                        </button>
                    ))}
                </div>
                {mode === 'dry' && <p className="text-xs text-amber-300 mt-3">Test mode is on, so nothing is sent automatically. Send yourself the samples below, check the list, then choose Live.</p>}
            </section>

            {/* STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                <Tile label="Due now" value={data?.dueCount} hint={data ? `Up to ${data.perRun} go out per day` : ''} />
                <Tile label="Emailed today" value={data?.stat?.emailedToday} />
                <Tile label="Last 7 days" value={data?.stat?.emailed7} />
                <Tile label="Last 30 days" value={data?.stat?.emailed30} />
                <Tile label="Unsubscribed" value={data?.stat?.unsubscribed} hint="from these emails" />
            </div>

            {/* ACTIONS */}
            <section className="mb-6 p-4 rounded-xl border border-slate-700 bg-slate-800/40">
                <h2 className="text-white font-semibold mb-1">Preview and send</h2>
                <p className="text-slate-400 text-xs mb-3">Send yourself a sample of each email to see exactly what members receive.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(kinds).map(([k, label]) => (
                        <button key={k} onClick={() => sendSample(k)} disabled={!!busy} className="text-xs px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-1.5 disabled:opacity-50">
                            {busy === 'sample-' + k ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Sample: {label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={runNow} disabled={!!busy || !data || mode === 'off'} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center gap-2 disabled:opacity-50">
                        {busy === 'run' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send due emails now
                    </button>
                    <button onClick={load} disabled={loading} className="px-3 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    {mode === 'off' && <span className="text-xs text-slate-500">Choose Test or Live to enable sending.</span>}
                </div>
            </section>

            {/* WHO IS DUE */}
            <section>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 className="text-white font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary-400" /> Who is due an email</h2>
                    <div className="flex flex-wrap gap-1.5">
                        {[['all', `All (${data?.dueCount ?? 0})`], ...Object.entries(kinds).map(([k, l]) => [k, `${l} (${data?.byKind?.[k] || 0})`])].map(([k, l]) => (
                            <button key={k} onClick={() => setFilter(k)} className={`text-xs px-2.5 py-1 rounded-full border ${filter === k ? 'border-primary-500 text-white bg-primary-500/10' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{l}</button>
                        ))}
                    </div>
                </div>
                {loading && !data ? (
                    <div className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</div>
                ) : rows.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400 border border-slate-700 rounded-xl">Nobody is due right now. Members become due 3 days after registering, or after 30 days without signing in.</div>
                ) : (
                    <div className="overflow-x-auto border border-slate-700 rounded-xl">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/60 text-slate-400 text-left">
                                <tr><th className="px-3 py-2">Member</th><th className="px-3 py-2">Email type</th><th className="px-3 py-2">Registered</th><th className="px-3 py-2">Last emailed</th><th className="px-3 py-2">Sent so far</th></tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.id} className="border-t border-slate-800">
                                        <td className="px-3 py-2"><div className="text-white">{r.name || '-'}</div><div className="text-xs text-slate-500">{r.email}</div></td>
                                        <td className="px-3 py-2 text-slate-300">{kinds[r.kind] || r.kind}{r.kind === 'complete_profile' && <span className="text-xs text-slate-500"> ({r.gaps} missing)</span>}</td>
                                        <td className="px-3 py-2 text-slate-400">{fmtDate(r.registered)}</td>
                                        <td className="px-3 py-2 text-slate-400">{fmtDate(r.lastEmailed)}</td>
                                        <td className="px-3 py-2 text-slate-400">{r.sent}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {(data?.due?.length || 0) < (data?.dueCount || 0) && <p className="text-xs text-slate-500 mt-2">Showing the first {data.due.length} of {data.dueCount}.</p>}
            </section>

            <section className="mt-8 text-xs text-slate-500 space-y-1">
                <p>Rules: members get an email 3 days after registering if their profile is thin, or if they have not applied for a job; at least 7 days between emails; at most 3 of these per person; "Come back" only after 30 days without signing in and no more than once a month.</p>
                <p>Skipped automatically: admins, employers, unconfirmed addresses, people who switched email notifications off, and anyone who unsubscribed. Every email has a one-click unsubscribe link.</p>
            </section>
        </div>
    );
}
