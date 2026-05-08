// api/fetch-jobs.js
// Vercel Serverless Function - Place in /api folder at project root

let cache = { data: null, timestamp: null };
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check cache
  if (cache.data && (Date.now() - cache.timestamp) < CACHE_DURATION) {
    console.log('📦 Returning cached jobs');
    return res.status(200).json(cache.data);
  }
  
  const timeout = 10000; // 10 second timeout per request
  
  // Define job sources
  const sources = [
    // USAJobs (Most reliable RSS feed)
    {
      name: 'USAJobs.gov',
      country: 'US',
      flag: '🇺🇸',
      fetch: async () => {
        try {
          const response = await fetch('https://www.usajobs.gov/jobs/feed/rss?Number=15', { 
            signal: AbortSignal.timeout(timeout),
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          const text = await response.text();
          const jobMatches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
          
          return jobMatches.slice(0, 15).map(item => ({
            title: extractTag(item, 'title'),
            company: 'U.S. Federal Government',
            location: extractLocationFromDescription(extractTag(item, 'description')),
            country: 'US',
            description: extractTag(item, 'description')?.substring(0, 500),
            salary_range: extractSalaryFromDescription(extractTag(item, 'description')),
            source_name: 'USAJobs.gov',
            source_url: extractTag(item, 'link'),
            job_type: 'full-time',
            is_government: true
          }));
        } catch (err) {
          console.log(`⚠️ USAJobs failed: ${err.message}`);
          return [];
        }
      }
    },
    // Canada GC Jobs (Public API)
    {
      name: 'GC Jobs Canada',
      country: 'CA',
      flag: '🇨🇦',
      fetch: async () => {
        try {
          const response = await fetch('https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/v1/announcements?language=en&page=1&count=15', {
            signal: AbortSignal.timeout(timeout)
          });
          const data = await response.json();
          
          if (!data?.data) return [];
          
          return data.data.map(job => ({
            title: job.jobTitle?.en || 'Government of Canada Position',
            company: job.departmentName?.en || 'Government of Canada',
            location: `${job.city?.en || 'Ottawa'}, ${job.province || 'ON'}, Canada',
            country: 'CA',
            description: job.jobSummary?.en?.substring(0, 500) || '',
            salary_range: job.salaryRange || 'Competitive',
            source_name: 'GC Jobs Canada',
            source_url: `https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/applicant/page${job.referenceId}`,
            job_type: 'full-time',
            is_government: true
          }));
        } catch (err) {
          console.log(`⚠️ Canada GC Jobs failed: ${err.message}`);
          return [];
        }
      }
    },
    // Australia APS Jobs
    {
      name: 'APS Jobs Australia',
      country: 'AU',
      flag: '🇦🇺',
      fetch: async () => {
        try {
          const response = await fetch('https://www.apsjobs.gov.au/api/v1/jobs?limit=15&offset=0', {
            signal: AbortSignal.timeout(timeout)
          });
          const data = await response.json();
          
          if (!data?.data) return [];
          
          return data.data.map(job => ({
            title: job.title || 'Australian Public Service Position',
            company: job.agencyName || 'Australian Public Service',
            location: `${job.location || 'Canberra'}, Australia`,
            country: 'AU',
            description: job.jobDescription?.substring(0, 500) || '',
            salary_range: job.salaryRange || job.salary || 'Competitive',
            source_name: 'APS Jobs Australia',
            source_url: `https://www.apsjobs.gov.au/job/${job.jobId}`,
            job_type: 'full-time',
            is_government: true
          }));
        } catch (err) {
          console.log(`⚠️ Australia APS Jobs failed: ${err.message}`);
          return [];
        }
      }
    },
    // Germany Bundesagentur für Arbeit
    {
      name: 'Bundesagentur für Arbeit',
      country: 'DE',
      flag: '🇩🇪',
      fetch: async () => {
        try {
          const response = await fetch('https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 15, page: 1 }),
            signal: AbortSignal.timeout(timeout)
          });
          const data = await response.json();
          
          if (!data?.jobs) return [];
          
          return data.jobs.map(job => ({
            title: job.title || job.stellenbezeichnung || 'Stellenangebot',
            company: job.company || job.arbeitgeber || 'Bundesagentur für Arbeit',
            location: `${job.city || job.ort || 'Germany'}, Germany`,
            country: 'DE',
            description: (job.description || job.beschreibung || '').substring(0, 500),
            salary_range: job.salary ? `${job.salary.from} - ${job.salary.to} €` : 'Tarifvertrag',
            source_name: 'Bundesagentur für Arbeit',
            source_url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.jobId}`,
            job_type: 'full-time',
            is_government: true,
            language: 'DE'
          }));
        } catch (err) {
          console.log(`⚠️ Germany failed: ${err.message}`);
          return [];
        }
      }
    },
    // France Travail
    {
      name: 'France Travail',
      country: 'FR',
      flag: '🇫🇷',
      fetch: async () => {
        try {
          const response = await fetch('https://candidat.francetravail.fr/offres/search?limit=15&sort=date', {
            signal: AbortSignal.timeout(timeout)
          });
          const data = await response.json();
          
          if (!data?.offres) return [];
          
          return data.offres.map(job => ({
            title: job.intitule || 'Offre d\'emploi',
            company: job.entreprise?.nom || 'État français',
            location: `${job.lieuTravail?.libelle || 'Paris'}, France`,
            country: 'FR',
            description: (job.description || '').substring(0, 500),
            salary_range: job.salaire?.libelle || 'Compétitif',
            source_name: 'France Travail',
            source_url: `https://candidat.francetravail.fr/offres/${job.id}`,
            job_type: 'full-time',
            is_government: true,
            language: 'FR'
          }));
        } catch (err) {
          console.log(`⚠️ France failed: ${err.message}`);
          return [];
        }
      }
    },
    // UK Civil Service Jobs
    {
      name: 'UK Civil Service',
      country: 'GB',
      flag: '🇬🇧',
      fetch: async () => {
        try {
          const response = await fetch('https://www.civilservicejobs.service.gov.uk/csr/index.cgi?action=feed.homesite&language=en', {
            signal: AbortSignal.timeout(timeout)
          });
          const text = await response.text();
          const jobMatches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
          
          return jobMatches.slice(0, 15).map(item => ({
            title: extractTag(item, 'title'),
            company: 'UK Civil Service',
            location: extractLocationFromDescription(extractTag(item, 'description')),
            country: 'GB',
            description: extractTag(item, 'description')?.substring(0, 500),
            salary_range: extractSalaryFromDescription(extractTag(item, 'description')),
            source_name: 'Civil Service Jobs',
            source_url: extractTag(item, 'link'),
            job_type: 'full-time',
            is_government: true
          }));
        } catch (err) {
          console.log(`⚠️ UK Civil Service failed: ${err.message}`);
          return [];
        }
      }
    }
  ];
  
  // Sample commercial jobs (fallback)
  const sampleCommercialJobs = [
    { title: 'Senior Software Engineer', company: 'Tech Innovations', location: 'Remote', country: 'US', description: 'Build scalable web applications using React and Node.js.', salary_range: '$120,000 - $160,000', source_name: 'LinkedIn', job_type: 'full-time', is_government: false },
    { title: 'Product Manager', company: 'Global Products Ltd', location: 'London, UK', country: 'GB', description: 'Lead product development for B2B SaaS platform.', salary_range: '£75,000 - £95,000', source_name: 'Indeed', job_type: 'full-time', is_government: false },
    { title: 'Data Scientist', company: 'AI Innovations', location: 'Berlin, Germany', country: 'DE', description: 'Machine Learning and data analysis expert needed.', salary_range: '€70,000 - €90,000', source_name: 'Stack Overflow', job_type: 'full-time', is_government: false },
    { title: 'Marketing Director', company: 'Market Pro', location: 'Sydney, Australia', country: 'AU', description: 'Lead marketing strategy for global brand.', salary_range: 'AUD 120,000 - AUD 150,000', source_name: 'Seek', job_type: 'full-time', is_government: false }
  ];
  
  // Helper functions
  function extractTag(xml, tag) {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
  }
  
  function extractLocationFromDescription(desc) {
    const match = desc?.match(/Location:?\s*([^<,\n]+)/i);
    return match ? match[1].trim() : '';
  }
  
  function extractSalaryFromDescription(desc) {
    const match = desc?.match(/Salary:?\s*([^<,\n]+)/i);
    return match ? match[1].trim() : '';
  }
  
  // Fetch all sources in parallel
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
      console.log(`⚠️ ${source.name}: Failed - skipping`);
    }
  }
  
  // Add sample commercial jobs if we have no government jobs
  if (allJobs.length === 0) {
    allJobs.push(...sampleCommercialJobs);
    console.log('📋 Using sample commercial jobs as fallback');
  }
  
  // Cache results
  cache = { data: { success: true, count: allJobs.length, sources: successCount, jobs: allJobs }, timestamp: Date.now() };
  
  console.log(`🎯 TOTAL: ${allJobs.length} jobs from ${successCount} sources`);
  
  return res.status(200).json(cache.data);
}
