// src/components/AppraisalCharts.jsx
// NEW (2026-10-23): small dependency-free SVG charts for appraisal progress and reports.
// Design rules: one axis only, a legend whenever there are two or more series, a table view for every chart
// (so nothing relies on colour alone), and hover tooltips. Colours are chosen for the dark page background.
import { useState } from 'react';

export const C = { a: '#3987e5', b: '#d95926', neutral: '#94a3b8', grid: '#334155', text: '#cbd5e1', muted: '#94a3b8' };
const fmt = (v) => (v === null || v === undefined || Number.isNaN(v) ? '-' : (Math.round(v * 100) / 100).toString());

export function Legend({ items }) {
    if (!items || items.length < 2) return null;
    return <div className="flex flex-wrap gap-4 text-xs text-slate-300 mb-2">{items.map(i => (
        <span key={i.label} className="inline-flex items-center gap-1.5"><svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={i.color} strokeWidth="2.5" strokeDasharray={i.dash || '0'} /><circle cx="9" cy="4" r="3.5" fill={i.color} /></svg>{i.label}</span>))}</div>;
}

export function ChartCard({ title, subtitle, children, table }) {
    const [asTable, setAsTable] = useState(false);
    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-start gap-2 mb-2">
                <div><h3 className="text-white font-medium text-sm">{title}</h3>{subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}</div>
                {table && <button type="button" onClick={() => setAsTable(!asTable)} className="text-xs text-primary-400 hover:underline shrink-0">{asTable ? 'Show chart' : 'Show as table'}</button>}
            </div>
            {asTable && table ? (
                <div className="overflow-x-auto"><table className="w-full text-xs text-slate-200"><thead><tr className="text-left text-slate-400">{table.head.map(h => <th key={h} className="p-1.5 font-normal">{h}</th>)}</tr></thead>
                    <tbody>{table.rows.map((r, i) => <tr key={i} className="border-t border-slate-800">{r.map((c, j) => <td key={j} className="p-1.5">{c}</td>)}</tr>)}</tbody></table></div>
            ) : children}
        </div>
    );
}

// Two series on the same 1..max scale, drawn as a radar (spider) chart. Needs three or more questions.
export function Radar({ labels, a, b, aLabel, bLabel, max = 5, size = 300 }) {
    const [tip, setTip] = useState(null);
    const n = labels.length; if (n < 3) return <p className="text-xs text-slate-400">A radar chart needs at least three questions. See the table instead.</p>;
    const cx = size / 2, cy = size / 2, R = size / 2 - 52;
    const pt = (i, v) => { const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n; const r = (R * (v || 0)) / max; return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]; };
    const poly = (arr) => arr.map((v, i) => pt(i, v).join(',')).join(' ');
    return (
        <div className="relative">
            <Legend items={[{ label: aLabel, color: C.a }, { label: bLabel, color: C.b, dash: '5 3' }].filter(x => x.label)} />
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-sm mx-auto" role="img" aria-label={`Radar chart of ${aLabel}${bLabel ? ' and ' + bLabel : ''} by question`}>
                {Array.from({ length: max }, (_, k) => k + 1).map(k => <polygon key={k} points={labels.map((_, i) => pt(i, k).join(',')).join(' ')} fill="none" stroke={C.grid} strokeWidth="1" />)}
                {labels.map((l, i) => { const [x, y] = pt(i, max); const [lx, ly] = pt(i, max + 0.75); return (<g key={i}><line x1={cx} y1={cy} x2={x} y2={y} stroke={C.grid} /><text x={lx} y={ly} fontSize="9.5" fill={C.text} textAnchor={lx < cx - 4 ? 'end' : lx > cx + 4 ? 'start' : 'middle'} dominantBaseline="middle">{l.length > 16 ? l.slice(0, 15) + '…' : l}</text></g>); })}
                {b && <polygon points={poly(b)} fill={C.b} fillOpacity="0.12" stroke={C.b} strokeWidth="2" strokeDasharray="5 3" />}
                {a && <polygon points={poly(a)} fill={C.a} fillOpacity="0.15" stroke={C.a} strokeWidth="2" />}
                {labels.map((l, i) => [[a, C.a, aLabel], [b, C.b, bLabel]].map(([s, col, nm]) => s && s[i] != null && (
                    <circle key={nm + i} cx={pt(i, s[i])[0]} cy={pt(i, s[i])[1]} r="5" fill={col} stroke="#0f172a" strokeWidth="2" onMouseEnter={() => setTip({ x: pt(i, s[i])[0], y: pt(i, s[i])[1], t: `${l}: ${nm} ${fmt(s[i])}` })} onMouseLeave={() => setTip(null)} onFocus={() => setTip({ x: pt(i, s[i])[0], y: pt(i, s[i])[1], t: `${l}: ${nm} ${fmt(s[i])}` })} tabIndex={0} />)))}
            </svg>
            {tip && <div className="absolute pointer-events-none bg-slate-800 border border-slate-600 text-xs text-white rounded px-2 py-1" style={{ left: `${(tip.x / size) * 100}%`, top: `${(tip.y / size) * 100}%`, transform: 'translate(-50%,-130%)' }}>{tip.t}</div>}
        </div>
    );
}

// Lines over time. series: [{ label, color, dash, values: [number|null] }], x: ['Round 1', ...]
export function Lines({ x, series, max = 5, height = 220 }) {
    const [hover, setHover] = useState(null);
    const W = 520, H = height, L = 30, Rr = 14, T = 12, B = 34;
    const iw = W - L - Rr, ih = H - T - B;
    const px = (i) => L + (x.length === 1 ? iw / 2 : (i * iw) / (x.length - 1));
    const py = (v) => T + ih - (ih * (v - 1)) / (max - 1);
    return (
        <div className="relative">
            <Legend items={series.map(s => ({ label: s.label, color: s.color, dash: s.dash }))} />
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Ratings over time" onMouseLeave={() => setHover(null)}>
                {Array.from({ length: max }, (_, k) => k + 1).map(k => <g key={k}><line x1={L} x2={W - Rr} y1={py(k)} y2={py(k)} stroke={C.grid} strokeWidth="1" /><text x={L - 6} y={py(k)} fontSize="10" fill={C.muted} textAnchor="end" dominantBaseline="middle">{k}</text></g>)}
                {x.map((lab, i) => <text key={i} x={px(i)} y={H - 12} fontSize="10" fill={C.muted} textAnchor="middle">{lab.length > 14 ? lab.slice(0, 13) + '…' : lab}</text>)}
                {hover !== null && <line x1={px(hover)} x2={px(hover)} y1={T} y2={T + ih} stroke={C.muted} strokeDasharray="3 3" />}
                {series.map(s => {
                    const pts = s.values.map((v, i) => (v === null || v === undefined ? null : [px(i), py(v)]));
                    const path = pts.reduce((d, p) => (p ? d + `${d && !d.endsWith('M') ? 'L' : 'M'}${p[0]},${p[1]}` : d + (d ? 'M' : '')), '').replace(/M$/, '');
                    return <g key={s.label}><path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash || '0'} strokeLinejoin="round" />{pts.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r="4.5" fill={s.color} stroke="#0f172a" strokeWidth="2" />)}</g>;
                })}
                {x.map((_, i) => <rect key={i} x={px(i) - Math.max(14, iw / x.length / 2)} y={T} width={Math.max(28, iw / x.length)} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} />)}
            </svg>
            {hover !== null && <div className="absolute pointer-events-none bg-slate-800 border border-slate-600 text-xs text-white rounded px-2 py-1.5" style={{ left: `${Math.min(80, Math.max(5, (px(hover) / W) * 100))}%`, top: 24 }}>
                <div className="text-slate-300 mb-0.5">{x[hover]}</div>{series.map(s => <div key={s.label}><span style={{ color: s.color }}>●</span> {s.label}: {fmt(s.values[hover])}</div>)}</div>}
        </div>
    );
}

// Horizontal bars, one value per row. rows: [{ label, value, n }], one colour (single series, so no legend needed).
export function Bars({ rows, max = 5, color = C.a, unit = '' }) {
    const [tip, setTip] = useState(null);
    return (
        <div className="space-y-1.5">{rows.map((r, i) => (
            <div key={r.label + i} className="grid grid-cols-[minmax(80px,32%)_1fr_44px] items-center gap-2 text-xs" onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}>
                <span className="text-slate-300 truncate" title={r.label}>{r.label}</span>
                <div className="h-3 bg-slate-800 rounded-r"><div className="h-3 rounded-r" style={{ width: `${Math.max(0, Math.min(100, ((r.value || 0) / max) * 100))}%`, background: color }} /></div>
                <span className="text-slate-200 text-right">{fmt(r.value)}{unit}</span>
                {tip === i && r.n !== undefined && <span className="col-span-3 text-slate-400">{r.n} appraisal{r.n === 1 ? '' : 's'}</span>}
            </div>))}</div>
    );
}

// Distribution of ratings 1..5 as columns (single series).
export function Distribution({ counts, color = C.a }) {
    const mx = Math.max(1, ...counts);
    return (
        <svg viewBox="0 0 150 70" className="w-full max-w-[220px]" role="img" aria-label={`Number of ratings at 1 to 5: ${counts.join(', ')}`}>
            {counts.map((c, i) => <g key={i}><title>{`Rating ${i + 1}: ${c}`}</title><rect x={8 + i * 28} y={50 - (c / mx) * 40} width="20" height={(c / mx) * 40} fill={color} rx="2" /><text x={18 + i * 28} y="62" fontSize="9" fill={C.muted} textAnchor="middle">{i + 1}</text>{c > 0 && <text x={18 + i * 28} y={46 - (c / mx) * 40} fontSize="9" fill={C.text} textAnchor="middle">{c}</text>}</g>)}
        </svg>
    );
}

// Count of people in each rating band (single series).
export function BandBars({ bands }) {
    return <Bars rows={bands.map(b => ({ label: b.label, value: b.count, n: b.count }))} max={Math.max(1, ...bands.map(b => b.count))} />;
}

// Nine-box: performance (left to right) against potential (top = higher). One colour, shade follows the number of people.
export function NineBox({ cells }) {
    const [tip, setTip] = useState(null);
    const total = Math.max(1, cells.reduce((a, c) => a + c.count, 0));
    const get = (perf, pot) => cells.find(c => c.perf === perf && c.pot === pot);
    return (
        <div>
            <div className="grid grid-cols-[auto_1fr] gap-2">
                <div className="flex items-center justify-center"><span className="text-xs text-slate-400 [writing-mode:vertical-rl] rotate-180">Potential (higher at the top)</span></div>
                <div>
                    <div className="grid grid-cols-3 gap-1.5">
                        {[3, 2, 1].flatMap(pot => [1, 2, 3].map(perf => { const c = get(perf, pot); const a = Math.min(0.55, (c.count / total) * 1.6);
                            return (
                                <div key={`${perf}-${pot}`} className="rounded-lg p-2 min-h-[84px] border border-slate-700 cursor-default" style={{ background: `rgba(57,135,229,${0.08 + a})` }} onMouseEnter={() => setTip(c)} onMouseLeave={() => setTip(null)} tabIndex={0} onFocus={() => setTip(c)}>
                                    <div className="text-[11px] font-medium text-white leading-tight">{c.label}</div>
                                    <div className="text-lg text-white font-semibold">{c.count}</div>
                                    {c.people.length > 0 && <div className="text-[10px] text-slate-200 leading-tight">{c.people.slice(0, 4).join(', ')}{c.people.length > 4 ? ` +${c.people.length - 4}` : ''}</div>}
                                </div>); }))}
                    </div>
                    <div className="text-xs text-slate-400 text-center mt-1.5">Performance (lower to higher)</div>
                </div>
            </div>
            {tip && <div className="mt-2 text-xs text-slate-300 bg-slate-800 border border-slate-600 rounded p-2"><b className="text-white">{tip.label}</b> ({tip.count}): {tip.considerations}</div>}
        </div>
    );
}
