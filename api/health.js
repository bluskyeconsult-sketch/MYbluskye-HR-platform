// api/health.js - CONSOLIDATED HEALTH + IP + SYSTEM INFO
// Replaces: api/get-ip.js, api/index.js
// Provides: health monitoring, IP geolocation, system diagnostics, uptime tracking, email/OpenAI tests

export default async function handler(req, res) {
    // Enable CORS for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const action = req.query.action || req.body?.action || 'info';
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
            const { error, count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .limit(1);
            
            results.services.database = {
                status: !error ? 'healthy' : 'degraded',
                responseTime: Date.now() - dbStart,
                details: !error ? `Connected • ${count?.toLocaleString() || 0} users` : error.message,
                error: error?.message || null
            };
            if (error) results.status = 'degraded';
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
        
        // 4. Test OpenAI API (actual call)
        const openaiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        const openaiStart = Date.now();
        
        if (!openaiKey) {
            results.services.openai = {
                status: 'degraded',
                responseTime: 0,
                details: 'API key missing - AI features disabled',
                hasKey: false
            };
            results.status = 'degraded';
        } else {
            try {
                const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openaiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: 'Health check OK' }],
                        max_tokens: 5
                    })
                });
                
                const isHealthy = openaiResponse.ok;
                results.services.openai = {
                    status: isHealthy ? 'healthy' : 'degraded',
                    responseTime: Date.now() - openaiStart,
                    details: isHealthy ? 'API responsive' : `HTTP ${openaiResponse.status}`,
                    hasKey: true
                };
                if (!isHealthy) results.status = 'degraded';
            } catch (err) {
                results.services.openai = {
                    status: 'degraded',
                    responseTime: Date.now() - openaiStart,
                    details: err.message,
                    hasKey: true,
                    error: err.message
                };
                results.status = 'degraded';
            }
        }
        
        // 5. Test Email Service (SMTP connection)
        const emailUser = process.env.VITE_EMAIL_USER;
        const emailPass = process.env.VITE_EMAIL_PASS;
        const smtpHost = process.env.VITE_SMTP_HOST || 'smtp.hostinger.com';
        const hasEmailConfig = !!(emailUser && emailPass);
        
        if (!hasEmailConfig) {
            results.services.email = {
                status: 'degraded',
                responseTime: 0,
                details: 'SMTP credentials missing',
                hasConfig: false
            };
            results.status = 'degraded';
        } else {
            const emailStart = Date.now();
            try {
                const nodemailer = await import('nodemailer');
                const transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: 465,
                    secure: true,
                    auth: { user: emailUser, pass: emailPass },
                    tls: { rejectUnauthorized: false }
                });
                await transporter.verify();
                results.services.email = {
                    status: 'healthy',
                    responseTime: Date.now() - emailStart,
                    details: `${emailUser} via ${smtpHost}`,
                    hasConfig: true
                };
            } catch (err) {
                results.services.email = {
                    status: 'degraded',
                    responseTime: Date.now() - emailStart,
                    details: err.message,
                    hasConfig: true,
                    error: err.message
                };
                results.status = 'degraded';
            }
        }
        
        // 6. Check Vercel Environment
        results.services.vercel = {
            status: 'healthy',
            responseTime: 0,
            details: `Region: ${process.env.VERCEL_REGION || 'unknown'} • Node: ${process.version}`,
            region: process.env.VERCEL_REGION || null,
            url: process.env.VERCEL_URL || null
        };
        
        // 7. System Resources
        const os = await import('os');
        results.system = {
            nodeVersion: process.version,
            platform: process.platform,
            memoryUsage: process.memoryUsage(),
            cpuCount: os.cpus().length,
            loadAverage: os.loadavg()
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
    // ACTION: Specific Service Check (lightweight)
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
                    result = { 
                        ...result, 
                        status: !error ? 'healthy' : 'degraded', 
                        responseTime: Date.now() - dbStart,
                        error: error?.message || null
                    };
                } catch (err) {
                    result = { 
                        ...result, 
                        status: 'error', 
                        responseTime: Date.now() - dbStart, 
                        error: err.message 
                    };
                }
                break;
                
            case 'auth':
                const authStart = Date.now();
                try {
                    const { error } = await supabase.auth.getSession();
                    result = { 
                        ...result, 
                        status: !error ? 'healthy' : 'degraded', 
                        responseTime: Date.now() - authStart,
                        error: error?.message || null
                    };
                } catch (err) {
                    result = { 
                        ...result, 
                        status: 'error', 
                        responseTime: Date.now() - authStart, 
                        error: err.message 
                    };
                }
                break;
                
            case 'storage':
                const storageStart = Date.now();
                try {
                    const { error } = await supabase.storage.listBuckets();
                    result = { 
                        ...result, 
                        status: !error ? 'healthy' : 'degraded', 
                        responseTime: Date.now() - storageStart,
                        error: error?.message || null
                    };
                } catch (err) {
                    result = { 
                        ...result, 
                        status: 'error', 
                        responseTime: Date.now() - storageStart, 
                        error: err.message 
                    };
                }
                break;
                
            case 'openai':
                const openaiKey = process.env.VITE_OPENAI_API_KEY;
                if (!openaiKey) {
                    result = { ...result, status: 'degraded', hasKey: false, message: 'API key missing' };
                } else {
                    const openaiStart = Date.now();
                    try {
                        const response = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'OK' }], max_tokens: 3 })
                        });
                        result = { 
                            ...result, 
                            status: response.ok ? 'healthy' : 'degraded', 
                            responseTime: Date.now() - openaiStart,
                            hasKey: true
                        };
                    } catch (err) {
                        result = { ...result, status: 'error', responseTime: Date.now() - openaiStart, error: err.message };
                    }
                }
                break;
                
            case 'email':
                const emailUser = process.env.VITE_EMAIL_USER;
                const emailPass = process.env.VITE_EMAIL_PASS;
                if (!emailUser || !emailPass) {
                    result = { ...result, status: 'degraded', hasConfig: false, message: 'SMTP credentials missing' };
                } else {
                    const emailStart = Date.now();
                    try {
                        const nodemailer = await import('nodemailer');
                        const transporter = nodemailer.createTransport({
                            host: process.env.VITE_SMTP_HOST || 'smtp.hostinger.com',
                            port: 465,
                            secure: true,
                            auth: { user: emailUser, pass: emailPass }
                        });
                        await transporter.verify();
                        result = { ...result, status: 'healthy', responseTime: Date.now() - emailStart, hasConfig: true };
                    } catch (err) {
                        result = { ...result, status: 'error', responseTime: Date.now() - emailStart, error: err.message };
                    }
                }
                break;
                
            default:
                return res.status(400).json({ error: `Unknown service: ${service}` });
        }
        
        return res.status(200).json(result);
    }
    
    // ============================================
    // ACTION: Simple Database Check (legacy support)
    // ============================================
    if (action === 'db') {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        const dbStart = Date.now();
        try {
            const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            return res.status(200).json({
                status: !error ? 'healthy' : 'unhealthy',
                responseTime: Date.now() - dbStart,
                error: error?.message || null,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            return res.status(500).json({
                status: 'error',
                responseTime: Date.now() - dbStart,
                error: err.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // ============================================
    // DEFAULT: API Info & Available Endpoints
    // ============================================
    return res.status(200).json({
        name: 'ODUSBABA API',
        version: '2.1.0',
        description: 'Consolidated API for health monitoring, IP detection, and system diagnostics',
        endpoints: {
            info: '/api/health',
            health: '/api/health?action=health',
            ip: '/api/health?action=ip',
            ping: '/api/health?action=ping',
            service: '/api/health?action=service&service=database|auth|storage|openai|email',
            db: '/api/health?action=db'
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
}
