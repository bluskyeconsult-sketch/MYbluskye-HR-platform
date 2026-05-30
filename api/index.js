// api/index.js - COMPLETE CONSOLIDATED API FOR HOBBY PLAN
// Handles: Health, IP, Email, Jobs (8+ countries), AI Chat, Assessment Generation, Course Generation, 
// Books, Articles, Newsletter, Testers, User Stats, Applications, Profile Updates, Database Checks
// ONE FILE - ALL FUNCTIONALITY

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

const ALLOWED_EMAIL_TYPES = [
    'contact', 'newsletter', 'newsletter_welcome', 'notification', 'tester_welcome', 
    'assessment_report', 'welcome', 'password_reset', 'job_alert', 'test'
];

const rateLimit = new Map();

function checkRateLimit(email, type) {
    const key = `${email}:${type}`;
    const now = Date.now();
    const lastSent = rateLimit.get(key);
    if (lastSent && (now - lastSent) < 60000) return false;
    rateLimit.set(key, now);
    return true;
}

function isValidEmail(email) {
    return /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(email);
}

function extractTag(xml, tag) {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

async function safeFetch(url, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (err) {
        clearTimeout(timeoutId);
        throw new Error(`Fetch failed: ${err.message}`);
    }
}

function getSupabase() {
    return createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );
}

function getTransporter() {
    return nodemailer.createTransport({
        host: process.env.VITE_SMTP_HOST || 'smtp.hostinger.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.VITE_EMAIL_USER,
            pass: process.env.VITE_EMAIL_PASS
        },
        tls: { rejectUnauthorized: false }
    });
}

// ============================================
// EMAIL TEMPLATES
// ============================================

const emailTemplates = {
    contact: (data) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">New Contact Message</h1>
        <p><strong>From:</strong> ${data.name} (${data.email})</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <div style="background-color: #1e293b; padding: 16px; border-radius: 8px;">
            <p>${data.message?.replace(/\n/g, '<br>')}</p>
        </div>
    </div>
</body></html>`,

    newsletter_welcome: (data) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">Welcome to ODUSBABA Newsletter!</h1>
        <p>Hello ${data.name || 'there'},</p>
        <p>Thank you for subscribing! You'll receive weekly insights on job opportunities, career tips, and industry trends.</p>
        <a href="https://www.bluskyeconsult.com" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px;">Visit ODUSBABA →</a>
    </div>
</body></html>`,

    tester_welcome: (data) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">Welcome to the Tester Program!</h1>
        <p>Hello ${data.name},</p>
        <p>You have <strong>${data.uses || 10} free uses</strong> for <strong>${data.days || 30} days</strong>.</p>
        <a href="https://www.bluskyeconsult.com/tester/dashboard" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px;">Go to Dashboard →</a>
    </div>
</body></html>`,

    test: () => `<h1>✅ Email Test Successful!</h1><p>Your email system is working.</p>`
};

// ============================================
// JOB FETCHING (8+ Countries)
// ============================================

async function fetchAllJobs() {
    const timeout = 10000;
    let allJobs = [];
    const errors = [];

    // UK Civil Service
    try {
        const response = await safeFetch('https://www.civilservicejobs.service.gov.uk/csr/index.cgi?action=feed.homesite&language=en', timeout);
        const text = await response.text();
        const matches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        const jobs = matches.slice(0, 5).map(item => ({
            title: extractTag(item, 'title'),
            company: 'UK Civil Service',
            location: 'United Kingdom',
            source_country: 'GB',
            source_name: 'Civil Service Jobs',
            description: extractTag(item, 'description')?.substring(0, 500) || '',
            salary_range: 'Civil Service Pay Scale',
            job_type: 'full_time',
            external_url: extractTag(item, 'link') || '',
            sponsorship_eligible: false
        }));
        allJobs.push(...jobs);
    } catch (err) { errors.push({ source: 'UK Civil Service', error: err.message }); }

    // NHS Jobs
    try {
        const response = await safeFetch('https://www.jobs.nhs.uk/feeds/jobs.xml', timeout);
        const text = await response.text();
        const matches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        const jobs = matches.slice(0, 5).map(item => ({
            title: extractTag(item, 'title'),
            company: 'NHS',
            location: 'United Kingdom',
            source_country: 'GB',
            source_name: 'NHS Jobs',
            description: extractTag(item, 'description')?.substring(0, 500) || '',
            salary_range: 'NHS Pay Scale',
            job_type: 'full_time',
            external_url: extractTag(item, 'link') || '',
            sponsorship_eligible: false
        }));
        allJobs.push(...jobs);
    } catch (err) { errors.push({ source: 'NHS', error: err.message }); }

    // USAJobs
    try {
        const response = await safeFetch('https://www.usajobs.gov/jobs/feed/rss?Number=10', timeout);
        const text = await response.text();
        const matches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        const jobs = matches.slice(0, 5).map(item => ({
            title: extractTag(item, 'title'),
            company: 'U.S. Federal Government',
            location: 'United States',
            source_country: 'US',
            source_name: 'USAJobs.gov',
            description: extractTag(item, 'description')?.substring(0, 500) || '',
            salary_range: 'Federal Pay Scale',
            job_type: 'full_time',
            external_url: extractTag(item, 'link') || '',
            sponsorship_eligible: true
        }));
        allJobs.push(...jobs);
    } catch (err) { errors.push({ source: 'USAJobs', error: err.message }); }

    // Canada GC Jobs
    try {
        const response = await safeFetch('https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/v1/announcements?language=en&page=1&count=10', timeout);
        const data = await response.json();
        if (data?.data) {
            const jobs = data.data.slice(0, 5).map(job => ({
                title: job.jobTitle?.en || 'Government of Canada Position',
                company: job.departmentName?.en || 'Government of Canada',
                location: `${job.city?.en || 'Ottawa'}, Canada`,
                source_country: 'CA',
                source_name: 'GC Jobs Canada',
                description: job.jobSummary?.en?.substring(0, 500) || '',
                salary_range: job.salaryRange || 'Competitive',
                job_type: 'full_time',
                external_url: job.jobLink || '',
                sponsorship_eligible: true
            }));
            allJobs.push(...jobs);
        }
    } catch (err) { errors.push({ source: 'Canada GC Jobs', error: err.message }); }

    // Australia APS Jobs
    try {
        const response = await safeFetch('https://www.apsjobs.gov.au/api/v1/jobs?limit=10&offset=0', timeout);
        const data = await response.json();
        if (data?.data) {
            const jobs = data.data.slice(0, 5).map(job => ({
                title: job.title || 'Australian Public Service Position',
                company: job.agencyName || 'Australian Public Service',
                location: `${job.location || 'Canberra'}, Australia`,
                source_country: 'AU',
                source_name: 'APS Jobs Australia',
                description: job.jobDescription?.substring(0, 500) || '',
                salary_range: job.salaryRange || 'Competitive',
                job_type: 'full_time',
                external_url: job.applicationUrl || '',
                sponsorship_eligible: true
            }));
            allJobs.push(...jobs);
        }
    } catch (err) { errors.push({ source: 'Australia APS', error: err.message }); }

    // Ireland
    try {
        const response = await safeFetch('https://www.publicjobs.ie/rss', timeout);
        const text = await response.text();
        const matches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        const jobs = matches.slice(0, 5).map(item => ({
            title: extractTag(item, 'title'),
            company: 'Public Jobs Ireland',
            location: 'Ireland',
            source_country: 'IE',
            source_name: 'Public Jobs Ireland',
            description: extractTag(item, 'description')?.substring(0, 500) || '',
            salary_range: 'Public Sector Scale',
            job_type: 'full_time',
            external_url: extractTag(item, 'link') || '',
            sponsorship_eligible: false
        }));
        allJobs.push(...jobs);
    } catch (err) { errors.push({ source: 'Ireland', error: err.message }); }

    // Germany
    try {
        const response = await safeFetch('https://www.bund.de/rss/jobs', timeout);
        const text = await response.text();
        const matches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        const jobs = matches.slice(0, 5).map(item => ({
            title: extractTag(item, 'title'),
            company: 'Bund.de',
            location: 'Germany',
            source_country: 'DE',
            source_name: 'Bund.de',
            description: extractTag(item, 'description')?.substring(0, 500) || '',
            salary_range: 'TVöD Scale',
            job_type: 'full_time',
            external_url: extractTag(item, 'link') || '',
            sponsorship_eligible: true
        }));
        allJobs.push(...jobs);
    } catch (err) { errors.push({ source: 'Germany', error: err.message }); }

    // Nigeria Fallback
    allJobs.push(
        { title: 'Civil Service Officer', company: 'Federal Civil Service', location: 'Abuja, Nigeria', source_country: 'NG', source_name: 'Federal Civil Service', description: 'Join the Federal Civil Service.', salary_range: '₦3,500,000 - ₦5,000,000', job_type: 'full_time', external_url: '', sponsorship_eligible: false },
        { title: 'Remote Software Engineer', company: 'Global Tech', location: 'Remote', source_country: 'Global', source_name: 'Remote Jobs', description: 'Full-stack development.', salary_range: '$60,000 - $90,000', job_type: 'remote', external_url: '', sponsorship_eligible: false }
    );

    // Remove duplicates
    const uniqueJobs = [];
    const seen = new Set();
    for (const job of allJobs) {
        const key = `${job.title}-${job.company}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueJobs.push(job);
        }
    }

    return { jobs: uniqueJobs, errors, total: uniqueJobs.length };
}

// ============================================
// AI HELPERS
// ============================================

async function callOpenAI(messages, maxTokens = 800) {
    const apiKey = process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: maxTokens })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action } = req.query;
    const startTime = Date.now();

    // ============================================
    // IP GEOLOCATION
    // ============================================
    if (action === 'ip') {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
                   req.headers['x-real-ip'] ||
                   req.socket.remoteAddress ||
                   '0.0.0.0';
        return res.status(200).json({
            success: true,
            ip: ip.replace(/^::ffff:/, ''),
            geolocation: {
                country: req.headers['x-vercel-ip-country'] || null,
                city: req.headers['x-vercel-ip-city'] || null
            },
            timestamp: new Date().toISOString()
        });
    }

    // ============================================
    // PING
    // ============================================
    if (action === 'ping') {
        return res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
    }

    // ============================================
    // HEALTH CHECK
    // ============================================
    if (action === 'health') {
        const supabase = getSupabase();
        const services = {};

        try {
            const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            services.database = { status: !error ? 'healthy' : 'degraded' };
        } catch (err) { services.database = { status: 'error' }; }

        try {
            const { error } = await supabase.auth.getSession();
            services.auth = { status: !error ? 'healthy' : 'degraded' };
        } catch (err) { services.auth = { status: 'error' }; }

        services.openai = { status: process.env.VITE_OPENAI_API_KEY ? 'configured' : 'missing' };
        services.email = { status: process.env.VITE_EMAIL_USER ? 'configured' : 'missing' };

        return res.status(200).json({
            status: 'operational',
            timestamp: new Date().toISOString(),
            services,
            responseTime: Date.now() - startTime
        });
    }

    // ============================================
    // SEND EMAIL
    // ============================================
    if (action === 'email' && req.method === 'POST') {
        const { to, subject, html, type, templateData } = req.body;

        if (!to || !isValidEmail(to)) return res.status(400).json({ error: 'Invalid email' });
        if (!checkRateLimit(to, type || 'general')) return res.status(429).json({ error: 'Too many requests' });

        try {
            let emailHtml = html;
            let emailSubject = subject;

            if (!emailHtml && type && emailTemplates[type]) {
                emailHtml = emailTemplates[type](templateData || {});
                emailSubject = subject || 'ODUSBABA Notification';
            }

            if (!emailHtml) return res.status(400).json({ error: 'Missing content' });

            const transporter = getTransporter();
            await transporter.verify();

            const info = await transporter.sendMail({
                from: `"ODUSBABA" <${process.env.VITE_EMAIL_USER}>`,
                to,
                subject: emailSubject,
                html: emailHtml
            });

            return res.status(200).json({ success: true, messageId: info.messageId });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // FETCH JOBS
    // ============================================
    if (action === 'jobs') {
        const result = await fetchAllJobs();
        return res.status(200).json({
            success: true,
            count: result.total,
            jobs: result.jobs,
            timestamp: new Date().toISOString()
        });
    }

    // ============================================
    // AI CHAT
    // ============================================
    if (action === 'chat' && req.method === 'POST') {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid format' });

        try {
            const data = await callOpenAI(messages);
            return res.status(200).json({ success: true, content: data.choices[0].message.content });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // GENERATE ASSESSMENT
    // ============================================
    if (action === 'generate-assessment' && req.method === 'POST') {
        const { topic, difficulty, count = 5 } = req.body;
        if (!topic) return res.status(400).json({ error: 'Topic required' });

        try {
            const data = await callOpenAI([
                { role: 'system', content: 'Return only valid JSON.' },
                { role: 'user', content: `Create ${count} ${difficulty || 'intermediate'} questions about "${topic}". Return JSON array with: question, options (array), correct (0-3).` }
            ], 2000);

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

            return res.status(200).json({ success: true, questions });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // GENERATE COURSE
    // ============================================
    if (action === 'generate-course' && req.method === 'POST') {
        const { topic, level = 'beginner' } = req.body;
        if (!topic) return res.status(400).json({ error: 'Topic required' });

        try {
            const data = await callOpenAI([
                { role: 'system', content: 'You are an instructional designer.' },
                { role: 'user', content: `Create a course outline for "${topic}" at ${level} level. Include title, description, modules, duration.` }
            ], 1500);

            return res.status(200).json({ success: true, outline: data.choices[0].message.content });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // BOOKS LIST
    // ============================================
    if (action === 'books-list') {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase.from('books').select('*').eq('is_published', true).order('created_at', { ascending: false });
            if (error) throw error;
            return res.status(200).json({ success: true, books: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ARTICLES LIST
    // ============================================
    if (action === 'articles-list') {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase.from('articles').select('*').eq('is_published', true).order('published_at', { ascending: false });
            if (error) throw error;
            return res.status(200).json({ success: true, articles: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // SINGLE ARTICLE
    // ============================================
    if (action === 'article') {
        const { slug, id } = req.query;
        try {
            const supabase = getSupabase();
            let query = supabase.from('articles').select('*');
            if (slug) query = query.eq('slug', slug);
            if (id) query = query.eq('id', id);
            const { data, error } = await query.single();
            if (error) throw error;
            return res.status(200).json({ success: true, article: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // NEWSLETTER SUBSCRIBE
    // ============================================
    if (action === 'newsletter-subscribe' && req.method === 'POST') {
        const { email, name } = req.body;
        if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });

        try {
            const supabase = getSupabase();
            const { error } = await supabase.from('newsletter_subscribers').upsert({
                email, name: name || null, subscribed_at: new Date().toISOString(), status: 'active'
            });
            if (error && error.code !== '23505') throw error;

            fetch(`${process.env.VERCEL_URL || 'https://www.bluskyeconsult.com'}/api/index?action=email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: email, type: 'newsletter_welcome', templateData: { name: name || 'there' } })
            }).catch(() => {});

            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // TESTER CREATE
    // ============================================
    if (action === 'tester-create' && req.method === 'POST') {
        const { email, name, uses = 10, days = 30 } = req.body;
        if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });

        try {
            const supabase = getSupabase();
            const { data, error } = await supabase.from('testers').insert({
                email, name: name || email.split('@')[0], remaining_uses: uses, total_uses: uses,
                expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(), status: 'active'
            }).select().single();

            if (error) throw error;

            fetch(`${process.env.VERCEL_URL || 'https://www.bluskyeconsult.com'}/api/index?action=email`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: email, type: 'tester_welcome', templateData: { name: name || email.split('@')[0], uses, days } })
            }).catch(() => {});

            return res.status(200).json({ success: true, tester: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // USER STATS
    // ============================================
    if (action === 'user-stats') {
        const authHeader = req.headers.authorization;
        try {
            const supabase = getSupabase();
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            if (userError || !user) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const [applications, savedJobs, courses, assessments] = await Promise.all([
                supabase.from('job_applications').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabase.from('saved_jobs').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabase.from('course_enrollments').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabase.from('user_assessments').select('id', { count: 'exact' }).eq('user_id', user.id)
            ]);

            return res.status(200).json({
                success: true,
                stats: {
                    applications: applications.count || 0,
                    savedJobs: savedJobs.count || 0,
                    coursesEnrolled: courses.count || 0,
                    assessmentsCompleted: assessments.count || 0
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // USER APPLICATIONS
    // ============================================
    if (action === 'user-applications') {
        const authHeader = req.headers.authorization;
        try {
            const supabase = getSupabase();
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            if (userError || !user) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const { data, error } = await supabase.from('job_applications').select('*, jobs(*)').eq('user_id', user.id).order('created_at', { ascending: false });
            if (error) throw error;

            return res.status(200).json({ success: true, applications: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // USER PROFILE UPDATE
    // ============================================
    if (action === 'user-update' && req.method === 'POST') {
        const authHeader = req.headers.authorization;
        const { full_name, phone, job_title, years_experience, linkedin_url, github_url, email_notifications, location, bio } = req.body;

        try {
            const supabase = getSupabase();
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            if (userError || !user) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const { error } = await supabase.from('profiles').update({
                full_name, phone, job_title, years_experience, linkedin_url, github_url, email_notifications, location, bio,
                updated_at: new Date().toISOString()
            }).eq('id', user.id);

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // DATABASE CHECK (Legacy)
    // ============================================
    if (action === 'db') {
        const supabase = getSupabase();
        const dbStart = Date.now();
        try {
            const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            return res.status(200).json({
                status: !error ? 'healthy' : 'unhealthy',
                responseTime: Date.now() - dbStart,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            return res.status(500).json({ status: 'error', responseTime: Date.now() - dbStart, error: err.message });
        }
    }

    // ============================================
    // DEFAULT: API Info
    // ============================================
    return res.status(200).json({
        name: 'ODUSBABA API',
        version: '3.0.0',
        description: 'Consolidated API - Complete Site Functionality',
        endpoints: {
            health: '/api/index?action=health',
            ip: '/api/index?action=ip',
            ping: '/api/index?action=ping',
            email: 'POST /api/index?action=email',
            chat: 'POST /api/index?action=chat',
            jobs: '/api/index?action=jobs',
            assessment: 'POST /api/index?action=generate-assessment',
            course: 'POST /api/index?action=generate-course',
            books: '/api/index?action=books-list',
            articles: '/api/index?action=articles-list',
            article: '/api/index?action=article&slug=:slug',
            newsletterSubscribe: 'POST /api/index?action=newsletter-subscribe',
            testerCreate: 'POST /api/index?action=tester-create',
            userStats: '/api/index?action=user-stats',
            userApplications: '/api/index?action=user-applications',
            userUpdate: 'POST /api/index?action=user-update',
            db: '/api/index?action=db'
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
}
