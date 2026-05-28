// src/services/imageService.js
export async function getOrGenerateImage(prompt, cacheKey) {
  // 1. Check if we already have this image
  const { data: existing } = await supabase
    .from('generated_images')
    .select('image_url')
    .eq('cache_key', cacheKey)
    .single();
  
  if (existing) {
    console.log('✅ Using cached image');
    return existing.image_url;
  }
  
  // 2. Generate new image (costs money)
  console.warn('🖼️ Generating NEW image (costs $0.04-0.08)');
  const response = await openai.images.generate({
    prompt: prompt,
    model: "gpt-image-2",
    n: 1
  });
  
  // 3. Store it for next time
  await supabase.from('generated_images').insert({
    cache_key: cacheKey,
    prompt: prompt,
    image_url: response.data[0].url,
    generated_at: new Date()
  });
  
  return response.data[0].url;
}

// Usage - this will ONLY generate ONCE per unique cacheKey
const heroImage = await getOrGenerateImage(
  "Professional HR consulting team",
  "homepage-hero-image"  // ← Same key = no regeneration
);
