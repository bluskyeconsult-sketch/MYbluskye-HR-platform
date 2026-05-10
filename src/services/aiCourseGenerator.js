// src/services/aiCourseGenerator.js
// AI-Powered Course Generator - Creates full courses with modules, lessons, quizzes, images, and audio

import { supabase } from '../lib/supabase';
import { generateAudioForLesson } from './audioService';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ============================================
// GENERATE COMPLETE COURSE OUTLINE
// ============================================

export async function generateFullCourseOutline(topic, level, durationHours, targetAudience, learningObjectives) {
    const prompt = `Create a comprehensive course outline for a ${level} level course on "${topic}".

Target Audience: ${targetAudience}
Duration: ${durationHours} hours
Learning Objectives: ${learningObjectives || 'Master the subject matter'}

Return as JSON with this exact structure:
{
    "title": "Engaging course title",
    "description": "2-3 paragraph overview",
    "learning_objectives": ["objective 1", "objective 2", "objective 3", "objective 4", "objective 5"],
    "modules": [
        {
            "title": "Module 1 Title",
            "description": "Module overview",
            "estimated_minutes": 45,
            "lessons": [
                {
                    "title": "Lesson 1.1 Title",
                    "description": "What will be learned",
                    "key_concepts": ["concept 1", "concept 2"],
                    "lesson_type": "video|text|quiz|interactive",
                    "estimated_minutes": 15
                }
            ]
        }
    ],
    "total_modules": 4,
    "total_lessons": 12,
    "estimated_minutes": 240
}

Make it practical, engaging, and educationally sound. Return ONLY valid JSON.`;

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
                    { role: 'system', content: 'You are an expert instructional designer and course creator.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const cleanResponse = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error('Course outline generation error:', error);
        throw error;
    }
}

// ============================================
// GENERATE DETAILED LESSON CONTENT
// ============================================

export async function generateLessonContent(topic, moduleTitle, lessonTitle, level, previousContent = '') {
    const prompt = `Create detailed educational content for:
Course Topic: ${topic}
Level: ${level}
Module: ${moduleTitle}
Lesson: ${lessonTitle}
${previousContent ? `Previous lesson context: ${previousContent.substring(0, 500)}` : ''}

Return as JSON with:
{
    "introduction": "Engaging opening paragraph",
    "content_sections": [
        {
            "heading": "Section 1 Heading",
            "content": "Detailed explanation with examples",
            "image_prompt": "Description for DALL-E image generation"
        }
    ],
    "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
    "practical_exercise": "Hands-on activity description",
    "in_lesson_quiz": {
        "questions": [
            {
                "question": "Question text?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": 0,
                "explanation": "Why this is correct"
            }
        ]
    },
    "estimated_reading_minutes": 10,
    "html_content": "Full HTML formatted content"
}

Make content engaging, practical, and well-structured. Include examples and real-world applications.`;

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
                    { role: 'system', content: 'You are an expert educator creating engaging, practical lesson content.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 3000
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const cleanResponse = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error('Lesson content generation error:', error);
        throw error;
    }
}

// ============================================
// GENERATE IMAGE FOR LESSON (DALL-E)
// ============================================

export async function generateLessonImage(imagePrompt, lessonId) {
    if (!OPENAI_API_KEY) return null;

    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: `${imagePrompt}. Educational illustration, professional, clear, suitable for learning.`,
                n: 1,
                size: '1024x1024',
                quality: 'standard'
            })
        });

        const data = await response.json();
        const imageUrl = data.data[0].url;

        // Download and upload to Supabase
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

        return publicUrl;
    } catch (error) {
        console.error('Image generation error:', error);
        return null;
    }
}

// ============================================
// CREATE COMPLETE COURSE FROM AI
// ============================================

export async function createFullCourseFromAI(topic, level, durationHours, targetAudience, adminId, learningObjectives = '') {
    try {
        // Step 1: Generate course outline
        console.log('📚 Generating course outline...');
        const outline = await generateFullCourseOutline(topic, level, durationHours, targetAudience, learningObjectives);
        
        // Step 2: Create course record
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
                duration_minutes: outline.estimated_minutes,
                instructor_id: adminId,
                instructor_name: 'AI Course Generator',
                what_you_will_learn: outline.learning_objectives,
                status: 'draft',
                auto_generated: true,
                created_by: adminId
            })
            .select()
            .single();

        if (courseError) throw courseError;
        console.log(`✅ Course created: ${course.id}`);

        let totalLessons = 0;
        let totalQuizQuestions = 0;

        // Step 3: Create modules and lessons
        for (let moduleIdx = 0; moduleIdx < outline.modules.length; moduleIdx++) {
            const moduleData = outline.modules[moduleIdx];
            
            const { data: module, error: moduleError } = await supabase
                .from('course_modules')
                .insert({
                    course_id: course.id,
                    title: moduleData.title,
                    description: moduleData.description,
                    order_index: moduleIdx + 1,
                    duration_minutes: moduleData.estimated_minutes
                })
                .select()
                .single();

            if (moduleError) continue;
            console.log(`📖 Creating module ${moduleIdx + 1}: ${moduleData.title}`);

            for (let lessonIdx = 0; lessonIdx < moduleData.lessons.length; lessonIdx++) {
                const lessonData = moduleData.lessons[lessonIdx];
                
                console.log(`  📝 Generating lesson ${lessonIdx + 1}: ${lessonData.title}`);
                
                // Generate detailed lesson content
                const lessonContent = await generateLessonContent(
                    topic,
                    moduleData.title,
                    lessonData.title,
                    level
                );

                // Generate image for the lesson
                let imageUrl = null;
                if (lessonContent.content_sections?.[0]?.image_prompt) {
                    imageUrl = await generateLessonImage(
                        lessonContent.content_sections[0].image_prompt,
                        `temp_${Date.now()}`
                    );
                }

                // Insert lesson
                const { data: lesson, error: lessonError } = await supabase
                    .from('course_lessons')
                    .insert({
                        module_id: module.id,
                        title: lessonData.title,
                        content: lessonContent.html_content,
                        content_html: lessonContent.html_content,
                        image_url: imageUrl,
                        duration_seconds: lessonContent.estimated_reading_minutes * 60,
                        order_index: lessonIdx + 1,
                        is_free_preview: lessonIdx === 0,
                        has_quiz: lessonContent.in_lesson_quiz ? true : false
                    })
                    .select()
                    .single();

                if (lessonError) {
                    console.error('Lesson creation error:', lessonError);
                    continue;
                }

                totalLessons++;

                // Create quiz for lesson if exists
                if (lessonContent.in_lesson_quiz && lessonContent.in_lesson_quiz.questions) {
                    const { data: quiz, error: quizError } = await supabase
                        .from('quizzes')
                        .insert({
                            lesson_id: lesson.id,
                            title: `Quiz: ${lessonData.title}`,
                            passing_score: 70,
                            time_limit_minutes: Math.ceil(lessonContent.in_lesson_quiz.questions.length * 1.5)
                        })
                        .select()
                        .single();

                    if (!quizError) {
                        for (let qIdx = 0; qIdx < lessonContent.in_lesson_quiz.questions.length; qIdx++) {
                            const q = lessonContent.in_lesson_quiz.questions[qIdx];
                            const { data: question, error: qError } = await supabase
                                .from('quiz_questions')
                                .insert({
                                    quiz_id: quiz.id,
                                    question_text: q.question,
                                    question_type: 'multiple_choice',
                                    points: 1,
                                    sort_order: qIdx
                                })
                                .select()
                                .single();

                            if (!qError) {
                                for (let optIdx = 0; optIdx < q.options.length; optIdx++) {
                                    await supabase
                                        .from('quiz_options')
                                        .insert({
                                            question_id: question.id,
                                            option_text: q.options[optIdx],
                                            is_correct: optIdx === q.correct_answer,
                                            sort_order: optIdx
                                        });
                                }
                                totalQuizQuestions++;
                            }
                        }
                    }
                }

                // Generate audio for lesson
                try {
                    await generateAudioForLesson(lesson.id, lessonContent.html_content);
                } catch (audioError) {
                    console.warn('Audio generation failed:', audioError);
                }
            }
        }

        // Update course with totals
        await supabase
            .from('courses')
            .update({
                total_lessons: totalLessons,
                duration_minutes: outline.estimated_minutes
            })
            .eq('id', course.id);

        console.log(`✅ Course creation complete! ${totalLessons} lessons, ${totalQuizQuestions} quiz questions`);
        
        return {
            success: true,
            courseId: course.id,
            courseSlug: courseSlug,
            lessonCount: totalLessons,
            quizCount: totalQuizQuestions,
            message: `Course "${outline.title}" created successfully with ${totalLessons} lessons.`
        };

    } catch (error) {
        console.error('Course creation error:', error);
        return { success: false, error: error.message };
    }
}
