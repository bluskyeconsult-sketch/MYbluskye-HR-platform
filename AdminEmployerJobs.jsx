// src/pages/admin/AdminEmployerJobs.jsx
// NEW (2026-10-23): review queue for jobs posted by employers (pay-per-post, Employer and Business plans).
// Jobs are saved as "pending" and only appear on the board once approved here. Each job shows points to check before approving.
// The points are prompts for you, not a verdict: a job with no warnings can still be fake, and a flagged one can be genuine.
// Rejecting needs a reason, which is emailed to the employer; a job paid for with a credit gets the credit back automatically.
import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '../../services/appraisalApi';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info, RefreshCw, CreditCard } from 'lucide-react';

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']];
const when = (d) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

export default function AdminEmployerJobs() {
    const [status, setStatus] = useState('pending');
    const [jobs, setJobs] = useState(null);
    const [err, setErr] = useState(''); const [ok, setOk] = useState('');
    const [busy, setBusy] = useState('');
    const [rejecting, setRejecting] = useState(null); const [reason, setReason] = useState('');

    const load = useCallback(async () => {
        setErr('');
        try { setJobs((await apiCall('admin-employer-jobs-list', { status }, { auth: 'required' })).jobs); }
        catch (e) { setJobs([]); setErr(e.message); }
    }, [status]);
    useEffect(() => { setJobs(null); load(); }, [load]);

    const decide = async (job, decision) => {
        setBusy(job.id); setErr(''); setOk('');
        try {
            const r = await apiCall('admin-employer-job-decide', { jobId: job.id, decision, reason: decision === 'reject' ? reason : undefined }, { auth: 'required' });
            setOk(decision === 'approve' ? `"${job.title}" is now live. The employer has been emailed.` : `"${job.title}" was rejected and the employer has been emailed.${r.credit_returned ? ' The job-post credit was returned.' : ''}`);
            setRejecting(null); setReason('');
            await load();
        } catch (e) { setErr(e.message); } finally { setBusy(''); }
    };

    return (
        <div className="p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-1">
                <h1 className="text-2xl font-bold text-white">Employer jobs</h1>
                <button onClick={load} className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-sm"><RefreshCw className="w-4 h-4" />Refresh</button>
            </div>
            <p className="text-sm text-slate-400 mb-4">Jobs posted by employers wait here until you approve them. Read the points to check first, especially for a first-time employer.</p>
            <div className="flex gap-2 mb-4">{TABS.map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={`px-3 py-1.5 rounded-lg text-sm ${status === k ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{l}</button>)}</div>
            {err && <div className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{err}</div>}
            {ok && <div className="mb-3 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">{ok}</div>}
            {jobs === null ? <Loader2 className="w-6 h-6 animate-spin text-primary-400" /> : jobs.length === 0 ? <p className="text-slate-400 text-sm">Nothing here.</p> : (
                <div className="space-y-4">{jobs.map(j => (
                    <div key={j.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h2 className="text-white font-semibold">{j.title}</h2>
                                <p className="text-sm text-slate-300">{j.company}{j.location ? ` | ${j.location}` : ''}{j.is_remote ? ' | remote friendly' : ''} | {j.job_type}</p>
                                <p className="text-xs text-slate-500">Posted {when(j.created_at)} by {j.poster.name || 'unnamed'} ({j.poster.email || 'no email'}), joined {when(j.poster.joined)}</p>
                            </div>
                            <div className="text-right text-xs">
                                {j.paid_with_credit && <span className="inline-flex items-center gap-1 text-sky-300"><CreditCard className="w-3 h-3" />Paid with a credit</span>}
                                <div className={j.warnings ? 'text-amber-300' : 'text-emerald-300'}>{j.warnings} point{j.warnings === 1 ? '' : 's'} to check</div>
                            </div>
                        </div>
                        <ul className="mt-3 space-y-1">{j.flags.map((f, i) => (
                            <li key={i} className={`text-sm flex gap-2 ${f.level === 'warn' ? 'text-amber-200' : 'text-slate-400'}`}>{f.level === 'warn' ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}<span>{f.text}</span></li>))}</ul>
                        <details className="mt-3"><summary className="text-sm text-primary-300 cursor-pointer">Read the full job</summary>
                            <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap break-words">
                                <p className="mb-2">{j.description}</p>
                                {j.requirements && <p className="mb-2"><span className="text-slate-400">Requirements: </span>{j.requirements}</p>}
                                {j.benefits && <p className="mb-2"><span className="text-slate-400">Benefits: </span>{j.benefits}</p>}
                                <p className="text-xs text-slate-500">Salary: {j.salary_min || j.salary_max ? `${j.salary_min ?? '?'} to ${j.salary_max ?? '?'}` : 'not given'} | Closing date: {j.application_deadline || 'none'}</p>
                            </div>
                        </details>
                        {j.compliance_status === 'rejected' && j.rejection_reason && <p className="mt-2 text-xs text-red-300">Rejected: {j.rejection_reason}</p>}
                        {j.compliance_status === 'pending' && (rejecting === j.id ? (
                            <div className="mt-3">
                                <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (emailed to the employer, so write it politely)" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" />
                                <div className="flex gap-2 mt-2">
                                    <button disabled={busy === j.id || reason.trim().length < 5} onClick={() => decide(j, 'reject')} className="px-3 py-1.5 rounded-lg bg-red-600 disabled:opacity-40 text-white text-sm">Reject and email</button>
                                    <button onClick={() => { setRejecting(null); setReason(''); }} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2 mt-3">
                                <button disabled={busy === j.id} onClick={() => window.confirm(`Approve "${j.title}"? It will go live on the job board straight away.`) && decide(j, 'approve')} className="px-3 py-1.5 rounded-lg bg-emerald-600 disabled:opacity-40 text-white text-sm inline-flex items-center gap-1"><CheckCircle className="w-4 h-4" />Approve</button>
                                <button disabled={busy === j.id} onClick={() => { setRejecting(j.id); setReason(''); }} className="px-3 py-1.5 rounded-lg bg-slate-800 text-red-300 text-sm inline-flex items-center gap-1"><XCircle className="w-4 h-4" />Reject</button>
                            </div>))}
                    </div>))}</div>)}
        </div>
    );
}
