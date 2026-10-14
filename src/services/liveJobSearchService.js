// src/services/liveJobSearchService.js
//
// NEW (2026-08-27) — a genuinely different feature from the batch
// fetch-and-approve pipeline in rssJobService.js. That pipeline runs on
// a schedule, saves candidates to external_jobs for admin review, and
// only approved jobs ever reach a real user. This is deliberately
// different: when someone asks the chat a job-search question, this
// reaches out LIVE, in that same moment, to a small set of sources -
// bypassing admin review entirely for this specific instant-search use
// case.
//
// SAFETY DESIGN, not just a raw live fetch:
// 1. Only queries sources CONFIRMED reliably reachable from this
//    platform's real infrastructure (Jobicy, Remotive, Himalayas, We
//    Work Remotely) - deliberately excludes the 8 government RSS
//    sources already confirmed unreachable from Vercel's IPs (11/12
//    failed a live connection test this session). Trying those here
//    would only make every chat response slow AND still fail for those
//    specific sources - there is no live-search benefit to attempting
//    a source already known not to respond.
// 2. Runs all sources in PARALLEL (Promise.all), not sequentially -
//    the total wait is whatever the single slowest source takes, not
//    the sum of all of them.
// 3. Hard-timeboxed per source AND overall, so one slow/hanging source
//    can never make a chat response hang indefinitely - if the overall
//    budget is exceeded, returns whatever succeeded so far rather than
//    blocking the whole response.
// 4. Results are clearly, honestly labeled as live/not-yet-reviewed -
//    unlike the job board's approved listings, nothing here has passed
//    any human review. The chat is instructed to say so plainly, not
//    present live results with the same confidence as curated ones.
// 5. Real per-user rate limiting (see checkLiveSearchRateLimit) and a
//    short-lived cache, so this can't be abused to hammer free
//    third-party APIs into rate-limiting or blocking this platform.

import { countryName } from './jobIntent.js';
import { joobleKeyFor, joobleEndpoint } from './joobleConfig.js';

const LIVE_SEARCH_TIMEOUT_MS = 8000;
const PER_SOURCE_TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map(); // key: normalized query+filters, value: {data, timestamp}

function cacheKey(keyword, country, sponsorshipOnly) {
    return `${(keyword || '').toLowerCase().trim()}|${country || ''}|${sponsorshipOnly ? 1 : 0}`;
}

async function withTimeout(promise, ms, fallback) {
    let timeoutId;
    const timeout = new Promise(resolve => {
        timeoutId = setTimeout(() => resolve(fallback), ms);
    });
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timeoutId);
    return result;
}

async function fetchJobicyLive(keyword) {
    try {
        const url = `https://jobicy.com/api/v2/remote-jobs?count=15${keyword ? `&tag=${encodeURIComponent(keyword)}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.jobs || []).map(job => ({
            title: job.jobTitle,
            company: job.companyName,
            location: job.jobGeo || 'Remote',
            description: (job.jobDescription || '').substring(0, 500),
            salary_range: job.salaryMin && job.salaryMax ? `${job.salaryMin} - ${job.salaryMax}` : null,
            external_apply_url: job.url,
            source_name: 'Jobicy',
            source_country: 'Global',
            sponsorship_eligible: null,
            live: true
        }));
    } catch {
        return [];
    }
}

async function fetchRemotiveLive(keyword) {
    try {
        const url = `https://remotive.com/api/remote-jobs${keyword ? `?search=${encodeURIComponent(keyword)}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.jobs || []).slice(0, 15).map(job => ({
            title: job.title,
            company: job.company_name,
            location: job.candidate_required_location || 'Remote',
            description: (job.description || '').replace(/<[^>]*>/g, '').substring(0, 500),
            salary_range: job.salary || null,
            external_apply_url: job.url,
            source_name: 'Remotive',
            source_country: 'Global',
            sponsorship_eligible: null,
            live: true
        }));
    } catch {
        return [];
    }
}

async function fetchHimalayasLive() {
    try {
        const response = await fetch('https://himalayas.app/jobs/api?limit=15');
        if (!response.ok) return [];
        const data = await response.json();
        return (data.jobs || data.data || []).map(job => ({
            title: job.title,
            company: job.companyName || job.company?.name || 'Unknown Company',
            location: 'Remote (Worldwide)',
            description: (job.description || job.excerpt || '').substring(0, 500),
            salary_range: null,
            external_apply_url: job.applicationLink || job.url || null,
            source_name: 'Himalayas',
            source_country: 'Global',
            sponsorship_eligible: null,
            live: true
        }));
    } catch {
        return [];
    }
}

async function fetchWeWorkRemotelyLive() {
    try {
        const response = await fetch('https://weworkremotely.com/categories/remote-programming-jobs.rss');
        if (!response.ok) return [];
        const text = await response.text();
        const itemBlocks = text.match(/<item[\s\S]*?<\/item>/gi) || [];
        const jobs = [];
        for (const block of itemBlocks.slice(0, 15)) {
            const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
            const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
            const descMatch = block.match(/<description>([\s\S]*?)<\/description>/i);
            const decode = (s) => (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
                .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            const title = decode(titleMatch?.[1]);
            const link = decode(linkMatch?.[1]);
            if (!title || !link) continue;
            jobs.push({
                title,
                company: 'We Work Remotely',
                location: 'Remote',
                description: decode(descMatch?.[1]).substring(0, 500),
                salary_range: null,
                external_apply_url: link,
                source_name: 'We Work Remotely',
                source_country: 'Global',
                sponsorship_eligible: null,
                live: true
            });
        }
        return jobs;
    } catch {
        return [];
    }
}

// Real per-visitor rate limit - separate from and tighter than the normal
// chat credit system, since this triggers several real third-party API
// calls per invocation. Reuses the security_events table already used
// elsewhere for rate limiting. Signed-in members are counted by user id;
// visitors who are not signed in are counted by IP address, so one visitor
// cannot use up the allowance for everyone else.
// CHANGED (2026-10-14): limits can be raised in Vercel without a code change. Jooble removed its own request
// limits on the keys for the UK, US, Canada, Australia, New Zealand, Ireland, Germany, UAE, South Africa and
// Nigeria (ticket 1974824), so these caps now only protect server time and abuse, not the keys.
//   LIVE_SEARCH_MEMBER_PER_HOUR   live searches per signed-in member per hour      (default 20)
//   LIVE_SEARCH_GUEST_PER_HOUR    live searches per visitor (IP) per hour          (default 8)
//   JOOBLE_GUEST_PER_HOUR         Jooble calls per visitor (IP) per hour           (default 8)
//   JOOBLE_SITE_PER_HOUR          Jooble calls across the whole site per hour      (default 2000)
// Set a value to 0 for "no limit" on that line. Identical searches are also answered from a short cache.
function limitFromEnv(name, fallback) {
    const raw = typeof process !== 'undefined' ? process.env[name] : undefined;
    const n = raw === undefined || raw === '' ? NaN : Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}
const MAX_LIVE_SEARCHES_PER_HOUR = () => limitFromEnv('LIVE_SEARCH_MEMBER_PER_HOUR', 20);
const MAX_GUEST_LIVE_SEARCHES_PER_HOUR = () => limitFromEnv('LIVE_SEARCH_GUEST_PER_HOUR', 8);
const GUEST_JOOBLE_PER_HOUR = () => limitFromEnv('JOOBLE_GUEST_PER_HOUR', 8);
const JOOBLE_PER_HOUR_ALL = () => limitFromEnv('JOOBLE_SITE_PER_HOUR', 2000);

function who(userId, ip) { return userId ? { userId } : { ip: ip || 'unknown' }; }

export async function checkLiveSearchRateLimit(supabaseClient, userId, ip) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseClient
        .from('security_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'live_job_search')
        .gte('created_at', since)
        .contains('details', who(userId, ip));
    const limit = userId ? MAX_LIVE_SEARCHES_PER_HOUR() : MAX_GUEST_LIVE_SEARCHES_PER_HOUR();
    if (limit > 0 && (count || 0) >= limit) {
        return { allowed: false, message: 'Live job search limit reached for this hour - please try again shortly, or browse the job board directly.' };
    }
    return { allowed: true };
}

// Decides whether THIS search may call Jooble. Visitors get a small hourly
// allowance each; the whole site has an hourly cap so the keys last. A search
// that is refused still returns the other sources, so nothing breaks.
export async function checkJoobleAllowance(supabaseClient, userId, ip) {
    try {
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: siteCount } = await supabaseClient
            .from('security_events').select('id', { count: 'exact', head: true })
            .eq('event_type', 'jooble_live_call').gte('created_at', since);
        const siteLimit = JOOBLE_PER_HOUR_ALL();
        if (siteLimit > 0 && (siteCount || 0) >= siteLimit) return false;
        if (!userId) {
            const { count } = await supabaseClient
                .from('security_events').select('id', { count: 'exact', head: true })
                .eq('event_type', 'jooble_live_call').gte('created_at', since)
                .contains('details', { ip: ip || 'unknown' });
            const guestLimit = GUEST_JOOBLE_PER_HOUR();
            if (guestLimit > 0 && (count || 0) >= guestLimit) return false;
        }
        return true;
    } catch {
        return false; // if the check itself fails, skip Jooble rather than risk the keys
    }
}

export async function logJoobleCall(supabaseClient, userId, ip) {
    try {
        await supabaseClient.from('security_events').insert({
            event_type: 'jooble_live_call', severity: 'info',
            details: userId ? { userId } : { ip: ip || 'unknown' }
        });
    } catch { /* non-critical */ }
}

export async function logLiveSearch(supabaseClient, userId, keyword, ip) {
    try {
        await supabaseClient.from('security_events').insert({
            event_type: 'live_job_search',
            severity: 'info',
            details: { ...who(userId, ip), keyword: keyword || null }
        });
    } catch {
        // Non-critical - never let logging failure block a real search.
    }
}

// NEW (2026-10-10): keyed sources for more countries, all optional and all
// skipped silently (with an honest note to the user) when the key is missing:
//   ADZUNA_APP_ID + ADZUNA_APP_KEY  - AU, NZ, GB, US, CA, DE, FR, IN, ...
//   JOOBLE_API_KEY_<CODE>           - one key per country site (see joobleConfig.js)
//   REED_API_KEY                    - UK (reed.co.uk)
// Keep these server-side only (Vercel environment variables).
//
// NEW (2026-10-10): country-aware sources. Adzuna covers Australia, New
// Zealand, UK, US, Canada, Germany and others through ONE official API
// (free keys: https://developer.adzuna.com). It needs two environment
// variables on Vercel: ADZUNA_APP_ID and ADZUNA_APP_KEY. Without them this
// source is skipped and the assistant is told so, rather than faking
// results. Arbeitnow (no key) adds Germany / wider Europe.
const ADZUNA_COUNTRIES = { AU: 'au', NZ: 'nz', GB: 'gb', US: 'us', CA: 'ca', DE: 'de', FR: 'fr', IN: 'in', IT: 'it', NL: 'nl', PL: 'pl', SG: 'sg', ZA: 'za', BR: 'br', AT: 'at', BE: 'be', CH: 'ch', ES: 'es', MX: 'mx' };
const EUROPE_FOR_ARBEITNOW = new Set(['DE', 'AT', 'CH', 'NL', 'BE', 'FR', 'PL', 'IT', 'ES']);

export function adzunaConfigured() {
    return !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

async function fetchAdzunaLive(terms, country, city) {
    const cc = ADZUNA_COUNTRIES[country];
    if (!cc || !adzunaConfigured()) return [];
    try {
        const params = new URLSearchParams({
            app_id: process.env.ADZUNA_APP_ID,
            app_key: process.env.ADZUNA_APP_KEY,
            results_per_page: '10',
            'content-type': 'application/json',
            sort_by: 'date'
        });
        if (terms && terms.length) params.set('what', terms.join(' '));
        if (city) params.set('where', city);
        const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${cc}/search/1?${params.toString()}`);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.results || []).map(j => ({
            title: (j.title || '').replace(/<\/?strong>/g, ''),
            company: j.company?.display_name || null,
            location: j.location?.display_name || null,
            description: (j.description || '').substring(0, 400),
            salary_range: j.salary_min && j.salary_max ? `${Math.round(j.salary_min)} - ${Math.round(j.salary_max)}` : null,
            external_apply_url: j.redirect_url,
            source_name: `Adzuna ${country}`,
            source_country: country,
            sponsorship_eligible: null,
            live: true
        }));
    } catch {
        return [];
    }
}


// CHANGED (2026-10-12): Jooble's written reply (ticket 1974824) says live display with a link back to
// Jooble is exactly how the API is meant to be used, and that listings must not be kept for long. So chat
// searches Jooble live and nothing from Jooble is stored (the chat shows the results as cards that are not
// saved). CHANGED (2026-10-13): Jooble's second reply says listings must be visible WITHOUT signing in, so
// visitors now get Jooble results too, with a small per-visitor hourly allowance to protect the keys.
// Kill switch: set JOOBLE_LIVE=off in Vercel to stop all live Jooble requests.
export function joobleChatEnabled(code) { return process.env.JOOBLE_LIVE !== 'off' && !!joobleKeyFor(code); }
export function reedConfigured() { return !!process.env.REED_API_KEY; }

async function fetchJoobleLive(terms, country, city) {
    if (!joobleChatEnabled(country)) return [];
    try {
        const location = city ? city.replace(/\b\w/g, c => c.toUpperCase()) : (countryName(country) || '');
        const response = await fetch(joobleEndpoint(country), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords: (terms || []).join(' '), location, page: 1 })
        });
        if (!response.ok) return [];
        const data = await response.json();
        return (data.jobs || []).slice(0, 10).filter(j => /^https?:\/\//i.test(j.link || '')).map(j => ({
            title: (j.title || '').replace(/<[^>]+>/g, ''),
            company: j.company || j.source || null,
            location: j.location || null,
            description: (j.snippet || '').replace(/<[^>]+>/g, ' ').substring(0, 400),
            salary_range: j.salary || null,
            external_apply_url: j.link,
            source_name: 'Jooble',
            source_country: country,
            sponsorship_eligible: null,
            live: true
        }));
    } catch {
        return [];
    }
}

async function fetchReedLive(terms, city) {
    if (!reedConfigured()) return [];
    try {
        const params = new URLSearchParams({ resultsToTake: '10' });
        if (terms && terms.length) params.set('keywords', terms.join(' '));
        if (city) params.set('locationName', city);
        const auth = Buffer.from(`${process.env.REED_API_KEY}:`).toString('base64');
        const response = await fetch(`https://www.reed.co.uk/api/1.0/search?${params.toString()}`, { headers: { Authorization: `Basic ${auth}` } });
        if (!response.ok) return [];
        const data = await response.json();
        return (data.results || []).map(j => ({
            title: j.jobTitle,
            company: j.employerName || null,
            location: j.locationName || null,
            description: (j.jobDescription || '').substring(0, 400),
            salary_range: j.minimumSalary && j.maximumSalary ? `${Math.round(j.minimumSalary)} - ${Math.round(j.maximumSalary)}` : null,
            external_apply_url: j.jobUrl || (j.jobId ? `https://www.reed.co.uk/jobs/${j.jobId}` : null),
            source_name: 'Reed',
            source_country: 'GB',
            sponsorship_eligible: null,
            live: true
        }));
    } catch {
        return [];
    }
}

async function fetchArbeitnowLive(terms) {
    try {
        const response = await fetch('https://www.arbeitnow.com/api/job-board-api');
        if (!response.ok) return [];
        const data = await response.json();
        const kws = (terms || []).map(t => t.toLowerCase());
        return (data.data || [])
            .filter(j => kws.length === 0 || kws.some(k => (j.title || '').toLowerCase().includes(k) || (j.description || '').toLowerCase().includes(k)))
            .slice(0, 10)
            .map(j => ({
                title: j.title,
                company: j.company_name,
                location: j.location || null,
                description: (j.description || '').replace(/<[^>]+>/g, ' ').substring(0, 400),
                salary_range: null,
                external_apply_url: j.url,
                source_name: 'Arbeitnow',
                source_country: 'DE/EU',
                sponsorship_eligible: null,
                live: true
            }));
    } catch {
        return [];
    }
}

// NEW (2026-10-14): STRICT RELEVANCE GATE. Every live source, Jooble included, goes through the same
// test, so a searcher only sees results that really match what they asked for. The old rule only
// needed ONE search word to appear anywhere in the text, and Jooble results skipped the test
// completely, so loosely related jobs filled the cards. Now a job must:
//   1. have a working apply link;
//   2. contain at least one role word in its TITLE (for "care assistant", "care" or "assistant");
//   3. cover at least 60% of the role words across title and snippet;
//   4. match the city if one was asked for (remote jobs are kept);
//   5. clear a minimum score. Title hits count most, a city match and a visible sponsorship
//      mention add points, and a sponsorship search with no mention costs a point.
// Fewer, closer results are returned instead of padding the list. Generic words such as "jobs",
// "visa" and "sponsorship" are not treated as role words.
const MIN_RELEVANCE_SCORE = 3;
const MAX_LIVE_RESULTS = 8;
const GENERIC_TERMS = new Set(['job', 'jobs', 'work', 'working', 'position', 'positions', 'role', 'roles', 'vacancy', 'vacancies',
    'opening', 'openings', 'hiring', 'career', 'careers', 'opportunity', 'opportunities', 'visa', 'sponsorship', 'sponsored',
    'sponsor', 'sponsoring', 'relocation', 'permit', 'abroad', 'overseas', 'full', 'time', 'part', 'the', 'and', 'for', 'with',
    'near', 'in', 'at', 'a', 'an', 'to', 'of', 'looking', 'find', 'need', 'want']);
const SPONSOR_WORDS = /sponsor|visa|relocation|work permit|skilled worker|certificate of sponsorship|h-?1b|lmia|482|aewv/i;
const SPAM_TITLE = /(earn\s*\$|\$\s*\d+\s*(per|\/)\s*(hour|day|week)\s*from home|no experience needed|unlimited income|get rich|crypto trader wanted)/i;

export function roleTermsOf(terms) {
    const all = (terms || [])
        .flatMap(t => String(t).toLowerCase().split(/\s+/))
        .map(t => t.replace(/[^a-z0-9+#.]/g, ''))
        .filter(t => t.length >= 2);
    const core = all.filter(t => !GENERIC_TERMS.has(t));
    return core.length ? core : all;
}

function termRegex(term) {
    const stem = term.length > 5 ? term.replace(/(ing|es|s)$/, '') : term.replace(/s$/, '');
    return new RegExp('\\b' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

// Returns a score, or null when the job must not be shown.
export function scoreJob(job, roleTerms, { city, sponsorshipOnly }) {
    if (!/^https?:\/\//i.test(job.external_apply_url || '')) return null;
    if (!job.title || SPAM_TITLE.test(job.title)) return null;
    const title = job.title.toLowerCase();
    const desc = (job.description || '').toLowerCase();
    let score = 0;
    if (roleTerms.length) {
        let titleHits = 0, anyHits = 0;
        for (const t of roleTerms) {
            const re = termRegex(t);
            if (re.test(title)) { titleHits++; anyHits++; }
            else if (re.test(desc)) anyHits++;
        }
        if (titleHits === 0 || anyHits / roleTerms.length < 0.6) return null;
        score += titleHits * 3 + (anyHits - titleHits);
    } else {
        score += 1;
    }
    if (city) {
        const loc = (job.location || '').toLowerCase();
        const wanted = city.toLowerCase();
        if (loc && !loc.includes(wanted) && !/remote|anywhere|nationwide|hybrid/.test(loc)) return null;
        if (loc.includes(wanted)) score += 2;
    }
    if (sponsorshipOnly) {
        if (SPONSOR_WORDS.test(`${title} ${desc}`)) { score += 3; job.sponsorship_mentioned = true; }
        else score -= 1;
    }
    if (!job.company || /^unknown/i.test(job.company)) score -= 1;
    if (job.salary_range) score += 0.5;
    return score >= MIN_RELEVANCE_SCORE ? score : null;
}

// The real, main entry point. Returns { jobs, notes }:
//  - jobs: live results, each clearly labelled as unreviewed
//  - notes: plain-language caveats the assistant must pass on honestly
//    (e.g. "no live source is configured for New Zealand")
// With a country named, country-specific sources are used and remote-only
// feeds are skipped (a remote listing is not an Auckland listing). With no
// country, the global remote feeds run as before.
export async function searchLiveExternalJobs({ keyword, terms, country, city, sponsorshipOnly, allowJooble = false } = {}) {
    const termList = (terms && terms.length) ? terms : (keyword ? keyword.split(/\s+/).filter(Boolean) : []);
    const key = cacheKey(termList.join(' '), `${country || ''}:${city || ''}:${allowJooble ? 'j' : 'n'}`, sponsorshipOnly);
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) return cached.data;

    const notes = [];
    let searches;
    if (country) {
        searches = [];
        let providerExistsButOff = false;
        if (ADZUNA_COUNTRIES[country]) {
            if (adzunaConfigured()) searches.push(withTimeout(fetchAdzunaLive(termList, country, city), PER_SOURCE_TIMEOUT_MS, []));
            else providerExistsButOff = true;
        }
        if (country === 'GB') {
            if (reedConfigured()) searches.push(withTimeout(fetchReedLive(termList, city), PER_SOURCE_TIMEOUT_MS, []));
            else providerExistsButOff = true;
        }
        // Jooble: live, public (members and visitors), shown with attribution and a link back (see the note above).
        if (allowJooble && joobleChatEnabled(country)) searches.push(withTimeout(fetchJoobleLive(termList, country, city), PER_SOURCE_TIMEOUT_MS, []));
        if (EUROPE_FOR_ARBEITNOW.has(country)) searches.push(withTimeout(fetchArbeitnowLive(termList), PER_SOURCE_TIMEOUT_MS, []));
        if (searches.length === 0) {
            notes.push(providerExistsButOff
                ? 'Live external search is not switched on for this country, so only the platform\'s own job board and the jobs it collected recently could be searched.'
                : 'No live job source covers this country yet.');
        }
    } else {
        const kw = termList.join(' ');
        searches = [
            withTimeout(fetchJobicyLive(kw), PER_SOURCE_TIMEOUT_MS, []),
            withTimeout(fetchRemotiveLive(kw), PER_SOURCE_TIMEOUT_MS, []),
            withTimeout(fetchHimalayasLive(), PER_SOURCE_TIMEOUT_MS, []),
            withTimeout(fetchWeWorkRemotelyLive(), PER_SOURCE_TIMEOUT_MS, [])
        ];
    }

    const results = await withTimeout(Promise.all(searches), LIVE_SEARCH_TIMEOUT_MS, searches.map(() => []));
    const fetched = results.flat();
    // Every source, Jooble included, goes through the same strict relevance gate (see scoreJob).
    const roleTerms = roleTermsOf(termList);
    const scored = [];
    for (const j of fetched) {
        const s = scoreJob(j, roleTerms, { city, sponsorshipOnly });
        if (s !== null) scored.push({ job: j, score: s });
    }
    const seenJobs = new Set();
    const unique = scored.filter(({ job: j }) => { const k = `${(j.title || '').toLowerCase()}|${(j.company || '').toLowerCase()}|${(j.location || '').toLowerCase()}`; if (seenJobs.has(k)) return false; seenJobs.add(k); return true; });
    unique.sort((a, b) => b.score - a.score);
    const allJobs = unique.slice(0, MAX_LIVE_RESULTS).map(({ job: j }) => {
        // Jooble requires a visible "Jobs by Jooble" label with a clickable link on every result.
        if (j.source_name === 'Jooble') { j.attribution = 'Jobs by Jooble'; j.attribution_url = 'https://jooble.org'; }
        return j;
    });
    if (sponsorshipOnly) notes.push('Live results are not checked for visa sponsorship - the user must confirm sponsorship with the employer.');
    if (fetched.length > 0 && allJobs.length === 0) notes.push('Live sources returned results, but none matched the role closely enough to be worth showing, so none are listed. Suggest the user try a more specific job title or a nearby city.');
    else if (allJobs.length > 0 && allJobs.length < 3) notes.push('Only a few live results matched the search closely. Say so plainly rather than padding the list.');

    const data = { jobs: allJobs, notes };
    cache.set(key, { data, timestamp: Date.now() });
    return data;
}
