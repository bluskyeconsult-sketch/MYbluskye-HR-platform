// src/pages/CareerCoachPage.jsx
// NEW (2026-10-10): Career Coach - desired-job goal, skills-gap review, job
// matches and application drafts.
//
// CONSENT RULES (enforced by the server on every request, not just here):
//  - Nothing is used or sent until the user clicks "Yes, turn on".
//  - "No thanks" keeps every Career Coach feature off; the rest of ODUSBABA is unaffected.
//  - "Turn off and delete my data" withdraws consent and deletes saved coach data.
// Nothing is ever submitted to an employer: the user reviews drafts and applies themselves.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { COACH_CONSENT_TEXT } from '../services/careerCoachService';
import { Compass, ShieldCheck, Loader2, AlertTriangle, ExternalLink, Copy, Check, Target, BarChart3, Briefcase, ClipboardList, Trash2 } from 'lucide-react';

const COUNTRY_OPTIONS = [
    ['AU', 'Australia'], ['NZ', 'New Zealand'], ['GB', 'United Kingdom'], ['IE', 'Ireland'], ['CA', 'Canada'],
    ['US', 'United States'], ['DE', 'Germany'], ['AE', 'UAE'], ['ZA', 'South Africa'], ['NG', 'Nigeria']
];
const STATUSES = ['prepared', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'];

async function coachFetch(action, body = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw Object.assign(new Error('Please sign in.'), { status: 401 });
    const res = await fetch(`/api/index?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw Object.assign(new Error(json.error || 'Something went wrong.'), { status: res.status, code: json.code });
    return json;
}

function CopyButton({ text }) {
    const [done, setDone] = useState(false);
    return (
        <button onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">
            {done ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{done ? 'Copied' : 'Copy'}
        </button>
    );
}

export default function CareerCoachPage() {
    const [loading, setLoading] = useState(true);
    const [consent, setConsent] = useState(null);   // {status, granted, versionCurrent}
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [tab, setTab] = useState('goal');
    const [goalForm, setGoalForm] = useState({ roles: '', countries: [], needs_sponsorship: false, settlement_goal: false, work_mode: 'any', min_salary: '', experience_summary: '', cv_text: '' });
    const [hasGoal, setHasGoal] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [matches, setMatches] = useState(null);
    const [searched, setSearched] = useState(0);
    const [pack, setPack] = useState(null);
    const [apps, setApps] = useState([]);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const r = await coachFetch('career-coach-status');
            setConsent(r.consent);
            if (r.goal) {
                setHasGoal(true);
                setGoalForm({
                    roles: (r.goal.target_roles || []).join(', '), countries: r.goal.target_countries || [],
                    needs_sponsorship: !!r.goal.needs_sponsorship, settlement_goal: !!r.goal.settlement_goal,
                    work_mode: r.goal.work_mode || 'any', min_salary: r.goal.min_salary || '',
                    experience_summary: r.goal.experience_summary || '', cv_text: r.goal.cv_text || ''
                });
            }
        } catch (e) {
            setError(e.status === 401 ? 'Please sign in to use Career Coach.' : e.message);
        } finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    async function choose(decision) {
        setBusy('consent'); setError('');
        try { await coachFetch('career-coach-consent', { decision }); await load(); }
        catch (e) { setError(e.message); } finally { setBusy(''); }
    }

    async function withdraw() {
        if (!window.confirm('Turn off Career Coach and permanently delete your saved job goal, CV text, reviews, drafts and tracker entries?')) return;
        setBusy('withdraw'); setError('');
        try {
            await coachFetch('career-coach-withdraw');
            setHasGoal(false); setAnalysis(null); setMatches(null); setPack(null); setApps([]);
            setGoalForm({ roles: '', countries: [], needs_sponsorship: false, settlement_goal: false, work_mode: 'any', min_salary: '', experience_summary: '', cv_text: '' });
            await load();
        } catch (e) { setError(e.message); await load(); } finally { setBusy(''); }
    }

    // Any call can find consent switched off (e.g. withdrawn in another tab).
    function handleError(e) {
        if (e.code === 'consent_required') { load(); return; }
        setError(e.message);
    }

    async function saveGoal() {
        setBusy('goal'); setError('');
        try {
            await coachFetch('career-coach-save-goal', {
                target_roles: goalForm.roles.split(',').map(s => s.trim()).filter(Boolean),
                target_countries: goalForm.countries, needs_sponsorship: goalForm.needs_sponsorship, settlement_goal: goalForm.settlement_goal,
                work_mode: goalForm.work_mode, min_salary: goalForm.min_salary, experience_summary: goalForm.experience_summary, cv_text: goalForm.cv_text
            });
            setHasGoal(true); setMatches(null); setAnalysis(null);
            setTab('gaps');
        } catch (e) { handleError(e); } finally { setBusy(''); }
    }

    async function runAnalysis() {
        setBusy('analyse'); setError('');
        try { const r = await coachFetch('career-coach-analyse'); setAnalysis(r.analysis); }
        catch (e) { handleError(e); } finally { setBusy(''); }
    }

    async function findMatches() {
        setBusy('matches'); setError('');
        try { const r = await coachFetch('career-coach-matches'); setMatches(r.matches); setSearched(r.searched); }
        catch (e) { handleError(e); } finally { setBusy(''); }
    }

    async function makePack(job) {
        setBusy(`pack-${job.id}`); setError('');
        try {
            const r = await coachFetch('career-coach-pack', { jobSource: job.job_source, jobId: job.id });
            setPack({ ...r, job });
            setTab('pack');
        } catch (e) { handleError(e); } finally { setBusy(''); }
    }

    async function loadApps() {
        setBusy('apps'); setError('');
        try { const r = await coachFetch('career-coach-applications'); setApps(r.applications); }
        catch (e) { handleError(e); } finally { setBusy(''); }
    }

    async function updateApp(id, patch) {
        try { await coachFetch('career-coach-application-update', { id, ...patch }); await loadApps(); }
        catch (e) { handleError(e); }
    }

    useEffect(() => { if (consent?.granted && tab === 'tracker') loadApps(); /* eslint-disable-next-line */ }, [tab, consent?.granted]);

    // ---------- render ----------
    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /></div>;

    if (!consent) {
        return (
            <div className="min-h-screen bg-slate-950 py-16 px-4"><div className="max-w-xl mx-auto text-center text-slate-300">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p>{error || 'Career Coach could not load.'}</p>
                <Link to="/sign-in?redirect=/career-coach" className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Sign in</Link>
            </div></div>
        );
    }

    if (!consent.granted) {
        const declined = consent.status === 'declined' || consent.status === 'withdrawn';
        return (
            <div className="min-h-screen bg-slate-950 py-12 px-4">
                <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary-500/20 rounded-lg"><Compass className="w-6 h-6 text-primary-400" /></div>
                        <h1 className="text-2xl font-bold text-white">Career Coach</h1>
                    </div>
                    <p className="text-slate-300 mb-5">Tell ODUSBABA the job you want. It reviews your skills against it, finds matching jobs (including sponsorship and settlement roles) and drafts your application for you to check and send.</p>
                    {declined && <p className="mb-4 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">Career Coach is switched off for your account. Your information is not being used for it. Everything else on ODUSBABA works as normal. You can turn it on below whenever you like.</p>}
                    {!consent.versionCurrent && consent.status === 'granted' && <p className="mb-4 text-sm text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-lg p-3">The wording below has changed since you agreed, so we are asking again.</p>}
                    <div className="border border-slate-700 rounded-xl p-5 bg-slate-950/50">
                        <h2 className="text-white font-semibold flex items-center gap-2 mb-2"><ShieldCheck className="w-5 h-5 text-emerald-400" />{COACH_CONSENT_TEXT.title}</h2>
                        <p className="text-slate-300 text-sm mb-3">{COACH_CONSENT_TEXT.intro}</p>
                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">What is used</p>
                        <ul className="list-disc ml-5 text-sm text-slate-300 mb-3 space-y-1">{COACH_CONSENT_TEXT.uses.map(u => <li key={u}>{u}</li>)}</ul>
                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">How it is used</p>
                        <ul className="list-disc ml-5 text-sm text-slate-300 mb-3 space-y-1">{COACH_CONSENT_TEXT.how.map(u => <li key={u}>{u}</li>)}</ul>
                        <p className="text-sm text-slate-300">{COACH_CONSENT_TEXT.rights}</p>
                    </div>
                    {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                    <div className="flex flex-wrap gap-3 mt-6">
                        <button disabled={!!busy} onClick={() => choose('granted')} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50">
                            {busy === 'consent' ? 'Saving...' : 'Yes, turn on Career Coach'}
                        </button>
                        {!declined && <button disabled={!!busy} onClick={() => choose('declined')} className="px-5 py-2.5 border border-slate-600 text-slate-300 hover:text-white rounded-lg">No thanks</button>}
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        ['goal', 'My goal', Target], ['gaps', 'Skills gap', BarChart3], ['matches', 'Matches', Briefcase], ['pack', 'Application draft', ClipboardList], ['tracker', 'Tracker', ClipboardList]
    ];
    const input = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500';

    return (
        <div className="min-h-screen bg-slate-950 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-500/20 rounded-lg"><Compass className="w-6 h-6 text-primary-400" /></div>
                        <div><h1 className="text-2xl font-bold text-white">Career Coach</h1><p className="text-slate-400 text-sm">You review everything and apply yourself. Nothing is sent to employers for you.</p></div>
                    </div>
                    <button onClick={withdraw} disabled={!!busy} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-400"><Trash2 className="w-3 h-3" />Turn off and delete my data</button>
                </div>

                <div className="flex gap-1 overflow-x-auto border-b border-slate-800 mb-6">
                    {tabs.map(([id, label, Icon]) => (
                        <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 text-sm whitespace-nowrap inline-flex items-center gap-1.5 border-b-2 ${tab === id ? 'border-primary-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
                            <Icon className="w-4 h-4" />{label}
                        </button>
                    ))}
                </div>
                {error && <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</p>}

                {tab === 'goal' && (
                    <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div><label className="block text-sm text-slate-300 mb-1">Jobs you want (separate with commas, up to 5)</label>
                            <input className={input} value={goalForm.roles} onChange={e => setGoalForm({ ...goalForm, roles: e.target.value })} placeholder="e.g. HR manager, recruitment consultant" /></div>
                        <div><label className="block text-sm text-slate-300 mb-1">Countries (up to 5)</label>
                            <div className="flex flex-wrap gap-2">{COUNTRY_OPTIONS.map(([code, name]) => {
                                const on = goalForm.countries.includes(code);
                                return <button key={code} type="button" onClick={() => setGoalForm({ ...goalForm, countries: on ? goalForm.countries.filter(c => c !== code) : [...goalForm.countries, code].slice(0, 5) })}
                                    className={`px-3 py-1 rounded-full text-xs border ${on ? 'bg-primary-600 border-primary-500 text-white' : 'border-slate-600 text-slate-300'}`}>{name}</button>;
                            })}</div></div>
                        <div className="flex flex-wrap gap-5 text-sm text-slate-300">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={goalForm.needs_sponsorship} onChange={e => setGoalForm({ ...goalForm, needs_sponsorship: e.target.checked })} />I need visa sponsorship</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={goalForm.settlement_goal} onChange={e => setGoalForm({ ...goalForm, settlement_goal: e.target.checked })} />I want a route to settle (PR)</label>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className="block text-sm text-slate-300 mb-1">Work style</label>
                                <select className={input} value={goalForm.work_mode} onChange={e => setGoalForm({ ...goalForm, work_mode: e.target.value })}>
                                    <option value="any">Any</option><option value="onsite">On site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select></div>
                            <div><label className="block text-sm text-slate-300 mb-1">Minimum salary (optional)</label>
                                <input className={input} value={goalForm.min_salary} onChange={e => setGoalForm({ ...goalForm, min_salary: e.target.value })} placeholder="e.g. 45,000 a year" /></div>
                        </div>
                        <div><label className="block text-sm text-slate-300 mb-1">Your experience in a few lines (true facts only)</label>
                            <textarea rows={4} className={input} value={goalForm.experience_summary} onChange={e => setGoalForm({ ...goalForm, experience_summary: e.target.value })} /></div>
                        <div><label className="block text-sm text-slate-300 mb-1">Paste your CV text (needed for application drafts)</label>
                            <textarea rows={8} className={input} value={goalForm.cv_text} onChange={e => setGoalForm({ ...goalForm, cv_text: e.target.value })} placeholder="Copy and paste the text of your CV here" />
                            <p className="text-xs text-slate-500 mt-1">Only what you paste here is used. Remove anything you do not want processed, such as ID numbers or home address.</p></div>
                        <button onClick={saveGoal} disabled={!!busy || !goalForm.roles.trim()} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">{busy === 'goal' ? 'Saving...' : 'Save my goal'}</button>
                    </div>
                )}

                {tab === 'gaps' && (
                    <div className="space-y-4">
                        {!hasGoal ? <p className="text-slate-400 text-sm">Save your goal first.</p> : (
                            <>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button onClick={runAnalysis} disabled={!!busy} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">{busy === 'analyse' ? 'Reviewing...' : 'Review my skills against my goal (1 credit)'}</button>
                                    <Link to="/assessments" className="text-sm text-primary-400 hover:underline">Take an assessment</Link>
                                    <Link to="/skills" className="text-sm text-primary-400 hover:underline">Add skills</Link>
                                </div>
                                {analysis && (
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-sm text-slate-300">
                                        <p className="text-white">{analysis.summary} <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Readiness: {analysis.readiness}</span></p>
                                        {analysis.strengths?.length > 0 && <div><h3 className="text-emerald-400 font-semibold mb-1">Strengths</h3><ul className="list-disc ml-5 space-y-1">{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                                        {analysis.gaps?.length > 0 && <div><h3 className="text-amber-400 font-semibold mb-1">Gaps</h3><ul className="space-y-2">{analysis.gaps.map((g, i) => <li key={i} className="border border-slate-800 rounded-lg p-3"><p className="text-white">{g.gap}</p><p className="text-slate-400">{g.why_it_matters}</p><p>{g.how_to_close}</p></li>)}</ul></div>}
                                        {analysis.next_steps?.length > 0 && <div><h3 className="text-sky-400 font-semibold mb-1">Next steps</h3><ol className="list-decimal ml-5 space-y-1">{analysis.next_steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
                                        {analysis.courses?.length > 0 && <div><h3 className="text-white font-semibold mb-1">Courses on ODUSBABA that may help</h3><ul className="space-y-1">{analysis.courses.map(c => <li key={c.id}><Link className="text-primary-400 hover:underline" to={`/courses/${c.id}`}>{c.title}</Link></li>)}</ul></div>}
                                        {analysis.visa_note && <p className="text-xs text-slate-500">{analysis.visa_note} See <Link className="underline" to="/visa-pathways">Visa Pathways</Link>.</p>}
                                        <p className="text-xs text-slate-500">AI-generated guidance. Check it against your own records.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {tab === 'matches' && (
                    <div className="space-y-4">
                        {!hasGoal ? <p className="text-slate-400 text-sm">Save your goal first.</p> : (
                            <>
                                <button onClick={findMatches} disabled={!!busy} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">{busy === 'matches' ? 'Searching...' : 'Find matching jobs (free)'}</button>
                                {matches && matches.length === 0 && <p className="text-slate-400 text-sm">No strong matches among {searched} recent listings. Try wider job titles or more countries.</p>}
                                {matches && matches.map(m => (
                                    <div key={`${m.job_source}-${m.id}`} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                        <div className="flex justify-between gap-3 flex-wrap">
                                            <div><p className="text-white font-semibold">{m.title}</p><p className="text-slate-400 text-sm">{[m.company, m.location, m.salary_range].filter(Boolean).join(' · ')}</p></div>
                                            <span className="h-fit px-2.5 py-1 rounded-full text-xs bg-primary-500/20 text-primary-300">{m.score}% match</span>
                                        </div>
                                        <ul className="mt-2 text-xs text-emerald-400 space-y-0.5">{m.reasons.map((r, i) => <li key={i}>+ {r}</li>)}</ul>
                                        <ul className="mt-1 text-xs text-amber-400 space-y-0.5">{m.cautions.map((r, i) => <li key={i}>! {r}</li>)}</ul>
                                        {m.unreviewed && <p className="mt-2 text-xs text-slate-500">Listing from another website, not reviewed by ODUSBABA. Check the employer is genuine before you apply or share documents.</p>}
                                        <div className="mt-3 flex flex-wrap gap-3 items-center">
                                            <button onClick={() => makePack(m)} disabled={!!busy} className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs disabled:opacity-50">{busy === `pack-${m.id}` ? 'Preparing...' : 'Prepare my application (2 credits)'}</button>
                                            {m.apply_url && <a href={m.apply_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white">View listing <ExternalLink className="w-3 h-3" /></a>}
                                            {m.job_source === 'board' && !m.apply_url && <Link to={`/jobs/${m.id}`} className="text-xs text-slate-300 hover:text-white">View on ODUSBABA</Link>}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {tab === 'pack' && (
                    <div className="space-y-4">
                        {!pack ? <p className="text-slate-400 text-sm">Pick a job under Matches and choose "Prepare my application".</p> : (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 text-sm text-slate-300">
                                <h2 className="text-white font-semibold text-lg">{pack.job.title}{pack.job.company ? ` - ${pack.job.company}` : ''}</h2>
                                <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">This is an AI draft. Read every line and remove anything that is not true before you use it.</p>
                                {pack.flags?.map((f, i) => <p key={i} className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{f}</p>)}
                                <div><div className="flex justify-between"><h3 className="text-white font-semibold">Cover letter</h3><CopyButton text={pack.pack.cover_letter} /></div><p className="whitespace-pre-wrap mt-1">{pack.pack.cover_letter}</p></div>
                                <div><div className="flex justify-between"><h3 className="text-white font-semibold">CV summary</h3><CopyButton text={pack.pack.cv_summary || ''} /></div><p className="mt-1">{pack.pack.cv_summary}</p></div>
                                {pack.pack.cv_bullets?.length > 0 && <div><div className="flex justify-between"><h3 className="text-white font-semibold">CV bullets</h3><CopyButton text={pack.pack.cv_bullets.join('\n')} /></div><ul className="list-disc ml-5 mt-1 space-y-1">{pack.pack.cv_bullets.map((b, i) => <li key={i}>{b}</li>)}</ul></div>}
                                {pack.pack.gaps_to_be_honest_about?.length > 0 && <div><h3 className="text-amber-400 font-semibold">Be honest about</h3><ul className="list-disc ml-5 mt-1 space-y-1">{pack.pack.gaps_to_be_honest_about.map((b, i) => <li key={i}>{b}</li>)}</ul></div>}
                                {pack.pack.interview_questions?.length > 0 && <div><h3 className="text-white font-semibold">Interview practice</h3><ul className="space-y-2 mt-1">{pack.pack.interview_questions.map((q, i) => <li key={i} className="border border-slate-800 rounded-lg p-3"><p className="text-white">{q.question}</p><p className="text-slate-400">{q.answer_outline}</p></li>)}</ul></div>}
                                {pack.pack.checklist?.length > 0 && <div><h3 className="text-white font-semibold">Before you apply</h3><ul className="list-disc ml-5 mt-1 space-y-1">{pack.pack.checklist.map((b, i) => <li key={i}>{b}</li>)}</ul></div>}
                                <div className="flex flex-wrap gap-3 pt-2">
                                    {pack.applyUrl && <a href={pack.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm">Open the employer's page <ExternalLink className="w-4 h-4" /></a>}
                                    {pack.onPlatform && <Link to={`/jobs/${pack.jobId}`} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm">Apply on ODUSBABA</Link>}
                                    <button onClick={() => setTab('tracker')} className="px-4 py-2 border border-slate-600 text-slate-300 hover:text-white rounded-lg text-sm">Saved in Tracker</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'tracker' && (
                    <div className="space-y-3">
                        {busy === 'apps' && <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />}
                        {apps.length === 0 && busy !== 'apps' && <p className="text-slate-400 text-sm">No applications yet. Prepared applications appear here. Remember to change the status to "applied" after you apply.</p>}
                        {apps.map(a => (
                            <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm">
                                <div className="flex justify-between flex-wrap gap-2">
                                    <div><p className="text-white font-semibold">{a.title}</p><p className="text-slate-400">{a.company}</p></div>
                                    <select value={a.status} onChange={e => updateApp(a.id, { status: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                </div>
                                <div className="mt-3 grid md:grid-cols-2 gap-3">
                                    <input defaultValue={a.notes || ''} onBlur={e => e.target.value !== (a.notes || '') && updateApp(a.id, { notes: e.target.value })} placeholder="Notes" className={input} />
                                    <input type="date" defaultValue={a.follow_up_at || ''} onChange={e => updateApp(a.id, { follow_up_at: e.target.value })} className={input} title="Follow-up date" />
                                </div>
                                {a.apply_url && <a href={a.apply_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-slate-300 hover:text-white">Listing <ExternalLink className="w-3 h-3" /></a>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
