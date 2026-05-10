// src/services/urlSecurityService.js
// URL Security Service - Whitelist validation for external URL access

const ALLOWED_DOMAINS = [
    // Government job sources
    'civilservicejobs.gov.uk',
    'jobs.nhs.uk',
    'publicjobs.ie',
    'jobs.gc.ca',
    'usajobs.gov',
    'apsjobs.gov.au',
    'bund.de',
    'belfastcity.gov.uk',
    
    // Legal/Law sources
    'legislation.gov.uk',
    'eur-lex.europa.eu',
    
    // Immigration sources
    'gov.uk/immigration-rules',
    'uscis.gov',
    
    // Statistics sources
    'ons.gov.uk',
    'ilostat.ilo.org',
    
    // ODUSBABA domains
    'bluskyeconsult.com'
];

const ALLOWED_PATTERNS = [
    /^https?:\/\/(www\.)?(civilservicejobs|nhs|publicjobs|gc|usajobs|apsjobs|bund)\.(gov\.uk|ie|ca|gov|au|de)/,
    /^https?:\/\/.*\.bluskyeconsult\.com/
];

export function isUrlAllowed(url) {
    if (!url) return false;
    
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        for (const domain of ALLOWED_DOMAINS) {
            if (hostname === domain || hostname.endsWith(`.${domain}`)) {
                return true;
            }
        }
        
        for (const pattern of ALLOWED_PATTERNS) {
            if (pattern.test(url)) {
                return true;
            }
        }
        
        console.warn(`Blocked access to unauthorized URL: ${url}`);
        return false;
    } catch (error) {
        console.error('Invalid URL format:', url);
        return false;
    }
}

export async function fetchAndVerifyExternalContent(url) {
    if (!isUrlAllowed(url)) {
        return { success: false, error: 'URL not authorized for external access' };
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'ODUSBABA-Security-Scanner/1.0' }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }
        
        const text = await response.text();
        const sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        return { success: true, content: sanitized };
        
    } catch (error) {
        clearTimeout(timeoutId);
        return { success: false, error: error.message };
    }
}
