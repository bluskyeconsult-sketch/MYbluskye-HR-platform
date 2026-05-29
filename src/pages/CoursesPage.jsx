// src/pages/CoursesPage.jsx
// COMPLETE PROFESSIONAL COURSES PAGE - With unified API, search, filters, enrollment tracking, and AI-powered learning

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    BookOpen, Clock, Users, Star, Loader2, Search, Award, 
    Filter, ChevronRight, Calendar, TrendingUp, Sparkles, 
    CheckCircle, Play, Download, Shield, Target, Zap, X,
    MessageCircle, GraduationCap, Brain, ExternalLink,
    Trophy, Flame, Eye, ThumbsUp, AlertCircle
} from 'lucide-react';

export default function CoursesPage() {
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [enrolledCourses, setEnrolledCourses] = useState({});
    const [user, setUser] = useState(null);
    const [showAIChat, setShowAIChat] = useState(false);
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiRecommendations, setAiRecommendations] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    const levels = [
        { id: 'all', name: 'All Levels', color: 'primary' },
        { id: 'beginner', name: 'Beginner', color: 'emerald' },
        { id: 'intermediate', name: 'Intermediate', color: 'blue' },
        { id: 'advanced', name: 'Advanced', color: 'purple' }
    ];

    const categories = [
        { id: 'all', name: 'All Categories', icon: BookOpen, color: 'slate' },
        { id: 'hr', name: 'HR & Compliance', icon: Shield, color: 'blue' },
        { id: 'ai', name: 'AI & Technology', icon: Sparkles, color: 'purple' },
        { id: 'leadership', name: 'Leadership', icon: Target, color: 'amber' },
        { id: 'soft-skills', name: 'Soft Skills', icon: Users, color: 'emerald' },
        { id: 'career', name: 'Career Development', icon: TrendingUp, color: 'cyan' }
    ];

    const sortOptions = [
        { id: 'newest', name: 'Newest First', icon: Calendar },
        { id: 'popular', name: 'Most Popular', icon: Flame },
        { id: 'rating', name: 'Highest Rated', icon: Star },
        { id: 'duration', name: 'Shortest First', icon: Clock }
    ];

    useEffect(() => {
        loadUser();
        loadCourses();
        loadEnrolledCourses();
    }, []);

    useEffect(() => {
        filterAndSortCourses();
    }, [courses, searchTerm, selectedLevel, selectedCategory, sortBy]);

    async function loadUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    }

    async function loadCourses() {
        setLoading(true);
        setError(null);
        
        try {
            // ✅ Using unified API endpoint
            const response = await fetch('/api/index?action=courses-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'published' })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            const coursesData = result.data || [];
            setCourses(coursesData);
            setFilteredCourses(coursesData);
            
        } catch (err) {
            console.error('Error loading courses:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadEnrolledCourses() {
        if (!user) return;
        
        try {
            const response = await fetch('/api/index?action=user-enrollments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            
            const result = await response.json();
            
            if (result.success && result.data) {
                const enrolled = {};
                result.data.forEach(e => {
                    enrolled[e.course_id] = { 
                        enrolled: true, 
                        progress: e.progress || 0,
                        completed: !!e.completed_at,
                        started_at: e.started_at
                    };
                });
                setEnrolledCourses(enrolled);
            }
        } catch (err) {
            console.error('Error loading enrollments:', err);
        }
    }

    async function handleEnroll(courseId) {
        if (!user) {
            window.location.href = `/sign-in?redirect=/courses`;
            return;
        }

        try {
            const response = await fetch('/api/index?action=course-enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, courseId })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            await loadEnrolledCourses();
            alert('✅ Successfully enrolled in course!');
        } catch (error) {
            alert('❌ Error enrolling in course: ' + error.message);
        }
    }

    async function handleContinue(courseId) {
        window.location.href = `/courses/${courseId}/learn`;
    }

    async function handleAIRecommendations() {
        if (!aiQuestion.trim()) {
            alert('Please describe your career goals');
            return;
        }
        
        setAiLoading(true);
        setAiRecommendations(null);
        
        try {
            const response = await fetch('/api/index?action=ai-course-recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: aiQuestion,
                    availableCourses: courses.map(c => ({
                        id: c.id,
                        title: c.title,
                        description: c.description,
                        category: c.category,
                        level: c.level
                    }))
                })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            setAiRecommendations(result.recommendations);
        } catch (error) {
            console.error('AI recommendation error:', error);
            alert('Failed to get recommendations. Please try again.');
        } finally {
            setAiLoading(false);
        }
    }

    function filterAndSortCourses() {
        let filtered = [...courses];
        
        // Search filter
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(c => 
                c.title?.toLowerCase().includes(query) ||
                c.description?.toLowerCase().includes(query)
            );
        }
        
        // Level filter
        if (selectedLevel !== 'all') {
            filtered = filtered.filter(c => c.level?.toLowerCase() === selectedLevel);
        }
        
        // Category filter
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(c => c.category === selectedCategory);
        }
        
        // Sorting
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

    function getLevelColor(level) {
        const colors = {
            beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            intermediate: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            advanced: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
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

    function getCategoryIcon(category) {
        const icons = {
            hr: Shield,
            ai: Sparkles,
            leadership: Target,
            'soft-skills': Users,
            career: TrendingUp
        };
        const Icon = icons[category] || BookOpen;
        return <Icon className="w-4 h-4" />;
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
                        ODUSBABA Learning Center
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Master new skills with AI-powered courses. Learn at your own pace.
                    </p>
                </div>

                {/* Search, Filters, and Sort */}
                <div className="flex flex-col lg:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search courses by title or description..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {levels.map(level => (
                                <option key={level.id} value={level.id}>{level.name}</option>
                            ))}
                        </select>
                        
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {sortOptions.map(option => (
                                <option key={option.id} value={option.id}>{option.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition flex items-center gap-1 ${
                                selectedCategory === cat.id
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            {getCategoryIcon(cat.id)}
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Results Count & Clear Filters */}
                <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                    <p className="text-slate-400 text-sm">
                        Showing <span className="text-white font-medium">{filteredCourses.length}</span> of{' '}
                        <span className="text-white font-medium">{courses.length}</span> courses
                    </p>
                    {(searchTerm || selectedLevel !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedLevel('all');
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
                        {(searchTerm || selectedLevel !== 'all' || selectedCategory !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedLevel('all');
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
                            const isEnrolled = enrolledCourses[course.id]?.enrolled;
                            const progress = enrolledCourses[course.id]?.progress || 0;
                            const isCompleted = enrolledCourses[course.id]?.completed;
                            
                            return (
                                <div key={course.id} className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all hover:-translate-y-1">
                                    {/* Course Thumbnail */}
                                    <div className="relative h-40 bg-gradient-to-br from-primary-500/20 to-sky-500/20">
                                        {course.thumbnail_url ? (
                                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center">
                                                <BookOpen className="w-12 h-12 text-primary-400 opacity-50" />
                                                <span className="text-xs text-primary-400/50 mt-2">Course Preview</span>
                                            </div>
                                        )}
                                        {isCompleted && (
                                            <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500/90 rounded-lg text-white text-xs flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Completed
                                            </div>
                                        )}
                                        {course.is_featured && !isCompleted && (
                                            <div className="absolute top-3 left-3 px-2 py-1 bg-amber-500/90 rounded-lg text-white text-xs flex items-center gap-1">
                                                <Star className="w-3 h-3" /> Featured
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-5">
                                        {/* Category Badge */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 flex items-center gap-1">
                                                {getCategoryIcon(course.category)} {categories.find(c => c.id === course.category)?.name || 'Course'}
                                            </span>
                                        </div>
                                        
                                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-primary-400 transition">
                                            {course.title}
                                        </h3>
                                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">{course.description}</p>
                                        
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getLevelColor(course.level)}`}>
                                                {getLevelBadge(course.level)}
                                            </span>
                                            {course.duration_hours && (
                                                <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-300 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {course.duration_hours} hrs
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
                                        {isEnrolled && !isCompleted && (
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
                                        
                                        {/* Action Buttons */}
                                        {isEnrolled ? (
                                            <button
                                                onClick={() => handleContinue(course.id)}
                                                className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2"
                                            >
                                                {isCompleted ? (
                                                    <>
                                                        <Award className="w-4 h-4" /> View Certificate
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-4 h-4" /> Continue Learning
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Link to={`/courses/${course.slug || course.id}`} className="flex-1">
                                                    <button className="w-full py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition">
                                                        Details
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleEnroll(course.id)}
                                                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                                                >
                                                    <Sparkles className="w-4 h-4" /> Enroll
                                                </button>
                                            </div>
                                        )}
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
                                                    <Link to={`/courses/${course.slug || course.id}`}>
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
