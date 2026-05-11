// api/send-email.js
// Place this in the ROOT folder of your project (not inside src)
// Path: /api/send-email.js

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Enable CORS
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
        const { to, subject, html } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check SMTP config
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            return res.status(500).json({ 
                error: 'SMTP not configured',
                missing: {
                    host: !process.env.SMTP_HOST,
                    user: !process.env.SMTP_USER,
                    password: !process.env.SMTP_PASSWORD
                }
            });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        await transporter.verify();
        
        const info = await transporter.sendMail({
            from: `"BluSkye Consult" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });

        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Email error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
