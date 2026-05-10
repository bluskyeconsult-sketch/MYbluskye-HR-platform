// src/lib/courseService.js
// COMPLETE CLEAN VERSION - No Database references

import { supabase } from './supabase';

export async function getAllCourses() {
    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching courses:', error);
        return [];
    }
    return data || [];
}

export async function getCourseById(courseId, userId = null) {
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
    
    if (courseError) {
        console.error('Error fetching course:', courseError);
        return null;
    }
    
    const { data: modules } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
    
    if (modules) {
        for (const module of modules) {
            const { data: lessons } = await supabase
                .from('course_lessons')
                .select('*')
                .eq('module_id', module.id)
                .order('order_index', { ascending: true });
            module.lessons = lessons || [];
        }
        course.modules = modules || [];
    } else {
        course.modules = [];
    }
    
    if (userId) {
        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .maybeSingle();
        course.userEnrollment = enrollment;
    }
    
    return course;
}

export async function enrollInCourse(userId, courseId) {
    const { data: existing } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
    
    if (existing) {
        return { success: true, message: 'Already enrolled' };
    }
    
    const { data, error } = await supabase
        .from('course_enrollments')
        .insert({
            user_id: userId,
            course_id: courseId,
            enrolled_at: new Date().toISOString(),
            progress_percent: 0,
            status: 'active'
        })
        .select()
        .single();
    
    if (error) {
        console.error('Enrollment error:', error);
        return { success: false, error: error.message };
    }
    
    return { success: true, enrollmentId: data.id };
}

export async function getUserProgress(userId) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
            *,
            course:courses(id, title, slug, cover_image, duration_hours)
        `)
        .eq('user_id', userId)
        .order('last_accessed_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching progress:', error);
        return [];
    }
    return data || [];
}

export async function getUserCertificates(userId) {
    const { data, error } = await supabase
        .from('course_certificates')
        .select('*, course:courses(id, title)')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching certificates:', error);
        return [];
    }
    return data || [];
}
