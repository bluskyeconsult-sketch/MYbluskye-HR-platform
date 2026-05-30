// api/index.js - COMPLETE CONSOLIDATED API FOR HOBBY PLAN
// INCLUDES: Full health monitoring, IP geolocation, Email with templates, 
// Job fetching from 7+ countries, AI chat, Assessment generation, Course generation,
// User applications, Profile updates, Newsletter, Books, Articles, User stats

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

const ALLOWED_EMAIL_TYPES = [
    'contact', 'newsletter', 'notification', 'tester_welcome', 
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
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return emailRegex.test(email);
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

// ============================================
// EMAIL TEMPLATES
// ============================================

const emailTemplates = {
    contact: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">New Contact Message</h1>
        <p><strong>From:</strong> ${data.name} (${data.email})</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <div style="background-color: #1e293b; padding: 16px; border-radius: 8px;">
            <p>${data.message?.replace(/\n/g, '<br>')}</p>
        </div>
    </div>
</body>
</html>`,
    
    welcome: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">Welcome to BluSkye Integrated Consult</h1>
        <h2>Hello ${data.name},</h2>
        <p>Thank you for joining ODUSBABA! You're now part of the governed workforce platform.</p>
        <a href="https://www.bluskyeconsult.com/dashboard" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px;">Go to Dashboard</a>
    </div>
</body>
</html>`,

    password_reset: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">Reset Your Password</h1>
        <a href="${data.resetLink}" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px;">Reset Password</a>
        <p style="font-size: 12px;">This link expires in 1 hour.</p>
    </div>
</body>
</html>`,

    job_alert: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">New Jobs Matching "${data.alertName}"</h1>
        <p>We found ${data.jobs?.length || 0} new jobs.</p>
        <a href="https://www.bluskyeconsult.com/jobs" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px;">View All Jobs</a>
    </div>
</body>
</html>`,

    tester_welcome: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">Welcome to the Tester Program!</h1>
        <p>Hello ${data.name},</p>
        <p>You have <strong>${data.uses || 10} free uses</strong> for <strong>${data.days || 30} days</strong>.</p>
        <a href="https://www.bluskyeconsult.com/tester-dashboard" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px;">Go to Dashboard</a>
    </div>
</body>
</html>`,

    assessment_report: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">Your Assessment Report</h1>
        <div style="text-align: center; background-color: #1e293b; padding: 16px; border-radius: 8px;">
            <div style="font-size: 36px; font-weight: bold;">${data.percentage}%</div>
            <div>Performance: <strong>${data.performanceLevel}</strong></div>
        </div>
        <a href="https://www.bluskyeconsult.com/assessment-results" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px;">View Full Report</a>
    </div>
</body>
</html>`,

    newsletter_welcome: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">Welcome to ODUSBABA Newsletter!</h1>
        <p>Hello ${data.name},</p>
        <p>Thank you for subscribing! You'll receive weekly insights on job opportunities, career tips, and industry trends.</p>
        <a href="https://www.bluskyeconsult.com" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px;">Visit ODUSBABA →</a>
    </div>
</body>
</html>`,

    notification: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">${data.subject || 'ODUSBABA Notification'}</h1>
        <p>${data.message}</p>
        ${data.actionLink ? `<a href="${data.actionLink}" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px;">${data.actionText || 'Learn More'}</a>` : ''}
    </div>
</body>
</html>`,

    test: () => `<h1>✅ Email Test Successful!</h1><p>Your ODUSBABA email system is working correctly.</p>`
};

function getTransporter() {
    return nodemailer.createTransport({
        host: process.env.VITE_SMTP_HOST || process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: parseInt(process.env.VITE_SMTP_PORT || process.env.SMTP_PORT || '465'),
        secure: true,
        auth: {
            user: process.env.VITE_EMAIL_USER || process.env.SMTP_USER,
            pass: process.env.VITE_EMAIL_PASS || process.env.SMTP_PASSWORD
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });
}

// ============================================
// JOB FETCHING
// ============================================

async function fetchAllJobs() {
    const timeout = 10000;
    let allJobs = [];
    const errors = [];

    // 1. UK Civil Service Jobs
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
    } catch (err) {
        errors.push({ source: 'UK Civil Service', error: err.message });
    }

    // 2. UK NHS Jobs
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
    } catch (err) {
        errors.push({ source: 'NHS', error: err.message });
    }

    // 3. USAJobs
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
    } catch (err) {
        errors.push({ source: 'USAJobs', error: err.message });
    }

    // 4. Canada GC Jobs
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
    } catch (err) {
        errors.push({ source: 'Canada GC Jobs', error: err.message });
    }

    // 5. Australia APS Jobs
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
    } catch (err) {
        errors.push({ source: 'Australia APS', error: err.message });
    }

    // 6. Ireland Public Jobs
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
    } catch (err) {
        errors.push({ source: 'Ireland', error: err.message });
    }

    // 7. Germany
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
    } catch (err) {
        errors.push({ source: 'Germany', error: err.message });
    }

    // 8. Nigeria - Fallback Jobs
    const nigeriaJobs = [
        { title: 'Civil Service Officer', company: 'Federal Civil Service Commission', location: 'Abuja, Nigeria', source_country: 'NG', source_name: 'Federal Civil Service', description: 'Join the Federal Civil Service as an Officer. Opportunities in various ministries.', salary_range: '₦3,500,000 - ₦5,000,000', job_type: 'full_time', external_url: '', sponsorship_eligible: false },
        { title: 'Policy Analyst', company: 'Ministry of Finance', location: 'Abuja, Nigeria', source_country: 'NG', source_name: 'Ministry of Finance', description: 'Policy development and economic analysis role.', salary_range: '₦4,000,000 - ₦6,000,000', job_type: 'full_time', external_url: '', sponsorship_eligible: false },
        { title: 'IT Specialist', company: 'NITDA', location: 'Abuja, Nigeria', source_country: 'NG', source_name: 'NITDA', description: 'Digital transformation and IT infrastructure role.', salary_range: '₦3,500,000 - ₦5,500,000', job_type: 'full_time', external_url: '', sponsorship_eligible: false }
    ];
    allJobs.push(...nigeriaJobs);

    // 9. Remote/Global Fallback Jobs
    const remoteJobs = [
        { title: 'Remote Software Engineer', company: 'Global Tech', location: 'Remote', source_country: 'Global', source_name: 'Remote Jobs', description: 'Full-stack development position. Work from anywhere.', salary_range: '$60,000 - $90,000', job_type: 'remote', external_url: '', sponsorship_eligible: false },
        { title: 'Virtual Assistant', company: 'Global Services', location: 'Remote', source_country: 'Global', source_name: 'Remote Jobs', description: 'Administrative support for international clients.', salary_range: '$25,000 - $40,000', job_type: 'remote', external_url: '', sponsorship_eligible: false }
    ];
    allJobs.push(...remoteJobs);

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

async function callOpenAI(messages, maxTokens = 800, temperature = 0.7) {
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: maxTokens, temperature })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
}

// ============================================
// USER PROFILE UPDATE
// ============================================

async function updateUserProfile(userId, updates) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
        .from('profiles')
        .update({
            full_name: updates.full_name,
            phone: updates.phone,
            job_title: updates.job_title,
            years_experience: updates.years_experience,
            linkedin_url: updates.linkedin_url,
            github_url: updates.github_url,
            email_notifications: updates.email_notifications,
            location: updates.location,
            bio: updates.bio,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ============================================
// USER APPLICATIONS FETCH
// ============================================

async function getUserApplications(userId) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
        .from('job_applications')
        .select(`
            *,
            jobs:job_id (
                id,
                title,
                company,
                location,
                salary_range,
                description
            )
        `)
        .eq('applicant_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

        const geoData = {
            country: req.headers['x-vercel-ip-country'] || null,
            countryRegion: req.headers['x-vercel-ip-country-region'] || null,
            region: req.headers['x-vercel-ip-region'] || null,
            city: req.headers['x-vercel-ip-city'] || null,
            latitude: req.headers['x-vercel-ip-latitude'] || null,
            longitude: req.headers['x-vercel-ip-longitude'] || null,
            timezone: req.headers['x-vercel-ip-timezone'] || null
        };

        return res.status(200).json({
            success: true,
            ip: cleanIp,
            geolocation: geoData,
            userAgent: req.headers['user-agent'] || null,
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
        const supabase = getSupabase();

        const results = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'production',
            services: {},
            responseTime: 0
        };

        // Database
        const dbStart = Date.now();
        try {
            const { error, count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
            results.services.database = {
                status: !error ? 'healthy' : 'degraded',
                responseTime: Date.now() - dbStart,
                details: !error ? `Connected • ${count?.toLocaleString() || 0} users` : error.message
            };
            if (error) results.status = 'degraded';
        } catch (err) {
            results.services.database = { status: 'critical', responseTime: Date.now() - dbStart, details: err.message };
            results.status = 'degraded';
        }

        // Auth
        const authStart = Date.now();
        try {
            const { error } = await supabase.auth.getSession();
            results.services.auth = { status: !error ? 'healthy' : 'degraded', responseTime: Date.now() - authStart };
            if (error) results.status = 'degraded';
        } catch (err) {
            results.services.auth = { status: 'critical', responseTime: Date.now() - authStart, details: err.message };
            results.status = 'degraded';
        }

        // Storage
        const storageStart = Date.now();
        try {
            const { data: buckets, error } = await supabase.storage.listBuckets();
            results.services.storage = {
                status: !error ? 'healthy' : 'degraded',
                responseTime: Date.now() - storageStart,
                details: !error ? `${buckets?.length || 0} buckets available` : error.message
            };
            if (error) results.status = 'degraded';
        } catch (err) {
            results.services.storage = { status: 'critical', responseTime: Date.now() - storageStart, details: err.message };
            results.status = 'degraded';
        }

        // OpenAI
        const openaiKey = process.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) {
            results.services.openai = { status: 'degraded', details: 'API key missing' };
            results.status = 'degraded';
        } else {
            const openaiStart = Date.now();
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Health check OK' }], max_tokens: 5 })
                });
                results.services.openai = {
                    status: response.ok ? 'healthy' : 'degraded',
                    responseTime: Date.now() - openaiStart,
                    details: response.ok ? 'API responsive' : `HTTP ${response.status}`
                };
                if (!response.ok) results.status = 'degraded';
            } catch (err) {
                results.services.openai = { status: 'degraded', responseTime: Date.now() - openaiStart, details: err.message };
                results.status = 'degraded';
            }
        }

        // Email
        const emailUser = process.env.VITE_EMAIL_USER;
        const emailPass = process.env.VITE_EMAIL_PASS;
        if (!emailUser || !emailPass) {
            results.services.email = { status: 'degraded', details: 'SMTP credentials missing' };
            results.status = 'degraded';
        } else {
            const emailStart = Date.now();
            try {
                const transporter = getTransporter();
                await transporter.verify();
                results.services.email = { status: 'healthy', responseTime: Date.now() - emailStart };
            } catch (err) {
                results.services.email = { status: 'degraded', responseTime: Date.now() - emailStart, details: err.message };
                results.status = 'degraded';
            }
        }

        // Vercel
        results.services.vercel = { status: 'healthy', details: `Region: ${process.env.VERCEL_REGION || 'unknown'}` };

        results.responseTime = Date.now() - startTime;

        const hasCritical = Object.values(results.services).some(s => s.status === 'critical');
        const hasDegraded = Object.values(results.services).some(s => s.status === 'degraded');
        if (hasCritical) results.status = 'critical';
        else if (hasDegraded) results.status = 'degraded';
        else results.status = 'healthy';

        return res.status(200).json(results);
    }

    // ============================================
    // ACTION: Send Email
    // ============================================
    if (action === 'email' && req.method === 'POST') {
        const { to, subject, html, type, templateData } = req.body;

        if (!to || !isValidEmail(to)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        if (!checkRateLimit(to, type || 'general')) {
            return res.status(429).json({ error: 'Too many requests. Please wait.' });
        }

        try {
            let emailHtml = html;
            let emailSubject = subject;

            if (!emailHtml && type && emailTemplates[type]) {
                emailHtml = emailTemplates[type](templateData || {});
                if (type === 'contact') emailSubject = subject || `New Contact from ${templateData?.name}`;
                else if (type === 'welcome') emailSubject = subject || `Welcome to ODUSBABA, ${templateData?.name || 'User'}!`;
                else if (type === 'password_reset') emailSubject = subject || 'Reset Your Password';
                else if (type === 'job_alert') emailSubject = subject || `New Jobs: ${templateData?.jobs?.length || 0} positions available`;
                else if (type === 'tester_welcome') emailSubject = subject || 'Welcome to ODUSBABA Tester Program!';
                else if (type === 'assessment_report') emailSubject = subject || `Your ${templateData?.assessmentTitle} Report`;
                else if (type === 'newsletter_welcome') emailSubject = subject || 'Welcome to ODUSBABA Newsletter!';
                else emailSubject = subject || 'ODUSBABA Notification';
            }

            if (!emailHtml) {
                return res.status(400).json({ error: 'Missing email content' });
            }

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
            console.error('Email error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ACTION: Fetch Jobs
    // ============================================
    if (action === 'jobs') {
        const result = await fetchAllJobs();
        return res.status(200).json({
            success: true,
            count: result.total,
            jobs: result.jobs,
            errors: result.errors.length > 0 ? result.errors : undefined,
            timestamp: new Date().toISOString()
        });
    }

    // ============================================
    // ACTION: AI Chat
    // ============================================
    if (action === 'chat' && req.method === 'POST') {
        const { messages, systemPrompt, temperature = 0.7, maxTokens = 800 } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }

        try {
            let fullMessages = [...messages];
            if (systemPrompt) {
                fullMessages = [{ role: 'system', content: systemPrompt }, ...fullMessages];
            }

            const data = await callOpenAI(fullMessages, maxTokens, temperature);
            return res.status(200).json({
                success: true,
                content: data.choices[0].message.content,
                usage: data.usage
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // ACTION: Generate Assessment
    // ============================================
    if (action === 'generate-assessment' && req.method === 'POST') {
        const { topic, difficulty = 'intermediate', count = 5 } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        try {
            const data = await callOpenAI([
                { role: 'system', content: 'You are an expert test creator. Return only valid JSON.' },
                { role: 'user', content: `Create ${count} ${difficulty} level questions about "${topic}". Return as JSON array with: question, options (array), correct (index 0-3), explanation.` }
            ], 2000, 0.5);

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

            return res.status(200).json({ success: true, questions, usage: data.usage });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // ACTION: Generate Course
    // ============================================
    if (action === 'generate-course' && req.method === 'POST') {
        const { topic, level = 'beginner' } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        try {
            const data = await callOpenAI([
                { role: 'system', content: 'You are an instructional designer.' },
                { role: 'user', content: `Create a course outline for "${topic}" at ${level} level. Include: title, description, 5-7 modules with lessons, learning objectives, and estimated duration. Return as JSON.` }
            ], 1500, 0.7);

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const outline = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: topic, description: '', modules: [] };

            return res.status(200).json({
                success: true,
                outline,
                usage: data.usage
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // ACTION: User Applications
    // ============================================
    if (action === 'user-applications' && req.method === 'POST') {
        const authHeader = req.headers.authorization;
        
        try {
            const supabase = getSupabase();
            
            // Get user from token
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            
            if (userError || !user) throw new Error('Unauthorized');
            
            const applications = await getUserApplications(user.id);
            
            return res.status(200).json({
                success: true,
                data: applications
            });
        } catch (error) {
            return res.status(401).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ACTION: User Profile Update
    // ============================================
    if (action === 'user-update' && req.method === 'POST') {
        const authHeader = req.headers.authorization;
        const { userId, updates } = req.body;
        
        try {
            const supabase = getSupabase();
            
            // Verify user
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            
            if (userError || !user || user.id !== userId) throw new Error('Unauthorized');
            
            const updatedProfile = await updateUserProfile(userId, updates);
            
            return res.status(200).json({
                success: true,
                data: updatedProfile
            });
        } catch (error) {
            return res.status(401).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ACTION: Tester Creation
    // ============================================
    if (action === 'tester-create' && req.method === 'POST') {
        const { email, name, uses = 10, days = 30 } = req.body;
        
        try {
            const supabase = getSupabase();
            
            // Create tester record
            const { data, error } = await supabase
                .from('tester_allocations')
                .insert({
                    email,
                    name,
                    allocated_uses: uses,
                    remaining_uses: uses,
                    expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'active'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Send welcome email
            await fetch(`${process.env.VERCEL_URL || 'https://www.bluskyeconsult.com'}/api/index?action=email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    type: 'tester_welcome',
                    templateData: { name, uses, days }
                })
            });
            
            return res.status(200).json({ success: true, tester: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ACTION: Newsletter Subscribe
    // ============================================
    if (action === 'newsletter-subscribe' && req.method === 'POST') {
        const { email, name } = req.body;
        
        try {
            const supabase = getSupabase();
            
            const { error } = await supabase
                .from('newsletter_subscribers')
                .upsert({
                    email,
                    name,
                    subscribed_at: new Date().toISOString(),
                    status: 'active'
                });
            
            if (error && error.code !== '23505') throw error;
            
            // Send welcome email
            await fetch(`${process.env.VERCEL_URL || 'https://www.bluskyeconsult.com'}/api/index?action=email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    type: 'newsletter_welcome',
                    templateData: { name }
                })
            });
            
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ACTION: Books List
    // ============================================
    if (action === 'books-list') {
        try {
            const supabase = getSupabase();
            
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return res.status(200).json({ success: true, books: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ACTION: Articles List
    // ============================================
    if (action === 'articles-list') {
        try {
            const supabase = getSupabase();
            
            const { data, error } = await supabase
                .from('articles')
                .select('*')
                .eq('is_published', true)
                .order('published_at', { ascending: false });
            
            if (error) throw error;
            
            return res.status(200).json({ success: true, articles: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ACTION: Single Article
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
    // ACTION: User Dashboard Stats
    // ============================================
    if (action === 'user-stats') {
        const authHeader = req.headers.authorization;
        
        try {
            const supabase = getSupabase();
            
            // Get user from token
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            
            if (userError || !user) throw new Error('Unauthorized');
            
            // Get stats
            const [applications, savedJobs, courses, assessments] = await Promise.all([
                supabase.from('job_applications').select('id', { count: 'exact' }).eq('applicant_id', user.id),
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
            return res.status(401).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ACTION: Database Check
    // ============================================
    if (action === 'db') {
        const supabase = getSupabase();

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
    // ACTION: Service Check
    // ============================================
    if (action === 'service' && req.query.service) {
        const service = req.query.service;
        const supabase = getSupabase();

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

            case 'auth':
                const authStart = Date.now();
                try {
                    const { error } = await supabase.auth.getSession();
                    result = { ...result, status: !error ? 'healthy' : 'degraded', responseTime: Date.now() - authStart };
                } catch (err) {
                    result = { ...result, status: 'error', responseTime: Date.now() - authStart, error: err.message };
                }
                break;

            case 'openai':
                const openaiKey = process.env.VITE_OPENAI_API_KEY;
                if (!openaiKey) {
                    result = { ...result, status: 'degraded', message: 'API key missing' };
                } else {
                    const openaiStart = Date.now();
                    try {
                        const response = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'OK' }], max_tokens: 3 })
                        });
                        result = { ...result, status: response.ok ? 'healthy' : 'degraded', responseTime: Date.now() - openaiStart };
                    } catch (err) {
                        result = { ...result, status: 'error', responseTime: Date.now() - openaiStart, error: err.message };
                    }
                }
                break;

            default:
                return res.status(400).json({ error: `Unknown service: ${service}` });
        }

        return res.status(200).json(result);
    }

    // ============================================
    // DEFAULT: API Info
    // ============================================
    return res.status(200).json({
        name: 'ODUSBABA API',
        version: '3.0.0',
        description: 'Consolidated API for Hobby Plan - Full health, email, jobs, chat, AI generation',
        endpoints: {
            health: '/api/index?action=health',
            ip: '/api/index?action=ip',
            ping: '/api/index?action=ping',
            email: 'POST /api/index?action=email',
            chat: 'POST /api/index?action=chat',
            jobs: '/api/index?action=jobs',
            assessment: 'POST /api/index?action=generate-assessment',
            course: 'POST /api/index?action=generate-course',
            'user-applications': 'POST /api/index?action=user-applications',
            'user-update': 'POST /api/index?action=user-update',
            'user-stats': '/api/index?action=user-stats',
            'tester-create': 'POST /api/index?action=tester-create',
            'newsletter-subscribe': 'POST /api/index?action=newsletter-subscribe',
            'books-list': '/api/index?action=books-list',
            'articles-list': '/api/index?action=articles-list',
            article: '/api/index?action=article&slug={slug}',
            db: '/api/index?action=db',
            service: '/api/index?action=service&service=database|auth|openai'
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
}
