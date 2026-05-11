// src/pages/UserDashboard.jsx
// COMPLETE USER DASHBOARD - Copy and replace entire file

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getVACredits } from '../services/aiVirtualAssistantService';
import { getUserJobAlerts } from '../services/jobAlertService';
import { Bot, Bell, Briefcase, BookOpen, User, Settings, FileText, Award, TrendingUp, Clock } from 'lucide-react';

export default function UserDashboard() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [vaBalance, setVaBalance] = useState(0);
    const [jobAlertCount, setJobAlertCount] = useState(0);
    const [activeEngagements, setActiveEngagements] = useState(0);
    const [enrolledCoursesCount, setEnrolledCoursesCount] = useState(0);
    const [recentApplications, setRecentApplications] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/sign-in?redirect=/dashboard';
            return;
        }
        setUser(user);
        
        // Load profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        setProfile(profileData);
        
        // Load VA credits
        try {
            const vaCredits = await getVACredits(user.id);
            setVaBalance(vaCredits.balance);
        } catch (err) {
            setVaBalance(0);
        }
        
        // Load job alerts count
        try {
            const alerts = await getUserJobAlerts(user.id);
            setJobAlertCount(alerts.length);
        } catch (err) {
            setJobAlertCount(0);
        }
        
        // Load active engagements
        try {
            const { data: engagements } = await supabase
                .from('engagements')
                .select('id')
                .eq('employer_id', user.id)
                .eq('status', 'active');
            setActiveEngagements(engagements?.length || 0);
        } catch (err) {
            setActiveEngagements(0);
        }
        
        // Load enrolled courses count
        try {
            const { count } = await supabase
                .from('course_enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);
            setEnrolledCoursesCount(count || 0);
        } catch (err) {
            setEnrolledCoursesCount(0);
        }
        
        // Load recent job applications
        try {
            const { data: applications } = await supabase
                .from('job_applications')
                .select('*, jobs(title, company)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentApplications(applications || []);
        } catch (err) {
            setRecentApplications([]);
        }
        
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Welcome Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome back, {profile?.full_name || user?.email?.split('@')[0]}!
                    </h1>
                    <p className="text-slate-400">Track your activity, applications, and progress</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">VA Credits</p>
                                <p className="text-2xl font-bold text-white">{vaBalance}</p>
                            </div>
                            <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                                <Bot className="w-5 h-5 text-primary-400" />
                            </div>
                        </div>
                        <Link to="/hire-va" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            Use credits →
                        </Link>
                    </div>
                    
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Job Alerts</p>
                                <p className="text-2xl font-bold text-white">{jobAlertCount}</p>
                            </div>
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                <Bell className="w-5 h-5 text-emerald-400" />
                            </div>
                        </div>
                        <Link to="/job-alerts" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            Manage alerts →
                        </Link>
                    </div>
                    
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Active Engagements</p>
                                <p className="text-2xl font-bold text-white">{activeEngagements}</p>
                            </div>
                            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-amber-400" />
                            </div>
                        </div>
                        <Link to="/workforce/engagements" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            View work →
                        </Link>
                    </div>
                    
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Courses Enrolled</p>
                                <p className="text-2xl font-bold text-white">{enrolledCoursesCount}</p>
                            </div>
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-purple-400" />
                            </div>
                        </div>
                        <Link to="/learning" className="text-xs text-primary-400 hover:underline mt-2 inline-block">
                            Continue learning →
                        </Link>
                    </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary-400" />
                            Recent Applications
                        </h3>
                        {recentApplications.length === 0 ? (
                            <p className="text-slate-400 text-sm">No applications yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {recentApplications.map(app => (
                                    <div key={app.id} className="border-b border-slate-800 pb-2 last:border-0">
                                        <p className="text-white text-sm font-medium">{app.jobs?.title}</p>
                                        <p className="text-slate-400 text-xs">{app.jobs?.company}</p>
                                        <p className="text-slate-500 text-xs mt-1">{new Date(app.created_at).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Link to="/applications" className="text-primary-400 text-sm hover:underline mt-3 inline-block">
                            View all applications →
                        </Link>
                    </div>
                    
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary-400" />
                            Recommended Actions
                        </h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/skills" className="text-slate-400 hover:text-primary-400">✓ Complete your skill profile</Link></li>
                            <li><Link to="/assessments" className="text-slate-400 hover:text-primary-400">✓ Take a career assessment</Link></li>
                            <li><Link to="/courses" className="text-slate-400 hover:text-primary-400">✓ Enroll in a course</Link></li>
                            <li><Link to="/job-alerts" className="text-slate-400 hover:text-primary-400">✓ Set up job alerts</Link></li>
                        </ul>
                    </div>
                    
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-primary-400" />
                            Quick Links
                        </h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/profile" className="text-slate-400 hover:text-primary-400">Edit Profile</Link></li>
                            <li><Link to="/saved-jobs" className="text-slate-400 hover:text-primary-400">Saved Jobs</Link></li>
                            <li><Link to="/messages" className="text-slate-400 hover:text-primary-400">Messages</Link></li>
                            <li><Link to="/settings" className="text-slate-400 hover:text-primary-400">Account Settings</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Tester Upgrade Banner */}
                {profile?.user_type === 'tester' && (
                    <div className="bg-gradient-to-r from-amber-900/20 to-amber-800/10 border border-amber-500/20 rounded-xl p-5">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-amber-400 font-semibold">Upgrade to Registered User</h3>
                                <p className="text-slate-400 text-sm">Get unlimited access to job applications and more features.</p>
                            </div>
                            <Link to="/upgrade" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition whitespace-nowrap">
                                Upgrade Now →
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
