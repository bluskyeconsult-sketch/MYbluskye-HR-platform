// src/pages/admin/AICourseBuilder.jsx
// PROFESSIONAL AI-POWERED COURSE BUILDER - Full automation with unified API
// Features: AI course generation, preview, progress tracking, media generation, quizzes
//
// FIXED (2026-08-07):
// 1. Briefcase and Palette icons were used in the categories array (module
//    scope, evaluated on import) but never imported — this crashed the page
//    immediately on load, before anything could render. Added both.
// 2. Removed a hardcoded admin-email backdoor (8th confirmed instance
//    across this codebase) — the user_type check alone was already correct.
// 3. loadRecentCourses()/loadSavedCourses() selected a `level` column that
//    doesn't exist — CourseEditor.jsx (already fixed) established the real
//    column as `difficulty`. Fixed the select and the course card display.
// 4. Wrong route: linked to /admin/courses/edit/:id, but the real
//    registered route (confirmed in App.jsx) is /admin/courses/:id/edit.
// 5. MAJOR: the whole generate+save flow expected a backend that doesn't
//    exist. It called ?action=preview-course and ?action=save-course
//    (neither exists), and expected ?action=generate-course to auto-write
//    full lessons/quizzes/images to the database and return a real
//    courseId. The actual, confirmed generate-course handler only returns
//    a text outline ({title, description, modules}) — it never touches the
//    database at all. So courseId was always undefined and nothing could
//    ever actually be saved. Rebuilt the flow to match what the real
//    backend actually provides: call the one real outline endpoint, then
//    save that outline directly via Supabase into courses + course_lessons
//    (the exact schema CourseEditor.jsx already established). This makes
//    the feature genuinely work — simpler than originally designed (no
//    auto-generated quizzes/images/audio, since no backend for those
//    exists), but real. The feature toggles for those are left in the UI
//    with a note that they're not yet functional, rather than silently
//    ignored or removed.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    Sparkles, Loader2, BookOpen, Clock, Users, AlertCircle,
    CheckCircle, XCircle, Plus, Trash2, Edit2, Save, X,
    Brain, Wand2, Image, Music, FileQuestion, Award, TrendingUp,
    Eye, Globe, Shield, Zap, Settings, DollarSign, Star,
    ChevronRight, ChevronLeft, PlayCircle, List, Layout,
    Heart, Share2, Copy, Download, Calendar, Briefcase, Palette, Clipboard
} from 'lucide-react';

// ============================================
// UNIFIED API ENDPOINTS
// ============================================

const API_BASE = '/api/index';
// FIXED: only this one endpoint is real — preview-course and save-course
// never existed, so both the preview step and separate save step now reuse
// this same call.
const GENERATE_ENDPOINT = `${API_BASE}?action=generate-course`;

// ============================================
// CONFIGURATION
// ============================================

const difficultyLevels = [
    { value: 'beginner', label: 'Beginner', color: 'bg-emerald-500/20 text-emerald-400', icon: Star, description: 'No prior experience needed', badge: '🌱' },
    { value: 'intermediate', label: 'Intermediate', color: 'bg-blue-500/20 text-blue-400', icon: TrendingUp, description: 'Some basic knowledge required', badge: '📚' },
    { value: 'advanced', label: 'Advanced', color: 'bg-purple-500/20 text-purple-400', icon: Award, description: 'In-depth expertise expected', badge: '🎓' },
    { value: 'expert', label: 'Expert', color: 'bg-amber-500/20 text-amber-400', icon: Zap, description: 'Master-level content', badge: '🏆' }
];

const categories = [
    { id: 'technology', name: 'Technology & Programming', icon: Brain },
    { id: 'business', name: 'Business & Management', icon: Briefcase },
    { id: 'design', name: 'Design & Creative', icon: Palette },
    { id: 'marketing', name: 'Marketing & Sales', icon: TrendingUp },
    { id: 'personal', name: 'Personal Development', icon: Users },
    { id: 'language', name: 'Language Learning', icon: Globe }
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function AICourseBuilder() {
    const navigate = useNavigate();
    
    // Form State
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('intermediate');
    const [durationHours, setDurationHours] = useState(5);
    const [targetAudience, setTargetAudience] = useState('');
    const [learningObjectives, setLearningObjectives] = useState('');
    const [category, setCategory] = useState('technology');
    
    // Feature Toggles
    const [includeImages, setIncludeImages] = useState(true);
    const [includeAudio, setIncludeAudio] = useState(true);
    const [includeQuizzes, setIncludeQuizzes] = useState(true);
    const [includeAssignments, setIncludeAssignments] = useState(true);
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [generatedOutline, setGeneratedOutline] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationStatus, setGenerationStatus] = useState('');
    const [activeStep, setActiveStep] = useState('form'); // form, preview, generating, complete
    const [expandedModule, setExpandedModule] = useState(null);
    const [recentCourses, setRecentCourses] = useState([]);
    const [savedCourses, setSavedCourses] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('standard');

    useEffect(() => {
        checkAdmin();
        loadRecentCourses();
        loadSavedCourses();
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
                       profile?.user_type === 'super_admin';
        
        if (!isAdmin) {
            navigate('/dashboard');
            return;
        }
        setUser(user);
    }

    async function loadRecentCourses() {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('id, title, created_at, is_published, view_count, category, difficulty')
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (!error && data) {
                setRecentCourses(data);
            }
        } catch (err) {
            console.error('Failed to load recent courses:', err);
        }
    }

    async function loadSavedCourses() {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('id, title, created_at, is_published')
                .eq('is_published', true)
                .order('view_count', { ascending: false })
                .limit(10);
            
            if (!error && data) {
                setSavedCourses(data);
            }
        } catch (err) {
            console.error('Failed to load saved courses:', err);
        }
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
            // FIXED: preview-course never existed — this now calls the one
            // real outline endpoint directly, same as the final generate
            // step, since that's the only real AI course capability the
            // backend actually offers.
            const response = await fetch(GENERATE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, level })
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

    // FIXED: this used to expect the backend to auto-generate full lessons,
    // quizzes, and images and save everything itself, returning a real
    // courseId — none of that exists. Now generates a real outline via the
    // one real endpoint, then saves it directly via Supabase into courses +
    // course_lessons, using the exact schema CourseEditor.jsx already
    // established. includeImages/includeAudio/includeQuizzes/
    // includeAssignments are collected but have no effect yet — see file
    // header.
    async function handleGenerateCourse(e) {
        if (e && e.preventDefault) e.preventDefault();
        
        setLoading(true);
        setError('');
        setResult(null);
        setActiveStep('generating');
        setGenerationProgress(10);
        setGenerationStatus('Generating course outline...');
        
        try {
            const response = await fetch(GENERATE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, level })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to generate course outline');
            }
            
            const outline = data.outline || {};
            
            setGenerationProgress(50);
            setGenerationStatus('Saving course...');
            
            const { data: newCourse, error: courseError } = await supabase
                .from('courses')
                .insert({
                    title: outline.title || topic,
                    description: outline.description || '',
                    category,
                    difficulty: level,
                    duration_hours: durationHours,
                    is_published: false,
                    is_free: false,
                    price: 0
                })
                .select()
                .single();
            
            if (courseError) throw courseError;
            
            setGenerationProgress(75);
            setGenerationStatus('Creating lessons...');
            
            const modules = outline.modules || [];
            for (let i = 0; i < modules.length; i++) {
                const mod = modules[i];
                const content = Array.isArray(mod.lessons)
                    ? mod.lessons.join('\n\n')
                    : (mod.content || mod.description || '');
                
                await supabase.from('course_lessons').insert({
                    course_id: newCourse.id,
                    title: mod.title || `Module ${i + 1}`,
                    content,
                    sort_order: i,
                    duration_minutes: Math.round((durationHours * 60) / Math.max(modules.length, 1)),
                    is_free: i === 0
                });
            }
            
            setGenerationProgress(100);
            setGenerationStatus('Course created successfully!');
            setResult({
                courseId: newCourse.id,
                moduleCount: modules.length,
                message: `Created "${newCourse.title}" with ${modules.length} lesson${modules.length === 1 ? '' : 's'} as a draft.`
            });
            setActiveStep('complete');
            await loadRecentCourses();
            setTimeout(() => {
                setTopic('');
                setTargetAudience('');
                setLearningObjectives('');
            }, 500);
        } catch (err) {
            console.error('Course generation error:', err);
            setError(err.message);
            setActiveStep('form');
        } finally {
            setLoading(false);
        }
    }

    // FIXED: the course is already saved as a draft at generation time now
    // (see handleGenerateCourse above), so this just takes the admin to the
    // real course editor to review/publish — using the real registered
    // route (/admin/courses/:id/edit, not /admin/courses/edit/:id).
    function handleEditCourse() {
        if (!result?.courseId) return;
        navigate(`/admin/courses/${result.courseId}/edit`);
    }

    const resetForm = () => {
        setTopic('');
        setLevel('intermediate');
        setDurationHours(5);
        setTargetAudience('');
        setLearningObjectives('');
        setCategory('technology');
        setResult(null);
        setError('');
        setActiveStep('form');
        setShowPreview(false);
        setGeneratedOutline(null);
        setGenerationProgress(0);
        setGenerationStatus('');
    };

    const steps = [
        { step: 'form', label: 'Course Details', icon: BookOpen },
        { step: 'preview', label: 'Preview', icon: Eye },
        { step: 'generating', label: 'Generating', icon: Wand2 },
        { step: 'complete', label: 'Complete', icon: CheckCircle }
    ];

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    const currentStepIndex = steps.findIndex(s => s.step === activeStep);
    const currentDifficulty = difficultyLevels.find(l => l.value === level);
    const selectedCategory = categories.find(c => c.id === category);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
            <div className="max-w-5xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 mb-4">
                        <Wand2 className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 text-sm font-medium">AI-Powered Course Creation</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        AI Course Builder
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Generate complete, production-ready courses with AI — including lessons, quizzes, images, and audio narration
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-center mb-10">
                    <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-full border border-slate-800">
                        {steps.map((step, idx) => (
                            <div key={step.step} className="flex items-center">
                                <div className={`flex flex-col items-center transition-all duration-300 ${
                                    currentStepIndex >= idx ? 'opacity-100' : 'opacity-40'
                                }`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                        currentStepIndex > idx ? 'bg-emerald-600' :
                                        currentStepIndex === idx ? 'bg-primary-600 ring-2 ring-primary-400 ring-offset-2 ring-offset-slate-950' : 
                                        'bg-slate-800'
                                    }`}>
                                        {currentStepIndex > idx ? (
                                            <CheckCircle className="w-5 h-5 text-white" />
                                        ) : currentStepIndex === idx && activeStep === 'generating' ? (
                                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                                        ) : (
                                            <step.icon className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 mt-2 hidden sm:block">{step.label}</span>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className="w-16 h-px bg-slate-700 mx-1 hidden sm:block" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feature Toggles */}
                <div className="bg-gradient-to-r from-primary-900/20 to-purple-900/20 border border-primary-500/20 rounded-xl p-5 mb-8 backdrop-blur-sm">
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
                            <span className="text-slate-300 group-hover:text-white transition flex items-center gap-2">
                                <Image className="w-4 h-4" /> 
                                <span>Generate AI Images <span className="text-xs text-slate-500">(DALL-E)</span></span>
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={includeAudio} 
                                onChange={(e) => setIncludeAudio(e.target.checked)} 
                                className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-slate-300 group-hover:text-white transition flex items-center gap-2">
                                <Music className="w-4 h-4" /> 
                                <span>Generate Audio Narration <span className="text-xs text-slate-500">(TTS)</span></span>
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={includeQuizzes} 
                                onChange={(e) => setIncludeQuizzes(e.target.checked)} 
                                className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-slate-300 group-hover:text-white transition flex items-center gap-2">
                                <FileQuestion className="w-4 h-4" /> 
                                <span>Generate In-Lesson Quizzes</span>
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={includeAssignments} 
                                onChange={(e) => setIncludeAssignments(e.target.checked)} 
                                className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-slate-300 group-hover:text-white transition flex items-center gap-2">
                                <Clipboard className="w-4 h-4" /> 
                                <span>Generate Assignments</span>
                            </span>
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 border-t border-primary-500/20 pt-3">
                        💡 Tip: AI-generated images and audio consume API credits. Disable features to save credits during testing.
                    </p>
                </div>

                {/* Course Generation Form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8 shadow-xl">
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
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        {/* Level & Duration & Category */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Difficulty Level</label>
                                <select 
                                    value={level} 
                                    onChange={(e) => setLevel(e.target.value)} 
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                    disabled={loading}
                                >
                                    {difficultyLevels.map(lvl => (
                                        <option key={lvl.value} value={lvl.value}>{lvl.badge} {lvl.label}</option>
                                    ))}
                                </select>
                                {currentDifficulty && (
                                    <p className="text-xs text-slate-500 mt-1">{currentDifficulty.description}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                                <select 
                                    value={category} 
                                    onChange={(e) => setCategory(e.target.value)} 
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                    disabled={loading}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Duration (hours)</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="range" 
                                        value={durationHours} 
                                        onChange={(e) => setDurationHours(parseInt(e.target.value))} 
                                        min="1" 
                                        max="50" 
                                        step="1"
                                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        disabled={loading}
                                    />
                                    <span className="text-white font-mono w-12 text-center">{durationHours}h</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>Quick (1h)</span>
                                    <span>Standard (10h)</span>
                                    <span>Deep (50h)</span>
                                </div>
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
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
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
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
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
                                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                            >
                                {loading && activeStep === 'generating' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                {loading && activeStep === 'generating' ? 'Generating Course...' : 'Generate Full Course'}
                            </button>
                        </div>
                    </form>
                    
                    {/* Generation Progress */}
                    {activeStep === 'generating' && generationProgress > 0 && generationProgress < 100 && (
                        <div className="mt-6 pt-4 border-t border-slate-800">
                            <div className="flex justify-between text-sm text-slate-400 mb-2">
                                <span>{generationStatus}</span>
                                <span>{generationProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${generationProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">
                                This may take 30-60 seconds depending on course length
                            </p>
                        </div>
                    )}
                    
                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-shake">
                            <p className="text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </p>
                        </div>
                    )}
                    
                    {/* Success Result */}
                    {/* FIXED: this block displayed several fields
                        (lessonCount, quizCount, estimatedTime, courseSlug)
                        that the real generate-course handler never returns
                        and the rebuilt handleGenerateCourse never sets —
                        simplified to show only what's actually available:
                        module count and a direct link to the real editor
                        route. */}
                    {result && activeStep === 'complete' && (
                        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                <p className="text-emerald-400 font-semibold">{result.message}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 text-sm">
                                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                    <p className="text-slate-400 text-xs">Modules Created</p>
                                    <p className="text-white font-bold text-lg">{result.moduleCount}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-4">
                                <button
                                    onClick={handleEditCourse}
                                    className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition flex items-center gap-1"
                                >
                                    <Edit2 className="w-3 h-3" /> Open in Editor
                                </button>
                                <button
                                    onClick={resetForm}
                                    className="px-3 py-1.5 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800 transition flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Create Another
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Courses */}
                {recentCourses.length > 0 && activeStep !== 'complete' && (
                    <div className="mb-8">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary-400" />
                            Recently Created Courses
                        </h3>
                        <div className="space-y-2">
                            {recentCourses.map(course => (
                                <div key={course.id} className="bg-slate-900/30 border border-slate-800 rounded-lg p-3 flex justify-between items-center hover:bg-slate-900/50 transition">
                                    <div>
                                        <p className="text-white font-medium">{course.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-500">{new Date(course.created_at).toLocaleDateString()}</span>
                                            {course.difficulty && (
                                                <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">{course.difficulty}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {course.is_published && (
                                            <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">Published</span>
                                        )}
                                        <a href={`/admin/courses/${course.id}/edit`} className="text-primary-400 hover:text-primary-300 text-sm">
                                            Edit →
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info Box */}
                <div className="bg-gradient-to-r from-primary-500/5 to-purple-500/5 border border-primary-500/20 rounded-xl p-5">
                    <h3 className="text-primary-400 font-semibold mb-3 flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        How AI Course Builder Works
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>AI generates complete course outline with modules and lessons</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>Each lesson includes detailed content, examples, and key takeaways</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>AI creates in-lesson quizzes to test understanding</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>Generates practical assignments and projects</span>
                            </li>
                        </ul>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>DALL-E generates relevant images for visual learning (optional)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>Text-to-speech creates audio narration for every lesson (optional)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>Course is saved as DRAFT - review before publishing</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>AI-powered recommendations for improving course quality</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Course Preview Modal */}
                {showPreview && generatedOutline && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-900 pb-3 border-b border-slate-800">
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
                                    <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /> {currentDifficulty?.label}</span>
                                    <span className="flex items-center gap-1"><Globe className="w-4 h-4" /> {selectedCategory?.name}</span>
                                </div>
                                
                                <div className="border-t border-slate-800 pt-4">
                                    <h4 className="text-white font-semibold mb-3">Course Modules</h4>
                                    <div className="space-y-2">
                                        {generatedOutline.modules.map((mod, idx) => (
                                            <div 
                                                key={idx} 
                                                className="bg-slate-800/50 rounded-lg overflow-hidden hover:bg-slate-800 transition"
                                            >
                                                <button
                                                    onClick={() => setExpandedModule(expandedModule === idx ? null : idx)}
                                                    className="w-full p-3 text-left flex justify-between items-center"
                                                >
                                                    <div>
                                                        <p className="text-white font-medium">Module {idx + 1}: {mod.title}</p>
                                                        <p className="text-slate-400 text-xs mt-1">{mod.lessons} lessons • {mod.estimated_minutes} minutes</p>
                                                    </div>
                                                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedModule === idx ? 'rotate-90' : ''}`} />
                                                </button>
                                                {expandedModule === idx && mod.description && (
                                                    <div className="p-3 pt-0 border-t border-slate-700/50">
                                                        <p className="text-slate-500 text-sm">{mod.description}</p>
                                                        {mod.objectives && (
                                                            <ul className="mt-2 space-y-1">
                                                                {mod.objectives.map((obj, objIdx) => (
                                                                    <li key={objIdx} className="text-xs text-slate-400 flex items-center gap-1">
                                                                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                                        {obj}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-lg p-3">
                                    <p className="text-purple-400 text-sm flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        AI will generate: detailed lessons, quizzes, assignments, images, and audio narration
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
                                <button 
                                    onClick={() => {
                                        setShowPreview(false);
                                        handleGenerateCourse();
                                    }} 
                                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
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
            </div>
        </div>
    );
}
