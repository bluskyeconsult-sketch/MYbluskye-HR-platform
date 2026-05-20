// api/ai/generate-assessment.js
// AI Assessment Generator API Endpoint

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
    
    const { topic, difficulty = 'intermediate', numberOfQuestions = 10 } = req.body;
    
    if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
    }
    
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
        console.error('OpenAI API key missing');
        return res.status(500).json({ 
            success: false, 
            error: 'OpenAI API key not configured',
            fallback: true
        });
    }
    
    const prompt = `Create a professional ${difficulty} level assessment on "${topic}" with exactly ${numberOfQuestions} multiple-choice questions.

Return as JSON with this exact structure:
{
    "title": "Assessment title",
    "description": "2-3 sentence description of what this assessment measures",
    "instructions": "Clear instructions for test takers",
    "category": "leadership|personality|communication|problem_solving|career_aptitude|team_collaboration|emotional_intelligence",
    "time_limit_minutes": 30,
    "questions": [
        {
            "question_text": "Question text?",
            "question_type": "multiple_choice",
            "points": 1,
            "dimension": "relevant_dimension",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": 0
        }
    ]
}

Requirements:
- Questions should be insightful and professional
- Options should be clear and distinct
- correct_answer is the index (0-3) of the correct option
- Each question should assess a different aspect of the topic
- Questions should progressively increase in difficulty
- Make it suitable for career development context

Return ONLY valid JSON, no other text.`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
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
                        content: 'You are an expert psychometrician and assessment designer. Create professional, validated assessment questions. Return ONLY valid JSON.' 
                    },
                    { 
                        role: 'user', 
                        content: prompt 
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000,
                response_format: { type: "json_object" }
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`OpenAI API returned ${response.status}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        const assessment = JSON.parse(content);
        
        // Validate required fields
        if (!assessment.title || !assessment.questions || assessment.questions.length === 0) {
            throw new Error('Invalid assessment structure from AI');
        }
        
        return res.status(200).json({ 
            success: true, 
            ...assessment 
        });
        
    } catch (error) {
        console.error('AI assessment generation error:', error);
        
        // Fallback: Generate a simple template-based assessment
        const fallbackAssessment = generateFallbackAssessment(topic, difficulty, numberOfQuestions);
        
        return res.status(200).json({ 
            success: true, 
            fallback: true,
            ...fallbackAssessment
        });
    }
}

function generateFallbackAssessment(topic, difficulty, numberOfQuestions) {
    const categories = ['leadership', 'communication', 'problem_solving', 'career_aptitude'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    const questions = [];
    for (let i = 0; i < numberOfQuestions; i++) {
        questions.push({
            question_text: `Sample question ${i + 1} about ${topic}. This is a placeholder question for the ${difficulty} level assessment.`,
            question_type: 'multiple_choice',
            points: 1,
            dimension: topic.toLowerCase().replace(/\s/g, '_'),
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_answer: 0
        });
    }
    
    return {
        title: `${topic} Assessment`,
        description: `This ${difficulty} level assessment measures your knowledge and skills in ${topic}.`,
        instructions: 'Please answer all questions to the best of your ability. Choose the best answer for each question.',
        category: randomCategory,
        time_limit_minutes: Math.max(15, Math.min(45, Math.floor(numberOfQuestions * 1.5))),
        questions: questions
    };
}
