import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, CheckCircle, AlertTriangle, Building2, FileText, Mail, Phone, MapPin, Globe, Loader2 } from 'lucide-react';

// FIXED (2026-08-16):
// 1. Disconnected Supabase client (same pattern found and fixed
//    repeatedly this session) — now uses the shared singleton.
// 2. Used bg-success/10, text-success, bg-danger/10, text-danger — these
//    aren't real colors anywhere else in this project (every other file
//    uses the standard emerald/red Tailwind palette), so these status
//    boxes almost certainly rendered with no background/text color at
//    all. Replaced with the same emerald/red pattern used everywhere else.
// 3. Not wired to any route in App.jsx at all — added at
//    /employer-verification.

export default function EmployerVerification() {
    const [verification, setVerification] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        company_name: '',
        company_registration_number: '',
        tax_id: '',
        business_address: '',
        business_phone: '',
        business_email: '',
        website_url: ''
    });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
            const { data } = await supabase.from('employer_verifications').select('*').eq('user_id', user.id).single();
            setVerification(data);
            if (data) setFormData(data);
        }
        setLoading(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        
        const { error } = await supabase
            .from('employer_verifications')
            .upsert({ user_id: user.id, ...formData, verification_status: 'pending' });
        
        if (error) {
            alert('Error: ' + error.message);
        } else {
            alert('Verification submitted! Our team will review your information within 24-48 hours.');
            loadData();
        }
        setSubmitting(false);
    }

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;

    return (
        <div className="min-h-screen bg-slate-950 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Employer Verification</h1>
                    <p className="text-slate-400">Verify your business to post jobs and access employer features</p>
                </div>
                
                {verification?.verification_status === 'verified' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center"><CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" /><h2 className="text-xl font-bold text-white mb-2">✓ Verified Business</h2><p className="text-slate-400">Your business has been verified. You can now post jobs and access all employer features.</p></div>
                ) : verification?.verification_status === 'pending' ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center"><AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" /><h2 className="text-xl font-bold text-white mb-2">Pending Review</h2><p className="text-slate-400">Your verification is being reviewed. This typically takes 24-48 hours.</p></div>
                ) : verification?.verification_status === 'rejected' ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center"><AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" /><h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2><p className="text-slate-400">{verification.rejection_reason || 'Please contact support for assistance.'}</p></div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
                        <div className="flex items-center gap-2 mb-4 p-3 bg-primary-500/10 rounded-lg border border-primary-500/20"><Shield className="w-5 h-5 text-primary-400" /><p className="text-sm text-slate-300">Your information is secure and will only be used for verification and fraud prevention purposes. False information may result in account suspension.</p></div>
                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Company Name *</label><input type="text" required value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-300 mb-1">Registration Number</label><input type="text" value={formData.company_registration_number} onChange={e => setFormData({...formData, company_registration_number: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Tax ID / EIN</label><input type="text" value={formData.tax_id} onChange={e => setFormData({...formData, tax_id: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div></div>
                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Business Address *</label><textarea rows={2} required value={formData.business_address} onChange={e => setFormData({...formData, business_address: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-300 mb-1">Business Phone *</label><input type="tel" required value={formData.business_phone} onChange={e => setFormData({...formData, business_phone: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Business Email *</label><input type="email" required value={formData.business_email} onChange={e => setFormData({...formData, business_email: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div></div>
                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Website URL</label><input type="url" value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="https://www.example.com" /></div>
                        <button type="submit" disabled={submitting} className="w-full py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors">{submitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}Submit Verification</button>
                        <p className="text-xs text-slate-500 text-center">By submitting, you confirm that the information provided is accurate. False information may result in account suspension and legal action under applicable laws.</p>
                    </form>
                )}
            </div>
        </div>
    );
}
