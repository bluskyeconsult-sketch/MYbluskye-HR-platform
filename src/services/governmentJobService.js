// src/services/governmentJobService.js
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// PERFORMANCE CONFIGURATION
// ============================================
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const PROXY_URL = '/api/fetch-government-jobs';
let jobsCache = { data: null, timestamp: null };
let isFetching = false;

// ============================================
// FALLBACK JOBS (When APIs unavailable)
// ============================================

function getFallbackJobs() {
  return [
    // United Kingdom (GB)
    { title: 'Civil Service Fast Stream Graduate', company: 'UK Civil Service', location: 'London, UK', country: 'GB', description: 'Accelerated leadership development program for graduates.', salary_range: '£28,000 - £35,000', job_type: 'full-time', source_name: 'Civil Service Jobs', is_government: true, department: 'Cabinet Office' },
    { title: 'Policy Advisor - Trade', company: 'Department for Business and Trade', location: 'London, UK', country: 'GB', description: 'Develop international trade policy.', salary_range: '£42,000 - £55,000', job_type: 'full-time', source_name: 'Civil Service Jobs', is_government: true, department: 'DBT' },
    { title: 'NHS Nurse (Band 5)', company: 'NHS England', location: 'Manchester, UK', country: 'GB', description: 'Staff nurse position in acute care.', salary_range: '£28,407 - £34,581', job_type: 'full-time', source_name: 'NHS Jobs', is_government: true, department: 'NHS' },
    // United States (US)
    { title: 'IT Specialist (GS-2210-12)', company: 'Department of Homeland Security', location: 'Arlington, VA', country: 'US', description: 'Manage federal IT systems.', salary_range: '$86,000 - $112,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, grade_level: 'GS-12', agency: 'DHS' },
    { title: 'Foreign Service Officer', company: 'Department of State', location: 'Washington, DC', country: 'US', description: 'Diplomatic service position.', salary_range: '$56,000 - $85,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, agency: 'State Department' },
    { title: 'FBI Special Agent', company: 'Federal Bureau of Investigation', location: 'Quantico, VA', country: 'US', description: 'Investigate federal crimes.', salary_range: '$65,000 - $95,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, agency: 'FBI' },
    // Canada (CA)
    { title: 'EC-04 Policy Analyst', company: 'Privy Council Office', location: 'Ottawa, ON', country: 'CA', description: 'Analyze policy options for federal government.', salary_range: 'CAD 70,000 - CAD 85,000', job_type: 'full-time', source_name: 'GC Jobs', is_government: true, department: 'PCO' },
    { title: 'IT-01 Technical Support', company: 'Shared Services Canada', location: 'Toronto, ON', country: 'CA', description: 'IT support for government systems.', salary_range: 'CAD 60,000 - CAD 75,000', job_type: 'full-time', source_name: 'GC Jobs', is_government: true, department: 'SSC' },
    // Australia (AU)
    { title: 'APS 4 Program Officer', company: 'Department of Home Affairs', location: 'Canberra, ACT', country: 'AU', description: 'Coordinate program delivery.', salary_range: 'AUD 75,000 - AUD 85,000', job_type: 'full-time', source_name: 'APS Jobs', is_government: true, department: 'Home Affairs' },
    { title: 'APS 6 Policy Officer', company: 'Department of Prime Minister and Cabinet', location: 'Canberra, ACT', country: 'AU', description: 'Develop and implement government policy.', salary_range: 'AUD 95,000 - AUD 110,000', job_type: 'full-time', source_name: 'APS Jobs', is_government: true, department: 'PM&C' },
    // Germany (DE)
    { title: 'IT-Referent/in (m/w/d)', company: 'Bundesministerium des Innern', location: 'Berlin, Germany', country: 'DE', description: 'Leitung von IT-Projekten.', salary_range: '€65,000 - €85,000', job_type: 'full-time', source_name: 'Bund.de', is_government: true, language: 'DE', department: 'BMI' },
    { title: 'Wirtschaftswissenschaftler/in', company: 'Bundesministerium für Wirtschaft', location: 'Berlin, Germany', country: 'DE', description: 'Analyse wirtschaftspolitischer Maßnahmen.', salary_range: '€60,000 - €80,000', job_type: 'full-time', source_name: 'Bund.de', is_government: true, language: 'DE', department: 'BMWK' },
    // France (FR)
    { title: 'Attaché d\'administration d\'État', company: 'Ministère de l\'Économie', location: 'Paris, France', country: 'FR', description: 'Gestion administrative pour l\'État français.', salary_range: '€45,000 - €60,000', job_type: 'full-time', source_name: 'France Travail', is_government: true, language: 'FR', department: 'Bercy' },
    { title: 'Ingénieur des Ponts (IPEF)', company: 'Ministère de la Transition Écologique', location: 'Paris, France', country: 'FR', description: 'Ingénieur pour les projets d\'infrastructure publique.', salary_range: '€55,000 - €75,000', job_type: 'full-time', source_name: 'France Travail', is_government: true, language: 'FR', department: 'MTECT' },
    // Nigeria (NG)
    { title: 'Federal Civil Service Graduate Trainee', company: 'Federal Civil Service Commission', location: 'Abuja, Nigeria', country: 'NG', description: 'Entry-level position for graduates.', salary_range: '₦150,000 - ₦250,000', job_type: 'full-time', source_name: 'Federal Civil Service', is_government: true, department: 'FCSC' },
    { title: 'N-Power Programme Officer', company: 'National Social Investment Office', location: 'State Capitals, Nigeria', country: 'NG', description: 'Coordinate N-Power youth empowerment programs.', salary_range: '₦30,000 monthly stipend', job_type: 'contract', source_name: 'N-Power', is_government: true, department: 'NSIO' }
  ];
}

// ============================================
// PERFORMANCE-OPTIMIZED MASTER FETCH FUNCTION (USES PROXY)
// ============================================

/**
 * Fetches government jobs from all 7 countries via serverless proxy
 * - 5-minute client-side cache
 * - Concurrent fetch prevention
 * - 30-second timeout for proxy response
 * 
 * @param {boolean} forceRefresh - Force refresh cache (default: false)
 * @returns {Promise<Array>} - Array of job objects
 */
export async function fetchGovernmentJobs(forceRefresh = false) {
  // Check cache first
  if (!forceRefresh && jobsCache.data && (Date.now() - jobsCache.timestamp) < CACHE_DURATION) {
    console.log('📦 Returning cached government jobs (', jobsCache.data.length, 'jobs)');
    return jobsCache.data;
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
    return jobsCache.data || [];
  }
  
  isFetching = true;
  console.log('🚀 Fetching government jobs via serverless proxy...');
  
  try {
    // Call the Vercel serverless function
    const response = await axios.get(PROXY_URL, { timeout: 30000 });
    
    if (response.data && response.data.success) {
      jobsCache = { data: response.data.jobs, timestamp: Date.now() };
      console.log(`✅ Fetched ${response.data.count} jobs from ${response.data.sources} sources`);
      return response.data.jobs;
    } else {
      throw new Error('Invalid response from proxy');
    }
  } catch (err) {
    console.error('❌ Proxy fetch failed:', err.message);
    // Return fallback jobs
    const fallback = getFallbackJobs();
    jobsCache = { data: fallback, timestamp: Date.now() };
    console.log(`📋 Using ${fallback.length} fallback jobs`);
    return fallback;
  } finally {
    isFetching = false;
  }
}

/**
 * Force refresh cache (ignores existing cache)
 */
export async function refreshGovernmentJobs() {
  return fetchGovernmentJobs(true);
}

/**
 * Clear the cache (forces next fetch to get fresh data)
 */
export function clearGovernmentJobsCache() {
  jobsCache = { data: null, timestamp: null };
  console.log('🗑️ Government jobs cache cleared');
}

/**
 * Get cache status
 */
export function getCacheStatus() {
  const isCached = jobsCache.data !== null;
  const cacheAge = isCached ? Date.now() - jobsCache.timestamp : null;
  return {
    isCached,
    cacheAge: cacheAge ? Math.round(cacheAge / 1000) + ' seconds' : 'No cache',
    jobCount: jobsCache.data?.length || 0
  };
}

/**
 * Save government jobs to Supabase with deduplication
 */
export async function saveGovernmentJobsToSupabase(jobs, userId) {
  if (!jobs || jobs.length === 0) return 0;
  
  // Get existing jobs to check duplicates
  const { data: existingJobs } = await supabase
    .from('external_jobs')
    .select('title, company, source_name, source_country');
  
  const existingKeys = new Set(
    existingJobs?.map(job => `${job.title}|${job.company}|${job.source_country}`) || []
  );
  
  let newCount = 0;
  let govCount = 0;
  
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
        is_government: true,
        department: job.department,
        agency: job.agency,
        grade_level: job.grade_level,
        language: job.language,
        application_url: job.source_url
      }
    });
    
    if (!error) {
      newCount++;
      if (job.is_government) govCount++;
    }
  }
  
  console.log(`✅ Saved ${newCount} new jobs (${govCount} government)`);
  return newCount;
}

// Export for testing
export { getFallbackJobs };
