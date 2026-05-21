// src/services/analyticsService.js
// COMPLETELY DISABLED - No external API calls, no page crashes

import { supabase } from '../lib/supabase';

// All functions are disabled to prevent errors
// The site will work perfectly without analytics

export async function trackPageView(pagePath, pageTitle) {
    // Disabled - prevents all CORS and API errors
    return;
}

export async function trackUserActivity(userId, actionType, details = {}) {
    // Disabled
    return;
}

export async function getVisitorStats(days = 30) {
    // Return empty data structure
    return { total_visits: 0, unique_visitors: 0, by_device: { mobile: 0, desktop: 0, tablet: 0 } };
}

export async function getPageAnalytics(days = 30) {
    return [];
}

export async function getGrowthMetrics(days = 30) {
    return [];
}
