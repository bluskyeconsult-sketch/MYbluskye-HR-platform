// src/pages/CountryRulesPage.jsx
// NEW (2026-10-23): public page. Shows what each ODUSBABA service needs in a country, so nobody is surprised.
import { useState, useEffect } from 'react';
import { apiCall, SERVICE_LABELS } from '../services/appraisalApi';
import { COUNTRIES, countryName } from '../components/ComplianceGate';
import { Loader2, Globe } from 'lucide-react';

const BADGE = { allowed: ['Available', 'bg-emerald-500/15 text-emerald-300'], conditions_needed: ['Available after you confirm a few things', 'bg-sky-500/15 text-sky-300'], clearance_needed: ['Needs clearance first', 'bg-amber-500/15 text-amber-300'], pending_review: ['Clearance under review', 'bg-amber-500/15 text-amber-300'], blocked: ['Not available', 'bg-red-500/15 text-red-300'] };

export default function CountryRulesPage() {
    const [country, setCountry] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        apiCall('compliance-check', { country: country || undefined }).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
    }, [country]);
    const shown = country || data?.declared_country || data?.ip_country || '';
    return (
        <div className="min-h-screen bg-slate-950 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-2"><Globe className="w-7 h-7 text-primary-400" /><h1 className="text-2xl font-bold text-white">Rules by country</h1></div>
                <p className="text-slate-300 text-sm mb-6">Employment, privacy and sanctions laws differ from country to country. Here is what each ODUSBABA service needs where you are. This is general information, not legal advice.</p>
                <label className="text-xs text-slate-400">Country</label>
                <select className="block mt-1 mb-6 w-full max-w-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" value={shown} onChange={e => setCountry(e.target.value)}>
                    <option value="">Choose...</option>{COUNTRIES.filter(c => c[0] !== 'OTHER').map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}
                </select>
                {loading ? <Loader2 className="w-6 h-6 text-primary-400 animate-spin" /> : (data?.results || []).map(r => {
                    const b = BADGE[r.decision] || BADGE.allowed;
                    return (<div key={r.service} className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-3">
                        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-white font-semibold">{SERVICE_LABELS[r.service] || r.service}</h2><span className={`text-xs px-2 py-1 rounded-full ${b[1]}`}>{b[0]}</span></div>
                        {r.requirement_text && <p className="text-slate-300 text-sm mt-2 whitespace-pre-line">{r.requirement_text}</p>}
                        {(r.checklist || []).length > 0 && <ul className="list-disc ml-5 mt-2 text-sm text-slate-400 space-y-1">{r.checklist.map(i => <li key={i.key}>{i.text}</li>)}</ul>}
                    </div>);
                })}
                {shown && <p className="text-xs text-slate-500 mt-4">Showing rules for {countryName(shown)}. Rules are reviewed regularly; each shows when it was last checked inside the service.</p>}
            </div>
        </div>
    );
}
