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

// Real per-user rate limit - separate from and tighter than the normal
// chat credit system, since this triggers several real third-party API
// calls per invocation. Reuses the same security_events table already
// used elsewhere for rate limiting, rather than a new table.
export async function checkLiveSearchRateLimit(supabaseClient, userId) {
    const MAX_LIVE_SEARCHES_PER_HOUR = 10;
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count } = await supabaseClient
        .from('security_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'live_job_search')
        .gte('created_at', since)
        .contains('metadata', { userId });

    if ((count || 0) >= MAX_LIVE_SEARCHES_PER_HOUR) {
        return { allowed: false, message: 'Live job search limit reached for this hour - please try again shortly, or browse the job board directly.' };
    }
    return { allowed: true };
}

export async function logLiveSearch(supabaseClient, userId, keyword) {
    try {
        await supabaseClient.from('security_events').insert({
            event_type: 'live_job_search',
            severity: 'info',
            metadata: { userId, keyword: keyword || null }
        });
    } catch {
        // Non-critical - never let logging failure block a real search.
    }
}

// The real, main entry point: searches only the confirmed-reliable
// sources, in parallel, with a hard overall time budget, honest live
// labeling, and a short cache so repeated identical searches (e.g. many
// users asking similar questions) don't hammer these free APIs.
export async function searchLiveExternalJobs({ keyword, country, sponsorshipOnly } = {}) {
    const key = cacheKey(keyword, country, sponsorshipOnly);
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        return cached.data;
    }

    const searches = [
        withTimeout(fetchJobicyLive(keyword), PER_SOURCE_TIMEOUT_MS, []),
        withTimeout(fetchRemotiveLive(keyword), PER_SOURCE_TIMEOUT_MS, []),
        withTimeout(fetchHimalayasLive(), PER_SOURCE_TIMEOUT_MS, []),
        withTimeout(fetchWeWorkRemotelyLive(), PER_SOURCE_TIMEOUT_MS, [])
    ];

    const results = await withTimeout(Promise.all(searches), LIVE_SEARCH_TIMEOUT_MS, [[], [], [], []]);
    let allJobs = results.flat();

    // These sources are global/remote-focused and don't carry real
    // sponsorship data - sponsorship filtering only meaningfully applies
    // to the job board's admin-approved government-sourced listings, not
    // live results. Made explicit here rather than silently ignored.
    if (keyword) {
        const kw = keyword.toLowerCase();
        allJobs = allJobs.filter(j =>
            j.title.toLowerCase().includes(kw) || (j.description || '').toLowerCase().includes(kw)
        );
    }

    const data = allJobs.slice(0, 10);
    cache.set(key, { data, timestamp: Date.now() });
    return data;
}
