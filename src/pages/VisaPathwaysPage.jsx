// src/pages/VisaPathwaysPage.jsx
// NEW (2026-10-10): plain-language guide to the skilled-worker visa and
// settlement changes in the UK, New Zealand and Australia.
//
// HONESTY RULES BUILT INTO THE DATA BELOW:
//  - every fact carries a status: 'inforce' (confirmed in force),
//    'proposed' (announced / consulted on, not law), or 'reported'
//    (stated by adviser websites, not yet checked against the official source)
//  - every country shows a "last checked" date and links to the official source
//  - occupation lists are NOT copied here (they change often); the role
//    checker sends people to the official source instead of guessing
//  - this is general information, not immigration advice
//
// To update: edit COUNTRIES and LAST_CHECKED only - no other code changes.

import { useState } from 'react';
import { ExternalLink, Search, AlertTriangle, CheckCircle, Clock, HelpCircle } from 'lucide-react';

const LAST_CHECKED = '10 October 2026';

const STATUS = {
    inforce:  { label: 'In force',            cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', Icon: CheckCircle },
    proposed: { label: 'Proposed - not law',  cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30',       Icon: Clock },
    reported: { label: 'Reported - verify',   cls: 'text-sky-400 bg-sky-500/10 border-sky-500/30',             Icon: HelpCircle }
};

const COUNTRIES = [
    {
        id: 'uk', name: 'United Kingdom', flag: '🇬🇧',
        headline: 'Settlement rules are being reworked ("earned settlement"). The 10-year proposal is not law yet, so the current 5-year route still applies.',
        facts: [
            { s: 'inforce',  t: 'English at B2 (speaking and listening) will be required for settlement on affected routes from 26 March 2027.' },
            { s: 'inforce',  t: 'Indefinite leave to remain (ILR) application fee: £3,226 per person from 8 April 2026, dependants pay the same.' },
            { s: 'proposed', t: 'Baseline wait to settle would rise from 5 to 10 years of qualifying residence.' },
            { s: 'proposed', t: 'Shorter routes: about 5 years for earnings above £50,270 (three years running); about 3 years above £125,140.' },
            { s: 'proposed', t: 'Longer routes: up to 15 years for jobs below degree level (RQF 6), which would include much of health and care.' },
            { s: 'proposed', t: 'A minimum taxable income of £12,570 across the qualifying window; the 10-year long-residence route would be removed.' },
            { s: 'proposed', t: 'Whether people already in the UK are protected has not been decided. Start date: "later in 2026" at the earliest, no firm timetable.' },
            { s: 'reported', t: 'Skilled Worker visa generally needs a graduate-level (RQF 6) job, a licensed sponsor and a salary of about £41,700 or the occupation\'s going rate, whichever is higher. The overseas care worker route closed to new applicants in July 2025.' }
        ],
        steps: [
            'Find a job that is on the eligible occupations list and an employer with a sponsor licence.',
            'The employer issues a Certificate of Sponsorship with the job, salary and occupation code.',
            'Check the salary meets the general threshold and the occupation\'s going rate.',
            'Prove English (an approved test or qualification) and maintenance funds where required.',
            'Apply online, pay the visa fee and Immigration Health Surcharge, and give biometrics.',
            'If you already qualify for ILR under today\'s rules, apply as soon as you are eligible rather than waiting.'
        ],
        links: [
            ['Skilled Worker visa (gov.uk)', 'https://www.gov.uk/skilled-worker-visa'],
            ['Eligible occupations', 'https://www.gov.uk/government/publications/skilled-worker-visa-eligible-occupations'],
            ['Indefinite leave to remain', 'https://www.gov.uk/indefinite-leave-to-remain'],
            ['Find a registered sponsor', 'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers']
        ],
        roleSite: 'gov.uk'
    },
    {
        id: 'nz', name: 'New Zealand', flag: '🇳🇿',
        headline: 'Two new residence pathways under the Skilled Migrant Category started on 24 August 2026.',
        facts: [
            { s: 'reported', t: 'Skilled Work Experience pathway: skill levels 1-3, at least 5 years of relevant experience, including 2 years in New Zealand earning at least 1.1 times the median wage.' },
            { s: 'reported', t: 'Trades and Technician pathway: Level 4+ relevant qualification, at least 4 years of experience after qualifying, including 18 months in New Zealand at the median wage.' },
            { s: 'reported', t: 'Occupation lists: red-list roles cannot use the new pathways; amber-list roles need 5 years of NZ experience including 2 years at 1.2 times the median wage.' },
            { s: 'reported', t: 'The requirement for wage increases during the qualifying period is removed; you must keep earning at least the median wage.' },
            { s: 'reported', t: 'New Zealand degrees carry more points. English test results are valid for five years for people with a recognised NZ occupational registration.' },
            { s: 'reported', t: 'Not confirmed in the sources checked: the current median wage figure, fees and exact points table. Use Immigration New Zealand for these.' }
        ],
        steps: [
            'Check your occupation against the current lists and which pathway fits (skilled work experience, trades, or the points-based route).',
            'Hold a valid work visa and work in a skilled role at or above the median wage.',
            'Gather evidence: employment history, payslips, qualifications assessed by NZQA where needed, English proof if required.',
            'Submit your application through Immigration New Zealand\'s online system.',
            'Respond to any requests for information, then complete health and character checks.'
        ],
        links: [
            ['Immigration New Zealand', 'https://www.immigration.govt.nz/'],
            ['Skilled Migrant Category resident visa', 'https://www.immigration.govt.nz/new-zealand-visas/visas/visa/skilled-migrant-category-resident-visa']
        ],
        roleSite: 'immigration.govt.nz'
    },
    {
        id: 'au', name: 'Australia', flag: '🇦🇺',
        headline: 'The Skills in Demand visa replaced the 482 visa on 7 December 2025.',
        facts: [
            { s: 'reported', t: 'Three streams: Core Skills (occupations on the Core Skills Occupation List), Specialist Skills (no list), and Labour Agreement (due to be renamed Essential Skills in 2026).' },
            { s: 'reported', t: 'Core Skills Income Threshold: AUD 73,150 for 2025-26, indexed each year. Specialist Skills: at least AUD 135,000.' },
            { s: 'reported', t: 'Visa lasts four years (five for Hong Kong and BNO passport holders). Application charge: AUD 3,115 for the main applicant.' },
            { s: 'reported', t: 'Minimum work experience reduced from two years to one, gained within the last five years.' },
            { s: 'reported', t: 'Permanent residence is available through the Employer Nomination Scheme. Existing 482 holders can move to the new visa at their next renewal.' },
            { s: 'reported', t: 'Not confirmed in the sources checked: English requirements and current processing times. Use the Department of Home Affairs for these.' }
        ],
        steps: [
            'Check your occupation is on the Core Skills Occupation List, or that you qualify for the Specialist Skills stream.',
            'Find an approved employer (a standard business sponsor) who will sponsor you.',
            'Your employer lodges a nomination; you lodge the visa application with identity, skills and experience evidence.',
            'Meet the salary threshold, English, health and character requirements.',
            'After the qualifying period, you may be nominated for permanent residence.'
        ],
        links: [
            ['Department of Home Affairs', 'https://immi.homeaffairs.gov.au/'],
            ['Skills in Demand visa (subclass 482)', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-482']
        ],
        roleSite: 'immi.homeaffairs.gov.au'
    }
];

export default function VisaPathwaysPage() {
    const [tab, setTab] = useState('uk');
    const [role, setRole] = useState('');
    const c = COUNTRIES.find(x => x.id === tab);

    function checkRole(e) {
        e.preventDefault();
        if (!role.trim()) return;
        const q = encodeURIComponent(`site:${c.roleSite} "${role.trim()}" occupation list`);
        window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Skilled Visa & Settlement Pathways</h1>
                <p className="text-slate-400 mt-2 text-sm">
                    What is changing in the UK, New Zealand and Australia, what the requirements look like, and how to apply. Last checked {LAST_CHECKED}.
                </p>

                <div className="mt-4 flex gap-2 items-start bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>General information only, not immigration advice. Rules change often. Each point is labelled: <b>In force</b>, <b>Proposed</b> (not law), or <b>Reported</b> (from adviser sources, not yet checked against the official page). Always confirm on the official site before you apply or resign from a job.</p>
                </div>

                <div className="mt-6 flex gap-2 overflow-x-auto">
                    {COUNTRIES.map(x => (
                        <button key={x.id} onClick={() => setTab(x.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${tab === x.id ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                            {x.flag} {x.name}
                        </button>
                    ))}
                </div>

                <div className="mt-5 bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <p className="text-white font-medium">{c.headline}</p>

                    <h2 className="text-slate-300 text-sm font-semibold mt-5 mb-2">Key facts and requirements</h2>
                    <ul className="space-y-2">
                        {c.facts.map((f, i) => {
                            const st = STATUS[f.s];
                            return (
                                <li key={i} className="flex gap-3 items-start text-sm text-slate-300">
                                    <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${st.cls}`}>
                                        <st.Icon className="w-3 h-3" /> {st.label}
                                    </span>
                                    <span>{f.t}</span>
                                </li>
                            );
                        })}
                    </ul>

                    <h2 className="text-slate-300 text-sm font-semibold mt-6 mb-2">How to apply</h2>
                    <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-300">
                        {c.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>

                    <h2 className="text-slate-300 text-sm font-semibold mt-6 mb-2">Check your role</h2>
                    <p className="text-slate-500 text-xs mb-2">Occupation lists change often, so we do not copy them here. Type your job title and we will search the official {c.name} source.</p>
                    <form onSubmit={checkRole} className="flex gap-2">
                        <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Registered nurse, Electrician, Software developer"
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500" />
                        <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm inline-flex items-center gap-1.5"><Search className="w-4 h-4" /> Search</button>
                    </form>

                    <h2 className="text-slate-300 text-sm font-semibold mt-6 mb-2">Official sources</h2>
                    <ul className="space-y-1">
                        {c.links.map(([label, url]) => (
                            <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 text-sm inline-flex items-center gap-1.5">{label} <ExternalLink className="w-3 h-3" /></a></li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
