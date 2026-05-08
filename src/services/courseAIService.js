// src/services/courseAIService.js
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AI_API_URL = '/api/ai';

// ============================================
// COURSE GENERATION ENGINE
// ============================================

export async function generateCourseOutline(topic, level = 'beginner', targetAudience = 'general') {
  try {
    const response = await axios.post(`${AI_API_URL}/generate-course`, {
      topic,
      level,
      targetAudience
    }, { timeout: 30000 });
    
    if (response.data) {
      return response.data;
    }
    throw new Error('No response from AI');
  } catch (error) {
    console.error('Course generation error:', error);
    // Return intelligent fallback based on topic
    return getFallbackCourseOutline(topic, level);
  }
}

export async function generateModuleContent(moduleTitle, moduleDescription, topic) {
  try {
    const response = await axios.post(`${AI_API_URL}/generate-module`, {
      moduleTitle,
      moduleDescription,
      topic
    }, { timeout: 20000 });
    
    return response.data;
  } catch (error) {
    console.error('Module generation error:', error);
    return getFallbackModuleContent(moduleTitle);
  }
}

export async function generateQuiz(moduleId, content, difficulty = 'medium') {
  try {
    const response = await axios.post(`${AI_API_URL}/generate-quiz`, {
      content,
      difficulty,
      questionCount: 5
    }, { timeout: 15000 });
    
    return response.data;
  } catch (error) {
    console.error('Quiz generation error:', error);
    return getFallbackQuiz(content);
  }
}

export async function analyzeLearningProgress(userId, courseId) {
  try {
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();
    
    const { data: modules } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    
    const response = await axios.post(`${AI_API_URL}/analyze-progress`, {
      completedModules: enrollments?.completed_modules || [],
      totalModules: modules?.length || 1,
      timeSpent: enrollments?.time_spent || 0,
      quizScores: enrollments?.quiz_scores || []
    });
    
    return response.data;
  } catch (error) {
    console.error('Progress analysis error:', error);
    return {
      progressPercentage: 0,
      estimatedCompletion: '2 weeks',
      strugglingModules: [],
      recommendedFocus: 'Continue with next module',
      nextSteps: ['Complete current module', 'Review key concepts']
    };
  }
}

export async function getTrendingTopics(industry = 'technology') {
  try {
    const response = await axios.get(`${AI_API_URL}/trending-topics`, {
      params: { industry }
    });
    
    return response.data;
  } catch (error) {
    console.error('Trending topics error:', error);
    return [
      'Artificial Intelligence & Machine Learning',
      'Data Science & Analytics',
      'Cloud Computing & DevOps',
      'Cybersecurity & Privacy',
      'Digital Marketing & SEO',
      'Leadership & Management',
      'Project Management Agile',
      'Human Resources & Recruitment'
    ];
  }
}

function getFallbackCourseOutline(topic, level) {
  const levelMap = {
    beginner: { duration: 120, modules: 4 },
    intermediate: { duration: 180, modules: 6 },
    advanced: { duration: 240, modules: 8 },
    expert: { duration: 300, modules: 10 }
  };
  
  const config = levelMap[level] || levelMap.beginner;
  
  return {
    title: `${topic} Mastery: From ${level.charAt(0).toUpperCase() + level.slice(1)} to Professional`,
    description: `Master the fundamentals and advanced concepts of ${topic} with hands-on projects and real-world applications.`,
    level: level,
    estimatedDuration: config.duration,
    totalModules: config.modules,
    modules: Array.from({ length: config.modules }, (_, i) => ({
      title: getModuleTitle(topic, i),
      description: `Learn ${getModuleDescription(topic, i)}`,
      orderIndex: i,
      estimatedMinutes: Math.floor(config.duration / config.modules)
    })),
    learningObjectives: [
      `Understand core concepts of ${topic}`,
      `Apply ${topic} principles in real scenarios`,
      `Master advanced ${topic} techniques`,
      `Build a portfolio project using ${topic}`
    ],
    targetAudience: `Professionals and students interested in ${topic}`,
    prerequisites: `Basic understanding of related concepts`,
    certificationAvailable: true
  };
}

function getModuleTitle(topic, index) {
  const titles = [
    `Introduction to ${topic}`,
    `${topic} Core Fundamentals`,
    `Advanced ${topic} Concepts`,
    `Practical Applications of ${topic}`,
    `${topic} Best Practices`,
    `Mastering ${topic} Techniques`,
    `Real-world ${topic} Projects`,
    `${topic} Optimization Strategies`,
    `Future Trends in ${topic}`,
    `${topic} Certification Preparation`
  ];
  return titles[index % titles.length];
}

function getModuleDescription(topic, index) {
  const descriptions = [
    `Get started with ${topic} and understand its importance`,
    `Dive deep into the fundamental principles of ${topic}`,
    `Explore advanced techniques and methodologies in ${topic}`,
    `Apply ${topic} knowledge to real-world scenarios`,
    `Learn industry best practices for ${topic}`,
    `Master professional techniques in ${topic}`,
    `Build real projects using ${topic} skills`,
    `Optimize your ${topic} implementations`,
    `Stay ahead with emerging ${topic} trends`,
    `Prepare for professional ${topic} certification`
  ];
  return descriptions[index % descriptions.length];
}

function getFallbackModuleContent(moduleTitle) {
  return {
    content: `This module covers ${moduleTitle}. You will learn key concepts, practical applications, and best practices.`,
    keyPoints: [
      'Understanding core concepts',
      'Practical applications',
      'Common pitfalls to avoid',
      'Best practices and standards'
    ],
    resources: [
      'Downloadable study guide',
      'Practice exercises',
      'Reference materials'
    ],
    estimatedReadTime: 15
  };
}

function getFallbackQuiz(content) {
  return {
    questions: [
      {
        id: 'q1',
        text: 'What is the primary concept covered in this module?',
        options: [
          'Basic understanding',
          'Advanced techniques',
          'Practical applications',
          'Theoretical foundations'
        ],
        correctAnswer: 'Basic understanding',
        explanation: 'This module focuses on building foundational knowledge.'
      },
      {
        id: 'q2',
        text: 'Which of the following is a key takeaway from this module?',
        options: [
          'Memorization of facts',
          'Practical application skills',
          'Theoretical knowledge only',
          'Historical context'
        ],
        correctAnswer: 'Practical application skills',
        explanation: 'The module emphasizes practical, real-world applications.'
      }
    ],
    passingScore: 70
  };
}
