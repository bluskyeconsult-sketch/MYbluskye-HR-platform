// src/pages/CourseDetail.jsx
// NEW FILE (2026-08-07) — fills the missing /learning/:id route.
//
// CoursesPage.jsx and LearnerDashboard.jsx have linked to /learning/:id
// since they were first reviewed, but no route or component existed for it
// anywhere — every "Start Course"/"Continue Learning" click led to the 404
// page. This is a from-scratch build, not a bug fix, since nothing existed
// to fix.
//
// DESIGN NOTES / ASSUMPTIONS:
// - Auto-enrolls the user on load if they land here without having enrolled
//   yet (e.g. a direct link), same insert shape as CoursesPage.jsx's
//   handleEnroll().
// - Tries to load structured lesson content from a `course_lessons` table.
//   That table is NOT confirmed to exist — this is written defensively: if
//   the query errors (table missing) or returns no rows, the page falls
//   back to a simple "Mark Course as Complete" button instead of a lesson
//   checklist. So the page works today even with zero schema changes, and
//   automatically gets richer if/when a course_lessons table is added.
// - Progress updates go through the real, confirmed update-course-progress
//   handler in api/index.js.
// - Per-lesson completion state is best-effort persisted to a
//   completed_lesson_ids column on course_enrollments — if that column
//   doesn't exist, the write silently fails and progress still updates
//   correctly, it just won't remember which specific lessons were checked
//   across sessions. Add the column if you want that to persist:
//   ALTER TABLE course_enrollments ADD COLUMN completed_lesson_ids jsonb DEFAULT '[]';

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, Clock, CheckCircle, Circle, Loader2, AlertCircle, ChevronLeft, Award, Users, Star } from 'lucide-react';

export default function CourseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [enrollment, setEnrollment] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [completedLessonIds, setCompletedLessonIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [updating, setUpdating] = useState(false);
    // NEW (2026-09-04): confirmed real bug - clicking a lesson directly
    // toggled completion, never showing the lesson's actual content.
    // Real, substantive lesson content exists in the database for
    // every lesson across every course, but was never displayed
    // anywhere in this component. Tracks which lesson is currently
    // expanded for reading.
    const [expandedLessonId, setExpandedLessonId] = useState(null);

    useEffect(() => {
        loadCourse();
    }, [id]);

    async function loadCourse() {
        setLoading(true);
        setError(null);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                navigate(`/sign-in?redirect=/learning/${id}`);
                return;
            }
            setUser(authUser);

            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('*')
                .eq('id', id)
                .single();
            if (courseError) throw courseError;
            setCourse(courseData);

            let { data: enrollmentData } = await supabase
                .from('course_enrollments')
                .select('*')
                .eq('user_id', authUser.id)
                .eq('course_id', id)
                .maybeSingle();

            if (!enrollmentData) {
                const { data: newEnrollment, error: enrollError } = await supabase
                    .from('course_enrollments')
                    .insert({
                        user_id: authUser.id,
                        course_id: id,
                        enrolled_at: new Date().toISOString(),
                        progress: 0,
                        status: 'active'
                    })
                    .select()
                    .single();
                if (enrollError) throw enrollError;
                enrollmentData = newEnrollment;
            }
            setEnrollment(enrollmentData);
            setCompletedLessonIds(enrollmentData.completed_lesson_ids || []);

            // Defensive: structured lessons are optional. Falls back
            // gracefully if the table doesn't exist or is empty.
            try {
                const { data: lessonsData, error: lessonsError } = await supabase
                    .from('course_lessons')
                    .select('*')
                    .eq('course_id', id)
                    .order('sort_order', { ascending: true });
                if (!lessonsError && lessonsData) {
                    setLessons(lessonsData);
                }
            } catch (e) {
                console.warn('No structured lesson content available for this course:', e.message);
            }
        } catch (err) {
            console.error('Error loading course:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function updateProgress(newProgress, lessonId = null) {
        setUpdating(true);
        try {
            // FIXED (2026-09-04): confirmed real, direct cause of a live
            // 401 - this fetch never included an Authorization header at
            // all, meaning the backend's verifyClaimedUserId check would
            // always correctly reject it as unverified. Now fetches the
            // real session token first, matching the same pattern used
            // for every other authenticated action in this project.
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=update-course-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({ userId: user.id, courseId: id, progress: newProgress, lessonId })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            setEnrollment(prev => ({
                ...prev,
                progress: newProgress,
                ...(newProgress >= 100 ? { status: 'completed', completed_at: new Date().toISOString() } : {})
            }));
        } catch (err) {
            console.error('Error updating progress:', err);
            alert('Failed to update progress. Please try again.');
        } finally {
            setUpdating(false);
        }
    }

    async function toggleLessonComplete(lesson) {
        const isDone = completedLessonIds.includes(lesson.id);
        const newCompleted = isDone
            ? completedLessonIds.filter(lid => lid !== lesson.id)
            : [...completedLessonIds, lesson.id];
        setCompletedLessonIds(newCompleted);

        const newProgress = lessons.length > 0
            ? Math.round((newCompleted.length / lessons.length) * 100)
            : (enrollment?.progress || 0);

        // Best-effort — silently ignored if the column doesn't exist yet.
        try {
            await supabase
                .from('course_enrollments')
                .update({ completed_lesson_ids: newCompleted })
                .eq('user_id', user.id)
                .eq('course_id', id);
        } catch (e) {
            console.warn('completed_lesson_ids column not available:', e.message);
        }

        await updateProgress(newProgress, lesson.id);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
                <div className="max-w-2xl mx-auto px-4 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Course Not Found</h1>
                    <p className="text-slate-400 mb-6">{error || 'This course could not be loaded.'}</p>
                    <Link to="/courses" className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        <ChevronLeft className="w-4 h-4" /> Back to Courses
                    </Link>
                </div>
            </div>
        );
    }

    const progress = enrollment?.progress || 0;
    const isCompleted = progress === 100 || enrollment?.status === 'completed' || !!enrollment?.completed_at;
    const hasLessons = lessons.length > 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-8 md:py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link to="/learning" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition">
                    <ChevronLeft className="w-4 h-4" /> Back to My Learning
                </Link>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 md:p-8 mb-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                {course.category || 'Course'}
                            </span>
                            <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">{course.title}</h1>
                        </div>
                        {isCompleted && (
                            <span className="flex items-center gap-1 text-sm px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full flex-shrink-0">
                                <Award className="w-4 h-4" /> Completed
                            </span>
                        )}
                    </div>

                    <p className="text-slate-400 mb-4">{course.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-6">
                        {course.duration_hours && (
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {course.duration_hours} hours</span>
                        )}
                        {course.students_count > 0 && (
                            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {course.students_count} students</span>
                        )}
                        {course.rating > 0 && (
                            <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {course.rating}</span>
                        )}
                    </div>

                    <div className="mb-2 flex justify-between text-sm text-slate-400">
                        <span>Your progress</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 mb-6">
                        <div className="bg-primary-500 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>

                    {!hasLessons && !isCompleted && (
                        <button
                            onClick={() => updateProgress(100)}
                            disabled={updating}
                            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Mark Course as Complete
                        </button>
                    )}
                </div>

                {hasLessons && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary-400" /> Course Content
                        </h2>
                        <div className="space-y-2">
                            {lessons.map((lesson, idx) => {
                                const done = completedLessonIds.includes(lesson.id);
                                const isExpanded = expandedLessonId === lesson.id;
                                return (
                                    <div key={lesson.id} className="bg-slate-800/50 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setExpandedLessonId(isExpanded ? null : lesson.id)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-800 transition text-left"
                                        >
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleLessonComplete(lesson); }}
                                                disabled={updating}
                                                className="flex-shrink-0 disabled:opacity-50"
                                                title={done ? 'Mark as not complete' : 'Mark as complete'}
                                            >
                                                {done ? (
                                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                ) : (
                                                    <Circle className="w-5 h-5 text-slate-600" />
                                                )}
                                            </button>
                                            <span className="text-slate-500 text-sm w-6">{idx + 1}.</span>
                                            <span className={`flex-1 text-sm ${done ? 'text-slate-400' : 'text-white'}`}>
                                                {lesson.title}
                                            </span>
                                            {lesson.duration_minutes && (
                                                <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                                                    <Clock className="w-3 h-3" /> {lesson.duration_minutes}m
                                                </span>
                                            )}
                                        </button>
                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-1 border-t border-slate-700/50">
                                                {lesson.content ? (
                                                    <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed pt-3">
                                                        {lesson.content}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-500 pt-3">
                                                        No written content for this lesson yet.
                                                    </p>
                                                )}
                                                {!done && (
                                                    <button
                                                        onClick={() => toggleLessonComplete(lesson)}
                                                        disabled={updating}
                                                        className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                        Mark Complete
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!hasLessons && (
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center">
                        <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">
                            Detailed lesson content for this course hasn't been added yet. You can mark the course complete above once you've finished reviewing the material.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
