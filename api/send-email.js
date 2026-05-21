// api/send-email.js
// COMPLETE EMAIL API ENDPOINT - For Vercel serverless functions
// Supports: Contact forms, newsletter, notifications, tester registrations

import nodemailer from 'nodemailer';

// ============================================
// CONFIGURATION
// ============================================

// Allowed email types for validation
const ALLOWED_EMAIL_TYPES = ['contact', 'newsletter', 'notification', 'tester_welcome', 'assessment_report'];

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
        </html>
    `;
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
            <hr style="border-color: #1e293b; margin: 20px 0;">
            <p style="color: #475569; font-size: 12px; text-align: center;">BluSkye Integrated Consult</p>
        </div>
    `;
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
                <p style="margin: 0;"><strong>Start exploring:</strong></p>
                <ul style="margin-top: 8px;">
                    <li>🤖 AI Career Chat</li>
                    <li>📄 CV Optimization</li>
                    <li>💼 Job Matching</li>
                    <li>📊 Career Assessments</li>
                </ul>
            </div>
            <div style="text-align: center;">
                <a href="https://www.bluskyeconsult.com/tester-dashboard" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Go to Dashboard →</a>
            </div>
            <hr style="border-color: #1e293b; margin: 20px 0;">
            <p style="color: #475569; font-size: 12px; text-align: center;">BluSkye Integrated Consult - Creating Value for Partnership</p>
        </div>
    `;
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
            <hr style="border-color: #1e293b; margin: 20px 0;">
            <p style="color: #475569; font-size: 12px; text-align: center;">BluSkye Integrated Consult</p>
        </div>
    `;
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const { to, subject, html, type = 'general', templateData = {} } = req.body;

        // Validate required fields
        if (!to || !subject) {
            return res.status(400).json({ error: 'Missing required fields: to, subject' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        if (!emailRegex.test(to)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Rate limiting
        if (!checkRateLimit(to, type)) {
            return res.status(429).json({ error: 'Too many requests. Please wait before sending another email.' });
        }

        // Get SMTP config
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = parseInt(process.env.SMTP_PORT || '587');
        const smtpUser = process.env.SMTP_USER;
        const smtpPassword = process.env.SMTP_PASSWORD;

        // Validate SMTP config
        const missingConfig = [];
        if (!smtpHost) missingConfig.push('SMTP_HOST');
        if (!smtpUser) missingConfig.push('SMTP_USER');
        if (!smtpPassword) missingConfig.push('SMTP_PASSWORD');

        if (missingConfig.length > 0) {
            console.error('Missing SMTP config:', missingConfig);
            return res.status(500).json({ 
                error: 'SMTP not configured',
                missing: missingConfig
            });
        }

        // Generate HTML from template if only type is provided
        let emailHtml = html;
        let emailSubject = subject;

        if (!html && type) {
            switch (type) {
                case 'contact':
                    emailHtml = getContactEmailTemplate(templateData);
                    break;
                case 'newsletter_welcome':
                    emailHtml = getNewsletterWelcomeTemplate(templateData.name);
                    emailSubject = 'Welcome to ODUSBABA Newsletter!';
                    break;
                case 'tester_welcome':
                    emailHtml = getTesterWelcomeTemplate(templateData.name, templateData.uses || 10, templateData.days || 30);
                    emailSubject = 'Welcome to ODUSBABA Tester Program!';
                    break;
                case 'assessment_report':
                    emailHtml = getAssessmentReportTemplate(
                        templateData.userName,
                        templateData.assessmentTitle,
                        templateData.score,
                        templateData.percentage,
                        templateData.performanceLevel
                    );
                    emailSubject = `Your ${templateData.assessmentTitle} Report`;
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid email type or missing HTML content' });
            }
        }

        if (!emailHtml) {
            return res.status(400).json({ error: 'Missing email content (html) or valid type' });
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPassword,
            },
            // Add timeout to prevent hanging
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
        });

        // Verify connection
        await transporter.verify();
        
        // Send email
        const info = await transporter.sendMail({
            from: `"BluSkye Integrated Consult" <${smtpUser}>`,
            to,
            subject: emailSubject,
            html: emailHtml,
            // Add text version as fallback
            text: emailHtml.replace(/<[^>]*>/g, '')
        });

        console.log(`✅ Email sent: ${info.messageId} to ${to} (${type})`);
        
        return res.status(200).json({ 
            success: true, 
            messageId: info.messageId,
            type: type
        });
        
    } catch (error) {
        console.error('Email error:', error);
        
        // Provide more specific error messages
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
            error: error.message 
        });
    }
}
