// src/services/germanyJobsApiService.js
//
// NEW (2026-08-27) — genuinely different status from every other source
// in this project, and that difference is documented here on purpose.
//
// HONEST STATUS: Germany's Bundesagentur für Arbeit (Federal Employment
// Agency) does NOT publish an official, government-sanctioned public
// API for job search - confirmed directly via their own developer
// community's documentation, which states this explicitly. What DOES
// exist, and is real and currently working, is the actual internal JSON
// API their own website's frontend calls to render search results -
// discovered and documented by an independent developer community
// (github.com/bundesAPI/jobsuche-api), not published or supported by the
// German government itself.
//
// This is a meaningfully different category from both extremes already
// handled elsewhere in this project:
// - NOT like UK Civil Service Jobs, which explicitly, deliberately
//   blocks automated/aggregator access as policy.
// - NOT like USAJobs or Canada's Job Bank open data, which are
//   officially published and government-sanctioned for exactly this use.
// It sits in between: a real, functioning API surface, not published as
// a stable public contract, meaning it could change or stop working
// without notice, with no official channel to report or rely on. Use
// this with that understanding - if it starts failing, that is not
// necessarily a bug in this code, it may mean the underlying agency
// changed something on their end with no obligation to maintain
// compatibility for outside users.

const JOBSUCHE_API_URL = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs';
// Real, community-documented header value that authenticates requests
// to this endpoint - not a secret credential, publicly documented by the
// same community source referenced above.
const JOBSUCHE_API_KEY = 'jobboerse-jobsuche';

export async function fetchGermanyJobsLive({ keyword, location } = {}) {
    try {
        const params = new URLSearchParams();
        if (keyword) params.append('was', keyword);
        if (location) params.append('wo', location);
        params.append('size', '25');

        const response = await fetch(`${JOBSUCHE_API_URL}?${params.toString()}`, {
            headers: { 'X-API-Key': JOBSUCHE_API_KEY }
        });

        if (!response.ok) {
            return { jobs: [], error: `HTTP ${response.status} - this unofficial endpoint may have changed; see file header` };
        }

        const data = await response.json();
        const items = data?.stellenangebote || [];

        const jobs = items.map(job => ({
            title: (job.titel || 'Unknown Position').substring(0, 200),
            company: job.arbeitgeber || 'Not specified',
            location: job.arbeitsort?.ort || 'Germany',
            description: `${job.beruf || ''} - via Bundesagentur für Arbeit (Germany's Federal Employment Agency)`.substring(0, 500),
            salary_range: null,
            external_apply_url: job.refnr ? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refnr}` : null,
            source_name: 'Bundesagentur für Arbeit (Germany, unofficial API)',
            source_country: 'DE'
        }));

        return { jobs, error: null };
    } catch (error) {
        return { jobs: [], error: error.message };
    }
}
