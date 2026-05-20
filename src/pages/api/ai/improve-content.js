// src/pages/api/ai/improve-content.js
// COMPLETE AI CONTENT IMPROVEMENT API ENDPOINT
// Features: Multiple actions (improve, summarize, expand, headline, seo), fallback handling, CORS support

export default async function handler(req, res) {
    // ============================================
    // 1. CORS Headers
    // ============================================
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // ============================================
    // 2. Handle Preflight OPTIONS Request
    // ============================================
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ============================================
    // 3. Method Validation
    // ============================================
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed. Use POST.' 
        });
    }

    // ============================================
    // 4. Get OpenAI API Key (server-side only)
    // ============================================
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
        console.error('OpenAI API key missing');
        return res.status(500).json({ 
            success: false, 
            error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.',
            fallback: true
        });
    }

    // ============================================
    // 5. Parse Request Body
    // ============================================
    const { content, action = 'improve', tone = 'professional' } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ 
            success: false,
            error: 'No content provided' 
        });
    }

    // ============================================
    // 6. Build Prompt Based on Action
    // ============================================
    let prompt = '';
    let systemPrompt = 'You are a professional content editor and writer. Return ONLY the requested output, no explanations.';

    switch (action) {
        case 'improve':
            prompt = `Improve the following text. Make it more professional, clear, and engaging. Fix grammar and spelling. Keep the same meaning and length.\n\nText:\n${content}\n\nImproved text:`;
            break;
            
        case 'summarize':
            prompt = `Summarize the following text in 2-3 concise paragraphs. Keep the key points and main message.\n\nText:\n${content}\n\nSummary:`;
            break;
            
        case 'expand':
            prompt = `Expand the following text with more details, examples, and insights. Add about 50% more content while maintaining quality.\n\nText:\n${content}\n\nExpanded text:`;
            break;
            
        case 'headline':
            prompt = `Generate 5 compelling headline options for the following article content. Make them engaging and click-worthy.\n\nContent:\n${content}\n\nHeadlines (one per line, numbered):`;
            break;
            
        case 'seo':
            systemPrompt = 'You are an SEO expert. Generate SEO metadata as JSON only.';
            prompt = `Generate SEO meta data for the following article content. 
Return ONLY valid JSON with this exact structure:
{
    "title": "SEO title under 60 characters",
    "description": "Meta description under 160 characters",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Content:
${content}`;
            break;
            
        default:
            prompt = `Improve the following text to be more professional and engaging:\n\n${content}\n\nImproved text:`;
    }

    // ============================================
    // 7. Call OpenAI API with Timeout
    // ============================================
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: action === 'headline' ? 0.8 : 0.7,
                max_tokens: action === 'expand' ? 2500 : 1500
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // ============================================
        // 8. Handle OpenAI API Errors
        // ============================================
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API error:', response.status, errorText);
            
            const errorMessages = {
                401: 'Invalid OpenAI API key. Please check your credentials.',
                429: 'OpenAI rate limit reached. Please try again later.',
                402: 'OpenAI billing issue. Please check your account balance.',
                500: 'OpenAI server error. Please try again later.'
            };
            
            return res.status(500).json({ 
                success: false, 
                error: errorMessages[response.status] || `OpenAI API returned ${response.status}`,
                status: response.status
            });
        }

        // ============================================
        // 9. Parse and Process Response
        // ============================================
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response from OpenAI');
        }

        let result = data.choices[0].message.content;

        // Process SEO response (extract JSON)
        if (action === 'seo') {
            try {
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                } else {
                    // Return default SEO structure if parsing fails
                    result = {
                        title: result.substring(0, 60),
                        description: result.substring(0, 160),
                        keywords: ['career', 'development', 'skills', 'job', 'opportunity']
                    };
                }
            } catch (e) {
                console.warn('Failed to parse SEO JSON, using defaults');
                result = {
                    title: result.substring(0, 60),
                    description: result.substring(0, 160),
                    keywords: ['career', 'development', 'skills', 'job', 'opportunity']
                };
            }
        }

        // Process headlines (split into array)
        if (action === 'headline' && typeof result === 'string') {
            const headlines = result
                .split(/\d+\.\s+/)
                .filter(h => h.trim().length > 0)
                .map(h => h.trim());
            result = headlines.length >= 3 ? headlines : [result];
        }

        // ============================================
        // 10. Return Success Response
        // ============================================
        return res.status(200).json({ 
            success: true, 
            result: result,
            action: action,
            original_length: content.length,
            result_length: typeof result === 'string' ? result.length : JSON.stringify(result).length
        });

    } catch (error) {
        console.error('AI content improvement error:', error);
        
        // Handle timeout specifically
        if (error.name === 'AbortError') {
            return res.status(504).json({ 
                success: false, 
                error: 'Request timeout. Please try again.',
                fallback: true
            });
        }
        
        // ============================================
        // 11. Fallback Responses (No AI)
        // ============================================
        let fallbackResult;
        switch (action) {
            case 'improve':
                fallbackResult = fallbackImproveContent(content);
                break;
            case 'summarize':
                fallbackResult = fallbackSummarize(content);
                break;
            case 'expand':
                fallbackResult = fallbackExpand(content);
                break;
            case 'headline':
                fallbackResult = fallbackHeadlines(content);
                break;
            case 'seo':
                fallbackResult = fallbackSEO(content);
                break;
            default:
                fallbackResult = content;
        }
        
        return res.status(200).json({ 
            success: true, 
            result: fallbackResult,
            action: action,
            fallback: true,
            message: 'AI service unavailable. Used fallback processing.'
        });
    }
}

// ============================================
// FALLBACK FUNCTIONS (When AI is unavailable)
// ============================================

function fallbackImproveContent(text) {
    if (!text) return text;
    
    let improved = text;
    
    // Capitalize first letter of sentences
    improved = improved.replace(/([.!?])\s*([a-z])/g, (match, p1, p2) => `${p1} ${p2.toUpperCase()}`);
    improved = improved.charAt(0).toUpperCase() + improved.slice(1);
    
    // Fix multiple spaces
    improved = improved.replace(/\s+/g, ' ');
    
    // Fix spaces before punctuation
    improved = improved.replace(/\s+([.,!?:;])/g, '$1');
    
    // Fix common typos
    const typos = {
        'teh': 'the', 'adn': 'and', 'wih': 'with', 'thier': 'their',
        'recieve': 'receive', 'acheive': 'achieve', 'practise': 'practice'
    };
    for (const [wrong, correct] of Object.entries(typos)) {
        improved = improved.replace(new RegExp(wrong, 'gi'), correct);
    }
    
    return improved;
}

function fallbackSummarize(text) {
    // Take first 2-3 sentences as summary
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 3).join('. ') + '.';
    return summary.length > 500 ? summary.substring(0, 497) + '...' : summary;
}

function fallbackExpand(text) {
    // Simple expansion: add transitional phrases and examples
    const expansions = [
        ' In addition,', ' Furthermore,', ' For example,', ' Importantly,',
        ' As a result,', ' Consequently,'
    ];
    
    let expanded = text;
    const sentences = text.split(/[.!?]+/);
    if (sentences.length > 2) {
        const midPoint = Math.floor(sentences.length / 2);
        expanded = sentences.slice(0, midPoint).join('. ') + 
                   expansions[Math.floor(Math.random() * expansions.length)] + ' ' +
                   sentences.slice(midPoint).join('. ');
    }
    
    return expanded;
}

function fallbackHeadlines(content) {
    const title = content.substring(0, 50);
    return [
        `${title}: A Complete Guide`,
        `Everything You Need to Know About ${title}`,
        `${title} - Expert Insights and Tips`,
        `Mastering ${title}: Strategies for Success`,
        `The Ultimate Guide to ${title}`
    ];
}

function fallbackSEO(content) {
    const title = content.substring(0, 50).replace(/[^\w\s]/g, '');
    return {
        title: title.length > 60 ? title.substring(0, 57) + '...' : title,
        description: content.substring(0, 157) + '...',
        keywords: ['career', 'development', 'skills', 'job', 'opportunity', 'growth', 'success']
    };
}
