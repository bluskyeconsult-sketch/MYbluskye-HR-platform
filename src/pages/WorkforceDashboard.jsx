// src/pages/WorkforceDashboard.jsx
// Unified Workforce Dashboard - Complete integration of all marketplace features

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getWorkforceProfile, getProfessionalStatistics } from '../services/workforceService';
import WorkforceOnboarding from '../components/workforce/WorkforceOnboarding';
import ServiceRequestForm from '../components/workforce/ServiceRequestForm';
import ProposalsList from '../components/workforce/ProposalsList';
import EngagementsDashboard from '../components/workforce/EngagementsDashboard';
import { 
    User, Briefcase, FileText, Star, TrendingUp, Clock, 
    CheckCircle, DollarSign, Calendar, Award, Users, Settings,
    PlusCircle, MessageCircle, Bell, Activity, Loader2
} from 'lucide-react';

export default function WorkforceDashboard() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [userType, setUserType] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
        loadUserAndProfile();
    }, []);

    async function loadUserAndProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/sign-in?redirect=/workforce/dashboard';
            return;
        }
        setUser(user);

        const { data: userProfile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();
        
        setUserType(userProfile?.user_type);

        const workforceProfile = await getWorkforceProfile(user.id);
        
        // FIXED (2026-08-23): checked userProfile?.user_type === 'professional'
        // — but 'professional' is a subscription TIER name, not a real
        // user_type value anywhere in this system (confirmed real values:
        // job_seeker, employer, business_owner, admin, super_admin). This
        // meant the onboarding prompt below never triggered for anyone,
        // and the same broken value flows into userType, which also
        // silently broke the "My Proposals" tab visibility check further
        // down and EngagementsDashboard's professional-side logic (which,
        // correctly, only ever checks === 'employer' and treats
        // everything else as the professional side — matching that same
        // pattern here instead of the nonexistent 'professional' value).
        if (!workforceProfile && userProfile?.user_type !== 'employer') {
            setNeedsOnboarding(true);
        } else {
            setProfile(workforceProfile);
            if (workforceProfile) {
                const statsData = await getProfessionalStatistics(workforceProfile.id);
                setStats(statsData);
            }
        }
        
        setLoading(false);
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'requests', label: 'My Requests', icon: FileText, employerOnly: true },
        { id: 'proposals', label: 'My Proposals', icon: MessageCircle, professionalOnly: true },
        { id: 'engagements', label: 'Engagements', icon: Briefcase },
        { id: 'profile', label: 'Profile', icon: User }
    ];

    const visibleTabs = tabs.filter(tab => {
        if (tab.employerOnly && userType !== 'employer') return false;
        // FIXED (2026-08-23): same fix as above — was userType !==
        // 'professional', a value that never exists, so this tab never
        // showed for anyone.
        if (tab.professionalOnly && userType === 'employer') return false;
        return true;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (needsOnboarding) {
        return (
            <div className="min-h-screen bg-slate-950 py-12">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome to the Workforce Marketplace</h1>
                        <p className="text-slate-400">Complete your profile to start getting hired</p>
                    </div>
                    <WorkforceOnboarding onComplete={() => {
                        setNeedsOnboarding(false);
                        loadUserAndProfile();
                    }} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Workforce Marketplace</h1>
                        <p className="text-slate-400">Connect with opportunities and grow your business</p>
                    </div>
                    {userType === 'employer' && (
                        <button
                            onClick={() => setShowRequestModal(true)}
                            className="mt-4 md:mt-0 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                        >
                            <PlusCircle className="w-4 h-4" /> Post a Service Request
                        </button>
                    )}
                </div>

                {/* Stats Cards */}
                {stats && userType !== 'employer' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Briefcase className="w-8 h-8 text-primary-400" />
                                <div>
                                    <div className="text-2xl font-bold text-white">{stats.total_engagements}</div>
                                    <div className="text-sm text-slate-400">Total Jobs</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                                <div>
                                    <div className="text-2xl font-bold text-white">{stats.completed_engagements}</div>
                                    <div className="text-sm text-slate-400">Completed</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Star className="w-8 h-8 text-yellow-400" />
                                <div>
                                    <div className="text-2xl font-bold text-white">{stats.avg_rating}</div>
                                    <div className="text-sm text-slate-400">Rating</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-8 h-8 text-amber-400" />
                                <div>
                                    <div className="text-2xl font-bold text-white">{stats.completion_rate}%</div>
                                    <div className="text-sm text-slate-400">Success Rate</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="border-b border-slate-800 mb-6">
                    <div className="flex flex-wrap gap-1">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                    activeTab === tab.id
                                        ? 'bg-primary-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <tab.icon className="w-4 h-4 inline mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-r from-primary-900/20 to-slate-900 rounded-xl p-6 border border-primary-500/20">
                                <h2 className="text-xl font-bold text-white mb-2">
                                    {userType === 'employer' 
                                        ? 'Find Top Talent for Your Projects'
                                        : 'Find Your Next Opportunity'}
                                </h2>
                                <p className="text-slate-400 mb-4">
                                    {userType === 'employer'
                                        ? 'Post service requests and connect with verified professionals'
                                        : 'Browse open service requests and submit proposals to get hired'}
                                </p>
                                {userType === 'employer' && (
                                    <button
                                        onClick={() => setShowRequestModal(true)}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        Post a Service Request →
                                    </button>
                                )}
                                {userType !== 'employer' && (
                                    <button
                                        onClick={() => setActiveTab('proposals')}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        Browse Opportunities →
                                    </button>
                                )}
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary-400" />
                                    Recent Activity
                                </h3>
                                <div className="text-center py-8 text-slate-400">
                                    <Bell className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                    <p>No recent activity to display</p>
                                    <p className="text-sm">Complete actions to see your activity here</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'requests' && userType === 'employer' && (
                        <ServiceRequestsList employerId={user?.id} />
                    )}

                    {activeTab === 'proposals' && userType !== 'employer' && profile && (
                        <ProposalsList professionalId={profile.id} />
                    )}

                    {activeTab === 'engagements' && (
                        <EngagementsDashboard userId={user?.id} userType={userType} />
                    )}

                    {activeTab === 'profile' && profile && (
                        <WorkforceProfileEdit profile={profile} onUpdate={loadUserAndProfile} />
                    )}
                </div>

                {/* Service Request Modal */}
                {showRequestModal && (
                    <ServiceRequestForm
                        onClose={() => setShowRequestModal(false)}
                        onSuccess={() => {
                            setShowRequestModal(false);
                            alert('Service request posted successfully!');
                        }}
                    />
                )}
            </div>
        </div>
    );
}

// ServiceRequestsList Component
function ServiceRequestsList({ employerId }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRequests();
    }, [employerId]);

    async function loadRequests() {
        const { data, error } = await supabase
            .from('service_requests')
            .select('*, proposals(count)')
            .eq('employer_id', employerId)
            .order('created_at', { ascending: false });
        
        if (!error) setRequests(data || []);
        setLoading(false);
    }

    if (loading) return <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

    if (requests.length === 0) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No service requests yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {requests.map(req => (
                <div key={req.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-white font-semibold">{req.title}</h3>
                            <p className="text-slate-400 text-sm mt-1">{req.description?.substring(0, 100)}...</p>
                            <div className="flex gap-3 mt-2 text-xs text-slate-500">
                                <span>💰 ${req.budget_min} - ${req.budget_max}</span>
                                <span>📝 {req.proposals?.[0]?.count || 0} proposals</span>
                                <span>📅 {new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                                req.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                            }`}>
                                {req.status}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// WorkforceProfileEdit Component
function WorkforceProfileEdit({ profile, onUpdate }) {
    const [formData, setFormData] = useState({
        headline: profile?.headline || '',
        bio: profile?.bio || '',
        hourly_rate: profile?.hourly_rate || '',
        is_available: profile?.is_available !== false
    });
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        
        const { error } = await supabase
            .from('workforce_profiles')
            .update({
                headline: formData.headline,
                bio: formData.bio,
                hourly_rate: parseFloat(formData.hourly_rate),
                is_available: formData.is_available,
                updated_at: new Date().toISOString()
            })
            .eq('id', profile.id);
        
        if (!error) {
            alert('Profile updated successfully!');
            if (onUpdate) onUpdate();
        } else {
            alert('Error updating profile');
        }
        setSaving(false);
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Edit Profile</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Professional Headline</label>
                    <input
                        type="text"
                        value={formData.headline}
                        onChange={(e) => setFormData({...formData, headline: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Bio</label>
                    <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        rows="4"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Hourly Rate ($)</label>
                    <input
                        type="number"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                </div>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.is_available}
                        onChange={(e) => setFormData({...formData, is_available: e.target.checked})}
                        className="w-4 h-4"
                    />
                    <span className="text-white">Available for work</span>
                </label>
                <button type="submit" disabled={saving} className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </div>
    );
}
