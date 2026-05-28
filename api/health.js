// api/health.js - Complete system health check
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const results = {
        timestamp: new Date().toISOString(),
        services: {}
    };
    
    // 1. Test Supabase Database
    const dbStart = Date.now();
    try {
        const { data, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        results.services.database = {
            status: !error ? 'healthy' : 'unhealthy',
            responseTime: Date.now() - dbStart,
            error: error?.message || null
        };
    } catch (err) {
        results.services.database = { status: 'error', responseTime: Date.now() - dbStart, error: err.message };
    }
    
    // 2. Test Auth Service
    const authStart = Date.now();
    try {
        const { error } = await supabase.auth.getSession();
        results.services.auth = {
            status: !error ? 'healthy' : 'unhealthy',
            responseTime: Date.now() - authStart,
            error: error?.message || null
        };
    } catch (err) {
        results.services.auth = { status: 'error', responseTime: Date.now() - authStart, error: err.message };
    }
    
    // 3. Test OpenAI (optional)
    const openaiKey = process.env.VITE_OPENAI_API_KEY;
    results.services.openai = {
        status: openaiKey ? 'configured' : 'missing',
        responseTime: 0,
        error: openaiKey ? null : 'API key not configured'
    };
    
    // 4. Overall status
    const isHealthy = Object.values(results.services).every(s => s.status === 'healthy' || s.status === 'configured');
    
    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        ...results
    });
}
