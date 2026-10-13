// src/pages/admin/AdminFinance.jsx
// NEW (2026-10-13): Finance and Compliance (Admin > Growth > Finance & Compliance).
// Six tabs: Overview, Income & Costs, Tax Pack, Compliance Calendar, Data Protection, Monthly Report.
// Everything here is a DRAFT for the owner or an accountant to check. Nothing is filed with HMRC,
// Companies House or the ICO from this page. Data is reached only through the server action
// "admin-finance" (run create-finance-compliance.sql first).

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, X, RefreshCw, Download, Printer, Check, AlertTriangle } from 'lucide-react';

async function call(op, payload = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/index?action=admin-finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ op, ...payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || 'Request failed');
    return data;
}

const money = (n) => (n === null || n === undefined || Number.isNaN(Number(n))) ? '-' : `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d) => d ? Math.round((new Date(d + 'T00:00:00Z') - new Date(today() + 'T00:00:00Z')) / 86400000) : null;
const input = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white';
const card = 'bg-slate-900 border border-slate-800 rounded-xl p-4';
const btn = 'px-3 py-2 rounded-lg text-sm border border-slate-700 text-slate-200 hover:bg-white/5 inline-flex items-center gap-1';
const btnPrimary = 'px-3 py-2 rounded-lg text-sm bg-primary-500 text-white inline-flex items-center gap-1 disabled:opacity-50';
const TABS = ['Overview', 'Income & Costs', 'Tax Pack', 'Compliance Calendar', 'Data Protection', 'Monthly Report'];
const CATEGORIES = ['Hosting and software', 'AI usage (OpenAI)', 'Data feeds (Adzuna, Jooble)', 'Email and domain', 'Marketing and advertising', 'Professional fees', 'Bank and card charges', 'Insurance', 'Equipment', 'Travel', 'Office and phone', 'Other expenses'];

// Spreadsheet programs run text that starts with = + - @ as a formula. Prefix those cells (but leave real numbers alone).
function csvEscape(v) { let s = v === null || v === undefined ? '' : String(v); if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function downloadCsv(name, header, rows) {
    const text = [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function printHtml(title, bodyHtml) {
    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups for this site to print.'); return; }
    w.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:24px auto;color:#111;font-size:14px}h1{font-size:20px}h2{font-size:15px;margin-top:22px;border-bottom:1px solid #ccc;padding-bottom:4px}table{width:100%;border-collapse:collapse}td,th{padding:5px 6px;border-bottom:1px solid #eee;text-align:left}td.n,th.n{text-align:right}.note{color:#555;font-size:12px;margin-top:18px}</style></head><body>${bodyHtml}<p class="note">Draft prepared from ODUSBABA records. Not filed with HMRC. Check with your accountant before relying on it.</p></body></html>`);
    w.document.close(); w.focus(); w.print();
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function taxYears(current) {
    const start = Number(String(current || '2026-27').slice(0, 4));
    return [start, start - 1, start - 2, start - 3].map(y => `${y}-${String((y + 1) % 100).padStart(2, '0')}`);
}

function Err({ error }) { return error ? <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div> : null; }
function Spin() { return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>; }
function Stat({ label, value, sub, tone }) {
    return <div className={card}><div className="text-xs text-slate-400">{label}</div><div className={`text-xl font-semibold mt-1 ${tone === 'bad' ? 'text-red-300' : tone === 'warn' ? 'text-amber-300' : 'text-white'}`}>{value}</div>{sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}</div>;
}
function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3">
                <div className="flex items-center justify-between"><h2 className="text-white font-semibold">{title}</h2><button type="button" onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button></div>
                {children}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- Overview
function Overview({ settingsInfo, goTab }) {
    const [data, setData] = useState(null);
    const [watch, setWatch] = useState(null);
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [msg, setMsg] = useState(null);
    const ty = settingsInfo?.currentTaxYear;

    const load = useCallback(async () => {
        setError(null);
        try {
            const [s, w, c] = await Promise.all([call('summary', { taxYear: ty }), call('watch'), call('compliance-list')]);
            setData(s); setWatch(w); setItems(c.items || []);
        } catch (e) { setError(e.message); }
    }, [ty]);

    const sync = useCallback(async (quiet) => {
        setSyncing(true); if (!quiet) setMsg(null);
        try { const r = await call('stripe-sync'); setMsg(`Stripe synced: ${r.imported} records${r.capped ? ' (stopped at 5,000; sync again to continue)' : ''}.`); await load(); }
        catch (e) { if (!quiet) setError(e.message); }
        setSyncing(false);
    }, [load]);

    useEffect(() => { if (ty) load(); }, [ty, load]);
    // Sync automatically when the last sync was more than about 12 hours ago.
    useEffect(() => {
        const last = settingsInfo?.settings?.last_stripe_sync;
        if (!settingsInfo) return;
        if (!last || (Date.now() - new Date(last).getTime()) > 12 * 3600 * 1000) sync(true);
    }, [settingsInfo]); // eslint-disable-line react-hooks/exhaustive-deps

    if (error && !data) return <Err error={error} />;
    if (!data || !watch) return <Spin />;
    const t = data.totals;
    const upcoming = items.filter(i => i.status === 'open' && i.due_date).map(i => ({ ...i, days: daysUntil(i.due_date) })).sort((a, b) => a.days - b.days).slice(0, 5);
    const noDate = items.filter(i => i.status === 'open' && !i.due_date).length;
    const vatTone = watch.vat.percent >= 90 ? 'bad' : watch.vat.percent >= 70 ? 'warn' : undefined;

    return (
        <div className="space-y-4">
            <Err error={error} />
            {msg && <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{msg}</div>}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-400">Tax year {data.taxYear} ({data.range.start} to {data.range.end})</p>
                <button onClick={() => sync(false)} disabled={syncing} className={btn}>{syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync Stripe now</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Turnover (after refunds)" value={money(t.netTurnover)} />
                <Stat label="Costs (incl. Stripe fees)" value={money(t.totalCosts)} />
                <Stat label="Profit (before tax)" value={money(t.profit)} tone={t.profit < 0 ? 'bad' : undefined} />
                <Stat label="Ledger entries" value={data.entryCount} sub={t.needsGbp ? `${t.needsGbp} not in GBP, add the GBP amount` : undefined} tone={t.needsGbp ? 'warn' : undefined} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
                <div className={card}>
                    <div className="text-sm font-medium text-white mb-1">VAT registration watch</div>
                    <div className="text-xs text-slate-400 mb-2">Turnover for the last 12 months against the threshold of {money(watch.vat.threshold)}. Confirm the current threshold on gov.uk.</div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full ${vatTone === 'bad' ? 'bg-red-400' : vatTone === 'warn' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, watch.vat.percent)}%` }} /></div>
                    <div className="text-sm text-slate-200 mt-2">{money(watch.vat.rolling12MonthTurnover)} ({watch.vat.percent}%)</div>
                    {watch.vat.percent >= 70 && <div className="text-xs text-amber-300 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Getting close. Speak to your accountant about registering.</div>}
                </div>
                <div className={card}>
                    <div className="text-sm font-medium text-white mb-1">Making Tax Digital for Income Tax watch</div>
                    <div className="text-xs text-slate-400 mb-2">Counts self-employment income for the tax year shown. Check the rules and dates on gov.uk.</div>
                    <table className="w-full text-xs text-slate-300">
                        <tbody>
                            {watch.mtd.map(m => (
                                <tr key={m.taxYear} className="border-t border-slate-800">
                                    <td className="py-1.5">{m.taxYear}{m.complete ? '' : ' (so far)'}</td>
                                    <td className="py-1.5">{money(m.qualifyingIncome)}</td>
                                    <td className="py-1.5">limit {money(m.threshold)}</td>
                                    <td className={`py-1.5 ${m.over ? 'text-amber-300' : 'text-slate-500'}`}>{m.over ? `Over: applies from ${m.appliesFrom}` : `Under (applies from ${m.appliesFrom} if over)`}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className={card}>
                <div className="flex items-center justify-between mb-2"><div className="text-sm font-medium text-white">Next deadlines</div><button className="text-xs text-primary-300" onClick={() => goTab('Compliance Calendar')}>Open calendar</button></div>
                {upcoming.length === 0 ? <p className="text-sm text-slate-400">Nothing dated yet. Open the calendar and press "Add standard UK items".</p> : upcoming.map(i => (
                    <div key={i.id} className="flex justify-between gap-3 text-sm border-t border-slate-800 py-1.5 first:border-0">
                        <span className="text-slate-200">{i.title}</span>
                        <span className={`whitespace-nowrap ${i.days < 0 ? 'text-red-300' : i.days <= 14 ? 'text-amber-300' : 'text-slate-400'}`}>{i.due_date} ({i.days < 0 ? `${-i.days} days overdue` : `in ${i.days} days`})</span>
                    </div>
                ))}
                {noDate > 0 && <p className="text-xs text-slate-500 mt-2">{noDate} open item(s) have no date yet. Set them in the calendar.</p>}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- Income & Costs
const EMPTY_ENTRY = { entry_date: today(), kind: 'expense', category: CATEGORIES[0], description: '', vendor: '', currency: 'GBP', gross: '', amount_gbp: '', notes: '' };
function Ledger({ settingsInfo }) {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('all');
    const [ty, setTy] = useState('all');
    const current = settingsInfo?.currentTaxYear;

    const load = useCallback(async () => {
        setError(null);
        try {
            let range = {};
            if (ty !== 'all') { const y = Number(ty.slice(0, 4)); range = { from: `${y}-04-06`, to: `${y + 1}-04-05` }; }
            setRows((await call('ledger-list', range)).rows);
        } catch (e) { setError(e.message); }
    }, [ty]);
    useEffect(() => { load(); }, [load]);

    const shown = (rows || []).filter(r => filter === 'all' || r.kind === filter || (filter === 'manual' && r.source === 'manual'));
    async function save(e) {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            const { id, source, external_id, created_at, fee, net, ...record } = editing;
            await call('ledger-save', { id: id || undefined, record });
            setEditing(null); await load();
        } catch (err) { setError(err.message); }
        setSaving(false);
    }
    async function remove(r) {
        if (!confirm('Delete this entry? This cannot be undone.')) return;
        try { await call('ledger-delete', { id: r.id }); await load(); } catch (err) { setError(err.message); }
    }
    const set = (k) => (e) => setEditing(p => ({ ...p, [k]: e.target.value }));
    const exportCsv = () => downloadCsv(`ledger-${ty === 'all' ? 'all' : ty}.csv`,
        ['Date', 'Type', 'Category', 'Description', 'Vendor', 'Currency', 'Amount', 'Fee', 'Net', 'GBP amount (non-GBP)', 'Source'],
        shown.map(r => [r.entry_date, r.kind, r.category, r.description, r.vendor, r.currency, r.gross, r.fee, r.net, r.amount_gbp, r.source]));

    return (
        <div className="space-y-3">
            <Err error={error} />
            <div className="flex flex-wrap items-center gap-2">
                <select className={`${input} !w-auto`} value={ty} onChange={e => setTy(e.target.value)}>
                    <option value="all">All dates</option>
                    {taxYears(current).map(y => <option key={y} value={y}>Tax year {y}</option>)}
                </select>
                <select className={`${input} !w-auto`} value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option><option value="refund">Refunds</option><option value="adjustment">Adjustments</option><option value="manual">Added by me</option>
                </select>
                <div className="flex-1" />
                <button className={btn} onClick={exportCsv}><Download className="w-4 h-4" /> Export CSV</button>
                <button className={btnPrimary} onClick={() => setEditing({ ...EMPTY_ENTRY })}><Plus className="w-4 h-4" /> Add income or cost</button>
            </div>
            <p className="text-xs text-slate-500">Stripe sales, refunds and Stripe fees arrive on their own (Overview, then Sync Stripe now). Add everything else by hand: hosting, OpenAI, data feeds, domain, professional fees, and income that does not go through Stripe.</p>
            {!rows ? <Spin /> : shown.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">No entries in this view.</p> : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900 text-slate-400 text-xs uppercase"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Details</th><th className="p-3 text-right">Amount</th><th className="p-3 text-right">Fee</th><th className="p-3">Source</th><th className="p-3"></th></tr></thead>
                        <tbody>
                            {shown.slice(0, 500).map(r => (
                                <tr key={r.id} className="border-t border-slate-800 text-slate-200 align-top">
                                    <td className="p-3 whitespace-nowrap">{r.entry_date}</td>
                                    <td className="p-3">{r.kind}</td>
                                    <td className="p-3">{r.description || r.category}<div className="text-xs text-slate-500">{[r.category, r.vendor].filter(Boolean).join(' / ')}</div></td>
                                    <td className="p-3 text-right whitespace-nowrap">{r.currency === 'GBP' ? money(r.gross) : `${r.currency} ${Number(r.gross).toFixed(2)}${r.amount_gbp ? ` (${money(r.amount_gbp)})` : ' (needs GBP)'}`}</td>
                                    <td className="p-3 text-right">{Number(r.fee) ? money(r.fee) : ''}</td>
                                    <td className="p-3 text-xs text-slate-500">{r.source}</td>
                                    <td className="p-3 whitespace-nowrap">
                                        {r.source === 'manual' && <>
                                            <button onClick={() => setEditing(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? ''])))} className="p-1.5 text-slate-300 hover:text-white" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => remove(r)} className="p-1.5 text-slate-500 hover:text-red-400" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                                        </>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {shown.length > 500 && <p className="text-xs text-slate-500 p-3">Showing the latest 500. Export the CSV for everything.</p>}
                </div>
            )}
            {editing && (
                <Modal title={editing.id ? 'Edit entry' : 'Add income or cost'} onClose={() => setEditing(null)}>
                    <form onSubmit={save} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-xs text-slate-400">Date *<input type="date" className={input} value={editing.entry_date} onChange={set('entry_date')} required /></label>
                            <label className="block text-xs text-slate-400">Type<select className={input} value={editing.kind} onChange={set('kind')}><option value="expense">Cost</option><option value="income">Income</option><option value="refund">Refund given</option><option value="adjustment">Other adjustment</option></select></label>
                        </div>
                        <label className="block text-xs text-slate-400">Category<select className={input} value={editing.category || ''} onChange={set('category')}>{editing.kind === 'income' && <option value="Sales">Sales</option>}{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
                        <label className="block text-xs text-slate-400">What was it?<input className={input} value={editing.description} onChange={set('description')} placeholder="e.g. Vercel Pro, October" /></label>
                        <label className="block text-xs text-slate-400">Who paid or was paid<input className={input} value={editing.vendor} onChange={set('vendor')} /></label>
                        <div className="grid grid-cols-3 gap-3">
                            <label className="block text-xs text-slate-400">Currency<input className={input} value={editing.currency} onChange={e => setEditing(p => ({ ...p, currency: e.target.value.toUpperCase().slice(0, 3) }))} /></label>
                            <label className="block text-xs text-slate-400 col-span-2">Amount *<input type="number" step="0.01" min="0" className={input} value={editing.gross} onChange={set('gross')} required /></label>
                        </div>
                        {editing.currency && editing.currency !== 'GBP' && (
                            <label className="block text-xs text-slate-400">Amount in GBP (from your bank or card statement) *<input type="number" step="0.01" min="0" className={input} value={editing.amount_gbp} onChange={set('amount_gbp')} required /></label>
                        )}
                        <label className="block text-xs text-slate-400">Notes<input className={input} value={editing.notes} onChange={set('notes')} /></label>
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setEditing(null)} className={btn}>Cancel</button>
                            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

// ---------------------------------------------------------------- Tax Pack
function TaxPack({ settingsInfo }) {
    const [ty, setTy] = useState(settingsInfo?.currentTaxYear);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => { if (!ty) return; setData(null); call('summary', { taxYear: ty }).then(setData).catch(e => setError(e.message)); }, [ty]);
    if (error) return <Err error={error} />;
    if (!data) return <Spin />;
    const t = data.totals;
    const cats = Object.entries(t.expenseByCategory).sort((a, b) => b[1] - a[1]);
    const months = Object.keys(t.byMonth).sort();

    const print = () => printHtml(`Tax pack ${data.taxYear}`, `
        <h1>BluSkye Integrated Consult (ODUSBABA): income and costs, tax year ${esc(data.taxYear)}</h1>
        <p>Period: ${esc(data.range.start)} to ${esc(data.range.end)}. Basis: cash records from Stripe and entries added by hand.</p>
        <h2>Summary</h2>
        <table><tr><td>Sales (gross)</td><td class="n">${money(t.turnover)}</td></tr><tr><td>Refunds</td><td class="n">${money(t.refunds)}</td></tr><tr><td><b>Turnover after refunds</b></td><td class="n"><b>${money(t.netTurnover)}</b></td></tr><tr><td>Stripe fees</td><td class="n">${money(t.stripeFees)}</td></tr><tr><td>Other costs</td><td class="n">${money(t.expenses)}</td></tr><tr><td><b>Profit before tax</b></td><td class="n"><b>${money(t.profit)}</b></td></tr></table>
        <h2>Costs by category</h2>
        <table>${cats.map(([c, v]) => `<tr><td>${esc(c)}</td><td class="n">${money(v)}</td></tr>`).join('') || '<tr><td>None recorded</td><td></td></tr>'}<tr><td>Stripe fees</td><td class="n">${money(t.stripeFees)}</td></tr></table>
        <h2>By month</h2>
        <table><tr><th>Month</th><th class="n">Sales</th><th class="n">Refunds</th><th class="n">Stripe fees</th><th class="n">Costs</th></tr>${months.map(m => `<tr><td>${m}</td><td class="n">${money(t.byMonth[m].turnover)}</td><td class="n">${money(t.byMonth[m].refunds)}</td><td class="n">${money(t.byMonth[m].fees)}</td><td class="n">${money(t.byMonth[m].expenses)}</td></tr>`).join('')}</table>
        ${data.openaiEstimateUsd !== null ? `<p>OpenAI usage estimate for the year: US$${data.openaiEstimateUsd} (an estimate from usage logs; record the actual invoices as costs).</p>` : ''}
        ${t.needsGbp ? `<p><b>${t.needsGbp} entries are not in GBP and have no GBP amount, so they are left out.</b></p>` : ''}`);
    const csv = () => downloadCsv(`tax-pack-${data.taxYear}.csv`, ['Tax year', 'Month', 'Sales', 'Refunds', 'Stripe fees', 'Costs'],
        months.map(m => [data.taxYear, m, t.byMonth[m].turnover, t.byMonth[m].refunds, t.byMonth[m].fees, t.byMonth[m].expenses]));

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <select className={`${input} !w-auto`} value={ty} onChange={e => setTy(e.target.value)}>{taxYears(settingsInfo.currentTaxYear).map(y => <option key={y} value={y}>Tax year {y}</option>)}</select>
                <div className="flex-1" />
                <button className={btn} onClick={csv}><Download className="w-4 h-4" /> CSV by month</button>
                <button className={btnPrimary} onClick={print}><Printer className="w-4 h-4" /> Print or save as PDF</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Sales" value={money(t.turnover)} /><Stat label="Refunds" value={money(t.refunds)} /><Stat label="Turnover after refunds" value={money(t.netTurnover)} /><Stat label="Profit before tax" value={money(t.profit)} tone={t.profit < 0 ? 'bad' : undefined} />
            </div>
            <div className={card}>
                <div className="text-sm font-medium text-white mb-2">Costs by category</div>
                <table className="w-full text-sm text-slate-200"><tbody>
                    {cats.map(([c, v]) => <tr key={c} className="border-t border-slate-800"><td className="py-1.5">{c}</td><td className="py-1.5 text-right">{money(v)}</td></tr>)}
                    <tr className="border-t border-slate-800"><td className="py-1.5">Stripe fees</td><td className="py-1.5 text-right">{money(t.stripeFees)}</td></tr>
                </tbody></table>
                {data.openaiEstimateUsd !== null && <p className="text-xs text-slate-500 mt-2">OpenAI usage logged this year: about US${data.openaiEstimateUsd} (estimate). Add the real invoices as costs under "AI usage (OpenAI)".</p>}
            </div>
            <p className="text-xs text-slate-500">This is a working draft for your accountant or your Self Assessment. It is not a tax return, it does not work out tax, and it is not sent to HMRC. Allowable expenses and the right basis (cash or accruals) are for your accountant to confirm.</p>
        </div>
    );
}

// ---------------------------------------------------------------- Compliance calendar
const EMPTY_ITEM = { title: '', authority: '', due_date: '', recurrence: 'none', link: '', notes: '' };
function Calendar() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(null);
    const [msg, setMsg] = useState(null);
    const load = useCallback(async () => { try { setData(await call('compliance-list')); } catch (e) { setError(e.message); } }, []);
    useEffect(() => { load(); }, [load]);
    const act = async (fn) => { setError(null); try { await fn(); await load(); } catch (e) { setError(e.message); } };
    if (!data) return error ? <Err error={error} /> : <Spin />;
    const open = data.items.filter(i => i.status === 'open');
    const done = data.items.filter(i => i.status === 'done');
    const sorted = [...open].sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
    const set = (k) => (e) => setEditing(p => ({ ...p, [k]: e.target.value }));
    const tone = (d) => { const n = daysUntil(d); return n === null ? 'text-slate-500' : n < 0 ? 'text-red-300 font-semibold' : n <= 14 ? 'text-amber-300' : 'text-slate-300'; };

    return (
        <div className="space-y-3">
            <Err error={error} />
            {msg && <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{msg}</div>}
            <div className="flex flex-wrap gap-2">
                <button className={btn} onClick={() => act(async () => { const r = await call('compliance-seed'); setMsg(`${r.added} standard items added. Set the dates marked "no date".`); })}>Add standard UK items</button>
                <div className="flex-1" />
                <button className={btnPrimary} onClick={() => setEditing({ ...EMPTY_ITEM })}><Plus className="w-4 h-4" /> Add item</button>
            </div>
            <p className="text-xs text-slate-500">Dates are reminders to check, not filing confirmations. Always confirm the exact date on gov.uk. A daily email goes to the address in Settings (below) when something is due within 14 days or overdue.</p>
            {sorted.length === 0 ? <p className="text-sm text-slate-400 py-6 text-center">Nothing open. Press "Add standard UK items" to start.</p> : (
                <div className="space-y-2">
                    {sorted.map(i => (
                        <div key={i.id} className={`${card} flex flex-wrap items-start gap-3`}>
                            <div className="flex-1 min-w-[220px]">
                                <div className="text-sm text-white">{i.title}</div>
                                <div className="text-xs text-slate-500">{[i.authority, i.recurrence !== 'none' ? `repeats ${i.recurrence}` : null].filter(Boolean).join(' / ')}</div>
                                {i.notes && <div className="text-xs text-slate-400 mt-1">{i.notes}</div>}
                                {i.link && /^https?:\/\//i.test(i.link) && <a href={i.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-300 underline">Open guidance</a>}
                            </div>
                            <div className={`text-sm whitespace-nowrap ${tone(i.due_date)}`}>{i.due_date ? `${i.due_date} (${daysUntil(i.due_date) < 0 ? `${-daysUntil(i.due_date)} days overdue` : `in ${daysUntil(i.due_date)} days`})` : 'no date'}</div>
                            <div className="flex gap-1">
                                <button className={btn} onClick={() => act(async () => { const r = await call('compliance-done', { id: i.id }); setMsg(r.next ? `Marked done. Next due ${r.next}.` : 'Marked done.'); })}><Check className="w-4 h-4" /> Done</button>
                                <button className="p-2 text-slate-300 hover:text-white" aria-label="Edit" onClick={() => setEditing(Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v ?? ''])))}><Pencil className="w-4 h-4" /></button>
                                <button className="p-2 text-slate-500 hover:text-red-400" aria-label="Delete" onClick={() => confirm('Delete this item?') && act(() => call('compliance-delete', { id: i.id }))}><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {data.renewals?.length > 0 && (
                <div className={card}>
                    <div className="text-sm font-medium text-white mb-1">Subscriptions renewing within 60 days (from the Renewals Monitor)</div>
                    {data.renewals.map((r, idx) => <div key={idx} className="flex justify-between text-sm text-slate-300 border-t border-slate-800 py-1.5 first:border-0"><span>{r.service_name}</span><span>{r.renewal_date}{r.cost ? ` / ${r.currency || ''} ${r.cost}` : ''}</span></div>)}
                </div>
            )}
            {done.length > 0 && <details className="text-sm text-slate-400"><summary className="cursor-pointer">Completed ({done.length})</summary>{done.map(i => <div key={i.id} className="py-1">{i.title} (done {i.last_done})</div>)}</details>}
            <SettingsBox />
            {editing && (
                <Modal title={editing.id ? 'Edit item' : 'Add item'} onClose={() => setEditing(null)}>
                    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const { id, status, last_done, created_at, updated_at, ...record } = editing; act(async () => { await call('compliance-save', { id: id || undefined, record }); setEditing(null); }); }}>
                        <label className="block text-xs text-slate-400">What needs doing *<input className={input} value={editing.title} onChange={set('title')} required /></label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-xs text-slate-400">Who (HMRC, ICO...)<input className={input} value={editing.authority} onChange={set('authority')} /></label>
                            <label className="block text-xs text-slate-400">Due date<input type="date" className={input} value={editing.due_date} onChange={set('due_date')} /></label>
                        </div>
                        <label className="block text-xs text-slate-400">Repeats<select className={input} value={editing.recurrence} onChange={set('recurrence')}><option value="none">Once</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label>
                        <label className="block text-xs text-slate-400">Link<input className={input} value={editing.link} onChange={set('link')} placeholder="https://" /></label>
                        <label className="block text-xs text-slate-400">Notes<textarea rows={3} className={input} value={editing.notes} onChange={set('notes')} /></label>
                        <div className="flex justify-end gap-2"><button type="button" className={btn} onClick={() => setEditing(null)}>Cancel</button><button type="submit" className={btnPrimary}>Save</button></div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

function SettingsBox() {
    const [s, setS] = useState(null);
    const [msg, setMsg] = useState(null);
    useEffect(() => { call('settings-get').then(r => setS(r.settings)).catch(() => { }); }, []);
    if (!s) return null;
    return (
        <div className={card}>
            <div className="text-sm font-medium text-white mb-2">Settings</div>
            <div className="grid md:grid-cols-2 gap-3">
                <label className="block text-xs text-slate-400">Email for reminders<input className={input} value={s.owner_email || ''} onChange={e => setS({ ...s, owner_email: e.target.value })} placeholder="you@example.com" /></label>
                <label className="block text-xs text-slate-400">VAT threshold used for the watch (£)<input type="number" className={input} value={s.vat_threshold || ''} onChange={e => setS({ ...s, vat_threshold: e.target.value })} /></label>
            </div>
            <div className="flex items-center gap-3 mt-3">
                <button className={btnPrimary} onClick={async () => { try { await call('settings-save', { settings: { owner_email: s.owner_email, vat_threshold: s.vat_threshold } }); setMsg('Saved.'); } catch (e) { setMsg(e.message); } }}>Save settings</button>
                {msg && <span className="text-xs text-slate-400">{msg}</span>}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- Data protection
const REQ_TYPES = ['access', 'deletion', 'rectification', 'objection', 'portability', 'restriction', 'other'];
function DataProtection() {
    const [sub, setSub] = useState('activities');
    const [rows, setRows] = useState(null);
    const [log, setLog] = useState(null);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(null);
    const [msg, setMsg] = useState(null);

    const load = useCallback(async () => {
        setError(null); setRows(null);
        try {
            if (sub === 'log') setLog((await call('access-log')).rows);
            else setRows((await call('dp-list', { kind: sub })).rows);
        } catch (e) { setError(e.message); }
    }, [sub]);
    useEffect(() => { load(); }, [load]);
    const set = (k) => (e) => setEditing(p => ({ ...p, [k]: e.target.value }));
    const act = async (fn) => { setError(null); try { await fn(); await load(); } catch (e) { setError(e.message); } };
    const blank = { activities: { activity: '', purpose: '', data_categories: '', data_subjects: '', lawful_basis: '', recipients: '', retention: '', transfers: '', notes: '' }, requests: { request_type: 'access', requester_name: '', requester_email: '', received_date: today(), due_date: '', status: 'open', outcome: '', notes: '' }, breaches: { description: '', data_affected: '', people_affected: '', risk: 'unassessed', ico_reported: 'false', individuals_told: 'false', not_reportable_reason: '', actions: '', status: 'open', discovered_at: new Date().toISOString().slice(0, 16) } };
    const strip = (r) => { const { id, created_at, updated_at, completed_date, ico_reported_at, ...rest } = r; return rest; };
    const fields = (arr) => arr.map(([k, label, kind]) => (
        <label key={k} className="block text-xs text-slate-400">{label}
            {kind === 'area' ? <textarea rows={2} className={input} value={editing[k] ?? ''} onChange={set(k)} /> : <input type={kind || 'text'} className={input} value={editing[k] ?? ''} onChange={set(k)} />}
        </label>
    ));

    return (
        <div className="space-y-3">
            <Err error={error} />
            {msg && <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{msg}</div>}
            <div className="flex flex-wrap gap-2">
                {[['activities', 'Processing register'], ['requests', 'Requests from people'], ['breaches', 'Breach register'], ['log', 'Support access log']].map(([k, l]) => (
                    <button key={k} onClick={() => setSub(k)} className={`px-3 py-1.5 rounded-lg text-xs border ${sub === k ? 'bg-white/15 border-white/30 text-white' : 'border-slate-700 text-slate-300'}`}>{l}</button>
                ))}
            </div>

            {sub === 'log' ? (
                !log ? <Spin /> : (
                    <div className="space-y-2">
                        <p className="text-xs text-slate-500">Every time an admin opened a member's record in the Support view. Keep this as evidence that access is controlled.</p>
                        <div className="flex justify-end"><button className={btn} onClick={() => downloadCsv('support-access-log.csv', ['When', 'Member', 'Admin id', 'Reason', 'Content included'], log.map(r => [r.at, r.member, r.admin, r.reason, r.includedContent ? 'yes' : 'no']))}><Download className="w-4 h-4" /> Export CSV</button></div>
                        {log.length === 0 ? <p className="text-sm text-slate-400 py-6 text-center">No access recorded.</p> : (
                            <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full text-sm text-left"><thead className="bg-slate-900 text-slate-400 text-xs uppercase"><tr><th className="p-3">When</th><th className="p-3">Member</th><th className="p-3">Reason</th><th className="p-3">Content?</th></tr></thead><tbody>
                                {log.map((r, i) => <tr key={i} className="border-t border-slate-800 text-slate-200"><td className="p-3 whitespace-nowrap">{String(r.at).slice(0, 16).replace('T', ' ')}</td><td className="p-3">{r.member}</td><td className="p-3">{r.reason || ''}</td><td className="p-3">{r.includedContent ? 'yes' : 'no'}</td></tr>)}
                            </tbody></table></div>
                        )}
                    </div>
                )
            ) : !rows ? <Spin /> : (
                <>
                    <div className="flex flex-wrap gap-2">
                        {sub === 'activities' && <>
                            <button className={btn} onClick={() => act(async () => { const r = await call('dp-seed'); setMsg(`${r.added} draft entries added. Read and edit each one.`); })}>Add draft entries for this platform</button>
                            <button className={btn} onClick={() => downloadCsv('processing-register.csv', ['Activity', 'Purpose', 'Data', 'People', 'Lawful basis', 'Shared with', 'Kept for', 'Transfers outside UK', 'Notes'], rows.map(r => [r.activity, r.purpose, r.data_categories, r.data_subjects, r.lawful_basis, r.recipients, r.retention, r.transfers, r.notes]))}><Download className="w-4 h-4" /> Export CSV</button>
                        </>}
                        {sub === 'requests' && <button className={btn} onClick={() => downloadCsv('data-requests.csv', ['Type', 'Name', 'Email', 'Received', 'Due', 'Status', 'Completed', 'Outcome'], rows.map(r => [r.request_type, r.requester_name, r.requester_email, r.received_date, r.due_date, r.status, r.completed_date, r.outcome]))}><Download className="w-4 h-4" /> Export CSV</button>}
                        {sub === 'breaches' && <button className={btn} onClick={() => downloadCsv('breach-register.csv', ['Discovered', 'What happened', 'Data', 'People', 'Risk', 'ICO reported', 'ICO reported at', 'People told', 'Why not reported', 'Actions', 'Status'], rows.map(r => [r.discovered_at, r.description, r.data_affected, r.people_affected, r.risk, r.ico_reported ? 'yes' : 'no', r.ico_reported_at, r.individuals_told ? 'yes' : 'no', r.not_reportable_reason, r.actions, r.status]))}><Download className="w-4 h-4" /> Export CSV</button>}
                        <div className="flex-1" />
                        <button className={btnPrimary} onClick={() => setEditing({ ...blank[sub] })}><Plus className="w-4 h-4" /> {sub === 'activities' ? 'Add activity' : sub === 'requests' ? 'Log a request' : 'Log a breach'}</button>
                    </div>
                    {sub === 'activities' && <p className="text-xs text-slate-500">The record of what personal data you handle and why (UK GDPR Article 30). The draft entries are written from how the platform is built. They are not legal advice: check them, fill the "set the period" gaps, and have them reviewed.</p>}
                    {sub === 'requests' && <p className="text-xs text-slate-500">A request from a person to see, correct or delete their data must normally be answered within one month. The due date is set for you.</p>}
                    {sub === 'breaches' && <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">If a breach is likely to put people at risk, it must be reported to the ICO within 72 hours of you becoming aware of it (ico.org.uk/make-a-complaint/data-protection-complaints/report-a-breach). Log it here as soon as you find it, then decide. Breaches and requests cannot be deleted, only closed.</div>}
                    {rows.length === 0 ? <p className="text-sm text-slate-400 py-6 text-center">Nothing logged.</p> : (
                        <div className="space-y-2">
                            {rows.map(r => {
                                if (sub === 'activities') return (
                                    <div key={r.id} className={card}>
                                        <div className="flex justify-between gap-2"><div className="text-sm text-white font-medium">{r.activity}</div><div className="flex gap-1"><button className="p-1.5 text-slate-300" aria-label="Edit" onClick={() => setEditing(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? ''])))}><Pencil className="w-4 h-4" /></button><button className="p-1.5 text-slate-500 hover:text-red-400" aria-label="Delete" onClick={() => confirm('Delete this entry?') && act(() => call('dp-delete', { kind: 'activities', id: r.id }))}><Trash2 className="w-4 h-4" /></button></div></div>
                                        <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                                            <div><b>Why:</b> {r.purpose}</div><div><b>Data:</b> {r.data_categories}</div><div><b>People:</b> {r.data_subjects}</div><div><b>Lawful basis:</b> {r.lawful_basis}</div><div><b>Shared with:</b> {r.recipients}</div><div><b>Kept for:</b> {r.retention}</div><div><b>Outside the UK:</b> {r.transfers}</div>
                                        </div>
                                    </div>
                                );
                                if (sub === 'requests') {
                                    const n = daysUntil(r.due_date); const live = r.status === 'open' || r.status === 'in_progress';
                                    return (
                                        <div key={r.id} className={card}>
                                            <div className="flex justify-between gap-2"><div className="text-sm text-white">{r.request_type} request: {r.requester_name || r.requester_email || 'unnamed'}</div><button className="p-1.5 text-slate-300" aria-label="Edit" onClick={() => setEditing(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? ''])))}><Pencil className="w-4 h-4" /></button></div>
                                            <div className="text-xs text-slate-400">Received {r.received_date} / due {r.due_date} / <span className={live && n < 0 ? 'text-red-300' : live && n <= 7 ? 'text-amber-300' : ''}>{r.status}{live ? (n < 0 ? ` (${-n} days overdue)` : ` (${n} days left)`) : ''}</span></div>
                                            {r.outcome && <div className="text-xs text-slate-400 mt-1">Outcome: {r.outcome}</div>}
                                        </div>
                                    );
                                }
                                const hrs = Math.round((Date.now() - new Date(r.discovered_at).getTime()) / 3600000);
                                const clock = r.status === 'open' && r.risk !== 'low' && !r.ico_reported;
                                return (
                                    <div key={r.id} className={card}>
                                        <div className="flex justify-between gap-2"><div className="text-sm text-white">{r.description}</div><button className="p-1.5 text-slate-300" aria-label="Edit" onClick={() => setEditing({ ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? ''])), ico_reported: String(r.ico_reported), individuals_told: String(r.individuals_told), discovered_at: String(r.discovered_at).slice(0, 16) })}><Pencil className="w-4 h-4" /></button></div>
                                        <div className="text-xs text-slate-400">Found {String(r.discovered_at).slice(0, 16).replace('T', ' ')} / risk: {r.risk} / ICO reported: {r.ico_reported ? 'yes' : 'no'} / {r.status}</div>
                                        {clock && <div className={`text-xs mt-1 ${hrs >= 72 ? 'text-red-300 font-semibold' : hrs >= 48 ? 'text-amber-300' : 'text-slate-400'}`}>{hrs >= 72 ? `${hrs} hours since discovery: the 72-hour ICO window has passed. Report now if it is reportable.` : `${72 - hrs} hours left of the 72-hour ICO window.`}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {editing && (
                <Modal title={editing.id ? 'Edit' : 'Add'} onClose={() => setEditing(null)}>
                    <form className="space-y-3" onSubmit={(e) => {
                        e.preventDefault();
                        const record = strip(editing);
                        act(async () => { await call('dp-save', { kind: sub, id: editing.id || undefined, record }); setEditing(null); });
                    }}>
                        {sub === 'activities' && fields([['activity', 'Activity *'], ['purpose', 'Why you do it', 'area'], ['data_categories', 'What data', 'area'], ['data_subjects', 'Whose data'], ['lawful_basis', 'Lawful basis'], ['recipients', 'Shared with', 'area'], ['retention', 'How long kept', 'area'], ['transfers', 'Sent outside the UK?'], ['notes', 'Notes', 'area']])}
                        {sub === 'requests' && <>
                            <label className="block text-xs text-slate-400">Type<select className={input} value={editing.request_type} onChange={set('request_type')}>{REQ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
                            {fields([['requester_name', 'Name'], ['requester_email', 'Email', 'email'], ['received_date', 'Received', 'date'], ['due_date', 'Due (blank = one month)', 'date']])}
                            <label className="block text-xs text-slate-400">Status<select className={input} value={editing.status} onChange={set('status')}><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="refused">Refused (with reason)</option></select></label>
                            {fields([['outcome', 'Outcome', 'area'], ['notes', 'Notes', 'area']])}
                        </>}
                        {sub === 'breaches' && <>
                            {fields([['discovered_at', 'When you found out', 'datetime-local'], ['description', 'What happened *', 'area'], ['data_affected', 'What data', 'area'], ['people_affected', 'How many people', 'number']])}
                            <label className="block text-xs text-slate-400">Risk to people<select className={input} value={editing.risk} onChange={set('risk')}><option value="unassessed">Not assessed yet</option><option value="low">Unlikely to put people at risk</option><option value="high">Likely to put people at risk</option></select></label>
                            <label className="block text-xs text-slate-400">Reported to the ICO?<select className={input} value={editing.ico_reported} onChange={set('ico_reported')}><option value="false">No</option><option value="true">Yes</option></select></label>
                            <label className="block text-xs text-slate-400">People told?<select className={input} value={editing.individuals_told} onChange={set('individuals_told')}><option value="false">No</option><option value="true">Yes</option></select></label>
                            {fields([['not_reportable_reason', 'If not reported, why', 'area'], ['actions', 'What you did about it', 'area']])}
                            <label className="block text-xs text-slate-400">Status<select className={input} value={editing.status} onChange={set('status')}><option value="open">Open</option><option value="closed">Closed</option></select></label>
                        </>}
                        <div className="flex justify-end gap-2"><button type="button" className={btn} onClick={() => setEditing(null)}>Cancel</button><button type="submit" className={btnPrimary}>Save</button></div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

// ---------------------------------------------------------------- Monthly report
function MonthlyReport() {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [d, setD] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => { setD(null); setError(null); call('kpi', { month }).then(setD).catch(e => setError(e.message)); }, [month]);
    const rows = useMemo(() => !d ? [] : [
        ['Members (all time)', d.members], ['New members this month', d.newMembers], ['Job applications sent', d.applications], ['Jobs posted', d.jobsPosted], ['Jobs live now', d.jobsActive],
        ['Assessments completed', d.assessmentsCompleted], ['Assistant tasks', d.assistantTasks], ['Career Coach users (all time)', d.careerCoachUsers], ['New Career Coach users', d.careerCoachNew]
    ], [d]);
    if (error) return <Err error={error} />;
    if (!d) return <Spin />;
    const m = d.money;
    const print = () => printHtml(`Monthly report ${d.month}`, `<h1>ODUSBABA monthly report: ${esc(d.month)}</h1>
        <h2>Activity</h2><table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${v ?? '-'}</td></tr>`).join('')}</table>
        ${m ? `<h2>Money</h2><table><tr><td>Turnover after refunds</td><td class="n">${money(m.netTurnover)}</td></tr><tr><td>Costs incl. Stripe fees</td><td class="n">${money(m.totalCosts)}</td></tr><tr><td>Profit before tax</td><td class="n">${money(m.profit)}</td></tr></table>` : ''}
        ${d.tiers ? `<h2>Members by plan</h2><table>${Object.entries(d.tiers).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${v}</td></tr>`).join('')}</table>` : ''}
        ${d.pipeline ? `<h2>Employer pipeline</h2><table>${Object.entries(d.pipeline).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${v}</td></tr>`).join('')}</table>` : ''}`);
    const csv = () => downloadCsv(`monthly-report-${d.month}.csv`, ['Measure', 'Value'], [...rows, ...(m ? [['Turnover after refunds', m.netTurnover], ['Costs', m.totalCosts], ['Profit before tax', m.profit]] : [])]);
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <input type="month" className={`${input} !w-auto`} value={month} onChange={e => e.target.value && setMonth(e.target.value)} />
                <div className="flex-1" />
                <button className={btn} onClick={csv}><Download className="w-4 h-4" /> CSV</button>
                <button className={btnPrimary} onClick={print}><Printer className="w-4 h-4" /> Print or save as PDF</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{rows.map(([k, v]) => <Stat key={k} label={k} value={v ?? '-'} />)}</div>
            {m && <div className="grid grid-cols-3 gap-3"><Stat label="Turnover after refunds" value={money(m.netTurnover)} /><Stat label="Costs" value={money(m.totalCosts)} /><Stat label="Profit before tax" value={money(m.profit)} tone={m.profit < 0 ? 'bad' : undefined} /></div>}
            <div className="grid md:grid-cols-2 gap-3">
                {d.tiers && <div className={card}><div className="text-sm text-white mb-1">Members by plan</div>{Object.entries(d.tiers).map(([k, v]) => <div key={k} className="flex justify-between text-sm text-slate-300"><span>{k}</span><span>{v}</span></div>)}</div>}
                {d.pipeline && <div className={card}><div className="text-sm text-white mb-1">Employer pipeline</div>{Object.keys(d.pipeline).length === 0 ? <p className="text-xs text-slate-500">No leads yet.</p> : Object.entries(d.pipeline).map(([k, v]) => <div key={k} className="flex justify-between text-sm text-slate-300"><span>{k}</span><span>{v}</span></div>)}</div>}
            </div>
            <p className="text-xs text-slate-500">Counts come straight from the platform. A "-" means that figure could not be read. Use this for investor and partner updates.</p>
        </div>
    );
}

// ---------------------------------------------------------------- Page
export default function AdminFinance() {
    const [tab, setTab] = useState('Overview');
    const [info, setInfo] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => { call('settings-get').then(setInfo).catch(e => setError(e.message)); }, []);
    return (
        <div className="max-w-6xl mx-auto p-4 space-y-4">
            <div>
                <h1 className="text-xl font-semibold text-white">Finance & Compliance</h1>
                <p className="text-sm text-slate-400">Income and costs, tax-year pack, deadlines, data-protection registers and the monthly report. Drafts for you or your accountant to check. Nothing is filed for you.</p>
            </div>
            <Err error={error} />
            <div className="flex flex-wrap gap-2">
                {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm border ${tab === t ? 'bg-white/15 border-white/30 text-white' : 'border-slate-700 text-slate-300'}`}>{t}</button>)}
            </div>
            {!info ? (error ? null : <Spin />) : (
                <>
                    {tab === 'Overview' && <Overview settingsInfo={info} goTab={setTab} />}
                    {tab === 'Income & Costs' && <Ledger settingsInfo={info} />}
                    {tab === 'Tax Pack' && <TaxPack settingsInfo={info} />}
                    {tab === 'Compliance Calendar' && <Calendar />}
                    {tab === 'Data Protection' && <DataProtection />}
                    {tab === 'Monthly Report' && <MonthlyReport />}
                </>
            )}
        </div>
    );
}
