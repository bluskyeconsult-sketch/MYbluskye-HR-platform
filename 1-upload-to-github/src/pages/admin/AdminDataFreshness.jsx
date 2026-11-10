// src/pages/admin/AdminDataFreshness.jsx
// NEW (2026-11-01): one page listing everything on the site that goes out of date, how old it is, and what to do.
// Run 23-create-data-freshness.sql first. Also exports FreshnessReminder, the pop-up shown on every admin page.
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle, AlertTriangle, Clock, X } from 'lucide-react';

let cache = { at: 0, rows: null };

async function fetchFreshness(force) {
    if (!force && cache.rows && Date.now() - cache.at < 10 * 60 * 1000) return cache.rows;
    const { data, error } = await supabase.rpc('admin_freshness');
    if (error) throw new Error(error.message);
    cache = { at: Date.now(), rows: data || [] };
    return cache.rows;
}

const isDue = (r) => r.status === 'overdue' || r.status === 'never checked' || r.status === 'never loaded';

export function FreshnessReminder() {
    const [rows, setRows] = useState(null);
    const [hidden, setHidden] = useState(true);
    useEffect(() => {
        let stop = false;
        (async () => {
            try {
                const r = await fetchFreshness(false);
                if (stop) return;
                setRows(r);
                let dismissedToday = false;
                try { dismissedToday = localStorage.getItem('freshness_dismissed') === new Date().toISOString().slice(0, 10); } catch (e) { /* storage may be unavailable */ }
                setHidden(dismissedToday);
            } catch (e) { /* the reminder is optional; stay quiet if the database file has not been run yet */ }
        })();
        return () => { stop = true; };
    }, []);
    if (!rows || hidden) return null;
    const due = rows.filter(isDue);
    if (!due.length) return null;
    const dismiss = () => {
        try { localStorage.setItem('freshness_dismissed', new Date().toISOString().slice(0, 10)); } catch (e) { /* ignore */ }
        setHidden(true);
    };
    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl p-4">
            <button onClick={dismiss} aria-label="Hide until tomorrow" className="absolute top-2 right-2 text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-2 text-amber-300 font-medium text-sm"><AlertTriangle className="w-4 h-4" /> {due.length} item{due.length === 1 ? '' : 's'} may be out of date</div>
            <ul className="mt-2 space-y-1 text-xs text-slate-300 list-disc pl-4">
                {due.slice(0, 3).map(r => <li key={r.key}>{r.title}</li>)}
                {due.length > 3 && <li>and {due.length - 3} more</li>}
            </ul>
            <Link to="/admin/data-freshness" onClick={dismiss} className="mt-3 inline-block px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs">Review now</Link>
            <p className="text-[11px] text-slate-500 mt-2">Hidden until tomorrow if you close this.</p>
        </div>
    );
}

const badge = {
    ok: 'bg-emerald-500/15 text-emerald-300',
    'due soon': 'bg-amber-500/15 text-amber-300',
    overdue: 'bg-red-500/15 text-red-300',
    'never checked': 'bg-red-500/15 text-red-300',
    'never loaded': 'bg-red-500/15 text-red-300'
};

export default function AdminDataFreshness() {
    const [rows, setRows] = useState(null);
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState('');
    const load = useCallback(async (force) => {
        try { setRows(await fetchFreshness(force)); setMsg(''); }
        catch (e) { setMsg('Could not load. Has 23-create-data-freshness.sql been run in Supabase? (' + e.message + ')'); setRows([]); }
    }, []);
    useEffect(() => { load(true); }, [load]);

    const mark = async (key) => {
        setBusy(key);
        const { error } = await supabase.rpc('admin_mark_reviewed', { p_key: key });
        if (error) setMsg(error.message); else await load(true);
        setBusy('');
    };

    if (!rows) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>;
    const order = { 'never loaded': 0, 'never checked': 0, overdue: 1, 'due soon': 2, ok: 3 };
    const sorted = [...rows].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
    const due = rows.filter(isDue).length;
    return (
        <div className="p-6 max-w-4xl space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Clock className="w-6 h-6 text-primary-400" /> Keep Up To Date</h1>
                <p className="text-slate-400 text-sm mt-1">Everything on the site that can go out of date. Automatic items read their date from your data. For manual items, check the source, update the site if needed, then press "I checked this today".</p>
                <p className={'text-sm mt-2 ' + (due ? 'text-amber-300' : 'text-emerald-300')}>{due ? `${due} item${due === 1 ? '' : 's'} need attention.` : 'Everything is up to date.'}</p>
            </div>
            {msg && <p className="text-red-300 text-sm">{msg}</p>}
            {sorted.map(r => (
                <div key={r.key} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="text-white font-medium text-sm">{r.title}</div>
                        <span className={'text-xs px-2 py-0.5 rounded-full ' + (badge[r.status] || 'bg-slate-700 text-slate-300')}>{r.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {r.source === 'automatic' ? 'Automatic' : 'Manual'} · {r.last_updated ? `last updated ${r.last_updated} (${r.days_old} days ago)` : 'no date yet'} · review every {r.max_age_days} days
                    </p>
                    <p className="text-sm text-slate-300 mt-2">{r.why}</p>
                    <p className="text-sm text-slate-400 mt-1"><span className="text-slate-300">What to do: </span>{r.how_to}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {r.fix_path && <Link to={r.fix_path} className="px-3 py-1.5 border border-slate-700 text-slate-200 hover:bg-slate-800 rounded-lg text-xs">Go there</Link>}
                        {r.source === 'manual' && (
                            <button disabled={busy === r.key} onClick={() => mark(r.key)} className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg text-xs inline-flex items-center gap-1">
                                {busy === r.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} I checked this today
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
