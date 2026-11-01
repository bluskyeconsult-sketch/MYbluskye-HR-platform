// src/pages/admin/AdminEmployerRegisters.jsx
// NEW (2026-10-25): load official employer lists (Canada positive-LMIA, New Zealand accredited employers) so job adverts
// can be matched to them by employer NAME. Run create-employer-registers.sql first.
// A match shows "Employer on official list" on the job. It does not prove an advert is genuine.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Upload, AlertTriangle, CheckCircle } from 'lucide-react';

// Proper CSV reader: quoted fields, doubled quotes, commas or semicolons, line breaks inside quotes.
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

export default function AdminEmployerRegisters() {
    const [regs, setRegs] = useState(null);
    const [key, setKey] = useState('ca-lmia-positive');
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [nameCol, setNameCol] = useState(0);
    const [placeCol, setPlaceCol] = useState(-1);
    const [asOf, setAsOf] = useState('');
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);
    const load = useCallback(async () => {
        const { data, error } = await supabase.from('employer_registers').select('*').order('key');
        if (error) setMsg('Could not load registers. Has create-employer-registers.sql been run?'); else setRegs(data);
    }, []);
    useEffect(() => { load(); }, [load]);

    const pick = async (e) => {
        const f = e.target.files?.[0]; setFile(f || null); setRows([]); setMsg('');
        if (!f) return;
        if (!/\.(csv|txt)$/i.test(f.name)) { setMsg('Please save the list as a CSV file first (in Excel: Save As > CSV).'); return; }
        const r = parseCsv(await f.text());
        setRows(r);
        const head = (r[0] || []).map(h => h.toLowerCase());
        const n = head.findIndex(h => /employer|business|legal.*name|operating|company|organisation|organization/.test(h));
        setNameCol(n >= 0 ? n : 0);
        setPlaceCol(head.findIndex(h => /city|town|location|province|region|address/.test(h)));
    };

    const submit = async () => {
        setBusy(true); setMsg('');
        try {
            const data = rows.slice(1).map(r => ({ name: (r[nameCol] || '').trim(), place: placeCol >= 0 ? (r[placeCol] || '').trim() : '' })).filter(x => x.name);
            if (!data.length) throw new Error('No employer names found in that column.');
            for (let i = 0; i < data.length; i += 2000) {
                const { error } = await supabase.rpc('load_register_entries', { p_key: key, p_rows: data.slice(i, i + 2000), p_replace: i === 0 });
                if (error) throw new Error(error.message);
                setMsg(`Loaded ${Math.min(i + 2000, data.length)} of ${data.length}...`);
            }
            const { data: matched, error } = await supabase.rpc('finish_register_load', { p_key: key, p_loaded_on: asOf });
            if (error) throw new Error(error.message);
            setMsg(`Done. ${data.length} employers loaded. ${matched} job adverts now match the list.`);
            setFile(null); setRows([]); await load();
        } catch (e) { setMsg(e.message); } finally { setBusy(false); }
    };

    if (!regs) return <div className="p-10 flex justify-center">{msg ? <p className="text-red-300">{msg}</p> : <Loader2 className="w-6 h-6 animate-spin text-primary-400" />}</div>;
    const cur = regs.find(r => r.key === key);
    const input = 'bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white';
    return (
        <div className="p-6 max-w-4xl mx-auto text-slate-200">
            <h1 className="text-2xl font-bold text-white mb-2">Official employer lists</h1>
            <p className="text-sm text-slate-400 mb-4">Load a government list and every job advert from that country is matched to it by employer name. Loading again replaces the old list. Australia has no public provider list, so there is nothing to load for it.</p>
            {msg && <div className="mb-3 text-sm bg-slate-800 border border-slate-700 rounded-lg p-3">{msg}</div>}

            <div className="space-y-2 mb-6">
                {regs.map(r => (
                    <div key={r.key} className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm">
                        <div className="flex items-center gap-2 text-white font-medium">{r.loaded_on ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-300" />}{r.title}</div>
                        <div className="text-xs text-slate-400 mt-1">{r.loaded_on ? `${r.row_count} employers, list dated ${r.loaded_on}` : 'Not loaded yet: jobs in this country show "unchecked".'}</div>
                        <a className="text-xs text-primary-400" href={r.source_url} target="_blank" rel="noopener noreferrer">Download the official list</a>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <h2 className="text-white font-semibold mb-3">Load a list</h2>
                <label className="block text-xs text-slate-400 mb-1">Which list</label>
                <select value={key} onChange={e => setKey(e.target.value)} className={input + ' mb-3'}>{regs.map(r => <option key={r.key} value={r.key}>{r.title}</option>)}</select>
                {cur && <p className="text-xs text-slate-400 mb-3">{cur.proves} {cur.caveat}</p>}
                <label className="block text-xs text-slate-400 mb-1">The date shown on the official list (the date it covers or was published)</label>
                <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className={input + ' mb-3'} />
                <label className="block text-xs text-slate-400 mb-1">The list as a CSV file (if you download Excel, use Save As, CSV)</label>
                <input type="file" accept=".csv,.txt" onChange={pick} className="text-sm mb-3" />
                {rows.length > 1 && (
                    <div className="mb-3">
                        <div className="flex flex-wrap gap-3 mb-2">
                            <div><label className="block text-xs text-slate-400">Employer name column</label><select value={nameCol} onChange={e => setNameCol(+e.target.value)} className={input}>{rows[0].map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}</select></div>
                            <div><label className="block text-xs text-slate-400">Place column (optional)</label><select value={placeCol} onChange={e => setPlaceCol(+e.target.value)} className={input}><option value={-1}>None</option>{rows[0].map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}</select></div>
                        </div>
                        <p className="text-xs text-slate-400">First rows with your choice: {rows.slice(1, 4).map(r => r[nameCol]).join(' | ')}. {rows.length - 1} rows in total.</p>
                    </div>
                )}
                <button disabled={busy || rows.length < 2 || !asOf} onClick={submit} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg text-sm inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Replace this list</button>
            </div>
        </div>
    );
}
