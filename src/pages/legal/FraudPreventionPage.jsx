// src/pages/legal/FraudPreventionPage.jsx
// Legal liability page - Protects ODUSBABA and users from fraud

import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, FileText, Scale, CheckCircle, Mail, Clock, Building2, Fingerprint, Bell, Heart } from 'lucide-react';

export default function FraudPreventionPage() {
    const currentYear = new Date().getFullYear();
    
    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">Fraud Prevention & Liability Protection</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        How <span className="font-bold text-primary-400">ODUSBABA</span> protects our community and limits platform liability
                    </p>
                </div>
                
                {/* Last Updated */}
                <div className="text-center mb-8">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        Last Updated: May {currentYear}
                    </span>
                </div>

                {/* Employer Responsibility - LEGALLY BINDING */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-red-400 mb-3">Employer Legal Acknowledgment</h2>
                            <p className="text-slate-300 mb-3">By posting jobs or using employer features on this platform, employers acknowledge and agree that:</p>
                            <ul className="space-y-2 text-slate-400">
                                <li className="flex items-start gap-2">• <span className="font-semibold text-white">Sole Responsibility:</span> The employer is solely responsible for all hiring decisions, background checks, employment verification, and compliance with applicable laws.</li>
                                <li className="flex items-start gap-2">• <span className="font-semibold text-white">Platform Role:</span> ODUSBABA is a technology platform connecting parties and does not guarantee the accuracy of any employer-provided information.</li>
                                <li className="flex items-start gap-2">• <span className="font-semibold text-white">Fraud Reporting:</span> Any fraudulent activity will be reported to relevant law enforcement authorities with all collected data including IP addresses, timestamps, and identification information.</li>
                                <li className="flex items-start gap-2">• <span className="font-semibold text-white">Indemnification:</span> The employer indemnifies and holds harmless ODUSBABA against any claims, damages, or liabilities arising from their hiring practices or employment decisions.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                {/* Data Collection for Law Enforcement */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Fingerprint className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-3">Information We Collect for Law Enforcement</h2>
                            <p className="text-slate-300 mb-4">To enable legal action against fraudsters and protect our community, we collect and retain:</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Building2 className="w-4 h-4 text-emerald-400" />
                                        <h3 className="font-semibold text-white">For Employers</h3>
                                    </div>
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>• Business registration number / Tax ID</li>
                                        <li>• Verified business address and contact</li>
                                        <li>• All IP addresses and timestamps of actions</li>
                                        <li>• Payment verification records</li>
                                        <li>• Job posting history and modifications</li>
                                        <li>• Communication logs</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="w-4 h-4 text-primary-400" />
                                        <h3 className="font-semibold text-white">For Candidates</h3>
                                    </div>
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>• Account creation IP address and device info</li>
                                        <li>• Application and communication history</li>
                                        <li>• Skill verification records</li>
                                        <li>• Reported interactions</li>
                                        <li>• Session and login history</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="bg-amber-500/10 rounded-lg p-3">
                                <p className="text-xs text-amber-400">
                                    <strong>Data Retention Policy:</strong> All data is retained for a minimum of 7 years and provided to law enforcement upon valid legal request (subpoena, court order, or warrant).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Liability Limitations */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Scale className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-3">Platform Liability Limitations</h2>
                            <p className="text-slate-300 mb-3">ODUSBABA operates solely as a technology platform connecting employers and candidates. We are NOT responsible for:</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                <div className="bg-slate-800/30 rounded-lg p-3">
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>• Actual hiring decisions made by employers</li>
                                        <li>• Accuracy of third-party information</li>
                                        <li>• Off-platform communications or transactions</li>
                                        <li>• Employment outcomes or job satisfaction</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-800/30 rounded-lg p-3">
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>• Background checks (employer responsibility)</li>
                                        <li>• Candidate qualifications (candidate responsibility)</li>
                                        <li>• Verification of documents provided by users</li>
                                        <li>• Any disputes between users</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <p className="text-slate-400 text-sm italic">
                                Our sole responsibility is to provide a secure platform, enforce our terms of service, and report fraudulent activity to authorities.
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* How to Report Fraud */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Bell className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-3">How to Report Fraud</h2>
                            <p className="text-slate-300 mb-3">If you encounter suspicious activity, take these steps:</p>
                            <ol className="space-y-2 text-slate-400 list-decimal list-inside">
                                <li>Save all evidence (screenshots, emails, messages)</li>
                                <li>Stop all communication with the suspected party</li>
                                <li>Report immediately through our <Link to="/report-fraud" className="text-primary-400 hover:underline">Fraud Reporting Form</Link></li>
                                <li>Contact your bank if financial information was shared</li>
                                <li>File a police report if you have been victimized</li>
                            </ol>
                            <div className="mt-3 p-3 bg-green-500/10 rounded-lg">
                                <p className="text-sm text-green-400">
                                    ✅ Our fraud investigation team reviews every report within 24 hours.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Safety Tips */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-3">How to Stay Safe on ODUSBABA</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                <div className="bg-slate-800/30 rounded-lg p-3">
                                    <h3 className="font-semibold text-green-400 mb-2">✅ DO:</h3>
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>✓ Keep all communication on-platform</li>
                                        <li>✓ Verify employer profiles before sharing personal information</li>
                                        <li>✓ Report suspicious behavior immediately</li>
                                        <li>✓ Trust your instincts - if it feels wrong, it probably is</li>
                                        <li>✓ Research companies before applying</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-800/30 rounded-lg p-3">
                                    <h3 className="font-semibold text-red-400 mb-2">❌ NEVER:</h3>
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>✗ Pay money to get a job</li>
                                        <li>✗ Share your banking passwords or OTPs</li>
                                        <li>✗ Accept checks to deposit for employers</li>
                                        <li>✗ Ignore red flags</li>
                                        <li>✗ Move conversations off-platform prematurely</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-green-500/20">
                                <div className="bg-red-500/10 rounded-lg p-3">
                                    <p className="text-sm text-red-400">
                                        <strong>⚠️ If you've been scammed:</strong> Contact your bank immediately, save all communications, file a police report, and 
                                        <Link to="/report-fraud" className="text-primary-400 hover:underline ml-1">submit a report to us</Link>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="mt-8 text-center text-xs text-slate-500">
                    <p>© {currentYear} BluSkye Integrated Consult. All rights reserved.</p>
                    <p className="mt-1">For law enforcement inquiries: <a href="mailto:legal@bluskyeconsult.com" className="text-primary-400 hover:underline">legal@bluskyeconsult.com</a></p>
                </div>
                
            </div>
        </div>
    );
}
