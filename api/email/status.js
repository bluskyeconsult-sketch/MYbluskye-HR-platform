// api/email/status.js - Check email service status
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    const emailUser = process.env.VITE_EMAIL_USER;
    const emailPass = process.env.VITE_EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
        return res.status(200).json({ 
            configured: false, 
            status: 'N/A',
            message: 'Email credentials not configured. Add VITE_EMAIL_USER and VITE_EMAIL_PASS.'
        });
    }
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        auth: { user: emailUser, pass: emailPass },
        tls: { rejectUnauthorized: false }
    });
    
    try {
        await transporter.verify();
        return res.status(200).json({ 
            configured: true, 
            status: 'healthy',
            message: 'Email service is working'
        });
    } catch (error) {
        return res.status(200).json({ 
            configured: true, 
            status: 'error',
            message: error.message
        });
    }
}
