// api/2fa.js
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { action, email, token, secret } = req.body;
    
    if (action === 'generate') {
        const totpSecret = speakeasy.generateSecret({
            name: `ODUSBABA:${email}`,
            length: 20,
            issuer: 'ODUSBABA'
        });
        
        const qrCodeUrl = await QRCode.toDataURL(totpSecret.otpauth_url);
        const backupCodes = Array.from({ length: 10 }, () => 
            Math.random().toString(36).substring(2, 10).toUpperCase()
        );
        
        return res.json({ secret: totpSecret.base32, qrCodeUrl, backupCodes });
    }
    
    if (action === 'verify') {
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1
        });
        
        return res.json({ verified });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
}
