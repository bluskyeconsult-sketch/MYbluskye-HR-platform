// src/hooks/useAIAssist.js
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useAIAssist() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateCourseContent = async (idea) => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to call OpenAI API first (if configured)
      const response = await fetch('/api/ai/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      // Fallback: Intelligent defaults based on idea keywords
      const ideaLower = idea.toLowerCase();
      let title = '';
      let description = '';
      let level = 'beginner';
      let category = 'technology';
      let modules = [];
      
      if (ideaLower.includes('react') || ideaLower.includes('frontend')) {
        title = 'React Mastery: From Beginner to Advanced';
        description = 'Master React.js with this comprehensive course. Learn hooks, state management, and build real-world applications.';
        category = 'technology';
        modules = [
          { title: 'React Fundamentals', description: 'Core concepts of React', duration: 45 },
          { title: 'Hooks Deep Dive', description: 'Master useState, useEffect, and custom hooks', duration: 60 },
          { title: 'State Management', description: 'Redux, Context API, and Zustand', duration: 45 },
          { title: 'Building Real Projects', description: 'Create production-ready applications', duration: 60 }
        ];
      } else if (ideaLower.includes('python') || ideaLower.includes('data')) {
        title = 'Python for Data Science';
        description = 'Learn Python programming and data analysis with pandas, numpy, and matplotlib.';
        category = 'technology';
        level = 'intermediate';
        modules = [
          { title: 'Python Basics', description: 'Variables, loops, functions', duration: 45 },
          { title: 'Data Analysis with Pandas', description: 'Manipulate and analyze data', duration: 60 },
          { title: 'Data Visualization', description: 'Create stunning charts', duration: 45 },
          { title: 'Real-world Projects', description: 'Apply skills to real datasets', duration: 60 }
        ];
      } else if (ideaLower.includes('hr') || ideaLower.includes('recruitment')) {
        title = 'Strategic HR Management';
        description = 'Learn modern HR practices, recruitment strategies, and employee engagement.';
        category = 'business';
        level = 'intermediate';
        modules = [
          { title: 'HR Fundamentals', description: 'Core HR principles', duration: 45 },
          { title: 'Recruitment Strategies', description: 'Find and hire top talent', duration: 60 },
          { title: 'Employee Engagement', description: 'Build great workplace culture', duration: 45 },
          { title: 'Performance Management', description: 'Drive team success', duration: 60 }
        ];
      } else {
        title = idea.split(' ').slice(0, 5).join(' ') + ' Mastery';
        description = `A comprehensive course covering ${idea}. Learn from industry experts with hands-on projects.`;
        category = 'professional-development';
        modules = [
          { title: 'Introduction', description: 'Course overview and setup', duration: 30 },
          { title: 'Core Concepts', description: 'Essential knowledge and skills', duration: 60 },
          { title: 'Advanced Topics', description: 'Deep dive into expert techniques', duration: 60 },
          { title: 'Final Project', description: 'Apply everything you learned', duration: 45 }
        ];
      }
      
      return {
        success: true,
        data: { title, description, level, category, modules, estimatedDuration: modules.reduce((sum, m) => sum + m.duration, 0) }
      };
    } catch (err) {
      console.error('AI Assist error:', err);
      setError('Could not generate content. Please fill manually.');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const generateJobContent = async (idea) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/generate-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      // Fallback
      const ideaLower = idea.toLowerCase();
      let title = '';
      let description = '';
      let requirements = [];
      
      if (ideaLower.includes('developer') || ideaLower.includes('engineer')) {
        title = 'Senior Software Engineer';
        description = 'Join our engineering team to build scalable applications and solve challenging problems.';
        requirements = [
          '5+ years of software development experience',
          'Strong knowledge of JavaScript/TypeScript',
          'Experience with React or similar frameworks',
          'Understanding of REST APIs and databases',
          'Bachelor\'s degree in Computer Science or equivalent'
        ];
      } else if (ideaLower.includes('hr') || ideaLower.includes('human resources')) {
        title = 'HR Generalist';
        description = 'Manage recruitment, employee relations, and HR operations for our growing team.';
        requirements = [
          '3+ years of HR experience',
          'Knowledge of employment laws',
          'Excellent communication skills',
          'Experience with HRIS systems',
          'Bachelor\'s degree in HR or related field'
        ];
      } else if (ideaLower.includes('marketing')) {
        title = 'Digital Marketing Manager';
        description = 'Lead our digital marketing efforts across social media, email, and content marketing.';
        requirements = [
          '5+ years of digital marketing experience',
          'Experience with SEO/SEM',
          'Social media management skills',
          'Analytics and reporting expertise',
          'Content strategy experience'
        ];
      } else {
        title = idea.split(' ').slice(0, 4).join(' ') + ' Position';
        description = `We are seeking a talented professional for this ${idea} role. Join our dynamic team and make an impact.`;
        requirements = [
          'Relevant experience in the field',
          'Strong communication skills',
          'Team player mentality',
          'Problem-solving abilities'
        ];
      }
      
      return {
        success: true,
        data: { title, description, requirements, salary_range: 'Competitive', job_type: 'full-time' }
      };
    } catch (err) {
      setError('Could not generate job content. Please fill manually.');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const generateBookContent = async (idea) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/generate-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      // Fallback
      const ideaLower = idea.toLowerCase();
      let title = '';
      let description = '';
      let author = 'ODUSBABA Publishing';
      
      if (ideaLower.includes('leadership')) {
        title = 'The Art of Leadership';
        description = 'Master the essential skills of effective leadership in the modern workplace.';
      } else if (ideaLower.includes('productivity')) {
        title = 'Peak Productivity';
        description = 'Learn to achieve more with less stress through proven productivity techniques.';
      } else {
        title = idea.split(' ').slice(0, 5).join(' ') + ': The Complete Guide';
        description = `A comprehensive guide to ${idea}. Everything you need to know to succeed.`;
      }
      
      return {
        success: true,
        data: { title, description, author, price: 29.99, category: 'professional-development' }
      };
    } catch (err) {
      setError('Could not generate book content. Please fill manually.');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { generateCourseContent, generateJobContent, generateBookContent, loading, error };
}
