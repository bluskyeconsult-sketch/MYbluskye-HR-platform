// src/services/externalJobService.js - Updated save function

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
    const jobKey = `${job.title}|${job.company}|${job.source_country}`;
    if (existingKeys.has(jobKey)) continue;
    
    // Insert using exact column names from your table
    const { error } = await supabase.from('external_jobs').insert({
      title: job.title,
      company: job.company,
      location: job.location,
      source_country: job.source_country,
      source_name: job.source_name,
      description: job.description,
      salary_range: job.salary_range,
      job_type: job.job_type,
      status: 'pending_approval',
      created_at: new Date().toISOString()
    });
    
    if (!error) newCount++;
  }
  
  console.log(`✅ Saved ${newCount} new external jobs to database`);
  return newCount;
}
