// src/services/externalJobService.js
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PROXY_URL = '/api/fetch-jobs';
let fetchCache = { data: null, timestamp: null };
const CACHE_DURATION = 5 * 60 * 1000;
let isFetching = false;

export async function fetchExternalJobs(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && fetchCache.data && (Date.now() - fetchCache.timestamp) < CACHE_DURATION) {
    console.log(`📦 Returning cached external jobs (${fetchCache.data.length} jobs)`);
    return fetchCache.data;
  }
  
  // Prevent concurrent fetches
  if (isFetching) {
    console.log('⏳ Fetch already in progress, waiting...');
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!isFetching) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
    return fetchCache.data || [];
  }
  
  isFetching = true;
  console.log('🚀 Fetching external jobs via proxy...');
  
  try {
    const response = await axios.get(PROXY_URL, { timeout: 30000 });
    
    if (response.data?.success && response.data.jobs) {
      fetchCache = { data: response.data.jobs, timestamp: Date.now() };
      console.log(`✅ Fetched ${response.data.count} jobs from ${response.data.sources} sources`);
      return response.data.jobs;
    }
    throw new Error('Invalid response from proxy');
  } catch (err) {
    console.error('❌ External job fetch failed:', err.message);
    return [];
  } finally {
    isFetching = false;
  }
}

export async function saveExternalJobsToDatabase(jobs, userId) {
  if (!jobs || jobs.length === 0) return 0;
  
  // Get existing jobs to check duplicates
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
      job_type: job.job_type || 'full-time',
      status: 'pending_approval',
      created_at: new Date().toISOString(),
      metadata: {
        is_government: job.is_government || false,
        language: job.language,
        source_url: job.source_url
      }
    });
    
    if (!error) newCount++;
  }
  
  console.log(`✅ Saved ${newCount} new external jobs to database`);
  return newCount;
}

export async function approveExternalJob(jobId, userId) {
  try {
    // Get the external job
    const { data: job, error: fetchError } = await supabase
      .from('external_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Insert into main jobs table
    const { error: insertError } = await supabase.from('jobs').insert({
      title: job.title,
      company: job.company,
      location: job.location,
      country_code: job.source_country,
      description: job.description,
      salary_range: job.salary_range,
      job_type: job.job_type,
      status: 'approved',
      is_active: true,
      source_type: 'external',
      source_name: job.source_name
    });
    
    if (insertError) throw insertError;
    
    // Update external job status
    const { error: updateError } = await supabase
      .from('external_jobs')
      .update({ 
        status: 'approved', 
        reviewed_by: userId, 
        reviewed_at: new Date().toISOString() 
      })
      .eq('id', jobId);
    
    if (updateError) throw updateError;
    
    return { success: true };
  } catch (err) {
    console.error('Approve error:', err);
    return { success: false, error: err.message };
  }
}

export async function rejectExternalJob(jobId, userId) {
  try {
    const { error } = await supabase
      .from('external_jobs')
      .update({ 
        status: 'rejected', 
        reviewed_by: userId, 
        reviewed_at: new Date().toISOString() 
      })
      .eq('id', jobId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (err) {
    console.error('Reject error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteExternalJob(jobId) {
  try {
    const { error } = await supabase.from('external_jobs').delete().eq('id', jobId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Delete error:', err);
    return { success: false, error: err.message };
  }
}

export function clearExternalJobsCache() {
  fetchCache = { data: null, timestamp: null };
  console.log('🗑️ External jobs cache cleared');
}
