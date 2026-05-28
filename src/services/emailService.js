// src/services/emailService.js
// COMPLETE EMAIL SERVICE - Supabase logging + SMTP sending + All email templates

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// ============================================
// SUPABASE CLIENT (for logging)
// ============================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// SMTP TRANSPORTER (Hostinger)
// ============================================
const transporter = nodemailer.createTransport({
    host: process.env.VITE_SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.VITE_SMTP_PORT || '465'),
    secure: true,
    auth: {
        user: process.env.VITE_EMAIL_USER || 'noreply@bluskyeconsult.com',
        pass: process.env.VITE_EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
});

// Verify connection on startup (only in Node environment)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Email service connection failed:', error);
        } else {
            console.log('✅ Email service ready');
        }
    });
}

// ============================================
// CORE EMAIL FUNCTION (with logging)
// ============================================

/**
 * Send email with automatic database logging
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email body
 * @param {string} emailType - Type of email (welcome, password_reset, job_alert, test, notification)
 * @returns {Promise<{success: boolean, messageId?: string, logId?: string, error?: string}>}
 */
export async function sendEmail(to, subject, htmlContent, emailType = 'notification') {
    let logId = null;
    
    try {
        // 1. Log as pending in database
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

        // 2. Send via SMTP
        const info = await transporter.sendMail({
            from: `"ODUSBABA" <${process.env.VITE_EMAIL_USER || 'noreply@bluskyeconsult.com'}>`,
            to,
            subject,
            html: htmlContent
        });

        // 3. Update log as sent
        if (logId) {
            await supabase
                .from('email_logs')
                .update({ 
                    status: 'sent', 
                    sent_at: new Date().toISOString(),
                    message_id: info.messageId
                })
                .eq('id', logId);
        }

        console.log(`✅ Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId, logId };

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
 */
export async function sendWelcomeEmail(email, name) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
                <h1 style="color: #10b981;">Welcome to BluSkye Integrated Consult</h1>
                <h2 style="color: #ffffff;">Hello ${name},</h2>
                <p style="color: #94a3b8;">Thank you for joining ODUSBABA! You're now part of the governed workforce platform.</p>
                <p style="color: #94a3b8;">Get started by completing your profile and exploring job opportunities.</p>
                <a href="https://www.bluskyeconsult.com/dashboard" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Go to Dashboard</a>
                <hr style="border-color: #1e293b; margin: 20px 0;">
                <p style="color: #475569; font-size: 12px;">BluSkye Integrated Consult - Creating Value for Partnership</p>
            </div>
        </body>
        </html>
    `;
    
    return sendEmail(email, `Welcome to ODUSBABA, ${name}!`, html, 'welcome');
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, resetLink) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
                <h1 style="color: #10b981;">Reset Your Password</h1>
                <p style="color: #94a3b8;">You requested to reset your password. Click the button below to create a new password.</p>
                <a href="${resetLink}" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Reset Password</a>
                <p style="color: #64748b; font-size: 12px; margin-top: 20px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
                <hr style="border-color: #1e293b; margin: 20px 0;">
                <p style="color: #475569; font-size: 12px;">BluSkye Integrated Consult - Creating Value for Partnership</p>
            </div>
        </body>
        </html>
    `;
    
    return sendEmail(email, 'Reset Your Password', html, 'password_reset');
}

/**
 * Send job alert email
 */
export async function sendJobAlertEmail(email, jobs, alertName) {
    const jobList = jobs.map(j => `
        <li style="margin-bottom: 10px; padding: 8px; background-color: #1e293b; border-radius: 8px;">
            <strong style="color: #10b981;">${j.title}</strong><br>
            <span style="color: #94a3b8;">${j.company || 'Various Companies'}</span><br>
            📍 ${j.location || 'Remote'} • 💰 ${j.salary_range || 'Competitive'}
        </li>
    `).join('');
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
                <h1 style="color: #10b981;">New Jobs Matching "${alertName}"</h1>
                <p style="color: #94a3b8;">We found ${jobs.length} new job${jobs.length !== 1 ? 's' : ''} that match your alert.</p>
                <ul style="color: #94a3b8; list-style: none; padding: 0;">${jobList}</ul>
                <a href="https://www.bluskyeconsult.com/jobs" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">View All Jobs</a>
                <hr style="border-color: #1e293b; margin: 20px 0;">
                <p style="color: #475569; font-size: 12px;">You received this because you have job alerts enabled. <a href="https://www.bluskyeconsult.com/job-alerts" style="color: #10b981;">Manage alerts</a></p>
            </div>
        </body>
        </html>
    `;
    
    return sendEmail(email, `New Jobs: ${jobs.length} position${jobs.length !== 1 ? 's' : ''} match your alert`, html, 'job_alert');
}

/**
 * Send test email (for configuration verification)
 */
export async function sendTestEmail(email) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
                <h1 style="color: #10b981;">✅ Email Configuration Successful!</h1>
                <p style="color: #94a3b8;">Your ODUSBABA email system is working correctly.</p>
                <p style="color: #94a3b8;">This test email confirms that SMTP and all configurations are set up properly.</p>
                <p style="color: #94a3b8;">If you received this, your environment variables and SMTP settings are correct.</p>
                <hr style="border-color: #1e293b; margin: 20px 0;">
                <p style="color: #475569; font-size: 12px;">BluSkye Integrated Consult - Creating Value for Partnership</p>
            </div>
        </body>
        </html>
    `;
    
    return sendEmail(email, 'ODUSBABA Email Test - Configuration Successful', html, 'test');
}

/**
 * Send notification email (generic)
 */
export async function sendNotificationEmail(email, subject, message, actionLink = null, actionText = null) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
                <h1 style="color: #10b981;">${subject}</h1>
                <p style="color: #94a3b8;">${message}</p>
                ${actionLink && actionText ? `<a href="${actionLink}" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">${actionText}</a>` : ''}
                <hr style="border-color: #1e293b; margin: 20px 0;">
                <p style="color: #475569; font-size: 12px;">BluSkye Integrated Consult - Creating Value for Partnership</p>
            </div>
        </body>
        </html>
    `;
    
    return sendEmail(email, subject, html, 'notification');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Test the entire email service (SMTP + logging)
 */
export async function testEmailService() {
    const start = Date.now();
    const testEmail = process.env.VITE_TEST_EMAIL || 'admin@bluskyeconsult.com';
    
    console.log('📧 Testing email service...');
    const result = await sendTestEmail(testEmail);
    const duration = Date.now() - start;
    
    console.log(`✅ Email test completed in ${duration}ms`);
    return { ...result, duration };
}

/**
 * Check email log status for a specific email
 */
export async function getEmailStatus(logId) {
    try {
        const { data, error } = await supabase
            .from('email_logs')
            .select('*')
            .eq('id', logId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Failed to get email status:', error);
        return null;
    }
}

/**
 * Retry failed emails
 */
export async function retryFailedEmails(limit = 10) {
    const { data: failedEmails, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('status', 'failed')
        .lt('failed_at', new Date(Date.now() - 3600000).toISOString()) // Older than 1 hour
        .limit(limit);
    
    if (error || !failedEmails) return { success: false, error: error?.message };
    
    const results = [];
    for (const email of failedEmails) {
        // You would need the original HTML content - this requires storing it
        console.log(`Retrying email ${email.id} to ${email.recipient}`);
        // Implement retry logic as needed
    }
    
    return { success: true, retried: results.length };
}
