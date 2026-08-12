// src/pages/CoursesPage.jsx
// ODUSBABA COURSES PAGE v3.1 - PRODUCTION READY
//
// FIXED (2026-08-07):
// 1. handleEnroll() was fully written and correct but never actually called
//    anywhere — the course cards were plain <Link>s with no onClick, so
//    clicking "Start Course" never enrolled anyone. Now calls handleEnroll()
//    on click for courses the user isn't enrolled in yet.
// 2. AI recommendations called /api/index?action=ai-course-recommendations,
//    which doesn't exist anywhere in api/index.js — always failed. Rewired
//    to use the real 'chat' action (same pattern as the assessmentService.js
//    fixes), asking for structured JSON and parsing it client-side. No
//    backend changes needed.
// 3. isCompleted() only checked enrollment.completed_at, but the confirmed
//    real update-course-progress handler never sets that field (or status)
//    — only progress. Now also checks progress === 100, matching the more
//    robust logic already used in LearnerDashboard.jsx. A small optional
//    patch to fix update-course-progress itself (so completed_at/status get
//    set properly) is provided separately.
//
// RESOLVED (2026-08-07): all course links in this file point to
// /learning/:id, which previously had no route or page — every click 404'd.
// Both are now fixed: a new src/pages/CourseDetail.jsx has been built and
// wired up in App.jsx.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    BookOpen, Clock, Users, Star, Loader2, Search, 
    ChevronRight, Calendar, TrendingUp, Sparkles, 
    CheckCircle, Play, Shield, Target, Zap, X,
    MessageCircle, GraduationCap, Brain, Trophy, Flame, Eye, AlertCircle
} from 'lucide-react';

export default function CoursesPage() {
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [user, setUser] = useState(null);
    const [showAIChat, setShowAIChat] = useState(false);
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiRecommendations, setAiRecommendations] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    const categories = [
        { id: 'all', name: 'All Courses', icon: BookOpen },
        { id: 'HR Fundamentals', name: 'HR Fundamentals', icon: Shield },
        { id: 'Recruitment', name: 'Recruitment', icon: Users },
        { id: 'Employee Relations', name: 'Employee Relations', icon: Target },
        { id: 'Performance Management', name: 'Performance Management', icon: TrendingUp },
        { id: 'Compliance', name: 'Compliance', icon: Shield },
        { id: 'Diversity', name: 'Diversity & Inclusion', icon: Users },
        { id: 'Talent Management', name: 'Talent Management', icon: Trophy }
    ];

    const sortOptions = [
        { id: 'newest', name: 'Newest First', icon: Calendar },
        { id: 'popular', name: 'Most Popular', icon: Flame },
        { id: 'rating', name: 'Highest Rated', icon: Star },
        { id: 'duration', name: 'Shortest First', icon: Clock }
    ];

    useEffect(() => {
        loadUserAndCourses();
    }, []);

    useEffect(() => {
        filterAndSortCourses();
    }, [courses, searchTerm, selectedCategory, sortBy]);

    async function loadUserAndCourses() {
        setLoading(true);
        setError(null);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });
            
            if (coursesError) throw coursesError;
            
            setCourses(coursesData || []);
            setFilteredCourses(coursesData || []);
            
            if (user) {
                const { data: enrollments, error: enrollError } = await supabase
                    .from('course_enrollments')
                    .select('course_id, progress, completed_at, status')
                    .eq('user_id', user.id);
                
                if (!enrollError && enrollments) {
                    setEnrolledCourses(enrollments);
                }
            }
        } catch (err) {
            console.error('Error loading courses:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleEnroll(courseId) {
        if (!user) {
            window.location.href = `/sign-in?redirect=/courses`;
            return;
        }

        // Avoid inserting a duplicate row if already enrolled
        if (isEnrolled(courseId)) return;

        try {
            const { error } = await supabase
                .from('course_enrollments')
                .insert({
                    user_id: user.id,
                    course_id: courseId,
                    enrolled_at: new Date().toISOString(),
                    progress: 0,
                    status: 'active'
                });
            
            if (error) throw error;
            
            const { data: enrollments } = await supabase
                .from('course_enrollments')
                .select('course_id, progress, completed_at, status')
                .eq('user_id', user.id);
            
            if (enrollments) {
                setEnrolledCourses(enrollments);
            }
        } catch (error) {
            console.error('Error enrolling in course:', error);
            // Not shown as an alert here since this now fires silently
            // alongside navigation — errors are logged for diagnosis.
        }
    }

    function filterAndSortCourses() {
        let filtered = [...courses];
        
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(c => 
                c.title?.toLowerCase().includes(query) ||
                c.description?.toLowerCase().includes(query)
            );
        }
        
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(c => c.category === selectedCategory);
        }
        
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'popular':
                    return (b.students_count || 0) - (a.students_count || 0);
                case 'rating':
                    return (b.rating || 0) - (a.rating || 0);
                case 'duration':
                    return (a.duration_hours || 999) - (b.duration_hours || 999);
                default:
                    return 0;
            }
        });
        
        setFilteredCourses(filtered);
    }

    function isEnrolled(courseId) {
        return enrolledCourses.some(e => e.course_id === courseId);
    }

    function getProgress(courseId) {
        const enrollment = enrolledCourses.find(e => e.course_id === courseId);
        return enrollment?.progress || 0;
    }

    function isCompleted(courseId) {
        const enrollment = enrolledCourses.find(e => e.course_id === courseId);
        if (!enrollment) return false;
        // FIXED: also check progress === 100, since the real backend never
        // sets completed_at or status — this matches LearnerDashboard.jsx's
        // more robust check.
        return enrollment.progress === 100 || !!enrollment.completed_at || enrollment.status === 'completed';
    }

    // FIXED: rewired to use the real 'chat' action instead of a nonexistent
    // 'ai-course-recommendations' action. Asks for structured JSON and
    // parses it client-side, same pattern already used successfully in
    // assessmentService.js.
    async function handleAIRecommendations() {
        if (!aiQuestion.trim()) {
            alert('Please describe your career goals');
            return;
        }
        
        setAiLoading(true);
        setAiRecommendations(null);
        
        try {
            const courseList = courses
                .map(c => `- ${c.id}: ${c.title} (${c.category || 'General'}) — ${c.description || ''}`)
                .join('\n');
            
            const systemPrompt = 'You are a career course advisor. Return ONLY valid JSON, no other text, no markdown code fences.';
            const userMessage = `A learner says: "${aiQuestion}"\n\nAvailable courses:\n${courseList}\n\nRecommend up to 4 of the most relevant courses from the list above. Return a JSON array like: [{"courseId": "the exact id from the list", "reason": "a short reason this fits"}]`;
            
            const response = await fetch('/api/index?action=chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    systemPrompt,
                    history: [],
                    temperature: 0.5,
                    maxTokens: 600
                })
            });
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            const cleaned = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
            const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            
            if (recommendations.length === 0) {
                throw new Error('No matching recommendations found');
            }
            
            setAiRecommendations(recommendations);
        } catch (error) {
            console.error('AI recommendation error:', error);
            alert('Failed to get recommendations. Please try again.');
        } finally {
            setAiLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Courses</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Professional Courses
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Advance your career with expert-led courses in HR, leadership, and professional development.
                    </p>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search courses by title or description..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {sortOptions.map(option => (
                                <option key={option.id} value={option.id}>{option.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {categories.map(cat => {
                        const Icon = cat.icon;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition flex items-center gap-1 ${
                                    selectedCategory === cat.id
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {Icon && <Icon className="w-3 h-3" />}
                                {cat.name}
                            </button>
                        );
                    })}
                </div>

                {/* Results Count & Clear Filters */}
                <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                    <p className="text-slate-400 text-sm">
                        Showing <span className="text-white font-medium">{filteredCourses.length}</span> of{' '}
                        <span className="text-white font-medium">{courses.length}</span> courses
                    </p>
                    {(searchTerm || selectedCategory !== 'all' || sortBy !== 'newest') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('all');
                                setSortBy('newest');
                            }}
                            className="text-sm text-primary-400 hover:text-primary-300 transition flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Clear Filters
                        </button>
                    )}
                </div>

                {/* Courses Grid */}
                {filteredCourses.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                        <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No courses found</h3>
                        <p className="text-slate-400">
                            {courses.length === 0 
                                ? 'No courses are currently available. Please check back soon.'
                                : `No courses match "${searchTerm}" or the selected filters.`}
                        </p>
                        {(searchTerm || selectedCategory !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedCategory('all');
                                }}
                                className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map(course => {
                            const enrolled = isEnrolled(course.id);
                            const progress = getProgress(course.id);
                            const completed = isCompleted(course.id);
                            
                            return (
                                <div key={course.id} className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all hover:-translate-y-1">
                                    {/* Course Thumbnail */}
                                    <div className="relative h-40 bg-gradient-to-br from-primary-500/20 to-sky-500/20">
                                        {course.image_url ? (
                                            <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center">
                                                <BookOpen className="w-12 h-12 text-primary-400 opacity-50" />
                                                <span className="text-xs text-primary-400/50 mt-2">Course Preview</span>
                                            </div>
                                        )}
                                        {completed && (
                                            <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500/90 rounded-lg text-white text-xs flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Completed
                                            </div>
                                        )}
                                        {course.is_featured && !completed && (
                                            <div className="absolute top-3 left-3 px-2 py-1 bg-amber-500/90 rounded-lg text-white text-xs flex items-center gap-1">
                                                <Star className="w-3 h-3" /> Featured
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-5">
                                        {/* Category Badge */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                                {course.category || 'Course'}
                                            </span>
                                            {enrolled && !completed && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                                                    {progress}% Complete
                                                </span>
                                            )}
                                        </div>
                                        
                                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-primary-400 transition">
                                            {course.title}
                                        </h3>
                                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">{course.description}</p>
                                        
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {course.duration_hours && (
                                                <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-300 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {course.duration_hours} hrs
                                                </span>
                                            )}
                                            {course.lessons_count > 0 && (
                                                <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-300 flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3" /> {course.lessons_count} lessons
                                                </span>
                                            )}
                                            {course.students_count > 0 && (
                                                <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-300 flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> {course.students_count}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Rating */}
                                        {course.rating > 0 && (
                                            <div className="flex items-center gap-1 mb-3">
                                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                <span className="text-sm text-white">{course.rating}</span>
                                                <span className="text-xs text-slate-500">({course.review_count || 0} reviews)</span>
                                            </div>
                                        )}
                                        
                                        {/* Progress Bar */}
                                        {enrolled && !completed && (
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                    <span>Progress</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-800 rounded-full h-1.5">
                                                    <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Action Buttons — FIXED: now calls handleEnroll() on click
                                            for non-enrolled courses, since it previously was never
                                            invoked anywhere in this file. */}
                                        <Link
                                            to={`/learning/${course.id}`}
                                            onClick={() => { if (!enrolled) handleEnroll(course.id); }}
                                        >
                                            <button className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2">
                                                {enrolled ? (
                                                    <>Continue Learning <ChevronRight className="w-4 h-4" /></>
                                                ) : (
                                                    <>Start Course <Play className="w-4 h-4" /></>
                                                )}
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* AI Learning Assistant CTA */}
                <div className="mt-12 p-6 bg-gradient-to-r from-primary-900/30 to-sky-900/30 border border-primary-500/30 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <Brain className="w-6 h-6 text-primary-400 animate-pulse" />
                        <h3 className="text-xl font-bold text-white">Need help choosing a course?</h3>
                    </div>
                    <p className="text-slate-400 mb-4">Chat with ODUSBABA AI to get personalized course recommendations based on your career goals.</p>
                    <button 
                        onClick={() => setShowAIChat(true)}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-flex items-center gap-2"
                    >
                        <MessageCircle className="w-4 h-4" /> Ask ODUSBABA AI
                    </button>
                </div>
            </div>
            
            {/* AI Chat Modal */}
            {showAIChat && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Brain className="w-5 h-5 text-primary-400" /> ODUSBABA AI Assistant
                            </h3>
                            <button onClick={() => {
                                setShowAIChat(false);
                                setAiRecommendations(null);
                                setAiQuestion('');
                            }} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {!aiRecommendations ? (
                            <>
                                <p className="text-slate-400 text-sm mb-4">
                                    Tell me about your career goals, and I'll recommend the best courses for you.
                                </p>
                                <textarea 
                                    value={aiQuestion}
                                    onChange={(e) => setAiQuestion(e.target.value)}
                                    rows={4} 
                                    placeholder="Example: I want to become a HR manager specializing in AI recruitment and need to develop skills in both HR compliance and AI technologies..."
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
                                />
                                <button 
                                    onClick={handleAIRecommendations}
                                    disabled={aiLoading}
                                    className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    Get Recommendations
                                </button>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 p-3 bg-primary-500/10 rounded-lg">
                                    <Sparkles className="w-4 h-4 text-primary-400" />
                                    <p className="text-primary-400 text-sm">Based on your goals, here are the best courses for you:</p>
                                </div>
                                
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {aiRecommendations.map((rec, idx) => {
                                        const course = courses.find(c => c.id === rec.courseId);
                                        if (!course) return null;
                                        
                                        return (
                                            <div key={idx} className="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-white font-medium">{course.title}</h4>
                                                        <p className="text-slate-400 text-xs mt-1">{rec.reason}</p>
                                                    </div>
                                                    <Link to={`/learning/${course.id}`}>
                                                        <button className="px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                                                            View
                                                        </button>
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        setAiRecommendations(null);
                                        setAiQuestion('');
                                    }}
                                    className="w-full py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                >
                                    Ask Another Question
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
