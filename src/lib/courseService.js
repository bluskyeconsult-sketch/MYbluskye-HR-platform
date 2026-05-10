// src/lib/courseService.js
// COMPLETE COURSE SERVICE - No Database object, uses supabase only

import { supabase } from './supabase';

// ============================================
// COURSE FETCHING
// ============================================

export async function getAllCourses() {
    const { data, error } = await supabase
        .from('courses')
        .select('*, course_enrollments(count)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

export async function getCourseById(courseId, userId = null) {
    // Get course details
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
    
    if (courseError) throw courseError;
    
    // Get modules (sections)
    const { data: modules, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
    
    if (!modulesError) {
        course.modules = modules || [];
    } else {
        course.modules = [];
    }
    
    // Get lessons for each module
    for (const module of course.modules) {
        const { data: lessons } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('module_id', module.id)
            .order('order_index', { ascending: true });
        module.lessons = lessons || [];
    }
    
    // Get user enrollment if logged in
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

// ============================================
// ENROLLMENT
// ============================================

export async function enrollInCourse(userId, courseId) {
    // Check if already enrolled
    const { data: existing } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
    
    if (existing) {
        return { success: true, message: 'Already enrolled', enrollmentId: existing.id };
    }
    
    // Create enrollment
    const { data: enrollment, error } = await supabase
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
    
    if (error) throw error;
    
    return { success: true, enrollmentId: enrollment.id };
}

// ============================================
// PROGRESS TRACKING
// ============================================

export async function updateLessonProgress(enrollmentId, lessonId, isCompleted) {
    // Check if progress exists
    const { data: existing } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('enrollment_id', enrollmentId)
        .eq('lesson_id', lessonId)
        .maybeSingle();
    
    if (existing) {
        const { error } = await supabase
            .from('lesson_progress')
            .update({
                is_completed: isCompleted,
                completed_at: isCompleted ? new Date().toISOString() : null
            })
            .eq('id', existing.id);
        
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('lesson_progress')
            .insert({
                enrollment_id: enrollmentId,
                lesson_id: lessonId,
                is_completed: isCompleted,
                completed_at: isCompleted ? new Date().toISOString() : null
            });
        
        if (error) throw error;
    }
    
    // Recalculate overall progress
    await recalculateCourseProgress(enrollmentId);
    
    return { success: true };
}

export async function recalculateCourseProgress(enrollmentId) {
    // Get all progress for this enrollment
    const { data: progress } = await supabase
        .from('lesson_progress')
        .select('is_completed')
        .eq('enrollment_id', enrollmentId);
    
    if (!progress || progress.length === 0) return;
    
    const completedCount = progress.filter(p => p.is_completed === true).length;
    const progressPercent = Math.round((completedCount / progress.length) * 100);
    const isCompleted = progressPercent === 100;
    
    // Update enrollment
    const { error } = await supabase
        .from('course_enrollments')
        .update({
            progress_percent: progressPercent,
            completed_at: isCompleted ? new Date().toISOString() : null,
            status: isCompleted ? 'completed' : 'active'
        })
        .eq('id', enrollmentId);
    
    if (error) throw error;
    
    // If completed, generate certificate
    if (isCompleted) {
        await generateCertificate(enrollmentId);
    }
    
    return { progressPercent, isCompleted };
}

// ============================================
// CERTIFICATE GENERATION
// ============================================

export async function generateCertificate(enrollmentId) {
    const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('user_id, course_id')
        .eq('id', enrollmentId)
        .single();
    
    if (!enrollment) return;
    
    // Check if certificate exists
    const { data: existing } = await supabase
        .from('course_certificates')
        .select('id')
        .eq('user_id', enrollment.user_id)
        .eq('course_id', enrollment.course_id)
        .maybeSingle();
    
    if (existing) return existing;
    
    const certificateId = `ODUSBABA-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const { data, error } = await supabase
        .from('course_certificates')
        .insert({
            user_id: enrollment.user_id,
            course_id: enrollment.course_id,
            certificate_id: certificateId,
            issued_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function getUserCertificates(userId) {
    const { data, error } = await supabase
        .from('course_certificates')
        .select('*, course:courses(id, title)')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

// ============================================
// USER PROGRESS
// ============================================

export async function getUserProgress(userId) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
            *,
            course:courses(
                id, title, slug, cover_image, duration_hours, instructor_name, difficulty
            )
        `)
        .eq('user_id', userId)
        .order('last_accessed_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}
