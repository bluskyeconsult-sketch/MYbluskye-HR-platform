// src/services/emailService.js
// COMPLETE PROFESSIONAL EMAIL SERVICE - Unified API endpoint
// Features: Welcome emails, password reset, job alerts, notifications, logging

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

// ✅ CORRECTED: Using unified API endpoint
const API_BASE = '/api/index';
const EMAIL_ENDPOINT = `${API_BASE}?action=email`;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Log email to database
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} emailType - Type of email
 * @returns {Promise<string|null>} - Log ID or null
 */
async function logEmailToDatabase(to, subject, emailType) {
    try {
        const { data: log, error } = await supabase
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

        if (error) throw error;
        return log.id;
    } catch (error) {
        console.warn('Could not log email to database:', error.message);
        return null;
    }
}

/**
 * Update email log status
 * @param {string} logId - Log ID
 * @param {string} status - Status (sent, failed)
 * @param {string} errorMessage - Optional error message
 */
async function updateEmailLog(logId, status, errorMessage = null) {
    if (!logId) return;
    
    try {
        const updateData = {
            status: status,
            ...(status === 'sent' && { sent_at: new Date().toISOString() }),
            ...(status === 'failed' && { 
                error_message: errorMessage,
                failed_at: new Date().toISOString()
            })
        };
        
        await supabase
            .from('email_logs')
            .update(updateData)
            .eq('id', logId);
    } catch (error) {
        console.warn('Could not update email log:', error.message);
    }
}

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
    // Basic validation
    if (!to || !subject || !htmlContent) {
        console.error('Missing required email fields:', { to, subject, hasContent: !!htmlContent });
        return { success: false, error: 'Missing required email fields' };
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    if (!emailRegex.test(to)) {
        return { success: false, error: 'Invalid email address format' };
    }
    
    let logId = null;
    
    try {
        // Log as pending in database
        logId = await logEmailToDatabase(to, subject, emailType);
        
        // ✅ FIXED: Using correct unified API endpoint
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
        await updateEmailLog(logId, 'sent');

        return { success: true, messageId: data.messageId, logId };
    } catch (error) {
        console.error('Email send error:', error);
        
        // Update log as failed
        await updateEmailLog(logId, 'failed', error.message);
        
        return { success: false, error: error.message, logId };
    }
}

// ============================================
// PROFESSIONAL EMAIL TEMPLATES
// ============================================

/**
 * Generate base email template with consistent branding
 * @param {string} title - Email title
 * @param {string} content - Email content HTML
 * @param {string} buttonText - Optional button text
 * @param {string} buttonUrl - Optional button URL
 * @returns {string} - Complete email HTML
 */
function generateEmailTemplate(title, content, buttonText = null, buttonUrl = null) {
    const buttonHtml = buttonText && buttonUrl ? `
        <div style="text-align: center; margin: 24px 0;">
            <a href="${buttonUrl}" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">${buttonText}</a>
        </div>
    ` : '';
    
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | ODUSBABA</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #020617;
                color: #ffffff;
                margin: 0;
                padding: 0;
                line-height: 1.6;
            }
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #0f172a;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            .email-header {
                background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
                padding: 32px 24px;
                text-align: center;
            }
            .email-header h1 {
                font-size: 28px;
                margin: 0;
                color: white;
                font-weight: 700;
            }
            .email-header p {
                color: rgba(255,255,255,0.9);
                margin: 8px 0 0;
                font-size: 14px;
            }
            .email-body {
                padding: 32px 24px;
            }
            .email-footer {
                background-color: #0a0f1a;
                padding: 24px;
                text-align: center;
                border-top: 1px solid #1e293b;
            }
            .email-footer p {
                margin: 0;
                color: #475569;
                font-size: 12px;
            }
            .divider {
                height: 1px;
                background-color: #1e293b;
                margin: 24px 0;
            }
            .warning-box {
                background-color: rgba(245, 158, 11, 0.1);
                border-left: 4px solid #f59e0b;
                padding: 16px;
                margin: 16px 0;
                border-radius: 8px;
            }
            @media only screen and (max-width: 600px) {
                .email-container {
                    width: 100%;
                    border-radius: 0;
                }
                .email-body {
                    padding: 24px 16px;
                }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #020617;">
        <div class="email-container">
            <div class="email-header">
                <h1>ODUSBABA</h1>
                <p>BluSkye Integrated Consult</p>
            </div>
            <div class="email-body">
                ${content}
                ${buttonHtml}
            </div>
            <div class="email-footer">
                <p>© ${new Date().getFullYear()} BluSkye Integrated Consult. All rights reserved.</p>
                <p style="margin-top: 8px;">Creating Value for Partnership</p>
            </div>
        </div>
    </body>
    </html>`;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
    const displayName = name || email.split('@')[0];
    
    const content = `
        <h2 style="color: #ffffff; margin-top: 0;">Hello ${escapeHtml(displayName)},</h2>
        <p style="color: #94a3b8;">Welcome to ODUSBABA! You're now part of the governed workforce platform.</p>
        <p style="color: #94a3b8;">Your account has been successfully created. Here's what you can do next:</p>
        <ul style="color: #94a3b8; padding-left: 20px;">
            <li>📝 Complete your profile to attract employers</li>
            <li>🔍 Browse and apply to verified job opportunities</li>
            <li>📊 Take professional assessments to showcase your skills</li>
            <li>🤖 Use AI-powered virtual assistants for career guidance</li>
        </ul>
        <div class="divider"></div>
        <p style="color: #94a3b8;">Need help? Contact our support team anytime.</p>
    `;
    
    const html = generateEmailTemplate('Welcome to ODUSBABA', content, 'Go to Dashboard', 'https://www.bluskyeconsult.com/dashboard');
    return sendEmail(email, `Welcome to ODUSBABA, ${displayName}!`, html, 'welcome');
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetLink - Password reset link
 */
export async function sendPasswordResetEmail(email, resetLink) {
    const content = `
        <h2 style="color: #ffffff; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #94a3b8;">We received a request to reset your password. Click the button below to create a new password:</p>
        <div class="warning-box">
            <p style="color: #f59e0b; margin: 0;">⚠️ Security Notice: This link expires in 1 hour for your protection.</p>
        </div>
        <p style="color: #475569; font-size: 14px;">If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
        <div class="divider"></div>
        <p style="color: #475569; font-size: 12px;">Having trouble? Copy and paste this link into your browser:</p>
        <p style="color: #3b82f6; font-size: 12px; word-break: break-all;">${resetLink}</p>
    `;
    
    const html = generateEmailTemplate('Reset Your Password', content, 'Reset Password', resetLink);
    return sendEmail(email, 'Reset Your Password - ODUSBABA', html, 'password_reset');
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
        <div style="padding: 16px; margin: 12px 0; background-color: #1e293b; border-radius: 12px;">
            <h3 style="color: #ffffff; margin: 0 0 8px 0;">${escapeHtml(job.title)}</h3>
            <p style="color: #94a3b8; margin: 0;">🏢 ${escapeHtml(job.company || 'Various Employers')}</p>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">📍 ${escapeHtml(job.location || 'Remote / Flexible')}</p>
            ${job.salary ? `<p style="color: #10b981; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">💰 ${escapeHtml(job.salary)}</p>` : ''}
            <div style="margin-top: 12px;">
                <a href="${escapeHtml(job.link || '#')}" style="color: #0ea5e9; text-decoration: none; font-size: 13px;">View Details →</a>
            </div>
        </div>
    `).join('');
    
    const content = `
        <h2 style="color: #ffffff; margin-top: 0;">🎯 New Job Matches</h2>
        <p style="color: #94a3b8;">We found ${jobs.length} new job${jobs.length > 1 ? 's' : ''} matching your alert "<strong>${escapeHtml(alertName)}</strong>":</p>
        ${jobListHtml}
        <div class="divider"></div>
        <p style="color: #94a3b8;">Don't miss out on these opportunities! Apply today.</p>
    `;
    
    const html = generateEmailTemplate('New Job Matches', content, 'Browse All Jobs', 'https://www.bluskyeconsult.com/jobs');
    return sendEmail(email, `🎯 ${jobs.length} New Job${jobs.length > 1 ? 's' : ''} Match Your Alert`, html, 'job_alert');
}

/**
 * Send test email (for debugging)
 * @param {string} email - Recipient email
 */
export async function sendTestEmail(email) {
    const content = `
        <h2 style="color: #ffffff; margin-top: 0;">✅ Email Test Successful!</h2>
        <p style="color: #94a3b8;">Your ODUSBABA email system is working correctly.</p>
        <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #94a3b8; margin: 0;"><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            <p style="color: #94a3b8; margin: 8px 0 0;"><strong>Recipient:</strong> ${escapeHtml(email)}</p>
        </div>
        <p style="color: #475569; font-size: 12px;">This is a test email from your ODUSBABA platform.</p>
    `;
    
    const html = generateEmailTemplate('Email Test', content);
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
    const content = `
        <h2 style="color: #ffffff; margin-top: 0;">${escapeHtml(subject)}</h2>
        <p style="color: #94a3b8;">${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `;
    
    const html = generateEmailTemplate(subject, content, buttonText, buttonUrl);
    return sendEmail(email, subject, html, 'notification');
}

/**
 * Send application confirmation email
 * @param {string} email - Recipient email
 * @param {string} jobTitle - Job title applied for
 * @param {string} companyName - Company name
 */
export async function sendApplicationConfirmation(email, jobTitle, companyName) {
    const content = `
        <h2 style="color: #ffffff; margin-top: 0;">Application Received!</h2>
        <p style="color: #94a3b8;">Your application for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong> has been successfully submitted.</p>
        <p style="color: #94a3b8;">The employer will review your application and contact you if there's a match.</p>
        <div class="divider"></div>
        <h3 style="color: #ffffff;">Next Steps:</h3>
        <ul style="color: #94a3b8;">
            <li>📊 Complete relevant assessments to stand out</li>
            <li>📄 Keep your profile updated</li>
            <li>🔍 Continue exploring more opportunities</li>
        </ul>
    `;
    
    const html = generateEmailTemplate('Application Confirmation', content, 'View My Applications', 'https://www.bluskyeconsult.com/applications');
    return sendEmail(email, `Application Submitted: ${jobTitle} at ${companyName}`, html, 'notification');
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
            .eq('user_id', userId)
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
        const response = await fetch(`${EMAIL_ENDPOINT}&test=true`);
        const data = await response.json();
        return { 
            success: true, 
            status: data.status || 'unknown', 
            message: data.message,
            configured: data.configured
        };
    } catch (error) {
        return { success: false, status: 'error', message: error.message };
    }
}

/**
 * Get email delivery statistics
 * @returns {Promise<{total: number, sent: number, failed: number, pending: number}>}
 */
export async function getEmailStats() {
    try {
        const { data, error } = await supabase
            .from('email_logs')
            .select('status');
        
        if (error) throw error;
        
        const stats = {
            total: data?.length || 0,
            sent: data?.filter(l => l.status === 'sent').length || 0,
            failed: data?.filter(l => l.status === 'failed').length || 0,
            pending: data?.filter(l => l.status === 'pending').length || 0
        };
        
        return stats;
    } catch (error) {
        console.error('Error fetching email stats:', error);
        return { total: 0, sent: 0, failed: 0, pending: 0 };
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
    sendApplicationConfirmation,
    getUserEmailLogs,
    checkEmailStatus,
    getEmailStats
};
