import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Job sources configuration
const JOB_SOURCES = [
  {
    name: 'usajobs',
    country: 'US',
    url: 'https://data.usajobs.gov/api/search',
    requiresApiKey: true,
    apiKeyEnv: 'USAJOBS_API_KEY',
    transformer: (item) => ({
      title: item.MatchedObjectDescriptor?.PositionTitle,
      company: item.MatchedObjectDescriptor?.OrganizationName,
      location: item.MatchedObjectDescriptor?.PositionLocationDisplay,
      description: item.MatchedObjectDescriptor?.UserArea?.Details?.JobSummary,
      url: item.MatchedObjectDescriptor?.PositionURI,
      salary: item.MatchedObjectDescriptor?.PositionRemuneration?.[0]?.Description,
      job_type: item.MatchedObjectDescriptor?.PositionSchedule?.[0]?.Name
    })
  },
  {
    name: 'gc_jobs',
    country: 'CA',
    url: 'https://api.jobs-emplois.gc.ca/v1/positions',
    requiresApiKey: true,
    apiKeyEnv: 'GC_JOBS_API_KEY',
    transformer: (item) => ({
      title: item.title,
      company: item.organization,
      location: `${item.city}, ${item.province}`,
      description: item.summary,
      url: item.link,
      salary: item.salary,
      job_type: item.employmentType
    })
  },
  {
    name: 'civilservice_uk',
    country: 'GB',
    url: 'https://www.civilservicejobs.service.gov.uk/feeds/jobs.rss',
    requiresApiKey: false,
    transformer: (item) => ({
      title: item.title,
      company: 'UK Civil Service',
      location: item.location,
      description: item.description,
      url: item.link,
      job_type: 'full_time'
    })
  }
];

export async function fetchExternalJobs() {
  const results = [];
  
  for (const source of JOB_SOURCES) {
    try {
      const headers = {};
      if (source.requiresApiKey) {
        const apiKey = process.env[source.apiKeyEnv];
        if (!apiKey) {
          results.push({ source: source.name, success: false, error: `Missing API key: ${source.apiKeyEnv}` });
          continue;
        }
        headers['Authorization-Key'] = apiKey;
      }
      
      const response = await axios.get(source.url, { headers, timeout: 30000 });
      let jobs = [];
      
      if (source.name === 'usajobs') {
        jobs = response.data.SearchResult?.SearchResultItems?.map(source.transformer) || [];
      } else if (source.name === 'gc_jobs') {
        jobs = response.data.map(source.transformer);
      } else if (source.name === 'civilservice_uk') {
        // Parse RSS feed
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, 'text/xml');
        const items = xmlDoc.querySelectorAll('item');
        jobs = Array.from(items).map(item => ({
          title: item.querySelector('title')?.textContent,
          description: item.querySelector('description')?.textContent,
          link: item.querySelector('link')?.textContent,
          location: item.querySelector('location')?.textContent || 'UK'
        }));
      }
      
      // Store in external_jobs table
      for (const job of jobs) {
        if (job.title) {
          await supabase.from('external_jobs').upsert({
            source_name: source.name,
            source_country: source.country,
            title: job.title.substring(0, 255),
            company: job.company?.substring(0, 255),
            location: job.location,
            description: job.description?.substring(0, 2000),
            external_apply_url: job.url,
            salary_range: job.salary,
            job_type: job.job_type,
            status: 'pending_approval'
          });
        }
      }
      
      results.push({ source: source.name, success: true, count: jobs.length });
    } catch (error) {
      results.push({ source: source.name, success: false, error: error.message });
    }
  }
  
  return results;
}

export async function getPendingExternalJobs() {
  const { data, error } = await supabase
    .from('external_jobs')
    .select('*')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function approveExternalJob(jobId) {
  // Get the external job
  const { data: externalJob, error: fetchError } = await supabase
    .from('external_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Copy to jobs table
  const { data: newJob, error: insertError } = await supabase
    .from('jobs')
    .insert({
      title: externalJob.title,
      company: externalJob.company,
      location: externalJob.location,
      description: externalJob.description,
      source_type: 'authoritative',
      source_name: externalJob.source_name,
      external_apply_url: externalJob.external_apply_url,
      compliance_status: 'approved',
      is_active: true,
      salary_range: externalJob.salary_range,
      job_type: externalJob.job_type
    })
    .select()
    .single();
  
  if (insertError) throw insertError;
  
  // Update external job status
  await supabase
    .from('external_jobs')
    .update({ status: 'approved' })
    .eq('id', jobId);
  
  return newJob;
}

export async function rejectExternalJob(jobId, reason = null) {
  const { error } = await supabase
    .from('external_jobs')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', jobId);
  
  if (error) throw error;
  return { success: true };
}
