// src/services/aiService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_URL = '/api/ai'; // Serverless function endpoint

// ============================================
// AI CHAT ASSISTANT
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
    return getFallbackChatResponse(message, context);
  }
}

function getFallbackChatResponse(message, context) {
  const msg = message.toLowerCase();
  
  // Job-related queries
  if (msg.includes('job') || msg.includes('position') || msg.includes('hire')) {
    if (msg.includes('post') || msg.includes('create')) {
      return "To post a job, go to the Employer Dashboard and click 'Post a Job'. Fill in the details including title, description, requirements, and salary range. Our AI will help optimize your job posting for better visibility.";
    }
    if (msg.includes('match') || msg.includes('find')) {
      return "Our AI job matching algorithm analyzes candidate skills, experience, and preferences to find the best matches. You can view recommended candidates in the 'Candidate Matching' section of your dashboard.";
    }
    return "You can browse jobs on the Jobs page. Use filters to narrow down by location, job type, salary range, and skills. Save jobs you're interested in and track your applications.";
  }
  
  // Resume/CV related queries
  if (msg.includes('resume') || msg.includes('cv') || msg.includes('upload')) {
    return "Upload your resume in the 'My Skills' section. Our AI will analyze your resume to extract skills, experience, and education. It will then identify skill gaps and recommend relevant courses and assessments.";
  }
  
  // Skills related queries
  if (msg.includes('skill') || msg.includes('gap') || msg.includes('improve')) {
    return "Our AI analyzes your skills against job market demands. Based on your profile, we recommend specific courses, assessments, and learning paths to address skill gaps. Check your 'Skills Dashboard' for personalized recommendations.";
  }
  
  // Assessment related queries
  if (msg.includes('assessment') || msg.includes('test') || msg.includes('quiz')) {
    return "Take assessments in the Assessments section. Our AI scores your responses and provides detailed feedback on strengths and areas for improvement. Premium users get advanced analytics and personalized study plans.";
  }
  
  // Course related queries
  if (msg.includes('course') || msg.includes('learn') || msg.includes('training')) {
    return "Browse our course catalog in the Courses section. AI recommends courses based on your career goals and skill gaps. Complete courses to earn certificates and enhance your profile.";
  }
  
  // Career guidance
  if (msg.includes('career') || msg.includes('path') || msg.includes('advance')) {
    return "Our AI career advisor analyzes your profile, skills, and market trends to suggest career paths. Based on your interests and experience, we recommend specific job roles and development paths.";
  }
  
  // Salary queries
  if (msg.includes('salary') || msg.includes('pay') || msg.includes('compensation')) {
    return "Get salary benchmarks based on role, location, experience, and skills. Our AI analyzes market data to provide accurate salary ranges for informed negotiations.";
  }
  
  // Interview queries
  if (msg.includes('interview') || msg.includes('question')) {
    return "Prepare for interviews with AI-generated questions tailored to your target role. Practice with our interview simulator and get feedback on your responses.";
  }
  
  // Default response
  return "I'm ODUSBABA, your AI assistant. I can help you with:\n\n📋 Job searching and posting\n📄 Resume analysis and optimization\n🎯 Skill gap identification\n📊 Assessment and course recommendations\n💼 Career path guidance\n💰 Salary benchmarking\n🎤 Interview preparation\n\nWhat would you like help with today?";
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
    // Return mock analysis
    return {
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
      experience: '5+ years',
      education: 'Bachelor\'s Degree',
      strengths: ['Full-stack development', 'Team leadership', 'Project management'],
      gaps: ['Cloud computing (AWS/Azure)', 'CI/CD pipelines', 'Containerization (Docker/K8s)'],
      recommendations: [
        'Consider AWS certification to expand cloud skills',
        'Learn Docker and Kubernetes for modern deployment',
        'Take our DevOps course to understand CI/CD pipelines'
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
    // Return mock analysis
    const roleRequirements = {
      'frontend-developer': ['React', 'JavaScript', 'HTML/CSS', 'TypeScript', 'Next.js'],
      'backend-developer': ['Node.js', 'Python', 'Java', 'SQL', 'API Design'],
      'fullstack-developer': ['React', 'Node.js', 'Python', 'MongoDB', 'AWS'],
      'data-scientist': ['Python', 'SQL', 'Machine Learning', 'TensorFlow', 'Statistics'],
      'devops-engineer': ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD']
    };
    
    const required = roleRequirements[targetRole?.toLowerCase().replace(/\s/g, '')] || 
                     roleRequirements['fullstack-developer'];
    
    const missing = required.filter(skill => !userSkills.some(us => 
      us.toLowerCase().includes(skill.toLowerCase())));
    
    return {
      targetRole,
      matchingSkills: required.filter(skill => userSkills.some(us => 
        us.toLowerCase().includes(skill.toLowerCase()))),
      missingSkills: missing,
      matchScore: Math.round(((required.length - missing.length) / required.length) * 100),
      recommendations: missing.map(skill => `Take the "${skill}" course to develop this skill`),
      recommendedCourses: missing.map(skill => ({ title: `${skill} Masterclass`, provider: 'ODUSBABA' }))
    };
  }
}

// ============================================
// AI JOB MATCHING
// ============================================

export async function matchJobsToCandidate(userId, limit = 20) {
  try {
    // Get user profile and skills
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
      body: JSON.stringify({ 
        userProfile: profile, 
        userSkills: skills,
        limit 
      })
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
      title: `The Ultimate Guide to ${topic}`,
      excerpt: `Discover everything you need to know about ${topic} in this comprehensive guide.`,
      content: `This is a comprehensive guide about ${topic}. It covers key concepts, best practices, and actionable insights.`,
      seo_keywords: keywords
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
      title: `${topic} Fundamentals`,
      description: `Master the fundamentals of ${topic} with this comprehensive course.`,
      modules: [
        { title: `Introduction to ${topic}`, duration: 30 },
        { title: `${topic} Core Concepts`, duration: 45 },
        { title: `Advanced ${topic} Techniques`, duration: 60 },
        { title: `Real-world ${topic} Applications`, duration: 45 }
      ]
    };
  }
}

// ============================================
// AI ASSESSMENT SCORING
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
    // Calculate mock score
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
      feedback: score >= 80 ? 'Excellent! You have strong knowledge.' :
                score >= 60 ? 'Good job! Review the areas below for improvement.' :
                'Keep practicing! Review the recommended materials.',
      weakAreas: score < 70 ? ['Review fundamental concepts', 'Practice with sample questions'] : []
    };
  }
}

// ============================================
// AI CAREER ADVISOR
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
        { title: 'Senior Software Engineer', matchScore: 85, salaryRange: '$120k - $160k' },
        { title: 'Tech Lead', matchScore: 75, salaryRange: '$140k - $180k' },
        { title: 'Engineering Manager', matchScore: 65, salaryRange: '$150k - $200k' }
      ],
      skillDevelopment: [
        { skill: 'System Design', priority: 'High', estimatedTime: '2-3 months' },
        { skill: 'Leadership', priority: 'Medium', estimatedTime: '3-6 months' }
      ],
      recommendedCertifications: [
        { name: 'AWS Solutions Architect', provider: 'AWS', cost: '$150' },
        { name: 'Professional Scrum Master', provider: 'Scrum.org', cost: '$200' }
      ]
    };
  }
}

// ============================================
// AI INTERVIEW PREPARATION
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
        { question: "Explain the difference between let, const, and var in JavaScript.", sampleAnswer: "let and const are block-scoped, var is function-scoped. const cannot be reassigned." },
        { question: "What is the virtual DOM and how does it work?", sampleAnswer: "The virtual DOM is a lightweight copy of the actual DOM. React uses it to efficiently update only changed elements." }
      ],
      behavioral: [
        { question: "Describe a challenging project you led and how you overcame obstacles.", sampleAnswer: "Structure your answer using STAR: Situation, Task, Action, Result." },
        { question: "How do you handle conflicts within your team?", sampleAnswer: "Focus on open communication, active listening, and finding win-win solutions." }
      ]
    };
  }
}
