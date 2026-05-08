// api/fetch-government-jobs.js
// Pure API fetching - NO FALLBACKS, only real government jobs

import axios from 'axios';

let cache = { data: null, timestamp: null };
const CACHE_DURATION = 5 * 60 * 1000;

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  // Return cached data if fresh
  if (cache.data && (Date.now() - cache.timestamp) < CACHE_DURATION) {
    console.log('📦 Returning cached government jobs');
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').json(cache.data);
  }
  
  const timeout = 15000; // 15 second timeout
  
  // Define sources - ONLY REAL APIs, NO FALLBACKS
  const sources = [
    // ========== USA - USAJobs (Most reliable) ==========
    {
      name: 'USAJobs.gov',
      country: 'US',
      flag: '🇺🇸',
      fetch: async () => {
        try {
          const response = await axios.get('https://www.usajobs.gov/jobs/feed/rss?Number=20', { timeout });
          const xml = response.data;
          const jobMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
          
          if (jobMatches.length === 0) return [];
          
          return jobMatches.map(item => ({
            title: item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '') || '',
            company: 'U.S. Federal Government',
            location: 'United States',
            country: 'US',
            description: (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '') || '').substring(0, 800),
            salary_range: 'Federal Pay Scale (GS level)',
            source_url: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
            source_name: 'USAJobs.gov',
            is_government: true,
            fetched_at: new Date().toISOString()
          }));
        } catch (err) {
          console.log(`❌ USAJobs failed: ${err.message}`);
          return [];
        }
      }
    },
    
    // ========== Canada - GC Jobs (Very reliable) ==========
    {
      name: 'GC Jobs Canada',
      country: 'CA',
      flag: '🇨🇦',
      fetch: async () => {
        try {
          const response = await axios.get('https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/v1/announcements', {
            params: { language: 'en', page: 1, count: 20 },
            timeout
          });
          
          if (!response.data?.data || response.data.data.length === 0) return [];
          
          return response.data.data.map(job => ({
            title: job.jobTitle?.en || 'Government of Canada Position',
            company: job.departmentName?.en || 'Government of Canada',
            location: `${job.city?.en || 'Ottawa'}, ${job.province || 'ON'}, Canada`,
            country: 'CA',
            description: (job.jobSummary?.en || '').substring(0, 800),
            salary_range: job.salaryRange || 'Competitive',
            source_url: `https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/applicant/page${job.referenceId}`,
            source_name: 'GC Jobs Canada',
            is_government: true,
            fetched_at: new Date().toISOString()
          }));
        } catch (err) {
          console.log(`❌ Canada GC Jobs failed: ${err.message}`);
          return [];
        }
      }
    },
    
    // ========== Australia - APS Jobs (Reliable) ==========
    {
      name: 'APS Jobs Australia',
      country: 'AU',
      flag: '🇦🇺',
      fetch: async () => {
        try {
          const response = await axios.get('https://www.apsjobs.gov.au/api/v1/jobs', {
            params: { limit: 20, offset: 0 },
            timeout
          });
          
          if (!response.data?.data || response.data.data.length === 0) return [];
          
          return response.data.data.map(job => ({
            title: job.title || 'Australian Public Service Position',
            company: job.agencyName || 'Australian Public Service',
            location: `${job.location || 'Canberra'}, Australia`,
            country: 'AU',
            description: (job.jobDescription || '').substring(0, 800),
            salary_range: job.salaryRange || job.salary || 'Competitive',
            source_url: `https://www.apsjobs.gov.au/job/${job.jobId}`,
            source_name: 'APS Jobs Australia',
            is_government: true,
            fetched_at: new Date().toISOString()
          }));
        } catch (err) {
          console.log(`❌ Australia APS Jobs failed: ${err.message}`);
          return [];
        }
      }
    },
    
    // ========== Germany - Bundesagentur für Arbeit (Reliable) ==========
    {
      name: 'Bundesagentur für Arbeit',
      country: 'DE',
      flag: '🇩🇪',
      fetch: async () => {
        try {
          const response = await axios.post(
            'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs',
            { limit: 20, page: 1 },
            { headers: { 'Content-Type': 'application/json' }, timeout }
          );
          
          if (!response.data?.jobs || response.data.jobs.length === 0) return [];
          
          return response.data.jobs.map(job => ({
            title: job.title || job.stellenbezeichnung || 'Stellenangebot',
            company: job.company || job.arbeitgeber || 'Bundesagentur für Arbeit',
            location: `${job.city || job.ort || 'Germany'}, Germany`,
            country: 'DE',
            description: (job.description || job.beschreibung || '').substring(0, 800),
            salary_range: job.salary ? `${job.salary.from} - ${job.salary.to} €` : 'Tarifvertrag',
            source_url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.jobId}`,
            source_name: 'Bundesagentur für Arbeit',
            is_government: true,
            language: 'DE',
            fetched_at: new Date().toISOString()
          }));
        } catch (err) {
          console.log(`❌ Germany Bundesagentur failed: ${err.message}`);
          return [];
        }
      }
    },
    
    // ========== France - France Travail (Reliable) ==========
    {
      name: 'France Travail',
      country: 'FR',
      flag: '🇫🇷',
      fetch: async () => {
        try {
          const response = await axios.get('https://candidat.francetravail.fr/offres/search', {
            params: { limit: 20, sort: 'date' },
            timeout
          });
          
          if (!response.data?.offres || response.data.offres.length === 0) return [];
          
          return response.data.offres.map(job => ({
            title: job.intitule || 'Offre d\'emploi',
            company: job.entreprise?.nom || 'État français',
            location: `${job.lieuTravail?.libelle || 'Paris'}, France`,
            country: 'FR',
            description: (job.description || '').substring(0, 800),
            salary_range: job.salaire?.libelle || 'Compétitif',
            source_url: `https://candidat.francetravail.fr/offres/${job.id}`,
            source_name: 'France Travail',
            is_government: true,
            language: 'FR',
            fetched_at: new Date().toISOString()
          }));
        } catch (err) {
          console.log(`❌ France Travail failed: ${err.message}`);
          return [];
        }
      }
    },
    
    // ========== UK - FindAJob (Sometimes works) ==========
    {
      name: 'UK Government Jobs',
      country: 'GB',
      flag: '🇬🇧',
      fetch: async () => {
        try {
          const response = await axios.get('https://findajob.dwp.gov.uk/feeds/jobs.rss', { timeout });
          const xml = response.data;
          const jobMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
          
          if (jobMatches.length === 0) return [];
          
          return jobMatches.slice(0, 20).map(item => ({
            title: item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '') || '',
            company: 'UK Government',
            location: 'United Kingdom',
            country: 'GB',
            description: (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '') || '').substring(0, 800),
            salary_range: 'Competitive',
            source_url: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
            source_name: 'UK Government Jobs',
            is_government: true,
            fetched_at: new Date().toISOString()
          }));
        } catch (err) {
          console.log(`❌ UK Government Jobs failed: ${err.message}`);
          return [];
        }
      }
    },
    
    // ========== Nigeria - NiYA Jobs (Unstable, but try) ==========
    {
      name: 'NiYA Jobs Nigeria',
      country: 'NG',
      flag: '🇳🇬',
      fetch: async () => {
        try {
          const response = await axios.get('https://jobs.niya.gov.ng/api/jobs', { timeout });
          
          if (!response.data?.jobs || response.data.jobs.length === 0) return [];
          
          return response.data.jobs.slice(0, 20).map(job => ({
            title: job.title || 'Government of Nigeria Position',
            company: job.employer || 'Federal Government of Nigeria',
            location: `${job.location || 'Abuja'}, Nigeria`,
            country: 'NG',
            description: (job.description || '').substring(0, 800),
            salary_range: job.salary || 'Competitive',
            source_url: `https://jobs.niya.gov.ng/jobs/${job.id}`,
            source_name: 'NiYA Jobs Nigeria',
            is_government: true,
            fetched_at: new Date().toISOString()
          }));
        } catch (err) {
          console.log(`❌ Nigeria NiYA Jobs failed: ${err.message}`);
          return [];
        }
      }
    }
  ];
  
  // Fetch all sources in parallel
  const results = await Promise.allSettled(sources.map(s => s.fetch()));
  
  let allJobs = [];
  let successCount = 0;
  let successSources = [];
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const source = sources[i];
    
    if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
      allJobs.push(...result.value);
      successCount++;
      successSources.push(source.name);
      console.log(`✅ ${source.name}: ${result.value.length} real jobs`);
    } else {
      console.log(`❌ ${source.name}: No jobs returned - skipping`);
    }
  }
  
  // Cache successful results ONLY
  cache = { data: allJobs, timestamp: Date.now() };
  
  console.log(`🎯 TOTAL: ${allJobs.length} real government jobs from ${successCount}/${sources.length} countries`);
  console.log(`✅ Successful sources: ${successSources.join(', ')}`);
  
  res.status(200).setHeader('Access-Control-Allow-Origin', '*').json({
    success: true,
    count: allJobs.length,
    sources: successCount,
    sourceList: successSources,
    jobs: allJobs
  });
}
