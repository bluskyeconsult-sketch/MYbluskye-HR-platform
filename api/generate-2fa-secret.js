// api/generate-2fa-secret.js (Vercel Serverless Function)
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

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
    
    try {
        const { email } = req.body;
        
        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
            name: `ODUSBABA:${email}`,
            length: 20,
            issuer: 'ODUSBABA'
        });
        
        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        
        // Generate backup codes
        const backupCodes = Array.from({ length: 10 }, () => {
            return Math.random().toString(36).substring(2, 10).toUpperCase();
        });
        
        return res.status(200).json({
            secret: secret.base32,
            qrCodeUrl,
            backupCodes
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
