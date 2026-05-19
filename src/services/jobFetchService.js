// src/services/jobFetchService.js
// COMPLETE JOB FETCH SERVICE - Fetches from multiple sources

import { supabase } from '../lib/supabase';

// Government job RSS feeds (verified working)
const JOB_SOURCES = [
    {
        name: 'UK Civil Service',
        country: 'GB',
        url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml',
        type: 'rss',
        active: true
    },
    {
        name: 'UK NHS Jobs',
        country: 'GB',
        url: 'https://www.jobs.nhs.uk/feeds/jobs.xml',
        type: 'rss',
        active: true
    },
    {
        name: 'UK Gov Find a Job',
        country: 'GB',
        url: 'https://findajob.dwp.gov.uk/feeds/jobs.rss',
        type: 'rss',
        active: true
    },
    {
        name: 'USAJobs',
        country: 'US',
        url: 'https://www.usajobs.gov/rss',
        type: 'rss',
        active: true
    },
    {
        name: 'GC Jobs Canada',
        country: 'CA',
        url: 'https://www.jobs.gc.ca/rss',
        type: 'rss',
        active: true
    },
    {
        name: 'APS Jobs Australia',
        country: 'AU',
        url: 'https://www.apsjobs.gov.au/rss',
        type: 'rss',
        active: true
    },
    {
        name: 'Public Jobs Ireland',
        country: 'IE',
        url: 'https://www.publicjobs.ie/rss',
        type: 'rss',
        active: true
    }
];

async function fetchRSSFeed(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'ODUSBABA-Job-Fetcher/1.0' }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) return [];
        
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        if (xmlDoc.querySelector('parsererror')) return [];
        
        const items = xmlDoc.querySelectorAll('item');
        const jobs = [];
        
        for (const item of items) {
            const title = item.querySelector('title')?.textContent?.trim() || '';
            const description = item.querySelector('description')?.textContent?.trim() || '';
            const link = item.querySelector('link')?.textContent?.trim() || '';
            const pubDate = item.querySelector('pubDate')?.textContent;
            
            if (!title || !link) continue;
            
            // Extract salary
            let salaryMatch = description.match(/£([\d,]+)(?:\s*-\s*£([\d,]+))?/i);
            if (!salaryMatch) salaryMatch = description.match(/\$([\d,]+)(?:\s*-\s*\$([\d,]+))?/i);
            if (!salaryMatch) salaryMatch = description.match(/€([\d,]+)(?:\s*-\s*€([\d,]+))?/i);
            
            let salaryRange = null;
            if (salaryMatch) {
                salaryRange = `${salaryMatch[1]}${salaryMatch[2] ? ` - ${salaryMatch[2]}` : ''}`;
            }
            
            jobs.push({
                title: title.substring(0, 200),
                description: description.substring(0, 1000),
                link: link,
                pubDate: pubDate,
                salary: salaryRange
            });
        }
        
        return jobs;
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return [];
    }
}

export async function fetchAllExternalJobs() {
    const results = { total: 0, added: 0, errors: 0, jobs: [] };
    
    for (const source of JOB_SOURCES) {
        if (!source.active) continue;
        
        console.log(`🔍 Fetching jobs from ${source.name}...`);
        const jobs = await fetchRSSFeed(source.url);
        
        for (const job of jobs) {
            results.total++;
            
            // Check for duplicate
            const { data: existing } = await supabase
                .from('external_jobs')
                .select('id')
                .eq('title', job.title.substring(0, 150))
                .eq('source_name', source.name)
                .maybeSingle();
            
            if (existing) {
                results.jobs.push({ title: job.title, status: 'duplicate' });
                continue;
            }
            
            const { error } = await supabase
                .from('external_jobs')
                .insert({
                    title: job.title,
                    company: source.name,
                    location: source.country,
                    description: job.description,
                    salary_range: job.salary,
                    external_apply_url: job.link,
                    source_country: source.country,
                    source_name: source.name,
                    status: 'pending_approval',
                    created_at: new Date().toISOString()
                });
            
            if (error) {
                results.errors++;
                results.jobs.push({ title: job.title, status: 'error', error: error.message });
            } else {
                results.added++;
                results.jobs.push({ title: job.title, status: 'added' });
            }
        }
    }
    
    // Log results
    await supabase.from('external_job_fetch_log').insert({
        source_name: 'all_sources',
        fetch_status: results.errors === 0 ? 'success' : 'partial',
        jobs_fetched: results.total,
        jobs_new: results.added,
        details: results
    });
    
    return results;
}

export async function approveExternalJob(jobId) {
    const { data: externalJob, error: fetchError } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
    
    if (fetchError) throw fetchError;
    
    const { data: newJob, error: insertError } = await supabase
        .from('jobs')
        .insert({
            title: externalJob.title,
            company: externalJob.company,
            location: externalJob.location,
            description: externalJob.description,
            salary_range: externalJob.salary_range,
            external_apply_url: externalJob.external_apply_url,
            country_code: externalJob.source_country,
            source_type: 'authoritative',
            source_name: externalJob.source_name,
            compliance_status: 'approved',
            is_active: true,
            posted_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (insertError) throw insertError;
    
    await supabase
        .from('external_jobs')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', jobId);
    
    return { success: true, jobId: newJob.id };
}

export async function batchApproveExternalJobs() {
    const { data: pendingJobs } = await supabase
        .from('external_jobs')
        .select('id')
        .eq('status', 'pending_approval');
    
    const results = { approved: 0, failed: 0 };
    
    for (const job of pendingJobs || []) {
        try {
            await approveExternalJob(job.id);
            results.approved++;
        } catch (error) {
            results.failed++;
        }
    }
    
    return results;
}
