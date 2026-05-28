// src/services/imageService.js
// COMPLETE IMAGE SERVICE - Caching, cost saving, and generation control
// Prevents duplicate image generation costs by caching all generated images

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Block image generation globally (set to true to disable all image generation)
const BLOCK_IMAGE_GENERATION = true; // Set to false to allow image generation

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Get cached image URL if it exists
 * @param {string} cacheKey - Unique key for the image
 * @returns {Promise<string|null>} - Image URL or null if not found
 */
export async function getCachedImage(cacheKey) {
    try {
        const { data, error } = await supabase
            .from('generated_images')
            .select('image_url, prompt, generated_at, expires_at')
            .eq('cache_key', cacheKey)
            .maybeSingle(); // Use maybeSingle to avoid 0 rows error
        
        if (error) {
            console.error('Cache lookup error:', error);
            return null;
        }
        
        if (data) {
            // Check if cache entry has expired (if expires_at is set)
            if (data.expires_at && new Date(data.expires_at) < new Date()) {
                console.log(`⏰ Cache entry for "${cacheKey}" expired, will regenerate`);
                return null;
            }
            
            console.log(`✅ Using cached image for: ${cacheKey}`);
            return data.image_url;
        }
        
        return null;
    } catch (err) {
        console.warn('Cache lookup failed:', err);
        return null;
    }
}

/**
 * Save generated image to cache
 * @param {string} cacheKey - Unique key for the image
 * @param {string} imageUrl - URL of the generated image
 * @param {string} prompt - The prompt used to generate the image
 * @param {number} ttlDays - Time to live in days (default 30)
 * @returns {Promise<boolean>} - Success status
 */
export async function cacheImage(cacheKey, imageUrl, prompt, ttlDays = 30) {
    try {
        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + ttlDays);
        
        const { error } = await supabase
            .from('generated_images')
            .upsert({
                cache_key: cacheKey,
                image_url: imageUrl,
                prompt: prompt,
                generated_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                use_count: 1
            }, {
                onConflict: 'cache_key'
            });
        
        if (error) {
            console.error('Cache save error:', error);
            return false;
        }
        
        console.log(`💾 Cached image for: ${cacheKey} (expires in ${ttlDays} days)`);
        return true;
    } catch (err) {
        console.warn('Cache save failed:', err);
        return false;
    }
}

/**
 * Increment usage count for a cached image
 * @param {string} cacheKey - Unique key for the image
 */
export async function incrementImageUsage(cacheKey) {
    try {
        await supabase
            .from('generated_images')
            .update({ use_count: supabase.rpc('increment', { x: 1 }) })
            .eq('cache_key', cacheKey);
    } catch (err) {
        // Non-critical, ignore errors
    }
}

// ============================================
// IMAGE GENERATION (with blocking)
// ============================================

/**
 * Generate a new image using OpenAI (costs money)
 * @param {string} prompt - Image description prompt
 * @param {string} size - Image size (default '1024x1024')
 * @param {string} quality - Image quality ('standard' or 'hd')
 * @returns {Promise<string>} - Generated image URL
 */
async function generateNewImage(prompt, size = '1024x1024', quality = 'standard') {
    // Check if image generation is blocked
    if (BLOCK_IMAGE_GENERATION) {
        console.warn('🚫 Image generation is BLOCKED to save credits. Returning placeholder.');
        // Return a placeholder image URL
        return `https://placehold.co/1024x1024/1e293b/ffffff?text=${encodeURIComponent(prompt.substring(0, 50))}`;
    }
    
    if (!OPENAI_API_KEY) {
        console.error('❌ OpenAI API key not configured');
        throw new Error('OpenAI API key not configured for image generation');
    }
    
    console.warn(`🖼️ Generating NEW image (costs $0.04-0.08) - Prompt: "${prompt.substring(0, 50)}..."`);
    
    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: size,
                quality: quality,
                response_format: 'url'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Image generation failed');
        }
        
        const data = await response.json();
        return data.data[0].url;
    } catch (error) {
        console.error('Image generation error:', error);
        // Return placeholder on failure
        return `https://placehold.co/1024x1024/1e293b/ffffff?text=Image+Unavailable`;
    }
}

// ============================================
// MAIN EXPORTED FUNCTIONS
// ============================================

/**
 * Get or generate an image with caching (cost-effective)
 * @param {string} cacheKey - Unique key for the image (use same key to avoid regeneration)
 * @param {string} prompt - Image description prompt
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - Image URL
 */
export async function getOrGenerateImage(cacheKey, prompt, options = {}) {
    const { size = '1024x1024', quality = 'standard', ttlDays = 30 } = options;
    
    // First, check cache
    const cachedImage = await getCachedImage(cacheKey);
    if (cachedImage) {
        await incrementImageUsage(cacheKey);
        return cachedImage;
    }
    
    // Generate new image
    const imageUrl = await generateNewImage(prompt, size, quality);
    
    // Save to cache
    await cacheImage(cacheKey, imageUrl, prompt, ttlDays);
    
    return imageUrl;
}

/**
 * Get or generate an image with custom generation function
 * @param {string} cacheKey - Unique key for the image
 * @param {Function} generateFunction - Function that returns a promise with image URL
 * @returns {Promise<string>} - Image URL
 */
export async function getOrGenerateImageCustom(cacheKey, generateFunction) {
    // Check cache first
    const cachedImage = await getCachedImage(cacheKey);
    if (cachedImage) {
        await incrementImageUsage(cacheKey);
        return cachedImage;
    }
    
    // Generate new image using custom function
    const imageUrl = await generateFunction();
    
    // Save to cache
    await cacheImage(cacheKey, imageUrl, 'custom-generation', 30);
    
    return imageUrl;
}

/**
 * Check if an image exists in cache
 * @param {string} cacheKey - Unique key for the image
 * @returns {Promise<boolean>}
 */
export async function hasCachedImage(cacheKey) {
    const image = await getCachedImage(cacheKey);
    return !!image;
}

/**
 * Clear expired cache entries
 * @returns {Promise<number>} - Number of entries cleared
 */
export async function clearExpiredCache() {
    try {
        const { data, error } = await supabase
            .from('generated_images')
            .delete()
            .lt('expires_at', new Date().toISOString())
            .select();
        
        if (error) throw error;
        
        const count = data?.length || 0;
        if (count > 0) {
            console.log(`🗑️ Cleared ${count} expired cached images`);
        }
        return count;
    } catch (err) {
        console.error('Failed to clear expired cache:', err);
        return 0;
    }
}

/**
 * Pre-generate images for common use cases (run on build or startup)
 */
export async function pregenerateImages() {
    const commonImages = [
        { cacheKey: 'homepage-hero', prompt: 'Professional HR consulting team helping diverse professionals in a modern office setting' },
        { cacheKey: 'workforce-marketplace', prompt: 'Global workforce marketplace connecting employers with talented professionals' },
        { cacheKey: 'ai-chat-illustration', prompt: 'Friendly AI chatbot assistant helping with career advice' },
        { cacheKey: 'assessment-illustration', prompt: 'Professional taking a skills assessment on a computer' }
    ];
    
    for (const { cacheKey, prompt } of commonImages) {
        const exists = await hasCachedImage(cacheKey);
        if (!exists) {
            console.log(`Pre-generating image for: ${cacheKey}`);
            await getOrGenerateImage(cacheKey, prompt);
        }
    }
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// Example 1: Simple usage with cache
const heroImage = await getOrGenerateImage(
    'homepage-hero-image',
    'Professional HR consulting team working with diverse professionals in a bright modern office'
);
// First call: generates image (costs money) and caches it
// Second call: returns cached image (free)

// Example 2: With custom options
const detailedImage = await getOrGenerateImage(
    'detailed-illustration',
    'AI-powered career platform interface showing job recommendations',
    { size: '1792x1024', quality: 'hd', ttlDays: 60 }
);

// Example 3: Using custom generation function
const image = await getOrGenerateImageCustom('unique-key', async () => {
    // Your custom generation logic
    return await someOtherImageAPI.generate();
});

// Example 4: Check if image exists
if (await hasCachedImage('homepage-hero-image')) {
    console.log('Image is cached, ready to use');
}
*/

export default {
    getOrGenerateImage,
    getOrGenerateImageCustom,
    getCachedImage,
    cacheImage,
    hasCachedImage,
    clearExpiredCache,
    pregenerateImages
};
