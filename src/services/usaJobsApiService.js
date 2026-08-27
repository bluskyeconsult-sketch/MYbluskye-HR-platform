// src/services/usaJobsApiService.js
//
// NEW (2026-08-27) — the "adult solution" for USAJobs specifically.
// Confirmed via live testing that scraping USAJobs' RSS feed alongside
// 11 other sources returns 0 results reliably ("1/12 feeds working"),
// almost certainly because government job portals increasingly run
// bot-detection that blocks requests from known cloud/datacenter IP
// ranges (which is exactly what a Vercel serverless function is) at the
// network level - no amount of fixing the RSS-parsing code changes that,
// since the request is being blocked before it's ever really "read."
//
// USAJobs has a REAL, official, documented, FREE public REST API meant
// specifically for this kind of integration - not the RSS feed meant for
// humans in a feed reader. This is the intended path, not a workaround.
//
// SETUP REQUIRED (one-time, free, ~5 minutes):
// 1. Register for a free API key at https://developer.usajobs.gov/APIRequest/Index
// 2. Add two real environment variables in Vercel:
//    USAJOBS_API_KEY=<the key from step 1>
//    USAJOBS_USER_AGENT=<the email address you registered with>
//    (USAJobs requires your registered email as the User-Agent - this is
//    their real, documented requirement, not a workaround.)

import { supabase } from '../lib/supabase';

const USAJOBS_API_URL = 'https://data.usajobs.gov/api/search';

export async function fetchUSAJobsViaOfficialAPI(options = {}) {
    const apiKey = process.env.USAJOBS_API_KEY;
    const userAgent = process.env.USAJOBS_USER_AGENT;

    if (!apiKey || !userAgent) {
        console.warn('USAJobs API not configured - missing USAJOBS_API_KEY or USAJOBS_USER_AGENT env vars');
        return { jobs: [], error: 'USAJobs API credentials not configured' };
    }

    try {
        const params = new URLSearchParams({
            ResultsPerPage: String(options.limit || 25),
            SortField: 'DatePosted',
            SortDirection: 'Desc'
        });
        if (options.keyword) params.append('Keyword', options.keyword);

        const response = await fetch(`${USAJOBS_API_URL}?${params.toString()}`, {
            headers: {
                'Host': 'data.usajobs.gov',
                'User-Agent': userAgent,
                'Authorization-Key': apiKey
            }
        });

        if (!response.ok) {
            return { jobs: [], error: `USAJobs API returned HTTP ${response.status}` };
        }

        const data = await response.json();
        const items = data?.SearchResult?.SearchResultItems || [];

        const jobs = items.map(item => {
            const d = item.MatchedObjectDescriptor || {};
            const remuneration = d.PositionRemuneration?.[0];
            return {
                title: (d.PositionTitle || 'Unknown Position').substring(0, 200),
                description: (d.UserArea?.Details?.JobSummary || d.QualificationSummary || '').substring(0, 1000),
                external_url: d.PositionURI || d.ApplyURI?.[0] || null,
                salary_range: remuneration ? `$${remuneration.MinimumRange} - $${remuneration.MaximumRange}` : null,
                salary_min: remuneration ? parseFloat(remuneration.MinimumRange) : null,
                salary_max: remuneration ? parseFloat(remuneration.MaximumRange) : null,
                location: d.PositionLocationDisplay || 'United States',
                posted_date: d.PublicationStartDate || null,
                source_name: 'USAJobs (Official API)',
                source_country: 'US',
                job_type: 'full_time'
            };
        });

        return { jobs, error: null };
    } catch (error) {
        return { jobs: [], error: error.message };
    }
}

// Saves fetched jobs into the same external_jobs table the rest of the
// pipeline already uses, with the same duplicate-checking approach as
// the real, existing saveJobToDatabase() in rssJobService.js.
export async function fetchAndSaveUSAJobs(options = {}) {
    const { jobs, error } = await fetchUSAJobsViaOfficialAPI(options);
    if (error) return { added: 0, error };

    let added = 0;
    for (const job of jobs) {
        const { data: existing } = await supabase
            .from('external_jobs')
            .select('id')
            .eq('title', job.title.substring(0, 150))
            .eq('source_name', job.source_name)
            .maybeSingle();

        if (existing) continue;

        const { error: insertError } = await supabase
            .from('external_jobs')
            .insert({
                title: job.title,
                company: job.source_name,
                location: job.location,
                description: job.description,
                salary_range: job.salary_range,
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                job_type: job.job_type,
                external_apply_url: job.external_url,
                source_country: job.source_country,
                source_name: job.source_name,
                status: 'pending_approval',
                created_at: new Date().toISOString(),
                published_at: job.posted_date
            });

        if (!insertError) added++;
    }

    return { added, total: jobs.length, error: null };
}
