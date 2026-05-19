// src/pages/api/ai/improve-content.js
// AI Content Improvement API Endpoint

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { content, action, tone = 'professional' } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'No content provided' });
    }

    const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
        console.error('OpenAI API key not configured');
        return res.status(500).json({ error: 'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to environment variables.' });
    }

    // Build prompt based on action
    let prompt = '';
    switch (action) {
        case 'improve':
            prompt = `Improve the following article content. Make it more professional, engaging, and well-structured. Fix any grammar issues. Keep the same length and key message.\n\nContent:\n${content}\n\nImproved version:`;
            break;
        case 'summarize':
            prompt = `Summarize the following article content into 2-3 concise paragraphs. Keep the key points.\n\nContent:\n${content}\n\nSummary:`;
            break;
        case 'expand':
            prompt = `Expand the following article content with more details, examples, and insights. Add about 50% more content while maintaining quality.\n\nContent:\n${content}\n\nExpanded version:`;
            break;
        case 'headline':
            prompt = `Generate 5 compelling headline options for the following article content.\n\nContent:\n${content}\n\nHeadlines (one per line):`;
            break;
        case 'seo':
            prompt = `Generate SEO meta data for the following article content. Include a meta title (under 60 chars), meta description (under 160 chars), and 5-7 keywords.\n\nContent:\n${content}\n\nReturn as JSON: { "title": "...", "description": "...", "keywords": [...] }`;
            break;
        default:
            prompt = `Improve the following content to be more professional and engaging:\n\n${content}\n\nImproved version:`;
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
                    { 
                        role: 'system', 
                        content: 'You are a professional content editor and writer. Improve content to be clear, engaging, and professional.' 
                    },
                    { 
                        role: 'user', 
                        content: prompt 
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API error:', response.status, errorText);
            throw new Error(`OpenAI API returned ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response from OpenAI');
        }

        let result = data.choices[0].message.content;

        // Parse JSON response if needed
        if (action === 'seo') {
            try {
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                console.warn('Failed to parse SEO JSON, using raw response');
            }
        }

        return res.status(200).json({ 
            success: true, 
            result: result 
        });

    } catch (error) {
        console.error('AI content improvement error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to process content with AI' 
        });
    }
}
