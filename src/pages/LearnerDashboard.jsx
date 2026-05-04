import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Award, TrendingUp, Play, Circle, CheckCircle, Download } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LearnerDashboard() {
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [recommendedCourses, setRecommendedCourses] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, totalHours: 0 });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUserAndData();
    }, []);

    async function loadUserAndData() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
            await loadEnrolledCourses(user.id);
            await loadRecommendedCourses();
            await loadCertificates(user.id);
        }
        setLoading(false);
    }

    async function loadEnrolledCourses(userId) {
        const { data: enrollments } = await supabase
            .from('course_enrollments')
            .select('*, courses:course_id(*)')
            .eq('user_id', userId)
            .order('last_accessed_at', { ascending: false });
        
        setEnrolledCourses(enrollments || []);
        
        const completed = enrollments?.filter(e => e.status === 'completed').length || 0;
        const inProgress = enrollments?.filter(e => e.status === 'active').length || 0;
        const totalHours = enrollments?.reduce((sum, e) => sum + (e.courses?.duration_minutes || 0) / 60, 0) || 0;
        
        setStats({
            total: enrollments?.length || 0,
            completed,
            inProgress,
            totalHours: totalHours.toFixed(1)
        });
    }

    async function loadRecommendedCourses() {
        const { data } = await supabase
            .from('courses')
            .select('*')
            .eq('status', 'published')
            .eq('is_featured', true)
            .order('rating', { ascending: false })
            .limit(3);
        
        setRecommendedCourses(data || []);
    }

    async function loadCertificates(userId) {
        const { data } = await supabase
            .from('course_certificates')
            .select('*, courses:enrollments!inner(courses:course_id(*))')
            .eq('enrollments.user_id', userId);
        
        setCertificates(data || []);
    }

    async function continueCourse(enrollmentId, courseId, lessonId) {
        window.location.href = `/courses/${courseId}/learn/${lessonId}?enrollment=${enrollmentId}`;
    }

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading dashboard...</div></div>;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">My Learning</h1>
                    <p className="text-slate-400">Track your course progress and continue learning</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-primary-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.total}</div>
                                <div className="text-sm text-slate-400">Enrolled Courses</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.completed}</div>
                                <div className="text-sm text-slate-400">Completed</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Play className="w-8 h-8 text-sky-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.inProgress}</div>
                                <div className="text-sm text-slate-400">In Progress</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8 text-amber-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.totalHours}</div>
                                <div className="text-sm text-slate-400">Hours Learned</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* My Courses Section */}
                <h2 className="text-2xl font-bold text-white mb-4">My Courses</h2>
                {enrolledCourses.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                        <p className="text-slate-400">You haven't enrolled in any courses yet.</p>
                        <Link to="/courses" className="inline-block mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
                            Browse Courses
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4 mb-12">
                        {enrolledCourses.map(enrollment => (
                            <div key={enrollment.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold text-white">{enrollment.courses?.title}</h3>
                                        <p className="text-slate-400 text-sm mt-1">{enrollment.courses?.description}</p>
                                        <div className="flex items-center gap-4 mt-3">
                                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                                <Clock className="w-4 h-4" /> {Math.ceil((enrollment.courses?.duration_minutes || 0) / 60)} hours
                                            </div>
                                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                                <Award className="w-4 h-4" /> {enrollment.progress_percent}% complete
                                            </div>
                                        </div>
                                        <div className="mt-3 w-full bg-slate-700 rounded-full h-2 max-w-md">
                                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${enrollment.progress_percent}%` }}></div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => continueCourse(enrollment.id, enrollment.course_id, enrollment.last_lesson_id)}
                                        className="px-5 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap"
                                    >
                                        {enrollment.progress_percent === 100 ? 'Review Course' : 'Continue Learning'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Recommended Courses */}
                <h2 className="text-2xl font-bold text-white mb-4">Recommended for You</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recommendedCourses.map(course => (
                        <div key={course.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all">
                            <h3 className="text-lg font-semibold text-white">{course.title}</h3>
                            <p className="text-slate-400 text-sm mt-1 line-clamp-2">{course.description}</p>
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-400">★</span>
                                    <span className="text-sm text-white">{course.rating}</span>
                                    <span className="text-xs text-slate-500">({course.review_count})</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                    <Clock className="w-4 h-4" /> {Math.ceil(course.duration_minutes / 60)}h
                                </div>
                            </div>
                            <Link to={`/courses/${course.id}`} className="mt-4 block text-center py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
                                View Course
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Certificates Section */}
                {certificates.length > 0 && (
                    <>
                        <h2 className="text-2xl font-bold text-white mt-12 mb-4">My Certificates</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {certificates.map(cert => (
                                <div key={cert.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-white font-semibold">{cert.enrollments?.courses?.title}</h3>
                                        <p className="text-xs text-slate-500">Certificate #{cert.certificate_number}</p>
                                        <p className="text-xs text-slate-500">Issued: {new Date(cert.issued_at).toLocaleDateString()}</p>
                                    </div>
                                    <a href={cert.download_url} download className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2">
                                        <Download className="w-4 h-4" /> Download
                                    </a>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
