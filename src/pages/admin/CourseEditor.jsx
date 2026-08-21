// src/pages/admin/CourseEditor.jsx - COMPLETE WITH AI
//
// FIXED (2026-08-07): used cover_image and featured_image as two separate
// fields, but CoursesPage.jsx, CourseDetail.jsx, and the corrected
// AdminCourses.jsx all use a single image_url field — any cover image set
// through this editor would never actually show up on the public course
// cards or detail page. Consolidated to image_url.
//
// FIXED (2026-08-08): generateCoverImage()/generateLessonAudio()/
// generateLessonIllustration() now call real backend actions
// (generateCourseImage/generateLessonAudio/generateLessonImage in
// api/index.js), using DALL-E 3 and OpenAI TTS. See that file for setup
// notes on the required 'course-audio' Supabase Storage bucket.
//
// Also cleaned up a no-op post-save state update (updateLesson call whose
// result was never visible before navigating away), and made the lesson
// action-button row wrap on narrow screens instead of assuming it always
// fits in one row.

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    Save, Eye, Plus, Trash2, Sparkles, Loader2, 
    Image, Volume2, FileText, ChevronDown, ChevronUp,
    X, Check, AlertCircle, Wand2
} from 'lucide-react';

export default function CourseEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState({
        title: '',
        description: '',
        category: '',
        difficulty: 'beginner',
        duration_hours: 2,
        is_published: false,
        is_free: false,
        price: 0,
        image_url: '',
        illustration_style: 'modern',
        has_audio: false
    });
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [generatingAudio, setGeneratingAudio] = useState(false);
    const [expandedLesson, setExpandedLesson] = useState(null);

    const categories = [
        'HR Fundamentals', 'Recruitment', 'Employee Relations', 
        'Performance Management', 'Compliance', 'Diversity & Inclusion', 
        'Talent Management', 'Leadership', 'Communication'
    ];

    useEffect(() => {
        if (id && id !== 'new') {
            loadCourse();
        }
    }, [id]);

    async function loadCourse() {
        const { data } = await supabase
            .from('courses')
            .select('*, course_lessons(*, course_audio(*), course_images(*))')
            .eq('id', id)
            .single();
        
        if (data) {
            setCourse(data);
            setLessons(data.course_lessons || []);
        }
        setLoading(false);
    }

    async function generateCoverImage() {
        if (!course.title) {
            alert('Please enter a course title first');
            return;
        }
        
        setGeneratingImage(true);
        try {
            // FIXED (2026-08-21): this action now requires admin auth
            // server-side (previously had none at all — reachable by
            // anyone who found the URL, with real DALL-E cost per call).
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=generateCourseImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    prompt: `Professional course cover image for: ${course.title}. Style: ${course.illustration_style}, professional, educational, clean design`
                })
            });
            
            const data = await response.json();
            if (data.success && data.imageUrl) {
                setCourse({ ...course, image_url: data.imageUrl });
                alert('✨ Cover image generated successfully!');
            } else {
                throw new Error(data.error || 'Generation failed');
            }
        } catch (error) {
            console.error('Image generation error:', error);
            alert('Failed to generate image: ' + error.message + '. If this mentions OpenAI API key, check your environment variables.');
        } finally {
            setGeneratingImage(false);
        }
    }

    async function generateLessonAudio(lessonId, content) {
        if (!content) {
            alert('Please add lesson content first');
            return;
        }
        
        setGeneratingAudio(true);
        try {
            // FIXED (2026-08-21): admin auth now required server-side.
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=generateLessonAudio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    text: content,
                    voice: 'professional',
                    lessonId: lessonId
                })
            });
            
            const data = await response.json();
            if (data.success && data.audioUrl) {
                const updatedLessons = lessons.map(l => 
                    l.id === lessonId ? { ...l, audio_url: data.audioUrl, has_audio: true } : l
                );
                setLessons(updatedLessons);
                
                await supabase.from('course_audio').insert({
                    lesson_id: lessonId,
                    audio_url: data.audioUrl,
                    duration_seconds: data.duration,
                    voice_type: 'professional',
                    generated_by: 'ai'
                });
                
                alert('🎵 Audio narration generated successfully!');
            } else {
                throw new Error(data.error || 'Generation failed');
            }
        } catch (error) {
            console.error('Audio generation error:', error);
            alert('Failed to generate audio: ' + error.message + '. If this mentions a storage bucket, see the file header for setup steps.');
        } finally {
            setGeneratingAudio(false);
        }
    }

    async function generateLessonIllustration(lessonId, title) {
        setGeneratingImage(true);
        try {
            // FIXED (2026-08-21): admin auth now required server-side.
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=generateLessonImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    prompt: `Educational illustration for lesson: ${title}. Professional, clean, engaging, modern design`
                })
            });
            
            const data = await response.json();
            if (data.success && data.imageUrl) {
                await supabase.from('course_images').insert({
                    lesson_id: lessonId,
                    image_url: data.imageUrl,
                    image_type: 'illustration',
                    generated_by: 'ai',
                    alt_text: title
                });
                
                alert('🎨 Illustration generated successfully!');
                await loadCourse();
            } else {
                throw new Error(data.error || 'Generation failed');
            }
        } catch (error) {
            console.error('Illustration generation error:', error);
            alert('Failed to generate illustration: ' + error.message);
        } finally {
            setGeneratingImage(false);
        }
    }

    async function addLesson() {
        const newLesson = {
            id: `temp_${Date.now()}`,
            title: 'New Lesson',
            content: '',
            sort_order: lessons.length,
            duration_minutes: 5,
            is_free: false
        };
        setLessons([...lessons, newLesson]);
        setExpandedLesson(newLesson.id);
    }

    async function updateLesson(lessonId, updates) {
        setLessons(lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l));
    }

    async function removeLesson(lessonId) {
        if (confirm('Delete this lesson?')) {
            setLessons(lessons.filter(l => l.id !== lessonId));
            if (!lessonId.startsWith('temp_')) {
                await supabase.from('course_lessons').delete().eq('id', lessonId);
            }
        }
    }

    async function saveCourse() {
        if (!course.title) {
            alert('Please enter a course title');
            return;
        }
        
        setSaving(true);
        
        try {
            let courseId = id;
            if (id === 'new') {
                const { data, error } = await supabase
                    .from('courses')
                    .insert({
                        title: course.title,
                        description: course.description,
                        category: course.category,
                        difficulty: course.difficulty,
                        duration_hours: course.duration_hours,
                        is_published: course.is_published,
                        is_free: course.is_free,
                        price: course.price,
                        image_url: course.image_url,
                        illustration_style: course.illustration_style,
                        has_audio: course.has_audio
                    })
                    .select()
                    .single();
                
                if (error) throw error;
                courseId = data.id;
            } else {
                await supabase
                    .from('courses')
                    .update(course)
                    .eq('id', id);
                courseId = id;
            }
            
            // FIXED: removed the pointless updateLesson(lesson.id, {id: data.id})
            // call that previously followed each insert here — its result was
            // never visible before navigating away right after this loop, so
            // it had no effect. A fresh load on return already picks up real ids.
            for (const lesson of lessons) {
                if (lesson.id.startsWith('temp_')) {
                    const { error } = await supabase
                        .from('course_lessons')
                        .insert({
                            course_id: courseId,
                            title: lesson.title,
                            content: lesson.content,
                            sort_order: lesson.sort_order,
                            duration_minutes: lesson.duration_minutes,
                            is_free: lesson.is_free
                        });
                    
                    if (error) throw error;
                } else {
                    await supabase
                        .from('course_lessons')
                        .update({
                            title: lesson.title,
                            content: lesson.content,
                            sort_order: lesson.sort_order,
                            duration_minutes: lesson.duration_minutes,
                            is_free: lesson.is_free
                        })
                        .eq('id', lesson.id);
                }
            }
            
            alert('Course saved successfully!');
            navigate('/admin/courses');
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving course: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8">
            <div className="max-w-5xl mx-auto px-4">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
                    <h1 className="text-2xl font-bold text-white">
                        {id === 'new' ? 'Create Course' : 'Edit Course'}
                    </h1>
                    <div className="flex gap-3 flex-wrap">
                        <button
                            onClick={() => setCourse({ ...course, is_published: !course.is_published })}
                            className={`px-4 py-2 rounded-lg transition ${
                                course.is_published 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-slate-700 text-slate-300'
                            }`}
                        >
                            {course.is_published ? 'Published' : 'Draft'}
                        </button>
                        <button
                            onClick={saveCourse}
                            disabled={saving}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Course
                        </button>
                    </div>
                </div>

                {/* Course Details */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Course Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Title *</label>
                            <input
                                type="text"
                                value={course.title}
                                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                placeholder="Course title"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Category</label>
                            <select
                                value={course.category}
                                onChange={(e) => setCourse({ ...course, category: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            >
                                <option value="">Select category</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Difficulty</label>
                            <select
                                value={course.difficulty}
                                onChange={(e) => setCourse({ ...course, difficulty: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Duration (hours)</label>
                            <input
                                type="number"
                                value={course.duration_hours}
                                onChange={(e) => setCourse({ ...course, duration_hours: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Description</label>
                            <textarea
                                rows={3}
                                value={course.description}
                                onChange={(e) => setCourse({ ...course, description: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                placeholder="Course description"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Cover Image URL</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={course.image_url}
                                    onChange={(e) => setCourse({ ...course, image_url: e.target.value })}
                                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    placeholder="https://..."
                                />
                                <button
                                    onClick={generateCoverImage}
                                    disabled={generatingImage}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0"
                                >
                                    {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    Generate AI
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Illustration Style</label>
                            <select
                                value={course.illustration_style}
                                onChange={(e) => setCourse({ ...course, illustration_style: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            >
                                <option value="modern">Modern</option>
                                <option value="corporate">Corporate</option>
                                <option value="minimal">Minimal</option>
                                <option value="illustrative">Illustrative</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Lessons Section */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white">Lessons</h2>
                        <button
                            onClick={addLesson}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 flex items-center gap-1 text-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Lesson
                        </button>
                    </div>

                    <div className="space-y-3">
                        {lessons.map((lesson, idx) => (
                            <div key={lesson.id} className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-slate-400">Lesson {idx + 1}</span>
                                        <span className="text-white font-medium">{lesson.title || 'Untitled'}</span>
                                        {lesson.has_audio && <Volume2 className="w-3 h-3 text-purple-400" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">{lesson.duration_minutes || 0} min</span>
                                        {expandedLesson === lesson.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </button>
                                
                                {expandedLesson === lesson.id && (
                                    <div className="p-4 border-t border-slate-700 space-y-3">
                                        <input
                                            type="text"
                                            value={lesson.title}
                                            onChange={(e) => updateLesson(lesson.id, { title: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                            placeholder="Lesson title"
                                        />
                                        <textarea
                                            rows={6}
                                            value={lesson.content}
                                            onChange={(e) => updateLesson(lesson.id, { content: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                                            placeholder="Lesson content (markdown supported)..."
                                        />
                                        {/* FIXED: was a single flex row assuming
                                            enough width for 4 items — now wraps
                                            on narrow screens instead of getting
                                            cut off. */}
                                        <div className="flex flex-wrap gap-3">
                                            <div className="w-full sm:w-auto sm:flex-1 min-w-[140px]">
                                                <label className="block text-xs text-slate-500 mb-1">Duration (minutes)</label>
                                                <input
                                                    type="number"
                                                    value={lesson.duration_minutes}
                                                    onChange={(e) => updateLesson(lesson.id, { duration_minutes: parseInt(e.target.value) })}
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                                />
                                            </div>
                                            <div className="flex flex-wrap items-end gap-2">
                                                <button
                                                    onClick={() => generateLessonAudio(lesson.id, lesson.content)}
                                                    disabled={generatingAudio}
                                                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center gap-1 text-sm"
                                                >
                                                    {generatingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                                                    Generate Audio
                                                </button>
                                                <button
                                                    onClick={() => generateLessonIllustration(lesson.id, lesson.title)}
                                                    disabled={generatingImage}
                                                    className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 flex items-center gap-1 text-sm"
                                                >
                                                    {generatingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
                                                    Generate Image
                                                </button>
                                                <button
                                                    onClick={() => removeLesson(lesson.id)}
                                                    className="px-3 py-2 bg-red-600/70 text-white rounded-lg hover:bg-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {lessons.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No lessons yet. Click "Add Lesson" to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
