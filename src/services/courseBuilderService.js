// src/services/courseBuilderService.js
// AI Course Builder Service - For admin/trainer use

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// AI Course Creation - Auto generate full course from topic
// ============================================

export async function autoCreateCourse(topic, description, userId) {
  try {
    // Step 1: Create the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: topic,
        description: description || `Complete course on ${topic} powered by AI`,
        short_description: description?.substring(0, 150) || `Learn ${topic} with ODUSBABA AI`,
        is_published: false,
        created_by: userId,
        difficulty: 'beginner',
        category: 'ai_generated',
        what_you_learn: [`Understand ${topic} fundamentals`, `Apply ${topic} in real scenarios`, `Master ${topic} best practices`]
      })
      .select()
      .single();

    if (courseError) throw courseError;

    // Step 2: Generate modules (sections) using AI
    const modules = await generateModulesWithAI(topic);
    
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      
      // Create module
      const { data: section, error: sectionError } = await supabase
        .from('course_modules')
        .insert({
          course_id: course.id,
          title: module.title,
          description: module.description,
          sort_order: i
        })
        .select()
        .single();
      
      if (sectionError) throw sectionError;
      
      // Generate lessons for each module
      const lessons = await generateLessonsWithAI(topic, module.title);
      
      for (let j = 0; j < lessons.length; j++) {
        const lesson = lessons[j];
        
        // Create lesson
        const { data: lessonData, error: lessonError } = await supabase
          .from('course_lessons')
          .insert({
            module_id: section.id,
            title: lesson.title,
            content: lesson.content,
            content_html: lesson.content,
            sort_order: j,
            duration: lesson.estimatedDuration || 10
          })
          .select()
          .single();
        
        if (lessonError) throw lessonError;
        
        // Generate audio for lesson if OpenAI is configured
        if (process.env.OPENAI_API_KEY) {
          try {
            await generateCourseAudio(lessonData.id, lesson.content);
          } catch (audioError) {
            console.warn('Audio generation skipped:', audioError.message);
          }
        }
      }
    }
    
    return { success: true, courseId: course.id };
    
  } catch (error) {
    console.error('Auto course creation error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// Generate Modules from AI
// ============================================

async function generateModulesWithAI(topic) {
  // If OpenAI is not configured, return default modules
  if (!process.env.OPENAI_API_KEY) {
    return [
      { title: `Introduction to ${topic}`, description: `Learn the fundamentals of ${topic}` },
      { title: `${topic} Best Practices`, description: `Master the key concepts and best practices` },
      { title: `Advanced ${topic} Strategies`, description: `Take your skills to the next level` }
    ];
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a course curriculum designer. Create a detailed course structure.' },
          { role: 'user', content: `Create 4-6 modules for a course titled "${topic}". Return as JSON array with title and description for each module.` }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [
      { title: `Introduction to ${topic}`, description: `Learn the fundamentals of ${topic}` },
      { title: `${topic} Best Practices`, description: `Master the key concepts and best practices` },
      { title: `Advanced ${topic} Strategies`, description: `Take your skills to the next level` },
      { title: `${topic} Case Studies`, description: `Real-world applications and examples` },
      { title: `Final Assessment`, description: `Test your knowledge and earn certification` }
    ];
    
  } catch (error) {
    console.error('AI module generation error:', error);
    return [
      { title: `Introduction to ${topic}`, description: `Learn the fundamentals of ${topic}` },
      { title: `${topic} Best Practices`, description: `Master the key concepts` },
      { title: `${topic} Applications`, description: `Apply your knowledge in real scenarios` }
    ];
  }
}

// ============================================
// Generate Lessons from AI
// ============================================

async function generateLessonsWithAI(topic, moduleTitle) {
  if (!process.env.OPENAI_API_KEY) {
    return [
      { title: `Introduction to ${moduleTitle}`, content: `<p>Learn about ${moduleTitle} in this comprehensive lesson.</p>`, estimatedDuration: 10 },
      { title: `Key Concepts of ${moduleTitle}`, content: `<p>Master the essential concepts and techniques.</p>`, estimatedDuration: 15 },
      { title: `${moduleTitle} in Practice`, content: `<p>Apply what you've learned with practical examples.</p>`, estimatedDuration: 12 }
    ];
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a course creator. Create engaging lesson content.' },
          { role: 'user', content: `Create 3-4 lessons for a module titled "${moduleTitle}" in a course about "${topic}". Return as JSON array with title, content (HTML formatted), and estimatedDuration (minutes).` }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [
      { title: `Understanding ${moduleTitle}`, content: `<p>This lesson introduces ${moduleTitle} and its importance.</p>`, estimatedDuration: 10 },
      { title: `Mastering ${moduleTitle}`, content: `<p>Deep dive into ${moduleTitle} concepts and techniques.</p>`, estimatedDuration: 15 },
      { title: `Applying ${moduleTitle}`, content: `<p>Practical applications and real-world scenarios.</p>`, estimatedDuration: 12 }
    ];
    
  } catch (error) {
    console.error('AI lesson generation error:', error);
    return [
      { title: `Introduction to ${moduleTitle}`, content: `<p>Learn about ${moduleTitle} in this lesson.</p>`, estimatedDuration: 10 },
      { title: `${moduleTitle} Deep Dive`, content: `<p>Explore advanced concepts and techniques.</p>`, estimatedDuration: 15 },
      { title: `${moduleTitle} Practice`, content: `<p>Apply your knowledge with practical exercises.</p>`, estimatedDuration: 12 }
    ];
  }
}

// ============================================
// Generate Audio for Lesson using OpenAI TTS
// ============================================

export async function generateCourseAudio(lessonId, textContent) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured. Audio generation skipped.');
    return { success: false, error: 'OpenAI not configured' };
  }
  
  try {
    // Clean text (remove HTML tags for audio)
    const cleanText = textContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Limit text length (OpenAI TTS limit is 4096 characters)
    const truncatedText = cleanText.substring(0, 4000);
    
    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: truncatedText,
        voice: 'nova',
        speed: 1.0
      })
    });
    
    if (!response.ok) {
      throw new Error('TTS generation failed');
    }
    
    // Get audio as buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Upload to Supabase Storage
    const fileName = `course_audio/${lessonId}_${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course_content')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('course_content')
      .getPublicUrl(fileName);
    
    // Update lesson with audio URL
    await supabase
      .from('course_lessons')
      .update({
        audio_url: publicUrl,
        audio_duration: Math.ceil(cleanText.split(/\s+/).length / 150 * 60) // estimate duration
      })
      .eq('id', lessonId);
    
    return { success: true, audioUrl: publicUrl };
    
  } catch (error) {
    console.error('Audio generation error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// Generate Quiz for Lesson
// ============================================

export async function generateQuizForLesson(lessonId, topic) {
  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: 'OpenAI not configured' };
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a quiz creator. Create multiple choice questions.' },
          { role: 'user', content: `Create 5 multiple choice questions about "${topic}". Return as JSON array with question_text, options (array of 4), and correct_answer (0-indexed).` }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      
      // Create quiz record
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          lesson_id: lessonId,
          title: `Quiz: ${topic}`,
          passing_score: 70
        })
        .select()
        .single();
      
      if (quizError) throw quizError;
      
      // Save questions and answers
      for (const q of questions) {
        const { data: question, error: qError } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quiz.id,
            question_text: q.question_text,
            question_type: 'multiple_choice',
            points: 1
          })
          .select()
          .single();
        
        if (qError) throw qError;
        
        // Save options
        for (let i = 0; i < q.options.length; i++) {
          await supabase
            .from('quiz_options')
            .insert({
              question_id: question.id,
              option_text: q.options[i],
              is_correct: i === q.correct_answer,
              sort_order: i
            });
        }
      }
      
      // Update lesson to indicate it has a quiz
      await supabase
        .from('course_lessons')
        .update({ has_quiz: true })
        .eq('id', lessonId);
      
      return { success: true, quizId: quiz.id };
    }
    
    return { success: false, error: 'No questions generated' };
    
  } catch (error) {
    console.error('Quiz generation error:', error);
    return { success: false, error: error.message };
  }
}
