// src/pages/LearnerDashboard.jsx
// COMPLETE PROFESSIONAL LEARNER DASHBOARD - With unified API, progress tracking, and enhanced UI

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
    BookOpen, Clock, Award, TrendingUp, Play, Circle, CheckCircle, 
    Download, Star, Users, Calendar, BarChart3, Target, Zap,
    Loader2, AlertCircle, Filter, Search, ChevronRight, Trophy,
    Sparkles, GraduationCap, Brain, FileText, Globe
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LearnerDashboard() {
    const navigate = useNavigate();
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [recommendedCourses, setRecommendedCourses] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, totalHours: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUserAndData();
    }, []);

    useEffect(() => {
        filterCourses();
    }, [enrolledCourses, searchQuery, statusFilter]);

    async function loadUserAndData() {
        try {
            setLoading(true);
            setError(null);
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/sign-in?redirect=/learning');
                return;
            }
            setUser(user);
            
            // ✅ Using unified API endpoints
            const [coursesRes, recommendedRes, certificatesRes] = await Promise.all([
                fetch('/api/index?action=learner-courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                }),
                fetch('/api/index?action=learner-recommended', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }),
                fetch('/api/index?action=learner-certificates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                })
            ]);
            
            const coursesData = await coursesRes.json();
            const recommendedData = await recommendedRes.json();
            const certificatesData = await certificatesRes.json();
            
            if (!coursesData.success) throw new Error(coursesData.error);
            if (!recommendedData.success) throw new Error(recommendedData.error);
            if (!certificatesData.success) throw new Error(certificatesData.error);
            
            const enrollments = coursesData.data || [];
            setEnrolledCourses(enrollments);
            
            const completed = enrollments.filter(e => e.status === 'completed').length;
            const inProgress = enrollments.filter(e => e.status === 'active').length;
            const totalHours = enrollments.reduce((sum, e) => sum + ((e.courses?.duration_minutes || 0) / 60), 0);
            
            setStats({
                total: enrollments.length,
                completed,
                inProgress,
                totalHours: totalHours.toFixed(1)
            });
            
            setRecommendedCourses(recommendedData.data || []);
            setCertificates(certificatesData.data || []);
            
        } catch (err) {
            console.error('Error loading learner data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function filterCourses() {
        let filtered = [...enrolledCourses];
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(enrollment => 
                enrollment.courses?.title?.toLowerCase().includes(query) ||
                enrollment.courses?.description?.toLowerCase().includes(query)
            );
        }
        
        // Status filter
        if (statusFilter === 'active') {
            filtered = filtered.filter(e => e.status === 'active' && e.progress_percent < 100);
        } else if (statusFilter === 'completed') {
            filtered = filtered.filter(e => e.status === 'completed' || e.progress_percent === 100);
        }
        
        setFilteredCourses(filtered);
    }

    function continueCourse(enrollmentId, courseId, lessonId) {
        navigate(`/courses/${courseId}/learn/${lessonId || 'intro'}?enrollment=${enrollmentId}`);
    }

    function getProgressColor(percent) {
        if (percent >= 80) return 'bg-emerald-500';
        if (percent >= 50) return 'bg-blue-500';
        if (percent >= 25) return 'bg-amber-500';
        return 'bg-slate-500';
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
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
                    <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Dashboard</h1>
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
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-7xl mx-auto px-4 py-12">
                
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <GraduationCap className="w-8 h-8 text-primary-400" />
                        <h1 className="text-3xl font-bold text-white">My Learning</h1>
                    </div>
                    <p className="text-slate-400">Track your course progress and continue learning</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-primary-400 opacity-70 group-hover:opacity-100 transition" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.total}</div>
                                <div className="text-sm text-slate-400">Enrolled Courses</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-emerald-400 opacity-70 group-hover:opacity-100 transition" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.completed}</div>
                                <div className="text-sm text-slate-400">Completed</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center gap-3">
                            <Play className="w-8 h-8 text-sky-400 opacity-70 group-hover:opacity-100 transition" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.inProgress}</div>
                                <div className="text-sm text-slate-400">In Progress</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8 text-amber-400 opacity-70 group-hover:opacity-100 transition" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.totalHours}</div>
                                <div className="text-sm text-slate-400">Hours Learned</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* My Courses Section */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <h2 className="text-2xl font-bold text-white">My Courses</h2>
                        
                        {/* Search and Filter */}
                        <div className="flex gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search courses..."
                                    className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All Courses</option>
                                <option value="active">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    </div>
                    
                    {enrolledCourses.length === 0 ? (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No Courses Yet</h3>
                            <p className="text-slate-400 mb-6">You haven't enrolled in any courses yet.</p>
                            <Link to="/courses" className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-flex items-center gap-2">
                                Browse Courses
                            </Link>
                        </div>
                    ) : filteredCourses.length === 0 ? (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                            <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No Matching Courses</h3>
                            <p className="text-slate-400 mb-6">No courses match your search criteria.</p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                }}
                                className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredCourses.map(enrollment => {
                                const progress = enrollment.progress_percent || 0;
                                const isCompleted = progress === 100 || enrollment.status === 'completed';
                                const course = enrollment.courses;
                                
                                return (
                                    <div key={enrollment.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all group">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <h3 className="text-xl font-semibold text-white group-hover:text-primary-400 transition">
                                                        {course?.title}
                                                    </h3>
                                                    {isCompleted ? (
                                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                                                            <CheckCircle className="w-3 h-3" /> Completed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400">
                                                            <Play className="w-3 h-3" /> In Progress
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-slate-400 text-sm line-clamp-2">{course?.description}</p>
                                                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" /> {Math.ceil((course?.duration_minutes || 0) / 60)} hours
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Award className="w-4 h-4" /> {progress}% complete
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" /> Enrolled: {formatDate(enrollment.enrolled_at)}
                                                    </span>
                                                </div>
                                                <div className="mt-3 w-full bg-slate-700 rounded-full h-2 max-w-md">
                                                    <div 
                                                        className={`${getProgressColor(progress)} h-2 rounded-full transition-all duration-500`} 
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => continueCourse(enrollment.id, course?.id, enrollment.last_lesson_id)}
                                                className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/20 whitespace-nowrap"
                                            >
                                                {isCompleted ? (
                                                    <><Star className="w-4 h-4" /> Review Course</>
                                                ) : (
                                                    <><Play className="w-4 h-4" /> Continue Learning</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recommended Courses */}
                {recommendedCourses.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-primary-400" />
                            <h2 className="text-2xl font-bold text-white">Recommended for You</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recommendedCourses.map(course => (
                                <div key={course.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                            <Brain className="w-5 h-5 text-primary-400" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            <span className="text-sm text-white">{course.rating}</span>
                                            <span className="text-xs text-slate-500">({course.review_count})</span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition line-clamp-1">{course.title}</h3>
                                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{course.description}</p>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-1 text-sm text-slate-500">
                                            <Clock className="w-4 h-4" /> {Math.ceil(course.duration_minutes / 60)}h
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-slate-500">
                                            <Users className="w-4 h-4" /> {course.enrollment_count || 0} students
                                        </div>
                                    </div>
                                    <Link to={`/courses/${course.id}`} className="mt-4 block text-center py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
                                        View Course
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Certificates Section */}
                {certificates.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-5 h-5 text-amber-400" />
                            <h2 className="text-2xl font-bold text-white">My Certificates</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {certificates.map(cert => (
                                <div key={cert.id} className="bg-gradient-to-r from-slate-900/50 to-slate-800/30 border border-slate-800 rounded-xl p-4 flex justify-between items-center hover:border-amber-500/30 transition group">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Award className="w-5 h-5 text-amber-400" />
                                            <h3 className="text-white font-semibold">{cert.course_title}</h3>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Certificate #{cert.certificate_number}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Issued: {formatDate(cert.issued_at)}
                                        </p>
                                    </div>
                                    <a 
                                        href={cert.download_url} 
                                        download 
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" /> Download
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Learning Summary Footer */}
                {stats.total > 0 && (
                    <div className="mt-8 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                        <div className="flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                <p className="text-slate-400 text-sm">
                                    You've completed <span className="text-white font-semibold">{stats.completed}</span> out of <span className="text-white font-semibold">{stats.total}</span> courses
                                </p>
                            </div>
                            <Link to="/courses" className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                                Explore more courses <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
