// src/pages/HolidayNoticeCalculator.jsx
//
// NEW (2026-10-16): free Holiday Pay and Notice Calculator for UK employers and employees. No AI, no credits and
// no sign-in needed, so it is instant, costs nothing to run, and gives the same answer every time. All statutory
// figures come from UK_EMPLOYMENT_SETTINGS in src/lib/ukEmploymentCalc.js, the one place to update each April.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, ClipboardList, TrendingUp, Shield } from 'lucide-react';
import {
    UK_EMPLOYMENT_SETTINGS as S,
    holidayEntitlement, irregularHoliday, holidayOnLeaving, noticePeriod,
    formatDate, toInputDate
} from '../lib/ukEmploymentCalc';

const TABS = [
    { id: 'entitlement', label: 'Holiday entitlement', icon: ClipboardList },
    { id: 'irregular', label: 'Irregular hours', icon: TrendingUp },
    { id: 'leaving', label: 'Holiday on leaving', icon: Clock },
    { id: 'notice', label: 'Notice period', icon: Shield }
];

const INPUT = 'w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition';

function Field({ label, hint, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            {children}
            {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
        </div>
    );
}

function Result({ children }) {
    return (
        <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5" role="status">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold mb-3"><CheckCircle className="w-5 h-5" /> Result</div>
            <div className="space-y-2 text-slate-200 text-sm">{children}</div>
        </div>
    );
}

function ErrorBox({ message }) {
    return (
        <div className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-200 text-sm flex items-start gap-2" role="alert">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{message}</span>
        </div>
    );
}

const Big = ({ children }) => <span className="text-white font-semibold text-lg">{children}</span>;
const money = (n) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function HolidayNoticeCalculator() {
    const [tab, setTab] = useState('entitlement');
    const [result, setResult] = useState(null);
    const today = toInputDate(new Date());

    const [ent, setEnt] = useState({ daysPerWeek: '5', leaveYearStart: '', employmentStart: '', employmentEnd: '' });
    const [irr, setIrr] = useState({ hoursWorked: '', payForPeriod: '' });
    const [leave, setLeave] = useState({ annualDays: '28', leaveYearStart: '', leavingDate: '', daysTaken: '0', dailyRate: '' });
    const [notice, setNotice] = useState({ startDate: '', noticeDate: today, giver: 'employer', contractWeeks: '' });

    function switchTab(id) { setTab(id); setResult(null); }

    function calculate(e) {
        e.preventDefault();
        if (tab === 'entitlement') setResult({ kind: tab, r: holidayEntitlement(ent) });
        if (tab === 'irregular') setResult({ kind: tab, r: irregularHoliday(irr) });
        if (tab === 'leaving') setResult({ kind: tab, r: holidayOnLeaving(leave) });
        if (tab === 'notice') setResult({ kind: tab, r: noticePeriod(notice) });
    }

    const r = result && result.kind === tab ? result.r : null;

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <Link to="/hr-tools" className="text-sm text-slate-400 hover:text-white transition">← Back to HR Tools</Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-3 mb-2">Holiday Pay and Notice Calculator</h1>
            <p className="text-slate-400 mb-6">
                Free and instant, for UK employers and employees. It works out statutory holiday, holiday owed when someone leaves, and the
                notice period. Your contract may give more than the legal minimum, so check it as well.
            </p>

            <div className="flex flex-wrap gap-2 mb-6" role="tablist">
                {TABS.map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.id}
                            onClick={() => switchTab(t.id)}
                            className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition ${tab === t.id ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                        >
                            <Icon className="w-4 h-4" /> {t.label}
                        </button>
                    );
                })}
            </div>

            <form onSubmit={calculate} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                {tab === 'entitlement' && (
                    <div className="space-y-4">
                        <p className="text-slate-400 text-sm">Statutory leave is {S.statutoryHolidayWeeks} weeks a year, capped at {S.statutoryHolidayDayCap} days. Bank holidays can be counted within it.</p>
                        <Field label="Days worked each week" hint="Use 2.5 for two and a half days.">
                            <input type="number" min="0.5" max="7" step="0.5" value={ent.daysPerWeek} onChange={e => setEnt({ ...ent, daysPerWeek: e.target.value })} className={INPUT} required />
                        </Field>
                        <p className="text-slate-500 text-xs">Only fill in the next three boxes if the person started or left part-way through the leave year.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Field label="Leave year starts"><input type="date" value={ent.leaveYearStart} onChange={e => setEnt({ ...ent, leaveYearStart: e.target.value })} className={INPUT} /></Field>
                            <Field label="Started on (if in this year)"><input type="date" value={ent.employmentStart} onChange={e => setEnt({ ...ent, employmentStart: e.target.value })} className={INPUT} /></Field>
                            <Field label="Leaving on (if in this year)"><input type="date" value={ent.employmentEnd} onChange={e => setEnt({ ...ent, employmentEnd: e.target.value })} className={INPUT} /></Field>
                        </div>
                    </div>
                )}

                {tab === 'irregular' && (
                    <div className="space-y-4">
                        <p className="text-slate-400 text-sm">
                            For people on irregular hours or who work only part of the year, in leave years starting on or after 1 April 2024. Holiday builds up at {S.rolledUpRatePercent}% of the hours actually worked. Rolled-up holiday pay is {S.rolledUpRatePercent}% of the pay for the period.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Hours worked in the pay period"><input type="number" min="0" step="0.25" value={irr.hoursWorked} onChange={e => setIrr({ ...irr, hoursWorked: e.target.value })} className={INPUT} placeholder="for example 68" /></Field>
                            <Field label="Pay for the period (£)" hint="Optional. Pay for the work done, before holiday pay."><input type="number" min="0" step="0.01" value={irr.payForPeriod} onChange={e => setIrr({ ...irr, payForPeriod: e.target.value })} className={INPUT} placeholder="for example 1000" /></Field>
                        </div>
                    </div>
                )}

                {tab === 'leaving' && (
                    <div className="space-y-4">
                        <p className="text-slate-400 text-sm">Works out the holiday built up to the leaving date, and whether there is holiday still owed or too much has been taken.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Full-year holiday (days)" hint="From the contract, at least the statutory amount."><input type="number" min="0" step="0.5" value={leave.annualDays} onChange={e => setLeave({ ...leave, annualDays: e.target.value })} className={INPUT} required /></Field>
                            <Field label="Days already taken this leave year"><input type="number" min="0" step="0.5" value={leave.daysTaken} onChange={e => setLeave({ ...leave, daysTaken: e.target.value })} className={INPUT} required /></Field>
                            <Field label="Leave year started on"><input type="date" value={leave.leaveYearStart} onChange={e => setLeave({ ...leave, leaveYearStart: e.target.value })} className={INPUT} required /></Field>
                            <Field label="Last day of employment"><input type="date" value={leave.leavingDate} onChange={e => setLeave({ ...leave, leavingDate: e.target.value })} className={INPUT} required /></Field>
                            <Field label="Pay for one day of holiday (£)" hint="Optional, to show the value in pounds."><input type="number" min="0" step="0.01" value={leave.dailyRate} onChange={e => setLeave({ ...leave, dailyRate: e.target.value })} className={INPUT} /></Field>
                        </div>
                    </div>
                )}

                {tab === 'notice' && (
                    <div className="space-y-4">
                        <p className="text-slate-400 text-sm">Statutory minimum notice: employers give 1 week after one month, then 1 week for each complete year from two years, up to {S.noticeMaxWeeks} weeks. Employees give at least {S.employeeMinNoticeWeeks} week after one month. A contract can ask for longer.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Who is giving notice?">
                                <select value={notice.giver} onChange={e => setNotice({ ...notice, giver: e.target.value })} className={INPUT}>
                                    <option value="employer">The employer</option>
                                    <option value="employee">The employee</option>
                                </select>
                            </Field>
                            <Field label="Contract notice (weeks)" hint="Optional. Leave blank if the contract does not say."><input type="number" min="0" step="0.5" value={notice.contractWeeks} onChange={e => setNotice({ ...notice, contractWeeks: e.target.value })} className={INPUT} /></Field>
                            <Field label="Employment started on"><input type="date" value={notice.startDate} onChange={e => setNotice({ ...notice, startDate: e.target.value })} className={INPUT} required /></Field>
                            <Field label="Notice given on"><input type="date" value={notice.noticeDate} onChange={e => setNotice({ ...notice, noticeDate: e.target.value })} className={INPUT} required /></Field>
                        </div>
                    </div>
                )}

                <button type="submit" className="mt-6 w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">Calculate</button>

                {r && r.error && <ErrorBox message={r.error} />}

                {r && !r.error && tab === 'entitlement' && (
                    <Result>
                        <p>Full-year statutory holiday: <Big>{r.fullYearDays} days</Big> ({S.statutoryHolidayWeeks} weeks){r.capped ? `, capped at ${S.statutoryHolidayDayCap} days` : ''}.</p>
                        {r.detail && (
                            <>
                                <p>Employed for {r.detail.daysEmployed} of {r.detail.totalDays} days in the leave year.</p>
                                <p>Holiday for that part of the year: <Big>{r.exactDays} days</Big>, or <Big>{r.roundedUpHalfDay} days</Big> if rounded up to the nearest half day.</p>
                                <p className="text-slate-400">Check your contract or policy for how part days are handled. Rounding down could leave someone below their statutory minimum.</p>
                            </>
                        )}
                    </Result>
                )}

                {r && !r.error && tab === 'irregular' && (
                    <Result>
                        {r.accruedHours != null && <p>Holiday built up this period: <Big>{r.accruedHours} hours</Big> ({r.ratePercent}% of hours worked).</p>}
                        {r.rolledUpPay != null && <p>Rolled-up holiday pay: <Big>{money(r.rolledUpPay)}</Big> ({r.ratePercent}% of the pay entered).</p>}
                        <p className="text-slate-400">Use one method for a worker, either holiday built up and paid when taken, or rolled-up pay. Check which one your contract uses.</p>
                    </Result>
                )}

                {r && !r.error && tab === 'leaving' && (
                    <Result>
                        <p>Holiday built up by the last day: <Big>{r.accruedDays} days</Big> ({r.daysIn} of {r.totalDays} days of the leave year), or {r.accruedRoundedUp} days rounded up to the nearest half day.</p>
                        <p>
                            {r.balanceDays >= 0
                                ? <>Still owed: <Big>{r.balanceDays} days</Big>{r.payValue != null && <> worth <Big>{money(r.payValue)}</Big></>}. Rounded up: {r.balanceRoundedUp} days{r.payValueRoundedUp != null && <> ({money(r.payValueRoundedUp)})</>}.</>
                                : <>More holiday has been taken than built up: <Big>{Math.abs(r.balanceDays)} days</Big> over. Whether this can be taken from final pay depends on a written term in the contract, so check before deducting anything.</>}
                        </p>
                    </Result>
                )}

                {r && !r.error && tab === 'notice' && (
                    <Result>
                        <p>Complete years of service: <Big>{r.completeYears}</Big>.</p>
                        <p>Statutory minimum notice: <Big>{r.statutoryWeeks} {r.statutoryWeeks === 1 ? 'week' : 'weeks'}</Big>{!r.hasMonth && ' (less than one month of service, so no statutory notice applies)'}.</p>
                        {r.contractWeeks != null && <p>Contract notice: {r.contractWeeks} {r.contractWeeks === 1 ? 'week' : 'weeks'}.</p>}
                        <p>Notice to give: <Big>{r.requiredWeeks} {r.requiredWeeks === 1 ? 'week' : 'weeks'}</Big>{r.longerSource === 'contract' ? ' (the contract is longer than the statutory minimum)' : ''}.</p>
                        {r.endsOn && <p>Employment ends on: <Big>{formatDate(r.endsOn)}</Big>. The notice period is usually counted from the day after the notice is received.</p>}
                    </Result>
                )}
            </form>

            <div className="mt-6 text-xs text-slate-500 space-y-2">
                <p>
                    This calculator gives general information and is not legal advice. It does not cover dismissal without notice for gross misconduct, pay in lieu of notice,
                    or workers who are not employees. Employment law is changing in 2026 and 2027, so check the latest on{' '}
                    <a href="https://www.gov.uk/holiday-entitlement-rights" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">GOV.UK holiday entitlement</a>{' '}and{' '}
                    <a href="https://www.gov.uk/handing-in-your-notice" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">GOV.UK notice periods</a>.
                    If a decision matters, ask an employment adviser or ACAS.
                </p>
                <p>Figures last checked {S.lastChecked}.</p>
            </div>
        </div>
    );
}
