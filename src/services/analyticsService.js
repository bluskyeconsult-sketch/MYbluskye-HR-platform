// src/services/analyticsService.js
// COMPLETE FIX - No external API calls, no CORS errors

import { supabase } from '../lib/supabase';

// ============================================
// GEOLOCATION - COMPLETELY DISABLED
// ============================================

// Return static values - no external API calls
const getGeolocation = () => {
    return { 
        country_code: 'unknown', 
        country_name: 'Unknown', 
        city: 'Unknown',
        latitude: null,
        longitude: null
    };
};

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

// ============================================
// PAGE VIEW TRACKING (No geolocation)
// ============================================

export async function trackPageView(pagePath, pageTitle) {
    try {
        const sessionId = generateSessionId();
        const visitorId = getVisitorId();
        const deviceType = getDeviceType();
        
        const { data: { user } } = await supabase.auth.getUser();
        
        // Insert without geolocation fields to avoid column errors
        await supabase.from('page_analytics').insert({
            page_path: pagePath,
            page_title: pageTitle,
            visitor_id: visitorId,
            user_id: user?.id,
            session_id: sessionId,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            device_type: deviceType,
            created_at: new Date().toISOString()
        });
        
    } catch (error) {
        // Silently fail - analytics never break the website
        console.debug('Analytics disabled');
    }
}

// ============================================
// USER ACTIVITY TRACKING
// ============================================

export async function trackUserActivity(userId, actionType, details = {}) {
    try {
        if (!userId) return;
        
        await supabase.from('user_activity_logs').insert({
            user_id: userId,
            action_type: actionType,
            details: details,
            created_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.debug('Activity tracking disabled');
    }
}

// ============================================
// ANALYTICS QUERIES (Read-only)
// ============================================

export async function getVisitorStats(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
            .from('page_analytics')
            .select('device_type, visitor_id, created_at')
            .gte('created_at', cutoff);
        
        if (error) throw error;
        
        const uniqueVisitors = new Set();
        const byDevice = { mobile: 0, desktop: 0, tablet: 0 };
        
        for (const visit of data || []) {
            uniqueVisitors.add(visit.visitor_id);
            if (byDevice[visit.device_type] !== undefined) {
                byDevice[visit.device_type]++;
            }
        }
        
        return {
            total_visits: data?.length || 0,
            unique_visitors: uniqueVisitors.size,
            by_device: byDevice
        };
    } catch (error) {
        return { total_visits: 0, unique_visitors: 0, by_device: { mobile: 0, desktop: 0, tablet: 0 } };
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
            .sort((a, b) => b.views - a.views);
    } catch (error) {
        return [];
    }
}

export async function getGrowthMetrics(days = 30) {
    try {
        const { data, error } = await supabase
            .from('growth_metrics')
            .select('*')
            .order('metric_date', { ascending: false })
            .limit(days);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        return [];
    }
}
