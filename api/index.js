// api/index.js - UNIFIED API GATEWAY v7.2 (COMPLETE - ALL FEATURES PRESERVED)
// Complete API: Health monitoring, IP geolocation, Email templates, Job fetching (multi-source),
// AI chat, Assessment generation, Course generation, User applications, Profile updates,
// Newsletter, Books, Articles, User stats, Analytics events, Tester management, VA system
// RUTH Standard v7.2 - Production Ready with Enhanced Error Handling
//
// CHANGED (2026-08-07): update-course-progress now sets status/completed_at
// once progress reaches 100 — see the handler itself for details.
//
// CHANGED (2026-08-07): va-execute now calls OpenAI for real (via the existing
// callOpenAI() helper, already used identically by chat/generate-assessment/
// generate-course) using a role-specific system prompt per assistant and the
// user's actual input, instead of always returning the same hardcoded text
// regardless of what was typed. The original hardcoded templates are kept as
// a fallback if the OpenAI call fails for any reason, matching this file's
// existing fallback philosophy used everywhere else.

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
let supabase = null;

function getSupabase() {
    if (!supabase) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
    return supabase;
}

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

// ============================================
// SECURITY: IP blocking + event logging (NEW — 2026-08-07)
// Powers SecurityDashboard.jsx, which was previously reading from
// security_events (nothing ever wrote to it) and writing to blocked_ips
// (nothing ever checked it). isIPBlocked() is called once, globally, at the
// top of the main handler below, before any action runs. logSecurityEvent()
// is called wherever the gateway can genuinely observe something
// security-relevant — currently blocked-IP attempts and rate-limit
// violations. Both fail open/silent — a broken security check must never
// itself become an outage, and logging failures must never break the
// request they're logging.
//
// KNOWN LIMITATION: login happens directly between the browser and Supabase
// Auth (supabase.auth.signInWithPassword) — it never passes through this
// gateway, so failed-login-attempt tracking isn't possible from here
// without a bigger architecture change (routing auth through a dedicated
// backend action instead of calling Supabase Auth directly from the
// client).
// ============================================

function getRequestIP(req) {
    return (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '0.0.0.0').replace(/^::ffff:/, '');
}

async function isIPBlocked(ip) {
    try {
        const supabaseClient = getSupabase();
        const { data } = await supabaseClient
            .from('blocked_ips')
            .select('id')
            .eq('ip_address', ip)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();
        return !!data;
    } catch (err) {
        console.warn('IP block check failed, failing open:', err.message);
        return false;
    }
}

async function logSecurityEvent(eventType, ip, severity = 'info', metadata = {}) {
    try {
        const supabaseClient = getSupabase();
        await supabaseClient.from('security_events').insert({
            event_type: eventType,
            ip_address: ip,
            severity,
            metadata,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.warn('Security event logging failed:', err.message);
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return emailRegex.test(email);
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

// ============================================
// callOpenAIImage / callOpenAIAudio (NEW — 2026-08-07)
// Real DALL-E and TTS helpers, backing the generateCourseImage/
// generateLessonImage/generateLessonAudio handlers below. CourseEditor.jsx
// already calls these three actions correctly — they previously had no
// real backend and always failed with an honest error. Both confirmed core
// features per the platform's own product documentation, not stretch
// features, so building them for real rather than leaving flagged.
// ============================================

async function callOpenAIImage(prompt) {
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard'
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].url;
}

async function callOpenAIAudio(text, voice = 'alloy') {
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    // TTS input has a 4096-character limit — trim defensively rather than
    // erroring on longer lesson content.
    const trimmedText = text.length > 4000 ? text.substring(0, 4000) : text;

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'tts-1',
            input: trimmedText,
            voice
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
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
// VA CATEGORY ICONS (2026-08-07)
// The virtual_assistants table (admin-managed via VirtualAssistantManager.jsx)
// doesn't store an icon — this maps its category field to a display emoji,
// used by the 'virtual-assistants' list handler below. The old
// VA_SYSTEM_PROMPTS/getVASystemPrompt helpers that used to key off a fixed
// set of hardcoded VA ids have been removed — va-execute now builds each
// prompt from the real VA record it looks up, so any admin-created
// assistant works without needing a matching entry here.
// ============================================

// FIXED (2026-08-08): matches the real category check constraint on
// virtual_assistants (career, resume, writing, productivity only) —
// interview/skill/job/legal were never valid values, so any VA created
// with one of those (impossible now, since the constraint blocks it) would
// never have hit this map anyway. Kept a sensible fallback icon for any
// unrecognized category rather than assuming these four are truly
// exhaustive forever.
const VA_CATEGORY_ICONS = {
    resume: '📄',
    career: '💼',
    writing: '✍️',
    productivity: '⚡'
};

// ============================================
// MOCK DATA (From Code 2)
// ============================================

function getMockAssessments() {
    return [
        {
            id: 'mock-1',
            title: 'Career Aptitude Test',
            description: 'Discover your ideal career path based on your skills and interests',
            question_count: 15,
            time_limit_minutes: 25,
            difficulty: 'intermediate',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'mock-2',
            title: 'Leadership Potential Assessment',
            description: 'Evaluate your leadership capabilities and identify growth areas',
            question_count: 20,
            time_limit_minutes: 30,
            difficulty: 'advanced',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'mock-3',
            title: 'Communication Skills Evaluation',
            description: 'Assess your communication effectiveness in the workplace',
            question_count: 12,
            time_limit_minutes: 20,
            difficulty: 'intermediate',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'mock-4',
            title: 'Problem Solving Skills Test',
            description: 'Test your analytical and problem-solving abilities',
            question_count: 10,
            time_limit_minutes: 25,
            difficulty: 'intermediate',
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'mock-5',
            title: 'Emotional Intelligence Assessment',
            description: 'Evaluate your EQ and interpersonal skills',
            question_count: 15,
            time_limit_minutes: 25,
            difficulty: 'advanced',
            is_active: true,
            created_at: new Date().toISOString()
        }
    ];
}

// ============================================
// COMPLETE EMAIL TEMPLATES (ALL 10 TEMPLATES)
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
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a;padding:20px;text-align:center;">
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
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a;padding:20px;text-align:center;">
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
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a;padding:20px;text-align:center;">
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
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a;padding:20px;text-align:center;">
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
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a;padding:20px;text-align:center;">
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
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a;padding:20px;text-align:center;">
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
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a;padding:20px;text-align:center;">
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
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a;padding:20px;text-align:center;">
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
        <div style="background:linear-gradient(135deg,#0B3C5D,#0f172a;padding:20px;text-align:center;">
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
// JOB FETCHING FUNCTION (Multi-source)
// ============================================

async function fetchAllJobs() {
    const timeout = 10000;
    let allJobs = [];

    // 1. Jobicy API
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
        console.warn('Jobicy fetch failed:', err.message);
    }

    // 2. Remotive API
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
        console.warn('Remotive fetch failed:', err.message);
    }

    // 3. UK Civil Service (RSS Feed)
    try {
        const response = await safeFetch('https://www.civilservicejobs.service.gov.uk/csr/index.cgi?action=feed.homesite&language=en', timeout);
        const text = await response.text();
        const matches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        const jobs = matches.slice(0, 5).map(item => {
            const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
            const descMatch = item.match(/<description>([\s\S]*?)<\/description>/i);
            const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
            return {
                title: titleMatch ? titleMatch[1].trim() : 'UK Civil Service Position',
                company: 'UK Civil Service',
                location: 'United Kingdom',
                source_country: 'GB',
                source_name: 'Civil Service Jobs',
                description: descMatch ? descMatch[1].substring(0, 500) : '',
                salary_range: 'Civil Service Pay Scale',
                job_type: 'full_time',
                external_url: linkMatch ? linkMatch[1] : '',
                sponsorship_eligible: false
            };
        });
        allJobs.push(...jobs);
    } catch (err) {
        console.warn('UK Civil Service fetch failed:', err.message);
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

    return { jobs: uniqueJobs.slice(0, 30), total: uniqueJobs.length };
}

// ============================================
// COMPLETE ACTION HANDLERS (ALL 40+ ACTIONS)
// ============================================

const handlers = {
    // ========== HEALTH & SYSTEM ==========
    health: async (req, res) => {
        const supabaseClient = getSupabase();
        const start = Date.now();
        const { error } = await supabaseClient.from('profiles').select('id', { count: 'exact', head: true });
        
        res.status(200).json({
            status: error ? 'degraded' : 'healthy',
            responseTime: Date.now() - start,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'production',
            services: {
                database: error ? 'unhealthy' : 'healthy',
                api: 'healthy'
            }
        });
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
            city: req.headers['x-vercel-ip-city'] || null,
            timezone: req.headers['x-vercel-ip-timezone'] || null
        };
        
        return res.status(200).json({
            success: true,
            ip: cleanIp,
            geolocation: geoData,
            timestamp: new Date().toISOString()
        });
    },

    // ========== JOB FETCH ==========
    jobs: async (req, res) => {
        try {
            const result = await fetchAllJobs();
            return res.status(200).json({
                success: true,
                count: result.total,
                jobs: result.jobs,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            const mockJobs = [
                { title: 'Senior Software Engineer', company: 'Tech Corp', location: 'Remote', description: 'Build amazing products', salary_range: '$120k - $180k', job_type: 'remote' },
                { title: 'Product Manager', company: 'Innovate Inc', location: 'London, UK', description: 'Lead product strategy', salary_range: '£80k - £100k', job_type: 'full_time' },
                { title: 'Data Scientist', company: 'AI Solutions', location: 'Remote', description: 'Machine learning models', salary_range: '$130k - $160k', job_type: 'remote' }
            ];
            return res.status(200).json({ success: true, jobs: mockJobs, count: mockJobs.length, fallback: true });
        }
    },


    // NEW (2026-08-16): the 'fetch-jobs' action that used to live here was
    // removed — it duplicated api/cron/sync-external-jobs.js, which wraps
    // the proven-correct rssJobService.js and is what vercel.json's cron
    // config actually targets now. Keeping both was redundant; the real
    // cron file is the better implementation (reuses tested service code
    // rather than reimplementing fetch logic independently).

    // ========== JOBS STATS ==========
    'jobs-stats': async (req, res) => {
        const supabaseClient = getSupabase();
        try {
            const [total, active, byCountry] = await Promise.all([
                supabaseClient.from('jobs').select('*', { count: 'exact', head: true }),
                supabaseClient.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('compliance_status', 'approved'),
                supabaseClient.from('jobs').select('country_code')
            ]);
            
            const countryMap = {};
            (byCountry.data || []).forEach(job => {
                countryMap[job.country_code] = (countryMap[job.country_code] || 0) + 1;
            });
            
            res.status(200).json({
                total: total.count || 0,
                active: active.count || 0,
                byCountry: countryMap,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(200).json({
                total: 82,
                active: 45,
                byCountry: { GB: 20, US: 15, NG: 10, CA: 8, AU: 6, DE: 5, FR: 4, IE: 3 },
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }
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

    // ========== HR TOOLS (NEW — 2026-08-08) ==========
    // HRToolsPage.jsx has always called these 6 actions, and api.js always
    // rejected before ever making a request, since none of these handlers
    // existed — the entire HR Tools page has shown a raw technical error
    // message to every user for every tool since the page was built.
    // Confirmed as core, country-aware features per the platform's own
    // product documentation. All reuse the existing callOpenAI() helper,
    // same pattern as every other AI feature in this file.

    analyzeCV: async (req, res) => {
        const { cvText } = req.body;
        if (!cvText) return res.status(400).json({ error: 'cvText is required' });

        try {
            const data = await callOpenAI([
                { role: 'system', content: 'You are an expert CV/resume reviewer. Analyze the CV for ATS compatibility, clarity, and impact. Give specific, actionable feedback: strengths, areas for improvement, an estimated ATS score out of 100, and concrete next steps. Use markdown formatting.' },
                { role: 'user', content: cvText }
            ], 1200, 0.6);

            return res.status(200).json({ success: true, analysis: data.choices[0].message.content });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'simulate-interview': async (req, res) => {
        const { role, questions } = req.body;
        if (!role) return res.status(400).json({ error: 'role is required' });

        try {
            const priorQuestions = Array.isArray(questions) && questions.length > 0
                ? `Previously asked: ${questions.join('; ')}. Ask a different question this time.`
                : '';

            const data = await callOpenAI([
                { role: 'system', content: `You are an experienced interviewer running a mock interview. Given the candidate's target role and background, ask one realistic interview question (behavioral or technical, appropriate to the role), then provide guidance on how to structure a strong answer using the STAR method where relevant. Use markdown formatting.` },
                { role: 'user', content: `${role}. ${priorQuestions}` }
            ], 800, 0.7);

            return res.status(200).json({ success: true, feedback: data.choices[0].message.content });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    checkRights: async (req, res) => {
        const { situation, country } = req.body;
        if (!situation) return res.status(400).json({ error: 'situation is required' });

        try {
            const data = await callOpenAI([
                { role: 'system', content: `You are a workplace rights advisor. Give general information about employment rights relevant to ${country || 'the UK'} based on the situation described — dismissal, discrimination, working hours, leave entitlements, etc. as applicable. End with a clear note that this is general information, not legal advice, and recommend consulting a qualified employment lawyer or the relevant national labor authority for specific guidance. Use markdown formatting.` },
                { role: 'user', content: situation }
            ], 1000, 0.5);

            return res.status(200).json({ success: true, advice: data.choices[0].message.content });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    generateGrievance: async (req, res) => {
        const { situation, details } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const data = await callOpenAI([
                { role: 'system', content: 'You are an HR professional drafting a formal grievance letter. Write a professional, factual grievance letter template based on the situation described — include placeholders like [Date], [Manager Name] where specific details aren\'t given. Structure: subject line, background, details of the issue, desired resolution, closing. Use markdown formatting.' },
                { role: 'user', content }
            ], 1200, 0.5);

            return res.status(200).json({ success: true, grievance: data.choices[0].message.content });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'analyze-contract': async (req, res) => {
        const { contractText } = req.body;
        if (!contractText) return res.status(400).json({ error: 'contractText is required' });

        try {
            const data = await callOpenAI([
                { role: 'system', content: 'You are an employment contract reviewer. Analyze the contract terms for potentially concerning clauses (restrictive non-competes, unclear termination terms, missing statutory entitlements, unusual liability clauses, etc.). Flag specific issues found, explain why each matters in plain language, and note this is general review, not legal advice — recommend a qualified employment lawyer for anything significant. Use markdown formatting.' },
                { role: 'user', content: contractText }
            ], 1200, 0.5);

            return res.status(200).json({ success: true, analysis: data.choices[0].message.content });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'calculate-salary': async (req, res) => {
        const { situation, details } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const data = await callOpenAI([
                { role: 'system', content: 'You are a compensation analyst. Given a job title, location, experience level, and industry, provide a realistic market salary range estimate with reasoning (factors that push it higher or lower), and 2-3 practical negotiation tips. Be clear this is an estimate based on general market knowledge, not a guaranteed figure. Use markdown formatting.' },
                { role: 'user', content }
            ], 1000, 0.5);

            return res.status(200).json({ success: true, result: data.choices[0].message.content });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== STRIPE CHECKOUT (NEW — 2026-08-09) ==========
    // Phase D: creates a Stripe Checkout session for a tier upgrade. The
    // actual tier upgrade happens in api/stripe-webhook.js when Stripe
    // confirms payment — never here, since a session being *created*
    // doesn't mean the user actually paid.
    //
    // SETUP REQUIRED: in your Stripe Dashboard, create a Product + Price
    // for each paid tier (Professional, Employer, Business), then set
    // these environment variables in Vercel to the resulting Price IDs:
    // STRIPE_PRICE_PROFESSIONAL, STRIPE_PRICE_EMPLOYER, STRIPE_PRICE_BUSINESS
    'create-checkout-session': async (req, res) => {
        const { tierName, userId, userEmail } = req.body;
        if (!tierName || !userId) {
            return res.status(400).json({ error: 'tierName and userId are required' });
        }

        const priceIdMap = {
            professional: process.env.STRIPE_PRICE_PROFESSIONAL,
            employer: process.env.STRIPE_PRICE_EMPLOYER,
            business: process.env.STRIPE_PRICE_BUSINESS
        };

        const priceId = priceIdMap[tierName];
        if (!priceId) {
            return res.status(400).json({ error: `No Stripe price configured for tier: ${tierName}. Set STRIPE_PRICE_${tierName.toUpperCase()} in your environment variables.` });
        }

        try {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const siteUrl = process.env.SITE_URL || 'https://www.bluskyeconsult.com';

            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [{ price: priceId, quantity: 1 }],
                success_url: `${siteUrl}/dashboard?upgraded=true`,
                cancel_url: `${siteUrl}/pricing`,
                client_reference_id: userId,
                customer_email: userEmail,
                metadata: { userId, tierName }
            });

            return res.status(200).json({ success: true, url: session.url, sessionId: session.id });
        } catch (error) {
            console.error('Stripe checkout session error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Lets a user manage or cancel their existing subscription via
    // Stripe's own hosted billing portal, rather than building that UI
    // from scratch.
    'create-billing-portal-session': async (req, res) => {
        const { customerId } = req.body;
        if (!customerId) return res.status(400).json({ error: 'customerId is required' });

        try {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const siteUrl = process.env.SITE_URL || 'https://www.bluskyeconsult.com';

            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: `${siteUrl}/dashboard`
            });

            return res.status(200).json({ success: true, url: session.url });
        } catch (error) {
            console.error('Stripe billing portal error:', error);
            return res.status(500).json({ success: false, error: error.message });
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
                { role: 'system', content: 'You are an instructional designer. Return valid JSON.' },
                { role: 'user', content: `Create a course outline for "${topic}" at ${level} level. Return as JSON with title, description, modules array.` }
            ], 1500, 0.7);

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const outline = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: topic, description: '', modules: [] };

            return res.status(200).json({ success: true, outline });
        } catch (error) {
            return res.status(200).json({ 
                success: true, 
                fallback: true,
                outline: {
                    title: `${topic} Course`,
                    description: `A comprehensive ${level} level course on ${topic}.`,
                    modules: [{ title: `Introduction to ${topic}`, lessons: ['Getting Started', 'Core Concepts'] }]
                }
            });
        }
    },

    // ========== COURSE IMAGE / AUDIO GENERATION (NEW — 2026-08-07) ==========
    // Backs CourseEditor.jsx's generateCoverImage/generateLessonIllustration/
    // generateLessonAudio functions, which previously had no real backend
    // and always failed with an honest error. Confirmed core features per
    // the platform's own product documentation.
    //
    // NOTE ON IMAGE URLS: DALL-E returns a temporary OpenAI-hosted URL that
    // expires after about an hour. This is fine for previewing right after
    // generation, but for a permanent cover image, save it to your own
    // storage (or re-run generation) before relying on it long-term — this
    // handler does not currently re-upload to Supabase Storage.
    //
    // NOTE ON AUDIO: unlike images, TTS returns raw audio bytes, not a URL —
    // this handler uploads it to a Supabase Storage bucket named
    // 'course-audio'. If that bucket doesn't exist yet, create it in your
    // Supabase dashboard (Storage → New bucket → name it exactly
    // 'course-audio' → make it Public) before using this feature.
    generateCourseImage: async (req, res) => {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        try {
            const imageUrl = await callOpenAIImage(prompt);
            return res.status(200).json({ success: true, imageUrl });
        } catch (error) {
            console.error('Course image generation error:', error);
            return res.status(200).json({ success: false, error: error.message });
        }
    },

    generateLessonImage: async (req, res) => {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        try {
            const imageUrl = await callOpenAIImage(prompt);
            return res.status(200).json({ success: true, imageUrl });
        } catch (error) {
            console.error('Lesson image generation error:', error);
            return res.status(200).json({ success: false, error: error.message });
        }
    },

    generateLessonAudio: async (req, res) => {
        const { text, lessonId } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const supabaseClient = getSupabase();

        try {
            const audioBuffer = await callOpenAIAudio(text, 'alloy');
            const fileName = `audio/${lessonId || 'lesson'}-${Date.now()}.mp3`;

            const { error: uploadError } = await supabaseClient.storage
                .from('course-audio')
                .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

            if (uploadError) {
                throw new Error(
                    uploadError.message.includes('not found') || uploadError.message.includes('Bucket')
                        ? "Storage bucket 'course-audio' doesn't exist yet — create it in your Supabase dashboard (Storage → New bucket → name it 'course-audio' → make it Public), then try again."
                        : uploadError.message
                );
            }

            const { data: publicUrlData } = supabaseClient.storage
                .from('course-audio')
                .getPublicUrl(fileName);

            // Rough duration estimate: ~150 words per minute average speech rate.
            const wordCount = text.trim().split(/\s+/).length;
            const estimatedDuration = Math.ceil((wordCount / 150) * 60);

            return res.status(200).json({ success: true, audioUrl: publicUrlData.publicUrl, duration: estimatedDuration });
        } catch (error) {
            console.error('Lesson audio generation error:', error);
            return res.status(200).json({ success: false, error: error.message });
        }
    },

    // ========== COURSES LIST ==========
    'courses-list': async (req, res) => {
        const supabaseClient = getSupabase();
        
        try {
            const { data, error } = await supabaseClient
                .from('courses')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return res.status(200).json({ success: true, data: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== COURSES STATS ==========
    'courses-stats': async (req, res) => {
        const supabaseClient = getSupabase();
        
        try {
            const [total, published] = await Promise.all([
                supabaseClient.from('courses').select('*', { count: 'exact', head: true }),
                supabaseClient.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true)
            ]);
            
            res.status(200).json({
                total: total.count || 0,
                published: published.count || 0,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(200).json({
                total: 15,
                published: 12,
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }
    },

    // ========== ASSESSMENTS LIST (Enhanced with mock data) ==========
    'assessments-list': async (req, res) => {
        const supabaseClient = getSupabase();
        
        try {
            const { data, error } = await supabaseClient
                .from('assessments')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (error) {
                if (error.code === '42P01') {
                    return res.status(200).json({
                        success: true,
                        data: getMockAssessments(),
                        mock: true,
                        message: 'Table not found. Using sample data.'
                    });
                }
                throw error;
            }

            if (!data || data.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: getMockAssessments(),
                    mock: true,
                    message: 'No assessments found. Using sample data.'
                });
            }

            return res.status(200).json({
                success: true,
                data: data,
                mock: false
            });
        } catch (error) {
            console.error('Assessments list error:', error);
            return res.status(200).json({
                success: true,
                data: getMockAssessments(),
                mock: true,
                error: error.message
            });
        }
    },

    // ========== ASSESSMENTS STATS ==========
    'assessments-stats': async (req, res) => {
        const supabaseClient = getSupabase();
        
        try {
            const [total, active, completed] = await Promise.all([
                supabaseClient.from('assessments').select('*', { count: 'exact', head: true }),
                supabaseClient.from('assessments').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabaseClient.from('user_assessments').select('*', { count: 'exact', head: true }).eq('status', 'completed')
            ]);
            
            res.status(200).json({
                total: total.count || 0,
                active: active.count || 0,
                completed: completed.count || 0,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(200).json({
                total: 8,
                active: 5,
                completed: 3,
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }
    },

    // ========== ASSESSMENT QUESTION COUNT ==========
    'assessment-question-count': async (req, res) => {
        const { assessmentId } = req.query;
        const supabaseClient = getSupabase();
        
        try {
            const { count, error } = await supabaseClient
                .from('assessment_questions')
                .select('id', { count: 'exact', head: true })
                .eq('assessment_id', assessmentId);
            
            if (error) throw error;
            return res.status(200).json({ success: true, count: count || 0 });
        } catch (error) {
            return res.status(200).json({ success: true, count: 10, fallback: true });
        }
    },

    // ========== USER ASSESSMENT RESULTS ==========
    'user-assessment-results': async (req, res) => {
        const { userId } = req.query;
        const supabaseClient = getSupabase();
        
        try {
            const { data, error } = await supabaseClient
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

    // ========== ASSESSMENT RESULTS ==========
    'assessment-results': async (req, res) => {
        const { id } = req.query;
        const authHeader = req.headers.authorization;
        const supabaseClient = getSupabase();
        
        try {
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
            
            if (userError || !user) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
            const { data, error } = await supabaseClient
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

    // ========== ASSESSMENT GENERATE REPORT ==========
    'assessment-generate-report': async (req, res) => {
        const { userAssessmentId, userId } = req.body;
        const supabaseClient = getSupabase();
        
        try {
            const { data: userAssessment, error } = await supabaseClient
                .from('user_assessments')
                .select('*, assessment:assessments(*)')
                .eq('id', userAssessmentId)
                .eq('user_id', userId)
                .single();
            
            if (error) throw error;
            
            const reportUrl = `https://www.bluskyeconsult.com/reports/${userAssessmentId}`;
            
            await supabaseClient
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
            fetch(`${process.env.VERCEL_URL || 'https://www.bluskyeconsult.com'}/api/index?action=email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipientEmail,
                    type: 'notification',
                    templateData: {
                        subject: `${senderName} shared assessment results with you`,
                        message: `${senderName} has shared assessment results with you. Click below to view.`,
                        actionLink: shareUrl,
                        actionText: 'View Results'
                    }
                })
            }).catch(() => {});
            
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== ASSESSMENTS DEBUG (Enhanced with mock data) ==========
    'assessments-debug': async (req, res) => {
        const supabaseClient = getSupabase();
        
        try {
            const { data: assessmentsData, error } = await supabaseClient
                .from('assessments')
                .select('id, title, question_count, is_active')
                .limit(50);

            if (error && error.code === '42P01') {
                return res.status(200).json({
                    success: true,
                    tableExists: false,
                    message: 'Assessments table not found. Using sample data.',
                    data: {
                        assessmentsData: getMockAssessments(),
                        countsMap: {},
                        totalAssessments: 5,
                        totalQuestions: 0
                    }
                });
            }

            if (error) throw error;
            
            const countsMap = {};
            if (assessmentsData && assessmentsData.length > 0) {
                for (const assessment of assessmentsData) {
                    const { count, error: countError } = await supabaseClient
                        .from('assessment_questions')
                        .select('id', { count: 'exact', head: true })
                        .eq('assessment_id', assessment.id);
                    
                    if (!countError) {
                        countsMap[assessment.id] = count || 0;
                    }
                }
            }
            
            return res.status(200).json({
                success: true,
                tableExists: true,
                data: {
                    assessmentsData: assessmentsData || [],
                    countsMap,
                    totalAssessments: assessmentsData?.length || 0,
                    totalQuestions: Object.values(countsMap).reduce((a, b) => a + b, 0)
                }
            });
        } catch (error) {
            console.error('Assessments debug error:', error);
            return res.status(200).json({
                success: true,
                tableExists: false,
                error: error.message,
                data: {
                    assessmentsData: getMockAssessments(),
                    countsMap: {},
                    totalAssessments: 5,
                    totalQuestions: 0
                }
            });
        }
    },

    // ========== USER ELIGIBILITY ==========
    'user-eligibility': async (req, res) => {
        const { userId, type } = req.query;
        const supabaseClient = getSupabase();
        
        try {
            const { data: profile } = await supabaseClient
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
                
                const { count } = await supabaseClient
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

    // ========== SEND EMAIL ==========
    email: async (req, res) => {
        const { to, subject, html, type, templateData } = req.body;

        if (!to || !isValidEmail(to)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const rateLimitKey = `email:${to}:${type || 'general'}`;
        if (!checkRateLimit(rateLimitKey, 3)) {
            // NEW (2026-08-07): log the rate-limit violation as a security event.
            await logSecurityEvent('rate_limit_exceeded', getRequestIP(req), 'warning', { action: 'email', to, type: type || 'general' });
            return res.status(429).json({ error: 'Too many requests. Please wait.' });
        }

        try {
            let emailHtml = html;
            let emailSubject = subject;

            if (!emailHtml && type && emailTemplates[type]) {
                emailHtml = emailTemplates[type](templateData || {});
                emailSubject = subject || 'ODUSBABA Notification';
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
        const supabaseClient = getSupabase();
        
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        
        try {
            const { error } = await supabaseClient
                .from('newsletter_subscribers')
                .upsert({
                    email,
                    name: name || null,
                    subscribed_at: new Date().toISOString(),
                    status: 'active'
                });
            
            if (error && error.code !== '23505') throw error;
            
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

    // ========== NEWSLETTER STATS ==========
    'newsletter-stats': async (req, res) => {
        const supabaseClient = getSupabase();
        
        try {
            const { count: subscribers } = await supabaseClient
                .from('newsletter_subscribers')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');
            
            return res.status(200).json({
                success: true,
                stats: {
                    subscribers: subscribers || 0,
                    openRate: 68,
                    weeklyIssues: 156
                }
            });
        } catch (error) {
            return res.status(200).json({
                success: true,
                stats: { subscribers: 5284, openRate: 68, weeklyIssues: 156 }
            });
        }
    },

    // ========== ARTICLES LIST ==========
    'articles-list': async (req, res) => {
        const supabaseClient = getSupabase();
        
        try {
            const { data, error } = await supabaseClient
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
        const supabaseClient = getSupabase();
        
        try {
            let query = supabaseClient.from('articles').select('*');
            if (slug) query = query.eq('slug', slug);
            if (id) query = query.eq('id', id);
            
            const { data, error } = await query.single();
            if (error) throw error;
            
            return res.status(200).json({ success: true, article: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== BOOKS LIST ==========
    'books-list': async (req, res) => {
        const supabaseClient = getSupabase();
        
        try {
            const { data, error } = await supabaseClient
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

    // ========== TRENDING TOPICS ==========
    'trending-topics': async (req, res) => {
        return res.status(200).json({
            success: true,
            topics: ['HR Tech', 'Remote Work', 'AI Recruitment', 'Employee Wellness', 'Diversity & Inclusion', 'Talent Retention']
        });
    },

    // ========== TESTER CREATE ==========
    'tester-create': async (req, res) => {
        const { email, name, uses = 10, days = 30 } = req.body;
        const supabaseClient = getSupabase();
        
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        
        try {
            const { data, error } = await supabaseClient
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
        const supabaseClient = getSupabase();
        
        try {
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
            
            if (userError || !user) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
            const [applications, savedJobs, courses, assessments] = await Promise.all([
                supabaseClient.from('job_applications').select('id', { count: 'exact' }).eq('applicant_id', user.id),
                supabaseClient.from('saved_jobs').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabaseClient.from('course_enrollments').select('id', { count: 'exact' }).eq('user_id', user.id),
                supabaseClient.from('user_assessments').select('id', { count: 'exact' }).eq('user_id', user.id)
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
        const supabaseClient = getSupabase();
        
        try {
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
            
            if (userError || !user) throw new Error('Unauthorized');
            
            const { data, error } = await supabaseClient
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
        const supabaseClient = getSupabase();
        
        try {
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
            
            if (userError || !user || user.id !== userId) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
            const { data, error } = await supabaseClient
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

    // ========== VA CREDITS ==========
    'va-credits': async (req, res) => {
        const { userId } = req.query;
        const authHeader = req.headers.authorization;
        const supabaseClient = getSupabase();
        
        try {
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
            
            if (userError || !user || user.id !== userId) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('tier, user_type')
                .eq('id', userId)
                .single();
            
            const isUnlimited = profile?.user_type === 'super_admin' || profile?.user_type === 'admin' || profile?.tier === 'business';
            
            if (isUnlimited) {
                return res.status(200).json({ success: true, credits: 999999, isUnlimited: true });
            }
            
            let { data: credits } = await supabaseClient
                .from('va_credits')
                .select('balance')
                .eq('user_id', userId)
                .single();
            
            if (!credits) {
                const defaultCredits = { free: 5, registered: 10, professional: 25, employer: 20, tester: 10 }[profile?.tier] || 5;
                await supabaseClient.from('va_credits').insert({ user_id: userId, balance: defaultCredits });
                credits = { balance: defaultCredits };
            }
            
            return res.status(200).json({ success: true, credits: credits.balance, isUnlimited: false });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== VA TASKS ==========
    'va-tasks': async (req, res) => {
        const { userId } = req.query;
        const authHeader = req.headers.authorization;
        const supabaseClient = getSupabase();
        
        try {
            const token = authHeader?.split(' ')[1];
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
            
            if (userError || !user || user.id !== userId) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
            const { data, error } = await supabaseClient
                .from('va_tasks')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            return res.status(200).json({ success: true, tasks: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== VA STATS ==========
    'va-stats': async (req, res) => {
        const supabaseClient = getSupabase();
        
        try {
            const [totalTasks, completedTasks] = await Promise.all([
                supabaseClient.from('va_tasks').select('*', { count: 'exact', head: true }),
                supabaseClient.from('va_tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed')
            ]);
            
            res.status(200).json({
                totalTasks: totalTasks.count || 0,
                completedTasks: completedTasks.count || 0,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(200).json({
                totalTasks: 156,
                completedTasks: 89,
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }
    },

    // ========== VIRTUAL ASSISTANTS ==========
    // CHANGED (2026-08-07): now queries the real virtual_assistants table
    // (managed via VirtualAssistantManager.jsx) instead of returning a
    // hardcoded 6-item array. This was the architecture split flagged in
    // Phase 9 — admin-created VAs are now the actual public catalog.
    'virtual-assistants': async (req, res) => {
        const supabaseClient = getSupabase();
        
        try {
            const { data, error } = await supabaseClient
                .from('virtual_assistants')
                .select('*')
                .eq('is_active', true)
                .order('category', { ascending: true });
            
            if (error) throw error;
            
            const assistants = (data || []).map(va => ({
                id: va.id,
                name: va.name,
                category: va.category,
                icon: VA_CATEGORY_ICONS[va.category] || '🤖',
                price: va.price,
                description: va.description,
                longDescription: va.long_description,
                tier: 'free',
                processingTime: `${va.processing_time_minutes || 5} min`,
                rating: 4.8,
                reviews: 0
            }));
            
            return res.status(200).json({ success: true, assistants });
        } catch (error) {
            console.error('Error loading virtual assistants:', error);
            return res.status(200).json({ success: true, assistants: [], fallback: true, error: error.message });
        }
    },

    // ========== VA EXECUTE ==========
    // CHANGED (2026-08-07): assistantId is now a real virtual_assistants
    // table UUID (admin-managed via VirtualAssistantManager.jsx), not one of
    // a fixed set of hardcoded ids. This looks up the actual VA record to
    // build a specific system prompt from its name/category/description,
    // and uses the admin-provided sample_output as the fallback if the
    // OpenAI call fails — so any admin-created assistant works correctly
    // without needing a matching hardcoded entry anywhere in this file.
    'va-execute': async (req, res) => {
        const { assistantId, input, userId } = req.body;
        
        if (!assistantId || !input) {
            return res.status(400).json({ error: 'Assistant ID and input required' });
        }
        
        const supabaseClient = getSupabase();
        
        let va = null;
        try {
            const { data } = await supabaseClient
                .from('virtual_assistants')
                .select('*')
                .eq('id', assistantId)
                .single();
            va = data;
        } catch (err) {
            console.warn('VA lookup failed:', err.message);
        }
        
        const systemPrompt = va
            ? `You are ${va.name}, a professional ${va.category ? va.category + ' ' : ''}assistant. ${va.long_description || va.description || ''} Give specific, actionable advice based on what the user shares. Use markdown formatting for readability.`
            : 'You are a professional career assistant. Give specific, actionable advice based on what the user shares. Use markdown formatting for readability.';
        
        let output;
        let usedFallback = false;
        
        try {
            const data = await callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: input }
            ], 1500, 0.7);
            output = data.choices[0].message.content;
        } catch (err) {
            console.warn(`VA OpenAI call failed for ${assistantId}, using fallback:`, err.message);
            usedFallback = true;
            output = va?.sample_output || `Thank you for using ${va?.name || 'this assistant'}. Based on your request:\n\n"${input.substring(0, 200)}"\n\nI've analyzed your request and prepared personalized recommendations. Would you like me to help with anything else?`;
        }
        
        try {
            const { data: credits } = await supabaseClient
                .from('va_credits')
                .select('balance')
                .eq('user_id', userId)
                .single();
            
            if (credits && credits.balance > 0) {
                await supabaseClient
                    .from('va_credits')
                    .update({ balance: credits.balance - 1 })
                    .eq('user_id', userId);
                
                await supabaseClient
                    .from('va_tasks')
                    .insert({
                        user_id: userId,
                        va_id: assistantId,
                        input: input,
                        output: output,
                        status: 'completed',
                        created_at: new Date().toISOString(),
                        completed_at: new Date().toISOString()
                    });
            }
        } catch (err) {
            console.warn('Credit deduction failed:', err.message);
        }
        
        return res.status(200).json({ success: true, output, usedFallback });
    },

    // ========== VA FEEDBACK ==========
    'va-feedback': async (req, res) => {
        const { taskId, rating } = req.body;
        const supabaseClient = getSupabase();
        
        try {
            await supabaseClient
                .from('va_tasks')
                .update({ user_rating: rating })
                .eq('id', taskId);
            
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== TRACK EVENT ==========
    'track-event': async (req, res) => {
        const { event_type, event_data, user_id } = req.body;
        
        console.log(`📊 Event Tracked: ${event_type}`);
        
        const supabaseClient = getSupabase();
        try {
            await supabaseClient.from('analytics_events').insert({
                event_type,
                event_data,
                user_id: user_id || null,
                created_at: new Date().toISOString()
            });
        } catch (e) {
            console.log('Analytics storage skipped:', e.message);
        }
        
        return res.status(200).json({ success: true, message: 'Event tracked' });
    },

    // ========== COURSE ENROLLMENT ==========
    'enroll-course': async (req, res) => {
        const { userId, courseId } = req.body;
        const supabaseClient = getSupabase();
        
        if (!userId || !courseId) return res.status(400).json({ error: 'User ID and Course ID required' });
        
        try {
            const { data: existing } = await supabaseClient
                .from('course_enrollments')
                .select('id')
                .eq('user_id', userId)
                .eq('course_id', courseId)
                .maybeSingle();
            
            if (existing) {
                return res.status(200).json({ success: true, message: 'Already enrolled', enrolled: true });
            }
            
            await supabaseClient.from('course_enrollments').insert({
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
    // CHANGED (2026-08-07): now sets status/completed_at once progress
    // reaches 100 — previously neither field was ever set, so nothing that
    // checked course completion (e.g. CoursesPage.jsx) could ever see a
    // course as finished even at 100% progress.
    'update-course-progress': async (req, res) => {
        const { userId, courseId, progress, lessonId } = req.body;
        const supabaseClient = getSupabase();
        
        try {
            const updates = {
                progress: progress,
                last_accessed: new Date().toISOString(),
                last_lesson_id: lessonId
            };
            
            let certificateId = null;
            
            if (progress >= 100) {
                updates.status = 'completed';
                updates.completed_at = new Date().toISOString();
            }
            
            await supabaseClient
                .from('course_enrollments')
                .update(updates)
                .eq('user_id', userId)
                .eq('course_id', courseId);
            
            // NEW (2026-08-07): auto-issue a certificate on first completion,
            // confirmed as a core feature in the platform's product
            // documentation. unique(user_id, course_id) on course_certificates
            // means this is safe to attempt on every completion call — a
            // duplicate insert just fails silently and is ignored, so a user
            // re-triggering 100% progress doesn't create multiple certificates.
            if (progress >= 100) {
                const certificateNumber = `ODB-${courseId.toString().substring(0, 8).toUpperCase()}-${userId.toString().substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
                
                const { data: newCert, error: certError } = await supabaseClient
                    .from('course_certificates')
                    .insert({
                        user_id: userId,
                        course_id: courseId,
                        certificate_number: certificateNumber
                    })
                    .select('id')
                    .single();
                
                if (!certError && newCert) {
                    certificateId = newCert.id;
                } else if (certError) {
                    // Likely already has a certificate (unique constraint) —
                    // look it up instead of treating this as a failure.
                    const { data: existingCert } = await supabaseClient
                        .from('course_certificates')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('course_id', courseId)
                        .maybeSingle();
                    if (existingCert) certificateId = existingCert.id;
                }
            }
            
            return res.status(200).json({ success: true, progress, certificateId });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // ========== GET CERTIFICATE (NEW — 2026-08-07) ==========
    // Backs the public certificate view/share page — joins course title and
    // recipient name so the certificate page doesn't need multiple queries
    // or expose more than necessary via direct client-side joins.
    'get-certificate': async (req, res) => {
        const { certificateId } = req.query;
        if (!certificateId) return res.status(400).json({ error: 'certificateId is required' });

        const supabaseClient = getSupabase();

        try {
            const { data: cert, error } = await supabaseClient
                .from('course_certificates')
                .select('*, courses(title, category, duration_hours), profiles(full_name)')
                .eq('id', certificateId)
                .single();

            if (error || !cert) {
                return res.status(404).json({ success: false, error: 'Certificate not found' });
            }

            return res.status(200).json({ success: true, certificate: cert });
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
        const supabaseClient = getSupabase();
        const dbStart = Date.now();
        try {
            const { error } = await supabaseClient.from('profiles').select('id', { count: 'exact', head: true });
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

    // ========== TRACK PAGE VIEW (NEW — 2026-08-07) ==========
    // Powers AnalyticsDashboard.jsx, which was previously reading from
    // analytics_sessions/analytics_page_views tables that nothing ever
    // wrote to. This single endpoint does everything needed per page view:
    // finds or creates the session, extracts geolocation from Vercel's edge
    // headers (same real mechanism the 'ip' handler already uses), detects
    // device/browser server-side from the User-Agent header, and logs the
    // page view. Called from a small tracking hook in App.jsx on every
    // route change. Designed to fail silently from the caller's
    // perspective — tracking should never be able to break the site.
    'track-page-view': async (req, res) => {
        const { sessionId, pageUrl, userId } = req.body;

        if (!sessionId || !pageUrl) {
            return res.status(400).json({ error: 'sessionId and pageUrl required' });
        }

        const supabaseClient = getSupabase();

        const country = req.headers['x-vercel-ip-country'] || null;
        const city = req.headers['x-vercel-ip-city'] || null;
        const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '0.0.0.0').replace(/^::ffff:/, '');

        const ua = req.headers['user-agent'] || '';
        let deviceType = 'desktop';
        if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';
        else if (/mobile|android|iphone/i.test(ua)) deviceType = 'mobile';

        let browser = 'unknown';
        if (/edg/i.test(ua)) browser = 'Edge';
        else if (/chrome/i.test(ua)) browser = 'Chrome';
        else if (/safari/i.test(ua)) browser = 'Safari';
        else if (/firefox/i.test(ua)) browser = 'Firefox';

        try {
            const { data: existingSession } = await supabaseClient
                .from('analytics_sessions')
                .select('id, page_count, start_time')
                .eq('session_id', sessionId)
                .maybeSingle();

            if (existingSession) {
                const durationSeconds = Math.floor((Date.now() - new Date(existingSession.start_time).getTime()) / 1000);
                await supabaseClient
                    .from('analytics_sessions')
                    .update({
                        page_count: (existingSession.page_count || 0) + 1,
                        duration_seconds: durationSeconds,
                        end_time: new Date().toISOString()
                    })
                    .eq('id', existingSession.id);
            } else {
                await supabaseClient
                    .from('analytics_sessions')
                    .insert({
                        session_id: sessionId,
                        ip_address: ip,
                        country,
                        city,
                        device_type: deviceType,
                        browser,
                        start_time: new Date().toISOString(),
                        page_count: 1,
                        duration_seconds: 0,
                        user_id: userId || null
                    });
            }

            await supabaseClient
                .from('analytics_page_views')
                .insert({
                    session_id: sessionId,
                    page_url: pageUrl,
                    ip_address: ip,
                    country,
                    city,
                    device_type: deviceType,
                    user_id: userId || null,
                    created_at: new Date().toISOString()
                });

            return res.status(200).json({ success: true });
        } catch (error) {
            console.warn('Track page view error:', error.message);
            // Fail silently — tracking must never break the site.
            return res.status(200).json({ success: false });
        }
    },

    // ========== HOMEPAGE STATS (Enhanced with fallback) ==========
    'homepage-stats': async (req, res) => {
        const supabaseClient = getSupabase();
        let errors = [];
        let hasRealData = false;
        
        const stats = {
            activeUsers: 125,
            jobsPosted: 82,
            courses: 15,
            assessments: 8,
            earlyMembers: 45,
            testerSpots: 55,
            // NEW (2026-08-07): backs HomeHero.jsx's "Impact" stat with a
            // real count instead of a hardcoded number that never updated.
            vaTasksCompleted: 0,
            countriesSupported: 9
        };

        try {
            // Try each query individually with error handling
            try {
                const { count } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true });
                if (count > 0) {
                    stats.activeUsers = count;
                    hasRealData = true;
                }
            } catch (e) {
                errors.push('profiles: ' + e.message);
            }

            try {
                const { count } = await supabaseClient
                    .from('jobs')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true)
                    .eq('compliance_status', 'approved');
                if (count > 0) {
                    stats.jobsPosted = count;
                    hasRealData = true;
                }
            } catch (e) {
                errors.push('jobs: ' + e.message);
            }

            try {
                const { count } = await supabaseClient
                    .from('courses')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_published', true);
                if (count > 0) {
                    stats.courses = count;
                    hasRealData = true;
                }
            } catch (e) {
                errors.push('courses: ' + e.message);
            }

            try {
                const { count } = await supabaseClient
                    .from('assessments')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true);
                if (count > 0) {
                    stats.assessments = count;
                    hasRealData = true;
                }
            } catch (e) {
                errors.push('assessments: ' + e.message);
            }

            try {
                const { count } = await supabaseClient
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_type', 'tester');
                if (count > 0) {
                    stats.earlyMembers = count;
                    stats.testerSpots = Math.max(0, 100 - count);
                    hasRealData = true;
                }
            } catch (e) {
                errors.push('tester profiles: ' + e.message);
            }

            try {
                const { count } = await supabaseClient
                    .from('va_tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'completed');
                if (count > 0) {
                    stats.vaTasksCompleted = count;
                    hasRealData = true;
                }
            } catch (e) {
                errors.push('va_tasks: ' + e.message);
            }

            return res.status(200).json({
                success: true,
                stats: {
                    ...stats,
                    timestamp: new Date().toISOString(),
                    fallback: !hasRealData,
                    errors: errors.length > 0 ? errors : null,
                    message: hasRealData ? 'Using real data' : 'Using fallback data - some tables may be empty'
                }
            });
        } catch (error) {
            console.error('Homepage stats error:', error);
            return res.status(200).json({
                success: true,
                stats: {
                    ...stats,
                    timestamp: new Date().toISOString(),
                    fallback: true,
                    error: error.message
                }
            });
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
    
    // NEW (2026-08-07): global IP block check, before any action runs.
    const requestIP = getRequestIP(req);
    if (await isIPBlocked(requestIP)) {
        await logSecurityEvent('blocked_ip_attempt', requestIP, 'warning', { action: req.query.action || null });
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const { action } = req.query;
    
    if (!action || !handlers[action]) {
        return res.status(200).json({
            name: 'ODUSBABA API',
            version: '7.1.0',
            description: 'Professional Consolidated API - Full site functionality',
            available_actions: Object.keys(handlers),
            timestamp: new Date().toISOString()
        });
    }
    
    try {
        await handlers[action](req, res);
    } catch (error) {
        console.error(`Error in ${action}:`, error);
        return res.status(500).json({ error: error.message });
    }
}
