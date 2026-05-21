// src/services/analyticsTrackingService.js
// COMPLETE & OPTIMIZED - User analytics tracking service
// Features: Session management, page views, events, geolocation, device detection, admin analytics

import { supabase } from '../lib/supabase';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const STORAGE_KEYS = {
    SESSION_ID: 'analytics_session_id',
    SESSION_START: 'analytics_session_start',
    VISITOR_ID: 'analytics_visitor_id',
    PAGE_METRICS_PREFIX: 'analytics_page_metrics_'
};

const CONFIG = {
    DEBOUNCE_DELAY: 5000,           // 5 seconds for metric updates
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    KEEP_ALIVE_INTERVAL: 5 * 60 * 1000, // 5 minutes
    GEOLOCATION_TIMEOUT: 3000,      // 3 seconds
    MAX_BATCH_SIZE: 50
};

// State management (memory only)
let currentSessionId = null;
let sessionStartTime = null;
let currentPagePath = null;
let pageViewStartTime = null;
let metricsDebounceTimer = null;
let keepAliveInterval = null;
let isInitialized = false;
let initPromise = null;

// ============================================
// HELPER FUNCTIONS (Internal)
// ============================================

function generateId(prefix = '') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
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

async function getGeolocation() {
    const geoServiceUrls = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/?fields=status,country,countryCode,city,lat,lon,query',
        'https://api.ipify.org?format=json'
    ];
    
    for (const url of geoServiceUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.GEOLOCATION_TIMEOUT);
            
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'ODUSBABA-Analytics/1.0' }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                
                // Handle different response formats
                if (data.country_code || data.country) {
                    return {
                        ip: data.ip || data.query,
                        country_code: data.country_code || data.countryCode,
                        country_name: data.country_name || data.country,
                        city: data.city || data.region,
                        latitude: data.latitude || data.lat,
                        longitude: data.longitude || data.lon,
                        timezone: data.timezone
                    };
                }
            }
        } catch (error) {
            console.warn(`Geo service failed (${url}):`, error.message);
        }
    }
    
    return {
        ip: null,
        country_code: 'unknown',
        country_name: 'Unknown',
        city: 'Unknown',
        latitude: null,
        longitude: null,
        timezone: null
    };
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

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function startSession() {
    try {
        const existingSessionId = getCurrentSessionId();
        const user = await getUser();
        const visitorId = getVisitorId();
        
        // Check if session already exists in database
        if (existingSessionId) {
            const { data: existing } = await supabase
                .from('analytics_sessions')
                .select('session_id')
                .eq('session_id', existingSessionId)
                .maybeSingle();
            
            if (existing) {
                currentSessionId = existingSessionId;
                return currentSessionId;
            }
        }
        
        // Create new session
        const [geoData, deviceInfo] = await Promise.all([
            getGeolocation(),
            Promise.resolve(getDeviceInfo())
        ]);
        
        const newSessionId = generateId('sess_');
        
        const { error } = await supabase
            .from('analytics_sessions')
            .insert({
                session_id: newSessionId,
                visitor_id: visitorId,
                user_id: user?.id,
                ip_address: geoData.ip,
                country_code: geoData.country_code,
                country_name: geoData.country_name,
                city: geoData.city,
                latitude: geoData.latitude,
                longitude: geoData.longitude,
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
        console.error('Session start error:', error);
        return null;
    }
}

export async function endSession() {
    if (!currentSessionId && !getCurrentSessionId()) return;
    
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
        
        // Clear keep-alive interval
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
    } catch (error) {
        console.error('Session end error:', error);
    }
}

export async function keepAlive() {
    if (!currentSessionId && !getCurrentSessionId()) return;
    
    const sessionId = currentSessionId || getCurrentSessionId();
    
    try {
        await supabase
            .from('analytics_sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('session_id', sessionId);
    } catch (error) {
        console.warn('Keep alive failed:', error);
    }
}

// ============================================
// PAGE VIEW TRACKING
// ============================================

export async function trackPageView(pagePath, pageTitle) {
    try {
        let sessionId = getCurrentSessionId();
        if (!sessionId) {
            sessionId = await startSession();
        }
        
        const user = await getUser();
        
        // End previous page view timing
        if (currentPagePath && pageViewStartTime && currentPagePath !== pagePath) {
            const timeOnPage = Math.floor((Date.now() - pageViewStartTime) / 1000);
            if (timeOnPage > 0) {
                await supabase
                    .from('analytics_page_views')
                    .update({ time_on_page: timeOnPage })
                    .eq('session_id', sessionId)
                    .eq('page_path', currentPagePath);
            }
        }
        
        // Get geolocation only for first page view of session
        let geoData = null;
        const { count } = await supabase
            .from('analytics_page_views')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId);
        
        if (count === 0) {
            geoData = await getGeolocation();
        }
        
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
                user_agent: navigator.userAgent,
                ip_address: geoData?.ip,
                country_code: geoData?.country_code,
                country_name: geoData?.country_name,
                city: geoData?.city,
                device_type: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                screen_resolution: deviceInfo.screenResolution,
                created_at: new Date().toISOString()
            });
        
        // Update session page count and last page
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
        
        // Clear any pending metrics update
        if (metricsDebounceTimer) {
            clearTimeout(metricsDebounceTimer);
            metricsDebounceTimer = null;
        }
        
    } catch (error) {
        console.error('Page view tracking error:', error);
    }
}

export async function updatePageViewMetrics(scrollDepth = null, clickCount = null) {
    if (!currentPagePath || (!currentSessionId && !getCurrentSessionId())) return;
    
    const sessionId = currentSessionId || getCurrentSessionId();
    const metricsKey = `${STORAGE_KEYS.PAGE_METRICS_PREFIX}${sessionId}_${currentPagePath}`;
    
    // Store metrics in sessionStorage
    let metrics = { scroll_depth: scrollDepth, click_count: clickCount, updated_at: Date.now() };
    
    try {
        const stored = sessionStorage.getItem(metricsKey);
        if (stored) {
            const existing = JSON.parse(stored);
            metrics = {
                scroll_depth: Math.max(existing.scroll_depth || 0, scrollDepth || 0),
                click_count: (existing.click_count || 0) + (clickCount || 0),
                updated_at: Date.now()
            };
        }
        sessionStorage.setItem(metricsKey, JSON.stringify(metrics));
    } catch {
        // Storage failed, continue without persisting
    }
    
    // Debounced database update
    if (metricsDebounceTimer) clearTimeout(metricsDebounceTimer);
    
    metricsDebounceTimer = setTimeout(async () => {
        try {
            const stored = sessionStorage.getItem(metricsKey);
            if (!stored) return;
            
            const data = JSON.parse(stored);
            const timeOnPage = Math.floor((Date.now() - (pageViewStartTime || Date.now())) / 1000);
            
            await supabase
                .from('analytics_page_views')
                .update({
                    scroll_depth: Math.min(data.scroll_depth, 100), // Cap at 100%
                    click_count: data.click_count,
                    time_on_page: timeOnPage
                })
                .eq('session_id', sessionId)
                .eq('page_path', currentPagePath);
        } catch (error) {
            console.warn('Failed to update page metrics:', error);
        } finally {
            sessionStorage.removeItem(metricsKey);
        }
    }, CONFIG.DEBOUNCE_DELAY);
}

// ============================================
// EVENT TRACKING
// ============================================

export async function trackEvent(eventType, eventData = {}, pagePath = null) {
    try {
        let sessionId = getCurrentSessionId();
        if (!sessionId) {
            sessionId = await startSession();
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
        console.error('Event tracking error:', error);
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

export function trackChatInteraction(messageLength, responseTime, suggestedProduct = null) {
    return trackEvent('chat_interaction', { 
        message_length: messageLength, 
        response_time_ms: responseTime, 
        suggested_product: suggestedProduct 
    });
}

export function trackServiceRequest(requestId, category, amount = null) {
    return trackEvent('service_request', { request_id: requestId, category, amount });
}

export function trackProposalSent(requestId, proposalAmount, professionalId) {
    return trackEvent('proposal_sent', { request_id: requestId, amount: proposalAmount, professional_id: professionalId });
}

export function trackEngagementStarted(engagementId, type, parties) {
    return trackEvent('engagement_started', { engagement_id: engagementId, type, parties });
}

export function trackEngagementCompleted(engagementId, type, rating, durationDays) {
    return trackEvent('engagement_completed', { engagement_id: engagementId, type, rating, duration_days: durationDays });
}

export function trackNewsletterSignup(email, source) {
    return trackEvent('newsletter_signup', { email_hash: hashEmail(email), source });
}

export function trackSearchPerformed(searchType, query, resultsCount) {
    return trackEvent('search_performed', { search_type: searchType, query, results_count: resultsCount });
}

// Helper for email hashing (privacy)
function hashEmail(email) {
    if (!email) return null;
    // Simple hash for privacy - in production use crypto.subtle
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = ((hash << 5) - hash) + email.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

// ============================================
// ANALYTICS QUERIES (Admin Dashboard)
// ============================================

export async function getVisitorAnalytics(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const [sessionsResult, pageViewsResult, eventsResult] = await Promise.all([
        supabase.from('analytics_sessions').select('*').gte('start_time', cutoff),
        supabase.from('analytics_page_views').select('*').gte('created_at', cutoff),
        supabase.from('analytics_events').select('*').gte('created_at', cutoff)
    ]);
    
    const sessions = sessionsResult.data || [];
    const pageViews = pageViewsResult.data || [];
    const events = eventsResult.data || [];
    
    // Calculate metrics
    const uniqueVisitors = new Set(sessions.map(s => s.visitor_id || s.user_id || s.ip_address)).size;
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions / 60) : 0;
    
    const singlePageSessions = sessions.filter(s => (s.page_count || 0) === 1).length;
    const bounceRate = totalSessions > 0 ? Math.round((singlePageSessions / totalSessions) * 100) : 0;
    
    // Group by country
    const byCountry = {};
    sessions.forEach(s => {
        const country = s.country_name || s.country_code || 'Unknown';
        byCountry[country] = (byCountry[country] || 0) + 1;
    });
    
    // Group by device
    const byDevice = { desktop: 0, mobile: 0, tablet: 0 };
    sessions.forEach(s => {
        if (byDevice[s.device_type] !== undefined) byDevice[s.device_type]++;
    });
    
    const totalDevices = byDevice.desktop + byDevice.mobile + byDevice.tablet;
    const devicePercentages = {
        desktop: totalDevices > 0 ? Math.round((byDevice.desktop / totalDevices) * 100) : 0,
        mobile: totalDevices > 0 ? Math.round((byDevice.mobile / totalDevices) * 100) : 0,
        tablet: totalDevices > 0 ? Math.round((byDevice.tablet / totalDevices) * 100) : 0
    };
    
    // Top pages
    const pageCounts = {};
    pageViews.forEach(p => {
        pageCounts[p.page_path] = (pageCounts[p.page_path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    
    // Recent visitors
    const recentVisitors = sessions.slice(0, 20).map(s => ({
        time: s.start_time,
        country: s.country_name || s.country_code,
        city: s.city,
        device: s.device_type,
        browser: s.browser,
        pages: s.page_count,
        duration: s.duration_seconds
    }));
    
    // Event types breakdown
    const eventTypes = {};
    events.forEach(e => {
        eventTypes[e.event_type] = (eventTypes[e.event_type] || 0) + 1;
    });
    
    // Time series data (daily)
    const dailyStats = {};
    const dateRange = [];
    for (let i = days; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        dateRange.push(date);
        dailyStats[date] = { visitors: 0, pageViews: 0, events: 0 };
    }
    
    sessions.forEach(s => {
        const date = s.start_time?.split('T')[0];
        if (dailyStats[date]) dailyStats[date].visitors++;
    });
    
    pageViews.forEach(p => {
        const date = p.created_at?.split('T')[0];
        if (dailyStats[date]) dailyStats[date].pageViews++;
    });
    
    events.forEach(e => {
        const date = e.created_at?.split('T')[0];
        if (dailyStats[date]) dailyStats[date].events++;
    });
    
    const timeSeries = dateRange.map(date => ({
        date,
        ...dailyStats[date]
    }));
    
    return {
        summary: {
            unique_visitors: uniqueVisitors,
            total_sessions: totalSessions,
            avg_session_duration: avgSessionDuration,
            bounce_rate: bounceRate,
            total_page_views: pageViews.length,
            total_events: events.length
        },
        by_country: byCountry,
        by_device: devicePercentages,
        top_pages: topPages,
        recent_visitors: recentVisitors,
        event_types: eventTypes,
        time_series: timeSeries
    };
}

export async function getPageAnalytics(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: pageViews } = await supabase
        .from('analytics_page_views')
        .select('*')
        .gte('created_at', cutoff);
    
    if (!pageViews) return [];
    
    const pageStats = {};
    pageViews.forEach(p => {
        if (!pageStats[p.page_path]) {
            pageStats[p.page_path] = {
                views: 0,
                total_time: 0,
                total_scroll: 0,
                total_clicks: 0,
                unique_visitors: new Set()
            };
        }
        const stat = pageStats[p.page_path];
        stat.views++;
        if (p.time_on_page) stat.total_time += p.time_on_page;
        if (p.scroll_depth) stat.total_scroll += p.scroll_depth;
        if (p.click_count) stat.total_clicks += p.click_count;
        if (p.user_id) stat.unique_visitors.add(p.user_id);
        if (p.session_id) stat.unique_visitors.add(p.session_id);
    });
    
    // Calculate averages
    return Object.entries(pageStats)
        .map(([path, stats]) => ({
            path,
            views: stats.views,
            unique_visitors: stats.unique_visitors.size,
            avg_time_on_page: stats.views > 0 ? Math.round(stats.total_time / stats.views) : 0,
            avg_scroll_depth: stats.views > 0 ? Math.round(stats.total_scroll / stats.views) : 0,
            total_clicks: stats.total_clicks,
            avg_clicks_per_view: stats.views > 0 ? (stats.total_clicks / stats.views).toFixed(2) : 0
        }))
        .sort((a, b) => b.views - a.views);
}

export async function getUserActivity(userId, days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const [sessionsResult, pageViewsResult, eventsResult] = await Promise.all([
        supabase.from('analytics_sessions').select('*').eq('user_id', userId).gte('start_time', cutoff).order('start_time', { ascending: false }),
        supabase.from('analytics_page_views').select('*').eq('user_id', userId).gte('created_at', cutoff).order('created_at', { ascending: false }),
        supabase.from('analytics_events').select('*').eq('user_id', userId).gte('created_at', cutoff).order('created_at', { ascending: false })
    ]);
    
    const sessions = sessionsResult.data || [];
    const pageViews = pageViewsResult.data || [];
    const events = eventsResult.data || [];
    
    const totalTimeSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    
    return {
        user_id: userId,
        summary: {
            total_sessions: sessions.length,
            total_page_views: pageViews.length,
            total_events: events.length,
            total_time_spent_minutes: Math.round(totalTimeSeconds / 60),
            last_active: sessions[0]?.start_time || null,
            first_active: sessions[sessions.length - 1]?.start_time || null
        },
        sessions: sessions.map(s => ({
            id: s.session_id,
            start: s.start_time,
            duration: s.duration_seconds,
            pages: s.page_count,
            device: s.device_type,
            country: s.country_name,
            city: s.city
        })),
        page_views: pageViews.map(p => ({
            path: p.page_path,
            title: p.page_title,
            time: p.created_at,
            time_on_page: p.time_on_page,
            scroll_depth: p.scroll_depth
        })),
        events: events.map(e => ({
            type: e.event_type,
            data: e.event_data,
            time: e.created_at,
            page: e.page_path
        }))
    };
}

export async function getActiveUsers() {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: sessions } = await supabase
        .from('analytics_sessions')
        .select('session_id, user_id, device_type, country_name, city, page_count, last_page')
        .gte('last_activity', fifteenMinsAgo)
        .is('end_time', null);
    
    const activeCount = sessions?.length || 0;
    const uniqueUsers = new Set(sessions?.map(s => s.user_id).filter(Boolean)).size;
    
    return {
        count: activeCount,
        unique_users: uniqueUsers,
        sessions: sessions || [],
        timestamp: new Date().toISOString()
    };
}

export async function getConversionFunnel(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // Define funnel stages
    const stages = [
        { key: 'visitor', label: 'Visitors', eventType: null },
        { key: 'job_viewer', label: 'Viewed Jobs', eventType: 'job_view' },
        { key: 'job_applier', label: 'Applied to Jobs', eventType: 'job_apply' },
        { key: 'course_starter', label: 'Started Course', eventType: 'course_start' },
        { key: 'course_completer', label: 'Completed Course', eventType: 'course_complete' },
        { key: 'assessment_taker', label: 'Took Assessment', eventType: 'assessment_start' }
    ];
    
    // Get unique visitors
    const { data: sessions } = await supabase
        .from('analytics_sessions')
        .select('visitor_id')
        .gte('start_time', cutoff);
    
    const uniqueVisitors = new Set(sessions?.map(s => s.visitor_id)).size;
    
    // Get counts for each stage
    const funnel = [];
    let previousCount = uniqueVisitors;
    
    for (const stage of stages) {
        let count = previousCount;
        
        if (stage.eventType) {
            const { data: events } = await supabase
                .from('analytics_events')
                .select('user_id')
                .eq('event_type', stage.eventType)
                .gte('created_at', cutoff);
            
            count = new Set(events?.map(e => e.user_id).filter(Boolean)).size;
        }
        
        funnel.push({
            stage: stage.key,
            label: stage.label,
            count: count,
            conversion_rate: uniqueVisitors > 0 ? Math.round((count / uniqueVisitors) * 100) : 0,
            drop_off: previousCount - count,
            drop_off_rate: previousCount > 0 ? Math.round(((previousCount - count) / previousCount) * 100) : 0
        });
        
        previousCount = count;
    }
    
    return { funnel, total_visitors: uniqueVisitors, days };
}

// ============================================
// INITIALIZATION
// ============================================

export async function initAnalytics() {
    if (isInitialized) return;
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        try {
            await startSession();
            
            // Track initial page view
            await trackPageView(window.location.pathname, document.title);
            
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
            console.log('Analytics initialized successfully');
        } catch (error) {
            console.error('Analytics initialization failed:', error);
        }
    })();
    
    return initPromise;
}

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
    trackChatInteraction,
    trackServiceRequest,
    trackProposalSent,
    trackEngagementStarted,
    trackEngagementCompleted,
    trackNewsletterSignup,
    trackSearchPerformed,
    getVisitorAnalytics,
    getPageAnalytics,
    getUserActivity,
    getActiveUsers,
    getConversionFunnel
};
