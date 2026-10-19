// src/components/LessonVisuals.jsx
//
// NEW (2026-10-19): draws charts, formulas and diagrams from DATA, so numbers on screen are
// exactly the numbers in the lesson (an image model is never asked to draw them).
//   chart    -> Recharts      formula -> KaTeX      diagram -> Mermaid (loaded only when used)
// Loaded lazily by RichBlocks, so lessons without these blocks do not download the libraries.
// Every part fails soft: bad data shows a quiet note instead of breaking the lesson.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const COLOURS = ['#2dd4bf', '#60a5fa', '#f59e0b', '#f472b6', '#a78bfa', '#34d399', '#fb7185', '#facc15', '#38bdf8', '#c084fc', '#4ade80', '#fb923c'];

function Note({ children }) {
    return <div className="my-6 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3 text-sm text-slate-400">{children}</div>;
}

export function parseChart(raw) {
    try {
        const j = JSON.parse(raw);
        if (!['bar', 'line', 'pie', 'area'].includes(j.type)) return null;
        if (!Array.isArray(j.labels) || !Array.isArray(j.series) || !j.series.length) return null;
        for (const s of j.series) {
            if (!Array.isArray(s.values) || s.values.length !== j.labels.length) return null;
            if (s.values.some(v => typeof v !== 'number' || !Number.isFinite(v))) return null;
        }
        return j;
    } catch (e) { return null; }
}

export function ChartBlock({ title, raw }) {
    const spec = useMemo(() => parseChart(raw), [raw]);
    if (!spec) return <Note>This chart could not be displayed.</Note>;
    const unit = spec.unit ? String(spec.unit) : '';
    const fmt = v => `${v}${unit === '%' ? '%' : unit ? ' ' + unit : ''}`;
    const rows = spec.labels.map((l, i) => {
        const r = { label: String(l) };
        spec.series.forEach((s, k) => { r['s' + k] = s.values[i]; });
        return r;
    });
    const axis = { stroke: '#94a3b8', fontSize: 12 };
    const tip = { contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }, formatter: v => fmt(v) };
    const multi = spec.series.length > 1;
    let chart;
    if (spec.type === 'pie') {
        const data = spec.labels.map((l, i) => ({ name: String(l), value: spec.series[0].values[i] }));
        chart = (
            <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" outerRadius="75%" label={d => fmt(d.value)} isAnimationActive={false}>
                    {data.map((_, i) => <Cell key={i} fill={COLOURS[i % COLOURS.length]} />)}
                </Pie>
                <Tooltip {...tip} /><Legend />
            </PieChart>
        );
    } else {
        const Chart = spec.type === 'line' ? LineChart : spec.type === 'area' ? AreaChart : BarChart;
        chart = (
            <Chart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="label" {...axis} /><YAxis {...axis} tickFormatter={fmt} width={56} />
                <Tooltip {...tip} />{multi && <Legend />}
                {spec.series.map((s, k) => {
                    const c = COLOURS[k % COLOURS.length];
                    const name = s.name || `Series ${k + 1}`;
                    if (spec.type === 'line') return <Line key={k} dataKey={'s' + k} name={name} stroke={c} strokeWidth={2} dot isAnimationActive={false} />;
                    if (spec.type === 'area') return <Area key={k} dataKey={'s' + k} name={name} stroke={c} fill={c} fillOpacity={0.25} isAnimationActive={false} />;
                    return <Bar key={k} dataKey={'s' + k} name={name} fill={c} radius={[4, 4, 0, 0]} isAnimationActive={false} />;
                })}
            </Chart>
        );
    }
    return (
        <figure className="my-8 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            {title ? <figcaption className="mb-3 text-center font-semibold text-white">{title}</figcaption> : null}
            <div style={{ width: '100%', height: 300 }} role="img" aria-label={title || 'Chart'}>
                <ResponsiveContainer>{chart}</ResponsiveContainer>
            </div>
            {/* plain table underneath: exact numbers for screen readers and anyone who wants them */}
            <details className="mt-3 text-sm text-slate-400">
                <summary className="cursor-pointer">Show the numbers</summary>
                <table className="mt-2 w-full text-left">
                    <thead><tr><th className="py-1 pr-3"> </th>{spec.series.map((s, k) => <th key={k} className="py-1 pr-3">{s.name || `Series ${k + 1}`}</th>)}</tr></thead>
                    <tbody>{spec.labels.map((l, i) => <tr key={i}><td className="py-1 pr-3">{String(l)}</td>{spec.series.map((s, k) => <td key={k} className="py-1 pr-3">{fmt(s.values[i])}</td>)}</tr>)}</tbody>
                </table>
            </details>
        </figure>
    );
}

export function FormulaBlock({ title, raw }) {
    const html = useMemo(() => {
        try { return katex.renderToString(String(raw || '').trim(), { displayMode: true, throwOnError: true, trust: false, strict: 'ignore' }); }
        catch (e) { return null; }
    }, [raw]);
    if (!html) return <Note>This formula could not be displayed.</Note>;
    return (
        <div className="my-6 overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 text-white text-center">
            {title ? <div className="mb-1 text-sm text-slate-400">{title}</div> : null}
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}

let mermaidReady = null;
function loadMermaid() {
    if (!mermaidReady) {
        mermaidReady = import('mermaid').then(m => {
            const mm = m.default || m;
            mm.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' });
            return mm;
        });
    }
    return mermaidReady;
}

export function DiagramBlock({ title, raw }) {
    const [svg, setSvg] = useState('');
    const [failed, setFailed] = useState(false);
    const id = useRef('mmd' + Math.random().toString(36).slice(2, 9));
    useEffect(() => {
        let live = true;
        setSvg(''); setFailed(false);
        loadMermaid()
            .then(mm => mm.render(id.current + Date.now(), String(raw || '').trim()))
            .then(r => { if (live) setSvg(r.svg); })
            .catch(() => { if (live) setFailed(true); });
        return () => { live = false; };
    }, [raw]);
    if (failed) return <Note>This diagram could not be displayed.</Note>;
    return (
        <figure className="my-8 overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            {title ? <figcaption className="mb-3 text-center font-semibold text-white">{title}</figcaption> : null}
            {svg ? <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="text-center text-sm text-slate-400">Loading diagram…</div>}
        </figure>
    );
}

export default function LessonVisual({ block }) {
    if (block.type === 'chart') return <ChartBlock title={block.title} raw={block.raw} />;
    if (block.type === 'formula') return <FormulaBlock title={block.title} raw={block.raw} />;
    if (block.type === 'diagram') return <DiagramBlock title={block.title} raw={block.raw} />;
    return null;
}
