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
- extractedSkills (array)
- yearsOfExperience (number)
- education (string)
- strengths (array of 3-5 points)
- gaps (array of 2-4 points)
- recommendations (array of 3-5 actionable suggestions)`;

      const analysis = await callOpenAI(prompt);
      if (analysis) {
        try {
          const parsed = JSON.parse(analysis);
          return res.status(200).json(parsed);
        } catch {
          return res.status(200).json({
            extractedSkills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
            yearsOfExperience: 5,
            education: "Bachelor's Degree in Computer Science",
            strengths: ['Full-stack development expertise', 'Strong problem-solving skills', 'Excellent communication'],
            gaps: ['Cloud architecture', 'CI/CD pipelines', 'Team leadership'],
            recommendations: [
              'Consider AWS certification to expand cloud expertise',
              'Take our DevOps course to master CI/CD pipelines',
              'Develop leadership skills through our management track'
            ]
          });
        }
      }
      return res.status(200).json({
        extractedSkills: ['JavaScript', 'React', 'Node.js', 'Python'],
        yearsOfExperience: 4,
        education: "Bachelor's Degree",
        strengths: ['Technical proficiency', 'Project delivery'],
        gaps: ['Cloud computing', 'System design'],
        recommendations: ['Complete cloud certification', 'Practice system design interviews']
      });
    }
    
    // ========== SKILL GAP ANALYSIS ==========
    if (endpoint === 'skill-gap') {
      const { userSkills, targetRole } = req.body;
      
      const prompt = `Analyze the skill gap for a candidate targeting ${targetRole}.

Current skills: ${JSON.stringify(userSkills)}

Return JSON with:
- matchingSkills (array)
- missingSkills (array)
- matchScore (number 0-100)
- recommendations (array)
- priorityOrder (array of top 3 missing skills)
- estimatedTimeline (string)`;

      const analysis = await callOpenAI(prompt);
      if (analysis) {
        try {
          const parsed = JSON.parse(analysis);
          return res.status(200).json(parsed);
        } catch {
          return res.status(200).json({
            matchingSkills: userSkills.slice(0, 3),
            missingSkills: ['AWS', 'Docker', 'Kubernetes'],
            matchScore: 65,
            recommendations: [
              'Complete AWS Solutions Architect certification',
              'Master containerization with Docker',
              'Learn orchestration with Kubernetes'
            ],
            priorityOrder: ['AWS', 'Docker', 'Kubernetes'],
            estimatedTimeline: '12-16 weeks of focused learning'
          });
        }
      }
      return res.status(200).json({
        matchingSkills: userSkills?.slice(0, 3) || ['JavaScript', 'React'],
        missingSkills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
        matchScore: 60,
        recommendations: ['Focus on cloud skills', 'Learn containerization'],
        priorityOrder: ['AWS', 'Docker', 'Kubernetes'],
        estimatedTimeline: '3-4 months'
      });
    }
    
    // ========== JOB MATCHING ==========
    if (endpoint === 'match-jobs') {
      const { userProfile, userSkills, limit } = req.body;
      
      // Return mock data (in production, query from database)
      return res.status(200).json([
        { title: 'Senior Full Stack Developer', company: 'Tech Innovations', matchScore: 92, salaryRange: '$120k - $160k', location: 'Remote', reason: 'Strong skill alignment' },
        { title: 'Lead Software Engineer', company: 'Enterprise Solutions', matchScore: 85, salaryRange: '$140k - $180k', location: 'New York', reason: 'Experience matches requirements' },
        { title: 'Technical Team Lead', company: 'StartUp Labs', matchScore: 78, salaryRange: '$130k - $170k', location: 'Remote', reason: 'Leadership potential identified' }
      ]);
    }
    
    // ========== CANDIDATE MATCHING ==========
    if (endpoint === 'match-candidates') {
      const { job, limit } = req.body;
      return res.status(200).json([]);
    }
    
    // ========== JOB OPTIMIZATION ==========
    if (endpoint === 'optimize-job') {
      const { jobTitle, industry, requirements, companyCulture } = req.body;
      
      const prompt = `Create an optimized job posting for a ${jobTitle} in the ${industry} industry.

Requirements: ${requirements.join(', ')}
Company Culture: ${companyCulture || 'Not specified'}

Return JSON with:
- optimizedTitle (string)
- suggestedSections (array of {title, content})
- seoKeywords (array)
- salaryBenchmark (object with min, max, currency)
- suggestedQuestions (array)`;

      const optimization = await callOpenAI(prompt);
      if (optimization) {
        try {
          const parsed = JSON.parse(optimization);
          return res.status(200).json(parsed);
        } catch {
          return res.status(200).json({
            optimizedTitle: jobTitle,
            suggestedSections: [
              { title: "About Us", content: companyCulture || "Join our innovative team" },
              { title: "Role Overview", content: `We're seeking a talented ${jobTitle} to join our ${industry} team.` },
              { title: "Requirements", content: requirements.join('\n') }
            ],
            seoKeywords: [`${jobTitle} jobs`, `${industry} careers`],
            salaryBenchmark: { min: 80000, max: 120000, currency: '$' },
            suggestedQuestions: [
              `What experience do you have with ${requirements[0] || 'key responsibilities'}?`,
              `How do you approach problem-solving?`
            ]
          });
        }
      }
      return res.status(200).json({
        optimizedTitle: jobTitle,
        suggestedSections: [
          { title: "About Us", content: "Join our growing team" },
          { title: "Role Overview", content: `Seeking ${jobTitle} to drive innovation` },
          { title: "Requirements", content: requirements.join('\n') }
        ],
        seoKeywords: [`${jobTitle}`, `${industry}`],
        salaryBenchmark: { min: 70000, max: 110000, currency: '$' },
        suggestedQuestions: requirements.slice(0, 3)
      });
    }
    
    // ========== SALARY BENCHMARK ==========
    if (endpoint === 'salary-benchmark') {
      const { jobTitle, country, experience } = req.body;
      
      const benchmarks = {
        'US': { min: 80000, max: 120000, median: 95000, currency: '$', description: 'Competitive market rate' },
        'GB': { min: 45000, max: 75000, median: 55000, currency: '£', description: 'London-weighted premium' },
        'NG': { min: 3000000, max: 6000000, median: 4000000, currency: '₦', description: 'Industry standard' },
        'CA': { min: 70000, max: 100000, median: 82000, currency: 'C$', description: 'Tech hub premium' },
        'AU': { min: 80000, max: 120000, median: 95000, currency: 'A$', description: 'Market competitive' }
      };
      
      return res.status(200).json(benchmarks[country] || benchmarks['US']);
    }
    
    // ========== CANDIDATE ASSESSMENT ==========
    if (endpoint === 'assess-candidate') {
      const { jobId, candidateId } = req.body;
      return res.status(200).json({
        overallScore: 78,
        skillMatch: { matching: 8, total: 12, percentage: 67 },
        experienceMatch: { years: 4, required: 3, meetsRequirement: true },
        educationMatch: true,
        strengths: ['Technical proficiency', 'Problem-solving ability', 'Communication skills'],
        concerns: ['Limited leadership experience'],
        recommendation: 'Schedule interview',
        interviewQuestions: [
          "Tell me about your experience with our tech stack.",
          "Describe a challenging project you delivered successfully."
        ]
      });
    }
    
    // ========== ASSESSMENT GENERATION ==========
    if (endpoint === 'generate-assessment') {
      const { jobTitle, skills, difficulty } = req.body;
      return res.status(200).json({
        title: `${jobTitle} Skills Assessment`,
        description: `Evaluate proficiency in ${skills.join(', ')} for ${jobTitle} roles.`,
        sections: skills.map(skill => ({
          skill,
          questions: [
            { text: `Rate your experience with ${skill}.`, type: 'multiple-choice', options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] }
          ]
        })),
        estimatedDuration: skills.length * 10,
        passingScore: 70
      });
    }
    
    // ========== INTERVIEW GUIDE ==========
    if (endpoint === 'interview-guide') {
      const { jobTitle, companyInfo, interviewType } = req.body;
      return res.status(200).json({
        technicalQuestions: [
          { question: `Explain core ${jobTitle} concepts.`, purpose: "Assess technical foundation" },
          { question: "Describe your problem-solving approach.", purpose: "Evaluate methodology" }
        ],
        behavioralQuestions: [
          { question: "Tell me about a challenge you overcame.", purpose: "Assess resilience" },
          { question: "Describe a successful project you led.", purpose: "Evaluate leadership" }
        ],
        evaluationCriteria: [
          { criterion: "Technical skills", weight: "40%" },
          { criterion: "Cultural fit", weight: "30%" },
          { criterion: "Communication", weight: "30%" }
        ]
      });
    }
    
    // ========== CAREER ADVICE ==========
    if (endpoint === 'career-advice') {
      const { userProfile, userSkills, careerGoals } = req.body;
      return res.status(200).json({
        recommendedRoles: [
          { title: 'Senior Software Engineer', matchScore: 85, salaryRange: '$120k - $160k', growthOutlook: 'Strong growth' }
        ],
        skillDevelopment: [
          { skill: 'System Design', priority: 'High', estimatedTime: '2-3 months', rationale: 'Critical for senior roles' }
        ],
        recommendedCertifications: [
          { name: 'AWS Solutions Architect', provider: 'AWS', cost: '$150', valueAdd: 'Highly valued' }
        ],
        timeline: {
          '0-3 months': 'Skill development',
          '3-6 months': 'Portfolio building',
          '6-12 months': 'Job applications'
        }
      });
    }
    
    // Default fallback
    return res.status(200).json({ 
      message: "ODUSBABA AI Career Advisor is ready. How can I help you today?",
      endpoints: ["/chat", "/analyze-resume", "/skill-gap", "/match-jobs", "/optimize-job", "/salary-benchmark", "/career-advice", "/interview-guide"]
    });
    
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
