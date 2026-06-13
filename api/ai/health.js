// api/ai/health.js
// AI Service Health Check

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
        return res.status(200).json({ 
            status: 'degraded', 
            message: 'OpenAI API key not configured',
            configured: false
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
                messages: [{ role: 'user', content: 'Test' }],
                max_tokens: 5
            })
        });
        
        if (response.ok) {
            return res.status(200).json({ 
                status: 'healthy', 
                message: 'AI service operational',
                configured: true
            });
        } else {
            return res.status(200).json({ 
                status: 'error', 
                message: 'API key invalid or quota exceeded',
                configured: true
            });
        }
    } catch (error) {
        return res.status(200).json({ 
            status: 'error', 
            message: error.message,
            configured: true
        });
    }
}
