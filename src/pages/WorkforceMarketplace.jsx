// src/pages/WorkforceMarketplace.jsx
// ODUSBABA WORKFORCE MARKETPLACE v5.1 - PRODUCTION READY
//
// FIXED (2026-08-07): destructured `userTier` from useCapability(), but the
// real hook returns `tier`, not `userTier` — same bug found in JobsPage.jsx,
// except here it wasn't dead code: it silently broke the "Sign in to
// Contact" vs "Upgrade to Contact" message shown to visitors (userTier was
// always undefined, so it always showed the upgrade message, even for
// signed-out visitors who should be told to sign in instead).
//
// RESOLVED (2026-08-07): handleContact() called /api/index?action=contact-worker,
// which doesn't exist anywhere, and there was no in-app messaging table to
// build a real equivalent against. Rather than invent a new messages table
// (which would need a Supabase migration), this now sends a real email via
// the already-confirmed-working `email` action and `notification` template
// — the skill's joined `profiles.email` field is already being fetched by
// the marketplace query, so no new data is needed. This is email-based
// contact, not real-time in-app chat; if in-app threaded messaging is
// wanted instead, that's a bigger feature needing a new table.
//
// FLAGGED, NOT FIXED (architecture decision needed — see project brief):
// 1. This page queries `workforce_skills` directly. A separate, more
//    sophisticated data model (`workforce_profiles` + `service_requests` +
//    `proposals` + `engagements`) exists in workforceService.js and is used
//    by WorkforceOnboarding.jsx, ProposalsList.jsx, and EngagementsDashboard.jsx
//    — but this page never reads from that model at all. Anyone completing
//    the onboarding flow creates a profile that's invisible here.
// 2. GateGuard (imported from ../components/GateGuard) hasn't been reviewed
//    yet — contents unconfirmed. If this file doesn't build for you, that's
//    likely why — let me know and I'll build a minimal one, but I don't
//    want to guess-overwrite a real working file.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCapability } from '../hooks/useCapability';
import GateGuard from '../components/GateGuard';
import { 
    Users, Search, Star, Award, Shield, CheckCircle, 
    Loader2, AlertCircle, Mail, X, Code, Palette, Brain, Database,
    MessageCircle, Briefcase, TrendingUp
} from 'lucide-react';

// Skill categories
const SKILL_CATEGORIES = [
    { id: 'all', name: 'All Categories', icon: Briefcase },
    { id: 'technology', name: 'Technology', icon: Code },
    { id: 'hr', name: 'Human Resources', icon: Users },
    { id: 'management', name: 'Management', icon: Award },
    { id: 'creative', name: 'Creative', icon: Palette },
    { id: 'admin', name: 'Administrative', icon: Briefcase },
    { id: 'ai', name: 'AI & ML', icon: Brain },
    { id: 'data', name: 'Data Science', icon: Database },
    { id: 'marketing', name: 'Marketing', icon: TrendingUp },
    { id: 'design', name: 'Design', icon: Palette },
    { id: 'leadership', name: 'Leadership', icon: Award },
    { id: 'legal', name: 'Legal', icon: Shield }
];

export default function WorkforceMarketplace() {
    // FIXED: `tier` (not `userTier`) is the real field returned by useCapability()
    const { capabilities, tier, canSync } = useCapability();
    const [skills, setSkills] = useState([]);
    const [filteredSkills, setFilteredSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('trust_score');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [contactMessage, setContactMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [stats, setStats] = useState({ total: 0, verified: 0, avgTrustScore: 0 });
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadMarketplaceData();
        getCurrentUser();
    }, []);

    useEffect(() => {
        filterAndSortSkills();
    }, [skills, searchQuery, selectedCategory, sortBy]);

    async function getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    }

    async function loadMarketplaceData() {
        try {
            setLoading(true);
            setError(null);
            
            // Direct Supabase query for reliability
            const { data, error: dbError } = await supabase
                .from('workforce_skills')
                .select('*, profiles(full_name, avatar_url, email, location, bio)')
                .eq('status', 'approved')
                .order('trust_score', { ascending: false });
            
            if (dbError) throw dbError;
            
            const skillsData = data || [];
            setSkills(skillsData);
            
            // Calculate stats
            const verifiedCount = skillsData.filter(s => s.verification_status === 'verified' || s.status === 'approved').length;
            const avgScore = skillsData.reduce((sum, s) => sum + (s.trust_score || 0), 0) / (skillsData.length || 1);
            
            setStats({
                total: skillsData.length,
                verified: verifiedCount,
                avgTrustScore: avgScore.toFixed(1)
            });
            
        } catch (err) {
            console.error('Error loading marketplace:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function filterAndSortSkills() {
        let filtered = [...skills];
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(skill => 
                skill.skill_name?.toLowerCase().includes(query) ||
                (skill.category && skill.category.toLowerCase().includes(query)) ||
                skill.profiles?.full_name?.toLowerCase().includes(query)
            );
        }
        
        // Category filter
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(skill => skill.category === selectedCategory);
        }
        
        // Sorting
        filtered.sort((a, b) => {
            if (sortBy === 'trust_score') return (b.trust_score || 0) - (a.trust_score || 0);
            if (sortBy === 'years_experience') return (b.years_experience || 0) - (a.years_experience || 0);
            if (sortBy === 'name') return (a.skill_name || '').localeCompare(b.skill_name || '');
            return 0;
        });
        
        setFilteredSkills(filtered);
    }

    function getTrustScoreColor(score) {
        if (score >= 90) return 'text-emerald-400';
        if (score >= 75) return 'text-blue-400';
        if (score >= 60) return 'text-amber-400';
        return 'text-slate-400';
    }

    function getTrustScoreBadge(score) {
        if (score >= 90) return { label: 'Elite', color: 'bg-emerald-500/20 text-emerald-400' };
        if (score >= 75) return { label: 'Verified Pro', color: 'bg-blue-500/20 text-blue-400' };
        if (score >= 60) return { label: 'Rising Talent', color: 'bg-amber-500/20 text-amber-400' };
        return { label: 'Emerging', color: 'bg-slate-500/20 text-slate-400' };
    }

    async function handleContact(skill) {
        if (!user) {
            alert('Please sign in to contact professionals');
            window.location.href = '/sign-in?redirect=/workforce';
            return;
        }
        
        if (!contactMessage.trim()) {
            alert('Please enter a message');
            return;
        }
        
        setSending(true);
        
        try {
            // FIXED: sends a real email via the confirmed-working `email`
            // action instead of a nonexistent contact-worker action. Uses
            // the recipient's email already present on the joined profile.
            const recipientEmail = skill.profiles?.email;
            if (!recipientEmail) {
                throw new Error('This professional has no contact email on file.');
            }
            
            const senderName = user.email?.split('@')[0] || 'A professional';
            
            const response = await fetch('/api/index?action=email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipientEmail,
                    type: 'notification',
                    templateData: {
                        subject: `New message from ${senderName} via ODUSBABA Workforce Marketplace`,
                        message: contactMessage,
                        actionLink: `${window.location.origin}/sign-in`,
                        actionText: 'Sign In to Reply'
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Message sent successfully!');
                setSelectedSkill(null);
                setContactMessage('');
            } else {
                alert(data.error || 'Failed to send message');
            }
        } catch (err) {
            console.error('Contact error:', err);
            alert(err.message || 'Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    }

    function getCategoryIcon(category) {
        const icons = {
            technology: '💻',
            hr: '👔',
            management: '📊',
            creative: '🎨',
            admin: '📋',
            ai: '🤖',
            data: '📈',
            marketing: '📢',
            design: '🎨',
            leadership: '👑',
            legal: '⚖️'
        };
        return icons[category] || '📌';
    }

    const canContact = canSync('contact_worker');

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
                    <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Marketplace</h1>
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
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Users className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Workforce Marketplace
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Verified skills, rated professionals, trusted hiring
                    </p>
                </div>

                {/* Trust Banner */}
                <div className="mb-8 p-4 bg-gradient-to-r from-emerald-900/20 to-sky-900/20 border border-emerald-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-white text-sm font-medium">100% Verified Skills Marketplace</p>
                            <p className="text-slate-400 text-xs">
                                Every skill is AI-reviewed and admin-approved before listing. Trust scores reflect verified activity and completed work.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-primary-400 opacity-50" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.total}</div>
                                <div className="text-sm text-slate-400">Verified Professionals</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-emerald-400 opacity-50" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.verified}</div>
                                <div className="text-sm text-slate-400">Verified Skills</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                        <div className="flex items-center gap-3">
                            <Award className="w-8 h-8 text-amber-400 opacity-50" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.avgTrustScore}</div>
                                <div className="text-sm text-slate-400">Avg. Trust Score</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col lg:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by skill name, category, or professional..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {SKILL_CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="trust_score">Sort by Trust Score</option>
                            <option value="years_experience">Sort by Experience</option>
                            <option value="name">Sort by Name</option>
                        </select>
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                    <p className="text-sm text-slate-400">
                        Showing <span className="text-white font-medium">{filteredSkills.length}</span> of <span className="text-white font-medium">{skills.length}</span> verified professionals
                    </p>
                    {(searchQuery || selectedCategory !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('all');
                            }}
                            className="text-sm text-primary-400 hover:text-primary-300 transition flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Clear filters
                        </button>
                    )}
                </div>

                {/* Skills Grid */}
                {filteredSkills.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                        {skills.length === 0 ? (
                            <>
                                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Listings Yet</h3>
                                <p className="text-slate-400 mb-6">Check back soon for verified professional skills.</p>
                            </>
                        ) : (
                            <>
                                <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Matching Listings</h3>
                                <p className="text-slate-400 mb-6">No skills match "{searchQuery}" or the selected category.</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCategory('all');
                                    }}
                                    className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                >
                                    Clear Filters
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSkills.map(skill => {
                            const trustBadge = getTrustScoreBadge(skill.trust_score);
                            const trustColor = getTrustScoreColor(skill.trust_score);
                            const profile = skill.profiles;
                            
                            return (
                                <div 
                                    key={skill.id} 
                                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all duration-200 group"
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-sky-500 flex items-center justify-center text-white font-bold text-lg">
                                                {profile?.full_name?.[0]?.toUpperCase() || getCategoryIcon(skill.category)}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition">
                                                    {skill.skill_name}
                                                </h3>
                                                <p className="text-xs text-slate-400">{profile?.full_name || 'Verified Professional'}</p>
                                            </div>
                                        </div>
                                        <div className={`text-xs px-2 py-0.5 rounded-full ${trustBadge.color}`}>
                                            {trustBadge.label}
                                        </div>
                                    </div>
                                    
                                    {/* Details */}
                                    <div className="space-y-2 mb-4">
                                        <p className="text-sm text-slate-400">
                                            {skill.category || 'General'} • {skill.years_experience || skill.experience_years || 0}+ years experience
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                <span className={`text-sm font-medium ${trustColor}`}>{skill.trust_score || 0}</span>
                                            </div>
                                            <span className="text-xs text-slate-500">Trust Score</span>
                                            {skill.completed_jobs > 0 && (
                                                <span className="text-xs text-slate-500">• {skill.completed_jobs} jobs completed</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Description */}
                                    {skill.description && (
                                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">{skill.description}</p>
                                    )}
                                    
                                    {/* Trust Indicators */}
                                    <div className="flex flex-wrap gap-2 mb-4 pt-2 border-t border-slate-800">
                                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                            <Shield className="w-3 h-3" /> AI Verified
                                        </span>
                                        {(skill.verification_status === 'verified' || skill.status === 'approved') && (
                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                                                <CheckCircle className="w-3 h-3" /> Human Reviewed
                                            </span>
                                        )}
                                        {skill.trust_score >= 80 && (
                                            <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                                                <Award className="w-3 h-3" /> Top Rated
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Contact Button with GateGuard */}
                                    <GateGuard 
                                        action="contact_worker" 
                                        showUpgrade={true}
                                        fallback={
                                            <button 
                                                disabled
                                                className="w-full py-2 bg-slate-700 text-slate-400 rounded-lg text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                {tier === 'visitor' ? 'Sign in to Contact' : 'Upgrade to Contact'}
                                            </button>
                                        }
                                    >
                                        <button
                                            onClick={() => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)}
                                            className="w-full py-2 border border-primary-500 text-primary-500 rounded-lg hover:bg-primary-500/10 transition text-sm flex items-center justify-center gap-2"
                                        >
                                            {selectedSkill?.id === skill.id ? (
                                                <>Cancel</>
                                            ) : (
                                                <><MessageCircle className="w-4 h-4" /> Contact Professional</>
                                            )}
                                        </button>
                                    </GateGuard>
                                    
                                    {/* Contact Form */}
                                    {selectedSkill?.id === skill.id && (
                                        <div className="mt-4 pt-4 border-t border-slate-700">
                                            <textarea
                                                value={contactMessage}
                                                onChange={(e) => setContactMessage(e.target.value)}
                                                placeholder="Describe your project or opportunity..."
                                                rows={3}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            />
                                            <button
                                                onClick={() => handleContact(skill)}
                                                disabled={sending}
                                                className="w-full mt-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                                Send Message
                                            </button>
                                            {!user && (
                                                <p className="text-xs text-amber-400 text-center mt-2">
                                                    Sign in to contact professionals
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Trust Footer */}
                <div className="mt-8 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-emerald-400" />
                            <p className="text-slate-400 text-sm">
                                All professionals are <span className="text-white font-medium">AI-verified</span> and <span className="text-white font-medium">human-reviewed</span>
                            </p>
                        </div>
                        <Link to="/workforce/about" className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                            Learn about verification →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
