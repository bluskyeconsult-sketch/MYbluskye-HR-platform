// api/send-email.js
// COMPLETE EMAIL API ENDPOINT - Vercel serverless function
// Supports: Contact forms, newsletter, notifications, tester registrations, assessment reports, and general emails

import nodemailer from 'nodemailer';

// ============================================
// CONFIGURATION
// ============================================

// Allowed email types for validation
const ALLOWED_EMAIL_TYPES = [
    'contact', 'newsletter', 'notification', 'tester_welcome', 
    'assessment_report', 'welcome', 'password_reset', 'job_alert', 'test'
];

// Rate limiting (store in memory - resets on function cold start)
const rateLimit = new Map();

function checkRateLimit(email, type) {
    const key = `${email}:${type}`;
    const now = Date.now();
    const lastSent = rateLimit.get(key);
    
    if (lastSent && (now - lastSent) < 60000) { // 1 minute cooldown
        return false;
    }
    
    rateLimit.set(key, now);
    return true;
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return emailRegex.test(email);
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function getContactEmailTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #020617; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0B3C5D, #1a6d8a); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">New Contact Message</h1>
        </div>
        <div style="padding: 30px; color: #94a3b8;">
            <p><strong>From:</strong> ${data.name} (${data.email})</p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin-top: 20px;">
                <p><strong>Message:</strong></p>
                <p>${data.message.replace(/\n/g, '<br>')}</p>
            </div>
        </div>
        <div style="background-color: #0a0f1c; padding: 20px; text-align: center; font-size: 12px; color: #475569;">
            <p>BluSkye Integrated Consult - Creating Value for Partnership</p>
        </div>
    </div>
</body>
</html>`;
}

function getWelcomeEmailTemplate(name) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">Welcome to BluSkye Integrated Consult</h1>
        <h2 style="color: #ffffff;">Hello ${name},</h2>
        <p style="color: #94a3b8;">Thank you for joining ODUSBABA! You're now part of the governed workforce platform.</p>
        <a href="https://www.bluskyeconsult.com/dashboard" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Go to Dashboard</a>
        <hr style="border-color: #1e293b; margin: 20px 0;">
        <p style="color: #475569; font-size: 12px;">BluSkye Integrated Consult - Creating Value for Partnership</p>
    </div>
</body>
</html>`;
}

function getPasswordResetEmailTemplate(resetLink) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">Reset Your Password</h1>
        <a href="${resetLink}" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Reset Password</a>
        <p style="color: #64748b; font-size: 12px; margin-top: 20px;">This link expires in 1 hour.</p>
    </div>
</body>
</html>`;
}

function getJobAlertEmailTemplate(jobs, alertName) {
    const jobList = jobs.map(j => `<li style="margin-bottom: 8px;"><strong>${j.title}</strong> at ${j.company}<br>📍 ${j.location || 'Remote'}</li>`).join('');
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
        <h1 style="color: #10b981;">New Jobs Matching "${alertName}"</h1>
        <p>We found ${jobs.length} new job${jobs.length !== 1 ? 's' : ''}.</p>
        <ul style="list-style: none; padding: 0;">${jobList}</ul>
        <a href="https://www.bluskyeconsult.com/jobs" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">View All Jobs</a>
    </div>
</body>
</html>`;
}

function getNewsletterWelcomeTemplate(name) {
    return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 30px;">
    <div style="text-align: center;">
        <div style="font-size: 48px;">📧</div>
        <h1 style="color: #0ea5e9;">Welcome to ODUSBABA Newsletter!</h1>
    </div>
    <p style="color: #94a3b8;">Hello ${name || 'there'},</p>
    <p style="color: #94a3b8;">Thank you for subscribing! You'll receive weekly insights on job opportunities, career tips, and industry trends.</p>
    <div style="text-align: center; margin-top: 24px;">
        <a href="https://www.bluskyeconsult.com" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Visit ODUSBABA →</a>
    </div>
</div>`;
}

function getTesterWelcomeTemplate(name, uses, days) {
    return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 30px;">
    <div style="text-align: center;">
        <div style="font-size: 48px;">🎉</div>
        <h1 style="color: #10b981;">Welcome to the Tester Program!</h1>
    </div>
    <p style="color: #94a3b8;">Hello ${name},</p>
    <p style="color: #94a3b8;">Your tester account has been created! You have <strong>${uses} free uses</strong> for <strong>${days} days</strong>.</p>
    <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p><strong>Start exploring:</strong></p>
        <ul>
            <li>🤖 AI Career Chat</li>
            <li>📄 CV Optimization</li>
            <li>💼 Job Matching</li>
            <li>📊 Career Assessments</li>
        </ul>
    </div>
    <div style="text-align: center;">
        <a href="https://www.bluskyeconsult.com/tester-dashboard" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Go to Dashboard →</a>
    </div>
</div>`;
}

function getAssessmentReportTemplate(userName, assessmentTitle, score, percentage, performanceLevel) {
    return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 30px;">
    <div style="text-align: center;">
        <div style="font-size: 48px;">📊</div>
        <h1 style="color: #0ea5e9;">Your Assessment Report</h1>
    </div>
    <p style="color: #94a3b8;">Hello ${userName},</p>
    <p style="color: #94a3b8;">You've completed <strong>${assessmentTitle}</strong>!</p>
    <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
        <div style="font-size: 36px; font-weight: bold; color: #0ea5e9;">${percentage}%</div>
        <div>Score: ${score}</div>
        <div>Performance: <strong>${performanceLevel}</strong></div>
    </div>
    <div style="text-align: center;">
        <a href="https://www.bluskyeconsult.com/assessment-results" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">View Full Report →</a>
    </div>
</div>`;
}

function getTestEmailTemplate() {
    return `<h1>✅ Email Test Successful!</h1><p>Your ODUSBABA email system is working correctly.</p>`;
}

// ============================================
// GET TRANSPORTER
// ============================================

function getTransporter() {
    // Try environment variables with different naming conventions
    const host = process.env.SMTP_HOST || process.env.VITE_SMTP_HOST || 'smtp.hostinger.com';
    const port = parseInt(process.env.SMTP_PORT || process.env.VITE_SMTP_PORT || '465');
    const user = process.env.SMTP_USER || process.env.VITE_EMAIL_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.VITE_EMAIL_PASS;
    
    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const { to, subject, html, type, templateData, logId } = req.body;

        // Validate required fields
        if (!to) {
            return res.status(400).json({ error: 'Missing required field: to' });
        }

        // Validate email format
        if (!isValidEmail(to)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Rate limiting
        if (!checkRateLimit(to, type || 'general')) {
            return res.status(429).json({ error: 'Too many requests. Please wait before sending another email.' });
        }

        // Generate HTML from template if needed
        let emailHtml = html;
        let emailSubject = subject;

        if (!emailHtml && type) {
            switch (type) {
                case 'contact':
                    emailHtml = getContactEmailTemplate(templateData);
                    emailSubject = subject || `New Contact from ${templateData?.name}`;
                    break;
                case 'welcome':
                    emailHtml = getWelcomeEmailTemplate(templateData?.name || 'User');
                    emailSubject = subject || `Welcome to ODUSBABA, ${templateData?.name || 'User'}!`;
                    break;
                case 'password_reset':
                    emailHtml = getPasswordResetEmailTemplate(templateData?.resetLink);
                    emailSubject = subject || 'Reset Your Password';
                    break;
                case 'job_alert':
                    emailHtml = getJobAlertEmailTemplate(templateData?.jobs || [], templateData?.alertName);
                    emailSubject = subject || `New Jobs: ${templateData?.jobs?.length || 0} positions match your alert`;
                    break;
                case 'newsletter_welcome':
                    emailHtml = getNewsletterWelcomeTemplate(templateData?.name);
                    emailSubject = subject || 'Welcome to ODUSBABA Newsletter!';
                    break;
                case 'tester_welcome':
                    emailHtml = getTesterWelcomeTemplate(templateData?.name, templateData?.uses || 10, templateData?.days || 30);
                    emailSubject = subject || 'Welcome to ODUSBABA Tester Program!';
                    break;
                case 'assessment_report':
                    emailHtml = getAssessmentReportTemplate(
                        templateData?.userName,
                        templateData?.assessmentTitle,
                        templateData?.score,
                        templateData?.percentage,
                        templateData?.performanceLevel
                    );
                    emailSubject = subject || `Your ${templateData?.assessmentTitle} Report`;
                    break;
                case 'test':
                    emailHtml = getTestEmailTemplate();
                    emailSubject = subject || 'ODUSBABA Email Test';
                    break;
                default:
                    return res.status(400).json({ error: `Unknown email type: ${type}. Allowed: ${ALLOWED_EMAIL_TYPES.join(', ')}` });
            }
        }

        if (!emailHtml) {
            return res.status(400).json({ error: 'Missing email content (html) or valid type' });
        }

        // Get transporter and verify connection
        const transporter = getTransporter();
        await transporter.verify();
        
        // Send email
        const fromEmail = process.env.SMTP_USER || process.env.VITE_EMAIL_USER;
        const info = await transporter.sendMail({
            from: `"ODUSBABA" <${fromEmail}>`,
            to,
            subject: emailSubject,
            html: emailHtml,
            text: emailHtml.replace(/<[^>]*>/g, '')
        });

        console.log(`✅ Email sent: ${info.messageId} to ${to} (${type || 'general'})`);
        
        return res.status(200).json({ 
            success: true, 
            messageId: info.messageId,
            type: type || 'general',
            logId
        });
        
    } catch (error) {
        console.error('Email error:', error);
        
        // Provide specific error messages
        if (error.code === 'EAUTH') {
            return res.status(401).json({ success: false, error: 'SMTP authentication failed. Check your credentials.' });
        }
        if (error.code === 'ECONNECTION') {
            return res.status(503).json({ success: false, error: 'Cannot connect to SMTP server. Check your host and port.' });
        }
        if (error.code === 'ESOCKET') {
            return res.status(504).json({ success: false, error: 'Connection timeout. Please try again later.' });
        }
        
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            logId: req.body?.logId
        });
    }
}
