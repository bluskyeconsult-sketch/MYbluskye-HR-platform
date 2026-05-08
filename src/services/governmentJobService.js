// src/services/governmentJobService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// GOVERNMENT JOB SOURCES BY COUNTRY
// ============================================

export const GOVERNMENT_JOB_SOURCES = [
  // ========== UNITED KINGDOM (GB) ==========
  {
    name: 'UK Government Jobs (gov.uk)',
    country: 'GB',
    type: 'api',
    apiUrl: 'https://jobdatafeeds.com/api/v2/jobs/search',
    requiresApiKey: true,
    apiKeyEnv: 'VITE_TECHMAP_API_KEY',
    transformer: (job) => ({
      title: job.title,
      company: job.company || 'UK Government',
      location: job.location || 'United Kingdom',
      description: job.description || 'Government job opportunity',
      salary_range: job.salary ? `${job.salary_min} - ${job.salary_max}` : null,
      job_type: job.employment_type || 'full-time',
      source_url: job.url,
      is_government: true
    })
  },
  {
    name: 'FindAJob (DWP)',
    country: 'GB',
    type: 'scraper',
    baseUrl: 'https://findajob.dwp.gov.uk/search',
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.title,
      company: job.employer,
      location: job.location,
      description: job.description,
      salary_range: job.salary,
      job_type: job.employment_type,
      source_url: `https://findajob.dwp.gov.uk${job.url}`,
      is_government: true
    })
  },

  // ========== UNITED STATES (US) ==========
  {
    name: 'USAJobs.gov (Federal Jobs)',
    country: 'US',
    type: 'api',
    apiUrl: 'https://data.usajobs.gov/api/search',
    requiresApiKey: true,
    apiKeyEnv: 'VITE_USAJOBS_API_KEY',
    headers: { 'Host': 'data.usajobs.gov', 'User-Agent': 'YourAppName' },
    transformer: (job) => ({
      title: job.PositionTitle,
      company: job.OrganizationName || 'U.S. Federal Government',
      location: `${job.LocationName}, ${job.CountryCode}`,
      description: job.JobSummary,
      salary_range: job.SalaryMin && job.SalaryMax ? `$${job.SalaryMin} - $${job.SalaryMax}` : null,
      job_type: job.WorkSchedule || 'full-time',
      source_url: job.ApplyURI?.[0],
      is_government: true,
      grade_level: job.JobGrade?.[0]?.Code,
      agency: job.AgencyName
    })
  },
  {
    name: 'USAJobs Scraper (Backup)',
    country: 'US',
    type: 'scraper',
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.positionTitle,
      company: job.organizationName,
      location: job.locationName,
      description: job.jobSummary,
      salary_range: job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : null,
      grade_level: job.gradeLevel,
      source_url: job.url,
      is_government: true
    })
  },

  // ========== NIGERIA (NG) ==========
  {
    name: 'NiYA Jobs (National Youth Employment Portal)',
    country: 'NG',
    type: 'web',
    apiUrl: 'https://jobs.niya.gov.ng/api/jobs',
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.title,
      company: job.employer || 'Nigerian Government Agency',
      location: job.location || 'Nigeria',
      description: job.description,
      salary_range: job.salary,
      job_type: job.job_type || 'full-time',
      source_url: `https://jobs.niya.gov.ng/jobs/${job.id}`,
      is_government: true
    })
  },
  {
    name: 'Federal Civil Service Commission',
    country: 'NG',
    type: 'web',
    baseUrl: 'https://www.fedcivilservice.gov.ng/careers',
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.title,
      company: 'Federal Civil Service Commission',
      location: 'Abuja, Nigeria',
      description: job.description,
      job_type: 'full-time',
      source_url: job.url,
      is_government: true
    })
  },

  // ========== CANADA (CA) ==========
  {
    name: 'GC Jobs Canada',
    country: 'CA',
    type: 'api',
    apiUrl: 'https://api.canada.ca/jobs',
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.title,
      company: job.department || 'Government of Canada',
      location: `${job.city}, ${job.province}`,
      description: job.jobSummary,
      salary_range: job.salary,
      job_type: job.employmentType || 'full-time',
      source_url: `https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/applicant/page${job.link}`,
      is_government: true
    })
  },
  {
    name: 'Public Service Commission',
    country: 'CA',
    type: 'api',
    apiUrl: 'https://open.canada.ca/data/api/action/package_show',
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.title,
      company: 'Public Service Commission of Canada',
      location: job.location || 'Canada',
      description: job.notes,
      job_type: 'full-time',
      source_url: job.url,
      is_government: true
    })
  },

  // ========== AUSTRALIA (AU) ==========
  {
    name: 'APS Jobs (Australian Public Service)',
    country: 'AU',
    type: 'web',
    baseUrl: 'https://www.apsjobs.gov.au',
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.positionTitle,
      company: job.agency || 'Australian Public Service',
      location: job.location,
      description: job.jobDescription,
      salary_range: job.salary,
      job_type: job.employmentType || 'full-time',
      source_url: job.applicationUrl,
      is_government: true
    })
  },
  {
    name: 'Australian Government JobSearch',
    country: 'AU',
    type: 'web',
    baseUrl: 'https://jobsearch.gov.au/jobs',
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.title,
      company: job.employer,
      location: job.location,
      description: job.description,
      salary_range: job.salary,
      job_type: job.employment_type,
      source_url: job.url,
      is_government: true
    })
  },

  // ========== GERMANY (DE) ==========
  {
    name: 'Bundesagentur für Arbeit (Jobsuche)',
    country: 'DE',
    type: 'api',
    apiUrl: 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4',
    headers: { 'X-API-Key': import.meta.env.VITE_ARBEITSAGENTUR_API_KEY },
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.title,
      company: job.company,
      location: `${job.city}, ${job.postalCode}`,
      description: job.description,
      salary_range: job.salary ? `${job.salary_min} - ${job.salary_max} €` : null,
      job_type: job.employment_type,
      source_url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.id}`,
      is_government: true,
      language: 'DE'
    })
  },
  {
    name: 'Bundesverwaltungsamt',
    country: 'DE',
    type: 'web',
    baseUrl: 'https://karriere.bund.de',
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.title,
      company: job.agency || 'German Federal Government',
      location: job.location || 'Germany',
      description: job.description,
      salary_range: job.salary,
      job_type: 'full-time',
      source_url: job.url,
      is_government: true
    })
  },

  // ========== FRANCE (FR) ==========
  {
    name: 'France Travail (ex-Pôle emploi)',
    country: 'FR',
    type: 'api',
    apiUrl: 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search',
    requiresApiKey: true,
    apiKeyEnv: 'VITE_FRANCE_TRAVAIL_API_KEY',
    transformer: (job) => ({
      title: job.intitule,
      company: job.entreprise?.nom,
      location: `${job.lieuTravail?.libelle}, ${job.lieuTravail?.codePostal}`,
      description: job.description,
      salary_range: job.salaire?.libelle,
      job_type: job.typeContrat,
      source_url: `https://candidat.francetravail.fr/offres/${job.id}`,
      is_government: true,
      language: 'FR'
    })
  },
  {
    name: 'Fonction Publique',
    country: 'FR',
    type: 'web',
    baseUrl: 'https://choisirleservicepublic.gouv.fr',
    requiresApiKey: false,
    transformer: (job) => ({
      title: job.title,
      company: job.ministry || 'French Public Service',
      location: job.location || 'France',
      description: job.description,
      salary_range: job.salary,
      job_type: 'full-time',
      source_url: job.url,
      is_government: true
    })
  }
];

// ============================================
// SAMPLE GOVERNMENT JOBS (Fallback)
// ============================================

export const SAMPLE_GOVERNMENT_JOBS = [
  // UK Government Jobs
  { title: 'Policy Advisor', company: 'UK Civil Service', location: 'London, UK', country: 'GB', description: 'Develop and implement government policies.', salary_range: '£35,000 - £45,000', job_type: 'full-time', source_name: 'gov.uk', is_government: true },
  { title: 'Digital Delivery Manager', company: 'Government Digital Service', location: 'Manchester, UK', country: 'GB', description: 'Lead digital transformation projects.', salary_range: '£50,000 - £65,000', job_type: 'full-time', source_name: 'gov.uk', is_government: true },
  { title: 'Economic Analyst', company: 'HM Treasury', location: 'London, UK', country: 'GB', description: 'Analyze economic data and forecasts.', salary_range: '£40,000 - £55,000', job_type: 'full-time', source_name: 'gov.uk', is_government: true },
  
  // USA Federal Jobs
  { title: 'Software Engineer (Federal)', company: 'US Digital Service', location: 'Washington, DC', country: 'US', description: 'Build technology for government services.', salary_range: '$100,000 - $140,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, grade_level: 'GS-13' },
  { title: 'Policy Analyst', company: 'Department of State', location: 'Washington, DC', country: 'US', description: 'Analyze foreign policy issues.', salary_range: '$85,000 - $110,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, grade_level: 'GS-12' },
  { title: 'Cybersecurity Specialist', company: 'CISA', location: 'Arlington, VA', country: 'US', description: 'Protect federal networks from threats.', salary_range: '$95,000 - $130,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, grade_level: 'GS-13' },
  
  // Nigeria Government Jobs
  { title: 'Youth Employment Officer', company: 'Federal Ministry of Youth', location: 'Abuja, Nigeria', country: 'NG', description: 'Coordinate youth employment programs.', salary_range: '₦120,000 - ₦180,000', job_type: 'full-time', source_name: 'NiYA Jobs', is_government: true },
  { title: 'Civil Service Administrator', company: 'Bauchi State Government', location: 'Bauchi, Nigeria', country: 'NG', description: 'Administrative role in state civil service.', salary_range: '₦100,000 - ₦150,000', job_type: 'full-time', source_name: 'State Civil Service', is_government: true },
  { title: 'IT Support Officer', company: 'NITDA', location: 'Abuja, Nigeria', country: 'NG', description: 'Provide IT support for government digital services.', salary_range: '₦130,000 - ₦200,000', job_type: 'full-time', source_name: 'NITDA', is_government: true },
  
  // Canada Government Jobs
  { title: 'Program Analyst', company: 'Government of Canada', location: 'Ottawa, ON', country: 'CA', description: 'Analyze government programs and policies.', salary_range: 'CAD 75,000 - CAD 95,000', job_type: 'full-time', source_name: 'GC Jobs', is_government: true },
  { title: 'Policy Developer', company: 'Public Service Commission', location: 'Toronto, ON', country: 'CA', description: 'Develop HR policies for federal public service.', salary_range: 'CAD 80,000 - CAD 100,000', job_type: 'full-time', source_name: 'GC Jobs', is_government: true },
  
  // Australia Government Jobs
  { title: 'APS Graduate Program', company: 'Australian Public Service', location: 'Canberra, ACT', country: 'AU', description: 'Entry-level program for recent graduates.', salary_range: 'AUD 65,000 - AUD 75,000', job_type: 'full-time', source_name: 'APS Jobs', is_government: true },
  { title: 'Data Scientist (APS Level 5)', company: 'Australian Bureau of Statistics', location: 'Sydney, NSW', country: 'AU', description: 'Analyse statistical data for government reporting.', salary_range: 'AUD 85,000 - AUD 105,000', job_type: 'full-time', source_name: 'APS Jobs', is_government: true },
  
  // Germany Government Jobs
  { title: 'IT-Referent (m/w/d)', company: 'Bundesverwaltungsamt', location: 'Berlin, Germany', country: 'DE', description: 'IT-Administration für Bundesbehörden.', salary_range: '€55,000 - €70,000', job_type: 'full-time', source_name: 'Bund.de', is_government: true, language: 'DE' },
  { title: 'Wirtschaftswissenschaftler', company: 'Bundesministerium für Wirtschaft', location: 'Berlin, Germany', country: 'DE', description: 'Analyse wirtschaftspolitischer Maßnahmen.', salary_range: '€60,000 - €80,000', job_type: 'full-time', source_name: 'Bund.de', is_government: true, language: 'DE' },
  
  // France Government Jobs
  { title: 'Chargé de mission RH', company: 'Fonction Publique', location: 'Paris, France', country: 'FR', description: 'Gestion des ressources humaines.', salary_range: '€45,000 - €60,000', job_type: 'full-time', source_name: 'France Travail', is_government: true, language: 'FR' },
  { title: 'Développeur Full Stack', company: 'DINUM', location: 'Paris, France', country: 'FR', description: 'Développement de services numériques publics.', salary_range: '€50,000 - €70,000', job_type: 'full-time', source_name: 'France Travail', is_government: true, language: 'FR' }
];

// ============================================
// FETCH FUNCTION
// ============================================

export async function fetchGovernmentJobs() {
  const allJobs = [];
  
  for (const source of GOVERNMENT_JOB_SOURCES) {
    try {
      let jobs = [];
      
      if (source.type === 'api') {
        // API-based fetching
        const headers = source.headers || {};
        if (source.requiresApiKey && source.apiKeyEnv) {
          const apiKey = import.meta.env[source.apiKeyEnv];
          if (!apiKey) {
            console.log(`Skipping ${source.name}: API key not configured`);
            continue;
          }
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const response = await fetch(source.apiUrl, { headers });
        if (response.ok) {
          const data = await response.json();
          const results = data.results || data.data || data.jobs || [];
          jobs = results.map(source.transformer);
        }
      } else if (source.type === 'scraper' || source.type === 'web') {
        // For web scraping - this would be handled by a serverless function
        // For now, use sample fallback
        console.log(`Skipping ${source.name}: Web scraping requires serverless function`);
      }
      
      if (jobs.length > 0) {
        allJobs.push(...jobs);
      }
    } catch (err) {
      console.error(`Error fetching from ${source.name}:`, err);
    }
  }
  
  // If no real jobs fetched, use government sample data
  if (allJobs.length === 0) {
    console.log('Using sample government jobs as fallback');
    allJobs.push(...SAMPLE_GOVERNMENT_JOBS.map(job => ({
      ...job,
      source_name: job.source_name || 'Government Jobs Portal',
      created_at: new Date().toISOString()
    })));
  }
  
  return allJobs;
}

export async function saveGovernmentJobsToSupabase(jobs, userId) {
  // Check for duplicates
  const { data: existingJobs } = await supabase
    .from('external_jobs')
    .select('title, company, source_name, source_country');
  
  const existingKeys = new Set(
    existingJobs?.map(job => `${job.title}|${job.company}|${job.source_country}`) || []
  );
  
  let newCount = 0;
  for (const job of jobs) {
    const jobKey = `${job.title}|${job.company}|${job.country || job.source_country}`;
    if (existingKeys.has(jobKey)) continue;
    
    const { error } = await supabase.from('external_jobs').insert({
      title: job.title,
      company: job.company,
      location: job.location,
      source_name: job.source_name || 'Government Portal',
      source_country: job.country || job.source_country,
      description: job.description,
      salary_range: job.salary_range,
      job_type: job.job_type || 'full-time',
      status: 'pending_approval',
      created_at: new Date().toISOString(),
      metadata: {
        is_government: true,
        grade_level: job.grade_level,
        language: job.language,
        application_url: job.source_url
      }
    });
    
    if (!error) newCount++;
  }
  
  return newCount;
}
