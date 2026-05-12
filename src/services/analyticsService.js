// src/services/analyticsService.js
// Complete Analytics Service
// Features: Page view tracking, visitor analytics, growth metrics, location tracking

import { supabase } from '../lib/supabase';

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

async function getGeolocation() {
    try {
        // Use ipapi.co for geolocation (free, no API key required)
        const response = await fetch('https://ipapi.co/json/', { 
            headers: { 'User-Agent': 'ODUSBABA-Analytics/1.0' }
        });
        if (response.ok) {
            const data = await response.json();
            return {
                country_code: data.country_code,
                country_name: data.country_name,
                city: data.city,
                region: data.region,
                latitude: data.latitude,
                longitude: data.longitude
            };
        }
    } catch (error) {
        console.warn('Geolocation failed:', error);
    }
    return { country_code: 'unknown', city: 'unknown' };
}

// ============================================
// PAGE VIEW TRACKING
// ============================================

export async function trackPageView(pagePath, pageTitle) {
    try {
        const sessionId = generateSessionId();
        const visitorId = getVisitorId();
        const deviceType = getDeviceType();
        const geo = await getGeolocation();
        
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
        
        // Track page view as user activity if logged in
        if (user?.id) {
            await trackUserActivity(user.id, 'page_view', { path: pagePath, title: pageTitle });
        }
        
    } catch (error) {
        console.error('Failed to track page view:', error);
    }
}

// ============================================
// USER ACTIVITY TRACKING
// ============================================

export async function trackUserActivity(userId, actionType, details = {}) {
    try {
        // Get client IP
        let ip = 'unknown';
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            ip = ipData.ip;
        } catch (err) {
            // Silent fail
        }
        
        await supabase.from('user_activity_logs').insert({
            user_id: userId,
            action_type: actionType,
            details: details,
            ip_address: ip,
            created_at: new Date().toISOString()
        });
        
        // Update growth metrics if login
        if (actionType === 'login') {
            await updateActiveUsers();
        }
        
    } catch (error) {
        console.error('Failed to track user activity:', error);
    }
}

// ============================================
// GROWTH METRICS
// ============================================

async function updateActiveUsers() {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing } = await supabase
        .from('growth_metrics')
        .select('id, active_users')
        .eq('metric_date', today)
        .single();
    
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
                active_users: 1
            });
    }
}

async function getTotalUserCount() {
    const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    return count || 0;
}

// ============================================
// ANALYTICS QUERIES
// ============================================

export async function getVisitorStats(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
        .from('page_analytics')
        .select('country_code, device_type, visitor_id, created_at')
        .gte('created_at', cutoff);
    
    if (error) throw error;
    
    const uniqueVisitors = new Set();
    const byCountry = {};
    const byDevice = { mobile: 0, desktop: 0, tablet: 0 };
    const dailyVisits = {};
    
    for (const visit of data || []) {
        uniqueVisitors.add(visit.visitor_id);
        
        const country = visit.country_code || 'unknown';
        byCountry[country] = (byCountry[country] || 0) + 1;
        
        if (byDevice[visit.device_type] !== undefined) {
            byDevice[visit.device_type]++;
        }
        
        const date = new Date(visit.created_at).toLocaleDateString();
        dailyVisits[date] = (dailyVisits[date] || 0) + 1;
    }
    
    return {
        total_visits: data?.length || 0,
        unique_visitors: uniqueVisitors.size,
        by_country: byCountry,
        by_device: byDevice,
        daily_visits: dailyVisits
    };
}

export async function getPageAnalytics(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
        .from('page_analytics')
        .select('page_path, page_title, count')
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
}

export async function getGrowthMetrics(days = 30) {
    const { data, error } = await supabase
        .from('growth_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(days);
    
    if (error) throw error;
    return data || [];
}

export async function getUserActivityStats(days = 30, userId = null) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    let query = supabase
        .from('user_activity_logs')
        .select('action_type, count')
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
}
