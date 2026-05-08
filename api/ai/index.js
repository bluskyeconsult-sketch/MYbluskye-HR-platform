// api/ai/index.js
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
  maxDuration: 30
};

// Professional personalised career advisor system prompt
const SYSTEM_PROMPT = `You are ODUSBABA, a professional career advisor and AI assistant for BluSkye Consult's HR platform. 
Your tone is professional, data-driven, and personalised. You speak like a trusted career coach.
Use phrases like "Based on your profile...", "I recommend...", "Let me guide you...", "Here's what I found for you..."
Provide actionable, specific advice tailored to the user's context.
Be empathetic but professional. Focus on career growth, skill development, job searching, and professional success.`;

async function callOpenAI(prompt, customSystemPrompt = null) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not configured, using fallback responses');
    return null;
  }
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: customSystemPrompt || SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return null;
  }
}

export default async function handler(req, res) {
  const { path } = req.query;
  const endpoint = path?.[0] || 'chat';
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // ========== CHAT ENDPOINT ==========
    if (endpoint === 'chat') {
      const { message, context } = req.body;
      const prompt = `Context: User role is ${context?.userRole || 'job seeker'}, on page ${context?.page || 'unknown'}.
      
User question: "${message}"

Provide professional, personalised career guidance. Be specific and actionable. Include relevant suggestions based on the user's likely needs.`;
      
      const aiResponse = await callOpenAI(prompt);
      
      if (aiResponse) {
        return res.status(200).json({ reply: aiResponse });
      }
      
      // Fallback response
      return res.status(200).json({ 
        reply: `Based on your question about "${message.substring(0, 50)}...", here's my professional guidance:\n\n` +
               `I recommend focusing on your specific career goals and skill development needs. ` +
               `Would you like me to provide more detailed information about job searching, skill building, or interview preparation?`
      });
    }
    
    // ========== RESUME ANALYSIS ==========
    if (endpoint === 'analyze-resume') {
      const { resumeText, targetJobTitle } = req.body;
      
      const prompt = `Analyze this resume and provide a professional, personalised assessment:

Resume text: ${resumeText.substring(0, 3000)}
Target role: ${targetJobTitle || 'Not specified'}

Return a JSON object with:
