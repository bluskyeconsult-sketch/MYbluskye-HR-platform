// src/pages/VerifyCertificatePage.jsx
//
// NEW (2026-09-16): the actual trust mechanism behind ODUSBABA
// certificates - a public page, no login required, that gives an
// instant, honest real/not-real answer. This is deliberately the
// centerpiece of the whole certificate feature: a certificate anyone
// can check is worth more than one that merely looks official.

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react';

export default function VerifyCertificatePage() {
    const { code } = useParams();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);

    useEffect(() => {
        async function verify() {
            try {
                const response = await fetch(`/api/index?action=verify-certificate&code=${encodeURIComponent(code)}`);
                const data = await response.json();
                setResult(data);
            } catch {
                setResult({ success: false, valid: false });
            } finally {
                setLoading(false);
            }
        }
        verify();
    }, [code]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                <Link to="/" className="text-primary-400 font-bold text-lg mb-6 block">ODUSBABA</Link>

                {loading ? (
                    <Loader2 className="w-10 h-10 text-primary-400 animate-spin mx-auto" />
                ) : result?.valid ? (
                    <>
                        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-white mb-2">Certificate Verified</h1>
                        <p className="text-slate-400 mb-6">This is a genuine ODUSBABA certificate.</p>
                        <div className="bg-slate-800/50 rounded-xl p-5 text-left space-y-2">
                            <p className="text-slate-500 text-sm">Awarded to</p>
                            <p className="text-white text-lg font-semibold">{result.learnerName}</p>
                            <p className="text-slate-500 text-sm mt-3">Course</p>
                            <p className="text-white font-medium">{result.courseTitle}</p>
                            <p className="text-slate-500 text-sm mt-3">Issued</p>
                            <p className="text-white">{new Date(result.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs mt-6">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified directly against ODUSBABA's records
                        </div>
                    </>
                ) : (
                    <>
                        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h1>
                        <p className="text-slate-400">This verification code doesn't match any certificate on record. If you believe this is an error, please contact us directly.</p>
                    </>
                )}
            </div>
        </div>
    );
}
