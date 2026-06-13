// api/ai/generate-seo-title.js
// FIXED - Returns proper response

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { title } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    
    const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    // If no API key, return fallback
    if (!OPENAI_API_KEY) {
        let seoTitle = title
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (seoTitle.length > 60) {
            seoTitle = seoTitle.substring(0, 57) + '...';
        }
        return res.status(200).json({ 
            success: true, 
            seo_title: seoTitle,
            fallback: true 
        });
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Generate an SEO-optimized title (50-60 characters). Return ONLY the title.' },
                    { role: 'user', content: `Original: "${title}"\n\nSEO title:` }
                ],
                temperature: 0.5,
                max_tokens: 60
            })
        });
        
        const data = await response.json();
        let seoTitle = data.choices?.[0]?.message?.content?.trim() || title;
        
        // Ensure length
        if (seoTitle.length > 60) {
            seoTitle = seoTitle.substring(0, 57) + '...';
        }
        
        return res.status(200).json({ success: true, seo_title: seoTitle });
    } catch (error) {
        console.error('SEO generation error:', error);
        
        // Fallback
        let seoTitle = title
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (seoTitle.length > 60) {
            seoTitle = seoTitle.substring(0, 57) + '...';
        }
        
        return res.status(200).json({ success: true, seo_title: seoTitle, fallback: true });
    }
}
