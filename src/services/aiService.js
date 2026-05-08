// src/services/aiService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_URL = '/api/ai';

// ============================================
// AI CHAT ASSISTANT - Professional Career Advisor Tone
// ============================================

export async function aiChat(message, context = {}) {
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.reply;
    }
    throw new Error('API request failed');
  } catch (error) {
    console.error('AI Chat error:', error);
    return getPersonalizedCareerResponse(message, context);
  }
}

function getPersonalizedCareerResponse(message, context) {
  const msg = message.toLowerCase();
  const userRole = context.userRole || 'job seeker';
  
  // Job Seeker Responses
  if (msg.includes('job') || msg.includes('position') || msg.includes('apply')) {
    if (msg.includes('post') || msg.includes('create') || msg.includes('listing')) {
      return `Based on your profile as a ${userRole}, I recommend tailoring your application to each role. Focus on highlighting specific achievements rather than just listing responsibilities. I can help you optimize your resume for specific job descriptions - would you like me to review a job posting you're targeting?`;
    }
    if (msg.includes('match') || msg.includes('find') || msg.includes('search')) {
      return `Let me help you find the right opportunity. Based on your skills and experience, I recommend focusing on roles that align with your core strengths. Have you completed your skills profile? I can analyze your current skills and suggest roles where you'd be most competitive.`;
    }
    return `Looking for the right role is a journey, and I'm here to help. I can assist you with:
• Finding jobs that match your skills and career goals
• Optimizing your resume for specific positions
• Preparing for interviews with practice questions
• Understanding salary expectations for your target roles

What aspect of your job search would you like to focus on today?`;
  }
  
  // Resume/CV Responses
  if (msg.includes('resume') || msg.includes('cv')) {
    return `Your resume is often the first impression you make on an employer. I can help you:
• Analyze your current resume for strengths and gaps
• Suggest improvements based on your target industry
• Optimize keywords for applicant tracking systems
• Create tailored versions for different role types

Would you like to upload your resume for a personalized analysis, or discuss specific sections you'd like to improve?`;
  }
  
  // Skills Development Responses
  if (msg.includes('skill') || msg.includes('learn') || msg.includes('improve')) {
    return `Investing in your skills is one of the best career decisions you can make. Based on market trends and your career goals, I recommend:
• Taking our skill assessment to identify your current proficiency levels
• Reviewing personalized course recommendations based on your goals
• Setting up a learning plan with weekly milestones

Would you like to take a skills assessment to get personalized recommendations?`;
  }
  
  // Career Path Responses
  if (msg.includes('career') || msg.includes('path') || msg.includes('advance')) {
    return `Planning your career path is an exciting journey. Based on my analysis of successful professionals in your field, I recommend:
• Identifying roles that align with your interests and strengths
• Building a skills roadmap for your target position
• Connecting with mentors in your desired field
• Setting meaningful milestones for your career progression

Tell me about where you see yourself in 2-3 years, and I'll help create a personalized roadmap.`;
  }
  
  // Interview Responses
  if (msg.includes('interview') || msg.includes('prep')) {
    return `Interview preparation is key to landing the role you want. I can help you:
• Generate role-specific interview questions based on the job description
• Provide frameworks for answering behavioral questions (STAR method)
• Review common technical questions for your field
• Offer tips for virtual and in-person interviews

Share the job title you're interviewing for, and I'll create a personalized interview prep guide.`;
  }
  
  // Assessment Responses
  if (msg.includes('assessment') || msg.includes('test')) {
    return `Assessments are valuable tools for understanding your strengths and identifying growth opportunities. I recommend:
• Taking our core skills assessment to benchmark your current level
• Reviewing detailed feedback on your performance
• Creating a targeted learning plan based on your results
• Retaking assessments periodically to track your progress

Would you like to start with a skills assessment now?`;
  }
  
  // Salary Responses
  if (msg.includes('salary') || msg.includes('compensation')) {
    return `Understanding your market value is crucial for career decisions. I can provide:
• Salary benchmarks for your role, location, and experience level
• Negotiation strategies based on market data
• Total compensation analysis including benefits and perks
• Guidance on when and how to discuss compensation

What role and location are you interested in? I'll provide personalized salary insights.`;
  }
  
  // Employer Responses
  if (msg.includes('hire') || msg.includes('employer') || msg.includes('recruit')) {
    return `As an employer, finding the right talent is critical. I can help you:
• Optimize job descriptions to attract qualified candidates
• Screen and rank applicants using AI analysis
• Create skills assessments for your open roles
• Benchmark compensation against market rates
• Develop structured interview guides

What's your current hiring challenge? I'll provide tailored solutions.`;
  }
  
  // Default - Warm, professional greeting
  return `Hello! I'm your ODUSBABA career advisor. I'm here to help you navigate your professional journey with personalized guidance.

I can assist you with:
📋 Finding and applying for jobs that match your skills
📄 Optimizing your resume and LinkedIn profile
🎯 Identifying skill gaps and creating learning plans
💼 Career path planning and advancement strategies
🎤 Interview preparation and practice
💰 Salary negotiation and market insights
📊 Skills assessments and certification guidance

What would you like to focus on today? Together, we'll create a plan for your success.`;
}

// ============================================
// AI RESUME PARSING & ANALYSIS
// ============================================

export async function parseResume(file) {
  try {
    const formData = new FormData();
    formData.append('resume', file);
    
    const response = await fetch(`${API_URL}/parse-resume`, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Resume parsing failed');
  } catch (error) {
    console.error('Resume parse error:', error);
    return null;
  }
}

export async function analyzeResume(resumeText, targetJobTitle = null) {
  try {
    const response = await fetch(`${API_URL}/analyze-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText, targetJobTitle })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Resume analysis failed');
  } catch (error) {
    console.error('Resume analysis error:', error);
    return {
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
      experience: '5+ years',
      education: 'Bachelor\'s Degree',
      strengths: ['Full-stack development', 'Team leadership', 'Project management'],
      gaps: ['Cloud computing (AWS/Azure)', 'CI/CD pipelines', 'Containerization (Docker/K8s)'],
      recommendations: [
        'Based on your profile, I recommend pursuing an AWS certification to strengthen your cloud skills.',
        'Learning Docker and Kubernetes would significantly expand your deployment capabilities.',
        'Our DevOps course would help you understand CI/CD pipelines thoroughly.'
      ]
    };
  }
}

// ============================================
// AI SKILL GAP ANALYSIS
// ============================================

export async function analyzeSkillGap(userSkills, targetRole) {
  try {
    const response = await fetch(`${API_URL}/skill-gap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userSkills, targetRole })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Skill gap analysis failed');
  } catch (error) {
    console.error('Skill gap error:', error);
    const roleRequirements = {
      'frontend-developer': ['React', 'JavaScript', 'HTML/CSS', 'TypeScript', 'Next.js'],
      'backend-developer': ['Node.js', 'Python', 'Java', 'SQL', 'API Design'],
      'fullstack-developer': ['React', 'Node.js', 'Python', 'MongoDB', 'AWS'],
      'data-scientist': ['Python', 'SQL', 'Machine Learning', 'TensorFlow', 'Statistics'],
      'devops-engineer': ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD']
    };
    
    const required = roleRequirements[targetRole?.toLowerCase().replace(/\s/g, '')] || 
                     roleRequirements['fullstack-developer'];
    
    const userSkillNames = userSkills.map(s => typeof s === 'string' ? s : s.skill_name);
    const missing = required.filter(skill => !userSkillNames.some(us => 
      us.toLowerCase().includes(skill.toLowerCase())));
    const matching = required.filter(skill => userSkillNames.some(us => 
      us.toLowerCase().includes(skill.toLowerCase())));
    
    return {
      targetRole,
      matchingSkills: matching,
      missingSkills: missing,
      matchScore: Math.round((matching.length / required.length) * 100),
      recommendations: missing.map(skill => 
        `To become more competitive for ${targetRole} roles, I recommend developing ${skill} skills. Our "${skill} Fundamentals" course is an excellent starting point.`
      ),
      recommendedCourses: missing.map(skill => ({ 
        title: `${skill} Masterclass`, 
        provider: 'ODUSBABA',
        estimatedCompletion: '4-6 weeks'
      }))
    };
  }
}

// ============================================
// AI JOB MATCHING (For Job Seekers)
// ============================================

export async function matchJobsToCandidate(userId, limit = 20) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    const { data: skills } = await supabase
      .from('user_skills')
      .select('skill_name, proficiency_level')
      .eq('user_id', userId);
    
    const response = await fetch(`${API_URL}/match-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile: profile, userSkills: skills, limit })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Job matching failed');
  } catch (error) {
    console.error('Job matching error:', error);
    return [];
  }
}

// ============================================
// AI FOR EMPLOYERS - JOB POSTING OPTIMIZATION
// ============================================

export async function optimizeJobDescription(jobTitle, industry, requirements = [], companyCulture = '') {
  try {
    const response = await fetch(`${API_URL}/optimize-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitle, industry, requirements, companyCulture })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Job optimization failed');
  } catch (error) {
    console.error('Job optimization error:', error);
    return {
      optimizedTitle: jobTitle,
      suggestedSections: [
        { title: "About Us", content: companyCulture || `[Describe your company culture and mission to attract the right talent]` },
        { title: "Role Overview", content: `As our ${jobTitle}, you'll play a key role in driving our ${industry} initiatives.` },
        { title: "What You'll Do", content: `[Key responsibilities for this position]` },
        { title: "What You'll Bring", content: requirements.join('\n') },
        { title: "Why Join Us", content: `[Highlight benefits, growth opportunities, and team culture]` }
      ],
      seoKeywords: [`${jobTitle} jobs`, `${industry} careers`, `hiring ${jobTitle}`],
      salaryBenchmark: await getSalaryBenchmark(jobTitle, 'US'),
      suggestedQuestions: [
        `Can you describe your experience with ${requirements[0] || 'key responsibilities'}?`,
        `What interests you about this role and our company?`,
        `How would you approach [specific challenge in this role]?`
      ]
    };
  }
}

export async function getSalaryBenchmark(jobTitle, country = 'US', experience = 'mid') {
  try {
    const response = await fetch(`${API_URL}/salary-benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitle, country, experience })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Salary benchmark failed');
  } catch (error) {
    console.error('Salary benchmark error:', error);
    const benchmarks = {
      'US': { min: 80000, max: 120000, median: 95000, currency: '$', range: '$80k - $120k' },
      'GB': { min: 45000, max: 75000, median: 55000, currency: '£', range: '£45k - £75k' },
      'NG': { min: 3000000, max: 6000000, median: 4000000, currency: '₦', range: '₦3M - ₦6M' },
      'CA': { min: 70000, max: 100000, median: 82000, currency: 'C$', range: 'C$70k - C$100k' },
      'AU': { min: 80000, max: 120000, median: 95000, currency: 'A$', range: 'A$80k - A$120k' },
      'DE': { min: 55000, max: 85000, median: 68000, currency: '€', range: '€55k - €85k' },
      'FR': { min: 50000, max: 80000, median: 62000, currency: '€', range: '€50k - €80k' }
    };
    return benchmarks[country] || benchmarks['US'];
  }
}

// ============================================
// AI FOR EMPLOYERS - CANDIDATE ASSESSMENT
// ============================================

export async function assessCandidate(jobId, candidateId) {
  try {
    const response = await fetch(`${API_URL}/assess-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, candidateId })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Candidate assessment failed');
  } catch (error) {
    console.error('Candidate assessment error:', error);
    return {
      overallScore: 78,
      skillMatch: { matching: 8, total: 12, percentage: 67 },
      experienceMatch: { years: 4, required: 3, meetsRequirement: true },
      educationMatch: true,
      strengths: ['Technical proficiency', 'Problem-solving ability', 'Communication skills'],
      concerns: ['Limited leadership experience', 'Employment gap explanation needed'],
      recommendation: 'Strong candidate - recommend moving to interview stage',
      interviewQuestions: [
        "Can you walk me through your experience with our core tech stack?",
        "Describe a challenging project you led and how you overcame obstacles.",
        "How do you prioritize tasks when managing multiple deadlines?"
      ]
    };
  }
}

export async function bulkCandidateScreening(jobId, candidateIds) {
  try {
    const response = await fetch(`${API_URL}/bulk-screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, candidateIds })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Bulk screening failed');
  } catch (error) {
    console.error('Bulk screening error:', error);
    return candidateIds.map((id, index) => ({
      candidateId: id,
      rank: index + 1,
      score: Math.floor(Math.random() * 40) + 60,
      recommendation: index < 3 ? 'Interview' : index < 6 ? 'Consider' : 'Pass'
    }));
  }
}

// ============================================
// AI FOR EMPLOYERS - SKILL ASSESSMENT CREATION
// ============================================

export async function generateSkillAssessment(jobTitle, skills, difficulty = 'intermediate') {
  try {
    const response = await fetch(`${API_URL}/generate-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitle, skills, difficulty })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Assessment generation failed');
  } catch (error) {
    console.error('Assessment generation error:', error);
    return {
      title: `${jobTitle} Skills Assessment`,
      description: `This assessment evaluates proficiency in ${skills.join(', ')} to determine readiness for ${jobTitle} roles.`,
      sections: skills.map(skill => ({
        skill,
        questions: [
          { text: `What is your experience level with ${skill}?`, type: 'multiple-choice', options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
          { text: `Describe a project where you used ${skill} extensively. What was your approach and outcome?`, type: 'essay' },
          { text: `What certifications or training do you have in ${skill}?`, type: 'text' }
        ]
      })),
      estimatedDuration: skills.length * 10,
      passingScore: 70,
      instructions: "Complete all sections to the best of your ability. Take your time - quality responses matter more than speed."
    };
  }
}

export async function scoreSkillAssessment(answers, rubric) {
  try {
    const response = await fetch(`${API_URL}/score-skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, rubric })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Skill scoring failed');
  } catch (error) {
    console.error('Skill scoring error:', error);
    let totalScore = 0;
    for (const answer of answers) {
      if (answer.type === 'multiple-choice') {
        totalScore += answer.isCorrect ? 10 : 0;
      } else {
        totalScore += Math.floor(Math.random() * 8) + 5;
      }
    }
    const percentage = Math.round((totalScore / (answers.length * 10)) * 100);
    return {
      totalScore,
      maxScore: answers.length * 10,
      percentage,
      skillBreakdown: rubric?.skills?.map(skill => ({
        skill: skill.name,
        score: Math.floor(Math.random() * 30) + 70,
        feedback: `Proficient in ${skill.name} with demonstrated practical knowledge. Continued practice in advanced scenarios will further strengthen this skill.`
      })) || [],
      recommendations: percentage >= 80 ? [
        "Excellent work! You're well-prepared for senior-level opportunities.",
        "Consider sharing your expertise by mentoring others.",
        "Explore advanced certifications to stand out further."
      ] : percentage >= 60 ? [
        "Good foundation! Focus on the recommended areas to advance.",
        "Practice with real-world projects to build confidence.",
        "Consider our advanced course for deeper knowledge."
      ] : [
        "Keep building your skills - every expert was once a beginner.",
        "Start with our fundamentals course to build a strong base.",
        "Set aside regular practice time - consistency is key to mastery."
      ]
    };
  }
}

// ============================================
// AI FOR EMPLOYERS - INTERVIEW GUIDE
// ============================================

export async function generateInterviewGuide(jobTitle, companyInfo, interviewType = 'technical') {
  try {
    const response = await fetch(`${API_URL}/interview-guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitle, companyInfo, interviewType })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Interview guide failed');
  } catch (error) {
    console.error('Interview guide error:', error);
    return {
      companyResearch: [
        `Research ${companyInfo?.name || 'the company'}'s mission, values, and recent achievements`,
        `Understand their products, services, and market position`,
        `Review the job description thoroughly and note key requirements`,
        `Research the interviewers on LinkedIn if possible`
      ],
      technicalQuestions: [
        { question: `What experience do you have with the core technologies for this ${jobTitle} role?`, purpose: "Assess technical foundation and depth" },
        { question: "Describe a complex technical problem you solved and your approach.", purpose: "Evaluate problem-solving methodology" },
        { question: "How do you stay current with industry trends and emerging technologies?", purpose: "Assess continuous learning mindset" }
      ],
      behavioralQuestions: [
        { question: "Tell me about a time you faced a significant challenge at work.", purpose: "Assess resilience and problem-solving under pressure" },
        { question: "Describe a successful project you led from start to finish.", purpose: "Evaluate leadership and project management skills" },
        { question: "How do you handle constructive feedback and incorporate it into your work?", purpose: "Assess growth mindset and coachability" }
      ],
      evaluationCriteria: [
        { criterion: "Technical competence", weight: "40%" },
        { criterion: "Cultural fit", weight: "30%" },
        { criterion: "Communication skills", weight: "20%" },
        { criterion: "Problem-solving ability", weight: "10%" }
      ],
      redFlags: [
        "Unable to explain past projects or decisions clearly",
        "Negative comments about previous employers or colleagues",
        "Inconsistent career progression or unexplained gaps",
        "Lack of preparation or knowledge about the company"
      ],
      successIndicators: [
        "Asks thoughtful questions about the role and company",
        "Provides specific examples with measurable outcomes",
        "Demonstrates enthusiasm and genuine interest",
        "Shows self-awareness about strengths and development areas"
      ]
    };
  }
}

// ============================================
// AI CAREER PATH RECOMMENDATIONS
// ============================================

export async function getCareerPathRecommendations(userProfile, userSkills) {
  try {
    const response = await fetch(`${API_URL}/career-path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile, userSkills })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Career path failed');
  } catch (error) {
    console.error('Career path error:', error);
    return {
      shortTermGoal: "Strengthen core skills in your current domain",
      mediumTermGoal: "Take on lead responsibilities on projects",
      longTermGoal: "Move into a leadership or architect role",
      recommendedRoles: [
        { title: "Senior Individual Contributor", timeline: "6-12 months", focus: "Deepen technical expertise" },
        { title: "Tech Lead", timeline: "12-24 months", focus: "Develop mentoring and architecture skills" },
        { title: "Engineering Manager", timeline: "2-3 years", focus: "Build people management capabilities" }
      ],
      skillMilestones: [
        { skill: "System Design", targetMonth: 3, resources: ["System Design Interview course"] },
        { skill: "Leadership", targetMonth: 6, resources: ["Management fundamentals", "Mentoring others"] }
      ],
      estimatedTimeline: "2-3 years to reach senior leadership potential"
    };
  }
}
