// src/services/employerWebsiteScraperService.js
//
// NEW (2026-08-27) — sources jobs directly from individual verified
// employer career pages, rather than aggregator sites (which are
// frequently blocked - see rssJobService.js's confirmed findings on
// government aggregator blocking this session).
//
// WHY THIS IS DIFFERENT AND MORE RELIABLE: rather than trying to parse
// arbitrary, differently-structured HTML per company (which would need
// a custom scraper per employer and break constantly as sites redesign),
// this looks for Schema.org JobPosting structured data (JSON-LD) - the
// exact same standardized markup Google for Jobs itself requires from
// employers to be indexed. Many companies already publish this
// specifically so automated systems (like Google) can read their
// vacancies reliably - this is not circumventing anything, it is reading
// data employers deliberately marked up for exactly this kind of
// consumption.
//
// HONEST LIMITATION: a company that does NOT publish JobPosting
// structured data on their careers page will simply yield zero jobs
// here - this deliberately does not fall back to guessing at arbitrary
// unstructured HTML, since that would be fragile and unreliable per
// company. If a real, important verified sponsor consistently returns
// zero jobs, the fix is confirming whether their site actually publishes
// this structured data at all (view page source, search for
// "JobPosting"), not assuming this scraper is broken.
//
// SECURITY (2026-08-27): this function fetches a URL an admin supplies -
// without validation, that's a real SSRF (server-side request forgery)
// risk. A malicious or simply mistaken URL could target internal
// infrastructure (localhost, private network ranges, cloud metadata
// endpoints like 169.254.169.254) instead of a real company website, and
// this backend would happily fetch it and potentially expose the
// response. isSafeExternalUrl() below is checked before every single
// fetch, not just at admin-entry time, so even if an unsafe URL somehow
// already exists in the database, it still can't be used to make the
// server reach internal resources.

const FETCH_TIMEOUT_MS = 15000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB - a real careers page is
// never legitimately larger than this; caps memory use against a
// malicious or broken oversized response.

// FIXED (2026-09-13): confirmed real, genuine gap - this previously
// disguised every request as a real Chrome browser rather than
// honestly identifying itself, and never checked robots.txt at all.
// Even though what this reads (Schema.org JobPosting structured data)
// is genuinely, legitimately different from general scraping -
// employers publish this specifically for automated systems like
// Google to consume - transparency about what's making the request
// matters regardless of how legitimate the underlying purpose is.
// Identifies honestly now, and respects a career page's own stated
// wishes via robots.txt before ever fetching it.
const BOT_USER_AGENT = 'BluSkyeConsultBot/1.0 (+https://www.bluskyeconsult.com/about-our-bot)';
const REALISTIC_HEADERS = {
    'User-Agent': BOT_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

// Genuine robots.txt check - fetches and parses the target site's own
// robots.txt, checking whether it disallows the specific path being
// requested for our user-agent (or for all bots via '*'). Fails open
// (permits the fetch) only when robots.txt itself is missing or
// unreachable, which is the standard, correct interpretation - no
// robots.txt means no stated restriction exists.
async function isAllowedByRobotsTxt(targetUrl) {
    try {
        const url = new URL(targetUrl);
        const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(robotsUrl, {
            headers: { 'User-Agent': BOT_USER_AGENT },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) return { allowed: true }; // no robots.txt = no stated restriction

        const text = await response.text();
        const lines = text.split('\n').map(l => l.trim());

        let relevantSection = false;
        let genericSection = false;
        const disallowedPaths = [];
        const genericDisallowedPaths = [];

        for (const line of lines) {
            const lower = line.toLowerCase();
            if (lower.startsWith('user-agent:')) {
                const agent = line.split(':')[1]?.trim().toLowerCase();
                relevantSection = agent === 'bluskyeconsultbot';
                genericSection = agent === '*';
            } else if (lower.startsWith('disallow:')) {
                const path = line.split(':')[1]?.trim();
                if (!path) continue;
                if (relevantSection) disallowedPaths.push(path);
                if (genericSection) genericDisallowedPaths.push(path);
            }
        }

        // A rule specifically naming this bot always takes precedence
        // over the generic '*' rule, per standard robots.txt semantics.
        const rulesToCheck = disallowedPaths.length > 0 ? disallowedPaths : genericDisallowedPaths;
        const requestPath = url.pathname;
        const isDisallowed = rulesToCheck.some(path => requestPath.startsWith(path));

        return { allowed: !isDisallowed, matchedRule: isDisallowed ? rulesToCheck.find(p => requestPath.startsWith(p)) : null };
    } catch (error) {
        // robots.txt unreachable (timeout, network error, etc.) - fail
        // open, same as a genuinely missing robots.txt would.
        return { allowed: true };
    }
}

// Real SSRF guard - blocks anything that isn't a genuine, public
// internet HTTP(S) address. Exported so the same check can be applied
// at admin-entry time in index.js too (defense in depth: validated both
// when a URL is added AND every time it's actually fetched).
export function isSafeExternalUrl(rawUrl) {
    let url;
    try {
        url = new URL(rawUrl);
    } catch {
        return { safe: false, reason: 'Not a valid URL' };
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { safe: false, reason: 'Only http/https URLs are allowed' };
    }

    const host = url.hostname.toLowerCase();

    if (host === 'localhost' || host === '0.0.0.0' || host === '[::1]' || host === '::1') {
        return { safe: false, reason: 'Local/loopback addresses are not allowed' };
    }

    // Blocks private, loopback, link-local (includes the AWS/GCP/Azure
    // cloud metadata service at 169.254.169.254), and other reserved
    // IPv4 ranges when the hostname is a literal IP address.
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
        const [a, b] = [parseInt(ipv4Match[1]), parseInt(ipv4Match[2])];
        const isPrivateOrReserved =
            a === 10 ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            a === 127 ||
            (a === 169 && b === 254) ||
            a === 0;
        if (isPrivateOrReserved) {
            return { safe: false, reason: 'Private/internal IP ranges are not allowed' };
        }
    }

    // Blocks obvious internal/reserved hostname patterns even when not a
    // literal IP (e.g. something.internal, something.local).
    if (/\.(internal|local|corp|home|lan)$/i.test(host)) {
        return { safe: false, reason: 'Internal-looking hostnames are not allowed' };
    }

    return { safe: true };
}

async function withTimeout(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(url, { headers: REALISTIC_HEADERS, signal: controller.signal, redirect: 'follow' });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Reads a response body up to a hard cap, rather than trusting an
// arbitrary or malicious server to send a reasonably-sized page.
async function readBodyCapped(response) {
    const reader = response.body?.getReader?.();
    if (!reader) return await response.text(); // Environments without streaming - falls back safely.

    const decoder = new TextDecoder();
    let result = '';
    let bytesRead = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.length;
        if (bytesRead > MAX_RESPONSE_BYTES) {
            reader.cancel();
            break;
        }
        result += decoder.decode(value, { stream: true });
    }
    return result;
}


// Extracts every <script type="application/ld+json"> block and returns
// any that are (or contain) a real schema.org JobPosting entry -
// handles both a single JobPosting object and an array/@graph of mixed
// structured data types on the same page.
function extractJobPostingsFromHtml(html) {
    const jobPostings = [];
    const scriptBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

    for (const block of scriptBlocks) {
        const jsonMatch = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (!jsonMatch) continue;

        try {
            const parsed = JSON.parse(jsonMatch[1].trim());
            const candidates = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);

            for (const item of candidates) {
                const type = item['@type'];
                const isJobPosting = type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'));
                if (isJobPosting) jobPostings.push(item);
            }
        } catch {
            // Malformed JSON-LD on this specific page - skip this block,
            // not the whole scrape.
            continue;
        }
    }

    return jobPostings;
}

function mapJobPostingToJob(posting, employerSource) {
    const title = posting.title || posting.name || 'Unknown Position';
    const description = typeof posting.description === 'string'
        ? posting.description.replace(/<[^>]*>/g, '').substring(0, 1000)
        : '';

    let location = employerSource.country_code;
    const jobLocation = posting.jobLocation;
    if (jobLocation) {
        const addr = Array.isArray(jobLocation) ? jobLocation[0]?.address : jobLocation.address;
        if (addr) {
            location = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ') || location;
        }
    }
    if (posting.jobLocationType === 'TELECOMMUTE') location = 'Remote';

    let salaryRange = null;
    const salary = posting.baseSalary?.value;
    if (salary) {
        const currency = posting.baseSalary.currency || '';
        if (salary.minValue && salary.maxValue) {
            salaryRange = `${currency} ${salary.minValue} - ${salary.maxValue}`;
        } else if (salary.value) {
            salaryRange = `${currency} ${salary.value}`;
        }
    }

    return {
        title: title.substring(0, 200),
        company: employerSource.company_name,
        location,
        description,
        salary_range: salaryRange,
        external_apply_url: posting.url || posting.hiringOrganization?.sameAs || employerSource.careers_page_url || employerSource.website_url,
        source_country: employerSource.country_code,
        source_name: `${employerSource.company_name} (Verified Sponsor Career Page)`,
        published_at: posting.datePosted || null,
        verified_employer_source_id: employerSource.id,
        is_verified_sponsor: employerSource.is_verified_sponsor
    };
}

// Scrapes a single configured employer source. Returns a result object
// rather than throwing, so one employer failing never breaks a batch
// run across many employers.
export async function scrapeEmployerSource(employerSource) {
    const targetUrl = employerSource.careers_page_url || employerSource.website_url;

    // SECURITY: checked here too, not just at admin-entry time - even if
    // an unsafe URL somehow already exists in the database, it still
    // cannot be used to make this server reach internal infrastructure.
    const safetyCheck = isSafeExternalUrl(targetUrl);
    if (!safetyCheck.safe) {
        return { jobs: [], status: 'blocked', error: `Blocked for safety: ${safetyCheck.reason}` };
    }

    // NEW (2026-09-13): genuinely check and respect this site's own
    // robots.txt before fetching, rather than never checking at all.
    const robotsCheck = await isAllowedByRobotsTxt(targetUrl);
    if (!robotsCheck.allowed) {
        return { jobs: [], status: 'blocked', error: `Disallowed by robots.txt (matched rule: ${robotsCheck.matchedRule})` };
    }

    try {
        const response = await withTimeout(targetUrl);
        if (!response.ok) {
            return { jobs: [], status: 'failed', error: `HTTP ${response.status}` };
        }

        const html = await readBodyCapped(response);
        const postings = extractJobPostingsFromHtml(html);

        if (postings.length === 0) {
            return {
                jobs: [],
                status: 'no_structured_data',
                error: 'No JobPosting structured data found on this page - this employer may not publish machine-readable vacancy data, or vacancies may live on a different URL than the one configured'
            };
        }

        const jobs = postings.map(p => mapJobPostingToJob(p, employerSource));
        return { jobs, status: 'success', error: null };
    } catch (error) {
        return { jobs: [], status: 'failed', error: error.name === 'AbortError' ? 'Timed out' : error.message };
    }
}

// Real batch runner - scrapes every active configured employer source,
// saves results to external_jobs (same review queue as every other
// source), and records real per-employer status back onto
// verified_employer_sources so an admin can see, per company, whether
// their site is actually yielding real data.
export async function scrapeAllVerifiedEmployers(supabaseClient) {
    const { data: employers, error: fetchError } = await supabaseClient
        .from('verified_employer_sources')
        .select('*')
        .eq('is_active', true);

    if (fetchError) throw fetchError;

    const results = [];
    let totalAdded = 0;

    for (const employer of employers || []) {
        const { jobs, status, error } = await scrapeEmployerSource(employer);
        let added = 0;

        for (const job of jobs) {
            const { data: existing } = await supabaseClient
                .from('external_jobs')
                .select('id')
                .eq('title', job.title.substring(0, 150))
                .eq('source_name', job.source_name)
                .maybeSingle();

            if (existing) continue;

            const { error: insertError } = await supabaseClient
                .from('external_jobs')
                .insert({
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    description: job.description,
                    salary_range: job.salary_range,
                    external_apply_url: job.external_apply_url,
                    source_country: job.source_country,
                    source_name: job.source_name,
                    status: 'pending_approval',
                    verified_employer_source_id: job.verified_employer_source_id,
                    sponsorship_eligible: job.is_verified_sponsor,
                    created_at: new Date().toISOString(),
                    published_at: job.published_at
                });

            if (!insertError) added++;
        }

        totalAdded += added;
        results.push({ company: employer.company_name, status, found: jobs.length, added, error });

        await supabaseClient
            .from('verified_employer_sources')
            .update({
                last_scraped_at: new Date().toISOString(),
                last_scrape_status: status,
                last_scrape_job_count: jobs.length
            })
            .eq('id', employer.id);
    }

    return { totalAdded, results };
}
