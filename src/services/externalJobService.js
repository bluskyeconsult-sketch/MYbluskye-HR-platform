// src/services/externalJobService.js - Fixed approve function

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
    
    // Map external job to jobs table structure
    const jobData = {
      title: job.title,
      company: job.company,
      location: job.location || 'Remote',
      country_code: job.source_country,
      description: job.description || 'No description provided.',
      salary_range: job.salary_range,
      job_type: job.job_type || 'full-time',
      status: 'approved',
      is_active: true,
      source_type: 'external',
      source_name: job.source_name,
      created_at: new Date().toISOString(),
      posted_at: new Date().toISOString(),
      posted_by: userId
    };
    
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
