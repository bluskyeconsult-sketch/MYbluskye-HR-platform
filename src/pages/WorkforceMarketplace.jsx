// src/pages/WorkforceMarketplace.jsx
// COMPLETE PROFESSIONAL WORKFORCE MARKETPLACE - With unified API, filtering, search, and enhanced UI

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
    Users, Search, Filter, Star, Award, Shield, CheckCircle, 
    Clock, MapPin, Briefcase, TrendingUp, Zap, Loader2,
    AlertCircle, UserCheck, Sparkles, Globe, Mail, Phone,
    ChevronDown, X, Eye
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Skill categories
const SKILL_CATEGORIES = [
    { id: 'all', name: 'All Categories', icon: Briefcase },
    { id: 'technical', name: 'Technical', icon: Code },
    { id: 'soft', name: 'Soft Skills', icon: Users },
    { id: 'leadership', name: 'Leadership', icon: Award },
    { id: 'creative', name: 'Creative', icon: Palette },
    { id: 'analytical', name: 'Analytical', icon: TrendingUp },
    { id: 'communication', name: 'Communication', icon: Mail },
    { id: 'management', name: 'Management', icon: Briefcase },
    { id: 'ai', name: 'AI & ML', icon: Brain },
    { id: 'data', name: 'Data Science', icon: Database }
];

// Import missing icons
import { Code, Palette, Brain, Database } from 'lucide-react';

export default function WorkforceMarketplace() {
    const navigate = useNavigate();
    const [skills, setSkills] = useState([]);
    const [filteredSkills, setFilteredSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('trust_score');
    const [selectedSkill, setSelectedSkill] = useState(null);
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
            
            // ✅ Using unified API endpoint
            const response = await fetch('/api/index?action=workforce-listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            const skillsData = result.data || [];
            setSkills(skillsData);
            
            // Calculate stats
            const verifiedCount = skillsData.filter(s => s.verification_status === 'verified').length;
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
                skill.skill_name.toLowerCase().includes(query) ||
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
            if (sortBy === 'name') return a.skill_name.localeCompare(b.skill_name);
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

    function formatDate(dateString) {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    }

    async function initiateContact(skill) {
        if (!user) {
            navigate('/sign-in?redirect=/workforce');
            return;
        }
        
        // Open contact modal or redirect to messaging
        setSelectedSkill(skill);
        // You can implement a contact modal here
        alert(`Contact feature for "${skill.skill_name}" - Coming soon!`);
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
            <div className="max-w-7xl mx-auto px-4 py-12">
                
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="w-8 h-8 text-primary-400" />
                        <h1 className="text-3xl font-bold text-white">Workforce Marketplace</h1>
                    </div>
                    <p className="text-slate-400">Browse verified professionals and hire with confidence</p>
                </div>

                {/* Trust Banner */}
                <div className="bg-gradient-to-r from-emerald-900/20 to-sky-900/20 border border-emerald-500/30 rounded-xl p-4 mb-8">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-white text-sm font-medium">Verified Skills Marketplace</p>
                            <p className="text-slate-400 text-xs">
                                All listings are reviewed using AI and human oversight. Trust scores reflect verified activity and completed work.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-primary-400 opacity-50" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.total}</div>
                                <div className="text-sm text-slate-400">Verified Professionals</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-emerald-400 opacity-50" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.verified}</div>
                                <div className="text-sm text-slate-400">Verified Skills</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
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
                <div className="mb-4 flex justify-between items-center">
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
                                                {profile?.full_name?.[0]?.toUpperCase() || 'P'}
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
                                            {skill.category || 'General'} • {skill.years_experience || 0}+ years experience
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                <span className={`text-sm font-medium ${trustColor}`}>{skill.trust_score || 0}</span>
                                            </div>
                                            <span className="text-xs text-slate-500">Trust Score</span>
                                        </div>
                                    </div>
                                    
                                    {/* Trust Indicators */}
                                    <div className="flex flex-wrap gap-2 mb-4 pt-2 border-t border-slate-800">
                                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                            <Shield className="w-3 h-3" /> AI Verified
                                        </span>
                                        {skill.verification_status === 'verified' && (
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
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => initiateContact(skill)}
                                            className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
                                        >
                                            Contact Professional
                                        </button>
                                        <button
                                            onClick={() => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)}
                                            className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    {/* Expanded Details */}
                                    {selectedSkill?.id === skill.id && (
                                        <div className="mt-4 pt-3 border-t border-slate-800">
                                            <div className="space-y-2 text-sm">
                                                {profile?.email && (
                                                    <p className="flex items-center gap-2 text-slate-400">
                                                        <Mail className="w-3 h-3" /> {profile.email}
                                                    </p>
                                                )}
                                                {profile?.location && (
                                                    <p className="flex items-center gap-2 text-slate-400">
                                                        <MapPin className="w-3 h-3" /> {profile.location}
                                                    </p>
                                                )}
                                                {profile?.bio && (
                                                    <p className="text-slate-400 text-xs line-clamp-2">{profile.bio}</p>
                                                )}
                                                <Link 
                                                    to={`/profile/${skill.user_id}`}
                                                    className="text-primary-400 text-xs hover:underline inline-flex items-center gap-1"
                                                >
                                                    View full profile →
                                                </Link>
                                            </div>
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
