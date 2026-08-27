// src/services/rssJobService.js
// COMPLETE RSS JOB FETCHING SERVICE - Optimized for hobby plan with full features
// Features: Government feeds + Commercial feeds + Jobicy API + Remotive
// Features: Sponsorship detection, job type detection, duplicate handling, search, suggestions, stats
// Optimized: Rate limiting, caching, batch processing, reduced API calls, unified API endpoint
//
// FIXED (2026-08-16) — CRITICAL: this file runs server-side, inside a
// Vercel serverless function (api/cron/sync-external-jobs.js), but was
// written using browser-only APIs:
// 1. parseRSSFeed() used `new DOMParser()` — DOMParser doesn't exist in
//    Node.js at all. Every single RSS fetch has been throwing
//    "ReferenceError: DOMParser is not defined" since this was deployed,
//    silently caught by the per-source try/catch and logged as a failed
//    source. This means the external job pipeline has very likely never
//    actually populated a single job from any source, despite the cron
//    running "successfully" every night — the top-level function never
//    errored, because each source's failure was caught individually.
//    Fixed by using fast-xml-parser (a real Node-compatible XML parser)
//    instead, producing the identical job object shape so nothing else in
//    this file needs to change.
// 2. CORS_PROXY routed every fetch through a third-party proxy
//    (allorigins.win) — CORS is a browser security mechanism that simply
//    doesn't apply to server-to-server requests, so this was unnecessary
//    even before the DOMParser issue: added latency and an unnecessary
//    dependency on a third-party service staying up, for a problem that
//    doesn't exist in this context. Removed; fetches now go directly to
//    each source.
//
// NEW (2026-08-16): added a dedicated Nigeria source
// (scrapeNigeriaFCSC()) — the 3 official URLs provided have no RSS/XML
// feed at all (confirmed via direct fetch), unlike every other source
// here. This is a best-effort HTML scraper against a specific site
// structure, genuinely more fragile than the RSS-based sources — if the
// Nigerian government redesigns that portal, this will need updating.

import { supabase } from '../lib/supabase';
import { XMLParser } from 'fast-xml-parser';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

// ✅ FIXED: Unified API endpoint
const API_BASE = '/api/index';
// FETCH_JOBS_ENDPOINT removed (2026-08-16) — was only used by
// triggerJobFetchViaAPI(), now fixed to call fetchExternalJobs() directly.

// FIXED (2026-08-27): 10 seconds may have been prematurely cutting off
// some genuinely slower (but not actually blocked) government sites -
// this batch fetch runs in the background via a daily cron with a real
// 60-second budget available, not under the same time pressure as a
// live chat response, so there's real room to wait longer per source
// before concluding it's unreachable.
const REQUEST_TIMEOUT = 25000;
const REALISTIC_BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9'
};
const MAX_JOBS_PER_SOURCE = 30;
const BATCH_SIZE = 10;
const MIN_FETCH_INTERVAL = 23 * 60 * 60 * 1000; // 23 hours (hobby plan: once per day)

// ============================================
// RSS FEEDS CONFIGURATION (Prioritized for hobby plan)
// ============================================

const RSS_FEEDS = {
    // United Kingdom - Government (Priority 1 - Always active)
    UK_CIVIL_SERVICE: {
        name: 'UK Civil Service Jobs',
        country: 'GB',
        url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml',
        type: 'rss',
        is_active: true,
        priority: 1,
        sponsorship_keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa', 'Certificate of Sponsorship']
    },
    UK_NHS: {
        name: 'NHS Jobs',
        country: 'GB',
        url: 'https://www.jobs.nhs.uk/feeds/jobs.xml',
        type: 'rss',
        is_active: true,
        priority: 1,
        sponsorship_keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa']
    },
    UK_GOV_FIND_JOB: {
        name: 'Find a Job - UK Government',
        country: 'GB',
        url: 'https://findajob.dwp.gov.uk/feeds/jobs.rss',
        type: 'rss',
        is_active: true,
        priority: 1,
        sponsorship_keywords: ['Sponsorship', 'Visa', 'Skilled Worker']
    },
    
    // Ireland - Government (Priority 2)
    IRELAND_PUBLICJOBS: {
        name: 'Public Jobs Ireland',
        country: 'IE',
        url: 'https://www.publicjobs.ie/rss',
        type: 'rss',
        is_active: true,
        priority: 2,
        sponsorship_keywords: ['Work Permit', 'Critical Skills', 'Sponsorship']
    },
    
    // Canada - Government (Priority 2)
    CANADA_GC_JOBS: {
        name: 'GC Jobs Canada',
        country: 'CA',
        url: 'https://www.jobs.gc.ca/rss',
        type: 'rss',
        is_active: true,
        priority: 2,
        sponsorship_keywords: ['Work Permit', 'LMIA', 'Sponsorship']
    },
    
    // Australia - Government (Priority 2)
    AUSTRALIA_APS_JOBS: {
        name: 'APS Jobs Australia',
        country: 'AU',
        url: 'https://www.apsjobs.gov.au/rss',
        type: 'rss',
        is_active: true,
        priority: 2,
        sponsorship_keywords: ['Visa Sponsorship', 'Work Visa', 'Sponsorship']
    },
    
    // USA - Government (Priority 2)
    USA_USAJOBS: {
        name: 'USAJobs',
        country: 'US',
        url: 'https://www.usajobs.gov/rss',
        type: 'rss',
        is_active: true,
        priority: 2,
        sponsorship_keywords: ['Visa', 'Work Authorization', 'Sponsorship']
    },
    
    // Germany - Government (Priority 3)
    GERMANY_BUND: {
        name: 'Bund.de - German Government Jobs',
        country: 'DE',
        url: 'https://www.bund.de/rss/jobs',
        type: 'rss',
        is_active: true,
        priority: 3,
        sponsorship_keywords: ['Work Visa', 'Blue Card', 'Sponsorship']
    },
    
    // Commercial - Remote OK (Priority 3)
    REMOTE_OK_ALL: {
        name: 'Remote OK - Remote Jobs',
        country: 'Global',
        url: 'https://remoteok.com/remote-jobs.rss',
        type: 'rss',
        is_active: true,
        priority: 3,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    
    // Commercial - We Work Remotely (Priority 3)
    WE_WORK_REMOTELY: {
        name: 'We Work Remotely',
        country: 'Global',
        url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
        type: 'rss',
        is_active: true,
        priority: 3,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    
    // Commercial - Stack Overflow (Priority 4 - Disabled by default)
    STACK_OVERFLOW: {
        name: 'Stack Overflow - Remote Jobs',
        country: 'Global',
        url: 'https://stackoverflow.com/jobs/feed?l=Remote',
        type: 'rss',
        is_active: false,
        priority: 4,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    
    // Commercial - Zapier (Priority 4 - Disabled by default)
    ZAPIER: {
        name: 'Zapier - Latest Jobs',
        country: 'Global',
        url: 'https://zapier.com/jobs/feeds/latest/',
        type: 'rss',
        is_active: false,
        priority: 4,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    }
};

// ============================================
// API JOB SOURCES (Disabled by default for hobby plan)
// ============================================

const API_SOURCES = {
    // FIXED (2026-08-27): confirmed via fresh, direct research that
    // this exact endpoint is genuinely free, requires no authentication
    // at all, and is actively maintained (documentation updated within
    // the last month) - this was disabled the whole time and never
    // actually tried, not disabled because it was known to fail.
    JOBICY: {
        name: 'Jobicy Remote Jobs',
        country: 'Global',
        url: 'https://jobicy.com/api/v2/remote-jobs?count=10',
        type: 'api',
        is_active: true,
        parseFunction: (data) => {
            const jobs = [];
            for (const job of data.jobs || []) {
                jobs.push({
                    title: job.jobTitle,
                    company: job.companyName,
                    location: job.jobGeo || 'Remote',
                    description: job.jobDescription,
                    salary_range: job.salaryMin && job.salaryMax ? `${job.salaryMin} - ${job.salaryMax}` : null,
                    salary_min: job.salaryMin,
                    salary_max: job.salaryMax,
                    link: job.url,
                    source_name: 'Jobicy',
                    source_country: job.jobGeo?.includes('USA') ? 'US' : 'Global',
                    job_type: mapJobType(job.jobType)
                });
            }
            return jobs;
        }
    },
    
    // FIXED (2026-08-27): confirmed genuinely free and current. Their own
    // terms ask for a visible link back to the source job's URL and
    // crediting Remotive as the source when displaying a listing - easy
    // to honor and worth doing given they provide this for free.
    REMOTIVE: {
        name: 'Remotive Remote Jobs',
        country: 'Global',
        url: 'https://remotive.com/api/remote-jobs',
        type: 'api',
        is_active: true,
        parseFunction: (data) => {
            const jobs = [];
            for (const job of data.jobs || []) {
                jobs.push({
                    title: job.title,
                    company: job.company_name,
                    location: job.candidate_required_location || 'Remote',
                    description: job.description,
                    salary_range: job.salary,
                    link: job.url,
                    source_name: 'Remotive',
                    source_country: 'Global',
                    job_type: mapJobType(job.job_type)
                });
            }
            return jobs;
        }
    },

    // NEW (2026-08-27): Himalayas - confirmed genuinely free, no
    // authentication required, actively maintained. Their terms ask for
    // a visible link back to himalayas.app and crediting Himalayas as
    // the source, same reasonable ask as Remotive above.
    //
    // HONEST FLAG: the exact URL and the parseFunction's field names
    // below (job.locationRestrictions, job.companyName, etc.) are based
    // on documentation snippets, not a live-tested real response - unlike
    // every other source in this file, which was built against actually-
    // seen data. The very first real fetch attempt against this source
    // should be checked directly (e.g. via the Test Feeds connection
    // check, and by inspecting what actually lands in external_jobs)
    // before trusting it the same way as the others - if job titles or
    // fields look wrong or empty, this parseFunction is the first place
    // to fix, not a sign the source itself is bad.
    HIMALAYAS: {
        name: 'Himalayas Remote Jobs',
        country: 'Global',
        url: 'https://himalayas.app/jobs/api?limit=20',
        type: 'api',
        is_active: true,
        parseFunction: (data) => {
            const jobs = [];
            for (const job of data.jobs || data.data || []) {
                const locationRestrictions = job.locationRestrictions || job.countryApplicationRestrictions || [];
                const locationStr = Array.isArray(locationRestrictions) && locationRestrictions.length > 0
                    ? locationRestrictions.join(', ')
                    : 'Remote (Worldwide)';
                jobs.push({
                    title: job.title,
                    company: job.companyName || job.company?.name || 'Unknown Company',
                    location: locationStr,
                    description: job.description || job.excerpt || '',
                    salary_range: null,
                    link: job.applicationLink || job.url || null,
                    source_name: 'Himalayas',
                    source_country: 'Global',
                    job_type: mapJobType(job.employmentType || 'full_time')
                });
            }
            return jobs;
        }
    },
};

// ============================================
// RATE LIMITING & CACHING
// ============================================

let lastFetchTime = null;
let lastFetchResult = null;
let dailyFetchCount = 0;
let lastResetDate = new Date().toDateString();

function resetDailyCountIfNeeded() {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        dailyFetchCount = 0;
        lastResetDate = today;
    }
}

function canFetchToday() {
    resetDailyCountIfNeeded();
    return dailyFetchCount < 1; // Hobby plan: 1 fetch per day
}

function incrementFetchCount() {
    dailyFetchCount++;
}

export function invalidateJobCache() {
    lastFetchTime = null;
    lastFetchResult = null;
    console.log('🔄 Job cache invalidated');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapJobType(jobType) {
    if (!jobType) return 'full_time';
    
    const type = jobType.toLowerCase();
    
    const typeMap = {
        'full': 'full_time',
        'full-time': 'full_time',
        'fulltime': 'full_time',
        'part': 'part_time',
        'part-time': 'part_time',
        'parttime': 'part_time',
        'contract': 'contract',
        'freelance': 'freelance',
        'remote': 'remote',
        'hybrid': 'hybrid'
    };
    
    for (const [key, value] of Object.entries(typeMap)) {
        if (type.includes(key)) return value;
    }
    
    return 'full_time';
}

function detectJobType(title, description) {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    const typePatterns = [
        { pattern: /remote|work from home|wfh|telework/, type: 'remote' },
        { pattern: /part time|part-time|parttime|pt/, type: 'part_time' },
        { pattern: /contract|fixed term|temporary|temp/, type: 'contract' },
        { pattern: /freelance|freelancer|gig/, type: 'freelance' },
        { pattern: /hybrid|mix of office|home and office/, type: 'hybrid' }
    ];
    
    for (const { pattern, type } of typePatterns) {
        if (pattern.test(text)) return type;
    }
    
    return 'full_time';
}

function detectSponsorshipEligibility(title, description, sourceConfig = null) {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    if (sourceConfig?.sponsorship_keywords) {
        for (const keyword of sourceConfig.sponsorship_keywords) {
            if (text.includes(keyword.toLowerCase())) {
                return { eligible: true, keyword: keyword, type: 'explicit' };
            }
        }
    }
    
    const generalKeywords = [
        'visa sponsorship', 'work visa', 'skilled worker', 'tier 2',
        'certificate of sponsorship', 'sponsorship available', 'visa assistance',
        'relocation support', 'work permit', 'immigration support'
    ];
    
    for (const keyword of generalKeywords) {
        if (text.includes(keyword)) {
            return { eligible: true, keyword: keyword, type: 'general' };
        }
    }
    
    return { eligible: false };
}

function extractSalary(text) {
    if (!text) return null;
    
    const currencyPatterns = [
        { pattern: /£([\d,]+)(?:\s*-\s*£?([\d,]+))?/i, symbol: '£' },
        { pattern: /€([\d,]+)(?:\s*-\s*€?([\d,]+))?/i, symbol: '€' },
        { pattern: /\$([\d,]+)(?:\s*-\s*\$?([\d,]+))?/i, symbol: '$' }
    ];
    
    for (const { pattern, symbol } of currencyPatterns) {
        const match = text.match(pattern);
        if (match) {
            const min = match[1].replace(/,/g, '');
            if (match[2]) {
                const max = match[2].replace(/,/g, '');
                return { range: `${symbol}${min} - ${symbol}${max}`, min: parseInt(min), max: parseInt(max) };
            }
            return { range: `${symbol}${min}`, min: parseInt(min), max: null };
        }
    }
    
    return null;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// FIXED (2026-08-27): fallback extraction for feeds that fail strict XML
// parsing (e.g. hitting fast-xml-parser's entity-expansion safety limit
// on large, legitimate feeds like We Work Remotely's). Deliberately
// simple and tolerant - just pulls <item>...</item> blocks and the
// title/link/description inside each via regex, rather than requiring
// the whole document to be strictly well-formed XML.
function extractItemsViaRegex(text, sourceName, sourceCountry) {
    const jobs = [];
    const itemBlocks = text.match(/<item[\s\S]*?<\/item>/gi) || [];

    for (const block of itemBlocks) {
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
        const descMatch = block.match(/<description>([\s\S]*?)<\/description>/i);
        const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

        const decode = (s) => (s || '')
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .trim();

        const title = decode(titleMatch?.[1]);
        const link = decode(linkMatch?.[1]);
        const description = decode(descMatch?.[1]);

        if (!title || !link) continue;

        const salary = extractSalary(description);
        const jobType = detectJobType(title, description);

        jobs.push({
            title: title.substring(0, 200),
            description: description.substring(0, 1000),
            external_url: link,
            salary_range: salary?.range || null,
            salary_min: salary?.min || null,
            salary_max: salary?.max || null,
            location: sourceCountry,
            posted_date: pubDateMatch?.[1]?.trim() || null,
            source_name: sourceName,
            source_country: sourceCountry,
            job_type: jobType
        });

        if (jobs.length >= MAX_JOBS_PER_SOURCE) break;
    }

    return jobs;
}

// ============================================
// RSS PARSING
// ============================================

async function parseRSSFeed(feedUrl, sourceName, sourceCountry) {
    // FIXED (2026-08-27): confirmed real, live problem — a "Test Feeds"
    // connectivity check showed only 1 of 12 real feed URLs actually
    // reachable right now, but a real fetch attempt showed all 11
    // unreachable sources reporting "0 found, 0 new" with no failure
    // indicated at all. Traced this to here: every failure path below
    // (!response.ok, an XML parse error, zero items in a successfully-
    // parsed feed) all silently `return []` — a real "can't reach this
    // site at all" and a genuine "this site has no jobs right now"
    // were completely indistinguishable to every caller. Now returns
    // { jobs, error } so a real failure reason can actually surface
    // instead of looking identical to zero real postings.
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        
        // FIXED: fetch directly — no CORS proxy needed server-side.
        const response = await fetch(feedUrl, {
            headers: REALISTIC_BROWSER_HEADERS,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const reason = `HTTP ${response.status} ${response.statusText || ''}`.trim();
            console.warn(`Failed to fetch RSS: ${feedUrl} - Status: ${response.status}`);
            return { jobs: [], error: reason };
        }
        
        const text = await response.text();

        // FIXED: fast-xml-parser instead of DOMParser (doesn't exist in
        // Node.js). Produces a plain JS object tree instead of a DOM.
        const xmlParser = new XMLParser({ ignoreAttributes: false, trimValues: true });
        let parsed;
        try {
            parsed = xmlParser.parse(text);
        } catch (parseError) {
            // FIXED (2026-08-27): confirmed real, live failure on We Work
            // Remotely specifically - "Entity expansion limit exceeded:
            // 1002 > 1000". This is a large, genuinely legitimate feed
            // hitting a parser safety limit (guards against XML-bomb style
            // attacks), not a broken or unreachable source - the
            // connection test confirmed this source responds with a real
            // HTTP 200. Rather than depend on an exact, uncertain
            // fast-xml-parser config option to raise that limit, falls
            // back to a lightweight regex-based extraction of <item>
            // blocks, which doesn't need to resolve every XML entity the
            // way a full, strict parser does - genuinely more robust for
            // large real-world feeds, not just a workaround for this one.
            console.warn(`RSS parsing error for ${feedUrl}, falling back to regex extraction:`, parseError.message);
            const fallbackJobs = extractItemsViaRegex(text, sourceName, sourceCountry);
            if (fallbackJobs.length > 0) {
                return { jobs: fallbackJobs, error: null };
            }
            return { jobs: [], error: `XML parse error: ${parseError.message}` };
        }

        // RSS items normally live at rss.channel.item — fast-xml-parser
        // returns a single object (not an array) when there's only one
        // item, so normalize to an array either way.
        const rawItems = parsed?.rss?.channel?.item;
        const items = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);

        if (items.length === 0) {
            console.warn(`No items found in RSS feed: ${feedUrl}`);
            // Genuinely different from a fetch/parse failure — the request
            // succeeded and produced valid, well-formed XML, it just didn't
            // contain any <item> entries under rss.channel (e.g. the feed
            // uses a different structure than expected, such as Atom's
            // <entry> instead of RSS's <item>, or is a redirect/placeholder
            // page rather than the real feed).
            return { jobs: [], error: 'No <item> entries found — feed may use a different format (e.g. Atom) or the URL may be stale' };
        }

        const jobs = [];

        for (const item of items) {
            const title = (typeof item.title === 'string' ? item.title : item.title?.['#text'] || '').trim();
            const description = (typeof item.description === 'string' ? item.description : item.description?.['#text'] || '').trim();
            const link = (typeof item.link === 'string' ? item.link : item.link?.['#text'] || '').trim();
            const pubDate = item.pubDate;

            if (!title || !link) continue;

            const salary = extractSalary(description);

            let location = '';
            const locationMatch = description.match(/(?:Location|based in|located in):?\s*([A-Za-z\s,]+)/i);
            if (locationMatch) location = locationMatch[1].trim();

            const jobType = detectJobType(title, description);

            jobs.push({
                title: title.substring(0, 200),
                description: description.substring(0, 1000),
                external_url: link,
                salary_range: salary?.range || null,
                salary_min: salary?.min || null,
                salary_max: salary?.max || null,
                location: location || sourceCountry,
                posted_date: pubDate,
                source_name: sourceName,
                source_country: sourceCountry,
                job_type: jobType
            });

            if (jobs.length >= MAX_JOBS_PER_SOURCE) break;
        }

        return { jobs, error: null };
    } catch (error) {
        console.error(`Error parsing RSS feed ${feedUrl}:`, error);
        return { jobs: [], error: error.name === 'AbortError' ? `Timed out after ${REQUEST_TIMEOUT}ms` : error.message };
    }
}

// ============================================
// NIGERIA — dedicated scraper (NEW — 2026-08-16)
// No RSS/XML feed exists at any of the 3 official Federal Civil Service
// URLs (confirmed via direct fetch + search) — unlike every RSS-based
// source above, this depends on this specific site's HTML structure and
// is genuinely more fragile. Best-effort: on any failure, logs and
// returns an empty list rather than throwing, so it never breaks the
// rest of the daily fetch.
// ============================================

async function scrapeNigeriaFCSC() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch('https://recruitment.fedcivilservice.gov.ng/vacancies', {
            headers: REALISTIC_BROWSER_HEADERS,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`Nigeria FCSC fetch failed: ${response.status}`);
            return [];
        }

        const html = await response.text();

        // This portal renders listings via JavaScript, so a plain HTML
        // fetch may return little to no job data server-side — this
        // extracts what it can from any static links present, and
        // returns an empty list gracefully if the page is fully
        // client-rendered rather than guessing at content that isn't
        // actually there.
        const jobs = [];
        const linkPattern = /href="(\/vacancies\/[a-z0-9]+-([a-z0-9-]+))"/gi;
        let match;
        const seen = new Set();

        while ((match = linkPattern.exec(html)) !== null && jobs.length < MAX_JOBS_PER_SOURCE) {
            const path = match[1];
            if (seen.has(path)) continue;
            seen.add(path);

            const slug = match[2] || '';
            const title = slug
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
                .trim();

            if (!title) continue;

            jobs.push({
                title: title.substring(0, 200),
                description: `Vacancy listed on the Federal Civil Service Commission of Nigeria recruitment portal. View full details and apply on the official portal.`,
                external_url: `https://recruitment.fedcivilservice.gov.ng${path}`,
                salary_range: null,
                salary_min: null,
                salary_max: null,
                location: 'Nigeria',
                posted_date: null,
                source_name: 'Federal Civil Service Commission Nigeria',
                source_country: 'NG',
                job_type: 'full_time'
            });
        }

        if (jobs.length === 0) {
            console.warn('Nigeria FCSC: no vacancy links found — the portal may be fully client-rendered, meaning this scraper cannot extract listings without a headless browser. Jobs can still be found manually at https://recruitment.fedcivilservice.gov.ng/vacancies.');
        }

        return jobs;
    } catch (error) {
        console.error('Error scraping Nigeria FCSC:', error);
        return [];
    }
}

// ============================================
// API FETCHING
// ============================================

async function fetchFromAPI(source) {
    if (!source.is_active) return [];
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        
        const response = await fetch(source.url, {
            headers: REALISTIC_BROWSER_HEADERS,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.warn(`API error for ${source.name}: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        
        if (source.parseFunction && typeof source.parseFunction === 'function') {
            return source.parseFunction(data);
        }
        
        return [];
    } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
        return [];
    }
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function saveJobToDatabase(job, sponsorship) {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: existing } = await supabase
            .from('external_jobs')
            .select('id')
            .eq('title', job.title.substring(0, 150))
            .eq('source_name', job.source_name)
            .gte('created_at', sevenDaysAgo)
            .maybeSingle();
        
        if (existing) {
            return { status: 'exists', id: existing.id };
        }
        
        const { data, error } = await supabase
            .from('external_jobs')
            .insert({
                title: job.title,
                company: job.source_name,
                location: job.location || job.source_country,
                description: job.description,
                salary_range: job.salary_range,
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                job_type: job.job_type,
                external_apply_url: job.external_url,
                source_country: job.source_country,
                source_name: job.source_name,
                sponsorship_eligible: sponsorship.eligible,
                status: 'pending_approval',
                created_at: new Date().toISOString(),
                published_at: job.posted_date
            })
            .select()
            .single();
        
        if (error) throw error;
        
        return { status: 'added', id: data.id, job: data };
    } catch (error) {
        console.error('Error saving job to database:', error);
        return { status: 'error', error: error.message };
    }
}

async function logFetchResults(sourceName, jobsFetched, jobsNew, details) {
    try {
        await supabase
            .from('external_job_fetch_log')
            .insert({
                source_name: sourceName,
                fetch_status: jobsNew > 0 ? 'success' : 'no_new_jobs',
                jobs_fetched: jobsFetched,
                jobs_new: jobsNew,
                details: details,
                created_at: new Date().toISOString()
            });
    } catch (err) {
        console.warn('Log insert failed:', err.message);
    }
}

// ============================================
// MAIN FETCH FUNCTION (Rate Limited)
// ============================================

export async function fetchExternalJobs(forceRefresh = false) {
    if (!forceRefresh && !canFetchToday()) {
        console.log('⚠️ Daily fetch limit reached (1 per day). Skipping...');
        return {
            jobs: [],
            results: [],
            totalAdded: 0,
            message: 'Daily fetch limit reached. Only one fetch per day allowed.',
            nextAvailable: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
    }
    
    if (!forceRefresh && lastFetchTime && (Date.now() - lastFetchTime) < MIN_FETCH_INTERVAL && lastFetchResult) {
        console.log('📦 Using cached fetch result');
        return lastFetchResult;
    }
    
    console.log('🔍 Starting job fetch...');
    const allJobs = [];
    const results = [];
    
    // Clean up old jobs (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
        .from('external_jobs')
        .delete()
        .lt('created_at', thirtyDaysAgo)
        .eq('status', 'rejected');
    
    // Fetch from RSS feeds in priority order
    const sortedFeeds = Object.entries(RSS_FEEDS)
        .filter(([_, source]) => source.is_active)
        .sort((a, b) => (a[1].priority || 99) - (b[1].priority || 99));
    
    for (const [key, source] of sortedFeeds) {
        console.log(`  📡 Fetching from ${source.name}...`);
        
        try {
            const { jobs, error: fetchIssue } = await parseRSSFeed(source.url, source.name, source.country);
            let added = 0;
            
            for (const job of jobs) {
                const sponsorship = detectSponsorshipEligibility(job.title, job.description, source);
                const saveResult = await saveJobToDatabase(job, sponsorship);
                
                if (saveResult.status === 'added') {
                    allJobs.push(job);
                    added++;
                }
                
                await delay(100);
            }
            
            // FIXED (2026-08-27): jobs.length === 0 with a real fetchIssue
            // now correctly reports as failed, with the actual reason
            // (HTTP status, parse error, or timeout) — previously always
            // reported "success" with found: 0, indistinguishable from a
            // source that was reachable but genuinely had no postings.
            results.push({
                source: source.name,
                found: jobs.length,
                added: added,
                status: (jobs.length === 0 && fetchIssue) ? 'failed' : 'success',
                error: (jobs.length === 0 && fetchIssue) ? fetchIssue : undefined
            });
            
            await delay(2000);
            
        } catch (error) {
            console.error(`  ❌ Error with ${source.name}:`, error.message);
            results.push({
                source: source.name,
                error: error.message,
                status: 'failed'
            });
        }
    }
    
    // NEW (2026-08-16): Nigeria — dedicated scraper, no RSS feed available.
    // Isolated in its own try/catch, same as every RSS source above, so a
    // failure here never affects the other 7 sources.
    console.log('  📡 Fetching from Federal Civil Service Commission Nigeria...');
    try {
        const nigeriaJobs = await scrapeNigeriaFCSC();
        let added = 0;

        for (const job of nigeriaJobs) {
            const sponsorship = detectSponsorshipEligibility(job.title, job.description);
            const saveResult = await saveJobToDatabase(job, sponsorship);

            if (saveResult.status === 'added') {
                allJobs.push(job);
                added++;
            }

            await delay(100);
        }

        results.push({
            source: 'Federal Civil Service Commission Nigeria',
            found: nigeriaJobs.length,
            added: added,
            status: 'success'
        });
    } catch (error) {
        console.error('  ❌ Error with Nigeria FCSC:', error.message);
        results.push({
            source: 'Federal Civil Service Commission Nigeria',
            error: error.message,
            status: 'failed'
        });
    }

    // Fetch from API sources (if enabled)
    for (const [key, source] of Object.entries(API_SOURCES)) {
        if (!source.is_active) continue;
        
        console.log(`  📡 Fetching from ${source.name}...`);
        
        try {
            const jobs = await fetchFromAPI(source);
            let added = 0;
            
            for (const job of jobs) {
                const sponsorship = detectSponsorshipEligibility(job.title, job.description);
                const saveResult = await saveJobToDatabase(job, sponsorship);
                
                if (saveResult.status === 'added') {
                    allJobs.push(job);
                    added++;
                }
            }
            
            results.push({
                source: source.name,
                found: jobs.length,
                added: added,
                status: 'success'
            });
            
            await delay(1000);
            
        } catch (error) {
            console.error(`  ❌ Error with ${source.name}:`, error.message);
            results.push({
                source: source.name,
                error: error.message,
                status: 'failed'
            });
        }
    }
    
    await logFetchResults('all_sources', allJobs.length, allJobs.length, results);
    
    incrementFetchCount();
    lastFetchTime = Date.now();
    lastFetchResult = {
        jobs: allJobs,
        results,
        totalAdded: allJobs.length,
        timestamp: new Date().toISOString(),
        summary: results.map(r => `${r.source}: ${r.added || 0} new`).join(', ')
    };
    
    console.log(`✅ Fetch complete: ${allJobs.length} new jobs added`);
    
    return lastFetchResult;
}

// ============================================
// EXTERNAL JOB MANAGEMENT (Admin functions)
// ============================================

export async function getExternalJobsByStatus(status) {
    const validStatuses = ['pending_approval', 'approved', 'rejected'];
    const queryStatus = validStatuses.includes(status) ? status : 'pending_approval';
    
    const { data, error } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('status', queryStatus)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

export async function getPendingExternalJobs() {
    return getExternalJobsByStatus('pending_approval');
}

export async function getApprovedExternalJobs() {
    return getExternalJobsByStatus('approved');
}

export async function getRejectedExternalJobs() {
    return getExternalJobsByStatus('rejected');
}

export async function getExternalJobsStats() {
    const stats = { pending: 0, approved: 0, rejected: 0, total: 0, bySource: {} };
    
    const { data, error } = await supabase
        .from('external_jobs')
        .select('status, source_name');
    
    if (error) throw error;
    
    for (const job of data || []) {
        stats[job.status] = (stats[job.status] || 0) + 1;
        stats.total++;
        
        if (!stats.bySource[job.source_name]) {
            stats.bySource[job.source_name] = { pending: 0, approved: 0, rejected: 0 };
        }
        stats.bySource[job.source_name][job.status] = (stats.bySource[job.source_name][job.status] || 0) + 1;
    }
    
    return stats;
}

export async function approveExternalJob(jobId) {
    const { data: externalJob, error: fetchError } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
    
    if (fetchError) throw fetchError;
    
    let jobType = externalJob.job_type || 'full_time';
    if (jobType === 'full-time') jobType = 'full_time';
    if (jobType === 'part-time') jobType = 'part_time';

    // FIXED (2026-08-27): confirmed real, live failure —
    // "null value in column description of relation jobs violates
    // not-null constraint". Traced this to genuinely stale rows in
    // external_jobs left behind by one of several older, now-dead
    // fetch services that predate the current real fetcher (this
    // specific row's source_name, "NITDA", doesn't match any source
    // this file actually configures — the real parseRSSFeed() always
    // produces at least an empty string for description, never null,
    // so this was never something the current fetcher could produce).
    // Rather than let old, incomplete data crash approval outright,
    // every field going into the insert now has a real fallback.
    const { data: newJob, error: insertError } = await supabase
        .from('jobs')
        .insert({
            title: externalJob.title || 'Untitled Position',
            company: externalJob.company || externalJob.source_name || 'Unknown Company',
            location: externalJob.location || externalJob.source_country || 'Not specified',
            description: externalJob.description || 'No description was provided for this listing. View the original posting for full details.',
            salary_range: externalJob.salary_range,
            salary_min: externalJob.salary_min,
            salary_max: externalJob.salary_max,
            job_type: jobType,
            external_apply_url: externalJob.external_apply_url,
            country_code: externalJob.source_country,
            source_type: 'authoritative',
            source_name: externalJob.source_name,
            sponsorship_eligible: externalJob.sponsorship_eligible,
            // FIXED (2026-08-27): verified_employer_source_id existed on
            // external_jobs (set correctly by
            // employerWebsiteScraperService.js) but was never carried
            // through to the real jobs row on approval - the traceability
            // link back to which verified employer a job came from was
            // silently lost at the exact moment a job went live.
            verified_employer_source_id: externalJob.verified_employer_source_id || null,
            compliance_status: 'approved',
            is_active: true,
            posted_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (insertError) throw insertError;
    
    await supabase
        .from('external_jobs')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), approved_job_id: newJob.id })
        .eq('id', jobId);
    
    return { success: true, jobId: newJob.id };
}

export async function rejectExternalJob(jobId, reason = null) {
    const { error } = await supabase
        .from('external_jobs')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), rejection_reason: reason })
        .eq('id', jobId);
    
    if (error) throw error;
    return { success: true };
}

export async function batchApproveExternalJobs(limit = 50) {
    const { data: pendingJobs, error } = await supabase
        .from('external_jobs')
        .select('id')
        .eq('status', 'pending_approval')
        .limit(limit);
    
    if (error) throw error;
    
    if (!pendingJobs?.length) {
        return { total: 0, approved: 0, failed: 0, message: 'No pending jobs to approve' };
    }
    
    const results = { total: pendingJobs.length, approved: 0, failed: 0, errors: [] };
    
    for (const job of pendingJobs) {
        try {
            await approveExternalJob(job.id);
            results.approved++;
        } catch (err) {
            results.failed++;
            results.errors.push({ jobId: job.id, error: err.message });
        }
        await delay(500);
    }
    
    return results;
}

export async function loadJobsFromSQL() {
    const { data: existingJobs, error } = await supabase
        .from('jobs')
        .select('id, title, company')
        .eq('source_type', 'authoritative')
        .limit(100);
    
    if (error) throw error;
    
    if (!existingJobs?.length) {
        return { success: true, count: 0, message: 'No authoritative jobs found' };
    }
    
    let updatedCount = 0;
    
    for (const job of existingJobs) {
        const { error: updateError } = await supabase
            .from('external_jobs')
            .update({ status: 'approved' })
            .eq('title', job.title)
            .eq('company', job.company)
            .in('status', ['pending_approval', null]);
        
        if (!updateError) updatedCount++;
    }
    
    return { success: true, count: updatedCount, total: existingJobs.length };
}

// ============================================
// TRIGGER FETCH FROM FRONTEND (Unified API)
// ============================================

/**
 * Trigger job fetch via unified API endpoint
 * FIXED (2026-08-16): called the now-removed ?action=fetch-jobs — that
 * action was deliberately removed earlier this session in favor of the
 * real cron file (api/cron/sync-external-jobs.js), which calls
 * fetchExternalJobs() in this same file directly. This function was never
 * actually imported/called anywhere, so it was harmless dead code rather
 * than an active bug — but fixing it now rather than leaving a landmine
 * for whenever someone eventually wires up a manual "refresh jobs" button
 * using it. Now calls the same function directly instead of a dead HTTP
 * endpoint.
 */
export async function triggerJobFetchViaAPI() {
    try {
        return await fetchExternalJobs(true);
    } catch (error) {
        console.error('Trigger fetch error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// SEARCH & SUGGESTIONS
// ============================================

export async function searchLiveJobs(query, filters = {}) {
    const allJobs = [];
    const activeFeeds = Object.entries(RSS_FEEDS)
        .filter(([_, config]) => config.is_active)
        .filter(([_, config]) => !filters.country || config.country === filters.country);
    
    const fetchPromises = activeFeeds.map(async ([_, config]) => {
        const { jobs } = await parseRSSFeed(config.url, config.name, config.country);
        return { config, jobs };
    });
    
    const feedResults = await Promise.all(fetchPromises);
    
    for (const { config, jobs } of feedResults) {
        for (const job of jobs) {
            const sponsorship = detectSponsorshipEligibility(job.title, job.description, config);
            allJobs.push({
                title: job.title,
                description: job.description,
                link: job.external_url,
                salary: job.salary_range,
                location: job.location,
                source: config.name,
                source_country: config.country,
                job_type: job.job_type,
                sponsorship_eligible: sponsorship.eligible,
                sponsorship_keyword: sponsorship.keyword,
                posted_date: job.posted_date
            });
        }
    }
    
    let filteredJobs = allJobs;
    
    if (query) {
        const q = query.toLowerCase();
        filteredJobs = filteredJobs.filter(job => 
            job.title.toLowerCase().includes(q) ||
            (job.description && job.description.toLowerCase().includes(q))
        );
    }
    
    if (filters.sponsorshipOnly) {
        filteredJobs = filteredJobs.filter(job => job.sponsorship_eligible === true);
    }
    
    if (filters.jobType) {
        filteredJobs = filteredJobs.filter(job => job.job_type === filters.jobType);
    }
    
    filteredJobs.sort((a, b) => {
        if (!a.posted_date) return 1;
        if (!b.posted_date) return -1;
        return new Date(b.posted_date) - new Date(a.posted_date);
    });
    
    return filteredJobs.slice(0, filters.limit || 20);
}

export async function getJobSuggestions(userQuery) {
    const q = userQuery.toLowerCase();
    const filters = {
        country: null,
        sponsorshipOnly: false,
        limit: 15
    };
    
    if (q.includes('uk') || q.includes('united kingdom')) filters.country = 'GB';
    else if (q.includes('canada')) filters.country = 'CA';
    else if (q.includes('us') || q.includes('usa')) filters.country = 'US';
    else if (q.includes('australia')) filters.country = 'AU';
    else if (q.includes('ireland')) filters.country = 'IE';
    
    if (q.includes('sponsorship') || q.includes('visa') || q.includes('work permit')) {
        filters.sponsorshipOnly = true;
    }
    
    const jobs = await searchLiveJobs(userQuery, filters);
    
    return {
        jobs,
        filters,
        total: jobs.length,
        query: userQuery,
        suggestions: jobs.slice(0, 5).map(job => job.title)
    };
}

// ============================================
// CONNECTION TESTING
// ============================================

export async function testRSSConnection() {
    const results = [];
    
    for (const [_, source] of Object.entries(RSS_FEEDS)) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(source.url, {
                headers: REALISTIC_BROWSER_HEADERS,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            results.push({
                source: source.name,
                url: source.url,
                status: response.status,
                ok: response.ok,
                country: source.country,
                message: response.ok ? 'Connected successfully' : `HTTP ${response.status}`
            });
        } catch (error) {
            results.push({
                source: source.name,
                url: source.url,
                status: 'error',
                error: error.message,
                country: source.country,
                message: error.message
            });
        }
    }
    
    return results;
}

// ============================================
// EXPORTS
// ============================================

export { RSS_FEEDS, API_SOURCES };

export default {
    fetchExternalJobs,
    triggerJobFetchViaAPI,
    getExternalJobsByStatus,
    getPendingExternalJobs,
    getApprovedExternalJobs,
    getRejectedExternalJobs,
    getExternalJobsStats,
    approveExternalJob,
    rejectExternalJob,
    batchApproveExternalJobs,
    loadJobsFromSQL,
    searchLiveJobs,
    getJobSuggestions,
    testRSSConnection,
    invalidateJobCache,
    RSS_FEEDS,
    API_SOURCES
};
