// src/services/securityService.js
// Complete Security Monitoring Service
// Features: Event logging, IP blocking, threat detection, security analytics

import { supabase } from '../lib/supabase';

// ============================================
// SECURITY EVENT LOGGING
// ============================================

export async function logSecurityEvent(eventType, severity, details, ip = null, userId = null, path = null) {
    try {
        // Get client IP if not provided
        let clientIp = ip;
        if (!clientIp) {
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                clientIp = ipData.ip;
            } catch (err) {
                clientIp = 'unknown';
            }
        }
        
        const { data, error } = await supabase.from('security_events').insert({
            event_type: eventType,
            severity: severity,
            ip_address: clientIp,
            user_id: userId,
            path: path,
            user_agent: navigator.userAgent,
            details: details,
            created_at: new Date().toISOString()
        }).select();
        
        if (error) throw error;
        
        // Auto-block on brute force (handled by database trigger)
        return { success: true, eventId: data?.[0]?.id };
    } catch (error) {
        console.error('Failed to log security event:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// IP BLOCKING MANAGEMENT
// ============================================

export async function blockIP(ipAddress, reason, hours = 48) {
    const { data, error } = await supabase
        .from('blocked_ips')
        .insert({
            ip_address: ipAddress,
            reason: reason,
            expires_at: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) throw error;
    
    // Log the block action
    await logSecurityEvent('ip_blocked', 'high', { reason: reason, ip: ipAddress }, ipAddress);
    
    return { success: true, blockId: data.id };
}

export async function unblockIP(ipAddress) {
    const { error } = await supabase
        .from('blocked_ips')
        .delete()
        .eq('ip_address', ipAddress);
    
    if (error) throw error;
    return { success: true };
}

export async function getBlockedIPs() {
    const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

export async function isIPBlocked(ipAddress) {
    const { data, error } = await supabase
        .from('blocked_ips')
        .select('id')
        .eq('ip_address', ipAddress)
        .gt('expires_at', new Date().toISOString())
        .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
}

// ============================================
// SECURITY ANALYTICS
// ============================================

export async function getSecurityStats(days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
        .from('security_events')
        .select('event_type, severity, created_at')
        .gte('created_at', cutoff);
    
    if (error) throw error;
    
    const stats = {
        total: data?.length || 0,
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        daily: {}
    };
    
    for (const event of data || []) {
        // By type
        stats.byType[event.event_type] = (stats.byType[event.event_type] || 0) + 1;
        
        // By severity
        if (stats.bySeverity[event.severity] !== undefined) {
            stats.bySeverity[event.severity]++;
        }
        
        // By day
        const date = new Date(event.created_at).toLocaleDateString();
        stats.daily[date] = (stats.daily[date] || 0) + 1;
    }
    
    return stats;
}

export async function getRecentSecurityEvents(limit = 50) {
    const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data || [];
}

// ============================================
// THREAT DETECTION
// ============================================

export async function detectThreats() {
    const threats = [];
    
    // Check for brute force patterns
    const { data: failedLogins } = await supabase
        .from('security_events')
        .select('ip_address, count')
        .eq('event_type', 'failed_login')
        .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .select('ip_address');
    
    const ipCounts = {};
    for (const event of failedLogins || []) {
        ipCounts[event.ip_address] = (ipCounts[event.ip_address] || 0) + 1;
    }
    
    for (const [ip, count] of Object.entries(ipCounts)) {
        if (count >= 5) {
            threats.push({
                type: 'brute_force',
                severity: 'high',
                ip: ip,
                count: count,
                message: `${count} failed login attempts from ${ip} in 15 minutes`
            });
        }
    }
    
    // Check for SQL injection attempts
    const { data: sqlAttempts } = await supabase
        .from('security_events')
        .select('*')
        .eq('event_type', 'sql_injection_attempt')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    
    if (sqlAttempts?.length > 0) {
        threats.push({
            type: 'sql_injection',
            severity: 'critical',
            count: sqlAttempts.length,
            message: `${sqlAttempts.length} SQL injection attempts detected`
        });
    }
    
    return threats;
}
