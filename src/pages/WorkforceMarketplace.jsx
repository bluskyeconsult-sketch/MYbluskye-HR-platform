// src/pages/WorkforceMarketplace.jsx
// ODUSBABA WORKFORCE MARKETPLACE v6.0 - PRODUCTION READY
//
// CHANGED (2026-08-07): per ODUSBABA's decision, this page now sources from
// the richer workforce_profiles + service_requests + proposals + engagements
// + ratings_reviews model instead of the simpler workforce_skills table.
// This resolves the Phase 7 architecture split: WorkforceOnboarding.jsx,
// ProposalsList.jsx, and EngagementsDashboard.jsx were already built and
// fixed against this model (via workforceService.js, confirmed bug-free),
// but the actual public browse page — this file — never read from it,
// meaning anyone completing onboarding was invisible here. Now the whole
// flow (onboarding -> browse -> propose -> engage -> rate) is connected
// end-to-end using code that already existed and already worked.
//
// This uses workforceService.js's getVerifiedProfessions() directly, the
// same real, already-confirmed-correct function used nowhere else in the
// UI until now. Existing workforce_skills data isn't deleted — this page
// simply no longer reads from that table, so any old skill listings won't
// appear here going forward.
//
// Contact — still email-based (see the earlier fix), since
// getVerifiedProfessions() joins the same profiles.email field the
// previous version used.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCapability } from '../hooks/useCapability';
import GateGuard from '../components/GateGuard';
import { getVerifiedProfessions } from '../services/workforceService';
import { 
    Users, Search, Star, Award, Shield, CheckCircle, 
    Loader2, AlertCircle, Mail, X, Code, Palette, Brain, Database,
    MessageCircle, Briefcase, TrendingUp, DollarSign, Clock, Wrench
} from 'lucide-react';

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
    const { capabilities, tier, canSync } = useCapability();
    const [professionals, setProfessionals] = useState([]);
    const [filteredProfessionals, setFilteredProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [listingCategory, setListingCategory] = useState('professional');
    const [sortBy, setSortBy] = useState('rating');
    const [selectedProfessional, setSelectedProfessional] = useState(null);
    const [contactMessage, setContactMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [stats, setStats] = useState({ total: 0, verified: 0, avgRating: 0 });
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadMarketplaceData();
        getCurrentUser();
    }, [listingCategory]);

    useEffect(() => {
        filterAndSortProfessionals();
    }, [professionals, searchQuery, selectedCategory, sortBy]);

    async function getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    }

    async function loadMarketplaceData() {
        try {
            setLoading(true);
            setError(null);

            // FIXED (2026-08-27): now passes the real listing_category
            // filter - getVerifiedProfessions() was extended this
            // session to support it, so Professional Services,
            // Tradespeople, and Job Seekers are genuinely separate,
            // real browse views rather than all mixed together.
            const data = await getVerifiedProfessions(100, listingCategory);
            setProfessionals(data);

            const avgRating = data.reduce((sum, p) => sum + (p.rating_avg || 0), 0) / (data.length || 1);

            setStats({
                total: data.length,
                verified: data.length,
                avgRating: avgRating.toFixed(1)
            });
        } catch (err) {
            console.error('Error loading marketplace:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function filterAndSortProfessionals() {
        let filtered = [...professionals];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.headline?.toLowerCase().includes(query) ||
                p.bio?.toLowerCase().includes(query) ||
                (Array.isArray(p.skills) && p.skills.some(s => s.toLowerCase().includes(query))) ||
                p.profiles?.full_name?.toLowerCase().includes(query)
            );
        }

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(p =>
                Array.isArray(p.skills) && p.skills.some(s => s.toLowerCase().includes(selectedCategory))
            );
        }

        filtered.sort((a, b) => {
            if (sortBy === 'rating') return (b.rating_avg || 0) - (a.rating_avg || 0);
            if (sortBy === 'experience') return (b.experience_years || 0) - (a.experience_years || 0);
            if (sortBy === 'rate_low') return (a.hourly_rate || 0) - (b.hourly_rate || 0);
            if (sortBy === 'rate_high') return (b.hourly_rate || 0) - (a.hourly_rate || 0);
            return 0;
        });

        setFilteredProfessionals(filtered);
    }

    function getRatingColor(rating) {
        if (rating >= 4.5) return 'text-emerald-400';
        if (rating >= 3.5) return 'text-blue-400';
        if (rating >= 2.5) return 'text-amber-400';
        return 'text-slate-400';
    }

    function getRatingBadge(rating) {
        if (rating >= 4.5) return { label: 'Top Rated', color: 'bg-emerald-500/20 text-emerald-400' };
        if (rating >= 3.5) return { label: 'Highly Rated', color: 'bg-blue-500/20 text-blue-400' };
        if (rating > 0) return { label: 'Rated', color: 'bg-amber-500/20 text-amber-400' };
        return { label: 'New', color: 'bg-slate-500/20 text-slate-400' };
    }

    async function handleContact(professional) {
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
            // FIXED (2026-08-27): this used to read
            // professional.profiles?.email directly from data already
            // sitting in browser memory - the real, confirmed privacy
            // gap fixed this session (getVerifiedProfessions() no
            // longer includes email at all). Contact now goes through
            // the real, credit-gated unlock action - it returns the
            // real email only after confirming (or creating) a real,
            // paid unlock, rather than assuming it was already fetched.
            const { data: { session } } = await supabase.auth.getSession();
            const unlockResponse = await fetch('/api/index?action=workforce-unlock-contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ profileId: professional.id })
            });

            const unlockResult = await unlockResponse.json();
            if (!unlockResult.success) {
                throw new Error(unlockResult.error || 'Could not unlock this profile\'s contact details.');
            }

            const recipientEmail = unlockResult.contact?.email;
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
                alert(unlockResult.alreadyUnlocked
                    ? 'Message sent successfully! For ongoing project work, consider submitting a formal proposal instead.'
                    : 'Contact unlocked and message sent! You now have permanent access to this profile\'s contact details. For ongoing project work, consider submitting a formal proposal instead.');
                setSelectedProfessional(null);
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

                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Users className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Workforce Marketplace
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Verified professionals, real proposals, trusted engagements
                    </p>
                </div>

                <div className="mb-8 p-4 bg-gradient-to-r from-emerald-900/20 to-sky-900/20 border border-emerald-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-white text-sm font-medium">100% Verified Professional Marketplace</p>
                            <p className="text-slate-400 text-xs">
                                Every profile is reviewed and verified before listing. Ratings reflect completed engagements.
                            </p>
                        </div>
                    </div>
                </div>

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
                            <Star className="w-8 h-8 text-amber-400 opacity-50" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.avgRating}</div>
                                <div className="text-sm text-slate-400">Avg. Rating</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-emerald-400 opacity-50" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.verified}</div>
                                <div className="text-sm text-slate-400">Available Now</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* NEW (2026-08-27): real listing-category tabs -
                    Professional Services, Tradesperson, and Job Seeker
                    are genuinely separate browse views now, matching the
                    new listing_category field on workforce_profiles. */}
                <div className="flex gap-2 mb-6 border-b border-slate-800 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'professional', label: 'Professional Services', icon: Briefcase },
                        { id: 'tradesperson', label: 'Tradespeople & Skilled Workers', icon: Wrench },
                        { id: 'job_seeker', label: 'Job Seeker Profiles', icon: Users }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setListingCategory(tab.id)}
                            className={`px-4 py-2 text-sm font-medium transition flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
                                listingCategory === tab.id
                                    ? 'text-primary-400 border-primary-400'
                                    : 'text-slate-400 border-transparent hover:text-white'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col lg:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by skill, headline, or professional name..."
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
                            <option value="rating">Sort by Rating</option>
                            <option value="experience">Sort by Experience</option>
                            <option value="rate_low">Rate: Low to High</option>
                            <option value="rate_high">Rate: High to Low</option>
                        </select>
                    </div>
                </div>

                <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                    <p className="text-sm text-slate-400">
                        Showing <span className="text-white font-medium">{filteredProfessionals.length}</span> of <span className="text-white font-medium">{professionals.length}</span> verified professionals
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

                {filteredProfessionals.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                        {professionals.length === 0 ? (
                            <>
                                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Professionals Listed Yet</h3>
                                <p className="text-slate-400 mb-6">Check back soon, or complete your own profile to be the first.</p>
                                <Link
                                    to="/workforce/setup"
                                    className="inline-block px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                                >
                                    Create Your Profile
                                </Link>
                            </>
                        ) : (
                            <>
                                <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Matching Professionals</h3>
                                <p className="text-slate-400 mb-6">No one matches "{searchQuery}" or the selected category.</p>
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
                        {filteredProfessionals.map(professional => {
                            const ratingBadge = getRatingBadge(professional.rating_avg);
                            const ratingColor = getRatingColor(professional.rating_avg);
                            const profile = professional.profiles;

                            return (
                                <div
                                    key={professional.id}
                                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all duration-200 group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-sky-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                                                {profile?.avatar_url ? (
                                                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    profile?.full_name?.[0]?.toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition">
                                                    {profile?.full_name || 'Verified Professional'}
                                                </h3>
                                                <p className="text-xs text-slate-400 line-clamp-1">{professional.headline}</p>
                                            </div>
                                        </div>
                                        <div className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${ratingBadge.color}`}>
                                            {ratingBadge.label}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-3 text-sm text-slate-400">
                                            <span>{professional.experience_years || 0}+ years experience</span>
                                            {professional.hourly_rate && (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" /> {professional.hourly_rate}/hr
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                <span className={`text-sm font-medium ${ratingColor}`}>
                                                    {professional.rating_avg ? professional.rating_avg.toFixed(1) : 'New'}
                                                </span>
                                            </div>
                                            {professional.rating_count > 0 && (
                                                <span className="text-xs text-slate-500">({professional.rating_count} reviews)</span>
                                            )}
                                        </div>
                                    </div>

                                    {Array.isArray(professional.skills) && professional.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {professional.skills.slice(0, 4).map((skill, idx) => (
                                                <span key={idx} className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-300">
                                                    {skill}
                                                </span>
                                            ))}
                                            {professional.skills.length > 4 && (
                                                <span className="text-xs px-2 py-0.5 text-slate-500">+{professional.skills.length - 4} more</span>
                                            )}
                                        </div>
                                    )}

                                    {professional.bio && (
                                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">{professional.bio}</p>
                                    )}

                                    <div className="flex flex-wrap gap-2 mb-4 pt-2 border-t border-slate-800">
                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                                            <CheckCircle className="w-3 h-3" /> Verified
                                        </span>
                                        {professional.rating_avg >= 4.5 && (
                                            <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                                                <Award className="w-3 h-3" /> Top Rated
                                            </span>
                                        )}
                                    </div>

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
                                            onClick={() => setSelectedProfessional(selectedProfessional?.id === professional.id ? null : professional)}
                                            className="w-full py-2 border border-primary-500 text-primary-500 rounded-lg hover:bg-primary-500/10 transition text-sm flex items-center justify-center gap-2"
                                        >
                                            {selectedProfessional?.id === professional.id ? (
                                                <>Cancel</>
                                            ) : (
                                                <><MessageCircle className="w-4 h-4" /> Contact Professional</>
                                            )}
                                        </button>
                                    </GateGuard>

                                    {selectedProfessional?.id === professional.id && (
                                        <div className="mt-4 pt-4 border-t border-slate-700">
                                            {/* NEW (2026-08-27): honest,
                                                upfront note about the real
                                                credit cost - unlocking a
                                                new profile's contact
                                                details costs credits;
                                                re-contacting an already-
                                                unlocked one doesn't. */}
                                            <p className="text-xs text-slate-500 mb-2">
                                                First message to a new profile unlocks their contact details for 5 credits (permanent access after that).
                                            </p>
                                            <textarea
                                                value={contactMessage}
                                                onChange={(e) => setContactMessage(e.target.value)}
                                                placeholder="Describe your project or opportunity..."
                                                rows={3}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            />
                                            <button
                                                onClick={() => handleContact(professional)}
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

                <div className="mt-8 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-emerald-400" />
                            <p className="text-slate-400 text-sm">
                                All professionals are <span className="text-white font-medium">verified</span> before listing
                            </p>
                        </div>
                        <Link to="/workforce/setup" className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                            Join as a professional →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
