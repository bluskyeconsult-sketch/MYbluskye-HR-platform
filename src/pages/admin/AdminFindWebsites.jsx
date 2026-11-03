// src/pages/admin/AdminFindWebsites.jsx
// Find websites for sponsor-register employers that have none, then approve each one. After approval, use the
// "find contact emails" button on Employer Sources, which reads the website for a published business address.
import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../../lib/authFetch';
import { Search, Loader2, Check, X, ExternalLink, AlertCircle } from 'lucide-react';

export default function AdminFindWebsites() {
    const [sector, setSector] = useState('');
    const [town, setTown] = useState('');
    const [sectors, setSectors] = useState([]);
    const [towns, setTowns] = useState([]);
    const [rows, setRows] = useState([]);
    const [used, setUsed] = useState(0);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const [edit, setEdit] = useState({});

    const load = useCallback(async () => {
        try {
            const r = await authenticatedFetch('admin-list-website-suggestions', { sector: sector || undefined, town: town || undefined });
            setRows(r.rows || []); setSectors(r.sectors || []); setTowns(r.towns || []); setUsed(r.usedThisMonth || 0);
        } catch (e) { setMsg(e.message); }
    }, [sector, town]);
    useEffect(() => { load(); }, [load]);

    const run = async () => {
        setBusy(true); setMsg('');
        try {
            const r = await authenticatedFetch('admin-suggest-websites', { sector: sector || undefined, town: town || undefined, limit: 15 });
            setMsg(r.message || `Checked ${r.processed}: ${r.found} suggested, ${r.none} nothing reliable. ${r.remaining} still to check.${r.stopped ? ' Stopped: ' + r.stopped : ''}`);
            await load();
        } catch (e) { setMsg(e.message); } finally { setBusy(false); }
    };
    const decide = async (row, decision) => {
        try {
            await authenticatedFetch('admin-review-website', { sourceId: row.id, decision, url: edit[row.id] || undefined });
            setRows(rs => rs.filter(x => x.id !== row.id));
        } catch (e) { setMsg(e.message); }
    };
    const sel = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white';
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-white mb-1">Find employer websites</h1>
            <p className="text-sm text-slate-400 mb-4">Searches for each employer's website, 15 at a time. Nothing is saved until you approve it. Open the link and check it is the right company and town first.</p>
            <div className="flex flex-wrap gap-2 items-center mb-3">
                <select value={sector} onChange={e => setSector(e.target.value)} className={sel}><option value="">All sectors</option>{sectors.map(s => <option key={s}>{s}</option>)}</select>
                <select value={town} onChange={e => setTown(e.target.value)} className={sel}><option value="">All towns</option>{towns.map(s => <option key={s}>{s}</option>)}</select>
                <button onClick={run} disabled={busy} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg text-sm inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Find 15 websites</button>
                <span className="text-xs text-slate-500">Searches used this month: {used} of 1,800 (free allowance)</span>
            </div>
            {msg && <p className="text-sm text-amber-200 mb-3 flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{msg}</p>}
            {rows.length === 0 ? <p className="text-sm text-slate-500">No suggestions waiting. Click "Find 15 websites".</p> : (
                <ul className="space-y-2">{rows.map(r => (
                    <li key={r.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                            <div className="text-sm text-white font-medium">{r.company_name} <span className="text-xs text-slate-500">{r.town} · {r.sector}</span></div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.website_confidence === 'likely' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{r.website_confidence === 'likely' ? 'Likely match' : 'Check carefully'}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                            <input value={edit[r.id] ?? r.website_candidate} onChange={e => setEdit(p => ({ ...p, [r.id]: e.target.value }))} aria-label="Website" className={sel + ' flex-1 min-w-[12rem]'} />
                            <a href={edit[r.id] || r.website_candidate} target="_blank" rel="noopener noreferrer" className="text-primary-400 text-sm inline-flex items-center gap-1"><ExternalLink className="w-4 h-4" />Open</a>
                            <button onClick={() => decide(r, 'approve')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm inline-flex items-center gap-1"><Check className="w-4 h-4" />Approve</button>
                            <button onClick={() => decide(r, 'reject')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm inline-flex items-center gap-1"><X className="w-4 h-4" />Wrong</button>
                        </div>
                    </li>))}</ul>
            )}
        </div>
    );
}
