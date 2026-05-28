// api/ai/status.js - Test OpenAI connectivity
export default async function handler(req, res) {
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        return res.status(200).json({ 
            configured: false, 
            message: 'OpenAI API key not configured',
            status: 'N/A'
        });
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
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
                configured: true, 
                status: 'healthy',
                message: 'OpenAI API is working'
            });
        } else {
            const error = await response.json();
            return res.status(200).json({ 
                configured: true, 
                status: 'error',
                message: error.error?.message || 'API key invalid'
            });
        }
    } catch (error) {
        return res.status(200).json({ 
            configured: true, 
            status: 'error',
            message: error.message
        });
    }
}
