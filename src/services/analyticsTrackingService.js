// src/services/analyticsTrackingService.js
// Complete user analytics tracking service

import { supabase } from '../lib/supabase';

// ============================================
// SESSION MANAGEMENT
// ============================================

let currentSessionId = null;
let sessionStartTime = null;

export async function startSession() {
    try {
        // Get or create session ID
        let sessionId = sessionStorage.getItem('analytics_session_id');
        const visitorId = getVisitorId();
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get geolocation data
        const geoData = await getGeolocation();
        
        // Get device info
        const deviceInfo = getDeviceInfo();
        
        // Get referrer
        const referrer = document.referrer || 'direct';
        
        if (!sessionId) {
            // Create new session
            const { data, error } = await supabase
                .from('user_sessions')
                .insert({
                    session_id: generateSessionId(),
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
                    referrer: referrer,
                    landing_page: window.location.pathname,
                    started_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (data) {
                sessionId = data.session_id;
                sessionStorage.setItem('analytics_session_id', sessionId);
                sessionStorage.setItem('session_start', Date.now().toString());
            }
        } else {
            // Update existing session (keep alive)
            await supabase
                .from('user_sessions')
                .update({ 
                    ended_at: new Date().toISOString(),
                    duration_seconds: Math.floor((Date.now() - (parseInt(sessionStorage.getItem('session_start') || Date.now())) / 1000))
                })
                .eq('session_id', sessionId);
        }
        
        currentSessionId = sessionId;
        sessionStartTime = Date.now();
        
        return sessionId;
    } catch (error) {
        console.error('Session start error:', error);
        return null;
    }
}

export async function endSession() {
    if (currentSessionId && sessionStartTime) {
        const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
        await supabase
            .from('user_sessions')
            .update({ 
                ended_at: new Date().toISOString(),
                duration_seconds: duration
            })
            .eq('session_id', currentSessionId);
    }
}

// ============================================
// PAGE VIEW TRACKING
// ============================================

let pageViewStartTime = null;
let currentPagePath = null;

export async function trackPageView(pagePath, pageTitle) {
    try {
        const sessionId = await getCurrentSession();
        const { data: { user } } = await supabase.auth.getUser();
        
        // End previous page view timing
        if (currentPagePath && pageViewStartTime) {
            const timeOnPage = Math.floor((Date.now() - pageViewStartTime) / 1000);
            await supabase
                .from('page_views')
                .update({ time_on_page: timeOnPage })
                .eq('session_id', sessionId)
                .eq('page_path', currentPagePath);
        }
        
        // Record new page view
        const { data, error } = await supabase
            .from('page_views')
            .insert({
                session_id: sessionId,
                user_id: user?.id,
                page_path: pagePath,
                page_title: pageTitle,
                referrer: document.referrer,
                created_at: new Date().toISOString()
            })
            .select();
        
        // Reset timing for new page
        pageViewStartTime = Date.now();
        currentPagePath = pagePath;
        
        return data;
    } catch (error) {
        console.error('Page view tracking error:', error);
    }
}

export async function updatePageViewMetrics(scrollDepth = null, clickCount = null) {
    if (currentPagePath && currentSessionId) {
        const updates = {};
        if (scrollDepth !== null) updates.scroll_depth = scrollDepth;
        if (clickCount !== null) updates.click_count = clickCount;
        
        if (Object.keys(updates).length > 0) {
            await supabase
                .from('page_views')
                .update(updates)
                .eq('session_id', currentSessionId)
                .eq('page_path', currentPagePath);
        }
    }
}

// ============================================
// USER EVENT TRACKING
// ============================================

export async function trackEvent(eventType, eventData = {}, pagePath = null) {
    try {
        const sessionId = await getCurrentSession();
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase
            .from('user_events')
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

// ============================================
// ANALYTICS QUERIES (for Admin Dashboard)
// ============================================

export async function getVisitorAnalytics(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // Get sessions with location data
    const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('started_at', cutoff)
        .order('started_at', { ascending: false });
    
    // Get page views
    const { data: pageViews } = await supabase
        .from('page_views')
        .select('*')
        .gte('created_at', cutoff);
    
    // Get user events
    const { data: events } = await supabase
        .from('user_events')
        .select('*')
        .gte('created_at', cutoff);
    
    // Calculate statistics
    const uniqueVisitors = new Set(sessions?.map(s => s.visitor_id)).size;
    const totalSessions = sessions?.length || 0;
    const avgSessionDuration = sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / (totalSessions || 1);
    
    // Group by country
    const byCountry = {};
    sessions?.forEach(s => {
        const country = s.country_name || s.country_code || 'Unknown';
        byCountry[country] = (byCountry[country] || 0) + 1;
    });
    
    // Group by device
    const byDevice = { mobile: 0, desktop: 0, tablet: 0 };
    sessions?.forEach(s => {
        if (byDevice[s.device_type] !== undefined) byDevice[s.device_type]++;
    });
    
    // Top pages
    const pageCounts = {};
    pageViews?.forEach(p => {
        pageCounts[p.page_path] = (pageCounts[p.page_path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    
    // Recent visitors (with details)
    const recentVisitors = sessions?.slice(0, 20).map(s => ({
        time: s.started_at,
        country: s.country_name || s.country_code,
        city: s.city,
        device: s.device_type,
        browser: s.browser,
        pages: pageViews?.filter(p => p.session_id === s.session_id).length || 0,
        duration: s.duration_seconds
    })) || [];
    
    return {
        summary: {
            unique_visitors: uniqueVisitors,
            total_sessions: totalSessions,
            avg_session_duration: Math.round(avgSessionDuration / 60),
            bounce_rate: Math.round((sessions?.filter(s => (pageViews?.filter(p => p.session_id === s.session_id).length || 0) === 1).length / totalSessions) * 100) || 0
        },
        by_country: byCountry,
        by_device: byDevice,
        top_pages: topPages,
        recent_visitors: recentVisitors,
        total_events: events?.length || 0
    };
}

export async function getUserActivity(userId, days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', cutoff)
        .order('started_at', { ascending: false });
    
    const { data: pageViews } = await supabase
        .from('page_views')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', cutoff);
    
    const { data: events } = await supabase
        .from('user_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', cutoff);
    
    return {
        total_sessions: sessions?.length || 0,
        total_page_views: pageViews?.length || 0,
        total_events: events?.length || 0,
        total_time_spent: sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60 || 0,
        last_active: sessions?.[0]?.started_at,
        pages: pageViews?.map(p => p.page_path),
        events: events?.map(e => ({ type: e.event_type, data: e.event_data, time: e.created_at }))
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getCurrentSession() {
    if (currentSessionId) return currentSessionId;
    
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
        await startSession();
        sessionId = sessionStorage.getItem('analytics_session_id');
    }
    currentSessionId = sessionId;
    return sessionId;
}

function generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function getVisitorId() {
    let id = localStorage.getItem('visitor_id');
    if (!id) {
        id = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('visitor_id', id);
    }
    return id;
}

async function getGeolocation() {
    try {
        // Using ipapi.co for geolocation (free, no API key)
        const response = await fetch('https://ipapi.co/json/', {
            headers: { 'User-Agent': 'ODUSBABA-Analytics/1.0' }
        });
        if (response.ok) {
            const data = await response.json();
            return {
                ip: data.ip,
                country_code: data.country_code,
                country_name: data.country_name,
                city: data.city,
                latitude: data.latitude,
                longitude: data.longitude
            };
        }
    } catch (error) {
        console.warn('Geolocation failed:', error);
    }
    return { country_code: 'unknown', country_name: 'Unknown', city: 'Unknown' };
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) deviceType = 'tablet';
    else if (/(Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|BB10|webOS|Silk)/i.test(ua)) deviceType = 'mobile';
    
    let browser = 'Unknown';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'MacOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    
    return {
        deviceType,
        browser,
        os,
        screenResolution: `${screen.width}x${screen.height}`
    };
}
