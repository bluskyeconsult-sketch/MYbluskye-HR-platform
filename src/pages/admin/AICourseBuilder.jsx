// src/pages/admin/AICourseBuilder.jsx
// ENHANCED AI-POWERED COURSE BUILDER - Full automation

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    Sparkles, Loader2, BookOpen, Clock, Users, AlertCircle,
    CheckCircle, XCircle, Plus, Trash2, Edit2, Save, X,
    Brain, Wand2, Image, Music, FileQuestion, Award, TrendingUp
} from 'lucide-react';
import { autoCreateCourse, generateCourseAudio, generateLessonImage } from '../../lib/courseBuilderService';

export default function AICourseBuilder() {
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('intermediate');
    const [durationHours, setDurationHours] = useState(5);
    const [targetAudience, setTargetAudience] = useState('');
    const [learningObjectives, setLearningObjectives] = useState('');
    const [includeImages, setIncludeImages] = useState(true);
    const [includeAudio, setIncludeAudio] = useState(true);
    const [includeQuizzes, setIncludeQuizzes] = useState(true);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [generatedOutline, setGeneratedOutline] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        getUser();
    }, []);

    async function getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/admin-login');
            return;
        }
        if (user.email !== 'bluskyeconsult@gmail.com') {
            navigate('/dashboard');
            return;
        }
        setUser(user);
    }

    async function previewCourse() {
        if (!topic.trim()) {
            setError('Please enter a course topic');
            return;
        }
        
        setLoading(true);
        setError('');
        
        // Simulate preview generation
        setTimeout(() => {
            setGeneratedOutline({
                title: `Complete ${topic} Course`,
                description: `Master ${topic} with this comprehensive ${level} level course designed for ${targetAudience || 'professionals'}.`,
                modules: [
                    { title: `Introduction to ${topic}`, lessons: 3, estimated_minutes: 45 },
                    { title: `Core Concepts of ${topic}`, lessons: 4, estimated_minutes: 60 },
                    { title: `Advanced ${topic} Techniques`, lessons: 3, estimated_minutes: 50 },
                    { title: `Practical Applications`, lessons: 3, estimated_minutes: 40 },
                    { title: `Mastery & Certification`, lessons: 2, estimated_minutes: 45 }
                ],
                total_lessons: 15,
                estimated_minutes: durationHours * 60
            });
            setShowPreview(true);
            setLoading(false);
        }, 2000);
    }

    async function handleGenerateCourse(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        const response = await autoCreateCourse(topic, level, durationHours, targetAudience, user?.id);
        
        if (response.success) {
            setResult({ 
                courseId: response.courseId, 
                courseSlug: response.courseSlug,
                lessonCount: response.lessonCount,
                message: response.message 
            });
            
            // Auto-generate images if enabled
            if (includeImages && response.courseId) {
                await generateCourseImages(response.courseId);
            }
            
            // Auto-generate audio if enabled
            if (includeAudio && response.courseId) {
                await generateCourseAudioForAll(response.courseId);
            }
            
            setTopic('');
            setTargetAudience('');
            setLearningObjectives('');
        } else {
            setError(response.error || 'Failed to create course');
        }
        setLoading(false);
    }

    async function generateCourseImages(courseId) {
        // Get all lessons in the course
        const { data: modules } = await supabase
            .from('course_modules')
            .select('id, lessons:course_lessons(id, title)')
            .eq('course_id', courseId);
        
        for (const module of modules || []) {
            for (const lesson of module.lessons || []) {
                try {
                    await generateLessonImage(lesson.id, `Illustration for ${lesson.title}`);
                } catch (err) {
                    console.warn('Image generation failed for lesson:', lesson.id);
                }
            }
        }
    }

    async function generateCourseAudioForAll(courseId) {
        const { data: modules } = await supabase
            .from('course_modules')
            .select('id, lessons:course_lessons(id, content)')
            .eq('course_id', courseId);
        
        for (const module of modules || []) {
            for (const lesson of module.lessons || []) {
                if (lesson.content) {
                    try {
                        await generateCourseAudio(lesson.id, lesson.content);
                    } catch (err) {
                        console.warn('Audio generation failed for lesson:', lesson.id);
                    }
                }
            }
        }
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold text-white mb-2">AI Course Builder</h1>
                <p className="text-slate-400 mb-8">Generate complete, production-ready courses with AI</p>

                {/* Feature Toggles */}
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-8">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary-400" />
                        AI Automation Features
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} className="w-4 h-4" />
                            <span className="text-slate-300">Generate AI Images (DALL-E)</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={includeAudio} onChange={(e) => setIncludeAudio(e.target.checked)} className="w-4 h-4" />
                            <span className="text-slate-300">Generate Audio Narration (TTS)</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={includeQuizzes} onChange={(e) => setIncludeQuizzes(e.target.checked)} className="w-4 h-4" />
                            <span className="text-slate-300">Generate In-Lesson Quizzes</span>
                        </label>
                    </div>
                </div>

                {/* Course Generation Form */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Create New Course with AI
                    </h2>
                    
                    <form onSubmit={handleGenerateCourse} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Course Topic *</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g., Python Programming, Project Management, Digital Marketing, Leadership Skills"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Difficulty Level</label>
                                <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                    <option value="expert">Expert</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Duration (hours)</label>
                                <input type="number" value={durationHours} onChange={(e) => setDurationHours(parseInt(e.target.value))} min="1" max="100" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Target Audience</label>
                            <textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} rows={2} placeholder="e.g., Beginners with no prior experience, professionals looking to upskill..." className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500" required />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Learning Objectives (Optional)</label>
                            <textarea value={learningObjectives} onChange={(e) => setLearningObjectives(e.target.value)} rows={2} placeholder="What students will be able to do after completing this course..." className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                        </div>
                        
                        <div className="flex gap-3">
                            <button type="button" onClick={previewCourse} disabled={loading || !topic.trim()} className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                Preview Course
                            </button>
                            <button type="submit" disabled={loading} className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {loading ? 'Generating Course...' : 'Generate Full Course'}
                            </button>
                        </div>
                    </form>
                    
                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    
                    {result && (
                        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <p className="text-emerald-400 font-semibold">✅ {result.message}</p>
                            <div className="flex gap-3 mt-3">
                                <a href={`/courses/${result.courseSlug}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600">
                                    View Course
                                </a>
                                <a href={`/admin/courses/edit/${result.courseId}`} className="px-3 py-1 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600">
                                    Edit Course
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Course Preview Modal */}
                {showPreview && generatedOutline && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Course Preview</h2>
                                <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-primary-400">{generatedOutline.title}</h3>
                                    <p className="text-slate-400 text-sm mt-1">{generatedOutline.description}</p>
                                </div>
                                
                                <div className="flex gap-4 text-sm text-slate-400">
                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {generatedOutline.estimated_minutes} minutes</span>
                                    <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {generatedOutline.total_lessons} lessons</span>
                                    <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /> {level}</span>
                                </div>
                                
                                <div className="border-t border-slate-800 pt-4">
                                    <h4 className="text-white font-semibold mb-2">Course Modules</h4>
                                    <div className="space-y-2">
                                        {generatedOutline.modules.map((mod, idx) => (
                                            <div key={idx} className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-white font-medium">Module {idx + 1}: {mod.title}</p>
                                                <p className="text-slate-400 text-sm">{mod.lessons} lessons • {mod.estimated_minutes} minutes</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3">
                                    <p className="text-primary-400 text-sm flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        AI will generate: detailed lessons, quizzes, images, and audio narration
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => { setShowPreview(false); handleGenerateCourse(new Event('submit')); }} className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700">
                                    Generate Full Course
                                </button>
                                <button onClick={() => setShowPreview(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Box */}
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                    <h3 className="text-primary-400 font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> How AI Course Builder Works
                    </h3>
                    <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                        <li>AI generates complete course outline with modules and lessons</li>
                        <li>Each lesson includes detailed content, examples, and key takeaways</li>
                        <li>AI creates in-lesson quizzes to test understanding</li>
                        <li>DALL-E generates relevant images for visual learning</li>
                        <li>Text-to-speech creates audio narration for every lesson</li>
                        <li>Course is saved as DRAFT - review before publishing</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

// Missing import
import { Eye } from 'lucide-react';
