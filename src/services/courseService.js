import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cache for courses
let coursesCache = { data: null, timestamp: null };
const CACHE_DURATION = 5 * 60 * 1000;

export async function getCourses(category = null, level = null) {
    if (coursesCache.data && (Date.now() - coursesCache.timestamp) < CACHE_DURATION) {
        return filterCourses(coursesCache.data, category, level);
    }
    
    let query = supabase.from('courses').select('*').eq('published', true).order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    
    coursesCache = { data, timestamp: Date.now() };
    return filterCourses(data, category, level);
}

function filterCourses(courses, category, level) {
    let filtered = [...courses];
    if (category) filtered = filtered.filter(c => c.category === category);
    if (level) filtered = filtered.filter(c => c.level === level);
    return filtered;
}

export async function getCourse(courseId) {
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
    if (courseError) throw courseError;
    
    const { data: modules, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
    if (modulesError) throw modulesError;
    
    return { ...course, modules: modules || [] };
}

export async function enrollInCourse(userId, courseId) {
    const existing = await getUserEnrollment(userId, courseId);
    if (existing) return existing;
    
    const { data, error } = await supabase
        .from('course_enrollments')
        .insert({ user_id: userId, course_id: courseId })
        .select()
        .single();
    if (error) throw error;
    return data;
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

export async function getUserEnrollments(userId) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select('*, courses:course_id(*)')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function updateModuleProgress(userId, courseId, moduleId, completed) {
    const enrollment = await getUserEnrollment(userId, courseId);
    if (!enrollment) throw new Error('Not enrolled');
    
    let completedModules = enrollment.completed_modules || [];
    if (completed && !completedModules.includes(moduleId)) {
        completedModules.push(moduleId);
    } else if (!completed && completedModules.includes(moduleId)) {
        completedModules = completedModules.filter(id => id !== moduleId);
    }
    
    const { data: modules } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', courseId);
    
    const totalModules = modules?.length || 1;
    const progressPercent = Math.round((completedModules.length / totalModules) * 100);
    
    const updateData = {
        completed_modules: completedModules,
        progress_percent: progressPercent,
        last_accessed_module_id: moduleId
    };
    
    if (progressPercent === 100 && enrollment.status !== 'completed') {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        await generateCertificate(enrollment.id, userId, courseId);
    }
    
    const { error } = await supabase
        .from('course_enrollments')
        .update(updateData)
        .eq('id', enrollment.id);
    if (error) throw error;
    return { progressPercent, completed: progressPercent === 100 };
}

async function generateCertificate(enrollmentId, userId, courseId) {
    const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();
    
    const certificateNumber = `ODC-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    const { data: certificate, error } = await supabase
        .from('course_certificates')
        .insert({
            enrollment_id: enrollmentId,
            certificate_number: certificateNumber
        })
        .select()
        .single();
    if (error) throw error;
    
    const verificationUrl = `${window.location.origin}/verify-certificate/${certificateNumber}`;
    await supabase
        .from('course_certificates')
        .update({ verification_url: verificationUrl })
        .eq('id', certificate.id);
    
    await supabase
        .from('course_enrollments')
        .update({ certificate_issued: true, certificate_url: verificationUrl })
        .eq('id', enrollmentId);
    
    return { certificate, verificationUrl };
}

export async function addCourseReview(courseId, userId, rating, review) {
    const { data, error } = await supabase
        .from('course_reviews')
        .upsert({ course_id: courseId, user_id: userId, rating, review })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export function clearCoursesCache() {
    coursesCache = { data: null, timestamp: null };
}

// Default export for backward compatibility with named imports
export default {
    getCourses,
    getCourse,
    enrollInCourse,
    getUserEnrollment,
    getUserEnrollments,
    updateModuleProgress,
    addCourseReview,
    clearCoursesCache
};
