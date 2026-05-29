// src/pages/UserDashboard.jsx
// PROFESSIONAL USER DASHBOARD - Complete user statistics, activity tracking, and engagement metrics
// Features: Real-time stats, application tracking, course enrollment, VA credits, job alerts, and personalized recommendations

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Bot, Bell, Briefcase, BookOpen, User, 
    FileText, Award, TrendingUp, Loader2, AlertCircle,
    CheckCircle, Clock, Star, Users, MessageCircle,
    Calendar, Eye, ThumbsUp, Zap, Shield, CreditCard
} from 'lucide-react';

export default function UserDashboard() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        vaBalance: 0,
        jobAlertCount: 0,
        activeEngagements: 0,
        enrolledCoursesCount: 0,
        applications: 0,
        savedJobs: 0,
        profileViews: 0,
        skillsVerified: 0,
        completedAssessments: 0
    });
    const [recentApplications, setRecentApplications] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [recommendedJobs, setRecommendedJobs] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    // Safe API call wrapper with retry logic
    async function safeApiCall(apiCall, maxRetries = 2, fallbackValue = 0) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await apiCall();
                return result;
            } catch (err) {
                console.warn(`API call failed (attempt ${i + 1}):`, err);
                if (i === maxRetries - 1) return fallbackValue;
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        return fallbackValue;
    }

    // Get profile with retry and auto-create fallback
    async function getProfileWithRetry(userId, userEmail) {
        for (let i = 0; i < 3; i++) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (!error && data) return data;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // If still no profile, create one
        const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: userEmail,
                user_type: 'job_seeker',
                tier: 'free',
                country_code: 'GB',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (createError) throw createError;
        return newProfile;
    }

    async function loadDashboardData() {
        setLoading(true);
        setError(null);
        
        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            
            if (!user) {
                window.location.href = '/sign-in?redirect=/dashboard';
                return;
            }
            setUser(user);

            // Get profile with retry
            const profileData = await getProfileWithRetry(user.id, user.email);
            setProfile(profileData);

            // Load all stats in parallel with error handling
            const [
                vaBalance,
                jobAlertCount,
                activeEngagements,
                enrolledCoursesCount,
                applications,
                savedJobs,
                profileViews,
                skillsVerified,
                completedAssessments,
                recentApps,
                recentActivityData
            ] = await Promise.all([
                safeApiCall(async () => {
                    const { data } = await supabase
                        .from('va_credits')
                        .select('balance')
                        .eq('user_id', user.id)
                        .single();
                    return data?.balance || 0;
                }, 2, 0),
                
                safeApiCall(async () => {
                    const { data } = await supabase
                        .from('job_alerts')
                        .select('id', { count: 'exact' })
                        .eq('user_id', user.id);
                    return data?.length || 0;
                }, 2, 0),
                
                safeApiCall(async () => {
                    const { data } = await supabase
                        .from('engagements')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('status', 'active');
                    return data?.length || 0;
                }, 2, 0),
                
                safeApiCall(async () => {
                    const { count } = await supabase
                        .from('course_enrollments')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id);
                    return count || 0;
                }, 2, 0),
                
                safeApiCall(async () => {
                    const { count } = await supabase
                        .from('job_applications')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id);
                    return count || 0;
                }, 2, 0),
                
                safeApiCall(async () => {
                    const { count } = await supabase
                        .from('saved_jobs')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id);
                    return count || 0;
                }, 2, 0),
                
                safeApiCall(async () => {
                    const { data } = await supabase
                        .from('profile_views')
                        .select('count', { count: 'exact' })
                        .eq('profile_id', user.id);
                    return data?.length || 0;
                }, 2, 0),
                
                safeApiCall(async () => {
                    const { count } = await supabase
                        .from('user_skills')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .eq('verified', true);
                    return count || 0;
                }, 2, 0),
                
                safeApiCall(async () => {
                    const { count } = await supabase
                        .from('user_assessments')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .eq('status', 'completed');
                    return count || 0;
                }, 2, 0),
                
                safeApiCall(async () => {
                    const { data } = await supabase
                        .from('job_applications')
                        .select('*, jobs(title, company, location)')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(5);
                    return data || [];
                }, 2, []),
                
                safeApiCall(async () => {
                    const { data } = await supabase
                        .from('user_activity_logs')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(5);
                    return data || [];
                }, 2, [])
            ]);

            setStats({
                vaBalance: vaBalance || 0,
                jobAlertCount: jobAlertCount || 0,
                activeEngagements: activeEngagements || 0,
                enrolledCoursesCount: enrolledCoursesCount || 0,
                applications: applications || 0,
                savedJobs: savedJobs || 0,
                profileViews: profileViews || 0,
                skillsVerified: skillsVerified || 0,
                completedAssessments: completedAssessments || 0
            });
            setRecentApplications(recentApps || []);
            setRecentActivity(recentActivityData || []);

            // Load recommended jobs based on user's skills
            if (profileData?.skills && profileData.skills.length > 0) {
                const { data: jobs } = await supabase
                    .from('jobs')
                    .select('id, title, company, location, salary_min')
                    .eq('is_active', true)
                    .eq('compliance_status', 'approved')
                    .limit(3);
                setRecommendedJobs(jobs || []);
            }

        } catch (err) {
            console.error('Dashboard error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Dashboard</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button 
                        onClick={() => loadDashboardData()} 
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const displayName = profile?.full_name || user?.email?.split('@')[0];
    const isTester = profile?.user_type === 'tester';
    const isPremium = profile?.tier === 'professional' || profile?.tier === 'business';

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Welcome Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                Welcome back, {displayName}!
                            </h1>
                            <p className="text-slate-400">Track your activity, applications, and progress</p>
                        </div>
                        {!isPremium && !isTester && (
                            <Link to="/pricing" className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Upgrade to Premium
                            </Link>
                        )}
                    </div>
                </div>

                {/* Stats Cards - Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* VA Credits */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">VA Credits</p>
                                <p className="text-2xl font-bold text-white">{stats.vaBalance}</p>
                            </div>
                            <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                <Bot className="w-5 h-5 text-primary-400" />
                            </div>
                        </div>
                        <Link to="/hire-va" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            Use credits →
                        </Link>
                    </div>
                    
                    {/* Job Alerts */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Job Alerts</p>
                                <p className="text-2xl font-bold text-white">{stats.jobAlertCount}</p>
                            </div>
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                <Bell className="w-5 h-5 text-emerald-400" />
                            </div>
                        </div>
                        <Link to="/job-alerts" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            Manage alerts →
                        </Link>
                    </div>
                    
                    {/* Applications */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Applications</p>
                                <p className="text-2xl font-bold text-white">{stats.applications}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                <Briefcase className="w-5 h-5 text-blue-400" />
                            </div>
                        </div>
                        <Link to="/applications" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            View all →
                        </Link>
                    </div>
                    
                    {/* Profile Views */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Profile Views</p>
                                <p className="text-2xl font-bold text-white">{stats.profileViews}</p>
                            </div>
                            <div className="w-10 h-10 bg-sky-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                <Eye className="w-5 h-5 text-sky-400" />
                            </div>
                        </div>
                        <Link to="/profile" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            View profile →
                        </Link>
                    </div>
                </div>

                {/* Stats Cards - Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Saved Jobs */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Saved Jobs</p>
                                <p className="text-2xl font-bold text-white">{stats.savedJobs}</p>
                            </div>
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                <Star className="w-5 h-5 text-purple-400" />
                            </div>
                        </div>
                        <Link to="/saved-jobs" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            View saved →
                        </Link>
                    </div>
                    
                    {/* Skills Verified */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Verified Skills</p>
                                <p className="text-2xl font-bold text-white">{stats.skillsVerified}</p>
                            </div>
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                <Award className="w-5 h-5 text-emerald-400" />
                            </div>
                        </div>
                        <Link to="/skills" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            Manage skills →
                        </Link>
                    </div>
                    
                    {/* Completed Assessments */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Assessments</p>
                                <p className="text-2xl font-bold text-white">{stats.completedAssessments}</p>
                            </div>
                            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                <FileText className="w-5 h-5 text-amber-400" />
                            </div>
                        </div>
                        <Link to="/assessments" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            Take more →
                        </Link>
                    </div>
                    
                    {/* Active Engagements */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Active Work</p>
                                <p className="text-2xl font-bold text-white">{stats.activeEngagements}</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                <Users className="w-5 h-5 text-indigo-400" />
                            </div>
                        </div>
                        <Link to="/workforce/engagements" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            View work →
                        </Link>
                    </div>
                </div>

                {/* Courses Enrolled Section (if any) */}
                {stats.enrolledCoursesCount > 0 && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-8">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary-400" />
                            Your Learning Journey
                        </h3>
                        <p className="text-slate-400 text-sm">
                            You're enrolled in {stats.enrolledCoursesCount} course{stats.enrolledCoursesCount !== 1 ? 's' : ''}. 
                            <Link to="/learning" className="text-primary-400 hover:underline ml-1">Continue learning →</Link>
                        </p>
                    </div>
                )}

                {/* Two Column Layout - Recent Applications & Recommended Jobs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Recent Applications */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary-400" />
                                Recent Applications
                            </h3>
                            <Link to="/applications" className="text-xs text-primary-400 hover:underline">
                                View all
                            </Link>
                        </div>
                        {recentApplications.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-slate-400 text-sm">No applications yet.</p>
                                <Link to="/jobs" className="text-primary-400 text-sm hover:underline mt-2 inline-block">
                                    Browse jobs →
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentApplications.map(app => (
                                    <div key={app.id} className="border-b border-slate-800 pb-3 last:border-0">
                                        <p className="text-white text-sm font-medium">{app.jobs?.title || 'Unknown Position'}</p>
                                        <p className="text-slate-400 text-xs">{app.jobs?.company || 'Unknown Company'}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-slate-500" />
                                                <p className="text-slate-500 text-xs">{new Date(app.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                app.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                                                app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>
                                                {app.status || 'pending'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Recommended Jobs */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary-400" />
                                Recommended For You
                            </h3>
                            <Link to="/jobs" className="text-xs text-primary-400 hover:underline">
                                View all
                            </Link>
                        </div>
                        {recommendedJobs.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-slate-400 text-sm">Complete your profile to get recommendations.</p>
                                <Link to="/profile" className="text-primary-400 text-sm hover:underline mt-2 inline-block">
                                    Complete profile →
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recommendedJobs.map(job => (
                                    <div key={job.id} className="border-b border-slate-800 pb-3 last:border-0">
                                        <p className="text-white text-sm font-medium">{job.title}</p>
                                        <p className="text-slate-400 text-xs">{job.company}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-slate-500 text-xs">{job.location || 'Remote possible'}</p>
                                            {job.salary_min && (
                                                <p className="text-emerald-400 text-xs">${job.salary_min.toLocaleString()}+</p>
                                            )}
                                        </div>
                                        <Link to={`/jobs/${job.id}`} className="text-primary-400 text-xs hover:underline mt-1 inline-block">
                                            View details →
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                    <Link to="/profile" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                        <User className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                        <span className="text-white text-xs">Profile</span>
                    </Link>
                    <Link to="/skills" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                        <Award className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                        <span className="text-white text-xs">Skills</span>
                    </Link>
                    <Link to="/assessments" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                        <FileText className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                        <span className="text-white text-xs">Assessments</span>
                    </Link>
                    <Link to="/messages" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                        <MessageCircle className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                        <span className="text-white text-xs">Messages</span>
                    </Link>
                    <Link to="/hire-va" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                        <Bot className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                        <span className="text-white text-xs">Hire VA</span>
                    </Link>
                    <Link to="/settings" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition group">
                        <Shield className="w-5 h-5 text-primary-400 mx-auto mb-1 group-hover:scale-110 transition" />
                        <span className="text-white text-xs">Settings</span>
                    </Link>
                </div>

                {/* Tester Upgrade Banner */}
                {isTester && (
                    <div className="bg-gradient-to-r from-amber-900/20 to-amber-800/10 border border-amber-500/20 rounded-xl p-5">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-amber-400 font-semibold">Tester Account - Upgrade to Full Access</h3>
                                    <p className="text-slate-400 text-sm">Get unlimited applications, AI features, and premium support.</p>
                                </div>
                            </div>
                            <Link to="/pricing" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition whitespace-nowrap flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                Upgrade Now →
                            </Link>
                        </div>
                    </div>
                )}

                {/* Account Type Badge */}
                {!isTester && (
                    <div className="mt-6 text-center">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                            profile?.user_type === 'super_admin' ? 'bg-purple-500/20 text-purple-400' :
                            profile?.user_type === 'admin' ? 'bg-red-500/20 text-red-400' :
                            profile?.user_type === 'employer' ? 'bg-emerald-500/20 text-emerald-400' :
                            profile?.user_type === 'business_owner' ? 'bg-amber-500/20 text-amber-400' :
                            isPremium ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-500/20 text-slate-400'
                        }`}>
                            {profile?.user_type === 'super_admin' ? '👑 Super Admin' :
                             profile?.user_type === 'admin' ? '🛡️ Admin' :
                             profile?.user_type === 'employer' ? '🏢 Employer' :
                             profile?.user_type === 'business_owner' ? '💼 Business Owner' :
                             isPremium ? '⭐ Premium Member' :
                             '👤 Job Seeker'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
