// api/health.js - CONSOLIDATED HEALTH + IP + SYSTEM INFO
// Replaces: api/get-ip.js, api/index.js
// Provides: health monitoring, IP geolocation, system diagnostics, uptime tracking

export default async function handler(req, res) {
    // Enable CORS for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const action = req.query.action || req.body?.action || 'health';
    const startTime = Date.now();
    
    // ============================================
    // ACTION: Get IP Address with Geolocation
    // ============================================
    if (action === 'ip') {
        // Get client IP (handles proxy headers)
        const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
                   req.headers['x-real-ip'] ||
                   req.socket.remoteAddress ||
                   '0.0.0.0';
        const cleanIp = ip.replace(/^::ffff:/, '');
        
        // Get Vercel geolocation data (if available)
        const geoData = {
            country: req.headers['x-vercel-ip-country'] || null,
            countryRegion: req.headers['x-vercel-ip-country-region'] || null,
            region: req.headers['x-vercel-ip-region'] || null,
            city: req.headers['x-vercel-ip-city'] || null,
            latitude: req.headers['x-vercel-ip-latitude'] || null,
            longitude: req.headers['x-vercel-ip-longitude'] || null,
            timezone: req.headers['x-vercel-ip-timezone'] || null
        };
        
        // Get user agent and device info
        const userAgent = req.headers['user-agent'] || null;
        
        return res.status(200).json({
            success: true,
            ip: cleanIp,
            geolocation: geoData,
            userAgent: userAgent,
            timestamp: new Date().toISOString()
        });
    }
    
    // ============================================
    // ACTION: System Health (Comprehensive)
    // ============================================
    if (action === 'health') {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
        );
        
        const results = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'production',
            services: {},
            responseTime: 0
        };
        
        // 1. Test Supabase Database
        const dbStart = Date.now();
        try {
            const { data, error, count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .limit(1);
            
            results.services.database = {
                status: !error ? 'healthy' : 'degraded',
                responseTime: Date.now() - dbStart,
                details: !error ? `Connected • ${count?.toLocaleString() || 0} users` : error.message,
                error: error?.message || null
            };
        } catch (err) {
            results.services.database = { 
                status: 'critical', 
                responseTime: Date.now() - dbStart, 
                details: err.message,
                error: err.message
            };
            results.status = 'degraded';
        }
        
        // 2. Test Supabase Auth
        const authStart = Date.now();
        try {
            const { error } = await supabase.auth.getSession();
            results.services.auth = {
                status: !error ? 'healthy' : 'degraded',
                responseTime: Date.now() - authStart,
                details: !error ? 'Authentication service operational' : error.message
            };
            if (error) results.status = 'degraded';
        } catch (err) {
            results.services.auth = { 
                status: 'critical', 
                responseTime: Date.now() - authStart, 
                details: err.message 
            };
            results.status = 'degraded';
        }
        
        // 3. Test Supabase Storage
        const storageStart = Date.now();
        try {
            const { data: buckets, error } = await supabase.storage.listBuckets();
            results.services.storage = {
                status: !error ? 'healthy' : 'degraded',
                responseTime: Date.now() - storageStart,
                details: !error ? `${buckets?.length || 0} buckets available` : error.message,
                bucketCount: buckets?.length || 0
            };
            if (error) results.status = 'degraded';
        } catch (err) {
            results.services.storage = { 
                status: 'critical', 
                responseTime: Date.now() - storageStart, 
                details: err.message 
            };
            results.status = 'degraded';
        }
        
        // 4. Check OpenAI Configuration
        const openaiKey = process.env.VITE_OPENAI_API_KEY;
        results.services.openai = {
            status: openaiKey ? 'healthy' : 'degraded',
            responseTime: 0,
            details: openaiKey ? `Key configured (${openaiKey.slice(0, 8)}...)` : 'API key missing - AI features disabled',
            hasKey: !!openaiKey
        };
        if (!openaiKey) results.status = 'degraded';
        
        // 5. Check Email Configuration
        const smtpHost = process.env.VITE_SMTP_HOST;
        const emailUser = process.env.VITE_EMAIL_USER;
        const hasEmailConfig = !!(smtpHost && emailUser);
        results.services.email = {
            status: hasEmailConfig ? 'healthy' : 'degraded',
            responseTime: 0,
            details: hasEmailConfig ? `${emailUser} via ${smtpHost}` : 'SMTP credentials missing',
            hasConfig: hasEmailConfig
        };
        if (!hasEmailConfig) results.status = 'degraded';
        
        // 6. Check Vercel Environment
        results.services.vercel = {
            status: 'healthy',
            responseTime: 0,
            details: `Region: ${process.env.VERCEL_REGION || 'unknown'} • Runtime: Node.js`,
            region: process.env.VERCEL_REGION || null,
            url: process.env.VERCEL_URL || null
        };
        
        // 7. System Resources
        results.system = {
            nodeVersion: process.version,
            platform: process.platform,
            memoryUsage: process.memoryUsage(),
            cpuCount: require('os').cpus().length
        };
        
        results.responseTime = Date.now() - startTime;
        
        // Determine overall status
        const servicesList = Object.values(results.services);
        const hasCritical = servicesList.some(s => s.status === 'critical');
        const hasDegraded = servicesList.some(s => s.status === 'degraded');
        
        if (hasCritical) {
            results.status = 'critical';
        } else if (hasDegraded) {
            results.status = 'degraded';
        } else {
            results.status = 'healthy';
        }
        
        return res.status(200).json(results);
    }
    
    // ============================================
    // ACTION: Quick Ping (Lightweight check)
    // ============================================
    if (action === 'ping') {
        return res.status(200).json({
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    }
    
    // ============================================
    // ACTION: Service Details (Specific service check)
    // ============================================
    if (action === 'service' && req.query.service) {
        const service = req.query.service;
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        let result = { service, timestamp: new Date().toISOString() };
        
        switch (service) {
            case 'database':
                const dbStart = Date.now();
                try {
                    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
                    result = { ...result, status: !error ? 'healthy' : 'degraded', responseTime: Date.now() - dbStart };
                } catch (err) {
                    result = { ...result, status: 'error', responseTime: Date.now() - dbStart, error: err.message };
                }
                break;
                
            case 'openai':
                result = { 
                    ...result, 
                    status: process.env.VITE_OPENAI_API_KEY ? 'healthy' : 'degraded',
                    hasKey: !!process.env.VITE_OPENAI_API_KEY
                };
                break;
                
            case 'email':
                result = {
                    ...result,
                    status: (process.env.VITE_SMTP_HOST && process.env.VITE_EMAIL_USER) ? 'healthy' : 'degraded',
                    hasConfig: !!(process.env.VITE_SMTP_HOST && process.env.VITE_EMAIL_USER)
                };
                break;
                
            default:
                return res.status(400).json({ error: `Unknown service: ${service}` });
        }
        
        return res.status(200).json(result);
    }
    
    // ============================================
    // DEFAULT: API Info & Available Endpoints
    // ============================================
    return res.status(200).json({
        name: 'ODUSBABA API',
        version: '2.0.0',
        description: 'Consolidated API for health monitoring, IP detection, and system diagnostics',
        endpoints: {
            health: '/api/health?action=health',
            ip: '/api/health?action=ip',
            ping: '/api/health?action=ping',
            service: '/api/health?action=service&service=database|openai|email'
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
}
