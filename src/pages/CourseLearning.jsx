// src/pages/CourseLearning.jsx - MUST CREATE
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, Clock, Play, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function CourseLearning() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [currentLesson, setCurrentLesson] = useState(0);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadCourse();
    }, [id]);

    async function loadCourse() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/sign-in');
            return;
        }
        setUser(user);

        // Load course details
        const { data: courseData } = await supabase
            .from('courses')
            .select('*')
            .eq('id', id)
            .single();
        setCourse(courseData);

        // Load lessons
        const { data: lessonsData } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('course_id', id)
            .order('sort_order', { ascending: true });
        setLessons(lessonsData || []);

        // Load progress
        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('progress')
            .eq('user_id', user.id)
            .eq('course_id', id)
            .single();

        if (enrollment) {
            setProgress(enrollment.progress || 0);
        }

        setLoading(false);
    }

    async function updateProgress(lessonIndex) {
        const newProgress = Math.round(((lessonIndex + 1) / lessons.length) * 100);
        setProgress(newProgress);
        
        await supabase
            .from('course_enrollments')
            .update({ 
                progress: newProgress,
                last_accessed: new Date().toISOString(),
                last_lesson_id: lessons[lessonIndex]?.id
            })
            .eq('user_id', user.id)
            .eq('course_id', id);
    }

    function goToNextLesson() {
        if (currentLesson < lessons.length - 1) {
            const newIndex = currentLesson + 1;
            setCurrentLesson(newIndex);
            updateProgress(newIndex);
        }
    }

    function goToPrevLesson() {
        if (currentLesson > 0) {
            setCurrentLesson(currentLesson - 1);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    const lesson = lessons[currentLesson];

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <button onClick={() => navigate('/learning')} className="text-slate-400 hover:text-white mb-4 flex items-center gap-1">
                        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-white">{course?.title}</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                            <Clock className="w-4 h-4" /> {course?.duration_hours} hours
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                            <BookOpen className="w-4 h-4" /> {lessons.length} lessons
                        </div>
                        <div className="flex items-center gap-1 text-sm text-emerald-400">
                            <CheckCircle className="w-4 h-4" /> {progress}% complete
                        </div>
                    </div>
                    <div className="mt-2 w-full bg-slate-800 rounded-full h-2">
                        <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {/* Lesson Content */}
                {lesson && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">{lesson.title}</h2>
                        <div className="prose prose-invert max-w-none">
                            <p className="text-slate-300 whitespace-pre-wrap">{lesson.content || 'Content coming soon...'}</p>
                        </div>
                        {lesson.video_url && (
                            <div className="mt-4 aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
                                <Play className="w-12 h-12 text-primary-400" />
                                <p className="text-slate-500 ml-2">Video lesson available</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                    <button
                        onClick={goToPrevLesson}
                        disabled={currentLesson === 0}
                        className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-4 h-4 inline mr-1" /> Previous Lesson
                    </button>
                    <button
                        onClick={goToNextLesson}
                        disabled={currentLesson === lessons.length - 1}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                        Next Lesson <ChevronRight className="w-4 h-4 inline ml-1" />
                    </button>
                </div>

                {/* Lesson List */}
                <div className="mt-8">
                    <h3 className="text-white font-semibold mb-3">Course Content</h3>
                    <div className="space-y-2">
                        {lessons.map((l, idx) => (
                            <button
                                key={l.id}
                                onClick={() => {
                                    setCurrentLesson(idx);
                                    updateProgress(idx);
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition ${
                                    idx === currentLesson
                                        ? 'bg-primary-600/20 border border-primary-500'
                                        : 'bg-slate-800/30 hover:bg-slate-800'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    {idx < progress / (100 / lessons.length) ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <Play className="w-4 h-4 text-slate-500" />
                                    )}
                                    <span className="text-white text-sm">{l.title}</span>
                                </div>
                                <span className="text-xs text-slate-500">{l.duration_minutes || 5} min</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
