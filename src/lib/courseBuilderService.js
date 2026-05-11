// src/lib/courseBuilderService.js
// COMPLETE COURSE BUILDER SERVICE - Copy and replace entire file

import { supabase } from './supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ============================================
// AUTO-CREATE COMPLETE COURSE
// ============================================

export async function autoCreateCourse(topic, level, durationHours, targetAudience, adminId) {
    if (!topic || !topic.trim()) {
        return { success: false, error: 'Course topic is required' };
    }
    
    try {
        const courseSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 90);
        
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .insert({
                title: topic,
                slug: courseSlug,
                description: `Complete ${level} level course on ${topic}. ${targetAudience || ''}`,
                level: level,
                duration_minutes: durationHours * 60,
                status: 'draft',
                auto_generated: true,
                created_by: adminId
            })
            .select()
            .single();
        
        if (courseError) {
            return { success: false, error: courseError.message };
        }
        
        // Create default module
        const { data: module, error: moduleError } = await supabase
            .from('course_modules')
            .insert({
                course_id: course.id,
                title: `Introduction to ${topic}`,
                description: `Get started with ${topic}`,
                order_index: 1,
                duration_minutes: 30
            })
            .select()
            .single();
        
        if (!moduleError && module) {
            // Create default lesson
            await supabase
                .from('course_lessons')
                .insert({
                    module_id: module.id,
                    title: `Getting Started with ${topic}`,
                    content: `<p>Welcome to this course on ${topic}. This is an AI-generated course designed to help you master ${topic}.</p><p>You can edit this content to add more details.</p>`,
                    content_html: `<p>Welcome to this course on ${topic}. This is an AI-generated course designed to help you master ${topic}.</p><p>You can edit this content to add more details.</p>`,
                    order_index: 1,
                    duration_seconds: 300,
                    is_free_preview: true
                });
        }
        
        return { 
            success: true, 
            courseId: course.id, 
            courseSlug: courseSlug,
            lessonCount: 1,
            message: `Course "${topic}" created successfully!`
        };
        
    } catch (error) {
        console.error('Auto-create course error:', error);
        return { success: false, error: error.message || 'Failed to create course' };
    }
}

// ============================================
// GENERATE AUDIO FOR LESSON
// ============================================

export async function generateCourseAudio(lessonId, textContent) {
    if (!OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured. Audio generation skipped.');
        return { success: false, error: 'OpenAI not configured' };
    }
    
    try {
        const cleanText = textContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (!cleanText || cleanText.length === 0) {
            return { success: false, error: 'No content to convert to audio' };
        }
        
        const truncatedText = cleanText.substring(0, 4000);
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
        
        const audioBuffer = await response.arrayBuffer();
        
        const fileName = `course_audio/${lessonId}_${Date.now()}.mp3`;
        const { error: uploadError } = await supabase.storage
            .from('course_content')
            .upload(fileName, audioBuffer, {
                contentType: 'audio/mpeg',
                cacheControl: '3600'
            });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
            .from('course_content')
            .getPublicUrl(fileName);
        
        const wordCount = cleanText.split(/\s+/).length;
        const estimatedDuration = Math.ceil(wordCount / 150 * 60);
        
        await supabase
            .from('course_lessons')
            .update({
                audio_url: publicUrl,
                audio_duration: estimatedDuration
            })
            .eq('id', lessonId);
        
        return { success: true, audioUrl: publicUrl };
        
    } catch (error) {
        console.error('Audio generation error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// GENERATE IMAGE FOR LESSON
// ============================================

export async function generateLessonImage(lessonId, imagePrompt) {
    if (!OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured. Image generation skipped.');
        return { success: false, error: 'OpenAI not configured' };
    }

    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: `${imagePrompt}. Educational illustration, professional, clear, suitable for learning. No text, no words on the image.`,
                n: 1,
                size: '1024x1024',
                quality: 'standard'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'DALL-E generation failed');
        }

        const data = await response.json();
        const imageUrl = data.data[0].url;

        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        
        const fileName = `lesson_images/${lessonId}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
            .from('course_content')
            .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('course_content')
            .getPublicUrl(fileName);

        await supabase
            .from('course_lessons')
            .update({ image_url: publicUrl })
            .eq('id', lessonId);

        return { success: true, imageUrl: publicUrl };
        
    } catch (error) {
        console.error('Image generation error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// BATCH GENERATE AUDIO FOR ALL LESSONS
// ============================================

export async function batchGenerateCourseAudio(courseId) {
    const { data: modules } = await supabase
        .from('course_modules')
        .select('id, lessons:course_lessons(id, content)')
        .eq('course_id', courseId);
    
    const results = { total: 0, succeeded: 0, failed: 0 };
    
    for (const module of modules || []) {
        for (const lesson of module.lessons || []) {
            results.total++;
            if (lesson.content) {
                const result = await generateCourseAudio(lesson.id, lesson.content);
                if (result.success) {
                    results.succeeded++;
                } else {
                    results.failed++;
                }
            }
        }
    }
    
    return results;
}
