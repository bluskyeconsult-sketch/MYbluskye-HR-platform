// src/services/emailService.js (FRONTEND ONLY)
// This file ONLY calls API endpoints - NO nodemailer

import { supabase } from '../lib/supabase';

/**
 * Send email via Vercel API endpoint
 * This is the ONLY email function in frontend
 */
export async function sendEmail(to, subject, htmlContent, emailType = 'notification') {
    let logId = null;
    
    try {
        // Log as pending in database
        const { data: log, error: logError } = await supabase
            .from('email_logs')
            .insert({
                recipient: to,
                subject: subject,
                email_type: emailType,
                status: 'pending'
            })
            .select()
            .single();

        if (logError) {
            console.warn('Could not log email to database:', logError);
        } else {
            logId = log.id;
        }

        // Call Vercel API endpoint (backend)
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, html: htmlContent, emailType, logId })
        });

        const data = await response.json();

        if (!response.ok) {
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
                .update({ status: 'failed', error_message: error.message })
                .eq('id', logId);
        }
        
        return { success: false, error: error.message, logId };
    }
}

// Email templates (frontend safe)
export async function sendWelcomeEmail(email, name) {
    const html = `<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
            <h1 style="color: #10b981;">Welcome to BluSkye Integrated Consult</h1>
            <h2 style="color: #ffffff;">Hello ${name},</h2>
            <p style="color: #94a3b8;">Thank you for joining ODUSBABA! You're now part of the governed workforce platform.</p>
            <p style="color: #94a3b8;">Get started by completing your profile and exploring job opportunities.</p>
            <a href="https://www.bluskyeconsult.com/dashboard" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Go to Dashboard</a>
        </div>
    </body>
    </html>`;
    
    return sendEmail(email, `Welcome to ODUSBABA, ${name}!`, html, 'welcome');
}

export async function sendPasswordResetEmail(email, resetLink) {
    const html = `<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
            <h1 style="color: #10b981;">Reset Your Password</h1>
            <a href="${resetLink}" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Reset Password</a>
        </div>
    </body>
    </html>`;
    
    return sendEmail(email, 'Reset Your Password', html, 'password_reset');
}

export async function sendJobAlertEmail(email, jobs, alertName) {
    const jobList = jobs.map(j => `<li><strong>${j.title}</strong> at ${j.company}</li>`).join('');
    const html = `<!DOCTYPE html>
    <html>
    <body>
        <h1>New Jobs Matching "${alertName}"</h1>
        <ul>${jobList}</ul>
        <a href="https://www.bluskyeconsult.com/jobs">View All Jobs</a>
    </body>
    </html>`;
    
    return sendEmail(email, `New Jobs: ${jobs.length} positions match your alert`, html, 'job_alert');
}

export async function sendTestEmail(email) {
    const html = `<h1>✅ Email Test Successful!</h1><p>Your ODUSBABA email system is working.</p>`;
    return sendEmail(email, 'ODUSBABA Email Test', html, 'test');
}
