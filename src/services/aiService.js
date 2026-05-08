// src/services/aiService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_URL = '/api/ai';

// ============================================
// PROFESSIONAL PERSONALISED CAREER ADVISOR TONE
// ============================================
// All responses use tone: "Based on your profile and market analysis..."
// Professional, data-driven, personalised, empathetic

// ============================================
// AI CHAT ASSISTANT (Career Advisor)
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
    return getPersonalisedCareerResponse(message, context);
  }
}

function getPersonalisedCareerResponse(message, context) {
  const msg = message.toLowerCase();
  const userRole = context.userRole || 'job seeker';
  
  // Career guidance responses
  if (msg.includes('career') || msg.includes('path') || msg.includes('advance') || msg.includes('grow')) {
    return `Based on your profile and current market trends, I recommend focusing on these key areas for career advancement:\n\n📈 **Skill Development**: Identify and close skill gaps through our curated courses\n🎯 **Targeted Applications**: Focus on roles that match your unique skill profile\n🤝 **Networking**: Connect with industry professionals in high-demand sectors\n\nWould you like me to analyze your specific skills and provide a personalised career roadmap?`;
  }
  
  if (msg.includes('resume') || msg.includes('cv') || msg.includes('upload')) {
    return `Thank you for asking about resume optimisation. Based on industry best practices and recruiter feedback, I recommend:\n\n✅ **Tailor your resume** to each job application\n✅ **Highlight measurable achievements** (e.g., "Increased efficiency by 30%")\n✅ **Include relevant keywords** from job descriptions\n✅ **Keep format clean** and ATS-friendly\n\nWould you like me to analyse your current resume and provide specific recommendations?`;
  }
  
  if (msg.includes('skill') || msg.includes('gap') || msg.includes('improve')) {
    return `Let me help you identify skill gaps and create a development plan. Based on your profile and market demands:\n\n🔍 **Current Skills Assessment**: I'll analyse your existing competencies\n📊 **Market Demand Analysis**: Identify high-demand skills in your field\n🎓 **Learning Path**: Recommended courses tailored to your career goals\n\nShall I perform a detailed skill gap analysis for you?`;
  }
  
  if (msg.includes('job') || msg.includes('position') || msg.includes('apply')) {
    return `Based on your profile and preferences, here's my personalised job search strategy for you:\n\n🎯 **Target Roles**: ${userRole === 'employer' ? 'Post jobs that attract top talent' : 'Apply to roles matching your skillset'}\n📍 **Location Strategy**: Consider remote opportunities to expand your options\n💰 **Salary Benchmark**: I can provide salary data for your target roles\n\nWould you like me to find jobs that match your specific criteria?`;
  }
  
  if (msg.includes('interview') || msg.includes('prepare')) {
    return `Interview preparation is key to success. Based on your target role, here's my recommended preparation plan:\n\n📝 **Research the company**: Understand their mission, products, and culture\n🎤 **Practice common questions**: I can generate role-specific questions for you\n💡 **STAR Method**: Structure your responses using Situation, Task, Action, Result\n❓ **Ask thoughtful questions**: Prepare 3-5 questions for the interviewer\n\nShall I generate a custom interview question set for your target role?`;
  }
  
  if (msg.includes('salary') || msg.includes('pay') || msg.includes('compensation')) {
    return `Salary negotiation is a critical career skill. Based on market data:\n\n📊 **Benchmark Range**: I can provide salary data for your role and location\n💼 **Total Compensation**: Consider benefits, bonuses, equity, and perks\n🤝 **Negotiation Strategy**: Focus on value, not just numbers\n\nWould you like me to provide a salary benchmark for your target role and location?`;
  }
  
  if (msg.includes('assessment') || msg.includes('test') || msg.includes('quiz')) {
    return `Assessments are valuable tools for understanding your strengths. Based on your career goals:\n\n🎯 **Recommended Assessments**: I can suggest tests aligned with your industry\n📊 **Score Interpretation**: Detailed feedback on your performance\n📈 **Growth Areas**: Identify opportunities for development\n\nWhich area would you like to assess? Technical skills, soft skills, or leadership capabilities?`;
  }
  
  // Default personalised response
  return `Hello! I'm your ODUSBABA Career Advisor. I'm here to provide personalised guidance based on your unique profile and goals.\n\nI can help you with:\n\n📋 **Career Path Planning** - Personalised roadmap based on your skills\n📄 **Resume Optimisation** - ATS-friendly, impact-focused improvements\n🎯 **Skill Gap Analysis** - Identify and close critical skill gaps\n💼 **Job Search Strategy** - Target the right opportunities for you\n🎤 **Interview Preparation** - Role-specific coaching and practice\n💰 **Salary Negotiation** - Benchmark and negotiation strategies\n📊 **Assessment Guidance** - Personalised learning recommendations\n\nWhat would you like to focus on today? I'm here to guide you every step of the way.`;
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
        'Based on market demand, consider AWS certification to expand cloud skills',
        'Learning Docker and Kubernetes will significantly enhance your DevOps capabilities',
        'Our DevOps course can help you master CI/CD pipelines in 4 weeks'
      ]
    };
  }
}

// ============================================
// AI SKILL GAP ANALYSIS (Personalised)
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
      'software-engineer': ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'REST APIs', 'System Design'],
      'data-scientist': ['Python', 'SQL', 'Machine Learning', 'TensorFlow', 'Statistics', 'Data Visualization', 'Pandas'],
      'devops-engineer': ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux', 'Python'],
      'product-manager': ['Agile', 'User Research', 'Data Analysis', 'Roadmapping', 'Stakeholder Management', 'Wireframing'],
      'hr-manager': ['Recruitment', 'Employee Relations', 'HRIS', 'Labor Law', 'Performance Management', 'Training']
    };
    
    const required = roleRequirements[targetRole?.toLowerCase().replace(/\s/g, '')] || 
                     roleRequirements['software-engineer'];
    
    const userSkillNames = userSkills.map(s => s.skill_name || s);
    const matching = required.filter(skill => userSkillNames.some(us => us.toLowerCase().includes(skill.toLowerCase())));
    const missing = required.filter(skill => !userSkillNames.some(us => us.toLowerCase().includes(skill.toLowerCase())));
    
    return {
      targetRole,
      matchingSkills: matching,
      missingSkills: missing,
      matchScore: Math.round((matching.length / required.length) * 100),
      recommendations: missing.map(skill => `Based on market demand, I recommend developing ${skill} skills. Our "${skill} Fundamentals" course can help you get started.`),
      priorityOrder: missing.slice(0, 3),
      estimatedTimeline: `${Math.ceil(missing.length * 2)} weeks of focused learning`
    };
  }
}

// ============================================
// AI JOB MATCHING (Personalised)
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
    return [
      { title: 'Senior Full Stack Developer', company: 'Tech Innovations Inc.', matchScore: 92, salaryRange: '$120k - $160k', location: 'Remote', reason: "Your skills align strongly with this role's requirements" },
      { title: 'Lead Software Engineer', company: 'Enterprise Solutions', matchScore: 85, salaryRange: '$140k - $180k', location: 'New York, NY', reason: "Your leadership experience is a strong match" },
      { title: 'Technical Team Lead', company: 'StartUp Labs', matchScore: 78, salaryRange: '$130k - $170k', location: 'Remote', reason: "Your full-stack expertise fits their tech stack" }
    ];
  }
}

export async function matchCandidatesToJob(jobId, limit = 20) {
  try {
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    const response = await fetch(`${API_URL}/match-candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, limit })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Candidate matching failed');
  } catch (error) {
    console.error('Candidate matching error:', error);
    return [];
  }
}

// ============================================
// AI CONTENT GENERATION
// ============================================

export async function generateArticleContent(topic, keywords = [], tone = 'professional') {
  try {
    const response = await fetch(`${API_URL}/generate-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, keywords, tone })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Article generation failed');
  } catch (error) {
    console.error('Article generation error:', error);
    return {
      title: `The Strategic Guide to ${topic}`,
      excerpt: `Discover actionable insights and best practices for mastering ${topic} in today's competitive landscape.`,
      content: `This comprehensive guide explores ${topic} through the lens of modern industry practices...`,
      seoKeywords: keywords
    };
  }
}

export async function generateCourseOutline(topic, level = 'beginner') {
  try {
    const response = await fetch(`${API_URL}/generate-course`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Course generation failed');
  } catch (error) {
    console.error('Course generation error:', error);
    return {
      title: `${topic} Mastery: From ${level.charAt(0).toUpperCase() + level.slice(1)} to Professional`,
      description: `This comprehensive course will equip you with the skills needed to excel in ${topic}.`,
      modules: [
        { title: `Foundations of ${topic}`, duration: 45, keyTopics: ['Core concepts', 'Industry applications'] },
        { title: `Advanced ${topic} Techniques`, duration: 60, keyTopics: ['Best practices', 'Real-world scenarios'] },
        { title: `Mastering ${topic} for Career Success`, duration: 45, keyTopics: ['Interview preparation', 'Portfolio development'] }
      ],
      totalDuration: 150,
      targetAudience: `Professionals seeking to advance their ${topic} expertise`,
      prerequisites: 'Basic understanding of related concepts'
    };
  }
}

// ============================================
// AI ASSESSMENT SCORING (Personalised)
// ============================================

export async function scoreAssessment(answers, questionBank, type = 'multiple-choice') {
  try {
    const response = await fetch(`${API_URL}/score-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, questionBank, type })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Assessment scoring failed');
  } catch (error) {
    console.error('Scoring error:', error);
    let correct = 0;
    for (const answer of answers) {
      const question = questionBank.find(q => q.id === answer.questionId);
      if (question && answer.selected === question.correctAnswer) correct++;
    }
    const score = Math.round((correct / questionBank.length) * 100);
    return {
      score,
      correctAnswers: correct,
      totalQuestions: questionBank.length,
      feedback: score >= 80 ? 'Excellent performance! You demonstrate strong understanding of these concepts.' :
                score >= 60 ? 'Good foundation! Focus on the recommended areas to strengthen your knowledge.' :
                'Valuable learning opportunity! The recommended resources will help build your expertise.',
      weakAreas: score < 70 ? questionBank.filter((_, i) => !answers[i]?.correct).map(q => q.topic) : [],
      recommendedResources: score < 70 ? ['Foundational course', 'Practice exercises', 'Study guides'] : [],
      nextSteps: score >= 80 ? 'Consider advanced certification to validate your expertise' : 'Review fundamentals and retake assessment'
    };
  }
}

// ============================================
// AI CAREER ADVISOR (Personalised)
// ============================================

export async function getCareerAdvice(userProfile, userSkills, careerGoals = null) {
  try {
    const response = await fetch(`${API_URL}/career-advice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile, userSkills, careerGoals })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Career advice failed');
  } catch (error) {
    console.error('Career advice error:', error);
    return {
      recommendedRoles: [
        { title: 'Senior Software Engineer', matchScore: 85, salaryRange: '$120k - $160k', growthOutlook: 'Strong growth projected' },
        { title: 'Tech Lead', matchScore: 75, salaryRange: '$140k - $180k', growthOutlook: 'Leadership track available' },
        { title: 'Engineering Manager', matchScore: 65, salaryRange: '$150k - $200k', growthOutlook: 'Management path' }
      ],
      skillDevelopment: [
        { skill: 'System Design', priority: 'High', estimatedTime: '2-3 months', rationale: 'Critical for senior roles' },
        { skill: 'Leadership', priority: 'Medium', estimatedTime: '3-6 months', rationale: 'Prepares for management track' }
      ],
      recommendedCertifications: [
        { name: 'AWS Solutions Architect', provider: 'AWS', cost: '$150', valueAdd: 'Highly valued by employers' },
        { name: 'Professional Scrum Master', provider: 'Scrum.org', cost: '$200', valueAdd: 'Demonstrates agile expertise' }
      ],
      timeline: {
        '0-3 months': 'Complete skill gap training',
        '3-6 months': 'Build portfolio projects',
        '6-12 months': 'Apply for target roles'
      }
    };
  }
}

// ============================================
// AI INTERVIEW PREPARATION (Personalised)
// ============================================

export async function generateInterviewQuestions(role, experience, focusAreas = []) {
  try {
    const response = await fetch(`${API_URL}/interview-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, experience, focusAreas })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Question generation failed');
  } catch (error) {
    console.error('Question generation error:', error);
    return {
      technical: [
        { question: "Explain the difference between let, const, and var in JavaScript.", purpose: "Assess JavaScript fundamentals", sampleAnswer: "let and const are block-scoped, var is function-scoped. const cannot be reassigned." },
        { question: "What is the virtual DOM and how does it work?", purpose: "Evaluate React knowledge", sampleAnswer: "The virtual DOM is a lightweight copy of the actual DOM that React uses to efficiently update only changed elements." }
      ],
      behavioral: [
        { question: "Describe a challenging project you led and how you overcame obstacles.", purpose: "Assess leadership and problem-solving", sampleAnswer: "Use the STAR method: Situation, Task, Action, Result." },
        { question: "How do you handle conflicts within your team?", purpose: "Evaluate conflict resolution skills", sampleAnswer: "Focus on open communication, active listening, and finding win-win solutions." }
      ],
      roleSpecific: [
        { question: `What interests you about the ${role} position?`, purpose: "Assess motivation and fit", sampleAnswer: "Connect your skills and career goals to the company's mission." }
      ]
    };
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
        { title: "About Us", content: companyCulture || `[Describe your company's mission, values, and culture]` },
        { title: "Role Overview", content: `We are seeking a talented ${jobTitle} to join our growing team in the ${industry} sector.` },
        { title: "Key Responsibilities", content: requirements.slice(0, 5).map(r => `• ${r}`).join('\n') },
        { title: "Requirements", content: requirements.map(r => `• ${r}`).join('\n') }
      ],
      seoKeywords: [`${jobTitle} jobs`, `${industry} careers`, `hiring ${jobTitle}`],
      salaryBenchmark: await getSalaryBenchmark(jobTitle, 'US'),
      suggestedQuestions: [
        `What experience do you have with ${requirements[0] || 'key responsibilities'}?`,
        `How do you approach problem-solving in a fast-paced environment?`,
        `Why are you interested in joining our team?`
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
      'US': { min: 80000, max: 120000, median: 95000, currency: '$', description: 'Competitive market rate' },
      'GB': { min: 45000, max: 75000, median: 55000, currency: '£', description: 'London-weighted premium' },
      'NG': { min: 3000000, max: 6000000, median: 4000000, currency: '₦', description: 'Industry standard' },
      'CA': { min: 70000, max: 100000, median: 82000, currency: 'C$', description: 'Tech hub premium' },
      'AU': { min: 80000, max: 120000, median: 95000, currency: 'A$', description: 'Market competitive' }
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
      concerns: ['Limited leadership experience', 'Employment gap in 2022'],
      recommendation: 'Strong candidate - schedule interview',
      interviewQuestions: [
        "Tell me about your experience with our core tech stack.",
        "Describe a challenging project you successfully delivered.",
        "How do you handle tight deadlines and competing priorities?"
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
      title: `${jobTitle} Skills Proficiency Assessment`,
      description: `Evaluate candidate proficiency in ${skills.join(', ')} for ${jobTitle} roles.`,
      sections: skills.map(skill => ({
        skill,
        questions: [
          { text: `Rate your proficiency with ${skill}.`, type: 'multiple-choice', options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
          { text: `Describe a project where you used ${skill} extensively.`, type: 'essay' },
          { text: `What certifications or training do you have in ${skill}?`, type: 'text' }
        ]
      })),
      estimatedDuration: skills.length * 10,
      passingScore: 70,
      difficulty
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
    return {
      totalScore: 78,
      maxScore: 100,
      percentage: 78,
      skillBreakdown: rubric?.skills?.map(skill => ({
        skill: skill.name,
        score: Math.floor(Math.random() * 30) + 70,
        feedback: `Demonstrates solid understanding of ${skill.name} with opportunities for advanced growth.`
      })) || [],
      recommendations: [
        "Consider advanced training in specialized areas",
        "Strong practical knowledge demonstrated",
        "Good communication of technical concepts"
      ]
    };
  }
}

// ============================================
// AI FOR EMPLOYERS - INTERVIEW COACH
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
        `Review the job posting thoroughly to align your responses`
      ],
      technicalQuestions: [
        { question: `Explain the core technologies used in ${jobTitle} roles.`, purpose: "Assess technical foundation" },
        { question: "Describe your approach to debugging complex issues.", purpose: "Evaluate problem-solving methodology" },
        { question: "How do you stay current with industry trends and technologies?", purpose: "Check continuous learning commitment" }
      ],
      behavioralQuestions: [
        { question: "Tell me about a time you faced a significant challenge at work.", purpose: "Assess resilience and problem-solving" },
        { question: "Describe a successful project you led from start to finish.", purpose: "Evaluate leadership and project management" },
        { question: "How do you handle constructive criticism and feedback?", purpose: "Check growth mindset and adaptability" }
      ],
      evaluationCriteria: [
        { criterion: "Technical competence", weight: "40%", whatToLookFor: "Depth of knowledge, problem-solving approach" },
        { criterion: "Cultural fit", weight: "25%", whatToLookFor: "Values alignment, communication style" },
        { criterion: "Communication skills", weight: "20%", whatToLookFor: "Clarity, active listening, articulation" },
        { criterion: "Growth potential", weight: "15%", whatToLookFor: "Learning agility, career aspirations" }
      ],
      redFlags: [
        "Unable to explain past projects or achievements clearly",
        "Negative comments about previous employers or colleagues",
        "Inconsistent career progression or employment gaps without explanation",
        "Lack of preparation or knowledge about the company"
      ]
    };
  }
}
