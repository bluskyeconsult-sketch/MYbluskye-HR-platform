// src/components/workforce/EngagementsDashboard.jsx
// Complete Engagements Dashboard for both Employers and Professionals

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getMyEngagements, updateEngagementStatus, submitRating, logEngagementActivity } from '../../services/workforceService';
import { MessageCircle, Star, CheckCircle, XCircle, Clock, Loader2, Calendar, DollarSign, User, Briefcase, Send } from 'lucide-react';

export default function EngagementsDashboard({ userId, userType }) {
    const [engagements, setEngagements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEngagement, setSelectedEngagement] = useState(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingData, setRatingData] = useState({
        rating: 5,
        review: '',
        communication: 5,
        quality: 5,
        timeliness: 5
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadEngagements();
    }, [userId, userType]);

    async function loadEngagements() {
        setLoading(true);
        try {
            const data = await getMyEngagements(userId, userType);
            setEngagements(data);
        } catch (error) {
            console.error('Error loading engagements:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateStatus(engagementId, status) {
        if (confirm(`Mark this engagement as ${status}?`)) {
            await updateEngagementStatus(engagementId, userId, status);
            await logEngagementActivity(engagementId, `status_changed_to_${status}`, { new_status: status });
            loadEngagements();
        }
    }

    async function handleSubmitRating(e) {
        e.preventDefault();
        setSubmitting(true);
        
        const categories = {
            communication: ratingData.communication,
            quality: ratingData.quality,
            timeliness: ratingData.timeliness
        };
        
        const revieweeId = userType === 'employer' 
            ? selectedEngagement.professional_id 
            : selectedEngagement.employer_id;
        
        await submitRating(
            selectedEngagement.id,
            userId,
            revieweeId,
            ratingData.rating,
            ratingData.review,
            categories
        );
        
        setShowRatingModal(false);
        setRatingData({ rating: 5, review: '', communication: 5, quality: 5, timeliness: 5 });
        loadEngagements();
        setSubmitting(false);
        alert('Thank you for your feedback!');
    }

    function getStatusBadge(status) {
        const config = {
            active: { color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle, label: 'Active' },
            completed: { color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle, label: 'Completed' },
            cancelled: { color: 'bg-red-500/20 text-red-400', icon: XCircle, label: 'Cancelled' },
            disputed: { color: 'bg-amber-500/20 text-amber-400', icon: AlertCircle, label: 'Disputed' }
        };
        const cfg = config[status] || config.active;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${cfg.color}`}>
                <cfg.icon className="w-3 h-3" /> {cfg.label}
            </span>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-white">My Engagements</h2>
                <p className="text-slate-400 text-sm">Active and completed work contracts</p>
            </div>

            {/* Engagements List */}
            {engagements.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                    <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No engagements yet</h3>
                    <p className="text-slate-400">When you accept a proposal or get hired, it will appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {engagements.map(engagement => (
                        <div key={engagement.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <h3 className="text-lg font-semibold text-white">{engagement.service_request?.title}</h3>
                                        {getStatusBadge(engagement.status)}
                                    </div>
                                    <p className="text-slate-400 text-sm mb-3">{engagement.service_request?.description?.substring(0, 150)}...</p>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1">
                                            {userType === 'employer' ? (
                                                <><User className="w-3 h-3" /> Professional: {engagement.professional?.profiles?.full_name}</>
                                            ) : (
                                                <><Briefcase className="w-3 h-3" /> Employer: {engagement.service_request?.employer?.full_name}</>
                                            )}
                                        </span>
                                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${engagement.total_amount}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Started: {new Date(engagement.start_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {engagement.status === 'active' && (
                                        <>
                                            <button
                                                onClick={() => handleUpdateStatus(engagement.id, 'completed')}
                                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500"
                                            >
                                                Mark Complete
                                            </button>
                                            <button
                                                onClick={() => setSelectedEngagement(engagement)}
                                                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-500"
                                            >
                                                <MessageCircle className="w-4 h-4 inline mr-1" /> Message
                                            </button>
                                        </>
                                    )}
                                    {engagement.status === 'completed' && (
                                        <button
                                            onClick={() => {
                                                setSelectedEngagement(engagement);
                                                setShowRatingModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-500"
                                        >
                                            <Star className="w-4 h-4 inline mr-1" /> Rate
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && selectedEngagement && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Rate This Engagement</h2>
                        <form onSubmit={handleSubmitRating} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Overall Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRatingData({...ratingData, rating: star})}
                                            className={`text-2xl ${star <= ratingData.rating ? 'text-yellow-400' : 'text-slate-600'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Communication</label>
                                    <select
                                        value={ratingData.communication}
                                        onChange={(e) => setRatingData({...ratingData, communication: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    >
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Quality</label>
                                    <select
                                        value={ratingData.quality}
                                        onChange={(e) => setRatingData({...ratingData, quality: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    >
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Timeliness</label>
                                    <select
                                        value={ratingData.timeliness}
                                        onChange={(e) => setRatingData({...ratingData, timeliness: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    >
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Written Review</label>
                                <textarea
                                    value={ratingData.review}
                                    onChange={(e) => setRatingData({...ratingData, review: e.target.value})}
                                    rows="4"
                                    placeholder="Share your experience working with this professional..."
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                                    {submitting ? 'Submitting...' : 'Submit Rating'}
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

// Missing import
import { AlertCircle } from 'lucide-react';
