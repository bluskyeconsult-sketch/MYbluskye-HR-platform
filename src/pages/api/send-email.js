// src/pages/api/send-email.js
// Email API endpoint - Handles POST requests for sending emails

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { to, subject, html, emailType, logId } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get SMTP configuration from environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
    const smtpFromName = process.env.SMTP_FROM_NAME || 'ODUSBABA';

    // Validate SMTP configuration
    if (!smtpHost || !smtpUser || !smtpPassword) {
        console.error('SMTP configuration missing');
        return res.status(500).json({ error: 'SMTP not configured. Please check environment variables.' });
    }

    // Configure transporter
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
            user: smtpUser,
            pass: smtpPassword,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Verify connection configuration
        await transporter.verify();
        console.log('SMTP connection verified');

        // Send email
        const info = await transporter.sendMail({
            from: `"${smtpFromName}" <${smtpFrom}>`,
            to: to,
            subject: subject,
            html: html,
        });

        console.log('Email sent:', info.messageId);
        
        return res.status(200).json({ 
            success: true, 
            messageId: info.messageId,
            logId: logId
        });
    } catch (error) {
        console.error('Email send error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
