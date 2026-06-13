// src/services/emailService.js
// ODUSBABA EMAIL SERVICE v3.0 - PRODUCTION READY
// ✅ Unified API endpoint for all email operations
// ✅ Professional email templates with branding
// ✅ Email logging and tracking
// ✅ Support for all email types (welcome, reset, job alerts, etc.)

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/api/index';
const EMAIL_ENDPOINT = `${API_BASE}?action=email`;

// ============================================
// EMAIL LOGGING (Database)
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
// CORE EMAIL FUNCTION (Unified API)
// ============================================

/**
 * Send email via unified API endpoint
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of email (optional if using template)
 * @param {string} emailType - Type of email (welcome, password_reset, job_alert, test, notification, contact, newsletter, assessment_report, tester_welcome)
 * @param {Object} templateData - Data for template rendering
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, logId?: string}>}
 */
export async function sendEmail(to, subject, htmlContent = null, emailType = 'notification', templateData = {}) {
    // Basic validation
    if (!to || !subject) {
        console.error('Missing required email fields:', { to, subject });
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
        
        // Call unified API endpoint
        const response = await fetch(EMAIL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                to, 
                subject, 
                html: htmlContent,
                type: emailType,
                templateData
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
// EMAIL TEMPLATE FUNCTIONS
// ============================================

/**
 * Send welcome email to new users
 * @param {string} email - Recipient email
 * @param {string} name - User's full name
 */
export async function sendWelcomeEmail(email, name) {
    return sendEmail(email, `Welcome to ODUSBABA, ${name || email.split('@')[0]}!`, null, 'welcome', { name });
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetLink - Password reset link
 */
export async function sendPasswordResetEmail(email, resetLink) {
    return sendEmail(email, 'Reset Your Password - ODUSBABA', null, 'password_reset', { resetLink });
}

/**
 * Send job alert email
 * @param {string} email - Recipient email
 * @param {Array} jobs - Array of job objects
 * @param {string} alertName - Name of the job alert
 */
export async function sendJobAlertEmail(email, jobs, alertName) {
    return sendEmail(email, `🎯 ${jobs?.length || 0} New Job${jobs?.length !== 1 ? 's' : ''} Match Your Alert`, null, 'job_alert', { alertName, jobs });
}

/**
 * Send test email (for debugging)
 * @param {string} email - Recipient email
 */
export async function sendTestEmail(email) {
    return sendEmail(email, 'ODUSBABA Email Test', null, 'test', {});
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
    return sendEmail(email, subject, null, 'notification', { message, actionLink: buttonUrl, actionText: buttonText });
}

/**
 * Send contact form email
 * @param {string} name - Sender name
 * @param {string} email - Sender email
 * @param {string} subject - Message subject
 * @param {string} message - Message content
 */
export async function sendContactEmail(name, email, subject, message) {
    const adminEmail = import.meta.env.VITE_CONTACT_EMAIL || 'support@bluskyeconsult.com';
    return sendEmail(
        adminEmail,
        `Contact Form: ${subject}`,
        null,
        'contact',
        { name, email, subject, message }
    );
}

/**
 * Send tester welcome email
 * @param {string} email - Recipient email
 * @param {string} name - Tester name
 * @param {number} uses - Number of free uses
 * @param {number} days - Days of access
 */
export async function sendTesterWelcomeEmail(email, name, uses = 10, days = 30) {
    return sendEmail(email, 'Welcome to ODUSBABA Tester Program!', null, 'tester_welcome', { name, uses, days });
}

/**
 * Send assessment report email
 * @param {string} email - Recipient email
 * @param {string} userName - User's name
 * @param {string} assessmentTitle - Assessment title
 * @param {number} percentage - Score percentage
 * @param {number} score - Raw score
 * @param {string} performanceLevel - Performance level
 */
export async function sendAssessmentReportEmail(email, userName, assessmentTitle, percentage, score, performanceLevel) {
    return sendEmail(
        email,
        `Your ${assessmentTitle} Assessment Report`,
        null,
        'assessment_report',
        { userName, assessmentTitle, percentage, score, performanceLevel }
    );
}

/**
 * Send newsletter welcome email
 * @param {string} email - Recipient email
 * @param {string} name - Subscriber name
 */
export async function sendNewsletterWelcomeEmail(email, name) {
    return sendEmail(email, 'Welcome to ODUSBABA Newsletter!', null, 'newsletter_welcome', { name: name || 'there' });
}

/**
 * Send job application confirmation email
 * @param {string} email - Recipient email
 * @param {string} jobTitle - Job title applied for
 * @param {string} companyName - Company name
 */
export async function sendApplicationConfirmation(email, jobTitle, companyName) {
    return sendEmail(
        email,
        `Application Submitted: ${jobTitle} at ${companyName}`,
        null,
        'notification',
        {
            subject: 'Application Received!',
            message: `Your application for ${jobTitle} at ${companyName} has been successfully submitted. The employer will review your application and contact you if there's a match.`,
            actionLink: 'https://www.bluskyeconsult.com/applications',
            actionText: 'View My Applications'
        }
    );
}

// ============================================
// EMAIL SERVICE STATUS & STATISTICS
// ============================================

/**
 * Test email configuration
 * @param {string} testEmail - Email to send test to
 */
export async function testEmailConfiguration(testEmail = null) {
    const email = testEmail || import.meta.env.VITE_TEST_EMAIL || 'support@bluskyeconsult.com';
    return sendTestEmail(email);
}

/**
 * Check email service status
 * @returns {Promise<{success: boolean, status: string, message: string, configured: boolean}>}
 */
export async function checkEmailStatus() {
    try {
        const response = await fetch(`${EMAIL_ENDPOINT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status' })
        });
        const data = await response.json();
        return { 
            success: true, 
            status: data.status || 'unknown', 
            message: data.message || 'Email service available',
            configured: data.configured !== false
        };
    } catch (error) {
        return { success: false, status: 'error', message: error.message, configured: false };
    }
}

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
    sendContactEmail,
    sendTesterWelcomeEmail,
    sendAssessmentReportEmail,
    sendNewsletterWelcomeEmail,
    sendApplicationConfirmation,
    testEmailConfiguration,
    checkEmailStatus,
    getUserEmailLogs,
    getEmailStats
};
