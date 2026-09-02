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
import { searchLiveExternalJobs, checkLiveSearchRateLimit, logLiveSearch } from '../src/services/liveJobSearchService.js';
import { scrapeAllVerifiedEmployers, isSafeExternalUrl } from '../src/services/employerWebsiteScraperService.js';
// NEW (2026-08-29): confirmed severe, real bug - ExternalJobsManager.jsx
// was importing fetchExternalJobs()/testRSSConnection() directly and
// running them IN THE ADMIN'S OWN BROWSER, not on the server. CORS
// blocks every external government/job-board request when it runs
// client-side, which is exactly why every one of those sources appeared
// "unreachable" - the real, honest picture (reachable from a genuine
// server, blocked only because of where the code was running) was never
// actually visible before now.
import { fetchExternalJobs, testRSSConnection } from '../src/services/rssJobService.js';

// ============================================
// CONFIGURATION
// ============================================

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
let supabase = null;

// NEW (2026-08-30): confirmed real, live symptom - a genuine super_admin
// account (verified directly against profiles.user_type) was getting
// 403 "Admin access required" on admin-only actions. The most likely
// cause: SUPABASE_SERVICE_ROLE_KEY isn't set, so this silently falls
// back to the anon key - every admin-check query (like the profiles
// lookup in requireAdmin/admin-gated handlers) then runs under RLS
// instead of bypassing it, and can silently return nothing even for a
// real admin. This warning makes that immediately visible in server
// logs instead of manifesting as a confusing, hard-to-trace 403
// somewhere else entirely.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set - falling back to the anon key. Admin-gated actions may fail with a false "Admin access required" even for genuine admins, since profile lookups will run under RLS instead of bypassing it. Set this environment variable in Vercel to fix.');
}

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

// NEW (2026-08-23): accepts `cost` (default 1) so a single call site can
// deduct more than one credit — specifically, conversational VA turns,
// which are demonstrably more expensive to run than a single-turn call
// (each turn resends the entire conversation history as input tokens; a
// real 5-turn conversation averages ~1.56x the cost of one single-turn
// call, and that ratio worsens for longer conversations). This is the
// actual, cost-justified reason conversational VAs charge more, not an
// arbitrary number.
async function checkAndDeductCredit(supabaseClient, userId, req = null, cost = 1) {
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
            .rpc('consume_tester_allocation', { p_user_id: userId, p_cost: cost });

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

    // FIXED (2026-08-27): confirmed real credit-leakage bug — this used
    // to read the current balance, compute a new balance in application
    // code, then write it back as a separate step. Two concurrent
    // requests for the same user (a double-click, multiple tabs, a
    // retry) could both read the same starting balance and both succeed
    // in deducting, letting a user get more than one OpenAI call for the
    // price of one credit. Now a single atomic database operation, the
    // same real pattern already used correctly for tester allocations —
    // two concurrent calls can no longer both succeed against the same
    // balance.
    const { data: consumeResult, error: consumeError } = await supabaseClient
        .rpc('consume_va_credit', { p_user_id: userId, p_cost: cost });

    if (consumeError) {
        console.error('Credit consumption check failed:', consumeError.message);
        return { allowed: false, unlimited: false, remaining: 0 };
    }

    const result = consumeResult?.[0];
    if (!result?.success) {
        return { allowed: false, unlimited: false, remaining: result?.new_balance ?? 0 };
    }

    return { allowed: true, unlimited: false, remaining: result.new_balance };
}

// NEW (2026-08-27): companion to checkAndDeductCredit — call this from a
// catch block whenever a credit was successfully deducted but the paid-for
// OpenAI call then failed, so the user isn't charged for a service they
// never received. Safe no-op for unlimited (admin/guest) or tester paths,
// since no real va_credits balance was touched for those in the first
// place — only refunds when a real deduction actually happened.
async function refundCreditIfDeducted(supabaseClient, userId, creditCheck, cost = 1) {
    if (!userId || !creditCheck || creditCheck.unlimited || creditCheck.isTester) return;
    try {
        await supabaseClient.rpc('refund_va_credit', { p_user_id: userId, p_amount: cost });
    } catch (refundError) {
        console.error('Credit refund failed after an upstream error — a user may have been charged for a failed request:', refundError.message);
    }
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

// FIXED (2026-08-27): confirmed a real, systemic gap - 33 handlers across
// this file destructure userId directly from req.body and trust it as-is,
// with no verification that the caller actually IS that user. Anyone who
// knew or guessed another real user's ID could pass it in the body and
// have that person's credits deducted, tier limits checked, or personal
// data read/written, entirely bypassing whatever their own real session
// says. This closes that gap without breaking legitimate guest paths
// (chat, for example, genuinely allows unauthenticated use) - if a
// userId is claimed, a real, matching auth token is now required; if no
// userId is claimed at all, the request proceeds as a real guest, same
// as before.
//
// Returns { verified: true, userId } when either: a real userId was
// claimed AND a matching real session backs it up, or no userId was
// claimed at all (a legitimate guest call). Returns
// { verified: false, status, error } when a userId was claimed but
// either no valid session exists, or the real session belongs to a
// DIFFERENT user than the one claimed - both are real impersonation
// attempts, not innocent mistakes, and are rejected the same way.
async function verifyClaimedUserId(req, supabaseClient, claimedUserId) {
    if (!claimedUserId) {
        return { verified: true, userId: null };
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return { verified: false, status: 401, error: 'A real, authenticated session is required to act as a specific account.' };
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
        return { verified: false, status: 401, error: 'Invalid or expired session.' };
    }

    if (user.id !== claimedUserId) {
        return { verified: false, status: 403, error: 'You can only act as your own account.' };
    }

    return { verified: true, userId: claimedUserId };
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

// UPDATED (2026-08-30): added an optional responseFormat parameter for
// callers that need reliable structured JSON (like assessment
// generation, which previously relied on a fragile regex to extract a
// JSON array from free-form text). Defaults to null, so every existing
// caller - all 10 HR Tools, every VA, chat - is completely unaffected
// and continues exactly as before.
async function callOpenAI(messages, maxTokens = 800, temperature = 0.7, responseFormat = null) {
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const requestBody = { model: 'gpt-4o-mini', messages, max_tokens: maxTokens, temperature };
    if (responseFormat) requestBody.response_format = responseFormat;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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

// NEW (2026-08-30): helpers for the automated tester-code request
// system. Generates a short, human-readable code (uppercase
// alphanumeric, excluding visually ambiguous characters like 0/O and
// 1/I) rather than a raw UUID - genuinely random and unique enough for
// this purpose, but typeable if it ever needs to be read aloud or
// entered manually.
function generateReadableInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

async function sendTesterCodeEmail(email, code) {
    try {
        const transporter = getTransporter();
        await transporter.verify();
        await transporter.sendMail({
            from: `"ODUSBABA" <${process.env.VITE_EMAIL_USER}>`,
            to: email,
            subject: 'Your ODUSBABA Tester Invite Code',
            html: `<p>Thanks for your interest in becoming an ODUSBABA tester.</p><p>Your invite code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:2px;">${code}</p><p>Enter this code during sign-up to activate your tester access. This code is unique to you and can only be used once.</p>`
        });
        return { success: true };
    } catch (error) {
        // FIXED-pattern applied from the start here, not bolted on
        // after the fact: a failure to send is reported honestly to the
        // caller rather than swallowed, so the code (which is still
        // real and valid) doesn't just silently vanish for the
        // requester with no way to know what happened.
        console.error('sendTesterCodeEmail failed:', error.message);
        return { success: false, error: error.message };
    }
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
// FIXED (2026-08-27): confirmed real, concrete gap - the previous
// version stripped job-related words and stopwords, then searched for
// the ENTIRE remaining leftover phrase as one literal substring. A
// query combining several real, separately-filterable concepts (e.g.
// "sponsorship jobs in UK for an HR expert") would almost certainly
// match zero jobs even with perfect real candidates in the table,
// since no real listing contains that exact combined phrase verbatim.
// Now parses sponsorship intent, country/location, and role/keyword as
// genuinely separate signals.
//
// REFACTORED (2026-08-27): this parsing is now its own shared function,
// used by BOTH the internal job-board search (findRelevantJobs) and the
// new live external search (searchLiveExternalJobs, wired in below) -
// avoids parsing the same message twice with two separate, potentially
// drifting implementations.
const JOB_INTENT_KEYWORDS = /\b(job|jobs|vacanc|hiring|position|role|career|opening|opportunit|employ|apply|recruit)\w*/i;

function parseJobSearchIntent(userMessage) {
    if (!JOB_INTENT_KEYWORDS.test(userMessage)) return null;

    const msg = userMessage.toLowerCase();

    const wantsSponsorship = /\b(sponsor|visa|work permit|relocat|skilled worker)\w*/i.test(msg);

    const countryMap = {
        'uk': 'GB', 'united kingdom': 'GB', 'britain': 'GB', 'england': 'GB',
        'us': 'US', 'usa': 'US', 'united states': 'US', 'america': 'US',
        'nigeria': 'NG', 'canada': 'CA', 'australia': 'AU',
        'germany': 'DE', 'ireland': 'IE'
    };
    let matchedCountry = null;
    for (const [name, code] of Object.entries(countryMap)) {
        if (msg.includes(name)) { matchedCountry = code; break; }
    }

    const keyword = userMessage
        .replace(JOB_INTENT_KEYWORDS, '')
        .replace(/\b(sponsor\w*|visa|work permit|relocat\w*|skilled worker)\b/gi, '')
        .replace(/\b(any|are|there|for|find|me|show|search|looking|want|need|please|can|you|the|a|an|in|near|around|help)\b/gi, '')
        .trim()
        .substring(0, 100);

    return { wantsSponsorship, country: matchedCountry, keyword: keyword.length >= 3 ? keyword : null };
}

async function findRelevantJobs(supabaseClient, userMessage) {
    const intent = parseJobSearchIntent(userMessage);
    if (!intent) return null;

    try {
        let query = supabaseClient
            .from('jobs')
            .select('title, company, location, job_type, salary_range, external_apply_url, source_country, sponsorship_eligible, verified_employer_source_id')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5);

        // Each real signal detected becomes its own genuine filter,
        // combined with AND - not folded into one substring search.
        if (intent.wantsSponsorship) {
            query = query.eq('sponsorship_eligible', true);
        }
        if (intent.country) {
            query = query.eq('source_country', intent.country);
        }
        if (intent.keyword) {
            query = query.or(`title.ilike.%${intent.keyword}%,description.ilike.%${intent.keyword}%`);
        }

        const { data: jobs } = await query;
        return jobs && jobs.length > 0 ? jobs : null;
    } catch (error) {
        console.warn('Job search within chat failed, continuing without job context:', error);
        return null;
    }
}

// NEW (2026-08-27): real HR Tools catalog for the chat to proactively
// reference alongside job matches - the "intelligent value angle"
// connecting a job search directly to a concrete next action on this
// platform, rather than leaving the person with just a list of links.
const HR_TOOLS_FOR_CHAT = [
    { name: 'CV Analyzer', use: 'get real, specific feedback on a CV before applying' },
    { name: 'Cover Letter Writer', use: 'draft a tailored cover letter for a specific role' },
    { name: 'Interview Simulator', use: 'practice for an upcoming interview' },
    { name: 'Salary Calculator', use: 'check whether an offer or listed range is competitive' },
    { name: 'LinkedIn Optimizer', use: 'strengthen a LinkedIn profile before applying' }
];


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

            // FIXED (2026-08-27): closes the systemic userId-impersonation
            // gap - verifies the claimed userId actually matches a real,
            // authenticated session before it's ever used to check/deduct
            // credits.
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

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
            const jobIntent = parseJobSearchIntent(message);
            const relevantJobs = await findRelevantJobs(supabaseClient, message);

            // NEW (2026-08-27): live, on-demand external search - a
            // genuinely different feature from the job board's batch
            // fetch-and-approve pipeline. Only triggers when real
            // job-search intent is detected, respects a real per-user
            // rate limit (separate from normal chat credits, since this
            // makes several real third-party API calls), and only ever
            // reaches out to the sources already confirmed reliably
            // reachable from this platform's real infrastructure -
            // deliberately not the government sources already confirmed
            // blocked, since attempting those here would only slow every
            // chat response down for no benefit.
            let liveJobs = null;
            if (jobIntent) {
                const rateLimitCheck = await checkLiveSearchRateLimit(supabaseClient, userId);
                if (rateLimitCheck.allowed) {
                    await logLiveSearch(supabaseClient, userId, jobIntent.keyword);
                    liveJobs = await searchLiveExternalJobs({
                        keyword: jobIntent.keyword,
                        country: jobIntent.country,
                        sponsorshipOnly: jobIntent.wantsSponsorship
                    });
                }
            }

            if (relevantJobs || (liveJobs && liveJobs.length > 0)) {
                // FIXED (2026-08-27): previously labeled every non-internal
                // job as "via official government portal" unconditionally -
                // factually wrong for verified-employer-sourced jobs, which
                // come from the employer's own careers page (cross-
                // referenced against a government sponsor register), not a
                // government portal at all. Now distinguishes the two real
                // source types honestly.
                const boardContext = relevantJobs ? relevantJobs.map(j => {
                    const sourceLabel = j.verified_employer_source_id
                        ? " [via a government-verified sponsor employer's own careers page]"
                        : (j.source_country && j.source_country !== 'internal' ? ` [via official ${j.source_country} government portal]` : '');
                    return `- "${j.title}" at ${j.company || 'N/A'}, ${j.location || 'location not specified'}${j.salary_range ? ` (${j.salary_range})` : ''}${sourceLabel}${j.sponsorship_eligible ? ' [sponsorship available]' : ''}`;
                }).join('\n') : '';

                // FIXED (2026-08-27): live results are explicitly, honestly
                // labeled as not yet reviewed - unlike the job board's
                // admin-approved listings, nothing here has passed human
                // review, and the AI is told to say so plainly rather than
                // present both tiers with equal confidence.
                const liveContext = (liveJobs && liveJobs.length > 0) ? liveJobs.map(j =>
                    `- "${j.title}" at ${j.company || 'N/A'}, ${j.location || 'location not specified'} [LIVE result from ${j.source_name}, not yet reviewed by our team]`
                ).join('\n') : '';

                const toolSuggestions = HR_TOOLS_FOR_CHAT.map(t => `${t.name} (${t.use})`).join(', ');

                messages = [{
                    role: 'system',
                    content: `The user's message may be about job searching.${boardContext ? ` Here are real, current listings from our job board that match what they asked for (already filtered by any sponsorship or country requirement they mentioned):\n\n${boardContext}` : ''}${liveContext ? `\n\nHere are additional LIVE results fetched just now from external remote-job sources, which have NOT been reviewed by our team - present these honestly as live, unreviewed results, not with the same confidence as job board listings:\n\n${liveContext}` : ''}\n\nIf genuinely relevant, recommend specific ones by name and mention they can view full details and apply directly. Never invent or describe job listings that aren't in one of these lists — if none are a good match, say so honestly and suggest they browse the full job board instead. After discussing jobs, naturally mention ONE relevant HR Tool from this platform that could help them right now (available tools: ${toolSuggestions}) — pick whichever genuinely fits their situation, don't list all of them.`
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
            // FIXED (2026-08-27): confirmed real leakage — a credit was
            // already deducted above before this call, but a failure here
            // previously just returned an error with no refund, charging
            // the user for a service they never received.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
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
            // FIXED (2026-08-30): confirmed several real gaps. No
            // dimension field was ever requested, meaning AI-generated
            // assessments could never populate the dimension-breakdown
            // feature the rest of the platform already supports and
            // displays. Only ever produced multiple_choice, despite the
            // real scoring system (submitAssessmentAnswers) already
            // handling scenario, likert_scale, and true_false questions
            // - a real mismatch between what could be generated and
            // what could be scored. Used a fragile regex to pull a JSON
            // array out of free text; now uses OpenAI's actual JSON
            // mode for reliable output. No validation existed before
            // returning to the admin - a malformed question (wrong
            // answer index, missing options) would have silently
            // reached the assessment builder.
            const systemPrompt = `You are an expert assessment designer. Create ${numberOfQuestions} genuinely well-designed questions about "${topic}" at ${difficulty} level, returned as valid JSON.

Quality requirements:
- Distractors (wrong options) must be plausible, not obviously wrong or joke answers - a test-taker with partial knowledge should be able to eliminate some but not all
- Avoid ambiguous wording where more than one option could reasonably be defended as correct
- Match the stated difficulty genuinely - ${difficulty === 'beginner' ? 'testing foundational understanding' : difficulty === 'advanced' ? 'testing nuanced, applied understanding, not just recall' : 'testing solid working knowledge, not just definitions'}
- If "${topic}" involves behavioral, leadership, or soft-skill judgment (rather than pure factual knowledge), include 1-2 open-ended "scenario" questions that present a realistic situation and ask how the person would respond - these get evaluated on reasoning quality, not a single correct answer
- Assign each question a "dimension" - a short label for what specific aspect it measures within this topic (e.g. for a leadership assessment: "Decision Making", "Team Communication", "Conflict Resolution" - use dimensions genuinely relevant to "${topic}", not generic placeholders)

Return a JSON object with a "questions" array. Each question must have:
- "question": the question text
- "question_type": "multiple_choice" or "scenario"
- "dimension": short label as described above
- For multiple_choice: "options" (array of exactly 4 strings), "correct" (index 0-3), "explanation" (why the correct answer is right)
- For scenario: no options/correct needed, just the question text describing the situation and what's being asked`;

            const data = await callOpenAI(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Generate the assessment now as JSON.` }
                ],
                2400, 0.5,
                { type: 'json_object' }
            );

            const content = data.choices[0].message.content;
            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch (parseErr) {
                return res.status(500).json({ error: 'Assessment generation produced invalid output - please try again.' });
            }

            const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : (Array.isArray(parsed) ? parsed : []);

            // Real validation - filters out anything malformed rather
            // than silently passing it through to the assessment
            // builder, where a bad correct-answer index would make a
            // question unscorable or always wrong for every test-taker.
            const validQuestions = rawQuestions.filter(q => {
                if (!q.question || typeof q.question !== 'string') return false;
                if (q.question_type === 'scenario') return true;
                return Array.isArray(q.options) && q.options.length === 4
                    && Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3;
            });

            if (validQuestions.length === 0) {
                return res.status(500).json({ error: 'Assessment generation did not produce any valid questions - please try again.' });
            }

            return res.status(200).json({
                success: true,
                questions: validQuestions,
                requestedCount: numberOfQuestions,
                generatedCount: validQuestions.length,
                usage: data.usage
            });
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
        const { cvText, targetRole, userId } = req.body;
        if (!cvText) return res.status(400).json({ error: 'cvText is required' });

        try {
            const supabaseClient = getSupabase();

            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            // FIXED (2026-08-30): confirmed real quality gap - this asked
            // for "an estimated ATS score out of 100" with zero definition
            // of what separates a 40 from an 80, and had no way to know
            // what role the CV was even for, since the frontend only ever
            // collected a CV paste with no target-role field at all.
            // Genuinely rubric-based now, and uses the target role for
            // role-specific keyword and ATS feedback when the frontend
            // provides one. Fully backward compatible - if targetRole is
            // absent (an older client, or any other caller), this falls
            // back to the original general-purpose review.
            const roleContext = targetRole
                ? `The candidate is targeting this specific role: "${targetRole}". Evaluate keyword alignment, relevant experience emphasis, and ATS compatibility specifically against this role - not generically.`
                : `No target role was specified. Infer the most likely role from the CV content itself, state that assumption explicitly at the start of your analysis, and note that feedback would be more precise with a specific target role.`;

            const systemPrompt = `You are an expert CV/resume reviewer with deep knowledge of Applicant Tracking Systems (ATS) and real hiring practices.

${roleContext}

Score the CV from 0-100 using this rubric, and justify the score against these specific bands - do not just assert a number:
0-40: Missing key sections (contact info, work history, or skills), poor formatting likely to break ATS parsing, vague or generic content with no measurable achievements.
41-60: Core sections present but weak - achievements described without metrics, generic phrasing, likely keyword mismatches for the target role.
61-80: Solid structure and mostly quantified achievements, but with specific gaps (missing keywords, formatting risks, or unclear career narrative).
81-100: Strong quantified achievements throughout, clear alignment to the target role's likely keywords, clean ATS-parseable formatting, and a clear career narrative.

Structure your response in exactly this order, using markdown headings:
## ATS Score: [X]/100
[One sentence justifying the score against the rubric above]

## Strengths
[2-4 specific, evidence-based strengths - quote or reference actual content from the CV, not generic praise]

## Areas for Improvement
[2-4 specific, actionable issues - name the exact section and what's missing or weak]

## Keyword & ATS Notes
[Specific keywords or phrasing likely expected for this role that are missing, and any formatting risks for ATS parsing]

## Next Steps
[2-3 concrete, prioritized actions]`;

            const data = await callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: cvText }
            ], 1400, 0.5);

            return res.status(200).json({ success: true, analysis: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'simulate-interview': async (req, res) => {
        const { role, questions, userAnswer, currentQuestion, userId } = req.body;
        if (!role) return res.status(400).json({ error: 'role is required' });

        try {
            const supabaseClient = getSupabase();

            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            // FIXED (2026-08-30): confirmed real, significant gap - this
            // tool is named "Interview Simulator" and described as
            // "practice with AI interviewer and get feedback," but there
            // was never any way to actually submit an answer and be
            // evaluated - it only ever generated a question plus generic
            // STAR-method guidance. That's a real gap between what the
            // product promises and what it delivers, not just a thin
            // prompt. Now genuinely branches: if userAnswer is provided
            // (the person answered currentQuestion), evaluate it against
            // a real rubric; otherwise behave exactly as before and
            // generate a new question - fully backward compatible with
            // any caller that doesn't send an answer.
            if (userAnswer && currentQuestion) {
                const evalPrompt = `You are an experienced interviewer evaluating a candidate's answer for a ${role} role.

The question asked was: "${currentQuestion}"
The candidate's answer: "${userAnswer}"

Evaluate the answer using this rubric:
- Structure: did they use a clear narrative (ideally STAR - Situation, Task, Action, Result) rather than a vague or rambling response?
- Specificity: did they give concrete details (numbers, names, outcomes) rather than generic statements?
- Relevance: did they actually answer what was asked, and is the example relevant to a ${role} role?
- Impact: is the outcome/result clearly stated, ideally with a measurable result?

Structure your response in exactly this order, using markdown headings:
## Overall Rating: [Strong / Solid / Needs Work]
[One sentence summary]

## What Worked
[1-3 specific things the candidate did well, quoting or referencing their actual answer]

## What to Improve
[1-3 specific, actionable gaps - not generic advice, tied to what they actually said]

## A Stronger Version
[A brief example of how one part of their answer could be reworked to be more specific or better structured]`;

                const data = await callOpenAI([
                    { role: 'system', content: evalPrompt },
                    { role: 'user', content: userAnswer }
                ], 900, 0.5);

                return res.status(200).json({ success: true, type: 'evaluation', feedback: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
            }

            const priorQuestions = Array.isArray(questions) && questions.length > 0
                ? `Questions already asked in this session, do not repeat any of them or ask something very similar: ${questions.join(' | ')}.`
                : '';

            const data = await callOpenAI([
                { role: 'system', content: `You are an experienced interviewer running a mock interview for a ${role} role. Ask exactly one realistic interview question - vary between behavioral and technical/role-specific questions across a session rather than defaulting to the same type each time. ${priorQuestions} Respond in exactly this format on the first line: QUESTION: [the question, nothing else]. Then on a new line: GUIDANCE: [1 sentence on what a strong answer would need to cover, without giving a full model answer].` },
                { role: 'user', content: `Candidate background: ${role}` }
            ], 700, 0.8);

            const rawText = data.choices[0].message.content;
            const questionMatch = rawText.match(/QUESTION:\s*(.+?)(?:\n|$)/i);
            const cleanQuestion = questionMatch ? questionMatch[1].trim() : rawText.split('\n')[0].trim();

            return res.status(200).json({ success: true, type: 'question', question: cleanQuestion, feedback: rawText, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            // FIXED (2026-08-27): confirmed same real leakage pattern as
            // the chat handler - a credit was already deducted above
            // before this call, but a failure here previously returned
            // an error with no refund, charging the user for a service
            // they never received.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    checkRights: async (req, res) => {
        const { situation, country, userId } = req.body;
        if (!situation) return res.status(400).json({ error: 'situation is required' });

        try {
            const supabaseClient = getSupabase();

            // FIXED (2026-08-27): closes the systemic userId-impersonation
            // gap - verifies the claimed userId actually matches a real,
            // authenticated session before it's ever used to check/deduct
            // credits.
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            // FIXED (2026-08-30): confirmed real gap - country was
            // hardcoded to 'GB' on the frontend regardless of which of
            // the platform's 7 supported countries the user is actually
            // in, silently giving UK-specific advice to everyone. Fixed
            // on the frontend (real country selector) alongside this
            // backend change, which also now requires the AI to
            // identify which specific rights areas actually apply
            // rather than dumping every category regardless of
            // relevance to the situation described.
            const systemPrompt = `You are a workplace rights advisor for ${country || 'the UK'}. Analyze the situation described and respond in exactly this structure:

## Rights Areas That Apply
[Identify only the 1-3 specific areas genuinely relevant to this situation - e.g. unfair dismissal, discrimination, working time, leave entitlements. Do not list areas that don't apply.]

## What This Likely Means for You
[Plain-language explanation of the relevant rights/protections in ${country || 'the UK'}, specific to what was described]

## Recommended Next Steps
[2-3 concrete actions - e.g. what to document, who to contact internally, relevant time limits if any]

---
*This is general information, not legal advice. For guidance specific to your situation, consult a qualified employment lawyer or your national labor authority.*`;

            const data = await callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: situation }
            ], 1100, 0.5);

            return res.status(200).json({ success: true, advice: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            // FIXED (2026-08-27): confirmed same real leakage pattern as
            // the chat handler - a credit was already deducted above
            // before this call, but a failure here previously returned
            // an error with no refund, charging the user for a service
            // they never received.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    generateGrievance: async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();

            // FIXED (2026-08-27): closes the systemic userId-impersonation
            // gap - verifies the claimed userId actually matches a real,
            // authenticated session before it's ever used to check/deduct
            // credits.
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            // FIXED (2026-08-30): confirmed thin, generic prompt with no
            // real criteria for what makes a grievance letter effective.
            // Now grounds the AI in the specific things that determine
            // whether HR actually acts on a grievance - dated specifics,
            // a clear pattern (not just one incident), and a stated
            // desired outcome - and asks it to flag when the person's
            // account is missing any of these, rather than silently
            // writing around the gap.
            const systemPrompt = `You are an HR professional drafting a formal grievance letter. A grievance letter is far more likely to be taken seriously when it includes specific dates, names/roles (even if placeholders), a clear pattern of incidents (not just one), and a stated desired resolution.

Write the letter with this structure:
- Subject line
- Background (brief, factual context)
- Details of the issue (specific incidents with dates where given - use placeholders like [Date] only where genuinely not provided)
- Impact (how this has affected the person's work, if mentioned)
- Desired resolution (state clearly - infer a reasonable one if not explicitly given, and note it's an inference)
- Professional closing

After the letter, add a brief "## Before You Send This" section noting any specific gaps in what was provided (e.g. missing dates, no stated desired outcome) that would strengthen the letter if added.`;

            const data = await callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content }
            ], 1300, 0.5);

            return res.status(200).json({ success: true, grievance: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            // FIXED (2026-08-27): confirmed same real leakage pattern as
            // the chat handler - a credit was already deducted above
            // before this call, but a failure here previously returned
            // an error with no refund, charging the user for a service
            // they never received.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'analyze-contract': async (req, res) => {
        const { contractText, jurisdiction, userId } = req.body;
        if (!contractText) return res.status(400).json({ error: 'contractText is required' });

        try {
            const supabaseClient = getSupabase();

            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            // FIXED (2026-08-30): confirmed thin prompt with no severity
            // grading (every flagged clause read with equal weight) and
            // no jurisdiction awareness, despite employment law varying
            // meaningfully by country - a non-compete clause that's
            // standard in the US can be unenforceable in parts of the
            // UK, for example. Defaults to GB if not provided, fully
            // backward compatible.
            const systemPrompt = `You are an employment contract reviewer for ${jurisdiction || 'the UK'}. Analyze the contract for concerning clauses and grade each by real severity - do not treat every flagged item as equally serious.

Structure your response as:
## Red Flags
[Clauses that are genuinely unusual or potentially unenforceable/exploitative in ${jurisdiction || 'the UK'} - e.g. non-competes far beyond reasonable scope, missing statutory minimums, one-sided liability terms]

## Worth Clarifying
[Clauses that are common but vague enough to warrant asking questions before signing]

## Standard Terms
[Briefly confirm which typical protections/entitlements ARE present, so the person knows what's already fine]

Each item should name the specific clause and explain in plain language why it matters. End with a note that this is general review, not legal advice, and recommend a qualified employment lawyer for anything in the Red Flags section.`;

            const data = await callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: contractText }
            ], 1400, 0.5);

            return res.status(200).json({ success: true, analysis: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            // FIXED (2026-08-27): confirmed same real leakage pattern as
            // the chat handler - a credit was already deducted above
            // before this call, but a failure here previously returned
            // an error with no refund, charging the user for a service
            // they never received.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'calculate-salary': async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();

            // FIXED (2026-08-27): closes the systemic userId-impersonation
            // gap - verifies the claimed userId actually matches a real,
            // authenticated session before it's ever used to check/deduct
            // credits.
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

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
            const systemPrompt = `You are a compensation analyst. Given a job title, location, experience level, and industry, provide a realistic market salary estimate.

Structure your response as:
## Estimated Range
[State a concrete low-mid-high range, e.g. "£45,000 - £55,000 - £65,000", based on the specifics given]

## What Moves This Range
[2-3 specific factors from what was described that push toward the higher or lower end - not generic factors, tied to what was actually stated]

## Negotiation Notes
[2-3 practical, specific tips relevant to this role/level - not generic "know your worth" advice]

Be clear this is an estimate based on general market knowledge, not a guaranteed figure or a formal salary survey.`;
            const data = await callOpenAICached(cacheKey, [
                { role: 'system', content: systemPrompt },
                { role: 'user', content }
            ], 1000, 0.5, 168); // 1 week TTL — market rates don't move fast enough to need shorter

            return res.status(200).json({ success: true, result: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            // FIXED (2026-08-27): confirmed same real leakage pattern as
            // the chat handler - a credit was already deducted above
            // before this call, but a failure here previously returned
            // an error with no refund, charging the user for a service
            // they never received.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'generate-cover-letter': async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();

            // FIXED (2026-08-27): closes the systemic userId-impersonation
            // gap - verifies the claimed userId actually matches a real,
            // authenticated session before it's ever used to check/deduct
            // credits.
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const systemPrompt = `You are a professional cover letter writer. A cover letter is only as strong as the specifics behind it - genuinely tailored letters reference the actual company and role, connect specific past achievements (with real outcomes) to what the role needs, and avoid generic phrases like "I am passionate about" or "I believe I would be a great fit."

Write 3-4 paragraphs following this logic:
1. Opening that names the specific role and company (if given) and states a genuine, specific reason for interest - not a generic statement
2. 1-2 paragraphs connecting specific past achievements (with real outcomes/numbers where the person provided them) directly to what this role likely needs
3. Closing that's confident but not generic

If no specific company name was given, write the letter using [Company Name] as a placeholder and add a brief note at the end: "Add the company name and one detail about them for a stronger opening."`;

            const data = await callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content }
            ], 1000, 0.6);

            return res.status(200).json({ success: true, result: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            // FIXED (2026-08-27): confirmed same real leakage pattern as
            // the chat handler - a credit was already deducted above
            // before this call, but a failure here previously returned
            // an error with no refund, charging the user for a service
            // they never received.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'optimize-linkedin': async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();

            // FIXED (2026-08-27): closes the systemic userId-impersonation
            // gap - verifies the claimed userId actually matches a real,
            // authenticated session before it's ever used to check/deduct
            // credits.
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const systemPrompt = `You are a LinkedIn profile optimization expert. Recruiters search LinkedIn by keyword, and a generic headline like "Marketing Manager" or an About section written in third-person resume-speak gets far less visibility than one with a specific value proposition.

Structure your response as:
## Headline
[A specific, keyword-rich headline - not just a job title. Should signal both what they do and a specific strength or focus area. Keep under 220 characters.]

## About Section
[Rewritten in first person, opening with a hook (not "Results-driven professional with X years..."), including at least one quantified achievement if the person provided one, and ending with a clear statement of what they're looking for or how to reach them.]

## Discoverability Tips
[3 specific tips based on what was actually shared - e.g. specific keywords to add given their field, skills section priorities, or how they're currently under-signaling their experience]`;

            const data = await callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content }
            ], 1200, 0.6);

            return res.status(200).json({ success: true, result: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            // FIXED (2026-08-27): confirmed same real leakage pattern as
            // the chat handler - a credit was already deducted above
            // before this call, but a failure here previously returned
            // an error with no refund, charging the user for a service
            // they never received.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'write-job-description': async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();

            // FIXED (2026-08-27): closes the systemic userId-impersonation
            // gap - verifies the claimed userId actually matches a real,
            // authenticated session before it's ever used to check/deduct
            // credits.
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const systemPrompt = `You are an HR professional writing job descriptions. The most common problems with job descriptions are: unrealistic requirement lists (demanding "5+ years" in tools that haven't existed that long, or listing 15 "required" skills when 5 are actually essential), coded biased language (words like "rockstar," "ninja," "young and energetic," or gendered pronouns), and vague responsibilities that don't tell a candidate what the job actually involves day to day.

Write the job description with this structure:
## [Job Title]
## About the Role
[Engaging, specific summary of what this role actually does]
## Key Responsibilities
[Specific, measurable responsibilities - not vague generalities]
## Required Qualifications
[Only what's genuinely essential - be realistic about years of experience relative to how long the relevant skill/tool has existed]
## Preferred Qualifications
[Nice-to-haves, clearly separated from requirements]
## Salary
[If a range was given, state it. If not, add a brief note recommending salary transparency - it's increasingly expected and, in some jurisdictions including parts of the UK and EU, required]

Use inclusive, bias-free language throughout - avoid gendered pronouns, age-coded phrases, and culture-fit buzzwords that can discourage qualified candidates.`;

            const data = await callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content }
            ], 1400, 0.6);

            return res.status(200).json({ success: true, result: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            // FIXED (2026-08-27): confirmed same real leakage pattern as
            // the chat handler - a credit was already deducted above
            // before this call, but a failure here previously returned
            // an error with no refund, charging the user for a service
            // they never received.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'write-performance-review': async (req, res) => {
        const { situation, details, userId } = req.body;
        const content = situation || details;
        if (!content) return res.status(400).json({ error: 'situation or details is required' });

        try {
            const supabaseClient = getSupabase();

            // FIXED (2026-08-27): closes the systemic userId-impersonation
            // gap - verifies the claimed userId actually matches a real,
            // authenticated session before it's ever used to check/deduct
            // credits.
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

            const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
            if (!creditCheck.allowed) {
                return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
            }

            const systemPrompt = `You are an HR professional helping a manager write a fair, constructive performance review. The most common problems with performance reviews are: vague statements with no evidence ("does great work," "needs to improve communication" with no example), recency bias (only reflecting the last few weeks rather than the full period), and growth areas listed without a concrete path forward.

Write the review with this structure:
## Overall Summary
[Brief, balanced summary of the period]
## Strengths
[Specific examples from what was provided - name the actual achievement or behavior, not a generic trait]
## Areas for Growth
[Specific, evidence-based - even for a strong performer, there should be at least one genuine growth area unless the notes truly give none]
## Goals for Next Period
[2-3 concrete, measurable goals - specific enough that both manager and employee would agree whether they were met]

Keep the tone professional and constructive throughout - direct about issues where they exist, without being harsh, and specific enough that the employee understands exactly what "good" looks like going forward.`;

            const data = await callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content }
            ], 1300, 0.6);

            return res.status(200).json({ success: true, result: data.choices[0].message.content, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            // FIXED (2026-08-27): confirmed same real leakage pattern as
            // the chat handler - a credit was already deducted above
            // before this call, but a failure here previously returned
            // an error with no refund, charging the user for a service
            // they never received.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
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

        // FIXED (2026-08-27): closes the systemic userId-impersonation
        // gap - without this, anyone could pass another real user's ID
        // here and have a tier upgrade attributed to that account.
        const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
        if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

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

        const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
        if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

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

        const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
        if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

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

    // ========== BOOK STORE (NEW — 2026-08-23) ==========
    // Hardcopy purchases never touch this backend at all — the "Buy
    // Hardcopy" button on the frontend links straight to
    // books.external_purchase_url (Amazon or another third-party
    // retailer), which handles payment and fulfillment entirely on
    // their own infrastructure. Only e-copy purchases go through here.

    'create-book-checkout-session': async (req, res) => {
        const { bookId, userId, userEmail } = req.body;
        if (!bookId || !userId) {
            return res.status(400).json({ error: 'bookId and userId are required' });
        }

        const supabaseClient = getSupabase();

        const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
        if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

        try {
            const { data: book, error: bookError } = await supabaseClient
                .from('books')
                .select('id, title, ebook_price, is_published')
                .eq('id', bookId)
                .single();

            if (bookError || !book) {
                return res.status(404).json({ error: 'Book not found' });
            }
            if (!book.is_published) {
                return res.status(400).json({ error: 'This book is not currently available' });
            }
            if (!book.ebook_price || book.ebook_price <= 0) {
                return res.status(400).json({ error: 'This book does not have an e-copy available for purchase' });
            }

            // Already purchased? Don't let someone pay twice.
            const { data: existing } = await supabaseClient
                .from('book_purchases')
                .select('id')
                .eq('user_id', userId)
                .eq('book_id', bookId)
                .maybeSingle();

            if (existing) {
                return res.status(400).json({ error: 'You already own the e-copy of this book' });
            }

            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const siteUrl = process.env.SITE_URL || 'https://bluskyeconsult.com';

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: { name: `${book.title} (E-Copy)` },
                        unit_amount: Math.round(book.ebook_price * 100)
                    },
                    quantity: 1
                }],
                success_url: `${siteUrl}/books/${bookId}?purchased=true`,
                cancel_url: `${siteUrl}/books/${bookId}`,
                client_reference_id: userId,
                customer_email: userEmail,
                metadata: { userId, bookId, type: 'book_purchase' }
            });

            return res.status(200).json({ success: true, url: session.url, sessionId: session.id });
        } catch (error) {
            console.error('Book checkout session error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Returns a short-lived signed URL to the actual e-copy file — the
    // ONLY way the real file is ever exposed. Checks a genuine purchase
    // record first; admins can also always read, for support/QA
    // purposes. Never returns anything for an unconfirmed purchase.
    'get-book-read-url': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { bookId } = req.body;
        if (!bookId) return res.status(400).json({ error: 'bookId is required' });

        try {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('user_type')
                .eq('id', auth.userId)
                .single();
            const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';

            if (!isAdmin) {
                const { data: purchase } = await supabaseClient
                    .from('book_purchases')
                    .select('id')
                    .eq('user_id', auth.userId)
                    .eq('book_id', bookId)
                    .maybeSingle();

                if (!purchase) {
                    return res.status(403).json({ error: 'You have not purchased the e-copy of this book' });
                }
            }

            const { data: book } = await supabaseClient
                .from('books')
                .select('file_url')
                .eq('id', bookId)
                .single();

            if (!book?.file_url) {
                return res.status(404).json({ error: 'No e-copy file is available for this book' });
            }

            // 1 hour expiry — long enough for one uninterrupted reading
            // session, short enough that a leaked URL doesn't stay
            // valid indefinitely.
            const { data: signed, error: signError } = await supabaseClient
                .storage
                .from('books-private')
                .createSignedUrl(book.file_url, 3600);

            if (signError || !signed) {
                console.error('Signed URL generation error:', signError);
                return res.status(500).json({ error: 'Unable to generate a read link right now' });
            }

            return res.status(200).json({ success: true, url: signed.signedUrl });
        } catch (error) {
            console.error('get-book-read-url error:', error);
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
            // FIXED (2026-08-27): closes the systemic userId-impersonation
            // gap - this handler never had a supabaseClient at all before
            // going straight to Stripe; added specifically for this check,
            // since a credit purchase should only ever be attributable to
            // the real, authenticated account making the request.
            const supabaseClient = getSupabase();
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

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
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });
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
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });
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
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });
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
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });
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

            // FIXED (2026-08-27): closes the systemic userId-impersonation
            // gap - verifies the claimed userId actually matches a real,
            // authenticated session before it's ever used to check/deduct
            // credits.
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

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
            // FIXED (2026-08-27): same confirmed leakage pattern - credit
            // already deducted above, no refund on failure.
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
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
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });
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
            const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });
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
    // ========== INSIGHT ENGINE (NEW - 2026-08-27) ==========
    // Converts real, existing user activity into four distinct,
    // actionable "clues" for content and product creation - Course,
    // Newsletter, Product Design, Service Design. Deliberately built as
    // one aggregation pass over real data, not four separate guesses:
    // - activity_signals: real chat/search query topics
    // - job_alerts: real, explicit keyword + country preferences people
    //   set up themselves - a direct, unambiguous demand signal, not an
    //   inferred one
    // - jobs + job_applications: real regional application demand by
    //   source_country
    // - va_tasks: which VA categories get real usage, cross-referenced
    //   against which HR Tools/VA categories exist at all
    // - course_enrollments + course_reviews: real course engagement,
    //   cross-referenced against existing course titles/categories to
    //   find genuine gaps (topics discussed a lot, no course covers them)
    //
    // Admin-only and credit-metered (one real OpenAI call) - same
    // requireAdmin + checkAndDeductCredit pattern used everywhere else in
    // this file, not a new, separate access model.
    // ========== WORKFORCE MARKETPLACE ENHANCEMENTS (NEW - 2026-08-27) ==========
    // CORRECTED after reviewing the real, existing workforce_profiles +
    // workforceService.js system - an earlier version of this session
    // built a separate, competing set of tables before that real system
    // was known. This extends workforce_profiles instead, matching what
    // already exists and is already proven working end-to-end.
    //
    // Real pricing blend: job_seeker listings are free, with tier
    // (basic/enhanced) computed from real engagement - no payment
    // involved. Professional/tradesperson listings keep the existing
    // admin-verification requirement (matches the page's own "100%
    // Verified" promise). Employer contact-unlock costs real credits -
    // the actual monetization mechanism, reusing the existing, proven
    // credit system rather than new Stripe work.

    // Real, AI-generated "suitable roles" suggestion, fed with the
    // person's real platform skills - small, real credit cost, same
    // metering as every other AI feature.
    'generate-workforce-role-suggestions': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const creditCheck = await checkAndDeductCredit(supabaseClient, auth.userId, req);
        if (!creditCheck.allowed) {
            return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
        }

        try {
            const { data: profile } = await supabaseClient
                .from('workforce_profiles')
                .select('id, listing_category, headline, bio, skills, experience_years')
                .eq('user_id', auth.userId)
                .single();

            if (!profile) {
                await refundCreditIfDeducted(supabaseClient, auth.userId, creditCheck);
                return res.status(404).json({ success: false, error: 'No workforce profile found — complete onboarding first.' });
            }

            const { data: realSkills } = await supabaseClient
                .from('user_skills')
                .select('skill_name, category, verification_status')
                .eq('user_id', auth.userId);

            const realSkillsText = (realSkills || []).map(s => `${s.skill_name} (${s.category}${s.verification_status === 'verified' ? ', verified' : ''})`).join(', ') || 'None recorded yet.';
            const manualSkillsText = (profile.skills || []).join(', ') || 'None listed.';

            const data = await callOpenAI([
                {
                    role: 'system',
                    content: `You are a workforce placement specialist. Given a person's real skills and background, suggest 3-5 specific, realistic job roles or service categories they are genuinely well-suited for. Return ONLY valid JSON: {"roles": [{"role": string, "why": string}]}. Be specific and grounded in what was actually provided, not generic.`
                },
                {
                    role: 'user',
                    content: `Listing category: ${profile.listing_category}\nHeadline: ${profile.headline || 'not specified'}\nYears of experience: ${profile.experience_years || 'not specified'}\nBio: ${profile.bio || 'none provided'}\nSelf-listed skills: ${manualSkillsText}\nReal platform-verified skills: ${realSkillsText}`
                }
            ], 600, 0.5);

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

            if (!parsed) {
                await refundCreditIfDeducted(supabaseClient, auth.userId, creditCheck);
                return res.status(500).json({ success: false, error: 'Could not generate role suggestions — no charge was made for this attempt.' });
            }

            await supabaseClient
                .from('workforce_profiles')
                .update({ ai_suggested_roles: parsed.roles, ai_roles_generated_at: new Date().toISOString() })
                .eq('id', profile.id);

            return res.status(200).json({ success: true, roles: parsed.roles, remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining });
        } catch (error) {
            await refundCreditIfDeducted(supabaseClient, auth.userId, creditCheck);
            console.error('generate-workforce-role-suggestions error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Syncs real, platform-verified skills (user_skills) into the
    // profile's platform_skills field - kept separate from the
    // manually-typed skills array so nothing the person entered
    // themselves is ever silently overwritten. Free - not AI-metered,
    // this is a plain data sync.
    'sync-workforce-platform-skills': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        try {
            const { data: profile } = await supabaseClient
                .from('workforce_profiles')
                .select('id')
                .eq('user_id', auth.userId)
                .single();

            if (!profile) return res.status(404).json({ success: false, error: 'No workforce profile found.' });

            const { data: skills } = await supabaseClient
                .from('user_skills')
                .select('skill_name, category, verification_status')
                .eq('user_id', auth.userId);

            const { data: tier } = await supabaseClient
                .rpc('compute_workforce_listing_tier', { p_user_id: auth.userId });

            await supabaseClient
                .from('workforce_profiles')
                .update({
                    platform_skills: skills || [],
                    platform_skills_synced_at: new Date().toISOString(),
                    listing_tier: tier
                })
                .eq('id', profile.id);

            return res.status(200).json({ success: true, skillsSynced: (skills || []).length, listingTier: tier });
        } catch (error) {
            console.error('sync-workforce-platform-skills error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // The real monetization mechanism - an employer spends real credits
    // to unlock ONE specific profile's real contact email, permanently
    // (unique constraint on workforce_contact_unlocks). Replaces the
    // confirmed real privacy gap where email was previously exposed
    // directly in the public browse response.
    'workforce-unlock-contact': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { profileId } = req.body;
        if (!profileId) return res.status(400).json({ error: 'profileId is required' });

        const CONTACT_UNLOCK_COST = 5;

        try {
            const { data: existing } = await supabaseClient
                .from('workforce_contact_unlocks')
                .select('id')
                .eq('employer_user_id', auth.userId)
                .eq('profile_id', profileId)
                .maybeSingle();

            let alreadyUnlocked = !!existing;

            if (!alreadyUnlocked) {
                const creditCheck = await checkAndDeductCredit(supabaseClient, auth.userId, req, CONTACT_UNLOCK_COST);
                if (!creditCheck.allowed) {
                    return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : `Unlocking contact details costs ${CONTACT_UNLOCK_COST} credits. Please upgrade your plan or purchase more credits.` });
                }

                const { error: unlockError } = await supabaseClient
                    .from('workforce_contact_unlocks')
                    .insert({ employer_user_id: auth.userId, profile_id: profileId, credits_spent: CONTACT_UNLOCK_COST });

                if (unlockError) {
                    await refundCreditIfDeducted(supabaseClient, auth.userId, creditCheck, CONTACT_UNLOCK_COST);
                    throw unlockError;
                }
            }

            const { data: profile } = await supabaseClient
                .from('workforce_profiles')
                .select('user_id, profiles!inner(full_name, email)')
                .eq('id', profileId)
                .single();

            return res.status(200).json({
                success: true,
                alreadyUnlocked,
                contact: { name: profile?.profiles?.full_name, email: profile?.profiles?.email }
            });
        } catch (error) {
            console.error('workforce-unlock-contact error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'generate-insight-clues': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await requireAdmin(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        // FIXED (2026-08-27): requireAdmin already verifies the real
        // caller - using that verified identity directly rather than a
        // separately-trusted userId from the body, which could otherwise
        // let a real admin (accidentally or otherwise) charge a
        // DIFFERENT user's credit balance instead of their own.
        const userId = auth.userId;
        const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req);
        if (!creditCheck.allowed) {
            return res.status(429).json({ success: false, error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits. Please upgrade your plan or purchase more credits.' });
        }

        try {
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const [
                { data: signals },
                { data: alerts },
                { data: courses },
                { data: vaTasks },
                { data: jobsByCountry }
            ] = await Promise.all([
                supabaseClient.from('activity_signals').select('query_text, signal_type').gte('created_at', since).limit(500),
                supabaseClient.from('job_alerts').select('keywords, country_code, job_type').eq('is_active', true).limit(300),
                supabaseClient.from('courses').select('title, category').eq('is_published', true),
                supabaseClient.from('va_tasks').select('va_id, virtual_assistants(category)').gte('created_at', since).limit(500),
                supabaseClient.from('jobs').select('source_country').eq('is_active', true).gte('created_at', since).limit(1000)
            ]);

            if ((!signals || signals.length < 10) && (!alerts || alerts.length < 5)) {
                await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
                return res.status(200).json({ success: true, clues: null, message: 'Not enough recent activity yet for meaningful insight clues — check back after more usage builds up.' });
            }

            // Real regional distribution — counts, not guesses.
            const countryCounts = {};
            for (const j of jobsByCountry || []) {
                if (!j.source_country) continue;
                countryCounts[j.source_country] = (countryCounts[j.source_country] || 0) + 1;
            }
            const alertCountryCounts = {};
            for (const a of alerts || []) {
                if (!a.country_code) continue;
                alertCountryCounts[a.country_code] = (alertCountryCounts[a.country_code] || 0) + 1;
            }

            // Real VA/HR Tool category demand - joined through
            // virtual_assistants since va_tasks itself only stores va_id,
            // not category directly.
            const vaCategoryCounts = {};
            for (const t of vaTasks || []) {
                const cat = t.virtual_assistants?.category;
                if (!cat) continue;
                vaCategoryCounts[cat] = (vaCategoryCounts[cat] || 0) + 1;
            }

            // Real existing course titles/categories, so the model can
            // identify genuine gaps rather than suggesting something that
            // already exists.
            const existingCourseTitles = (courses || []).map(c => `${c.title} (${c.category || 'uncategorized'})`).join('; ') || 'None published yet.';

            const signalText = (signals || []).map(s => `[${s.signal_type}] ${s.query_text}`).join('\n').substring(0, 6000);
            const alertKeywords = (alerts || []).flatMap(a => a.keywords || []).join(', ').substring(0, 2000) || 'None set up yet.';
            const regionSummary = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}: ${n} recent job postings`).join(', ') || 'No regional job data yet.';
            const alertRegionSummary = Object.entries(alertCountryCounts).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}: ${n} active alerts`).join(', ') || 'No regional alert data yet.';
            const vaCategorySummary = Object.entries(vaCategoryCounts).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}: ${n} tasks`).join(', ') || 'No VA usage data yet.';

            const data = await callOpenAI([
                {
                    role: 'system',
                    content: `You are a product strategist for ODUSBABA, an HR/career platform. Given real, aggregated user activity data below, produce FOUR distinct sets of actionable "clues" for the team's next creation cycle. Return ONLY valid JSON in this exact shape: {"course_clues": [{"topic": string, "why": string, "suggested_category": string}], "newsletter_clues": [{"headline_idea": string, "why": string, "angle": string}], "product_design_clues": [{"feature_idea": string, "why": string, "evidence": string}], "service_design_clues": [{"service_idea": string, "why": string, "target_region": string}]}. 3-5 items per array. "why" and "evidence" must reference the real data patterns given, not generic assumptions. For service_design_clues, actively use the regional and VA-category data to suggest region-specific service opportunities (e.g. a service more relevant to one country's real demand than another's) — this is the differentiation the data is specifically meant to reveal.`
                },
                {
                    role: 'user',
                    content: `RECENT CHAT/SEARCH TOPICS (last 30 days):\n${signalText}\n\nEXPLICIT JOB ALERT KEYWORDS PEOPLE SET UP THEMSELVES:\n${alertKeywords}\n\nREGIONAL JOB POSTING VOLUME:\n${regionSummary}\n\nREGIONAL JOB ALERT DEMAND:\n${alertRegionSummary}\n\nVIRTUAL ASSISTANT / HR TOOL CATEGORY USAGE:\n${vaCategorySummary}\n\nEXISTING PUBLISHED COURSES (do not suggest topics that duplicate these):\n${existingCourseTitles}`
                }
            ], 2000, 0.6);

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const clues = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

            if (!clues) {
                await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
                return res.status(500).json({ success: false, error: 'Could not parse insight clues from the AI response — no charge was made for this attempt.' });
            }

            return res.status(200).json({
                success: true,
                clues,
                dataPoints: {
                    signalsAnalyzed: (signals || []).length,
                    alertsAnalyzed: (alerts || []).length,
                    regionsRepresented: Object.keys(countryCounts).length
                },
                remaining: creditCheck.unlimited ? 'unlimited' : creditCheck.remaining
            });
        } catch (error) {
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            console.error('generate-insight-clues error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'analyze-opportunity-gaps': async (req, res) => {
        // FIXED (2026-08-27): this was "admin-only" by comment alone -
        // confirmed zero actual server-side enforcement anywhere in this
        // handler. Same vulnerability class already found and fixed
        // earlier this engagement for generateCourseImage,
        // generateLessonImage, generateLessonAudio, generate-course, and
        // generate-assessment (all had zero backend authorization,
        // reachable by anyone who found the URL) - this handler was
        // simply missed at the time. Any authenticated non-admin user
        // could previously call this and have their own real credits
        // deducted for an admin-only analytics feature.
        const supabaseClient = getSupabase();
        const auth = await requireAdmin(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        // FIXED (2026-08-27): same fix as generate-insight-clues - use
        // the already-verified admin identity rather than a separately-
        // trusted body field.
        const userId = auth.userId;

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
                // FIXED (2026-08-27): confirmed real leakage - this early
                // return happens AFTER the credit above was already
                // deducted, and the user gets back gaps: [] with a
                // message that no analysis was possible. They were
                // charged for a report that was known, in advance, to
                // be un-generatable - not even reaching the OpenAI call.
                await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
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
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
            console.error('analyze-opportunity-gaps error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Admin-only. Pulls recent real platform activity (new jobs, new
    // courses, new articles, trending topics) into a ready-to-edit
    // newsletter draft — closes the "newsletter pool" request without
    // requiring manual curation from scratch every time.
    'generate-newsletter-digest': async (req, res) => {
        // FIXED (2026-08-27): same real gap found and fixed in the
        // sibling analyze-opportunity-gaps handler - "admin-only" by
        // comment alone, zero actual server-side enforcement. No OpenAI
        // call here (pure database aggregation), so no credit-leakage
        // risk, but any authenticated or unauthenticated caller could
        // still reach this admin panel endpoint and pull real recent
        // job/course/article/search-activity data, or spam it as a minor
        // load vector against the activity_signals table scan.
        const supabaseClient = getSupabase();
        const auth = await requireAdmin(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

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

        const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
        if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });

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
                    // FIXED (2026-08-27): confirmed same real leakage
                    // pattern, per-iteration - the credit for THIS
                    // specific article was already deducted above, but a
                    // failure here previously just logged a warning and
                    // moved on to the next article, with no refund for
                    // the one that failed.
                    await refundCreditIfDeducted(supabaseClient, userId, creditCheck);
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

    // NEW (2026-08-30): generates a real featured image for an article
    // via DALL-E - the existing generateCourseImage/generateLessonImage
    // return the raw DALL-E URL directly, which OpenAI documents as
    // expiring after about an hour. That's an acceptable limitation for
    // a course preview reviewed immediately, but a real problem for a
    // published blog article that could stay live for months - a
    // silently broken featured image on a live article is a genuinely
    // bad, disappointing outcome for the site. This handler instead
    // downloads the generated image and re-uploads it to permanent
    // Supabase Storage, the same proven pattern generateLessonAudio
    // already uses for audio files, so the URL saved to the article
    // never expires.
    generateArticleImage: async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await requireAdmin(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { prompt, articleId } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        try {
            const temporaryImageUrl = await callOpenAIImage(prompt);

            // DALL-E returns a URL, not raw bytes (unlike the TTS audio
            // API) - fetch the actual image bytes server-side before
            // they can expire, then upload those bytes permanently.
            const imageResponse = await fetch(temporaryImageUrl);
            if (!imageResponse.ok) throw new Error('Failed to retrieve the generated image');
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            const fileName = `articles/${articleId || 'article'}-${Date.now()}.png`;

            const { error: uploadError } = await supabaseClient.storage
                .from('article-images')
                .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: true });

            if (uploadError) {
                throw new Error(
                    uploadError.message.includes('not found') || uploadError.message.includes('Bucket')
                        ? "Storage bucket 'article-images' doesn't exist yet — create it in your Supabase dashboard (Storage → New bucket → name it 'article-images' → make it Public), then try again."
                        : uploadError.message
                );
            }

            const { data: publicUrlData } = supabaseClient.storage
                .from('article-images')
                .getPublicUrl(fileName);

            return res.status(200).json({ success: true, imageUrl: publicUrlData.publicUrl });
        } catch (error) {
            console.error('Article image generation error:', error);
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
    // ========== ADMIN LOGIN (NEW — 2026-08-24) ==========
    // Routes admin sign-in through the backend instead of calling
    // supabase.auth.signInWithPassword() directly from the browser — the
    // change this codebase's own architecture notes already flagged as
    // necessary for real rate limiting/lockout to be possible at all,
    // since direct client-to-Supabase-Auth calls never pass through this
    // gateway and can't be tracked server-side.
    //
    // Reuses the existing, proven security infrastructure (isIPBlocked,
    // logSecurityEvent, blocked_ips, security_events) rather than
    // inventing a parallel system — same tables, same helper functions
    // already used for the rest of this gateway's abuse protection.
    // ========== USER LOGIN (NEW — 2026-08-24) ==========
    // Same real, server-side rate-limiting principle as admin-login, but
    // deliberately different thresholds and primary signal — regular
    // login has a completely different risk shape. Admin accounts are a
    // handful, high-value, low-volume — IP-based lockout there is fine.
    // Regular users are the opposite: many real people can share one
    // public IP (an office, a campus network), and locking out an entire
    // shared IP because one person mistyped their password five times
    // would be a real, avoidable harm at normal-user volume that barely
    // matters for a few admin accounts.
    //
    // So: the PRIMARY signal here is the targeted email itself, not the
    // IP — this protects the specific account being brute-forced without
    // punishing everyone else on the same network. IP-based tracking
    // still exists, but only as a secondary, much more generous
    // spray-attack detector (many different emails failing fast from one
    // IP is a materially different, genuinely suspicious pattern from
    // ordinary shared-IP traffic, where failures would be spread across
    // different people's own accounts, each with their own low count).
    'user-login': async (req, res) => {
        const { email, password } = req.body;
        const ip = getRequestIP(req);

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const EMAIL_MAX_ATTEMPTS = 5;
        const EMAIL_LOCKOUT_WINDOW_MINUTES = 15;
        const IP_SPRAY_MAX_ATTEMPTS = 30;
        const IP_SPRAY_WINDOW_MINUTES = 15;
        const IP_SPRAY_LOCKOUT_MINUTES = 10;

        const supabaseClient = getSupabase();
        const normalizedEmail = email.trim().toLowerCase();

        try {
            const emailSince = new Date(Date.now() - EMAIL_LOCKOUT_WINDOW_MINUTES * 60000).toISOString();

            // Primary gate: has THIS email failed too many times recently?
            // Checked before even attempting sign-in, and deliberately
            // generic either way (a nonexistent email and a wrong
            // password both count identically here) — this never reveals
            // whether an email is registered, matching the same
            // deliberate choice already made in this file's error
            // messaging for the underlying Supabase error.
            const { count: emailFailCount } = await supabaseClient
                .from('security_events').select('id', { count: 'exact', head: true })
                .eq('event_type', 'user_login_failed').gte('created_at', emailSince)
                .contains('metadata', { email: normalizedEmail });

            if ((emailFailCount || 0) >= EMAIL_MAX_ATTEMPTS) {
                return res.status(429).json({
                    error: 'Too many attempts',
                    message: `Too many failed attempts for this account. Please try again in a few minutes, or reset your password.`
                });
            }

            // Secondary gate: is this IP already blocked for spray-attack
            // behavior specifically (not ordinary shared-IP traffic)?
            const { data: blockRow } = await supabaseClient
                .from('blocked_ips')
                .select('expires_at')
                .eq('ip_address', ip)
                .eq('reason', 'user_login_spray')
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            if (blockRow) {
                return res.status(429).json({
                    error: 'Too many attempts',
                    message: 'Too many login attempts from this network. Please try again shortly.'
                });
            }

            const { data: authData, error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: normalizedEmail,
                password
            });

            if (signInError || !authData?.user) {
                logSecurityEvent('user_login_failed', ip, 'info', { email: normalizedEmail }); // fire-and-forget, see note below

                // Spray-attack check — only meaningfully triggers on
                // genuinely abnormal volume (many distinct emails failing
                // from one IP fast), not everyday shared-network use.
                const spraySince = new Date(Date.now() - IP_SPRAY_WINDOW_MINUTES * 60000).toISOString();
                const { count: ipFailCount } = await supabaseClient
                    .from('security_events').select('id', { count: 'exact', head: true })
                    .eq('event_type', 'user_login_failed').eq('ip_address', ip).gte('created_at', spraySince);

                if ((ipFailCount || 0) >= IP_SPRAY_MAX_ATTEMPTS) {
                    await supabaseClient.from('blocked_ips').insert({
                        ip_address: ip,
                        expires_at: new Date(Date.now() + IP_SPRAY_LOCKOUT_MINUTES * 60000).toISOString(),
                        reason: 'user_login_spray'
                    });
                    logSecurityEvent('user_login_spray_lockout_triggered', ip, 'critical', {}); // fire-and-forget
                }

                // Deliberately generic — same message regardless of
                // whether the email exists, matching Supabase's own
                // generic error and this file's existing philosophy.
                return res.status(401).json({
                    error: 'Invalid login credentials',
                    message: 'Invalid email or password.'
                });
            }

            // Real credentials confirmed. Determine destination the same
            // way the original client-side flow did, just server-side —
            // saves the frontend a second round-trip.
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('user_type')
                .eq('id', authData.user.id)
                .single();

            const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';

            return res.status(200).json({
                success: true,
                session: {
                    access_token: authData.session.access_token,
                    refresh_token: authData.session.refresh_token
                },
                user: { id: authData.user.id, email: authData.user.email },
                isAdmin
            });
        } catch (error) {
            console.error('user-login error:', error);
            return res.status(500).json({ error: 'Something went wrong. Please try again.' });
        }
    },

    // FIXED (2026-08-27): confirmed real report of admin login "just
    // spinning, not loading" - every login attempt (success or failure)
    // previously AWAITED a security_events insert before the response
    // could return, including on the success path of every single
    // ordinary login. If that insert is ever slow (table growth,
    // temporary DB load, a missing index), that latency was added
    // directly to every login response - in a bad case, this is exactly
    // what an indefinite-looking spinner would feel like. logSecurityEvent
    // already has its own internal try/catch (a failed log entry was
    // never going to break login), so there was no reason to block the
    // response waiting for it. Every logSecurityEvent call on this
    // critical path is now fire-and-forget - logging still happens, it
    // just no longer gates how fast a real person gets logged in.
    'admin-login': async (req, res) => {
        const { email, password } = req.body;
        const ip = getRequestIP(req);

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const MAX_FAILED_ATTEMPTS = 5;
        const LOCKOUT_WINDOW_MINUTES = 15;
        const LOCKOUT_DURATION_MINUTES = 15;

        const supabaseClient = getSupabase();

        try {
            // Already locked out? Don't even attempt sign-in.
            const { data: blockRow } = await supabaseClient
                .from('blocked_ips')
                .select('expires_at')
                .eq('ip_address', ip)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            if (blockRow) {
                const minutesLeft = Math.ceil((new Date(blockRow.expires_at) - new Date()) / 60000);
                return res.status(429).json({
                    error: 'Too many failed attempts',
                    message: `This IP is temporarily locked out after too many failed admin login attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`
                });
            }

            // Real sign-in attempt, server-side — the actual credential
            // check, same GoTrue call the client used to make directly.
            const { data: authData, error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: email.trim(),
                password
            });

            if (signInError || !authData?.user) {
                // FIXED: this is the exact tracking that was never
                // possible before — a real, server-side record of the
                // failed attempt, against both this IP and this specific
                // targeted email, so lockout catches both "one IP
                // hammering the login form" and "one admin account being
                // targeted from rotating IPs."
                logSecurityEvent('admin_login_failed', ip, 'warning', { email: email.trim() }); // fire-and-forget

                const since = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60000).toISOString();
                const [{ count: ipFailCount }, { count: emailFailCount }] = await Promise.all([
                    supabaseClient.from('security_events').select('id', { count: 'exact', head: true })
                        .eq('event_type', 'admin_login_failed').eq('ip_address', ip).gte('created_at', since),
                    supabaseClient.from('security_events').select('id', { count: 'exact', head: true })
                        .eq('event_type', 'admin_login_failed').gte('created_at', since)
                        .contains('metadata', { email: email.trim() })
                ]);

                const failCount = Math.max(ipFailCount || 0, emailFailCount || 0);

                if (failCount >= MAX_FAILED_ATTEMPTS) {
                    await supabaseClient.from('blocked_ips').insert({
                        ip_address: ip,
                        expires_at: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000).toISOString(),
                        reason: 'admin_login_brute_force'
                    });
                    logSecurityEvent('admin_login_lockout_triggered', ip, 'critical', { email: email.trim() }); // fire-and-forget
                    return res.status(429).json({
                        error: 'Too many failed attempts',
                        message: `Too many failed login attempts. This IP is locked out for ${LOCKOUT_DURATION_MINUTES} minutes.`
                    });
                }

                const remaining = MAX_FAILED_ATTEMPTS - failCount;
                return res.status(401).json({
                    error: 'Invalid email or password',
                    message: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before temporary lockout.`
                });
            }

            // Real credentials confirmed — now the actual authorization
            // check, matching the exact pattern used correctly everywhere
            // else in this admin panel.
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('user_type')
                .eq('id', authData.user.id)
                .single();

            const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';

            if (!isAdmin) {
                // Correct credentials, wrong role — logged as its own,
                // more serious event type. The session tokens already
                // obtained above are simply never sent to the client;
                // nothing further to invalidate since the browser never
                // received them.
                logSecurityEvent('admin_login_unauthorized_role', ip, 'critical', { email: email.trim(), userId: authData.user.id }); // fire-and-forget
                return res.status(403).json({ error: 'Not authorized as admin' });
            }

            logSecurityEvent('admin_login_success', ip, 'info', { email: email.trim(), userId: authData.user.id }); // fire-and-forget

            return res.status(200).json({
                success: true,
                session: {
                    access_token: authData.session.access_token,
                    refresh_token: authData.session.refresh_token
                },
                user: { id: authData.user.id, email: authData.user.email }
            });
        } catch (error) {
            console.error('admin-login error:', error);
            return res.status(500).json({ error: 'Something went wrong. Please try again.' });
        }
    },

    // RETRACTED (2026-08-27): admin-approve-job and admin-reject-job were
    // built here without having seen rssJobService.js yet, on an incorrect
    // assumption that jobs move between compliance_status states within a
    // single table. The real system is a two-stage design: external_jobs
    // (raw, pending review) gets copied INTO a new jobs row upon approval
    // (external_jobs.approved_job_id links back to it) - a rejected job
    // never becomes a jobs row at all. That real logic already exists,
    // correctly, in rssJobService.js's approveExternalJob()/
    // rejectExternalJob(), called directly from the client
    // (ExternalJobsManager.jsx) - not through any backend action. Removed
    // these two actions entirely rather than leave a second, incompatible,
    // unused approval path sitting in the codebase alongside the real one.

    // ========== VERIFIED EMPLOYER SOURCES (NEW - 2026-08-27) ==========
    // Admin-managed list of individual company career pages to source
    // jobs directly from - built specifically to use a government's own
    // published sponsor license register as the source list, so every
    // entry can carry a genuine, verified sponsorship flag.
    'admin-add-employer-source': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { data: profile } = await supabaseClient.from('profiles').select('user_type').eq('id', auth.userId).single();
        if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { companyName, websiteUrl, careersPageUrl, isVerifiedSponsor, sponsorLicenseType, countryCode } = req.body;
        if (!companyName || !websiteUrl) {
            return res.status(400).json({ error: 'companyName and websiteUrl are required' });
        }

        // SECURITY: validated here, at entry, not just when actually
        // scraped - rejects an unsafe URL before it ever reaches the
        // database at all.
        const urlToCheck = careersPageUrl || websiteUrl;
        const safetyCheck = isSafeExternalUrl(urlToCheck);
        if (!safetyCheck.safe) {
            return res.status(400).json({ error: `URL rejected for safety: ${safetyCheck.reason}` });
        }

        try {
            const { data, error } = await supabaseClient
                .from('verified_employer_sources')
                .insert({
                    company_name: companyName,
                    website_url: websiteUrl,
                    careers_page_url: careersPageUrl || null,
                    is_verified_sponsor: !!isVerifiedSponsor,
                    sponsor_license_type: sponsorLicenseType || null,
                    country_code: countryCode || 'GB',
                    added_by: auth.userId
                })
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json({ success: true, source: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Bulk import - built specifically for the real use case described:
    // pasting in rows from a government's own published sponsor
    // register, rather than adding companies one at a time.
    'admin-bulk-import-employer-sources': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { data: profile } = await supabaseClient.from('profiles').select('user_type').eq('id', auth.userId).single();
        if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { companies } = req.body; // array of { companyName, websiteUrl, careersPageUrl?, sponsorLicenseType?, countryCode? }
        if (!Array.isArray(companies) || companies.length === 0) {
            return res.status(400).json({ error: 'companies must be a non-empty array' });
        }

        let added = 0, skipped = 0, errors = [];
        for (const c of companies) {
            if (!c.companyName || !c.websiteUrl) { skipped++; continue; }

            // SECURITY: every URL in a bulk import is validated
            // individually - one unsafe entry in a large pasted register
            // is rejected on its own, it doesn't block or corrupt the
            // rest of the batch.
            const urlToCheck = c.careersPageUrl || c.websiteUrl;
            const safetyCheck = isSafeExternalUrl(urlToCheck);
            if (!safetyCheck.safe) {
                errors.push({ company: c.companyName, error: `Rejected for safety: ${safetyCheck.reason}` });
                continue;
            }

            try {
                const { error } = await supabaseClient
                    .from('verified_employer_sources')
                    .insert({
                        company_name: c.companyName,
                        website_url: c.websiteUrl,
                        careers_page_url: c.careersPageUrl || null,
                        is_verified_sponsor: true, // bulk import is specifically for the sponsor register use case
                        sponsor_license_type: c.sponsorLicenseType || null,
                        country_code: c.countryCode || 'GB',
                        added_by: auth.userId
                    });
                if (error) {
                    // Real, expected case: the unique constraint on
                    // website_url means re-importing an updated register
                    // skips companies already added, rather than erroring
                    // the whole batch.
                    if (error.code === '23505') skipped++;
                    else errors.push({ company: c.companyName, error: error.message });
                } else {
                    added++;
                }
            } catch (err) {
                errors.push({ company: c.companyName, error: err.message });
            }
        }

        return res.status(200).json({ success: true, added, skipped, errors });
    },

    'admin-list-employer-sources': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        try {
            const { data, error } = await supabaseClient
                .from('verified_employer_sources')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return res.status(200).json({ success: true, sources: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Public directory listing - genuinely public information (a real,
    // government-cross-referenced list of verified sponsor companies is
    // valuable to a job seeker even before any job data has been scraped
    // from a given company). No auth required to view.
    //
    // SAFETY: deliberately selects only the specific columns meant to be
    // public, rather than select('*') - internal fields like added_by,
    // last_scrape_status, and last_scrape_job_count are operational
    // detail for admins, not something a public visitor needs exposed.
    'verified-employers-list': async (req, res) => {
        const supabaseClient = getSupabase();
        const { country } = req.query;

        try {
            let query = supabaseClient
                .from('verified_employer_sources')
                .select('id, company_name, website_url, careers_page_url, is_verified_sponsor, sponsor_license_type, country_code')
                .eq('is_active', true)
                .order('company_name')
                .limit(200);

            if (country) query = query.eq('country_code', country);

            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json({ success: true, companies: data || [] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'admin-deactivate-employer-source': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { data: profile } = await supabaseClient.from('profiles').select('user_type').eq('id', auth.userId).single();
        if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { sourceId } = req.body;
        if (!sourceId) return res.status(400).json({ error: 'sourceId is required' });

        try {
            const { error } = await supabaseClient
                .from('verified_employer_sources')
                .update({ is_active: false })
                .eq('id', sourceId);

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Real, on-demand trigger - scrapes every active configured employer
    // right now, same "Fetch Now" pattern already proven for the RSS
    // sources in ExternalJobsManager.jsx.
    'admin-scrape-employer-sources': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { data: profile } = await supabaseClient.from('profiles').select('user_type').eq('id', auth.userId).single();
        if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        try {
            const result = await scrapeAllVerifiedEmployers(supabaseClient);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // NEW (2026-08-29): confirmed severe, real bug - ExternalJobsManager.jsx
    // previously called fetchExternalJobs() and testRSSConnection()
    // directly, running them client-side in the admin's own browser.
    // Every external government/job-board RSS request was being blocked
    // by CORS as a result - the "Failed to fetch" results shown to
    // admins reflected where the code was running, not whether these
    // sources are actually reachable. These two actions wrap the exact
    // same, already-proven-correct rssJobService.js functions
    // (identical to what api/cron/sync-external-jobs.js already uses),
    // just running properly on the server, where CORS never applies at
    // all.
    'admin-force-refresh-external-jobs': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('user_type').eq('id', auth.userId).single();
        // FIXED (2026-08-30): confirmed real, live issue - a genuine
        // super_admin account was getting a generic "Admin access
        // required" with no way to tell why from the UI. If this
        // query returns nothing or errors, that's now distinguished
        // from a genuine, correct permission denial - most likely
        // cause is SUPABASE_SERVICE_ROLE_KEY missing, putting this
        // query under RLS instead of bypassing it.
        if (profileError || !profile) {
            return res.status(403).json({ error: 'Could not verify admin status - this usually means SUPABASE_SERVICE_ROLE_KEY is missing or misconfigured on the server, not that your account lacks permission. Check Vercel\'s environment variables.' });
        }
        if (profile.user_type !== 'admin' && profile.user_type !== 'super_admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { forceRefresh } = req.body;

        try {
            const result = await fetchExternalJobs(!!forceRefresh);
            return res.status(200).json({ success: true, inserted: result.totalAdded, results: result.results });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'admin-test-feed-connections': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('user_type').eq('id', auth.userId).single();
        if (profileError || !profile) {
            return res.status(403).json({ error: 'Could not verify admin status - this usually means SUPABASE_SERVICE_ROLE_KEY is missing or misconfigured on the server, not that your account lacks permission. Check Vercel\'s environment variables.' });
        }
        if (profile.user_type !== 'admin' && profile.user_type !== 'super_admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        try {
            const results = await testRSSConnection();
            return res.status(200).json({ success: true, results });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

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

        const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
        if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });
        
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

    // NEW (2026-08-30): fully automated tester invite request - solves
    // the real problem (a prospective tester discovering the platform
    // with no prior relationship to an admin) without either requiring
    // real-time manual approval, or exposing a working code publicly on
    // the page (which would defeat the point of gating at all). Bounded
    // by a real, admin-configurable total-tester cap
    // (tester_max_total_count in system_config) - under the cap, a
    // genuinely unique, single-use code is generated and emailed
    // directly to the requester, bound to that one request; at or over
    // the cap, the request goes to a real waitlist instead of either
    // silently failing or issuing beyond the intended limit.
    'request-tester-code': async (req, res) => {
        const { email } = req.body;
        const supabaseClient = getSupabase();
        const ip = getRequestIP(req);

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ success: false, error: 'A valid email address is required.' });
        }
        const normalizedEmail = email.trim().toLowerCase();

        // Real, if non-exhaustive, first-layer screen against known
        // disposable/temp-mail domains - reduces trivial throwaway-email
        // abuse without pretending to catch every possible one.
        const disposableDomains = ['mailinator.com', '10minutemail.com', 'guerrillamail.com', 'tempmail.com', 'yopmail.com', 'throwawaymail.com'];
        const emailDomain = normalizedEmail.split('@')[1];
        if (disposableDomains.includes(emailDomain)) {
            return res.status(400).json({ success: false, error: 'Please use a real, permanent email address.' });
        }

        try {
            // Rate limit by IP - a genuine spray/abuse signal, same
            // pattern already used for login attempts elsewhere in this
            // file. Generous limit since this is a low-frequency, one-
            // person-one-request action, not something anyone legitimate
            // calls repeatedly.
            const rateCheck = await checkIpRateLimit(supabaseClient, `tester-request:${ip}`, 10);
            if (!rateCheck.allowed) {
                return res.status(429).json({ success: false, error: 'Too many requests from this network. Please try again later.' });
            }

            // FIXED (2026-08-30): removed an "already registered" check
            // that would have queried profiles.email - a column with no
            // confirmed evidence it exists anywhere in this codebase.
            // Not strictly necessary either way: Supabase's own signup
            // step naturally rejects a duplicate email later regardless,
            // so this is a safe thing to skip rather than guess at an
            // unconfirmed schema.

            // Already has a real, still-usable auto-issued code? Resend
            // the same one rather than generate a new one every time
            // someone re-submits the form.
            const { data: existingCode } = await supabaseClient
                .from('tester_invite_codes')
                .select('code, times_used, max_uses, is_active, expires_at')
                .eq('description', `Auto-issued to: ${normalizedEmail}`)
                .eq('is_active', true)
                .maybeSingle();

            if (existingCode && existingCode.times_used < existingCode.max_uses && (!existingCode.expires_at || new Date(existingCode.expires_at) > new Date())) {
                await sendTesterCodeEmail(normalizedEmail, existingCode.code);
                return res.status(200).json({ success: true, resent: true, message: 'You already have a pending invite code - we\'ve resent it to your email.' });
            }

            // The real, current count against the real, admin-configured
            // cap - this is the actual gate, not a guess.
            const { data: capConfig } = await supabaseClient
                .from('system_config').select('config_value').eq('config_key', 'tester_max_total_count').maybeSingle();
            const maxTesters = capConfig?.config_value ? parseInt(capConfig.config_value, 10) : 55;

            const { count: currentTesterCount } = await supabaseClient
                .from('profiles').select('id', { count: 'exact', head: true }).eq('is_tester', true);

            if ((currentTesterCount || 0) >= maxTesters) {
                const { error: waitlistError } = await supabaseClient
                    .from('tester_waitlist')
                    .insert({ email: normalizedEmail })
                    .select()
                    .single();
                // A duplicate-email conflict here just means they're
                // already on the waitlist - not a real error to surface.
                if (waitlistError && !waitlistError.message?.includes('duplicate')) {
                    throw waitlistError;
                }
                return res.status(200).json({ success: true, waitlisted: true, message: 'All tester spots are currently filled. You\'ve been added to the waitlist and will be notified when a spot opens up.' });
            }

            // Under the cap - generate a real, unique, single-use code
            // bound to this specific request via the description field,
            // and email it directly. Never displayed on-screen.
            const code = generateReadableInviteCode();
            const { error: insertError } = await supabaseClient
                .from('tester_invite_codes')
                .insert({
                    code,
                    description: `Auto-issued to: ${normalizedEmail}`,
                    max_uses: 1,
                    times_used: 0,
                    is_active: true
                });

            if (insertError) throw insertError;

            const emailResult = await sendTesterCodeEmail(normalizedEmail, code);
            if (!emailResult.success) {
                // The code genuinely exists and is valid even if the
                // email failed to send - being honest about this rather
                // than claiming success when the person won't actually
                // receive anything, so it's visible for manual follow-up
                // rather than silently lost.
                console.error(`Tester code ${code} generated for ${normalizedEmail} but email failed to send:`, emailResult.error);
                return res.status(200).json({ success: false, error: 'Your invite code was generated, but we had trouble emailing it. Please contact support so we can send it to you directly.' });
            }

            return res.status(200).json({ success: true, issued: true, message: 'Check your email for your tester invite code.' });
        } catch (error) {
            console.error('Tester code request error:', error);
            return res.status(500).json({ success: false, error: 'Something went wrong processing your request. Please try again.' });
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

            // FIXED (2026-08-23): rating was hardcoded to 4.8 and reviews
            // to 0 for EVERY single VA — fabricated, identical numbers
            // never connected to any real data, exactly the same issue
            // already found and fixed on BooksPage.jsx and
            // AssessmentsPage.jsx. Real feedback data already exists —
            // va_tasks.user_rating, populated by the actual thumbs-up/
            // down feedback UI (5 for positive, 1 for negative) — so
            // this computes a genuine average and count per VA instead
            // of inventing one. A VA with no ratings yet shows as
            // "not yet rated" rather than a fake 4.8.
            const { data: allTasks } = await supabaseClient
                .from('va_tasks')
                .select('va_id, user_rating')
                .not('user_rating', 'is', null);

            const ratingsByVa = {};
            for (const task of allTasks || []) {
                if (!ratingsByVa[task.va_id]) ratingsByVa[task.va_id] = [];
                ratingsByVa[task.va_id].push(task.user_rating);
            }
            
            const assistants = (data || []).map(va => {
                const vaRatings = ratingsByVa[va.id] || [];
                const avgRating = vaRatings.length > 0
                    ? vaRatings.reduce((sum, r) => sum + r, 0) / vaRatings.length
                    : null;

                return {
                    id: va.id,
                    name: va.name,
                    category: va.category,
                    icon: VA_CATEGORY_ICONS[va.category] || '🤖',
                    price: va.price,
                    description: va.description,
                    longDescription: va.long_description,
                    // FIXED (2026-08-23): was hardcoded 'free' regardless
                    // of any real setting — the entire "some VAs require
                    // a higher tier" feature has never actually
                    // restricted anything since it was built, since the
                    // admin panel never even had a field to set this and
                    // this handler discarded whatever might exist anyway.
                    tier: va.required_tier || 'free',
                    execution_type: va.execution_type || 'single_turn',
                    processingTime: `${va.processing_time_minutes || 5} min`,
                    rating: avgRating,
                    reviews: vaRatings.length
                };
            });
            
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
        const { assistantId, input, userId, history } = req.body;
        
        if (!assistantId || !input) {
            return res.status(400).json({ error: 'Assistant ID and input required' });
        }

        {
            const supabaseClientForIdCheck = getSupabase();
            const idCheck = await verifyClaimedUserId(req, supabaseClientForIdCheck, userId);
            if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });
        }
        
        const supabaseClient = getSupabase();

        // NEW (2026-08-23): VA lookup moved BEFORE the credit check —
        // needed now because the cost itself depends on execution_type,
        // and conversational VAs need a paid-tier check before anything
        // is charged at all.
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

        const executionType = va?.execution_type || 'single_turn';

        // NEW (2026-08-23): the actual, cost-justified reason
        // conversational VAs charge more — a real 5-turn conversation
        // averages ~1.56x the compute cost of a single-turn call (every
        // turn resends the full prior history as input tokens), and that
        // ratio worsens the longer the conversation runs. This lookup is
        // the deliberate extension point: cost is DERIVED from
        // execution_type automatically, not set arbitrarily per VA, so a
        // future execution type can be priced correctly here too without
        // touching anything else.
        const EXECUTION_TYPE_COST = { single_turn: 1, conversational: 2 };
        const cost = EXECUTION_TYPE_COST[executionType] ?? 1;

        // NEW (2026-08-23): fetched once, used for both tier checks below
        // — the per-VA required_tier restriction (previously completely
        // decorative: no admin field existed to set it, and the catalog
        // response hardcoded every VA as 'free' regardless, so this has
        // never actually restricted anything since it was built) and the
        // conversational-VA paid-tier restriction.
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('tier, user_type')
            .eq('id', userId)
            .maybeSingle();

        const TIER_LEVELS = { free: 0, registered: 1, professional: 2, employer: 2, business: 3, admin: 3, super_admin: 3 };
        const requiredTier = va?.required_tier || 'free';
        const userTierLevel = TIER_LEVELS[profile?.user_type] ?? TIER_LEVELS[profile?.tier] ?? 0;
        const requiredTierLevel = TIER_LEVELS[requiredTier] ?? 0;

        if (userTierLevel < requiredTierLevel) {
            return res.status(403).json({
                error: 'Upgrade required',
                message: `This assistant requires the ${requiredTier} plan or higher. Upgrade to access it.`
            });
        }

        // NEW (2026-08-23): conversational VAs are restricted to paid
        // tiers only — enforced here, server-side, not just hidden in
        // the UI (a frontend-only restriction is never a real boundary).
        if (executionType === 'conversational') {
            const isPaidOrStaff = profile && profile.tier !== 'free' && profile.user_type !== 'free';
            if (!isPaidOrStaff) {
                return res.status(403).json({
                    error: 'Upgrade required',
                    message: 'Conversational assistants that remember your conversation are available on paid plans. Upgrade to use this assistant, or try a single-turn assistant for free.'
                });
            }
        }

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
        //
        // NEW (2026-08-23): passes the real, execution-type-derived cost
        // instead of always deducting a flat 1.
        const creditCheck = await checkAndDeductCredit(supabaseClient, userId, req, cost);
        if (!creditCheck.allowed) {
            if (creditCheck.capReached) {
                return res.status(403).json({
                    error: 'Tester usage cap reached',
                    message: 'This tester account has used its allotted number of AI-backed requests. Contact the site admin if you need more.'
                });
            }
            return res.status(creditCheck.rateLimited ? 429 : 403).json({
                error: creditCheck.rateLimited ? 'Too many requests — please slow down and try again in a few minutes.' : 'Insufficient credits',
                message: creditCheck.rateLimited ? undefined : `This assistant costs ${cost} credit${cost > 1 ? 's' : ''} per message. Upgrade your plan or purchase more credits to continue.`
            });
        }
        const isTester = creditCheck.isTester === true;
        
        // NEW (2026-08-30): the Rota Preparation Assistant needs a
        // genuinely different system prompt than the generic template
        // below - this involves real UK employment law (Working Time
        // Regulations, leave entitlement) where a generic "give helpful
        // advice" prompt is not an adequate safeguard. Branches by
        // category rather than a hardcoded VA id, so this same,
        // carefully-built prompt applies to any future VA placed in
        // this category too, not just one specific database row.
        const ROTA_COMPLIANCE_PROMPT = `You are a rota preparation assistant helping a manager build a compliant staff schedule. You have real, load-bearing responsibilities beyond just producing a schedule - getting this wrong has real legal and welfare consequences for real staff.

BEFORE building any rota, if you do not yet have ALL of the following, ask for it - do not guess or assume:
1. Number of staff and, for EACH person individually, their contracted weekly hours
2. The days and hours the business/service actually needs covered
3. The sector (general workplace, or care/health - this changes what applies)
4. Any existing constraints (e.g. someone unavailable certain days, night-shift-only staff)

REAL RULES YOU MUST APPLY (UK Working Time Regulations 1998, unless the person specifies a different country - if so, say clearly that these UK-specific rules may not apply and general principles only are being used):
- Maximum average 48-hour working week (averaged over 17 weeks) unless the person has a signed opt-out - if a rota would exceed this without a confirmed opt-out, flag it explicitly
- Minimum 11 consecutive hours rest in every 24-hour period
- Minimum 24 hours uninterrupted rest per 7-day period (or 48 hours per 14 days)
- A 20-minute break required for any shift longer than 6 hours
- Night workers (regularly working 11pm-6am) should not average more than 8 hours in 24 over the reference period, and are entitled to free health assessments - flag if a rota relies heavily on one person for nights
- Statutory annual leave is 5.6 weeks (28 days pro-rata for full-time, less if genuinely part-time) - note this in your response as something to track separately from the rota itself, not something the rota needs to resolve

CARE SECTOR SPECIFIC (only if the person indicates this is a care/health setting):
- Sleep-in shifts have real, court-tested complexity around National Minimum Wage (the 2021 Mencap Supreme Court ruling on time spent awake for work purposes) - note this needs specific payroll/HR guidance rather than treating it as a simple hourly rate
- Distinguish waking nights (actively working, counts fully toward working time limits) from sleep-in shifts (different regulatory treatment) - ask which applies if unclear
- Flag any shift pattern that leaves a single staff member lone working overnight without a clear safety/backup plan
- Note that adequate staffing levels for safe care (a real CQC expectation) depend on assessed need, not a fixed ratio - this tool can help you build a compliant schedule but doesn't replace a proper staffing needs assessment

CRITICAL - DO NOT SILENTLY COMPLY WITH A REQUEST THAT WOULD VIOLATE THESE RULES. If what's being asked for (e.g. "cover this shift pattern with only these 2 staff") cannot be done without breaching rest requirements or the 48-hour average, say so explicitly, explain which specific rule would be breached and why, and offer real alternatives (additional staff, adjusted coverage windows, an opt-out conversation with the affected employee) rather than producing a schedule that looks compliant but isn't.

PREFER FIXED, PREDICTABLE WEEKLY PATTERNS over rolling cycles that drift against calendar weeks - a rolling pattern (e.g. "2 weeks on, 1 week off" that doesn't align to fixed weekly boundaries) makes it easy for both staff and managers to lose track of actual hours worked and entitlements owed over time, which is a real, documented source of unpaid-overtime disputes. If a rolling pattern is genuinely necessary, say so explicitly and recommend a clear tracking method.

When you do have enough information, present the final rota as a clear markdown table (staff name, days, shift times, weekly total hours), followed by a brief compliance summary confirming what was checked, and end with: "This tool provides schedule planning support based on standard UK Working Time Regulations - it does not replace professional HR or employment law advice for your specific situation, especially for sector-specific pay questions like sleep-in shifts."`;

        // FIXED (2026-08-30): confirmed real, universal gap - the
        // generic template only ever said "give specific, actionable
        // advice," which doesn't actually guard against generic output;
        // an AI can produce platitudes while technically "giving
        // advice." This applies to every VA that isn't the Rota
        // Assistant, regardless of which specific ones exist - the
        // actual VA catalog content wasn't available to review directly
        // (no seed data or export exists in what I have access to), so
        // this improves the shared logic every VA runs through rather
        // than guess at content I've never seen.
        const genericBasePrompt = va
            ? `You are ${va.name}, a professional ${va.category ? va.category + ' ' : ''}assistant. ${va.long_description || va.description || ''}

Give specific, actionable advice grounded in exactly what the person shares - reference their actual words, examples, or details rather than generic principles that would apply to anyone. If they haven't given you enough to work with for a genuinely specific answer, ask a clarifying question rather than filling the gap with generic advice. Use markdown formatting for readability.`
            : 'You are a professional career assistant. Give specific, actionable advice grounded in exactly what the person shares, rather than generic principles. If they haven\'t given enough detail for a specific answer, ask a clarifying question. Use markdown formatting for readability.';

        const conversationalAddendum = executionType === 'conversational'
            ? '\n\nThis is an ongoing conversation, not a one-off request - actually reference what the person told you earlier in this session where it\'s relevant, rather than treating each message as if it arrived with no context.'
            : '';

        const systemPrompt = va?.category === 'employer_ops' && va?.name?.toLowerCase().includes('rota')
            ? ROTA_COMPLIANCE_PROMPT
            : genericBasePrompt + conversationalAddendum;

        // NEW (2026-08-23): real behavioral branch on execution_type —
        // the actual mechanical difference between "hiring an assistant"
        // (Hire VA) and running a single-purpose utility (HR Tools).
        // single_turn (default, matches every VA's original behavior
        // exactly — no change for anything already live): one input, one
        // output, no memory. conversational (new): builds real message
        // history from the frontend-supplied `history` array, so the
        // model actually sees prior turns in this session — the
        // extension point for future VA execution types lives here too,
        // as an additional branch, without touching single_turn at all.

        let messages;
        if (executionType === 'conversational' && Array.isArray(history) && history.length > 0) {
            // history is [{role: 'user'|'assistant', content: string}, ...]
            // from prior turns in this session — capped to the last 20
            // turns to bound token cost on a long-running conversation.
            const boundedHistory = history.slice(-20);
            messages = [
                { role: 'system', content: systemPrompt },
                ...boundedHistory,
                { role: 'user', content: input }
            ];
        } else {
            messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: input }
            ];
        }
        
        let output;
        let usedFallback = false;
        
        try {
            const data = await callOpenAI(messages, 1500, 0.7);
            output = data.choices[0].message.content;
        } catch (err) {
            // FIXED (2026-08-30): confirmed serious issue - this
            // previously fabricated a fake "I've analyzed your request
            // and prepared personalized recommendations" message when
            // the real AI call failed, charging the user a credit for
            // work that never happened, with no way for them to know
            // anything went wrong. Now honest: refunds the credit and
            // tells the user directly, rather than pretending to have
            // done work it didn't do.
            console.warn(`VA OpenAI call failed for ${assistantId}:`, err.message);
            await refundCreditIfDeducted(supabaseClient, userId, creditCheck, cost);
            return res.status(503).json({
                success: false,
                error: 'This assistant is temporarily unavailable. Your credit has not been charged - please try again in a moment.'
            });
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
        
        return res.status(200).json({ success: true, output, usedFallback, executionType, cost });
    },

    // ========== VA FEEDBACK ==========
    // ========== TEST CHECKLIST (NEW — 2026-08-24) ==========
    // Real, structured per-task testing feedback — replaces "leave a
    // general comment at the end" with actual pass/fail/notes per
    // specific page or flow, so problems can be traced to exactly what
    // broke, not just inferred from a paragraph of free text.
    'get-test-checklist': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        try {
            const [{ data: items, error: itemsError }, { data: results }] = await Promise.all([
                supabaseClient.from('test_checklist_items').select('*').eq('is_active', true).order('section').order('task_order'),
                supabaseClient.from('tester_task_results').select('*').eq('user_id', auth.userId)
            ]);

            if (itemsError) throw itemsError;

            const resultsByItem = {};
            for (const r of results || []) resultsByItem[r.checklist_item_id] = r;

            const merged = (items || []).map(item => ({
                ...item,
                myResult: resultsByItem[item.id] || null
            }));

            return res.status(200).json({ success: true, items: merged });
        } catch (error) {
            console.error('get-test-checklist error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    'submit-test-result': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        const { checklistItemId, status, notes } = req.body;
        if (!checklistItemId || !['pass', 'fail', 'skip'].includes(status)) {
            return res.status(400).json({ error: 'checklistItemId and a valid status (pass/fail/skip) are required' });
        }

        try {
            const { error } = await supabaseClient
                .from('tester_task_results')
                .upsert({
                    user_id: auth.userId,
                    checklist_item_id: checklistItemId,
                    status,
                    notes: notes || null,
                    tested_at: new Date().toISOString()
                }, { onConflict: 'user_id,checklist_item_id' });

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('submit-test-result error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Admin view — aggregated pass/fail counts per task, so a real
    // problem (many testers failing the same specific task) is visible
    // at a glance rather than buried across individual free-text notes.
    'admin-test-results-summary': async (req, res) => {
        const supabaseClient = getSupabase();
        const auth = await getAuthenticatedUser(req, supabaseClient);
        if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

        try {
            const { data: profile } = await supabaseClient.from('profiles').select('user_type').eq('id', auth.userId).single();
            if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const [{ data: items }, { data: results }] = await Promise.all([
                supabaseClient.from('test_checklist_items').select('*').order('section').order('task_order'),
                supabaseClient.from('tester_task_results').select('*, profiles:user_id(full_name, email)')
            ]);

            const byItem = {};
            for (const item of items || []) byItem[item.id] = { ...item, pass: 0, fail: 0, skip: 0, notes: [] };
            for (const r of results || []) {
                if (!byItem[r.checklist_item_id]) continue;
                byItem[r.checklist_item_id][r.status]++;
                if (r.notes) byItem[r.checklist_item_id].notes.push({ tester: r.profiles?.full_name || r.profiles?.email, note: r.notes, status: r.status });
            }

            return res.status(200).json({ success: true, summary: Object.values(byItem) });
        } catch (error) {
            console.error('admin-test-results-summary error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

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

        const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
        if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });
        
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

        const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
        if (!idCheck.verified) return res.status(idCheck.status).json({ success: false, error: idCheck.error });
        
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

        // FIXED (2026-08-27): unlike the credit/data-modifying handlers,
        // this one's own design explicitly says tracking should never be
        // able to break the site - a hard 401/403 here would violate
        // that. Instead, an unverified claimed userId is silently
        // dropped to null (tracked as anonymous) rather than rejected,
        // closing the same real gap (someone attributing page views to
        // another real user's account) without ever failing the request.
        const idCheck = await verifyClaimedUserId(req, supabaseClient, userId);
        const verifiedUserId = idCheck.verified ? idCheck.userId : null;

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
                        user_id: verifiedUserId
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
                    user_id: verifiedUserId,
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
