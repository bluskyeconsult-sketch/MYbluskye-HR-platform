// api/email/send.js - Email service endpoint
import nodemailer from 'nodemailer';

// Create transporter with Hostinger SMTP settings
const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
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

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { to, subject, html, test } = req.body;
    
    // Test mode
    if (test) {
        try {
            await transporter.verify();
            return res.status(200).json({ 
                success: true, 
                message: 'Email service is configured correctly' 
            });
        } catch (error) {
            return res.status(200).json({ 
                success: false, 
                error: error.message,
                message: 'Email service not configured. Add VITE_EMAIL_USER and VITE_EMAIL_PASS to env.'
            });
        }
    }
    
    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const info = await transporter.sendMail({
            from: `"ODUSBABA" <${process.env.VITE_EMAIL_USER || 'noreply@bluskyeconsult.com'}>`,
            to,
            subject,
            html
        });
        
        return res.status(200).json({ 
            success: true, 
            messageId: info.messageId 
        });
    } catch (error) {
        console.error('Email send error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
