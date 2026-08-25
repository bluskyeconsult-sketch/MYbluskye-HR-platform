// src/components/workforce/ProposalsList.jsx
// COMPLETE PROFESSIONAL PROPOSALS SYSTEM
//
// FIXED (2026-08-07): every data call in this file went to
// /api/index?action=workforce-* actions that don't exist anywhere in
// api/index.js — workforce-proposals, workforce-profile,
// workforce-available-requests, workforce-submit-proposal. This page was
// completely non-functional. workforceService.js already has correct,
// working equivalents for all four using direct Supabase calls — they just
// weren't being called. Rewired to use them, same pattern as the
// TakeAssessment.jsx fix in Phase 5.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    getMyProposals,
    getWorkforceProfile,
    getOpenServiceRequests,
    submitProposal
} from '../../services/workforceService';
import { 
    Send, Eye, Clock, CheckCircle, XCircle, AlertCircle, 
    Loader2, FileText, DollarSign, Calendar, Search, Filter,
    TrendingUp, Award, MessageCircle, Star, Zap, ChevronRight,
    Building2, UserCheck, Briefcase, Plus, X
} from 'lucide-react';

export default function ProposalsList({ professionalId }) {
    const navigate = useNavigate();
    const [proposals, setProposals] = useState([]);
    const [filteredProposals, setFilteredProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [profile, setProfile] = useState(null);
    const [availableRequests, setAvailableRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0 });
    const [formData, setFormData] = useState({
        cover_letter: '',
        proposed_rate: '',
        estimated_days: ''
    });

    useEffect(() => {
        if (professionalId) {
            loadData();
        }
    }, [professionalId]);

    useEffect(() => {
        filterProposals();
    }, [proposals, searchQuery, statusFilter]);

    async function loadData() {
        setLoading(true);
        setError(null);
        
        try {
            const [proposalsList, profileData, requestsData] = await Promise.all([
                getMyProposals(professionalId),
                getWorkforceProfile(professionalId),
                getOpenServiceRequests()
            ]);
            
            setProposals(proposalsList);
            
            const pending = proposalsList.filter(p => p.status === 'pending').length;
            const accepted = proposalsList.filter(p => p.status === 'accepted').length;
            const rejected = proposalsList.filter(p => p.status === 'rejected').length;
            
            setStats({
                total: proposalsList.length,
                pending,
                accepted,
                rejected
            });
            
            setProfile(profileData);
            setAvailableRequests(requestsData);
            
        } catch (error) {
            console.error('Error loading proposals:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    function filterProposals() {
        let filtered = [...proposals];
        
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(proposal => 
                proposal.service_request?.title?.toLowerCase().includes(query) ||
                proposal.service_request?.description?.toLowerCase().includes(query)
            );
        }
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(proposal => proposal.status === statusFilter);
        }
        
        setFilteredProposals(filtered);
    }

    async function handleSubmitProposal(e) {
        e.preventDefault();
        
        if (!formData.cover_letter.trim()) {
            setError('Please provide a cover letter');
            return;
        }
        
        setSubmitting(true);
        setError(null);
        
        try {
            await submitProposal(selectedRequest.id, professionalId, {
                cover_letter: formData.cover_letter,
                proposed_rate: parseFloat(formData.proposed_rate) || profile?.hourly_rate || 50,
                estimated_days: parseInt(formData.estimated_days) || 7
            });
            
            setShowModal(false);
            setSelectedRequest(null);
            setFormData({ cover_letter: '', proposed_rate: '', estimated_days: '' });
            await loadData();
            
        } catch (error) {
            console.error('Error submitting proposal:', error);
            setError(error.message);
        } finally {
            setSubmitting(false);
        }
    }

    function getStatusBadge(status) {
        const config = {
            pending: { color: 'bg-amber-500/20 text-amber-400', icon: Clock, label: 'Pending Review' },
            accepted: { color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle, label: 'Accepted' },
            rejected: { color: 'bg-red-500/20 text-red-400', icon: XCircle, label: 'Rejected' },
            withdrawn: { color: 'bg-slate-500/20 text-slate-400', icon: AlertCircle, label: 'Withdrawn' }
        };
        const cfg = config[status] || config.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cfg.color}`}>
                <cfg.icon className="w-3 h-3" /> {cfg.label}
            </span>
        );
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">My Proposals</h2>
                    <p className="text-slate-400 text-sm">Track your submitted proposals and their status</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-white">{stats.pending}</span>
                        <span className="text-xs text-slate-500">Pending</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-white">{stats.accepted}</span>
                        <span className="text-xs text-slate-500">Accepted</span>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Browse Opportunities
                    </button>
                </div>
            </div>

            {proposals.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search proposals..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {proposals.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No proposals yet</h3>
                    <p className="text-slate-400 mb-6">Browse opportunities and submit your first proposal</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-flex items-center gap-2"
                    >
                        <Briefcase className="w-4 h-4" />
                        Browse Opportunities
                    </button>
                </div>
            ) : filteredProposals.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Matching Proposals</h3>
                    <p className="text-slate-400 mb-6">No proposals match your search criteria.</p>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                        }}
                        className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                    >
                        Clear Filters
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredProposals.map(proposal => (
                        <div key={proposal.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all group">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition">
                                            {proposal.service_request?.title}
                                        </h3>
                                        {getStatusBadge(proposal.status)}
                                    </div>
                                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                                        {proposal.service_request?.description}
                                    </p>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" /> ${proposal.proposed_rate}/hr
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {proposal.estimated_days} days
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Submitted: {formatDate(proposal.created_at)}
                                        </span>
                                    </div>
                                    {proposal.cover_letter && (
                                        <details className="mt-3">
                                            <summary className="text-xs text-primary-400 cursor-pointer hover:text-primary-300">
                                                View Cover Letter
                                            </summary>
                                            <p className="text-slate-400 text-sm mt-2 p-3 bg-slate-800/30 rounded-lg">
                                                {proposal.cover_letter}
                                            </p>
                                        </details>
                                    )}
                                </div>
                            </div>
                            {/* FIXED (2026-08-23): removed a "Details" button
                                with an empty onClick handler
                                (onClick={() => {/* View details *\/}}) —
                                clicking it did nothing. Everything it could
                                have shown (title, description, rate, days,
                                status, cover letter) is already directly
                                visible on this card, including the working
                                <details> expansion just above for the full
                                cover letter — there was nothing left to
                                build a real detail view around. */}
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Submit a Proposal</h2>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            {!selectedRequest ? (
                                <div className="space-y-4">
                                    <p className="text-slate-400 text-sm mb-4">Select an opportunity to submit a proposal:</p>
                                    {availableRequests.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                            <p className="text-slate-400">No available opportunities at the moment.</p>
                                        </div>
                                    ) : (
                                        availableRequests.map(request => (
                                            <div key={request.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-primary-500/30 transition cursor-pointer" onClick={() => setSelectedRequest(request)}>
                                                <h3 className="text-white font-semibold">{request.title}</h3>
                                                <p className="text-slate-400 text-sm line-clamp-2 mt-1">{request.description}</p>
                                                <div className="flex justify-between items-center mt-3">
                                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Budget: ${request.budget_min}-{request.budget_max}</span>
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Posted: {formatDate(request.created_at)}</span>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-primary-400" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleSubmitProposal} className="space-y-5">
                                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                                        <p className="text-xs text-slate-500 mb-1">Submitting proposal for:</p>
                                        <h3 className="text-white font-semibold">{selectedRequest.title}</h3>
                                        <p className="text-slate-400 text-sm mt-1 line-clamp-2">{selectedRequest.description}</p>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRequest(null)}
                                            className="text-xs text-primary-400 hover:text-primary-300 mt-2"
                                        >
                                            ← Change opportunity
                                        </button>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Cover Letter <span className="text-red-400">*</span>
                                        </label>
                                        <textarea
                                            value={formData.cover_letter}
                                            onChange={(e) => setFormData({...formData, cover_letter: e.target.value})}
                                            rows={6}
                                            placeholder="Introduce yourself, explain why you're the best fit for this project, and outline your approach..."
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                                Proposed Rate ($/hr)
                                            </label>
                                            <input
                                                type="number"
                                                step="5"
                                                value={formData.proposed_rate}
                                                onChange={(e) => setFormData({...formData, proposed_rate: e.target.value})}
                                                placeholder={profile?.hourly_rate?.toString() || "50"}
                                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                                Estimated Days
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.estimated_days}
                                                onChange={(e) => setFormData({...formData, estimated_days: e.target.value})}
                                                placeholder="7"
                                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                    </div>
                                    
                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-400" />
                                            <p className="text-red-400 text-sm">{error}</p>
                                        </div>
                                    )}
                                    
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            {submitting ? 'Submitting...' : 'Submit Proposal'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRequest(null);
                                                setFormData({ cover_letter: '', proposed_rate: '', estimated_days: '' });
                                            }}
                                            className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
