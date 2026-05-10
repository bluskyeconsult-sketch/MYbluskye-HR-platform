// src/pages/ReportFraudPage.jsx
// Fraud reporting page for users to report suspicious activity

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { AlertTriangle, Flag, Send, Shield, CheckCircle, Loader2 } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ReportFraudPage() {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        report_type: 'fake_job',
        reported_user_id: '',
        description: '',
        evidence: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUser();
    }, []);

    async function getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setLoading(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (!user) {
            setError('Please sign in to report fraud');
            return;
        }
        
        setSubmitting(true);
        setError('');
        
        const { error: submitError } = await supabase
            .from('fraud_reports')
            .insert({
                reporter_id: user.id,
                reported_user_id: formData.reported_user_id || null,
                report_type: formData.report_type,
                description: formData.description,
                evidence: formData.evidence ? [formData.evidence] : [],
                status: 'pending'
            });
        
        if (submitError) {
            setError(submitError.message);
        } else {
            setSubmitted(true);
            setFormData({
                report_type: 'fake_job',
                reported_user_id: '',
                description: '',
                evidence: ''
            });
        }
        setSubmitting(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-950 py-12">
                <div className="max-w-2xl mx-auto px-4 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Report Submitted</h1>
                    <p className="text-slate-400 mb-6">
                        Thank you for helping keep our community safe. Our fraud investigation team will review your report within 24-48 hours.
                    </p>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                        <p className="text-amber-400 text-sm">
                            ⚠️ If this is an emergency or you are in immediate danger, please contact your local law enforcement authorities.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link to="/" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                            Return Home
                        </Link>
                        <Link to="/legal/fraud-prevention" className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition">
                            Learn About Fraud Prevention
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Flag className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Report Fraud or Suspicious Activity</h1>
                    <p className="text-slate-400">
                        Help us maintain a trusted marketplace. Your report will be investigated immediately.
                    </p>
                </div>

                {/* Warning */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">
                            <strong>False reporting is a violation of our terms.</strong> Please only submit genuine reports. 
                            We take all reports seriously and investigate each one.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    
                    {/* Report Type */}
                    <div className="mb-6">
                        <label className="block text-white font-medium mb-2">What type of issue are you reporting?</label>
                        <select
                            value={formData.report_type}
                            onChange={(e) => setFormData({...formData, report_type: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                            required
                        >
                            <option value="fake_job">Fake Job Posting</option>
                            <option value="scam">Scam / Phishing Attempt</option>
                            <option value="fraudulent_employer">Fraudulent Employer</option>
                            <option value="fake_skills">Fake Skills / Misrepresentation</option>
                            <option value="identity_theft">Identity Theft</option>
                        </select>
                    </div>
                    
                    {/* Reported User ID (Optional) */}
                    <div className="mb-6">
                        <label className="block text-white font-medium mb-2">
                            User ID or Email of the reported account (if known)
                        </label>
                        <input
                            type="text"
                            value={formData.reported_user_id}
                            onChange={(e) => setFormData({...formData, reported_user_id: e.target.value})}
                            placeholder="e.g., user@example.com or user-id"
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">You can find this in the profile URL</p>
                    </div>
                    
                    {/* Description */}
                    <div className="mb-6">
                        <label className="block text-white font-medium mb-2">Describe what happened *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            rows={6}
                            placeholder="Please provide as much detail as possible: dates, names, what was promised, what happened, any communication records..."
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                            required
                        />
                    </div>
                    
                    {/* Evidence URL */}
                    <div className="mb-6">
                        <label className="block text-white font-medium mb-2">Evidence (screenshot URL or document link)</label>
                        <input
                            type="url"
                            value={formData.evidence}
                            onChange={(e) => setFormData({...formData, evidence: e.target.value})}
                            placeholder="https://..."
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Upload screenshots to any image hosting service and paste the link here</p>
                    </div>
                    
                    {/* Privacy Note */}
                    <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-slate-300 font-semibold">Your privacy is protected.</p>
                                <p className="text-sm text-slate-400">All reports are confidential. We will never share your identity with the reported user.</p>
                            </div>
                        </div>
                    </div>
                    
                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Submit Report
                            </>
                        )}
                    </button>
                    
                    <p className="text-xs text-slate-500 text-center mt-4">
                        By submitting this report, you confirm that the information provided is accurate to the best of your knowledge.
                        False reporting may result in account suspension.
                    </p>
                    
                </form>
            </div>
        </div>
    );
}
