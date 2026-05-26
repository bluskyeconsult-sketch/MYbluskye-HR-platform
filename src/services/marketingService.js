// src/services/marketingService.js
import { API_CONFIG, buildUrl, shouldUseMockData } from '../config/api'

// Default content when API is unavailable
const DEFAULT_MARKETING_CONTENT = {
  headlines: [
    'Transform Your Career with Expert Guidance',
    'Strategic Consulting for Business Growth',
    'Data-Driven Solutions for Modern Challenges'
  ],
  subheadlines: [
    'Join thousands of successful professionals',
    'Expert-led training and development programs',
    'Tailored strategies for your unique goals'
  ],
  ctaText: 'Start Your Journey Today',
  ctaLink: '/contact',
  images: [
    '/images/marketing/hero-1.jpg',
    '/images/marketing/hero-2.jpg'
  ],
  features: [
    'Expert Consultants',
    'Proven Methodologies',
    'Custom Solutions',
    'Ongoing Support'
  ]
}

class MarketingService {
  constructor() {
    this.cache = new Map()
    this.pendingRequests = new Map()
  }

  /**
   * Fetch marketing content with caching and retry logic
   * @param {string} campaignId - Optional campaign identifier
   * @returns {Promise<Object>}
   */
  async getMarketingContent(campaignId = 'default') {
    const cacheKey = `marketing_${campaignId}`
    
    // Check cache first (5 minutes TTL)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 300000) {
      console.log('📦 Using cached marketing content')
      return cached.data
    }
    
    // Check if there's already a pending request for this campaign
    if (this.pendingRequests.has(cacheKey)) {
      console.log('⏳ Waiting for pending request')
      return this.pendingRequests.get(cacheKey)
    }
    
    // Create new request
    const requestPromise = this.fetchWithRetry(campaignId)
    this.pendingRequests.set(cacheKey, requestPromise)
    
    try {
      const data = await requestPromise
      // Cache the successful response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })
      return data
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  /**
   * Fetch with retry logic
   * @private
   */
  async fetchWithRetry(campaignId, attempt = 1) {
    const url = buildUrl(API_CONFIG.endpoints.marketing)
    const params = new URLSearchParams({ campaign: campaignId })
    const fullUrl = `${url}?${params}`
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal,
        cache: 'no-store'
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Marketing content fetched successfully')
        return data
      }
      
      // Handle specific HTTP status codes
      if (response.status === 404) {
        console.info('ℹ️ Marketing content endpoint not available, using defaults')
        return DEFAULT_MARKETING_CONTENT
      }
      
      if (response.status === 429) {
        console.warn('⚠️ Rate limited, using defaults')
        return DEFAULT_MARKETING_CONTENT
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      
    } catch (error) {
      // Handle network errors with retry logic
      if (attempt <= API_CONFIG.retryAttempts && error.name !== 'AbortError') {
        const delay = API_CONFIG.retryDelay * Math.pow(2, attempt - 1)
        console.warn(`⚠️ Retry attempt ${attempt}/${API_CONFIG.retryAttempts} after ${delay}ms`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.fetchWithRetry(campaignId, attempt + 1)
      }
      
      // After all retries fail, return defaults
      console.error('❌ Failed to fetch marketing content:', error.message)
      return DEFAULT_MARKETING_CONTENT
    }
  }

  /**
   * Clear cache (useful for admin panels)
   */
  clearCache() {
    this.cache.clear()
    console.log('🗑️ Marketing service cache cleared')
  }
}

// Export singleton instance
export const marketingService = new MarketingService()
