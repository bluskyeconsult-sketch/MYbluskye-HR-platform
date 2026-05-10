// src/components/course/ProgressDashboard.jsx
// Complete learning progress dashboard with analytics and monitoring

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    TrendingUp, Clock, Award, CheckCircle, BookOpen, 
    BarChart3, Calendar, Target, Brain, Zap, Star,
    Download, Share2, TrendingDown, Activity
} from 'lucide-react';

export default function ProgressDashboard({ userId, courseId }) {
    const [progress, setProgress] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('week');

    useEffect(() => {
        loadProgressData();
    }, [userId, courseId, selectedPeriod]);

    async function loadProgressData() {
        setLoading(true);
        
        // Get enrollment progress
        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select(`
                *,
                course:courses(*),
                lesson_progress(*)
            `)
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .single();

        // Get learning analytics
        const startDate = new Date();
        if (selectedPeriod === 'week') startDate.setDate(startDate.getDate() - 7);
        if (selectedPeriod === 'month') startDate.setDate(startDate.getDate() - 30);
        if (selectedPeriod === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

        const { data: learningEvents } = await supabase
            .from('learning_events')
            .select('*')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        // Calculate analytics
        const analyticsData = calculateLearningAnalytics(learningEvents, enrollment);
        
        // Get certificates
        const { data: certs } = await supabase
            .from('course_certificates')
            .select('*')
            .eq('user_id', userId)
            .eq('course_id', courseId);

        setProgress(enrollment);
        setAnalytics(analyticsData);
        setCertificates(certs || []);
        setLoading(false);
    }

    function calculateLearningAnalytics(events, enrollment) {
        if (!events || events.length === 0) {
            return {
                total_time_spent: 0,
                average_session_duration: 0,
                most_active_day: 'N/A',
                completion_velocity: 0,
                quiz_average: 0,
                retention_rate: 0
            };
        }

        const totalTime = events.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
        const avgSession = totalTime / events.length;
        
        // Day of week activity
        const dayActivity = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
        events.forEach(e => {
            const day = new Date(e.created_at).getDay();
            dayActivity[day]++;
        });
        const mostActiveDay = Object.keys(dayActivity).reduce((a, b) => dayActivity[a] > dayActivity[b] ? a : b);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Quiz performance
        const { data: quizAttempts } = supabase.from('quiz_attempts')
            .select('percentage')
            .eq('user_id', userId);
        
        const quizAvg = quizAttempts?.reduce((sum, q) => sum + q.percentage, 0) / (quizAttempts?.length || 1) || 0;
        
        // Completion velocity (progress per day)
        const daysSinceStart = Math.max(1, (new Date() - new Date(enrollment?.started_at)) / (1000 * 60 * 60 * 24));
        const completionVelocity = (enrollment?.progress_percent || 0) / daysSinceStart;

        return {
            total_time_spent: Math.round(totalTime / 60), // minutes
            average_session_duration: Math.round(avgSession / 60), // minutes
            most_active_day: dayNames[mostActiveDay],
            completion_velocity: completionVelocity.toFixed(1),
            quiz_average: Math.round(quizAvg),
            retention_rate: Math.min(100, Math.round((completionVelocity / 5) * 100))
        };
    }

    if (loading) {
        return <div className="animate-pulse space-y-4"><div className="h-32 bg-slate-800 rounded-lg"></div></div>;
    }

    return (
        <div className="space-y-6">
            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Progress</p>
                            <p className="text-2xl font-bold text-white">{progress?.progress_percent || 0}%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${progress?.progress_percent || 0}%` }}></div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Time Spent</p>
                            <p className="text-2xl font-bold text-white">{analytics?.total_time_spent || 0} min</p>
                        </div>
                        <Clock className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Quiz Average</p>
                            <p className="text-2xl font-bold text-white">{analytics?.quiz_average || 0}%</p>
                        </div>
                        <Brain className="w-8 h-8 text-purple-500" />
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Retention Rate</p>
                            <p className="text-2xl font-bold text-white">{analytics?.retention_rate || 0}%</p>
                        </div>
                        <Activity className="w-8 h-8 text-amber-500" />
                    </div>
                </div>
            </div>

            {/* Learning Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary-400" />
                        Learning Patterns
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Average Session</span>
                            <span className="text-white font-medium">{analytics?.average_session_duration || 0} minutes</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Most Active Day</span>
                            <span className="text-white font-medium">{analytics?.most_active_day}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Completion Velocity</span>
                            <span className="text-white font-medium">{analytics?.completion_velocity}% per day</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Award className="w-4 h-4 text-primary-400" />
                        Achievements
                    </h3>
                    <div className="space-y-3">
                        {progress?.progress_percent === 100 && (
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle className="w-4 h-4" />
                                <span>Course Completed!</span>
                            </div>
                        )}
                        {certificates.length > 0 && (
                            <div className="flex items-center gap-2 text-emerald-400">
                                <Award className="w-4 h-4" />
                                <span>{certificates.length} Certificate(s) Earned</span>
                            </div>
                        )}
                        {analytics?.quiz_average >= 80 && (
                            <div className="flex items-center gap-2 text-purple-400">
                                <Star className="w-4 h-4" />
                                <span>Top Performer</span>
                            </div>
                        )}
                        {analytics?.completion_velocity >= 10 && (
                            <div className="flex items-center gap-2 text-blue-400">
                                <Zap className="w-4 h-4" />
                                <span>Fast Learner</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Certificate Actions */}
            {progress?.progress_percent === 100 && certificates.length === 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
                    <Award className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-white font-semibold mb-2">Congratulations! You've completed the course!</h3>
                    <p className="text-slate-400 mb-4">Your certificate is being generated.</p>
                </div>
            )}

            {certificates.length > 0 && (
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-5">
                    <div className="flex flex-wrap gap-3 justify-between items-center">
                        <div>
                            <h3 className="text-white font-semibold">Your Certificate</h3>
                            <p className="text-slate-400 text-sm">Certificate ID: {certificates[0]?.certificate_id}</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                                <Download className="w-4 h-4" /> Download PDF
                            </button>
                            <button className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 flex items-center gap-2">
                                <Share2 className="w-4 h-4" /> Share on LinkedIn
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
