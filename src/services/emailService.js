import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Send email via Vercel API endpoint
export async function sendEmail(to, subject, htmlContent, emailType = 'notification') {
    let logId = null;
    
    try {
        // Log as pending first
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

        // Call Vercel API endpoint
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

// Welcome email
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

// Password reset email
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

// Job alert email
export async function sendJobAlertEmail(email, jobs, alertName) {
    const jobList = jobs.map(j => `<li style="margin-bottom: 10px;"><strong>${j.title}</strong> at ${j.company}<br>📍 ${j.location || 'Remote'} • 💰 ${j.salary_min ? `$${j.salary_min.toLocaleString()}+` : 'Competitive'}</li>`).join('');
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
                <h1 style="color: #10b981;">New Jobs Matching "${alertName}"</h1>
                <p style="color: #94a3b8;">We found ${jobs.length} new jobs that match your alert.</p>
                <ul style="color: #94a3b8; list-style: none; padding: 0;">${jobList}</ul>
                <a href="https://www.bluskyeconsult.com/jobs" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">View All Jobs</a>
                <hr style="border-color: #1e293b; margin: 20px 0;">
                <p style="color: #475569; font-size: 12px;">You received this because you have job alerts enabled. <a href="https://www.bluskyeconsult.com/job-alerts" style="color: #10b981;">Manage alerts</a></p>
            </div>
        </body>
        </html>
    `;
    
    return sendEmail(email, `New Jobs: ${jobs.length} positions match your alert`, html, 'job_alert');
}

// Test email (for setup verification)
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
