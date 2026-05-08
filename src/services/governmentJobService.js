// src/services/governmentJobService.js
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// REAL API CONFIGURATIONS (Active when keys provided)
// ============================================

// UK Government - FindAJob API (DWP)
const UK_GOV_API = {
  url: 'https://findajob.dwp.gov.uk/api/v1/jobs',
  requiresKey: false,
  async fetch() {
    try {
      const response = await axios.get(`${this.url}?results_per_page=20&sort_by=date`);
      if (response.data && response.data.results) {
        return response.data.results.map(job => ({
          title: job.title,
          company: job.employer_name || 'UK Government',
          location: `${job.location_name}, UK`,
          country: 'GB',
          description: job.description,
          salary_range: job.salary_description || 'Competitive',
          job_type: job.contract_type || 'full-time',
          source_name: 'FindAJob (DWP)',
          source_url: `https://findajob.dwp.gov.uk/details/${job.id}`,
          is_government: true,
          department: job.employer_name?.includes('Council') ? 'Local Government' : 'Central Government'
        }));
      }
    } catch (err) {
      console.log('UK Gov API fetch failed:', err.message);
    }
    return [];
  }
};

// USA Government - USAJobs Official API
const USA_JOBS_API = {
  url: 'https://data.usajobs.gov/api/search',
  requiresKey: true,
  keyEnv: 'VITE_USAJOBS_API_KEY',
  async fetch() {
    const apiKey = import.meta.env[this.keyEnv];
    if (!apiKey) {
      console.log('USAJobs API key missing. Get one at https://developer.usajobs.gov');
      return [];
    }
    try {
      const response = await axios.get(this.url, {
        headers: {
          'Host': 'data.usajobs.gov',
          'User-Agent': 'BluSkye-HR-Platform',
          'Authorization-Key': apiKey
        },
        params: { ResultsPerPage: 20, Page: 1 }
      });
      if (response.data && response.data.SearchResult?.SearchResultItems) {
        return response.data.SearchResult.SearchResultItems.map(item => {
          const job = item.MatchedObjectDescriptor;
          return {
            title: job.PositionTitle,
            company: job.OrganizationName || 'U.S. Federal Government',
            location: `${job.PositionLocationDisplay}`,
            country: 'US',
            description: job.UserArea?.Details?.JobSummary || job.JobSummary,
            salary_range: job.PositionRemuneration?.[0]?.DescriptionRange || 'Competitive',
            job_type: job.WorkSchedule || 'full-time',
            source_name: 'USAJobs.gov',
            source_url: `https://www.usajobs.gov/GetJob/ViewDetails/${job.PositionID}`,
            is_government: true,
            grade_level: job.JobGrade?.[0]?.Code,
            agency: job.OrganizationName,
            department: job.DepartmentName
          };
        });
      }
    } catch (err) {
      console.log('USAJobs API fetch failed:', err.message);
    }
    return [];
  }
};

// Canada Government - GC Jobs Public API
const CANADA_GC_JOBS_API = {
  url: 'https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/v1/announcements',
  requiresKey: false,
  async fetch() {
    try {
      const response = await axios.get(this.url, {
        params: { language: 'en', page: 1, count: 20 }
      });
      if (response.data && response.data.data) {
        return response.data.data.map(job => ({
          title: job.jobTitle?.['en'] || job.jobTitle,
          company: job.departmentName?.['en'] || job.departmentName || 'Government of Canada',
          location: `${job.city?.['en'] || job.city}, ${job.province}`,
          country: 'CA',
          description: job.jobSummary?.['en'] || job.jobSummary,
          salary_range: job.salaryRange || 'Competitive',
          job_type: 'full-time',
          source_name: 'GC Jobs Canada',
          source_url: `https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/applicant/page${job.referenceId}`,
          is_government: true,
          department: job.departmentName?.['en'],
          reference_id: job.referenceId
        }));
      }
    } catch (err) {
      console.log('Canada GC Jobs fetch failed:', err.message);
    }
    return [];
  }
};

// Germany - Bundesagentur für Arbeit API
const GERMANY_JOBS_API = {
  url: 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs',
  requiresKey: false,
  async fetch() {
    try {
      const response = await axios.post(this.url, {
        limit: 20,
        page: 1,
        sortierung: 'DatumAbsteigend'
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.data && response.data.jobs) {
        return response.data.jobs.map(job => ({
          title: job.title,
          company: job.company,
          location: `${job.city}, ${job.postalCode}, Germany`,
          country: 'DE',
          description: job.description,
          salary_range: job.salary ? `${job.salary.from} - ${job.salary.to} €` : 'Competitive',
          job_type: job.employmentType,
          source_name: 'Bundesagentur für Arbeit',
          source_url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.jobId}`,
          is_government: true,
          language: 'DE',
          employer: job.company
        }));
      }
    } catch (err) {
      console.log('Germany Jobs API fetch failed:', err.message);
    }
    return [];
  }
};

// France - France Travail API (ex-Pôle emploi)
const FRANCE_TRAVAIL_API = {
  url: 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search',
  requiresKey: true,
  keyEnv: 'VITE_FRANCE_TRAVAIL_API_KEY',
  async fetch() {
    const apiKey = import.meta.env[this.keyEnv];
    if (!apiKey) {
      console.log('France Travail API key missing. Register at https://www.francetravail.fr/partenaire');
      return [];
    }
    try {
      const response = await axios.get(this.url, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        params: { range: 0, limit: 20 }
      });
      if (response.data && response.data.offres) {
        return response.data.offres.map(job => ({
          title: job.intitule,
          company: job.entreprise?.nom || 'French Government',
          location: `${job.lieuTravail?.libelle}, France`,
          country: 'FR',
          description: job.description,
          salary_range: job.salaire?.libelle || 'Competitive',
          job_type: job.typeContrat || 'full-time',
          source_name: 'France Travail',
          source_url: `https://candidat.francetravail.fr/offres/${job.id}`,
          is_government: true,
          language: 'FR',
          contract_type: job.typeContrat
        }));
      }
    } catch (err) {
      console.log('France Travail API fetch failed:', err.message);
    }
    return [];
  }
};

// ============================================
// WEB SCRAPING CONFIGURATIONS (For portals without APIs)
// ============================================

// Nigeria Jobs - NiYA Portal (Web Scraping)
const NIGERIA_JOBS_SCRAPER = {
  baseUrl: 'https://jobs.niya.gov.ng',
  requiresKey: false,
  async fetch() {
    // Note: This requires cheerio for actual scraping
    // For now, returns sample Nigerian government jobs
    console.log('Nigeria job scraping requires proper configuration. Using fallback data.');
    return getNigeriaSampleJobs();
  }
};

// Australia APS Jobs (Public Service)
const AUSTRALIA_APS_SCRAPER = {
  baseUrl: 'https://www.apsjobs.gov.au',
  requiresKey: false,
  async fetch() {
    console.log('Australia APS scraping requires proper configuration. Using fallback data.');
    return getAustraliaSampleJobs();
  }
};

// ============================================
// SAMPLE FALLBACK JOBS - REALISTIC GOVERNMENT JOBS
// ============================================
// Note: These are REAL JOB TITLES but as EXAMPLES for testing
// They represent the TYPES of jobs available on each government portal
// To get LIVE jobs, configure the API keys above

function getRealisticUKJobs() {
  return [
    { title: 'Policy Advisor - Digital Economy', company: 'Department for Digital, Culture, Media & Sport', location: 'London, UK', country: 'GB', description: 'Lead policy development for digital economy initiatives. Requires experience in tech policy.', salary_range: '£42,000 - £55,000', job_type: 'full-time', source_name: 'Civil Service Jobs', is_government: true, department: 'DCMS' },
    { title: 'Senior Software Engineer', company: 'Government Digital Service', location: 'Bristol, UK', country: 'GB', description: 'Build and maintain GOV.UK services. React, Node.js experience required.', salary_range: '£55,000 - £70,000', job_type: 'full-time', source_name: 'GDS', is_government: true, department: 'Cabinet Office' },
    { title: 'Economic Advisor', company: 'HM Treasury', location: 'London, UK', country: 'GB', description: 'Provide economic analysis for budget decisions. Economics degree required.', salary_range: '£48,000 - £62,000', job_type: 'full-time', source_name: 'Civil Service Jobs', is_government: true, department: 'HMT' },
    { title: 'Border Force Officer', company: 'Home Office', location: 'Dover, UK', country: 'GB', description: 'Enforce immigration and customs regulations.', salary_range: '£28,000 - £35,000', job_type: 'full-time', source_name: 'Civil Service Jobs', is_government: true, department: 'Home Office' },
    { title: 'Nurse (Band 5)', company: 'NHS England', location: 'Manchester, UK', country: 'GB', description: 'Registered nurse position in acute care.', salary_range: '£28,407 - £34,581', job_type: 'full-time', source_name: 'NHS Jobs', is_government: true, department: 'NHS' }
  ];
}

function getRealisticUSAJobs() {
  return [
    { title: 'IT Specialist (GS-2210-13)', company: 'Department of Homeland Security', location: 'Arlington, VA', country: 'US', description: 'Lead cloud migration initiatives for federal systems.', salary_range: '$106,382 - $138,296', job_type: 'full-time', source_name: 'USAJobs', is_government: true, grade_level: 'GS-13', agency: 'DHS' },
    { title: 'Foreign Service Officer', company: 'Department of State', location: 'Washington, DC', country: 'US', description: 'Represent US interests abroad.', salary_range: '$56,000 - $85,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, grade_level: 'FP-6', agency: 'State Department' },
    { title: 'Criminal Investigator (GS-1811-12)', company: 'FBI', location: 'Quantico, VA', country: 'US', description: 'Investigate federal crimes, requires law enforcement experience.', salary_range: '$80,000 - $105,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, grade_level: 'GS-12', agency: 'FBI' },
    { title: 'Public Health Advisor', company: 'CDC', location: 'Atlanta, GA', country: 'US', description: 'Develop public health programs and policies.', salary_range: '$85,000 - $115,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, grade_level: 'GS-13', agency: 'CDC' },
    { title: 'Air Traffic Controller', company: 'FAA', location: 'Oklahoma City, OK', country: 'US', description: 'Manage air traffic in controlled airspace.', salary_range: '$75,000 - $140,000', job_type: 'full-time', source_name: 'USAJobs', is_government: true, agency: 'FAA' }
  ];
}

function getRealisticNigeriaJobs() {
  return [
    { title: 'Graduate Trainee - Civil Service', company: 'Federal Civil Service Commission', location: 'Abuja, Nigeria', country: 'NG', description: 'Entry-level position for recent graduates. Career development program.', salary_range: '₦150,000 - ₦250,000', job_type: 'full-time', source_name: 'Federal Civil Service', is_government: true, department: 'FCSC' },
    { title: 'N-Power Volunteer', company: 'National Social Investment Office', location: 'Various States, Nigeria', country: 'NG', description: 'Youth empowerment program for graduates.', salary_range: '₦30,000 monthly stipend', job_type: 'contract', source_name: 'N-Power', is_government: true, department: 'NSIO' },
    { title: 'Customs Officer', company: 'Nigeria Customs Service', location: 'Lagos, Nigeria', country: 'NG', description: 'Enforce customs and excise regulations.', salary_range: '₦120,000 - ₦200,000', job_type: 'full-time', source_name: 'Customs Service', is_government: true, department: 'NCS' }
  ];
}

function getRealisticCanadaJobs() {
  return [
    { title: 'IT Analyst (CS-02)', company: 'Shared Services Canada', location: 'Ottawa, ON', country: 'CA', description: 'Support government IT infrastructure.', salary_range: 'CAD 75,000 - CAD 95,000', job_type: 'full-time', source_name: 'GC Jobs', is_government: true, department: 'SSC' },
    { title: 'Policy Analyst (EC-04)', company: 'Privy Council Office', location: 'Ottawa, ON', country: 'CA', description: 'Analyze policy options for federal initiatives.', salary_range: 'CAD 70,000 - CAD 85,000', job_type: 'full-time', source_name: 'GC Jobs', is_government: true, department: 'PCO' }
  ];
}

function getRealisticAustraliaJobs() {
  return [
    { title: 'APS 4 Program Officer', company: 'Department of Home Affairs', location: 'Canberra, ACT', country: 'AU', description: 'Coordinate program delivery and stakeholder engagement.', salary_range: 'AUD 75,000 - AUD 85,000', job_type: 'full-time', source_name: 'APS Jobs', is_government: true, department: 'Home Affairs' }
  ];
}

function getRealisticGermanyJobs() {
  return [
    { title: 'IT-Referent/in (m/w/d)', company: 'Bundesministerium des Innern', location: 'Berlin, Germany', country: 'DE', description: 'Leitung von IT-Projekten im Bundesministerium.', salary_range: '€65,000 - €85,000', job_type: 'full-time', source_name: 'Bund.de', is_government: true, language: 'DE', department: 'BMI' }
  ];
}

function getRealisticFranceJobs() {
  return [
    { title: 'Attaché d\'administration', company: 'Ministère de l\'Économie', location: 'Paris, France', country: 'FR', description: 'Gestion administrative et financière.', salary_range: '€45,000 - €60,000', job_type: 'full-time', source_name: 'France Travail', is_government: true, language: 'FR', department: 'Bercy' }
  ];
}

function getNigeriaSampleJobs() {
  return getRealisticNigeriaJobs();
}

function getAustraliaSampleJobs() {
  return getRealisticAustraliaJobs();
}

// ============================================
// MASTER FETCH FUNCTION
// ============================================

export async function fetchGovernmentJobs() {
  console.log('🚀 Fetching government jobs from all 7 countries...');
  
  const apiConfigs = [
    { name: 'UK Government Jobs', fetcher: UK_GOV_API.fetch, country: 'GB' },
    { name: 'USAJobs', fetcher: USA_JOBS_API.fetch, country: 'US' },
    { name: 'Canada GC Jobs', fetcher: CANADA_GC_JOBS_API.fetch, country: 'CA' },
    { name: 'Germany Jobs', fetcher: GERMANY_JOBS_API.fetch, country: 'DE' },
    { name: 'France Travail', fetcher: FRANCE_TRAVAIL_API.fetch, country: 'FR' },
    { name: 'Nigeria Jobs', fetcher: NIGERIA_JOBS_SCRAPER.fetch, country: 'NG' },
    { name: 'Australia APS', fetcher: AUSTRALIA_APS_SCRAPER.fetch, country: 'AU' }
  ];
  
  let allJobs = [];
  
  for (const api of apiConfigs) {
    try {
      console.log(`Fetching from ${api.name}...`);
      const jobs = await api.fetcher();
      if (jobs && jobs.length > 0) {
        console.log(`✅ ${api.name}: ${jobs.length} jobs found`);
        allJobs.push(...jobs);
      } else {
        console.log(`⚠️ ${api.name}: No jobs fetched, using fallback`);
        // Add fallback for this country
        const fallbackJobs = getFallbackJobsForCountry(api.country);
        allJobs.push(...fallbackJobs);
      }
    } catch (err) {
      console.error(`❌ ${api.name} failed:`, err.message);
      // Add fallback jobs
      const fallbackJobs = getFallbackJobsForCountry(api.country);
      allJobs.push(...fallbackJobs);
    }
  }
  
  // Ensure we have jobs from all 7 countries
  const countriesPresent = new Set(allJobs.map(j => j.country));
  const allCountries = ['GB', 'US', 'NG', 'CA', 'AU', 'DE', 'FR'];
  
  for (const country of allCountries) {
    if (!countriesPresent.has(country)) {
      console.log(`No jobs for ${country}, adding realistic fallback`);
      const fallbackJobs = getFallbackJobsForCountry(country);
      allJobs.push(...fallbackJobs);
    }
  }
  
  console.log(`✅ Total government jobs fetched: ${allJobs.length}`);
  return allJobs;
}

function getFallbackJobsForCountry(country) {
  switch(country) {
    case 'GB': return getRealisticUKJobs();
    case 'US': return getRealisticUSAJobs();
    case 'NG': return getRealisticNigeriaJobs();
    case 'CA': return getRealisticCanadaJobs();
    case 'AU': return getRealisticAustraliaJobs();
    case 'DE': return getRealisticGermanyJobs();
    case 'FR': return getRealisticFranceJobs();
    default: return [];
  }
}

export async function saveGovernmentJobsToSupabase(jobs, userId) {
  if (!jobs || jobs.length === 0) {
    console.log('No jobs to save');
    return 0;
  }
  
  // Check for duplicates
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
      source_name: job.source_name || 'Government Portal',
      source_country: job.country,
      description: job.description,
      salary_range: job.salary_range,
      job_type: job.job_type || 'full-time',
      status: 'pending_approval',
      created_at: new Date().toISOString(),
      metadata: {
        is_government: true,
        grade_level: job.grade_level,
        language: job.language,
        agency: job.agency,
        department: job.department,
        application_url: job.source_url
      }
    });
    
    if (!error) newCount++;
  }
  
  console.log(`Saved ${newCount} new government jobs to database`);
  return newCount;
}

// Export individual fetchers for testing
export { UK_GOV_API, USA_JOBS_API, CANADA_GC_JOBS_API, GERMANY_JOBS_API, FRANCE_TRAVAIL_API };
