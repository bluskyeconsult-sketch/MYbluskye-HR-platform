// src/services/emailService.js
// COMPLETE FRONTEND EMAIL SERVICE - Unified API endpoint

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/api/index';
const EMAIL_ENDPOINT = `${API_BASE}?action=email`;

// ============================================
// CORE EMAIL FUNCTION
// ============================================

/**
 * Send email via unified API endpoint
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of email
 * @param {string} emailType - Type of email (welcome, password_reset, job_alert, test, notification)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, logId?: string}>}
 */
export async function sendEmail(to, subject, htmlContent, emailType = 'notification') {
    let logId = null;
    
    // Basic validation
    if (!to || !subject || !htmlContent) {
        console.error('Missing required email fields:', { to, subject, hasContent: !!htmlContent });
        return { success: false, error: 'Missing required email fields' };
    }
    
    try {
        // Log as pending in database
        const { data: log, error: logError } = await supabase
            .from('email_logs')
            .insert({
                recipient: to,
                subject: subject,
                email_type: emailType,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (logError) {
            console.warn('Could not log email to database:', logError);
        } else {
            logId = log.id;
        }

        // Call unified API endpoint
        const response = await fetch(EMAIL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'send',
                to, 
                subject, 
                html: htmlContent, 
                emailType, 
                logId 
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || `Email API returned ${response.status}`);
        }

        // Update log as sent
        if (logId) {
            await supabase
                .from('email_logs')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('id', logId);
        }

        return { success: true, messageId: data.messageId, logId };
    } catch (error) {
        console.error('Email send error:', error);
        
        // Update log as failed
        if (logId) {
            await supabase
                .from('email_logs')
                .update({ 
                    status: 'failed', 
                    error_message: error.message,
                    failed_at: new Date().toISOString()
                })
                .eq('id', logId);
        }
        
        return { success: false, error: error.message, logId };
    }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Send welcome email to new users
 * @param {string} email - Recipient email
 * @param {string} name - User's full name
 */
export async function sendWelcomeEmail(email, name) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ODUSBABA</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #020617; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 32px; }
            .header { text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #10b981; }
            .button { display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0; }
            .footer { text-align: center; font-size: 12px; color: #475569; margin-top: 20px; padding-top: 20px; border-top: 1px solid #1e293b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">ODUSBABA</div>
                <p style="color: #94a3b8;">BluSkye Integrated Consult</p>
            </div>
            <h2 style="color: #ffffff;">Hello ${name},</h2>
            <p style="color: #94a3b8;">Welcome to ODUSBABA! You're now part of the governed workforce platform.</p>
            <p style="color: #94a3b8;">Get started by completing your profile and exploring job opportunities.</p>
            <div style="text-align: center;">
                <a href="https://www.bluskyeconsult.com/dashboard" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
                <p>BluSkye Integrated Consult - Creating Value for Partnership</p>
                <p>© ${new Date().getFullYear()} All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>`;
    
    return sendEmail(email, `Welcome to ODUSBABA, ${name}!`, html, 'welcome');
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetLink - Password reset link
 */
export async function sendPasswordResetEmail(email, resetLink) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Reset Your Password</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #020617; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 32px; }
            .button { display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0; }
            .warning { background-color: #f59e0b20; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 style="color: #10b981;">Reset Your Password</h1>
            <p style="color: #94a3b8;">We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <div class="warning">
                <p style="color: #f59e0b; margin: 0;">⚠️ This link expires in 1 hour.</p>
            </div>
            <p style="color: #475569; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
    </body>
    </html>`;
    
    return sendEmail(email, 'Reset Your Password', html, 'password_reset');
}

/**
 * Send job alert email
 * @param {string} email - Recipient email
 * @param {Array} jobs - Array of job objects
 * @param {string} alertName - Name of the job alert
 */
export async function sendJobAlertEmail(email, jobs, alertName) {
    if (!jobs || jobs.length === 0) {
        return { success: false, error: 'No jobs to send' };
    }
    
    const jobListHtml = jobs.map(job => `
        <div style="padding: 12px; margin: 8px 0; background-color: #1e293b; border-radius: 8px;">
            <h3 style="color: #ffffff; margin: 0 0 4px 0;">${job.title}</h3>
            <p style="color: #94a3b8; margin: 0;">🏢 ${job.company || 'Various'}</p>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 12px;">📍 ${job.location || 'Remote'}</p>
        </div>
    `).join('');
    
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>New Job Matches</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #020617; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 32px; }
            .job-card { padding: 12px; margin: 8px 0; background-color: #1e293b; border-radius: 8px; }
            .button { display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 style="color: #10b981;">🎯 New Job Matches</h1>
            <p style="color: #94a3b8;">Found ${jobs.length} new job${jobs.length > 1 ? 's' : ''} matching "${alertName}":</p>
            ${jobListHtml}
            <div style="text-align: center;">
                <a href="https://www.bluskyeconsult.com/jobs" class="button">View All Jobs</a>
            </div>
            <p style="color: #475569; font-size: 12px; text-align: center;">You received this because you have an active job alert.</p>
        </div>
    </body>
    </html>`;
    
    return sendEmail(email, `New Jobs: ${jobs.length} position${jobs.length > 1 ? 's' : ''} match your alert`, html, 'job_alert');
}

/**
 * Send test email (for debugging)
 * @param {string} email - Recipient email
 */
export async function sendTestEmail(email) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Email Test</title>
    </head>
    <body>
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #10b981;">✅ Email Test Successful!</h1>
            <p>Your ODUSBABA email system is working correctly.</p>
            <p>Sent at: ${new Date().toLocaleString()}</p>
        </div>
    </body>
    </html>`;
    
    return sendEmail(email, 'ODUSBABA Email Test', html, 'test');
}

/**
 * Send general notification email
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} message - Plain text message
 * @param {string} buttonText - Optional button text
 * @param {string} buttonUrl - Optional button URL
 */
export async function sendNotificationEmail(email, subject, message, buttonText = null, buttonUrl = null) {
    const buttonHtml = buttonText && buttonUrl ? `
        <div style="text-align: center;">
            <a href="${buttonUrl}" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">${buttonText}</a>
        </div>
    ` : '';
    
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #020617; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 32px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 style="color: #10b981;">${subject}</h1>
            <p style="color: #94a3b8;">${message}</p>
            ${buttonHtml}
        </div>
    </body>
    </html>`;
    
    return sendEmail(email, subject, html, 'notification');
}

// ============================================
// EMAIL LOGS & STATUS
// ============================================

/**
 * Get email logs for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of logs to return
 * @returns {Promise<{success: boolean, logs: Array, error?: string}>}
 */
export async function getUserEmailLogs(userId, limit = 20) {
    try {
        const { data: logs, error } = await supabase
            .from('email_logs')
            .select('*')
            .eq('recipient', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return { success: true, logs: logs || [] };
    } catch (error) {
        console.error('Error fetching email logs:', error);
        return { success: false, logs: [], error: error.message };
    }
}

/**
 * Check email service status
 * @returns {Promise<{success: boolean, status: string, message: string}>}
 */
export async function checkEmailStatus() {
    try {
        const response = await fetch(`${API_BASE}?action=email&test=true`);
        const data = await response.json();
        return { success: true, status: data.status || 'unknown', message: data.message };
    } catch (error) {
        return { success: false, status: 'error', message: error.message };
    }
}

// ============================================
// EXPORTS
// ============================================

export default {
    sendEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendJobAlertEmail,
    sendTestEmail,
    sendNotificationEmail,
    getUserEmailLogs,
    checkEmailStatus
};
