// src/pages/AppraisalOrgPage.jsx
// NEW (2026-10-23): organisation admin for owners and HR admins. Metadata only: this page never shows appraisal text.
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiCall, STATUS_LABELS } from '../services/appraisalApi';
import ComplianceGate from '../components/ComplianceGate';
import { Loader2, UserPlus, Users, CalendarPlus, Settings, UserMinus, FileText, BarChart3, Trash2, Copy, Plus, Sparkles, CreditCard } from 'lucide-react';

const input = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500';
const CAT = { micro_default: 'Simple (for very small teams)', standard: 'Standard', role: 'By type of work', custom: 'Your own templates' };
const blankQ = () => ({ id: `n${Math.random().toString(36).slice(2, 8)}`, title: '', description: '', anchors: { 1: '', 3: '', 5: '' } });
const nm = (m) => m?.full_name || m?.email?.split('@')[0] || 'Unknown';

export default function AppraisalOrgPage() {
    const { orgId } = useParams();
    const [d, setD] = useState(null);
    const [err, setErr] = useState(''); const [ok, setOk] = useState('');
    const [busy, setBusy] = useState(false);
    const [inv, setInv] = useState({ email: '', full_name: '', job_title: '', department: '', role: 'member', supervisor_member_id: '' });
    const [cyc, setCyc] = useState({ name: '', template_id: '' });
    const [tab, setTab] = useState('people');
    const [ai, setAi] = useState({ role: '', industry: '', focus: '', count: 5 });
    const [reviewed, setReviewed] = useState(false);
    const [ed, setEd] = useState(null);   // template being edited: { id?, name, description, criteria[] }

    const load = useCallback(async () => { try { setD(await apiCall('appr-org-get', { orgId }, { auth: 'required' })); } catch (e) { setErr(e.message); } }, [orgId]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {   // back from the payment page: the webhook can take a few seconds to add the credits
        const q = new URLSearchParams(window.location.search).get('credits');
        if (q === 'added') { setOk('Payment received. Your appraisal credits will show here in a moment.'); setTimeout(load, 4000); setTimeout(load, 10000); }
        if (q === 'cancelled') setErr('The payment was cancelled. You have not been charged.');
    }, []); // eslint-disable-line
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
            <p className="text-xs text-slate-400 mb-2">Workplace country: {d.org.country_code} | Records kept {d.org.retention_years} years after filing{d.org.mode === 'micro' ? ' | Small team mode' : ''}</p>
            <Link to={`/appraisals/org/${orgId}/reports`} className="inline-flex items-center gap-1 text-sm text-primary-400 hover:underline mb-4"><BarChart3 className="w-4 h-4" />Reports and business review</Link>
            {err && <div className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{err}</div>}
            {ok && <div className="mb-3 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">{ok}</div>}

            <ComplianceGate service="appraisal" orgId={orgId} canAct={isHr}>
                {needReassign.length > 0 && <div className="mb-4 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">{needReassign.length} appraisal(s) need a new supervisor because the supervisor left. Open each and choose one.</div>}
                <div className="flex gap-2 mb-4">{[['people', 'People', Users], ['rounds', 'Appraisal rounds', CalendarPlus], ['templates', 'Questions', FileText], ['settings', 'Settings', Settings]].map(([k, l, I]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-1 ${tab === k ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300'}`}><I className="w-4 h-4" />{l}</button>)}</div>

                {tab === 'people' && (<>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4">
                        <h3 className="text-white font-medium mb-3 inline-flex items-center gap-1"><UserPlus className="w-4 h-4" />Invite a person</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input className={input} placeholder="Email" value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} />
                            <input className={input} placeholder="Full name" value={inv.full_name} onChange={e => setInv({ ...inv, full_name: e.target.value })} />
                            <input className={input} placeholder="Job title" value={inv.job_title} onChange={e => setInv({ ...inv, job_title: e.target.value })} />
                            <input className={input} placeholder="Department or team (optional)" value={inv.department} onChange={e => setInv({ ...inv, department: e.target.value })} />
                            <select className={input} value={inv.role} onChange={e => setInv({ ...inv, role: e.target.value })}><option value="member">Staff member</option><option value="approver">Approver</option>{d.me.role === 'owner' && <option value="hr_admin">HR admin</option>}</select>
                            <select className={input} value={inv.supervisor_member_id} onChange={e => setInv({ ...inv, supervisor_member_id: e.target.value })}><option value="">Supervisor (choose)</option>{active.map(m => <option key={m.id} value={m.id}>{nm(m)}</option>)}</select>
                            <button disabled={busy || !inv.email} onClick={() => run(async () => { await apiCall('appr-member-invite', { orgId, ...inv }, { auth: 'required' }); setInv({ email: '', full_name: '', job_title: '', department: '', role: 'member', supervisor_member_id: '' }); }, 'Invitation sent.')} className="px-4 py-2 rounded-lg bg-primary-600 disabled:opacity-40 text-white text-sm">Send invitation</button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Each person has one accountable supervisor. Up to three colleagues can be asked for input on any appraisal.</p>
                    </div>
                    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Name</th><th>Role</th><th>Department</th><th>Supervisor</th><th>Status</th><th></th></tr></thead>
                        <tbody>{d.members.map(m => <tr key={m.id} className="border-t border-slate-800 text-slate-200"><td className="p-2">{nm(m)}<div className="text-xs text-slate-500">{m.email}</div></td><td>{m.role}</td><td><input className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs w-28" defaultValue={m.department || ''} placeholder="-" onBlur={e => e.target.value !== (m.department || '') && run(() => apiCall('appr-member-update', { orgId, memberId: m.id, department: e.target.value }, { auth: 'required' }), 'Saved.')} /></td>
                            <td>{m.status === 'left' ? '-' : <select className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" value={m.supervisor_member_id || ''} onChange={e => run(() => apiCall('appr-member-update', { orgId, memberId: m.id, supervisor_member_id: e.target.value || null }, { auth: 'required' }), 'Saved.')}><option value="">None</option>{active.filter(x => x.id !== m.id).map(x => <option key={x.id} value={x.id}>{nm(x)}</option>)}</select>}</td>
                            <td>{m.status}</td><td>{m.status !== 'left' && m.role !== 'owner' && <button title="Mark as left" onClick={() => window.confirm(`Mark ${nm(m)} as left? Their open appraisals will be closed and kept on record.`) && run(() => apiCall('appr-member-leave', { orgId, memberId: m.id }, { auth: 'required' }), 'Updated.')} className="text-red-300 hover:text-red-200"><UserMinus className="w-4 h-4" /></button>}</td></tr>)}</tbody></table></div></>)}

                {tab === 'rounds' && (<>
                    {d.billing?.billable && (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4">
                            <h3 className="text-white font-medium mb-1 inline-flex items-center gap-1"><CreditCard className="w-4 h-4" />Appraisal credits: {d.billing.balance}</h3>
                            <p className="text-xs text-slate-400 mb-3">Starting a round uses one credit for each person appraised. A credit comes back if you withdraw an appraisal before the supervisor has started it. Credits never expire. Small teams are limited to {d.billing.max_people} people; the Employer and Business plans include appraisals for larger teams.</p>
                            {d.me.role === 'owner' ? (<div className="flex flex-wrap gap-2">{d.billing.packs.map(p => (
                                <button key={p.count} disabled={busy} onClick={() => run(async () => { const r = await apiCall('appr-credits-checkout', { orgId, count: p.count }, { auth: 'required' }); window.location.href = r.url; })} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm">Buy {p.count} for ${(p.cents / 100).toFixed(2)}</button>))}</div>)
                                : <p className="text-xs text-amber-300">Only the owner can buy credits.</p>}
                        </div>)}
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

                {tab === 'templates' && (<>
                    {!ed && (<>
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-3"><p className="text-sm text-slate-300 max-w-xl">These are the questions people are rated on. Pick a ready-made set when you start a round, or copy one and change it. Each question can have short descriptions of what 1, 3 and 5 look like, which keeps ratings consistent.</p>
                            <button onClick={() => setEd({ name: '', description: '', criteria: [blankQ(), blankQ(), blankQ()] })} className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm inline-flex items-center gap-1"><Plus className="w-4 h-4" />Write my own</button></div>
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4">
                            <h3 className="text-white font-medium mb-1 inline-flex items-center gap-1"><Sparkles className="w-4 h-4 text-violet-300" />Draft questions with AI</h3>
                            <p className="text-xs text-slate-400 mb-3">Describe the job and AI suggests questions with 1, 3 and 5 descriptions for you to edit. Describe the job only: do not type any person&apos;s name. AI helps with writing questions only. It never reads, scores or comments on appraisal results. Uses 1 AI credit.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input className={input} placeholder="The job, e.g. kitchen assistant" value={ai.role} maxLength={80} onChange={e => setAi({ ...ai, role: e.target.value })} />
                                <input className={input} placeholder="Type of workplace (optional), e.g. care home" value={ai.industry} maxLength={80} onChange={e => setAi({ ...ai, industry: e.target.value })} />
                                <input className={input + ' md:col-span-2'} placeholder="What matters most in this job (optional)" value={ai.focus} maxLength={300} onChange={e => setAi({ ...ai, focus: e.target.value })} />
                                <select className={input} value={ai.count} onChange={e => setAi({ ...ai, count: Number(e.target.value) })}>{[3, 4, 5, 6, 8].map(n => <option key={n} value={n}>{n} questions</option>)}</select>
                                <button disabled={busy || ai.role.trim().length < 2} onClick={() => run(async () => {
                                    const r = await apiCall('appr-template-ai-draft', { orgId, ...ai }, { auth: 'required' });
                                    setReviewed(false);
                                    setEd({ name: ai.role.trim().slice(0, 80) ? `${ai.role.trim().slice(0, 80)} appraisal` : '', description: '', ai_drafted: true, info: { notice: r.notice, removed: r.removed, self_review: r.self_review },
                                        criteria: r.criteria.map(c => ({ ...blankQ(), title: c.title, description: c.description, anchors: { 1: c.anchors?.['1'] || '', 3: c.anchors?.['3'] || '', 5: c.anchors?.['5'] || '' } })) });
                                })} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm">{busy ? 'Drafting...' : 'Draft questions'}</button>
                            </div>
                        </div>
                        {Object.keys(CAT).map(k => { const list = d.templates.filter(t => (t.category || (t.org_id ? 'custom' : 'standard')) === k); if (!list.length) return null; return (
                            <div key={k} className="mb-4"><h3 className="text-white text-sm font-medium mb-2">{CAT[k]}</h3>
                                <div className="space-y-2">{list.map(t => (
                                    <div key={t.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                                        <div className="flex flex-wrap justify-between gap-2"><div><div className="text-white text-sm">{t.name}{t.ai_drafted && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-200">AI-drafted</span>}</div>{t.description && <div className="text-xs text-slate-400">{t.description}</div>}</div>
                                            <div className="flex gap-3 text-xs items-start">
                                                <button className="text-primary-400 inline-flex items-center gap-1" onClick={() => setEd({ name: t.org_id ? t.name : `${t.name} (copy)`, description: t.description || '', criteria: t.criteria.map(c => ({ id: c.id, title: c.title, description: c.description || '', anchors: { 1: c.anchors?.['1'] || '', 3: c.anchors?.['3'] || '', 5: c.anchors?.['5'] || '' } })), id: t.org_id ? t.id : undefined, ai_drafted: !!t.ai_drafted })}><Copy className="w-3.5 h-3.5" />{t.org_id ? 'Edit' : 'Copy and edit'}</button>
                                                {t.org_id && <button className="text-red-300 inline-flex items-center gap-1" onClick={() => window.confirm('Delete this template? Appraisals already started keep their own copy.') && run(() => apiCall('appr-template-delete', { orgId, templateId: t.id }, { auth: 'required' }), 'Deleted.')}><Trash2 className="w-3.5 h-3.5" />Delete</button>}</div></div>
                                        <ul className="mt-2 text-xs text-slate-400 list-disc pl-5">{t.criteria.map(c => <li key={c.id}>{c.title}</li>)}</ul></div>))}</div></div>); })}
                    </>)}
                    {ed && (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                            <h3 className="text-white font-medium mb-3">{ed.id ? 'Edit template' : 'New template'}</h3>
                            <input className={input + ' mb-2'} placeholder="Template name" value={ed.name} onChange={e => setEd({ ...ed, name: e.target.value })} maxLength={120} />
                            <input className={input + ' mb-4'} placeholder="Short description (optional)" value={ed.description} onChange={e => setEd({ ...ed, description: e.target.value })} maxLength={300} />
                            {ed.ai_drafted && (<div className="mb-4 text-sm text-violet-100 bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
                                <p className="mb-1"><b>AI-drafted questions.</b> {ed.info?.notice || 'Read every question and change what does not fit. AI is not used to read or judge any appraisal result.'}</p>
                                {ed.info?.removed?.length > 0 && <p className="text-xs">Left out automatically because they touched a personal characteristic: {ed.info.removed.join(', ')}.</p>}
                                {ed.info?.self_review?.length > 0 && <ul className="list-disc pl-5 text-xs mt-1">{ed.info.self_review.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                                <label className="flex items-center gap-2 mt-2 text-xs"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I have read every question and checked that it is fair and suits my business.</label>
                            </div>)}
                            {ed.criteria.map((c, i) => (
                                <div key={i} className="border border-slate-700 rounded-lg p-3 mb-3">
                                    <div className="flex gap-2 mb-2"><input className={input} placeholder={`Question ${i + 1}, e.g. Quality of work`} value={c.title} maxLength={120} onChange={e => { const cr = [...ed.criteria]; cr[i] = { ...c, title: e.target.value }; setEd({ ...ed, criteria: cr }); }} />
                                        <button title="Remove question" disabled={ed.criteria.length <= 1} onClick={() => setEd({ ...ed, criteria: ed.criteria.filter((_, j) => j !== i) })} className="text-red-300 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></div>
                                    <input className={input + ' mb-2'} placeholder="What this question is about (optional)" value={c.description} maxLength={400} onChange={e => { const cr = [...ed.criteria]; cr[i] = { ...c, description: e.target.value }; setEd({ ...ed, criteria: cr }); }} />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">{[1, 3, 5].map(k => <input key={k} className={input} placeholder={`What a ${k} looks like (optional)`} value={c.anchors[k]} maxLength={200} onChange={e => { const cr = [...ed.criteria]; cr[i] = { ...c, anchors: { ...c.anchors, [k]: e.target.value } }; setEd({ ...ed, criteria: cr }); }} />)}</div>
                                </div>))}
                            <div className="flex flex-wrap gap-2">
                                <button disabled={ed.criteria.length >= 12} onClick={() => setEd({ ...ed, criteria: [...ed.criteria, blankQ()] })} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40">Add a question</button>
                                <button disabled={busy || !ed.name || !ed.criteria.some(c => c.title.trim()) || (ed.ai_drafted && !reviewed)} onClick={() => run(async () => { await apiCall('appr-template-save', { orgId, templateId: ed.id, ai_drafted: !!ed.ai_drafted, reviewed, name: ed.name, description: ed.description, criteria: ed.criteria.map((c) => ({ id: c.id, title: c.title, description: c.description, anchors: c.anchors })) }, { auth: 'required' }); setEd(null); }, 'Template saved.')} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm disabled:opacity-40">Save template</button>
                                <button onClick={() => { setEd(null); setReviewed(false); }} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm">Cancel</button></div>
                            <p className="text-xs text-slate-500 mt-3">Ask only about work behaviour and results. Do not ask about health, family plans, age, religion or other personal characteristics. Up to 12 questions. Ratings use a 1 to 5 scale.</p>
                        </div>)}
                </>)}

                {tab === 'settings' && (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4 max-w-xl">
                        {d.me.role === 'owner' && (<div><label className="text-xs text-slate-400">Size of team</label>
                            <select className={input} defaultValue={d.org.mode || 'standard'} onChange={e => run(() => apiCall('appr-org-update', { orgId, mode: e.target.value }, { auth: 'required' }), 'Saved.')}><option value="standard">Standard: an independent approver signs off each appraisal</option><option value="micro">Small team: the owner can supervise and approve</option></select>
                            <p className="text-xs text-slate-500 mt-1">Small team mode is for owner-run businesses where one person manages everyone. The owner can approve their own supervision, and the record shows that. Where staff disagree, the owner must write a reason. You can name a different approver on any single appraisal.</p></div>)}
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
