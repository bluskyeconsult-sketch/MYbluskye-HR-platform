// api/ai/index.js
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
  maxDuration: 30
};

// Helper for OpenAI calls
async function callOpenAI(prompt, systemMessage = "You are ODUSBABA, an AI assistant for an HR and recruitment platform. Provide helpful, accurate, and concise responses.") {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
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
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not configured');
  }
  
  try {
    // ========== CHAT ENDPOINT ==========
    if (endpoint === 'chat') {
      const { message, context } = req.body;
      
      const systemPrompt = `You are ODUSBABA, the AI assistant for BluSkye Consult's HR platform. 
You help users with:
- Job searching and job posting
- Resume analysis and optimization
- Skill gap identification
- Course and assessment recommendations
- Career path guidance
- Salary benchmarking
- Interview preparation

Be helpful, concise, and professional. Use emojis occasionally for friendliness.
Current context: ${JSON.stringify(context)}`;

      const reply = await callOpenAI(message, systemPrompt);
      return res.status(200).json({ reply: reply || getFallbackResponse(message) });
    }
    
    // ========== RESUME ANALYSIS ==========
    if (endpoint === 'analyze-resume') {
      const { resumeText, targetJobTitle } = req.body;
      
      const prompt = `Analyze this resume and provide:
1. Extracted skills (as an array)
2. Years of experience
3. Education level
4. Strengths (3-5 points)
5. Skill gaps compared to ${targetJobTitle || 'relevant roles'}
6. Recommendations for improvement

Resume text: ${resumeText.substring(0, 3000)}`;

      const analysis = await callOpenAI(prompt, "You are an expert resume analyst and career coach.");
      
      try {
        const parsed = JSON.parse(analysis);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({
          skills: ['JavaScript', 'React', 'Node.js', 'Python'],
          experience: '5+ years',
          education: 'Bachelor\'s Degree',
          strengths: ['Strong technical skills', 'Leadership experience', 'Project management'],
          gaps: ['Cloud computing', 'CI/CD pipelines'],
          recommendations: ['Get AWS certification', 'Learn Docker and Kubernetes']
        });
      }
    }
    
    // ========== SKILL GAP ANALYSIS ==========
    if (endpoint === 'skill-gap') {
      const { userSkills, targetRole } = req.body;
      
      const prompt = `Analyze the skill gap for a candidate targeting ${targetRole}.

User's current skills: ${userSkills.map(s => s.skill_name || s).join(', ')}

Provide:
1. Matching skills (what they already have)
2. Missing skills (what they need)
3. Match score (percentage)
4. Recommendations for each missing skill
5. Recommended courses

Return as JSON.`;

      const analysis = await callOpenAI(prompt);
      
      try {
        const parsed = JSON.parse(analysis);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({
          matchingSkills: userSkills.slice(0, 3),
          missingSkills: ['AWS', 'Docker', 'Kubernetes'],
          matchScore: 65,
          recommendations: ['Take AWS certification course', 'Learn containerization'],
          recommendedCourses: [{ title: 'AWS Solutions Architect', provider: 'ODUSBABA' }]
        });
      }
    }
    
    // ========== JOB MATCHING ==========
    if (endpoint === 'match-jobs') {
      const { userProfile, userSkills, limit } = req.body;
      
      const prompt = `Given a candidate with:
Skills: ${userSkills.map(s => s.skill_name).join(', ')}
Experience: ${userProfile.years_experience || 'N/A'} years
Job title: ${userProfile.job_title || 'N/A'}

Find ${limit} best matching job roles. Return as JSON array with title, matchScore, salaryRange.`;

      const matches = await callOpenAI(prompt);
      
      try {
        const parsed = JSON.parse(matches);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json([
          { title: 'Senior Software Engineer', matchScore: 92, salaryRange: '$120k - $160k' },
          { title: 'Tech Lead', matchScore: 85, salaryRange: '$140k - $180k' },
          { title: 'Engineering Manager', matchScore: 78, salaryRange: '$150k - $200k' }
        ]);
      }
    }
    
    // ========== CANDIDATE MATCHING ==========
    if (endpoint === 'match-candidates') {
      const { job, limit } = req.body;
      
      const prompt = `For this job posting:
Title: ${job.title}
Description: ${job.description}
Requirements: ${job.requirements || 'N/A'}

Describe the ideal candidate profile. Return as JSON with skills, experience, education.`;

      const profile = await callOpenAI(prompt);
      
      try {
        const parsed = JSON.parse(profile);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({
          skills: ['JavaScript', 'React', 'Node.js'],
          experience: '3-5 years',
          education: 'Bachelor\'s Degree',
          matchThreshold: 75
        });
      }
    }
    
    // ========== ARTICLE GENERATION ==========
    if (endpoint === 'generate-article') {
      const { topic, keywords, tone } = req.body;
      
      const prompt = `Write a ${tone} article about "${topic}".
Keywords to include: ${keywords.join(', ')}

Return as JSON with:
- title (catchy, SEO-friendly)
- excerpt (2-3 sentences)
- content (500-800 words, with headings)
- seo_keywords (array)`;

      const article = await callOpenAI(prompt, "You are an expert content writer specializing in HR and recruitment content.");
      
      try {
        const parsed = JSON.parse(article);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({
          title: `The Ultimate Guide to ${topic}`,
          excerpt: `Discover everything you need to know about ${topic}.`,
          content: `This comprehensive guide covers ${topic}...`,
          seo_keywords: keywords
        });
      }
    }
    
    // ========== COURSE GENERATION ==========
    if (endpoint === 'generate-course') {
      const { topic, level } = req.body;
      
      const prompt = `Create a ${level} level course outline for "${topic}".

Return as JSON with:
- title
- description (2-3 sentences)
- modules (array with title, duration in minutes, key topics)
- total_duration (minutes)
- target_audience
- prerequisites`;

      const course = await callOpenAI(prompt);
      
      try {
        const parsed = JSON.parse(course);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({
          title: `${topic} Fundamentals`,
          description: `Master the fundamentals of ${topic}.`,
          modules: [
            { title: `Introduction to ${topic}`, duration: 30 },
            { title: `${topic} Core Concepts`, duration: 45 },
            { title: `Advanced ${topic}`, duration: 60 }
          ],
          total_duration: 135
        });
      }
    }
    
    // ========== ASSESSMENT SCORING ==========
    if (endpoint === 'score-assessment') {
      const { answers, questionBank, type } = req.body;
      
      const prompt = `Score this assessment:
Question bank: ${JSON.stringify(questionBank)}
User answers: ${JSON.stringify(answers)}

Return as JSON with:
- score (percentage)
- correct_answers (count)
- total_questions (count)
- feedback (personalized)
- weak_areas (array)
- strong_areas (array)`;

      const scoring = await callOpenAI(prompt);
      
      try {
        const parsed = JSON.parse(scoring);
        return res.status(200).json(parsed);
      } catch {
        let correct = 0;
        for (const answer of answers) {
          const question = questionBank.find(q => q.id === answer.questionId);
          if (question && answer.selected === question.correctAnswer) correct++;
        }
        return res.status(200).json({
          score: Math.round((correct / questionBank.length) * 100),
          correctAnswers: correct,
          totalQuestions: questionBank.length,
          feedback: "Assessment completed successfully.",
          weakAreas: []
        });
      }
    }
    
    // ========== CAREER ADVICE ==========
    if (endpoint === 'career-advice') {
      const { userProfile, userSkills, careerGoals } = req.body;
      
      const prompt = `Provide career advice for:
Current role: ${userProfile.job_title || 'Not specified'}
Experience: ${userProfile.years_experience || 'N/A'} years
Skills: ${userSkills.map(s => s.skill_name).join(', ')}
Goals: ${careerGoals || 'Not specified'}

Return as JSON with:
- recommended_roles (array of {title, matchScore, salaryRange})
- skill_development (array of {skill, priority, estimatedTime})
- recommended_certifications (array of {name, provider, cost})
- timeline (suggested 1 year plan)`;

      const advice = await callOpenAI(prompt);
      
      try {
        const parsed = JSON.parse(advice);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({
          recommendedRoles: [
            { title: 'Senior Software Engineer', matchScore: 85, salaryRange: '$120k - $160k' }
          ],
          skillDevelopment: [
            { skill: 'System Design', priority: 'High', estimatedTime: '2-3 months' }
          ],
          recommendedCertifications: [
            { name: 'AWS Solutions Architect', provider: 'AWS', cost: '$150' }
          ]
        });
      }
    }
    
    // ========== INTERVIEW QUESTIONS ==========
    if (endpoint === 'interview-questions') {
      const { role, experience, focusAreas } = req.body;
      
      const prompt = `Generate interview questions for a ${role} role with ${experience} years experience.
Focus areas: ${focusAreas.join(', ')}

Return as JSON with:
- technical (array of {question, sampleAnswer})
- behavioral (array of {question, sampleAnswer})
- role_specific (array of {question, sampleAnswer})`;

      const questions = await callOpenAI(prompt);
      
      try {
        const parsed = JSON.parse(questions);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({
          technical: [
            { question: "Explain the difference between let, const, and var.", sampleAnswer: "let and const are block-scoped, var is function-scoped." }
          ],
          behavioral: [
            { question: "Describe a challenging project you led.", sampleAnswer: "Use the STAR method to structure your answer." }
          ]
        });
      }
    }
    
    // Default fallback
    return res.status(200).json({ 
      message: "AI endpoint ready. Available endpoints: /chat, /analyze-resume, /skill-gap, /match-jobs, /match-candidates, /generate-article, /generate-course, /score-assessment, /career-advice, /interview-questions" 
    });
    
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function getFallbackResponse(message) {
  const msg = message.toLowerCase();
  if (msg.includes('job')) return "You can browse and apply for jobs on the Jobs page. Employers can post jobs from their dashboard.";
  if (msg.includes('resume')) return "Upload your resume in the My Skills section. Our AI will analyze it and provide improvement suggestions.";
  if (msg.includes('skill')) return "Take assessments to identify your skill gaps. Our AI recommends personalized learning paths.";
  if (msg.includes('course')) return "Browse our course catalog. AI recommends courses based on your career goals.";
  return "I'm ODUSBABA, your AI assistant. How can I help you today?";
}
