// src/pages/admin/AdminGeoPricing.jsx
// NEW (2026-10-23): regional pricing for the individual plan (Professional) only.
// Employer and Business prices are not affected by anything on this page.
import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '../../services/appraisalApi';
import { Loader2, Globe2, AlertTriangle } from 'lucide-react';

const input = 'bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500';
const priceFor = (base, m, floor) => (m >= 1 ? base : Math.max(floor, Math.round(base * m) - 0.01));

export default function AdminGeoPricing() {
    const [d, setD] = useState(null);
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);
    const [cc, setCc] = useState({ country_code: '', band_key: 'B' });
    const [filter, setFilter] = useState('');
    const load = useCallback(async () => { try { setD(await apiCall('admin-geo-pricing-overview', {}, { auth: 'required' })); } catch (e) { setMsg(e.message); } }, []);
    useEffect(() => { load(); }, [load]);
    const run = async (action, body, ok) => { setBusy(true); setMsg(''); try { await apiCall(action, body, { auth: 'required' }); if (ok) setMsg(ok); await load(); } catch (e) { setMsg(e.message); } finally { setBusy(false); } };
    if (!d) return <div className="p-10 flex justify-center">{msg ? <p className="text-red-300">{msg}</p> : <Loader2 className="w-6 h-6 animate-spin text-primary-400" />}</div>;
    const openFlags = d.flags.filter(f => f.status === 'open');
    const anyStripe = Object.values(d.stripe_ready).some(Boolean);
    const countries = d.countries.filter(c => !filter || c.country_code.includes(filter.toUpperCase()) || c.band_key === filter.toUpperCase());

    return (
        <div className="p-6 max-w-5xl mx-auto text-slate-200">
            <div className="flex items-center gap-3 mb-2"><Globe2 className="w-7 h-7 text-primary-400" /><h1 className="text-2xl font-bold text-white">Regional pricing</h1></div>
            <p className="text-sm text-slate-400 mb-4">Applies to the Professional (individual) plan only. Employer and Business always pay the standard price. A country not listed here, every EU/EEA country, the UK, Switzerland and high-income economies pay the standard price.</p>
            {msg && <div className="mb-3 text-sm bg-slate-800 border border-slate-700 rounded-lg p-3">{msg}</div>}

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><b className="text-white">Regional pricing is {d.enabled ? 'ON' : 'OFF'}</b><div className="text-xs text-slate-400">Turn it on only after the Stripe prices for each band exist (see the table).</div></div>
                    <button disabled={busy || (!d.enabled && !anyStripe)} onClick={() => run('admin-geo-pricing-settings', { enabled: !d.enabled }, d.enabled ? 'Switched off.' : 'Switched on.')} className={`px-4 py-2 rounded-lg text-sm text-white disabled:opacity-40 ${d.enabled ? 'bg-red-600' : 'bg-emerald-600'}`}>{d.enabled ? 'Switch off' : 'Switch on'}</button>
                </div>
                {!d.enabled && !anyStripe && <p className="text-xs text-amber-300 mt-2">No regional Stripe price is set up yet, so the switch is locked.</p>}
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-4 overflow-x-auto">
                <h2 className="text-white font-semibold mb-3">Bands (standard price ${d.base})</h2>
                <table className="w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Band</th><th>Multiplier</th><th>Monthly price</th><th>Stripe price</th></tr></thead>
                    <tbody>{d.bands.map(b => (<tr key={b.band_key} className="border-t border-slate-800"><td className="p-2">{b.band_key}: {b.label}</td>
                        <td>{b.band_key === 'A' ? '1.00' : <input type="number" step="0.05" min="0.2" max="1" defaultValue={b.multiplier} onBlur={e => run('admin-geo-pricing-settings', { band_key: b.band_key, multiplier: e.target.value }, 'Saved.')} className={input + ' w-24'} />}</td>
                        <td>${priceFor(d.base, Number(b.multiplier), d.floor).toFixed(2)}</td>
                        <td>{b.band_key === 'A' ? 'Existing price' : d.stripe_ready[b.band_key] ? <span className="text-emerald-300">Ready</span> : <span className="text-amber-300">Create STRIPE_PRICE_PROFESSIONAL_{b.band_key}</span>}</td></tr>))}</tbody></table>
                <div className="mt-3 flex items-center gap-2 text-sm"><label className="text-slate-400">Price floor (USD)</label><input type="number" step="0.5" defaultValue={d.floor} onBlur={e => run('admin-geo-pricing-settings', { floor: e.target.value }, 'Saved.')} className={input + ' w-24'} /></div>
                <p className="text-xs text-slate-500 mt-2">If you change a multiplier, create a new Stripe price for that band at the new amount and update its Vercel variable. The Stripe price is what customers are actually charged.</p>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-4">
                <h2 className="text-white font-semibold mb-3 inline-flex items-center gap-2">Billing mismatches {openFlags.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{openFlags.length} open</span>}</h2>
                {d.flags.length === 0 ? <p className="text-sm text-slate-400">None. A mismatch means someone got a discounted price but their billing country is in a higher-priced band.</p> : d.flags.map(f => (
                    <div key={f.id} className="border-t border-slate-800 py-3 text-sm flex flex-wrap justify-between gap-2">
                        <div><AlertTriangle className="inline w-4 h-4 text-amber-400 mr-1" />{f.reason}<div className="text-xs text-slate-500">{new Date(f.created_at).toLocaleString()} | user {f.user_id?.slice(0, 8)} | Stripe {f.stripe_session_id?.slice(0, 14)}</div></div>
                        {f.status === 'open' ? <button disabled={busy} onClick={() => run('admin-geo-pricing-resolve-flag', { id: f.id, note: window.prompt('Note (what you did):') || '' }, 'Marked reviewed.')} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs">Mark reviewed</button> : <span className="text-xs text-slate-500">Reviewed</span>}</div>))}
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <h2 className="text-white font-semibold mb-3">Countries ({d.countries.length})</h2>
                <div className="flex flex-wrap gap-2 mb-3"><input className={input} placeholder="Filter (country or band)" value={filter} onChange={e => setFilter(e.target.value)} />
                    <input className={input + ' w-24'} placeholder="Code" maxLength={2} value={cc.country_code} onChange={e => setCc({ ...cc, country_code: e.target.value.toUpperCase() })} />
                    <select className={input} value={cc.band_key} onChange={e => setCc({ ...cc, band_key: e.target.value })}>{d.bands.map(b => <option key={b.band_key} value={b.band_key}>{b.band_key === 'A' ? 'A: standard (removes the country)' : b.label}</option>)}</select>
                    <button disabled={busy || cc.country_code.length !== 2} onClick={() => run('admin-geo-pricing-set-country', cc, 'Saved.')} className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm disabled:opacity-40">Set</button></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 text-sm">{countries.map(c => <div key={c.country_code} className="flex justify-between border-t border-slate-800 py-1"><span className="font-mono">{c.country_code}</span><span>{c.band_key} <span className="text-slate-500">({c.price_level_ratio ?? '-'})</span></span></div>)}</div>
                <p className="text-xs text-slate-500 mt-3">Band follows the World Bank price level ratio (2024). Please do not add EU, EEA, UK or Swiss countries without legal advice.</p>
            </div>
        </div>
    );
}
