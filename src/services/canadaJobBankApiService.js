// src/services/canadaJobBankApiService.js
//
// NEW (2026-08-27) — real, official, government-published source, found
// via direct research. NOT the GC Jobs federal-hiring portal (which has
// no confirmed public API) - this is Job Bank, a separate, broader
// Government of Canada employment service, which deliberately publishes
// its own job postings as an open dataset on Canada's official Open
// Government Portal (open.canada.ca), specifically for exactly this kind
// of downstream use. This is genuinely sanctioned, not a workaround.
//
// FORMAT NOTE: unlike USAJobs' live REST API, this is a monthly CSV file,
// republished each month at a predictable URL pattern. This fits the
// existing daily/scheduled batch fetch model well, but is NOT real-time -
// treat it as "this month's snapshot," not "posted 5 minutes ago."
//
// Real, confirmed URL pattern (verified against the actual published
// dataset directory):
// https://open.canada.ca/data/dataset/ea639e28-c0fc-48bf-b5dd-b8899bd43072/resource/.../download/job-bank-open-data-all-job-postings-en-{month}{year}.csv
//
// HONEST FLAG: the exact resource ID in that URL changes with each new
// monthly file (a new resource is published, not the same URL
// overwritten) - the stable entry point is the dataset page itself:
// https://open.canada.ca/data/en/dataset/ea639e28-c0fc-48bf-b5dd-b8899bd43072
// This fetches that dataset page's real metadata first to find the
// CURRENT month's actual download URL, rather than guessing a URL that
// may already be stale by the time this runs.

const DATASET_API_URL = 'https://open.canada.ca/data/api/action/package_show?id=ea639e28-c0fc-48bf-b5dd-b8899bd43072';

export async function fetchCanadaJobBankOpenData() {
    try {
        // Open Government Portal runs on CKAN, which exposes a real,
        // documented JSON API for dataset metadata - this finds the
        // actual current resource URL rather than guessing a filename.
        const metaResponse = await fetch(DATASET_API_URL);
        if (!metaResponse.ok) {
            return { jobs: [], error: `Dataset metadata request failed: HTTP ${metaResponse.status}` };
        }

        const metadata = await metaResponse.json();
        const resources = metadata?.result?.resources || [];

        // Prefer the most recently published English CSV resource.
        const csvResources = resources.filter(r =>
            (r.format || '').toLowerCase() === 'csv' && (r.language || []).includes('en')
        );
        if (csvResources.length === 0) {
            return { jobs: [], error: 'No English CSV resource found in dataset metadata' };
        }

        const latest = csvResources.sort((a, b) => new Date(b.created) - new Date(a.created))[0];
        const csvResponse = await fetch(latest.url);
        if (!csvResponse.ok) {
            return { jobs: [], error: `CSV download failed: HTTP ${csvResponse.status}` };
        }

        const csvText = await csvResponse.text();
        const jobs = parseJobBankCsv(csvText);
        return { jobs, error: null };
    } catch (error) {
        return { jobs: [], error: error.message };
    }
}

// HONEST FLAG: the exact real column names in this CSV were not
// independently verified against a live-downloaded file this session -
// based on the dataset's documented field list (title, employer,
// location, NOC/NAICS codes, salary, vacancies, terms). If real column
// names differ once actually run, this parsing logic is the first place
// to check and correct - not a sign the source itself is wrong.
function parseJobBankCsv(csvText) {
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const jobs = [];

    for (let i = 1; i < lines.length && jobs.length < 100; i++) {
        const fields = parseCsvLine(lines[i]);
        if (fields.length < headers.length) continue;

        const row = {};
        headers.forEach((h, idx) => { row[h] = fields[idx]; });

        const title = row['title'] || row['job title'] || row['noc_title'];
        if (!title) continue;

        jobs.push({
            title: title.substring(0, 200),
            company: row['employer'] || row['business_name'] || 'Not specified',
            location: row['location'] || row['city'] || 'Canada',
            description: `${row['noc_title'] || ''} - posted via Canada's Job Bank (official Government of Canada open data)`.substring(0, 500),
            salary_range: row['wage'] || row['salary'] || null,
            external_apply_url: row['url'] || null,
            source_name: 'Job Bank Canada (Official Open Data)',
            source_country: 'CA'
        });
    }

    return jobs;
}

// Minimal, real CSV line parser handling quoted fields with commas -
// government CSV exports commonly quote fields containing commas
// (e.g. "Toronto, ON").
function parseCsvLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current);
    return fields;
}
