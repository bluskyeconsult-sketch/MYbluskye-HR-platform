// src/services/healthService.js
// Complete System Health Monitoring Service
// Features: Real-time service checks, health history, status tracking

import { supabase } from '../lib/supabase';

// ============================================
// CORE HEALTH CHECK FUNCTIONS
// ============================================

export async function checkSystemHealth() {
    const results = {
        overall: 'healthy',
        checks: [],
        timestamp: new Date().toISOString()
    };
    
    // 1. Check Supabase Database Connection
    try {
        const start = Date.now();
        const { error, data } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        const responseTime = Date.now() - start;
        
        results.checks.push({
            service: 'Supabase Database',
            status: error ? 'degraded' : 'healthy',
            responseTimeMs: responseTime,
            details: error ? error.message : `Connected, ${data?.count || 0} users`,
            endpoint: 'profiles'
        });
    } catch (error) {
        results.checks.push({
            service: 'Supabase Database',
            status: 'down',
            responseTimeMs: 0,
            details: error.message,
            endpoint: 'profiles'
        });
        results.overall = 'degraded';
    }
    
    // 2. Check Supabase Storage
    try {
        const start = Date.now();
        const { data: buckets, error } = await supabase.storage.listBuckets();
        const responseTime = Date.now() - start;
        
        results.checks.push({
            service: 'Storage Service',
            status: error ? 'degraded' : 'healthy',
            responseTimeMs: responseTime,
            details: error ? error.message : `${buckets?.length || 0} buckets available`,
            endpoint: 'storage'
        });
    } catch (error) {
        results.checks.push({
            service: 'Storage Service',
            status: 'down',
            responseTimeMs: 0,
            details: error.message,
            endpoint: 'storage'
        });
        results.overall = 'degraded';
    }
    
    // 3. Check Auth Service
    try {
        const start = Date.now();
        const { data: { session }, error } = await supabase.auth.getSession();
        const responseTime = Date.now() - start;
        
        results.checks.push({
            service: 'Auth Service',
            status: error ? 'degraded' : 'healthy',
            responseTimeMs: responseTime,
            details: error ? error.message : session ? 'Authenticated session available' : 'Anonymous access',
            endpoint: 'auth'
        });
    } catch (error) {
        results.checks.push({
            service: 'Auth Service',
            status: 'degraded',
            responseTimeMs: 0,
            details: error.message,
            endpoint: 'auth'
        });
    }
    
    // 4. Check OpenAI API (if configured)
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (openaiKey) {
        try {
            const start = Date.now();
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${openaiKey}` }
            });
            const responseTime = Date.now() - start;
            
            results.checks.push({
                service: 'OpenAI API',
                status: response.ok ? 'healthy' : 'degraded',
                responseTimeMs: responseTime,
                details: response.ok ? 'API responsive' : `Status: ${response.status}`,
                endpoint: 'openai'
            });
        } catch (error) {
            results.checks.push({
                service: 'OpenAI API',
                status: 'degraded',
                responseTimeMs: 0,
                details: error.message,
                endpoint: 'openai'
            });
        }
    } else {
        results.checks.push({
            service: 'OpenAI API',
            status: 'degraded',
            responseTimeMs: 0,
            details: 'API key not configured',
            endpoint: 'openai'
        });
    }
    
    // 5. Check Email Service Configuration
    const smtpHost = import.meta.env.VITE_SMTP_HOST || process.env.SMTP_HOST;
    const smtpUser = import.meta.env.VITE_SMTP_USER || process.env.SMTP_USER;
    
    results.checks.push({
        service: 'Email Service',
        status: (smtpHost && smtpUser) ? 'healthy' : 'degraded',
        responseTimeMs: 0,
        details: (smtpHost && smtpUser) ? 'SMTP configured' : 'SMTP credentials missing',
        endpoint: 'smtp'
    });
    
    // 6. Check API Routes
    try {
        const start = Date.now();
        const response = await fetch('/api/health', { method: 'HEAD' }).catch(() => null);
        const responseTime = Date.now() - start;
        
        results.checks.push({
            service: 'API Routes',
            status: response ? 'healthy' : 'degraded',
            responseTimeMs: responseTime,
            details: response ? 'API endpoints reachable' : 'API check failed',
            endpoint: 'api'
        });
    } catch (error) {
        results.checks.push({
            service: 'API Routes',
            status: 'degraded',
            responseTimeMs: 0,
            details: error.message,
            endpoint: 'api'
        });
    }
    
    // Determine overall status
    const hasDown = results.checks.some(c => c.status === 'down');
    const hasDegraded = results.checks.some(c => c.status === 'degraded');
    
    if (hasDown) results.overall = 'critical';
    else if (hasDegraded) results.overall = 'degraded';
    else results.overall = 'healthy';
    
    // Log to database
    await logHealthCheck(results);
    
    return results;
}

// ============================================
// HEALTH CHECK LOGGING
// ============================================

async function logHealthCheck(results) {
    for (const check of results.checks) {
        await supabase.from('system_health_logs').insert({
            service_name: check.service,
            status: check.status,
            response_time_ms: check.responseTimeMs,
            details: { message: check.details, endpoint: check.endpoint },
            checked_at: new Date().toISOString()
        });
    }
}

// ============================================
// GET HEALTH HISTORY
// ============================================

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

// ============================================
// GET CURRENT SERVICE STATUS
// ============================================

export async function getCurrentServiceStatus() {
    // Get latest status for each service
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

// ============================================
// RUN COMPLETE DIAGNOSTIC
// ============================================

export async function runDiagnostic() {
    const results = {
        timestamp: new Date().toISOString(),
        services: {},
        recommendations: [],
        errors: []
    };
    
    const health = await checkSystemHealth();
    
    for (const check of health.checks) {
        results.services[check.service] = {
            status: check.status,
            responseTime: check.responseTimeMs,
            details: check.details
        };
        
        if (check.status !== 'healthy') {
            results.recommendations.push({
                service: check.service,
                issue: check.details,
                suggestedAction: getSuggestedAction(check.service, check.details)
            });
        }
    }
    
    return results;
}

function getSuggestedAction(service, details) {
    const suggestions = {
        'Supabase Database': 'Check Supabase connection string and network access',
        'Storage Service': 'Verify storage bucket permissions and policies',
        'Auth Service': 'Check auth configuration and session handling',
        'OpenAI API': 'Verify API key and billing status in OpenAI dashboard',
        'Email Service': 'Configure SMTP credentials in environment variables',
        'API Routes': 'Check serverless function logs and deployment status'
    };
    return suggestions[service] || 'Investigate and resolve manually';
}
