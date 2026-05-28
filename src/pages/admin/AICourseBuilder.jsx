// src/pages/admin/AICourseBuilder.jsx
// PROFESSIONAL AI-POWERED COURSE BUILDER - Full automation with unified API

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    Sparkles, Loader2, BookOpen, Clock, Users, AlertCircle,
    CheckCircle, XCircle, Plus, Trash2, Edit2, Save, X,
    Brain, Wand2, Image, Music, FileQuestion, Award, TrendingUp,
    Eye, Globe, Shield, Zap, Settings, DollarSign, Star
} from 'lucide-react';
import { autoCreateCourse, generateCourseAudio, generateLessonImage } from '../../lib/courseBuilderService';

// Unified API endpoint
const API_BASE = '/api/index';
const GENERATE_ENDPOINT = `${API_BASE}?action=generate-course`;
const PREVIEW_ENDPOINT = `${API_BASE}?action=preview-course`;

export default function AICourseBuilder() {
    const navigate = useNavigate();
    
    // Form State
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('intermediate');
    const [durationHours, setDurationHours] = useState(5);
    const [targetAudience, setTargetAudience] = useState('');
    const [learningObjectives, setLearningObjectives] = useState('');
    
    // Feature Toggles
    const [includeImages, setIncludeImages] = useState(true);
    const [includeAudio, setIncludeAudio] = useState(true);
    const [includeQuizzes, setIncludeQuizzes] = useState(true);
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [generatedOutline, setGeneratedOutline] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [activeStep, setActiveStep] = useState('form'); // form, preview, generating, complete

    useEffect(() => {
        checkAdmin();
    }, []);

    async function checkAdmin() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/admin-login');
            return;
        }
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type, tier')
            .eq('id', user.id)
            .single();
        
        const isAdmin = profile?.user_type === 'admin' || 
                       profile?.user_type === 'super_admin' || 
                       user.email === 'bluskyeconsult@gmail.com';
        
        if (!isAdmin) {
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
        setActiveStep('preview');
        
        try {
            const response = await fetch(PREVIEW_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    level,
                    durationHours,
                    targetAudience,
                    learningObjectives
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setGeneratedOutline(data.outline);
                setShowPreview(true);
            } else {
                throw new Error(data.error || 'Preview generation failed');
            }
        } catch (err) {
            console.error('Preview error:', err);
            setError(err.message);
            setActiveStep('form');
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerateCourse(e) {
        if (e && e.preventDefault) e.preventDefault();
        
        setLoading(true);
        setError('');
        setResult(null);
        setActiveStep('generating');
        setGenerationProgress(0);
        
        try {
            // Progress simulation
            const progressInterval = setInterval(() => {
                setGenerationProgress(prev => Math.min(prev + 5, 90));
            }, 500);
            
            const response = await fetch(GENERATE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    level,
                    durationHours,
                    targetAudience,
                    learningObjectives,
                    includeImages,
                    includeAudio,
                    includeQuizzes,
                    userId: user?.id
                })
            });
            
            clearInterval(progressInterval);
            setGenerationProgress(100);
            
            const data = await response.json();
            
            if (data.success) {
                setResult({ 
                    courseId: data.courseId, 
                    courseSlug: data.courseSlug,
                    lessonCount: data.lessonCount,
                    moduleCount: data.moduleCount,
                    message: data.message,
                    estimatedTime: data.estimatedTime
                });
                setActiveStep('complete');
                setTopic('');
                setTargetAudience('');
                setLearningObjectives('');
            } else {
                throw new Error(data.error || 'Failed to create course');
            }
        } catch (err) {
            console.error('Course generation error:', err);
            setError(err.message);
            setActiveStep('form');
        } finally {
            setLoading(false);
        }
    }

    const resetForm = () => {
        setTopic('');
        setLevel('intermediate');
        setDurationHours(5);
        setTargetAudience('');
        setLearningObjectives('');
        setResult(null);
        setError('');
        setActiveStep('form');
        setShowPreview(false);
        setGeneratedOutline(null);
    };

    const difficultyLevels = [
        { value: 'beginner', label: 'Beginner', color: 'bg-emerald-500/20 text-emerald-400', icon: Star },
        { value: 'intermediate', label: 'Intermediate', color: 'bg-blue-500/20 text-blue-400', icon: TrendingUp },
        { value: 'advanced', label: 'Advanced', color: 'bg-purple-500/20 text-purple-400', icon: Award },
        { value: 'expert', label: 'Expert', color: 'bg-amber-500/20 text-amber-400', icon: Zap }
    ];

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-5xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 mb-4">
                        <Wand2 className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 text-sm font-medium">AI-Powered Course Creation</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3">AI Course Builder</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Generate complete, production-ready courses with AI — including lessons, quizzes, images, and audio narration
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        {[
                            { step: 'form', label: 'Course Details', icon: BookOpen },
                            { step: 'preview', label: 'Preview', icon: Eye },
                            { step: 'generating', label: 'Generating', icon: Wand2 },
                            { step: 'complete', label: 'Complete', icon: CheckCircle }
                        ].map((step, idx) => (
                            <div key={step.step} className="flex items-center">
                                <div className={`flex flex-col items-center ${activeStep === step.step ? 'opacity-100' : 'opacity-50'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        activeStep === step.step ? 'bg-primary-600' : 'bg-slate-800'
                                    }`}>
                                        {activeStep === step.step && step.step !== 'complete' ? (
                                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                                        ) : (
                                            <step.icon className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 mt-1">{step.label}</span>
                                </div>
                                {idx < 3 && <div className="w-12 h-px bg-slate-700 mx-2" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feature Toggles */}
                <div className="bg-gradient-to-r from-primary-900/20 to-purple-900/20 border border-primary-500/20 rounded-xl p-4 mb-8">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary-400" />
                        AI Automation Features
                    </h3>
                    <div className="flex flex-wrap gap-6">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={includeImages} 
                                onChange={(e) => setIncludeImages(e.target.checked)} 
                                className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-slate-300 group-hover:text-white transition flex items-center gap-1">
                                <Image className="w-4 h-4" /> Generate AI Images (DALL-E)
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={includeAudio} 
                                onChange={(e) => setIncludeAudio(e.target.checked)} 
                                className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-slate-300 group-hover:text-white transition flex items-center gap-1">
                                <Music className="w-4 h-4" /> Generate Audio Narration (TTS)
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={includeQuizzes} 
                                onChange={(e) => setIncludeQuizzes(e.target.checked)} 
                                className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-slate-300 group-hover:text-white transition flex items-center gap-1">
                                <FileQuestion className="w-4 h-4" /> Generate In-Lesson Quizzes
                            </span>
                        </label>
                    </div>
                </div>

                {/* Course Generation Form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-purple-400" />
                        Course Details
                    </h2>
                    
                    <form onSubmit={handleGenerateCourse} className="space-y-5">
                        {/* Topic */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Course Topic <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g., Python Programming, Project Management, Digital Marketing, Leadership Skills"
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        {/* Level & Duration */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Difficulty Level</label>
                                <select 
                                    value={level} 
                                    onChange={(e) => setLevel(e.target.value)} 
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={loading}
                                >
                                    {difficultyLevels.map(lvl => (
                                        <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Duration (hours)</label>
                                <input 
                                    type="number" 
                                    value={durationHours} 
                                    onChange={(e) => setDurationHours(parseInt(e.target.value))} 
                                    min="1" 
                                    max="100" 
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        
                        {/* Target Audience */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Target Audience</label>
                            <textarea 
                                value={targetAudience} 
                                onChange={(e) => setTargetAudience(e.target.value)} 
                                rows={2} 
                                placeholder="e.g., Beginners with no prior experience, professionals looking to upskill, managers seeking leadership training..."
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        {/* Learning Objectives */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Learning Objectives (Optional)</label>
                            <textarea 
                                value={learningObjectives} 
                                onChange={(e) => setLearningObjectives(e.target.value)} 
                                rows={2} 
                                placeholder="What students will be able to do after completing this course..."
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                disabled={loading}
                            />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={previewCourse}
                                disabled={loading || !topic.trim()}
                                className="flex-1 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Eye className="w-4 h-4" />
                                Preview Course
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && activeStep === 'generating' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                {loading && activeStep === 'generating' ? 'Generating...' : 'Generate Full Course'}
                            </button>
                        </div>
                    </form>
                    
                    {/* Generation Progress */}
                    {activeStep === 'generating' && generationProgress > 0 && generationProgress < 100 && (
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>Generating course content...</span>
                                <span>{generationProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${generationProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </p>
                        </div>
                    )}
                    
                    {/* Success Result */}
                    {result && activeStep === 'complete' && (
                        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <p className="text-emerald-400 font-semibold flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                {result.message}
                            </p>
                            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                    <p className="text-slate-400">Lessons Created</p>
                                    <p className="text-white font-bold">{result.lessonCount}</p>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                    <p className="text-slate-400">Modules Created</p>
                                    <p className="text-white font-bold">{result.moduleCount}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <a 
                                    href={`/courses/${result.courseSlug}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition"
                                >
                                    View Course
                                </a>
                                <a 
                                    href={`/admin/courses/edit/${result.courseId}`} 
                                    className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 transition"
                                >
                                    Edit Course
                                </a>
                                <button
                                    onClick={resetForm}
                                    className="px-3 py-1.5 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800 transition"
                                >
                                    Create Another Course
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Course Preview Modal */}
                {showPreview && generatedOutline && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-primary-400" />
                                    <h2 className="text-xl font-bold text-white">Course Preview</h2>
                                </div>
                                <button 
                                    onClick={() => setShowPreview(false)} 
                                    className="p-1 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-xl font-bold text-primary-400">{generatedOutline.title}</h3>
                                    <p className="text-slate-400 text-sm mt-1">{generatedOutline.description}</p>
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {generatedOutline.estimated_minutes} minutes</span>
                                    <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {generatedOutline.total_lessons} lessons</span>
                                    <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /> {difficultyLevels.find(l => l.value === level)?.label}</span>
                                </div>
                                
                                <div className="border-t border-slate-800 pt-4">
                                    <h4 className="text-white font-semibold mb-3">Course Modules</h4>
                                    <div className="space-y-2">
                                        {generatedOutline.modules.map((mod, idx) => (
                                            <div key={idx} className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-800 transition">
                                                <p className="text-white font-medium">Module {idx + 1}: {mod.title}</p>
                                                <p className="text-slate-400 text-sm mt-1">{mod.lessons} lessons • {mod.estimated_minutes} minutes</p>
                                                {mod.description && (
                                                    <p className="text-slate-500 text-xs mt-1">{mod.description}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-lg p-3">
                                    <p className="text-purple-400 text-sm flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        AI will generate: detailed lessons, quizzes, images, and audio narration
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 mt-6">
                                <button 
                                    onClick={() => {
                                        setShowPreview(false);
                                        handleGenerateCourse();
                                    }} 
                                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition"
                                >
                                    Generate Full Course
                                </button>
                                <button 
                                    onClick={() => setShowPreview(false)} 
                                    className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Box */}
                <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-5">
                    <h3 className="text-primary-400 font-semibold mb-3 flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        How AI Course Builder Works
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
                        <ul className="space-y-1 list-disc list-inside">
                            <li>AI generates complete course outline with modules and lessons</li>
                            <li>Each lesson includes detailed content, examples, and key takeaways</li>
                            <li>AI creates in-lesson quizzes to test understanding</li>
                        </ul>
                        <ul className="space-y-1 list-disc list-inside">
                            <li>DALL-E generates relevant images for visual learning</li>
                            <li>Text-to-speech creates audio narration for every lesson</li>
                            <li>Course is saved as DRAFT - review before publishing</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
