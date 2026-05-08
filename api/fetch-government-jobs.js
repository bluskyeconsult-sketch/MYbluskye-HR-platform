// api/fetch-government-jobs.js
// Vercel Serverless Function - Place in /api folder at project root

import axios from 'axios';

// CORS headers for response
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Cache for server-side (5 minutes)
let cache = { data: null, timestamp: null };
const CACHE_DURATION = 5 * 60 * 1000;

export default async function handler(req, res) {
  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
  }
  
  // Check cache
  if (cache.data && (Date.now() - cache.timestamp) < CACHE_DURATION) {
    console.log('📦 Returning cached government jobs');
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').json(cache.data);
  }
  
  const timeout = 8000; // 8 second timeout per request
  
  // Define all government job sources with server-safe fetch
  const sources = [
    {
      name: 'UK Government Jobs',
      country: 'GB',
      flag: '🇬🇧',
      fetch: async () => {
        try {
          const response = await axios.get('https://findajob.dwp.gov.uk/feeds/jobs.rss', { timeout });
          const xml = response.data;
          const jobMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
          return jobMatches.slice(0, 15).map(item => ({
            title: item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || '',
            company: 'UK Government',
            location: 'United Kingdom',
            country: 'GB',
            description: item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.substring(0, 500) || '',
            salary_range: 'Competitive',
            source_name: 'FindAJob (DWP)',
            is_government: true
          }));
        } catch (err) {
          console.log(`UK failed: ${err.message}`);
          return [];
        }
      }
    },
    {
      name: 'USAJobs',
      country: 'US',
      flag: '🇺🇸',
      fetch: async () => {
        try {
          const response = await axios.get('https://www.usajobs.gov/jobs/feed/rss', { timeout });
          const xml = response.data;
          const jobMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
          return jobMatches.slice(0, 15).map(item => ({
            title: item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || '',
            company: 'U.S. Federal Government',
            location: 'United States',
            country: 'US',
            description: item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.substring(0, 500) || '',
            salary_range: 'Federal Pay Scale',
            source_name: 'USAJobs.gov',
            is_government: true
          }));
        } catch (err) {
          console.log(`USA failed: ${err.message}`);
          return [];
        }
      }
    },
    {
      name: 'Canada GC Jobs',
      country: 'CA',
      flag: '🇨🇦',
      fetch: async () => {
        try {
          const response = await axios.get('https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/v1/announcements', {
            params: { language: 'en', page: 1, count: 15 },
            timeout
          });
          if (response.data?.data) {
            return response.data.data.map(job => ({
              title: job.jobTitle?.en || 'Government Position',
              company: job.departmentName?.en || 'Government of Canada',
              location: `${job.city?.en || 'Ottawa'}, Canada`,
              country: 'CA',
              description: job.jobSummary?.en?.substring(0, 500) || '',
              salary_range: job.salaryRange || 'Competitive',
              source_name: 'GC Jobs Canada',
              is_government: true
            }));
          }
        } catch (err) {
          console.log(`Canada failed: ${err.message}`);
        }
        return [];
      }
    },
    {
      name: 'Australia APS Jobs',
      country: 'AU',
      flag: '🇦🇺',
      fetch: async () => {
        try {
          const response = await axios.get('https://www.apsjobs.gov.au/api/v1/jobs', {
            params: { limit: 15, offset: 0 },
            timeout
          });
          if (response.data?.data) {
            return response.data.data.map(job => ({
              title: job.title || 'APS Position',
              company: job.agencyName || 'Australian Public Service',
              location: `${job.location}, Australia`,
              country: 'AU',
              description: job.jobDescription?.substring(0, 500) || '',
              salary_range: job.salaryRange || 'Competitive',
              source_name: 'APS Jobs',
              is_government: true
            }));
          }
        } catch (err) {
          console.log(`Australia failed: ${err.message}`);
        }
        return [];
      }
    },
    {
      name: 'Germany Jobsuche',
      country: 'DE',
      flag: '🇩🇪',
      fetch: async () => {
        try {
          const response = await axios.post('https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs',
            { limit: 15, page: 1 },
            { headers: { 'Content-Type': 'application/json' }, timeout }
          );
          if (response.data?.jobs) {
            return response.data.jobs.map(job => ({
              title: job.title || 'Stellenangebot',
              company: job.company || 'Bundesagentur',
              location: `${job.city || 'Germany'}, Germany`,
              country: 'DE',
              description: job.description?.substring(0, 500) || '',
              salary_range: job.salary ? `${job.salary.from} - ${job.salary.to} €` : 'Competitive',
              source_name: 'Bundesagentur für Arbeit',
              is_government: true,
              language: 'DE/EN'
            }));
          }
        } catch (err) {
          console.log(`Germany failed: ${err.message}`);
        }
        return [];
      }
    },
    {
      name: 'France Travail',
      country: 'FR',
      flag: '🇫🇷',
      fetch: async () => {
        try {
          const response = await axios.get('https://candidat.francetravail.fr/offres/search', {
            params: { limit: 15, sort: 'date' },
            timeout
          });
          if (response.data?.offres) {
            return response.data.offres.map(job => ({
              title: job.intitule || 'Offre d\'emploi',
              company: job.entreprise?.nom || 'État français',
              location: `${job.lieuTravail?.libelle || 'Paris'}, France`,
              country: 'FR',
              description: job.description?.substring(0, 500) || '',
              salary_range: job.salaire?.libelle || 'Compétitif',
              source_name: 'France Travail',
              is_government: true,
              language: 'FR'
            }));
          }
        } catch (err) {
          console.log(`France failed: ${err.message}`);
        }
        return [];
      }
    },
    {
      name: 'Nigeria NiYA Jobs',
      country: 'NG',
      flag: '🇳🇬',
      fetch: async () => {
        try {
          const response = await axios.get('https://jobs.niya.gov.ng/api/jobs', { timeout });
          if (response.data?.jobs) {
            return response.data.jobs.slice(0, 15).map(job => ({
              title: job.title || 'Government Position',
              company: job.employer || 'Federal Government of Nigeria',
              location: `${job.location || 'Abuja'}, Nigeria`,
              country: 'NG',
              description: job.description?.substring(0, 500) || '',
              salary_range: job.salary || 'Competitive',
              source_name: 'NiYA Jobs',
              is_government: true
            }));
          }
        } catch (err) {
          console.log(`Nigeria failed: ${err.message}`);
        }
        return [];
      }
    }
  ];
  
  // Fetch all in parallel with error handling
  const results = await Promise.allSettled(sources.map(s => s.fetch()));
  
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
      console.log(`⚠️ ${source.name}: Failed - using fallback`);
      // Add fallback for failed source
      allJobs.push({
        title: `${source.name} - Government Position`,
        company: source.name,
        location: source.country,
        country: source.country,
        description: `Government job opportunity in ${source.country}. Check official portal for latest listings.`,
        salary_range: 'Competitive',
        source_name: source.name,
        is_government: true,
        is_fallback: true
      });
    }
  }
  
  // Cache results
  cache = { data: allJobs, timestamp: Date.now() };
  
  console.log(`🎯 Total jobs fetched: ${allJobs.length} from ${successCount}/${sources.length} sources`);
  
  return res.status(200).setHeader('Access-Control-Allow-Origin', '*').json({
    success: true,
    count: allJobs.length,
    sources: successCount,
    jobs: allJobs
  });
}
