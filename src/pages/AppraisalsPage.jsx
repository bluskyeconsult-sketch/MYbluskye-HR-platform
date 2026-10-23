// src/pages/AppraisalsPage.jsx
// NEW (2026-10-23): "My appraisals" home. Shows what needs doing, lets an employer create an organisation,
// and handles the invitation link (/appraisals/join?token=...).
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { apiCall, STATUS_LABELS, ACTION_LABELS } from '../services/appraisalApi';
import { COUNTRIES } from '../components/ComplianceGate';
import { ClipboardCheck, Loader2, Building2, Plus, AlertTriangle } from 'lucide-react';

const input = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500';

export default function AppraisalsPage({ joinMode = false }) {
    const nav = useNavigate();
    const [params] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [signedIn, setSignedIn] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', country_code: '', show: false });
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setSignedIn(false); setLoading(false); return; }
        try {
            if (joinMode) {
                const token = params.get('token');
                if (token) { const r = await apiCall('appr-member-accept', { token }, { auth: 'required' }); nav(`/appraisals/org/${r.orgId}`, { replace: true }); return; }
            }
            setData(await apiCall('appr-my', {}, { auth: 'required' }));
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, [joinMode, params, nav]);
    useEffect(() => { load(); }, [load]);

    const createOrg = async () => {
        setBusy(true); setError('');
        try { const r = await apiCall('appr-org-create', { name: form.name, country_code: form.country_code }, { auth: 'required' }); nav(`/appraisals/org/${r.org.id}`); }
        catch (e) { setError(e.message); } finally { setBusy(false); }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /></div>;
    if (!signedIn) return (
        <div className="min-h-screen bg-slate-950 py-16 px-4"><div className="max-w-md mx-auto text-center text-slate-300">
            <ClipboardCheck className="w-10 h-10 text-primary-400 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white mb-2">Staff appraisals</h1>
            <p className="text-sm mb-4">Sign in with the email address your invitation was sent to.</p>
            <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="inline-block px-4 py-2 rounded-lg bg-primary-600 text-white text-sm">Sign in</Link></div></div>
    );

    const todo = (data?.appraisals || []).filter(a => a.action);
    const rest = (data?.appraisals || []).filter(a => !a.action);
    const orgs = (data?.memberships || []).filter(m => m.status === 'active');
    const Row = ({ a }) => (
        <Link to={`/appraisals/${a.id}`} className="block bg-slate-900 border border-slate-700 hover:border-primary-500 rounded-xl p-4">
            <div className="flex flex-wrap justify-between gap-2"><div className="text-white font-medium">{a.roles.includes('employee') && !a.roles.includes('supervisor') ? 'My appraisal' : `Appraisal: ${a.employee || 'Employee'}`}</div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">{STATUS_LABELS[a.status] || a.status}</span></div>
            <div className="text-xs text-slate-400 mt-1">Your role: {a.roles.join(', ')}{a.due ? ` | due ${a.due}` : ''}</div>
            {a.action && <div className="text-sm text-primary-300 mt-2">{ACTION_LABELS[a.action]}</div>}
            {a.disagreement && <div className="text-xs text-amber-300 mt-1">Disagreement recorded</div>}
        </Link>);

    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4"><div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6"><ClipboardCheck className="w-7 h-7 text-primary-400" /><h1 className="text-2xl font-bold text-white">Staff appraisals</h1></div>
            {error && <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" />{error}</div>}
            {data && !data.encryption_ready && <div className="mb-4 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">Appraisals are not switched on yet. The site owner must add the encryption key first.</div>}

            {(data?.appraisals || []).some(a => a.roles.includes('employee')) && <Link to="/appraisals/progress" className="inline-flex items-center gap-1 text-sm text-primary-400 hover:underline mb-4">View my progress and charts</Link>}

            <h2 className="text-white font-semibold mb-2">Needs your attention</h2>
            <div className="space-y-3 mb-8">{todo.length ? todo.map(a => <Row key={a.id} a={a} />) : <p className="text-sm text-slate-400">Nothing waiting for you.</p>}</div>
            {rest.length > 0 && <><h2 className="text-white font-semibold mb-2">All appraisals</h2><div className="space-y-3 mb-8">{rest.map(a => <Row key={a.id} a={a} />)}</div></>}

            <h2 className="text-white font-semibold mb-2">Organisations</h2>
            <div className="space-y-3 mb-4">{orgs.map(m => (
                <div key={m.member_id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3"><Building2 className="w-5 h-5 text-slate-400" /><div><div className="text-white">{m.org?.name}</div><div className="text-xs text-slate-400">{m.role} | {m.org?.country_code}</div></div></div>
                    {['owner', 'hr_admin'].includes(m.role) && <Link to={`/appraisals/org/${m.org.id}`} className="text-sm text-primary-400 hover:underline">Manage</Link>}
                </div>))}</div>
            {!form.show ? <button onClick={() => setForm({ ...form, show: true })} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm"><Plus className="w-4 h-4" />Set up appraisals for my organisation</button> : (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
                    <p className="text-sm text-slate-300">Run appraisals for up to 25 people with no subscription (your first appraisal is free, then you pay per appraisal), or get them included with the Employer plan (up to 50 people, plus job posting and fuller reports) or the Business plan (up to 100). Choose the country where your staff work, because that decides the legal steps.</p>
                    <input className={input} placeholder="Organisation name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <select className={input} value={form.country_code} onChange={e => setForm({ ...form, country_code: e.target.value })}><option value="">Country where staff work</option>{COUNTRIES.filter(c => c[0] !== 'OTHER').map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}<option value="XX" disabled>Other countries: contact us</option></select>
                    <button disabled={busy || form.name.length < 2 || !form.country_code} onClick={createOrg} className="px-4 py-2 rounded-lg bg-primary-600 disabled:opacity-40 text-white text-sm">{busy ? 'Creating...' : 'Create'}</button>
                </div>)}
        </div></div>
    );
}
