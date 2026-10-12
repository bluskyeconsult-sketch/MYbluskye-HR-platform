// src/components/admin/AdminUserInspector.jsx
// Read-only support view of one user's account. It changes nothing and does not sign in as the
// user. A reason is required and every look is recorded on the server (the page cannot bypass
// that). Private messages and Career Coach content are never shown. The user's own submissions
// (assessment answers, assistant inputs and outputs) appear only when "include content" is ticked,
// which is recorded as well.
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Loader2, Eye, ShieldCheck, AlertCircle } from 'lucide-react';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '-');

function Section({ title, children, count }) {
    return (
        <details className="bg-slate-950/50 border border-slate-800 rounded-lg p-3" open={title === 'Profile'}>
            <summary className="cursor-pointer text-sm font-medium text-white">
                {title}{typeof count === 'number' ? <span className="text-slate-500 font-normal"> ({count})</span> : null}
            </summary>
            <div className="mt-3 text-sm text-slate-300 space-y-2">{children}</div>
        </details>
    );
}

function Rows({ data, render, empty = 'Nothing recorded.' }) {
    if (data && data.unavailable) return <p className="text-amber-400 text-xs">Not available: {data.unavailable}</p>;
    if (!Array.isArray(data) || data.length === 0) return <p className="text-slate-500 text-xs">{empty}</p>;
    return data.map((row, i) => <div key={row.id || i} className="border-b border-slate-800 pb-2 last:border-0">{render(row)}</div>);
}

export default function AdminUserInspector({ user, onClose }) {
    const [reason, setReason] = useState('');
    const [includeContent, setIncludeContent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    async function load() {
        setLoading(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/index?action=admin-user-inspect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ userId: user.id, reason, includeContent })
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Could not load this account');
            setData(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    const p = data?.profile;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary-400" /> Support view: {user.full_name || user.email}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                {!data ? (
                    <div className="p-5 space-y-4">
                        <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-950/50 border border-slate-800 rounded-lg p-3">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p>Read only. Nothing is changed and you are not signed in as this person. Your name, the time and your reason are recorded against their account. Private messages and Career Coach content are never shown.</p>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Why are you looking at this account? <span className="text-red-400">*</span></label>
                            <input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Ticket #123: cannot see assessment result"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <label className="flex items-start gap-2 text-sm text-slate-300">
                            <input type="checkbox" checked={includeContent} onChange={(e) => setIncludeContent(e.target.checked)} className="mt-1" />
                            <span>Include the content of their submissions (assessment answers, assistant inputs and outputs). Only tick this if the problem cannot be solved without it. This is recorded too.</span>
                        </label>
                        {error && (
                            <p className="text-red-400 text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</p>
                        )}
                        <button
                            onClick={load}
                            disabled={loading || reason.trim().length < 8}
                            className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                            Open support view
                        </button>
                    </div>
                ) : (
                    <div className="p-5 space-y-3">
                        <p className="text-xs text-slate-500">
                            Not shown by design: {(data.not_included || []).join(', ')}. {data.includeContent ? 'Submission content is included.' : 'Submission content is hidden.'}
                        </p>

                        <Section title="Profile">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {['full_name', 'email', 'tier', 'user_type', 'is_suspended', 'created_at', 'last_credit_grant_at'].map(k => (
                                    <p key={k}><span className="text-slate-500">{k.replace(/_/g, ' ')}:</span> {String(k.endsWith('_at') ? fmt(p?.[k]) : (p?.[k] ?? '-'))}</p>
                                ))}
                                <p><span className="text-slate-500">credits:</span> {data.credits ?? '-'}</p>
                            </div>
                        </Section>

                        <Section title="Job applications (on site)" count={Array.isArray(data.job_applications) ? data.job_applications.length : undefined}>
                            <Rows data={data.job_applications} render={(a) => <p>{a.status} <span className="text-slate-500">job {String(a.job_id).slice(0, 8)} - {fmt(a.created_at)}</span></p>} />
                        </Section>

                        <Section title="Tracked applications (other sites)" count={Array.isArray(data.tracked_applications) ? data.tracked_applications.length : undefined}>
                            <Rows data={data.tracked_applications} render={(a) => <p>{a.title} - {a.company} <span className="text-slate-500">{a.status} - {fmt(a.created_at)}</span></p>} />
                        </Section>

                        <Section title="Assessments" count={Array.isArray(data.assessments) ? data.assessments.length : undefined}>
                            <Rows data={data.assessments} render={(a) => (
                                <div>
                                    <p>{a.assessment?.title || 'Assessment'} <span className="text-slate-500">{a.status} - {a.percentage ?? '-'}% - {fmt(a.completed_at)}</span></p>
                                    {data.includeContent && Array.isArray(a.answers) && (
                                        <ul className="mt-1 text-xs text-slate-400 list-disc pl-5">
                                            {a.answers.slice(0, 40).map((x, i) => <li key={i}>{x.question_text}: <span className="text-slate-200">{String(x.user_answer)}</span></li>)}
                                        </ul>
                                    )}
                                </div>
                            )} />
                        </Section>

                        <Section title="Assistant tasks" count={Array.isArray(data.assistant_tasks) ? data.assistant_tasks.length : undefined}>
                            <Rows data={data.assistant_tasks} render={(t) => (
                                <div>
                                    <p>{t.status} <span className="text-slate-500">assistant {String(t.va_id).slice(0, 8)} - {fmt(t.created_at)}</span></p>
                                    {data.includeContent && (
                                        <details className="mt-1">
                                            <summary className="text-xs text-primary-400 cursor-pointer">Show input and output</summary>
                                            <pre className="whitespace-pre-wrap text-xs text-slate-400 mt-1">{`INPUT:\n${t.input || ''}\n\nOUTPUT:\n${t.output || ''}`}</pre>
                                        </details>
                                    )}
                                </div>
                            )} />
                        </Section>

                        <Section title="Support tickets" count={Array.isArray(data.support_tickets) ? data.support_tickets.length : undefined}>
                            <Rows data={data.support_tickets} render={(t) => <p>{t.subject || t.title || 'Ticket'} <span className="text-slate-500">{t.status} - {fmt(t.created_at)}</span></p>} />
                        </Section>

                        <Section title="Recent activity" count={Array.isArray(data.recent_activity) ? data.recent_activity.length : undefined}>
                            <Rows data={data.recent_activity} render={(a) => <p>{a.action_type} <span className="text-slate-500">{fmt(a.created_at)}</span></p>} />
                        </Section>

                        <Section title="Who has viewed this account" count={Array.isArray(data.access_history) ? data.access_history.length : undefined}>
                            <Rows data={data.access_history} empty="No earlier support views." render={(a) => <p>{fmt(a.created_at)} <span className="text-slate-500">{a.details?.reason}{a.details?.include_content ? ' (content)' : ''}</span></p>} />
                        </Section>
                    </div>
                )}
            </div>
        </div>
    );
}
