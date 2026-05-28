// src/services/imageBlocker.js
// Safe image generation blocking - DOES NOT interfere with Supabase

export const blockImageGeneration = true;

export function isImageGenerationRequest(url) {
    return url?.includes('openai.com/v1/images/generations');
}

// This is called ONLY when you explicitly try to generate an image
export function getBlockedPlaceholder(prompt, size = '1024x1024') {
    return `https://placehold.co/${size}/1e293b/ffffff?text=${encodeURIComponent(prompt.substring(0, 30))}`;
}
