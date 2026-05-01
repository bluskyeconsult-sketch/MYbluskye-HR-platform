import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

    // Configure transporter using environment variables
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    try {
        // Verify connection configuration
        await transporter.verify();
        
        // Send email
        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'ODUSBABA'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });

        console.log('Email sent:', info.messageId);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Email send error:', error);
        return res.status(500).json({ error: error.message });
    }
}
