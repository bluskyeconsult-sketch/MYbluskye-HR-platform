// src/services/jobFeedService.js
// External Job Feed Service - Fetches jobs from public RSS feeds
// Sources: Himalayas, HireWeb3, Jobicy, Techmap (RapidAPI)

import axios from 'axios';
import xml2js from 'xml2js';
import { supabase } from '../lib/supabase';

// ============================================
// HIMALAYAS RSS FEED - NO AUTH REQUIRED
// URL: https://himalayas.app/jobs/rss
// Coverage: Global remote jobs (195+ countries)
// ============================================

export async function fetchHimalayasJobs() {
    const url = 'https://himalayas.app/jobs/rss';
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'ODUSBABA/1.0' },
            timeout: 15000
        });
        
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);
        
        const items = result.rss?.channel?.item || [];
        if (!Array.isArray(items)) return [];
        
        const jobs = [];
        
        for (const item of items) {
            const companyName = item['himalayasJobs:companyName'] || 'Unknown Company';
            const locationRestrictions = item['himalayasJobs:locationRestriction'] || [];
            const locationArray = Array.isArray(locationRestrictions) ? locationRestrictions : [locationRestrictions];
            const locationStr = locationArray.length > 0 ? locationArray.join(', ') : 'Remote (Worldwide)';
            
            jobs.push({
                title: item.title || 'Unknown Position',
                company: companyName,
                location: locationStr,
                description: item.description || 'No description provided',
                salary_range: extractSalaryFromText(item.description || ''),
                country_code: extractCountryCodeFromText(locationStr),
                job_type: 'full_time',
                source_type: 'authoritative',
                source_name: 'Himalayas',
                external_apply_url: item.link || null,
                status: 'pending_approval',
                metadata: { company_logo: item['himalayasJobs:companyLogo'] || null }
            });
        }
        
        console.log(`✅ Himalayas: Fetched ${jobs.length} jobs`);
        return jobs;
    } catch (error) {
        console.error('❌ Himalayas feed error:', error.message);
        return [];
    }
}

// ============================================
// HIREWEB3 RSS FEED - NO AUTH REQUIRED
// URL: https://hireweb3.io/job/rss
// Attribution Required: Link back to HireWeb3
// ============================================

export async function fetchHireWeb3Jobs() {
    const url = 'https://hireweb3.io/job/rss';
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'ODUSBABA/1.0' },
            timeout: 15000
        });
        
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);
        
        const items = result.rss?.channel?.item || [];
        if (!Array.isArray(items)) return [];
        
        const jobs = [];
        
        for (const item of items) {
            const companyName = item['hireweb3Jobs:companyName'] || 'Unknown Company';
            const locationRaw = item['hireweb3Jobs:location'] || 'Remote';
            const minSalary = item['hireweb3Jobs:minSalary'];
            const maxSalary = item['hireweb3Jobs:maxSalary'];
            const locationType = item['hireweb3Jobs:locationType'] || 'remote';
            
            jobs.push({
                title: item.title || 'Unknown Position',
                company: companyName,
                location: locationRaw,
                description: item.description || 'No description provided',
                salary_min: minSalary ? parseInt(minSalary) : null,
                salary_max: maxSalary ? parseInt(maxSalary) : null,
                salary_range: minSalary && maxSalary ? `$${minSalary} - $${maxSalary}` : 'Competitive',
                country_code: extractCountryCodeFromText(locationRaw),
                job_type: 'full_time',
                source_type: 'authoritative',
                source_name: 'HireWeb3',
                external_apply_url: item.link || null,
                status: 'pending_approval',
                is_remote: locationType === 'remote' || locationRaw.toLowerCase().includes('remote'),
                metadata: { company_logo: item['hireweb3Jobs:companyLogo'] || null }
            });
        }
        
        console.log(`✅ HireWeb3: Fetched ${jobs.length} jobs`);
        console.log('⚠️ Attribution required: Link back to HireWeb3 as job source');
        return jobs;
    } catch (error) {
        console.error('❌ HireWeb3 feed error:', error.message);
        return [];
    }
}

// ============================================
// JOBICY RSS FEED - NO AUTH REQUIRED
// URL: https://jobicy.com/feed/job_feed
// Supports: search_region, job_categories, job_types
// ============================================

export async function fetchJobicyJobs(region = 'all') {
    let url = 'https://jobicy.com/feed/job_feed';
    if (region && region !== 'all') {
        url += `?search_region=${region}`;
    }
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'ODUSBABA/1.0' },
            timeout: 15000
        });
        
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);
        
        const items = result.rss?.channel?.item || [];
        if (!Array.isArray(items)) return [];
        
        const jobs = [];
        
        for (const item of items) {
            const description = item.description || '';
            
            jobs.push({
                title: item.title || 'Unknown Position',
                company: extractCompanyFromTitle(item.title) || 'Unknown Company',
                location: extractLocationFromDescription(description),
                description: description,
                salary_range: extractSalaryFromText(description),
                country_code: extractCountryCodeFromText(description),
                job_type: 'full_time',
                source_type: 'authoritative',
                source_name: 'Jobicy',
                external_apply_url: item.link || null,
                status: 'pending_approval',
                is_remote: true,
                metadata: { category: item.category || null, region: region }
            });
        }
        
        console.log(`✅ Jobicy: Fetched ${jobs.length} jobs (region: ${region})`);
        return jobs;
    } catch (error) {
        console.error('❌ Jobicy feed error:', error.message);
        return [];
    }
}

// ============================================
// TECHMAP API - REQUIRES RAPIDAPI KEY
// Free tier: 250 jobs/month, Luxembourg only
// Register at: https://rapidapi.com/techmap-io/api/job-postings-api
// ============================================

export async function fetchTechmapJobs(apiKey, countryCode = 'lu', limit = 10) {
    if (!apiKey) {
        console.log('⚠️ Techmap: No API key provided. Skipping. Get free key at RapidAPI');
        return [];
    }
    
    const url = `https://job-postings-api.p.rapidapi.com/api/v2/jobs/search?countryCode=${countryCode}&page=1&limit=${Math.min(limit, 10)}`;
    
    try {
        const response = await axios.get(url, {
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'job-postings-api.p.rapidapi.com'
            },
            timeout: 15000
        });
        
        const jobsData = response.data?.results || [];
        const jobs = [];
        
        for (const job of jobsData) {
            jobs.push({
                title: job.title || 'Unknown Position',
                company: job.hiringOrganization?.name || 'Unknown Company',
                location: `${job.jobLocation?.address?.addressLocality || ''}, ${job.jobLocation?.address?.addressCountry || countryCode.toUpperCase()}`,
                description: job.description || 'No description provided',
                salary_min: job.baseSalary?.value?.minValue || null,
                salary_max: job.baseSalary?.value?.maxValue || null,
                salary_range: job.baseSalary?.value?.minValue && job.baseSalary?.value?.maxValue 
                    ? `${job.baseSalary.value.currency}${job.baseSalary.value.minValue} - ${job.baseSalary.value.maxValue}`
                    : 'Competitive',
                country_code: job.jobLocation?.address?.addressCountry || countryCode.toUpperCase(),
                job_type: job.employmentType === 'FULL_TIME' ? 'full_time' : 'full_time',
                source_type: 'authoritative',
                source_name: 'Techmap',
                external_apply_url: job.url || null,
                status: 'pending_approval',
                is_remote: job.jobLocationType === 'REMOTE',
                metadata: { industry: job.industry, skills: job.skills }
            });
        }
        
        console.log(`✅ Techmap: Fetched ${jobs.length} jobs (${countryCode.toUpperCase()})`);
        console.log(`⚠️ Free tier limit: 250 jobs/month. Current: ${jobs.length}`);
        return jobs;
    } catch (error) {
        console.error('❌ Techmap API error:', error.response?.status, error.message);
        return [];
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractCountryCodeFromText(text) {
    const countryMap = {
        'United States': 'US', 'USA': 'US', 'America': 'US',
        'Canada': 'CA',
        'United Kingdom': 'GB', 'UK': 'GB', 'England': 'GB',
        'Germany': 'DE',
        'France': 'FR',
        'Spain': 'ES',
        'Italy': 'IT',
        'Australia': 'AU',
        'Brazil': 'BR',
        'India': 'IN',
        'Japan': 'JP',
        'Singapore': 'SG',
        'Netherlands': 'NL',
        'Sweden': 'SE',
        'Norway': 'NO',
        'Denmark': 'DK',
        'Finland': 'FI',
        'Luxembourg': 'LU'
    };
    
    for (const [country, code] of Object.entries(countryMap)) {
        if (text.includes(country)) return code;
    }
    return null;
}

function extractSalaryFromText(text) {
    const patterns = [
        /\$[\d,]+(?:\s*-\s*\$[\d,]+)?/i,
        /£[\d,]+(?:\s*-\s*£[\d,]+)?/i,
        /€[\d,]+(?:\s*-\s*€[\d,]+)?/i,
        /[\d,]+k(?:\s*-\s*[\d,]+k)?/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[0];
    }
    return 'Competitive';
}

function extractCompanyFromTitle(title) {
    const atMatch = title.match(/at\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s+-\s+|$)/i);
    if (atMatch) return atMatch[1].trim();
    
    const dashMatch = title.match(/^([A-Z][a-zA-Z0-9\s&]+?)\s+-\s+/);
    if (dashMatch) return dashMatch[1].trim();
    
    return null;
}

function extractLocationFromDescription(description) {
    const locationMatch = description.match(/Location:\s*([^<|]+)/i);
    if (locationMatch) return locationMatch[1].trim();
    return 'Remote';
}

// ============================================
// ORCHESTRATION - FETCH ALL SOURCES
// ============================================

export async function fetchAllExternalJobs(options = {}) {
    console.log('🚀 Starting external job feed fetch...');
    const startTime = Date.now();
    
    const allJobs = [];
    
    // 1. Himalayas
    const himalayasJobs = await fetchHimalayasJobs();
    allJobs.push(...himalayasJobs);
    
    // 2. HireWeb3
    const hireweb3Jobs = await fetchHireWeb3Jobs();
    allJobs.push(...hireweb3Jobs);
    
    // 3. Jobicy (multiple regions)
    const regions = options.jobicyRegions || ['usa', 'uk', 'emea', 'apac'];
    for (const region of regions) {
        const jobicyJobs = await fetchJobicyJobs(region);
        allJobs.push(...jobicyJobs);
    }
    
    // 4. Techmap (requires API key)
    if (options.techmapApiKey) {
        const countries = options.techmapCountries || ['lu'];
        for (const country of countries) {
            const techmapJobs = await fetchTechmapJobs(options.techmapApiKey, country, 10);
            allJobs.push(...techmapJobs);
        }
    }
    
    const duration = Date.now() - startTime;
    console.log(`📊 Total jobs fetched: ${allJobs.length} in ${duration}ms`);
    
    return allJobs;
}

// ============================================
// SAVE TO DATABASE WITH DEDUPLICATION
// ============================================

export async function saveExternalJobsToDatabase(jobs) {
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const job of jobs) {
        // Check for duplicate by external_apply_url
        const { data: existing } = await supabase
            .from('external_jobs')
            .select('id')
            .eq('external_apply_url', job.external_apply_url)
            .maybeSingle();
        
        if (existing) {
            skipped++;
            continue;
        }
        
        const { error } = await supabase
            .from('external_jobs')
            .insert({
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                salary_range: job.salary_range,
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                country_code: job.country_code,
                job_type: job.job_type,
                source_type: job.source_type,
                source_name: job.source_name,
                external_apply_url: job.external_apply_url,
                status: job.status,
                metadata: job.metadata,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            errors++;
            console.error('Insert error:', error.message);
        } else {
            inserted++;
        }
    }
    
    console.log(`💾 Database: ${inserted} inserted, ${skipped} duplicates, ${errors} errors`);
    return { inserted, skipped, errors };
}

// ============================================
// MAIN SYNC FUNCTION
// ============================================

export async function syncExternalJobs(options = {}) {
    const startTime = Date.now();
    
    try {
        const jobs = await fetchAllExternalJobs(options);
        const result = await saveExternalJobsToDatabase(jobs);
        
        const duration = Date.now() - startTime;
        console.log(`⏱️ Sync completed in ${duration}ms`);
        
        return {
            success: true,
            fetched: jobs.length,
            inserted: result.inserted,
            skipped: result.skipped,
            errors: result.errors,
            duration_ms: duration
        };
    } catch (error) {
        console.error('❌ Sync failed:', error);
        return { success: false, error: error.message };
    }
}
