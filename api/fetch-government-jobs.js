// api/fetch-government-jobs.js
// Using RSS to JSON proxy for reliable fetching

import axios from 'axios';

let cache = { data: null, timestamp: null };
const CACHE_DURATION = 5 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  // Return cached data
  if (cache.data && (Date.now() - cache.timestamp) < CACHE_DURATION) {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').json(cache.data);
  }
  
  // List of working job RSS feeds (from government and public sources)
  const rssFeeds = [
    {
      name: 'USAJobs (Federal)',
      country: 'US',
      flag: '🇺🇸',
      url: 'https://www.usajobs.gov/jobs/feed/rss?Number=15',
      transformer: (item) => ({
        title: item.title,
        company: 'U.S. Federal Government',
        location: 'United States',
        country: 'US',
        description: item.contentSnippet?.substring(0, 500) || '',
        salary_range: 'Federal Pay Scale',
        source_name: 'USAJobs.gov',
        is_government: true
      })
    },
    {
      name: 'Canada GC Jobs',
      country: 'CA',
      flag: '🇨🇦',
      url: 'https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/v1/announcements?language=en&page=1&count=15',
      transformer: (job) => ({
        title: job.jobTitle?.en || 'Government Position',
        company: job.departmentName?.en || 'Government of Canada',
        location: `${job.city?.en || 'Ottawa'}, Canada`,
        country: 'CA',
        description: (job.jobSummary?.en || '').substring(0, 500),
        salary_range: job.salaryRange || 'Competitive',
        source_name: 'GC Jobs Canada',
        is_government: true
      })
    },
    {
      name: 'UK Civil Service Jobs',
      country: 'GB',
      flag: '🇬🇧',
      url: 'https://www.civilservicejobs.service.gov.uk/csr/index.cgi?action=feed.homesite&language=en',
      transformer: (item) => ({
        title: item.title,
        company: 'UK Civil Service',
        location: 'United Kingdom',
        country: 'GB',
        description: item.contentSnippet?.substring(0, 500) || '',
        salary_range: 'Civil Service Pay Scale',
        source_name: 'Civil Service Jobs',
        is_government: true
      })
    },
    {
      name: 'EU Jobs',
      country: 'EU',
      flag: '🇪🇺',
      url: 'https://epso.europa.eu/eu/jobs-feed.xml',
      transformer: (item) => ({
        title: item.title,
        company: 'European Union Institutions',
        location: 'Europe',
        country: 'EU',
        description: item.contentSnippet?.substring(0, 500) || '',
        salary_range: 'EU Scale',
        source_name: 'European Personnel Selection Office',
        is_government: true
      })
    }
  ];
  
  // Also add commercial job boards that work (no CORS)
  const commercialFeeds = [
    {
      name: 'Stack Overflow Jobs',
      country: 'US',
      flag: '💼',
      url: 'https://stackoverflow.com/jobs/feed',
      transformer: (item) => ({
        title: item.title,
        company: item.author,
        location: 'Remote/Worldwide',
        country: 'US',
        description: item.contentSnippet?.substring(0, 500) || '',
        salary_range: 'Market Rate',
        source_name: 'Stack Overflow',
        is_government: false
      })
    },
    {
      name: 'GitHub Jobs',
      country: 'US',
      flag: '💼',
      url: 'https://jobs.github.com/positions.atom',
      transformer: (item) => ({
        title: item.title,
        company: item.author,
        location: 'Remote/Worldwide',
        country: 'US',
        description: item.contentSnippet?.substring(0, 500) || '',
        salary_range: 'Market Rate',
        source_name: 'GitHub Jobs',
        is_government: false
      })
    }
  ];
  
  const allFeeds = [...rssFeeds, ...commercialFeeds];
  
  // Helper to parse RSS/Atom feeds
  const parseRSS = (xml, transformer) => {
    const items = [];
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    const allMatches = [...itemMatches, ...entryMatches];
    
    for (const match of allMatches) {
      const title = match.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '') || '';
      let link = match.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] || '';
      if (!link) link = match.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] || '';
      const description = match.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '') || 
                          match.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '') || '';
      
      if (title) {
        items.push(transformer({ title, link, contentSnippet: description }));
      }
    }
    return items;
  };
  
  let allJobs = [];
  let successCount = 0;
  
  for (const feed of allFeeds) {
    try {
      console.log(`Fetching ${feed.name}...`);
      const response = await axios.get(feed.url, { 
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (response.data) {
        const jobs = parseRSS(response.data, feed.transformer);
        if (jobs.length > 0) {
          allJobs.push(...jobs);
          successCount++;
          console.log(`✅ ${feed.name}: ${jobs.length} jobs`);
        }
      }
    } catch (err) {
      console.log(`❌ ${feed.name} failed: ${err.message}`);
    }
  }
  
  // Also try direct API for Germany (REST)
  try {
    const germanyResponse = await axios.post(
      'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs',
      { limit: 10, page: 1 },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    if (germanyResponse.data?.jobs) {
      const germanyJobs = germanyResponse.data.jobs.map(job => ({
        title: job.title || 'Stellenangebot',
        company: job.company || 'Bundesagentur für Arbeit',
        location: `${job.city || 'Germany'}, Germany',
        country: 'DE',
        description: (job.description || '').substring(0, 500),
        salary_range: job.salary ? `${job.salary.from} - ${job.salary.to} €` : 'Tarifvertrag',
        source_name: 'Bundesagentur für Arbeit',
        is_government: true,
        language: 'DE'
      }));
      allJobs.push(...germanyJobs);
      successCount++;
      console.log(`✅ Germany: ${germanyJobs.length} jobs`);
    }
  } catch (err) {
    console.log(`❌ Germany failed: ${err.message}`);
  }
  
  // Cache results
  cache = { data: allJobs, timestamp: Date.now() };
  
  console.log(`🎯 TOTAL: ${allJobs.length} jobs from ${successCount} sources`);
  
  res.status(200).setHeader('Access-Control-Allow-Origin', '*').json({
    success: true,
    count: allJobs.length,
    sources: successCount,
    jobs: allJobs
  });
}
