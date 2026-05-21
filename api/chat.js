// api/chat.js - OPTIMIZED (Best of both)
// Full production-ready chat API with fallbacks

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { messages, userId, conversationId, userTier } = req.body;
    
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
        console.error('OpenAI API key missing');
        // Return fallback response instead of error
        return res.status(200).json({ 
            reply: getFallbackResponse(messages[messages.length - 1]?.content || ''),
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
                model: 'gpt-4o-mini',  // Better than gpt-3.5-turbo
                messages: [
                    { 
                        role: 'system', 
                        content: `You are ODUSBABA, an AI Career Advisor for BluSkye Integrated Consult.
                        User ID: ${userId || 'guest'}
                        User Tier: ${userTier || 'free'}
                        
                        Rules:
                        1. Be helpful, professional, and concise
                        2. Focus on career advice, job searching, CV optimization
                        3. Suggest using Virtual Assistants for CV/cover letter help
                        4. Direct to /assessments for career assessments
                        5. Provide workplace rights and legal disclaimers when asked` 
                    },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const reply = data.choices[0].message.content;
        
        return res.status(200).json({ reply });
        
    } catch (error) {
        console.error('OpenAI error:', error);
        
        // FALLBACK: Use rule-based responses (from ai-chat.js)
        const lastMessage = messages[messages.length - 1]?.content || '';
        const fallbackReply = getFallbackResponse(lastMessage);
        
        return res.status(200).json({ 
            reply: fallbackReply,
            fallback: true 
        });
    }
}

// Fallback responses (copied from ai-chat.js pattern)
function getFallbackResponse(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('job') || msg.includes('work')) {
        return "I can help you find jobs! Browse our latest opportunities at /jobs or tell me what role you're looking for.";
    }
    if (msg.includes('cv') || msg.includes('resume')) {
        return "I recommend using our CV Makeover Virtual Assistant to optimize your resume. Visit /hire-va to get started!";
    }
    if (msg.includes('interview')) {
        return "Prepare for interviews with our Interview Coach AI. Practice common questions and get feedback at /hire-va.";
    }
    if (msg.includes('salary') || msg.includes('negotiate')) {
        return "Our Salary Negotiator can help you research market rates and prepare negotiation scripts. Check it out at /hire-va!";
    }
    if (msg.includes('assessment') || msg.includes('test')) {
        return "Discover your strengths with our professional assessments! Visit /assessments to get started.";
    }
    if (msg.includes('hello') || msg.includes('hi')) {
        return "Hello! 👋 I'm ODUSBABA, your AI Career Advisor. How can I help you today? I can assist with job searches, CV optimization, interview prep, salary negotiation, and more!";
    }
    
    return "I'm here to help with your career needs! You can ask me about jobs, CV optimization, interview preparation, salary negotiation, or our assessments. What would you like help with?";
}
