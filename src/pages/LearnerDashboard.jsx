// src/pages/LearnerDashboard.jsx
// ODUSBABA LEARNER DASHBOARD v3.0 - PRODUCTION READY
// ✅ Complete course progress tracking
// ✅ Recommended courses
// ✅ Certificate management
// ✅ Enhanced stats and filtering

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    BookOpen, Clock, Play, CheckCircle, Loader2, Award, 
    TrendingUp, Calendar, Star, Users, Filter, Search, 
    ChevronRight, Trophy, Sparkles, GraduationCap, Brain,
    AlertCircle, Download, Circle, Target, Zap, Globe
} from 'lucide-react';

export default function LearnerDashboard() {
    const [enrollments, setEnrollments] = useState([]);
    const [filteredEnrollments, setFilteredEnrollments] = useState([]);
    const [recommendedCourses, setRecommendedCourses] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalHours: 0,
        averageProgress: 0
    });

    useEffect(() => {
        loadDashboard();
    }, []);

    useEffect(() => {
        filterEnrollments();
    }, [enrollments, searchQuery, statusFilter]);

    async function loadDashboard() {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/sign-in?redirect=/learning';
                return;
            }
            setUser(user);

            // Get enrollments with course details
            const { data: enrollmentsData, error: enrollError } = await supabase
                .from('course_enrollments')
                .select('*, course:courses(*)')
                .eq('user_id', user.id)
                .order('enrolled_at', { ascending: false });

            if (enrollError) throw enrollError;

            setEnrollments(enrollmentsData || []);
            setFilteredEnrollments(enrollmentsData || []);

            // Calculate stats
            const totalCourses = enrollmentsData?.length || 0;
            const completedCourses = enrollmentsData?.filter(e => e.progress === 100 || e.status === 'completed').length || 0;
            const inProgressCourses = enrollmentsData?.filter(e => e.progress > 0 && e.progress < 100).length || 0;
            const totalHours = (enrollmentsData || []).reduce((acc, e) => acc + (e.course?.duration_hours || 0), 0);
            const averageProgress = totalCourses > 0 
                ? Math.round(enrollmentsData.reduce((acc, e) => acc + (e.progress || 0), 0) / totalCourses) 
                : 0;

            setStats({
                totalCourses,
                completedCourses,
                inProgressCourses,
                totalHours,
                averageProgress
            });

            // Load recommended courses (exclude enrolled ones)
            const enrolledCourseIds = new Set((enrollmentsData || []).map(e => e.course_id));
            
            const { data: recommendedData, error: recError } = await supabase
                .from('courses')
                .select('*')
                .eq('is_published', true)
                .limit(6);

            if (!recError && recommendedData) {
                const filtered = recommendedData.filter(c => !enrolledCourseIds.has(c.id));
                setRecommendedCourses(filtered.slice(0, 3));
            }

            // Load certificates
            const { data: certData, error: certError } = await supabase
                .from('certificates')
                .select('*')
                .eq('user_id', user.id)
                .order('issued_at', { ascending: false });

            if (!certError && certData) {
                setCertificates(certData);
            }

        } catch (err) {
            console.error('Error loading dashboard:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function filterEnrollments() {
        let filtered = [...enrollments];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(enrollment => 
                enrollment.course?.title?.toLowerCase().includes(query) ||
                enrollment.course?.description?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter === 'active') {
            filtered = filtered.filter(e => e.progress > 0 && e.progress < 100);
        } else if (statusFilter === 'completed') {
            filtered = filtered.filter(e => e.progress === 100 || e.status === 'completed');
        }

        setFilteredEnrollments(filtered);
    }

    function getProgressColor(percent) {
        if (percent >= 80) return 'bg-emerald-500';
        if (percent >= 50) return 'bg-blue-500';
        if (percent >= 25) return 'bg-amber-500';
        return 'bg-slate-500';
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
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
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <GraduationCap className="w-8 h-8 text-primary-400" />
                        <h1 className="text-3xl font-bold text-white">My Learning Dashboard</h1>
                    </div>
                    <p className="text-slate-400">Track your course progress and continue learning</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Enrolled Courses</p>
                                <p className="text-2xl font-bold text-white">{stats.totalCourses}</p>
                            </div>
                            <BookOpen className="w-8 h-8 text-primary-400 opacity-50 group-hover:opacity-100 transition" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Completed</p>
                                <p className="text-2xl font-bold text-white">{stats.completedCourses}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-emerald-400 opacity-50 group-hover:opacity-100 transition" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">In Progress</p>
                                <p className="text-2xl font-bold text-white">{stats.inProgressCourses}</p>
                            </div>
                            <Play className="w-8 h-8 text-sky-400 opacity-50 group-hover:opacity-100 transition" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Hours</p>
                                <p className="text-2xl font-bold text-white">{stats.totalHours}</p>
                            </div>
                            <Clock className="w-8 h-8 text-amber-400 opacity-50 group-hover:opacity-100 transition" />
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
                    
                    {enrollments.length === 0 ? (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No Courses Yet</h3>
                            <p className="text-slate-400 mb-6">You haven't enrolled in any courses yet.</p>
                            <Link to="/courses" className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-flex items-center gap-2">
                                Browse Courses
                            </Link>
                        </div>
                    ) : filteredEnrollments.length === 0 ? (
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
                            {filteredEnrollments.map(enrollment => {
                                const progress = enrollment.progress || 0;
                                const isCompleted = progress === 100 || enrollment.status === 'completed';
                                const course = enrollment.course;
                                
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
                                                        <Clock className="w-4 h-4" /> {course?.duration_hours || 0} hours
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Target className="w-4 h-4" /> {progress}% complete
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
                                            <Link to={`/learning/${course?.id}`}>
                                                <button className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/20 whitespace-nowrap">
                                                    {isCompleted ? (
                                                        <><Star className="w-4 h-4" /> Review Course</>
                                                    ) : (
                                                        <><Play className="w-4 h-4" /> Continue Learning</>
                                                    )}
                                                </button>
                                            </Link>
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
                                            <span className="text-sm text-white">{course.rating || 4.5}</span>
                                            <span className="text-xs text-slate-500">({course.review_count || 0})</span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition line-clamp-1">{course.title}</h3>
                                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{course.description}</p>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-1 text-sm text-slate-500">
                                            <Clock className="w-4 h-4" /> {course.duration_hours || 0}h
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-slate-500">
                                            <Users className="w-4 h-4" /> {course.students_count || 0} students
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
                    <div className="mb-12">
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
                                        <p className="text-xs text-slate-500 mt-1">Certificate #{cert.certificate_number || cert.id.slice(0, 8)}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Issued: {formatDate(cert.issued_at || cert.created_at)}
                                        </p>
                                    </div>
                                    {cert.download_url && (
                                        <a 
                                            href={cert.download_url} 
                                            download 
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" /> Download
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Learning Summary Footer */}
                {stats.totalCourses > 0 && (
                    <div className="mt-8 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                        <div className="flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                <p className="text-slate-400 text-sm">
                                    You've completed <span className="text-white font-semibold">{stats.completedCourses}</span> out of <span className="text-white font-semibold">{stats.totalCourses}</span> courses
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
