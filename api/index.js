// api/index.js - SINGLE FILE FOR ALL API ACTIONS
// Hobby plan compliant - handles ALL API needs in one Serverless Function

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { action } = req.query;
    const startTime = Date.now();
    
    // ============================================
    // ACTION: IP Geolocation
    // ============================================
    if (action === 'ip') {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
                   req.headers['x-real-ip'] ||
                   req.socket.remoteAddress ||
                   '0.0.0.0';
        const cleanIp = ip.replace(/^::ffff:/, '');
        
        return res.status(200).json({
            success: true,
            ip: cleanIp,
            geolocation: {
                country: req.headers['x-vercel-ip-country'] || null,
                city: req.headers['x-vercel-ip-city'] || null,
                latitude: req.headers['x-vercel-ip-latitude'] || null,
                longitude: req.headers['x-vercel-ip-longitude'] || null
            },
            timestamp: new Date().toISOString()
        });
    }
    
    // ============================================
    // ACTION: Ping
    // ============================================
    if (action === 'ping') {
        return res.status(200).json({
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    }
    
    // ============================================
    // ACTION: Health Check
    // ============================================
    if (action === 'health') {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        const services = {};
        
        // Database check
        const dbStart = Date.now();
        try {
            const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            services.database = { status: !error ? 'healthy' : 'degraded', responseTime: Date.now() - dbStart };
        } catch (err) {
            services.database = { status: 'error', responseTime: Date.now() - dbStart, error: err.message };
        }
        
        // Auth check
        const authStart = Date.now();
        try {
            const { error } = await supabase.auth.getSession();
            services.auth = { status: !error ? 'healthy' : 'degraded', responseTime: Date.now() - authStart };
        } catch (err) {
            services.auth = { status: 'error', responseTime: Date.now() - authStart, error: err.message };
        }
        
        // OpenAI check
        const openaiKey = process.env.VITE_OPENAI_API_KEY;
        services.openai = { status: openaiKey ? 'configured' : 'missing' };
        
        // Email check
        const hasEmail = !!(process.env.VITE_EMAIL_USER && process.env.VITE_EMAIL_PASS);
        services.email = { status: hasEmail ? 'configured' : 'missing' };
        
        return res.status(200).json({
            status: 'operational',
            timestamp: new Date().toISOString(),
            services,
            responseTime: Date.now() - startTime
        });
    }
    
    // ============================================
    // ACTION: Send Email
    // ============================================
    if (action === 'email' && req.method === 'POST') {
        const { to, subject, html } = req.body;
        
        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        try {
            const nodemailer = await import('nodemailer');
            const transporter = nodemailer.createTransport({
                host: process.env.VITE_SMTP_HOST || 'smtp.hostinger.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.VITE_EMAIL_USER,
                    pass: process.env.VITE_EMAIL_PASS
                }
            });
            
            const info = await transporter.sendMail({
                from: `"ODUSBABA" <${process.env.VITE_EMAIL_USER}>`,
                to,
                subject,
                html
            });
            
            return res.status(200).json({ success: true, messageId: info.messageId });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    
    // ============================================
    // ACTION: Chat/AI
    // ============================================
    if (action === 'chat' && req.method === 'POST') {
        const { messages } = req.body;
        const apiKey = process.env.VITE_OPENAI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: messages,
                    max_tokens: 500
                })
            });
            
            const data = await response.json();
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    
    // ============================================
    // ACTION: Fetch Jobs
    // ============================================
    if (action === 'jobs') {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            return res.status(200).json({ success: true, jobs: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    
    // ============================================
    // ACTION: Generate Assessment
    // ============================================
    if (action === 'generate-assessment' && req.method === 'POST') {
        const { topic, difficulty, count = 5 } = req.body;
        const apiKey = process.env.VITE_OPENAI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are an expert test creator. Return only valid JSON.' },
                        { role: 'user', content: `Create ${count} ${difficulty} level questions about "${topic}". Return as JSON array with question, options, correct, explanation.` }
                    ],
                    max_tokens: 2000
                })
            });
            
            const data = await response.json();
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    
    // ============================================
    // ACTION: Generate Course
    // ============================================
    if (action === 'generate-course' && req.method === 'POST') {
        const { topic, level = 'beginner' } = req.body;
        const apiKey = process.env.VITE_OPENAI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are an instructional designer.' },
                        { role: 'user', content: `Create a course outline for "${topic}" at ${level} level. Include modules, lessons, and learning objectives.` }
                    ],
                    max_tokens: 1500
                })
            });
            
            const data = await response.json();
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    
    // ============================================
    // DEFAULT: API Info
    // ============================================
    return res.status(200).json({
        name: 'ODUSBABA API',
        version: '3.0.0',
        description: 'Consolidated API for Hobby Plan',
        endpoints: {
            health: '/api/index?action=health',
            ip: '/api/index?action=ip',
            ping: '/api/index?action=ping',
            email: 'POST /api/index?action=email',
            chat: 'POST /api/index?action=chat',
            jobs: '/api/index?action=jobs',
            assessment: 'POST /api/index?action=generate-assessment',
            course: 'POST /api/index?action=generate-course'
        },
        timestamp: new Date().toISOString()
    });
}
