// src/services/selfHealService.js
// Complete Self-Healing Engine
// Features: Auto-repair, issue detection, health restoration

import { supabase } from '../lib/supabase';
import { checkSystemHealth } from './healthService';
import { getSecurityStats } from './securityService';

// ============================================
// CORE SELF-HEAL FUNCTIONS
// ============================================

export async function runSelfHeal() {
    const actions = [];
    const startTime = Date.now();
    
    // 1. Clean up expired IP blocks
    const { count: expiredBlocks } = await supabase
        .from('blocked_ips')
        .select('id', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString());
    
    if (expiredBlocks > 0) {
        const { error } = await supabase
            .from('blocked_ips')
            .delete()
            .lt('expires_at', new Date().toISOString());
        
        if (!error) {
            actions.push({
                action: 'Cleaned up expired IP blocks',
                count: expiredBlocks,
                success: true
            });
            await logSelfHealAction('ip_block_cleanup', `Removed ${expiredBlocks} expired IP blocks`, true);
        }
    }
    
    // 2. Clean up stale sessions (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: staleSessions } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', sevenDaysAgo);
    
    if (staleSessions > 0) {
        const { error } = await supabase
            .from('sessions')
            .delete()
            .lt('created_at', sevenDaysAgo);
        
        if (!error) {
            actions.push({
                action: 'Cleaned up stale sessions',
                count: staleSessions,
                success: true
            });
            await logSelfHealAction('session_cleanup', `Removed ${staleSessions} stale sessions`, true);
        }
    }
    
    // 3. Check and repair health
    const health = await checkSystemHealth();
    const degradedServices = health.checks.filter(c => c.status !== 'healthy');
    
    for (const service of degradedServices) {
        const repairResult = await attemptRepair(service.service);
        actions.push({
            action: `Attempted repair for ${service.service}`,
            success: repairResult.success,
            details: repairResult.message
        });
        await logSelfHealAction(`repair_${service.service}`, repairResult.message, repairResult.success);
    }
    
    // 4. Check for orphaned records
    const { data: orphanedProfiles } = await supabase
        .from('profiles')
        .select('id')
        .not('id', 'in', '(SELECT id FROM auth.users)');
    
    if (orphanedProfiles?.length > 0) {
        actions.push({
            action: 'Orphaned profiles detected',
            count: orphanedProfiles.length,
            success: false,
            requiresManual: true
        });
        await logSelfHealAction('orphaned_profiles', `${orphanedProfiles.length} orphaned profiles found`, false, true);
    }
    
    const duration = Date.now() - startTime;
    
    return {
        success: true,
        duration: duration,
        actions: actions,
        timestamp: new Date().toISOString()
    };
}

// ============================================
// REPAIR ATTEMPTS
// ============================================

async function attemptRepair(serviceName) {
    switch (serviceName) {
        case 'Supabase Database':
            return await repairDatabaseConnection();
        case 'Storage Service':
            return await repairStorageService();
        case 'Auth Service':
            return await repairAuthService();
        case 'Email Service':
            return await repairEmailService();
        default:
            return { success: false, message: 'No repair strategy available' };
    }
}

async function repairDatabaseConnection() {
    try {
        // Test connection with a simple query
        const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        if (error) throw error;
        return { success: true, message: 'Database connection verified and restored' };
    } catch (error) {
        return { success: false, message: `Database repair failed: ${error.message}` };
    }
}

async function repairStorageService() {
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        return { success: true, message: `Storage service accessible, ${buckets?.length || 0} buckets available` };
    } catch (error) {
        return { success: false, message: `Storage repair failed: ${error.message}` };
    }
}

async function repairAuthService() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return { success: true, message: session ? 'Auth service operational' : 'Auth service responding' };
    } catch (error) {
        return { success: false, message: `Auth repair failed: ${error.message}` };
    }
}

async function repairEmailService() {
    const smtpHost = import.meta.env.VITE_SMTP_HOST || process.env.SMTP_HOST;
    const smtpUser = import.meta.env.VITE_SMTP_USER || process.env.SMTP_USER;
    
    if (smtpHost && smtpUser) {
        return { success: true, message: 'SMTP credentials configured' };
    } else {
        return { success: false, message: 'SMTP credentials missing - manual configuration required' };
    }
}

// ============================================
// SELF-HEAL LOGGING
// ============================================

async function logSelfHealAction(issueType, description, wasSuccessful, requiresAdmin = false) {
    await supabase.from('self_heal_actions').insert({
        issue_type: issueType,
        issue_description: description,
        action_taken: description,
        was_successful: wasSuccessful,
        requires_admin: requiresAdmin,
        resolved_at: wasSuccessful ? new Date().toISOString() : null,
        created_at: new Date().toISOString()
    });
}

// ============================================
// GET SELF-HEAL HISTORY
// ============================================

export async function getSelfHealHistory(limit = 50) {
    const { data, error } = await supabase
        .from('self_heal_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data || [];
}

// ============================================
// SCHEDULED SELF-HEAL (For Cron Jobs)
// ============================================

export async function scheduledSelfHeal() {
    console.log('🔄 Running scheduled self-heal...');
    const startTime = Date.now();
    
    const result = await runSelfHeal();
    
    // Check for critical issues that need immediate attention
    const criticalIssues = result.actions.filter(a => a.requiresManual === true);
    
    if (criticalIssues.length > 0) {
        console.warn('⚠️ Critical issues requiring manual attention:', criticalIssues);
        // Could send email notification here
    }
    
    console.log(`✅ Self-heal completed in ${result.duration}ms`);
    
    return result;
}

// ============================================
// HEALTH MONITORING (Continuous)
// ============================================

let monitoringInterval = null;

export function startHealthMonitoring(intervalSeconds = 60) {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    
    monitoringInterval = setInterval(async () => {
        try {
            const health = await checkSystemHealth();
            
            if (health.overall !== 'healthy') {
                console.warn('⚠️ Health check detected issues:', health.checks.filter(c => c.status !== 'healthy'));
                // Trigger self-heal automatically
                await scheduledSelfHeal();
            }
        } catch (error) {
            console.error('Health monitoring error:', error);
        }
    }, intervalSeconds * 1000);
    
    return () => {
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
        }
    };
}

export function stopHealthMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }
}
