// api/ai/generate-insights.js
// AI Insights Generation for Assessment Results

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { assessmentTitle, percentage, dimensionScores } = req.body;
    
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
        return res.status(200).json({
            summary: `You scored ${percentage}% on ${assessmentTitle}.`,
            strengths: ['Self-awareness', 'Analytical thinking'],
            improvements: ['Continuous learning', 'Practice regularly'],
            recommendations: ['Review areas with lower scores', 'Take relevant courses']
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
                    { role: 'system', content: 'You are a career coach. Provide personalized assessment insights as JSON.' },
                    { role: 'user', content: `Assessment: ${assessmentTitle}\nScore: ${percentage}%\nDimension Scores: ${JSON.stringify(dimensionScores)}\n\nReturn JSON with: summary (string), strengths (array of 2-3), improvements (array of 2-3), recommendations (array of 2-3)` }
                ],
                temperature: 0.7,
                max_tokens: 500,
                response_format: { type: "json_object" }
            })
        });
        
        const data = await response.json();
        const insights = JSON.parse(data.choices[0].message.content);
        
        return res.status(200).json(insights);
    } catch (error) {
        return res.status(200).json({
            summary: `You scored ${percentage}% on ${assessmentTitle}.`,
            strengths: ['Self-awareness', 'Analytical thinking'],
            improvements: ['Continuous learning'],
            recommendations: ['Seek mentorship', 'Take relevant courses']
        });
    }
}
