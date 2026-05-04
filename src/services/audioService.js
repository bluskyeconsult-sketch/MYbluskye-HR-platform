import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Generate audio from text using OpenAI TTS
export async function generateAudio(text, voice = 'alloy', speed = 1.0) {
    if (!OPENAI_API_KEY) {
        console.error('OpenAI API key not configured');
        return null;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: voice,
                speed: speed
            })
        });

        if (!response.ok) {
            throw new Error(`TTS API error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return audioUrl;
    } catch (error) {
        console.error('Audio generation error:', error);
        return null;
    }
}

// Generate audio for a lesson and save to storage
export async function generateAndSaveLessonAudio(lessonId, content) {
    try {
        // Get lesson details
        const { data: lesson } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('id', lessonId)
            .single();

        if (!lesson) throw new Error('Lesson not found');

        // Clean content for TTS (remove HTML tags)
        const plainText = lesson.content.replace(/<[^>]*>/g, '');
        
        // Limit text length (OpenAI TTS has ~4096 character limit)
        const truncatedText = plainText.substring(0, 4000);
        
        // Generate audio
        const audioUrl = await generateAudio(truncatedText, 'alloy', 1.0);
        
        if (audioUrl) {
            // Update lesson with audio URL
            await supabase
                .from('course_lessons')
                .update({ audio_url: audioUrl })
                .eq('id', lessonId);
            
            return { success: true, audioUrl };
        }
        
        return { success: false, error: 'Audio generation failed' };
    } catch (error) {
        console.error('Error generating lesson audio:', error);
        return { success: false, error: error.message };
    }
}

// Batch generate audio for all lessons in a course
export async function generateCourseAudio(courseId) {
    try {
        // Get all lessons in the course
        const { data: modules } = await supabase
            .from('course_modules')
            .select('id')
            .eq('course_id', courseId);
        
        let total = 0;
        let succeeded = 0;
        
        for (const module of modules) {
            const { data: lessons } = await supabase
                .from('course_lessons')
                .select('id')
                .eq('module_id', module.id);
            
            for (const lesson of lessons) {
                total++;
                const result = await generateAndSaveLessonAudio(lesson.id);
                if (result.success) succeeded++;
            }
        }
        
        return { total, succeeded, failed: total - succeeded };
    } catch (error) {
        console.error('Batch audio generation error:', error);
        return { error: error.message };
    }
}
