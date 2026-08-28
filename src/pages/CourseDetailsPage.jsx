// src/pages/CourseDetailsPage.jsx
// COMPLETE PROFESSIONAL COURSE DETAILS PAGE - With unified API, enrollment tracking, curriculum display, and reviews
//
// FIXED (2026-08-23):
// 1. Disconnected Supabase client (createClient() directly) — same
//    anti-pattern found and fixed repeatedly this session. Now uses the
//    shared singleton.
// 2. loadCourse() called ?action=course, loadEnrollmentStatus() called
//    ?action=user-enrollment, loadReviews() called ?action=course-reviews,
//    loadRelatedCourses() called ?action=courses-related, and
//    handleSubmitReview() called ?action=course-submit-review — NONE of
//    these five actions exist anywhere in the backend. This entire page
//    was non-functional: no course could ever load, no reviews could ever
//    be read or written, related courses never showed. Rewired to direct
//    Supabase queries, matching the established pattern for detail pages
//    elsewhere in this project (ArticleDetail.jsx, JobDetailPage.jsx).
// 3. handleEnroll() called ?action=course-enroll — the real, confirmed
//    action is named the other way round: enroll-course. Every enrollment
//    attempt failed with "unknown action" silently.
// 4. handleContinue() navigated to /courses/:id/learn — not a real route.
//    The actual confirmed route for continuing a course is /learning/:id
//    (CourseDetail.jsx).
// 5. Built a real course_reviews table (see add-course-reviews-table.sql)
//    — no review system for courses existed anywhere in this project
//    before now, matching the same gap already found and closed for books.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Clock, BookOpen, Star, ArrowLeft, Loader2, CheckCircle, 
    Users, Award, Play, FileText, MessageCircle, ThumbsUp,
    Calendar, TrendingUp, Shield, Target, Sparkles, X,
    ChevronRight, ChevronDown, ExternalLink, Download,
    AlertCircle, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CourseDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [enrolled, setEnrolled] = useState(false);
    const [enrollmentProgress, setEnrollmentProgress] = useState(0);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedLessons, setExpandedLessons] = useState({});
    const [reviews, setReviews] = useState([]);
    const [userRating, setUserRating] = useState(null);
    const [userReview, setUserReview] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [relatedCourses, setRelatedCourses] = useState([]);

    useEffect(() => {
        checkUser();
        loadCourse();
    }, [id]);

    async function checkUser() {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
    }

    async function loadCourse() {
        setLoading(true);
        setError(null);
        
        try {
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('*')
                .eq('id', id)
                .eq('is_published', true)
                .single();

            if (courseError || !courseData) throw new Error(courseError?.message || 'Course not found');
            
            setCourse(courseData);
            
            // Load enrollment status if user is logged in
            if (user) {
                await loadEnrollmentStatus(courseData.id);
            }
            
            // Load reviews
            await loadReviews(courseData.id);
            
            // Load related courses
            await loadRelatedCourses(courseData.category, courseData.id);
            
        } catch (err) {
            console.error('Error loading course:', err);
            setError(err.message);
            toast.error('Course not found');
            navigate('/courses');
        } finally {
            setLoading(false);
        }
    }

    async function loadEnrollmentStatus(courseId) {
        if (!user) return;
        
        try {
            const { data, error } = await supabase
                .from('course_enrollments')
                .select('progress')
                .eq('course_id', courseId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setEnrolled(true);
                setEnrollmentProgress(data.progress || 0);
            }
        } catch (err) {
            console.error('Error loading enrollment:', err);
        }
    }

    async function loadReviews(courseId) {
        try {
            const { data, error } = await supabase
                .from('course_reviews')
                .select('*, profiles:user_id(full_name)')
                .eq('course_id', courseId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReviews(data || []);
        } catch (err) {
            console.error('Error loading reviews:', err);
        }
    }

    async function loadRelatedCourses(category, courseId) {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('category', category)
                .eq('is_published', true)
                .neq('id', courseId)
                .limit(3);

            if (error) throw error;
            setRelatedCourses(data || []);
        } catch (err) {
            console.error('Error loading related courses:', err);
        }
    }

    async function handleEnroll() {
        if (!user) {
            toast.error('Please sign in to enroll');
            navigate('/sign-in');
            return;
        }

        try {
            // FIXED (2026-08-28): confirmed same regression - every real
            // course enrollment attempt has been failing with 401 since
            // the backend security fix went out.
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=enroll-course', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({ userId: user.id, courseId: id })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            setEnrolled(true);
            toast.success('Successfully enrolled in course!');
        } catch (err) {
            toast.error('Failed to enroll: ' + err.message);
        }
    }

    async function handleContinue() {
        navigate(`/learning/${id}`);
    }

    async function handleSubmitReview() {
        if (!user) {
            toast.error('Please sign in to leave a review');
            navigate('/sign-in');
            return;
        }
        
        if (!userRating) {
            toast.error('Please select a rating');
            return;
        }
        
        setSubmittingReview(true);
        
        try {
            const { error } = await supabase
                .from('course_reviews')
                .upsert({
                    course_id: id,
                    user_id: user.id,
                    rating: userRating,
                    review_text: userReview,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'course_id,user_id' });

            if (error) throw error;
            
            toast.success('Review submitted successfully!');
            setUserReview('');
            setUserRating(null);
            await loadReviews(id);
        } catch (err) {
            toast.error('Failed to submit review: ' + err.message);
        } finally {
            setSubmittingReview(false);
        }
    }

    function toggleLesson(lessonId) {
        setExpandedLessons(prev => ({
            ...prev,
            [lessonId]: !prev[lessonId]
        }));
    }

    function getLevelColor(level) {
        const colors = {
            beginner: 'bg-emerald-500/20 text-emerald-400',
            intermediate: 'bg-blue-500/20 text-blue-400',
            advanced: 'bg-purple-500/20 text-purple-400'
        };
        return colors[level?.toLowerCase()] || 'bg-slate-500/20 text-slate-400';
    }

    function getLevelBadge(level) {
        const badges = {
            beginner: '🌱 Beginner',
            intermediate: '📚 Intermediate',
            advanced: '🚀 Advanced'
        };
        return badges[level?.toLowerCase()] || level;
    }

    const averageRating = reviews.length > 0 
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : 0;
    
    const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => Math.floor(r.rating) === star).length,
        percentage: reviews.length > 0 
            ? (reviews.filter(r => Math.floor(r.rating) === star).length / reviews.length) * 100 
            : 0
    }));

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Course Not Found</h1>
                    <p className="text-slate-400 mb-6">The course you're looking for doesn't exist or has been removed.</p>
                    <Link to="/courses" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Browse Courses
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/courses')} 
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" /> 
                    Back to Courses
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Course Header */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                {/* FIXED (2026-08-27): third confirmed
                                    instance of the same course.level ->
                                    course.difficulty mistake in this one
                                    file - the main course header badge
                                    never displayed correctly either. */}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelColor(course.difficulty)}`}>
                                    {getLevelBadge(course.difficulty)}
                                </span>
                                {course.is_featured && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                        <Star className="w-3 h-3" /> Featured
                                    </span>
                                )}
                            </div>
                            
                            <h1 className="text-3xl font-bold text-white mb-3">{course.title}</h1>
                            <p className="text-slate-400 leading-relaxed">{course.description}</p>
                            
                            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-800">
                                <span className="flex items-center gap-2 text-slate-400">
                                    <Clock className="w-4 h-4" /> {course.duration_hours || course.duration_minutes / 60 || 2} hours
                                </span>
                                <span className="flex items-center gap-2 text-slate-400">
                                    <BookOpen className="w-4 h-4" /> {course.lessons_count || 0} lessons
                                </span>
                                <span className="flex items-center gap-2 text-slate-400">
                                    <Users className="w-4 h-4" /> {course.students_count || 0} students
                                </span>
                                {averageRating > 0 && (
                                    <span className="flex items-center gap-2 text-slate-400">
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                        {averageRating} ({reviews.length} reviews)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-slate-800">
                            {['overview', 'curriculum', 'reviews'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-sm font-medium transition capitalize ${
                                        activeTab === tab
                                            ? 'text-primary-400 border-b-2 border-primary-400'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {tab === 'overview' && <FileText className="w-4 h-4 inline mr-1" />}
                                    {tab === 'curriculum' && <BookOpen className="w-4 h-4 inline mr-1" />}
                                    {tab === 'reviews' && <Star className="w-4 h-4 inline mr-1" />}
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content: Overview */}
                        {activeTab === 'overview' && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                        <Target className="w-5 h-5 text-primary-400" />
                                        What You'll Learn
                                    </h3>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {course.learning_objectives?.map((objective, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-slate-300">
                                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                {objective}
                                            </li>
                                        ))}
                                        {(!course.learning_objectives || course.learning_objectives.length === 0) && (
                                            <>
                                                <li className="flex items-start gap-2 text-slate-300">
                                                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                                                    Master core concepts and principles
                                                </li>
                                                <li className="flex items-start gap-2 text-slate-300">
                                                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                                                    Apply knowledge in real-world scenarios
                                                </li>
                                                <li className="flex items-start gap-2 text-slate-300">
                                                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                                                    Build practical skills through hands-on exercises
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary-400" />
                                        Requirements
                                    </h3>
                                    <ul className="space-y-2">
                                        {course.requirements?.map((req, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-slate-300">
                                                <ChevronRight className="w-4 h-4 text-primary-400 mt-0.5" />
                                                {req}
                                            </li>
                                        ))}
                                        {(!course.requirements || course.requirements.length === 0) && (
                                            <>
                                                <li className="flex items-start gap-2 text-slate-300">
                                                    <ChevronRight className="w-4 h-4 text-primary-400 mt-0.5" />
                                                    No prior experience required
                                                </li>
                                                <li className="flex items-start gap-2 text-slate-300">
                                                    <ChevronRight className="w-4 h-4 text-primary-400 mt-0.5" />
                                                    Basic computer literacy
                                                </li>
                                                <li className="flex items-start gap-2 text-slate-300">
                                                    <ChevronRight className="w-4 h-4 text-primary-400 mt-0.5" />
                                                    Willingness to learn
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                                
                                {course.whats_included && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-primary-400" />
                                            What's Included
                                        </h3>
                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {course.whats_included.map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-slate-300">
                                                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {course.instructor_name && (
                                    <div className="pt-4 border-t border-slate-800">
                                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-primary-400" />
                                            Instructor
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            {course.instructor_avatar && (
                                                <img src={course.instructor_avatar} alt={course.instructor_name} className="w-12 h-12 rounded-full object-cover" />
                                            )}
                                            <div>
                                                <p className="text-white font-medium">{course.instructor_name}</p>
                                                <p className="text-slate-400 text-sm">{course.instructor_title || 'Expert Instructor'}</p>
                                            </div>
                                        </div>
                                        {course.instructor_bio && (
                                            <p className="text-slate-400 text-sm mt-3">{course.instructor_bio}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab Content: Curriculum */}
                        {activeTab === 'curriculum' && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                                {course.curriculum && course.curriculum.length > 0 ? (
                                    <div className="space-y-4">
                                        {course.curriculum.map((section, idx) => (
                                            <div key={idx} className="border border-slate-700 rounded-xl overflow-hidden">
                                                <button
                                                    onClick={() => toggleLesson(section.id || idx)}
                                                    className="w-full flex justify-between items-center p-4 bg-slate-800/50 hover:bg-slate-800 transition text-left"
                                                >
                                                    <div>
                                                        <h4 className="text-white font-medium">{section.title}</h4>
                                                        <p className="text-slate-500 text-xs mt-1">{section.lessons?.length || 0} lessons • {section.duration || '0 min'}</p>
                                                    </div>
                                                    {expandedLessons[section.id || idx] ? (
                                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </button>
                                                
                                                {expandedLessons[section.id || idx] && (
                                                    <div className="border-t border-slate-700 divide-y divide-slate-700">
                                                        {section.lessons?.map((lesson, lessonIdx) => (
                                                            <div key={lessonIdx} className="flex items-center gap-3 p-3 hover:bg-slate-800/50 transition">
                                                                {enrolled ? (
                                                                    <Play className="w-4 h-4 text-primary-400" />
                                                                ) : (
                                                                    <Lock className="w-4 h-4 text-slate-600" />
                                                                )}
                                                                <span className="text-slate-300 text-sm flex-1">{lesson.title}</span>
                                                                <span className="text-slate-500 text-xs">{lesson.duration || '5 min'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                        <p className="text-slate-400">Course curriculum coming soon.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab Content: Reviews */}
                        {activeTab === 'reviews' && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                                {/* Rating Summary */}
                                <div className="flex flex-col md:flex-row gap-8 pb-6 border-b border-slate-800">
                                    <div className="text-center md:text-left">
                                        <div className="text-5xl font-bold text-white">{averageRating || 'No'} {averageRating > 0 && <span className="text-2xl">★</span>}</div>
                                        <p className="text-slate-400 text-sm mt-1">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>
                                    </div>
                                    
                                    <div className="flex-1 space-y-2">
                                        {ratingDistribution.map(({ star, percentage }) => (
                                            <div key={star} className="flex items-center gap-3">
                                                <span className="text-sm text-slate-400 w-12">{star} ★</span>
                                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                                <span className="text-xs text-slate-500 w-12">{Math.round(percentage)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Write a Review */}
                                {user && !reviews.some(r => r.user_id === user.id) && (
                                    <div className="mt-6 p-4 bg-slate-800/30 rounded-xl">
                                        <h4 className="text-white font-medium mb-3">Write a Review</h4>
                                        <div className="flex gap-1 mb-3">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    onClick={() => setUserRating(star)}
                                                    className="focus:outline-none"
                                                >
                                                    <Star className={`w-6 h-6 ${star <= (userRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            value={userReview}
                                            onChange={(e) => setUserReview(e.target.value)}
                                            rows={3}
                                            placeholder="Share your experience with this course..."
                                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
                                        />
                                        <button
                                            onClick={handleSubmitReview}
                                            disabled={submittingReview || !userRating}
                                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                                        >
                                            {submittingReview ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <ThumbsUp className="w-4 h-4 inline mr-1" />}
                                            Submit Review
                                        </button>
                                    </div>
                                )}
                                
                                {/* Reviews List */}
                                <div className="mt-6 space-y-4">
                                    {reviews.length === 0 ? (
                                        <p className="text-slate-400 text-center py-8">No reviews yet. Be the first to review!</p>
                                    ) : (
                                        reviews.map(review => (
                                            <div key={review.id} className="border-b border-slate-700 pb-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-sky-500 flex items-center justify-center text-white text-sm font-bold">
                                                            {review.profiles?.full_name?.[0] || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-sm font-medium">{review.profiles?.full_name || 'Anonymous'}</p>
                                                            <div className="flex items-center gap-1">
                                                                {[1,2,3,4,5].map(star => (
                                                                    <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(review.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-slate-400 text-sm">{review.review_text}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Right Column */}
                    <div className="space-y-6">
                        {/* Enrollment Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sticky top-24">
                            {/* FIXED (2026-08-27): read course.thumbnail_url -
                                the real, confirmed column (established by
                                CourseEditor.jsx, the actual writer of this
                                field) is image_url. The cover image set
                                through the course editor has never once
                                displayed here. */}
                            {course.image_url && (
                                <img 
                                    src={course.image_url} 
                                    alt={course.title} 
                                    className="w-full h-48 object-cover rounded-xl mb-4"
                                />
                            )}
                            
                            <div className="text-3xl font-bold text-primary-400 mb-4 text-center">
                                {course.price === 0 ? 'Free' : `$${course.price}`}
                            </div>
                            
                            {enrolled ? (
                                <div className="space-y-3">
                                    <div className="text-center text-emerald-400 flex items-center justify-center gap-2 p-3 bg-emerald-500/10 rounded-lg">
                                        <CheckCircle className="w-5 h-5" /> You are enrolled
                                    </div>
                                    {enrollmentProgress > 0 && (
                                        <div>
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>Your Progress</span>
                                                <span>{enrollmentProgress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-2">
                                                <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${enrollmentProgress}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleContinue}
                                        className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition flex items-center justify-center gap-2"
                                    >
                                        <Play className="w-4 h-4" /> Continue Learning
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleEnroll}
                                    className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" /> Enroll Now
                                </button>
                            )}
                            
                            <div className="mt-4 pt-4 border-t border-slate-700 text-center text-xs text-slate-500">
                                <p>✓ Full lifetime access</p>
                                <p>✓ Access on mobile and desktop</p>
                                <p>✓ Certificate of completion</p>
                                <p>✓ 30-day money-back guarantee</p>
                            </div>
                        </div>
                        
                        {/* Related Courses */}
                        {relatedCourses.length > 0 && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary-400" />
                                    You Might Also Like
                                </h3>
                                <div className="space-y-3">
                                    {relatedCourses.map(related => (
                                        <Link 
                                            key={related.id} 
                                            to={`/courses/${related.id}`}
                                            className="block p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800 transition group"
                                        >
                                            <h4 className="text-white text-sm font-medium group-hover:text-primary-400 transition line-clamp-1">
                                                {related.title}
                                            </h4>
                                            {/* FIXED (2026-08-27): read
                                                related.level - the real
                                                column is difficulty, the
                                                exact same mistake already
                                                found and fixed in
                                                AICourseBuilder.jsx's
                                                loadRecentCourses(), now
                                                confirmed to have recurred
                                                independently here. */}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${getLevelColor(related.difficulty)}`}>
                                                    {getLevelBadge(related.difficulty)}
                                                </span>
                                                <span className="text-xs text-slate-500">{related.duration_hours || 2} hours</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Share Course */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                <ExternalLink className="w-5 h-5 text-primary-400" />
                                Share This Course
                            </h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => navigator.share && navigator.share({ title: course.title, url: window.location.href })}
                                    className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition text-sm"
                                >
                                    Share
                                </button>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        toast.success('Link copied to clipboard!');
                                    }}
                                    className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition text-sm"
                                >
                                    Copy Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
