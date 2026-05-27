// api/fetch-rss.js
// Vercel serverless function for RSS fetching

import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const parser = new Parser({
    timeout: 30000,
    headers: {
        'User-Agent': 'BluSkye-HR-Platform/1.0'
    }
});

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://www.bluskyeconsult.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url, source, country } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        console.log(`Fetching RSS feed: ${source} - ${url}`);
        
        const feed = await parser.parseURL(url);
        let added = 0;
        const jobs = [];

        for (const item of feed.items.slice(0, 20)) {
            // Check if job already exists
            const { data: existing } = await supabase
                .from('jobs')
                .select('id')
                .eq('title', item.title)
                .eq('source_name', source)
                .maybeSingle();

            if (existing) {
                console.log(`Skipping existing job: ${item.title}`);
                continue;
            }

            // Insert new job
            const jobData = {
                title: item.title?.substring(0, 255) || 'Untitled',
                description: item.contentSnippet?.substring(0, 2000) || item.description?.substring(0, 2000) || '',
                source_name: source,
                source_country: country,
                external_apply_url: item.link,
                posted_date: item.pubDate ? new Date(item.pubDate) : new Date(),
                compliance_status: 'pending',
                status: 'draft',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('jobs')
                .insert(jobData);

            if (error) {
                console.error(`Error inserting job: ${item.title}`, error.message);
            } else {
                added++;
                jobs.push(item.title);
                console.log(`Added job: ${item.title}`);
            }
        }

        console.log(`✅ ${source}: Added ${added} new jobs`);

        return res.status(200).json({
            success: true,
            added,
            total: feed.items.length,
            source,
            jobs
        });
    } catch (error) {
        console.error(`RSS fetch error for ${source}:`, error.message);
        return res.status(500).json({
            success: false,
            error: error.message,
            source
        });
    }
}
