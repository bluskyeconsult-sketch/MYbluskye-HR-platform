// api/ai-chat.js (Enhanced with OpenAI)
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  const { message, context } = req.body;
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are ODUSBABA, an AI assistant for an HR platform. Help users with jobs, recruitment, assessments, and platform features." },
        { role: "user", content: message }
      ],
    });
    
    res.status(200).json({ reply: completion.choices[0].message.content });
  } catch (error) {
    // Fallback to rule-based responses
    res.status(200).json({ reply: getFallbackResponse(message) });
  }
}
