// src/services/verifiedSponsorService.js
//
// NEW (2026-08-27) — a genuinely different, third approach to sourcing
// jobs, alongside the RSS/API batch pipeline (rssJobService.js) and the
// live chat search (liveJobSearchService.js). Instead of scraping
// government job PORTALS (several confirmed blocked as deliberate
// policy), this works from real company website addresses supplied
// directly - e.g. from a government's published sponsor license
// register - and only ever pulls structured job data from a small set
// of CONFIRMED real, free, public ATS (applicant tracking system) APIs.
//
// CONFIRMED THIS SESSION, via direct research:
// - Greenhouse: https://boards-api.greenhouse.io/v1/boards/{token}/jobs
//   Real, free, no authentication required for reading published jobs.
// - Lever: https://api.lever.co/v0/postings/{company}?mode=json
//   Same - real, free, no authentication required.
// Both are explicitly confirmed, by their own documentation and
// independent developer guides, to be intended for exactly this kind of
// read access - not a workaround.
//
// HONEST DESIGN LIMIT, also confirmed via research: there is no way to
// automatically discover whether an arbitrary company uses Greenhouse or
// Lever, or to enumerate their customers - each company's identifier
// must be known or detected from their own careers URL. This is exactly
// why this is admin-supplied rather than automatically discovered - a
// real, structural fact about how these ATS platforms work, not a
// limitation of this code.
//
// For a company whose careers page does NOT match a known ATS pattern,
// this deliberately does NOT attempt generic HTML scraping (arbitrary
// site structures are not maintainable and often break silently) -
// instead the company is kept as a real, verified, direct-link entry in
// the directory, honestly presented as "visit their careers page
// directly" rather than pretending to have structured data that was
// never actually and reliably extracted.

import { supabase } from '../lib/supabase';

// Detects a known ATS platform from a real company careers URL, and
// extracts the identifier needed to call that platform's real public
// API. Returns null if no known pattern matches.
export function detectAtsPlatform(careersUrl) {
    try {
        const url = new URL(careersUrl);
        const host = url.hostname.toLowerCase();
        const path = url.pathname;

        // Direct Greenhouse-hosted board: boards.greenhouse.io/{token}
        if (host.includes('greenhouse.io')) {
            const match = path.match(/\/([a-z0-9_-]+)\/?$/i) || path.match(/^\/([a-z0-9_-]+)/i);
            if (match) return { platform: 'greenhouse', identifier: match[1] };
        }

        // Direct Lever-hosted board: jobs.lever.co/{company}
        if (host.includes('lever.co')) {
            const match = path.match(/^\/([a-z0-9_-]+)/i);
            if (match) return { platform: 'lever', identifier: match[1] };
        }

        // Many companies embed Greenhouse/Lever on their OWN domain
        // (e.g. careers.company.com) via an iframe or JS widget rather
        // than linking directly to boards.greenhouse.io - this cannot be
        // reliably detected from the URL alone without actually fetching
        // and inspecting the page. Handled honestly in
        // fetchVerifiedSponsorJobs() below: if no pattern matches here,
        // the company is stored as a direct-link entry, not silently
        // assumed to have no ATS at all.
        return null;
    } catch {
        return null;
    }
}

async function fetchGreenhouseJobs(boardToken) {
    try {
        const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`);
        if (!response.ok) return { jobs: [], error: `HTTP ${response.status}` };
        const data = await response.json();
        const jobs = (data.jobs || []).map(job => ({
            title: (job.title || 'Unknown Position').substring(0, 200),
            location: job.location?.name || 'Not specified',
            description: (job.content || '').replace(/<[^>]*>/g, '').substring(0, 1000),
            external_apply_url: job.absolute_url
        }));
        return { jobs, error: null };
    } catch (error) {
        return { jobs: [], error: error.message };
    }
}

async function fetchLeverJobs(company) {
    try {
        const response = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`);
        if (!response.ok) return { jobs: [], error: `HTTP ${response.status}` };
        const data = await response.json();
        const jobs = (data || []).map(job => ({
            title: (job.text || 'Unknown Position').substring(0, 200),
            location: job.categories?.location || 'Not specified',
            description: (job.descriptionPlain || job.description || '').substring(0, 1000),
            external_apply_url: job.hostedUrl || job.applyUrl
        }));
        return { jobs, error: null };
    } catch (error) {
        return { jobs: [], error: error.message };
    }
}

// Called when an admin adds a new verified sponsor company - detects
// the ATS platform (if any) from the supplied URL and stores it so the
// batch fetch below knows how to pull real jobs for this company going
// forward.
export async function addVerifiedSponsorCompany({ companyName, careersUrl, countryCode, industry, governmentVerified, verificationSource, adminUserId }) {
    const detected = detectAtsPlatform(careersUrl);

    const { data, error } = await supabase
        .from('verified_sponsor_companies')
        .insert({
            company_name: companyName,
            careers_url: careersUrl,
            country_code: countryCode || null,
            industry: industry || null,
            government_verified: !!governmentVerified,
            verification_source: verificationSource || null,
            ats_platform: detected?.platform || null,
            ats_identifier: detected?.identifier || null,
            added_by: adminUserId
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, company: data, atsDetected: !!detected };
}

// Real batch fetch - for every verified company with a DETECTED ATS
// platform, pulls real, current, structured job data from that
// platform's real public API and saves into external_jobs (same table
// the rest of the pipeline already uses, so this feeds the same
// admin-review/approval flow, not a separate silo).
export async function fetchVerifiedSponsorJobs() {
    const { data: companies, error } = await supabase
        .from('verified_sponsor_companies')
        .select('*')
        .eq('is_active', true)
        .not('ats_platform', 'is', null);

    if (error) return { added: 0, error: error.message };

    let added = 0;
    const results = [];

    for (const company of companies || []) {
        const fetchResult = company.ats_platform === 'greenhouse'
            ? await fetchGreenhouseJobs(company.ats_identifier)
            : company.ats_platform === 'lever'
                ? await fetchLeverJobs(company.ats_identifier)
                : { jobs: [], error: 'Unknown ATS platform' };

        for (const job of fetchResult.jobs) {
            const { data: existing } = await supabase
                .from('external_jobs')
                .select('id')
                .eq('title', job.title.substring(0, 150))
                .eq('company', company.company_name)
                .maybeSingle();

            if (existing) continue;

            const { error: insertError } = await supabase
                .from('external_jobs')
                .insert({
                    title: job.title,
                    company: company.company_name,
                    location: job.location,
                    description: `${job.description}\n\n[Verified government-registered sponsor${company.verification_source ? ` - ${company.verification_source}` : ''}]`.substring(0, 1500),
                    external_apply_url: job.external_apply_url,
                    source_country: company.country_code,
                    source_name: `${company.company_name} (Verified Sponsor)`,
                    sponsorship_eligible: company.government_verified,
                    status: 'pending_approval',
                    created_at: new Date().toISOString()
                });

            if (!insertError) added++;
        }

        results.push({ company: company.company_name, platform: company.ats_platform, found: fetchResult.jobs.length, error: fetchResult.error });

        await supabase
            .from('verified_sponsor_companies')
            .update({ last_checked_at: new Date().toISOString() })
            .eq('id', company.id);
    }

    return { added, results };
}

// Real, public directory listing - for the job board UI and the chat's
// job-search context to reference verified companies directly, even
// ones with no detected ATS (an honest "visit their careers page"
// entry is still real, valuable, government-verified information).
export async function getVerifiedSponsorDirectory({ countryCode } = {}) {
    let query = supabase
        .from('verified_sponsor_companies')
        .select('company_name, careers_url, country_code, industry, government_verified, ats_platform')
        .eq('is_active', true)
        .order('company_name');

    if (countryCode) query = query.eq('country_code', countryCode);

    const { data, error } = await query;
    if (error) return [];
    return data || [];
}
