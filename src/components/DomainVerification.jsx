// src/components/DomainVerification.jsx
// Domain verification for employers

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, CheckCircle, XCircle, Copy, RefreshCw, Loader2 } from 'lucide-react';

export default function DomainVerification({ companyId, onVerified }) {
    const [domain, setDomain] = useState('');
    const [verificationToken, setVerificationToken] = useState('');
    const [verificationStatus, setVerificationStatus] = useState('pending');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadVerificationStatus();
    }, [companyId]);

    async function loadVerificationStatus() {
        const { data, error } = await supabase
            .from('company_profiles')
            .select('domain, domain_verified, verification_token')
            .eq('id', companyId)
            .single();
        
        if (data) {
            setDomain(data.domain || '');
            setVerificationStatus(data.domain_verified ? 'verified' : 'pending');
            setVerificationToken(data.verification_token);
        }
    }

    async function generateToken() {
        setLoading(true);
        const token = `odusbaba-verify=${Math.random().toString(36).substring(2, 15)}`;
        setVerificationToken(token);
        
        await supabase
            .from('company_profiles')
            .update({ verification_token: token })
            .eq('id', companyId);
        
        setLoading(false);
    }

    async function verifyDomain() {
        setLoading(true);
        
        // Call verification endpoint
        const { data, error } = await supabase.functions.invoke('verify-domain', {
            body: { companyId, domain, token: verificationToken }
        });
        
        if (error) {
            alert('Verification failed: ' + error.message);
        } else if (data.verified) {
            setVerificationStatus('verified');
            if (onVerified) onVerified();
            alert('Domain verified successfully!');
        } else {
            alert('Verification pending. DNS changes may take up to 24 hours.');
        }
        
        setLoading(false);
    }

    function copyToClipboard() {
        navigator.clipboard.writeText(`${domain}: ${verificationToken}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (verificationStatus === 'verified') {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400">Domain verified ✓</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary-400" />
                Verify Your Company Domain
            </h3>
            
            <p className="text-slate-400 text-sm mb-4">
                Verify your company domain to unlock full employer features and display a verified badge on your job posts.
            </p>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Company Domain</label>
                    <input
                        type="text"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="example.com"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-1">DNS TXT Record</label>
                    <div className="bg-slate-800 p-3 rounded-lg">
                        <code className="text-sm text-primary-400 break-all">
                            {domain ? `${domain} TXT "${verificationToken || 'Click generate'}"` : 'Enter domain first'}
                        </code>
                    </div>
                    {verificationToken && (
                        <button
                            onClick={copyToClipboard}
                            className="mt-2 text-sm text-primary-400 hover:underline flex items-center gap-1"
                        >
                            {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copied!' : 'Copy DNS record'}
                        </button>
                    )}
                </div>

                <div className="flex gap-3">
                    {!verificationToken && (
                        <button
                            onClick={generateToken}
                            disabled={!domain || loading}
                            className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Generate Token
                        </button>
                    )}
                    <button
                        onClick={verifyDomain}
                        disabled={!domain || !verificationToken || loading}
                        className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Verify Domain
                    </button>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                    Add the TXT record to your DNS settings, then click Verify. Changes may take up to 24 hours to propagate.
                </p>
            </div>
        </div>
    );
}
