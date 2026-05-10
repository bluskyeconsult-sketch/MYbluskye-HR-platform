// src/services/jobAlertService.js
// Complete Job Alerts System - Email triggers, frequency options, matching engine
// CLEAN VERSION - No JSX, pure JavaScript

import { supabase } from '../lib/supabase';
import { sendEmail } from './emailService';

// ============================================
// JOB ALERT CRUD OPERATIONS
// ============================================

export async function createJobAlert(userId, alertData) {
    const { data, error } = await supabase
        .from('job_alerts')
        .insert({
            user_id: userId,
            name: alertData.name,
            keywords: alertData.keywords || [],
            location: alertData.location,
            country_code: alertData.country_code,
            job_type: alertData.job_type,
            salary_min: alertData.salary_min,
            salary_max: alertData.salary_max,
            frequency: alertData.frequency || 'daily',
            is_active: true
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, alertId: data.id };
}

export async function updateJobAlert(alertId, userId, alertData) {
    const { error } = await supabase
        .from('job_alerts')
        .update({
            name: alertData.name,
            keywords: alertData.keywords,
            location: alertData.location,
            country_code: alertData.country_code,
            job_type: alertData.job_type,
            salary_min: alertData.salary_min,
            salary_max: alertData.salary_max,
            frequency: alertData.frequency,
            updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
}

export async function deleteJobAlert(alertId, userId) {
    const { error } = await supabase
        .from('job_alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
}

export async function toggleJobAlert(alertId, userId, isActive) {
    const { error } = await supabase
        .from('job_alerts')
        .update({ is_active: isActive })
        .eq('id', alertId)
        .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
}

export async function getUserJobAlerts(userId) {
    const { data, error } = await supabase
        .from('job_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getJobAlertById(alertId, userId) {
    const { data, error } = await supabase
        .from('job_alerts')
        .select('*')
        .eq('id', alertId)
        .eq('user_id', userId)
        .single();

    if (error) throw error;
    return data;
}

// ============================================
// JOB MATCHING ENGINE
// ============================================

export async function matchJobsToAlert(alert, limit = 20) {
    let query = supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .eq('compliance_status', 'approved');

    // Apply filters
    if (alert.keywords && alert.keywords.length > 0) {
        const keywordConditions = alert.keywords.map(k => `title.ilike.%${k}%`).join(',');
        query = query.or(keywordConditions);
    }

    if (alert.location) {
        query = query.ilike('location', `%${alert.location}%`);
    }

    if (alert.country_code) {
        query = query.eq('country_code', alert.country_code);
    }

    if (alert.job_type) {
        query = query.eq('job_type', alert.job_type);
    }

    if (alert.salary_min) {
        query = query.gte('salary_min', alert.salary_min);
    }

    if (alert.salary_max) {
        query = query.lte('salary_max', alert.salary_max);
    }

    // Only get jobs posted since last alert
    if (alert.last_sent_at) {
        query = query.gt('posted_at', alert.last_sent_at);
    } else {
        query = query.gt('posted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    }

    const { data, error } = await query
        .order('posted_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// ============================================
// ALERT DISPATCH (Email Sending)
// ============================================

export async function dispatchJobAlert(alertId, userId, userEmail, userName) {
    const { data: alert, error: aError } = await supabase
        .from('job_alerts')
        .select('*')
        .eq('id', alertId)
        .single();

    if (aError) throw aError;

    const matchedJobs = await matchJobsToAlert(alert);

    if (matchedJobs.length === 0) {
        await supabase.from('job_alert_logs').insert({
            alert_id: alertId,
            jobs_matched: 0,
            log_status: 'no_matches'
        });
        return { success: true, matched: 0 };
    }

    const emailHtml = generateJobAlertEmail(alert, matchedJobs, userName);
    
    const emailResult = await sendEmail(
        userEmail,
        `🔔 Job Alert: ${matchedJobs.length} new ${alert.name} positions`,
        emailHtml,
        'job_alert'
    );

    if (emailResult.success) {
        await supabase
            .from('job_alerts')
            .update({ last_sent_at: new Date().toISOString() })
            .eq('id', alertId);

        await supabase.from('job_alert_logs').insert({
            alert_id: alertId,
            jobs_matched: matchedJobs.length,
            log_status: 'sent'
        });
    }

    return { success: emailResult.success, matched: matchedJobs.length };
}

// ============================================
// BATCH PROCESS ALL ACTIVE ALERTS
// ============================================

export async function processAllJobAlerts(frequency = 'daily') {
    const { data: alerts, error } = await supabase
        .from('job_alerts')
        .select('*, profiles!inner(email, full_name)')
        .eq('is_active', true)
        .eq('frequency', frequency);

    if (error) throw error;

    const results = [];
    for (const alert of alerts) {
        const result = await dispatchJobAlert(
            alert.id,
            alert.user_id,
            alert.profiles.email,
            alert.profiles.full_name || 'User'
        );
        results.push({ alertId: alert.id, ...result });
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
}

// ============================================
// JOB ALERT EMAIL TEMPLATE (HTML String - NOT JSX)
// ============================================

function generateJobAlertEmail(alert, jobs, userName) {
    const jobListHtml = jobs.map(job => `
        <div style="background-color: #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <h3 style="margin: 0 0 8px 0; color: #0ea5e9;">${escapeHtml(job.title)}</h3>
            <p style="margin: 0 0 4px 0; color: #cbd5e1;"><strong>${escapeHtml(job.company)}</strong> • ${escapeHtml(job.location || 'Remote')}</p>
            <p style="margin: 0 0 8px 0; color: #94a3b8;">💰 ${job.salary_min ? `$${job.salary_min.toLocaleString()} - $${job.salary_max?.toLocaleString() || 'Competitive'}` : 'Competitive salary'}</p>
            <p style="margin: 0 0 8px 0; color: #94a3b8;">📅 Posted: ${new Date(job.posted_at).toLocaleDateString()}</p>
            <a href="https://www.bluskyeconsult.com/jobs/${job.id}" style="color: #0ea5e9; text-decoration: none;">View Details →</a>
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Job Alert: ${escapeHtml(alert.name)}</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #020617; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #0B3C5D, #1a6d8a); padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .footer { background-color: #0a0f1c; padding: 20px; text-align: center; font-size: 12px; color: #475569; }
                h1 { color: #ffffff; margin: 0; }
                p { color: #94a3b8; line-height: 1.6; }
                .button { display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 New Job Matches!</h1>
                    <p style="color: #cbd5e1; margin-top: 8px;">Alert: "${escapeHtml(alert.name)}"</p>
                </div>
                <div class="content">
                    <p>Hello ${escapeHtml(userName || 'Professional')},</p>
                    <p>We found <strong style="color: #0ea5e9;">${jobs.length} new job${jobs.length !== 1 ? 's' : ''}</strong> matching your alert criteria:</p>
                    
                    <div style="margin: 20px 0;">
                        ${jobListHtml}
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="https://www.bluskyeconsult.com/jobs" class="button">Browse All Jobs →</a>
                    </div>
                    
                    <hr style="border-color: #1e293b; margin: 24px 0;">
                    <p style="font-size: 12px; color: #64748b;">
                        You received this because you have job alerts enabled. 
                        <a href="https://www.bluskyeconsult.com/job-alerts" style="color: #0ea5e9;">Manage your alerts</a> or 
                        <a href="https://www.bluskyeconsult.com/unsubscribe" style="color: #0ea5e9;">unsubscribe</a>.
                    </p>
                </div>
                <div class="footer">
                    <p>BluSkye Integrated Consult - Creating Value for Partnership</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Simple HTML escape utility
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================
// CRON JOB HANDLER (For scheduled execution)
// ============================================

export async function runJobAlertCron() {
    console.log('🔄 Running job alert cron job...');
    
    const dailyResults = await processAllJobAlerts('daily');
    console.log(`📧 Daily alerts processed: ${dailyResults.length}`);
    
    const weeklyResults = await processAllJobAlerts('weekly');
    console.log(`📧 Weekly alerts processed: ${weeklyResults.length}`);
    
    return {
        daily: dailyResults,
        weekly: weeklyResults,
        timestamp: new Date().toISOString()
    };
}
