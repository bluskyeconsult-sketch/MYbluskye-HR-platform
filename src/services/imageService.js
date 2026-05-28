// src/services/imageService.js - COMPLETE PRODUCTION READY
import { supabase } from '../lib/supabase';

const BLOCK_IMAGE_GENERATION = true;
const PLACEHOLDER_API = 'https://placehold.co';

export async function getOrGenerateImage(cacheKey, prompt, options = {}) {
    const { size = '1024x1024' } = options;
    
    try {
        // Check cache first
        const { data: cached } = await supabase
            .from('generated_images')
            .select('image_url')
            .eq('cache_key', cacheKey)
            .maybeSingle();
        
        if (cached) {
            return cached.image_url;
        }
        
        // Return placeholder if generation is blocked
        if (BLOCK_IMAGE_GENERATION) {
            const placeholderUrl = `${PLACEHOLDER_API}/${size}/1e293b/ffffff?text=${encodeURIComponent(prompt.substring(0, 30))}`;
            return placeholderUrl;
        }
        
        // Generate new image (costs money - only when BLOCK_IMAGE_GENERATION = false)
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
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
        
        if (!response.ok) throw new Error('Image generation failed');
        
        const data = await response.json();
        const imageUrl = data.data[0].url;
        
        // Cache the generated image
        await supabase.from('generated_images').insert({
            cache_key: cacheKey,
            image_url: imageUrl,
            prompt: prompt,
            generated_at: new Date().toISOString()
        });
        
        return imageUrl;
    } catch (error) {
        console.error('Image service error:', error);
        return `${PLACEHOLDER_API}/${size}/ef4444/ffffff?text=Image+Error`;
    }
}

export async function hasCachedImage(cacheKey) {
    const { data } = await supabase
        .from('generated_images')
        .select('id')
        .eq('cache_key', cacheKey)
        .maybeSingle();
    return !!data;
}

export async function clearImageCache() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await supabase
        .from('generated_images')
        .delete()
        .lt('generated_at', thirtyDaysAgo.toISOString());
}

export default {
    getOrGenerateImage,
    hasCachedImage,
    clearImageCache
};
