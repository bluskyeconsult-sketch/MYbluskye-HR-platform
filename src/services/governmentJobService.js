// src/services/governmentJobService.js
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PROXY_URL = '/api/fetch-government-jobs';
let jobsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000;

export async function fetchGovernmentJobs() {
  // Check cache
  if (jobsCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    console.log('📦 Returning cached jobs:', jobsCache.length);
    return jobsCache;
  }
  
  try {
    console.log('🚀 Fetching jobs from proxy...');
    const response = await axios.get(PROXY_URL, { timeout: 30000 });
    
    if (response.data?.jobs && response.data.jobs.length > 0) {
      jobsCache = response.data.jobs;
      cacheTimestamp = Date.now();
      console.log(`✅ Fetched ${response.data.jobs.length} jobs from ${response.data.sources} sources`);
      return response.data.jobs;
    } else {
      console.log('⚠️ No jobs returned');
      return [];
    }
  } catch (err) {
    console.error('❌ Fetch failed:', err.message);
    return [];
  }
}

export async function refreshGovernmentJobs() {
  jobsCache = null;
  cacheTimestamp = null;
  return fetchGovernmentJobs();
}

export function getCacheStatus() {
  return {
    isCached: jobsCache !== null,
    cacheAge: cacheTimestamp ? Math.round((Date.now() - cacheTimestamp) / 1000) + 's' : 'No cache',
    jobCount: jobsCache?.length || 0
  };
}

export async function saveGovernmentJobsToSupabase(jobs, userId) {
  if (!jobs || jobs.length === 0) return 0;
  
  const { data: existingJobs } = await supabase
    .from('external_jobs')
    .select('title, company, source_name');
  
  const existingKeys = new Set(
    existingJobs?.map(job => `${job.title}|${job.company}`) || []
  );
  
  let newCount = 0;
  
  for (const job of jobs) {
    const jobKey = `${job.title}|${job.company}`;
    if (existingKeys.has(jobKey)) continue;
    
    const { error } = await supabase.from('external_jobs').insert({
      title: job.title,
      company: job.company,
      location: job.location,
      source_name: job.source_name,
      source_country: job.country,
      description: job.description,
      salary_range: job.salary_range,
      job_type: 'full-time',
      status: 'pending_approval',
      created_at: new Date().toISOString(),
      metadata: { is_government: job.is_government || false }
    });
    
    if (!error) newCount++;
  }
  
  console.log(`✅ Saved ${newCount} new jobs`);
  return newCount;
}
