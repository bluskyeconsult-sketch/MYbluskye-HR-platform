// src/lib/rateLimit.js
// Rate limiting utility for API protection

const rateLimitStore = new Map();

export function rateLimit(options = {}) {
    const {
        windowMs = 60 * 1000, // 1 minute
        max = 100, // 100 requests per minute
        statusCode = 429,
        message = 'Too many requests, please try again later.'
    } = options;

    return async function rateLimiter(req, res, next) {
        const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const now = Date.now();
        
        if (!rateLimitStore.has(key)) {
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + windowMs
            });
            return next();
        }
        
        const record = rateLimitStore.get(key);
        
        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
            return next();
        }
        
        if (record.count >= max) {
            return res.status(statusCode).json({
                error: message,
                retryAfter: Math.ceil((record.resetTime - now) / 1000)
            });
        }
        
        record.count++;
        return next();
    };
}

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

// Specific limiters for different endpoints
export const strictRateLimit = rateLimit({ max: 20, windowMs: 60 * 1000 }); // 20/minute
export const loginRateLimit = rateLimit({ max: 5, windowMs: 15 * 60 * 1000 }); // 5/15 minutes
export const apiRateLimit = rateLimit({ max: 200, windowMs: 60 * 1000 }); // 200/minute
