// src/services/analyticsTrackingService.js
// FIXED - Removes external API calls, handles missing tables gracefully

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
    ANALYTICS_ENABLED: true // Can be disabled if needed
};

// State management
let currentSessionId = null;
let sessionStartTime = null;
let currentPagePath = null;
let pageViewStartTime = null;
let keepAliveInterval = null;
let isInitialized = false;
let initPromise = null;
let analyticsEnabled = true;

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

async function getUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch {
        return null;
    }
}

// REMOVED: External geolocation API calls (causing CORS/rate limit issues)
// Using browser's built-in location as fallback (user consent required)
function getBrowserLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ country_code: 'unknown', country_name: 'Unknown', city: 'Unknown' });
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                // Use reverse geocoding only if needed - skip for now
                resolve({ 
                    country_code: 'unknown', 
                    country_name: 'Unknown', 
                    city: 'Unknown',
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            () => {
                resolve({ country_code: 'unknown', country_name: 'Unknown', city: 'Unknown' });
            },
            { timeout: 3000 }
        );
    });
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
        language: navigator.language
    };
}

// Check if analytics tables exist (graceful degradation)
async function checkAnalyticsTables() {
    if (!analyticsEnabled) return false;
    
    try {
        // Test if sessions table exists
        const { error } = await supabase
            .from('analytics_sessions')
            .select('session_id', { count: 'exact', head: true })
            .limit(1);
        
        if (error && error.code === '42P01') { // Table doesn't exist
            console.warn('Analytics tables not found in Supabase. Analytics disabled.');
            analyticsEnabled = false;
            return false;
        }
        
        return true;
    } catch {
        analyticsEnabled = false;
        return false;
    }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function startSession() {
    if (!analyticsEnabled) return null;
    
    try {
        const existingSessionId = getCurrentSessionId();
        const user = await getUser();
        const visitorId = getVisitorId();
        
        // Check if session already exists in database
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
        
        // Create new session (skip geolocation to avoid external API calls)
        const deviceInfo = getDeviceInfo();
        const newSessionId = generateId('sess_');
        
        const { error } = await supabase
            .from('analytics_sessions')
            .insert({
                session_id: newSessionId,
                visitor_id: visitorId,
                user_id: user?.id,
                device_type: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                screen_resolution: deviceInfo.screenResolution,
                language: deviceInfo.language,
                referrer: document.referrer || 'direct',
                landing_page: window.location.pathname,
                start_time: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                page_count: 1
            });
        
        if (!error) {
            currentSessionId = newSessionId;
            sessionStartTime = Date.now();
            sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, newSessionId);
            sessionStorage.setItem(STORAGE_KEYS.SESSION_START, sessionStartTime.toString());
        }
        
        return currentSessionId;
    } catch (error) {
        console.warn('Session start error (non-critical):', error.message);
        return null;
    }
}

export async function endSession() {
    if (!analyticsEnabled || (!currentSessionId && !getCurrentSessionId())) return;
    
    const sessionId = currentSessionId || getCurrentSessionId();
    const startTime = sessionStartTime || parseInt(sessionStorage.getItem(STORAGE_KEYS.SESSION_START) || Date.now().toString());
    
    try {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        
        await supabase
            .from('analytics_sessions')
            .update({
                end_time: new Date().toISOString(),
                duration_seconds: duration
            })
            .eq('session_id', sessionId)
            .is('end_time', null);
        
        // Clear session storage
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_START);
        currentSessionId = null;
        sessionStartTime = null;
        
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
    } catch (error) {
        console.warn('Session end error:', error.message);
    }
}

export async function keepAlive() {
    if (!analyticsEnabled || (!currentSessionId && !getCurrentSessionId())) return;
    
    const sessionId = currentSessionId || getCurrentSessionId();
    
    try {
        await supabase
            .from('analytics_sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('session_id', sessionId);
    } catch (error) {
        // Silently fail - not critical
    }
}

// ============================================
// PAGE VIEW TRACKING
// ============================================

export async function trackPageView(pagePath, pageTitle) {
    if (!analyticsEnabled) return;
    
    try {
        let sessionId = getCurrentSessionId();
        if (!sessionId) {
            sessionId = await startSession();
            if (!sessionId) return;
        }
        
        const user = await getUser();
        const deviceInfo = getDeviceInfo();
        
        // Record new page view
        const { error } = await supabase
            .from('analytics_page_views')
            .insert({
                session_id: sessionId,
                user_id: user?.id,
                page_path: pagePath,
                page_title: pageTitle || document.title,
                referrer: document.referrer,
                user_agent: navigator.userAgent.substring(0, 500),
                device_type: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                screen_resolution: deviceInfo.screenResolution,
                created_at: new Date().toISOString()
            });
        
        // Update session page count (silent fail if error)
        if (!error) {
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
        }
        
        // Reset tracking for new page
        pageViewStartTime = Date.now();
        currentPagePath = pagePath;
        
    } catch (error) {
        // Silent fail - analytics shouldn't break the app
        console.warn('Page view tracking error:', error.message);
    }
}

export async function updatePageViewMetrics(scrollDepth = null, clickCount = null) {
    if (!analyticsEnabled || !currentPagePath || !currentSessionId) return;
    
    try {
        const timeOnPage = Math.floor((Date.now() - (pageViewStartTime || Date.now())) / 1000);
        
        await supabase
            .from('analytics_page_views')
            .update({
                scroll_depth: scrollDepth ? Math.min(scrollDepth, 100) : null,
                click_count: clickCount || null,
                time_on_page: timeOnPage > 0 ? timeOnPage : null
            })
            .eq('session_id', currentSessionId)
            .eq('page_path', currentPagePath);
    } catch (error) {
        console.warn('Failed to update page metrics:', error.message);
    }
}

// ============================================
// EVENT TRACKING
// ============================================

export async function trackEvent(eventType, eventData = {}, pagePath = null) {
    if (!analyticsEnabled) return;
    
    try {
        let sessionId = getCurrentSessionId();
        if (!sessionId) {
            sessionId = await startSession();
            if (!sessionId) return;
        }
        
        const user = await getUser();
        
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
    } catch (error) {
        console.warn('Event tracking error:', error.message);
    }
}

// Convenience event tracking functions
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

// ============================================
// INITIALIZATION
// ============================================

export async function initAnalytics() {
    if (isInitialized) return;
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        try {
            // Check if analytics tables exist
            await checkAnalyticsTables();
            
            if (!analyticsEnabled) {
                console.log('Analytics disabled - tables not found in Supabase');
                return;
            }
            
            await startSession();
            
            // Track initial page view
            await trackPageView(window.location.pathname, document.title);
            
            // Track scroll depth (simple implementation)
            let maxScroll = 0;
            const handleScroll = () => {
                const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
                if (scrollPercent > maxScroll && scrollPercent % 25 < 5) {
                    maxScroll = scrollPercent;
                    updatePageViewMetrics(Math.floor(maxScroll), null);
                }
            };
            
            // Track click count
            let clickCount = 0;
            const handleClick = () => {
                clickCount++;
                updatePageViewMetrics(null, clickCount);
            };
            
            window.addEventListener('scroll', handleScroll);
            document.addEventListener('click', handleClick);
            
            // Set up page visibility tracking
            document.addEventListener('visibilitychange', async () => {
                if (document.hidden) {
                    await updatePageViewMetrics();
                } else {
                    pageViewStartTime = Date.now();
                }
            });
            
            // Set up beforeunload to end session
            window.addEventListener('beforeunload', async () => {
                await updatePageViewMetrics();
                await endSession();
            });
            
            // Periodic keep-alive
            keepAliveInterval = setInterval(() => keepAlive(), CONFIG.KEEP_ALIVE_INTERVAL);
            
            isInitialized = true;
            console.log('Analytics initialized');
        } catch (error) {
            console.warn('Analytics initialization failed:', error.message);
            analyticsEnabled = false;
        }
    })();
    
    return initPromise;
}

// ============================================
// SQL to create missing tables (run in Supabase SQL editor)
// ============================================

export const createAnalyticsTablesSQL = `
-- Create analytics_sessions table
CREATE TABLE IF NOT EXISTS analytics_sessions (
    id SERIAL PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    visitor_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    country_code TEXT,
    country_name TEXT,
    city TEXT,
    latitude FLOAT,
    longitude FLOAT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    screen_resolution TEXT,
    language TEXT,
    referrer TEXT,
    landing_page TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    page_count INTEGER DEFAULT 1,
    last_page TEXT,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics_page_views table
CREATE TABLE IF NOT EXISTS analytics_page_views (
    id SERIAL PRIMARY KEY,
    session_id TEXT REFERENCES analytics_sessions(session_id),
    user_id UUID REFERENCES auth.users(id),
    page_path TEXT,
    page_title TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    country_code TEXT,
    country_name TEXT,
    city TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    screen_resolution TEXT,
    time_on_page INTEGER,
    scroll_depth INTEGER,
    click_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    session_id TEXT REFERENCES analytics_sessions(session_id),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT,
    event_data JSONB,
    page_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_start_time ON analytics_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_session_id ON analytics_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_created_at ON analytics_page_views(created_at);
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
    createAnalyticsTablesSQL
};
