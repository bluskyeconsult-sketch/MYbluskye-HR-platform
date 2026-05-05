import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;
let coursesCache = { data: null, timestamp: null };

// Get all published courses with caching
export async function getCourses(category = null, level = null) {
    // Check cache
    if (coursesCache.data && (Date.now() - coursesCache.timestamp) < CACHE_DURATION) {
        return filterCourses(coursesCache.data, category, level);
    }
    
    let query = supabase
        .from('courses')
        .select('*, profiles:instructor_id(full_name, email)')
        .eq('published', true)
        .order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Update cache
    coursesCache = { data, timestamp: Date.now() };
    return filterCourses(data, category, level);
}

function filterCourses(courses, category, level) {
    let filtered = [...courses];
    if (category) filtered = filtered.filter(c => c.category === category);
    if (level) filtered = filtered.filter(c => c.level === level);
    return filtered;
}

// Get single course with modules
export async function getCourse(courseId) {
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*, profiles:instructor_id(full_name, email)')
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

// Enroll in course
export async function enrollInCourse(userId, courseId) {
    // Check if already enrolled
    const existing = await getUserEnrollment(userId, courseId);
    if (existing) return existing;
    
    // Increment enrollment count
    await supabase.rpc('increment_course_enrollment', { course_id: courseId });
    
    const { data, error } = await supabase
        .from('course_enrollments')
        .insert({ user_id: userId, course_id: courseId })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Get user's enrollment
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

// Get all user enrollments
export async function getUserEnrollments(userId) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select('*, courses:course_id(*)')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

// Update module progress
export async function updateModuleProgress(userId, courseId, moduleId, completed) {
    const enrollment = await getUserEnrollment(userId, courseId);
    if (!enrollment) throw new Error('Not enrolled');
    
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

// Generate certificate
export async function generateCertificate(enrollmentId, userId, courseId) {
    const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
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
    
    // Generate verification URL
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

// Verify certificate
export async function verifyCertificate(certificateNumber) {
    const { data, error } = await supabase
        .from('course_certificates')
        .select('*, course_enrollments:enrollment_id(user_id, course_id), profiles:course_enrollments.user_id(full_name), courses:course_enrollments.course_id(title)')
        .eq('certificate_number', certificateNumber)
        .single();
    
    if (error) throw error;
    return data;
}

// Add course review
export async function addCourseReview(courseId, userId, rating, review) {
    const { data, error } = await supabase
        .from('course_reviews')
        .upsert({ course_id: courseId, user_id: userId, rating, review })
        .select()
        .single();
    
    if (error) throw error;
    
    // Update course rating
    const { data: reviews } = await supabase
        .from('course_reviews')
        .select('rating')
        .eq('course_id', courseId);
    
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await supabase
        .from('courses')
        .update({ rating: avgRating })
        .eq('id', courseId);
    
    return data;
}

// Clear cache (for admin updates)
export function clearCoursesCache() {
    coursesCache = { data: null, timestamp: null };
}
