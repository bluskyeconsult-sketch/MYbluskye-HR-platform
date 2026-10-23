// src/pages/AppraisalProgressPage.jsx
// NEW (2026-10-23): an employee's own progress across appraisal rounds. Only shows what this person is allowed to see.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiCall } from '../services/appraisalApi';
import { Radar, Lines, ChartCard, C } from '../components/AppraisalCharts';
import { Loader2, TrendingUp } from 'lucide-react';

export default function AppraisalProgressPage() {
    const [d, setD] = useState(null); const [err, setErr] = useState(''); const [sel, setSel] = useState(0);
    useEffect(() => { apiCall('appr-my-history', {}, { auth: 'required' }).then(r => { setD(r); setSel(Math.max(0, (r.series || []).length - 1)); }).catch(e => setErr(e.message)); }, []);
    if (!d) return <div className="min-h-screen bg-slate-950 flex items-center justify-center">{err ? <p className="text-red-300 px-4">{err}</p> : <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />}</div>;
    const S = d.series || []; const crit = d.criteria || []; const cur = S[sel];
    const titles = crit.map(c => c.title);
    const lineSeries = [{ label: 'Final rating', color: C.a, values: S.map(s => s.overall_final) }, { label: 'My own rating', color: C.b, dash: '5 3', values: S.map(s => s.overall_self) }];
    const hasAvg = cur?.org_average && Object.keys(cur.org_average).length;
    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4"><div className="max-w-3xl mx-auto">
            <Link to="/appraisals" className="text-sm text-slate-400 hover:text-white">&larr; My appraisals</Link>
            <div className="flex items-center gap-3 mt-2 mb-2"><TrendingUp className="w-7 h-7 text-primary-400" /><h1 className="text-2xl font-bold text-white">My progress</h1></div>
            <p className="text-xs text-slate-400 mb-5">Only you can see this page. It uses your own appraisals, and it shows your supervisor&apos;s ratings only once they have been shared with you.</p>
            {!S.length && <p className="text-sm text-slate-300">Nothing to show yet. Your progress appears here after your first appraisal has been completed.</p>}
            {S.length > 0 && (<>
                <ChartCard title="Overall rating over time" subtitle="Average across all questions, on a 1 to 5 scale" table={{ head: ['Round', 'Date', 'Final', 'My own'], rows: S.map(s => [s.name, s.date || '-', s.overall_final ?? '-', s.overall_self ?? '-']) }}>
                    {S.length > 1 ? <Lines x={S.map(s => s.name)} series={lineSeries} /> : <p className="text-sm text-slate-300">One round so far: final {cur.overall_final ?? '-'}, my own {cur.overall_self ?? '-'}. A line appears after your second round.</p>}
                </ChartCard>

                <div className="mb-3 flex flex-wrap gap-2 items-center text-sm text-slate-300">Round: {S.map((s, i) => <button key={s.appraisal_id} onClick={() => setSel(i)} className={`px-3 py-1 rounded-lg ${i === sel ? 'bg-primary-600 text-white' : 'bg-slate-800'}`}>{s.name}</button>)}</div>
                {cur && (<>
                    <ChartCard title={`By question: ${cur.name}`} subtitle={hasAvg ? 'Includes the organisation average for this round (shown only because enough people were appraised).' : undefined}
                        table={{ head: ['Question', 'My own', 'Final', ...(hasAvg ? ['Organisation average'] : [])], rows: crit.map(c => [c.title, cur.self[c.id] ?? '-', cur.final[c.id] ?? '-', ...(hasAvg ? [cur.org_average[c.id] ?? '-'] : [])]) }}>
                        <Radar labels={titles} a={crit.map(c => cur.final[c.id] ?? null)} b={crit.map(c => cur.self[c.id] ?? null)} aLabel="Final rating" bLabel="My own rating" />
                    </ChartCard>
                    {S.length > 1 && <ChartCard title="Each question over time" table={{ head: ['Question', ...S.map(s => s.name)], rows: crit.map(c => [c.title, ...S.map(s => s.final[c.id] ?? '-')]) }}>
                        <Lines x={S.map(s => s.name)} series={crit.slice(0, 3).map((c, i) => ({ label: c.title, color: [C.a, C.b, C.neutral][i], dash: ['0', '5 3', '2 3'][i], values: S.map(s => s.final[c.id] ?? null) }))} />
                        {crit.length > 3 && <p className="text-xs text-slate-400 mt-1">The chart shows the first three questions; the table shows all of them.</p>}
                    </ChartCard>}
                    {cur.goals && <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4"><h3 className="text-white font-medium text-sm mb-1">Goals agreed in this round</h3><p className="text-sm text-slate-300 whitespace-pre-line">{cur.goals}</p></div>}
                    <Link to={`/appraisals/${cur.appraisal_id}`} className="text-sm text-primary-400 hover:underline">Open the full appraisal</Link>
                </>)}
            </>)}
        </div></div>
    );
}
