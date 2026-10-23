// src/pages/AppraisalDetailPage.jsx
// NEW (2026-10-23): one appraisal, from self-appraisal to filing. What appears depends on the server's answer:
// the server decides who may see which part, this page just draws what it was given.
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiCall, STATUS_LABELS, ACTION_LABELS } from '../services/appraisalApi';
import ComplianceGate from '../components/ComplianceGate';
import { Loader2, Download, ShieldCheck, History, Lock, Compass } from 'lucide-react';

const input = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500';
const card = 'bg-slate-900 border border-slate-700 rounded-xl p-5 mb-4';
const STAGE = { self: 'Self-appraisal', supervisor: "Supervisor's appraisal", contributor: 'Colleague input', employee_response: "Employee's response", joint: 'Joint record after discussion', employee_statement: "Employee's statement", approver_note: "Approver's note" };

function Ratings({ v, template }) {
    const c = v.content; if (!c) return <p className="text-sm text-red-300">This record could not be read.</p>;
    return (<div className="space-y-3 text-sm text-slate-200">
        {(template?.criteria || []).filter(k => c.ratings?.[k.id] !== undefined).map(k => (
            <div key={k.id}><div className="flex justify-between"><b className="text-white">{k.title}</b><span>{c.ratings[k.id]} / {template.scale?.max ?? 5} <span className="text-slate-400">{template.scale?.labels?.[c.ratings[k.id]] || ''}</span></span></div>{c.comments?.[k.id] && <p className="text-slate-300 mt-1 whitespace-pre-line">{c.comments[k.id]}</p>}</div>))}
        {c.summary && <div><b className="text-white">Summary</b><p className="whitespace-pre-line mt-1">{c.summary}</p></div>}
        {c.goals && <div><b className="text-white">Goals</b><p className="whitespace-pre-line mt-1">{c.goals}</p></div>}
        {c.decision && <p><b className="text-white">Decision:</b> {c.decision === 'accept' ? 'Accepted' : 'Not accepted'}{c.comment ? ` - ${c.comment}` : ''}</p>}
        {c.text && <p className="whitespace-pre-line">{c.text}</p>}
    </div>);
}

function RatingForm({ template, initial, onSave, onSubmit, busy, submitLabel, optional }) {
    const [f, setF] = useState(initial || { ratings: {}, comments: {}, summary: '', goals: '' });
    const scale = template?.scale || { min: 1, max: 5, labels: {} };
    const opts = []; for (let i = scale.min; i <= scale.max; i++) opts.push(i);
    return (<div>
        {template?.ai_drafted && <p className="text-xs text-slate-400 mb-3">These questions were drafted with AI and reviewed by your employer. AI is not used to judge your answers.</p>}
        {(template?.criteria || []).map(k => (
            <div key={k.id} className="mb-4"><div className="text-white text-sm font-medium">{k.title}</div><div className="text-xs text-slate-400 mb-1">{k.description}</div>
                {k.anchors && <div className="text-xs text-slate-500 mb-1.5 space-y-0.5">{['1', '3', '5'].filter(a => k.anchors[a]).map(a => <div key={a}><b className="text-slate-400">{a}:</b> {k.anchors[a]}</div>)}</div>}
                <div className="flex flex-wrap gap-2 mb-2">{opts.map(n => <button type="button" key={n} onClick={() => setF({ ...f, ratings: { ...f.ratings, [k.id]: n } })} className={`px-3 py-1.5 rounded-lg text-sm border ${f.ratings[k.id] === n ? 'bg-primary-600 border-primary-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`} title={scale.labels?.[n]}>{n}</button>)}</div>
                <textarea rows={2} className={input} placeholder="Examples or comments (optional)" maxLength={4000} value={f.comments[k.id] || ''} onChange={e => setF({ ...f, comments: { ...f.comments, [k.id]: e.target.value } })} /></div>))}
        <label className="text-sm text-white">Overall summary{optional ? ' (optional)' : ''}</label>
        <textarea rows={4} className={input + ' mb-3'} maxLength={8000} value={f.summary} onChange={e => setF({ ...f, summary: e.target.value })} />
        {!optional && <><label className="text-sm text-white">Goals for the next period (optional)</label><textarea rows={3} className={input + ' mb-3'} maxLength={4000} value={f.goals} onChange={e => setF({ ...f, goals: e.target.value })} /></>}
        <p className="text-xs text-slate-400 mb-3 inline-flex items-center gap-1"><Lock className="w-3 h-3" />Everything is encrypted. Once sent it is locked and cannot be edited.</p>
        <div className="flex gap-2">{onSave && <button disabled={busy} onClick={() => onSave(f)} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm">Save draft</button>}
            <button disabled={busy} onClick={() => onSubmit(f)} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm">{busy ? 'Working...' : submitLabel}</button></div>
    </div>);
}

export default function AppraisalDetailPage() {
    const { id } = useParams();
    const nav = useNavigate();
    const [v, setV] = useState(null);
    const [err, setErr] = useState(''); const [ok, setOk] = useState('');
    const [busy, setBusy] = useState(false);
    const [resp, setResp] = useState({ decision: '', comment: '' });
    const [slots, setSlots] = useState(['', '', '']); const [where, setWhere] = useState('');
    const [stmt, setStmt] = useState(''); const [note, setNote] = useState('');
    const [newSup, setNewSup] = useState(''); const [newAppr, setNewAppr] = useState(''); const [members, setMembers] = useState([]);
    const load = useCallback(async () => { try { setV(await apiCall('appr-get', { appraisalId: id }, { auth: 'required' })); } catch (e) { setErr(e.message); } }, [id]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { if (v?.action === 'reassign' || v?.roles?.includes('hr')) apiCall('appr-org-get', { orgId: v.appraisal.org_id }, { auth: 'required' }).then(r => setMembers((r.members || []).filter(m => m.status === 'active'))).catch(() => {}); }, [v?.action, v?.appraisal?.org_id]); // eslint-disable-line
    const run = async (fn, done) => { setBusy(true); setErr(''); setOk(''); try { await fn(); if (done) setOk(done); await load(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };

    if (!v) return <div className="min-h-screen bg-slate-950 flex items-center justify-center">{err ? <p className="text-red-300 px-4">{err}</p> : <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />}</div>;
    const ap = v.appraisal, who = (mid) => v.people?.[mid]?.name || 'Unknown';
    const act = v.action; const tpl = v.template;
    const submit = (content) => run(() => apiCall('appr-submit', { appraisalId: id, content }, { auth: 'required' }), 'Sent.');
    const save = (content) => run(() => apiCall('appr-draft-save', { appraisalId: id, content }, { auth: 'required' }), 'Draft saved.');
    const pdf = () => run(async () => {
        const r = await apiCall('appr-export-pdf', { appraisalId: id }, { auth: 'required' });
        const a = document.createElement('a'); a.href = `data:application/pdf;base64,${r.pdf_base64}`; a.download = r.filename; a.click();
    });
    const openMeeting = v.meeting && ['proposed', 'scheduled'].includes(v.meeting.status) ? v.meeting : null;

    const actionPanel = () => {
        if (act === 'complete_self') return <RatingForm template={tpl} initial={v.draft?.content} onSave={save} onSubmit={submit} busy={busy} submitLabel="Send to my supervisor" />;
        if (act === 'complete_supervisor') return <RatingForm template={tpl} initial={v.draft?.content} onSave={save} onSubmit={submit} busy={busy} submitLabel="Send to the employee" />;
        if (act === 'give_input') return <RatingForm template={tpl} initial={v.draft?.content} optional onSave={save} onSubmit={submit} busy={busy} submitLabel="Send my input" />;
        if (act === 'record_joint') return <><p className="text-sm text-slate-300 mb-3">Record the ratings you both agreed in the discussion. If you did not agree, record your own view; the employee can reject again and the approver will see both views.</p><RatingForm template={tpl} initial={v.draft?.content} onSave={save} onSubmit={submit} busy={busy} submitLabel="Send for the employee's response" /></>;
        if (act === 'respond') return (<div>
            <div className="flex gap-2 mb-3">{[['accept', 'I accept this appraisal'], ['reject', 'I do not accept it']].map(([k, l]) => <button key={k} onClick={() => setResp({ ...resp, decision: k })} className={`px-4 py-2 rounded-lg text-sm border ${resp.decision === k ? 'bg-primary-600 border-primary-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>{l}</button>)}</div>
            <textarea rows={4} className={input + ' mb-3'} placeholder={resp.decision === 'reject' ? 'What do you disagree with? (required)' : 'Optional comment'} value={resp.comment} onChange={e => setResp({ ...resp, comment: e.target.value })} maxLength={4000} />
            <p className="text-xs text-slate-400 mb-3">{ap.round < 2 ? 'If you do not accept, your supervisor will arrange a face-to-face discussion.' : 'This is the second time. If you do not accept, the approver will see both views and decide.'} You can add a written statement at any time.</p>
            <button disabled={busy || !resp.decision} onClick={() => submit(resp)} className="px-4 py-2 rounded-lg bg-primary-600 disabled:opacity-40 text-white text-sm">Send my response</button></div>);
        if (act === 'propose_meeting') return (<div className="space-y-2"><p className="text-sm text-slate-300">Propose up to three times for a face-to-face discussion.</p>
            {slots.map((s, i) => <input key={i} type="datetime-local" className={input} value={s} onChange={e => setSlots(slots.map((x, j) => j === i ? e.target.value : x))} />)}
            <input className={input} placeholder="Where (room, address or video link)" value={where} onChange={e => setWhere(e.target.value)} />
            <button disabled={busy || !slots.some(Boolean)} onClick={() => run(() => apiCall('appr-meeting-propose', { appraisalId: id, slots: slots.filter(Boolean).map(s => new Date(s).toISOString()), location: where }, { auth: 'required' }), 'Sent to the employee.')} className="px-4 py-2 rounded-lg bg-primary-600 disabled:opacity-40 text-white text-sm">Send proposed times</button>
            {openMeeting && <p className="text-xs text-slate-400">Already proposed. Sending again replaces the earlier times.</p>}</div>);
        if (act === 'choose_slot') return openMeeting ? (<div><p className="text-sm text-slate-300 mb-2">Choose a time{openMeeting.location ? ` (${openMeeting.location})` : ''}:</p><div className="flex flex-wrap gap-2">{openMeeting.proposed_slots.map(s => <button key={s} disabled={busy} onClick={() => run(() => apiCall('appr-meeting-choose', { appraisalId: id, slot: s }, { auth: 'required' }), 'Meeting confirmed.')} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-primary-600 text-white text-sm">{new Date(s).toLocaleString()}</button>)}</div></div>) : <p className="text-sm text-slate-400">Waiting for your supervisor to propose times.</p>;
        if (act === 'hold_meeting') return <div><p className="text-sm text-slate-300 mb-3">{openMeeting?.chosen_slot ? `Scheduled for ${new Date(openMeeting.chosen_slot).toLocaleString()}.` : ''} After you have met, mark it as held and record the joint appraisal.</p><button disabled={busy} onClick={() => run(() => apiCall('appr-meeting-held', { appraisalId: id }, { auth: 'required' }), 'Recorded.')} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm">We have met</button></div>;
        if (act === 'final_decision') return (<div>
            {ap.owner_approved && ap.disagreement && <p className="text-sm text-amber-300 mb-2">You supervised this appraisal and you are also the approver, and the employee did not agree. Write a short note explaining your decision (at least 20 characters), or ask HR to name an independent approver.</p>}
            {ap.disagreement && <p className="text-sm text-amber-300 mb-2">The employee and supervisor did not agree after a discussion. Read both views, then decide. Filing keeps both views on record.</p>}
            {ap.employee_no_response && <p className="text-sm text-amber-300 mb-2">The employee did not respond within the deadline. This is not acceptance. Consider asking the supervisor to follow up before filing.</p>}
            <textarea rows={3} className={input + ' mb-3'} placeholder={ap.owner_approved && ap.disagreement ? 'Note explaining your decision (required)' : 'Note (required if returning it)'} value={note} onChange={e => setNote(e.target.value)} maxLength={5000} />
            <div className="flex gap-2"><button disabled={busy || (ap.owner_approved && ap.disagreement && note.trim().length < 20)} onClick={() => run(() => apiCall('appr-final-decision', { appraisalId: id, decision: 'file', note }, { auth: 'required' }), 'Filed.')} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">Approve and file</button>
                <button disabled={busy || note.trim().length < 10} onClick={() => run(() => apiCall('appr-final-decision', { appraisalId: id, decision: 'return', note }, { auth: 'required' }), 'Returned to the supervisor.')} className="px-4 py-2 rounded-lg bg-slate-700 disabled:opacity-40 text-white text-sm">Return to supervisor</button></div></div>);
        if (act === 'reassign') return (<div className="flex gap-2"><select className={input} value={newSup} onChange={e => setNewSup(e.target.value)}><option value="">Choose a new supervisor</option>{members.filter(m => m.id !== ap.employee_member_id).map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}</select><button disabled={busy || !newSup} onClick={() => run(() => apiCall('appr-reassign', { appraisalId: id, supervisorMemberId: newSup }, { auth: 'required' }), 'Reassigned.')} className="px-4 py-2 rounded-lg bg-primary-600 disabled:opacity-40 text-white text-sm">Assign</button></div>);
        return null;
    };

    const isEmployee = v.roles.includes('employee');
    const canStatement = isEmployee && !['awaiting_self', 'awaiting_supervisor', 'closed_employee_left', 'withdrawn', 'purged'].includes(ap.status);
    const panel = actionPanel();
    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4"><div className="max-w-3xl mx-auto">
            <Link to="/appraisals" className="text-sm text-slate-400 hover:text-white">&larr; Appraisals</Link>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 mb-1"><h1 className="text-2xl font-bold text-white">Appraisal: {who(ap.employee_member_id)}</h1><span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">{STATUS_LABELS[ap.status] || ap.status}</span></div>
            {ap.supervisor_member_id && <p className="text-xs text-slate-400 mb-4">Supervisor: {who(ap.supervisor_member_id)}{ap.approver_member_id ? ` | Approver: ${who(ap.approver_member_id)}${ap.owner_approved ? ' (same person as supervisor)' : ''}` : ''} | Your role: {v.roles.join(', ')}</p>}
            {err && <div className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{err}</div>}
            {ok && <div className="mb-3 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">{ok}</div>}
            {ap.needs_reassignment && <div className="mb-3 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">The supervisor has left. HR needs to choose a new supervisor.</div>}
            {ap.employee_no_response && <div className="mb-3 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">No response from the employee within the deadline. This is not treated as acceptance.</div>}
            {ap.disagreement && <div className="mb-3 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">The employee and supervisor did not agree. Both views are recorded.</div>}

            {panel && <div className={card}><h2 className="text-white font-semibold mb-3">{ACTION_LABELS[act]}</h2>
                {['complete_self', 'complete_supervisor', 'give_input', 'respond', 'record_joint', 'final_decision'].includes(act) ? <ComplianceGate service="appraisal" orgId={ap.org_id} canAct={false}>{panel}</ComplianceGate> : panel}</div>}

            {v.versions.length > 0 && <h2 className="text-white font-semibold mb-2">Record</h2>}
            {v.versions.map(x => (<div key={x.id} className={card}>
                <div className="flex justify-between text-xs text-slate-400 mb-3"><b className="text-white text-sm">{STAGE[x.stage] || x.stage}</b><span>{who(x.author_member_id)} | {new Date(x.created_at).toLocaleDateString()}{x.round > 1 ? ` | round ${x.round}` : ''}</span></div>
                <Ratings v={x} template={tpl} /></div>))}
            {!v.versions.length && !panel && <p className="text-sm text-slate-400 mb-4">Nothing for you to see or do at this stage.</p>}

            {canStatement && <div className={card}><h2 className="text-white font-semibold mb-2">Add a written statement</h2><p className="text-xs text-slate-400 mb-2">Your statement is kept with the appraisal and shown to the approver.</p>
                <textarea rows={3} className={input + ' mb-2'} maxLength={5000} value={stmt} onChange={e => setStmt(e.target.value)} />
                <button disabled={busy || !stmt.trim()} onClick={() => run(async () => { await apiCall('appr-statement', { appraisalId: id, content: { text: stmt } }, { auth: 'required' }); setStmt(''); }, 'Statement added.')} className="px-4 py-2 rounded-lg bg-slate-700 disabled:opacity-40 text-white text-sm">Add statement</button></div>}

            {isEmployee && ['awaiting_employee_response', 'awaiting_final_approval', 'filed'].includes(ap.status) && (() => {
                const goals = v.versions.filter(x => ['joint', 'supervisor'].includes(x.stage) && x.content?.goals).slice(-1)[0]?.content?.goals;
                return goals ? (<div className={card}><h2 className="text-white font-semibold mb-1 inline-flex items-center gap-2"><Compass className="w-4 h-4" />Use my goals in Career Coach</h2>
                    <p className="text-xs text-slate-400 mb-3">Optional. This copies the goals text from your appraisal into your private Career Coach page so you can plan your next step. Nothing is saved until you save it there. Your employer and supervisor are not told, and it is never used for recruitment.</p>
                    <button onClick={() => nav('/career-coach', { state: { prefillExperience: goals } })} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm">Copy my goals to Career Coach</button></div>) : null;
            })()}
            {v.roles.includes('hr') && !['filed', 'closed_employee_left', 'withdrawn', 'purged'].includes(ap.status) && (<div className={card}><h2 className="text-white font-semibold mb-2 text-sm">Change the approver</h2>
                <div className="flex gap-2"><select className={input} value={newAppr} onChange={e => setNewAppr(e.target.value)}><option value="">Choose a person</option>{members.filter(m => m.id !== ap.employee_member_id).map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}</select>
                    <button disabled={busy || !newAppr} onClick={() => run(() => apiCall('appr-approver-set', { appraisalId: id, memberId: newAppr }, { auth: 'required' }), 'Approver changed.')} className="px-4 py-2 rounded-lg bg-slate-700 disabled:opacity-40 text-white text-sm">Save</button></div></div>)}
            <div className="flex flex-wrap gap-2 mb-6">
                {v.versions.length > 0 && <button disabled={busy} onClick={pdf} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm inline-flex items-center gap-1"><Download className="w-4 h-4" />Download PDF</button>}
                {v.roles.includes('hr') && !['filed', 'closed_employee_left', 'withdrawn', 'purged'].includes(ap.status) && <button disabled={busy} onClick={() => window.confirm('Withdraw this appraisal?') && run(() => apiCall('appr-withdraw', { appraisalId: id }, { auth: 'required' }), 'Withdrawn.')} className="px-4 py-2 rounded-lg bg-slate-800 text-red-300 text-sm">Withdraw</button>}
                {v.roles.includes('hr') && <button disabled={busy} onClick={() => run(() => apiCall('appr-legal-hold', { appraisalId: id, on: !ap.legal_hold }, { auth: 'required' }), ap.legal_hold ? 'Legal hold removed.' : 'Legal hold on: this record will not be deleted.')} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm">{ap.legal_hold ? 'Remove legal hold' : 'Place legal hold'}</button>}
            </div>
            {ap.status === 'filed' && ap.retention_until && <p className="text-xs text-slate-500 mb-4 inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Kept until {ap.retention_until}{ap.legal_hold ? ' (legal hold: kept until released)' : ''}, then the text is permanently deleted.</p>}

            {v.events.length > 0 && <details className="text-sm text-slate-400"><summary className="cursor-pointer inline-flex items-center gap-1"><History className="w-4 h-4" />Audit trail</summary>
                <ul className="mt-2 space-y-1 text-xs">{v.events.map(e => <li key={e.id}>{new Date(e.created_at).toLocaleString()} - {e.action.replace(/_/g, ' ')}{e.actor_member_id ? ` by ${who(e.actor_member_id)}` : ' (system)'}</li>)}</ul></details>}
        </div></div>
    );
}
