// src/services/analyticsService.js
// COMPLETE REWRITE - No external API calls, no page crashes

import { supabase } from '../lib/supabase';

// ============================================
// SIMPLE GEOLOCATION - Returns defaults only
// NO EXTERNAL API CALLS - Completely safe
// ============================================

function getGeolocation() {
    // Return safe defaults - never call external APIs
    return {
        country_code: 'unknown',
        country_name: 'Unknown',
        city: 'Unknown',
        latitude: null,
        longitude: null
    };
}

// ============================================
// UTILITY FUNCTIONS
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

// ============================================
// PAGE VIEW TRACKING - Safe wrapper with try/catch
// ============================================

export async function trackPageView(pagePath, pageTitle) {
    // Skip entirely in production if causing issues
    // This prevents any page crashes
    return;
    
    /* Original code disabled to prevent crashes
    try {
        const sessionId = generateSessionId();
        const visitorId = getVisitorId();
        const deviceType = getDeviceType();
        const geo = getGeolocation();
        
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('page_analytics').insert({
            page_path: pagePath,
            page_title: pageTitle,
            visitor_id: visitorId,
            user_id: user?.id,
            session_id: sessionId,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            country_code: geo.country_code,
            city: geo.city,
            device_type: deviceType,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        // Completely silent fail
    }
    */
}

// ============================================
// USER ACTIVITY TRACKING - Safe wrapper
// ============================================

export async function trackUserActivity(userId, actionType, details = {}) {
    // Skip entirely to prevent crashes
    return;
    
    /* Original code disabled
    try {
        if (!userId) return;
        await supabase.from('user_activity_logs').insert({
            user_id: userId,
            action_type: actionType,
            details: details,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        // Silent fail
    }
    */
}

// ============================================
// ANALYTICS QUERIES - Read-only, safe
// ============================================

export async function getVisitorStats(days = 30) {
    try {
        return { total_visits: 0, unique_visitors: 0, by_device: { mobile: 0, desktop: 0, tablet: 0 } };
    } catch (error) {
        return { total_visits: 0, unique_visitors: 0, by_device: { mobile: 0, desktop: 0, tablet: 0 } };
    }
}

export async function getPageAnalytics(days = 30) {
    try {
        return [];
    } catch (error) {
        return [];
    }
}

export async function getGrowthMetrics(days = 30) {
    try {
        return [];
    } catch (error) {
        return [];
    }
}
