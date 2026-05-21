// api/index.js - Consolidated API with cron handling

export default async function handler(req, res) {
    const { cron, action } = req.query;
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Handle cron job (only once per day at 2 AM)
    if (cron === 'fetch-jobs') {
        console.log('🕐 Cron job triggered at:', new Date().toISOString());
        
        try {
            const { fetchExternalJobs } = await import('../src/services/rssJobService.js');
            const result = await fetchExternalJobs(false); // false = respect rate limits
            
            return res.status(200).json({
                success: true,
                message: `Cron job completed. Added ${result.totalAdded} new jobs.`,
                ...result
            });
        } catch (error) {
            console.error('Cron job failed:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    // Handle other API routes here...
    // ... rest of your API handler
}
