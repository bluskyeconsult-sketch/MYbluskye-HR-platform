// src/pages/AppraisalOrgPage.jsx
// NEW (2026-10-23): organisation admin for owners and HR admins. Metadata only: this page never shows appraisal text.
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiCall, STATUS_LABELS } from '../services/appraisalApi';
import ComplianceGate from '../components/ComplianceGate';
import { Loader2, UserPlus, Users, CalendarPlus, Settings, UserMinus } from 'lucide-react';

const input = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500';
const nm = (m) => m?.full_name || m?.email?.split('@')[0] || 'Unknown';

export default function AppraisalOrgPage() {
    const { orgId } = useParams();
    const [d, setD] = useState(null);
    const [err, setErr] = useState(''); const [ok, setOk] = useState('');
    const [busy, setBusy] = useState(false);
    const [inv, setInv] = useState({ email: '', full_name: '', job_title: '', role: 'member', supervisor_member_id: '' });
    const [cyc, setCyc] = useState({ name: '', template_id: '' });
    const [tab, setTab] = useState('people');

    const load = useCallback(async () => { try { setD(await apiCall('appr-org-get', { orgId }, { auth: 'required' })); } catch (e) { setErr(e.message); } }, [orgId]);
    useEffect(() => { load(); }, [load]);
    const run = async (fn, done) => { setBusy(true); setErr(''); setOk(''); try { await fn(); if (done) setOk(done); await load(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };

    if (!d) return <div className="min-h-screen bg-slate-950 flex items-center justify-center">{err ? <p className="text-red-300">{err}</p> : <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />}</div>;
    const isHr = ['owner', 'hr_admin'].includes(d.me.role);
    const byId = Object.fromEntries(d.members.map(m => [m.id, m]));
    const active = d.members.filter(m => m.status === 'active');
    const needReassign = (d.appraisals || []).filter(a => a.needs_reassignment);
    if (!isHr) return <div className="min-h-screen bg-slate-950 p-10 text-slate-300">Only the owner or HR admins can manage the organisation. <Link className="text-primary-400 underline" to="/appraisals">Back</Link></div>;

    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4"><div className="max-w-5xl mx-auto">
            <Link to="/appraisals" className="text-sm text-slate-400 hover:text-white">&larr; My appraisals</Link>
            <h1 className="text-2xl font-bold text-white mt-2 mb-1">{d.org.name}</h1>
            <p className="text-xs text-slate-400 mb-4">Workplace country: {d.org.country_code} | Records kept {d.org.retention_years} years after filing</p>
            {err && <div className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{err}</div>}
            {ok && <div className="mb-3 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">{ok}</div>}

            <ComplianceGate service="appraisal" orgId={orgId} canAct={isHr}>
                {needReassign.length > 0 && <div className="mb-4 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">{needReassign.length} appraisal(s) need a new supervisor because the supervisor left. Open each and choose one.</div>}
                <div className="flex gap-2 mb-4">{[['people', 'People', Users], ['rounds', 'Appraisal rounds', CalendarPlus], ['settings', 'Settings', Settings]].map(([k, l, I]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-1 ${tab === k ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300'}`}><I className="w-4 h-4" />{l}</button>)}</div>

                {tab === 'people' && (<>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4">
                        <h3 className="text-white font-medium mb-3 inline-flex items-center gap-1"><UserPlus className="w-4 h-4" />Invite a person</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input className={input} placeholder="Email" value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} />
                            <input className={input} placeholder="Full name" value={inv.full_name} onChange={e => setInv({ ...inv, full_name: e.target.value })} />
                            <input className={input} placeholder="Job title" value={inv.job_title} onChange={e => setInv({ ...inv, job_title: e.target.value })} />
                            <select className={input} value={inv.role} onChange={e => setInv({ ...inv, role: e.target.value })}><option value="member">Staff member</option><option value="approver">Approver</option>{d.me.role === 'owner' && <option value="hr_admin">HR admin</option>}</select>
                            <select className={input} value={inv.supervisor_member_id} onChange={e => setInv({ ...inv, supervisor_member_id: e.target.value })}><option value="">Supervisor (choose)</option>{active.map(m => <option key={m.id} value={m.id}>{nm(m)}</option>)}</select>
                            <button disabled={busy || !inv.email} onClick={() => run(async () => { await apiCall('appr-member-invite', { orgId, ...inv }, { auth: 'required' }); setInv({ email: '', full_name: '', job_title: '', role: 'member', supervisor_member_id: '' }); }, 'Invitation sent.')} className="px-4 py-2 rounded-lg bg-primary-600 disabled:opacity-40 text-white text-sm">Send invitation</button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Each person has one accountable supervisor. Up to three colleagues can be asked for input on any appraisal.</p>
                    </div>
                    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Name</th><th>Role</th><th>Supervisor</th><th>Status</th><th></th></tr></thead>
                        <tbody>{d.members.map(m => <tr key={m.id} className="border-t border-slate-800 text-slate-200"><td className="p-2">{nm(m)}<div className="text-xs text-slate-500">{m.email}</div></td><td>{m.role}</td>
                            <td>{m.status === 'left' ? '-' : <select className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" value={m.supervisor_member_id || ''} onChange={e => run(() => apiCall('appr-member-update', { orgId, memberId: m.id, supervisor_member_id: e.target.value || null }, { auth: 'required' }), 'Saved.')}><option value="">None</option>{active.filter(x => x.id !== m.id).map(x => <option key={x.id} value={x.id}>{nm(x)}</option>)}</select>}</td>
                            <td>{m.status}</td><td>{m.status !== 'left' && m.role !== 'owner' && <button title="Mark as left" onClick={() => window.confirm(`Mark ${nm(m)} as left? Their open appraisals will be closed and kept on record.`) && run(() => apiCall('appr-member-leave', { orgId, memberId: m.id }, { auth: 'required' }), 'Updated.')} className="text-red-300 hover:text-red-200"><UserMinus className="w-4 h-4" /></button>}</td></tr>)}</tbody></table></div></>)}

                {tab === 'rounds' && (<>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4">
                        <h3 className="text-white font-medium mb-3">Start an appraisal round</h3>
                        <p className="text-xs text-slate-400 mb-3">Everyone with a supervisor gets an appraisal. Each person is told by email (link only; appraisal text is never emailed).</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input className={input} placeholder="Name, e.g. Annual review 2026" value={cyc.name} onChange={e => setCyc({ ...cyc, name: e.target.value })} />
                            <select className={input} value={cyc.template_id} onChange={e => setCyc({ ...cyc, template_id: e.target.value })}><option value="">Standard template</option>{d.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                            <button disabled={busy || !cyc.name} onClick={() => run(async () => { const r = await apiCall('appr-cycle-create', { orgId, ...cyc, template_id: cyc.template_id || undefined }, { auth: 'required' }); setOk(`Created ${r.created} appraisal(s).${r.skipped?.length ? ` ${r.skipped.length} skipped: ${r.skipped[0].reason}` : ''}`); })} className="px-4 py-2 rounded-lg bg-primary-600 disabled:opacity-40 text-white text-sm">Start round</button>
                        </div></div>
                    <div className="space-y-2">{(d.appraisals || []).map(a => (
                        <Link key={a.id} to={`/appraisals/${a.id}`} className="flex flex-wrap justify-between gap-2 bg-slate-900 border border-slate-700 hover:border-primary-500 rounded-lg p-3 text-sm text-slate-200">
                            <span>{nm(byId[a.employee_member_id])} <span className="text-slate-500">supervised by {nm(byId[a.supervisor_member_id])}</span></span>
                            <span className="text-xs">{STATUS_LABELS[a.status]}{a.needs_reassignment ? ' | NEEDS NEW SUPERVISOR' : ''}{a.employee_no_response ? ' | no response' : ''}{a.legal_hold ? ' | legal hold' : ''}</span></Link>))}
                        {!(d.appraisals || []).length && <p className="text-sm text-slate-400">No appraisals yet.</p>}</div></>)}

                {tab === 'settings' && (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4 max-w-xl">
                        <div><label className="text-xs text-slate-400">How many years to keep filed appraisals</label>
                            <input type="number" min="1" max="10" className={input} defaultValue={d.org.retention_years} onBlur={e => run(() => apiCall('appr-org-update', { orgId, retention_years: e.target.value }, { auth: 'required' }), 'Saved.')} />
                            <p className="text-xs text-slate-500 mt-1">After this period the text is permanently deleted. Pick the shortest period your own policy and local law allow.</p></div>
                        {['DE', 'FR'].includes(d.org.country_code) && (<div><label className="text-xs text-slate-400">Works council</label>
                            <select className={input} defaultValue={d.org.works_council_status} onChange={e => run(() => apiCall('appr-org-update', { orgId, works_council_status: e.target.value }, { auth: 'required' }), 'Saved.')}><option value="unknown">Not sure yet</option><option value="exists">We have one and have consulted or agreed</option><option value="none">We have none</option></select>
                            <input className={input + ' mt-2'} placeholder="Agreement or consultation reference" defaultValue={d.org.works_council_ref || ''} onBlur={e => run(() => apiCall('appr-org-update', { orgId, works_council_ref: e.target.value }, { auth: 'required' }), 'Saved.')} /></div>)}
                    </div>)}
            </ComplianceGate>
        </div></div>
    );
}
