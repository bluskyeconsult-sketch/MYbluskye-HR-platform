// src/pages/CertificatePage.jsx
// NEW FILE (2026-08-07) — course completion certificates, confirmed as a
// core feature across the platform's own product documentation, previously
// entirely unbuilt. Certificates are auto-issued by the
// update-course-progress handler when a course reaches 100%, then viewable/
// shareable at /certificate/:id. Publicly viewable by design (per the docs,
// meant to be shared on LinkedIn), no login required — the RLS policy on
// course_certificates only exposes what's already shown here.

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, Download, Share2, Loader2, AlertCircle, CheckCircle, Calendar, Clock } from 'lucide-react';

export default function CertificatePage() {
    const { id } = useParams();
    const [certificate, setCertificate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCertificate();
    }, [id]);

    async function loadCertificate() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/index?action=get-certificate&certificateId=${id}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Certificate not found');
            }
            setCertificate(data.certificate);
        } catch (err) {
            console.error('Error loading certificate:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handlePrint() {
        window.print();
    }

    function handleShare() {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: `Certificate: ${certificate.courses?.title}`,
                text: `I completed "${certificate.courses?.title}" on ODUSBABA!`,
                url
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url);
            alert('Certificate link copied to clipboard!');
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h1>
                    <p className="text-slate-400 mb-6">{error || 'This certificate could not be located.'}</p>
                    <Link to="/" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-block">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    const recipientName = certificate.profiles?.full_name || 'ODUSBABA Learner';
    const courseTitle = certificate.courses?.title || 'Course';
    const issuedDate = new Date(certificate.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-8 sm:py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Actions - hidden when printing */}
                <div className="flex justify-end gap-3 mb-6 print:hidden">
                    <button
                        onClick={handleShare}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition flex items-center gap-2 text-sm"
                    >
                        <Share2 className="w-4 h-4" /> Share
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2 text-sm"
                    >
                        <Download className="w-4 h-4" /> Print / Save as PDF
                    </button>
                </div>

                {/* Certificate */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-primary-500/30 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/30">
                            <Award className="w-9 h-9 text-white" />
                        </div>

                        <p className="text-primary-400 text-sm font-medium tracking-widest uppercase mb-2">Certificate of Completion</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">ODUSBABA</h1>
                        <p className="text-slate-500 text-xs mb-8">The Governed Workforce Platform</p>

                        <p className="text-slate-400 text-sm mb-2">This certifies that</p>
                        <p className="text-3xl sm:text-4xl font-bold text-white mb-6 font-serif">{recipientName}</p>

                        <p className="text-slate-400 text-sm mb-2">has successfully completed</p>
                        <p className="text-xl sm:text-2xl font-semibold text-primary-400 mb-8">{courseTitle}</p>

                        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400 mb-8">
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> {issuedDate}
                            </span>
                            {certificate.courses?.duration_hours && (
                                <span className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> {certificate.courses.duration_hours} hours
                                </span>
                            )}
                            <span className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle className="w-4 h-4" /> Verified
                            </span>
                        </div>

                        <div className="pt-6 border-t border-slate-700">
                            <p className="text-slate-600 text-xs font-mono">Certificate No. {certificate.certificate_number}</p>
                        </div>
                    </div>
                </div>

                <p className="text-center text-slate-500 text-xs mt-6 print:hidden">
                    Verify this certificate anytime at this exact URL.
                </p>
            </div>
        </div>
    );
}
