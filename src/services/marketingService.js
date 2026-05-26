// src/services/marketingService.js
// HYBRID MARKETING SERVICE - API-first with local fallback, campaign support

// ============================================
// CONSTANTS
// ============================================

const API_CONFIG = {
    endpoints: {
        marketing: '/api/marketing/content'
    },
    timeout: 10000,
    retryAttempts: 2,
    retryDelay: 1000,
    cacheTTL: 5 * 60 * 1000 // 5 minutes
};

// Default marketing content (fallback when API unavailable)
const DEFAULT_MARKETING_CONTENT = {
    default: {
        headlines: [
            'Transform Your Career with BluSkye Consult',
            'Expert Guidance for Professional Growth',
            'Strategic Solutions for Modern Business',
            'Your Path to Success Starts Here'
        ],
        subheadlines: [
            'Join thousands of successful professionals',
            'Industry-leading expertise at your fingertips',
            'Tailored strategies for unique challenges',
            'Proven methodologies, exceptional results'
        ],
        ctaText: 'Start Your Journey',
        ctaLink: '/contact',
        features: [
            'Expert Consultants',
            'Proven Track Record',
            'Custom Solutions',
            '24/7 Support'
        ]
    },
    careers: {
        headlines: [
            'Join Our Growing Team',
            'Build Your Career with Us',
            'Opportunities Await You',
            'Shape the Future of Work'
        ],
        subheadlines: [
            'We\'re hiring talented professionals',
            'Competitive benefits and growth',
            'Work with industry leaders',
            'Remote-first culture'
        ],
        ctaText: 'View Openings',
        ctaLink: '/jobs',
        features: [
            'Remote Friendly',
            'Great Benefits',
            'Career Growth',
            'Inclusive Culture'
        ]
    },
    learning: {
        headlines: [
            'Expand Your Knowledge',
            'Learn from Industry Experts',
            'Courses That Deliver Results',
            'Upskill for the Future'
        ],
        subheadlines: [
            'Access our premium course library',
            'Learn at your own pace',
            'Certificates upon completion',
            'Practical, real-world skills'
        ],
        ctaText: 'Explore Courses',
        ctaLink: '/courses',
        features: [
            'Self-Paced',
            'Expert Led',
            'Hands-On Projects',
            'Lifetime Access'
        ]
    }
};

// ============================================
// MARKETING SERVICE CLASS
// ============================================

class MarketingService {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
    }

    /**
     * Build URL with query parameters
     * @private
     */
    _buildUrl(campaignId) {
        const url = API_CONFIG.endpoints.marketing;
        const params = new URLSearchParams({ campaign: campaignId });
        return `${url}?${params}`;
    }

    /**
     * Fetch with retry logic
     * @private
     */
    async _fetchWithRetry(campaignId, attempt = 1) {
        const url = this._buildUrl(campaignId);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                signal: controller.signal,
                cache: 'no-store'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Marketing content fetched for campaign: ${campaignId}`);
                return data;
            }
            
            // Handle specific HTTP status codes
            if (response.status === 404) {
                console.info(`ℹ️ Marketing endpoint not found for ${campaignId}, using defaults`);
                return DEFAULT_MARKETING_CONTENT[campaignId] || DEFAULT_MARKETING_CONTENT.default;
            }
            
            if (response.status === 429) {
                console.warn('⚠️ Rate limited, using defaults');
                return DEFAULT_MARKETING_CONTENT[campaignId] || DEFAULT_MARKETING_CONTENT.default;
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
        } catch (error) {
            // Handle network errors with retry logic
            if (attempt <= API_CONFIG.retryAttempts && error.name !== 'AbortError') {
                const delay = API_CONFIG.retryDelay * Math.pow(2, attempt - 1);
                console.warn(`⚠️ Retry attempt ${attempt}/${API_CONFIG.retryAttempts} after ${delay}ms`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this._fetchWithRetry(campaignId, attempt + 1);
            }
            
            // After all retries fail, return defaults
            console.error(`❌ Failed to fetch marketing content for ${campaignId}:`, error.message);
            return DEFAULT_MARKETING_CONTENT[campaignId] || DEFAULT_MARKETING_CONTENT.default;
        }
    }

    /**
     * Fetch marketing content with caching and retry logic
     * @param {string} campaignId - Campaign identifier (default, careers, learning)
     * @returns {Promise<Object>}
     */
    async getMarketingContent(campaignId = 'default') {
        const cacheKey = `marketing_${campaignId}`;
        
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < API_CONFIG.cacheTTL) {
            console.log(`📦 Using cached marketing content for ${campaignId}`);
            return cached.data;
        }
        
        // Check for pending request to avoid duplicates
        if (this.pendingRequests.has(cacheKey)) {
            console.log(`⏳ Waiting for pending request for ${campaignId}`);
            return this.pendingRequests.get(cacheKey);
        }
        
        // Create new request
        const requestPromise = this._fetchWithRetry(campaignId);
        this.pendingRequests.set(cacheKey, requestPromise);
        
        try {
            const data = await requestPromise;
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            return data;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    /**
     * Get content synchronously for immediate use (no API call)
     * @param {string} campaignId - Campaign identifier
     * @returns {Object}
     */
    getMarketingContentSync(campaignId = 'default') {
        return DEFAULT_MARKETING_CONTENT[campaignId] || DEFAULT_MARKETING_CONTENT.default;
    }

    /**
     * Preload content for multiple campaigns
     * @param {string[]} campaignIds - Array of campaign IDs to preload
     */
    async preloadContent(campaignIds = ['default', 'careers', 'learning']) {
        const promises = campaignIds.map(id => this.getMarketingContent(id));
        await Promise.allSettled(promises);
        console.log(`✅ Preloaded ${campaignIds.length} marketing campaigns`);
    }

    /**
     * Clear cache (useful for admin panels)
     * @param {string} campaignId - Optional specific campaign to clear
     */
    clearCache(campaignId = null) {
        if (campaignId) {
            const cacheKey = `marketing_${campaignId}`;
            this.cache.delete(cacheKey);
            console.log(`🗑️ Cache cleared for campaign: ${campaignId}`);
        } else {
            this.cache.clear();
            console.log('🗑️ Marketing service cache fully cleared');
        }
    }

    /**
     * Check if content is available in cache
     * @param {string} campaignId - Campaign identifier
     * @returns {boolean}
     */
    isCached(campaignId = 'default') {
        const cacheKey = `marketing_${campaignId}`;
        const cached = this.cache.get(cacheKey);
        return cached && Date.now() - cached.timestamp < API_CONFIG.cacheTTL;
    }
}

// Export singleton instance
export const marketingService = new MarketingService();

// Export default content for direct imports (no async needed)
export const marketingContent = DEFAULT_MARKETING_CONTENT;
