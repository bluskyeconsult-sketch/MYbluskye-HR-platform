// src/pages/CourseLearning.jsx
// ODUSBABA COURSE LEARNING PAGE v3.0 - PRODUCTION READY
// ✅ Audio narration, illustrations, resource downloads
// ✅ Progress tracking, lesson completion
// ✅ Fullscreen mode, font size controls
// ✅ Responsive two-column layout

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    BookOpen, Clock, Play, CheckCircle, ChevronLeft, ChevronRight, 
    Loader2, Volume2, VolumeX, Image, Sparkles, Headphones, 
    FileText, Download, Maximize, Minimize, TrendingUp
} from 'lucide-react';

export default function CourseLearning() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [currentLesson, setCurrentLesson] = useState(0);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState('medium');
    const audioRef = useRef(null);
    const contentRef = useRef(null);

    const fontSizes = { 
        small: 'text-sm', 
        medium: 'text-base', 
        large: 'text-lg', 
        xlarge: 'text-xl' 
    };

    useEffect(() => {
        loadCourse();
    }, [id]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.addEventListener('timeupdate', updateAudioProgress);
            audioRef.current.addEventListener('ended', () => setIsPlayingAudio(false));
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('timeupdate', updateAudioProgress);
                audioRef.current.removeEventListener('ended', () => setIsPlayingAudio(false));
            }
        };
    }, [currentLesson]);

    async function loadCourse() {
        setLoading(true);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/sign-in?redirect=/learning');
                return;
            }
            setUser(user);

            // Load course details
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('*')
                .eq('id', id)
                .single();
            
            if (courseError) throw courseError;
            setCourse(courseData);

            // Load lessons
            const { data: lessonsData, error: lessonsError } = await supabase
                .from('course_lessons')
                .select('*')
                .eq('course_id', id)
                .order('sort_order', { ascending: true });
            
            if (lessonsError) throw lessonsError;
            
            // Enrich lessons with additional data
            const enrichedLessons = await Promise.all((lessonsData || []).map(async (lesson) => {
                // Fetch lesson-specific illustrations
                const { data: illustrations } = await supabase
                    .from('course_images')
                    .select('*')
                    .eq('lesson_id', lesson.id)
                    .order('created_at', { ascending: true });
                
                // Fetch lesson audio
                const { data: audio } = await supabase
                    .from('course_audio')
                    .select('*')
                    .eq('lesson_id', lesson.id)
                    .maybeSingle();
                
                // Parse key takeaways if stored as JSON
                let keyTakeaways = [];
                if (lesson.key_takeaways) {
                    try {
                        keyTakeaways = typeof lesson.key_takeaways === 'string' 
                            ? JSON.parse(lesson.key_takeaways) 
                            : lesson.key_takeaways;
                    } catch (e) {
                        keyTakeaways = [];
                    }
                }
                
                // Parse resources if stored as JSON
                let resources = [];
                if (lesson.resources) {
                    try {
                        resources = typeof lesson.resources === 'string' 
                            ? JSON.parse(lesson.resources) 
                            : lesson.resources;
                    } catch (e) {
                        resources = [];
                    }
                }
                
                return { 
                    ...lesson, 
                    illustrations: illustrations || [], 
                    audio: audio || null,
                    key_takeaways: keyTakeaways,
                    resources: resources,
                    has_audio: !!audio?.audio_url,
                    duration_minutes: lesson.duration_minutes || 5
                };
            }));
            
            setLessons(enrichedLessons || []);

            // Load progress
            const { data: enrollment, error: enrollError } = await supabase
                .from('course_enrollments')
                .select('progress, last_lesson_id')
                .eq('user_id', user.id)
                .eq('course_id', id)
                .maybeSingle();

            if (enrollment) {
                setProgress(enrollment.progress || 0);
                // Resume from last lesson if available
                if (enrollment.last_lesson_id && enrichedLessons.length > 0) {
                    const lastIndex = enrichedLessons.findIndex(l => l.id === enrollment.last_lesson_id);
                    if (lastIndex !== -1 && lastIndex < enrichedLessons.length) {
                        setCurrentLesson(lastIndex);
                    }
                }
            }

            // Load lesson completions for progress tracking
            const { data: completions } = await supabase
                .from('lesson_completions')
                .select('lesson_id')
                .eq('user_id', user.id);
            
            if (completions && completions.length > 0) {
                const completedIds = new Set(completions.map(c => c.lesson_id));
                const completedCount = enrichedLessons.filter(l => completedIds.has(l.id)).length;
                const calculatedProgress = Math.round((completedCount / (enrichedLessons.length || 1)) * 100);
                if (calculatedProgress > progress) {
                    setProgress(calculatedProgress);
                }
            }

        } catch (error) {
            console.error('Error loading course:', error);
        } finally {
            setLoading(false);
        }
    }

    async function updateProgress(lessonIndex) {
        const lesson = lessons[lessonIndex];
        if (!lesson) return;
        
        // Mark lesson as completed
        const { error: completionError } = await supabase
            .from('lesson_completions')
            .upsert({
                user_id: user.id,
                lesson_id: lesson.id,
                completed_at: new Date().toISOString()
            }, { onConflict: 'user_id, lesson_id' });
        
        if (completionError) {
            console.error('Error marking lesson completion:', completionError);
        }
        
        // Calculate new progress percentage
        const { data: completions } = await supabase
            .from('lesson_completions')
            .select('lesson_id')
            .eq('user_id', user.id);
        
        const completedCount = completions?.length || 0;
        const newProgress = Math.round((completedCount / (lessons.length || 1)) * 100);
        setProgress(newProgress);
        
        // Update enrollment
        await supabase
            .from('course_enrollments')
            .update({ 
                progress: newProgress,
                last_accessed: new Date().toISOString(),
                last_lesson_id: lesson.id,
                ...(newProgress === 100 ? { completed_at: new Date().toISOString() } : {})
            })
            .eq('user_id', user.id)
            .eq('course_id', id);
    }

    function toggleAudio() {
        if (audioRef.current) {
            if (isPlayingAudio) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlayingAudio(!isPlayingAudio);
        }
    }

    function updateAudioProgress() {
        if (audioRef.current) {
            const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setAudioProgress(progress);
        }
    }

    function goToNextLesson() {
        if (currentLesson < lessons.length - 1) {
            const newIndex = currentLesson + 1;
            setCurrentLesson(newIndex);
            updateProgress(newIndex);
            setAudioProgress(0);
            setIsPlayingAudio(false);
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (currentLesson === lessons.length - 1 && progress < 100) {
            // Mark last lesson as completed
            updateProgress(currentLesson);
            alert('🎉 Congratulations! You have completed this course!');
            navigate('/learning');
        } else if (progress === 100) {
            alert('🎉 Congratulations! You have already completed this course!');
            navigate('/learning');
        }
    }

    function goToPrevLesson() {
        if (currentLesson > 0) {
            setCurrentLesson(currentLesson - 1);
            setAudioProgress(0);
            setIsPlayingAudio(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    const lesson = lessons[currentLesson];
    const hasAudio = lesson?.audio?.audio_url;
    const illustrations = lesson?.illustrations || [];
    const resources = lesson?.resources || [];
    const keyTakeaways = lesson?.key_takeaways || [];
    const isLessonCompleted = progress > ((currentLesson) / (lessons.length || 1)) * 100;

    return (
        <div className={`min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 ${fontSizes[fontSize]}`}>
            {/* Audio Element */}
            {hasAudio && <audio ref={audioRef} src={lesson.audio.audio_url} preload="metadata" />}

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header with Controls */}
                <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
                    <button onClick={() => navigate('/learning')} className="text-slate-400 hover:text-white flex items-center gap-1 transition">
                        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                    </button>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Audio Control */}
                        {hasAudio && (
                            <button
                                onClick={toggleAudio}
                                className={`p-2 rounded-lg transition flex items-center gap-2 ${
                                    isPlayingAudio ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {isPlayingAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                <span className="text-xs hidden sm:inline">{isPlayingAudio ? 'Playing' : 'Play Audio'}</span>
                            </button>
                        )}
                        
                        {/* Audio Progress Bar */}
                        {hasAudio && isPlayingAudio && (
                            <div className="w-32 bg-slate-700 rounded-full h-1">
                                <div className="bg-primary-500 h-1 rounded-full transition-all" style={{ width: `${audioProgress}%` }}></div>
                            </div>
                        )}
                        
                        {/* Font Size Control */}
                        <select
                            value={fontSize}
                            onChange={(e) => setFontSize(e.target.value)}
                            className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="small">Small Text</option>
                            <option value="medium">Medium Text</option>
                            <option value="large">Large Text</option>
                            <option value="xlarge">X-Large Text</option>
                        </select>
                        
                        {/* Fullscreen Toggle */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                            aria-label="Toggle fullscreen"
                        >
                            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Course Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Course Cover Image */}
                        {course?.image_url && (
                            <div className="md:w-1/3">
                                <img 
                                    src={course.image_url} 
                                    alt={course.title}
                                    className="w-full rounded-xl shadow-lg object-cover aspect-video"
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{course?.title}</h1>
                            <p className="text-slate-400 mb-4">{course?.description}</p>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-slate-400">
                                    <Clock className="w-4 h-4" /> {course?.duration_hours || 0} hours
                                </div>
                                <div className="flex items-center gap-1 text-slate-400">
                                    <BookOpen className="w-4 h-4" /> {lessons.length} lessons
                                </div>
                                <div className="flex items-center gap-1 text-emerald-400">
                                    <CheckCircle className="w-4 h-4" /> {progress}% complete
                                </div>
                                {hasAudio && (
                                    <div className="flex items-center gap-1 text-purple-400">
                                        <Headphones className="w-4 h-4" /> Audio Narration
                                    </div>
                                )}
                            </div>
                            <div className="mt-3 w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-gradient-to-r from-primary-500 to-sky-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area - Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Lesson Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Lesson Illustration */}
                        {illustrations.length > 0 && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Image className="w-4 h-4 text-primary-400" />
                                    <h3 className="text-white font-medium">Lesson Illustration</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {illustrations.slice(0, 4).map((img, idx) => (
                                        <img 
                                            key={idx}
                                            src={img.image_url} 
                                            alt={img.alt_text || `Illustration ${idx + 1}`}
                                            className="rounded-lg w-full object-cover aspect-video hover:scale-105 transition-transform cursor-pointer"
                                            onClick={() => window.open(img.image_url, '_blank')}
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Lesson Content */}
                        <div ref={contentRef} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 prose prose-invert max-w-none">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {isLessonCompleted && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                                    {lesson?.title}
                                </h2>
                                {isLessonCompleted && (
                                    <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                                        Completed
                                    </span>
                                )}
                            </div>
                            
                            {/* Lesson Content */}
                            <div className="text-slate-300 leading-relaxed space-y-4">
                                {lesson?.content ? (
                                    lesson.content.split('\n').map((paragraph, idx) => (
                                        paragraph.trim() && <p key={idx}>{paragraph}</p>
                                    ))
                                ) : (
                                    <p className="text-slate-400 italic">Content coming soon...</p>
                                )}
                            </div>
                            
                            {/* Key Takeaways Box */}
                            {keyTakeaways.length > 0 && (
                                <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                                    <h4 className="text-primary-400 font-semibold mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> Key Takeaways
                                    </h4>
                                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                                        {keyTakeaways.map((takeaway, idx) => (
                                            <li key={idx}>{takeaway}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between gap-4">
                            <button
                                onClick={goToPrevLesson}
                                disabled={currentLesson === 0}
                                className="px-5 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" /> Previous Lesson
                            </button>
                            <button
                                onClick={goToNextLesson}
                                className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-xl hover:from-primary-700 hover:to-sky-700 transition flex items-center gap-2"
                            >
                                {currentLesson === lessons.length - 1 ? (
                                    <>Complete Course <CheckCircle className="w-4 h-4" /></>
                                ) : (
                                    <>Next Lesson <ChevronRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Lesson List & Progress */}
                    <div className="space-y-6">
                        {/* Course Progress Card */}
                        <div className="bg-gradient-to-br from-primary-900/20 to-sky-900/20 border border-primary-500/30 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary-400" />
                                Your Progress
                            </h3>
                            <div className="text-3xl font-bold text-white mb-1">{progress}%</div>
                            <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
                                <div className="bg-gradient-to-r from-primary-500 to-sky-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-slate-400 text-sm">
                                {progress === 100 
                                    ? '🎉 Course completed! Great job!' 
                                    : `${Math.ceil(((100 - progress) / 100) * (course?.duration_hours || 0))} hours remaining`}
                            </p>
                        </div>

                        {/* Lesson List */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary-400" />
                                Course Content
                            </h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {lessons.map((l, idx) => {
                                    const isCompleted = idx < (progress / (100 / (lessons.length || 1)));
                                    const isCurrent = idx === currentLesson;
                                    
                                    return (
                                        <button
                                            key={l.id}
                                            onClick={() => {
                                                setCurrentLesson(idx);
                                                setAudioProgress(0);
                                                setIsPlayingAudio(false);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                                                isCurrent
                                                    ? 'bg-primary-600/20 border border-primary-500'
                                                    : 'bg-slate-800/30 hover:bg-slate-800'
                                            }`}
                                        >
                                            <div className="flex-shrink-0">
                                                {isCompleted ? (
                                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                ) : isCurrent ? (
                                                    <Play className="w-5 h-5 text-primary-400" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full border-2 border-slate-600"></div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm ${isCurrent ? 'text-primary-400' : 'text-white'}`}>
                                                    {l.title}
                                                </p>
                                                {l.duration_minutes && (
                                                    <p className="text-xs text-slate-500">{l.duration_minutes} min</p>
                                                )}
                                            </div>
                                            {(l.has_audio || l.audio?.audio_url) && (
                                                <Headphones className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                            )}
                                            {l.illustrations?.length > 0 && (
                                                <Image className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Resources & Downloads */}
                        {resources.length > 0 && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <Download className="w-4 h-4 text-primary-400" />
                                    Lesson Resources
                                </h3>
                                <div className="space-y-2">
                                    {resources.map((resource, idx) => (
                                        <a
                                            key={idx}
                                            href={resource.url}
                                            download
                                            className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                                        >
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm text-slate-300">{resource.name}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
