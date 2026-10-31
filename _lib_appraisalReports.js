// api/_lib/appraisalReports.js
//
// NEW (2026-10-23): reports on FILED appraisals. Pure functions: they receive plain (already decrypted) rows from
// appraisals.js, which has already checked who is asking, the plan level and the country rules.
//
// SAFETY RULES BUILT IN
//   - Only filed appraisals are ever counted.
//   - A group (department or team) with fewer than MIN_GROUP people is never shown, only counted as "hidden".
//   - Individuals are listed alphabetically and never ranked or scored against each other.
//   - Nothing here makes or suggests an automatic decision. The "considerations" text is guidance for a person.
//   - There is no AI. Findings are fixed rules over the numbers.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const MIN_GROUP = 5;
export const BANDS = [
    { key: 'outstanding', label: 'Outstanding', min: 4.5, considerations: 'Recognition, stretch responsibilities, and a conversation about what keeps this person engaged. Check the record supports it before any reward decision.' },
    { key: 'exceeds', label: 'Exceeds expectations', min: 3.5, considerations: 'Recognise good work. Agree a development goal that builds on strengths and ask what support would help.' },
    { key: 'meets', label: 'Meets expectations', min: 2.5, considerations: 'Confirm what is going well and agree one or two goals for the next period.' },
    { key: 'developing', label: 'Developing', min: 1.5, considerations: 'Agree specific, written development steps with dates, offer training or coaching, and review progress soon.' },
    { key: 'needs', label: 'Needs improvement', min: 0, considerations: 'Use your own performance and disciplinary procedures. A rating on its own is not a basis for dismissal or a pay cut. Take advice before acting, and make sure the employee has had a fair chance to respond.' }
];

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r2 = (n) => (n === null || n === undefined || Number.isNaN(n) ? null : Math.round(n * 100) / 100);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const overallOf = (content) => mean(Object.values(content?.ratings || {}).map(Number).filter(Number.isFinite));
export const bandOf = (score) => (score === null ? null : BANDS.find(b => score >= b.min));

// rows: [{ id, name, supervisor, department, cycle_id, cycle_name, date, created_at, disagreement, employee_no_response, self, final, criteria }]
export function computeReport(rows, { level = 'standard', allowSupervisorView = true, minGroup = MIN_GROUP } = {}) {
    const n = rows.length;
    const locked = [];
    const out = { n, min_group: minGroup, level, locked };

    // criteria union
    const critMap = new Map();
    rows.forEach(r => (r.criteria || []).forEach(c => { if (!critMap.has(c.id)) critMap.set(c.id, c.title); }));
    out.criteria = [...critMap].map(([id, title]) => ({ id, title }));

    const finals = rows.map(r => overallOf(r.final)).filter(v => v !== null);
    const selfs = rows.map(r => overallOf(r.self)).filter(v => v !== null);
    const gaps = rows.filter(r => overallOf(r.final) !== null && overallOf(r.self) !== null).map(r => overallOf(r.self) - overallOf(r.final));
    out.overall = { mean: r2(mean(finals)), self_mean: r2(mean(selfs)), gap: r2(mean(gaps)) };

    const bands = Object.fromEntries(BANDS.map(b => [b.key, 0]));
    rows.forEach(r => { const b = bandOf(overallOf(r.final)); if (b) bands[b.key]++; });
    out.bands = BANDS.map(b => ({ key: b.key, label: b.label, count: bands[b.key], considerations: b.considerations }));

    out.rates = {
        disagreement: n ? r2(rows.filter(r => r.disagreement).length / n) : null,
        no_response: n ? r2(rows.filter(r => r.employee_no_response).length / n) : null,
        median_days_to_file: r2(median(rows.filter(r => r.date && r.created_at).map(r => (new Date(r.date) - new Date(r.created_at)) / 86400000)))
    };
    out.small_sample = n < minGroup;

    // everyone, alphabetical, no rank
    out.individuals = [...rows].sort((a, b) => String(a.name).localeCompare(String(b.name))).map(r => ({
        id: r.id, name: r.name, supervisor: r.supervisor || null, department: r.department || null, cycle: r.cycle_name || null,
        overall: r2(overallOf(r.final)), self_overall: r2(overallOf(r.self)), band: bandOf(overallOf(r.final))?.label || null,
        ratings: r.final?.ratings || {}, disagreement: !!r.disagreement
    }));

    if (level === 'basic') { locked.push('criteria_analysis', 'trend', 'group_analysis', 'supervisor_consistency', 'business_review'); return out; }

    // per criterion
    out.by_criterion = out.criteria.map(c => {
        const f = rows.map(r => Number(r.final?.ratings?.[c.id])).filter(Number.isFinite);
        const both = rows.filter(r => Number.isFinite(Number(r.final?.ratings?.[c.id])) && Number.isFinite(Number(r.self?.ratings?.[c.id])));
        const dist = [1, 2, 3, 4, 5].map(v => f.filter(x => Math.round(x) === v).length);
        return { id: c.id, title: c.title, n: f.length, mean: r2(mean(f)), self_mean: r2(mean(both.map(r => Number(r.self.ratings[c.id])))), gap: r2(mean(both.map(r => Number(r.self.ratings[c.id]) - Number(r.final.ratings[c.id])))), dist };
    });

    // trend across rounds
    const cyc = new Map();
    rows.forEach(r => { const k = r.cycle_id || 'none'; if (!cyc.has(k)) cyc.set(k, { name: r.cycle_name || 'Appraisal', date: r.date, rows: [] }); const g = cyc.get(k); g.rows.push(r); if (r.date && (!g.date || r.date < g.date)) g.date = r.date; });
    out.trend = [...cyc.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))).map(g => ({ name: g.name, date: g.date ? String(g.date).slice(0, 10) : null, n: g.rows.length, mean: r2(mean(g.rows.map(r => overallOf(r.final)).filter(v => v !== null))), self_mean: r2(mean(g.rows.map(r => overallOf(r.self)).filter(v => v !== null))) }));

    if (level === 'standard') { locked.push('group_analysis', 'supervisor_consistency', 'business_review'); return out; }

    // full: groups (hidden when small)
    const groupBy = (keyFn) => {
        const m = new Map();
        rows.forEach(r => { const k = keyFn(r); if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
        let hidden = 0; const shown = [];
        for (const [name, rs] of m) { if (rs.length < minGroup) { hidden++; continue; } shown.push({ name, n: rs.length, mean: r2(mean(rs.map(r => overallOf(r.final)).filter(v => v !== null))), self_mean: r2(mean(rs.map(r => overallOf(r.self)).filter(v => v !== null))) }); }
        return { groups: shown.sort((a, b) => a.name.localeCompare(b.name)), hidden };
    };
    out.by_department = groupBy(r => r.department);
    out.by_team = groupBy(r => r.supervisor);

    if (allowSupervisorView) {
        // A prompt for calibration conversations only: never a verdict on a supervisor.
        const g = groupBy(r => r.supervisor);
        const bySup = new Map(); rows.forEach(r => { if (!r.supervisor) return; if (!bySup.has(r.supervisor)) bySup.set(r.supervisor, []); bySup.get(r.supervisor).push(r); });
        out.supervisor_consistency = { hidden: g.hidden, items: [...bySup].filter(([, rs]) => rs.length >= minGroup).map(([name, rs]) => { const f = rs.map(r => overallOf(r.final)).filter(v => v !== null); return { name, n: rs.length, mean: r2(mean(f)), pct_high: r2(f.filter(v => v >= 4).length / f.length) }; }).sort((a, b) => a.name.localeCompare(b.name)), org_mean: out.overall.mean };
    } else locked.push('supervisor_consistency');
    return out;
}

// Plain-rule findings (no AI).
export function buildFindings(rep, statusCounts = {}) {
    const f = [];
    if (!rep.n) return ['No filed appraisals yet, so there is nothing to report.'];
    f.push(`${rep.n} filed appraisal${rep.n === 1 ? '' : 's'} are included.`);
    if (rep.small_sample) f.push(`With fewer than ${rep.min_group} appraisals these figures describe only these people and are not a reliable pattern. Read them with care.`);
    const started = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    if (started && statusCounts.filed !== undefined) f.push(`${Math.round((statusCounts.filed / started) * 100)}% of appraisals started have been filed (${statusCounts.filed} of ${started}).`);
    if (rep.overall.mean !== null) f.push(`The average final rating is ${rep.overall.mean} out of 5.`);
    if (rep.by_criterion) {
        const c = rep.by_criterion.filter(x => x.mean !== null && x.n > 0);
        if (c.length > 1) { const lo = [...c].sort((a, b) => a.mean - b.mean)[0], hi = [...c].sort((a, b) => b.mean - a.mean)[0]; if (lo.id !== hi.id) { f.push(`Highest rated area: ${hi.title} (${hi.mean}). Lowest rated area: ${lo.title} (${lo.mean}).`); } }
    }
    if (rep.overall.gap !== null) {
        if (rep.overall.gap >= 0.4) f.push(`Employees rate themselves ${rep.overall.gap} points higher than supervisors on average. This can mean expectations are not clear. Consider explaining the rating descriptions to staff.`);
        else if (rep.overall.gap <= -0.4) f.push(`Employees rate themselves ${Math.abs(rep.overall.gap)} points lower than supervisors on average. Staff may be under-confident or supervisors generous. Consider a conversation about how ratings are used.`);
        else f.push('Self ratings and supervisor ratings are close on average, which suggests shared expectations.');
    }
    if (rep.rates.disagreement) f.push(`${Math.round(rep.rates.disagreement * 100)}% of appraisals involved a disagreement that went to a discussion or an approver.`);
    if (rep.rates.no_response) f.push(`${Math.round(rep.rates.no_response * 100)}% of appraisals had no response from the employee within the deadline.`);
    if (rep.rates.median_days_to_file !== null) f.push(`Appraisals took a median of ${Math.round(rep.rates.median_days_to_file)} days from start to filing.`);
    if (rep.trend && rep.trend.length > 1) { const a = rep.trend[rep.trend.length - 2], b = rep.trend[rep.trend.length - 1]; if (a.mean !== null && b.mean !== null) { const d = r2(b.mean - a.mean); f.push(`Compared with ${a.name}, the average rating ${d > 0 ? 'rose' : d < 0 ? 'fell' : 'did not change'}${d ? ` by ${Math.abs(d)}` : ''} in ${b.name}.`); } }
    return f;
}

// ---------------------------------------------------------------------------------------------
// Business review PDF
// ---------------------------------------------------------------------------------------------
export async function renderReviewPdf({ report, findings, orgName, label, generated }) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const W = 595, H = 842, M = 50; let page = pdf.addPage([W, H]); let y = H - M;
    const navy = rgb(0.04, 0.24, 0.36), grey = rgb(0.4, 0.4, 0.45), ink = rgb(0.1, 0.1, 0.15), blue = rgb(0.16, 0.47, 0.84);
    const clean = (s) => String(s ?? '').replace(/[^\x20-\x7E -ÿ\n]/g, '?');
    const need = (h) => { if (y - h < M) { page = pdf.addPage([W, H]); y = H - M; } };
    const line = (txt, { f = font, size = 10, color = ink, indent = 0, gap = 4 } = {}) => {
        const maxW = W - 2 * M - indent;
        for (const para of clean(txt).split('\n')) {
            let cur = '';
            for (const word of para.split(/\s+/)) { const t = cur ? cur + ' ' + word : word; if (f.widthOfTextAtSize(t, size) > maxW && cur) { need(size + gap); page.drawText(cur, { x: M + indent, y: y - size, size, font: f, color }); y -= size + gap; cur = word; } else cur = t; }
            need(size + gap); page.drawText(cur, { x: M + indent, y: y - size, size, font: f, color }); y -= size + gap;
        }
    };
    const h2 = (t) => { need(40); y -= 8; line(t, { f: bold, size: 13, color: navy }); };
    const bar = (label2, value, max, text) => { need(18); const bw = 230; page.drawText(clean(label2).slice(0, 38), { x: M, y: y - 10, size: 9, font, color: ink }); const x0 = M + 215; page.drawRectangle({ x: x0, y: y - 12, width: bw, height: 10, color: rgb(0.9, 0.91, 0.93) }); if (value > 0) page.drawRectangle({ x: x0, y: y - 12, width: Math.max(2, (value / max) * bw), height: 10, color: blue }); page.drawText(clean(text), { x: x0 + bw + 8, y: y - 10, size: 9, font, color: grey }); y -= 17; };

    line('Performance review summary', { f: bold, size: 20, color: navy }); y -= 2;
    line(`${orgName}  |  ${label}  |  Generated ${generated}`, { size: 9, color: grey });
    line('This summary is based on filed appraisals only. It is guidance for people who make decisions; it does not make decisions.', { size: 9, color: grey });

    h2('Key findings');
    findings.forEach(t => line('- ' + t, { indent: 8 }));

    if (report.by_criterion?.length) {
        h2('Average rating by area (out of 5)');
        report.by_criterion.forEach(c => bar(c.title, c.mean || 0, 5, c.mean === null ? 'n/a' : `${c.mean}  (n=${c.n})`));
    }
    h2('Where people fall');
    const maxB = Math.max(1, ...report.bands.map(b => b.count));
    report.bands.forEach(b => bar(b.label, b.count, maxB, String(b.count)));
    if (report.n < report.min_group) line(`Counts are small (${report.n}). Please do not read them as a pattern.`, { size: 9, color: grey });

    if (report.trend?.length > 1) { h2('Average rating by round'); report.trend.forEach(t => bar(t.name, t.mean || 0, 5, t.mean === null ? 'n/a' : `${t.mean}  (n=${t.n})`)); }
    if (report.by_department?.groups?.length) { h2('By department'); report.by_department.groups.forEach(g => bar(g.name, g.mean || 0, 5, `${g.mean}  (n=${g.n})`)); if (report.by_department.hidden) line(`${report.by_department.hidden} department(s) with fewer than ${report.min_group} people are not shown, to protect individuals.`, { size: 9, color: grey }); }

    h2('Decision framework: considerations by rating band');
    line('Use this as a prompt for a conversation, not as a rule. Every decision about a person must be made by a person who has read the full record and given the employee a fair chance to respond.', { size: 9, color: grey });
    report.bands.forEach(b => { need(40); line(`${b.label} (${b.count})`, { f: bold, size: 10 }); line(b.considerations, { indent: 10, size: 9 }); });

    h2('How to use this review');
    ['Share results with the people concerned in a way that fits your policy. Never share an individual\'s rating with their colleagues.', 'Look for patterns in clear expectations, workload and training before looking at individuals.', 'Keep a record of any action you take and why. Take legal advice before any dismissal, demotion or pay reduction.', 'Review the appraisal criteria once a year so they still describe the work.'].forEach(t => line('- ' + t, { indent: 8 }));
    return pdf.save();
}

// ---------------------------------------------------------------------------------------------
// Employee progress (pure): turns what the employee is allowed to see into chart-ready series.
// items: [{ appraisal_id, cycle_name, date, status, criteria, self, supervisor, joint, org_average }]
// ---------------------------------------------------------------------------------------------
export function buildHistory(items) {
    const series = items.map(it => {
        const final = it.joint || it.supervisor || null;
        return {
            appraisal_id: it.appraisal_id, name: it.cycle_name || 'Appraisal', date: it.date ? String(it.date).slice(0, 10) : null, status: it.status,
            criteria: it.criteria || [], self: it.self?.ratings || {}, final: final?.ratings || {}, final_stage: it.joint ? 'joint' : it.supervisor ? 'supervisor' : null,
            overall_self: r2(overallOf(it.self)), overall_final: r2(overallOf(final)),
            goals: (final?.goals || it.self?.goals || '') || null, org_average: it.org_average || null
        };
    }).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    // criteria across all rounds, for the trend lines
    const m = new Map(); series.forEach(s => s.criteria.forEach(c => { if (!m.has(c.id)) m.set(c.id, c.title); }));
    return { series, criteria: [...m].map(([id, title]) => ({ id, title })) };
}
