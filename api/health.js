// api/health.js - CONSOLIDATED HEALTH + IP + SYSTEM INFO
// Replaces: api/get-ip.js, api/index.js
// Adds: health monitoring

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const action = req.query.action || req.body?.action || 'health';
    
    // ============================================
    // ACTION: Get IP Address (replaces get-ip.js)
    // ============================================
    if (action === 'ip') {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
                   req.headers['x-real-ip'] ||
                   req.socket.remoteAddress ||
                   '0.0.0.0';
        const cleanIp = ip.replace(/^::ffff:/, '');
        return res.status(200).json({ ip: cleanIp, timestamp: new Date().toISOString() });
    }
    
    // ============================================
    // ACTION: System Health (new functionality)
    // ============================================
    if (action === 'health') {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
        );
        
        const results = {
            timestamp: new Date().toISOString(),
            services: {}
        };
        
        // Test Database
        const dbStart = Date.now();
        try {
            const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            results.services.database = {
                status: !error ? 'healthy' : 'unhealthy',
                responseTime: Date.now() - dbStart
            };
        } catch (err) {
            results.services.database = { status: 'error', responseTime: Date.now() - dbStart };
        }
        
        // Test Auth
        const authStart = Date.now();
        try {
            const { error } = await supabase.auth.getSession();
            results.services.auth = {
                status: !error ? 'healthy' : 'unhealthy',
                responseTime: Date.now() - authStart
            };
        } catch (err) {
            results.services.auth = { status: 'error', responseTime: Date.now() - authStart };
        }
        
        // OpenAI Status
        results.services.openai = {
            status: process.env.VITE_OPENAI_API_KEY ? 'configured' : 'missing',
            responseTime: 0
        };
        
        return res.status(200).json(results);
    }
    
    // ============================================
    // DEFAULT: API Info (replaces index.js)
    // ============================================
    return res.status(200).json({
        name: 'ODUSBABA API',
        version: '1.0.0',
        endpoints: ['/api/health?action=health', '/api/health?action=ip'],
        timestamp: new Date().toISOString()
    });
}
