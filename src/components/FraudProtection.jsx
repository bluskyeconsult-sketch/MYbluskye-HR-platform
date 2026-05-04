import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, AlertTriangle, FileText, CheckCircle, XCircle, Flag, Building2, Phone, Mail, Globe } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function FraudProtection({ user, onComplete }) {
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [employerData, setEmployerData] = useState({
        company_name: '',
        registration_number: '',
        tax_id: '',
        business_address: '',
        business_phone: '',
        website_url: ''
    });
    const [loading, setLoading] = useState(false);
    const [consentAccepted, setConsentAccepted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            loadVerificationStatus();
        }
    }, [user]);

    async function loadVerificationStatus() {
        const { data } = await supabase
            .from('employer_verification')
            .select('*')
            .eq('user_id', user?.id)
            .single();
        
        if (data) {
            setVerificationStatus(data);
        }
    }

    async function handleSubmitVerification(e) {
        e.preventDefault();
        
        if (!consentAccepted) {
            setError('You must agree to the fraud prevention policies');
            return;
        }
        
        setLoading(true);
        setError('');
        
        // Check for existing verification
        const { data: existing } = await supabase
            .from('employer_verification')
            .select('id')
            .eq('user_id', user.id)
            .single();
        
        let result;
        if (existing) {
            result = await supabase
                .from('employer_verification')
                .update({
                    ...employerData,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);
        } else {
            result = await supabase
                .from('employer_verification')
                .insert({
                    user_id: user.id,
                    ...employerData,
                    verification_status: 'pending'
                });
        }
        
        if (result.error) {
            setError(result.error.message);
        } else {
            // Record legal consent
            await supabase.from('legal_consents').insert({
                user_id: user.id,
                consent_type: 'employer_verification',
                consent_version: '1.0',
                ip_address: await getUserIP()
            });
            
            alert('Verification information submitted. Our team will review within 24-48 hours.');
            if (onComplete) onComplete();
        }
        setLoading(false);
    }

    async function getUserIP() {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    }

    async function reportFraud(reportedUserId, reportType, description) {
        const { error } = await supabase.from('fraud_reports').insert({
            reporter_id: user.id,
            reported_user_id: reportedUserId,
            report_type: reportType,
            description: description,
            status: 'pending'
        });
        
        if (!error) {
            alert('Fraud report submitted. Our team will investigate.');
        }
    }

    if (verificationStatus?.verification_status === 'verified') {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                    <div>
                        <h3 className="text-emerald-400 font-semibold">Verified Employer</h3>
                        <p className="text-sm text-slate-300">Your business has been verified. You can post jobs with trust badge.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (verificationStatus?.verification_status === 'pending') {
        return (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-amber-400" />
                    <div>
                        <h3 className="text-amber-400 font-semibold">Verification Pending</h3>
                        <p className="text-sm text-slate-300">Your verification is being reviewed. This usually takes 24-48 hours.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <Shield className="w-8 h-8 text-primary-400" />
                <div>
                    <h2 className="text-xl font-bold text-white">Employer Verification Required</h2>
                    <p className="text-sm text-slate-400">Verify your business to post jobs and access employer features</p>
                </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-300">
                        <p className="font-semibold text-amber-400">Legal Notice</p>
                        <p>Providing false information is a violation of our Terms of Service and may be reported to relevant authorities. We verify all business registrations. Fraudulent activity will result in permanent ban and potential legal action.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmitVerification} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Company Name *</label>
                    <input
                        type="text"
                        value={employerData.company_name}
                        onChange={(e) => setEmployerData({...employerData, company_name: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        required
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Business Registration Number</label>
                        <input
                            type="text"
                            value={employerData.registration_number}
                            onChange={(e) => setEmployerData({...employerData, registration_number: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            placeholder="e.g., Companies House number"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Tax ID / VAT Number</label>
                        <input
                            type="text"
                            value={employerData.tax_id}
                            onChange={(e) => setEmployerData({...employerData, tax_id: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Business Address</label>
                    <textarea
                        value={employerData.business_address}
                        onChange={(e) => setEmployerData({...employerData, business_address: e.target.value})}
                        rows={2}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        placeholder="Street, city, postal code, country"
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Business Phone</label>
                        <input
                            type="tel"
                            value={employerData.business_phone}
                            onChange={(e) => setEmployerData({...employerData, business_phone: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Company Website</label>
                        <input
                            type="url"
                            value={employerData.website_url}
                            onChange={(e) => setEmployerData({...employerData, website_url: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            placeholder="https://..."
                        />
                    </div>
                </div>
                
                <div className="border-t border-slate-800 pt-4 mt-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={consentAccepted}
                            onChange={(e) => setConsentAccepted(e.target.checked)}
                            className="mt-1 w-4 h-4"
                        />
                        <div className="text-sm text-slate-300">
                            <p>I confirm that the information provided is accurate and complete.</p>
                            <p className="text-xs text-slate-500 mt-1">I understand that providing false information may result in account suspension and legal action. I consent to BluSkye Consult verifying this information with relevant authorities.</p>
                        </div>
                    </label>
                </div>
                
                {error && <div className="text-red-400 text-sm">{error}</div>}
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Submitting...' : 'Submit for Verification'}
                </button>
            </form>

            {/* Fraud Reporting Section (for users) */}
            <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                    <Flag className="w-5 h-5 text-red-400" />
                    <h3 className="text-white font-semibold">Report Suspicious Activity</h3>
                </div>
                <p className="text-sm text-slate-400 mb-3">
                    If you encounter any suspicious employers, fake job posts, or fraudulent activity, please report immediately.
                </p>
                <button
                    onClick={() => window.location.href = '/report-fraud'}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                >
                    <Flag className="w-4 h-4" /> Report Fraud
                </button>
            </div>
        </div>
    );
}
