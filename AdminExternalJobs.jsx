// Replace the existing fetchExternalJobs function with:
async function fetchExternalJobs() {
    setFetching(true);
    toast.loading('Fetching jobs from government portals...', { id: 'fetch-jobs' });
    
    try {
        // Use cached fetch (fast - returns cached data immediately)
        const governmentJobs = await fetchGovernmentJobs();
        
        // Save to database
        const newCount = await saveGovernmentJobsToSupabase(governmentJobs, user?.id);
        
        if (newCount > 0) {
            toast.success(`Fetched ${newCount} new government jobs`, { id: 'fetch-jobs' });
        } else {
            toast.info('No new jobs found. Cache is fresh!', { id: 'fetch-jobs' });
        }
        
        await loadJobs();
        await loadStats();
        
    } catch (err) {
        console.error('Fetch error:', err);
        toast.error('Failed to fetch jobs', { id: 'fetch-jobs' });
    } finally {
        setFetching(false);
    }
}

// Optional: Add a force refresh button
async function forceRefreshJobs() {
    setFetching(true);
    toast.loading('Force refreshing government jobs...', { id: 'force-refresh' });
    
    try {
        // Force ignore cache
        const governmentJobs = await refreshGovernmentJobs();
        const newCount = await saveGovernmentJobsToSupabase(governmentJobs, user?.id);
        
        toast.success(`Refreshed ${governmentJobs.length} jobs (${newCount} new)`, { id: 'force-refresh' });
        await loadJobs();
        await loadStats();
    } catch (err) {
        toast.error('Force refresh failed', { id: 'force-refresh' });
    } finally {
        setFetching(false);
    }
}
