// src/services/imageService.js
// COMPLETE PRODUCTION READY - Safe image generation with caching and credit saving

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

// Set to true to prevent OpenAI API calls (saves credits)
// Set to false to enable actual image generation (costs money)
const BLOCK_IMAGE_GENERATION = true;

// Placeholder image service (free, no API calls)
const PLACEHOLDER_API = 'https://placehold.co';

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Check if an image is already cached
 * @param {string} cacheKey - Unique key for the image
 * @returns {Promise<string|null>} - Image URL or null
 */
async function checkCache(cacheKey) {
    try {
        const { data: cached } = await supabase
            .from('generated_images')
            .select('image_url')
            .eq('cache_key', cacheKey)
            .maybeSingle();
        
        return cached?.image_url || null;
    } catch (error) {
        console.warn('Cache check failed:', error);
        return null;
    }
}

/**
 * Save generated image to cache
 * @param {string} cacheKey - Unique key for the image
 * @param {string} imageUrl - URL of the generated image
 * @param {string} prompt - The prompt used
 */
async function saveToCache(cacheKey, imageUrl, prompt) {
    try {
        await supabase.from('generated_images').upsert({
            cache_key: cacheKey,
            image_url: imageUrl,
            prompt: prompt,
            generated_at: new Date().toISOString()
        }, {
            onConflict: 'cache_key'
        });
    } catch (error) {
        console.warn('Failed to cache image:', error);
    }
}

/**
 * Generate a placeholder image (free, no API call)
 * @param {string} prompt - Image description (used for text on placeholder)
 * @param {string} size - Image size (default '1024x1024')
 * @returns {string} - Placeholder image URL
 */
function generatePlaceholder(prompt, size = '1024x1024') {
    const text = encodeURIComponent(prompt.substring(0, 30));
    return `${PLACEHOLDER_API}/${size}/1e293b/ffffff?text=${text}`;
}

/**
 * Generate error placeholder (when generation fails)
 * @param {string} size - Image size
 * @returns {string} - Error placeholder URL
 */
function generateErrorPlaceholder(size = '1024x1024') {
    return `${PLACEHOLDER_API}/${size}/ef4444/ffffff?text=Image+Error`;
}

// ============================================
// OPENAI IMAGE GENERATION (Costs money)
// ============================================

/**
 * Call OpenAI API to generate an image (costs $0.04-0.08 per image)
 * Only called when BLOCK_IMAGE_GENERATION = false
 * @param {string} prompt - Image description
 * @param {string} size - Image size
 * @returns {Promise<string>} - Generated image URL
 */
async function callOpenAIGeneration(prompt, size = '1024x1024') {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
        console.error('OpenAI API key not configured');
        return generateErrorPlaceholder(size);
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: size,
                quality: 'standard'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Generation failed');
        }
        
        const data = await response.json();
        return data.data[0].url;
    } catch (error) {
        console.error('OpenAI generation error:', error);
        return generateErrorPlaceholder(size);
    }
}

// ============================================
// MAIN EXPORTED FUNCTION
// ============================================

/**
 * Get or generate an image with caching
 * - First checks database cache (free)
 * - If blocked, returns placeholder (free)
 * - If enabled, generates new image (costs money)
 * 
 * @param {string} cacheKey - Unique key for the image (use same key to avoid regeneration)
 * @param {string} prompt - Image description prompt
 * @param {Object} options - Optional settings
 * @returns {Promise<string>} - Image URL
 */
export async function getOrGenerateImage(cacheKey, prompt, options = {}) {
    const { size = '1024x1024' } = options;
    
    try {
        // STEP 1: Check cache first (always free)
        const cachedImage = await checkCache(cacheKey);
        if (cachedImage) {
            if (import.meta.env.DEV) console.log(`✅ Using cached image: ${cacheKey}`);
            return cachedImage;
        }
        
        // STEP 2: If generation is blocked, return placeholder (free)
        if (BLOCK_IMAGE_GENERATION) {
            if (import.meta.env.DEV) console.log(`🎨 Using placeholder for: ${cacheKey}`);
            const placeholder = generatePlaceholder(prompt, size);
            // Cache the placeholder so we don't need to generate it again
            await saveToCache(cacheKey, placeholder, prompt);
            return placeholder;
        }
        
        // STEP 3: Generate new image (costs money)
        if (import.meta.env.DEV) console.warn(`🖼️ Generating NEW image for: ${cacheKey} (costs money!)`);
        const imageUrl = await callOpenAIGeneration(prompt, size);
        
        // STEP 4: Cache the generated image
        await saveToCache(cacheKey, imageUrl, prompt);
        
        return imageUrl;
        
    } catch (error) {
        console.error('Image service error:', error);
        return generateErrorPlaceholder(size);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if an image exists in cache
 * @param {string} cacheKey - Unique key for the image
 * @returns {Promise<boolean>}
 */
export async function hasCachedImage(cacheKey) {
    const image = await checkCache(cacheKey);
    return !!image;
}

/**
 * Clear expired cache entries (older than 30 days)
 * @returns {Promise<number>} - Number of entries cleared
 */
export async function clearImageCache() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data, error } = await supabase
            .from('generated_images')
            .delete()
            .lt('generated_at', thirtyDaysAgo.toISOString())
            .select();
        
        if (error) throw error;
        
        const count = data?.length || 0;
        if (count > 0 && import.meta.env.DEV) {
            console.log(`🗑️ Cleared ${count} expired cached images`);
        }
        return count;
    } catch (error) {
        console.error('Failed to clear image cache:', error);
        return 0;
    }
}

/**
 * Manually cache an image URL (for pre-generated images)
 * @param {string} cacheKey - Unique key for the image
 * @param {string} imageUrl - URL of the image
 * @param {string} prompt - The prompt used
 */
export async function manuallyCacheImage(cacheKey, imageUrl, prompt) {
    await saveToCache(cacheKey, imageUrl, prompt);
}

/**
 * Check if image generation is currently blocked
 * @returns {boolean}
 */
export function isImageGenerationBlocked() {
    return BLOCK_IMAGE_GENERATION;
}

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
    getOrGenerateImage,
    hasCachedImage,
    clearImageCache,
    manuallyCacheImage,
    isImageGenerationBlocked
};
