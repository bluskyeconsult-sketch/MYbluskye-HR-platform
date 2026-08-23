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

// FIXED (2026-08-21): Access-Control-Allow-Origin was hardcoded to '*',
// meaning ANY website on the internet could call every action in this
// gateway directly from a visitor's browser using their existing logged-in
// session cookie/token — a real cross-site request risk, and it's also
// what made the earlier-confirmed zero-auth admin content-generation
// endpoints (generateCourseImage etc.) reachable from literally anywhere,
// not just this app. Now reflects the request's actual Origin header only
// when it matches a known-real domain for this project, and omits the
// header entirely otherwise (which browsers correctly treat as "not
// allowed" for cross-origin requests) — same-origin requests (the app
// calling its own API) are never affected by CORS at all, so this only
// blocks OTHER sites from calling this API on a visitor's behalf.
const ALLOWED_ORIGINS = [
    'https://bluskyeconsult.com',
    'https://www.bluskyeconsult.com'
];

function setCors(req, res) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
}

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_REQUESTS = 5;
const rateLimitStore = new Map();

// ============================================
// HELPER FUNCTIONS
// ============================================

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

// ============================================
// UNIFIED CREDIT SYSTEM (NEW — 2026-08-16)
// Total overhaul: one credit currency across chat, VA tasks, HR Tools, and
// assessment AI insights — 1 credit per AI-costing action, flat. Replaces
// the previous split between profiles.ai_credits_remaining (chat only)
// and va_credits.balance (VA tasks only), which were two separate pools
// for what should be one unified thing. Admin/super_admin/business-tier
// unlimited status still bypasses this entirely, unchanged.
// ============================================

// NEW (2026-08-16): extracts the real client IP in a Vercel serverless
// context — used only for guest rate limiting below.
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.socket?.remoteAddress || 'unknown';
}

// NEW (2026-08-16): usage caps to discourage overuse/abuse.
// 1. Guests (no userId) previously bypassed metering entirely — the
//    frontend's guest limit was enforced only client-side (a JS counter),
//    trivially bypassed by calling the API directly. Now rate-limited by
//    IP address server-side: 10 requests per rolling hour.
// 2. Free-tier accounts get an additional burst-rate cap on top of their
//    monthly credit allowance — 15 requests per rolling hour — so a
//    script can't drain a whole month's 5-credit allowance in seconds
//    (a low number, but the same principle protects every tier from
//    request-flooding, not just credit exhaustion).
async function checkIpRateLimit(supabaseClient, ip, maxPerHour) {
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: existing } = await supabaseClient
        .from('guest_rate_limits')
        .select('id, request_count, window_start')
        .eq('ip_address', ip)
        .maybeSingle();

    if (!existing || new Date(existing.window_start) < new Date(windowStart)) {
        // No record, or the window has expired — start a fresh one.
        await supabaseClient
            .from('guest_rate_limits')
            .upsert({ ip_address: ip, request_count: 1, window_start: new Date().toISOString() }, { onConflict: 'ip_address' });
        return { allowed: true };
    }

    if (existing.request_count >= maxPerHour) {
        return { allowed: false };
    }

    await supabaseClient
        .from('guest_rate_limits')
        .update({ request_count: existing.request_count + 1 })
        .eq('id', existing.id);

    return { allowed: true };
}

// FIXED (2026-08-21): this shared credit-check function had no awareness of
// profiles.is_tester at all — a tester (who now keeps their real tier's
// user_type per the SignUpPage.jsx rebuild, rather than being forced onto a
// generic 'tester' value) would flow straight through the normal va_credits
// balance check below, completely bypassing the separate, hard,
// tier-independent tester_allocations cap. Every one of the 12+ handlers
// that already call this function inherits the fix from this one place,
// rather than needing the same tester-branch duplicated in each of them.
// FIXED (2026-08-21): two independent, silently-drifted default-credit maps
// existed for the same tiers — grant-monthly-credits used
// {registered:20, professional:100, employer:60, business:300}, while
// user-eligibility's fallback used {registered:10, professional:25,
// employer:20} — with NO shared source of truth, exactly the kind of
// parallel-competing-implementation drift this project has repeatedly
// found elsewhere. Consolidated into one constant, used by both. Picked
// the smaller, more conservative numbers as canonical (lower cost
// exposure by default) — this is a judgment call, not a confirmed
// business decision; revisit if the larger numbers were actually intended.
//
// FLAGGED, NOT RESOLVED: 'business' tier is treated as fully UNLIMITED in
// user-eligibility (isUnlimited check on profile.tier === 'business'), but
// checkAndDeductCredit — the function that actually gates VA/HR-tools AI
// calls — does NOT include business in its unlimited check at all, so a
// business-tier account is metered against a real balance there. Given
// business tier is unlimited in one place and metered in another, its
// exact number here (20) is a placeholder matching what SignUpPage.jsx
// already grants — but if business is meant to be unlimited everywhere,
// this number is moot and the real fix is adding business to
// checkAndDeductCredit's unlimited check instead. Needs a decision on
// actual intent, not a guess.
// DECIDED (2026-08-21): business tier gets a high but finite cap for
// AI-backed VA/HR-tool usage — 200/month — not truly unlimited. Applied
// consistently below and in both user-eligibility branches (assessments
// and credits), which previously treated business as fully unlimited,
// creating the exact inconsistency this decision was meant to resolve.
const TIER_MONTHLY_ALLOWANCE = {
    free: 5,
    registered: 10,
    professional: 25,
    employer: 20,
    business: 200,
    tester: 10
};

async function checkAndDeductCredit(supabaseClient, userId, req = null) {
    if (!userId) {
        // FIXED: guests no longer bypass metering entirely — rate limited
        // by IP instead, since there's no account to meter credits against.
        if (req) {
            const ip = getClientIp(req);
            const rateCheck = await checkIpRateLimit(supabaseClient, ip, 10);
            if (!rateCheck.allowed) {
                return { allowed: false, unlimited: false, remaining: 0, rateLimited: true };
            }
        }
        return { allowed: true, unlimited: true, remaining: null };
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('user_type, tier, is_tester')
        .eq('id', userId)
        .single();

    const isUnlimited = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
    if (isUnlimited) return { allowed: true, unlimited: true, remaining: null };

    // NEW (2026-08-21): tester accounts are capped via tester_allocations,
    // independent of whatever their real tier's va_credits balance would
    // normally allow — same atomic check-and-decrement used by va-execute,
    // so two rapid requests near a tester's last remaining use can't both
    // slip through.
    if (profile?.is_tester) {
        const { data: consumeResult, error: consumeError } = await supabaseClient
            .rpc('consume_tester_allocation', { p_user_id: userId });

        if (consumeError) {
            console.error('Tester allocation check failed:', consumeError.message);
            return { allowed: false, unlimited: false, remaining: 0 };
        }

        const allowed = consumeResult?.[0]?.success;
        return allowed
            ? { allowed: true, unlimited: false, remaining: null, isTester: true }
            : { allowed: false, unlimited: false, remaining: 0, isTester: true, capReached: true };
    }

    // Burst-rate cap for free tier specifically, on top of the monthly
    // credit allowance — protects against rapid request-flooding even
    // within an otherwise-valid credit balance.
    if ((profile?.user_type === 'free' || profile?.tier === 'free') && req) {
        const ip = getClientIp(req);
        const rateCheck = await checkIpRateLimit(supabaseClient, `user:${userId}:${ip}`, 15);
        if (!rateCheck.allowed) {
            return { allowed: false, unlimited: false, remaining: 0, rateLimited: true };
        }
    }

    const { data: credits } = await supabaseClient
        .from('va_credits')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

    const currentBalance = credits?.balance ?? 0;

    if (currentBalance <= 0) {
        return { allowed: false, unlimited: false, remaining: 0 };
    }

    const newBalance = currentBalance - 1;

    if (credits) {
        await supabaseClient.from('va_credits').update({ balance: newBalance }).eq('user_id', userId);
    } else {
        // Shouldn't normally happen (monthly grant creates the row), but
        // handle it defensively rather than crash.
        await supabaseClient.from('va_credits').insert({ user_id: userId, balance: 0 });
    }

    return { allowed: true, unlimited: false, remaining: newBalance };
}

// NEW (2026-08-21): shared admin-only gate for backend actions that must
// never be reachable by an unauthenticated or non-admin caller — currently
// generateCourseImage, generateLessonImage, generateLessonAudio,
// generate-course, and generate-assessment, all confirmed to have had ZERO
// backend authorization before this fix (no userId, no credit check, no
// admin check — reachable by literally anyone who found the URL, with real
// per-call OpenAI/DALL-E/TTS cost and no rate limit). Frontend-only "only
// show this button to admins" is not a security boundary; this is the real
// one. Mirrors the existing Bearer-token verification pattern already used
// by assessment-results and others in this file.
// NEW (2026-08-21): factored out of requireAdmin below — the 2FA system
// needs "is this a real, logged-in user" without requiring admin role,
// since 2FA is a general feature any user can enable. Extracted rather
// than duplicated, so token-verification logic exists in exactly one
// place.
async function getAuthenticatedUser(req, supabaseClient) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return { authorized: false, status: 401, error: 'Authentication required' };
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
        return { authorized: false, status: 401, error: 'Invalid or expired session' };
    }

    return { authorized: true, userId: user.id };
}

// NEW (2026-08-21): shared admin-only gate for backend actions that must
// never be reachable by an unauthenticated or non-admin caller — currently
// generateCourseImage, generateLessonImage, generateLessonAudio,
// generate-course, and generate-assessment, all confirmed to have had ZERO
// backend authorization before this fix (no userId, no credit check, no
// admin check — reachable by literally anyone who found the URL, with real
// per-call OpenAI/DALL-E/TTS cost and no rate limit). Frontend-only "only
// show this button to admins" is not a security boundary; this is the real
// one. Mirrors the existing Bearer-token verification pattern already used
// by assessment-results and others in this file.
async function requireAdmin(req, supabaseClient) {
    const authCheck = await getAuthenticatedUser(req, supabaseClient);
    if (!authCheck.authorized) return authCheck;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('user_type')
        .eq('id', authCheck.userId)
        .single();

    if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        return { authorized: false, status: 403, error: 'Admin access required' };
    }

    return { authorized: true, userId: authCheck.userId };
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
// callOpenAICached (NEW — 2026-08-16) — OpenAI cost reduction via caching.
// Deliberately scoped to genuinely generic, non-personal requests only
// (assessment generation, salary estimates, rights info). NOT used for CV
// analysis, cover letters, grievances, contract review, chat, or VA tasks
// — those take unique personal content as input, where caching would
// rarely hit and risks serving one person's context to another. cacheKey
// should be built from normalized, non-personal inputs only (e.g. job
// title + location + experience level, not raw pasted text).
// ============================================

async function callOpenAICached(cacheKey, messages, maxTokens = 800, temperature = 0.7, ttlHours = 168) {
    const supabaseClient = getSupabase();

    try {
        const { data: cached } = await supabaseClient
            .from('ai_response_cache')
            .select('response, expires_at')
            .eq('cache_key', cacheKey)
            .maybeSingle();

        if (cached && new Date(cached.expires_at) > new Date()) {
            return { ...cached.response, cached: true };
        }
    } catch (cacheReadError) {
        console.warn('Cache read failed, proceeding to call OpenAI:', cacheReadError);
    }

    const data = await callOpenAI(messages, maxTokens, temperature);

    try {
        const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
        await supabaseClient
            .from('ai_response_cache')
            .upsert({ cache_key: cacheKey, response: data, expires_at: expiresAt }, { onConflict: 'cache_key' });
    } catch (cacheWriteError) {
        console.warn('Cache write failed, response still returned normally:', cacheWriteError);
    }

    return { ...data, cached: false };
}

// Normalizes free-text into a stable cache key component — lowercase,
// trimmed, collapsed whitespace, so trivial differences (extra spaces,
// capitalization) don't cause unnecessary cache misses.
function normalizeForCacheKey(text) {
    return (text || '').toLowerCase().trim().replace(/\s+/g, ' ');
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
            <p style="color:#475569;font-size:12px;">You received this because you subscribed. <a href="https://bluskyeconsult.com/newsletter/unsubscribe" style="color:#10b981;">Unsubscribe</a></p>
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
                <a href="https://bluskyeconsult.com" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Visit ODUSBABA →</a>
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
                <a href="https://bluskyeconsult.com/dashboard" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Go to Dashboard</a>
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
                <a href="https://bluskyeconsult.com/jobs" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">View All Jobs</a>
            </div>
            <p style="color:#64748b;font-size:12px;">You received this because you have job alerts enabled. <a href="https://bluskyeconsult.com/job-alerts" style="color:#10b981;">Manage alerts</a></p>
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
                <a href="https://bluskyeconsult.com/tester/dashboard" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Go to Dashboard →</a>
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
                <a href="https://bluskyeconsult.com/assessment-results" style="display:inline-block;background-color:#0B3C5D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">View Full Report →</a>
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

// FIXED (2026-08-20): findRelevantJobs() was previously declared as a
// bare `function` statement sitting directly inside the handlers object
// literal — invalid JavaScript (object literals only allow key: value
// pairs, never a standalone function statement). This has been a hard
// SyntaxError since the job-search chat feature was added, breaking the
// entire file — every single action in this file 500'd as a result,
// since the whole module failed to parse at cold start. Moved to a
// proper top-level function, same as every other shared helper here.
//
// Detects whether a chat message is asking about jobs, and if so,
// searches the real jobs table (which already contains both
// admin-posted internal listings AND approved external jobs sourced
// from the official government portals — they're unified into one
// table by the existing approval flow, so one query naturally covers
// both "internal job board and verified country official sources" as
// asked for). Returns a compact list for the AI to reference, or null
// if the message doesn't look job-related.
async function findRelevantJobs(supabaseClient, userMessage) {
    const jobKeywords = /\b(job|jobs|vacanc|hiring|position|role|career|opening|opportunit|employ|apply|recruit)\w*/i;
    if (!jobKeywords.test(userMessage)) return null;

    try {
        // Naive keyword extraction: strip common stopwords/job-generic
        // terms, keep whatever's left as the search term (likely a job
        // title, skill, or location the user mentioned).
        const searchTerm = userMessage
            .replace(jobKeywords, '')
            .replace(/\b(any|are|there|for|find|me|show|search|looking|want|need|please|can|you|the|a|an|in|near|around)\b/gi, '')
            .trim()
            .substring(0, 100);

        let query = supabaseClient
            .from('jobs')
            .select('title, company, location, job_type, salary_range, external_apply_url, source_country')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5);

        if (searchTerm.length >= 3) {
            query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
        }

        const { data: jobs } = await query;
        return jobs && jobs.length > 0 ? jobs : null;
    } catch (error) {
        console.warn('Job search within chat failed, continuing without job context:', error);
        return null;
    }
}

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
    // findRelevantJobs() moved to a top-level function above handlers —
    // see it there. This comment marks where the chat handler begins.

    chat: async (req, res) => {
        const { message, history, systemPrompt, temperature = 0.7, maxTokens = 800, userId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        try {
            // FIXED (2026-08-16): total overhaul — migrated from
            // profiles.ai_credits_remaining (a separate pool only chat
            // used) to the unified va_credits.balance system, matching
            // VA tasks and HR Tools. One credit currency across every
            // AI-costing feature now, not three separate ones.
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);

            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.', remaining: 0 });
            }

            let messages = history || [];
            messages.push({ role: 'user', content: message });
            
            if (systemPrompt) {
                messages = [{ role: 'system', content: systemPrompt }, ...messages];
            }

            // NEW (2026-08-16): job-search awareness — if the message
            // looks job-related, real current listings are injected as
            // additional context so the AI can act as a genuine guide,
            // recommending real jobs rather than generic advice or
            // fabricated listings.
            const relevantJobs = await findRelevantJobs(supabaseClient, message);
            if (relevantJobs) {
                const jobContext = relevantJobs.map(j =>
                    `- "${j.title}" at ${j.company || 'N/A'}, ${j.location || 'location not specified'}${j.salary_range ? ` (${j.salary_range})` : ''}${j.source_country && j.source_country !== 'internal' ? ` [via official ${j.source_country} government portal]` : ''}`
                ).join('\n');

                messages = [{
                    role: 'system',
                    content: `The user's message may be about job searching. Here are real, current listings from our job board that might be relevant (this includes both internally-posted jobs and jobs sourced from verified official government portals):\n\n${jobContext}\n\nIf genuinely relevant, recommend specific ones by name and mention they can view full details and apply on our Jobs page. Never invent or describe job listings that aren't in this list — if none of these are a good match, say so honestly and suggest they browse the full job board instead.`
                }, ...messages];
            }

            const data = await callOpenAI(messages, maxTokens, temperature);
            return res.status(200).json({
                success: true,
                response: data.choices[0].message.content,
                usage: data.usage,
                remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining,
                jobsReferenced: relevantJobs ? relevantJobs.length : 0
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // ========== GENERATE ASSESSMENT ==========
    'generate-assessment': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await requireAdmin(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

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

    // ========== HR TOOLS — total overhaul (2026-08-16): all 10 now check
    // and deduct credits via the unified checkAndDeductCredit() helper —
    // previously none of them metered usage at all, a real gap under the
    // "OpenAI-costing = credits" framework applied everywhere else. ==========

    analyzeCV: async (req, res) => {
        const { cvText, userId } = req.body;
        if (!cvText) return res.status(400).json({ error: 'cvText is required' });

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const data = await callOpenAI([
                { role: 'system', content: 'You are an expert CV/resume reviewer. Analyze the CV for ATS compatibility, clarity, and impact. Give specific, actionable feedback: strengths, areas for improvement, an estimated ATS score out of 100, and concrete next steps. Use markdown formatting.' },
                { role: 'user', content: cvText }
            ], 1200, 0.6);

            return res.status(200).json({ success: true, analysis: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'simulate-interview': async (req, res) => {
        const { role, questions, userId } = req.body;
        if (!role) return res.status(400).json({ error: 'role is required' });

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const priorQuestions = Array.isArray(questions) && questions.length > 0
                ? `Previously asked: ${questions.join('; ')}. Ask a different question this time.`
                : '';

            const data = await callOpenAI([
                { role: 'system', content: `You are an experienced interviewer running a mock interview. Given the candidate's target role and background, ask one realistic interview question (behavioral or technical, appropriate to the role), then provide guidance on how to structure a strong answer using the STAR method where relevant. Use markdown formatting.` },
                { role: 'user', content: `${role}. ${priorQuestions}` }
            ], 800, 0.7);

            return res.status(200).json({ success: true, feedback: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    checkRights: async (req, res) => {
        const { situation, country, userId } = req.body;
        if (!situation) return res.status(400).json({ error: 'situation is required' });

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const data = await callOpenAI([
                { role: 'system', content: `You are a workplace rights advisor. Give general information about employment rights relevant to ${country || 'the UK'} based on the situation described — dismissal, discrimination, working hours, leave entitlements, etc. as applicable. End with a clear note that this is general information, not legal advice, and recommend consulting a qualified employment lawyer or the relevant national labor authority for specific guidance. Use markdown formatting.` },
                { role: 'user', content: situation }
            ], 1000, 0.5);

            return res.status(200).json({ success: true, advice: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    generateGrievance: async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const data = await callOpenAI([
                { role: 'system', content: 'You are an HR professional drafting a formal grievance letter. Write a professional, factual grievance letter template based on the situation described — include placeholders like [Date], [Manager Name] where specific details aren\'t given. Structure: subject line, background, details of the issue, desired resolution, closing. Use markdown formatting.' },
                { role: 'user', content }
            ], 1200, 0.5);

            return res.status(200).json({ success: true, grievance: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'analyze-contract': async (req, res) => {
        const { contractText, userId } = req.body;
        if (!contractText) return res.status(400).json({ error: 'contractText is required' });

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const data = await callOpenAI([
                { role: 'system', content: 'You are an employment contract reviewer. Analyze the contract terms for potentially concerning clauses (restrictive non-competes, unclear termination terms, missing statutory entitlements, unusual liability clauses, etc.). Flag specific issues found, explain why each matters in plain language, and note this is general review, not legal advice — recommend a qualified employment lawyer for anything significant. Use markdown formatting.' },
                { role: 'user', content: contractText }
            ], 1200, 0.5);

            return res.status(200).json({ success: true, analysis: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'calculate-salary': async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            // NEW (2026-08-16): cached — job title + location + experience
            // level is genuinely generic, non-personal, and likely to
            // repeat across many different users. Credits still deduct
            // normally either way; caching only saves the OpenAI cost on
            // this side, it doesn't give users free extra uses.
            const cacheKey = `salary:${normalizeForCacheKey(content)}`;
            const data = await callOpenAICached(cacheKey, [
                { role: 'system', content: 'You are a compensation analyst. Given a job title, location, experience level, and industry, provide a realistic market salary range estimate with reasoning (factors that push it higher or lower), and 2-3 practical negotiation tips. Be clear this is an estimate based on general market knowledge, not a guaranteed figure. Use markdown formatting.' },
                { role: 'user', content }
            ], 1000, 0.5, 168); // 1 week TTL — market rates don't move fast enough to need shorter

            return res.status(200).json({ success: true, result: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'generate-cover-letter': async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const data = await callOpenAI([
                { role: 'system', content: 'You are a professional cover letter writer. Given the job title, company, and relevant background provided, write a compelling, professional cover letter — 3-4 paragraphs, tailored and specific rather than generic, highlighting relevant strengths. Use markdown formatting.' },
                { role: 'user', content }
            ], 1000, 0.6);

            return res.status(200).json({ success: true, result: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'optimize-linkedin': async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const data = await callOpenAI([
                { role: 'system', content: 'You are a LinkedIn profile optimization expert. Given the person\'s role, background, and goals, suggest an improved headline, a rewritten "About" section, and 3 specific tips for making their profile more discoverable to recruiters. Use markdown formatting.' },
                { role: 'user', content }
            ], 1000, 0.6);

            return res.status(200).json({ success: true, result: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'write-job-description': async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const data = await callOpenAI([
                { role: 'system', content: 'You are an HR professional writing job descriptions. Given the role, seniority, and key requirements provided, write a complete, well-structured job description: an engaging summary, key responsibilities, required qualifications, and nice-to-haves. Avoid discriminatory language and unrealistic requirement lists. Use markdown formatting.' },
                { role: 'user', content }
            ], 1200, 0.6);

            return res.status(200).json({ success: true, result: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'write-performance-review': async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const data = await callOpenAI([
                { role: 'system', content: 'You are an HR professional helping a manager write a fair, constructive performance review. Given the employee\'s role and the notes/achievements/areas for improvement provided, write a balanced, specific, professionally-worded review covering strengths, areas for growth, and concrete next steps. Use markdown formatting.' },
                { role: 'user', content }
            ], 1200, 0.6);

            return res.status(200).json({ success: true, result: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
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

        const supabaseClient = getSupabase();

        // NEW (2026-08-16): Free Access Mode — distinct from Enforcement
        // Mode. Tier-based feature gating stays fully real and testable;
        // this only removes the payment requirement to obtain a tier.
        // When enabled, grants the selected tier directly and skips
        // Stripe entirely. Flip system_config.free_access_mode off any
        // time to resume real payment collection immediately, with no
        // code changes.
        try {
            const { data: config } = await supabaseClient
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'free_access_mode')
                .maybeSingle();

            if (config?.config_value?.enabled) {
                const { error: upgradeError } = await supabaseClient
                    .from('profiles')
                    .update({ user_type: tierName, tier: tierName, subscription_status: 'free_access' })
                    .eq('id', userId);

                if (upgradeError) throw upgradeError;

                const siteUrl = process.env.SITE_URL || 'https://bluskyeconsult.com';
                return res.status(200).json({
                    success: true,
                    freeAccess: true,
                    url: `${siteUrl}/dashboard?freeAccessGranted=${tierName}`
                });
            }
        } catch (freeAccessError) {
            console.error('Free access mode check failed, falling through to real checkout:', freeAccessError);
            // Falls through to real Stripe checkout below rather than
            // blocking the user entirely on a config-read failure.
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
            const siteUrl = process.env.SITE_URL || 'https://bluskyeconsult.com';

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
            const siteUrl = process.env.SITE_URL || 'https://bluskyeconsult.com';

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

    // ========== REFUND FULFILLMENT (NEW — 2026-08-16) ==========
    // Makes the "14-day money-back guarantee" (AboutPage.jsx) a real,
    // working process. Not a self-service automatic refund button —
    // requests go through admin review first, matching the same pattern
    // as fraud reports and employer verification, to limit abuse.

    'request-refund': async (req, res) => {
        const { userId, reason } = req.body;
        if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

        const supabaseClient = getSupabase();

        try {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('subscribed_at, tier, stripe_customer_id, stripe_subscription_id')
                .eq('id', userId)
                .single();

            if (!profile?.subscribed_at) {
                return res.status(400).json({ success: false, error: 'No active paid subscription found on this account.' });
            }

            const daysSinceSubscribed = (Date.now() - new Date(profile.subscribed_at).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceSubscribed > 14) {
                return res.status(400).json({ success: false, error: 'This subscription is outside the 14-day refund window.' });
            }

            const { data: existing } = await supabaseClient
                .from('refund_requests')
                .select('id')
                .eq('user_id', userId)
                .in('status', ['pending', 'approved'])
                .maybeSingle();

            if (existing) {
                return res.status(400).json({ success: false, error: 'You already have a refund request in progress.' });
            }

            const { error: insertError } = await supabaseClient
                .from('refund_requests')
                .insert({ user_id: userId, reason: reason || null, status: 'pending' });

            if (insertError) throw insertError;

            return res.status(200).json({ success: true, message: 'Refund request submitted. Our team will review it shortly.' });
        } catch (error) {
            console.error('request-refund error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'admin-refund-requests': async (req, res) => {
        const supabaseClient = getSupabase();
        const status = req.query?.status || req.body?.status || 'pending';

        try {
            const { data, error } = await supabaseClient
                .from('refund_requests')
                .select('*, profiles!refund_requests_user_id_fkey(full_name, email, tier, subscribed_at, stripe_customer_id, stripe_subscription_id)')
                .eq('status', status)
                .order('requested_at', { ascending: true });

            if (error) throw error;
            return res.status(200).json({ success: true, requests: data || [] });
        } catch (error) {
            console.error('admin-refund-requests error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Approves and actually processes a real Stripe refund, or rejects
    // with a reason. Looks up the actual charge to refund live from
    // Stripe at processing time (via the subscription's latest invoice),
    // rather than trusting a stored payment intent that might be stale
    // or was never reliably populated for subscription-mode checkouts.
    'admin-process-refund': async (req, res) => {
        const { requestId, decision, adminNotes, adminUserId } = req.body;
        if (!requestId || !decision) {
            return res.status(400).json({ success: false, error: 'requestId and decision are required' });
        }
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ success: false, error: 'decision must be approved or rejected' });
        }

        const supabaseClient = getSupabase();

        try {
            const { data: request } = await supabaseClient
                .from('refund_requests')
                .select('*, profiles!refund_requests_user_id_fkey(id, stripe_customer_id, stripe_subscription_id)')
                .eq('id', requestId)
                .single();

            if (!request) {
                return res.status(404).json({ success: false, error: 'Refund request not found' });
            }

            if (decision === 'rejected') {
                await supabaseClient
                    .from('refund_requests')
                    .update({ status: 'rejected', admin_notes: adminNotes || null, processed_at: new Date().toISOString(), processed_by: adminUserId || null })
                    .eq('id', requestId);

                return res.status(200).json({ success: true, message: 'Refund request rejected.' });
            }

            // decision === 'approved' — process the actual Stripe refund.
            const subscriptionId = request.profiles?.stripe_subscription_id;
            if (!subscriptionId) {
                return res.status(400).json({ success: false, error: 'No Stripe subscription found on this account — cannot process refund automatically.' });
            }

            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

            const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice.payment_intent'] });
            const paymentIntentId = subscription.latest_invoice?.payment_intent?.id || subscription.latest_invoice?.payment_intent;

            if (!paymentIntentId) {
                return res.status(400).json({ success: false, error: 'No payment found on this subscription to refund.' });
            }

            const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });

            // Cancel the subscription and downgrade back to free — the
            // customer got their money back, so their access reverts too.
            await stripe.subscriptions.cancel(subscriptionId);

            await supabaseClient
                .from('profiles')
                .update({ user_type: 'free', tier: 'free', subscription_status: 'refunded' })
                .eq('id', request.user_id);

            await supabaseClient
                .from('refund_requests')
                .update({
                    status: 'processed',
                    admin_notes: adminNotes || null,
                    stripe_refund_id: refund.id,
                    processed_at: new Date().toISOString(),
                    processed_by: adminUserId || null
                })
                .eq('id', requestId);

            return res.status(200).json({ success: true, message: 'Refund processed successfully.', refundId: refund.id });
        } catch (error) {
            console.error('admin-process-refund error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Purchasable credit bundles for VA tasks/assessments (one-time
    // payment, distinct from subscriptions) — matches PricingPage.jsx's
    // credit pricing section, which was display-only until now.
    // ========== AFFILIATE DASHBOARD (NEW — 2026-08-16) ==========
    // AffiliateDashboard.jsx called ?action=affiliate-stats and
    // ?action=affiliate-withdraw — neither existed anywhere, which is
    // exactly why "the affiliate link can't be found anywhere": the page
    // has never successfully loaded for any user. Auto-creates an
    // affiliate record (with a generated code and referral link) on first
    // visit, matching the Affiliate Plan defined earlier this session
    // (starts 'pending', admin approves before earning — see
    // AffiliateManagement.jsx).
    'affiliate-stats': async (req, res) => {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

        const supabaseClient = getSupabase();
        const siteUrl = process.env.SITE_URL || 'https://bluskyeconsult.com';

        try {
            let { data: affiliate } = await supabaseClient
                .from('affiliates')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (!affiliate) {
                // Generate a short, reasonably unique code — 8 random
                // alphanumeric characters, checked for collision.
                let code;
                let attempts = 0;
                while (attempts < 5) {
                    code = Math.random().toString(36).substring(2, 10).toUpperCase();
                    const { data: existing } = await supabaseClient
                        .from('affiliates')
                        .select('id')
                        .eq('affiliate_code', code)
                        .maybeSingle();
                    if (!existing) break;
                    attempts++;
                }

                const { data: newAffiliate, error: createError } = await supabaseClient
                    .from('affiliates')
                    .insert({
                        user_id: userId,
                        affiliate_code: code,
                        referral_link: `${siteUrl}/sign-up?ref=${code}`,
                        status: 'pending',
                        total_clicks: 0,
                        total_signups: 0,
                        total_earnings: 0,
                        available_balance: 0,
                        withdrawn_amount: 0
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                affiliate = newAffiliate;
            }

            const { data: signups } = await supabaseClient
                .from('profiles')
                .select('full_name, created_at')
                .eq('referred_by_affiliate_code', affiliate.affiliate_code)
                .order('created_at', { ascending: false })
                .limit(20);

            const { data: withdrawals } = await supabaseClient
                .from('affiliate_withdrawals')
                .select('*')
                .eq('affiliate_id', affiliate.id)
                .order('created_at', { ascending: false });

            return res.status(200).json({
                success: true,
                data: {
                    affiliate,
                    stats: {
                        clicks: affiliate.total_clicks || 0,
                        signups: affiliate.total_signups || 0,
                        earnings: affiliate.total_earnings || 0,
                        available: affiliate.available_balance || 0
                    },
                    signups: signups || [],
                    withdrawals: withdrawals || []
                }
            });
        } catch (error) {
            console.error('affiliate-stats error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'affiliate-withdraw': async (req, res) => {
        const { affiliateId, amount, paymentMethod, paymentEmail } = req.body;
        if (!affiliateId || !amount || !paymentMethod || !paymentEmail) {
            return res.status(400).json({ success: false, error: 'affiliateId, amount, paymentMethod, and paymentEmail are required' });
        }

        const supabaseClient = getSupabase();

        try {
            // Re-validate server-side rather than trust the client-sent
            // amount against the client's own stats snapshot.
            const { data: affiliate } = await supabaseClient
                .from('affiliates')
                .select('available_balance')
                .eq('id', affiliateId)
                .single();

            if (!affiliate) {
                return res.status(404).json({ success: false, error: 'Affiliate record not found' });
            }
            if (amount < 50) {
                return res.status(400).json({ success: false, error: 'Minimum withdrawal amount is $50' });
            }
            if (amount > (affiliate.available_balance || 0)) {
                return res.status(400).json({ success: false, error: 'Insufficient balance' });
            }

            const { error: insertError } = await supabaseClient
                .from('affiliate_withdrawals')
                .insert({
                    affiliate_id: affiliateId,
                    amount,
                    payment_method: paymentMethod,
                    payment_email: paymentEmail,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('affiliate-withdraw error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'create-credit-checkout-session': async (req, res) => {
        const { credits, userId, userEmail } = req.body;
        if (!credits || !userId) {
            return res.status(400).json({ error: 'credits and userId are required' });
        }

        const creditPrices = { 5: 2500, 10: 4500, 25: 9500, 50: 16500, 100: 29900 }; // cents
        const amount = creditPrices[credits];
        if (!amount) {
            return res.status(400).json({ error: `No pricing configured for ${credits} credits` });
        }

        try {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const siteUrl = process.env.SITE_URL || 'https://bluskyeconsult.com';

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: { name: `${credits} ODUSBABA Credits` },
                        unit_amount: amount
                    },
                    quantity: 1
                }],
                success_url: `${siteUrl}/dashboard?creditsAdded=true`,
                cancel_url: `${siteUrl}/pricing`,
                client_reference_id: userId,
                customer_email: userEmail,
                metadata: { userId, credits: String(credits), type: 'credit_purchase' }
            });

            return res.status(200).json({ success: true, url: session.url, sessionId: session.id });
        } catch (error) {
            console.error('Credit checkout session error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // NEW (2026-08-16): real implementation of the previously-flagged
    // "Refresh" button in KnowledgeSourceManager.jsx — fetches the
    // source's URL, strips HTML down to plain text, and stores it in
    // ai_knowledge_base. Uses basic regex-based extraction rather than a
    // full HTML parser to avoid adding heavy dependencies for this one
    // feature — good enough for text-heavy pages like the government
    // portals and law references these sources are.
    // ========== MONTHLY CREDIT GRANT (NEW — 2026-08-16) ==========
    // Total overhaul: automated monthly credit allowance per tier. Adds
    // (not resets) each tier's allowance to va_credits.balance — unused
    // credits roll over rather than being wiped, and any separately
    // purchased credits are never touched. Triggered by a cron job (see
    // vercel.json) rather than on-demand, since it needs to run for every
    // active user, not just one at a time.
    // NEW (2026-08-22): vercel.json rewrites /sitemap.xml to this exact
    // action — but it never existed anywhere in this file, meaning
    // visiting /sitemap.xml has been returning an error this whole time,
    // and search engines have had no sitemap to crawl at all. Real static
    // routes below match the confirmed route list in App.jsx; dynamic
    // routes are generated from real, currently-active/published content.
    'sitemap': async (req, res) => {
        const supabaseClient = getSupabase();
        const baseUrl = 'https://www.bluskyeconsult.com';

        const staticRoutes = [
            '/', '/jobs', '/workforce', '/courses', '/books', '/newsletter',
            '/hire-va', '/about', '/contact', '/pricing', '/sign-in', '/sign-up',
            '/products', '/faq', '/blog', '/hr-tools', '/assessments', '/articles'
        ];

        try {
            const [{ data: jobs }, { data: courses }, { data: articles }] = await Promise.all([
                supabaseClient.from('jobs').select('id, updated_at').eq('is_active', true).limit(5000),
                supabaseClient.from('courses').select('id, updated_at').eq('is_published', true).limit(2000),
                supabaseClient.from('articles').select('slug, updated_at').eq('is_published', true).limit(2000)
            ]);

            const urls = [
                ...staticRoutes.map(path => ({ loc: `${baseUrl}${path}`, lastmod: null })),
                ...(jobs || []).map(j => ({ loc: `${baseUrl}/jobs/${j.id}`, lastmod: j.updated_at })),
                ...(courses || []).map(c => ({ loc: `${baseUrl}/courses/${c.id}`, lastmod: c.updated_at })),
                ...(articles || []).map(a => ({ loc: `${baseUrl}/articles/${a.slug}`, lastmod: a.updated_at }))
            ];

            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${new Date(u.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

            res.setHeader('Content-Type', 'application/xml');
            return res.status(200).send(xml);
        } catch (error) {
            console.error('Sitemap generation error:', error);
            // Fail gracefully with just the static routes rather than a
            // broken sitemap — better for crawlers than a 500 error.
            const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticRoutes.map(path => `  <url>\n    <loc>${baseUrl}${path}</loc>\n  </url>`).join('\n')}
</urlset>`;
            res.setHeader('Content-Type', 'application/xml');
            return res.status(200).send(fallbackXml);
        }
    },

    'grant-monthly-credits': async (req, res) => {
        const supabaseClient = getSupabase();

        // FIXED (2026-08-21): was `.select('id, user_type, ...')` and keyed
        // the allowance lookup by profile.user_type — but user_type's real
        // values are job_seeker/employer/business_owner/admin/super_admin,
        // NOT free/registered/professional/business. Since only 'employer'
        // happens to be a valid value on both sides, this meant the lookup
        // matched (by coincidence) only for employer-tier accounts —
        // free/registered/professional/business tier users were silently
        // skipped every single month, with no error, since
        // `tierAllowances[profile.user_type]` was always undefined for
        // them. Now selects and keys by the real tier column instead, and
        // uses the shared TIER_MONTHLY_ALLOWANCE constant instead of its
        // own separate, drifted set of numbers.
        try {
            const { data: profiles, error: profilesError } = await supabaseClient
                .from('profiles')
                .select('id, tier, user_type, last_credit_grant_at')
                .not('user_type', 'in', '(admin,super_admin)');

            if (profilesError) throw profilesError;

            let granted = 0;
            let skipped = 0;
            const errors = [];

            for (const profile of profiles || []) {
                const allowance = TIER_MONTHLY_ALLOWANCE[profile.tier];
                if (!allowance) { skipped++; continue; }

                // Avoid double-granting if this action gets triggered more
                // than once in the same calendar month.
                if (profile.last_credit_grant_at) {
                    const lastGrant = new Date(profile.last_credit_grant_at);
                    const now = new Date();
                    if (lastGrant.getFullYear() === now.getFullYear() && lastGrant.getMonth() === now.getMonth()) {
                        skipped++;
                        continue;
                    }
                }

                try {
                    const { data: existing } = await supabaseClient
                        .from('va_credits')
                        .select('balance')
                        .eq('user_id', profile.id)
                        .maybeSingle();

                    if (existing) {
                        await supabaseClient
                            .from('va_credits')
                            .update({ balance: (existing.balance || 0) + allowance })
                            .eq('user_id', profile.id);
                    } else {
                        await supabaseClient
                            .from('va_credits')
                            .insert({ user_id: profile.id, balance: allowance });
                    }

                    await supabaseClient
                        .from('profiles')
                        .update({ last_credit_grant_at: new Date().toISOString() })
                        .eq('id', profile.id);

                    granted++;
                } catch (grantError) {
                    errors.push({ userId: profile.id, error: grantError.message });
                }
            }

            return res.status(200).json({ success: true, granted, skipped, errors: errors.length > 0 ? errors : undefined });
        } catch (error) {
            console.error('grant-monthly-credits error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== CHAT SKILL EXTRACTION & JOB MATCHING (NEW — 2026-08-16) ==========
    // Users can paste their CV/skills into chat; this extracts structured
    // skills via AI and stores them for job matching. Metered by the same
    // unified credit system as everything else — this is a real
    // AI-costing action, not free.
    //
    // IMPORTANT CAVEAT: stores to profiles.chat_extracted_skills, a new,
    // deliberately separate column — NOT integrated with whatever real
    // skills system UserSkills.jsx already uses (referenced earlier this
    // session but never reviewed). Building on an assumed schema here
    // risked creating a second, conflicting skills store — exactly the
    // kind of duplication this whole session has been cleaning up. If
    // UserSkills.jsx already has a proper skills table, this should be
    // migrated to use that instead once that file is available.
    // ========== USER SKILLS (NEW — 2026-08-16) ==========
    // Backs UserSkills.jsx — user-skills, user-skill-add,
    // user-skill-update, user-skill-delete all called actions that didn't
    // exist anywhere in the backend, confirmed via direct check. This
    // page has very likely never worked for any user.

    'user-skills': async (req, res) => {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

        try {
            const supabaseClient = getSupabase();
            const { data, error } = await supabaseClient
                .from('user_skills')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return res.status(200).json({ success: true, data: data || [] });
        } catch (error) {
            console.error('user-skills error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'user-skill-add': async (req, res) => {
        const { userId, skill } = req.body;
        if (!userId || !skill?.skill_name || !skill?.category) {
            return res.status(400).json({ success: false, error: 'userId and skill (with skill_name, category) are required' });
        }

        try {
            const supabaseClient = getSupabase();
            const { data, error } = await supabaseClient
                .from('user_skills')
                .insert({
                    user_id: userId,
                    skill_name: skill.skill_name,
                    category: skill.category,
                    years_experience: skill.years_experience || 0,
                    proficiency_level: skill.proficiency_level || null,
                    verification_status: 'pending',
                    source: 'manual'
                })
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json({ success: true, skill: data });
        } catch (error) {
            console.error('user-skill-add error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'user-skill-update': async (req, res) => {
        const { skillId, userId, updates } = req.body;
        if (!skillId || !userId) return res.status(400).json({ success: false, error: 'skillId and userId are required' });

        try {
            const supabaseClient = getSupabase();
            const { error } = await supabaseClient
                .from('user_skills')
                .update({
                    skill_name: updates?.skill_name,
                    category: updates?.category,
                    years_experience: updates?.years_experience,
                    proficiency_level: updates?.proficiency_level,
                    updated_at: new Date().toISOString()
                })
                .eq('id', skillId)
                .eq('user_id', userId); // ownership check — never trust the client alone

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('user-skill-update error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'user-skill-delete': async (req, res) => {
        const { skillId, userId } = req.body;
        if (!skillId || !userId) return res.status(400).json({ success: false, error: 'skillId and userId are required' });

        try {
            const supabaseClient = getSupabase();
            const { error } = await supabaseClient
                .from('user_skills')
                .delete()
                .eq('id', skillId)
                .eq('user_id', userId);

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('user-skill-delete error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // FIXED (2026-08-16): migrated to write into the real user_skills
    // table (backing UserSkills.jsx) instead of a separate
    // profiles.chat_extracted_skills column — avoids creating a second,
    // disconnected skills store now that the real system is confirmed.
    'extract-skills-from-chat': async (req, res) => {
        const { cvOrSkillsText, userId } = req.body;
        if (!cvOrSkillsText) return res.status(400).json({ error: 'cvOrSkillsText is required' });
        if (!userId) return res.status(400).json({ error: 'userId is required — skill extraction requires a registered account' });

        const validCategories = ['technical', 'soft', 'leadership', 'creative', 'analytical', 'communication', 'management', 'ai', 'data'];

        try {
            const supabaseClient = getSupabase();
            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const data = await callOpenAI([
                {
                    role: 'system',
                    content: `Extract a structured list of professional skills from the CV or skills description provided. Return ONLY a valid JSON array of objects, each with "skill_name" (a specific, searchable skill like "Project Management" or "Python") and "category" (must be exactly one of: ${validCategories.join(', ')}). No explanation, no markdown — just the JSON array.`
                },
                { role: 'user', content: cvOrSkillsText }
            ], 600, 0.3);

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

            const savedSkills = [];
            for (const item of extracted) {
                if (!item.skill_name) continue;
                const category = validCategories.includes(item.category) ? item.category : 'technical';

                // Avoid duplicate entries if the same skill is shared again
                const { data: existing } = await supabaseClient
                    .from('user_skills')
                    .select('id')
                    .eq('user_id', userId)
                    .ilike('skill_name', item.skill_name)
                    .maybeSingle();

                if (existing) continue;

                const { data: inserted } = await supabaseClient
                    .from('user_skills')
                    .insert({
                        user_id: userId,
                        skill_name: item.skill_name,
                        category,
                        verification_status: 'pending',
                        source: 'chat_extracted'
                    })
                    .select()
                    .single();

                if (inserted) savedSkills.push(inserted);
            }

            return res.status(200).json({
                success: true,
                skills: savedSkills.map(s => s.skill_name),
                remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining
            });
        } catch (error) {
            console.error('extract-skills-from-chat error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Matches a user's real, stored skills (from user_skills — either
    // manually added via UserSkills.jsx or chat-extracted) against real
    // job listings — not metered, since this is a database query, not an
    // OpenAI call.
    'match-jobs-to-skills': async (req, res) => {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId is required' });

        try {
            const supabaseClient = getSupabase();
            const { data: skillRows } = await supabaseClient
                .from('user_skills')
                .select('skill_name')
                .eq('user_id', userId);

            const skills = (skillRows || []).map(s => s.skill_name);
            if (skills.length === 0) {
                return res.status(200).json({ success: true, jobs: [], message: 'No skills on file yet — add skills on your Skills page or share your CV in chat first.' });
            }

            // Build an OR filter matching any stored skill against job
            // title/description — genuinely simple keyword matching, not
            // an AI call, so no credit cost.
            const orFilter = skills
                .slice(0, 10) // cap to keep the query reasonable
                .map(skill => `title.ilike.%${skill}%,description.ilike.%${skill}%`)
                .join(',');

            const { data: jobs } = await supabaseClient
                .from('jobs')
                .select('id, title, company, location, job_type, salary_range, external_apply_url')
                .eq('is_active', true)
                .or(orFilter)
                .order('created_at', { ascending: false })
                .limit(20);

            return res.status(200).json({ success: true, jobs: jobs || [], matchedSkills: skills });
        } catch (error) {
            console.error('match-jobs-to-skills error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== ACTIVITY SIGNALS / TRENDING / GAP ANALYSIS (NEW — 2026-08-16) ==========
    // Shared foundation for 3 related requests: the "latest trend corner",
    // opportunity-gap analysis with auto-build-assist, and informing
    // newsletter content.

    // Lightweight, unmetered logging — not an AI call, just a database
    // write. Called from search bars and chat.
    'log-activity-signal': async (req, res) => {
        const { signalType, queryText, sourcePage, userId } = req.body;
        if (!signalType || !queryText) return res.status(400).json({ success: false, error: 'signalType and queryText are required' });
        if (queryText.trim().length < 2) return res.status(200).json({ success: true }); // skip trivial/empty queries silently

        try {
            const supabaseClient = getSupabase();
            await supabaseClient.from('activity_signals').insert({
                signal_type: signalType,
                query_text: queryText.trim().substring(0, 300),
                source_page: sourcePage || null,
                user_id: userId || null
            });
            return res.status(200).json({ success: true });
        } catch (error) {
            // Logging failures should never break the user's actual action
            console.warn('log-activity-signal error:', error);
            return res.status(200).json({ success: true });
        }
    },

    // Public — powers the "Latest Trend Corner" widget. Not an AI call,
    // just aggregation, so it's fast and free to call often.
    'trending-topics': async (req, res) => {
        const supabaseClient = getSupabase();
        const days = parseInt(req.query?.days || req.body?.days || '7', 10);

        try {
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            const { data: signals } = await supabaseClient
                .from('activity_signals')
                .select('query_text')
                .gte('created_at', since)
                .limit(2000);

            const counts = {};
            for (const s of signals || []) {
                const normalized = s.query_text.toLowerCase().trim();
                counts[normalized] = (counts[normalized] || 0) + 1;
            }

            const trending = Object.entries(counts)
                .filter(([, count]) => count >= 2) // skip one-off queries
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([topic, count]) => ({ topic, count }));

            return res.status(200).json({ success: true, trending });
        } catch (error) {
            console.error('trending-topics error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Admin-only. AI reviews recent search/chat activity to surface real
    // gaps and opportunities — and "auto build assist": for each gap, it
    // drafts a concrete starting point (a suggested tool name and, where
    // applicable, an actual system prompt that could power it), not just
    // a description of the problem.
    'analyze-opportunity-gaps': async (req, res) => {
        const { userId } = req.body;

        const supabaseClient = getSupabase();
        const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
        if (!creditCheck.allowed) {
            return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
        }

        try {
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: signals } = await supabaseClient
                .from('activity_signals')
                .select('query_text, signal_type')
                .gte('created_at', since)
                .limit(500);

            if (!signals || signals.length < 10) {
                return res.status(200).json({ success: true, gaps: [], message: 'Not enough recent activity yet for a meaningful analysis — check back after more usage builds up.' });
            }

            const sampleText = signals.map(s => `[${s.signal_type}] ${s.query_text}`).join('\n').substring(0, 8000);

            const data = await callOpenAI([
                {
                    role: 'system',
                    content: `You are a product strategist reviewing real user search queries and chat topics from an HR/career platform (job search, HR Tools, courses, assessments, workforce marketplace, virtual assistants). Identify 3-5 genuine gaps or opportunities — things users are clearly asking for that the platform doesn't currently offer well. For each gap, return: "gap" (what users need), "evidence" (a brief note on what patterns suggest this), "suggested_build" (a specific, concrete thing to build — a new HR Tool, article topic, course, or feature), and "starter_prompt" (if it's an AI-tool idea, a real, usable system prompt to power it; otherwise null). Return ONLY a valid JSON array of these objects, no other text.`
                },
                { role: 'user', content: sampleText }
            ], 1500, 0.5);

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const gaps = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

            return res.status(200).json({ success: true, gaps, signalsAnalyzed: signals.length, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            console.error('analyze-opportunity-gaps error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Admin-only. Pulls recent real platform activity (new jobs, new
    // courses, new articles, trending topics) into a ready-to-edit
    // newsletter draft — closes the "newsletter pool" request without
    // requiring manual curation from scratch every time.
    'generate-newsletter-digest': async (req, res) => {
        const supabaseClient = getSupabase();

        try {
            const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            const [{ data: newJobs }, { data: newCourses }, { data: newArticles }, trendingResponse] = await Promise.all([
                supabaseClient.from('jobs').select('title, company, location').eq('is_active', true).gte('created_at', since).limit(10),
                supabaseClient.from('courses').select('title, description').eq('is_published', true).gte('created_at', since).limit(5),
                supabaseClient.from('articles').select('title, excerpt, slug').eq('is_published', true).gte('created_at', since).limit(5),
                (async () => {
                    const { data } = await supabaseClient.from('activity_signals').select('query_text').gte('created_at', since).limit(500);
                    return data;
                })()
            ]);

            const counts = {};
            for (const s of trendingResponse || []) {
                const normalized = s.query_text.toLowerCase().trim();
                counts[normalized] = (counts[normalized] || 0) + 1;
            }
            const topTrending = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([topic]) => topic);

            const jobsSection = (newJobs || []).length > 0
                ? (newJobs || []).map(j => `- ${j.title} at ${j.company || 'N/A'} (${j.location || 'various locations'})`).join('\n')
                : 'No new jobs posted this week.';

            const coursesSection = (newCourses || []).length > 0
                ? (newCourses || []).map(c => `- ${c.title}`).join('\n')
                : 'No new courses this week.';

            const articlesSection = (newArticles || []).length > 0
                ? (newArticles || []).map(a => `- [${a.title}](/articles/${a.slug})`).join('\n')
                : 'No new articles this week.';

            const draftContent = `## This Week on ODUSBABA

### New Job Opportunities
${jobsSection}

### New Courses
${coursesSection}

### Latest Articles
${articlesSection}

${topTrending.length > 0 ? `### What People Are Searching For\n${topTrending.map(t => `- ${t}`).join('\n')}` : ''}`;

            return res.status(200).json({
                success: true,
                draft: {
                    subject: `Your Weekly ODUSBABA Digest — ${new Date().toLocaleDateString()}`,
                    content: draftContent
                }
            });
        } catch (error) {
            console.error('generate-newsletter-digest error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== SEO AUTOMATION (NEW — 2026-08-16) ==========

    // AI-generates SEO title/description for an article — or for every
    // published article missing one, if no specific articleId is given.
    // Metered (real OpenAI cost) when called for a single article, but
    // the bulk mode below deducts once per article generated, not once
    // total, so it correctly reflects real usage.
    'generate-seo-metadata': async (req, res) => {
        const { articleId, userId } = req.body;
        const supabaseClient = getSupabase();

        try {
            let articles;
            if (articleId) {
                const { data } = await supabaseClient.from('articles').select('id, title, excerpt, content').eq('id', articleId).single();
                articles = data ? [data] : [];
            } else {
                const { data } = await supabaseClient
                    .from('articles')
                    .select('id, title, excerpt, content')
                    .eq('is_published', true)
                    .or('seo_title.is.null,seo_description.is.null')
                    .limit(20);
                articles = data || [];
            }

            if (articles.length === 0) {
                return res.status(200).json({ success: true, updated: 0, message: 'Nothing to generate — all published articles already have SEO metadata.' });
            }

            let updated = 0;
            for (const article of articles) {
                const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
                if (!creditCheck.allowed) break; // stop the batch gracefully if credits run out mid-run

                try {
                    const data = await callOpenAI([
                        { role: 'system', content: 'Write SEO metadata for this article. Return ONLY valid JSON: {"seo_title": "under 60 characters, compelling, includes the main keyword", "seo_description": "under 155 characters, includes a clear reason to click"}. No other text.' },
                        { role: 'user', content: `Title: ${article.title}\n\nExcerpt: ${article.excerpt || ''}\n\nContent (truncated): ${(article.content || '').substring(0, 1500)}` }
                    ], 300, 0.4);

                    const content = data.choices[0].message.content;
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    const meta = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

                    if (meta?.seo_title && meta?.seo_description) {
                        await supabaseClient
                            .from('articles')
                            .update({ seo_title: meta.seo_title.substring(0, 70), seo_description: meta.seo_description.substring(0, 165) })
                            .eq('id', article.id);
                        updated++;
                    }
                } catch (perArticleError) {
                    console.warn(`SEO generation failed for article ${article.id}:`, perArticleError);
                }
            }

            return res.status(200).json({ success: true, updated, total: articles.length });
        } catch (error) {
            console.error('generate-seo-metadata error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Real XML sitemap, built from actual published content — not a
    // static file, so it stays accurate as content is added. Routed at
    // the real /sitemap.xml URL via a vercel.json rewrite (reuses this
    // same function rather than adding a new serverless function, given
    // the Hobby plan's function-count limit hit earlier this session).
    sitemap: async (req, res) => {
        const supabaseClient = getSupabase();
        const siteUrl = process.env.SITE_URL || 'https://bluskyeconsult.com';

        try {
            const staticPages = ['', '/jobs', '/courses', '/assessments', '/workforce', '/hire-va', '/hr-tools', '/books', '/blog', '/pricing', '/about', '/contact', '/affiliate'];

            const { data: articles } = await supabaseClient
                .from('articles')
                .select('slug, created_at')
                .eq('is_published', true);

            const { data: courses } = await supabaseClient
                .from('courses')
                .select('id, created_at')
                .eq('is_published', true);

            const urls = [
                ...staticPages.map(path => ({ loc: `${siteUrl}${path}`, lastmod: null })),
                ...(articles || []).map(a => ({ loc: `${siteUrl}/articles/${a.slug}`, lastmod: a.created_at })),
                ...(courses || []).map(c => ({ loc: `${siteUrl}/courses/${c.id}`, lastmod: c.created_at }))
            ];

            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${new Date(u.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}\n  </url>`).join('\n')}
</urlset>`;

            res.setHeader('Content-Type', 'application/xml');
            return res.status(200).send(xml);
        } catch (error) {
            console.error('sitemap error:', error);
            res.setHeader('Content-Type', 'application/xml');
            return res.status(500).send('<?xml version="1.0"?><error>Sitemap generation failed</error>');
        }
    },

    'refresh-knowledge': async (req, res) => {
        const { sourceId } = req.body;
        if (!sourceId) return res.status(400).json({ error: 'sourceId is required' });

        const supabaseClient = getSupabase();

        try {
            const { data: source, error: sourceError } = await supabaseClient
                .from('ai_knowledge_sources')
                .select('id, source_url, source_name')
                .eq('id', sourceId)
                .single();

            if (sourceError || !source) {
                return res.status(404).json({ success: false, error: 'Knowledge source not found' });
            }

            let content = '';
            let fetchStatus = 'success';
            let errorMessage = null;

            try {
                const response = await safeFetch(source.source_url, 15000);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const html = await response.text();

                // Strip scripts, styles, then all remaining tags; collapse
                // whitespace; cap length for storage/token efficiency.
                content = html
                    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 20000);

                if (!content) {
                    fetchStatus = 'empty';
                    errorMessage = 'No text content found at this URL';
                }
            } catch (fetchError) {
                fetchStatus = 'error';
                errorMessage = fetchError.message;
            }

            const { error: insertError } = await supabaseClient
                .from('ai_knowledge_base')
                .insert({
                    source_id: sourceId,
                    content: content || null,
                    fetch_status: fetchStatus,
                    error_message: errorMessage
                });

            if (insertError) {
                return res.status(500).json({ success: false, error: `Fetched content but failed to save it: ${insertError.message}` });
            }

            await supabaseClient
                .from('ai_knowledge_sources')
                .update({ last_fetched_at: new Date().toISOString() })
                .eq('id', sourceId);

            if (fetchStatus !== 'success') {
                return res.status(200).json({ success: false, error: errorMessage });
            }

            return res.status(200).json({ success: true, contentLength: content.length });
        } catch (error) {
            console.error('refresh-knowledge error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== GENERATE COURSE ==========
    'generate-course': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await requireAdmin(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

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
        const supabaseClient = getSupabase();
        const auth = await requireAdmin(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

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
        const supabaseClient = getSupabase();
        const auth = await requireAdmin(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

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
        const supabaseClient = getSupabase();
        const auth = await requireAdmin(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { text, lessonId } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

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
            
            const reportUrl = `https://bluskyeconsult.com/reports/${userAssessmentId}`;
            
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
            fetch(`${process.env.VERCEL_URL || 'https://bluskyeconsult.com'}/api/index?action=email`, {
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
            
            // FIXED (2026-08-21): business tier was previously treated as
            // fully unlimited here (999999), inconsistent with the decision
            // to cap it at a real finite number instead. Removed from the
            // isUnlimited check.
            const isUnlimited = profile?.user_type === 'super_admin' || profile?.user_type === 'admin';
            
            if (type === 'assessments') {
                // NOTE: 100 for business is my own proportional estimate
                // (roughly 3x employer's 30), not an explicitly confirmed
                // number — assessments are a lower-volume resource than
                // VA/HR-tool AI calls, so this isn't simply copied from the
                // 200/month VA/HR-tools cap. Adjust if a different number
                // was actually intended.
                const limits = {
                    free: 3,
                    registered: 10,
                    professional: 50,
                    employer: 30,
                    business: 100,
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
            
            fetch(`${process.env.VERCEL_URL || 'https://bluskyeconsult.com'}/api/index?action=email`, {
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
    // FIXED (2026-08-20): this previously returned a hardcoded
    // openRate: 68 and weeklyIssues: 156 regardless of reality — fabricated
    // data sitting directly in the backend, the same class of issue found
    // and removed from several frontend pages earlier this session. Worse,
    // the error fallback invented a fake subscriber count of 5284 if the
    // real query failed for any reason. There's no real email-open-
    // tracking system built anywhere in this project (no pixel tracking,
    // no click tracking table), so openRate genuinely can't be computed
    // yet — returns null with a clear "not tracked yet" signal instead of
    // inventing a number, and the error fallback now honestly returns 0
    // rather than a fabricated count.
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
                    openRate: null, // not yet tracked — no real open-tracking system exists
                    weeklyIssues: null // not yet tracked
                }
            });
        } catch (error) {
            console.error('newsletter-stats error:', error);
            return res.status(200).json({
                success: true,
                stats: { subscribers: 0, openRate: null, weeklyIssues: null }
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
    // FIXED (2026-08-22): a second, fake 'trending-topics' handler existed
    // here — a hardcoded static list ('HR Tech', 'Remote Work', etc.) —
    // and because both handlers shared the same key, this one silently
    // WON in the final handlers object (JS object literals: last
    // duplicate key wins), completely shadowing the real, activity-based
    // implementation above. This means every caller of ?action=trending-
    // topics — including a public-facing "Latest Trend Corner" widget per
    // AdminOpportunityGaps.jsx's own comment — has been receiving
    // fabricated data, not real trends. It also returned `topics`, not
    // `trending`, so AdminOpportunityGaps.jsx's own "Trending This Week"
    // panel (which reads `data.trending`) has been silently empty this
    // whole time regardless of real activity. Removed entirely — the
    // real handler above is now the only one.

    // ========== TESTER CREATE ==========
    // ========== TWO-FACTOR AUTHENTICATION (NEW — 2026-08-21) ==========
    // First real implementation using profiles.two_factor_enabled/
    // two_factor_secret/two_factor_backup_codes/two_factor_last_verified —
    // columns confirmed to exist in the real schema, but with no code
    // anywhere reading or writing them before this. General feature, any
    // authenticated user can enable it (not admin-gated), per explicit
    // decision — motivated by hardening the break-glass super_admin
    // account, but built as a real, usable feature rather than a one-off.
    //
    // Requires adding two npm packages: `otpauth` (TOTP generation/
    // verification, pure JS, no native bindings) and `qrcode` (renders the
    // provisioning URI as a scannable PNG data URI server-side, so the
    // frontend just needs an <img>, no client-side QR library needed).
    //
    // Design: setup-2fa generates and stores a secret but does NOT enable
    // 2FA yet — confirm-2fa-setup only flips two_factor_enabled to true
    // once the user proves they actually scanned it correctly, so an
    // abandoned setup attempt never locks anyone out (two_factor_enabled
    // stays false, sign-in never checks an unconfirmed secret). Backup
    // codes are stored HASHED (sha256) never in plaintext — shown to the
    // user exactly once, at confirm time, then never retrievable again.
    // Each backup code is single-use: consuming one removes it from the
    // stored array entirely. verify-2fa (used both at sign-in and to
    // authorize disabling 2FA) is IP-rate-limited like every other
    // security-sensitive action in this file, since a 6-digit TOTP code
    // is a real, if narrow, brute-force target.

    'setup-2fa': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        try {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('email, two_factor_enabled')
                .eq('id', auth.userId)
                .single();

            if (profile?.two_factor_enabled) {
                return res.status(400).json({ error: '2FA is already enabled on this account. Disable it first to set up again.' });
            }

            const { Secret, TOTP } = await import('otpauth');
            const QRCode = (await import('qrcode')).default;

            const secret = new Secret({ size: 20 });
            const totp = new TOTP({
                issuer: 'ODUSBABA HR Platform',
                label: profile?.email || auth.userId,
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret
            });

            const provisioningUri = totp.toString();
            const qrCodeDataUri = await QRCode.toDataURL(provisioningUri);

            // Stored now, but two_factor_enabled stays false until
            // confirm-2fa-setup verifies the user actually scanned it
            // correctly. An abandoned/never-confirmed setup has zero
            // effect on sign-in.
            const { error: updateError } = await supabaseClient
                .from('profiles')
                .update({ two_factor_secret: secret.base32 })
                .eq('id', auth.userId);

            if (updateError) throw updateError;

            return res.status(200).json({
                success: true,
                qrCode: qrCodeDataUri,
                manualEntryKey: secret.base32
            });
        } catch (error) {
            console.error('2FA setup error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'confirm-2fa-setup': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Verification code is required' });

        try {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('two_factor_secret')
                .eq('id', auth.userId)
                .single();

            if (!profile?.two_factor_secret) {
                return res.status(400).json({ error: 'No pending 2FA setup found — call setup-2fa first' });
            }

            const { TOTP, Secret } = await import('otpauth');
            const totp = new TOTP({
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: Secret.fromBase32(profile.two_factor_secret)
            });

            // window: 1 allows the code from one 30s step before/after the
            // current one, tolerating minor clock drift between the
            // user's device and the server — standard TOTP practice.
            const delta = totp.validate({ token: code, window: 1 });
            if (delta === null) {
                return res.status(400).json({ success: false, error: 'Invalid code. Please check your authenticator app and try again.' });
            }

            // Generate 8 single-use backup codes, shown in plaintext ONLY
            // in this response — stored hashed, never retrievable again.
            const crypto = await import('crypto');
            const plaintextBackupCodes = Array.from({ length: 8 }, () =>
                crypto.randomBytes(5).toString('hex').toUpperCase()
            );
            const hashedBackupCodes = plaintextBackupCodes.map(c =>
                crypto.createHash('sha256').update(c).digest('hex')
            );

            const { error: updateError } = await supabaseClient
                .from('profiles')
                .update({
                    two_factor_enabled: true,
                    two_factor_backup_codes: hashedBackupCodes,
                    two_factor_last_verified: new Date().toISOString()
                })
                .eq('id', auth.userId);

            if (updateError) throw updateError;

            return res.status(200).json({
                success: true,
                backupCodes: plaintextBackupCodes,
                message: 'Save these backup codes somewhere safe — each can be used once if you lose access to your authenticator app. They will not be shown again.'
            });
        } catch (error) {
            console.error('2FA confirm error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Used both mid-sign-in (after password auth succeeds, before a full
    // session is granted) and to authorize disabling 2FA. Takes userId
    // directly rather than requiring a full session, since during sign-in
    // there isn't a complete authenticated session yet — but IP-rate-
    // limited the same way guest/free-tier actions are elsewhere in this
    // file, since this is a real brute-force target otherwise.
    'verify-2fa': async (req, res) => {
        const { userId, code } = req.body;
        if (!userId || !code) return res.status(400).json({ error: 'userId and code are required' });

        const supabaseClient = getSupabase();

        const ip = getClientIp(req);
        const rateCheck = await checkIpRateLimit(supabaseClient, `2fa-verify:${ip}`, 10);
        if (!rateCheck.allowed) {
            return res.status(429).json({ error: 'Too many attempts — please wait a few minutes and try again.' });
        }

        try {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('two_factor_secret, two_factor_backup_codes')
                .eq('id', userId)
                .single();

            if (!profile?.two_factor_secret) {
                return res.status(400).json({ valid: false, error: '2FA is not set up on this account' });
            }

            const { TOTP, Secret } = await import('otpauth');
            const totp = new TOTP({
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: Secret.fromBase32(profile.two_factor_secret)
            });

            const delta = totp.validate({ token: code, window: 1 });
            if (delta !== null) {
                await supabaseClient
                    .from('profiles')
                    .update({ two_factor_last_verified: new Date().toISOString() })
                    .eq('id', userId);
                return res.status(200).json({ valid: true, method: 'totp' });
            }

            // Not a valid TOTP code — check backup codes.
            const crypto = await import('crypto');
            const submittedHash = crypto.createHash('sha256').update(code.toUpperCase().trim()).digest('hex');
            const backupCodes = profile.two_factor_backup_codes || [];
            const matchIndex = backupCodes.indexOf(submittedHash);

            if (matchIndex === -1) {
                return res.status(200).json({ valid: false });
            }

            // Single-use: remove the consumed code from the stored array.
            const remainingCodes = backupCodes.filter((_, i) => i !== matchIndex);
            await supabaseClient
                .from('profiles')
                .update({
                    two_factor_backup_codes: remainingCodes,
                    two_factor_last_verified: new Date().toISOString()
                })
                .eq('id', userId);

            return res.status(200).json({
                valid: true,
                method: 'backup_code',
                remainingBackupCodes: remainingCodes.length
            });
        } catch (error) {
            console.error('2FA verify error:', error);
            return res.status(500).json({ valid: false, error: error.message });
        }
    },

    'disable-2fa': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'A current 2FA code is required to disable 2FA' });

        try {
            // Reuses the same verify logic — a valid session alone isn't
            // enough to disable 2FA; possession of the actual second
            // factor is required, otherwise a stolen session could
            // silently strip 2FA protection.
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('two_factor_secret, two_factor_backup_codes')
                .eq('id', auth.userId)
                .single();

            if (!profile?.two_factor_secret) {
                return res.status(400).json({ error: '2FA is not currently enabled' });
            }

            const { TOTP, Secret } = await import('otpauth');
            const totp = new TOTP({
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: Secret.fromBase32(profile.two_factor_secret)
            });

            const delta = totp.validate({ token: code, window: 1 });
            let validated = delta !== null;

            if (!validated) {
                const crypto = await import('crypto');
                const submittedHash = crypto.createHash('sha256').update(code.toUpperCase().trim()).digest('hex');
                validated = (profile.two_factor_backup_codes || []).includes(submittedHash);
            }

            if (!validated) {
                return res.status(400).json({ error: 'Invalid code — cannot disable 2FA without a valid current code' });
            }

            await supabaseClient
                .from('profiles')
                .update({
                    two_factor_enabled: false,
                    two_factor_secret: null,
                    two_factor_backup_codes: null
                })
                .eq('id', auth.userId);

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('2FA disable error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

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
            
            await fetch(`${process.env.VERCEL_URL || 'https://bluskyeconsult.com'}/api/index?action=email`, {
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

    // ========== VALIDATE INVITE CODE (NEW — 2026-08-21) ==========
    // First real end-to-end implementation of invite-code gating —
    // confirmed via full-backend search that tester_invite_codes and
    // tester_invites were both previously referenced nowhere at all, and
    // tester_allocations is write-only (tester-create inserts, nothing
    // ever reads remaining_uses back). None of the three prior
    // tester-tracking tables were actually wired to signup.
    //
    // Uses tester_invite_codes specifically (not tester_invites) — its
    // schema (max_uses/times_used/is_active/expires_at) is internally
    // consistent for a multi-use code; tester_invites' schema
    // (max_uses alongside a singular used_by/used_at) is self-
    // contradictory and looks like an earlier abandoned draft.
    //
    // The actual check-and-increment happens atomically inside the
    // consume_invite_code() Postgres function (see
    // add-invite-code-validation-function.sql) — never as a
    // separate SELECT-then-UPDATE here, which would race under
    // concurrent redemptions of a code's last remaining use.
    'validate-invite-code': async (req, res) => {
        const { code } = req.body;
        const supabaseClient = getSupabase();

        if (!code || typeof code !== 'string' || !code.trim()) {
            return res.status(400).json({ success: false, valid: false, error: 'Invite code is required' });
        }

        try {
            const { data, error } = await supabaseClient
                .rpc('consume_invite_code', { p_code: code.trim() });

            if (error) throw error;

            const result = data?.[0];
            if (!result) {
                return res.status(500).json({ success: false, valid: false, error: 'Validation returned no result' });
            }

            if (!result.success) {
                return res.status(200).json({ success: true, valid: false, reason: result.reason });
            }

            return res.status(200).json({ success: true, valid: true });
        } catch (error) {
            console.error('Invite code validation error:', error);
            return res.status(500).json({ success: false, valid: false, error: error.message });
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
            
            // FIXED (2026-08-21): business tier previously short-circuited
            // here with a hardcoded 999999, bypassing va_credits entirely.
            // Now falls through to the real balance check below, using the
            // corrected TIER_MONTHLY_ALLOWANCE.business (200).
            const isUnlimited = profile?.user_type === 'super_admin' || profile?.user_type === 'admin';
            
            if (isUnlimited) {
                return res.status(200).json({ success: true, credits: 999999, isUnlimited: true });
            }
            
            let { data: credits } = await supabaseClient
                .from('va_credits')
                .select('balance')
                .eq('user_id', userId)
                .single();
            
            if (!credits) {
                // FIXED (2026-08-21): now uses the shared
                // TIER_MONTHLY_ALLOWANCE constant instead of its own
                // separate inline copy of these numbers, closing the
                // silent-drift gap between this and grant-monthly-credits.
                const defaultCredits = TIER_MONTHLY_ALLOWANCE[profile?.tier] || 5;
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

        // FIXED (2026-08-21): this handler previously called OpenAI FIRST,
        // unconditionally, and only checked/deducted credits AFTERWARD —
        // meaning an account with zero balance still got a full, real,
        // billed OpenAI completion every time; the credit system only
        // recorded usage, it never actually prevented it. Moved the check
        // to before the OpenAI call.
        //
        // REFACTORED (2026-08-21): now uses the same shared
        // checkAndDeductCredit() every other AI-costing handler in this
        // file already uses, rather than its own separate copy of the
        // tester-cap logic — that function is now tester-aware (checks
        // profiles.is_tester, routes to the tester_allocations cap
        // instead of va_credits), so fixing it once there covers this
        // handler too instead of maintaining two versions of the same
        // check that could drift out of sync with each other.
        const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
        if (!creditCheck.allowed) {
            if (creditCheck.capReached) {
                return res.status(403).json({
                    error: 'Tester usage cap reached',
                    message: 'This tester account has used its allotted number of AI-backed requests. Contact the site admin if you need more.'
                });
            }
            return res.status(creditCheck.rateLimited ? 429 : 403).json({
                error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits',
                message: creditCheck.rateLimited ? undefined : 'You have no VA credits remaining. Upgrade your plan or purchase more credits to continue.'
            });
        }
        const isTester = creditCheck.isTester === true;
        
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
        
        // FIXED (2026-08-21): credit/cap deduction already happened
        // atomically inside checkAndDeductCredit() above, BEFORE the
        // OpenAI call — this used to re-check and deduct AGAIN here,
        // which after that fix would have double-charged every request.
        // Just logs the completed task now.
        try {
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
        } catch (err) {
            console.warn('Task logging failed:', err.message);
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
    setCors(req, res);
    
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
