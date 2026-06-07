// api/index.js - UNIFIED API GATEWAY (Single file handles ALL)
// Complete API: Health monitoring, IP geolocation, Email templates, Job fetching (7+ countries + API sources),
// AI chat, Assessment generation, Course generation, User applications, Profile updates,
// Newsletter, Books, Articles, User stats, Analytics events, Tester management
// RUTH Standard v3.0 - Production Ready

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ALLOWED_EMAIL_TYPES = [
    'contact', 'newsletter', 'newsletter_welcome', 'notification', 'tester_welcome',
    'assessment_report', 'welcome', 'password_reset', 'job_alert', 'test'
];

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-Requested-With',
    'Access-Control-Max-Age': '86400'
};

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_REQUESTS = 5;
const rateLimitStore = new Map();

// ============================================
// HELPER FUNCTIONS
// ============================================

function setCors(res) {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        res.setHeader(key, value);
    });
}

function checkRateLimit(key, limit = RATE_LIMIT_REQUESTS) {
    const now = Date.now();
    const record = rateLimitStore.get(key);
    
    if (!record) {
        rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }
    
    if (now > record.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }
    
    if (record.count >= limit) {
        return false;
    }
    
    record.count++;
    rateLimitStore.set(key, record);
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
// PROFESSIONAL EMAIL TEMPLATES
// ============================================

const emailTemplates = {
    contact: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#020617;">
    <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a);padding:20px;text-align:center;">
            <h1 style="color:#10b981;margin:0;">New Contact Message</h1>
        </div>
        <div style="padding:24px;">
            <p><strong style="color:#10b981;">From:</strong> <span style="color:#e2e8f0;">${data.name} (${data.email})</span></p>
            <p><strong style="color:#10b981;">Subject:</strong> <span style="color:#e2e8f0;">${data.subject}</span></p>
            <div style="background-color:#1e293b;padding:16px;border-radius:8px;margin-top:16px;">
                <p style="color:#cbd5e1;margin:0;">${data.message?.replace(/\n/g, '<br>')}</p>
            </div>
        </div>
        <div style="background-color:#0f172a;padding:16px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:12px;margin:0;">BluSkye Integrated Consult — Creating Value for Partnership</p>
        </div>
    </div>
</body>
</html>`,

    newsletter: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#020617;">
    <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a);padding:20px;text-align:center;">
            <h1 style="color:#10b981;margin:0;">ODUSBABA Newsletter</h1>
        </div>
        <div style="padding:24px;color:#94a3b8;">
            ${data.content || ''}
        </div>
        <div style="background-color:#0f172a;padding:16px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:12px;">You received this because you subscribed. <a href="https://www.bluskyeconsult.com/newsletter/unsubscribe" style="color:#10b981;">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`,

    newsletter_welcome: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#020617;">
    <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a);padding:20px;text-align:center;">
            <h1 style="color:#10b981;margin:0;">Welcome to ODUSBABA Newsletter!</h1>
        </div>
        <div style="padding:24px;">
            <p style="color:#94a3b8;">Hello ${data.name || 'there'},</p>
            <p style="color:#94a3b8;">Thank you for subscribing! You'll receive weekly insights on job opportunities, career tips, and industry trends.</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="https://www.bluskyeconsult.com" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Visit ODUSBABA →</a>
            </div>
        </div>
        <div style="background-color:#0f172a;padding:16px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:12px;margin:0;">BluSkye Integrated Consult — Creating Value for Partnership</p>
        </div>
    </div>
</body>
</html>`,

    welcome: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#020617;">
    <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a);padding:20px;text-align:center;">
            <h1 style="color:#10b981;margin:0;">Welcome to BluSkye Integrated Consult</h1>
        </div>
        <div style="padding:24px;">
            <h2 style="color:#ffffff;">Hello ${data.name},</h2>
            <p style="color:#94a3b8;">Thank you for joining ODUSBABA! You're now part of the governed workforce platform.</p>
            <p style="color:#94a3b8;">Get started by completing your profile and exploring job opportunities.</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="https://www.bluskyeconsult.com/dashboard" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Go to Dashboard</a>
            </div>
        </div>
        <div style="background-color:#0f172a;padding:16px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:12px;margin:0;">BluSkye Integrated Consult — Creating Value for Partnership</p>
        </div>
    </div>
</body>
</html>`,

    password_reset: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#020617;">
    <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a);padding:20px;text-align:center;">
            <h1 style="color:#10b981;margin:0;">Reset Your Password</h1>
        </div>
        <div style="padding:24px;">
            <p style="color:#94a3b8;">You requested to reset your password. Click the button below to create a new password.</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="${data.resetLink}" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset Password</a>
            </div>
            <p style="color:#64748b;font-size:12px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        </div>
        <div style="background-color:#0f172a;padding:16px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:12px;margin:0;">BluSkye Integrated Consult — Creating Value for Partnership</p>
        </div>
    </div>
</body>
</html>`,

    job_alert: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#020617;">
    <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a);padding:20px;text-align:center;">
            <h1 style="color:#10b981;margin:0;">New Jobs Matching "${data.alertName}"</h1>
        </div>
        <div style="padding:24px;">
            <p style="color:#94a3b8;">We found ${data.jobs?.length || 0} new job${data.jobs?.length !== 1 ? 's' : ''} that match your alert.</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="https://www.bluskyeconsult.com/jobs" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">View All Jobs</a>
            </div>
            <p style="color:#64748b;font-size:12px;">You received this because you have job alerts enabled. <a href="https://www.bluskyeconsult.com/job-alerts" style="color:#10b981;">Manage alerts</a></p>
        </div>
        <div style="background-color:#0f172a;padding:16px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:12px;margin:0;">BluSkye Integrated Consult — Creating Value for Partnership</p>
        </div>
    </div>
</body>
</html>`,

    tester_welcome: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#020617;">
    <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a);padding:20px;text-align:center;">
            <h1 style="color:#10b981;margin:0;">Welcome to the Tester Program!</h1>
        </div>
        <div style="padding:24px;">
            <p style="color:#94a3b8;">Hello ${data.name},</p>
            <p style="color:#94a3b8;">Your tester account has been created! You have <strong>${data.uses || 10} free uses</strong> for <strong>${data.days || 30} days</strong>.</p>
            <div style="background-color:#1e293b;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="color:#94a3b8;margin:0 0 8px 0;"><strong>Start exploring:</strong></p>
                <ul style="color:#94a3b8;margin:0;padding-left:20px;">
                    <li>🤖 AI Career Chat</li>
                    <li>📄 CV Optimization</li>
                    <li>💼 Job Matching</li>
                    <li>📊 Career Assessments</li>
                </ul>
            </div>
            <div style="text-align:center;">
                <a href="https://www.bluskyeconsult.com/tester/dashboard" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Go to Dashboard →</a>
            </div>
        </div>
        <div style="background-color:#0f172a;padding:16px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:12px;margin:0;">BluSkye Integrated Consult — Creating Value for Partnership</p>
        </div>
    </div>
</body>
</html>`,

    assessment_report: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#020617;">
    <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a);padding:20px;text-align:center;">
            <h1 style="color:#10b981;margin:0;">Your Assessment Report</h1>
        </div>
        <div style="padding:24px;">
            <p style="color:#94a3b8;">Hello ${data.userName},</p>
            <p style="color:#94a3b8;">You've completed <strong>${data.assessmentTitle}</strong>!</p>
            <div style="background-color:#1e293b;border-radius:8px;padding:16px;text-align:center;margin:20px 0;">
                <div style="font-size:36px;font-weight:bold;color:#10b981;">${data.percentage}%</div>
                <div style="color:#94a3b8;">Score: ${data.score}</div>
                <div style="color:#94a3b8;">Performance: <strong>${data.performanceLevel}</strong></div>
            </div>
            <div style="text-align:center;">
                <a href="https://www.bluskyeconsult.com/assessment-results" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">View Full Report →</a>
            </div>
        </div>
        <div style="background-color:#0f172a;padding:16px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:12px;margin:0;">BluSkye Integrated Consult — Creating Value for Partnership</p>
        </div>
    </div>
</body>
</html>`,

    notification: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#020617;">
    <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a);padding:20px;text-align:center;">
            <h1 style="color:#10b981;margin:0;">${data.subject || 'ODUSBABA Notification'}</h1>
        </div>
        <div style="padding:24px;">
            <p style="color:#94a3b8;">${data.message || ''}</p>
            ${data.actionLink && data.actionText ? `<div style="text-align:center;margin:24px 0;"><a href="${data.actionLink}" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">${data.actionText}</a></div>` : ''}
        </div>
        <div style="background-color:#0f172a;padding:16px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:12px;margin:0;">BluSkye Integrated Consult — Creating Value for Partnership</p>
        </div>
    </div>
</body>
</html>`,

    test: () => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#020617;">
    <div style="max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a);padding:20px;text-align:center;">
            <h1 style="color:#10b981;margin:0;">✅ Email Configuration Successful!</h1>
        </div>
        <div style="padding:24px;">
            <p style="color:#94a3b8;">Your ODUSBABA email system is working correctly.</p>
            <p style="color:#94a3b8;">This test email confirms that SMTP and all configurations are set up properly.</p>
        </div>
        <div style="background-color:#0f172a;padding:16px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:12px;margin:0;">BluSkye Integrated Consult — Creating Value for Partnership</p>
        </div>
    </div>
</body>
</html>`
};

// ============================================
// JOB FETCHING FUNCTION (Multi-country + API Sources)
// ============================================

async function fetchAllJobs() {
    const timeout = 12000;
    let allJobs = [];
    const errors = [];

    // 1. UK Civil Service
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

    // 2. NHS Jobs
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

    // 3. Remote Jobs (Jobicy API - using fetchJobs handler logic)
    try {
        const response = await safeFetch('https://jobicy.com/api/v2/remote-jobs?count=20', timeout);
        const data = await response.json();
        if (data?.jobs) {
            const jobs = data.jobs.map(job => ({
                title: job.jobTitle,
                company: job.companyName,
                location: job.jobGeo || 'Remote',
                source_country: 'Global',
                source_name: 'Jobicy',
                description: job.jobDescription?.substring(0, 500) || '',
                salary_range: job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : 'Competitive',
                job_type: 'remote',
                external_url: job.url || '',
                sponsorship_eligible: true
            }));
            allJobs.push(...jobs);
        }
    } catch (err) {
        errors.push({ source: 'Jobicy', error: err.message });
    }

    // 4. Remotive API
    try {
        const response = await safeFetch('https://remotive.com/api/remote-jobs', timeout);
        const data = await response.json();
        if (data?.jobs) {
            const jobs = data.jobs.slice(0, 20).map(job => ({
                title: job.title,
                company: job.company_name,
                location: job.candidate_required_location || 'Remote',
                source_country: 'Global',
                source_name: 'Remotive',
                description: job.description?.substring(0, 500) || '',
                salary_range: job.salary || 'Competitive',
                job_type: 'remote',
                external_url: job.url,
                sponsorship_eligible: true
            }));
            allJobs.push(...jobs);
        }
    } catch (err) {
        errors.push({ source: 'Remotive', error: err.message });
    }

    // 5. Nigeria Fallback Jobs
    allJobs.push(
        { title: 'Civil Service Officer', company: 'Federal Civil Service Commission', location: 'Abuja, Nigeria', source_country: 'NG', source_name: 'Federal Civil Service', description: 'Join the Federal Civil Service as an Officer. Opportunities in various ministries.', salary_range: '₦3,500,000 - ₦5,000,000', job_type: 'full_time', external_url: '', sponsorship_eligible: false },
        { title: 'Policy Analyst', company: 'Ministry of Finance', location: 'Abuja, Nigeria', source_country: 'NG', source_name: 'Ministry of Finance', description: 'Policy development and economic analysis role.', salary_range: '₦4,000,000 - ₦6,000,000', job_type: 'full_time', external_url: '', sponsorship_eligible: false },
        { title: 'IT Specialist', company: 'NITDA', location: 'Abuja, Nigeria', source_country: 'NG', source_name: 'NITDA', description: 'Digital transformation and IT infrastructure role.', salary_range: '₦3,500,000 - ₦5,500,000', job_type: 'full_time', external_url: '', sponsorship_eligible: false }
    );

    // Remove duplicates by title
    const uniqueJobs = [];
    const titles = new Set();
    for (const job of allJobs) {
        if (!titles.has(job.title)) {
            titles.add(job.title);
            uniqueJobs.push(job);
        }
    }

    return { jobs: uniqueJobs.slice(0, 50), errors, total: uniqueJobs.length };
}

// ============================================
// ACTION HANDLERS
// ============================================

const handlers = {
    // ========== HEALTH & SYSTEM ==========
    health: async (req, res) => {
        const startTime = Date.now();
        const results = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'production',
            services: {},
            responseTime: 0
        };

        // Database check
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

        // Auth check
        const authStart = Date.now();
        try {
            const { error } = await supabase.auth.getSession();
            results.services.auth = { status: !error ? 'healthy' : 'degraded', responseTime: Date.now() - authStart };
            if (error) results.status = 'degraded';
        } catch (err) {
            results.services.auth = { status: 'critical', responseTime: Date.now() - authStart, details: err.message };
            results.status = 'degraded';
        }

        results.services.vercel = { status: 'healthy', details: `Region: ${process.env.VERCEL_REGION || 'unknown'}` };
        results.responseTime = Date.now() - startTime;

        const hasCritical = Object.values(results.services).some(s => s.status === 'critical');
        const hasDegraded = Object.values(results.services).some(s => s.status === 'degraded');
        if (hasCritical) results.status = 'critical';
        else if (hasDegraded) results.status = 'degraded';
        else results.status = 'healthy';

        return res.status(200).json(results);
    },

    ping: async (req, res) => {
        return res.status(200).json({
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    },

    // ========== IP ADDRESS ==========
    ip: async (req, res) => {
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
    },

    // ========== JOB FETCH (Enhanced with multiple sources) ==========
    jobs: async (req, res) => {
        try {
            const result = await fetchAllJobs();
            return res.status(200).json({
                success: true,
                count: result.total,
                jobs: result.jobs,
                errors: result.errors.length > 0 ? result.errors : undefined,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // Fallback mock jobs
            const mockJobs = [
                { title: 'Senior Software Engineer', company: 'Tech Corp', location: 'Remote', description: 'Build amazing products', salary_range: '$120k - $180k', job_type: 'remote', source_name: 'Mock' },
                { title: 'Product Manager', company: 'Innovate Inc', location: 'London, UK', description: 'Lead product strategy', salary_range: '£80k - £100k', job_type: 'full_time', source_name: 'Mock' },
                { title: 'Data Scientist', company: 'AI Solutions', location: 'Remote', description: 'Machine learning models', salary_range: '$130k - $160k', job_type: 'remote', source_name: 'Mock' }
            ];
            return res.status(200).json({ success: true, jobs: mockJobs, count: mockJobs.length, fallback: true });
        }
    },

    // ========== JOB FETCH FROM MULTIPLE SOURCES (New - dedicated endpoint) ==========
    fetchJobs: async (req, res) => {
        const allJobs = [];
        const sources = [
            {
                name: 'Jobicy',
                url: 'https://jobicy.com/api/v2/remote-jobs?count=30',
                parser: (data) => (data.jobs || []).map(job => ({
                    title: job.jobTitle,
                    company: job.companyName,
                    location: job.jobGeo || 'Remote',
                    description: job.jobDescription?.substring(0, 500),
                    salary: job.salaryMin && job.salaryMax ? `${job.salaryMin} - ${job.salaryMax}` : null,
                    url: job.url,
                    job_type: 'remote',
                    source: 'Jobicy'
                }))
            },
            {
                name: 'Remotive',
                url: 'https://remotive.com/api/remote-jobs',
                parser: (data) => (data.jobs || []).slice(0, 20).map(job => ({
                    title: job.title,
                    company: job.company_name,
                    location: job.candidate_required_location || 'Remote',
                    description: job.description?.substring(0, 500),
                    salary: job.salary,
                    url: job.url,
                    job_type: 'remote',
                    source: 'Remotive'
                }))
            }
        ];
        
        for (const source of sources) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                const response = await fetch(source.url, {
                    headers: { 'User-Agent': 'ODUSBABA/1.0' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    const jobs = source.parser(data);
                    allJobs.push(...jobs);
                }
            } catch (err) {
                console.warn(`Failed to fetch from ${source.name}:`, err.message);
            }
        }
        
        // Remove duplicates by title
        const uniqueJobs = [];
        const titles = new Set();
        for (const job of allJobs) {
            if (!titles.has(job.title)) {
                titles.add(job.title);
                uniqueJobs.push(job);
            }
        }
        
        return res.status(200).json({ 
            success: true, 
            jobs: uniqueJobs.slice(0, 50),
            count: uniqueJobs.length,
            timestamp: new Date().toISOString()
        });
    },

    // ========== AI CHAT ==========
    chat: async (req, res) => {
        const { message, history, systemPrompt, temperature = 0.7, maxTokens = 800 } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        try {
            let messages = history || [];
            messages.push({ role: 'user', content: message });
            
            if (systemPrompt) {
                messages = [{ role: 'system', content: systemPrompt }, ...messages];
            }

            const data = await callOpenAI(messages, maxTokens, temperature);
            return res.status(200).json({
                success: true,
                response: data.choices[0].message.content,
                usage: data.usage
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // ========== GENERATE ASSESSMENT ==========
    'generate-assessment': async (req, res) => {
        const { topic, difficulty = 'intermediate', numberOfQuestions = 5 } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        try {
            const data = await callOpenAI([
                { role: 'system', content: 'You are an expert test creator. Return only valid JSON.' },
                { role: 'user', content: `Create ${numberOfQuestions} ${difficulty} level questions about "${topic}". Return as JSON array with: question, options (array), correct (index 0-3), explanation.` }
            ], 2000, 0.5);

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

            return res.status(200).json({ success: true, questions, usage: data.usage });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // ========== GENERATE COURSE ==========
    'generate-course': async (req, res) => {
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
    },

    // ========== SEND EMAIL ==========
    email: async (req, res) => {
        const { to, subject, html, type, templateData } = req.body;

        if (!to || !isValidEmail(to)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const rateLimitKey = `email:${to}:${type || 'general'}`;
        if (!checkRateLimit(rateLimitKey, 3)) {
            return res.status(429).json({ error: 'Too many requests. Please wait.' });
        }

        try {
            let emailHtml = html;
            let emailSubject = subject;

            if (!emailHtml && type && emailTemplates[type]) {
                emailHtml = emailTemplates[type](templateData || {});
                switch(type) {
                    case 'contact': emailSubject = subject || `New Contact from ${templateData?.name}`; break;
                    case 'welcome': emailSubject = subject || `Welcome to ODUSBABA, ${templateData?.name || 'User'}!`; break;
                    case 'password_reset': emailSubject = subject || 'Reset Your Password'; break;
                    case 'job_alert': emailSubject = subject || `New Jobs: ${templateData?.jobs?.length || 0} positions available`; break;
                    case 'tester_welcome': emailSubject = subject || 'Welcome to ODUSBABA Tester Program!'; break;
                    case 'assessment_report': emailSubject = subject || `Your ${templateData?.assessmentTitle} Report`; break;
                    case 'newsletter_welcome': emailSubject = subject || 'Welcome to ODUSBABA Newsletter!'; break;
                    default: emailSubject = subject || 'ODUSBABA Notification';
                }
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
    },

    // ========== NEWSLETTER SUBSCRIBE ==========
    'newsletter-subscribe': async (req, res) => {
        const { email, name } = req.body;
        
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        
        try {
            const { error } = await supabase
                .from('newsletter_subscribers')
                .upsert({
                    email,
                    name: name || null,
                    subscribed_at: new Date().toISOString(),
                    status: 'active'
                });
            
            if (error && error.code !== '23505') throw error;
            
            // Send welcome email asynchronously
            fetch(`${process.env.VERCEL_URL || 'https://www.bluskyeconsult.com'}/api/index?action=email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    type: 'newsletter_welcome',
                    templateData: { name: name || 'there' }
                })
            }).catch(() => {});
            
            return res.status(200).json({ 
                success: true, 
                message: error?.code === '23505' ? 'Already subscribed' : 'Subscribed successfully' 
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== BOOKS LIST ==========
    'books-list': async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return res.status(200).json({ success: true, books: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== ARTICLES LIST ==========
    'articles-list': async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('articles')
                .select('*')
                .eq('is_published', true)
                .order('published_at', { ascending: false });
            
            if (error) throw error;
            return res.status(200).json({ success: true, articles: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== SINGLE ARTICLE ==========
    article: async (req, res) => {
        const { slug, id } = req.query;
        
        try {
            let query = supabase.from('articles').select('*');
            if (slug) query = query.eq('slug', slug);
            if (id) query = query.eq('id', id);
            
            const { data, error } = await query.single();
            if (error) throw error;
            
            return res.status(200).json({ success: true, article: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== TESTER CREATE ==========
    'tester-create': async (req, res) => {
        const { email, name, uses = 10, days = 30 } = req.body;
        
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        
        try {
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
                    templateData: { name: name || email, uses, days }
                })
            });
            
            return res.status(200).json({ success: true, tester: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== USER STATS ==========
    'user-stats': async (req, res) => {
        const authHeader = req.headers.authorization;
        
        try {
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            
            if (userError || !user) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
            const [
                applications,
                savedJobs,
                courses,
                assessments
            ] = await Promise.all([
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
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== USER APPLICATIONS ==========
    'user-applications': async (req, res) => {
        const authHeader = req.headers.authorization;
        
        try {
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            
            if (userError || !user) throw new Error('Unauthorized');
            
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
                .eq('applicant_id', user.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(401).json({ success: false, error: error.message });
        }
    },

    // ========== USER PROFILE UPDATE ==========
    'user-update': async (req, res) => {
        const { userId, updates } = req.body;
        const authHeader = req.headers.authorization;
        
        try {
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            
            if (userError || !user || user.id !== userId) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
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
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== TRACK EVENT ==========
    'track-event': async (req, res) => {
        const { event_type, event_data, user_id } = req.body;
        
        console.log(`📊 Event Tracked: ${event_type}`, JSON.stringify(event_data, null, 2));
        
        // Optional: Store in Supabase if table exists
        try {
            await supabase.from('analytics_events').insert({
                event_type,
                event_data,
                user_id: user_id || null,
                created_at: new Date().toISOString()
            });
        } catch (e) {
            // Non-critical, just log
            console.log('Analytics storage skipped:', e.message);
        }
        
        return res.status(200).json({ success: true, message: 'Event tracked' });
    },

    // ========== ASSESSMENT RESULTS ==========
    'assessment-results': async (req, res) => {
        const { id } = req.query;
        const authHeader = req.headers.authorization;
        
        try {
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            
            if (userError || !user) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
            const { data, error } = await supabase
                .from('user_assessments')
                .select('*, assessment:assessment_id(*)')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();
            
            if (error) throw error;
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== GENERATE ASSESSMENT REPORT ==========
    'assessment-generate-report': async (req, res) => {
        const { userAssessmentId, userId } = req.body;
        
        try {
            const { data: userAssessment, error } = await supabase
                .from('user_assessments')
                .select('*, assessment:assessments(*)')
                .eq('id', userAssessmentId)
                .eq('user_id', userId)
                .single();
            
            if (error) throw error;
            
            const reportUrl = `https://www.bluskyeconsult.com/reports/${userAssessmentId}`;
            
            await supabase
                .from('user_assessments')
                .update({ report_url: reportUrl })
                .eq('id', userAssessmentId);
            
            return res.status(200).json({ success: true, reportUrl });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== ASSESSMENT SHARE RESULTS ==========
    'assessment-share-results': async (req, res) => {
        const { userAssessmentId, recipientEmail, senderName, shareUrl } = req.body;
        
        try {
            const { data: userAssessment } = await supabase
                .from('user_assessments')
                .select('*, assessment:assessments(*)')
                .eq('id', userAssessmentId)
                .single();
            
            if (!userAssessment) throw new Error('Assessment not found');
            
            // Send email with share link
            await fetch(`${process.env.VERCEL_URL || 'https://www.bluskyeconsult.com'}/api/index?action=email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipientEmail,
                    type: 'notification',
                    templateData: {
                        subject: `${senderName} shared assessment results with you`,
                        message: `${senderName} scored ${userAssessment.percentage}% on the ${userAssessment.assessment?.title} assessment. Click below to view the results.`,
                        actionLink: shareUrl,
                        actionText: 'View Results'
                    }
                })
            });
            
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== ASSESSMENT QUESTION COUNT ==========
    'assessment-question-count': async (req, res) => {
        const { assessmentId } = req.query;
        
        try {
            const { count, error } = await supabase
                .from('assessment_questions')
                .select('id', { count: 'exact', head: true })
                .eq('assessment_id', assessmentId);
            
            if (error) throw error;
            return res.status(200).json({ success: true, count: count || 0 });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== ASSESSMENTS DEBUG ==========
    'assessments-debug': async (req, res) => {
        try {
            const { data: assessmentsData, error } = await supabase
                .from('assessments')
                .select('id, title, question_count, is_active');
            
            if (error) throw error;
            
            const countsMap = {};
            for (const assessment of assessmentsData || []) {
                const { count } = await supabase
                    .from('assessment_questions')
                    .select('id', { count: 'exact', head: true })
                    .eq('assessment_id', assessment.id);
                countsMap[assessment.id] = count || 0;
            }
            
            return res.status(200).json({
                success: true,
                data: {
                    assessmentsData,
                    countsMap
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== USER ELIGIBILITY ==========
    'user-eligibility': async (req, res) => {
        const { userId, type } = req.query;
        
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('tier, user_type')
                .eq('id', userId)
                .single();
            
            const isUnlimited = profile?.user_type === 'super_admin' || profile?.user_type === 'admin' || profile?.tier === 'business';
            
            if (type === 'assessments') {
                const limits = {
                    free: 3,
                    registered: 10,
                    professional: 50,
                    employer: 30,
                    business: 999999,
                    admin: 999999,
                    super_admin: 999999,
                    tester: 5
                };
                
                const limit = isUnlimited ? 999999 : (limits[profile?.tier] || limits.free);
                
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                
                const { count } = await supabase
                    .from('user_assessments')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .gte('created_at', startOfMonth.toISOString());
                
                const remaining = isUnlimited ? 999999 : Math.max(0, limit - (count || 0));
                
                return res.status(200).json({
                    success: true,
                    data: {
                        remaining,
                        limit,
                        isUnlimited,
                        canRetake: !isUnlimited ? remaining > 0 : true
                    }
                });
            }
            
            return res.status(200).json({ success: true, data: { isUnlimited } });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== ASSESSMENTS LIST ==========
    'assessments-list': async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('assessments')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return res.status(200).json({ success: true, data: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== USER ASSESSMENT RESULTS ==========
    'user-assessment-results': async (req, res) => {
        const { userId } = req.query;
        
        try {
            const { data, error } = await supabase
                .from('user_assessments')
                .select('assessment_id, score, percentage, completed_at, performance_level')
                .eq('user_id', userId)
                .eq('status', 'completed');
            
            if (error) throw error;
            return res.status(200).json({ success: true, data: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== FORCE CLEAR AUTH ==========
    'force-clear-auth': async (req, res) => {
        return res.status(200).json({ 
            success: true, 
            message: 'Clear auth on client side',
            instructions: 'Use supabase.auth.signOut() and clear localStorage'
        });
    },

    // ========== DATABASE CHECK ==========
    db: async (req, res) => {
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
    },

    // ========== COURSE ENROLLMENT ==========
    'enroll-course': async (req, res) => {
        const { userId, courseId } = req.body;
        
        if (!userId || !courseId) return res.status(400).json({ error: 'User ID and Course ID required' });
        
        try {
            const { data: existing } = await supabase
                .from('course_enrollments')
                .select('id')
                .eq('user_id', userId)
                .eq('course_id', courseId)
                .maybeSingle();
            
            if (existing) {
                return res.status(200).json({ success: true, message: 'Already enrolled', enrolled: true });
            }
            
            await supabase.from('course_enrollments').insert({
                user_id: userId,
                course_id: courseId,
                enrolled_at: new Date().toISOString(),
                progress: 0,
                status: 'active'
            });
            
            return res.status(200).json({ success: true, message: 'Enrolled successfully' });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // ========== UPDATE COURSE PROGRESS ==========
    'update-course-progress': async (req, res) => {
        const { userId, courseId, progress, lessonId } = req.body;
        
        try {
            await supabase
                .from('course_enrollments')
                .update({
                    progress: progress,
                    last_accessed: new Date().toISOString(),
                    last_lesson_id: lessonId
                })
                .eq('user_id', userId)
                .eq('course_id', courseId);
            
            return res.status(200).json({ success: true, progress });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};

// ============================================
// MAIN HANDLER
// ============================================
export default async function handler(req, res) {
    setCors(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { action } = req.query;
    
    if (!action || !handlers[action]) {
        return res.status(200).json({
            name: 'ODUSBABA API',
            version: '5.0.0',
            description: 'Professional Consolidated API - Full site functionality',
            available_actions: Object.keys(handlers),
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    }
    
    try {
        await handlers[action](req, res);
    } catch (error) {
        console.error(`Error in ${action}:`, error);
        return res.status(500).json({ error: error.message });
    }
}
