// src/pages/AppraisalReportsPage.jsx
// NEW (2026-10-23): reports for owners and HR admins. Filed appraisals only.
// UPDATED (2026-10-24): "Who is behind this?" - every figure can be opened to show the named people and their ratings.
// Ratings are NOT anonymous to the owner or HR admin; names are released only through a logged server call.
// Groups under five people are hidden in grouped charts only. People are listed alphabetically and never ranked.
// Nothing here is automated advice about any person.
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiCall } from '../services/appraisalApi';
import ComplianceGate from '../components/ComplianceGate';
import { ChartCard, Lines, Bars, Distribution, BandBars, Radar, NineBox, C } from '../components/AppraisalCharts';
import { Loader2, BarChart3, Download, Lock, X, Eye, Grid3x3, List, ShieldCheck } from 'lucide-react';

const LOCK = {
    criteria_analysis: 'Question-by-question analysis is part of the Employer plan.', trend: 'Trends across rounds are part of the Employer plan.',
    group_analysis: 'Team and department analysis is part of the Business plan.', supervisor_consistency: 'Supervisor consistency is part of the Business plan and is not offered in every country.',
    nine_box: 'The performance and potential grid is part of the Business plan and is not offered in every country.',
    business_review: 'The business review document is part of the Business plan.'
};
const Locked = ({ k }) => <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-xl p-4 mb-4 text-sm text-slate-400 inline-flex gap-2 w-full"><Lock className="w-4 h-4 mt-0.5 shrink-0" />{LOCK[k]} <Link to="/pricing" className="text-primary-400 underline">See plans</Link></div>;
const csvCell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };


const dl = (name, text, type = 'text/csv') => { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); };
const peopleCsv = (people, criteria) => [['Name', 'Round', 'Department', 'Supervisor', 'Overall (final)', 'Overall (self)', 'Band', ...criteria.map(c => c.title)],
    ...people.map(p => [p.name, p.cycle, p.department, p.supervisor, p.overall, p.self_overall, p.band, ...criteria.map(c => p.ratings[c.id])])].map(r => r.map(csvCell).join(',')).join('\n');
const heat = (v) => `rgba(57,135,229,${0.14 + (Number(v) - 1) * 0.2})`;
const gapText = (p) => {
    if (p.overall == null || p.self_overall == null) return null;
    const g = Math.round((p.self_overall - p.overall) * 100) / 100;
    if (Math.abs(g) < 0.25) return { t: 'Self and final ratings are close', tone: 'text-slate-300 bg-slate-800' };
    return g > 0 ? { t: `Self rating ${g} higher than final`, tone: 'text-amber-200 bg-amber-500/10' } : { t: `Self rating ${Math.abs(g)} lower than final`, tone: 'text-sky-200 bg-sky-500/10' };
};

// Side panel: the named people behind one figure. Opening it is logged on the server (see 'appr-report-people').
function PeoplePanel({ panel, onClose, bands }) {
    const [mode, setMode] = useState('list'); const [open, setOpen] = useState(null);
    useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
    useEffect(() => { setMode(panel.mapFirst ? 'map' : 'list'); setOpen(null); }, [panel]);
    const D = panel.data; const band = D && panel.lens.kind === 'band' ? bands.find(b => b.label === D.label) : null;
    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Who is behind this figure">
            <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close" onClick={onClose} />
            <div className="relative w-full max-w-xl h-full bg-slate-950 border-l border-slate-700 overflow-y-auto">
                <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 p-4 z-10">
                    <div className="flex justify-between items-start gap-3">
                        <div><div className="text-[11px] uppercase tracking-wide text-primary-400">Who is behind this?</div>
                            <h2 className="text-white font-semibold text-lg leading-tight">{panel.title}</h2>
                            {D && <div className="text-xs text-slate-400 mt-0.5">{D.people.length} {D.people.length === 1 ? 'person' : 'people'}, listed alphabetically, never ranked</div>}</div>
                        <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-200" aria-label="Close"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="mt-3 flex gap-2 text-xs items-start bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 text-emerald-100/90"><ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-300" />
                        <span>This view has been recorded in the audit trail: who opened it, when, which kind of figure and how many people. Names and ratings are not written to the log. Ratings are not anonymous to owners and HR admins, so please keep what you see here confidential.</span></div>
                    {D && D.people.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                        <div className="inline-flex rounded-lg overflow-hidden border border-slate-700 text-xs">
                            <button type="button" onClick={() => setMode('list')} className={`px-3 py-1.5 inline-flex items-center gap-1 ${mode === 'list' ? 'bg-primary-600 text-white' : 'bg-slate-900 text-slate-300'}`}><List className="w-3.5 h-3.5" />People</button>
                            <button type="button" onClick={() => setMode('map')} className={`px-3 py-1.5 inline-flex items-center gap-1 ${mode === 'map' ? 'bg-primary-600 text-white' : 'bg-slate-900 text-slate-300'}`}><Grid3x3 className="w-3.5 h-3.5" />Ratings map</button></div>
                        <button type="button" onClick={() => dl('appraisal-selection.csv', peopleCsv(D.people, D.criteria))} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" />Download this selection</button></div>}
                </div>

                <div className="p-4">
                    {panel.loading && <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 text-primary-400 animate-spin" /></div>}
                    {panel.error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{panel.error}</div>}
                    {D && D.people.length === 0 && <p className="text-sm text-slate-400">No one matches this figure.</p>}
                    {D && band && <div className="mb-4 text-sm text-slate-300 bg-slate-900 border border-slate-700 rounded-lg p-3"><b className="text-white">Before acting on this band:</b> {band.considerations}</div>}

                    {D && D.people.length > 0 && mode === 'list' && (
                        <ul className="space-y-2">{D.people.map(p => { const g = gapText(p); const isOpen = open === p.id; return (
                            <li key={p.id} className="bg-slate-900 border border-slate-700 rounded-xl">
                                <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} className="w-full text-left p-3" aria-expanded={isOpen}>
                                    <div className="flex justify-between gap-3 items-start">
                                        <div><div className="text-white font-medium text-sm">{p.name}</div>
                                            <div className="text-[11px] text-slate-400">{[p.department, p.supervisor && `Supervisor: ${p.supervisor}`, p.cycle].filter(Boolean).join('  |  ')}</div></div>
                                        <div className="text-right shrink-0"><div className="text-white text-sm font-semibold">{p.overall ?? '-'}</div><div className="text-[11px] text-slate-400">{p.band || 'Not rated'}</div></div></div>
                                    <div className="mt-2 flex items-center gap-1" aria-label="Rating for each question">{D.criteria.map(c => { const v = p.ratings[c.id]; return <span key={c.id} title={`${c.title}: ${v ?? 'not rated'}`} className="h-5 w-6 rounded text-[10px] leading-5 text-center text-white" style={{ background: v ? heat(v) : '#1e293b' }}>{v ?? '-'}</span>; })}</div>
                                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">{g && <span className={`px-2 py-0.5 rounded-full ${g.tone}`}>{g.t}</span>}{p.disagreement && <span className="px-2 py-0.5 rounded-full text-rose-200 bg-rose-500/10">Employee disagreement recorded</span>}</div>
                                </button>
                                {isOpen && <div className="border-t border-slate-800 p-3"><table className="w-full text-xs text-slate-200"><tbody>{D.criteria.map(c => <tr key={c.id} className="border-t border-slate-800 first:border-0"><td className="py-1.5 pr-2">{c.title}</td><td className="py-1.5 w-28"><div className="h-2 bg-slate-800 rounded"><div className="h-2 rounded bg-primary-500" style={{ width: `${((p.ratings[c.id] || 0) / 5) * 100}%` }} /></div></td><td className="py-1.5 w-6 text-right">{p.ratings[c.id] ?? '-'}</td></tr>)}</tbody></table>
                                    <p className="text-[11px] text-slate-400 mt-2">Overall is the weighted final rating. Check the record is complete and the employee has had the chance to respond before acting on any rating.</p></div>}
                            </li>); })}</ul>)}

                    {D && D.people.length > 0 && mode === 'map' && (
                        <div>
                            <p className="text-xs text-slate-400 mb-2">Each square is one final rating from 1 to 5; the number is printed so colour is never the only signal. Select a square to see everyone given that rating on that question.</p>
                            <div className="overflow-x-auto"><table className="text-xs text-slate-200 border-separate border-spacing-1"><thead><tr><th className="text-left font-normal text-slate-400 pr-2">Name</th>{D.criteria.map(c => <th key={c.id} className="font-normal text-slate-400 w-9 align-bottom"><div className="[writing-mode:vertical-rl] rotate-180 h-24 text-left truncate" title={c.title}>{c.title}</div></th>)}</tr></thead>
                                <tbody>{D.people.map(p => <tr key={p.id}><td className="pr-2 whitespace-nowrap">{p.name}</td>{D.criteria.map(c => { const v = p.ratings[c.id]; return <td key={c.id} className="p-0">{v ? <button type="button" onClick={() => panel.pick({ kind: 'rating', criterionId: c.id, value: Number(v) }, `${c.title}: rated ${v}`)} title={`${p.name} - ${c.title}: ${v}`} className="w-9 h-7 rounded text-white" style={{ background: heat(v) }}>{v}</button> : <span className="block w-9 h-7 rounded bg-slate-900 text-center leading-7 text-slate-500">-</span>}</td>; })}</tr>)}</tbody></table></div>
                        </div>)}
                </div>
            </div>
        </div>);
}

function ReportBody({ orgId }) {
    const [d, setD] = useState(null); const [err, setErr] = useState(''); const [cycle, setCycle] = useState(''); const [busy, setBusy] = useState(false); const [panel, setPanel] = useState(null);
    const load = useCallback(async () => { setErr(''); try { setD(await apiCall('appr-report', { orgId, cycleId: cycle || undefined }, { auth: 'required' })); } catch (e) { setErr(e.message); } }, [orgId, cycle]);
    useEffect(() => { load(); }, [load]);

    const pdf = async () => {
        setBusy(true); setErr('');
        try {
            const r = await apiCall('appr-business-review-pdf', { orgId, cycleId: cycle || undefined }, { auth: 'required' });
            const bin = atob(r.pdf_base64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' })); const a = document.createElement('a'); a.href = url; a.download = r.filename; a.click(); URL.revokeObjectURL(url);
        } catch (e) { setErr(e.message); } finally { setBusy(false); }
    };
    // Opens the named people behind a figure. The server checks the role, applies the plan and country rules, and logs the view.
    const openPeople = async (lens, title, mapFirst = false) => {
        const base = { lens, title, mapFirst, loading: true, data: null, error: '' };
        setPanel(base);
        try {
            const r = await apiCall('appr-report-people', { orgId, cycleId: cycle || undefined, lens }, { auth: 'required' });
            setPanel({ ...base, loading: false, data: r, pick: openPeople });
        } catch (e) { setPanel({ ...base, loading: false, error: e.message }); }
    };
    const csv = async () => {
        setBusy(true); setErr('');
        try { const r = await apiCall('appr-report-people', { orgId, cycleId: cycle || undefined, lens: { kind: 'all' } }, { auth: 'required' }); dl('appraisal-ratings.csv', peopleCsv(r.people, r.criteria)); }
        catch (e) { setErr(e.message); } finally { setBusy(false); }
    };
    const R = d?.report; const locked = R?.locked || [];
    return (<>
            {err && <div className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{err}</div>}

                {!d && !err && <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />}
                {d && (<>
                    {panel && <PeoplePanel panel={panel} onClose={() => setPanel(null)} bands={R.bands || []} />}
                    <div className="flex flex-wrap gap-2 items-center mb-4">
                        <select className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" value={cycle} onChange={e => setCycle(e.target.value)}><option value="">All filed appraisals</option>{d.cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <button onClick={csv} disabled={!R.n || busy} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm inline-flex items-center gap-1 disabled:opacity-40"><Download className="w-4 h-4" />Download named ratings (CSV)</button>
                        {locked.includes('business_review') ? null : <button onClick={pdf} disabled={busy || !R.n} className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm inline-flex items-center gap-1 disabled:opacity-40"><Download className="w-4 h-4" />{busy ? 'Preparing...' : 'Business review (PDF)'}</button>}
                    </div>

                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4"><h3 className="text-white font-medium text-sm mb-2">What the figures say</h3>
                        <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">{d.findings.map((f, i) => <li key={i}>{f}</li>)}</ul></div>

                    {R.n > 0 && (<>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">{[['Filed appraisals', R.n], ['Average final rating', R.overall.mean ?? '-'], ['Average self rating', R.overall.self_mean ?? '-'], ['Self minus final', R.overall.gap ?? '-']].map(([l, v]) => <div key={l} className="bg-slate-900 border border-slate-700 rounded-xl p-3"><div className="text-xs text-slate-400">{l}</div><div className="text-xl text-white font-semibold">{v}</div></div>)}</div>

                        <ChartCard title="How ratings are spread" subtitle="Number of people in each band. Select a band to see who is in it." table={{ head: ['Band', 'People', 'What to consider'], rows: R.bands.map(b => [b.label, b.count, b.considerations]) }}><BandBars bands={R.bands} onPick={(r) => openPeople({ kind: 'band', band: r.label }, `Rated ${r.label}`)} /></ChartCard>

                        {locked.includes('criteria_analysis') ? <Locked k="criteria_analysis" /> : R.by_criterion && (<>
                            <ChartCard title="Average rating by question" subtitle="Final ratings" table={{ head: ['Question', 'People', 'Final average', 'Self average', 'Self minus final'], rows: R.by_criterion.map(c => [c.title, c.n, c.mean ?? '-', c.self_mean ?? '-', c.gap ?? '-']) }}><Bars rows={R.by_criterion.map(c => ({ label: c.title, value: c.mean, n: c.n, key: c.id }))} onPick={(r) => openPeople({ kind: 'all' }, r.label, true)} /></ChartCard>
                            {R.by_criterion.length >= 3 && <ChartCard title="Self ratings compared with final ratings" table={{ head: ['Question', 'Final', 'Self'], rows: R.by_criterion.map(c => [c.title, c.mean ?? '-', c.self_mean ?? '-']) }}><Radar labels={R.by_criterion.map(c => c.title)} a={R.by_criterion.map(c => c.mean)} b={R.by_criterion.map(c => c.self_mean)} aLabel="Final (average)" bLabel="Self (average)" /></ChartCard>}
                            <ChartCard title="Rating spread for each question" subtitle="Columns show how many people were rated 1 to 5. Select a column to see who gave that rating."><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{R.by_criterion.map(c => <div key={c.id}><div className="text-xs text-slate-300 mb-1">{c.title}</div><Distribution counts={c.dist} onPick={(v) => openPeople({ kind: 'rating', criterionId: c.id, value: v }, `${c.title}: rated ${v}`)} /></div>)}</div></ChartCard>
                        </>)}

                        {locked.includes('trend') ? <Locked k="trend" /> : R.trend && R.trend.length > 1 && <ChartCard title="Average rating by round" table={{ head: ['Round', 'Date', 'People', 'Final average', 'Self average'], rows: R.trend.map(t => [t.name, t.date || '-', t.n, t.mean ?? '-', t.self_mean ?? '-']) }}>
                            <Lines x={R.trend.map(t => t.name)} series={[{ label: 'Final', color: C.a, values: R.trend.map(t => t.mean) }, { label: 'Self', color: C.b, dash: '5 3', values: R.trend.map(t => t.self_mean) }]} /></ChartCard>}

                        {locked.includes('group_analysis') ? <Locked k="group_analysis" /> : (<>
                            {[['by_department', 'Departments'], ['by_team', 'Teams (by supervisor)']].map(([k, t]) => R[k] && (
                                <ChartCard key={k} title={t} subtitle={R[k].hidden ? `${R[k].hidden} group${R[k].hidden === 1 ? '' : 's'} with fewer than five people ${R[k].hidden === 1 ? 'is' : 'are'} hidden.` : 'Average final rating'} table={{ head: ['Group', 'People', 'Final average', 'Self average'], rows: R[k].groups.map(g => [g.name, g.n, g.mean ?? '-', g.self_mean ?? '-']) }}>
                                    {R[k].groups.length ? <Bars rows={R[k].groups.map(g => ({ label: g.name, value: g.mean, n: g.n }))} onPick={(r) => openPeople({ kind: k === 'by_department' ? 'department' : 'team', name: r.label }, r.label)} /> : <p className="text-sm text-slate-400">No group has five or more people yet.</p>}</ChartCard>))}
                            {R.supervisor_consistency && <ChartCard title="Supervisor consistency" subtitle="A prompt for calibration conversations. It is not a judgement of any supervisor." table={{ head: ['Supervisor', 'People', 'Average given', 'Share rated 4 or above'], rows: R.supervisor_consistency.items.map(s => [s.name, s.n, s.mean ?? '-', `${Math.round(s.pct_high * 100)}%`]) }}>
                                {R.supervisor_consistency.items.length ? <Bars rows={R.supervisor_consistency.items.map(s => ({ label: s.name, value: s.mean, n: s.n }))} onPick={(r) => openPeople({ kind: 'team', name: r.label }, `Team of ${r.label}`)} /> : <p className="text-sm text-slate-400">No supervisor has five or more people yet.</p>}
                                <p className="text-xs text-slate-400 mt-2">Organisation average: {R.supervisor_consistency.org_mean ?? '-'}. Differences can reflect real differences in teams as well as differences in how supervisors rate.</p></ChartCard>}
                        </>)}

                        {locked.includes('nine_box') ? <Locked k="nine_box" /> : R.nine_box && (R.nine_box.hidden
                            ? <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4 text-sm text-slate-300"><b className="text-white">Performance and potential.</b> Only {R.nine_box.rated} filed appraisal{R.nine_box.rated === 1 ? ' has' : 's have'} a potential rating. The grid appears once at least {R.nine_box.min_group} do, so that a chart alone cannot point to one person. To collect potential ratings, tick the potential option on the question set you use.</div>
                            : <ChartCard title="Performance and potential (nine-box)" subtitle={`${R.nine_box.rated} people rated. Performance is the weighted final rating. Potential is the supervisor's view. Select a box to see who is in it. A prompt for conversation, never a decision.${R.nine_box.unrated ? ` ${R.nine_box.unrated} without a potential rating are not shown.` : ''}`}
                                table={{ head: ['Box', 'People', 'What to consider'], rows: R.nine_box.cells.map(c => [c.label, c.count, c.considerations]) }}><NineBox cells={R.nine_box.cells} onPick={(c) => openPeople({ kind: 'ninebox', perf: c.perf, pot: c.pot }, c.label)} /></ChartCard>)}

                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4">
                            <h3 className="text-white font-medium text-sm mb-1 inline-flex items-center gap-2"><Eye className="w-4 h-4 text-primary-400" />Behind the figures</h3>
                            <p className="text-xs text-slate-400 mb-3">Every chart above can be opened: select a band, a column, a bar or a box to see the named people and their ratings. Or open everyone at once. Each time you open named ratings it is recorded in the audit trail.</p>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => openPeople({ kind: 'all' }, 'Everyone with a filed appraisal')} className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm inline-flex items-center gap-1"><List className="w-4 h-4" />Open the full list ({R.n})</button>
                                <button type="button" onClick={() => openPeople({ kind: 'all' }, 'Ratings map', true)} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm inline-flex items-center gap-1"><Grid3x3 className="w-4 h-4" />Open the ratings map</button></div></div>

                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4"><h3 className="text-white font-medium text-sm mb-2">Using ratings fairly: a decision guide</h3>
                            <p className="text-xs text-slate-400 mb-2">General guidance for the conversation, not a recommendation about any person.</p>
                            <ul className="space-y-2 text-sm text-slate-300">{R.bands.map(b => <li key={b.key}><b className="text-white">{b.label}:</b> {b.considerations}</li>)}</ul>
                            <p className="text-xs text-slate-400 mt-3">Before acting on any rating: check the record is complete, check the employee has had the chance to respond, look for patterns that could be unfair to a group of people, and follow your own procedures and local law.</p></div>
                        {locked.includes('business_review') && <Locked k="business_review" />}
                    </>)}
                </>)}
            
    </>);
}

export default function AppraisalReportsPage() {
    const { orgId } = useParams();
    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4"><div className="max-w-4xl mx-auto">
            <Link to={`/appraisals/org/${orgId}`} className="text-sm text-slate-400 hover:text-white">&larr; Organisation</Link>
            <div className="flex items-center gap-3 mt-2 mb-2"><BarChart3 className="w-7 h-7 text-primary-400" /><h1 className="text-2xl font-bold text-white">Appraisal reports</h1></div>
            <p className="text-xs text-slate-400 mb-2">Based on filed appraisals only. Charts that group people hide any group of fewer than five, so a chart alone cannot point at one person. That is not anonymity: ratings in an appraisal are attributed to the person rated, and you, as owner or HR admin, can open the named ratings behind any figure. People are listed alphabetically, never ranked. These figures describe the ratings people were given. They are not advice about any person, and no decision about pay, promotion or dismissal should rest on them alone.</p>
            <p className="text-xs text-emerald-200/90 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 mb-4 inline-flex gap-2 w-full"><ShieldCheck className="w-4 h-4 shrink-0 text-emerald-300" />Every time named ratings are opened, the audit trail records who opened them, when, which kind of figure and how many people. It does not record names or ratings.</p>
            <ComplianceGate service="appraisal_analytics" orgId={orgId} canAct><ReportBody orgId={orgId} /></ComplianceGate>
        </div></div>
    );
}
