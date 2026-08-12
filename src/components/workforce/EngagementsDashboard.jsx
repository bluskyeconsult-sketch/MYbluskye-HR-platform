// src/components/workforce/EngagementsDashboard.jsx
//
// FIXED (2026-08-07): loading engagements, updating status, and submitting
// ratings all called /api/index?action=workforce-* actions that don't exist
// in api/index.js. workforceService.js has correct working equivalents for
// three of the four — rewired to use them, same pattern as ProposalsList.jsx.
//
// RESOLVED (2026-08-07): sending a message during an engagement
// (workforce-send-message) had no backend equivalent anywhere. Rather than
// invent a new messages table, this now sends a real email via the
// already-confirmed-working `email` action — workforceService.js's
// getMyEngagements() was updated to also fetch the employer's email
// alongside the professional's, so both directions of contact are possible.
// This is email-based contact, not real-time in-app chat.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    getMyEngagements,
    updateEngagementStatus,
    submitRating
} from '../../services/workforceService';
import {
    Briefcase, Clock, CheckCircle, XCircle, AlertCircle, Loader2,
    DollarSign, Calendar, MessageCircle, Star, User, Building2,
    ChevronRight, TrendingUp, X, Send
} from 'lucide-react';

export default function EngagementsDashboard({ userId, userType }) {
    const [engagements, setEngagements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedEngagement, setSelectedEngagement] = useState(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingData, setRatingData] = useState({
        rating: 5,
        review: '',
        categories: { communication: 5, quality: 5, timeliness: 5 }
    });
    const [messageText, setMessageText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (userId) {
            loadEngagements();
        }
    }, [userId]);

    async function loadEngagements() {
        setLoading(true);
        setError(null);
        
        try {
            // FIXED: use the already-correct getMyEngagements() from
            // workforceService.js instead of a nonexistent API action.
            const data = await getMyEngagements(userId, userType);
            setEngagements(data);
        } catch (error) {
            console.error('Error loading engagements:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateStatus(engagementId, newStatus) {
        try {
            // FIXED: use the already-correct updateEngagementStatus() instead
            // of a nonexistent API action.
            await updateEngagementStatus(engagementId, userId, newStatus);
            await loadEngagements();
        } catch (error) {
            console.error('Error updating status:', error);
            alert(error.message || 'Failed to update status');
        }
    }

    async function handleSendMessage(engagementId) {
        if (!messageText.trim()) return;
        
        setSubmitting(true);
        try {
            // FIXED: sends a real email via the confirmed-working `email`
            // action instead of a nonexistent messaging backend.
            const engagement = engagements.find(e => e.id === engagementId);
            const recipientEmail = userType === 'employer'
                ? engagement?.professional?.profiles?.email
                : engagement?.employer?.email;
            
            if (!recipientEmail) {
                throw new Error('Contact email not available for the other party.');
            }
            
            const response = await fetch('/api/index?action=email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipientEmail,
                    type: 'notification',
                    templateData: {
                        subject: `New message about "${engagement?.service_request?.title || 'your engagement'}"`,
                        message: messageText,
                        actionLink: `${window.location.origin}/workforce/engagements`,
                        actionText: 'View Engagement'
                    }
                })
            });
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            setMessageText('');
            setSelectedEngagement(null);
            alert('Message sent!');
        } catch (error) {
            console.error('Error sending message:', error);
            alert(error.message || 'Failed to send message');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSubmitRating() {
        setSubmitting(true);
        
        try {
            const revieweeId = userType === 'employer' 
                ? selectedEngagement.professional_id 
                : selectedEngagement.employer_id;
            
            // FIXED: use the already-correct submitRating() instead of a
            // nonexistent API action. Note: the "would recommend" toggle in
            // this form isn't persisted anywhere — submitRating() doesn't
            // have a field for it, so it's collected but currently discarded.
            await submitRating(
                selectedEngagement.id,
                userId,
                revieweeId,
                ratingData.rating,
                ratingData.review,
                ratingData.categories
            );
            
            setShowRatingModal(false);
            setSelectedEngagement(null);
            setRatingData({ rating: 5, review: '', categories: { communication: 5, quality: 5, timeliness: 5 } });
            await loadEngagements();
            
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert(error.message || 'Failed to submit rating');
        } finally {
            setSubmitting(false);
        }
    }

    function getStatusBadge(status) {
        const config = {
            active: { color: 'bg-emerald-500/20 text-emerald-400', icon: TrendingUp, label: 'Active' },
            completed: { color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle, label: 'Completed' },
            cancelled: { color: 'bg-red-500/20 text-red-400', icon: XCircle, label: 'Cancelled' },
            pending: { color: 'bg-amber-500/20 text-amber-400', icon: Clock, label: 'Pending' }
        };
        const cfg = config[status] || config.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cfg.color}`}>
                <cfg.icon className="w-3 h-3" /> {cfg.label}
            </span>
        );
    }

    const filteredEngagements = statusFilter === 'all' 
        ? engagements 
        : engagements.filter(e => e.status === statusFilter);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">My Engagements</h2>
                    <p className="text-slate-400 text-sm">
                        {userType === 'employer' ? 'Manage your active hires' : 'Track your active work'}
                    </p>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {filteredEngagements.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Engagements Yet</h3>
                    <p className="text-slate-400">
                        {userType === 'employer' 
                            ? 'Accepted proposals will appear here as active engagements.' 
                            : 'Your accepted work will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredEngagements.map(engagement => {
                        const otherParty = userType === 'employer' ? engagement.professional : engagement.employer;
                        
                        return (
                            <div key={engagement.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <h3 className="text-lg font-semibold text-white">
                                                {engagement.service_request?.title || 'Engagement'}
                                            </h3>
                                            {getStatusBadge(engagement.status)}
                                        </div>
                                        <p className="text-slate-400 text-sm mb-3 flex items-center gap-1">
                                            {userType === 'employer' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                            {otherParty?.full_name || 'Unknown'}
                                        </p>
                                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" /> ${engagement.rate}/hr
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> Started: {new Date(engagement.started_at || engagement.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2">
                                        {engagement.status === 'active' && (
                                            <>
                                                <button
                                                    onClick={() => setSelectedEngagement(engagement)}
                                                    className="px-3 py-1.5 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800 transition flex items-center gap-1"
                                                >
                                                    <MessageCircle className="w-3 h-3" /> Message
                                                </button>
                                                {userType === 'employer' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(engagement.id, 'completed')}
                                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition"
                                                    >
                                                        Mark Complete
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {engagement.status === 'completed' && !engagement.rated && (
                                            <button
                                                onClick={() => { setSelectedEngagement(engagement); setShowRatingModal(true); }}
                                                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition flex items-center gap-1"
                                            >
                                                <Star className="w-3 h-3" /> Leave Rating
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Inline message box */}
                                {selectedEngagement?.id === engagement.id && !showRatingModal && (
                                    <div className="mt-4 pt-4 border-t border-slate-800">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={messageText}
                                                onChange={(e) => setMessageText(e.target.value)}
                                                placeholder="Type a message..."
                                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            />
                                            <button
                                                onClick={() => handleSendMessage(engagement.id)}
                                                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition flex items-center gap-1"
                                            >
                                                <Send className="w-3 h-3" /> Send
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && selectedEngagement && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Rate Your Experience</h2>
                            <button 
                                onClick={() => { setShowRatingModal(false); setSelectedEngagement(null); }}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Overall Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => setRatingData({...ratingData, rating: star})}
                                            className="text-2xl"
                                        >
                                            <Star className={`w-8 h-8 ${star <= ratingData.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Review</label>
                                <textarea
                                    value={ratingData.review}
                                    onChange={(e) => setRatingData({...ratingData, review: e.target.value})}
                                    rows={4}
                                    placeholder="Share your experience..."
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            
                            <button
                                onClick={handleSubmitRating}
                                disabled={submitting}
                                className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Rating'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
