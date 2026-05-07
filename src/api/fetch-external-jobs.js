// For Vercel serverless function
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Fetch from multiple job boards
        const sources = [
            { name: 'Adzuna', url: `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_API_KEY}&results_per_page=20` },
            { name: 'Reed', url: `https://www.reed.co.uk/api/1.0/search?keywords=developer&location=london&resultsToTake=20` }
        ];
        
        const jobs = [];
        
        for (const source of sources) {
            try {
                const response = await fetch(source.url);
                if (response.ok) {
                    const data = await response.json();
                    jobs.push(...processJobs(data, source.name));
                }
            } catch (err) {
                console.error(`Error fetching from ${source.name}:`, err);
            }
        }
        
        // Store in database
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        
        for (const job of jobs) {
            await supabase.from('external_jobs').upsert({
                ...job,
                fetched_at: new Date().toISOString()
            }, { onConflict: 'external_id' });
        }
        
        res.status(200).json({ success: true, count: jobs.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
