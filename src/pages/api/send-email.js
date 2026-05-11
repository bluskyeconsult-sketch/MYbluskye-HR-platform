// src/pages/api/send-email.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields' });
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

    try {
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
