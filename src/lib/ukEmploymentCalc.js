// src/lib/ukEmploymentCalc.js
//
// NEW (2026-10-16): the sums behind the Holiday Pay and Notice Calculator page. Plain functions, no AI and no
// network, so the answers are the same every time and cost nothing to run.
//
// ALL the statutory figures live in UK_EMPLOYMENT_SETTINGS below. If a rule changes, change it there and nowhere
// else. They were last checked on 16 October 2026 against GOV.UK guidance on holiday entitlement and pay (5.6
// weeks, 28-day cap, 12.07% for irregular-hours and part-year workers in leave years starting on or after
// 1 April 2024) and the statutory notice rules in the Employment Rights Act 1996 section 86. Employment law is
// changing in 2026 and 2027, so check GOV.UK again each April and whenever the Government announces a change.

export const UK_EMPLOYMENT_SETTINGS = {
    lastChecked: '16 October 2026',
    statutoryHolidayWeeks: 5.6,
    statutoryHolidayDayCap: 28,
    rolledUpRatePercent: 12.07,        // 5.6 weeks divided by 46.4 working weeks
    noticeMinServiceMonths: 1,         // no statutory notice before one month of service
    noticeMaxWeeks: 12,                // cap, reached at 12 complete years
    employeeMinNoticeWeeks: 1          // an employee with one month or more of service gives at least this
};

// ---------- small date helpers (all in UTC so clocks changing never shift a result) ----------
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(value) {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    // reject impossible dates such as 31 February
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    return d;
}

export function formatDate(d) {
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function toInputDate(d) {
    return d.toISOString().slice(0, 10);
}

export function addDays(d, n) {
    return new Date(d.getTime() + n * DAY_MS);
}

export function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

// Adds whole months/years; a 29 to 31 start that does not exist in the target month falls to the month's last day.
function addMonthsClamped(d, months) {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + months;
    const targetYear = y + Math.floor(m / 12);
    const targetMonth = ((m % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    return new Date(Date.UTC(targetYear, targetMonth, Math.min(d.getUTCDate(), lastDay)));
}

function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

function roundUpToHalf(n) {
    return Math.ceil(n * 2 - 1e-9) / 2;
}

// ---------- 1. full-year statutory holiday for regular hours ----------
// Statutory leave is 5.6 weeks, capped at 28 days. daysPerWeek may be a half day (for example 2.5).
export function holidayEntitlement({ daysPerWeek, leaveYearStart, employmentStart, employmentEnd }) {
    const s = UK_EMPLOYMENT_SETTINGS;
    const dpw = Number(daysPerWeek);
    if (!(dpw > 0) || dpw > 7) return { error: 'Enter the days worked each week, between 0.5 and 7.' };

    const uncapped = s.statutoryHolidayWeeks * dpw;
    const fullYearDays = Math.min(uncapped, s.statutoryHolidayDayCap);
    const capped = uncapped > s.statutoryHolidayDayCap;

    const yearStart = parseDate(leaveYearStart);
    let proportion = 1;
    let detail = null;
    if (yearStart) {
        const nextYearStart = new Date(Date.UTC(yearStart.getUTCFullYear() + 1, yearStart.getUTCMonth(), yearStart.getUTCDate()));
        const yearEnd = addDays(nextYearStart, -1);
        const totalDays = daysBetween(yearStart, nextYearStart);
        const start = parseDate(employmentStart);
        const end = parseDate(employmentEnd);
        const from = start && start > yearStart ? start : yearStart;
        const to = end && end < yearEnd ? end : yearEnd;
        if (to < from) return { error: 'The employment dates fall outside this leave year. Check the dates.' };
        const daysEmployed = daysBetween(from, to) + 1;
        proportion = daysEmployed / totalDays;
        detail = { daysEmployed, totalDays, from, to, yearEnd };
    }

    const exact = fullYearDays * proportion;
    return {
        fullYearDays: round2(fullYearDays),
        capped,
        proportion,
        exactDays: round2(exact),
        roundedUpHalfDay: roundUpToHalf(exact),
        detail
    };
}

// ---------- 2. irregular hours and part-year workers (leave years starting on or after 1 April 2024) ----------
// Holiday accrues at 12.07% of hours actually worked. Rolled-up holiday pay is 12.07% of the pay for the period.
export function irregularHoliday({ hoursWorked, payForPeriod }) {
    const s = UK_EMPLOYMENT_SETTINGS;
    const rate = s.rolledUpRatePercent / 100;
    const hours = hoursWorked === '' || hoursWorked == null ? null : Number(hoursWorked);
    const pay = payForPeriod === '' || payForPeriod == null ? null : Number(payForPeriod);
    if (hours == null && pay == null) return { error: 'Enter the hours worked, the pay for the period, or both.' };
    if ((hours != null && !(hours >= 0)) || (pay != null && !(pay >= 0))) return { error: 'Hours and pay must be zero or more.' };
    return {
        ratePercent: s.rolledUpRatePercent,
        accruedHours: hours != null ? round2(hours * rate) : null,
        rolledUpPay: pay != null ? round2(pay * rate) : null
    };
}

// ---------- 3. holiday owed (or over-taken) when someone leaves ----------
export function holidayOnLeaving({ annualDays, leaveYearStart, leavingDate, daysTaken, dailyRate }) {
    const annual = Number(annualDays);
    const taken = Number(daysTaken || 0);
    const yearStart = parseDate(leaveYearStart);
    const leaving = parseDate(leavingDate);
    if (!(annual > 0)) return { error: 'Enter the full-year holiday entitlement in days.' };
    if (!yearStart || !leaving) return { error: 'Enter the leave year start date and the leaving date.' };
    const nextYearStart = new Date(Date.UTC(yearStart.getUTCFullYear() + 1, yearStart.getUTCMonth(), yearStart.getUTCDate()));
    if (leaving < yearStart || leaving >= nextYearStart) return { error: 'The leaving date must fall inside the leave year that starts on the date you entered.' };
    if (!(taken >= 0)) return { error: 'Days already taken must be zero or more.' };

    const totalDays = daysBetween(yearStart, nextYearStart);
    const daysIn = daysBetween(yearStart, leaving) + 1;
    const accrued = annual * (daysIn / totalDays);
    const balance = accrued - taken;
    const rate = dailyRate === '' || dailyRate == null ? null : Number(dailyRate);
    return {
        accruedDays: round2(accrued),
        accruedRoundedUp: roundUpToHalf(accrued),
        balanceDays: round2(balance),
        balanceRoundedUp: round2(roundUpToHalf(accrued) - taken),
        payValue: rate != null && rate >= 0 ? round2(balance * rate) : null,
        payValueRoundedUp: rate != null && rate >= 0 ? round2((roundUpToHalf(accrued) - taken) * rate) : null,
        daysIn,
        totalDays
    };
}

// ---------- 4. statutory and contractual notice ----------
// Employer giving notice: 1 week from one month of service, 1 week per complete year from two years, capped at 12.
// Employee giving notice: at least 1 week from one month of service. A contract can ask for longer, never less
// than the statutory minimum.
export function noticePeriod({ startDate, noticeDate, giver, contractWeeks }) {
    const s = UK_EMPLOYMENT_SETTINGS;
    const start = parseDate(startDate);
    const given = parseDate(noticeDate);
    if (!start || !given) return { error: 'Enter the employment start date and the date notice is given.' };
    if (given <= start) return { error: 'The notice date must be after the start date.' };

    let completeYears = 0;
    while (addMonthsClamped(start, (completeYears + 1) * 12) <= given) completeYears++;
    const hasMonth = addMonthsClamped(start, s.noticeMinServiceMonths) <= given;

    let statutoryWeeks = 0;
    if (giver === 'employee') {
        statutoryWeeks = hasMonth ? s.employeeMinNoticeWeeks : 0;
    } else if (hasMonth) {
        statutoryWeeks = completeYears < 2 ? 1 : Math.min(completeYears, s.noticeMaxWeeks);
    }

    const contract = contractWeeks === '' || contractWeeks == null ? null : Number(contractWeeks);
    if (contract != null && !(contract >= 0)) return { error: 'Contract notice must be zero or more weeks.' };
    const requiredWeeks = Math.max(statutoryWeeks, contract || 0);

    const endsOn = addDays(given, Math.round(requiredWeeks * 7));
    return {
        completeYears,
        hasMonth,
        statutoryWeeks,
        contractWeeks: contract,
        requiredWeeks,
        longerSource: contract != null && contract > statutoryWeeks ? 'contract' : 'statutory',
        endsOn: requiredWeeks > 0 ? endsOn : null
    };
}
