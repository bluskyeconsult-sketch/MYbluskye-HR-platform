// src/pages/admin/AdminComplianceRules.jsx
// NEW (2026-10-23): admin screen for the country rules, clearance requests and the decision log.
// Changing the wording of a rule raises its version, which asks every organisation to confirm again.
import { useState, useEffect, useCallback } from 'react';
import { apiCall, SERVICE_LABELS } from '../../services/appraisalApi';
import { Loader2, Save, Check, X, ShieldCheck } from 'lucide-react';

const STATUSES = ['open', 'conditional', 'clearance_required', 'blocked'];
const input = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500';

export default function AdminComplianceRules() {
    const [d, setD] = useState(null);
    const [tab, setTab] = useState('clearances');
    const [edit, setEdit] = useState(null);
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);
    const [filter, setFilter] = useState('');
    const load = useCallback(async () => { try { setD(await apiCall('admin-compliance-overview', {}, { auth: 'required' })); } catch (e) { setMsg(e.message); } }, []);
    useEffect(() => { load(); }, [load]);
    if (!d) return <div className="p-10 flex justify-center">{msg ? <p className="text-red-300">{msg}</p> : <Loader2 className="w-6 h-6 animate-spin text-primary-400" />}</div>;

    const decide = async (id, decision) => {
        const note = decision === 'approve' ? '' : (window.prompt('Reason (shown to the requester):') || '');
        setBusy(true); try { await apiCall('admin-compliance-decide', { id, decision, note }, { auth: 'required' }); await load(); } catch (e) { setMsg(e.message); } finally { setBusy(false); }
    };
    const save = async () => {
        setBusy(true); setMsg('');
        try { const r = await apiCall('admin-compliance-save-rule', { ...edit, checklist: JSON.parse(edit._checklistText || '[]'), reference_links: JSON.parse(edit._linksText || '[]') }, { auth: 'required' }); setMsg(`Saved (version ${r.rule_version}).`); setEdit(null); await load(); }
        catch (e) { setMsg(e.message.includes('JSON') ? 'The checklist or links are not valid JSON.' : e.message); } finally { setBusy(false); }
    };
    const pending = (d.clearances || []).filter(c => c.status === 'pending');
    const rules = (d.rules || []).filter(r => !filter || r.country_code.toLowerCase().includes(filter.toLowerCase()) || r.service_key.includes(filter.toLowerCase()));
    const openEdit = (r) => setEdit({ ...r, _checklistText: JSON.stringify(r.checklist || [], null, 2), _linksText: JSON.stringify(r.reference_links || [], null, 2) });

    return (
        <div className="p-6 max-w-6xl mx-auto text-slate-200">
            <div className="flex items-center gap-3 mb-4"><ShieldCheck className="w-7 h-7 text-primary-400" /><h1 className="text-2xl font-bold text-white">Compliance Rules</h1></div>
            <p className="text-sm text-slate-400 mb-4">Decides, per country and service, whether a service is open, open after confirmations, open after you approve evidence, or blocked. The default for a country not listed is the "*" row.</p>
            {msg && <div className="mb-3 text-sm bg-slate-800 border border-slate-700 rounded-lg p-3">{msg}</div>}
            <div className="flex gap-2 mb-4">{[['clearances', `Clearance requests (${pending.length})`], ['rules', `Rules (${d.rules.length})`], ['log', 'Decision log']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === k ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{l}</button>)}</div>

            {tab === 'clearances' && (d.clearances.length === 0 ? <p className="text-slate-400 text-sm">No requests yet.</p> : d.clearances.map(c => (
                <div key={c.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-3">
                    <div className="flex flex-wrap justify-between gap-2"><div><b className="text-white">{SERVICE_LABELS[c.service_key] || c.service_key}</b> in <b>{c.country_code}</b> <span className="text-xs text-slate-500">(rule v{c.rule_version})</span></div><span className="text-xs px-2 py-1 rounded-full bg-slate-800">{c.status}</span></div>
                    <p className="text-sm mt-2 whitespace-pre-line">{c.evidence_note || <i className="text-slate-500">No note</i>}</p>
                    {c.evidence_url && <a className="text-primary-400 text-sm underline" href={c.evidence_url} target="_blank" rel="noopener noreferrer">Evidence link</a>}
                    <p className="text-xs text-slate-500 mt-1">Requested {new Date(c.created_at).toLocaleString()}{c.expires_at ? ` | expires ${new Date(c.expires_at).toLocaleDateString()}` : ''}</p>
                    <div className="flex gap-2 mt-3">
                        {c.status === 'pending' && <><button disabled={busy} onClick={() => decide(c.id, 'approve')} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm inline-flex items-center gap-1"><Check className="w-4 h-4" />Approve (12 months)</button>
                            <button disabled={busy} onClick={() => decide(c.id, 'reject')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm inline-flex items-center gap-1"><X className="w-4 h-4" />Reject</button></>}
                        {c.status === 'approved' && <button disabled={busy} onClick={() => decide(c.id, 'revoke')} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-sm">Revoke</button>}
                    </div>
                </div>)))}

            {tab === 'rules' && !edit && (<>
                <div className="flex gap-2 mb-3"><input className={input + ' max-w-xs'} placeholder="Filter by country or service" value={filter} onChange={e => setFilter(e.target.value)} />
                    <button onClick={() => openEdit({ country_code: '', service_key: 'appraisal', status: 'conditional', title: '', requirement_text: '', checklist: [], reference_links: [], retention_years_default: 6, is_active: true })} className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm">New rule</button></div>
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Country</th><th>Service</th><th>Status</th><th>Version</th><th>Last reviewed</th><th></th></tr></thead>
                    <tbody>{rules.map(r => <tr key={r.id} className="border-t border-slate-800"><td className="p-2 font-mono">{r.country_code}</td><td>{SERVICE_LABELS[r.service_key] || r.service_key}</td><td>{r.status}{!r.is_active && ' (off)'}</td><td>v{r.rule_version}</td><td>{r.last_reviewed || '-'}</td><td><button className="text-primary-400 hover:underline" onClick={() => openEdit(r)}>Edit</button></td></tr>)}</tbody></table></div></>)}

            {tab === 'rules' && edit && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div><label className="text-xs text-slate-400">Country code (or *)</label><input className={input} value={edit.country_code} onChange={e => setEdit({ ...edit, country_code: e.target.value.toUpperCase() })} maxLength={2} /></div>
                        <div><label className="text-xs text-slate-400">Service</label><select className={input} value={edit.service_key} onChange={e => setEdit({ ...edit, service_key: e.target.value })}>{Object.keys(SERVICE_LABELS).map(k => <option key={k} value={k}>{SERVICE_LABELS[k]}</option>)}</select></div>
                        <div><label className="text-xs text-slate-400">Status</label><select className={input} value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                    </div>
                    <div><label className="text-xs text-slate-400">Title</label><input className={input} value={edit.title || ''} onChange={e => setEdit({ ...edit, title: e.target.value })} /></div>
                    <div><label className="text-xs text-slate-400">What the user must know or do (plain English)</label><textarea rows={5} className={input} value={edit.requirement_text || ''} onChange={e => setEdit({ ...edit, requirement_text: e.target.value })} /></div>
                    <div><label className="text-xs text-slate-400">Checklist (JSON: key, text, optional evidence_required)</label><textarea rows={6} className={input + ' font-mono text-xs'} value={edit._checklistText} onChange={e => setEdit({ ...edit, _checklistText: e.target.value })} /></div>
                    <div><label className="text-xs text-slate-400">Reference links (JSON: label, url)</label><textarea rows={3} className={input + ' font-mono text-xs'} value={edit._linksText} onChange={e => setEdit({ ...edit, _linksText: e.target.value })} /></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div><label className="text-xs text-slate-400">Default retention (years)</label><input type="number" className={input} value={edit.retention_years_default || ''} onChange={e => setEdit({ ...edit, retention_years_default: e.target.value })} /></div>
                        <div><label className="text-xs text-slate-400">Last reviewed</label><input type="date" className={input} value={edit.last_reviewed || ''} onChange={e => setEdit({ ...edit, last_reviewed: e.target.value })} /></div>
                        <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={edit.is_active !== false} onChange={e => setEdit({ ...edit, is_active: e.target.checked })} />Active</label>
                    </div>
                    <div><label className="text-xs text-slate-400">Verification note (what a solicitor should confirm)</label><textarea rows={2} className={input} value={edit.verify_note || ''} onChange={e => setEdit({ ...edit, verify_note: e.target.value })} /></div>
                    <p className="text-xs text-amber-300">Changing the wording or checklist raises the version, so every organisation is asked to confirm again.</p>
                    <div className="flex gap-2"><button disabled={busy} onClick={save} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm inline-flex items-center gap-1"><Save className="w-4 h-4" />Save</button><button onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm">Cancel</button></div>
                </div>)}

            {tab === 'log' && (<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">When</th><th>Service</th><th>Country</th><th>Network</th><th>Decision</th><th>Reason</th></tr></thead>
                <tbody>{d.log.map(l => <tr key={l.id} className="border-t border-slate-800"><td className="p-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td><td>{l.service_key}</td><td>{l.country_code || '-'}</td><td>{l.ip_country || '-'}</td><td>{l.decision}</td><td className="text-slate-400">{l.reason || ''}</td></tr>)}</tbody></table>
                <p className="text-xs text-slate-500 mt-2">The log keeps country codes only. No IP addresses are stored.</p></div>)}
        </div>
    );
}
