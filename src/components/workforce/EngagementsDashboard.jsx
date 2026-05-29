// src/components/workforce/EngagementsDashboard.jsx
// COMPLETE PROFESSIONAL ENGAGEMENTS DASHBOARD - For both Employers and Professionals
// Features: Unified API, status tracking, rating system, messaging, activity logging

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    MessageCircle, Star, CheckCircle, XCircle, Clock, Loader2, 
    Calendar, DollarSign, User, Briefcase, Send, AlertCircle,
    Filter, Search, TrendingUp, Award, ThumbsUp, MessageSquare,
    FileText, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';

export default function EngagementsDashboard({ userId, userType }) {
    const [engagements, setEngagements] = useState([]);
    const [filteredEngagements, setFilteredEngagements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEngagement, setSelectedEngagement] = useState(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedEngagement, setExpandedEngagement] = useState(null);
    const [ratingData, setRatingData] = useState({
        rating: 5,
        review: '',
        communication: 5,
        quality: 5,
        timeliness: 5,
        would_recommend: true
    });
    const [submitting, setSubmitting] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        average_rating: 0
    });

    const statuses = [
        { id: 'all', name: 'All', icon: Briefcase, color: 'slate' },
        { id: 'active', name: 'Active', icon: Clock, color: 'emerald' },
        { id: 'completed', name: 'Completed', icon: CheckCircle, color: 'blue' },
        { id: 'cancelled', name: 'Cancelled', icon: XCircle, color: 'red' },
        { id: 'disputed', name: 'Disputed', icon: AlertCircle, color: 'amber' }
    ];

    useEffect(() => {
        loadEngagements();
    }, [userId, userType]);

    useEffect(() => {
        filterEngagements();
    }, [engagements, statusFilter, searchQuery]);

    async function loadEngagements() {
        setLoading(true);
        setError(null);
        
        try {
            // ✅ Using unified API endpoint
            const response = await fetch('/api/index?action=workforce-engagements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userType })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            const engagementsData = result.data || [];
            setEngagements(engagementsData);
            
            // Calculate stats
            const statsData = {
                total: engagementsData.length,
                active: engagementsData.filter(e => e.status === 'active').length,
                completed: engagementsData.filter(e => e.status === 'completed').length,
                cancelled: engagementsData.filter(e => e.status === 'cancelled').length,
                average_rating: calculateAverageRating(engagementsData)
            };
            setStats(statsData);
            
        } catch (error) {
            console.error('Error loading engagements:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    function calculateAverageRating(engagementsData) {
        const ratedEngagements = engagementsData.filter(e => e.rating && e.rating > 0);
        if (ratedEngagements.length === 0) return 0;
        const sum = ratedEngagements.reduce((acc, e) => acc + e.rating, 0);
        return Math.round((sum / ratedEngagements.length) * 10) / 10;
    }

    function filterEngagements() {
        let filtered = [...engagements];
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(e => e.status === statusFilter);
        }
        
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(e => 
                e.service_request?.title?.toLowerCase().includes(query) ||
                e.service_request?.description?.toLowerCase().includes(query) ||
                e.professional?.profiles?.full_name?.toLowerCase().includes(query) ||
                e.service_request?.employer?.full_name?.toLowerCase().includes(query)
            );
        }
        
        setFilteredEngagements(filtered);
    }

    async function handleUpdateStatus(engagementId, status) {
        if (!confirm(`Mark this engagement as ${status.toUpperCase()}? This action cannot be undone.`)) return;
        
        setSubmitting(true);
        try {
            const response = await fetch('/api/index?action=workforce-update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ engagementId, userId, status })
            });
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            await loadEngagements();
            alert(`✅ Engagement marked as ${status}`);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSendMessage(engagementId) {
        if (!messageText.trim()) {
            alert('Please enter a message');
            return;
        }
        
        setSendingMessage(true);
        try {
            const response = await fetch('/api/index?action=workforce-send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    engagementId, 
                    senderId: userId,
                    message: messageText,
                    senderType: userType
                })
            });
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            setMessageText('');
            setShowMessageModal(false);
            alert('✅ Message sent successfully');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message: ' + error.message);
        } finally {
            setSendingMessage(false);
        }
    }

    async function handleSubmitRating(e) {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            const revieweeId = userType === 'employer' 
                ? selectedEngagement.professional_id 
                : selectedEngagement.employer_id;
            
            const response = await fetch('/api/index?action=workforce-submit-rating', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    engagementId: selectedEngagement.id,
                    reviewerId: userId,
                    revieweeId,
                    rating: ratingData.rating,
                    review: ratingData.review,
                    categories: {
                        communication: ratingData.communication,
                        quality: ratingData.quality,
                        timeliness: ratingData.timeliness
                    },
                    wouldRecommend: ratingData.would_recommend
                })
            });
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            setShowRatingModal(false);
            setRatingData({ rating: 5, review: '', communication: 5, quality: 5, timeliness: 5, would_recommend: true });
            await loadEngagements();
            alert('✅ Thank you for your feedback!');
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('Failed to submit rating: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    }

    function getStatusBadge(status) {
        const config = {
            active: { color: 'bg-emerald-500/20 text-emerald-400', icon: Clock, label: 'Active' },
            completed: { color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle, label: 'Completed' },
            cancelled: { color: 'bg-red-500/20 text-red-400', icon: XCircle, label: 'Cancelled' },
            disputed: { color: 'bg-amber-500/20 text-amber-400', icon: AlertCircle, label: 'Disputed' }
        };
        const cfg = config[status] || config.active;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                <cfg.icon className="w-3 h-3" /> {cfg.label}
            </span>
        );
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Unable to Load Engagements</h3>
                <p className="text-slate-400 mb-4">{error}</p>
                <button onClick={loadEngagements} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    Try Again
                </button>
            </div>
        );
    }

    const otherParty = userType === 'employer' ? 'Professional' : 'Employer';

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">My Engagements</h2>
                    <p className="text-slate-400 text-sm">Manage your active and completed work contracts</p>
                </div>
                {stats.average_rating > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 text-sm font-medium">{stats.average_rating} ★ Average Rating</span>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-slate-400">Total</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
                    <p className="text-xs text-slate-400">Active</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-400">{stats.completed}</p>
                    <p className="text-xs text-slate-400">Completed</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{stats.cancelled}</p>
                    <p className="text-xs text-slate-400">Cancelled</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-400">{stats.disputed || 0}</p>
                    <p className="text-xs text-slate-400">Disputed</p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title, description, or {otherParty.toLowerCase()} name..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {statuses.map(status => (
                        <button
                            key={status.id}
                            onClick={() => setStatusFilter(status.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                                statusFilter === status.id
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            <status.icon className="w-3.5 h-3.5" />
                            {status.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Engagements List */}
            {filteredEngagements.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    {engagements.length === 0 ? (
                        <>
                            <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No engagements yet</h3>
                            <p className="text-slate-400">
                                {userType === 'employer' 
                                    ? "When you hire someone, it will appear here"
                                    : "When you get hired, it will appear here"}
                            </p>
                        </>
                    ) : (
                        <>
                            <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No matching engagements</h3>
                            <p className="text-slate-400 mb-4">
                                No engagements match "{searchQuery}" or the selected filter.
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                }}
                                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                            >
                                Clear Filters
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredEngagements.map(engagement => {
                        const isExpanded = expandedEngagement === engagement.id;
                        const otherPartyName = userType === 'employer' 
                            ? engagement.professional?.profiles?.full_name 
                            : engagement.service_request?.employer?.full_name;
                        
                        return (
                            <div 
                                key={engagement.id} 
                                className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all"
                            >
                                <div className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <h3 className="text-lg font-semibold text-white">
                                                    {engagement.service_request?.title}
                                                </h3>
                                                {getStatusBadge(engagement.status)}
                                            </div>
                                            
                                            <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                                                {engagement.service_request?.description}
                                            </p>
                                            
                                            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    {userType === 'employer' ? (
                                                        <><User className="w-3 h-3" /> {otherPartyName || 'Professional'}</>
                                                    ) : (
                                                        <><Briefcase className="w-3 h-3" /> {otherPartyName || 'Employer'}</>
                                                    )}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" /> {formatCurrency(engagement.total_amount)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> Started: {new Date(engagement.start_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            
                                            {engagement.rating > 0 && (
                                                <div className="mt-2 flex items-center gap-1">
                                                    {[1,2,3,4,5].map(star => (
                                                        <Star key={star} className={`w-3 h-3 ${star <= engagement.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                                                    ))}
                                                    <span className="text-xs text-slate-500 ml-1">({engagement.rating}★)</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-row md:flex-col gap-2">
                                            <button
                                                onClick={() => setExpandedEngagement(isExpanded ? null : engagement.id)}
                                                className="px-3 py-1.5 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm flex items-center gap-1 transition hover:bg-slate-800"
                                            >
                                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                {isExpanded ? 'Show Less' : 'Details'}
                                            </button>
                                            
                                            {engagement.status === 'active' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedEngagement(engagement);
                                                            setShowMessageModal(true);
                                                        }}
                                                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-500 transition flex items-center gap-1"
                                                    >
                                                        <MessageCircle className="w-3 h-3" /> Message
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(engagement.id, 'completed')}
                                                        disabled={submitting}
                                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 transition"
                                                    >
                                                        Mark Complete
                                                    </button>
                                                </>
                                            )}
                                            
                                            {engagement.status === 'completed' && !engagement.rating && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedEngagement(engagement);
                                                        setShowRatingModal(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-500 transition flex items-center gap-1"
                                                >
                                                    <Star className="w-3 h-3" /> Rate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t border-slate-800 bg-slate-900/30 p-5">
                                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary-400" />
                                            Engagement Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-slate-500">Full Description</p>
                                                <p className="text-slate-300">{engagement.service_request?.description}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Requirements</p>
                                                <p className="text-slate-300">{engagement.service_request?.requirements || 'No specific requirements'}</p>
                                            </div>
                                            {engagement.deliverables && (
                                                <div className="md:col-span-2">
                                                    <p className="text-slate-500">Deliverables</p>
                                                    <p className="text-slate-300">{engagement.deliverables}</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {engagement.messages && engagement.messages.length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-slate-700">
                                                <p className="text-slate-500 text-sm mb-2">Recent Messages</p>
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {engagement.messages.slice(-3).map(msg => (
                                                        <div key={msg.id} className="text-xs text-slate-400">
                                                            <span className="text-primary-400">{msg.sender_name}:</span> {msg.message}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Results summary */}
            {filteredEngagements.length > 0 && (
                <div className="text-center">
                    <p className="text-sm text-slate-500">
                        Showing {filteredEngagements.length} of {engagements.length} engagements
                    </p>
                </div>
            )}

            {/* Message Modal */}
            {showMessageModal && selectedEngagement && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <MessageSquare className="w-6 h-6 text-primary-400" />
                            <h2 className="text-xl font-bold text-white">Send Message</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">
                            Send a message to {userType === 'employer' ? 'the professional' : 'the employer'} about this engagement.
                        </p>
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            rows={5}
                            placeholder="Type your message here..."
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleSendMessage(selectedEngagement.id)}
                                disabled={sendingMessage}
                                className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Send Message
                            </button>
                            <button
                                onClick={() => setShowMessageModal(false)}
                                className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && selectedEngagement && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <Star className="w-6 h-6 text-amber-400" />
                            <h2 className="text-xl font-bold text-white">Rate This Engagement</h2>
                        </div>
                        
                        <form onSubmit={handleSubmitRating} className="space-y-5">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Overall Rating</label>
                                <div className="flex gap-3">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRatingData({...ratingData, rating: star})}
                                            className="focus:outline-none"
                                        >
                                            <Star className={`w-8 h-8 transition ${star <= ratingData.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600 hover:text-slate-500'}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Communication</label>
                                    <div className="flex gap-1">
                                        {[1,2,3,4,5].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setRatingData({...ratingData, communication: n})}
                                                className="focus:outline-none"
                                            >
                                                <Star className={`w-5 h-5 ${n <= ratingData.communication ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Quality of Work</label>
                                    <div className="flex gap-1">
                                        {[1,2,3,4,5].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setRatingData({...ratingData, quality: n})}
                                                className="focus:outline-none"
                                            >
                                                <Star className={`w-5 h-5 ${n <= ratingData.quality ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Timeliness</label>
                                    <div className="flex gap-1">
                                        {[1,2,3,4,5].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setRatingData({...ratingData, timeliness: n})}
                                                className="focus:outline-none"
                                            >
                                                <Star className={`w-5 h-5 ${n <= ratingData.timeliness ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Written Review</label>
                                <textarea
                                    value={ratingData.review}
                                    onChange={(e) => setRatingData({...ratingData, review: e.target.value})}
                                    rows={4}
                                    placeholder="Share your experience working together..."
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="would_recommend"
                                    checked={ratingData.would_recommend}
                                    onChange={(e) => setRatingData({...ratingData, would_recommend: e.target.checked})}
                                    className="w-4 h-4 rounded border-slate-600 text-primary-500"
                                />
                                <label htmlFor="would_recommend" className="text-slate-300 text-sm">
                                    I would recommend this {userType === 'employer' ? 'professional' : 'employer'} to others
                                </label>
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                                    Submit Rating
                                </button>
                                <button type="button" onClick={() => setShowRatingModal(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
