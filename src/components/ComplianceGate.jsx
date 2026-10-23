// src/components/ComplianceGate.jsx
// NEW (2026-10-23): shows what a service needs in the visitor's country and lets them meet it.
//   <ComplianceGate service="appraisal" orgId={id} canAct={isHr}>...the service...</ComplianceGate>
// The server enforces the same rules on every request. This component only explains them and collects
// the confirmations or evidence; hiding it would not unlock anything.
// <ComplianceBanner /> is a slim, site-wide notice for visitors in places where a service is restricted.
import { useEffect, useState, useCallback } from 'react';
import { apiCall, SERVICE_LABELS } from '../services/appraisalApi';
import { ShieldCheck, ShieldAlert, Loader2, Ban, Clock, ExternalLink, Globe } from 'lucide-react';

export const COUNTRIES = [['GB', 'United Kingdom'], ['IE', 'Ireland'], ['US', 'United States'], ['CA', 'Canada'], ['AU', 'Australia'], ['NZ', 'New Zealand'], ['ZA', 'South Africa'], ['NG', 'Nigeria'], ['DE', 'Germany'], ['FR', 'France'], ['AE', 'United Arab Emirates'], ['OTHER', 'Another country']];
export const countryName = (c) => (COUNTRIES.find(x => x[0] === c) || [null, c])[1] || c;

export function useCompliance(service, orgId, country) {
    const [state, setState] = useState({ loading: true, result: null, error: '' });
    const load = useCallback(async () => {
        setState(s => ({ ...s, loading: true }));
        try {
            const r = await apiCall('compliance-check', { services: [service], orgId: orgId || undefined, country: country || undefined });
            setState({ loading: false, result: r.results?.[0] || null, meta: r, error: '' });
        } catch (e) { setState({ loading: false, result: null, error: e.message }); }
    }, [service, orgId, country]);
    useEffect(() => { load(); }, [load]);
    return { ...state, reload: load };
}

export default function ComplianceGate({ service, orgId, canAct = true, children, onCleared }) {
    const [country, setCountry] = useState('');
    const { loading, result, meta, error, reload } = useCompliance(service, orgId, country);
    const [ticks, setTicks] = useState({});
    const [note, setNote] = useState('');
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    useEffect(() => { if (result?.decision === 'allowed') onCleared?.(); }, [result?.decision]); // eslint-disable-line

    if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>;
    if (error) return <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</div>;
    if (!result || result.decision === 'allowed') return <>{children}</>;

    const list = result.checklist || [];
    const allTicked = list.every(i => ticks[i.key]);
    const needsEvidence = list.some(i => i.evidence_required);
    const submit = async (kind) => {
        setBusy(true); setErr('');
        try {
            const items = list.filter(i => ticks[i.key]).map(i => i.key);
            if (kind === 'ack') await apiCall('compliance-acknowledge', { service, orgId, items }, { auth: 'required' });
            else await apiCall('compliance-request-clearance', { service, orgId, items, note, url }, { auth: 'required' });
            await reload();
        } catch (e) { setErr(e.message); } finally { setBusy(false); }
    };
    const box = 'bg-slate-900 border border-slate-700 rounded-2xl p-6';
    const input = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500';

    if (result.decision === 'blocked') return (
        <div className={box}><div className="flex items-start gap-3"><Ban className="w-6 h-6 text-red-400 shrink-0 mt-1" />
            <div><h3 className="text-white font-semibold">{result.title || 'Not available in your location'}</h3>
                <p className="text-slate-300 text-sm mt-2">{result.requirement_text || 'This service is not available for your location.'}</p>
                <p className="text-slate-400 text-xs mt-3">If you think this is a mistake, email privacy@bluskyeconsult.com.</p></div></div></div>
    );

    if (result.needs_country) return (
        <div className={box}><div className="flex items-start gap-3"><Globe className="w-6 h-6 text-primary-400 shrink-0 mt-1" />
            <div className="flex-1"><h3 className="text-white font-semibold">Where do you work?</h3>
                <p className="text-slate-300 text-sm mt-2">The rules for {SERVICE_LABELS[service] || 'this service'} depend on the country. We could not work it out from your connection.</p>
                <select className={input + ' mt-3'} value={country} onChange={e => setCountry(e.target.value === 'OTHER' ? '' : e.target.value)}>
                    <option value="">Choose a country</option>{COUNTRIES.filter(c => c[0] !== 'OTHER').map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}
                </select></div></div></div>
    );

    if (result.decision === 'pending_review') return (
        <div className={box}><div className="flex items-start gap-3"><Clock className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
            <div><h3 className="text-white font-semibold">Your request is being reviewed</h3>
                <p className="text-slate-300 text-sm mt-2">An administrator is checking your evidence for {countryName(result.country)}. We will email you when it is decided. You do not need to do anything else.</p></div></div></div>
    );

    const isClearance = result.decision === 'clearance_needed';
    return (
        <div className={box}>
            <div className="flex items-start gap-3">
                {isClearance ? <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-1" /> : <ShieldCheck className="w-6 h-6 text-primary-400 shrink-0 mt-1" />}
                <div className="flex-1">
                    <h3 className="text-white font-semibold">{result.title || `${SERVICE_LABELS[service]} in ${countryName(result.country)}`}</h3>
                    <p className="text-xs text-slate-400 mt-1">Country: {countryName(result.country)}{result.mismatch ? ` (your connection appears to be in ${countryName(result.ip_country)}; the rules follow where the work is done)` : ''}</p>
                    {result.clearance?.rejected && <p className="text-sm text-red-300 mt-3">Your last request was not approved{result.clearance.decision_note ? `: ${result.clearance.decision_note}` : '.'} You can send a new request with more information.</p>}
                    <p className="text-slate-300 text-sm mt-3 whitespace-pre-line">{result.requirement_text}</p>
                    {!canAct ? (
                        <p className="text-sm text-amber-300 mt-4">Your organisation's owner or HR admin needs to complete this before the service can be used. Please ask them.</p>
                    ) : (<>
                        <div className="mt-4 space-y-2">{list.map(i => (
                            <label key={i.key} className="flex gap-2 text-sm text-slate-200 items-start"><input type="checkbox" className="mt-1" checked={!!ticks[i.key]} onChange={e => setTicks(t => ({ ...t, [i.key]: e.target.checked }))} /><span>{i.text}</span></label>))}</div>
                        {isClearance && (<div className="mt-4 space-y-2">
                            <label className="text-xs text-slate-400">{needsEvidence ? 'Describe your evidence (for example the agreement reference and date)' : 'Anything you want the reviewer to know'}</label>
                            <textarea className={input} rows={3} value={note} onChange={e => setNote(e.target.value)} maxLength={4000} />
                            <input className={input} placeholder="Optional link to a document (https://...)" value={url} onChange={e => setUrl(e.target.value)} />
                        </div>)}
                        {err && <p className="text-sm text-red-300 mt-3">{err}</p>}
                        <button disabled={!allTicked || busy} onClick={() => submit(isClearance ? 'clear' : 'ack')} className="mt-4 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-sm font-medium">
                            {busy ? 'Saving...' : isClearance ? 'Send for review' : 'Confirm and continue'}</button>
                    </>)}
                    {(result.reference_links || []).length > 0 && <div className="mt-4 text-xs text-slate-400">Sources: {(result.reference_links || []).map(l => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-400 hover:underline mr-3">{l.label}<ExternalLink className="w-3 h-3" /></a>)}</div>}
                </div>
            </div>
        </div>
    );
}

// Slim notice for the whole site. Shows only where paid or AI services are restricted for the visitor's location.
export function ComplianceBanner() {
    const [msg, setMsg] = useState(null);
    useEffect(() => {
        let off = false;
        try { if (sessionStorage.getItem('compliance_banner_closed') === '1') return; } catch { /* ignore */ }
        apiCall('compliance-check', { services: ['paid_services', 'ai_services'] }, { auth: true }).then(r => {
            if (off) return;
            const bad = (r.results || []).find(x => x.decision === 'blocked' || x.decision === 'clearance_needed');
            if (bad) setMsg({ blocked: bad.decision === 'blocked', text: bad.decision === 'blocked' ? 'Some paid and AI services are not available in your location.' : `Some services need clearance before use in ${countryName(bad.country)}.` });
        }).catch(() => {});
        return () => { off = true; };
    }, []);
    if (!msg) return null;
    return (
        <div className={`text-xs text-center px-4 py-2 ${msg.blocked ? 'bg-red-900/60 text-red-100' : 'bg-amber-900/50 text-amber-100'}`}>
            {msg.text} <a href="/country-rules" className="underline">See the rules for your country</a>
            <button className="ml-3 opacity-70 hover:opacity-100" onClick={() => { try { sessionStorage.setItem('compliance_banner_closed', '1'); } catch { /* ignore */ } setMsg(null); }}>Close</button>
        </div>
    );
}
