// src/services/analyticsTrackingService.js
// ODUSBABA ANALYTICS TRACKING SERVICE v3.0 - PRODUCTION READY
// ✅ Complete session tracking, page views, events
// ✅ IP detection, device info, scroll/click tracking
// ✅ Unified API endpoint integration
// ✅ Robust error handling with fallbacks

import { supabase } from '../lib/supabase';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const STORAGE_KEYS = {
    SESSION_ID: 'analytics_session_id',
    SESSION_START: 'analytics_session_start',
    VISITOR_ID: 'analytics_visitor_id'
};

const CONFIG = {
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    KEEP_ALIVE_INTERVAL: 5 * 60 * 1000, // 5 minutes
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000
};

// ✅ FIXED: Unified API endpoint
const API_BASE = '/api/index';
const IP_ENDPOINT = `${API_BASE}?action=ip`;

// State management
let currentSessionId = null;
let sessionStartTime = null;
let currentPagePath = null;
let pageViewStartTime = null;
let keepAliveInterval = null;
let isInitialized = false;
let initPromise = null;
let analyticsEnabled = true;
let tablesExistChecked = false;

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(prefix = '') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function getVisitorId() {
    let id = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
    if (!id) {
        id = generateId('visitor_');
        localStorage.setItem(STORAGE_KEYS.VISITOR_ID, id);
    }
    return id;
}

function getCurrentSessionId() {
    if (currentSessionId) return currentSessionId;
    
    let sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (sessionId) {
        currentSessionId = sessionId;
        sessionStartTime = parseInt(sessionStorage.getItem(STORAGE_KEYS.SESSION_START) || Date.now().toString());
    }
    return sessionId;
}

function setCurrentSessionId(sessionId) {
    currentSessionId = sessionId;
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    sessionStorage.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());
    sessionStartTime = Date.now();
}

async function getUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch {
        return null;
    }
}

// ============================================
// IP DETECTION (Unified API)
// ============================================

/**
 * Get user's IP address and geolocation data
 * Uses unified /api/index?action=ip endpoint
 */
export async function getUserIP() {
    try {
        const response = await fetch(IP_ENDPOINT, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                ip: data.ip,
                country: data.geolocation?.country,
                city: data.geolocation?.city,
                region: data.geolocation?.region,
                latitude: data.geolocation?.latitude,
                longitude: data.geolocation?.longitude,
                source: 'api'
            };
        }
        
        // Fallback to free IP API
        const fallbackResponse = await fetch('https://ipapi.co/json/');
        if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            return {
                ip: data.ip,
                country: data.country_name,
                city: data.city,
                region: data.region,
                latitude: data.latitude,
                longitude: data.longitude,
                source: 'ipapi'
            };
        }
        
        return { ip: null, error: 'Unable to fetch IP' };
    } catch (error) {
        console.debug('IP detection failed:', error.message);
        return { ip: null, error: error.message };
    }
}

/**
 * Get browser's timezone
 */
export function getUserTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return 'UTC';
    }
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    
    // Device type detection
    let deviceType = 'desktop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
        deviceType = 'tablet';
    } else if (/(Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|BB10|webOS|Silk|Windows Phone)/i.test(ua)) {
        deviceType = 'mobile';
    }
    
    // Browser detection
    let browser = 'Other';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
    
    // OS detection
    let os = 'Other';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    
    return {
        deviceType,
        browser,
        os,
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        timezone: getUserTimezone()
    };
}

// Safe API call wrapper - handles errors gracefully
async function safeAnalyticsCall(callback, fallbackValue = null, retries = 0) {
    if (!analyticsEnabled) return fallbackValue;
    
    try {
        const result = await callback();
        return result;
    } catch (error) {
        // Don't log 403/404 errors heavily - they're expected without proper RLS/tables
        if (error?.status === 403 || error?.status === 404 || error?.code === '42P01') {
            if (retries === 0) {
                console.debug('Analytics unavailable (tables/RLS):', error.message);
                analyticsEnabled = false;
            }
            return fallbackValue;
        }
        
        // Retry on network errors
        if (retries < CONFIG.MAX_RETRIES && (error.message === 'Failed to fetch' || error.name === 'NetworkError')) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            return safeAnalyticsCall(callback, fallbackValue, retries + 1);
        }
        
        // Only log non-expected errors
        if (error?.status !== 403 && error?.status !== 404) {
            console.debug('Analytics error:', error.message);
        }
        return fallbackValue;
    }
}

// Check if analytics tables exist (only once)
async function checkAnalyticsTables() {
    if (tablesExistChecked) return analyticsEnabled;
    tablesExistChecked = true;
    
    const result = await safeAnalyticsCall(async () => {
        const { error } = await supabase
            .from('analytics_sessions')
            .select('session_id', { count: 'exact', head: true })
            .limit(1);
        
        return !(error && error.code === '42P01');
    }, false);
    
    analyticsEnabled = result;
    if (!analyticsEnabled) {
        console.log('Analytics disabled - tables not found in Supabase');
    }
    return analyticsEnabled;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function startSession() {
    if (!await checkAnalyticsTables()) return null;
    
    return safeAnalyticsCall(async () => {
        const existingSessionId = getCurrentSessionId();
        const user = await getUser();
        const visitorId = getVisitorId();
        const ipData = await getUserIP();
        const deviceInfo = getDeviceInfo();
        
        // Check if session already exists
        if (existingSessionId) {
            const { data: existing, error } = await supabase
                .from('analytics_sessions')
                .select('session_id')
                .eq('session_id', existingSessionId)
                .maybeSingle();
            
            if (!error && existing) {
                currentSessionId = existingSessionId;
                return currentSessionId;
            }
        }
        
        // Create new session
        const newSessionId = generateId('sess_');
        
        const { error } = await supabase
            .from('analytics_sessions')
            .insert({
                session_id: newSessionId,
                visitor_id: visitorId,
                user_id: user?.id,
                ip_address: ipData.ip,
                country: ipData.country,
                city: ipData.city,
                device_type: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                screen_resolution: deviceInfo.screenResolution,
                language: deviceInfo.language,
                timezone: deviceInfo.timezone,
                referrer: document.referrer || 'direct',
                landing_page: window.location.pathname,
                start_time: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                page_count: 1
            });
        
        if (!error) {
            setCurrentSessionId(newSessionId);
        }
        
        return currentSessionId;
    }, null);
}

export async function endSession() {
    if (!analyticsEnabled) return;
    
    const sessionId = currentSessionId || getCurrentSessionId();
    if (!sessionId) return;
    
    const startTime = sessionStartTime || parseInt(sessionStorage.getItem(STORAGE_KEYS.SESSION_START) || Date.now().toString());
    
    await safeAnalyticsCall(async () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        
        await supabase
            .from('analytics_sessions')
            .update({
                end_time: new Date().toISOString(),
                duration_seconds: duration
            })
            .eq('session_id', sessionId)
            .is('end_time', null);
        
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_START);
        currentSessionId = null;
        sessionStartTime = null;
        
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
    });
}

export async function keepAlive() {
    if (!analyticsEnabled) return;
    
    const sessionId = currentSessionId || getCurrentSessionId();
    if (!sessionId) return;
    
    await safeAnalyticsCall(async () => {
        await supabase
            .from('analytics_sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('session_id', sessionId);
    });
}

// ============================================
// PAGE VIEW TRACKING
// ============================================

export async function trackPageView(pagePath, pageTitle) {
    if (!analyticsEnabled) return;
    
    await safeAnalyticsCall(async () => {
        let sessionId = getCurrentSessionId();
        if (!sessionId) {
            sessionId = await startSession();
            if (!sessionId) return;
        }
        
        const user = await getUser();
        const ipData = await getUserIP();
        const deviceInfo = getDeviceInfo();
        
        await supabase
            .from('analytics_page_views')
            .insert({
                session_id: sessionId,
                user_id: user?.id,
                page_url: pagePath,
                page_title: pageTitle || document.title,
                referrer: document.referrer,
                user_agent: navigator.userAgent.substring(0, 500),
                ip_address: ipData.ip,
                country: ipData.country,
                city: ipData.city,
                device_type: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                screen_resolution: deviceInfo.screenResolution,
                created_at: new Date().toISOString()
            });
        
        // Update session page count
        const { data: session } = await supabase
            .from('analytics_sessions')
            .select('page_count')
            .eq('session_id', sessionId)
            .single();
        
        await supabase
            .from('analytics_sessions')
            .update({ 
                page_count: (session?.page_count || 0) + 1,
                last_page: pagePath,
                last_activity: new Date().toISOString()
            })
            .eq('session_id', sessionId);
        
        pageViewStartTime = Date.now();
        currentPagePath = pagePath;
    });
}

export async function updatePageViewMetrics(scrollDepth = null, clickCount = null) {
    if (!analyticsEnabled || !currentPagePath || !currentSessionId) return;
    
    await safeAnalyticsCall(async () => {
        const timeOnPage = Math.floor((Date.now() - (pageViewStartTime || Date.now())) / 1000);
        
        await supabase
            .from('analytics_page_views')
            .update({
                scroll_depth: scrollDepth ? Math.min(scrollDepth, 100) : null,
                click_count: clickCount || null,
                view_duration_seconds: timeOnPage > 0 ? timeOnPage : null
            })
            .eq('session_id', currentSessionId)
            .eq('page_url', currentPagePath)
            .is('view_duration_seconds', null);
    });
}

// ============================================
// EVENT TRACKING (Unified API)
// ============================================

export async function trackEvent(eventType, eventData = {}, pagePath = null) {
    if (!analyticsEnabled) return;
    
    await safeAnalyticsCall(async () => {
        let sessionId = getCurrentSessionId();
        if (!sessionId) {
            sessionId = await startSession();
            if (!sessionId) return;
        }
        
        const user = await getUser();
        
        // Try unified API first
        try {
            const response = await fetch(`${API_BASE}?action=track-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_type: eventType,
                    event_data: eventData,
                    user_id: user?.id,
                    session_id: sessionId,
                    page_path: pagePath || window.location.pathname
                })
            });
            
            if (response.ok) return;
        } catch (apiError) {
            console.debug('Unified API event tracking failed, falling back to direct DB:', apiError);
        }
        
        // Fallback to direct database insert
        await supabase
            .from('analytics_events')
            .insert({
                session_id: sessionId,
                user_id: user?.id,
                event_type: eventType,
                event_data: eventData,
                page_path: pagePath || window.location.pathname,
                created_at: new Date().toISOString()
            });
    });
}

// ============================================
// CONVENIENCE EVENT FUNCTIONS
// ============================================

export function trackJobSearch(query, filters = {}, resultsCount = null) {
    return trackEvent('job_search', { query, filters, results_count: resultsCount });
}

export function trackJobView(jobId, jobTitle, company) {
    return trackEvent('job_view', { job_id: jobId, job_title: jobTitle, company });
}

export function trackJobApply(jobId, jobTitle, company) {
    return trackEvent('job_apply', { job_id: jobId, job_title: jobTitle, company });
}

export function trackCourseStart(courseId, courseTitle) {
    return trackEvent('course_start', { course_id: courseId, course_title: courseTitle });
}

export function trackCourseComplete(courseId, courseTitle, durationMinutes) {
    return trackEvent('course_complete', { course_id: courseId, course_title: courseTitle, duration_minutes: durationMinutes });
}

export function trackAssessmentStart(assessmentId, type) {
    return trackEvent('assessment_start', { assessment_id: assessmentId, type });
}

export function trackAssessmentComplete(assessmentId, type, score) {
    return trackEvent('assessment_complete', { assessment_id: assessmentId, type, score });
}

export function trackNewsletterSignup(email, source) {
    return trackEvent('newsletter_signup', { source });
}

export function trackLogin(method = 'email') {
    return trackEvent('user_login', { method });
}

export function trackSignup(method = 'email', userType = 'job_seeker') {
    return trackEvent('user_signup', { method, user_type: userType });
}

export function trackContactForm(name, email, subject) {
    return trackEvent('contact_form', { name: name?.substring(0, 50), email, subject: subject?.substring(0, 100) });
}

// ============================================
// ANALYTICS QUERIES (Admin)
// ============================================

export async function getVisitorAnalytics(days = 30) {
    if (!await checkAnalyticsTables()) return getEmptyAnalytics();
    
    return safeAnalyticsCall(async () => {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: sessions } = await supabase
            .from('analytics_sessions')
            .select('*')
            .gte('start_time', cutoff);
        
        const sessionsData = sessions || [];
        const uniqueVisitors = new Set(sessionsData.map(s => s.visitor_id || s.user_id || s.ip_address)).size;
        const totalSessions = sessionsData.length;
        
        const avgDuration = sessionsData.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / (totalSessions || 1);
        const avgMinutes = Math.floor(avgDuration / 60);
        
        const bounceCount = sessionsData.filter(s => (s.page_count || 0) === 1).length || 0;
        const bounceRate = totalSessions > 0 ? Math.round((bounceCount / totalSessions) * 100) : 0;
        
        // Device breakdown
        const byDevice = { desktop: 0, mobile: 0, tablet: 0 };
        sessionsData.forEach(s => {
            if (s.device_type === 'desktop') byDevice.desktop++;
            else if (s.device_type === 'mobile') byDevice.mobile++;
            else if (s.device_type === 'tablet') byDevice.tablet++;
        });
        
        const totalDevices = byDevice.desktop + byDevice.mobile + byDevice.tablet;
        const devicePercentages = {
            desktop: totalDevices > 0 ? Math.round((byDevice.desktop / totalDevices) * 100) : 0,
            mobile: totalDevices > 0 ? Math.round((byDevice.mobile / totalDevices) * 100) : 0,
            tablet: totalDevices > 0 ? Math.round((byDevice.tablet / totalDevices) * 100) : 0
        };
        
        // Top pages
        const { data: pageViews } = await supabase
            .from('analytics_page_views')
            .select('page_url')
            .gte('created_at', cutoff);
        
        const pageStats = {};
        (pageViews || []).forEach(p => {
            pageStats[p.page_url] = (pageStats[p.page_url] || 0) + 1;
        });
        
        const topPages = Object.entries(pageStats)
            .map(([path, views]) => ({ path, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
        
        // Event types
        const { data: events } = await supabase
            .from('analytics_events')
            .select('event_type')
            .gte('created_at', cutoff);
        
        const eventTypes = {};
        (events || []).forEach(e => {
            eventTypes[e.event_type] = (eventTypes[e.event_type] || 0) + 1;
        });
        
        // Country breakdown
        const countryStats = {};
        (pageViews || []).forEach(p => {
            const country = p.country || 'Unknown';
            countryStats[country] = (countryStats[country] || 0) + 1;
        });
        
        return {
            summary: {
                unique_visitors: uniqueVisitors,
                total_sessions: totalSessions,
                avg_session_duration: avgMinutes,
                bounce_rate: bounceRate,
                total_page_views: pageViews?.length || 0,
                total_events: events?.length || 0
            },
            by_country: countryStats,
            by_device: devicePercentages,
            top_pages: topPages,
            event_types: Object.entries(eventTypes),
            recent_visitors: sessionsData.slice(0, 20).map(s => ({
                time: s.start_time,
                city: s.city,
                country: s.country,
                device: s.device_type,
                browser: s.browser,
                pages: s.page_count,
                duration: s.duration_seconds
            }))
        };
    }, getEmptyAnalytics());
}

function getEmptyAnalytics() {
    return {
        summary: {
            unique_visitors: 0,
            total_sessions: 0,
            avg_session_duration: 0,
            bounce_rate: 0,
            total_page_views: 0,
            total_events: 0
        },
        by_country: {},
        by_device: { desktop: 0, mobile: 0, tablet: 0 },
        top_pages: [],
        event_types: [],
        recent_visitors: []
    };
}

export async function getPageViews(days = 30) {
    if (!await checkAnalyticsTables()) return [];
    
    return safeAnalyticsCall(async () => {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: pages } = await supabase
            .from('analytics_page_views')
            .select('page_url')
            .gte('created_at', cutoff);
        
        const pageStats = {};
        (pages || []).forEach(p => {
            pageStats[p.page_url] = (pageStats[p.page_url] || 0) + 1;
        });
        
        return Object.entries(pageStats)
            .map(([path, views]) => ({ path, views }))
            .sort((a, b) => b.views - a.views);
    }, []);
}

export async function getVisitorsByLocation(days = 30) {
    if (!await checkAnalyticsTables()) return {};
    
    return safeAnalyticsCall(async () => {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: views } = await supabase
            .from('analytics_page_views')
            .select('country')
            .gte('created_at', cutoff);
        
        const countryStats = {};
        (views || []).forEach(v => {
            const country = v.country || 'Unknown';
            countryStats[country] = (countryStats[country] || 0) + 1;
        });
        
        return countryStats;
    }, {});
}

export async function getActiveUsers() {
    if (!await checkAnalyticsTables()) return [];
    
    return safeAnalyticsCall(async () => {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        
        const { data } = await supabase
            .from('analytics_sessions')
            .select('session_id, user_id, visitor_id, device_type, country, last_activity')
            .gte('last_activity', fifteenMinsAgo)
            .is('end_time', null);
        
        return data || [];
    }, []);
}

export async function getUserActivity(userId, days = 30) {
    if (!await checkAnalyticsTables()) return [];
    
    return safeAnalyticsCall(async () => {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data } = await supabase
            .from('analytics_page_views')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', cutoff)
            .order('created_at', { ascending: false });
        
        return data || [];
    }, []);
}

// ============================================
// INITIALIZATION
// ============================================

export async function initAnalytics() {
    if (isInitialized) return;
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        try {
            await checkAnalyticsTables();
            
            if (!analyticsEnabled) {
                console.log('Analytics disabled - tables not found');
                return;
            }
            
            await startSession();
            await trackPageView(window.location.pathname, document.title);
            
            // Scroll depth tracking
            let maxScroll = 0;
            const handleScroll = () => {
                const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                const scrollPercent = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
                if (scrollPercent > maxScroll && scrollPercent % 25 < 5) {
                    maxScroll = scrollPercent;
                    updatePageViewMetrics(Math.floor(maxScroll), null);
                }
            };
            
            // Click tracking
            let clickCount = 0;
            const handleClick = () => {
                clickCount++;
                updatePageViewMetrics(null, clickCount);
            };
            
            window.addEventListener('scroll', handleScroll);
            document.addEventListener('click', handleClick);
            
            // Page visibility
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    updatePageViewMetrics();
                } else {
                    pageViewStartTime = Date.now();
                }
            });
            
            // Session end on page unload
            window.addEventListener('beforeunload', () => {
                updatePageViewMetrics();
                endSession();
            });
            
            // Periodic keep-alive
            keepAliveInterval = setInterval(() => keepAlive(), CONFIG.KEEP_ALIVE_INTERVAL);
            
            isInitialized = true;
            console.log('Analytics initialized');
        } catch (error) {
            console.warn('Analytics initialization failed:', error?.message);
            analyticsEnabled = false;
        }
    })();
    
    return initPromise;
}

// ============================================
// SQL SCHEMA (Run in Supabase SQL editor)
// ============================================

export const createAnalyticsTablesSQL = `
-- Create analytics_sessions table
CREATE TABLE IF NOT EXISTS analytics_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    visitor_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    country TEXT,
    city TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    screen_resolution TEXT,
    language TEXT,
    timezone TEXT,
    referrer TEXT,
    landing_page TEXT,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    page_count INTEGER DEFAULT 1,
    last_page TEXT,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics_page_views table
CREATE TABLE IF NOT EXISTS analytics_page_views (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    page_url TEXT,
    page_title TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    country TEXT,
    city TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    screen_resolution TEXT,
    view_duration_seconds INTEGER,
    scroll_depth INTEGER,
    click_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT,
    event_data JSONB,
    page_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_start_time ON analytics_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_session_id ON analytics_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_created_at ON analytics_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_page_url ON analytics_page_views(page_url);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
`;

// ============================================
// EXPORTS
// ============================================

export default {
    initAnalytics,
    startSession,
    endSession,
    keepAlive,
    trackPageView,
    updatePageViewMetrics,
    trackEvent,
    trackJobSearch,
    trackJobView,
    trackJobApply,
    trackCourseStart,
    trackCourseComplete,
    trackAssessmentStart,
    trackAssessmentComplete,
    trackNewsletterSignup,
    trackLogin,
    trackSignup,
    trackContactForm,
    getVisitorAnalytics,
    getPageViews,
    getVisitorsByLocation,
    getActiveUsers,
    getUserActivity,
    getUserIP,
    getUserTimezone,
    createAnalyticsTablesSQL
};
