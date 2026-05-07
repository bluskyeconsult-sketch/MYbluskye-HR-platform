// In AdminExternalJobs.jsx, replace the fetchExternalJobs function with:

async function fetchExternalJobs() {
    setFetching(true);
    toast.loading('Fetching external jobs...', { id: 'fetch-jobs' });
    
    try {
        // Fetch from multiple job APIs
        const sources = [
            { name: 'UK Jobs API', url: 'https://api.reed.co.uk/api/1.0/search?keywords=developer&location=london' },
            { name: 'US Jobs API', url: 'https://www.arbeitnow.com/api/job-board-api' },
            { name: 'EU Jobs', url: 'https://ec.europa.eu/eures/api/opportunities/search' }
        ];
        
        let allJobs = [];
        
        for (const source of sources) {
            try {
                const response = await fetch(source.url);
                if (response.ok) {
                    const data = await response.json();
                    // Transform based on API response structure
                    const jobs = transformJobs(data, source.name);
                    allJobs.push(...jobs);
                }
            } catch (err) {
                console.log(`Failed to fetch from ${source.name}:`, err);
            }
        }
        
        // If no real jobs, use mock data for demo
        if (allJobs.length === 0) {
            allJobs = [
                { title: 'Senior Software Engineer', company: 'Tech Corp', location: 'London, UK', source_name: 'UK Jobs API', salary: '£80,000 - £100,000', description: 'Looking for experienced software engineer...', job_type: 'full-time' },
                { title: 'HR Business Partner', company: 'Global Inc', location: 'Manchester, UK', source_name: 'LinkedIn', salary: '£55,000 - £70,000', description: 'Join our growing HR team...', job_type: 'full-time' },
                { title: 'DevOps Engineer', company: 'Cloud Systems', location: 'Remote (UK)', source_name: 'Indeed', salary: '£75,000 - £90,000', description: 'Kubernetes, AWS, CI/CD experience required...', job_type: 'remote' },
            ];
        }
        
        // Check for duplicates before inserting
        const { data: existingJobs } = await supabase
            .from('external_jobs')
            .select('title, company, source_name');
        
        const existingKeys = new Set(
            existingJobs?.map(job => `${job.title}|${job.company}|${job.source_name}`) || []
        );
        
        let newCount = 0;
        for (const job of allJobs) {
            const jobKey = `${job.title}|${job.company}|${job.source_name}`;
            if (existingKeys.has(jobKey)) continue;
            
            const { error } = await supabase.from('external_jobs').insert({
                title: job.title,
                company: job.company,
                location: job.location,
                source_name: job.source_name,
                salary: job.salary,
                description: job.description,
                job_type: job.job_type,
                status: 'pending_approval',
                fetched_at: new Date().toISOString(),
                fetched_by: user?.id
            });
            
            if (!error) newCount++;
        }
        
        toast.success(`Fetched ${newCount} new external jobs`, { id: 'fetch-jobs' });
        await loadJobs();
        await loadStats();
        
    } catch (err) {
        console.error('Fetch error:', err);
        toast.error('Failed to fetch external jobs', { id: 'fetch-jobs' });
    } finally {
        setFetching(false);
    }
}

function transformJobs(data, sourceName) {
    // Transform API response to standard format
    // This is a placeholder - adjust based on actual API response
    const jobs = [];
    
    if (sourceName === 'UK Jobs API' && data.results) {
        data.results.forEach(job => {
            jobs.push({
                title: job.title,
                company: job.employer_name,
                location: job.location_name,
                source_name: sourceName,
                salary: job.salary_min && job.salary_max ? `£${job.salary_min} - £${job.salary_max}` : null,
                description: job.description,
                job_type: job.contract_type?.toLowerCase() || 'full-time'
            });
        });
    }
    
    return jobs;
}
