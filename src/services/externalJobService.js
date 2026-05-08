// Replace the approveExternalJob function with this simplified version

export async function approveExternalJob(jobId, userId) {
  try {
    // Get the external job
    const { data: job, error: fetchError } = await supabase
      .from('external_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (fetchError) throw fetchError;
    
    console.log('Approving job:', job.title);
    console.log('Job data:', job);
    
    // Try insert with ONLY basic fields first
    const jobData = {
      title: job.title,
      company: job.company,
      location: job.location || 'Remote',
      description: job.description || 'No description provided.',
      status: 'approved',
      created_at: new Date().toISOString()
    };
    
    // Add optional fields only if they exist in the job object
    if (job.source_country) jobData.country_code = job.source_country;
    if (job.salary_range) jobData.salary_range = job.salary_range;
    if (job.job_type) jobData.job_type = job.job_type;
    
    console.log('Inserting into jobs:', jobData);
    
    const { error: insertError } = await supabase
      .from('jobs')
      .insert(jobData);
    
    if (insertError) {
      console.error('Insert error details:', insertError);
      throw insertError;
    }
    
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
    
    console.log('✅ Job approved successfully:', job.title);
    return { success: true };
    
  } catch (err) {
    console.error('Approve error details:', err);
    return { success: false, error: err.message };
  }
}
