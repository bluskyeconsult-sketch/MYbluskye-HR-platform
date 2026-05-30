// src/pages/CourseLearnPage.jsx
// COMPLETE PROFESSIONAL COURSE LEARNING PAGE - With video player, progress tracking, notes, and quizzes

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
    ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, 
    CheckCircle, Circle, Clock, BookOpen, FileText, 
    MessageCircle, ThumbsUp, ChevronRight, ChevronLeft,
    Loader2, AlertCircle, Award, Star, Calendar, User,
    Download, Share2, Bookmark, Flag, Settings, X,
    Code, Image, File, Link as LinkIcon, Save, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CourseLearnPage() {
    const { id, lessonId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [enrollment, setEnrollment] = useState(null);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [completedLessons, setCompletedLessons] = useState({});
    const [progress, setProgress] = useState(0);
    const [notes, setNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);

    useEffect(() => {
        checkUser();
        loadCourse();
    }, [id]);

    useEffect(() => {
        if (lessonId && lessons.length > 0) {
            const lesson = lessons.find(l => l.id === lessonId);
            if (lesson) {
                setCurrentLesson(lesson);
            }
        } else if (lessons.length > 0 && !currentLesson) {
            // Find first incomplete lesson
            const firstIncomplete = lessons.find(l => !completedLessons[l.id]);
            setCurrentLesson(firstIncomplete || lessons[0]);
        }
    }, [lessonId, lessons, completedLessons]);

    async function checkUser() {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
    }

    async function loadCourse() {
        setLoading(true);
        setError(null);
        
        try {
            // ✅ Using unified API endpoint
            const courseResponse = await fetch(`/api/index?action=course&id=${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const courseResult = await courseResponse.json();
            
            if (!courseResult.success) throw new Error(courseResult.error);
            
            const courseData = courseResult.data;
            setCourse(courseData);
            
            // Load enrollment
            if (user) {
                const enrollmentResponse = await fetch(`/api/index?action=user-enrollment&courseId=${id}&userId=${user.id}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const enrollmentResult = await enrollmentResponse.json();
                
                if (enrollmentResult.success && enrollmentResult.data) {
                    setEnrollment(enrollmentResult.data);
                    setProgress(enrollmentResult.data.progress || 0);
                    
                    // Load completed lessons
                    if (enrollmentResult.data.completed_lessons) {
                        const completed = {};
                        enrollmentResult.data.completed_lessons.forEach(lessonId => {
                            completed[lessonId] = true;
                        });
                        setCompletedLessons(completed);
                    }
                    
                    // Load notes
                    if (enrollmentResult.data.notes) {
                        setNotes(enrollmentResult.data.notes);
                    }
                }
            }
            
            // Load lessons
            const lessonsResponse = await fetch(`/api/index?action=course-lessons&courseId=${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const lessonsResult = await lessonsResponse.json();
            
            if (lessonsResult.success) {
                setLessons(lessonsResult.data || []);
            }
            
        } catch (err) {
            console.error('Error loading course:', err);
            setError(err.message);
            toast.error('Failed to load course content');
        } finally {
            setLoading(false);
        }
    }

    async function markLessonComplete() {
        if (!currentLesson || completedLessons[currentLesson.id]) return;
        
        try {
            const response = await fetch('/api/index?action=course-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    courseId: id,
                    lessonId: currentLesson.id,
                    action: 'complete'
                })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            const newCompleted = { ...completedLessons, [currentLesson.id]: true };
            setCompletedLessons(newCompleted);
            
            const newProgress = result.data.progress;
            setProgress(newProgress);
            
            toast.success('Lesson completed!');
            
            // Auto-advance to next lesson
            const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
            if (currentIndex < lessons.length - 1) {
                setTimeout(() => {
                    navigate(`/courses/${id}/learn/${lessons[currentIndex + 1].id}`);
                }, 1500);
            }
            
        } catch (err) {
            console.error('Error marking lesson complete:', err);
            toast.error('Failed to mark lesson complete');
        }
    }

    async function saveNotes() {
        if (!user) return;
        
        setSavingNotes(true);
        
        try {
            const response = await fetch('/api/index?action=course-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    courseId: id,
                    notes: notes,
                    action: 'notes'
                })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            toast.success('Notes saved!');
        } catch (err) {
            console.error('Error saving notes:', err);
            toast.error('Failed to save notes');
        } finally {
            setSavingNotes(false);
        }
    }

    async function submitQuiz() {
        if (!currentLesson?.quiz) return;
        
        let score = 0;
        const totalQuestions = currentLesson.quiz.questions.length;
        
        currentLesson.quiz.questions.forEach((question, idx) => {
            if (quizAnswers[question.id] === question.correct_answer) {
                score++;
            }
        });
        
        const percentage = (score / totalQuestions) * 100;
        setQuizScore(percentage);
        setQuizSubmitted(true);
        
        if (percentage >= 70) {
            await markLessonComplete();
        } else {
            toast.error(`You scored ${score}/${totalQuestions}. 70% required to pass.`);
        }
    }

    function handleVideoProgress() {
        if (videoRef.current) {
            const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setVideoProgress(progress);
            
            // Auto-mark complete at 90% watch time
            if (progress >= 90 && !completedLessons[currentLesson?.id] && currentLesson?.type === 'video') {
                markLessonComplete();
            }
        }
    }

    function togglePlay() {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    }

    function toggleMute() {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    }

    function handleFullscreen() {
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            }
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error || !enrollment) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-slate-400 mb-6">
                        {error || 'You need to enroll in this course to access the content.'}
                    </p>
                    <Link to={`/courses/${id}`} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        View Course Details
                    </Link>
                </div>
            </div>
        );
    }

    const completedCount = Object.keys(completedLessons).length;
    const totalLessons = lessons.length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => navigate(`/courses/${id}`)} 
                                className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-sm font-medium text-white line-clamp-1">{course?.title}</h1>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{progress}% complete</span>
                                    <span>•</span>
                                    <span>{completedCount}/{totalLessons} lessons</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowNotes(!showNotes)}
                                className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition flex items-center gap-1"
                            >
                                <FileText className="w-4 h-4" />
                                {showNotes ? 'Hide Notes' : 'Notes'}
                            </button>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-2 w-full bg-slate-800 rounded-full h-1">
                        <div className="bg-primary-500 h-1 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="flex">
                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    {currentLesson && (
                        <div className="p-6">
                            {/* Video Player for video lessons */}
                            {currentLesson.type === 'video' && currentLesson.video_url && (
                                <div className="mb-6">
                                    <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                                        <video
                                            ref={videoRef}
                                            src={currentLesson.video_url}
                                            className="w-full h-full"
                                            onTimeUpdate={handleVideoProgress}
                                            onPlay={() => setIsPlaying(true)}
                                            onPause={() => setIsPlaying(false)}
                                        />
                                        
                                        {/* Custom Video Controls */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 hover:opacity-100 transition">
                                            <div className="flex items-center gap-3">
                                                <button onClick={togglePlay} className="text-white hover:text-primary-400 transition">
                                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                                </button>
                                                <div className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer">
                                                    <div className="bg-primary-500 h-1 rounded-full" style={{ width: `${videoProgress}%` }}></div>
                                                </div>
                                                <button onClick={toggleMute} className="text-white hover:text-primary-400 transition">
                                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                                </button>
                                                <button onClick={handleFullscreen} className="text-white hover:text-primary-400 transition">
                                                    <Maximize className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Lesson Content */}
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-white mb-2">{currentLesson.title}</h1>
                                {currentLesson.duration && (
                                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                                        <Clock className="w-4 h-4" />
                                        {currentLesson.duration} min
                                    </div>
                                )}
                                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {currentLesson.content}
                                </div>
                            </div>
                            
                            {/* Quiz for quiz lessons */}
                            {currentLesson.type === 'quiz' && currentLesson.quiz && !quizSubmitted && (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
                                    <h2 className="text-xl font-bold text-white mb-4">Quiz: {currentLesson.quiz.title}</h2>
                                    <p className="text-slate-400 mb-6">{currentLesson.quiz.description}</p>
                                    
                                    <div className="space-y-6">
                                        {currentLesson.quiz.questions.map((question, idx) => (
                                            <div key={question.id} className="space-y-3">
                                                <p className="text-white font-medium">{idx + 1}. {question.text}</p>
                                                <div className="space-y-2 ml-4">
                                                    {question.options.map((option, optIdx) => (
                                                        <label key={optIdx} className="flex items-center gap-3 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name={`q_${question.id}`}
                                                                value={option}
                                                                checked={quizAnswers[question.id] === option}
                                                                onChange={() => setQuizAnswers({...quizAnswers, [question.id]: option})}
                                                                className="w-4 h-4 text-primary-500"
                                                            />
                                                            <span className="text-slate-300">{option}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button
                                        onClick={submitQuiz}
                                        className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                                    >
                                        Submit Quiz
                                    </button>
                                </div>
                            )}
                            
                            {/* Quiz Results */}
                            {currentLesson.type === 'quiz' && quizSubmitted && (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        {quizScore >= 70 ? (
                                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                                        ) : (
                                            <AlertCircle className="w-8 h-8 text-red-400" />
                                        )}
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Quiz Results</h2>
                                            <p className="text-slate-400">You scored {quizScore}%</p>
                                        </div>
                                    </div>
                                    
                                    {quizScore >= 70 ? (
                                        <p className="text-emerald-400 mb-4">Congratulations! You passed the quiz.</p>
                                    ) : (
                                        <div>
                                            <p className="text-red-400 mb-4">You need 70% to pass. Review the material and try again.</p>
                                            <button
                                                onClick={() => {
                                                    setQuizSubmitted(false);
                                                    setQuizAnswers({});
                                                    setQuizScore(null);
                                                }}
                                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                                            >
                                                Retake Quiz
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Complete Button */}
                            {currentLesson.type !== 'quiz' && !completedLessons[currentLesson.id] && (
                                <button
                                    onClick={markLessonComplete}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Mark as Complete
                                </button>
                            )}
                            
                            {completedLessons[currentLesson.id] && currentLesson.type !== 'quiz' && (
                                <div className="text-center text-emerald-400 flex items-center justify-center gap-2 p-3 bg-emerald-500/10 rounded-xl">
                                    <CheckCircle className="w-5 h-5" /> Lesson Completed
                                </div>
                            )}
                            
                            {/* Navigation between lessons */}
                            <div className="flex justify-between gap-4 mt-6 pt-6 border-t border-slate-800">
                                {(() => {
                                    const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
                                    const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
                                    const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
                                    
                                    return (
                                        <>
                                            <button
                                                onClick={() => prevLesson && navigate(`/courses/${id}/learn/${prevLesson.id}`)}
                                                disabled={!prevLesson}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition"
                                            >
                                                <ChevronLeft className="w-4 h-4" /> Previous
                                            </button>
                                            
                                            {nextLesson && completedLessons[currentLesson.id] && (
                                                <button
                                                    onClick={() => navigate(`/courses/${id}/learn/${nextLesson.id}`)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                                                >
                                                    Next <ChevronRight className="w-4 h-4" />
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Sidebar - Lessons List */}
                <div className={`w-80 border-l border-slate-800 bg-slate-900/30 transition-all ${showNotes ? 'hidden' : 'block'}`}>
                    <div className="p-4 border-b border-slate-800">
                        <h2 className="text-white font-semibold">Course Content</h2>
                        <p className="text-slate-500 text-sm">{completedCount}/{totalLessons} lessons completed</p>
                    </div>
                    
                    <div className="divide-y divide-slate-800 max-h-[calc(100vh-120px)] overflow-y-auto">
                        {lessons.map((lesson, idx) => {
                            const isCompleted = completedLessons[lesson.id];
                            const isActive = currentLesson?.id === lesson.id;
                            
                            return (
                                <button
                                    key={lesson.id}
                                    onClick={() => navigate(`/courses/${id}/learn/${lesson.id}`)}
                                    className={`w-full text-left p-4 hover:bg-slate-800/50 transition ${
                                        isActive ? 'bg-primary-600/10 border-l-2 border-primary-500' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {isCompleted ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${isActive ? 'text-primary-400' : 'text-white'} line-clamp-2`}>
                                                {idx + 1}. {lesson.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {lesson.type === 'video' && <Play className="w-3 h-3 text-slate-500" />}
                                                {lesson.type === 'quiz' && <FileText className="w-3 h-3 text-slate-500" />}
                                                {lesson.type === 'article' && <BookOpen className="w-3 h-3 text-slate-500" />}
                                                {lesson.duration && (
                                                    <span className="text-xs text-slate-500">{lesson.duration} min</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                {/* Notes Sidebar */}
                {showNotes && (
                    <div className="w-80 border-l border-slate-800 bg-slate-900/30">
                        <div className="p-4 border-b border-slate-800">
                            <div className="flex justify-between items-center">
                                <h2 className="text-white font-semibold">My Notes</h2>
                                <button 
                                    onClick={() => setShowNotes(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-4">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={20}
                                placeholder="Take notes as you learn... Your notes are saved automatically to your account."
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                            />
                            <button
                                onClick={saveNotes}
                                disabled={savingNotes}
                                className="mt-4 w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Notes
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Completion Celebration */}
            {progress === 100 && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-md">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Award className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Course Completed! 🎉</h2>
                        <p className="text-slate-400 mb-6">
                            Congratulations! You've successfully completed {course?.title}.
                        </p>
                        <Link to={`/courses/${id}`}>
                            <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                                View Certificate
                            </button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
