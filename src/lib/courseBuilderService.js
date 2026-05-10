// src/lib/courseBuilderService.js
// AI-Powered Course Builder Service - Uses Supabase only, no Database object

import { supabase } from './supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ============================================
// VALIDATION HELPERS
// ============================================

function isValidJobType(jobType) {
    const validTypes = ['full_time', 'part_time', 'contract', 'freelance', 'remote', 'hybrid', 'onsite'];
    return validTypes.includes(jobType);
}

function normalizeJobType(jobType) {
    if (!jobType) return 'full_time';
    
    const normalized = jobType.toLowerCase().trim().replace(/-/g, '_');
    
    const mapping = {
        'fulltime': 'full_time',
        'full-time': 'full_time',
        'full time': 'full_time',
        'parttime': 'part_time',
        'part-time': 'part_time',
        'part time': 'part_time',
        'remote': 'remote',
        'work from home': 'remote',
        'wfh': 'remote',
        'hybrid': 'hybrid',
        'contract': 'contract',
        'freelance': 'freelance',
        'onsite': 'onsite',
        'on-site': 'onsite'
    };
    
    return mapping[normalized] || 'full_time';
}

// ============================================
// OPENAI API CALL (Safe, with error handling)
// ============================================

async function callOpenAI(prompt, systemPrompt = '', maxTokens = 2000) {
    if (!OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured');
        return null;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
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

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API error:', error);
        return null;
    }
}

// ============================================
// GENERATE COURSE OUTLINE
// ============================================

export async function generateCourseOutline(topic, level, durationHours, targetAudience) {
    const prompt = `Create a detailed course outline for a ${level} level course on "${topic}".
    
Target audience: ${targetAudience}
Duration: ${durationHours} hours

Return as JSON with this exact structure:
{
    "title": "catchy course title",
    "description": "2-3 sentence overview",
    "what_you_will_learn": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4", "takeaway 5"],
    "target_audience": "detailed description",
    "requirements": ["requirement 1", "requirement 2", "requirement 3"],
    "modules": [
        {
            "title": "Module 1 Title",
            "description": "What this module covers",
            "lessons": [
                {"title": "Lesson 1.1 Title", "description": "Brief description"},
                {"title": "Lesson 1.2 Title", "description": "Brief description"}
            ]
        }
    ]
}

Make it practical, actionable, and engaging. Return ONLY valid JSON.`;

    const response = await callOpenAI(prompt, 'You are an expert course creator. Return valid JSON only.', 3000);
    
    if (!response) return null;
    
    try {
        const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanResponse);
    } catch (e) {
        console.error('Failed to parse course outline:', e);
        return null;
    }
}

// ============================================
// GENERATE LESSON CONTENT
// ============================================

export async function generateLessonContent(moduleTitle, lessonTitle, topic, level) {
    const prompt = `Create detailed lesson content for:
Course Topic: ${topic}
Level: ${level}
Module: ${moduleTitle}
Lesson Title: ${lessonTitle}

Return as JSON with this exact structure:
{
    "content": "<p>Main lesson content in HTML format...</p><h2>Key Points</h2><ul><li>Point 1</li><li>Point 2</li></ul>",
    "key_points": ["key point 1", "key point 2", "key point 3"],
    "examples": ["example 1", "example 2"],
    "estimated_duration_seconds": 300
}

The content should be 300-500 words, well-structured with headings, paragraphs, and bullet points. Return ONLY valid JSON.`;

    const response = await callOpenAI(prompt, 'You are an expert educator creating engaging, practical lesson content. Return valid JSON only.', 2500);
    
    if (!response) {
        return {
            content: `<p>This lesson covers ${lessonTitle} as part of ${moduleTitle} in the course ${topic}.</p><p>Key concepts will be explored in detail.</p>`,
            key_points: [`Introduction to ${lessonTitle}`, `Core principles of ${moduleTitle}`, `Practical applications`],
            examples: [`Real-world example of ${lessonTitle} in action`],
            estimated_duration_seconds: 300
        };
    }
    
    try {
        const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanResponse);
    } catch (e) {
        console.error('Failed to parse lesson content:', e);
        return {
            content: `<p>This lesson covers ${lessonTitle} in ${moduleTitle}.</p><p>Learn the key concepts and practical applications.</p>`,
            key_points: [`Introduction to ${lessonTitle}`, `Core principles`, `Practical applications`],
            examples: [`Example of ${lessonTitle} in practice`],
            estimated_duration_seconds: 300
        };
    }
}

// ============================================
// GENERATE QUIZ QUESTIONS
// ============================================

export async function generateQuizQuestions(moduleTitle, topic, level) {
    const prompt = `Create a quiz for the module "${moduleTitle}" on topic "${topic}" (${level} level).

Return as JSON with this exact structure:
{
    "title": "Quiz: ${moduleTitle}",
    "questions": [
        {
            "question_text": "What is the primary purpose of...?",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correct_answer": 0,
            "explanation": "Explanation of why this is correct"
        }
    ]
}

Create 5 questions. Return ONLY valid JSON.`;

    const response = await callOpenAI(prompt, 'You are an expert quiz creator. Return valid JSON only.', 2000);
    
    if (!response) return null;
    
    try {
        const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanResponse);
    } catch (e) {
        console.error('Failed to parse quiz:', e);
        return null;
    }
}

// ============================================
// AUTO-CREATE COMPLETE COURSE
// ============================================

export async function autoCreateCourse(topic, level, durationHours, targetAudience, adminId) {
    if (!topic || !topic.trim()) {
        return { success: false, error: 'Course topic is required' };
    }
    
    try {
        console.log('📚 Generating course outline for:', topic);
        
        // Step 1: Generate course outline
        const outline = await generateCourseOutline(topic, level, durationHours, targetAudience);
        
        if (!outline || !outline.modules || outline.modules.length === 0) {
            throw new Error('Failed to generate course outline');
        }

        console.log('✅ Course outline generated');

        // Step 2: Create course slug
        const courseSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 90);
        
        // Step 3: Create course in database
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .insert({
                title: outline.title || topic,
                slug: courseSlug,
                description: outline.description,
                long_description: outline.description,
                category: 'Professional Development',
                level: level,
                duration_minutes: durationHours * 60,
                instructor_name: 'AI Course Generator',
                price: 0,
                what_you_will_learn: outline.what_you_will_learn || [],
                target_audience: outline.target_audience,
                requirements: outline.requirements || [],
                status: 'draft',
                auto_generated: true,
                created_by: adminId
            })
            .select()
            .single();
        
        if (courseError) {
            console.error('Course creation error:', courseError);
            throw courseError;
        }
        
        console.log('✅ Course created:', course.id);

        // Step 4: Create modules and lessons
        let totalDuration = 0;
        let lessonCount = 0;
        
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
            
            if (moduleError) {
                console.error('Module creation error:', moduleError);
                continue;
            }
            
            console.log(`📖 Creating module ${moduleIdx + 1}: ${moduleData.title}`);
            
            // Create lessons for this module
            const lessons = moduleData.lessons || [
                { title: `Introduction to ${moduleData.title}`, description: `Overview of ${moduleData.title}` },
                { title: `Key Concepts of ${moduleData.title}`, description: `Core principles and practices` },
                { title: `Applying ${moduleData.title}`, description: `Practical applications and examples` }
            ];
            
            for (let lessonIdx = 0; lessonIdx < lessons.length; lessonIdx++) {
                const lessonData = lessons[lessonIdx];
                
                console.log(`  📝 Generating lesson ${lessonIdx + 1}: ${lessonData.title}`);
                
                // Generate lesson content
                const lessonContent = await generateLessonContent(
                    moduleData.title,
                    lessonData.title,
                    topic,
                    level
                );
                
                const { error: lessonError } = await supabase
                    .from('course_lessons')
                    .insert({
                        module_id: module.id,
                        title: lessonData.title,
                        content: lessonContent?.content || `<p>${lessonData.description}</p><p>This lesson covers ${lessonData.title} in the context of ${topic}.</p>`,
                        content_html: lessonContent?.content || `<p>${lessonData.description}</p>`,
                        order_index: lessonIdx + 1,
                        duration_seconds: lessonContent?.estimated_duration_seconds || 300,
                        is_free_preview: lessonIdx === 0
                    });
                
                if (lessonError) {
                    console.error('Lesson creation error:', lessonError);
                } else {
                    lessonCount++;
                    totalDuration += lessonContent?.estimated_duration_seconds || 300;
                }
            }
            
            // Update module duration
            await supabase
                .from('course_modules')
                .update({ duration_minutes: Math.ceil(totalDuration / 60) })
                .eq('id', module.id);
        }
        
        // Step 5: Update course totals
        await supabase
            .from('courses')
            .update({ 
                duration_minutes: Math.ceil(totalDuration / 60),
                total_lessons: lessonCount
            })
            .eq('id', course.id);
        
        console.log(`✅ Course creation complete! ${lessonCount} lessons created`);
        
        return { 
            success: true, 
            courseId: course.id, 
            courseSlug: courseSlug,
            lessonCount: lessonCount,
            message: `Course "${outline.title || topic}" created successfully with ${lessonCount} lessons.`
        };
        
    } catch (error) {
        console.error('❌ Auto-create course error:', error);
        return { success: false, error: error.message || 'Failed to create course' };
    }
}

// ============================================
// GENERATE AND ATTACH QUIZ
// ============================================

export async function generateAndAttachQuiz(moduleId, moduleTitle, topic, level) {
    try {
        const quizData = await generateQuizQuestions(moduleTitle, topic, level);
        
        if (!quizData) {
            return { success: false, error: 'Failed to generate quiz' };
        }
        
        // Create quiz record
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .insert({
                module_id: moduleId,
                title: quizData.title,
                passing_score: 70,
                time_limit_minutes: 15
            })
            .select()
            .single();
        
        if (quizError) throw quizError;
        
        // Add questions
        for (const q of quizData.questions) {
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
            
            // Add options
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
            .eq('module_id', moduleId);
        
        return { success: true, quizId: quiz.id };
        
    } catch (error) {
        console.error('Quiz generation error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// GENERATE AUDIO FOR LESSON (OpenAI TTS)
// ============================================

export async function generateCourseAudio(lessonId, textContent) {
    if (!OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured. Audio generation skipped.');
        return { success: false, error: 'OpenAI not configured' };
    }
    
    try {
        // Clean text (remove HTML tags)
        const cleanText = textContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (!cleanText || cleanText.length === 0) {
            return { success: false, error: 'No content to convert to audio' };
        }
        
        // Limit text length (OpenAI TTS limit is 4096 characters)
        const truncatedText = cleanText.substring(0, 4000);
        
        // Call OpenAI TTS API
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
        
        // Get audio as buffer
        const audioBuffer = await response.arrayBuffer();
        
        // Upload to Supabase Storage
        const fileName = `course_audio/${lessonId}_${Date.now()}.mp3`;
        const { error: uploadError } = await supabase.storage
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
