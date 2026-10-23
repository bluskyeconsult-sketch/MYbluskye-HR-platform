// src/pages/AppraisalReportsPage.jsx
// NEW (2026-10-23): reports for owners and HR admins. Filed appraisals only. Groups under five people are hidden.
// People are listed alphabetically and never ranked. Nothing here is automated advice about any person.
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiCall } from '../services/appraisalApi';
import ComplianceGate from '../components/ComplianceGate';
import { ChartCard, Lines, Bars, Distribution, BandBars, Radar, C } from '../components/AppraisalCharts';
import { Loader2, BarChart3, Download, Lock } from 'lucide-react';

const LOCK = {
    criteria_analysis: 'Question-by-question analysis is part of the Employer plan.', trend: 'Trends across rounds are part of the Employer plan.',
    group_analysis: 'Team and department analysis is part of the Business plan.', supervisor_consistency: 'Supervisor consistency is part of the Business plan and is not offered in every country.',
    business_review: 'The business review document is part of the Business plan.'
};
const Locked = ({ k }) => <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-xl p-4 mb-4 text-sm text-slate-400 inline-flex gap-2 w-full"><Lock className="w-4 h-4 mt-0.5 shrink-0" />{LOCK[k]} <Link to="/pricing" className="text-primary-400 underline">See plans</Link></div>;
const csvCell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };

function ReportBody({ orgId }) {
    const [d, setD] = useState(null); const [err, setErr] = useState(''); const [cycle, setCycle] = useState(''); const [busy, setBusy] = useState(false);
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
    const csv = () => {
        const R = d.report; const head = ['Name', 'Round', 'Department', 'Supervisor', 'Overall (final)', 'Overall (self)', 'Band', ...R.criteria.map(c => c.title)];
        const lines = [head, ...R.individuals.map(p => [p.name, p.cycle, p.department, p.supervisor, p.overall, p.self_overall, p.band, ...R.criteria.map(c => p.ratings[c.id])])].map(r => r.map(csvCell).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([lines], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'appraisal-ratings.csv'; a.click(); URL.revokeObjectURL(url);
    };

    const R = d?.report; const locked = R?.locked || [];
    return (<>
            {err && <div className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{err}</div>}

                {!d && !err && <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />}
                {d && (<>
                    <div className="flex flex-wrap gap-2 items-center mb-4">
                        <select className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" value={cycle} onChange={e => setCycle(e.target.value)}><option value="">All filed appraisals</option>{d.cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <button onClick={csv} disabled={!R.n} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm inline-flex items-center gap-1 disabled:opacity-40"><Download className="w-4 h-4" />Download ratings (CSV)</button>
                        {locked.includes('business_review') ? null : <button onClick={pdf} disabled={busy || !R.n} className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm inline-flex items-center gap-1 disabled:opacity-40"><Download className="w-4 h-4" />{busy ? 'Preparing...' : 'Business review (PDF)'}</button>}
                    </div>

                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4"><h3 className="text-white font-medium text-sm mb-2">What the figures say</h3>
                        <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">{d.findings.map((f, i) => <li key={i}>{f}</li>)}</ul></div>

                    {R.n > 0 && (<>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">{[['Filed appraisals', R.n], ['Average final rating', R.overall.mean ?? '-'], ['Average self rating', R.overall.self_mean ?? '-'], ['Self minus final', R.overall.gap ?? '-']].map(([l, v]) => <div key={l} className="bg-slate-900 border border-slate-700 rounded-xl p-3"><div className="text-xs text-slate-400">{l}</div><div className="text-xl text-white font-semibold">{v}</div></div>)}</div>

                        <ChartCard title="How ratings are spread" subtitle="Number of people in each band" table={{ head: ['Band', 'People', 'What to consider'], rows: R.bands.map(b => [b.label, b.count, b.considerations]) }}><BandBars bands={R.bands} /></ChartCard>

                        {locked.includes('criteria_analysis') ? <Locked k="criteria_analysis" /> : R.by_criterion && (<>
                            <ChartCard title="Average rating by question" subtitle="Final ratings" table={{ head: ['Question', 'People', 'Final average', 'Self average', 'Self minus final'], rows: R.by_criterion.map(c => [c.title, c.n, c.mean ?? '-', c.self_mean ?? '-', c.gap ?? '-']) }}><Bars rows={R.by_criterion.map(c => ({ label: c.title, value: c.mean, n: c.n }))} /></ChartCard>
                            {R.by_criterion.length >= 3 && <ChartCard title="Self ratings compared with final ratings" table={{ head: ['Question', 'Final', 'Self'], rows: R.by_criterion.map(c => [c.title, c.mean ?? '-', c.self_mean ?? '-']) }}><Radar labels={R.by_criterion.map(c => c.title)} a={R.by_criterion.map(c => c.mean)} b={R.by_criterion.map(c => c.self_mean)} aLabel="Final (average)" bLabel="Self (average)" /></ChartCard>}
                            <ChartCard title="Rating spread for each question" subtitle="Columns show how many people were rated 1 to 5"><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{R.by_criterion.map(c => <div key={c.id}><div className="text-xs text-slate-300 mb-1">{c.title}</div><Distribution counts={c.dist} /></div>)}</div></ChartCard>
                        </>)}

                        {locked.includes('trend') ? <Locked k="trend" /> : R.trend && R.trend.length > 1 && <ChartCard title="Average rating by round" table={{ head: ['Round', 'Date', 'People', 'Final average', 'Self average'], rows: R.trend.map(t => [t.name, t.date || '-', t.n, t.mean ?? '-', t.self_mean ?? '-']) }}>
                            <Lines x={R.trend.map(t => t.name)} series={[{ label: 'Final', color: C.a, values: R.trend.map(t => t.mean) }, { label: 'Self', color: C.b, dash: '5 3', values: R.trend.map(t => t.self_mean) }]} /></ChartCard>}

                        {locked.includes('group_analysis') ? <Locked k="group_analysis" /> : (<>
                            {[['by_department', 'Departments'], ['by_team', 'Teams (by supervisor)']].map(([k, t]) => R[k] && (
                                <ChartCard key={k} title={t} subtitle={R[k].hidden ? `${R[k].hidden} group${R[k].hidden === 1 ? '' : 's'} with fewer than five people ${R[k].hidden === 1 ? 'is' : 'are'} hidden.` : 'Average final rating'} table={{ head: ['Group', 'People', 'Final average', 'Self average'], rows: R[k].groups.map(g => [g.name, g.n, g.mean ?? '-', g.self_mean ?? '-']) }}>
                                    {R[k].groups.length ? <Bars rows={R[k].groups.map(g => ({ label: g.name, value: g.mean, n: g.n }))} /> : <p className="text-sm text-slate-400">No group has five or more people yet.</p>}</ChartCard>))}
                            {R.supervisor_consistency && <ChartCard title="Supervisor consistency" subtitle="A prompt for calibration conversations. It is not a judgement of any supervisor." table={{ head: ['Supervisor', 'People', 'Average given', 'Share rated 4 or above'], rows: R.supervisor_consistency.items.map(s => [s.name, s.n, s.mean ?? '-', `${Math.round(s.pct_high * 100)}%`]) }}>
                                {R.supervisor_consistency.items.length ? <Bars rows={R.supervisor_consistency.items.map(s => ({ label: s.name, value: s.mean, n: s.n }))} /> : <p className="text-sm text-slate-400">No supervisor has five or more people yet.</p>}
                                <p className="text-xs text-slate-400 mt-2">Organisation average: {R.supervisor_consistency.org_mean ?? '-'}. Differences can reflect real differences in teams as well as differences in how supervisors rate.</p></ChartCard>}
                        </>)}

                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4"><h3 className="text-white font-medium text-sm mb-2">Everyone (alphabetical)</h3>
                            <div className="overflow-x-auto"><table className="w-full text-xs text-slate-200"><thead><tr className="text-left text-slate-400"><th className="p-1.5">Name</th><th>Round</th><th>Final</th><th>Self</th><th>Band</th><th></th></tr></thead>
                                <tbody>{R.individuals.map(p => <tr key={p.id} className="border-t border-slate-800"><td className="p-1.5">{p.name}</td><td>{p.cycle}</td><td>{p.overall ?? '-'}</td><td>{p.self_overall ?? '-'}</td><td>{p.band}</td><td>{p.disagreement ? 'disagreement recorded' : ''}</td></tr>)}</tbody></table></div></div>

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
            <p className="text-xs text-slate-400 mb-4">Based on filed appraisals only. Groups with fewer than five people are hidden so no individual can be picked out. People are listed alphabetically, never ranked. These figures describe the ratings people were given. They are not advice about any person, and no decision about pay, promotion or dismissal should rest on them alone.</p>
            <ComplianceGate service="appraisal_analytics" orgId={orgId} canAct><ReportBody orgId={orgId} /></ComplianceGate>
        </div></div>
    );
}
