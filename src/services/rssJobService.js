// src/services/rssJobService.js
// LIVE RSS FETCHING SERVICE - Real-time jobs from government sources

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION - Government RSS Feed Sources
// ============================================

const RSS_FEEDS = {
    // United Kingdom
    UK_CIVIL_SERVICE: {
        name: 'UK Civil Service Jobs',
        country: 'GB',
        url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml',
        type: 'rss',
        sponsorship_keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa', 'Certificate of Sponsorship']
    },
    UK_NHS: {
        name: 'NHS Jobs',
        country: 'GB',
        url: 'https://www.jobs.nhs.uk/feeds/jobs.xml',
        type: 'rss',
        sponsorship_keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa']
    },
    UK_GOV_FIND_JOB: {
        name: 'Find a Job - UK Government',
        country: 'GB',
        url: 'https://findajob.dwp.gov.uk/feeds/jobs.rss',
        type: 'rss',
        sponsorship_keywords: ['Sponsorship', 'Visa', 'Skilled Worker']
    },
    
    // Ireland
    IRELAND_PUBLICJOBS: {
        name: 'Public Jobs Ireland',
        country: 'IE',
        url: 'https://www.publicjobs.ie/rss',
        type: 'rss',
        sponsorship_keywords: ['Work Permit', 'Critical Skills', 'Sponsorship']
    },
    
    // Canada
    CANADA_GC_JOBS: {
        name: 'GC Jobs Canada',
        country: 'CA',
        url: 'https://www.jobs.gc.ca/rss',
        type: 'rss',
        sponsorship_keywords: ['Work Permit', 'LMIA', 'Sponsorship']
    },
    
    // Australia
    AUSTRALIA_APS_JOBS: {
        name: 'APS Jobs Australia',
        country: 'AU',
        url: 'https://www.apsjobs.gov.au/rss',
        type: 'rss',
        sponsorship_keywords: ['Visa Sponsorship', 'Work Visa', 'Sponsorship']
    },
    
    // USA
    USA_USAJOBS: {
        name: 'USAJobs',
        country: 'US',
        url: 'https://www.usajobs.gov/rss',
        type: 'rss',
        sponsorship_keywords: ['Visa', 'Work Authorization', 'Sponsorship']
    },
    
    // Germany
    GERMANY_BUND: {
        name: 'Bund.de - German Government Jobs',
        country: 'DE',
        url: 'https://www.bund.de/rss/jobs',
        type: 'rss',
        sponsorship_keywords: ['Work Visa', 'Blue Card', 'Sponsorship']
    }
};

// ============================================
// PARSE RSS FEED FUNCTION
// ============================================

async function parseRSSFeed(feedUrl) {
    try {
        const response = await fetch(feedUrl, {
            headers: {
                'User-Agent': 'ODUSBABA/1.0 (RSS Job Fetcher)'
            }
        });
        
        if (!response.ok) {
            console.warn(`Failed to fetch RSS: ${feedUrl} - Status: ${response.status}`);
            return [];
        }
        
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        // Check for parsing errors
        if (xmlDoc.querySelector('parsererror')) {
            console.warn(`RSS parsing error for ${feedUrl}`);
            return [];
        }
        
        const items = xmlDoc.querySelectorAll('item');
        const jobs = [];
        
        for (const item of items) {
            const title = item.querySelector('title')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent;
            
            // Skip if missing critical fields
            if (!title || !link) continue;
            
            // Extract salary from description using regex
            let salary = null;
            const salaryMatch = description.match(/£([\d,]+)(?:\s*-\s*£([\d,]+))?/i) ||
                              description.match(/€([\d,]+)(?:\s*-\s*€([\d,]+))?/i) ||
                              description.match(/\$([\d,]+)(?:\s*-\s*\$([\d,]+))?/i);
            
            if (salaryMatch) {
                salary = `£${salaryMatch[1]}`;
                if (salaryMatch[2]) salary += ` - £${salaryMatch[2]}`;
            }
            
            // Extract location from description
            let location = '';
            const locationMatch = description.match(/(?:Location|based in|located in):?\s*([A-Za-z\s,]+)/i);
            if (locationMatch) location = locationMatch[1].trim();
            
            jobs.push({
                title: title.substring(0, 200),
                description: description.substring(0, 500),
                link: link,
                pubDate: pubDate,
                salary: salary,
                location: location,
                source: feedUrl
            });
        }
        
        return jobs;
    } catch (error) {
        console.error(`Error parsing RSS feed ${feedUrl}:`, error);
        return [];
    }
}

// ============================================
// SEARCH JOBS WITH SPONSORSHIP DETECTION
// ============================================

function detectSponsorshipEligibility(title, description, sourceConfig) {
    const text = `${title} ${description}`.toLowerCase();
    
    // Check source-specific sponsorship keywords
    for (const keyword of sourceConfig.sponsorship_keywords) {
        if (text.includes(keyword.toLowerCase())) {
            return {
                eligible: true,
                keyword: keyword,
                type: 'explicit'
            };
        }
    }
    
    // Check general sponsorship indicators
    const generalKeywords = [
        'visa sponsorship', 'work visa', 'skilled worker', 'tier 2', 
        'certificate of sponsorship', 'sponsorship available', 'visa assistance',
        'relocation support', 'work permit', 'immigration support'
    ];
    
    for (const keyword of generalKeywords) {
        if (text.includes(keyword)) {
            return {
                eligible: true,
                keyword: keyword,
                type: 'general'
            };
        }
    }
    
    return { eligible: false };
}

// ============================================
// MAIN FUNCTION: Search Jobs with Live RSS Fetch
// ============================================

export async function searchLiveJobs(query, filters = {}) {
    const results = [];
    const allJobs = [];
    
    // Determine which sources to search
    let sourcesToSearch = Object.entries(RSS_FEEDS);
    
    // Filter by country if specified
    if (filters.country) {
        sourcesToSearch = sourcesToSearch.filter(([_, config]) => 
            config.country === filters.country
        );
    }
    
    // Fetch from all relevant RSS feeds in parallel
    const fetchPromises = sourcesToSearch.map(async ([key, config]) => {
        const jobs = await parseRSSFeed(config.url);
        return { config, jobs };
    });
    
    const feedResults = await Promise.all(fetchPromises);
    
    for (const { config, jobs } of feedResults) {
        for (const job of jobs) {
            const sponsorship = detectSponsorshipEligibility(job.title, job.description, config);
            
            allJobs.push({
                ...job,
                source_country: config.country,
                source_name: config.name,
                sponsorship_eligible: sponsorship.eligible,
                sponsorship_keyword: sponsorship.keyword
            });
        }
    }
    
    // Apply search query filter
    let filteredJobs = allJobs;
    
    if (query) {
        const queryLower = query.toLowerCase();
        filteredJobs = filteredJobs.filter(job => 
            job.title.toLowerCase().includes(queryLower) ||
            job.description.toLowerCase().includes(queryLower) ||
            (job.location && job.location.toLowerCase().includes(queryLower))
        );
    }
    
    // Apply sponsorship filter
    if (filters.sponsorshipOnly) {
        filteredJobs = filteredJobs.filter(job => job.sponsorship_eligible === true);
    }
    
    // Apply job type filter
    if (filters.jobType) {
        const jobTypeLower = filters.jobType.toLowerCase();
        filteredJobs = filteredJobs.filter(job => 
            job.title.toLowerCase().includes(jobTypeLower) ||
            job.description.toLowerCase().includes(jobTypeLower)
        );
    }
    
    // Sort by date (newest first) if pubDate exists
    filteredJobs.sort((a, b) => {
        if (a.pubDate && b.pubDate) {
            return new Date(b.pubDate) - new Date(a.pubDate);
        }
        return 0;
    });
    
    return filteredJobs.slice(0, filters.limit || 20);
}

// ============================================
// CACHE RESULTS to Database (Optional)
// ============================================

export async function cacheJobsToDatabase(jobs) {
    for (const job of jobs) {
        // Check if job already exists in cache
        const { data: existing } = await supabase
            .from('ai_job_cache')
            .select('id')
            .eq('job_title', job.title.substring(0, 100))
            .eq('job_url', job.link)
            .maybeSingle();
        
        if (!existing) {
            await supabase
                .from('ai_job_cache')
                .insert({
                    job_title: job.title,
                    job_company: job.source_name,
                    job_location: job.location,
                    job_salary: job.salary,
                    job_url: job.link,
                    job_summary: job.description,
                    fetched_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                })
                .catch(err => console.error('Cache insert error:', err));
        }
    }
}

// ============================================
// GET JOB SUGGESTIONS BASED ON USER QUERY
// ============================================

export async function getJobSuggestions(userQuery) {
    const queryLower = userQuery.toLowerCase();
    
    // Detect job type
    let jobType = '';
    if (queryLower.includes('healthcare') || queryLower.includes('nhs') || queryLower.includes('medical')) {
        jobType = 'healthcare';
    } else if (queryLower.includes('it') || queryLower.includes('tech') || queryLower.includes('software')) {
        jobType = 'technology';
    } else if (queryLower.includes('admin') || queryLower.includes('office') || queryLower.includes('assistant')) {
        jobType = 'administration';
    } else if (queryLower.includes('manager') || queryLower.includes('leadership')) {
        jobType = 'management';
    }
    
    // Detect country
    let country = '';
    if (queryLower.includes('uk') || queryLower.includes('britain') || queryLower.includes('london')) {
        country = 'GB';
    } else if (queryLower.includes('nigeria') || queryLower.includes('lagos')) {
        country = 'NG';
    } else if (queryLower.includes('canada') || queryLower.includes('toronto')) {
        country = 'CA';
    } else if (queryLower.includes('us') || queryLower.includes('usa') || queryLower.includes('america')) {
        country = 'US';
    } else if (queryLower.includes('germany') || queryLower.includes('berlin')) {
        country = 'DE';
    } else if (queryLower.includes('australia') || queryLower.includes('sydney')) {
        country = 'AU';
    } else if (queryLower.includes('ireland') || queryLower.includes('dublin')) {
        country = 'IE';
    }
    
    // Detect sponsorship requirement
    const sponsorshipOnly = queryLower.includes('sponsorship') || 
                           queryLower.includes('visa') || 
                           queryLower.includes('tier 2') ||
                           queryLower.includes('work permit');
    
    const filters = {
        country: country,
        jobType: jobType,
        sponsorshipOnly: sponsorshipOnly,
        limit: 15
    };
    
    const jobs = await searchLiveJobs(jobType || userQuery, filters);
    
    return {
        jobs: jobs,
        filters: filters,
        total: jobs.length
    };
}
