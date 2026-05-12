// src/services/healthService.js
// COMPLETE HEALTH SERVICE WITH CORRECT SMTP DETECTION

import { supabase } from '../lib/supabase';

export async function checkSystemHealth() {
    const results = {
        overall: 'healthy',
        checks: [],
        timestamp: new Date().toISOString()
    };
    
    // 1. Check Supabase Database
    try {
        const start = Date.now();
        const { error, count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        results.checks.push({
            service: 'Supabase Database',
            status: error ? 'degraded' : 'healthy',
            responseTimeMs: Date.now() - start,
            details: error ? error.message : `${count || 0} users`
        });
    } catch (err) {
        results.checks.push({ service: 'Supabase Database', status: 'down', responseTimeMs: 0, details: err.message });
        results.overall = 'degraded';
    }
    
    // 2. Check Storage
    try {
        const start = Date.now();
        await supabase.storage.listBuckets();
        results.checks.push({
            service: 'Storage Service',
            status: 'healthy',
            responseTimeMs: Date.now() - start,
            details: 'Storage accessible'
        });
    } catch (err) {
        results.checks.push({ service: 'Storage Service', status: 'down', responseTimeMs: 0, details: err.message });
        results.overall = 'degraded';
    }
    
    // 3. Check Auth
    try {
        const start = Date.now();
        await supabase.auth.getSession();
        results.checks.push({
            service: 'Auth Service',
            status: 'healthy',
            responseTimeMs: Date.now() - start,
            details: 'Authentication service running'
        });
    } catch (err) {
        results.checks.push({ service: 'Auth Service', status: 'degraded', responseTimeMs: 0, details: err.message });
    }
    
    // 4. Check OpenAI
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    results.checks.push({
        service: 'OpenAI API',
        status: openaiKey ? 'healthy' : 'degraded',
        responseTimeMs: 0,
        details: openaiKey ? 'API key configured' : 'API key missing'
    });
    if (!openaiKey) results.overall = 'degraded';
    
    // 5. Check Email Service - FIXED with correct env variables
    const smtpHost = process.env.SMTP_HOST || import.meta.env.VITE_SMTP_HOST;
    const smtpUser = process.env.SMTP_USER || import.meta.env.VITE_SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD || import.meta.env.VITE_SMTP_PASSWORD;
    const emailConfigured = !!(smtpHost && smtpUser && smtpPassword);
    
    results.checks.push({
        service: 'Email Service',
        status: emailConfigured ? 'healthy' : 'degraded',
        responseTimeMs: 0,
        details: emailConfigured ? 'SMTP configured and ready' : 'SMTP credentials missing - email sending unavailable'
    });
    if (!emailConfigured) results.overall = 'degraded';
    
    // Log to database
    for (const check of results.checks) {
        await supabase.from('system_health_logs').insert({
            service_name: check.service,
            status: check.status,
            response_time_ms: check.responseTimeMs,
            details: { message: check.details },
            checked_at: new Date().toISOString()
        });
    }
    
    return results;
}

export async function getHealthHistory(hours = 24, limit = 100) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
        .from('system_health_logs')
        .select('*')
        .gte('checked_at', cutoff)
        .order('checked_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data || [];
}

export async function getCurrentServiceStatus() {
    const { data, error } = await supabase
        .from('system_health_logs')
        .select('DISTINCT ON (service_name) service_name, status, response_time_ms, checked_at')
        .order('service_name')
        .order('checked_at', { ascending: false });
    
    if (error) throw error;
    
    const statusMap = {};
    for (const log of data || []) {
        statusMap[log.service_name] = {
            status: log.status,
            responseTime: log.response_time_ms,
            lastChecked: log.checked_at
        };
    }
    
    return statusMap;
}
