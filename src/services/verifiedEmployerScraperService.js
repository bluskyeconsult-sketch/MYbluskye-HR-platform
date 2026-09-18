// src/services/verifiedEmployerScraperService.js
//
// NEW (2026-08-27) — a genuinely different fetch strategy from
// rssJobService.js's fixed feed list. This reads from the admin-managed
// verified_employer_sources registry (individual company career pages,
// intended especially for companies confirmed on official government
// sponsor-license registers) and tries THREE layered strategies per
// company, in order of real reliability - not one generic scraper
// pretending to work everywhere:
//
// TIER 1 - schema.org JobPosting structured data. Many company career
// pages, regardless of platform or visual design, embed a
// <script type="application/ld+json"> block containing structured
// JobPosting markup - published specifically so Google can show rich
// job listings in search results. This is genuinely reliable: it is
// structured, consistent, and doesn't depend on guessing at a
// particular site's HTML layout.
//
// TIER 2 - known ATS (Applicant Tracking System) platforms. A large
// share of companies use one of a handful of common hiring platforms
// (Greenhouse, Lever) that expose real, public, documented JSON
// endpoints for their job boards - not officially "APIs" in the sense
// of requiring a key, but stable, intentional public endpoints these
// platforms provide for exactly this kind of integration.
//
// TIER 3 - generic fallback. If neither of the above applies, a
// best-effort scan for <a> links whose text or href looks job-related.
// HONESTLY the least reliable tier - flagged as such in every result,
// so a low-quality Tier 3 result is never confused with a genuinely
// structured Tier 1/2 one.

const REQUEST_TIMEOUT_MS = 15000;
const REALISTIC_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(url, { ...options, headers: { ...REALISTIC_HEADERS, ...(options.headers || {}) }, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// TIER 1: schema.org JobPosting JSON-LD extraction.
function extractJsonLdJobPostings(html) {
    const jobs = [];
    const scriptBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

    for (const block of scriptBlocks) {
        const jsonMatch = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (!jsonMatch) continue;

        try {
            const parsed = JSON.parse(jsonMatch[1].trim());
            const candidates = Array.isArray(parsed) ? parsed : [parsed];

            for (const item of candidates) {
                const entries = item['@graph'] ? item['@graph'] : [item];
                for (const entry of entries) {
                    if (entry['@type'] !== 'JobPosting') continue;

                    jobs.push({
                        title: (entry.title || 'Unknown Position').substring(0, 200),
                        description: (typeof entry.description === 'string' ? entry.description.replace(/<[^>]*>/g, '') : '').substring(0, 500),
                        location: entry.jobLocation?.address?.addressLocality || entry.jobLocation?.address?.addressCountry || null,
                        external_apply_url: entry.url || null,
                        posted_date: entry.datePosted || null,
                        tier: 1,
                        tierLabel: 'structured JobPosting data'
                    });
                }
            }
        } catch {
            // Not valid JSON, or not a JobPosting block - skip silently,
            // other script blocks on the same page are still checked.
            continue;
        }
    }

    return jobs;
}

// TIER 2: known ATS platform public endpoints.
async function fetchFromKnownAtsPlatform(careerPageUrl) {
    const greenhouseMatch = careerPageUrl.match(/greenhouse\.io\/([a-z0-9_-]+)/i) || careerPageUrl.match(/([a-z0-9_-]+)\.greenhouse\.io/i);
    if (greenhouseMatch) {
        const board = greenhouseMatch[1];
        try {
            const response = await fetchWithTimeout(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`);
            if (response.ok) {
                const data = await response.json();
                return (data.jobs || []).map(job => ({
                    title: (job.title || 'Unknown Position').substring(0, 200),
                    description: '',
                    location: job.location?.name || null,
                    external_apply_url: job.absolute_url || null,
                    posted_date: job.updated_at || null,
                    tier: 2,
                    tierLabel: 'Greenhouse job board'
                }));
            }
        } catch {
            return null;
        }
    }

    const leverMatch = careerPageUrl.match(/jobs\.lever\.co\/([a-z0-9_-]+)/i);
    if (leverMatch) {
        const board = leverMatch[1];
        try {
            const response = await fetchWithTimeout(`https://api.lever.co/v0/postings/${board}?mode=json`);
            if (response.ok) {
                const data = await response.json();
                return (data || []).map(job => ({
                    title: (job.text || 'Unknown Position').substring(0, 200),
                    description: (job.descriptionPlain || '').substring(0, 500),
                    location: job.categories?.location || null,
                    external_apply_url: job.hostedUrl || null,
                    posted_date: job.createdAt ? new Date(job.createdAt).toISOString() : null,
                    tier: 2,
                    tierLabel: 'Lever job board'
                }));
            }
        } catch {
            return null;
        }
    }

    return null; // Not a recognized platform - caller falls through to Tier 3.
}

// TIER 3: generic best-effort fallback. Honestly the weakest tier -
// every result carries a clear tier/tierLabel marking it as such.
function extractGenericJobLinks(html, baseUrl) {
    const jobs = [];
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const jobWordPattern = /\b(job|career|vacanc|position|opening|role)/i;
    let match;
    let count = 0;

    while ((match = linkPattern.exec(html)) !== null && count < 30) {
        const href = match[1];
        const text = match[2].replace(/<[^>]*>/g, '').trim();

        if (!text || text.length < 5 || text.length > 150) continue;
        if (!jobWordPattern.test(href) && !jobWordPattern.test(text)) continue;

        let fullUrl = href;
        try {
            fullUrl = new URL(href, baseUrl).toString();
        } catch {
            continue;
        }

        jobs.push({
            title: text.substring(0, 200),
            description: '',
            location: null,
            external_apply_url: fullUrl,
            posted_date: null,
            tier: 3,
            tierLabel: 'generic link scan (lowest confidence - verify manually before approving)'
        });
        count++;
    }

    return jobs;
}

// Main entry point - tries all three tiers in order for one company,
// stopping as soon as a more reliable tier produces real results.
export async function fetchFromVerifiedEmployer(source) {
    try {
        const response = await fetchWithTimeout(source.career_page_url);
        if (!response.ok) {
            return { jobs: [], status: 'failed', error: `HTTP ${response.status}` };
        }
        const html = await response.text();

        const tier1Jobs = extractJsonLdJobPostings(html);
        if (tier1Jobs.length > 0) {
            return { jobs: tier1Jobs, status: 'success', tierUsed: 1 };
        }

        const tier2Jobs = await fetchFromKnownAtsPlatform(source.career_page_url);
        if (tier2Jobs && tier2Jobs.length > 0) {
            return { jobs: tier2Jobs, status: 'success', tierUsed: 2 };
        }

        const tier3Jobs = extractGenericJobLinks(html, source.career_page_url);
        return {
            jobs: tier3Jobs,
            status: tier3Jobs.length > 0 ? 'success' : 'no_jobs_found',
            tierUsed: 3
        };
    } catch (error) {
        return { jobs: [], status: 'failed', error: error.name === 'AbortError' ? 'Timed out' : error.message };
    }
}

// Fetches from every active source in the registry, saves results into
// the existing external_jobs table (same real approval pipeline every
// other source already uses), and marks jobs from confirmed licensed
// sponsors accordingly - the real, distinguishing value of this whole
// feature.
export async function fetchAllVerifiedEmployers(supabaseClient) {
    const { data: sources, error: sourcesError } = await supabaseClient
        .from('verified_employer_sources')
        .select('*')
        .eq('is_active', true);

    if (sourcesError) return { success: false, error: sourcesError.message };

    const results = [];

    for (const source of sources || []) {
        const result = await fetchFromVerifiedEmployer(source);
        let added = 0;

        for (const job of result.jobs) {
            const { data: existing } = await supabaseClient
                .from('external_jobs')
                .select('id')
                .eq('title', job.title.substring(0, 150))
                .eq('source_name', source.company_name)
                .maybeSingle();

            if (existing) continue;

            const { error: insertError } = await supabaseClient
                .from('external_jobs')
                .insert({
                    title: job.title,
                    company: source.company_name,
                    location: job.location || source.country_code,
                    description: job.description || `Posted directly by ${source.company_name}${source.is_licensed_sponsor ? ' - confirmed on the official government sponsor-license register' : ''}. Source reliability: ${job.tierLabel}.`,
                    external_apply_url: job.external_apply_url,
                    source_country: source.country_code,
                    source_name: source.company_name,
                    // FIXED (2026-09-18): same real schema fix as
                    // employerWebsiteScraperService.js - this column
                    // doesn't exist on external_jobs at all.
                    status: 'pending_approval',
                    created_at: new Date().toISOString(),
                    published_at: job.posted_date
                });

            if (!insertError) added++;
        }

        await supabaseClient
            .from('verified_employer_sources')
            .update({
                last_fetched_at: new Date().toISOString(),
                last_fetch_status: result.status,
                last_fetch_job_count: added
            })
            .eq('id', source.id);

        results.push({
            company: source.company_name,
            status: result.status,
            tierUsed: result.tierUsed,
            found: result.jobs.length,
            added,
            error: result.error
        });
    }

    return { success: true, results };
}
