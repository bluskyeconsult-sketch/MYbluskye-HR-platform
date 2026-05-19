// src/pages/UserDashboard.jsx
// COMPLETE USER DASHBOARD - Safe loading with error handling, retry logic, and comprehensive stats

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Bot, Bell, Briefcase, BookOpen, User, 
    FileText, Award, TrendingUp, Loader2, AlertCircle,
    CheckCircle, Clock, Star, Users, MessageCircle
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
        savedJobs: 0
    });
    const [recentApplications, setRecentApplications] = useState([]);

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
                recentApps
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
                        .from('job_applications')
                        .select('*, jobs(title, company)')
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
                savedJobs: savedJobs || 0
            });
            setRecentApplications(recentApps || []);

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

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Welcome Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome back, {displayName}!
                    </h1>
                    <p className="text-slate-400">Track your activity, applications, and progress</p>
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
                </div>

                {/* Stats Cards - Row 2 (conditional) */}
                {(stats.activeEngagements > 0 || stats.enrolledCoursesCount > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        {stats.activeEngagements > 0 && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">Active Engagements</p>
                                        <p className="text-2xl font-bold text-white">{stats.activeEngagements}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                        <Users className="w-5 h-5 text-amber-400" />
                                    </div>
                                </div>
                                <Link to="/workforce/engagements" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                                    View work →
                                </Link>
                            </div>
                        )}
                        
                        {stats.enrolledCoursesCount > 0 && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">Courses Enrolled</p>
                                        <p className="text-2xl font-bold text-white">{stats.enrolledCoursesCount}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                        <BookOpen className="w-5 h-5 text-cyan-400" />
                                    </div>
                                </div>
                                <Link to="/learning" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                                    Continue learning →
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* Two Column Layout - Recent Applications & Recommended Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Recent Applications */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary-400" />
                            Recent Applications
                        </h3>
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
                                    <div key={app.id} className="border-b border-slate-800 pb-2 last:border-0">
                                        <p className="text-white text-sm font-medium">{app.jobs?.title || 'Unknown Position'}</p>
                                        <p className="text-slate-400 text-xs">{app.jobs?.company || 'Unknown Company'}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-slate-500 text-xs">{new Date(app.created_at).toLocaleDateString()}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                app.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {app.status || 'pending'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {recentApplications.length > 0 && (
                            <Link to="/applications" className="text-primary-400 text-sm hover:underline mt-3 inline-block">
                                View all applications →
                            </Link>
                        )}
                    </div>
                    
                    {/* Recommended Actions & Quick Links Combined */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary-400" />
                            Recommended Actions
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <ul className="space-y-2 text-sm">
                                    <li><Link to="/skills" className="text-slate-400 hover:text-primary-400 flex items-center gap-2">✓ Complete your skill profile</Link></li>
                                    <li><Link to="/assessments" className="text-slate-400 hover:text-primary-400 flex items-center gap-2">✓ Take a career assessment</Link></li>
                                    <li><Link to="/courses" className="text-slate-400 hover:text-primary-400 flex items-center gap-2">✓ Enroll in a course</Link></li>
                                    <li><Link to="/job-alerts" className="text-slate-400 hover:text-primary-400 flex items-center gap-2">✓ Set up job alerts</Link></li>
                                </ul>
                            </div>
                            <div>
                                <ul className="space-y-2 text-sm">
                                    <li><Link to="/profile" className="text-slate-400 hover:text-primary-400 flex items-center gap-2">👤 Edit Profile</Link></li>
                                    <li><Link to="/messages" className="text-slate-400 hover:text-primary-400 flex items-center gap-2">💬 Messages</Link></li>
                                    <li><Link to="/settings" className="text-slate-400 hover:text-primary-400 flex items-center gap-2">⚙️ Account Settings</Link></li>
                                    <li><Link to="/hire-va" className="text-slate-400 hover:text-primary-400 flex items-center gap-2">🤖 Hire Virtual Assistant</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tester Upgrade Banner */}
                {isTester && (
                    <div className="bg-gradient-to-r from-amber-900/20 to-amber-800/10 border border-amber-500/20 rounded-xl p-5">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-amber-400 font-semibold flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Tester Account - Upgrade to Full Access
                                </h3>
                                <p className="text-slate-400 text-sm">Get unlimited access to job applications, AI features, and more.</p>
                            </div>
                            <Link to="/upgrade" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition whitespace-nowrap">
                                Upgrade Now →
                            </Link>
                        </div>
                    </div>
                )}

                {/* Account Type Badge */}
                {profile?.user_type && profile.user_type !== 'tester' && (
                    <div className="mt-6 text-center">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                            profile.user_type === 'super_admin' ? 'bg-purple-500/20 text-purple-400' :
                            profile.user_type === 'admin' ? 'bg-red-500/20 text-red-400' :
                            profile.user_type === 'employer' ? 'bg-emerald-500/20 text-emerald-400' :
                            profile.user_type === 'business_owner' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-500/20 text-slate-400'
                        }`}>
                            {profile.user_type === 'super_admin' ? '👑 Super Admin' :
                             profile.user_type === 'admin' ? '🛡️ Admin' :
                             profile.user_type === 'employer' ? '🏢 Employer' :
                             profile.user_type === 'business_owner' ? '💼 Business Owner' :
                             '👤 Job Seeker'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
