// src/pages/CareRelocationPage.jsx
// NEW (2026-10-25): hub for care workers thinking of moving abroad. Same honesty rules as VisaPathwaysPage:
//  - every fact carries a status ('reported' = from adviser or secondary sources, not yet checked against the official page;
//    'inforce' = confirmed on the official page). Nothing here is marked 'inforce' unless it was read on an official page.
//  - where a figure could not be confirmed, the page says so and links to the official source instead of guessing a number.
//  - general information only, never personal immigration advice. The fact sheet runs in the browser and sends nothing anywhere.
// To update: edit LAST_CHECKED, COUNTRIES and SCAM_RULES only. No other code changes.

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ExternalLink, AlertTriangle, CheckCircle, HelpCircle, ShieldAlert, Briefcase, Download, Printer } from 'lucide-react';

const LAST_CHECKED = '9 November 2026';

// NEW (2026-11-09): Rural Community Immigration Program (RCIP). IRCC publishes no national employer list: each community designates
// its own employers and publishes its own list. We link to the community source, we do not copy the names (they go stale).
// 'official' = a community or economic development page that we opened and that covers RCIP employers. null = not yet confirmed by us.
// Confirmed 9 Nov 2026: Claresholm and Sudbury pages opened; North Bay page opened (explains designation); Brandon, Moose Jaw, Timmins, Peace Liard
// links come from official sites or search titles but could not be fully opened. Pictou, Sault Ste. Marie, Steinbach, Altona/Rhineland,
// West Kootenay, North Okanagan Shuswap and Thunder Bay still show a news report. Move each link to 'official' when you confirm it.
// 'news' = a secondary news report that names the employers, shown only when no official page is confirmed.
// To update: edit RCIP_CHECKED and RCIP_COMMUNITIES only.
const RCIP_CHECKED = '9 November 2026';
const RCIP_COMMUNITIES = [
    { name: 'Pictou County', prov: 'Nova Scotia', official: null, news: 'https://www.cicnews.com/2025/08/peace-liard-north-okanagan-shuswap-and-pictou-county-reveal-designated-employers-for-rural-pathway-to-permanent-residence-0858929.html' },
    { name: 'North Bay', prov: 'Ontario', official: 'https://nbrcip.ca/employers/', news: null, note: 'Reports monthly intake periods in 2026 with a limit on community recommendations. Employers may recommend up to 3 candidates a year (5 in healthcare). This page explains designation and does not itself show the employer list.' },
    { name: 'Sudbury', prov: 'Ontario', official: 'https://investsudbury.ca/why-sudbury/newcomers/employers-and-rcip-fcip/', news: null, note: 'This community page explains how employers become designated. It does not itself list employers, so ask the Sudbury office or look for its list.' },
    { name: 'Timmins', prov: 'Ontario', official: 'https://timminsedc.com/wp-content/uploads/2023/04/Designated-Employer-List-Timmins-Regional-RCIP-FCIP-1.pdf', news: null, note: 'This PDF has an older upload date. Check the Timmins economic development site for the current list.' },
    { name: 'Sault Ste. Marie', prov: 'Ontario', official: null, news: 'https://www.cicnews.com/2025/05/sault-ste-marie-announces-designated-employers-for-rural-pathway-to-permanent-residence-0555019.html', note: 'Reported to open short application windows. Check the dates before you plan.' },
    { name: 'Thunder Bay', prov: 'Ontario', official: null, news: 'https://www.canadim.com/news/thunder-bay-rcip-designated-employer-list/', note: 'A law-firm report says the list is on the Thunder Bay Community Economic Development Commission site (gotothunderbay.ca). We could not open that site to confirm.' },
    { name: 'Steinbach', prov: 'Manitoba', official: null, news: 'https://www.cicnews.com/2025/05/steinbach-reveals-designated-employers-for-rural-pathway-to-permanent-residence-0555904.html' },
    { name: 'Altona/Rhineland', prov: 'Manitoba', official: null, news: 'https://www.cicnews.com/2025/07/altona-rhineland-in-manitoba-announces-priority-sectors-and-designated-employers-for-rural-pathway-to-permanent-residence-0758247.html' },
    { name: 'Brandon', prov: 'Manitoba', official: 'https://economicdevelopmentbrandon.com/rcip/rcip-list-of-designated-employers', news: null, note: 'Economic Development Brandon page titled List of Designated Employers. Its site blocked our automated check, so open it yourself to see the current list.' },
    { name: 'Moose Jaw', prov: 'Saskatchewan', official: 'https://rcip.mjchamber.com/', news: null, note: 'The City of Moose Jaw immigration page links to this program site. We could not open it to check for an employer list.' },
    { name: 'Claresholm', prov: 'Alberta', official: 'https://www.claresholm.ca/business/labour-resources/rural-community-immigration-pilot', news: null, note: 'Small yearly quota. Its health care employers were listed as not hiring when we checked.' },
    { name: 'West Kootenay', prov: 'British Columbia', official: null, news: 'https://getgis.org/news/canadas-west-kootenay-reveals-designated-employers-for-rural-pr-pathway' },
    { name: 'North Okanagan Shuswap', prov: 'British Columbia', official: null, news: 'https://www.cicnews.com/2025/08/peace-liard-north-okanagan-shuswap-and-pictou-county-reveal-designated-employers-for-rural-pathway-to-permanent-residence-0858929.html' },
    { name: 'Peace Liard', prov: 'British Columbia', official: 'https://www.northernrockies.ca/media/file/one-pager', news: null, note: 'Program information from the Northern Rockies municipality (led by Community Futures Peace Liard and Northern Lights College). It does not mention a public employer list. More at northernrockies.ca/RCIP.' }
];

function RcipDirectory() {
    const ext = 'text-primary-400 hover:text-primary-300 text-xs inline-flex items-center gap-1';
    return (
        <section className="mt-6 border-t border-slate-800 pt-5" aria-labelledby="rcip">
            <h3 id="rcip" className="text-white font-semibold text-sm">Rural Community Immigration Program: employers by community</h3>
            <p className="text-xs text-slate-400 mt-1">There is no single national list of employers. Each of the 14 communities designates its own employers and publishes its own list, so use the community's page and look for roles that match your care job. You apply to the employer directly, the employer must be designated, and the community recommends you. Nobody can sell you a job offer. Checked {RCIP_CHECKED}.</p>
            <ul className="grid sm:grid-cols-2 gap-3 mt-3">
                {RCIP_COMMUNITIES.map(x => (
                    <li key={x.name} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <p className="text-white text-sm font-medium">{x.name} <span className="text-slate-500 font-normal">{x.prov}</span></p>
                        {x.official
                            ? <a href={x.official} target="_blank" rel="noopener noreferrer" className={ext + ' mt-1'}>Community page with employer information <ExternalLink className="w-3 h-3" /></a>
                            : <p className="text-xs text-slate-500 mt-1">We have not yet confirmed this community's own page. Search for its economic development office and RCIP.</p>}
                        {!x.official && x.news && <a href={x.news} target="_blank" rel="noopener noreferrer" className={ext + ' mt-1'}>News report that names employers (not official, may be out of date) <ExternalLink className="w-3 h-3" /></a>}
                        {x.note && <p className="text-xs text-amber-200 mt-1">{x.note}</p>}
                    </li>
                ))}
            </ul>
            <p className="text-xs text-slate-500 mt-3">Lists change and employers fill their places, so a name on a list does not mean there is a job. Confirm on the community page that the employer is currently hiring for your role.</p>
        </section>
    );
}

const STATUS = {
    inforce:  { label: 'Confirmed on official page', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', Icon: CheckCircle },
    reported: { label: 'Reported - verify',          cls: 'text-sky-400 bg-sky-500/10 border-sky-500/30',             Icon: HelpCircle }
};

const COUNTRIES = [
    {
        id: 'CA', name: 'Canada', flag: '🇨🇦',
        headline: 'Care jobs exist, but recent changes to the low-wage employer-sponsored route may limit which employers can hire from abroad.',
        facts: [
            { s: 'inforce', t: 'On 9 November 2026 the Canadian government announced that the Rural Community Immigration pilot becomes a permanent program, with a levels-plan target of 5,500 spaces. The release gives no start date and does not say what happens to people already in the pilot. Until the permanent program starts, the pilot rules below apply and may change.' },
            { s: 'inforce', t: 'Under the pilot, you need a full-time, year-round job offer from an employer designated by one of the participating communities, and the community recommends you. The program does not match candidates with jobs, so you approach employers yourself.' },
            { s: 'inforce', t: 'Pilot requirements include about 1,560 paid hours of work experience in the past three years (not self-employed), an approved language test (CLB 5 for a TEER 3 job such as Personal Support Worker, NOC 33102), an educational credential or its foreign equivalent, and proof of funds. Check the official pages for your own case.' },
            { s: 'reported', t: 'The pay level that separates the high-wage and low-wage employer-sponsored routes (the LMIA) rose on 17 July 2026. The Ontario threshold is now $36.92 an hour (about $67,194 a year at 35 hours a week), per a law-firm report of the Employment and Social Development Canada change. A job that was high-wage before may now be low-wage.' },
            { s: 'reported', t: 'Low-wage LMIA applications are not processed in a city area where unemployment is 6% or higher. The list of affected cities is updated every quarter (the July to October 2026 list covered 26 cities, and a new one was due from 10 October), so check the current list. Under a temporary measure, eligible employers outside city areas can hire low-wage temporary foreign workers for up to 15% of their workforce instead of the usual 10%. Check the end date of the measure on the official page.' },
            { s: 'reported', t: 'Many care roles (nurse aides, orderlies and patient service associates fall under occupation code NOC 33102) pay below the high-wage level, so these limits can affect which employers can sponsor. Whether they apply to a given job depends on its pay, location and the current rules.' },
            { s: 'reported', t: 'Canadian rules do not allow an employer to charge a worker for the LMIA or for the job. Confirm this for your case on an official page.' }
        ],
        checks: [
            'For the Rural Community Immigration route, confirm on the community page that the employer is designated and is hiring for your role now.',
            'Ask the employer for the job offer and its LMIA details in writing, and check them on the official Canadian pages.',
            'Find out whether the job is in a city area or a rural area, because the rules differ.',
            'Check whether the pay offered meets the current rate for that province.',
            'Do not pay anyone for an LMIA, a job offer or a place in a queue.'
        ],
        links: [['Rural Community Immigration: who can apply (IRCC)', 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/eligibility.html'], ['Rural Community Immigration: hire a candidate (IRCC)', 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/hire/candidate.html'], ['Work in Canada (IRCC)', 'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html'], ['Foreign workers (ESDC)', 'https://www.canada.ca/en/employment-social-development/services/foreign-workers.html'], ['Job Bank', 'https://www.jobbank.gc.ca/'], ['Moving2Canada: July 2026 wage threshold change (report)', 'https://moving2canada.com/2026/07/new-lmia-wage-threshold-july-17/']],
        advisers: 'Licensed immigration consultants are regulated by the College of Immigration and Citizenship Consultants. Lawyers are regulated by their provincial law society.'
    },
    {
        id: 'AU', name: 'Australia', flag: '🇦🇺',
        headline: 'Aged care providers can sponsor workers, but only some have the special agreement that gives the faster route. Ask every employer.',
        facts: [
            { s: 'reported', t: 'Aged or Disabled Carer and Personal Care Assistant are reported under occupation code ANZSCO 423111. Nursing Support Worker is reported as 423314.' },
            { s: 'reported', t: 'A provider can use the Aged Care Industry Labour Agreement only after it has been granted access. Access is for the provider, not for you, and is reported to need an agreement with a union (ANMF, HSU or UWU depending on the occupation) and a request to Home Affairs.' },
            { s: 'reported', t: 'A migration-sector guide last updated 3 July 2025 reports that the agreement gives a route to permanent residence through the 186 visa after two years of full-time work in a relevant care job in Australia. It reports an age limit of under 45 for the 186 visa (none for the temporary 482), and English of IELTS 5.5 for the 186 or 5.0 for the 482. That guide is more than a year old, so confirm every figure with Home Affairs.' },
            { s: 'reported', t: 'Employers are not allowed to recover recruitment or sponsorship costs from the worker (Regulation 2.87, as reported). If an employer or agent asks you to pay, treat that as a red flag.' },
            { s: 'reported', t: 'The core skills income threshold is reported as A$79,423 from 1 July 2026, but the sources I found disagree on how it applies to aged care, so confirm with Home Affairs or a registered migration agent.' }
        ],
        checks: [
            'Ask the employer whether it has access to the Aged Care Industry Labour Agreement, and ask to see the confirmation.',
            'Ask which visa the employer proposes and read the matching Home Affairs page.',
            'Check your English test result against the level the visa asks for.',
            'Use only a migration agent registered with the Australian regulator.'
        ],
        links: [['Home Affairs (visas and sponsorship)', 'https://immi.homeaffairs.gov.au/'], ['Register of migration agents (OMARA)', 'https://www.mara.gov.au/'], ['Aged care sponsorship guide (agency, secondary source)', 'https://widen.com.au/sponsor-aged-care-workers-australia/']],
        advisers: 'Only agents registered with the Office of the Migration Agents Registration Authority, and Australian legal practitioners, may give immigration assistance.'
    },
    {
        id: 'NZ', name: 'New Zealand', flag: '🇳🇿',
        headline: 'There is a dedicated care workforce route to residence, but pay and employer rules apply. Read the official page before you rely on it.',
        facts: [
            { s: 'inforce', t: 'Care Workforce Work to Residence visa (Immigration New Zealand page, applications shown as open): you must be aged 55 or younger, and have worked in New Zealand for at least 24 months in a care workforce job within the 30 months before you apply, paid at least the care workforce wage rate in place at the start of that period.' },
            { s: 'inforce', t: 'You also need a job or job offer in a care workforce role with an accredited employer, permanent or fixed-term for at least 12 months, English you can show by an English test no more than 2 years old (or other accepted proof), and good health and character.' },
            { s: 'inforce', t: 'The visa lets you stay with travel conditions for 2 years. After 2 years in a row on it you can apply for a Permanent Resident Visa. The page does not state the wage rate, so read the official wage rates page.' },
            { s: 'reported', t: 'To work in most jobs on an Accredited Employer Work Visa, the employer must be accredited. Check the employer\'s name against Immigration New Zealand\'s official list before you accept any offer.' },
            { s: 'reported', t: 'Two new residence pathways under the Skilled Migrant Category started on 24 August 2026. See our Visa Pathways page for what we found.' },
            { s: 'reported', t: 'Pay rules apply to care roles under the work and residence visas. A job paid below the required rate may not count towards residence, so check the current rate on the official page.' }
        ],
        checks: [
            'Check the employer is accredited on the official list.',
            'Ask for the job offer in writing, with pay and hours, and compare the pay with the rate on the official page.',
            'Read the Care Workforce Work to Residence page for the current conditions.',
            'Use only an adviser licensed by the Immigration Advisers Authority.'
        ],
        links: [['Care Workforce Work to Residence visa', 'https://www.immigration.govt.nz/visas/care-workforce-work-to-residence-visa'], ['Immigration New Zealand', 'https://www.immigration.govt.nz/'], ['Our Visa Pathways page', '/visa-pathways']],
        advisers: 'Immigration advice in New Zealand must come from a licensed adviser, or a lawyer or exempt person. The Immigration Advisers Authority keeps the register.'
    },
    {
        id: 'IE', name: 'Ireland', flag: '🇮🇪',
        headline: 'Healthcare assistants can apply under a lower-pay permit category. Check the current pay level and the training condition.',
        facts: [
            { s: 'reported', t: 'Healthcare assistants apply under the General Employment Permit. The employer must be trading in Ireland and registered with Revenue and the Companies Registration Office. A labour market needs test may apply.' },
            { s: 'reported', t: 'The Department of Enterprise checklist says a relevant QQI Level 5 qualification should be attained after two years of employment in the State, and applies this at permit renewal rather than for a new permit. Confirm the current wording on the Department of Enterprise page.' },
            { s: 'reported', t: 'The Department of Enterprise healthcare assistant checklist (undated) gives a minimum of EUR 32,691 a year for a 39-hour week (EUR 16.12 an hour), basic pay only, with the job advertised on JobsIreland for 28 days. Because the checklist has no date, confirm the figure on the Department of Enterprise page before relying on it.' }
        ],
        checks: [
            'Check the employer is registered in Ireland and ask how it will meet the labour market test, where required.',
            'Compare the pay offered with the current minimum for healthcare assistants on the Department of Enterprise page.',
            'Ask the employer how and when you will be supported to get the Level 5 qualification.',
            'Do not pay any fee to get a permit or a job.'
        ],
        links: [['Employment permits (Department of Enterprise)', 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/'], ['Citizens Information', 'https://www.citizensinformation.ie/'], ['EURES job mobility portal', 'https://eures.europa.eu/']],
        advisers: 'Take advice from a solicitor or barrister for your own case.'
    }
];

const UK_NOW = {
    title: 'Already a sponsored care worker in the UK?',
    facts: [
        { s: 'reported', t: 'The Health and Care Worker visa closed to new overseas care worker recruitment on 22 July 2025, and people already in the UK on that visa can generally change to another licensed sponsor until 22 July 2028. A law-firm report (Pinsent Masons) gives both dates. We could not open gov.uk from our tools, so confirm both dates there before you act.' },
        { s: 'reported', t: 'If your sponsor loses its licence or your job ends, you generally have only a limited time to find a new sponsor or leave. Check the current rule on gov.uk before you resign or sign anything.' }
    ],
    links: [['Skilled Worker and Health and Care visas (gov.uk)', 'https://www.gov.uk/skilled-worker-visa'], ['Register of licensed sponsors', 'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers'], ['UK settlement changes on our Visa Pathways page', '/visa-pathways']]
};

const SCAM_RULES = [
    'Never pay anyone for a job offer, sponsorship, a certificate of sponsorship, or a place in a queue. Genuine employers pay their own sponsorship costs, and in several countries the law forbids passing them to you.',
    'Check the employer on the official register or list for that country. Copy the name from the register, not from the offer.',
    'Deal with immigration authorities only through their official government websites. Ignore anyone who says they are an "official" on WhatsApp, Telegram or Facebook.',
    'Be suspicious of promises such as "guaranteed visa", "no interview", "no experience needed" or "pay now to secure your slot".',
    'Keep your passport and original documents. Never hand them to an employer or an agent.',
    'Use only a regulated adviser for advice about your own case, and ask for their registration number and check it on the regulator\'s register.',
    'If you have been scammed, report it to the fraud service of the police in your country and tell the platform you saw the job on.'
];

const blank = { sponsor: 'with', careYears: '', english: 'none', quals: '', partner: 'no', partnerCare: 'no', kids: '0', funds: 'under3', timeline: '12', targets: { CA: true, AU: true, NZ: true, IE: true } };

function buildSheet(f) {
    const L = []; const add = (t = '') => L.push(t);
    const eng = { test: 'I have a recent English test result (IELTS or similar)', degree: 'My degree was taught in English and I have the evidence', none: 'I have no English evidence yet' }[f.english];
    const sp = { with: 'I am still with my UK sponsor', lost: 'My sponsor has ended or lost its licence', unsure: 'I am not sure of my sponsor position' }[f.sponsor];
    const fu = { under3: 'under 3,000 pounds', '3to10': '3,000 to 10,000 pounds', '10to25': '10,000 to 25,000 pounds', over25: 'over 25,000 pounds' }[f.funds];
    add('MY CARE RELOCATION FACT SHEET'); add('Made on ' + new Date().toLocaleDateString('en-GB') + '. Private: made in your browser and not sent anywhere.'); add();
    add('1. MY STARTING POINT');
    add('- Sponsor: ' + sp); add('- Years in care work: ' + (f.careYears || 'not entered')); add('- Qualifications and certificates: ' + (f.quals || 'not entered'));
    add('- English: ' + eng);
    add('- Partner: ' + (f.partner === 'yes' ? 'yes' + (f.partnerCare === 'yes' ? ', works or trained in care' : '') : 'no')); add('- Children: ' + f.kids);
    add('- Funds I could show: ' + fu); add('- Hoped-for timeline: ' + f.timeline + ' months');
    add('- Countries I am looking at: ' + (COUNTRIES.filter(c => f.targets[c.id]).map(c => c.name).join(', ') || 'none chosen')); add();
    add('2. THINGS TO SETTLE BEFORE ANYTHING ELSE');
    let n = 1; const q = (t) => add(`${n++}. ${t}`);
    q('Do not resign, sign, or pay anything until you hold a written job offer from an employer you have checked on the official register or list for that country.');
    if (f.sponsor !== 'with') q('Your UK sponsor position affects your timing. Check on gov.uk how long you have and what your options are before you act.');
    if (f.english === 'none') q('English: you have no evidence yet. Each country accepts different tests and scores. Find the accepted tests on the official page, and book one early because results take time.');
    else if (f.english === 'degree') q('English: check whether each country accepts a degree taught in English as evidence, and what proof they ask for.');
    else q('English: check that your test is accepted, is recent enough, and meets the score for each route.');
    if (f.partner === 'yes' || Number(f.kids) > 0) q('Family: for each country, check whether your partner may work, whether your children can go to school without fees, what each dependant costs to include, and what funds you must show per person.');
    if (f.funds === 'under3' || f.funds === '3to10') q('Funds: many routes ask for proof of money, and moving costs are high. Add up flights, deposits, first-month costs and any fees, and check each route\'s figure for your family size.');
    q('Qualifications: check which care certificate each country accepts, and whether a local qualification or registration is needed after you arrive.');
    q('Records: gather your passport, contracts, payslips, references, training certificates, degree and police certificates now. Some take weeks to get.'); add();
    add('3. QUESTIONS FOR EACH COUNTRY');
    COUNTRIES.filter(c => f.targets[c.id]).forEach(c => { add(c.name.toUpperCase()); c.checks.forEach(t => add('- ' + t)); add(); });
    add('4. WHERE TO GET ADVICE ABOUT MY OWN CASE');
    add('Only a regulated adviser or a lawyer can tell you whether you qualify. This sheet is a list of questions, not an assessment of your chances.');
    return L.join('\n');
}

// NEW (2026-10-25): look an employer up on the official lists loaded by the site admin (Canada and New Zealand).
function EmployerCheck({ country }) {
    const [name, setName] = useState('');
    const [res, setRes] = useState(null);
    const [info, setInfo] = useState([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const supported = country === 'CA' || country === 'NZ' || country === 'GB';
    const run = async (e) => {
        e.preventDefault(); setBusy(true); setErr(''); setRes(null);
        try {
            const a = await supabase.rpc('check_employer_register', { p_name: name, p_country: country });
            const b = await supabase.rpc('register_status', { p_country: country });
            if (a.error || b.error) throw new Error('The check is not available right now.');
            setRes(a.data || []); setInfo(b.data || []);
        } catch (x) { setErr(x.message); } finally { setBusy(false); }
    };
    if (!supported) return <p className="text-xs text-slate-500 mt-3">No public employer list is loaded for this country. Use the official links above to check an employer.</p>;
    const loaded = info.find(i => i.loaded_on);
    return (
        <div className="mt-4 border-t border-slate-800 pt-4">
            <h3 className="text-white font-medium text-sm">Check an employer</h3>
            <form onSubmit={run} className="mt-2 flex gap-2">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Employer name" aria-label="Employer name" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                <button disabled={busy || name.trim().length < 3} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg text-sm">Check</button>
            </form>
            {err && <p className="text-xs text-red-300 mt-2">{err}</p>}
            {res && (res.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-slate-200">{res.map((r, i) => <li key={i}>{r.match_kind === 'exact' ? 'Name found' : 'Similar name'}: <b>{r.employer_name}</b>{r.place ? ` (${r.place})` : ''}</li>)}</ul>
            ) : (
                <p className="mt-2 text-sm text-amber-200">{loaded ? 'No match on the list we hold.' : 'The official list has not been loaded yet, so we cannot check this.'} That does not mean the employer is fake or genuine. Use the official source.</p>
            ))}
            {res && info[0] && <p className="text-xs text-slate-500 mt-2">{info[0].title}{loaded ? `, loaded ${loaded.loaded_on}` : ''}. {info[0].caveat} A name match does not prove an advert or offer is genuine. <a className="text-primary-400" href={info[0].source_url} target="_blank" rel="noopener noreferrer">Official source</a></p>}
        </div>
    );
}

export default function CareRelocationPage() {
    const [tab, setTab] = useState('CA');
    const [f, setF] = useState(blank);
    const [sheet, setSheet] = useState('');
    const c = COUNTRIES.find(x => x.id === tab);
    const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
    const sel = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white';
    const download = () => { const u = URL.createObjectURL(new Blob([sheet], { type: 'text/plain' })); const a = document.createElement('a'); a.href = u; a.download = 'my-care-relocation-fact-sheet.txt'; a.click(); URL.revokeObjectURL(u); };
    const L = (url) => url.startsWith('/') ? <Link to={url} className="text-primary-400 hover:text-primary-300 text-sm">{url}</Link> : null;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Care Relocation Hub</h1>
                <p className="text-slate-400 mt-2 text-sm">For care workers thinking about working in Canada, Australia, New Zealand or Ireland: what to look for, how to check an employer, and what to watch out for. Last checked {LAST_CHECKED}.</p>

                <div className="mt-4 flex gap-2 items-start bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>General information only, not immigration advice. We are not immigration advisers and cannot say whether you qualify. Rules change often. Each point is labelled <b>Confirmed on official page</b> or <b>Reported - verify</b>, and where we could not confirm a figure the page links to the official source instead of guessing. Always check the official page and use a regulated adviser for your own case.</p>
                </div>

                <section className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-5" aria-labelledby="scam">
                    <h2 id="scam" className="text-white font-semibold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-300" />Care visa scams: seven rules</h2>
                    <p className="text-xs text-red-100/80 mt-1">Fake "sponsorship fees" and fake job offers are common in care work. These rules protect you.</p>
                    <ol className="list-decimal list-inside space-y-1.5 mt-3 text-sm text-slate-200">{SCAM_RULES.map((t, i) => <li key={i}>{t}</li>)}</ol>
                </section>

                <div className="mt-8 flex gap-2 overflow-x-auto" role="tablist">
                    {COUNTRIES.map(x => (
                        <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${tab === x.id ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{x.flag} {x.name}</button>
                    ))}
                </div>

                <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <p className="text-white font-medium">{c.headline}</p>
                    <Link to={`/jobs?country=${c.id}&care=1`} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm"><Briefcase className="w-4 h-4" />See care jobs in {c.name}</Link>
                    <p className="text-xs text-slate-500 mt-1">On the job board, "Verified sponsor employer" means we matched the employer to an official register. "Says it sponsors (unchecked)" means only the advert says so.</p>
                    <EmployerCheck key={c.id} country={c.id} />
                    {c.id === 'CA' && <RcipDirectory />}

                    <h3 className="text-slate-300 text-sm font-semibold mt-5 mb-2">What to know</h3>
                    <ul className="space-y-2">{c.facts.map((x, i) => { const st = STATUS[x.s]; return (
                        <li key={i} className="flex gap-3 items-start text-sm text-slate-300"><span className={`shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${st.cls}`}><st.Icon className="w-3 h-3" /> {st.label}</span><span>{x.t}</span></li>); })}</ul>

                    <h3 className="text-slate-300 text-sm font-semibold mt-5 mb-2">Questions to settle before you accept an offer</h3>
                    <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300">{c.checks.map((t, i) => <li key={i}>{t}</li>)}</ul>

                    <h3 className="text-slate-300 text-sm font-semibold mt-5 mb-2">Official and reference sources</h3>
                    <ul className="space-y-1">{c.links.map(([label, url]) => <li key={url}>{url.startsWith('/') ? L(url) : <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 text-sm inline-flex items-center gap-1.5">{label} <ExternalLink className="w-3.5 h-3.5" /></a>}</li>)}</ul>
                    <p className="text-xs text-slate-400 mt-4"><b className="text-slate-300">Who may advise you:</b> {c.advisers}</p>
                </div>

                <section className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h2 className="text-white font-semibold">{UK_NOW.title}</h2>
                    <EmployerCheck country="GB" />
                    <ul className="space-y-2 mt-3">{UK_NOW.facts.map((x, i) => { const st = STATUS[x.s]; return (
                        <li key={i} className="flex gap-3 items-start text-sm text-slate-300"><span className={`shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${st.cls}`}><st.Icon className="w-3 h-3" /> {st.label}</span><span>{x.t}</span></li>); })}</ul>
                    <ul className="space-y-1 mt-3">{UK_NOW.links.map(([label, url]) => <li key={url}>{url.startsWith('/') ? L(url) : <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 text-sm inline-flex items-center gap-1.5">{label} <ExternalLink className="w-3.5 h-3.5" /></a>}</li>)}</ul>
                </section>

                <section className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h2 className="text-white font-semibold">Build your own fact sheet</h2>
                    <p className="text-xs text-slate-400 mt-1">Answer a few questions and get a checklist of what to settle for the countries you choose. It is made in your browser. Nothing is saved or sent. It is a list of questions, not an assessment of your chances.</p>
                    <div className="grid sm:grid-cols-2 gap-3 mt-4">
                        <label className="text-xs text-slate-400">UK sponsor<select className={sel} value={f.sponsor} onChange={e => set('sponsor', e.target.value)}><option value="with">Still with my sponsor</option><option value="lost">Ended or lost its licence</option><option value="unsure">Not sure</option></select></label>
                        <label className="text-xs text-slate-400">Years in care work<input className={sel} inputMode="numeric" value={f.careYears} onChange={e => set('careYears', e.target.value.replace(/[^0-9.]/g, '').slice(0, 4))} /></label>
                        <label className="text-xs text-slate-400">English evidence<select className={sel} value={f.english} onChange={e => set('english', e.target.value)}><option value="none">None yet</option><option value="test">Recent English test result</option><option value="degree">Degree taught in English</option></select></label>
                        <label className="text-xs text-slate-400">Care qualifications and certificates<input className={sel} maxLength={200} value={f.quals} onChange={e => set('quals', e.target.value)} placeholder="e.g. Level 2 or 3 diploma, Care Certificate" /></label>
                        <label className="text-xs text-slate-400">Partner<select className={sel} value={f.partner} onChange={e => set('partner', e.target.value)}><option value="no">No partner moving with me</option><option value="yes">Partner moving with me</option></select></label>
                        <label className="text-xs text-slate-400">Partner works or trained in care<select className={sel} value={f.partnerCare} onChange={e => set('partnerCare', e.target.value)} disabled={f.partner !== 'yes'}><option value="no">No</option><option value="yes">Yes</option></select></label>
                        <label className="text-xs text-slate-400">Children moving with me<select className={sel} value={f.kids} onChange={e => set('kids', e.target.value)}>{[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
                        <label className="text-xs text-slate-400">Funds I could show<select className={sel} value={f.funds} onChange={e => set('funds', e.target.value)}><option value="under3">Under 3,000 pounds</option><option value="3to10">3,000 to 10,000 pounds</option><option value="10to25">10,000 to 25,000 pounds</option><option value="over25">Over 25,000 pounds</option></select></label>
                        <label className="text-xs text-slate-400">Timeline<select className={sel} value={f.timeline} onChange={e => set('timeline', e.target.value)}><option value="6">About 6 months</option><option value="12">About 12 months</option><option value="24">About 2 years</option></select></label>
                    </div>
                    <fieldset className="mt-3"><legend className="text-xs text-slate-400">Countries I am looking at</legend>
                        <div className="flex flex-wrap gap-3 mt-1">{COUNTRIES.map(x => <label key={x.id} className="text-sm text-slate-300 inline-flex items-center gap-1.5"><input type="checkbox" checked={!!f.targets[x.id]} onChange={e => set('targets', { ...f.targets, [x.id]: e.target.checked })} />{x.flag} {x.name}</label>)}</div></fieldset>
                    <button type="button" onClick={() => setSheet(buildSheet(f))} className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm">Build my fact sheet</button>
                    {sheet && (<div className="mt-4">
                        <pre className="whitespace-pre-wrap text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">{sheet}</pre>
                        <div className="mt-2 flex gap-2"><button type="button" onClick={download} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg inline-flex items-center gap-1"><Download className="w-4 h-4" />Download</button><button type="button" onClick={() => window.print()} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg inline-flex items-center gap-1"><Printer className="w-4 h-4" />Print</button></div></div>)}
                </section>

                <p className="text-xs text-slate-500 mt-8">This page lists jobs and shares general information. It does not process visas, give personal immigration advice or guarantee any job. Nothing on it is a recommendation to leave your current job or country.</p>
            </div>
        </div>
    );
}
