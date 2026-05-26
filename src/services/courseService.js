// src/services/courseService.js
// COMPLETE COURSE SERVICE - Cache, progress tracking, certificates, and reviews

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// CACHE MANAGEMENT
// ============================================

class CourseCache {
    constructor(duration = 5 * 60 * 1000) {
        this.cache = new Map();
        this.duration = duration;
    }

    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() - item.timestamp > this.duration) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }

    clear() {
        this.cache.clear();
    }

    invalidate(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
}

const courseCache = new CourseCache();

// ============================================
// HELPER FUNCTIONS
// ============================================

const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('User not authenticated');
    return user;
};

const filterCourses = (courses, category, level) => {
    let filtered = [...courses];
    if (category) filtered = filtered.filter(c => c.category === category);
    if (level) filtered = filtered.filter(c => c.level === level);
    return filtered;
};

// ============================================
// COURSE FETCHING
// ============================================

export async function getCourses(category = null, level = null) {
    const cacheKey = `courses_${category || 'all'}_${level || 'all'}`;
    const cached = courseCache.get(cacheKey);
    
    if (cached) {
        return filterCourses(cached, category, level);
    }
    
    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    courseCache.set(cacheKey, data);
    return filterCourses(data, category, level);
}

export async function getCourse(courseId) {
    const cacheKey = `course_${courseId}`;
    const cached = courseCache.get(cacheKey);
    
    if (cached) return cached;
    
    // Fetch course details
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
    
    if (courseError) throw courseError;
    
    // Fetch course modules
    const { data: modules, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
    
    if (modulesError) throw modulesError;
    
    const result = { ...course, modules: modules || [] };
    courseCache.set(cacheKey, result);
    
    return result;
}

// ============================================
// ENROLLMENT MANAGEMENT
// ============================================

export async function getUserEnrollments(userId = null) {
    try {
        const targetUserId = userId || (await getCurrentUser()).id;
        
        const { data, error } = await supabase
            .from('course_enrollments')
            .select(`
                *,
                courses:course_id (*)
            `)
            .eq('user_id', targetUserId)
            .order('started_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        return [];
    }
}

export async function getUserEnrollment(userId, courseId) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function enrollInCourse(userId = null, courseId) {
    try {
        const targetUserId = userId || (await getCurrentUser()).id;
        
        // Check if already enrolled
        const existing = await getUserEnrollment(targetUserId, courseId);
        if (existing) {
            return { success: false, error: 'Already enrolled in this course', data: existing };
        }
        
        const { data, error } = await supabase
            .from('course_enrollments')
            .insert({
                user_id: targetUserId,
                course_id: courseId,
                status: 'active',
                progress_percent: 0,
                completed_modules: [],
                started_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Invalidate relevant caches
        courseCache.invalidate(`enrollments_${targetUserId}`);
        
        return { success: true, data };
    } catch (error) {
        console.error('Error enrolling in course:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// PROGRESS TRACKING
// ============================================

async function generateCertificate(enrollmentId, userId, courseId) {
    const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();
    
    const certificateNumber = `ODC-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const verificationUrl = `${window.location.origin}/verify-certificate/${certificateNumber}`;
    
    const { data: certificate, error } = await supabase
        .from('course_certificates')
        .insert({
            enrollment_id: enrollmentId,
            user_id: userId,
            course_id: courseId,
            certificate_number: certificateNumber,
            verification_url: verificationUrl,
            issued_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) throw error;
    
    await supabase
        .from('course_enrollments')
        .update({ 
            certificate_issued: true, 
            certificate_url: verificationUrl,
            completed_at: new Date().toISOString(),
            status: 'completed'
        })
        .eq('id', enrollmentId);
    
    return { certificate, verificationUrl };
}

export async function updateModuleProgress(userId, courseId, moduleId, completed) {
    const enrollment = await getUserEnrollment(userId, courseId);
    if (!enrollment) throw new Error('Not enrolled in this course');
    
    let completedModules = enrollment.completed_modules || [];
    
    if (completed && !completedModules.includes(moduleId)) {
        completedModules.push(moduleId);
    } else if (!completed && completedModules.includes(moduleId)) {
        completedModules = completedModules.filter(id => id !== moduleId);
    }
    
    // Get total modules count
    const { data: modules } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', courseId);
    
    const totalModules = modules?.length || 1;
    const progressPercent = Math.round((completedModules.length / totalModules) * 100);
    
    const updateData = {
        completed_modules: completedModules,
        progress_percent: progressPercent,
        last_accessed_module_id: moduleId,
        updated_at: new Date().toISOString()
    };
    
    // Check if course is completed
    let certificate = null;
    if (progressPercent === 100 && enrollment.status !== 'completed') {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        certificate = await generateCertificate(enrollment.id, userId, courseId);
    }
    
    const { error } = await supabase
        .from('course_enrollments')
        .update(updateData)
        .eq('id', enrollment.id);
    
    if (error) throw error;
    
    // Invalidate caches
    courseCache.invalidate(`enrollments_${userId}`);
    
    return { 
        progressPercent, 
        completed: progressPercent === 100,
        certificate 
    };
}

// ============================================
// COURSE REVIEWS
// ============================================

export async function addCourseReview(courseId, userId, rating, review) {
    const { data, error } = await supabase
        .from('course_reviews')
        .upsert({ 
            course_id: courseId, 
            user_id: userId, 
            rating, 
            review,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) throw error;
    
    // Invalidate course cache to refresh reviews
    courseCache.invalidate(`course_${courseId}`);
    
    return data;
}

export async function getCourseReviews(courseId) {
    const { data, error } = await supabase
        .from('course_reviews')
        .select('*, users:user_id(name, avatar)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

// ============================================
// CERTIFICATE VERIFICATION
// ============================================

export async function verifyCertificate(certificateNumber) {
    const { data, error } = await supabase
        .from('course_certificates')
        .select('*, courses:course_id(title), users:user_id(full_name)')
        .eq('certificate_number', certificateNumber)
        .single();
    
    if (error) return null;
    return data;
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

export async function adminGetAllCourses() {
    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

export async function adminUpdateCourse(courseId, updates) {
    const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId)
        .select()
        .single();
    
    if (error) throw error;
    
    // Clear all course caches
    courseCache.clear();
    
    return data;
}

// ============================================
// CACHE MANAGEMENT
// ============================================

export function clearCoursesCache() {
    courseCache.clear();
}

export function invalidateCourseCache(courseId) {
    courseCache.invalidate(`course_${courseId}`);
    courseCache.invalidate('courses_');
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
    getCourses,
    getCourse,
    enrollInCourse,
    getUserEnrollment,
    getUserEnrollments,
    updateModuleProgress,
    addCourseReview,
    getCourseReviews,
    verifyCertificate,
    clearCoursesCache,
    invalidateCourseCache,
    adminGetAllCourses,
    adminUpdateCourse
};
