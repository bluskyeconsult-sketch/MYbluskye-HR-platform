// src/pages/legal/TermsPage.jsx
// Complete Terms of Service with legal compliance

import { FileText, Calendar, Mail, Scale, Shield, AlertTriangle, Users, Database, Lock } from 'lucide-react';

export default function TermsPage() {
    const currentYear = new Date().getFullYear();
    const lastUpdated = 'May 13, 2026';

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <FileText className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
                    <p className="text-slate-400">Last Updated: {lastUpdated}</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <p className="text-amber-400 text-sm flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>These Terms of Service constitute a legally binding agreement between you and BluSkye Integrated Consult.</span>
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2"><Scale className="w-5 h-5 text-primary-400" /> 1. Acceptance of Terms</h2>
                        <p className="text-slate-400">By accessing or using ODUSBABA, you agree to be bound by these Terms of Service, our Privacy Policy, and all applicable laws and regulations.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-primary-400" /> 2. User Accounts</h2>
                        <p className="text-slate-400 mb-2">You must be at least 16 years old to create an account. You are responsible for:</p>
                        <ul className="list-disc list-inside text-slate-400 ml-4">
                            <li>Maintaining the confidentiality of your password</li>
                            <li>All activities that occur under your account</li>
                            <li>Promptly notifying us of any unauthorized use</li>
                            <li>Providing accurate and complete registration information</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-primary-400" /> 3. Acceptable Use Policy</h2>
                        <p className="text-slate-400 mb-2">You agree NOT to:</p>
                        <ul className="list-disc list-inside text-slate-400 ml-4">
                            <li>Post fake or misleading job listings</li>
                            <li>Scam, defraud, or mislead other users</li>
                            <li>Post false or unverified skills or credentials</li>
                            <li>Harass, abuse, or threaten other users</li>
                            <li>Upload malicious code or viruses</li>
                            <li>Attempt to bypass security measures</li>
                            <li>Use automated bots or scrapers</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2"><Database className="w-5 h-5 text-primary-400" /> 4. User Content</h2>
                        <p className="text-slate-400">You retain ownership of content you post. By posting, you grant ODUSBABA a worldwide, non-exclusive, royalty-free license to display and distribute your content on our platform.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2"><Lock className="w-5 h-5 text-primary-400" /> 5. Privacy & Data Protection</h2>
                        <p className="text-slate-400">We collect and process personal data in accordance with our Privacy Policy and applicable data protection laws including GDPR and CCPA. You have the right to access, correct, and delete your personal data.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-3">6. Termination</h2>
                        <p className="text-slate-400">We may terminate or suspend your account immediately for violation of these Terms. You may delete your account at any time through account settings.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-3">7. Limitation of Liability</h2>
                        <p className="text-slate-400">ODUSBABA is not liable for indirect, incidental, or consequential damages arising from use of the platform. Our total liability is limited to the amount paid for services in the previous 12 months.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-3">8. Dispute Resolution</h2>
                        <p className="text-slate-400">Any disputes shall be resolved through binding arbitration in the United Kingdom. You waive the right to participate in class actions.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-3">9. Governing Law</h2>
                        <p className="text-slate-400">These Terms are governed by the laws of England and Wales.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-3">10. Contact Information</h2>
                        <p className="text-slate-400">For legal inquiries: <a href="mailto:legal@bluskyeconsult.com" className="text-primary-400">legal@bluskyeconsult.com</a></p>
                    </div>

                    <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
                        <p>© {currentYear} BluSkye Integrated Consult. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
