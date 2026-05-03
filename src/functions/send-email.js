import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { to, subject, html, logId } = req.body;

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
    const smtpPort = parseInt(process.env.SMTP_PORT || '465');
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
    const smtpFromName = process.env.SMTP_FROM_NAME || 'ODUSBABA';

    // Validate SMTP configuration with helpful error message
    if (!smtpHost || !smtpUser || !smtpPassword) {
        console.error('SMTP configuration missing');
        return res.status(500).json({ 
            error: 'SMTP not configured. Please add environment variables in Vercel.',
            logId: logId
        });
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
    });

    try {
        // Verify connection
        await transporter.verify();
        console.log('SMTP connection verified');

        // Send email
        const info = await transporter.sendMail({
            from: `"${smtpFromName}" <${smtpFrom}>`,
            to,
            subject,
            html,
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
            error: error.message,
            logId: logId
        });
    }
}
