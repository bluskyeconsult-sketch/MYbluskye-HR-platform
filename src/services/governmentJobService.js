// src/services/governmentJobService.js
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CACHE_DURATION = 5 * 60 * 1000;
const PROXY_URL = '/api/fetch-government-jobs';
let jobsCache = { data: null, timestamp: null };
let isFetching = false;

export async function fetchGovernmentJobs(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && jobsCache.data && (Date.now() - jobsCache.timestamp) < CACHE_DURATION) {
    console.log('📦 Returning cached jobs:', jobsCache.data.length);
    return jobsCache.data;
  }
  
  if (isFetching) {
    console.log('⏳ Fetch in progress, waiting...');
    await new Promise(resolve => {
      const interval = setInterval(() => {
        if (!isFetching) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
    return jobsCache.data || [];
  }
  
  isFetching = true;
  console.log('🚀 Fetching real government jobs via proxy...');
  
  try {
    const response = await axios.get(PROXY_URL, { timeout: 30000 });
    
    if (response.data?.success && response.data.jobs?.length > 0) {
      jobsCache = { data: response.data.jobs, timestamp: Date.now() };
      console.log(`✅ Fetched ${response.data.count} real jobs from ${response.data.sources} sources`);
      console.log(`📋 Sources: ${response.data.sourceList?.join(', ')}`);
      return response.data.jobs;
    } else {
      console.log('⚠️ No jobs returned from proxy');
      return [];
    }
  } catch (err) {
    console.error('❌ Proxy fetch failed:', err.message);
    return [];
  } finally {
    isFetching = false;
  }
}

export async function refreshGovernmentJobs() {
  return fetchGovernmentJobs(true);
}

export function clearGovernmentJobsCache() {
  jobsCache = { data: null, timestamp: null };
}

export function getCacheStatus() {
  const isCached = jobsCache.data !== null;
  const cacheAge = isCached ? Date.now() - jobsCache.timestamp : null;
  return {
    isCached,
    cacheAge: cacheAge ? Math.round(cacheAge / 1000) + ' seconds' : 'No cache',
    jobCount: jobsCache.data?.length || 0
  };
}

export async function saveGovernmentJobsToSupabase(jobs, userId) {
  if (!jobs || jobs.length === 0) return 0;
  
  const { data: existingJobs } = await supabase
    .from('external_jobs')
    .select('title, company, source_name, source_country');
  
  const existingKeys = new Set(
    existingJobs?.map(job => `${job.title}|${job.company}|${job.source_country}`) || []
  );
  
  let newCount = 0;
  
  for (const job of jobs) {
    const jobKey = `${job.title}|${job.company}|${job.country}`;
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
      metadata: {
        is_government: true,
        source_url: job.source_url,
        language: job.language,
        fetched_at: job.fetched_at
      }
    });
    
    if (!error) newCount++;
  }
  
  console.log(`✅ Saved ${newCount} new real government jobs`);
  return newCount;
}
