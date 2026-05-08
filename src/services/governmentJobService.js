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
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout
let jobsCache = { data: null, timestamp: null };
let isFetching = false; // Prevent concurrent fetches

// ============================================
// FREE GOVERNMENT JOB SOURCES - NO API KEYS REQUIRED
// ============================================

// 1. UNITED KINGDOM - FindAJob (DWP)
const UK_GOV_JOBS = {
  name: 'UK Government - FindAJob',
  country: 'GB',
  flag: '🇬🇧',
  async fetch() {
    try {
      const response = await axios.get('https://findajob.dwp.gov.uk/feeds/jobs.rss', {
        timeout: REQUEST_TIMEOUT,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)' }
      });
      
      if (response.data) {
        const xml = response.data;
        const jobMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        
        return jobMatches.slice(0, 20).map(item => {
          const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || '';
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
          const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || '';
          const locationMatch = description.match(/Location:?\s*([^<,\n]+)/i);
          const location = locationMatch ? locationMatch[1].trim() : 'United Kingdom';
          const salaryMatch = description.match(/Salary:?\s*([^<,\n]+)/i);
          const salary = salaryMatch ? salaryMatch[1].trim() : 'Competitive';
          const companyMatch = description.match(/Employer:?\s*([^<,\n]+)/i);
          const company = companyMatch ? companyMatch[1].trim() : 'UK Government';
          
          return {
            title: title,
            company: company,
            location: location,
            country: 'GB',
            description: description.substring(0, 1000),
            salary_range: salary,
            job_type: 'full-time',
            source_name: 'FindAJob (DWP)',
            source_url: link,
            is_government: true,
            department: 'Department for Work and Pensions',
            fetched_at: new Date().toISOString()
          };
        });
      }
    } catch (err) {
      console.log(`⚠️ UK Gov fetch failed: ${err.message}`);
    }
    return [];
  }
};

// 2. UNITED STATES - USAJobs RSS Feed
const USA_GOV_JOBS = {
  name: 'USAJobs.gov',
  country: 'US',
  flag: '🇺🇸',
  async fetch() {
    try {
      const response = await axios.get('https://www.usajobs.gov/jobs/feed/rss', {
        timeout: REQUEST_TIMEOUT,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (response.data) {
        const xml = response.data;
        const jobMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        
        return jobMatches.slice(0, 20).map(item => {
          const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || '';
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
          const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || '';
          const locationMatch = description.match(/Location:?\s*([^<,\n]+)/i);
          const location = locationMatch ? locationMatch[1].trim() : 'United States';
          const agencyMatch = description.match(/Agency:?\s*([^<,\n]+)/i);
          const agency = agencyMatch ? agencyMatch[1].trim() : 'U.S. Federal Government';
          const gradeMatch = description.match(/Grade:?\s*([^<,\n]+)/i);
          const grade = gradeMatch ? gradeMatch[1].trim() : '';
          
          return {
            title: title,
            company: agency,
            location: location,
            country: 'US',
            description: description.substring(0, 1000),
            salary_range: 'Federal Pay Scale',
            job_type: 'full-time',
            source_name: 'USAJobs.gov',
            source_url: link,
            is_government: true,
            grade_level: grade,
            agency: agency,
            fetched_at: new Date().toISOString()
          };
        });
      }
    } catch (err) {
      console.log(`⚠️ USAJobs fetch failed: ${err.message}`);
    }
    return [];
  }
};

// 3. CANADA - GC Jobs Public API
const CANADA_GOV_JOBS = {
  name: 'Government of Canada Jobs',
  country: 'CA',
  flag: '🇨🇦',
  async fetch() {
    try {
      const response = await axios.get('https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/v1/announcements', {
        params: { language: 'en', page: 1, count: 20 },
        timeout: REQUEST_TIMEOUT
      });
      
      if (response.data && response.data.data) {
        return response.data.data.map(job => ({
          title: job.jobTitle?.en || job.jobTitle || 'Government Position',
          company: job.departmentName?.en || job.departmentName || 'Government of Canada',
          location: `${job.city?.en || job.city || 'Ottawa'}, ${job.province || 'ON'}, Canada`,
          country: 'CA',
          description: job.jobSummary?.en || job.jobSummary || 'Government employment opportunity',
          salary_range: job.salaryRange || 'Competitive',
          job_type: 'full-time',
          source_name: 'GC Jobs Canada',
          source_url: `https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/applicant/page${job.referenceId}`,
          is_government: true,
          department: job.departmentName?.en,
          fetched_at: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.log(`⚠️ Canada GC Jobs fetch failed: ${err.message}`);
    }
    return [];
  }
};

// 4. AUSTRALIA - APS Jobs API
const AUSTRALIA_GOV_JOBS = {
  name: 'Australian Public Service',
  country: 'AU',
  flag: '🇦🇺',
  async fetch() {
    try {
      const response = await axios.get('https://www.apsjobs.gov.au/api/v1/jobs', {
        params: { limit: 20, offset: 0 },
        timeout: REQUEST_TIMEOUT,
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.data && response.data.data) {
        return response.data.data.map(job => ({
          title: job.title || 'APS Position',
          company: job.agencyName || 'Australian Public Service',
          location: `${job.location}, ${job.state || 'ACT'}, Australia`,
          country: 'AU',
          description: job.jobDescription || job.description || 'Government position',
          salary_range: job.salaryRange || job.salary || 'Competitive',
          job_type: job.employmentType || 'full-time',
          source_name: 'APS Jobs',
          source_url: `https://www.apsjobs.gov.au/job/${job.jobId}`,
          is_government: true,
          department: job.agencyName,
          fetched_at: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.log(`⚠️ Australia APS Jobs fetch failed: ${err.message}`);
    }
    return [];
  }
};

// 5. GERMANY - Bundesagentur für Arbeit
const GERMANY_GOV_JOBS = {
  name: 'Bundesagentur für Arbeit',
  country: 'DE',
  flag: '🇩🇪',
  async fetch() {
    try {
      const response = await axios.post('https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs', 
        { limit: 20, page: 1 },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: REQUEST_TIMEOUT
        }
      );
      
      if (response.data && response.data.jobs) {
        return response.data.jobs.map(job => ({
          title: job.title || job.stellenbezeichnung || 'Stellenangebot',
          company: job.company || job.arbeitgeber || 'Bundesagentur',
          location: `${job.city || job.ort}, Germany`,
          country: 'DE',
          description: job.description || job.beschreibung || 'Government job opportunity',
          salary_range: job.salary ? `${job.salary.from} - ${job.salary.to} €` : 'Competitive',
          job_type: job.employmentType || 'full-time',
          source_name: 'Bundesagentur für Arbeit',
          source_url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.jobId}`,
          is_government: true,
          language: 'DE/EN',
          fetched_at: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.log(`⚠️ Germany Jobs fetch failed: ${err.message}`);
    }
    return [];
  }
};

// 6. FRANCE - France Travail
const FRANCE_GOV_JOBS = {
  name: 'France Travail',
  country: 'FR',
  flag: '🇫🇷',
  async fetch() {
    try {
      const response = await axios.get('https://candidat.francetravail.fr/offres/search', {
        params: { limit: 20, sort: 'date' },
        timeout: REQUEST_TIMEOUT,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (response.data && response.data.offres) {
        return response.data.offres.map(job => ({
          title: job.intitule || 'Offre d\'emploi',
          company: job.entreprise?.nom || 'État français',
          location: `${job.lieuTravail?.libelle || 'Paris'}, France`,
          country: 'FR',
          description: job.description || job.descriptionCourte || 'Government job opportunity',
          salary_range: job.salaire?.libelle || 'Compétitif',
          job_type: job.typeContrat || 'CDI',
          source_name: 'France Travail',
          source_url: `https://candidat.francetravail.fr/offres/${job.id}`,
          is_government: true,
          language: 'FR',
          fetched_at: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.log(`⚠️ France Travail fetch failed: ${err.message}`);
    }
    return [];
  }
};

// 7. NIGERIA - NiYA Jobs Portal
const NIGERIA_GOV_JOBS = {
  name: 'NiYA Jobs Portal',
  country: 'NG',
  flag: '🇳🇬',
  async fetch() {
    try {
      const response = await axios.get('https://jobs.niya.gov.ng/api/jobs', {
        timeout: REQUEST_TIMEOUT,
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.data && response.data.jobs) {
        return response.data.jobs.slice(0, 20).map(job => ({
          title: job.title || 'Government Position',
          company: job.employer || 'Federal Government of Nigeria',
          location: `${job.location || 'Abuja'}, Nigeria`,
          country: 'NG',
          description: job.description || 'Government employment opportunity',
          salary_range: job.salary || 'Competitive',
          job_type: job.job_type || 'full-time',
          source_name: 'NiYA Jobs',
          source_url: `https://jobs.niya.gov.ng/jobs/${job.id}`,
          is_government: true,
          department: job.ministry,
          fetched_at: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.log(`⚠️ Nigeria NiYA fetch failed: ${err.message}`);
    }
    return [];
  }
};

// ============================================
// FALLBACK JOBS (When APIs unavailable)
// ============================================

function getFallbackJobs() {
  return [
    // United Kingdom (GB)
    { title: 'Civil Service Fast Stream Graduate', company: 'UK Civil Service', location: 'London, UK', country: 'GB', description: 'Accelerated leadership development program for graduates.', salary_range: '£28,000 - £35,000', job_type: 'full-time', source_name: 'Civil Service Jobs', is_government: true, department: 'Cabinet Office' },
    { title: 'Policy Advisor - Trade', company: 'Department for Business and Trade', location: 'London, UK', country: 'GB', description: 'Develop international trade policy.', salary_range: '£42,000 - £55,000', job_type: 'full-time', source_name: 'Civil Service Jobs', is_government: true, department: 'DBT' },
    // United States (US)
    { title: 'IT Specialist (GS-2210-12)', company: 'Department of Homeland Security', location: 'Arlington, VA', country: 'US', description: 'Manage federal IT systems.', salary_range: '$86,000 - $112,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, grade_level: 'GS-12', agency: 'DHS' },
    { title: 'Foreign Service Officer', company: 'Department of State', location: 'Washington, DC', country: 'US', description: 'Diplomatic service position.', salary_range: '$56,000 - $85,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, agency: 'State Department' },
    // Canada (CA)
    { title: 'EC-04 Policy Analyst', company: 'Privy Council Office', location: 'Ottawa, ON', country: 'CA', description: 'Analyze policy options for federal government.', salary_range: 'CAD 70,000 - CAD 85,000', job_type: 'full-time', source_name: 'GC Jobs', is_government: true, department: 'PCO' },
    // Australia (AU)
    { title: 'APS 4 Program Officer', company: 'Department of Home Affairs', location: 'Canberra, ACT', country: 'AU', description: 'Coordinate program delivery.', salary_range: 'AUD 75,000 - AUD 85,000', job_type: 'full-time', source_name: 'APS Jobs', is_government: true, department: 'Home Affairs' },
    // Germany (DE)
    { title: 'IT-Referent/in (m/w/d)', company: 'Bundesministerium des Innern', location: 'Berlin, Germany', country: 'DE', description: 'Leitung von IT-Projekten.', salary_range: '€65,000 - €85,000', job_type: 'full-time', source_name: 'Bund.de', is_government: true, language: 'DE', department: 'BMI' },
    // France (FR)
    { title: 'Attaché d\'administration', company: 'Ministère de l\'Économie', location: 'Paris, France', country: 'FR', description: 'Gestion administrative.', salary_range: '€45,000 - €60,000', job_type: 'full-time', source_name: 'France Travail', is_government: true, language: 'FR', department: 'Bercy' },
    // Nigeria (NG)
    { title: 'Federal Civil Service Graduate Trainee', company: 'Federal Civil Service Commission', location: 'Abuja, Nigeria', country: 'NG', description: 'Entry-level position for graduates.', salary_range: '₦150,000 - ₦250,000', job_type: 'full-time', source_name: 'Federal Civil Service', is_government: true, department: 'FCSC' }
  ];
}

// ============================================
// PERFORMANCE-OPTIMIZED MASTER FETCH FUNCTION
// ============================================

/**
 * Fetches government jobs from all 7 countries with performance optimizations:
 * - 5-minute cache to prevent repeated slow loads
 * - Parallel fetching with Promise.allSettled (non-blocking)
 * - 10-second timeouts to prevent hanging
 * - Prevents concurrent fetches
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
    // Wait for existing fetch to complete
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
  console.log('🚀 Fetching fresh government jobs from all 7 countries...');
  
  const sources = [
    UK_GOV_JOBS, USA_GOV_JOBS, CANADA_GOV_JOBS, 
    AUSTRALIA_GOV_JOBS, GERMANY_GOV_JOBS, FRANCE_GOV_JOBS, NIGERIA_GOV_JOBS
  ];
  
  // Fetch in parallel with timeouts
  const fetchWithTimeout = (source) => {
    return Promise.race([
      source.fetch(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${source.name} timeout`)), REQUEST_TIMEOUT))
    ]).catch(err => {
      console.log(`⚠️ ${source.name} failed: ${err.message}`);
      return []; // Return empty array on failure
    });
  };
  
  const results = await Promise.allSettled(sources.map(s => fetchWithTimeout(s)));
  
  let allJobs = [];
  let successCount = 0;
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const source = sources[i];
    
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allJobs.push(...result.value);
      successCount++;
      console.log(`✅ ${source.name}: ${result.value.length} jobs`);
    } else {
      // Use fallback for failed sources
      const fallback = getFallbackJobs().filter(j => j.country === source.country);
      allJobs.push(...fallback);
      console.log(`📋 ${source.name}: Using ${fallback.length} fallback jobs`);
    }
  }
  
  // Cache the results
  jobsCache = { data: allJobs, timestamp: Date.now() };
  isFetching = false;
  
  console.log(`🎯 Total government jobs: ${allJobs.length} from ${successCount}/${sources.length} sources`);
  return allJobs;
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

// Export individual fetchers for testing
export { 
  UK_GOV_JOBS, 
  USA_GOV_JOBS, 
  CANADA_GOV_JOBS, 
  AUSTRALIA_GOV_JOBS, 
  GERMANY_GOV_JOBS, 
  FRANCE_GOV_JOBS, 
  NIGERIA_GOV_JOBS 
};
