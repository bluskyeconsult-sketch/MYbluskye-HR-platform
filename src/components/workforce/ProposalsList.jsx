// src/components/workforce/ProposalsList.jsx
// Complete Proposals System for Professionals to submit and track bids

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getMyProposals, submitProposal, getWorkforceProfile } from '../../services/workforceService';
import { Send, Eye, Clock, CheckCircle, XCircle, AlertCircle, Loader2, FileText, DollarSign, Calendar } from 'lucide-react';

export default function ProposalsList({ professionalId }) {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState({
        cover_letter: '',
        proposed_rate: '',
        estimated_days: ''
    });

    useEffect(() => {
        loadData();
    }, [professionalId]);

    async function loadData() {
        setLoading(true);
        try {
            const [proposalsData, profileData] = await Promise.all([
                getMyProposals(professionalId),
                getWorkforceProfile(professionalId)
            ]);
            setProposals(proposalsData);
            setProfile(profileData);
        } catch (error) {
            console.error('Error loading proposals:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitProposal(e) {
        e.preventDefault();
        setSubmitting(true);
        
        const result = await submitProposal(
            selectedRequest.id,
            professionalId,
            {
                cover_letter: formData.cover_letter,
                proposed_rate: parseFloat(formData.proposed_rate) || profile?.hourly_rate,
                estimated_days: parseInt(formData.estimated_days) || 7
            }
        );
        
        if (result.success) {
            setShowModal(false);
            setFormData({ cover_letter: '', proposed_rate: '', estimated_days: '' });
            loadData();
            alert('Proposal submitted successfully!');
        } else {
            alert('Error submitting proposal');
        }
        setSubmitting(false);
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
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">My Proposals</h2>
                    <p className="text-slate-400 text-sm">Track your submitted proposals and their status</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                    <FileText className="w-4 h-4" /> Browse Opportunities
                </button>
            </div>

            {/* Proposals List */}
            {proposals.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                    <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No proposals yet</h3>
                    <p className="text-slate-400 mb-4">Browse opportunities and submit your first proposal</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        Browse Opportunities
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {proposals.map(proposal => (
                        <div key={proposal.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold text-white">{proposal.service_request?.title}</h3>
                                        {getStatusBadge(proposal.status)}
                                    </div>
                                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">{proposal.service_request?.description}</p>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${proposal.proposed_rate}/hr</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {proposal.estimated_days} days</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Submitted: {new Date(proposal.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1.5 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800">
                                        <Eye className="w-4 h-4 inline mr-1" /> View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Submit Proposal Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Submit a Proposal</h2>
                        <form onSubmit={handleSubmitProposal} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Cover Letter *</label>
                                <textarea
                                    value={formData.cover_letter}
                                    onChange={(e) => setFormData({...formData, cover_letter: e.target.value})}
                                    rows="6"
                                    placeholder="Introduce yourself, explain why you're the best fit for this project, and outline your approach..."
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Proposed Rate ($/hr)</label>
                                    <input
                                        type="number"
                                        value={formData.proposed_rate}
                                        onChange={(e) => setFormData({...formData, proposed_rate: e.target.value})}
                                        placeholder={profile?.hourly_rate?.toString() || "50"}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Estimated Days</label>
                                    <input
                                        type="number"
                                        value={formData.estimated_days}
                                        onChange={(e) => setFormData({...formData, estimated_days: e.target.value})}
                                        placeholder="7"
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                                    {submitting ? 'Submitting...' : 'Submit Proposal'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">
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
