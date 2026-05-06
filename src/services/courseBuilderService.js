// src/services/courseBuilderService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Automatically creates a course structure using AI based on a topic.
 * @param {string} topic - The main topic for the course.
 * @returns {Promise<Object>} - The created course data.
 */
export async function autoCreateCourse(topic) {
    console.log(`[courseBuilderService] autoCreateCourse called for topic: ${topic}`);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate a slug from the topic
    const slug = topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    
    // Example generated structure
    const generatedCourse = {
        title: `Introduction to ${topic}`,
        slug: slug,
        description: `A comprehensive course covering the fundamentals of ${topic}. This course was auto-generated to help you get started quickly.`,
        level: 'beginner',
        category: 'technology',
        duration_minutes: 45,
        price: 0,
        published: false,
        modules: [
            { title: `What is ${topic}?`, description: `An overview of ${topic} and its importance.`, order_index: 0 },
            { title: `Key Concepts in ${topic}`, description: `Deep dive into the main principles.`, order_index: 1 },
            { title: `Practical Applications of ${topic}`, description: `Real-world examples and use cases.`, order_index: 2 },
            { title: `Next Steps with ${topic}`, description: `How to continue learning and applying ${topic}.`, order_index: 3 }
        ]
    };
    
    return generatedCourse;
}

/**
 * Generates audio narration for a course module.
 * @param {string} moduleTitle - The title of the module.
 * @param {string} moduleDescription - The description/content of the module.
 * @returns {Promise<string | null>} - A URL to the generated audio file, or null.
 */
export async function generateCourseAudio(moduleTitle, moduleDescription) {
    console.log(`[courseBuilderService] generateCourseAudio called for module: ${moduleTitle}`);
    
    // Simulate TTS processing time
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // For now, return null (no audio)
    // In production, integrate with ElevenLabs, OpenAI TTS, or similar
    return null;
}

/**
 * Saves an AI-generated course to the database
 * @param {Object} courseData - The course data from autoCreateCourse
 * @returns {Promise<Object>} - The saved course
 */
export async function saveGeneratedCourse(courseData) {
    const { modules, ...courseInfo } = courseData;
    
    // Insert the course
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
            title: courseInfo.title,
            slug: courseInfo.slug,
            description: courseInfo.description,
            level: courseInfo.level,
            category: courseInfo.category,
            duration_minutes: courseInfo.duration_minutes,
            price: courseInfo.price,
            published: courseInfo.published || false
        })
        .select()
        .single();
    
    if (courseError) throw courseError;
    
    // Insert modules
    if (modules && modules.length > 0) {
        for (const module of modules) {
            await supabase
                .from('course_modules')
                .insert({
                    course_id: course.id,
                    title: module.title,
                    description: module.description,
                    order_index: module.order_index
                });
        }
    }
    
    return course;
}
