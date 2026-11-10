// src/pages/admin/AdminLmiaExplorer.jsx
// NEW (2026-11-01): ADMIN-ONLY data explorer for the Canada LMIA list (employers approved to hire foreign workers).
// Data lives in the private table lmia_records (run 25-create-lmia-explorer.sql). Only admins can read it, enforced by the
// database itself, so nothing here is visible to the public. Load the CSV made for this page, then search, filter, rank and export.
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Upload, Download, Search, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
        else if (ch === '"') q = true;
        else if (ch === delim) { row.push(f); f = ''; }
        else if (ch === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
        else f += ch;
    }
    if (f.length || row.length) { row.push(f.replace(/\r$/, '')); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim()));
}

// Cells that start with = + - @ can run as formulas when a CSV is opened in Excel, so they are marked as text on export.
function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const PAGE = 50;
const SORTS = {
    positions: { col: 'positions_approved', asc: false, label: 'Most positions' },
    lmias: { col: 'lmias_approved', asc: false, label: 'Most approvals' },
    employer: { col: 'employer', asc: true, label: 'Employer A to Z' },
    province: { col: 'province', asc: true, label: 'Province A to Z' }
};
const clean = (s) => String(s || '').replace(/[^\p{L}\p{N} '\-.&]/gu, ' ').trim();

export default function AdminLmiaExplorer() {
    const [summary, setSummary] = useState(null);
    const [quarter, setQuarter] = useState('');
    const [f, setF] = useState({ employer: '', province: '', stream: '', occupation: '', careOnly: false, minPositions: '' });
    const [sort, setSort] = useState('positions');
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);
    const [file, setFile] = useState(null);
    const [parsed, setParsed] = useState([]);
    const [loadQuarter, setLoadQuarter] = useState('2026-Q2');
    const [replace, setReplace] = useState(true);
    const fileRef = useRef(null);
    const input = 'bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white';

    const loadSummary = useCallback(async (q) => {
        const { data, error } = await supabase.rpc('admin_lmia_summary', { p_quarter: q || null });
        if (error) { setMsg('Could not load. Has 25-create-lmia-explorer.sql been run in Supabase? (' + error.message + ')'); setSummary({ totals: { rows: 0 }, quarters: [] }); return null; }
        setSummary(data); return data;
    }, []);

    useEffect(() => { (async () => { const d = await loadSummary(null); if (d && d.quarters && d.quarters[0]) setQuarter(d.quarters[0]); })(); }, [loadSummary]);
    useEffect(() => { if (quarter) loadSummary(quarter); }, [quarter, loadSummary]);

    const buildQuery = useCallback((select, opts) => {
        let q = supabase.from('lmia_records').select(select, opts).eq('quarter', quarter);
        const emp = clean(f.employer); if (emp) q = q.ilike('employer', `%${emp}%`);
        if (f.province) q = q.eq('province', f.province);
        if (f.stream) q = q.eq('stream', f.stream);
        const occ = clean(f.occupation);
        if (occ) q = /^\d{5}$/.test(occ) ? q.eq('occupation_code', occ) : q.ilike('occupation_title', `%${occ}%`);
        if (f.careOnly) q = q.eq('care_role', true);
        const mp = parseInt(f.minPositions, 10); if (mp > 0) q = q.gte('positions_approved', mp);
        const s = SORTS[sort]; q = q.order(s.col, { ascending: s.asc, nullsFirst: false }).order('id');
        return q;
    }, [f, quarter, sort]);

    useEffect(() => {
        if (!quarter) return;
        let stop = false;
        const t = setTimeout(async () => {
            setLoading(true);
            const { data, error, count: c } = await buildQuery('*', { count: 'exact' }).range(page * PAGE, page * PAGE + PAGE - 1);
            if (stop) return;
            if (error) setMsg(error.message); else { setRows(data || []); setCount(c || 0); }
            setLoading(false);
        }, 250);
        return () => { stop = true; clearTimeout(t); };
    }, [buildQuery, page, quarter]);

    const setFilter = (k, v) => { setF(prev => ({ ...prev, [k]: v })); setPage(0); };

    const exportCsv = async () => {
        setBusy(true); setMsg('');
        try {
            const head = ['Employer', 'Province', 'Address', 'Stream', 'Occupation code', 'Occupation', 'Care role', 'Incorporation', 'LMIAs approved', 'Positions approved'];
            const lines = [head.join(',')];
            for (let from = 0; from < 10000; from += 1000) {
                const { data, error } = await buildQuery('*').range(from, from + 999);
                if (error) throw new Error(error.message);
                (data || []).forEach(r => lines.push([r.employer, r.province, r.address, r.stream, r.occupation_code, r.occupation_title, r.care_role ? 'yes' : 'no', r.incorporation, r.lmias_approved, r.positions_approved].map(csvCell).join(',')));
                if (!data || data.length < 1000) break;
            }
            const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = `lmia-${quarter}-filtered.csv`; a.click(); URL.revokeObjectURL(a.href);
            setMsg(`Exported ${lines.length - 1} rows${lines.length - 1 >= 10000 ? ' (limit 10,000, narrow the filters for more)' : ''}.`);
        } catch (e) { setMsg(e.message); } finally { setBusy(false); }
    };

    const pick = async (e) => {
        const fl = e.target.files?.[0]; setFile(fl || null); setParsed([]); setMsg('');
        if (!fl) return;
        if (!/\.csv$/i.test(fl.name)) { setMsg('Please choose the CSV file (canada-lmia-FULL-2026-Q2-for-explorer.csv).'); return; }
        const r = parseCsv(await fl.text());
        const head = (r[0] || []).map(h => h.trim().toLowerCase());
        const idx = (name) => head.indexOf(name);
        if (idx('employer') < 0 || idx('positions approved') < 0) { setMsg('This does not look like the explorer CSV: it needs the columns Employer and Positions approved.'); return; }
        const get = (row, name) => { const i = idx(name); return i >= 0 ? (row[i] || '').trim() : ''; };
        setParsed(r.slice(1).map(row => ({
            province: get(row, 'province'), stream: get(row, 'stream'), employer: get(row, 'employer'), address: get(row, 'address'),
            occupation_code: get(row, 'occupation code'), occupation_title: get(row, 'occupation (french title)') || get(row, 'occupation'),
            care_role: get(row, 'care role').toLowerCase() === 'yes', incorporation: get(row, 'incorporation'),
            lmias_approved: get(row, 'lmias approved'), positions_approved: get(row, 'positions approved')
        })).filter(x => x.employer));
    };

    const submit = async () => {
        if (!/^\d{4}-Q[1-4]$/.test(loadQuarter)) { setMsg('The quarter must look like 2026-Q2.'); return; }
        setBusy(true); setMsg('');
        try {
            for (let i = 0; i < parsed.length; i += 2000) {
                const { error } = await supabase.rpc('admin_load_lmia_rows', { p_quarter: loadQuarter, p_rows: parsed.slice(i, i + 2000), p_replace: replace && i === 0 });
                if (error) throw new Error(error.message);
                setMsg(`Loaded ${Math.min(i + 2000, parsed.length)} of ${parsed.length}...`);
            }
            setMsg(`Done. ${parsed.length} rows loaded for ${loadQuarter}.`);
            setFile(null); setParsed([]); if (fileRef.current) fileRef.current.value = '';
            const d = await loadSummary(null); if (d) setQuarter(loadQuarter); setPage(0);
        } catch (e) { setMsg(e.message); } finally { setBusy(false); }
    };

    if (!summary) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>;
    const t = summary.totals || {};
    const pc = (arr, key, label) => (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-2">{label}</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
                {(arr || []).map((x, i) => (
                    <button key={i} onClick={() => { if (key === 'province') setFilter('province', x.name); else if (key === 'stream') setFilter('stream', x.name); else if (key === 'occupation') setFilter('occupation', x.code || ''); else setFilter('employer', x.name); }}
                        className="w-full flex justify-between gap-3 text-left text-xs text-slate-300 hover:bg-slate-800 rounded px-2 py-1">
                        <span className="truncate">{x.name || x.code}</span><span className="text-slate-500 whitespace-nowrap">{x.positions} positions</span>
                    </button>
                ))}
            </div>
        </div>
    );
    return (
        <div className="p-6 space-y-5 max-w-7xl">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Lock className="w-6 h-6 text-primary-400" /> LMIA Explorer</h1>
                <p className="text-slate-400 text-sm mt-1">Admin only. The Canada list of employers approved to hire foreign workers, stored in a private table that visitors and ordinary members cannot read. Search, filter, rank and export it here.</p>
            </div>
            {msg && <p className="text-sm text-amber-300">{msg}</p>}

            <details className="bg-slate-900/60 border border-slate-800 rounded-xl p-4" open={t.rows === 0}>
                <summary className="text-sm font-semibold text-white cursor-pointer">Load a quarter</summary>
                <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div><label className="block text-xs text-slate-400 mb-1">Quarter label</label><input value={loadQuarter} onChange={e => setLoadQuarter(e.target.value.trim())} className={input + ' w-32'} /></div>
                        <div><label className="block text-xs text-slate-400 mb-1">CSV file</label><input ref={fileRef} type="file" accept=".csv" onChange={pick} className="text-sm" /></div>
                        <label className="text-xs text-slate-300 flex items-center gap-2"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} /> Replace this quarter if already loaded</label>
                    </div>
                    {parsed.length > 0 && <p className="text-xs text-slate-400">{parsed.length} rows ready. First: {parsed[0].employer} ({parsed[0].province}).</p>}
                    <button disabled={busy || parsed.length === 0} onClick={submit} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg text-sm inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Load into private table</button>
                    <p className="text-xs text-slate-500">Use canada-lmia-FULL-2026-Q2-for-explorer.csv. Load each new government quarter with its own label (2026-Q3 and so on) to compare quarters.</p>
                </div>
            </details>

            {t.rows > 0 && (<>
                <div className="flex flex-wrap gap-3 items-center">
                    <label className="text-xs text-slate-400">Quarter</label>
                    <select value={quarter} onChange={e => { setQuarter(e.target.value); setPage(0); }} className={input}>{(summary.quarters || []).map(q => <option key={q} value={q}>{q}</option>)}</select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[['Records', t.rows], ['Employers', t.employers], ['Positions approved', t.positions], ['Approvals (LMIAs)', t.lmias], ['Care positions', t.care_positions]].map(([k, v]) => (
                        <div key={k} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3"><p className="text-xs text-slate-400">{k}</p><p className="text-xl font-bold text-white">{Number(v || 0).toLocaleString()}</p></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {pc(summary.by_province, 'province', 'By province (click to filter)')}
                    {pc(summary.by_stream, 'stream', 'By program stream')}
                    {pc(summary.top_occupations, 'occupation', 'Top occupations')}
                    {pc(summary.top_employers, 'employer', 'Top employers')}
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" /><input placeholder="Employer name" value={f.employer} onChange={e => setFilter('employer', e.target.value)} className={input + ' pl-8 w-56'} /></div>
                        <input placeholder="Occupation or 5-digit code" value={f.occupation} onChange={e => setFilter('occupation', e.target.value)} className={input + ' w-52'} />
                        <select value={f.province} onChange={e => setFilter('province', e.target.value)} className={input}><option value="">All provinces</option>{(summary.by_province || []).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select>
                        <select value={f.stream} onChange={e => setFilter('stream', e.target.value)} className={input}><option value="">All streams</option>{(summary.by_stream || []).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select>
                        <input type="number" min="0" placeholder="Min positions" value={f.minPositions} onChange={e => setFilter('minPositions', e.target.value)} className={input + ' w-32'} />
                        <label className="text-xs text-slate-300 flex items-center gap-2"><input type="checkbox" checked={f.careOnly} onChange={e => setFilter('careOnly', e.target.checked)} /> Care roles only</label>
                        <select value={sort} onChange={e => { setSort(e.target.value); setPage(0); }} className={input}>{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
                        <button onClick={() => { setF({ employer: '', province: '', stream: '', occupation: '', careOnly: false, minPositions: '' }); setPage(0); }} className="text-xs text-sky-400 hover:underline">Clear filters</button>
                        <button disabled={busy || count === 0} onClick={exportCsv} className="ml-auto px-3 py-2 border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-40 rounded-lg text-sm inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Export these results</button>
                    </div>
                    <p className="text-xs text-slate-400">{loading ? 'Searching...' : `${count.toLocaleString()} matching records`}</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="text-slate-400 border-b border-slate-800"><tr>{['Employer', 'Province / address', 'Stream', 'Occupation', 'Positions', 'Approvals', 'Type'].map(h => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.id} className="border-b border-slate-800/60 text-slate-300 align-top">
                                        <td className="py-2 pr-3 text-white">{r.employer}{r.care_role && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">care</span>}</td>
                                        <td className="py-2 pr-3">{r.province}<div className="text-slate-500">{r.address}</div></td>
                                        <td className="py-2 pr-3">{r.stream}</td>
                                        <td className="py-2 pr-3">{r.occupation_code}<div className="text-slate-500">{r.occupation_title}</div></td>
                                        <td className="py-2 pr-3 text-white">{r.positions_approved}</td>
                                        <td className="py-2 pr-3">{r.lmias_approved}</td>
                                        <td className="py-2 pr-3">{r.incorporation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1 border border-slate-700 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        <span>Page {page + 1} of {Math.max(1, Math.ceil(count / PAGE))}</span>
                        <button disabled={(page + 1) * PAGE >= count} onClick={() => setPage(page + 1)} className="p-1 border border-slate-700 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                    <p>Read this data with care: the government says the list leaves out individuals' names (for example households employing caregivers) and company names that include a person's name, so it is not complete. Employer names are typed in by hand and may contain errors.</p>
                    <p>"Positions approved" is the number of jobs approved, not workers who arrived. Source: Employment and Social Development Canada, Temporary Foreign Worker Program, positive LMIA employers list.</p>
                </div>
            </>)}
        </div>
    );
}
