// src/pages/api/send-email.js
// Enhanced with better error handling

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const { to, subject, html } = req.body;

        // Validate required fields
        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check for required environment variables
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT;
        const smtpUser = process.env.SMTP_USER;
        const smtpPassword = process.env.SMTP_PASSWORD;

        if (!smtpHost || !smtpUser || !smtpPassword) {
            console.error('Missing SMTP config:', { 
                hasHost: !!smtpHost, 
                hasUser: !!smtpUser, 
                hasPassword: !!smtpPassword 
            });
            return res.status(500).json({ 
                error: 'SMTP not configured. Please check environment variables.',
                missing: {
                    host: !smtpHost,
                    user: !smtpUser,
                    password: !smtpPassword
                }
            });
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort || '587'),
            secure: smtpPort === '465',
            auth: {
                user: smtpUser,
                pass: smtpPassword,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection
        await transporter.verify();
        
        // Send email
        const info = await transporter.sendMail({
            from: `"BluSkye Consult" <${smtpUser}>`,
            to,
            subject,
            html,
        });

        return res.status(200).json({ 
            success: true, 
            messageId: info.messageId 
        });

    } catch (error) {
        console.error('Email error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
