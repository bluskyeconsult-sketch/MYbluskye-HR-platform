// src/services/analyticsService.js
// COMPLETE ANALYTICS SERVICE - No CORS errors, safe geolocation fallbacks, growth metrics
// Features: Page view tracking, visitor analytics, growth metrics, location tracking (safe)

import { supabase } from '../lib/supabase';

// ============================================
// SAFE GEOLOCATION - No CORS errors
// ============================================

// Cache geolocation data to avoid repeated attempts
let cachedGeolocation = null;
let geolocationAttempted = false;

async function getGeolocation() {
    // Return cached if available
    if (cachedGeolocation) return cachedGeolocation;
    
    // Don't attempt more than once per session (prevents repeated CORS errors)
    if (geolocationAttempted) {
        return { country_code: 'unknown', city: 'unknown', region: 'unknown' };
    }
    
    geolocationAttempted = true;
    
    // Try multiple geolocation services with fallbacks
    const services = [
        {
            url: 'https://ipapi.co/json/',
            parser: (data) => ({
                country_code: data.country_code || 'unknown',
                country_name: data.country_name || 'Unknown',
                city: data.city || 'unknown',
                region: data.region || 'unknown',
                latitude: data.latitude,
                longitude: data.longitude
            })
        },
        {
            url: 'https://ip-api.com/json/?fields=status,country,countryCode,city,region,lat,lon',
            parser: (data) => ({
                country_code: data.countryCode || 'unknown',
                country_name: data.country || 'Unknown',
                city: data.city || 'unknown',
                region: data.region || 'unknown',
                latitude: data.lat,
                longitude: data.lon
            })
        }
    ];
    
    for (const service of services) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(service.url, { 
                signal: controller.signal,
                headers: { 'User-Agent': 'ODUSBABA-Analytics/1.0' }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                cachedGeolocation = service.parser(data);
                console.debug('Geolocation acquired:', cachedGeolocation.country_code);
                return cachedGeolocation;
            }
        } catch (error) {
            console.debug(`Geolocation service failed: ${service.url}`);
        }
    }
    
    // Final fallback - no geolocation data
    cachedGeolocation = { country_code: 'unknown', city: 'unknown', region: 'unknown' };
    return cachedGeolocation;
}

// ============================================
// SESSION & VISITOR MANAGEMENT
// ============================================

function generateSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
        sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
}

function getVisitorId() {
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
        visitorId = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('visitor_id', visitorId);
    }
    return visitorId;
}

function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) return 'tablet';
    if (/(Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|BB10|webOS|Silk)/i.test(ua)) return 'mobile';
    return 'desktop';
}

function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'unknown';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'IE';
    
    let os = 'unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'MacOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    
    return { browser, os };
}

// ============================================
// PAGE VIEW TRACKING (Safe - no CORS errors)
// ============================================

export async function trackPageView(pagePath, pageTitle) {
    try {
        // Skip tracking if Supabase is not available
        if (!supabase) return;
        
        const sessionId = generateSessionId();
        const visitorId = getVisitorId();
        const deviceType = getDeviceType();
        const { browser, os } = getBrowserInfo();
        const geo = await getGeolocation();
        
        // Get user if logged in (silent fail)
        let userId = null;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id;
        } catch (err) {
            // Not logged in or auth error - continue silently
        }
        
        // Insert page view with error handling
        const { error } = await supabase
            .from('page_analytics')
            .insert({
                page_path: pagePath,
                page_title: pageTitle,
                visitor_id: visitorId,
                user_id: userId,
                session_id: sessionId,
                referrer: document.referrer || null,
                user_agent: navigator.userAgent,
                country_code: geo.country_code,
                city: geo.city,
                region: geo.region,
                device_type: deviceType,
                browser: browser,
                os: os,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.debug('Analytics insert skipped:', error.message);
        }
        
        // Track page view as user activity if logged in
        if (userId) {
            await trackUserActivity(userId, 'page_view', { path: pagePath, title: pageTitle });
        }
        
    } catch (error) {
        // Silently fail - analytics should never break the website
        console.debug('Analytics tracking skipped');
    }
}

// ============================================
// USER ACTIVITY TRACKING
// ============================================

export async function trackUserActivity(userId, actionType, details = {}) {
    try {
        if (!supabase || !userId) return;
        
        const { error } = await supabase
            .from('user_activity_logs')
            .insert({
                user_id: userId,
                action_type: actionType,
                details: details,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.debug('Activity log skipped:', error.message);
        }
        
        // Update growth metrics on login
        if (actionType === 'login') {
            await updateActiveUsers();
        }
        
    } catch (error) {
        console.debug('Activity tracking skipped');
    }
}

// ============================================
// GROWTH METRICS
// ============================================

async function updateActiveUsers() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: existing } = await supabase
            .from('growth_metrics')
            .select('id, active_users')
            .eq('metric_date', today)
            .maybeSingle();
        
        if (existing) {
            await supabase
                .from('growth_metrics')
                .update({ active_users: (existing.active_users || 0) + 1 })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('growth_metrics')
                .insert({
                    metric_date: today,
                    total_users: await getTotalUserCount(),
                    active_users: 1,
                    created_at: new Date().toISOString()
                });
        }
    } catch (error) {
        console.debug('Failed to update active users:', error);
    }
}

async function getTotalUserCount() {
    try {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        return count || 0;
    } catch (error) {
        return 0;
    }
}

// ============================================
// ANALYTICS QUERIES (Read-only, safe)
// ============================================

export async function getVisitorStats(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
            .from('page_analytics')
            .select('country_code, device_type, browser, visitor_id, created_at')
            .gte('created_at', cutoff);
        
        if (error) throw error;
        
        const uniqueVisitors = new Set();
        const byCountry = {};
        const byDevice = { mobile: 0, desktop: 0, tablet: 0 };
        const byBrowser = {};
        const dailyVisits = {};
        
        for (const visit of data || []) {
            uniqueVisitors.add(visit.visitor_id);
            
            const country = visit.country_code || 'unknown';
            byCountry[country] = (byCountry[country] || 0) + 1;
            
            if (byDevice[visit.device_type] !== undefined) {
                byDevice[visit.device_type]++;
            }
            
            const browser = visit.browser || 'unknown';
            byBrowser[browser] = (byBrowser[browser] || 0) + 1;
            
            const date = new Date(visit.created_at).toLocaleDateString();
            dailyVisits[date] = (dailyVisits[date] || 0) + 1;
        }
        
        return {
            total_visits: data?.length || 0,
            unique_visitors: uniqueVisitors.size,
            by_country: byCountry,
            by_device: byDevice,
            by_browser: byBrowser,
            daily_visits: dailyVisits
        };
    } catch (error) {
        console.warn('Failed to get visitor stats:', error);
        return { 
            total_visits: 0, 
            unique_visitors: 0, 
            by_country: {}, 
            by_device: { mobile: 0, desktop: 0, tablet: 0 },
            by_browser: {},
            daily_visits: {}
        };
    }
}

export async function getPageAnalytics(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
            .from('page_analytics')
            .select('page_path, page_title')
            .gte('created_at', cutoff);
        
        if (error) throw error;
        
        const pageStats = {};
        for (const page of data || []) {
            if (!pageStats[page.page_path]) {
                pageStats[page.page_path] = {
                    title: page.page_title,
                    views: 0
                };
            }
            pageStats[page.page_path].views++;
        }
        
        return Object.entries(pageStats)
            .map(([path, stats]) => ({ path, ...stats }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 20);
    } catch (error) {
        console.warn('Failed to get page analytics:', error);
        return [];
    }
}

export async function getGrowthMetrics(days = 30) {
    try {
        const { data, error } = await supabase
            .from('growth_metrics')
            .select('*')
            .order('metric_date', { ascending: true })
            .limit(days);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.warn('Failed to get growth metrics:', error);
        return [];
    }
}

export async function getUserActivityStats(days = 30, userId = null) {
    try {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        let query = supabase
            .from('user_activity_logs')
            .select('action_type')
            .gte('created_at', cutoff);
        
        if (userId) {
            query = query.eq('user_id', userId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        const activityStats = {};
        for (const log of data || []) {
            activityStats[log.action_type] = (activityStats[log.action_type] || 0) + 1;
        }
        
        return activityStats;
    } catch (error) {
        console.warn('Failed to get user activity stats:', error);
        return {};
    }
}

export async function getRealtimeVisitors() {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
            .from('page_analytics')
            .select('visitor_id, device_type, country_code')
            .gte('created_at', fiveMinutesAgo);
        
        if (error) throw error;
        
        const uniqueVisitors = new Set();
        for (const visit of data || []) {
            uniqueVisitors.add(visit.visitor_id);
        }
        
        return {
            active_visitors: uniqueVisitors.size,
            recent_visits: data?.length || 0,
            devices: data?.reduce((acc, v) => {
                acc[v.device_type] = (acc[v.device_type] || 0) + 1;
                return acc;
            }, {})
        };
    } catch (error) {
        return { active_visitors: 0, recent_visits: 0, devices: {} };
    }
}

// ============================================
// SESSION MANAGEMENT (For App.jsx)
// ============================================

export async function startSession() {
    try {
        const sessionId = generateSessionId();
        const visitorId = getVisitorId();
        const deviceType = getDeviceType();
        const { browser, os } = getBrowserInfo();
        const geo = await getGeolocation();
        
        let userId = null;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id;
        } catch (err) {
            // Not logged in
        }
        
        await supabase
            .from('analytics_sessions')
            .insert({
                session_id: sessionId,
                visitor_id: visitorId,
                user_id: userId,
                device_type: deviceType,
                browser: browser,
                os: os,
                country_code: geo.country_code,
                city: geo.city,
                start_time: new Date().toISOString()
            });
    } catch (error) {
        console.debug('Session start skipped');
    }
}

export async function endSession() {
    try {
        const sessionId = generateSessionId();
        await supabase
            .from('analytics_sessions')
            .update({ end_time: new Date().toISOString() })
            .eq('session_id', sessionId)
            .is('end_time', null);
    } catch (error) {
        console.debug('Session end skipped');
    }
}

export async function initAnalytics() {
    // Initialize analytics - start session
    await startSession();
}

// ============================================
// EVENT TRACKING
// ============================================

export async function trackEvent(eventType, eventData = {}) {
    try {
        const sessionId = generateSessionId();
        
        let userId = null;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id;
        } catch (err) {
            // Not logged in
        }
        
        await supabase
            .from('analytics_events')
            .insert({
                session_id: sessionId,
                user_id: userId,
                event_type: eventType,
                event_data: eventData,
                page_url: window.location.pathname,
                created_at: new Date().toISOString()
            });
    } catch (error) {
        console.debug('Event tracking skipped');
    }
}

export async function updatePageViewMetrics(scrollPercent, clickCount) {
    // Optional: update metrics for the current page view
    // This can be implemented later if needed
}

// ============================================
// LOCATION STATS (For admin dashboard)
// ============================================

export async function getVisitorsByLocation(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
            .from('page_analytics')
            .select('country_code, city')
            .gte('created_at', cutoff);
        
        if (error) throw error;
        
        const locationStats = {};
        for (const visit of data || []) {
            const country = visit.country_code || 'unknown';
            if (!locationStats[country]) {
                locationStats[country] = { visits: 0, cities: {} };
            }
            locationStats[country].visits++;
            
            if (visit.city && visit.city !== 'unknown') {
                locationStats[country].cities[visit.city] = (locationStats[country].cities[visit.city] || 0) + 1;
            }
        }
        
        return locationStats;
    } catch (error) {
        return {};
    }
}
