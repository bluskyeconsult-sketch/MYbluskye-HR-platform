import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Call OpenAI API
async function callOpenAI(prompt, systemPrompt = '', maxTokens = 2000) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt || 'You are an expert course creator and instructional designer.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: maxTokens,
            temperature: 0.7
        })
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
}

// Generate complete course outline
export async function generateCourseOutline(topic, level, durationHours, targetAudience) {
    const prompt = `Create a detailed course outline for a ${level} level course on "${topic}".
    Target audience: ${targetAudience}
    Duration: ${durationHours} hours
    
    Return as JSON with:
    - title: catchy course title
    - description: 2-3 sentence overview
    - what_you_will_learn: array of 5-7 key takeaways
    - target_audience: detailed description
    - requirements: array of prerequisites
    - modules: array of module objects with title and description
    - total_modules: number of modules
    - estimated_duration_minutes: total minutes
    
    Make it practical, actionable, and engaging.`;

    const response = await callOpenAI(prompt, 'You are an expert course creator. Return valid JSON only.', 2500);
    
    try {
        return JSON.parse(response);
    } catch (e) {
        console.error('Failed to parse course outline:', e);
        return null;
    }
}

// Generate lesson content
export async function generateLessonContent(moduleTitle, lessonTitle, topic, level, previousLessonContext = '') {
    const prompt = `Create detailed lesson content for:
    Course Topic: ${topic}
    Level: ${level}
    Module: ${moduleTitle}
    Lesson Title: ${lessonTitle}
    ${previousLessonContext ? `Previous lesson context: ${previousLessonContext}` : ''}
    
    Return as JSON with:
    - content: Main lesson content (HTML formatted, 500-1000 words)
    - key_points: array of 3-5 key takeaways
    - examples: array of practical examples
    - quiz_questions: array of 3 questions with options and correct_answer
    - estimated_duration_seconds: estimated reading time in seconds (default 300)`;

    const response = await callOpenAI(prompt, 'You are an expert educator creating engaging, practical lesson content. Return valid JSON only.', 3000);
    
    try {
        return JSON.parse(response);
    } catch (e) {
        console.error('Failed to parse lesson content:', e);
        return null;
    }
}

// Generate quiz questions for a module
export async function generateModuleQuiz(moduleTitle, topic, level, lessonSummaries) {
    const prompt = `Create a quiz for the module "${moduleTitle}" on topic "${topic}" (${level} level).
    Lesson summaries: ${lessonSummaries}
    
    Return as JSON with:
    - title: quiz title
    - questions: array of 5 objects with:
      - question_text
      - options: array of 4 options
      - correct_answer
      - explanation: why this is correct
      - points: 1

    Make questions challenging but fair.`;

    const response = await callOpenAI(prompt, 'You are an expert quiz creator. Return valid JSON only.', 2000);
    
    try {
        return JSON.parse(response);
    } catch (e) {
        return null;
    }
}

// Auto-create full course from topic
export async function autoCreateCourse(topic, level, durationHours, targetAudience, adminId) {
    try {
        // Step 1: Generate course outline
        const outline = await generateCourseOutline(topic, level, durationHours, targetAudience);
        if (!outline) throw new Error('Failed to generate course outline');
        
        // Step 2: Create course in database
        const courseSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .insert({
                title: outline.title,
                slug: courseSlug,
                description: outline.description,
                long_description: outline.description,
                category: 'Professional Development',
                level: level,
                duration_minutes: outline.estimated_duration_minutes,
                instructor_id: adminId,
                instructor_name: 'AI Course Generator',
                price: 0, // Free for now
                what_you_will_learn: outline.what_you_will_learn,
                target_audience: outline.target_audience,
                requirements: outline.requirements,
                status: 'draft',
                auto_generated: true
            })
            .select()
            .single();
        
        if (courseError) throw courseError;
        
        // Step 3: Create modules and lessons
        let totalDuration = 0;
        
        for (let moduleIdx = 0; moduleIdx < outline.modules.length; moduleIdx++) {
            const moduleData = outline.modules[moduleIdx];
            
            const { data: module, error: moduleError } = await supabase
                .from('course_modules')
                .insert({
                    course_id: course.id,
                    title: moduleData.title,
                    description: moduleData.description,
                    order_index: moduleIdx + 1,
                    duration_minutes: 0
                })
                .select()
                .single();
            
            if (moduleError) continue;
            
            // Generate lessons for this module (typically 3-5 lessons per module)
            const lessonsPerModule = 3;
            let previousContext = '';
            
            for (let lessonIdx = 0; lessonIdx < lessonsPerModule; lessonIdx++) {
                const lessonTitle = `${moduleData.title} - Part ${lessonIdx + 1}`;
                
                const lessonContent = await generateLessonContent(
                    moduleData.title,
                    lessonTitle,
                    topic,
                    level,
                    previousContext
                );
                
                if (lessonContent) {
                    const { error: lessonError } = await supabase
                        .from('course_lessons')
                        .insert({
                            module_id: module.id,
                            title: lessonTitle,
                            content: lessonContent.content,
                            content_html: lessonContent.content,
                            order_index: lessonIdx + 1,
                            duration_seconds: lessonContent.estimated_duration_seconds || 300
                        });
                    
                    totalDuration += lessonContent.estimated_duration_seconds || 300;
                    previousContext = lessonContent.content.substring(0, 500);
                }
            }
            
            // Update module duration
            await supabase
                .from('course_modules')
                .update({ duration_minutes: Math.ceil(totalDuration / 60) })
                .eq('id', module.id);
        }
        
        // Update course duration
        await supabase
            .from('courses')
            .update({ duration_minutes: Math.ceil(totalDuration / 60) })
            .eq('id', course.id);
        
        return { success: true, courseId: course.id, message: 'Course created successfully' };
    } catch (error) {
        console.error('Auto-create course error:', error);
        return { success: false, error: error.message };
    }
}
