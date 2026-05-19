// api/get-ip.js
// Simple API to get client IP address for analytics

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Get real IP from various headers (in order of reliability)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.headers['cf-connecting-ip'] || // Cloudflare
               req.headers['true-client-ip'] ||
               req.socket.remoteAddress ||
               '0.0.0.0';
    
    // Remove IPv6 prefix if present (::ffff:192.0.2.1 -> 192.0.2.1)
    const cleanIp = ip.replace(/^::ffff:/, '');
    
    // Don't log localhost for privacy (still return it for testing)
    if (cleanIp !== '::1' && cleanIp !== '127.0.0.1' && cleanIp !== '0.0.0.0') {
        console.log(`IP detected: ${cleanIp}`);
    }
    
    res.status(200).json({ 
        ip: cleanIp,
        timestamp: new Date().toISOString()
    });
}
